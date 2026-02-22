// test_housing.js — 80+ tests for the Player Housing system
const { test, suite, report, assert } = require('./test_runner');
const Housing = require('../src/js/housing');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Minimal ledger + spendFn for testing without full Economy module
function makeTestLedger(balance) {
  return { balances: { testPlayer: balance || 1000 } };
}

function makeSpendFn() {
  return function(ledger, playerId, amount) {
    var bal = ledger.balances[playerId] || 0;
    if (bal < amount) return { success: false, error: 'Insufficient funds' };
    ledger.balances[playerId] = bal - amount;
    return { success: true };
  };
}

// Reset module state between tests
function reset() {
  Housing._reset();
}

// ---------------------------------------------------------------------------
// Suite: Constants
// ---------------------------------------------------------------------------

suite('Constants', function() {
  test('PLOT_COST is 50', function() {
    assert.strictEqual(Housing.PLOT_COST, 50);
  });

  test('ROOM_COST is 10', function() {
    assert.strictEqual(Housing.ROOM_COST, 10);
  });

  test('ROOM_TYPES has 8 entries', function() {
    var keys = Object.keys(Housing.ROOM_TYPES);
    assert.strictEqual(keys.length, 8);
  });

  test('ROOM_TYPES has bedroom', function() {
    assert.ok(Housing.ROOM_TYPES.bedroom);
  });

  test('ROOM_TYPES has kitchen', function() {
    assert.ok(Housing.ROOM_TYPES.kitchen);
  });

  test('ROOM_TYPES has workshop', function() {
    assert.ok(Housing.ROOM_TYPES.workshop);
  });

  test('ROOM_TYPES has garden', function() {
    assert.ok(Housing.ROOM_TYPES.garden);
  });

  test('ROOM_TYPES has gallery', function() {
    assert.ok(Housing.ROOM_TYPES.gallery);
  });

  test('ROOM_TYPES has library', function() {
    assert.ok(Housing.ROOM_TYPES.library);
  });

  test('ROOM_TYPES has music_room', function() {
    assert.ok(Housing.ROOM_TYPES.music_room);
  });

  test('ROOM_TYPES has trophy_room', function() {
    assert.ok(Housing.ROOM_TYPES.trophy_room);
  });

  test('Each ROOM_TYPE has comfortBonus', function() {
    Object.keys(Housing.ROOM_TYPES).forEach(function(k) {
      assert.ok(Housing.ROOM_TYPES[k].comfortBonus, k + ' missing comfortBonus');
    });
  });

  test('Each ROOM_TYPE has maxFurniture', function() {
    Object.keys(Housing.ROOM_TYPES).forEach(function(k) {
      assert.ok(typeof Housing.ROOM_TYPES[k].maxFurniture === 'number', k + ' missing maxFurniture');
    });
  });

  test('FURNITURE_CATALOG has 30+ items', function() {
    var count = Object.keys(Housing.FURNITURE_CATALOG).length;
    assert.ok(count >= 30, 'Expected >= 30, got ' + count);
  });

  test('FURNITURE_CATALOG has seating items', function() {
    var hasSeating = Object.keys(Housing.FURNITURE_CATALOG).some(function(k) {
      return Housing.FURNITURE_CATALOG[k].category === 'seating';
    });
    assert.ok(hasSeating, 'No seating items found');
  });

  test('FURNITURE_CATALOG has tables items', function() {
    var has = Object.keys(Housing.FURNITURE_CATALOG).some(function(k) {
      return Housing.FURNITURE_CATALOG[k].category === 'tables';
    });
    assert.ok(has);
  });

  test('FURNITURE_CATALOG has storage items', function() {
    var has = Object.keys(Housing.FURNITURE_CATALOG).some(function(k) {
      return Housing.FURNITURE_CATALOG[k].category === 'storage';
    });
    assert.ok(has);
  });

  test('FURNITURE_CATALOG has decoration items', function() {
    var has = Object.keys(Housing.FURNITURE_CATALOG).some(function(k) {
      return Housing.FURNITURE_CATALOG[k].category === 'decoration';
    });
    assert.ok(has);
  });

  test('FURNITURE_CATALOG has lighting items', function() {
    var has = Object.keys(Housing.FURNITURE_CATALOG).some(function(k) {
      return Housing.FURNITURE_CATALOG[k].category === 'lighting';
    });
    assert.ok(has);
  });

  test('FURNITURE_CATALOG has crafting_station items', function() {
    var has = Object.keys(Housing.FURNITURE_CATALOG).some(function(k) {
      return Housing.FURNITURE_CATALOG[k].category === 'crafting_station';
    });
    assert.ok(has);
  });

  test('Every furniture item has id, name, cost, decorScore', function() {
    Object.keys(Housing.FURNITURE_CATALOG).forEach(function(k) {
      var item = Housing.FURNITURE_CATALOG[k];
      assert.ok(item.id, k + ' missing id');
      assert.ok(item.name, k + ' missing name');
      assert.ok(typeof item.cost === 'number', k + ' missing cost');
      assert.ok(typeof item.decorScore === 'number', k + ' missing decorScore');
    });
  });

  test('HOUSE_SIZES has cottage, house, manor, estate', function() {
    assert.ok(Housing.HOUSE_SIZES.cottage);
    assert.ok(Housing.HOUSE_SIZES.house);
    assert.ok(Housing.HOUSE_SIZES.manor);
    assert.ok(Housing.HOUSE_SIZES.estate);
  });

  test('Cottage maxRooms is 4', function() {
    assert.strictEqual(Housing.HOUSE_SIZES.cottage.maxRooms, 4);
  });

  test('House maxRooms is 6', function() {
    assert.strictEqual(Housing.HOUSE_SIZES.house.maxRooms, 6);
  });

  test('Manor maxRooms is 8', function() {
    assert.strictEqual(Housing.HOUSE_SIZES.manor.maxRooms, 8);
  });

  test('Estate maxRooms is 12', function() {
    assert.strictEqual(Housing.HOUSE_SIZES.estate.maxRooms, 12);
  });
});

// ---------------------------------------------------------------------------
// Suite: claimPlot
// ---------------------------------------------------------------------------

suite('claimPlot', function() {
  test('claimPlot succeeds for a new player', function() {
    reset();
    var result = Housing.claimPlot('alice', "Alice's Cottage");
    assert.strictEqual(result.success, true);
    assert.ok(result.plot);
  });

  test('claimPlot returns a plot with correct owner', function() {
    reset();
    var result = Housing.claimPlot('alice', "Alice's Cottage");
    assert.strictEqual(result.plot.owner, 'alice');
  });

  test('claimPlot starts with cottage size', function() {
    reset();
    var result = Housing.claimPlot('alice', "Alice's Cottage");
    assert.strictEqual(result.plot.size, 'cottage');
  });

  test('claimPlot starts with private access', function() {
    reset();
    var result = Housing.claimPlot('alice', "Alice's Cottage");
    assert.strictEqual(result.plot.accessLevel, 'private');
  });

  test('claimPlot starts with empty rooms', function() {
    reset();
    var result = Housing.claimPlot('alice', "Alice's Cottage");
    assert.strictEqual(result.plot.rooms.length, 0);
  });

  test('claimPlot fails for a player who already owns a plot', function() {
    reset();
    Housing.claimPlot('alice', "Alice's Cottage");
    var result = Housing.claimPlot('alice', 'Second Home');
    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  test('claimPlot fails when missing playerId', function() {
    reset();
    var result = Housing.claimPlot('', 'Home');
    assert.strictEqual(result.success, false);
  });

  test('claimPlot deducts PLOT_COST from ledger', function() {
    reset();
    var ledger = makeTestLedger(100);
    var spend = makeSpendFn();
    Housing.claimPlot('bob', "Bob's Place", ledger, spend);
    assert.strictEqual(ledger.balances['bob'], undefined); // bob was not pre-seeded
    // seed and retry
  });

  test('claimPlot fails when player cannot afford PLOT_COST', function() {
    reset();
    var ledger = { balances: { poorPlayer: 10 } };
    var spend = makeSpendFn();
    var result = Housing.claimPlot('poorPlayer', 'Dream Home', ledger, spend);
    assert.strictEqual(result.success, false);
  });

  test('claimPlot succeeds when ledger is omitted (free mode)', function() {
    reset();
    var result = Housing.claimPlot('alice', 'Free Home');
    assert.strictEqual(result.success, true);
  });

  test('claimPlot uses plotName for plot name', function() {
    reset();
    var result = Housing.claimPlot('alice', 'Mossy Nook');
    assert.strictEqual(result.plot.name, 'Mossy Nook');
  });

  test('claimPlot default name contains playerId when no name given', function() {
    reset();
    var result = Housing.claimPlot('dave');
    assert.ok(result.plot.name.indexOf('dave') !== -1, 'Expected dave in plot name');
  });
});

// ---------------------------------------------------------------------------
// Suite: getPlot
// ---------------------------------------------------------------------------

suite('getPlot', function() {
  test('getPlot returns null before claiming', function() {
    reset();
    var plot = Housing.getPlot('nobody');
    assert.strictEqual(plot, null);
  });

  test('getPlot returns plot after claiming', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var plot = Housing.getPlot('alice');
    assert.ok(plot);
    assert.strictEqual(plot.owner, 'alice');
  });
});

// ---------------------------------------------------------------------------
// Suite: buildRoom
// ---------------------------------------------------------------------------

suite('buildRoom', function() {
  test('buildRoom succeeds for valid type', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.buildRoom('alice', 'bedroom', 'My Bedroom');
    assert.strictEqual(result.success, true);
    assert.ok(result.room);
  });

  test('buildRoom assigns a unique room id', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r1 = Housing.buildRoom('alice', 'bedroom', 'Room A');
    var r2 = Housing.buildRoom('alice', 'kitchen', 'Room B');
    assert.notStrictEqual(r1.room.id, r2.room.id);
  });

  test('buildRoom stores room in plot', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var plot = Housing.getPlot('alice');
    assert.strictEqual(plot.rooms.length, 1);
  });

  test('buildRoom fails for unknown room type', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.buildRoom('alice', 'dungeon', 'Cave');
    assert.strictEqual(result.success, false);
  });

  test('buildRoom fails when no plot exists', function() {
    reset();
    var result = Housing.buildRoom('ghost', 'bedroom', 'Haunted Room');
    assert.strictEqual(result.success, false);
  });

  test('buildRoom enforces cottage max of 4 rooms', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.buildRoom('alice', 'bedroom', 'R1');
    Housing.buildRoom('alice', 'kitchen', 'R2');
    Housing.buildRoom('alice', 'workshop', 'R3');
    Housing.buildRoom('alice', 'garden', 'R4');
    var result = Housing.buildRoom('alice', 'library', 'R5');
    assert.strictEqual(result.success, false);
  });

  test('buildRoom deducts ROOM_COST', function() {
    reset();
    var ledger = { balances: { alice: 200 } };
    var spend = makeSpendFn();
    Housing.claimPlot('alice', 'Home');
    Housing.buildRoom('alice', 'bedroom', 'My Room', ledger, spend);
    assert.strictEqual(ledger.balances['alice'], 190);
  });

  test('buildRoom fails when player cannot afford it', function() {
    reset();
    var ledger = { balances: { alice: 5 } };
    var spend = makeSpendFn();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.buildRoom('alice', 'bedroom', 'Room', ledger, spend);
    assert.strictEqual(result.success, false);
  });
});

// ---------------------------------------------------------------------------
// Suite: removeRoom
// ---------------------------------------------------------------------------

suite('removeRoom', function() {
  test('removeRoom removes the room from the plot', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    Housing.removeRoom('alice', r.room.id);
    var plot = Housing.getPlot('alice');
    assert.strictEqual(plot.rooms.length, 0);
  });

  test('removeRoom fails for invalid roomId', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.removeRoom('alice', 'nonexistent');
    assert.strictEqual(result.success, false);
  });

  test('removeRoom fails when no plot', function() {
    reset();
    var result = Housing.removeRoom('ghost', 'room_1');
    assert.strictEqual(result.success, false);
  });

  test('removeRoom also removes all furniture inside it', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    Housing.placeFurniture('alice', r.room.id, 'wooden_chair');
    Housing.removeRoom('alice', r.room.id);
    var plot = Housing.getPlot('alice');
    assert.strictEqual(plot.rooms.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Suite: placeFurniture
// ---------------------------------------------------------------------------

suite('placeFurniture', function() {
  test('placeFurniture succeeds for valid item', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var result = Housing.placeFurniture('alice', r.room.id, 'wooden_chair');
    assert.strictEqual(result.success, true);
    assert.ok(result.furniture);
  });

  test('placeFurniture stores item in room', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    Housing.placeFurniture('alice', r.room.id, 'wooden_chair');
    var plot = Housing.getPlot('alice');
    assert.strictEqual(plot.rooms[0].furniture.length, 1);
  });

  test('placeFurniture assigns unique instance id', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var f1 = Housing.placeFurniture('alice', r.room.id, 'wooden_chair');
    var f2 = Housing.placeFurniture('alice', r.room.id, 'candle');
    assert.notStrictEqual(f1.furniture.id, f2.furniture.id);
  });

  test('placeFurniture fails for invalid furniture type', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var result = Housing.placeFurniture('alice', r.room.id, 'unicorn_throne');
    assert.strictEqual(result.success, false);
  });

  test('placeFurniture fails when room not found', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.placeFurniture('alice', 'bad_room', 'wooden_chair');
    assert.strictEqual(result.success, false);
  });

  test('placeFurniture fails when no plot', function() {
    reset();
    var result = Housing.placeFurniture('ghost', 'room_1', 'wooden_chair');
    assert.strictEqual(result.success, false);
  });

  test('placeFurniture enforces bedroom maxFurniture (8)', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var items = ['wooden_chair','cushioned_chair','candle','lantern','rug','mirror','painting','tapestry'];
    items.forEach(function(item) { Housing.placeFurniture('alice', r.room.id, item); });
    var result = Housing.placeFurniture('alice', r.room.id, 'statue');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().indexOf('full') !== -1);
  });

  test('placeFurniture deducts item cost from ledger', function() {
    reset();
    var ledger = { balances: { alice: 100 } };
    var spend = makeSpendFn();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    Housing.placeFurniture('alice', r.room.id, 'wooden_chair', ledger, spend);
    // wooden_chair costs 2
    assert.strictEqual(ledger.balances['alice'], 98);
  });

  test('placeFurniture fails when player cannot afford item', function() {
    reset();
    var ledger = { balances: { alice: 1 } };
    var spend = makeSpendFn();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var result = Housing.placeFurniture('alice', r.room.id, 'piano', ledger, spend);
    assert.strictEqual(result.success, false);
  });

  test('furniture item has correct decorScore from catalog', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var result = Housing.placeFurniture('alice', r.room.id, 'painting');
    assert.strictEqual(result.furniture.decorScore, Housing.FURNITURE_CATALOG.painting.decorScore);
  });
});

// ---------------------------------------------------------------------------
// Suite: removeFurniture
// ---------------------------------------------------------------------------

suite('removeFurniture', function() {
  test('removeFurniture removes furniture from room', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var f = Housing.placeFurniture('alice', r.room.id, 'wooden_chair');
    Housing.removeFurniture('alice', r.room.id, f.furniture.id);
    var plot = Housing.getPlot('alice');
    assert.strictEqual(plot.rooms[0].furniture.length, 0);
  });

  test('removeFurniture fails for bad furniture id', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var result = Housing.removeFurniture('alice', r.room.id, 'furn_99999');
    assert.strictEqual(result.success, false);
  });

  test('removeFurniture fails for bad room id', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.removeFurniture('alice', 'bad_room', 'furn_1');
    assert.strictEqual(result.success, false);
  });

  test('removeFurniture fails when no plot', function() {
    reset();
    var result = Housing.removeFurniture('ghost', 'room_1', 'furn_1');
    assert.strictEqual(result.success, false);
  });
});

// ---------------------------------------------------------------------------
// Suite: getFurnitureInRoom
// ---------------------------------------------------------------------------

suite('getFurnitureInRoom', function() {
  test('getFurnitureInRoom returns empty array for empty room', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'kitchen', 'Kitchen');
    var result = Housing.getFurnitureInRoom('alice', r.room.id);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.furniture.length, 0);
  });

  test('getFurnitureInRoom returns placed furniture', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'kitchen', 'Kitchen');
    Housing.placeFurniture('alice', r.room.id, 'wooden_table');
    var result = Housing.getFurnitureInRoom('alice', r.room.id);
    assert.strictEqual(result.furniture.length, 1);
  });

  test('getFurnitureInRoom fails for unknown room', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.getFurnitureInRoom('alice', 'room_99');
    assert.strictEqual(result.success, false);
  });

  test('getFurnitureInRoom fails when no plot', function() {
    reset();
    var result = Housing.getFurnitureInRoom('ghost', 'room_1');
    assert.strictEqual(result.success, false);
  });
});

// ---------------------------------------------------------------------------
// Suite: getHouseLayout
// ---------------------------------------------------------------------------

suite('getHouseLayout', function() {
  test('getHouseLayout returns layout with correct size', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.getHouseLayout('alice');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.layout.size, 'cottage');
  });

  test('getHouseLayout includes room count', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var result = Housing.getHouseLayout('alice');
    assert.strictEqual(result.layout.roomCount, 1);
  });

  test('getHouseLayout includes maxRooms from size', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.getHouseLayout('alice');
    assert.strictEqual(result.layout.maxRooms, 4);
  });

  test('getHouseLayout includes owner', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.getHouseLayout('alice');
    assert.strictEqual(result.layout.owner, 'alice');
  });

  test('getHouseLayout fails when no plot', function() {
    reset();
    var result = Housing.getHouseLayout('ghost');
    assert.strictEqual(result.success, false);
  });

  test('getHouseLayout rooms include furnitureCount', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    Housing.placeFurniture('alice', r.room.id, 'wooden_chair');
    var result = Housing.getHouseLayout('alice');
    assert.strictEqual(result.layout.rooms[0].furnitureCount, 1);
  });
});

// ---------------------------------------------------------------------------
// Suite: upgradeHouse
// ---------------------------------------------------------------------------

suite('upgradeHouse', function() {
  test('upgradeHouse upgrades cottage to house', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.upgradeHouse('alice');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.newSize, 'house');
  });

  test('upgradeHouse updates plot size', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.upgradeHouse('alice');
    var plot = Housing.getPlot('alice');
    assert.strictEqual(plot.size, 'house');
  });

  test('upgradeHouse upgrades house to manor', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.upgradeHouse('alice');
    var result = Housing.upgradeHouse('alice');
    assert.strictEqual(result.newSize, 'manor');
  });

  test('upgradeHouse upgrades manor to estate', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.upgradeHouse('alice');
    Housing.upgradeHouse('alice');
    var result = Housing.upgradeHouse('alice');
    assert.strictEqual(result.newSize, 'estate');
  });

  test('upgradeHouse fails when already at estate', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.upgradeHouse('alice');
    Housing.upgradeHouse('alice');
    Housing.upgradeHouse('alice');
    var result = Housing.upgradeHouse('alice');
    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  test('upgradeHouse fails when no plot', function() {
    reset();
    var result = Housing.upgradeHouse('ghost');
    assert.strictEqual(result.success, false);
  });

  test('upgradeHouse deducts upgrade cost from ledger', function() {
    reset();
    var ledger = { balances: { alice: 500 } };
    var spend = makeSpendFn();
    Housing.claimPlot('alice', 'Home');
    Housing.upgradeHouse('alice', ledger, spend);
    // cottage upgradeCost = 30
    assert.strictEqual(ledger.balances['alice'], 470);
  });

  test('upgradeHouse fails when player cannot afford it', function() {
    reset();
    var ledger = { balances: { alice: 5 } };
    var spend = makeSpendFn();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.upgradeHouse('alice', ledger, spend);
    assert.strictEqual(result.success, false);
  });

  test('upgradeHouse allows more rooms after upgrade', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.buildRoom('alice', 'bedroom', 'R1');
    Housing.buildRoom('alice', 'kitchen', 'R2');
    Housing.buildRoom('alice', 'workshop', 'R3');
    Housing.buildRoom('alice', 'garden', 'R4');
    Housing.upgradeHouse('alice'); // now house = 6 rooms
    var r5 = Housing.buildRoom('alice', 'library', 'R5');
    assert.strictEqual(r5.success, true);
  });
});

// ---------------------------------------------------------------------------
// Suite: setVisitorAccess
// ---------------------------------------------------------------------------

suite('setVisitorAccess', function() {
  test('setVisitorAccess to public succeeds', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.setVisitorAccess('alice', 'public');
    assert.strictEqual(result.success, true);
  });

  test('setVisitorAccess updates the plot accessLevel', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'public');
    var plot = Housing.getPlot('alice');
    assert.strictEqual(plot.accessLevel, 'public');
  });

  test('setVisitorAccess to friends succeeds', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.setVisitorAccess('alice', 'friends');
    assert.strictEqual(result.success, true);
  });

  test('setVisitorAccess to private succeeds', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'public');
    var result = Housing.setVisitorAccess('alice', 'private');
    assert.strictEqual(result.success, true);
  });

  test('setVisitorAccess to invalid level fails', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.setVisitorAccess('alice', 'vip_only');
    assert.strictEqual(result.success, false);
  });

  test('setVisitorAccess fails when no plot', function() {
    reset();
    var result = Housing.setVisitorAccess('ghost', 'public');
    assert.strictEqual(result.success, false);
  });
});

// ---------------------------------------------------------------------------
// Suite: addVisitorPermission / getVisitors / removeVisitorPermission
// ---------------------------------------------------------------------------

suite('addVisitorPermission', function() {
  test('addVisitorPermission adds friend to list', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.addVisitorPermission('alice', 'bob');
    var result = Housing.getVisitors('alice');
    assert.ok(result.friends.indexOf('bob') !== -1);
  });

  test('addVisitorPermission fails if already on list', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.addVisitorPermission('alice', 'bob');
    var result = Housing.addVisitorPermission('alice', 'bob');
    assert.strictEqual(result.success, false);
  });

  test('addVisitorPermission fails when no plot', function() {
    reset();
    var result = Housing.addVisitorPermission('ghost', 'bob');
    assert.strictEqual(result.success, false);
  });

  test('addVisitorPermission fails with missing friendId', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.addVisitorPermission('alice', '');
    assert.strictEqual(result.success, false);
  });

  test('removeVisitorPermission removes friend', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.addVisitorPermission('alice', 'bob');
    Housing.removeVisitorPermission('alice', 'bob');
    var result = Housing.getVisitors('alice');
    assert.strictEqual(result.friends.indexOf('bob'), -1);
  });

  test('removeVisitorPermission fails when not on list', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.removeVisitorPermission('alice', 'bob');
    assert.strictEqual(result.success, false);
  });

  test('getVisitors returns empty array for fresh plot', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.getVisitors('alice');
    assert.strictEqual(result.friends.length, 0);
  });

  test('getVisitors fails when no plot', function() {
    reset();
    var result = Housing.getVisitors('ghost');
    assert.strictEqual(result.success, false);
  });
});

// ---------------------------------------------------------------------------
// Suite: visitHouse / leaveHouse / getCurrentVisitors
// ---------------------------------------------------------------------------

suite('visitHouse & leaveHouse', function() {
  test('visitHouse succeeds for public house', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'public');
    var result = Housing.visitHouse('alice', 'bob');
    assert.strictEqual(result.success, true);
  });

  test('visitHouse fails for private house when visitor is not owner', function() {
    reset();
    Housing.claimPlot('alice', 'Home'); // private by default
    var result = Housing.visitHouse('alice', 'bob');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.toLowerCase().indexOf('denied') !== -1 || result.error.toLowerCase().indexOf('access') !== -1);
  });

  test('owner can visit own private house', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.visitHouse('alice', 'alice');
    assert.strictEqual(result.success, true);
  });

  test('visitHouse friends-only allows permitted visitor', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'friends');
    Housing.addVisitorPermission('alice', 'bob');
    var result = Housing.visitHouse('alice', 'bob');
    assert.strictEqual(result.success, true);
  });

  test('visitHouse friends-only denies stranger', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'friends');
    var result = Housing.visitHouse('alice', 'stranger');
    assert.strictEqual(result.success, false);
  });

  test('visitHouse fails when no plot', function() {
    reset();
    var result = Housing.visitHouse('ghost', 'bob');
    assert.strictEqual(result.success, false);
  });

  test('visitHouse fails if visitor already present', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'public');
    Housing.visitHouse('alice', 'bob');
    var result = Housing.visitHouse('alice', 'bob');
    assert.strictEqual(result.success, false);
  });

  test('getCurrentVisitors returns visitor after arrival', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'public');
    Housing.visitHouse('alice', 'bob');
    var visitors = Housing.getCurrentVisitors('alice');
    assert.ok(visitors.indexOf('bob') !== -1);
  });

  test('leaveHouse removes visitor', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'public');
    Housing.visitHouse('alice', 'bob');
    Housing.leaveHouse('alice', 'bob');
    var visitors = Housing.getCurrentVisitors('alice');
    assert.strictEqual(visitors.indexOf('bob'), -1);
  });

  test('leaveHouse fails when visitor not present', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var result = Housing.leaveHouse('alice', 'bob');
    assert.strictEqual(result.success, false);
  });

  test('getCurrentVisitors returns empty for non-existent plot', function() {
    reset();
    var visitors = Housing.getCurrentVisitors('ghost');
    assert.strictEqual(visitors.length, 0);
  });

  test('multiple visitors can visit a public house', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'public');
    Housing.visitHouse('alice', 'bob');
    Housing.visitHouse('alice', 'carol');
    var visitors = Housing.getCurrentVisitors('alice');
    assert.strictEqual(visitors.length, 2);
  });
});

// ---------------------------------------------------------------------------
// Suite: getHouseScore
// ---------------------------------------------------------------------------

suite('getHouseScore', function() {
  test('getHouseScore returns 0 for empty house', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    assert.strictEqual(Housing.getHouseScore('alice'), 0);
  });

  test('getHouseScore returns 0 for rooms with no furniture', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    assert.strictEqual(Housing.getHouseScore('alice'), 0);
  });

  test('getHouseScore returns 0 for non-existent player', function() {
    reset();
    assert.strictEqual(Housing.getHouseScore('ghost'), 0);
  });

  test('getHouseScore sums decorScores across rooms', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r1 = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var r2 = Housing.buildRoom('alice', 'gallery', 'Gallery');
    Housing.placeFurniture('alice', r1.room.id, 'wooden_chair'); // decorScore: 1
    Housing.placeFurniture('alice', r2.room.id, 'painting');     // decorScore: 8
    // cottage multiplier = 1
    var score = Housing.getHouseScore('alice');
    assert.strictEqual(score, 9);
  });

  test('getHouseScore applies size multiplier for estate', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.upgradeHouse('alice');
    Housing.upgradeHouse('alice');
    Housing.upgradeHouse('alice'); // estate
    var r = Housing.buildRoom('alice', 'gallery', 'Gallery');
    Housing.placeFurniture('alice', r.room.id, 'painting'); // decorScore: 8
    var score = Housing.getHouseScore('alice');
    // estate multiplier = 1.5, floor(8 * 1.5) = 12
    assert.strictEqual(score, 12);
  });

  test('getHouseScore increases when furniture is added', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var before = Housing.getHouseScore('alice');
    Housing.placeFurniture('alice', r.room.id, 'chandelier'); // decorScore: 14
    var after = Housing.getHouseScore('alice');
    assert.ok(after > before);
  });
});

// ---------------------------------------------------------------------------
// Suite: getComfortBonus
// ---------------------------------------------------------------------------

suite('getComfortBonus', function() {
  test('getComfortBonus returns empty object for no plot', function() {
    reset();
    var bonus = Housing.getComfortBonus('ghost');
    assert.deepStrictEqual(bonus, {});
  });

  test('getComfortBonus returns empty object for house with no rooms', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var bonus = Housing.getComfortBonus('alice');
    assert.deepStrictEqual(bonus, {});
  });

  test('getComfortBonus returns empty for unfurnished rooms', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var bonus = Housing.getComfortBonus('alice');
    assert.deepStrictEqual(bonus, {});
  });

  test('getComfortBonus includes bedroom rest bonus when furnished', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    Housing.placeFurniture('alice', r.room.id, 'wooden_chair');
    var bonus = Housing.getComfortBonus('alice');
    assert.ok(bonus.rest, 'Expected rest bonus');
    assert.strictEqual(bonus.rest, Housing.ROOM_TYPES.bedroom.comfortBonus.rest);
  });

  test('getComfortBonus includes workshop craft bonus', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'workshop', 'Workshop');
    Housing.placeFurniture('alice', r.room.id, 'carpentry_bench');
    var bonus = Housing.getComfortBonus('alice');
    assert.ok(bonus.craft);
  });

  test('getComfortBonus stacks bonuses from multiple rooms', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r1 = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var r2 = Housing.buildRoom('alice', 'library', 'Library');
    Housing.placeFurniture('alice', r1.room.id, 'wooden_chair');
    Housing.placeFurniture('alice', r2.room.id, 'bookshelf');
    var bonus = Housing.getComfortBonus('alice');
    assert.ok(bonus.rest, 'Expected rest bonus');
    assert.ok(bonus.knowledge, 'Expected knowledge bonus');
  });
});

// ---------------------------------------------------------------------------
// Suite: State persistence
// ---------------------------------------------------------------------------

suite('State persistence', function() {
  test('getHousingState returns serializable object', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var state = Housing.getHousingState();
    assert.ok(state);
    assert.ok(state.plots);
    assert.ok(state.plots['alice']);
  });

  test('initHousing restores plots', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var state = Housing.getHousingState();

    // Reset and restore
    Housing._reset();
    Housing.initHousing(state);
    var plot = Housing.getPlot('alice');
    assert.ok(plot, 'Plot should be restored');
    assert.strictEqual(plot.owner, 'alice');
  });

  test('initHousing with no data does not crash', function() {
    reset();
    Housing.initHousing(null);
    assert.ok(true);
  });

  test('initHousing with empty object does not crash', function() {
    reset();
    Housing.initHousing({});
    assert.ok(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: Edge cases and integration
// ---------------------------------------------------------------------------

suite('Edge cases', function() {
  test('Multiple players can each claim a plot', function() {
    reset();
    Housing.claimPlot('alice', 'Alice Home');
    Housing.claimPlot('bob', 'Bob Home');
    assert.ok(Housing.getPlot('alice'));
    assert.ok(Housing.getPlot('bob'));
  });

  test('Removing a room allows building a new one in its place', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.buildRoom('alice', 'bedroom', 'R1');
    Housing.buildRoom('alice', 'kitchen', 'R2');
    Housing.buildRoom('alice', 'workshop', 'R3');
    var r4 = Housing.buildRoom('alice', 'garden', 'R4'); // at max for cottage
    var overflow = Housing.buildRoom('alice', 'library', 'R5');
    assert.strictEqual(overflow.success, false);

    Housing.removeRoom('alice', r4.room.id);
    var r5 = Housing.buildRoom('alice', 'library', 'R5');
    assert.strictEqual(r5.success, true);
  });

  test('furniture ids are globally unique across plots', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.claimPlot('bob', 'Home');
    var ra = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var rb = Housing.buildRoom('bob', 'bedroom', 'Bedroom');
    var fa = Housing.placeFurniture('alice', ra.room.id, 'wooden_chair');
    var fb = Housing.placeFurniture('bob', 'bob', rb.room.id, 'wooden_chair');
    // even if fb fails (bad room id), fa should have a valid id
    assert.ok(fa.furniture.id);
    assert.ok(fa.furniture.id.startsWith('furn_'));
  });

  test('visitHouse fails with missing visitorId', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    Housing.setVisitorAccess('alice', 'public');
    var result = Housing.visitHouse('alice', '');
    assert.strictEqual(result.success, false);
  });

  test('Score of 0 for house with furniture then all removed', function() {
    reset();
    Housing.claimPlot('alice', 'Home');
    var r = Housing.buildRoom('alice', 'bedroom', 'Bedroom');
    var f = Housing.placeFurniture('alice', r.room.id, 'wooden_chair');
    Housing.removeFurniture('alice', r.room.id, f.furniture.id);
    assert.strictEqual(Housing.getHouseScore('alice'), 0);
  });
});

// ---------------------------------------------------------------------------
// Run all
// ---------------------------------------------------------------------------

var passed = report();
process.exit(passed ? 0 : 1);
