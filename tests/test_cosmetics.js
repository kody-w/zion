/**
 * tests/test_cosmetics.js
 * Comprehensive tests for the ZION Cosmetics system — 135+ tests.
 * Run with: node tests/test_cosmetics.js
 */

var Cosmetics = require('../src/js/cosmetics');

var passed = 0;
var failed = 0;
var currentSuite = '';

function suite(name) {
  currentSuite = name;
  console.log('\n--- ' + name + ' ---');
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  PASS: ' + msg);
  } else {
    failed++;
    console.log('  FAIL: ' + msg);
  }
}

assert.strictEqual = function(a, b, msg) {
  var label = msg || (JSON.stringify(a) + ' === ' + JSON.stringify(b));
  assert(a === b, label + ' (got: ' + JSON.stringify(a) + ', expected: ' + JSON.stringify(b) + ')');
};

assert.deepEqual = function(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), msg || 'deep equal');
};

// Helper: make a fresh empty state
function freshState() {
  return {};
}

// Helper: initialise a player and return {state, playerId}
function freshPlayer(id) {
  var state = freshState();
  var playerId = id || 'player_test';
  Cosmetics.initAppearance(state, playerId);
  return { state: state, playerId: playerId };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Module shape
// ─────────────────────────────────────────────────────────────────────────────
suite('Module Shape');

assert(typeof Cosmetics === 'object', 'Cosmetics is an exported object');
assert(Array.isArray(Cosmetics.COSMETIC_SLOTS), 'COSMETIC_SLOTS is an array');
assert(Array.isArray(Cosmetics.COSMETICS), 'COSMETICS is an array');
assert(Array.isArray(Cosmetics.RARITIES), 'RARITIES is an array');
assert(typeof Cosmetics.SLOT_DEFAULTS === 'object', 'SLOT_DEFAULTS is an object');
assert(typeof Cosmetics.initAppearance === 'function', 'initAppearance is a function');
assert(typeof Cosmetics.unlockCosmetic === 'function', 'unlockCosmetic is a function');
assert(typeof Cosmetics.equipCosmetic === 'function', 'equipCosmetic is a function');
assert(typeof Cosmetics.unequipCosmetic === 'function', 'unequipCosmetic is a function');
assert(typeof Cosmetics.getAppearance === 'function', 'getAppearance is a function');
assert(typeof Cosmetics.getUnlockedCosmetics === 'function', 'getUnlockedCosmetics is a function');
assert(typeof Cosmetics.getLockedCosmetics === 'function', 'getLockedCosmetics is a function');
assert(typeof Cosmetics.getCosmeticById === 'function', 'getCosmeticById is a function');
assert(typeof Cosmetics.getCosmeticsBySlot === 'function', 'getCosmeticsBySlot is a function');
assert(typeof Cosmetics.getCosmeticsByRarity === 'function', 'getCosmeticsByRarity is a function');
assert(typeof Cosmetics.getCosmeticsBySource === 'function', 'getCosmeticsBySource is a function');
assert(typeof Cosmetics.getSeasonalCosmetics === 'function', 'getSeasonalCosmetics is a function');
assert(typeof Cosmetics.saveOutfit === 'function', 'saveOutfit is a function');
assert(typeof Cosmetics.loadOutfit === 'function', 'loadOutfit is a function');
assert(typeof Cosmetics.getOutfits === 'function', 'getOutfits is a function');
assert(typeof Cosmetics.deleteOutfit === 'function', 'deleteOutfit is a function');
assert(typeof Cosmetics.getCompletionStats === 'function', 'getCompletionStats is a function');
assert(typeof Cosmetics.getSlots === 'function', 'getSlots is a function');
assert(typeof Cosmetics.getRarities === 'function', 'getRarities is a function');
assert(typeof Cosmetics.previewAppearance === 'function', 'previewAppearance is a function');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — COSMETIC_SLOTS
// ─────────────────────────────────────────────────────────────────────────────
suite('COSMETIC_SLOTS');

assert(Cosmetics.COSMETIC_SLOTS.length === 10, 'Exactly 10 slots defined');

var expectedSlots = ['skin_tone', 'hair_style', 'hair_color', 'outfit', 'accessory', 'emote_set', 'title', 'name_color', 'aura', 'pet_skin'];
for (var i = 0; i < expectedSlots.length; i++) {
  assert(Cosmetics.COSMETIC_SLOTS.indexOf(expectedSlots[i]) !== -1, 'Slot present: ' + expectedSlots[i]);
}

assert(Cosmetics.getSlots().length === 10, 'getSlots() returns 10 slots');
assert(Cosmetics.getSlots() !== Cosmetics.COSMETIC_SLOTS, 'getSlots() returns a copy, not the original');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — RARITIES
// ─────────────────────────────────────────────────────────────────────────────
suite('RARITIES');

var expectedRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
assert(Cosmetics.RARITIES.length === 5, 'Exactly 5 rarity tiers');
for (var r = 0; r < expectedRarities.length; r++) {
  assert(Cosmetics.RARITIES.indexOf(expectedRarities[r]) !== -1, 'Rarity present: ' + expectedRarities[r]);
}
assert(Cosmetics.getRarities().length === 5, 'getRarities() returns 5 entries');
assert(Cosmetics.getRarities() !== Cosmetics.RARITIES, 'getRarities() returns a copy');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — COSMETICS catalogue structure
// ─────────────────────────────────────────────────────────────────────────────
suite('COSMETICS catalogue — structure');

assert(Cosmetics.COSMETICS.length >= 80, 'At least 80 cosmetics defined (got ' + Cosmetics.COSMETICS.length + ')');

var requiredFields = ['id', 'name', 'slot', 'rarity', 'source', 'description', 'tradeable'];
for (var ci = 0; ci < Cosmetics.COSMETICS.length; ci++) {
  var c = Cosmetics.COSMETICS[ci];
  for (var fi = 0; fi < requiredFields.length; fi++) {
    assert(c[requiredFields[fi]] !== undefined, 'Cosmetic ' + c.id + ' has field: ' + requiredFields[fi]);
  }
}

// All ids are strings
for (var ci2 = 0; ci2 < Cosmetics.COSMETICS.length; ci2++) {
  assert(typeof Cosmetics.COSMETICS[ci2].id === 'string', 'Cosmetic id is a string: ' + Cosmetics.COSMETICS[ci2].id);
}

// All rarities are valid
for (var ci3 = 0; ci3 < Cosmetics.COSMETICS.length; ci3++) {
  assert(Cosmetics.RARITIES.indexOf(Cosmetics.COSMETICS[ci3].rarity) !== -1,
    'Valid rarity for ' + Cosmetics.COSMETICS[ci3].id + ': ' + Cosmetics.COSMETICS[ci3].rarity);
}

// All slots are valid
for (var ci4 = 0; ci4 < Cosmetics.COSMETICS.length; ci4++) {
  assert(Cosmetics.COSMETIC_SLOTS.indexOf(Cosmetics.COSMETICS[ci4].slot) !== -1,
    'Valid slot for ' + Cosmetics.COSMETICS[ci4].id + ': ' + Cosmetics.COSMETICS[ci4].slot);
}

// tradeable is boolean
for (var ci5 = 0; ci5 < Cosmetics.COSMETICS.length; ci5++) {
  assert(typeof Cosmetics.COSMETICS[ci5].tradeable === 'boolean',
    'tradeable is boolean for ' + Cosmetics.COSMETICS[ci5].id);
}

// season is string or null
for (var ci6 = 0; ci6 < Cosmetics.COSMETICS.length; ci6++) {
  var seasonVal = Cosmetics.COSMETICS[ci6].season;
  assert(seasonVal === null || typeof seasonVal === 'string',
    'season is null or string for ' + Cosmetics.COSMETICS[ci6].id);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Slot counts (minimum per slot)
// ─────────────────────────────────────────────────────────────────────────────
suite('Slot counts — minimum 6 items each');

var slotMinimums = {
  skin_tone:  8,
  hair_style: 10,
  hair_color: 8,
  outfit:     12,
  accessory:  10,
  emote_set:  6,
  title:      10,
  name_color: 8,
  aura:       6,
  pet_skin:   6
};

for (var slotName in slotMinimums) {
  var items = Cosmetics.getCosmeticsBySlot(slotName);
  var minimum = slotMinimums[slotName];
  assert(items.length >= minimum, slotName + ' has at least ' + minimum + ' items (got ' + items.length + ')');
}

// Each slot has at least 6
var allSlots = Cosmetics.getSlots();
for (var si = 0; si < allSlots.length; si++) {
  var slotItems = Cosmetics.getCosmeticsBySlot(allSlots[si]);
  assert(slotItems.length >= 6, 'Slot ' + allSlots[si] + ' has at least 6 items');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Each rarity has items
// ─────────────────────────────────────────────────────────────────────────────
suite('Rarity distribution');

var allRarities = Cosmetics.getRarities();
for (var ri = 0; ri < allRarities.length; ri++) {
  var rarityItems = Cosmetics.getCosmeticsByRarity(allRarities[ri]);
  assert(rarityItems.length > 0, 'Rarity ' + allRarities[ri] + ' has at least one item');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — initAppearance
// ─────────────────────────────────────────────────────────────────────────────
suite('initAppearance');

(function() {
  var state = freshState();
  assert(!state.appearances, 'State starts with no appearances');
  Cosmetics.initAppearance(state, 'alice');
  assert(state.appearances !== undefined, 'State.appearances created');
  assert(state.appearances['alice'] !== undefined, 'Player record created');

  var rec = state.appearances['alice'];
  assert(rec.playerId === 'alice', 'playerId set correctly');
  assert(typeof rec.equipped === 'object', 'equipped is an object');
  assert(Array.isArray(rec.unlocked), 'unlocked is an array');
  assert(Array.isArray(rec.favorites), 'favorites is an array');

  // All slots have defaults equipped
  var slots = Cosmetics.getSlots();
  for (var i = 0; i < slots.length; i++) {
    assert(rec.equipped[slots[i]] !== undefined, 'Slot ' + slots[i] + ' has a default equipped');
  }

  // All default cosmetics unlocked
  for (var s = 0; s < slots.length; s++) {
    var defaultId = Cosmetics.SLOT_DEFAULTS[slots[s]];
    assert(rec.unlocked.indexOf(defaultId) !== -1, 'Default ' + defaultId + ' is unlocked');
  }
})();

// initAppearance is idempotent
(function() {
  var p = freshPlayer('bob');
  Cosmetics.unlockCosmetic(p.state, 'bob', 'noble');
  Cosmetics.initAppearance(p.state, 'bob'); // second call
  var rec = p.state.appearances['bob'];
  assert(rec.unlocked.indexOf('noble') !== -1, 'initAppearance idempotent — keeps unlocked cosmetics');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 — unlockCosmetic
// ─────────────────────────────────────────────────────────────────────────────
suite('unlockCosmetic');

(function() {
  var p = freshPlayer('p_unlock');
  var result = Cosmetics.unlockCosmetic(p.state, 'p_unlock', 'noble');
  assert(result.success === true, 'unlockCosmetic returns success=true');
  assert(result.alreadyUnlocked === false, 'alreadyUnlocked=false for new unlock');
  assert(result.cosmetic !== null, 'unlockCosmetic returns cosmetic object');
  assert(result.cosmetic.id === 'noble', 'cosmetic.id is noble');

  var rec = p.state.appearances['p_unlock'];
  assert(rec.unlocked.indexOf('noble') !== -1, 'noble appears in unlocked list');
})();

// unlock already unlocked
(function() {
  var p = freshPlayer('p_dup');
  Cosmetics.unlockCosmetic(p.state, 'p_dup', 'noble');
  var result2 = Cosmetics.unlockCosmetic(p.state, 'p_dup', 'noble');
  assert(result2.success === true, 'second unlock returns success=true');
  assert(result2.alreadyUnlocked === true, 'alreadyUnlocked=true on duplicate');

  var rec = p.state.appearances['p_dup'];
  var count = 0;
  for (var i = 0; i < rec.unlocked.length; i++) {
    if (rec.unlocked[i] === 'noble') count++;
  }
  assert(count === 1, 'noble only appears once in unlocked list');
})();

// unlock non-existent cosmetic
(function() {
  var p = freshPlayer('p_bad');
  var result = Cosmetics.unlockCosmetic(p.state, 'p_bad', 'nonexistent_xyz');
  assert(result.success === false, 'unlockCosmetic fails for nonexistent id');
  assert(result.cosmetic === null, 'cosmetic is null on failure');
})();

// unlock initialises player if not yet initialised
(function() {
  var state = freshState();
  var result = Cosmetics.unlockCosmetic(state, 'newplayer', 'noble');
  assert(result.success === true, 'unlockCosmetic auto-initialises player');
  assert(state.appearances['newplayer'] !== undefined, 'player record created');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9 — equipCosmetic
// ─────────────────────────────────────────────────────────────────────────────
suite('equipCosmetic');

(function() {
  var p = freshPlayer('p_equip');
  Cosmetics.unlockCosmetic(p.state, 'p_equip', 'noble');
  var result = Cosmetics.equipCosmetic(p.state, 'p_equip', 'noble');
  assert(result.success === true, 'equipCosmetic returns success=true');
  assert(result.slot === 'outfit', 'slot is outfit for noble');
  assert(result.previousItem === 'peasant', 'previousItem is peasant (default)');

  var rec = p.state.appearances['p_equip'];
  assert(rec.equipped['outfit'] === 'noble', 'outfit slot updated to noble');
})();

// equip locked cosmetic
(function() {
  var p = freshPlayer('p_equip_locked');
  var result = Cosmetics.equipCosmetic(p.state, 'p_equip_locked', 'noble');
  assert(result.success === false, 'equipCosmetic fails for locked item');
  assert(result.reason !== null, 'reason is provided');
  var rec = p.state.appearances['p_equip_locked'];
  assert(rec.equipped['outfit'] === 'peasant', 'outfit slot unchanged');
})();

// equip non-existent cosmetic
(function() {
  var p = freshPlayer('p_equip_nx');
  var result = Cosmetics.equipCosmetic(p.state, 'p_equip_nx', 'does_not_exist');
  assert(result.success === false, 'equipCosmetic fails for nonexistent item');
  assert(result.slot === null, 'slot is null on failure');
})();

// equip default (always unlocked)
(function() {
  var p = freshPlayer('p_equip_def');
  var result = Cosmetics.equipCosmetic(p.state, 'p_equip_def', 'peasant');
  assert(result.success === true, 'equipCosmetic works for default item');
})();

// equip records previous item correctly
(function() {
  var p = freshPlayer('p_prev');
  Cosmetics.unlockCosmetic(p.state, 'p_prev', 'noble');
  Cosmetics.equipCosmetic(p.state, 'p_prev', 'noble');
  Cosmetics.unlockCosmetic(p.state, 'p_prev', 'mage');
  var result = Cosmetics.equipCosmetic(p.state, 'p_prev', 'mage');
  assert(result.previousItem === 'noble', 'previousItem is noble when switching from noble to mage');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 10 — unequipCosmetic
// ─────────────────────────────────────────────────────────────────────────────
suite('unequipCosmetic');

(function() {
  var p = freshPlayer('p_uneq');
  Cosmetics.unlockCosmetic(p.state, 'p_uneq', 'noble');
  Cosmetics.equipCosmetic(p.state, 'p_uneq', 'noble');
  var result = Cosmetics.unequipCosmetic(p.state, 'p_uneq', 'outfit');
  assert(result.success === true, 'unequipCosmetic returns success=true');
  assert(result.slot === 'outfit', 'slot returned correctly');

  var rec = p.state.appearances['p_uneq'];
  assert(rec.equipped['outfit'] === 'peasant', 'outfit reset to default');
})();

// unequip invalid slot
(function() {
  var p = freshPlayer('p_uneq_bad');
  var result = Cosmetics.unequipCosmetic(p.state, 'p_uneq_bad', 'invalid_slot');
  assert(result.success === false, 'unequipCosmetic fails for invalid slot');
  assert(result.reason !== null, 'reason provided for invalid slot');
})();

// unequip all slots
(function() {
  var p = freshPlayer('p_uneq_all');
  var slots = Cosmetics.getSlots();
  for (var i = 0; i < slots.length; i++) {
    var res = Cosmetics.unequipCosmetic(p.state, 'p_uneq_all', slots[i]);
    assert(res.success === true, 'unequip succeeds for slot ' + slots[i]);
    var rec = p.state.appearances['p_uneq_all'];
    assert(rec.equipped[slots[i]] === Cosmetics.SLOT_DEFAULTS[slots[i]], 'Slot ' + slots[i] + ' reset to default');
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 11 — getAppearance
// ─────────────────────────────────────────────────────────────────────────────
suite('getAppearance');

(function() {
  var p = freshPlayer('p_get');
  var appearance = Cosmetics.getAppearance(p.state, 'p_get');
  assert(appearance !== null, 'getAppearance returns a value');
  assert(appearance.playerId === 'p_get', 'playerId correct');
  assert(typeof appearance.equipped === 'object', 'equipped is object');
  assert(Array.isArray(appearance.unlocked), 'unlocked is array');
})();

// getAppearance returns a clone (mutations do not affect state)
(function() {
  var p = freshPlayer('p_clone');
  var appearance = Cosmetics.getAppearance(p.state, 'p_clone');
  appearance.equipped['outfit'] = 'HACKED';
  var appearance2 = Cosmetics.getAppearance(p.state, 'p_clone');
  assert(appearance2.equipped['outfit'] === 'peasant', 'Mutations to returned appearance do not affect state');
})();

// getAppearance for uninitialised player
(function() {
  var state = freshState();
  var result = Cosmetics.getAppearance(state, 'nobody');
  assert(result === null, 'getAppearance returns null for uninitialised player');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 12 — getUnlockedCosmetics
// ─────────────────────────────────────────────────────────────────────────────
suite('getUnlockedCosmetics');

(function() {
  var p = freshPlayer('p_ul');
  var all = Cosmetics.getUnlockedCosmetics(p.state, 'p_ul');
  assert(all.length > 0, 'getUnlockedCosmetics returns items after init');

  // Unlock a new cosmetic and check it appears
  Cosmetics.unlockCosmetic(p.state, 'p_ul', 'noble');
  var updated = Cosmetics.getUnlockedCosmetics(p.state, 'p_ul');
  var nobleFound = false;
  for (var i = 0; i < updated.length; i++) {
    if (updated[i].id === 'noble') nobleFound = true;
  }
  assert(nobleFound, 'noble appears in unlocked list after unlock');
})();

// Filter by slot
(function() {
  var p = freshPlayer('p_ul_slot');
  Cosmetics.unlockCosmetic(p.state, 'p_ul_slot', 'noble');
  var outfits = Cosmetics.getUnlockedCosmetics(p.state, 'p_ul_slot', 'outfit');
  for (var i = 0; i < outfits.length; i++) {
    assert(outfits[i].slot === 'outfit', 'Filtered results all have slot=outfit');
  }
  var nobleInOutfits = false;
  for (var j = 0; j < outfits.length; j++) {
    if (outfits[j].id === 'noble') nobleInOutfits = true;
  }
  assert(nobleInOutfits, 'noble appears in outfit-filtered unlocked list');
})();

// getUnlockedCosmetics for uninitialised player
(function() {
  var state = freshState();
  var result = Cosmetics.getUnlockedCosmetics(state, 'ghost');
  assert(Array.isArray(result), 'getUnlockedCosmetics returns array for uninitialised player');
  assert(result.length === 0, 'Empty array for uninitialised player');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 13 — getLockedCosmetics
// ─────────────────────────────────────────────────────────────────────────────
suite('getLockedCosmetics');

(function() {
  var p = freshPlayer('p_lk');
  var locked = Cosmetics.getLockedCosmetics(p.state, 'p_lk');
  assert(locked.length > 0, 'New player has locked cosmetics');

  // noble should be locked initially
  var nobleLocked = false;
  for (var i = 0; i < locked.length; i++) {
    if (locked[i].id === 'noble') nobleLocked = true;
  }
  assert(nobleLocked, 'noble is locked initially');

  // unlock noble, then it should disappear from locked
  Cosmetics.unlockCosmetic(p.state, 'p_lk', 'noble');
  var locked2 = Cosmetics.getLockedCosmetics(p.state, 'p_lk');
  var nobleStillLocked = false;
  for (var j = 0; j < locked2.length; j++) {
    if (locked2[j].id === 'noble') nobleStillLocked = true;
  }
  assert(!nobleStillLocked, 'noble is no longer locked after unlock');
})();

// Filter by slot
(function() {
  var p = freshPlayer('p_lk_slot');
  var lockedOutfits = Cosmetics.getLockedCosmetics(p.state, 'p_lk_slot', 'outfit');
  for (var i = 0; i < lockedOutfits.length; i++) {
    assert(lockedOutfits[i].slot === 'outfit', 'Slot-filtered locked cosmetics are all outfit slot');
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 14 — getCosmeticById
// ─────────────────────────────────────────────────────────────────────────────
suite('getCosmeticById');

(function() {
  var c = Cosmetics.getCosmeticById('golden_crown');
  assert(c !== null, 'getCosmeticById finds golden_crown');
  assert(c.id === 'golden_crown', 'id is golden_crown');
  assert(c.slot === 'accessory', 'slot is accessory');
  assert(c.rarity === 'legendary', 'rarity is legendary');
})();

(function() {
  var result = Cosmetics.getCosmeticById('does_not_exist');
  assert(result === null, 'getCosmeticById returns null for unknown id');
})();

// getCosmeticById returns a clone
(function() {
  var c1 = Cosmetics.getCosmeticById('noble');
  c1.name = 'TAMPERED';
  var c2 = Cosmetics.getCosmeticById('noble');
  assert(c2.name !== 'TAMPERED', 'getCosmeticById returns a clone — mutations do not leak');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 15 — getCosmeticsBySlot
// ─────────────────────────────────────────────────────────────────────────────
suite('getCosmeticsBySlot');

(function() {
  var skins = Cosmetics.getCosmeticsBySlot('skin_tone');
  assert(skins.length >= 8, 'skin_tone has at least 8 items');
  for (var i = 0; i < skins.length; i++) {
    assert(skins[i].slot === 'skin_tone', 'All items are skin_tone slot');
  }
})();

(function() {
  var none = Cosmetics.getCosmeticsBySlot('not_a_slot');
  assert(Array.isArray(none), 'Returns array for unknown slot');
  assert(none.length === 0, 'Returns empty array for unknown slot');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 16 — getCosmeticsByRarity
// ─────────────────────────────────────────────────────────────────────────────
suite('getCosmeticsByRarity');

(function() {
  var commons = Cosmetics.getCosmeticsByRarity('common');
  assert(commons.length > 0, 'Common rarity has items');
  for (var i = 0; i < commons.length; i++) {
    assert(commons[i].rarity === 'common', 'All results are common rarity');
  }
})();

(function() {
  var legends = Cosmetics.getCosmeticsByRarity('legendary');
  assert(legends.length > 0, 'Legendary rarity has items');
  var crownFound = false;
  for (var i = 0; i < legends.length; i++) {
    if (legends[i].id === 'golden_crown') crownFound = true;
  }
  assert(crownFound, 'golden_crown is in legendary results');
})();

(function() {
  var none = Cosmetics.getCosmeticsByRarity('ultra_legendary');
  assert(none.length === 0, 'Returns empty for unknown rarity');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 17 — getCosmeticsBySource
// ─────────────────────────────────────────────────────────────────────────────
suite('getCosmeticsBySource');

(function() {
  var achievementCosmetics = Cosmetics.getCosmeticsBySource('achievement');
  assert(achievementCosmetics.length > 0, 'Achievement source has items');
  for (var i = 0; i < achievementCosmetics.length; i++) {
    assert(achievementCosmetics[i].source === 'achievement', 'All results are achievement source');
  }
})();

(function() {
  var prestigeCosmetics = Cosmetics.getCosmeticsBySource('prestige');
  assert(prestigeCosmetics.length > 0, 'Prestige source has items');
})();

(function() {
  var festivalCosmetics = Cosmetics.getCosmeticsBySource('festival');
  assert(festivalCosmetics.length > 0, 'Festival source has items');
})();

(function() {
  var challengeCosmetics = Cosmetics.getCosmeticsBySource('challenge');
  assert(challengeCosmetics.length > 0, 'Challenge source has items');
})();

(function() {
  var badgeCosmetics = Cosmetics.getCosmeticsBySource('badge');
  assert(badgeCosmetics.length > 0, 'Badge source has items');
})();

(function() {
  var craftCosmetics = Cosmetics.getCosmeticsBySource('craft');
  assert(craftCosmetics.length > 0, 'Craft source has items');
})();

(function() {
  var questCosmetics = Cosmetics.getCosmeticsBySource('quest');
  assert(questCosmetics.length > 0, 'Quest source has items');
})();

(function() {
  var none = Cosmetics.getCosmeticsBySource('unknown_source');
  assert(none.length === 0, 'Returns empty for unknown source');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 18 — getSeasonalCosmetics
// ─────────────────────────────────────────────────────────────────────────────
suite('getSeasonalCosmetics');

(function() {
  var allSeasonal = Cosmetics.getSeasonalCosmetics(null);
  assert(allSeasonal.length > 0, 'There are seasonal cosmetics');
  for (var i = 0; i < allSeasonal.length; i++) {
    assert(allSeasonal[i].season !== null, 'All returned are seasonal (season != null)');
  }
})();

(function() {
  var winter = Cosmetics.getSeasonalCosmetics('winter_2025');
  assert(winter.length > 0, 'winter_2025 has seasonal items');
  for (var i = 0; i < winter.length; i++) {
    assert(winter[i].season === 'winter_2025', 'All results have season=winter_2025');
  }
})();

(function() {
  var harvest = Cosmetics.getSeasonalCosmetics('harvest_2025');
  assert(harvest.length > 0, 'harvest_2025 has seasonal items');
})();

(function() {
  var none = Cosmetics.getSeasonalCosmetics('season_9999');
  assert(none.length === 0, 'Non-existent season returns empty');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 19 — saveOutfit / loadOutfit / getOutfits / deleteOutfit
// ─────────────────────────────────────────────────────────────────────────────
suite('saveOutfit');

(function() {
  var p = freshPlayer('p_outfit');
  var result = Cosmetics.saveOutfit(p.state, 'p_outfit', 'MyOutfit');
  assert(result.success === true, 'saveOutfit returns success=true');
  assert(result.outfit !== null, 'saveOutfit returns outfit object');
  assert(result.outfit.name === 'MyOutfit', 'outfit.name is correct');
  assert(typeof result.outfit.equipped === 'object', 'outfit.equipped is object');
  assert(typeof result.outfit.savedAt === 'number', 'outfit.savedAt is a timestamp');
})();

// save with invalid name
(function() {
  var p = freshPlayer('p_outfit_bad');
  var r1 = Cosmetics.saveOutfit(p.state, 'p_outfit_bad', '');
  assert(r1.success === false, 'saveOutfit fails for empty name');
  var r2 = Cosmetics.saveOutfit(p.state, 'p_outfit_bad', '   ');
  assert(r2.success === false, 'saveOutfit fails for whitespace-only name');
})();

suite('loadOutfit');

(function() {
  var p = freshPlayer('p_load');
  // Unlock and equip noble outfit
  Cosmetics.unlockCosmetic(p.state, 'p_load', 'noble');
  Cosmetics.equipCosmetic(p.state, 'p_load', 'noble');
  // Save current look
  Cosmetics.saveOutfit(p.state, 'p_load', 'NobleLook');
  // Change back to default
  Cosmetics.unequipCosmetic(p.state, 'p_load', 'outfit');
  assert(p.state.appearances['p_load'].equipped['outfit'] === 'peasant', 'Reset to peasant before loading');
  // Load saved outfit
  var result = Cosmetics.loadOutfit(p.state, 'p_load', 'NobleLook');
  assert(result.success === true, 'loadOutfit returns success=true');
  assert(p.state.appearances['p_load'].equipped['outfit'] === 'noble', 'Outfit restored to noble after loadOutfit');
})();

// load non-existent outfit
(function() {
  var p = freshPlayer('p_load_nx');
  var result = Cosmetics.loadOutfit(p.state, 'p_load_nx', 'GhostOutfit');
  assert(result.success === false, 'loadOutfit fails for non-existent outfit');
  assert(result.reason !== null, 'reason provided');
})();

// loadOutfit skips cosmetics that are no longer unlocked
(function() {
  var p = freshPlayer('p_load_skip');
  // Manually forge an outfit with a cosmetic we "had" but remove from unlocked
  Cosmetics.initAppearance(p.state, 'p_load_skip');
  // Temporarily unlock and save
  Cosmetics.unlockCosmetic(p.state, 'p_load_skip', 'noble');
  Cosmetics.equipCosmetic(p.state, 'p_load_skip', 'noble');
  Cosmetics.saveOutfit(p.state, 'p_load_skip', 'OldLook');
  // Remove noble from unlocked (simulate revocation)
  var rec = p.state.appearances['p_load_skip'];
  var idx = rec.unlocked.indexOf('noble');
  if (idx !== -1) rec.unlocked.splice(idx, 1);
  // Reset outfit first
  rec.equipped['outfit'] = 'peasant';
  // Load outfit — noble should be skipped
  var result = Cosmetics.loadOutfit(p.state, 'p_load_skip', 'OldLook');
  assert(result.skipped.indexOf('outfit') !== -1, 'outfit slot skipped because noble no longer unlocked');
  assert(rec.equipped['outfit'] === 'peasant', 'outfit slot not changed when cosmetic unavailable');
})();

suite('getOutfits');

(function() {
  var p = freshPlayer('p_outfits_list');
  Cosmetics.saveOutfit(p.state, 'p_outfits_list', 'Look1');
  Cosmetics.saveOutfit(p.state, 'p_outfits_list', 'Look2');
  var outfits = Cosmetics.getOutfits(p.state, 'p_outfits_list');
  assert(typeof outfits === 'object', 'getOutfits returns an object');
  assert(outfits['Look1'] !== undefined, 'Look1 in outfits');
  assert(outfits['Look2'] !== undefined, 'Look2 in outfits');
})();

(function() {
  var state = freshState();
  var outfits = Cosmetics.getOutfits(state, 'nobody');
  assert(typeof outfits === 'object', 'getOutfits returns object for uninitialised player');
})();

suite('deleteOutfit');

(function() {
  var p = freshPlayer('p_del');
  Cosmetics.saveOutfit(p.state, 'p_del', 'Keeper');
  Cosmetics.saveOutfit(p.state, 'p_del', 'Trash');
  var result = Cosmetics.deleteOutfit(p.state, 'p_del', 'Trash');
  assert(result.success === true, 'deleteOutfit returns success=true');
  var outfits = Cosmetics.getOutfits(p.state, 'p_del');
  assert(outfits['Trash'] === undefined, 'Trash outfit removed');
  assert(outfits['Keeper'] !== undefined, 'Keeper outfit retained');
})();

// delete non-existent outfit
(function() {
  var p = freshPlayer('p_del_nx');
  var result = Cosmetics.deleteOutfit(p.state, 'p_del_nx', 'NoSuchOutfit');
  assert(result.success === false, 'deleteOutfit fails for non-existent outfit');
})();

// delete for uninitialised player
(function() {
  var state = freshState();
  var result = Cosmetics.deleteOutfit(state, 'ghost_player', 'SomeOutfit');
  assert(result.success === false, 'deleteOutfit fails for uninitialised player');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 20 — getCompletionStats
// ─────────────────────────────────────────────────────────────────────────────
suite('getCompletionStats');

(function() {
  var p = freshPlayer('p_stats');
  var stats = Cosmetics.getCompletionStats(p.state, 'p_stats');
  assert(typeof stats.totalCosmetics === 'number', 'totalCosmetics is a number');
  assert(stats.totalCosmetics >= 80, 'totalCosmetics >= 80');
  assert(typeof stats.unlocked === 'number', 'unlocked is a number');
  assert(stats.unlocked > 0, 'unlocked > 0 after init (defaults)');
  assert(typeof stats.percent === 'number', 'percent is a number');
  assert(stats.percent >= 0 && stats.percent <= 100, 'percent in [0,100]');
  assert(typeof stats.bySlot === 'object', 'bySlot is an object');
  assert(typeof stats.byRarity === 'object', 'byRarity is an object');
})();

// bySlot has all slots
(function() {
  var p = freshPlayer('p_stats_slot');
  var stats = Cosmetics.getCompletionStats(p.state, 'p_stats_slot');
  var slots = Cosmetics.getSlots();
  for (var i = 0; i < slots.length; i++) {
    assert(stats.bySlot[slots[i]] !== undefined, 'bySlot has entry for ' + slots[i]);
    assert(typeof stats.bySlot[slots[i]].total === 'number', slots[i] + '.total is number');
    assert(typeof stats.bySlot[slots[i]].unlocked === 'number', slots[i] + '.unlocked is number');
  }
})();

// byRarity has all rarities
(function() {
  var p = freshPlayer('p_stats_rar');
  var stats = Cosmetics.getCompletionStats(p.state, 'p_stats_rar');
  var rarities = Cosmetics.getRarities();
  for (var i = 0; i < rarities.length; i++) {
    assert(stats.byRarity[rarities[i]] !== undefined, 'byRarity has entry for ' + rarities[i]);
  }
})();

// unlocking a cosmetic increases stats
(function() {
  var p = freshPlayer('p_stats_inc');
  var before = Cosmetics.getCompletionStats(p.state, 'p_stats_inc');
  Cosmetics.unlockCosmetic(p.state, 'p_stats_inc', 'noble');
  var after = Cosmetics.getCompletionStats(p.state, 'p_stats_inc');
  assert(after.unlocked === before.unlocked + 1, 'unlocked count increases by 1 after unlock');
  assert(after.bySlot['outfit'].unlocked === before.bySlot['outfit'].unlocked + 1, 'bySlot outfit unlocked increases');
})();

// stats for uninitialised player
(function() {
  var state = freshState();
  var stats = Cosmetics.getCompletionStats(state, 'nobody');
  assert(stats.unlocked === 0, 'uninitialised player has 0 unlocked');
  assert(stats.percent === 0, 'uninitialised player has 0 percent');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 21 — previewAppearance
// ─────────────────────────────────────────────────────────────────────────────
suite('previewAppearance');

(function() {
  var p = freshPlayer('p_preview');
  Cosmetics.unlockCosmetic(p.state, 'p_preview', 'noble');
  var originalEquipped = JSON.stringify(p.state.appearances['p_preview'].equipped);

  var preview = Cosmetics.previewAppearance(p.state, 'p_preview', { outfit: 'noble' });
  assert(typeof preview.equipped === 'object', 'preview returns equipped object');
  assert(preview.equipped['outfit'] === 'noble', 'preview shows noble as equipped outfit');

  // State not mutated
  var afterEquipped = JSON.stringify(p.state.appearances['p_preview'].equipped);
  assert(originalEquipped === afterEquipped, 'previewAppearance does NOT mutate state');
})();

// preview with invalid cosmetic id
(function() {
  var p = freshPlayer('p_preview_inv');
  var preview = Cosmetics.previewAppearance(p.state, 'p_preview_inv', { outfit: 'nonexistent_xyz' });
  assert(preview.invalid.length > 0, 'Invalid cosmetic recorded in preview.invalid');
})();

// preview with wrong slot
(function() {
  var p = freshPlayer('p_preview_wrong');
  Cosmetics.unlockCosmetic(p.state, 'p_preview_wrong', 'noble');
  // noble is outfit slot — try to preview in accessory slot
  var preview = Cosmetics.previewAppearance(p.state, 'p_preview_wrong', { accessory: 'noble' });
  assert(preview.invalid.length > 0, 'Wrong-slot preview recorded in preview.invalid');
  assert(preview.equipped['accessory'] !== 'noble', 'Wrong-slot cosmetic not applied in preview');
})();

// preview with locked cosmetic
(function() {
  var p = freshPlayer('p_preview_locked');
  // noble is NOT unlocked for this player
  var preview = Cosmetics.previewAppearance(p.state, 'p_preview_locked', { outfit: 'noble' });
  assert(preview.invalid.length > 0, 'Locked cosmetic recorded as invalid in preview');
  assert(preview.equipped['outfit'] !== 'noble', 'Locked cosmetic not applied in preview');
})();

// preview with multiple changes
(function() {
  var p = freshPlayer('p_preview_multi');
  Cosmetics.unlockCosmetic(p.state, 'p_preview_multi', 'noble');
  Cosmetics.unlockCosmetic(p.state, 'p_preview_multi', 'cheerful');
  var preview = Cosmetics.previewAppearance(p.state, 'p_preview_multi', {
    outfit: 'noble',
    emote_set: 'cheerful'
  });
  assert(preview.equipped['outfit'] === 'noble', 'preview applies noble outfit');
  assert(preview.equipped['emote_set'] === 'cheerful', 'preview applies cheerful emotes');
  assert(preview.valid.indexOf('outfit') !== -1, 'outfit in valid list');
  assert(preview.valid.indexOf('emote_set') !== -1, 'emote_set in valid list');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 22 — Specific cosmetic spot-checks
// ─────────────────────────────────────────────────────────────────────────────
suite('Specific cosmetic spot-checks');

(function() {
  var c = Cosmetics.getCosmeticById('shadow');
  // shadow appears as both aura and pet_skin — getCosmeticById uses the first registered
  // The presence of a 'shadow' cosmetic is what we check
  assert(c !== null, 'shadow cosmetic exists');
})();

(function() {
  var c = Cosmetics.getCosmeticById('rainbow');
  assert(c !== null, 'rainbow name_color exists');
  assert(c.rarity === 'legendary', 'rainbow is legendary');
})();

(function() {
  var c = Cosmetics.getCosmeticById('Eternal');
  assert(c !== null, 'Eternal title exists');
  assert(c.rarity === 'legendary', 'Eternal is legendary rarity');
  assert(c.slot === 'title', 'Eternal is title slot');
})();

(function() {
  var c = Cosmetics.getCosmeticById('celestial');
  assert(c !== null, 'celestial pet_skin exists');
  assert(c.slot === 'pet_skin', 'celestial is pet_skin slot');
})();

(function() {
  var c = Cosmetics.getCosmeticById('flower_wreath');
  assert(c !== null, 'flower_wreath exists');
  assert(c.season !== null, 'flower_wreath is seasonal');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 23 — Multi-player isolation
// ─────────────────────────────────────────────────────────────────────────────
suite('Multi-player isolation');

(function() {
  var state = freshState();
  Cosmetics.initAppearance(state, 'alice');
  Cosmetics.initAppearance(state, 'bob');
  Cosmetics.unlockCosmetic(state, 'alice', 'noble');
  Cosmetics.equipCosmetic(state, 'alice', 'noble');

  var aliceAppearance = Cosmetics.getAppearance(state, 'alice');
  var bobAppearance = Cosmetics.getAppearance(state, 'bob');

  assert(aliceAppearance.equipped['outfit'] === 'noble', "Alice's outfit is noble");
  assert(bobAppearance.equipped['outfit'] === 'peasant', "Bob's outfit is unaffected (still peasant)");

  var aliceUnlocked = Cosmetics.getUnlockedCosmetics(state, 'alice');
  var bobUnlocked = Cosmetics.getUnlockedCosmetics(state, 'bob');

  var aliceHasNoble = false;
  for (var i = 0; i < aliceUnlocked.length; i++) {
    if (aliceUnlocked[i].id === 'noble') aliceHasNoble = true;
  }
  var bobHasNoble = false;
  for (var j = 0; j < bobUnlocked.length; j++) {
    if (bobUnlocked[j].id === 'noble') bobHasNoble = true;
  }
  assert(aliceHasNoble, 'Alice has noble unlocked');
  assert(!bobHasNoble, 'Bob does not have noble unlocked');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 24 — SLOT_DEFAULTS coverage
// ─────────────────────────────────────────────────────────────────────────────
suite('SLOT_DEFAULTS');

(function() {
  var slots = Cosmetics.getSlots();
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i];
    assert(Cosmetics.SLOT_DEFAULTS[s] !== undefined, 'SLOT_DEFAULTS has entry for ' + s);
    var defaultId = Cosmetics.SLOT_DEFAULTS[s];
    var cosmetic = Cosmetics.getCosmeticById(defaultId);
    assert(cosmetic !== null, 'Default cosmetic exists in catalogue: ' + defaultId);
    assert(cosmetic.slot === s, 'Default cosmetic belongs to correct slot: ' + defaultId + ' -> ' + s);
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 25 — Tradeable cosmetics exist
// ─────────────────────────────────────────────────────────────────────────────
suite('Tradeable cosmetics');

(function() {
  var tradeableCount = 0;
  for (var i = 0; i < Cosmetics.COSMETICS.length; i++) {
    if (Cosmetics.COSMETICS[i].tradeable === true) tradeableCount++;
  }
  assert(tradeableCount > 0, 'At least one tradeable cosmetic exists');
})();

// ─────────────────────────────────────────────────────────────────────────────
// FINAL REPORT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log('Cosmetics Tests Complete');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
console.log('Total:  ' + (passed + failed));
console.log('═══════════════════════════════════════');

if (failed > 0) {
  process.exit(1);
}
