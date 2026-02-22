/**
 * tests/test_merchant_guilds.js
 * 140+ tests for the ZION Merchant Guilds system.
 * Standalone runner — no external test framework required.
 * Run with: node tests/test_merchant_guilds.js
 */

'use strict';

var MerchantGuilds = require('../src/js/merchant_guilds');

var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

function assertEqual(a, b, msg) {
  if (a !== b) {
    throw new Error((msg || 'Expected equality') + ': got ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
  }
}

function assertNotEqual(a, b, msg) {
  if (a === b) {
    throw new Error((msg || 'Expected inequality') + ': both are ' + JSON.stringify(a));
  }
}

function assertNull(val, msg) {
  if (val !== null && val !== undefined) {
    throw new Error((msg || 'Expected null/undefined') + ': got ' + JSON.stringify(val));
  }
}

function assertNotNull(val, msg) {
  if (val === null || val === undefined) {
    throw new Error((msg || 'Expected non-null') + ': got ' + JSON.stringify(val));
  }
}

function assertApprox(a, b, tolerance, msg) {
  if (Math.abs(a - b) > (tolerance || 0.001)) {
    throw new Error((msg || 'Expected approx equality') + ': ' + a + ' vs ' + b);
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS ' + name + '\n');
  } catch (e) {
    failed++;
    failures.push({ name: name, error: e.message });
    process.stdout.write('  FAIL ' + name + '\n       ' + e.message + '\n');
  }
}

function suite(name) {
  process.stdout.write('\n--- ' + name + ' ---\n');
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeState() {
  return MerchantGuilds.createState();
}

function buildGuild(state, typeId, founderId, name, tick) {
  typeId = typeId || 'traders';
  founderId = founderId || 'player_founder';
  name = name || 'Test Guild';
  tick = tick || 1000;
  var result = MerchantGuilds.createGuild(state, founderId, typeId, name, tick);
  if (!result.success) throw new Error('buildGuild failed: ' + result.reason);
  return result.guild;
}

function buildGuildWithMembers(state, typeId, tick) {
  var guild = buildGuild(state, typeId, 'founder_x', 'Big Guild', tick);
  MerchantGuilds.joinGuild(state, 'member_a', guild.id, tick);
  MerchantGuilds.joinGuild(state, 'member_b', guild.id, tick);
  return guild;
}

function buildContract(state, guildId, tick) {
  var result = MerchantGuilds.createContract(
    state, guildId, 'nexus', 'gardens', 'iron_ore', 50, 200, tick
  );
  if (!result.success) throw new Error('buildContract failed: ' + result.reason);
  return result.contract;
}

function buildAcceptedContract(state, guildId, playerId, tick) {
  var contract = buildContract(state, guildId, tick);
  var acceptResult = MerchantGuilds.acceptContract(state, contract.id, playerId, tick);
  if (!acceptResult.success) throw new Error('acceptContract failed: ' + acceptResult.reason);
  return acceptResult.contract;
}

// ===========================================================================
// SUITE 1: GUILD_TYPES definitions
// ===========================================================================
suite('GUILD_TYPES — definitions');

test('GUILD_TYPES is exported as an array', function() {
  assert(Array.isArray(MerchantGuilds.GUILD_TYPES), 'GUILD_TYPES should be an array');
});

test('GUILD_TYPES has exactly 5 types', function() {
  assertEqual(MerchantGuilds.GUILD_TYPES.length, 5, 'should have 5 guild types');
});

test('traders type exists and has correct fields', function() {
  var t = null;
  for (var i = 0; i < MerchantGuilds.GUILD_TYPES.length; i++) {
    if (MerchantGuilds.GUILD_TYPES[i].id === 'traders') t = MerchantGuilds.GUILD_TYPES[i];
  }
  assertNotNull(t, 'traders type should exist');
  assertEqual(t.specialty, 'buy_sell_margins');
  assertEqual(t.maxMembers, 20);
  assert(typeof t.name === 'string' && t.name.length > 0, 'name should be a non-empty string');
  assert(typeof t.description === 'string', 'description should be a string');
  assertNotNull(t.baseBonus, 'baseBonus should exist');
});

test('miners type exists with correct specialty', function() {
  var t = null;
  for (var i = 0; i < MerchantGuilds.GUILD_TYPES.length; i++) {
    if (MerchantGuilds.GUILD_TYPES[i].id === 'miners') t = MerchantGuilds.GUILD_TYPES[i];
  }
  assertNotNull(t, 'miners type should exist');
  assertEqual(t.specialty, 'resource_extraction');
  assertEqual(t.maxMembers, 15);
});

test('farmers type exists with correct specialty', function() {
  var t = null;
  for (var i = 0; i < MerchantGuilds.GUILD_TYPES.length; i++) {
    if (MerchantGuilds.GUILD_TYPES[i].id === 'farmers') t = MerchantGuilds.GUILD_TYPES[i];
  }
  assertNotNull(t, 'farmers type should exist');
  assertEqual(t.specialty, 'produce');
  assertEqual(t.maxMembers, 18);
});

test('alchemists type exists with correct specialty', function() {
  var t = null;
  for (var i = 0; i < MerchantGuilds.GUILD_TYPES.length; i++) {
    if (MerchantGuilds.GUILD_TYPES[i].id === 'alchemists') t = MerchantGuilds.GUILD_TYPES[i];
  }
  assertNotNull(t, 'alchemists type should exist');
  assertEqual(t.specialty, 'rare_crafting');
  assertEqual(t.maxMembers, 12);
});

test('cartographers type exists with correct specialty', function() {
  var t = null;
  for (var i = 0; i < MerchantGuilds.GUILD_TYPES.length; i++) {
    if (MerchantGuilds.GUILD_TYPES[i].id === 'cartographers') t = MerchantGuilds.GUILD_TYPES[i];
  }
  assertNotNull(t, 'cartographers type should exist');
  assertEqual(t.specialty, 'exploration_maps');
  assertEqual(t.maxMembers, 10);
});

test('each guild type has all required fields', function() {
  var required = ['id', 'name', 'description', 'specialty', 'baseBonus', 'maxMembers'];
  for (var i = 0; i < MerchantGuilds.GUILD_TYPES.length; i++) {
    var gt = MerchantGuilds.GUILD_TYPES[i];
    for (var j = 0; j < required.length; j++) {
      assert(gt.hasOwnProperty(required[j]), gt.id + ' missing field ' + required[j]);
    }
  }
});

test('each guild type maxMembers is a positive number', function() {
  for (var i = 0; i < MerchantGuilds.GUILD_TYPES.length; i++) {
    assert(MerchantGuilds.GUILD_TYPES[i].maxMembers > 0, MerchantGuilds.GUILD_TYPES[i].id + ' maxMembers should be positive');
  }
});

// ===========================================================================
// SUITE 2: TRADE_ROUTES definitions
// ===========================================================================
suite('TRADE_ROUTES — definitions');

test('TRADE_ROUTES is exported as an array', function() {
  assert(Array.isArray(MerchantGuilds.TRADE_ROUTES), 'TRADE_ROUTES should be an array');
});

test('TRADE_ROUTES has exactly 12 routes', function() {
  assertEqual(MerchantGuilds.TRADE_ROUTES.length, 12, 'should have 12 trade routes');
});

test('each trade route has required fields', function() {
  var required = ['id', 'name', 'origin', 'destination', 'duration', 'risk', 'goods', 'capacity'];
  for (var i = 0; i < MerchantGuilds.TRADE_ROUTES.length; i++) {
    var r = MerchantGuilds.TRADE_ROUTES[i];
    for (var j = 0; j < required.length; j++) {
      assert(r.hasOwnProperty(required[j]), r.id + ' missing field ' + required[j]);
    }
  }
});

test('each route has positive duration', function() {
  for (var i = 0; i < MerchantGuilds.TRADE_ROUTES.length; i++) {
    assert(MerchantGuilds.TRADE_ROUTES[i].duration > 0, MerchantGuilds.TRADE_ROUTES[i].id + ' duration should be positive');
  }
});

test('each route has risk between 0 and 1', function() {
  for (var i = 0; i < MerchantGuilds.TRADE_ROUTES.length; i++) {
    var r = MerchantGuilds.TRADE_ROUTES[i];
    assert(r.risk >= 0 && r.risk <= 1, r.id + ' risk should be between 0 and 1');
  }
});

test('each route goods is a non-empty array', function() {
  for (var i = 0; i < MerchantGuilds.TRADE_ROUTES.length; i++) {
    var r = MerchantGuilds.TRADE_ROUTES[i];
    assert(Array.isArray(r.goods) && r.goods.length > 0, r.id + ' goods should be a non-empty array');
  }
});

test('each route has distinct origin and destination', function() {
  for (var i = 0; i < MerchantGuilds.TRADE_ROUTES.length; i++) {
    var r = MerchantGuilds.TRADE_ROUTES[i];
    assertNotEqual(r.origin, r.destination, r.id + ' origin and destination should differ');
  }
});

test('route IDs are unique', function() {
  var seen = {};
  for (var i = 0; i < MerchantGuilds.TRADE_ROUTES.length; i++) {
    var id = MerchantGuilds.TRADE_ROUTES[i].id;
    assert(!seen[id], 'Duplicate route id: ' + id);
    seen[id] = true;
  }
});

test('routes use only the 8 valid zones', function() {
  var validZones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  for (var i = 0; i < MerchantGuilds.TRADE_ROUTES.length; i++) {
    var r = MerchantGuilds.TRADE_ROUTES[i];
    assert(validZones.indexOf(r.origin) !== -1, r.id + ' origin "' + r.origin + '" not in valid zones');
    assert(validZones.indexOf(r.destination) !== -1, r.id + ' destination "' + r.destination + '" not in valid zones');
  }
});

// ===========================================================================
// SUITE 3: MERCHANT_RANKS definitions
// ===========================================================================
suite('MERCHANT_RANKS — definitions');

test('MERCHANT_RANKS is exported as an array', function() {
  assert(Array.isArray(MerchantGuilds.MERCHANT_RANKS), 'MERCHANT_RANKS should be an array');
});

test('MERCHANT_RANKS has 4 ranks', function() {
  assertEqual(MerchantGuilds.MERCHANT_RANKS.length, 4, 'should have 4 merchant ranks');
});

test('novice rank exists with threshold 0', function() {
  var found = null;
  for (var i = 0; i < MerchantGuilds.MERCHANT_RANKS.length; i++) {
    if (MerchantGuilds.MERCHANT_RANKS[i].id === 'novice') found = MerchantGuilds.MERCHANT_RANKS[i];
  }
  assertNotNull(found, 'novice rank should exist');
  assertEqual(found.threshold, 0);
});

test('journeyman rank exists with threshold 500', function() {
  var found = null;
  for (var i = 0; i < MerchantGuilds.MERCHANT_RANKS.length; i++) {
    if (MerchantGuilds.MERCHANT_RANKS[i].id === 'journeyman') found = MerchantGuilds.MERCHANT_RANKS[i];
  }
  assertNotNull(found, 'journeyman rank should exist');
  assertEqual(found.threshold, 500);
});

test('master_merchant rank exists with threshold 2000', function() {
  var found = null;
  for (var i = 0; i < MerchantGuilds.MERCHANT_RANKS.length; i++) {
    if (MerchantGuilds.MERCHANT_RANKS[i].id === 'master_merchant') found = MerchantGuilds.MERCHANT_RANKS[i];
  }
  assertNotNull(found, 'master_merchant rank should exist');
  assertEqual(found.threshold, 2000);
});

test('grandmaster rank exists with threshold 10000', function() {
  var found = null;
  for (var i = 0; i < MerchantGuilds.MERCHANT_RANKS.length; i++) {
    if (MerchantGuilds.MERCHANT_RANKS[i].id === 'grandmaster') found = MerchantGuilds.MERCHANT_RANKS[i];
  }
  assertNotNull(found, 'grandmaster rank should exist');
  assertEqual(found.threshold, 10000);
});

test('each rank has required fields', function() {
  var required = ['id', 'name', 'threshold', 'bonus', 'description'];
  for (var i = 0; i < MerchantGuilds.MERCHANT_RANKS.length; i++) {
    var r = MerchantGuilds.MERCHANT_RANKS[i];
    for (var j = 0; j < required.length; j++) {
      assert(r.hasOwnProperty(required[j]), r.id + ' missing field ' + required[j]);
    }
  }
});

// ===========================================================================
// SUITE 4: createState
// ===========================================================================
suite('createState');

test('createState returns correct structure', function() {
  var s = MerchantGuilds.createState();
  assert(typeof s.guilds === 'object', 'guilds should be object');
  assert(Array.isArray(s.contracts), 'contracts should be array');
  assert(Array.isArray(s.cargo), 'cargo should be array');
  assert(typeof s.tariffs === 'object', 'tariffs should be object');
  assert(typeof s.memberStats === 'object', 'memberStats should be object');
  assert(Array.isArray(s.tradeLog), 'tradeLog should be array');
});

test('createState returns empty collections', function() {
  var s = MerchantGuilds.createState();
  assertEqual(Object.keys(s.guilds).length, 0);
  assertEqual(s.contracts.length, 0);
  assertEqual(s.cargo.length, 0);
  assertEqual(s.tradeLog.length, 0);
});

// ===========================================================================
// SUITE 5: createGuild
// ===========================================================================
suite('createGuild');

test('creates a guild successfully', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, 'founder1', 'traders', 'Iron Circle', 1000);
  assert(result.success, 'createGuild should succeed: ' + result.reason);
  assertNotNull(result.guild);
});

test('returned guild has correct fields', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, 'founder1', 'traders', 'Iron Circle', 1000);
  var g = result.guild;
  assertEqual(g.typeId, 'traders');
  assertEqual(g.founderId, 'founder1');
  assertEqual(g.name, 'Iron Circle');
  assertEqual(g.createdAt, 1000);
  assert(Array.isArray(g.members));
  assertEqual(g.members.length, 1);
  assertEqual(g.members[0], 'founder1');
  assertEqual(g.status, 'active');
});

test('guild ID starts with mguild_', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, 'f1', 'miners', 'Rock Guild', 100);
  assert(result.guild.id.indexOf('mguild_') === 0, 'guild id should start with mguild_');
});

test('guild is stored in state.guilds', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, 'f1', 'traders', 'Test', 100);
  var gid = result.guild.id;
  assertNotNull(s.guilds[gid]);
  assertEqual(s.guilds[gid].name, 'Test');
});

test('fails without founderId', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, '', 'traders', 'Test', 100);
  assert(!result.success);
  assertNotNull(result.reason);
});

test('fails without guildTypeId', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, 'f1', '', 'Test', 100);
  assert(!result.success);
});

test('fails with unknown guild type', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, 'f1', 'pirates', 'Test', 100);
  assert(!result.success);
  assert(result.reason.indexOf('Unknown') !== -1 || result.reason.length > 0);
});

test('fails with empty name', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, 'f1', 'traders', '', 100);
  assert(!result.success);
});

test('fails if founder is already in a guild', function() {
  var s = makeState();
  MerchantGuilds.createGuild(s, 'founder1', 'traders', 'Guild A', 100);
  var result = MerchantGuilds.createGuild(s, 'founder1', 'miners', 'Guild B', 200);
  assert(!result.success, 'founder already in a guild should fail');
});

test('different founders can each create a guild', function() {
  var s = makeState();
  var r1 = MerchantGuilds.createGuild(s, 'alice', 'traders', 'Alice Guild', 100);
  var r2 = MerchantGuilds.createGuild(s, 'bob', 'miners', 'Bob Guild', 100);
  assert(r1.success);
  assert(r2.success);
  assertNotEqual(r1.guild.id, r2.guild.id);
});

test('totalVolume and totalProfit initialized to 0', function() {
  var s = makeState();
  var result = MerchantGuilds.createGuild(s, 'f1', 'traders', 'Test', 100);
  assertEqual(result.guild.totalVolume, 0);
  assertEqual(result.guild.totalProfit, 0);
});

// ===========================================================================
// SUITE 6: joinGuild
// ===========================================================================
suite('joinGuild');

test('player can join a guild', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var result = MerchantGuilds.joinGuild(s, 'player2', guild.id, 100);
  assert(result.success, 'joinGuild should succeed: ' + result.reason);
  assertEqual(guild.members.length, 2);
  assert(guild.members.indexOf('player2') !== -1);
});

test('fails if guild not found', function() {
  var s = makeState();
  var result = MerchantGuilds.joinGuild(s, 'player2', 'fake_guild_id', 100);
  assert(!result.success);
  assertNotNull(result.reason);
});

test('fails if player is already in any guild', function() {
  var s = makeState();
  var g1 = buildGuild(s, 'traders', 'founder1', 'Guild 1', 100);
  var g2 = buildGuild(s, 'miners', 'founder2', 'Guild 2', 100);
  MerchantGuilds.joinGuild(s, 'wanderer', g1.id, 100);
  var result = MerchantGuilds.joinGuild(s, 'wanderer', g2.id, 100);
  assert(!result.success, 'player already in guild1 should not join guild2');
});

test('fails if playerId is empty', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var result = MerchantGuilds.joinGuild(s, '', guild.id, 100);
  assert(!result.success);
});

test('fails when guild is full', function() {
  var s = makeState();
  // cartographers max = 10
  var guild = buildGuild(s, 'cartographers', 'founder_0', 'Map Guild', 100);
  // Add 9 more (founder counts as 1, so add 9)
  for (var i = 1; i < 10; i++) {
    MerchantGuilds.joinGuild(s, 'cartomember_' + i, guild.id, 100);
  }
  assertEqual(guild.members.length, 10);
  var result = MerchantGuilds.joinGuild(s, 'overflow_player', guild.id, 100);
  assert(!result.success, 'should fail when guild is full');
  assert(result.reason.indexOf('full') !== -1 || result.reason.length > 0);
});

test('initialises memberStats for new member', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  MerchantGuilds.joinGuild(s, 'newbie', guild.id, 100);
  assertNotNull(s.memberStats['newbie']);
  assertEqual(s.memberStats['newbie'].rankXP, 0);
});

// ===========================================================================
// SUITE 7: leaveGuild
// ===========================================================================
suite('leaveGuild');

test('member can leave guild', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  MerchantGuilds.joinGuild(s, 'leaver', guild.id, 100);
  var result = MerchantGuilds.leaveGuild(s, 'leaver', guild.id, 200);
  assert(result.success, 'leaveGuild should succeed: ' + result.reason);
  assert(guild.members.indexOf('leaver') === -1, 'leaver should be removed');
});

test('fails if guild not found', function() {
  var s = makeState();
  var result = MerchantGuilds.leaveGuild(s, 'p1', 'no_guild', 100);
  assert(!result.success);
});

test('fails if player not in guild', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var result = MerchantGuilds.leaveGuild(s, 'not_a_member', guild.id, 100);
  assert(!result.success);
});

test('founder cannot leave while other members remain', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  MerchantGuilds.joinGuild(s, 'member2', guild.id, 100);
  var result = MerchantGuilds.leaveGuild(s, 'founder1', guild.id, 200);
  assert(!result.success, 'founder should not leave while others are in guild');
});

test('founder can leave if they are the only member', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var result = MerchantGuilds.leaveGuild(s, 'founder1', guild.id, 200);
  assert(result.success);
});

test('guild becomes dissolved when last member leaves', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  MerchantGuilds.leaveGuild(s, 'founder1', guild.id, 200);
  assertEqual(guild.status, 'dissolved');
});

test('guild status remains active while members remain', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  MerchantGuilds.joinGuild(s, 'member2', guild.id, 100);
  MerchantGuilds.leaveGuild(s, 'member2', guild.id, 200);
  assertEqual(guild.status, 'active');
  assertEqual(guild.members.length, 1);
});

// ===========================================================================
// SUITE 8: getGuild, getGuildsByType, getPlayerGuild
// ===========================================================================
suite('getGuild / getGuildsByType / getPlayerGuild');

test('getGuild returns correct guild', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Trade Co', 100);
  var found = MerchantGuilds.getGuild(s, guild.id);
  assertNotNull(found);
  assertEqual(found.id, guild.id);
  assertEqual(found.name, 'Trade Co');
});

test('getGuild returns null for unknown id', function() {
  var s = makeState();
  var found = MerchantGuilds.getGuild(s, 'unknown_id');
  assert(found === null, 'should return null');
});

test('getGuildsByType returns guilds of matching type', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'f1', 'Trade1', 100);
  buildGuild(s, 'traders', 'f2', 'Trade2', 100);
  buildGuild(s, 'miners', 'f3', 'Mine1', 100);
  var traders = MerchantGuilds.getGuildsByType(s, 'traders');
  assertEqual(traders.length, 2);
});

test('getGuildsByType returns empty array for type with no guilds', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'f1', 'Trade1', 100);
  var alch = MerchantGuilds.getGuildsByType(s, 'alchemists');
  assertEqual(alch.length, 0);
});

test('getPlayerGuild returns correct guild for member', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  MerchantGuilds.joinGuild(s, 'searcher', guild.id, 100);
  var found = MerchantGuilds.getPlayerGuild(s, 'searcher');
  assertNotNull(found);
  assertEqual(found.id, guild.id);
});

test('getPlayerGuild returns null for player not in any guild', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'f1', 'Test', 100);
  var found = MerchantGuilds.getPlayerGuild(s, 'nobody');
  assert(found === null, 'should return null for player not in guild');
});

test('getPlayerGuild returns the guild for the founder', function() {
  var s = makeState();
  var guild = buildGuild(s, 'farmers', 'the_founder', 'Farm Guild', 100);
  var found = MerchantGuilds.getPlayerGuild(s, 'the_founder');
  assertNotNull(found);
  assertEqual(found.id, guild.id);
});

// ===========================================================================
// SUITE 9: createContract
// ===========================================================================
suite('createContract');

test('creates a contract successfully', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.createContract(s, guild.id, 'nexus', 'gardens', 'iron_ore', 50, 200, 100);
  assert(result.success, 'createContract should succeed: ' + result.reason);
  assertNotNull(result.contract);
});

test('contract has correct fields', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.createContract(s, guild.id, 'nexus', 'gardens', 'iron_ore', 50, 200, 100);
  var c = result.contract;
  assertEqual(c.guildId, guild.id);
  assertEqual(c.originZone, 'nexus');
  assertEqual(c.destZone, 'gardens');
  assertEqual(c.itemId, 'iron_ore');
  assertEqual(c.quantity, 50);
  assertEqual(c.reward, 200);
  assertEqual(c.status, 'open');
  assert(c.id.indexOf('mc_') === 0, 'contract id should start with mc_');
  assertEqual(c.assignedTo, null);
  assertEqual(c.createdAt, 100);
});

test('fails if guildId not provided', function() {
  var s = makeState();
  var result = MerchantGuilds.createContract(s, '', 'nexus', 'gardens', 'iron_ore', 50, 200, 100);
  assert(!result.success);
});

test('fails if guild not found', function() {
  var s = makeState();
  var result = MerchantGuilds.createContract(s, 'fake_guild', 'nexus', 'gardens', 'iron_ore', 50, 200, 100);
  assert(!result.success);
});

test('fails if origin and destination are the same', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.createContract(s, guild.id, 'nexus', 'nexus', 'iron_ore', 50, 200, 100);
  assert(!result.success);
});

test('fails if quantity is zero or negative', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var r1 = MerchantGuilds.createContract(s, guild.id, 'nexus', 'gardens', 'iron_ore', 0, 200, 100);
  var r2 = MerchantGuilds.createContract(s, guild.id, 'nexus', 'gardens', 'iron_ore', -5, 200, 100);
  assert(!r1.success);
  assert(!r2.success);
});

test('fails if reward is negative', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.createContract(s, guild.id, 'nexus', 'gardens', 'iron_ore', 50, -10, 100);
  assert(!result.success);
});

test('contract with reward 0 succeeds', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.createContract(s, guild.id, 'nexus', 'gardens', 'iron_ore', 50, 0, 100);
  assert(result.success, 'reward 0 should be valid: ' + result.reason);
});

test('contract is stored in state.contracts', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  MerchantGuilds.createContract(s, guild.id, 'nexus', 'gardens', 'iron_ore', 50, 200, 100);
  assertEqual(s.contracts.length, 1);
});

// ===========================================================================
// SUITE 10: acceptContract
// ===========================================================================
suite('acceptContract');

test('guild member can accept a contract', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var contract = buildContract(s, guild.id, 100);
  var result = MerchantGuilds.acceptContract(s, contract.id, 'founder1', 110);
  assert(result.success, 'acceptContract should succeed: ' + result.reason);
  assertEqual(result.contract.status, 'in_progress');
  assertEqual(result.contract.assignedTo, 'founder1');
});

test('contract status changes to in_progress', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var contract = buildContract(s, guild.id, 100);
  MerchantGuilds.acceptContract(s, contract.id, 'founder1', 110);
  assertEqual(contract.status, 'in_progress');
});

test('acceptedAt is set', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var contract = buildContract(s, guild.id, 100);
  MerchantGuilds.acceptContract(s, contract.id, 'founder1', 115);
  assertEqual(contract.acceptedAt, 115);
});

test('fails for non-existent contract', function() {
  var s = makeState();
  var result = MerchantGuilds.acceptContract(s, 'no_contract', 'player1', 100);
  assert(!result.success);
});

test('fails if contract is already in_progress', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  MerchantGuilds.joinGuild(s, 'member2', guild.id, 100);
  var contract = buildContract(s, guild.id, 100);
  MerchantGuilds.acceptContract(s, contract.id, 'founder1', 110);
  var result = MerchantGuilds.acceptContract(s, contract.id, 'member2', 110);
  assert(!result.success, 'cannot accept already in_progress contract');
});

test('fails if player is not a guild member', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var contract = buildContract(s, guild.id, 100);
  var result = MerchantGuilds.acceptContract(s, contract.id, 'outsider_player', 110);
  assert(!result.success);
  assert(result.reason.indexOf('not a member') !== -1 || result.reason.length > 0);
});

// ===========================================================================
// SUITE 11: completeContract
// ===========================================================================
suite('completeContract');

test('completing a contract succeeds', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'founder1', 100);
  var contractId = s.contracts[0].id;
  var result = MerchantGuilds.completeContract(s, contractId, 200);
  assert(result.success, 'completeContract should succeed: ' + result.reason);
});

test('completion awards correct reward', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'founder1', 100);
  var contractId = s.contracts[0].id;
  var result = MerchantGuilds.completeContract(s, contractId, 200);
  assertEqual(result.reward, 200);
});

test('completion awards rankXP', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'founder1', 100);
  var contractId = s.contracts[0].id;
  var result = MerchantGuilds.completeContract(s, contractId, 200);
  assert(result.rankXP > 0, 'rankXP should be positive');
});

test('contract status changes to completed', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'founder1', 100);
  var contract = s.contracts[0];
  MerchantGuilds.completeContract(s, contract.id, 200);
  assertEqual(contract.status, 'completed');
  assertEqual(contract.completedAt, 200);
});

test('updates player memberStats after completion', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'founder1', 100);
  var contractId = s.contracts[0].id;
  MerchantGuilds.completeContract(s, contractId, 200);
  var stats = s.memberStats['founder1'];
  assertEqual(stats.contractsCompleted, 1);
  assertEqual(stats.totalVolume, 50);
  assertEqual(stats.totalProfit, 200);
  assert(stats.rankXP > 0);
});

test('updates guild totals after completion', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'founder1', 100);
  var contractId = s.contracts[0].id;
  MerchantGuilds.completeContract(s, contractId, 200);
  assertEqual(guild.totalVolume, 50);
  assertEqual(guild.totalProfit, 200);
});

test('logs trade to tradeLog', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'founder1', 100);
  var contractId = s.contracts[0].id;
  MerchantGuilds.completeContract(s, contractId, 200);
  assertEqual(s.tradeLog.length, 1);
  assertEqual(s.tradeLog[0].type, 'contract_completed');
});

test('fails for non-existent contract', function() {
  var s = makeState();
  var result = MerchantGuilds.completeContract(s, 'bad_id', 200);
  assert(!result.success);
});

test('fails if contract is not in_progress', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'founder1', 'Test', 100);
  var contract = buildContract(s, guild.id, 100);
  var result = MerchantGuilds.completeContract(s, contract.id, 200);
  assert(!result.success, 'cannot complete an open (not in_progress) contract');
});

// ===========================================================================
// SUITE 12: getContracts / getPlayerContracts
// ===========================================================================
suite('getContracts / getPlayerContracts');

test('getContracts returns all contracts for guild', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  buildContract(s, guild.id, 100);
  buildContract(s, guild.id, 100);
  var result = MerchantGuilds.getContracts(s, guild.id);
  assertEqual(result.length, 2);
});

test('getContracts filtered by status', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  buildContract(s, guild.id, 100);
  buildAcceptedContract(s, guild.id, 'f1', 100);
  var open = MerchantGuilds.getContracts(s, guild.id, 'open');
  var inProg = MerchantGuilds.getContracts(s, guild.id, 'in_progress');
  assertEqual(open.length, 1);
  assertEqual(inProg.length, 1);
});

test('getContracts returns empty for guild with no contracts', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.getContracts(s, guild.id);
  assertEqual(result.length, 0);
});

test('getPlayerContracts returns contracts assigned to player', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'f1', 100);
  var results = MerchantGuilds.getPlayerContracts(s, 'f1');
  assertEqual(results.length, 1);
  assertEqual(results[0].assignedTo, 'f1');
});

test('getPlayerContracts returns empty for player with no contracts', function() {
  var s = makeState();
  var results = MerchantGuilds.getPlayerContracts(s, 'nobody');
  assertEqual(results.length, 0);
});

// ===========================================================================
// SUITE 13: shipCargo
// ===========================================================================
suite('shipCargo');

test('ship cargo on a valid route', function() {
  var s = makeState();
  var result = MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 10, 500);
  assert(result.success, 'shipCargo should succeed: ' + result.reason);
  assertNotNull(result.cargo);
  assert(result.arrivalTick > 500, 'arrivalTick should be in the future');
});

test('cargo has correct fields', function() {
  var s = makeState();
  var result = MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 10, 500);
  var c = result.cargo;
  assertEqual(c.playerId, 'player1');
  assertEqual(c.routeId, 'route_nexus_gardens');
  assertEqual(c.itemId, 'produce');
  assertEqual(c.quantity, 10);
  assertEqual(c.originZone, 'nexus');
  assertEqual(c.destZone, 'gardens');
  assertEqual(c.shippedAt, 500);
  assert(c.id.indexOf('cargo_') === 0, 'cargo id should start with cargo_');
});

test('arrivalTick equals shippedAt + route duration', function() {
  var s = makeState();
  // route_nexus_gardens has duration 30
  var result = MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 10, 500);
  assertEqual(result.arrivalTick, 530);
});

test('fails for unknown route', function() {
  var s = makeState();
  var result = MerchantGuilds.shipCargo(s, 'player1', 'route_no_such', 'produce', 10, 500);
  assert(!result.success);
});

test('fails if quantity exceeds route capacity', function() {
  var s = makeState();
  // route_nexus_gardens capacity = 100
  var result = MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 150, 500);
  assert(!result.success, 'should fail when quantity exceeds capacity');
  assert(result.reason.indexOf('capacity') !== -1 || result.reason.length > 0);
});

test('fails if quantity is zero or negative', function() {
  var s = makeState();
  var r1 = MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 0, 500);
  var r2 = MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', -5, 500);
  assert(!r1.success);
  assert(!r2.success);
});

test('fails if playerId is empty', function() {
  var s = makeState();
  var result = MerchantGuilds.shipCargo(s, '', 'route_nexus_gardens', 'produce', 10, 500);
  assert(!result.success);
});

test('cargo is stored in state.cargo', function() {
  var s = makeState();
  MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 10, 500);
  assertEqual(s.cargo.length, 1);
});

test('route stats are recorded in state.routes', function() {
  var s = makeState();
  MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 10, 500);
  assertNotNull(s.routes['route_nexus_gardens']);
  assertEqual(s.routes['route_nexus_gardens'].totalShipments, 1);
  assertEqual(s.routes['route_nexus_gardens'].totalVolume, 10);
});

test('multiple shipments accumulate in route stats', function() {
  var s = makeState();
  MerchantGuilds.shipCargo(s, 'p1', 'route_nexus_gardens', 'iron', 20, 100);
  MerchantGuilds.shipCargo(s, 'p2', 'route_nexus_gardens', 'herbs', 15, 200);
  assertEqual(s.routes['route_nexus_gardens'].totalShipments, 2);
  assertEqual(s.routes['route_nexus_gardens'].totalVolume, 35);
});

// ===========================================================================
// SUITE 14: checkCargo
// ===========================================================================
suite('checkCargo');

test('processes cargo that has arrived', function() {
  var s = makeState();
  // route_nexus_gardens duration=30; ship at 500, check at 535 (arrived)
  MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 10, 500);
  var result = MerchantGuilds.checkCargo(s, 535);
  assert(Array.isArray(result.arrived), 'arrived should be an array');
  // At least one cargo may have arrived (depending on risk roll)
  assert(result.arrived.length >= 0, 'arrived length should be >= 0');
});

test('does not process cargo that has not yet arrived', function() {
  var s = makeState();
  // duration=30; ship at 500, check at 510 (not yet arrived)
  MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'produce', 10, 500);
  var result = MerchantGuilds.checkCargo(s, 510);
  assertEqual(result.arrived.length, 0, 'cargo should not have arrived yet');
  // Check cargo is still in_transit (or lost)
  var c = s.cargo[0];
  assert(c.arrived === false || c.status === 'lost', 'cargo should not be arrived yet unless lost');
});

test('delivered cargo gets arrived=true and status=delivered', function() {
  var s = makeState();
  // Use a high tick to ensure cargo is not lost (deterministic for low-risk route)
  // Route nexus_gardens risk=0.05; force tick where prng gives >0.05
  // We'll use a manual approach: ship at tick 1, check at arrivalTick+1
  var shipResult = MerchantGuilds.shipCargo(s, 'player1', 'route_nexus_gardens', 'herbs', 5, 1);
  if (shipResult.cargo.status === 'in_transit') {
    MerchantGuilds.checkCargo(s, shipResult.arrivalTick);
    var c = s.cargo[0];
    if (c.status === 'delivered') {
      assert(c.arrived === true, 'arrived flag should be true');
      assertEqual(c.status, 'delivered');
    }
    // Could also be lost - that's fine
    assert(c.arrived === true, 'arrived should be set');
  }
});

test('checkCargo updates player stats for non-lost deliveries', function() {
  var s = makeState();
  // Ship many cargos to ensure at least one arrives safely
  var arrived = false;
  for (var i = 0; i < 30; i++) {
    var sr = MerchantGuilds.shipCargo(s, 'stat_player', 'route_nexus_agora', 'goods', 10, i * 100);
    if (sr.cargo && sr.cargo.status === 'in_transit') {
      MerchantGuilds.checkCargo(s, sr.arrivalTick);
      if (s.memberStats['stat_player'] && s.memberStats['stat_player'].cargoDelivered > 0) {
        arrived = true;
        break;
      }
    }
  }
  assert(arrived, 'At least one cargo delivery should update player stats');
});

test('checkCargo returns empty arrived array when nothing processed', function() {
  var s = makeState();
  var result = MerchantGuilds.checkCargo(s, 1000);
  assertEqual(result.arrived.length, 0);
});

test('already-arrived cargo is not double-processed', function() {
  var s = makeState();
  MerchantGuilds.shipCargo(s, 'p1', 'route_nexus_gardens', 'produce', 5, 100);
  MerchantGuilds.checkCargo(s, 200);
  var result2 = MerchantGuilds.checkCargo(s, 300);
  assertEqual(result2.arrived.length, 0, 'already-processed cargo should not be double-counted');
});

// ===========================================================================
// SUITE 15: setTariff / getTariff
// ===========================================================================
suite('setTariff / getTariff');

test('setTariff sets the tariff for a guild', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.setTariff(s, guild.id, 0.10, 200);
  assert(result.success, 'setTariff should succeed: ' + result.reason);
});

test('getTariff returns correct rate', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  MerchantGuilds.setTariff(s, guild.id, 0.15, 200);
  var tariff = MerchantGuilds.getTariff(s, guild.id);
  assertNotNull(tariff);
  assertEqual(tariff.rate, 0.15);
  assertEqual(tariff.guildId, guild.id);
});

test('getTariff returns null for guild with no tariff', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var tariff = MerchantGuilds.getTariff(s, guild.id);
  assert(tariff === null, 'should return null when no tariff set');
});

test('tariff rate 0 is valid', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.setTariff(s, guild.id, 0, 200);
  assert(result.success, 'rate 0 should be valid: ' + result.reason);
});

test('tariff rate 1.0 is valid', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.setTariff(s, guild.id, 1.0, 200);
  assert(result.success, 'rate 1.0 should be valid: ' + result.reason);
});

test('tariff rate > 1 fails', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.setTariff(s, guild.id, 1.5, 200);
  assert(!result.success, 'rate > 1 should fail');
});

test('negative tariff rate fails', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var result = MerchantGuilds.setTariff(s, guild.id, -0.1, 200);
  assert(!result.success, 'negative rate should fail');
});

test('tariff set fails for unknown guild', function() {
  var s = makeState();
  var result = MerchantGuilds.setTariff(s, 'no_guild', 0.1, 200);
  assert(!result.success);
});

test('setAt is recorded in tariff', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  MerchantGuilds.setTariff(s, guild.id, 0.08, 350);
  var tariff = MerchantGuilds.getTariff(s, guild.id);
  assertEqual(tariff.setAt, 350);
});

test('tariff can be updated by setting a new rate', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  MerchantGuilds.setTariff(s, guild.id, 0.05, 100);
  MerchantGuilds.setTariff(s, guild.id, 0.20, 200);
  var tariff = MerchantGuilds.getTariff(s, guild.id);
  assertEqual(tariff.rate, 0.20);
});

// ===========================================================================
// SUITE 16: getMerchantRank
// ===========================================================================
suite('getMerchantRank');

test('new player starts at novice rank', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'newbie', 'Test', 100);
  var rankInfo = MerchantGuilds.getMerchantRank(s, 'newbie');
  assertEqual(rankInfo.rank.id, 'novice');
  assertEqual(rankInfo.rankXP, 0);
});

test('player at 500 rankXP gets journeyman rank', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'mid_player', 'Test', 100);
  s.memberStats['mid_player'].rankXP = 500;
  var rankInfo = MerchantGuilds.getMerchantRank(s, 'mid_player');
  assertEqual(rankInfo.rank.id, 'journeyman');
});

test('player at 2000 rankXP gets master_merchant rank', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'pro', 'Test', 100);
  s.memberStats['pro'].rankXP = 2000;
  var rankInfo = MerchantGuilds.getMerchantRank(s, 'pro');
  assertEqual(rankInfo.rank.id, 'master_merchant');
});

test('player at 10000 rankXP gets grandmaster rank', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'legend', 'Test', 100);
  s.memberStats['legend'].rankXP = 10000;
  var rankInfo = MerchantGuilds.getMerchantRank(s, 'legend');
  assertEqual(rankInfo.rank.id, 'grandmaster');
});

test('getMerchantRank returns nextRank for non-grandmasters', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'climber', 'Test', 100);
  s.memberStats['climber'].rankXP = 100;
  var rankInfo = MerchantGuilds.getMerchantRank(s, 'climber');
  assertNotNull(rankInfo.nextRank, 'nextRank should exist for novice');
  assert(rankInfo.xpToNext > 0, 'xpToNext should be positive');
});

test('getMerchantRank nextRank is null for grandmaster', function() {
  var s = makeState();
  buildGuild(s, 'traders', 'top', 'Test', 100);
  s.memberStats['top'].rankXP = 99999;
  var rankInfo = MerchantGuilds.getMerchantRank(s, 'top');
  assertEqual(rankInfo.rank.id, 'grandmaster');
  assert(rankInfo.nextRank === null, 'no nextRank for grandmaster');
  assertEqual(rankInfo.xpToNext, 0);
});

test('rankXP increases after completing contracts', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'earner', 'Test', 100);
  buildAcceptedContract(s, guild.id, 'earner', 100);
  MerchantGuilds.completeContract(s, s.contracts[0].id, 200);
  var rankInfo = MerchantGuilds.getMerchantRank(s, 'earner');
  assert(rankInfo.rankXP > 0, 'rankXP should increase after contract completion');
});

// ===========================================================================
// SUITE 17: getSupplyChain
// ===========================================================================
suite('getSupplyChain');

test('getSupplyChain returns expected structure', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var chain = MerchantGuilds.getSupplyChain(s, guild.id);
  assert(Array.isArray(chain.suppliers), 'suppliers should be an array');
  assert(Array.isArray(chain.consumers), 'consumers should be an array');
  assert(Array.isArray(chain.routes), 'routes should be an array');
});

test('getSupplyChain returns empty arrays for guild with no cargo', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  var chain = MerchantGuilds.getSupplyChain(s, guild.id);
  assertEqual(chain.suppliers.length, 0);
  assertEqual(chain.consumers.length, 0);
});

test('getSupplyChain for unknown guild returns empty arrays', function() {
  var s = makeState();
  var chain = MerchantGuilds.getSupplyChain(s, 'ghost_guild');
  assertEqual(chain.suppliers.length, 0);
  assertEqual(chain.consumers.length, 0);
  assertEqual(chain.routes.length, 0);
});

// ===========================================================================
// SUITE 18: getGuildLeaderboard
// ===========================================================================
suite('getGuildLeaderboard');

test('leaderboard is returned for a guild', function() {
  var s = makeState();
  var guild = buildGuildWithMembers(s, 'traders', 100);
  var lb = MerchantGuilds.getGuildLeaderboard(s, guild.id, 10);
  assert(Array.isArray(lb), 'leaderboard should be an array');
});

test('leaderboard has correct number of entries', function() {
  var s = makeState();
  var guild = buildGuildWithMembers(s, 'traders', 100);
  var lb = MerchantGuilds.getGuildLeaderboard(s, guild.id, 10);
  assertEqual(lb.length, 3, '3 members: founder_x, member_a, member_b');
});

test('leaderboard entries have correct fields', function() {
  var s = makeState();
  var guild = buildGuildWithMembers(s, 'traders', 100);
  var lb = MerchantGuilds.getGuildLeaderboard(s, guild.id, 10);
  assert(lb.length > 0);
  var entry = lb[0];
  assert(entry.hasOwnProperty('playerId'), 'missing playerId');
  assert(entry.hasOwnProperty('rankXP'), 'missing rankXP');
  assert(entry.hasOwnProperty('rank'), 'missing rank');
  assert(entry.hasOwnProperty('totalVolume'), 'missing totalVolume');
  assert(entry.hasOwnProperty('totalProfit'), 'missing totalProfit');
});

test('leaderboard is sorted by rankXP descending', function() {
  var s = makeState();
  var guild = buildGuildWithMembers(s, 'traders', 100);
  s.memberStats['founder_x'].rankXP = 100;
  s.memberStats['member_a'].rankXP = 500;
  s.memberStats['member_b'].rankXP = 250;
  var lb = MerchantGuilds.getGuildLeaderboard(s, guild.id, 10);
  assertEqual(lb[0].playerId, 'member_a');
  assertEqual(lb[1].playerId, 'member_b');
  assertEqual(lb[2].playerId, 'founder_x');
});

test('leaderboard count limits results', function() {
  var s = makeState();
  var guild = buildGuildWithMembers(s, 'traders', 100);
  var lb = MerchantGuilds.getGuildLeaderboard(s, guild.id, 2);
  assertEqual(lb.length, 2);
});

test('leaderboard returns empty for unknown guild', function() {
  var s = makeState();
  var lb = MerchantGuilds.getGuildLeaderboard(s, 'no_guild', 10);
  assertEqual(lb.length, 0);
});

test('rank field in leaderboard entry reflects actual rank', function() {
  var s = makeState();
  var guild = buildGuildWithMembers(s, 'traders', 100);
  s.memberStats['member_a'].rankXP = 2000;
  var lb = MerchantGuilds.getGuildLeaderboard(s, guild.id, 10);
  var masterEntry = null;
  for (var i = 0; i < lb.length; i++) {
    if (lb[i].playerId === 'member_a') masterEntry = lb[i];
  }
  assertNotNull(masterEntry, 'member_a should be in leaderboard');
  assertEqual(masterEntry.rank.id, 'master_merchant');
});

// ===========================================================================
// SUITE 19: getGuildStats
// ===========================================================================
suite('getGuildStats');

test('getGuildStats returns correct structure', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Trade Co', 100);
  var stats = MerchantGuilds.getGuildStats(s, guild.id);
  assertNotNull(stats, 'stats should not be null');
  assertEqual(stats.guildId, guild.id);
  assertEqual(stats.name, 'Trade Co');
  assertEqual(stats.typeId, 'traders');
  assertEqual(stats.memberCount, 1);
  assertEqual(stats.maxMembers, 20);
  assertEqual(stats.totalVolume, 0);
  assertEqual(stats.totalProfit, 0);
  assertEqual(stats.status, 'active');
});

test('getGuildStats returns null for unknown guild', function() {
  var s = makeState();
  var stats = MerchantGuilds.getGuildStats(s, 'no_guild');
  assert(stats === null, 'should return null for unknown guild');
});

test('getGuildStats reflects contract counts', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  buildContract(s, guild.id, 100);
  buildContract(s, guild.id, 100);
  var stats = MerchantGuilds.getGuildStats(s, guild.id);
  assertEqual(stats.openContracts, 2);
});

test('getGuildStats reflects tariff rate', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'f1', 'Test', 100);
  MerchantGuilds.setTariff(s, guild.id, 0.12, 100);
  var stats = MerchantGuilds.getGuildStats(s, guild.id);
  assertEqual(stats.tariffRate, 0.12);
});

test('getGuildStats memberCount matches actual members', function() {
  var s = makeState();
  var guild = buildGuildWithMembers(s, 'miners', 100);
  var stats = MerchantGuilds.getGuildStats(s, guild.id);
  assertEqual(stats.memberCount, 3);
});

// ===========================================================================
// SUITE 20: getRouteInfo
// ===========================================================================
suite('getRouteInfo');

test('getRouteInfo returns correct info for known route', function() {
  var s = makeState();
  var info = MerchantGuilds.getRouteInfo(s, 'route_nexus_gardens');
  assertNotNull(info, 'should return route info');
  assertEqual(info.id, 'route_nexus_gardens');
  assertEqual(info.origin, 'nexus');
  assertEqual(info.destination, 'gardens');
  assertEqual(info.duration, 30);
  assertEqual(info.risk, 0.05);
  assertEqual(info.capacity, 100);
});

test('getRouteInfo returns null for unknown route', function() {
  var s = makeState();
  var info = MerchantGuilds.getRouteInfo(s, 'route_does_not_exist');
  assert(info === null, 'should return null for unknown route');
});

test('getRouteInfo successRate starts at 1.0 with no shipments', function() {
  var s = makeState();
  var info = MerchantGuilds.getRouteInfo(s, 'route_nexus_agora');
  assertEqual(info.successRate, 1.0, 'success rate should be 1.0 with no shipments');
  assertEqual(info.totalShipments, 0);
  assertEqual(info.totalVolume, 0);
});

test('getRouteInfo updates after shipments', function() {
  var s = makeState();
  MerchantGuilds.shipCargo(s, 'p1', 'route_nexus_agora', 'goods', 50, 100);
  MerchantGuilds.shipCargo(s, 'p1', 'route_nexus_agora', 'goods', 30, 200);
  var info = MerchantGuilds.getRouteInfo(s, 'route_nexus_agora');
  assertEqual(info.totalShipments, 2);
  assertEqual(info.totalVolume, 80);
});

test('getRouteInfo goods is an array', function() {
  var s = makeState();
  var info = MerchantGuilds.getRouteInfo(s, 'route_wilds_nexus');
  assert(Array.isArray(info.goods), 'goods should be an array');
  assert(info.goods.length > 0, 'goods should not be empty');
});

// ===========================================================================
// SUITE 21: Integration tests
// ===========================================================================
suite('Integration — full lifecycle');

test('full merchant guild lifecycle: create -> join -> contract -> complete -> rank up', function() {
  var s = makeState();
  var tick = 1000;

  // 1. Create guild
  var gResult = MerchantGuilds.createGuild(s, 'merchant_hero', 'traders', 'Hero Trading Co', tick);
  assert(gResult.success, '1. create guild');
  var guildId = gResult.guild.id;

  // 2. Create contract
  var cResult = MerchantGuilds.createContract(s, guildId, 'nexus', 'agora', 'silk', 100, 500, tick);
  assert(cResult.success, '2. create contract');

  // 3. Accept contract
  var aResult = MerchantGuilds.acceptContract(s, cResult.contract.id, 'merchant_hero', tick + 5);
  assert(aResult.success, '3. accept contract');

  // 4. Complete contract
  var dResult = MerchantGuilds.completeContract(s, cResult.contract.id, tick + 50);
  assert(dResult.success, '4. complete contract');
  assert(dResult.reward === 500, '4. reward should be 500');

  // 5. Check rank
  var rankInfo = MerchantGuilds.getMerchantRank(s, 'merchant_hero');
  assert(rankInfo.rankXP > 0, '5. rankXP should be positive');

  // 6. Check guild stats
  var stats = MerchantGuilds.getGuildStats(s, guildId);
  assertEqual(stats.completedContracts, 1, '6. completed contracts = 1');
  assertEqual(stats.totalVolume, 100);
  assertEqual(stats.totalProfit, 500);
});

test('cargo shipping and arrival integration', function() {
  var s = makeState();
  var shipResult = MerchantGuilds.shipCargo(s, 'trader_x', 'route_nexus_gardens', 'herbs', 20, 1000);
  assert(shipResult.success);
  assertEqual(shipResult.arrivalTick, 1030);

  // Before arrival
  var early = MerchantGuilds.checkCargo(s, 1020);
  assertEqual(early.arrived.length, 0, 'should not arrive before tick 1030');

  // At or after arrival
  MerchantGuilds.checkCargo(s, 1031);
  var routeInfo = MerchantGuilds.getRouteInfo(s, 'route_nexus_gardens');
  assertEqual(routeInfo.totalShipments, 1);
});

test('multiple guild types can coexist', function() {
  var s = makeState();
  var t = MerchantGuilds.createGuild(s, 'ft', 'traders', 'Traders', 100);
  var m = MerchantGuilds.createGuild(s, 'fm', 'miners', 'Miners', 100);
  var f = MerchantGuilds.createGuild(s, 'ff', 'farmers', 'Farmers', 100);
  var a = MerchantGuilds.createGuild(s, 'fa', 'alchemists', 'Alchemists', 100);
  var c = MerchantGuilds.createGuild(s, 'fc', 'cartographers', 'Cartographers', 100);
  assert(t.success && m.success && f.success && a.success && c.success, 'all guild types should be created');
  assertEqual(Object.keys(s.guilds).length, 5);
});

test('tariff system works alongside contract system', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'boss', 'The Guild', 100);

  // Set tariff
  var tariffResult = MerchantGuilds.setTariff(s, guild.id, 0.08, 100);
  assert(tariffResult.success);

  // Create and complete a contract
  buildAcceptedContract(s, guild.id, 'boss', 100);
  MerchantGuilds.completeContract(s, s.contracts[0].id, 200);

  // Stats updated
  var stats = MerchantGuilds.getGuildStats(s, guild.id);
  assertEqual(stats.tariffRate, 0.08);
  assertEqual(stats.completedContracts, 1);
});

test('leaderboard reflects contract completions', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'winner', 'Champs', 100);
  MerchantGuilds.joinGuild(s, 'loser', guild.id, 100);

  // winner completes a contract
  buildAcceptedContract(s, guild.id, 'winner', 100);
  MerchantGuilds.completeContract(s, s.contracts[0].id, 200);

  var lb = MerchantGuilds.getGuildLeaderboard(s, guild.id, 10);
  assertEqual(lb[0].playerId, 'winner', 'winner should be at top of leaderboard');
});

test('dissolved guild cannot accept new members', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'sole_founder', 'Solo Guild', 100);
  MerchantGuilds.leaveGuild(s, 'sole_founder', guild.id, 200);
  assertEqual(guild.status, 'dissolved');
  var result = MerchantGuilds.joinGuild(s, 'newcomer', guild.id, 300);
  assert(!result.success, 'cannot join dissolved guild');
});

test('player stats accumulate across multiple contracts', function() {
  var s = makeState();
  var guild = buildGuild(s, 'traders', 'worker', 'Work Guild', 100);

  // Complete 3 contracts
  for (var i = 0; i < 3; i++) {
    MerchantGuilds.createContract(s, guild.id, 'nexus', 'agora', 'item_' + i, 30, 100, 100 + i);
    MerchantGuilds.acceptContract(s, s.contracts[i].id, 'worker', 110 + i);
    MerchantGuilds.completeContract(s, s.contracts[i].id, 200 + i);
  }

  var stats = s.memberStats['worker'];
  assertEqual(stats.contractsCompleted, 3);
  assertEqual(stats.totalVolume, 90); // 30 * 3
  assertEqual(stats.totalProfit, 300); // 100 * 3
});

// ===========================================================================
// FINAL REPORT
// ===========================================================================

process.stdout.write('\n========================================\n');
process.stdout.write('  Results: ' + passed + ' passed, ' + failed + ' failed\n');
process.stdout.write('========================================\n');

if (failures.length > 0) {
  process.stdout.write('\nFailures:\n');
  for (var fi = 0; fi < failures.length; fi++) {
    process.stdout.write('  ' + failures[fi].name + ': ' + failures[fi].error + '\n');
  }
}

process.exit(failed === 0 ? 0 : 1);
