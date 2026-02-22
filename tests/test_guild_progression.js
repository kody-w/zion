/**
 * tests/test_guild_progression.js
 * Comprehensive tests for the Guild Progression system
 * 130+ tests covering all exported functions and edge cases
 */

const { test, suite, report, assert } = require('./test_runner');
const GP = require('../src/js/guild_progression');

// ============================================================================
// HELPERS
// ============================================================================

var seq = 0;
function uid() { return 'player_' + (++seq); }
function gid() { return 'guild_' + seq; }

function makeGuild(overrides) {
  var leaderId = uid();
  var state = GP.createGuildProgression(gid(), 'Test Guild ' + seq, leaderId);
  if (overrides) {
    Object.assign(state, overrides);
  }
  return { state: state, leaderId: leaderId };
}

// Fast-forward a guild to a given level by setting guildXP directly
function guildAtLevel(level) {
  var g = makeGuild();
  g.state.guildXP = GP.getXPForLevel(level);
  g.state.level = level;
  g.state.perks = GP.getGuildPerks(level);
  return g;
}

// Add a member with a given rank to a guild state
function addMember(state, playerId, rank, daysAgo) {
  var joined = Date.now() - (daysAgo || 0) * 24 * 60 * 60 * 1000;
  state.members[playerId] = { rank: rank, joined: joined, contributed: 0, displayName: playerId };
  return state;
}

// ============================================================================
// SUITE 1 — Module Exports
// ============================================================================
suite('Module Exports', function() {

  test('createGuildProgression is exported as a function', function() {
    assert.strictEqual(typeof GP.createGuildProgression, 'function');
  });

  test('addGuildXP is exported', function() {
    assert.strictEqual(typeof GP.addGuildXP, 'function');
  });

  test('getGuildLevel is exported', function() {
    assert.strictEqual(typeof GP.getGuildLevel, 'function');
  });

  test('getXPForLevel is exported', function() {
    assert.strictEqual(typeof GP.getXPForLevel, 'function');
  });

  test('getXPToNextLevel is exported', function() {
    assert.strictEqual(typeof GP.getXPToNextLevel, 'function');
  });

  test('getGuildPerks is exported', function() {
    assert.strictEqual(typeof GP.getGuildPerks, 'function');
  });

  test('contributeSpark is exported', function() {
    assert.strictEqual(typeof GP.contributeSpark, 'function');
  });

  test('withdrawSpark is exported', function() {
    assert.strictEqual(typeof GP.withdrawSpark, 'function');
  });

  test('getTreasuryLog is exported', function() {
    assert.strictEqual(typeof GP.getTreasuryLog, 'function');
  });

  test('getRank is exported', function() {
    assert.strictEqual(typeof GP.getRank, 'function');
  });

  test('hasPermission is exported', function() {
    assert.strictEqual(typeof GP.hasPermission, 'function');
  });

  test('setRank is exported', function() {
    assert.strictEqual(typeof GP.setRank, 'function');
  });

  test('getMemberList is exported', function() {
    assert.strictEqual(typeof GP.getMemberList, 'function');
  });

  test('getWeeklyChallenge is exported', function() {
    assert.strictEqual(typeof GP.getWeeklyChallenge, 'function');
  });

  test('updateChallengeProgress is exported', function() {
    assert.strictEqual(typeof GP.updateChallengeProgress, 'function');
  });

  test('getChallengeProgress is exported', function() {
    assert.strictEqual(typeof GP.getChallengeProgress, 'function');
  });

  test('addToVault is exported', function() {
    assert.strictEqual(typeof GP.addToVault, 'function');
  });

  test('takeFromVault is exported', function() {
    assert.strictEqual(typeof GP.takeFromVault, 'function');
  });

  test('getGuildSummary is exported', function() {
    assert.strictEqual(typeof GP.getGuildSummary, 'function');
  });

  test('formatGuildBanner is exported', function() {
    assert.strictEqual(typeof GP.formatGuildBanner, 'function');
  });

  test('WEEKLY_CHALLENGES is exported and has 5 entries', function() {
    assert(Array.isArray(GP.WEEKLY_CHALLENGES), 'WEEKLY_CHALLENGES should be an array');
    assert.strictEqual(GP.WEEKLY_CHALLENGES.length, 5);
  });

  test('LEVEL_PERKS is exported with 10 entries', function() {
    assert.strictEqual(typeof GP.LEVEL_PERKS, 'object');
    assert.strictEqual(Object.keys(GP.LEVEL_PERKS).length, 10);
  });

  test('RANK_DEFINITIONS is exported', function() {
    assert.strictEqual(typeof GP.RANK_DEFINITIONS, 'object');
  });

  test('RANK_ORDER is exported as array with 5 entries', function() {
    assert(Array.isArray(GP.RANK_ORDER));
    assert.strictEqual(GP.RANK_ORDER.length, 5);
  });

});

// ============================================================================
// SUITE 2 — Guild Creation
// ============================================================================
suite('Guild Creation', function() {

  test('createGuildProgression returns an object', function() {
    var g = makeGuild();
    assert(typeof g.state === 'object' && g.state !== null);
  });

  test('state has correct id', function() {
    var state = GP.createGuildProgression('g1', 'TestGuild', 'leader1');
    assert.strictEqual(state.id, 'g1');
  });

  test('state has correct name', function() {
    var state = GP.createGuildProgression('g1', 'TestGuild', 'leader1');
    assert.strictEqual(state.name, 'TestGuild');
  });

  test('state has correct leaderId', function() {
    var state = GP.createGuildProgression('g1', 'TestGuild', 'leader1');
    assert.strictEqual(state.leaderId, 'leader1');
  });

  test('new guild starts at level 1', function() {
    var g = makeGuild();
    assert.strictEqual(g.state.level, 1);
  });

  test('new guild starts with 0 guildXP', function() {
    var g = makeGuild();
    assert.strictEqual(g.state.guildXP, 0);
  });

  test('new guild starts with 0 treasury', function() {
    var g = makeGuild();
    assert.strictEqual(g.state.treasury, 0);
  });

  test('leader is in members with rank leader', function() {
    var g = makeGuild();
    assert(g.state.members[g.leaderId] !== undefined);
    assert.strictEqual(g.state.members[g.leaderId].rank, 'leader');
  });

  test('members has contributed field initialized to 0', function() {
    var g = makeGuild();
    assert.strictEqual(g.state.members[g.leaderId].contributed, 0);
  });

  test('vault starts empty', function() {
    var g = makeGuild();
    assert(Array.isArray(g.state.vault));
    assert.strictEqual(g.state.vault.length, 0);
  });

  test('challenges object is initialized', function() {
    var g = makeGuild();
    assert(typeof g.state.challenges === 'object');
  });

  test('log starts with founding event', function() {
    var g = makeGuild();
    assert(Array.isArray(g.state.log));
    assert(g.state.log.length >= 1);
    assert.strictEqual(g.state.log[0].type, 'founded');
  });

  test('perks array is initialized with level 1 perk', function() {
    var g = makeGuild();
    assert(Array.isArray(g.state.perks));
    assert.strictEqual(g.state.perks.length, 1);
    assert.strictEqual(g.state.perks[0].id, 'founded');
  });

  test('founding log entry references leader', function() {
    var state = GP.createGuildProgression('g1', 'Alpha', 'leaderX');
    assert.strictEqual(state.log[0].by, 'leaderX');
  });

  test('founding log message includes guild name', function() {
    var state = GP.createGuildProgression('g1', 'Horizon', 'ldr');
    assert(state.log[0].message.indexOf('Horizon') !== -1);
  });

});

// ============================================================================
// SUITE 3 — XP Thresholds and Level Calculation
// ============================================================================
suite('XP Thresholds and Level Calculation', function() {

  test('getXPForLevel(1) returns 0', function() {
    assert.strictEqual(GP.getXPForLevel(1), 0);
  });

  test('getXPForLevel(2) returns 500', function() {
    assert.strictEqual(GP.getXPForLevel(2), 500);
  });

  test('getXPForLevel(3) returns 1000', function() {
    assert.strictEqual(GP.getXPForLevel(3), 1000);
  });

  test('getXPForLevel(10) returns 4500', function() {
    assert.strictEqual(GP.getXPForLevel(10), 4500);
  });

  test('getXPForLevel(0) returns 0 (below min)', function() {
    assert.strictEqual(GP.getXPForLevel(0), 0);
  });

  test('getXPForLevel(11) is capped at level 10 threshold', function() {
    assert.strictEqual(GP.getXPForLevel(11), GP.getXPForLevel(10));
  });

  test('getGuildLevel(0) returns 1', function() {
    assert.strictEqual(GP.getGuildLevel(0), 1);
  });

  test('getGuildLevel(499) returns 1', function() {
    assert.strictEqual(GP.getGuildLevel(499), 1);
  });

  test('getGuildLevel(500) returns 2', function() {
    assert.strictEqual(GP.getGuildLevel(500), 2);
  });

  test('getGuildLevel(999) returns 2', function() {
    assert.strictEqual(GP.getGuildLevel(999), 2);
  });

  test('getGuildLevel(1000) returns 3', function() {
    assert.strictEqual(GP.getGuildLevel(1000), 3);
  });

  test('getGuildLevel(4500) returns 10', function() {
    assert.strictEqual(GP.getGuildLevel(4500), 10);
  });

  test('getGuildLevel(9999) returns 10 (max level)', function() {
    assert.strictEqual(GP.getGuildLevel(9999), 10);
  });

  test('getXPToNextLevel: 0 XP returns 500', function() {
    var g = makeGuild();
    assert.strictEqual(GP.getXPToNextLevel(g.state), 500);
  });

  test('getXPToNextLevel: at level 2 threshold returns 500', function() {
    var g = guildAtLevel(2);
    assert.strictEqual(GP.getXPToNextLevel(g.state), 500);
  });

  test('getXPToNextLevel: at max level returns 0', function() {
    var g = guildAtLevel(10);
    assert.strictEqual(GP.getXPToNextLevel(g.state), 0);
  });

  test('getXPToNextLevel: 250 XP into level 1 returns 250', function() {
    var g = makeGuild();
    g.state.guildXP = 250;
    assert.strictEqual(GP.getXPToNextLevel(g.state), 250);
  });

});

// ============================================================================
// SUITE 4 — addGuildXP
// ============================================================================
suite('addGuildXP', function() {

  test('addGuildXP increases guildXP correctly', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 100, 'test');
    assert.strictEqual(result.state.guildXP, 100);
  });

  test('addGuildXP does not mutate original state', function() {
    var g = makeGuild();
    GP.addGuildXP(g.state, 100, 'test');
    assert.strictEqual(g.state.guildXP, 0);
  });

  test('addGuildXP returns leveled=false when no level up', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 100, 'test');
    assert.strictEqual(result.leveled, false);
  });

  test('addGuildXP returns leveled=true when crossing level threshold', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 500, 'test');
    assert.strictEqual(result.leveled, true);
  });

  test('addGuildXP returns correct newLevel on level up', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 500, 'test');
    assert.strictEqual(result.newLevel, 2);
  });

  test('addGuildXP returns perkUnlocked on level up', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 500, 'test');
    assert(result.perkUnlocked !== null);
    assert.strictEqual(result.perkUnlocked.id, 'guild_banner');
  });

  test('addGuildXP skips multiple levels when XP large enough', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 1500, 'big XP');
    assert.strictEqual(result.state.level, 4);
    assert.strictEqual(result.leveled, true);
  });

  test('addGuildXP adds xp_gained entry to log', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 100, 'activity');
    var xpLog = result.state.log.filter(function(e) { return e.type === 'xp_gained'; });
    assert(xpLog.length >= 1);
  });

  test('addGuildXP adds level_up entry to log on level up', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 500, 'test');
    var lvlLog = result.state.log.filter(function(e) { return e.type === 'level_up'; });
    assert(lvlLog.length >= 1);
  });

  test('addGuildXP returns message string', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 100, 'test');
    assert(typeof result.message === 'string' && result.message.length > 0);
  });

  test('addGuildXP at max level does not exceed level 10', function() {
    var g = guildAtLevel(10);
    var result = GP.addGuildXP(g.state, 9999, 'test');
    assert.strictEqual(result.state.level, 10);
  });

  test('addGuildXP updates perks array on level up', function() {
    var g = makeGuild();
    var result = GP.addGuildXP(g.state, 500, 'test');
    assert.strictEqual(result.state.perks.length, 2);
  });

});

// ============================================================================
// SUITE 5 — getGuildPerks
// ============================================================================
suite('getGuildPerks', function() {

  test('level 1 returns 1 perk', function() {
    assert.strictEqual(GP.getGuildPerks(1).length, 1);
  });

  test('level 5 returns 5 perks', function() {
    assert.strictEqual(GP.getGuildPerks(5).length, 5);
  });

  test('level 10 returns 10 perks', function() {
    assert.strictEqual(GP.getGuildPerks(10).length, 10);
  });

  test('level 1 perk has id "founded"', function() {
    var perks = GP.getGuildPerks(1);
    assert.strictEqual(perks[0].id, 'founded');
  });

  test('level 3 perks includes trade_discount', function() {
    var perks = GP.getGuildPerks(3);
    var ids = perks.map(function(p) { return p.id; });
    assert(ids.indexOf('trade_discount') !== -1);
  });

  test('level 7 perks includes guild_vault', function() {
    var perks = GP.getGuildPerks(7);
    var ids = perks.map(function(p) { return p.id; });
    assert(ids.indexOf('guild_vault') !== -1);
  });

  test('level 10 perks includes legendary', function() {
    var perks = GP.getGuildPerks(10);
    var ids = perks.map(function(p) { return p.id; });
    assert(ids.indexOf('legendary') !== -1);
  });

  test('every perk has id, name, desc fields', function() {
    var perks = GP.getGuildPerks(10);
    perks.forEach(function(p) {
      assert(typeof p.id === 'string' && p.id.length > 0, 'perk missing id');
      assert(typeof p.name === 'string' && p.name.length > 0, 'perk missing name');
      assert(typeof p.desc === 'string' && p.desc.length > 0, 'perk missing desc');
    });
  });

});

// ============================================================================
// SUITE 6 — Treasury: contributeSpark
// ============================================================================
suite('Treasury: contributeSpark', function() {

  test('valid contribution increases treasury', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, g.leaderId, 100);
    assert.strictEqual(result.state.treasury, 100);
  });

  test('valid contribution returns success=true', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, g.leaderId, 100);
    assert.strictEqual(result.success, true);
  });

  test('valid contribution returns correct newTreasury', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, g.leaderId, 200);
    assert.strictEqual(result.newTreasury, 200);
  });

  test('non-member contribution returns success=false', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, 'stranger_xyz', 100);
    assert.strictEqual(result.success, false);
  });

  test('zero amount contribution returns success=false', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, g.leaderId, 0);
    assert.strictEqual(result.success, false);
  });

  test('negative amount contribution returns success=false', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, g.leaderId, -50);
    assert.strictEqual(result.success, false);
  });

  test('contributeSpark does not mutate original state', function() {
    var g = makeGuild();
    GP.contributeSpark(g.state, g.leaderId, 100);
    assert.strictEqual(g.state.treasury, 0);
  });

  test('contribution increments member contributed field', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, g.leaderId, 150);
    assert.strictEqual(result.state.members[g.leaderId].contributed, 150);
  });

  test('multiple contributions accumulate in treasury', function() {
    var g = makeGuild();
    var r1 = GP.contributeSpark(g.state, g.leaderId, 100);
    var r2 = GP.contributeSpark(r1.state, g.leaderId, 200);
    assert.strictEqual(r2.state.treasury, 300);
  });

  test('contributeSpark adds treasury_deposit log entry', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, g.leaderId, 50);
    var deposits = result.state.log.filter(function(e) { return e.type === 'treasury_deposit'; });
    assert(deposits.length >= 1);
  });

  test('contributeSpark log entry has correct amount', function() {
    var g = makeGuild();
    var result = GP.contributeSpark(g.state, g.leaderId, 75);
    var deposit = result.state.log.filter(function(e) { return e.type === 'treasury_deposit'; })[0];
    assert.strictEqual(deposit.amount, 75);
  });

});

// ============================================================================
// SUITE 7 — Treasury: withdrawSpark
// ============================================================================
suite('Treasury: withdrawSpark', function() {

  function fundedGuild(amount) {
    var g = makeGuild();
    var r = GP.contributeSpark(g.state, g.leaderId, amount);
    return { state: r.state, leaderId: g.leaderId };
  }

  test('leader can withdraw from funded treasury', function() {
    var g = fundedGuild(500);
    var result = GP.withdrawSpark(g.state, g.leaderId, 200, 'event');
    assert.strictEqual(result.success, true);
  });

  test('withdrawal reduces treasury correctly', function() {
    var g = fundedGuild(500);
    var result = GP.withdrawSpark(g.state, g.leaderId, 200, 'event');
    assert.strictEqual(result.state.treasury, 300);
  });

  test('withdrawal does not mutate original state', function() {
    var g = fundedGuild(500);
    GP.withdrawSpark(g.state, g.leaderId, 200, 'event');
    assert.strictEqual(g.state.treasury, 500);
  });

  test('insufficient funds returns success=false', function() {
    var g = fundedGuild(100);
    var result = GP.withdrawSpark(g.state, g.leaderId, 500, 'too much');
    assert.strictEqual(result.success, false);
  });

  test('insufficient funds message mentions current treasury', function() {
    var g = fundedGuild(100);
    var result = GP.withdrawSpark(g.state, g.leaderId, 500, 'too much');
    assert(result.message.indexOf('100') !== -1);
  });

  test('member (non-officer) cannot withdraw', function() {
    var g = fundedGuild(500);
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.withdrawSpark(g.state, memberId, 100, 'attempt');
    assert.strictEqual(result.success, false);
  });

  test('recruit cannot withdraw', function() {
    var g = fundedGuild(500);
    var recruitId = uid();
    g.state = addMember(g.state, recruitId, 'recruit', 2);
    var result = GP.withdrawSpark(g.state, recruitId, 100, 'attempt');
    assert.strictEqual(result.success, false);
  });

  test('officer can withdraw', function() {
    var g = fundedGuild(500);
    var officerId = uid();
    g.state = addMember(g.state, officerId, 'officer', 20);
    var result = GP.withdrawSpark(g.state, officerId, 100, 'officer action');
    assert.strictEqual(result.success, true);
  });

  test('non-member cannot withdraw', function() {
    var g = fundedGuild(500);
    var result = GP.withdrawSpark(g.state, 'outsider', 100, 'attempt');
    assert.strictEqual(result.success, false);
  });

  test('zero withdrawal returns success=false', function() {
    var g = fundedGuild(500);
    var result = GP.withdrawSpark(g.state, g.leaderId, 0, 'nothing');
    assert.strictEqual(result.success, false);
  });

  test('withdrawal adds treasury_withdrawal log entry', function() {
    var g = fundedGuild(500);
    var result = GP.withdrawSpark(g.state, g.leaderId, 100, 'event');
    var withdrawals = result.state.log.filter(function(e) { return e.type === 'treasury_withdrawal'; });
    assert(withdrawals.length >= 1);
  });

  test('withdrawal log entry records reason', function() {
    var g = fundedGuild(500);
    var result = GP.withdrawSpark(g.state, g.leaderId, 100, 'guild_feast');
    var w = result.state.log.find(function(e) { return e.type === 'treasury_withdrawal'; });
    assert.strictEqual(w.reason, 'guild_feast');
  });

  test('exact treasury amount withdrawal leaves 0', function() {
    var g = fundedGuild(300);
    var result = GP.withdrawSpark(g.state, g.leaderId, 300, 'all out');
    assert.strictEqual(result.state.treasury, 0);
  });

});

// ============================================================================
// SUITE 8 — getTreasuryLog
// ============================================================================
suite('getTreasuryLog', function() {

  test('returns empty array on fresh guild', function() {
    var g = makeGuild();
    var log = GP.getTreasuryLog(g.state);
    assert(Array.isArray(log));
    assert.strictEqual(log.length, 0);
  });

  test('returns deposit entries', function() {
    var g = makeGuild();
    var r = GP.contributeSpark(g.state, g.leaderId, 100);
    var log = GP.getTreasuryLog(r.state);
    assert.strictEqual(log.length, 1);
    assert.strictEqual(log[0].type, 'treasury_deposit');
  });

  test('limit parameter restricts results', function() {
    var g = makeGuild();
    var s = g.state;
    for (var i = 0; i < 10; i++) {
      s = GP.contributeSpark(s, g.leaderId, 10).state;
    }
    var log = GP.getTreasuryLog(s, 5);
    assert.strictEqual(log.length, 5);
  });

  test('default limit returns up to 20 entries', function() {
    var g = makeGuild();
    var s = g.state;
    for (var i = 0; i < 25; i++) {
      s = GP.contributeSpark(s, g.leaderId, 5).state;
    }
    var log = GP.getTreasuryLog(s);
    assert(log.length <= 20);
  });

  test('includes withdrawal entries', function() {
    var g = makeGuild();
    var r1 = GP.contributeSpark(g.state, g.leaderId, 500);
    var r2 = GP.withdrawSpark(r1.state, g.leaderId, 100, 'test');
    var log = GP.getTreasuryLog(r2.state);
    var types = log.map(function(e) { return e.type; });
    assert(types.indexOf('treasury_withdrawal') !== -1);
  });

  test('does not include non-treasury log entries', function() {
    var g = makeGuild();
    var r = GP.contributeSpark(g.state, g.leaderId, 100);
    // XP gain entries should not appear
    var r2 = GP.addGuildXP(r.state, 200, 'activity');
    var log = GP.getTreasuryLog(r2.state);
    log.forEach(function(e) {
      assert(e.type === 'treasury_deposit' || e.type === 'treasury_withdrawal',
        'Unexpected log type: ' + e.type);
    });
  });

});

// ============================================================================
// SUITE 9 — Rank: getRank, hasPermission
// ============================================================================
suite('Rank: getRank and hasPermission', function() {

  test('getRank returns leader for guild leader', function() {
    var g = makeGuild();
    assert.strictEqual(GP.getRank(g.state, g.leaderId), 'leader');
  });

  test('getRank returns non-member for unknown player', function() {
    var g = makeGuild();
    assert.strictEqual(GP.getRank(g.state, 'nobody'), 'non-member');
  });

  test('getRank returns correct rank for officer', function() {
    var g = makeGuild();
    var officerId = uid();
    g.state = addMember(g.state, officerId, 'officer', 20);
    assert.strictEqual(GP.getRank(g.state, officerId), 'officer');
  });

  test('hasPermission: leader has all permissions', function() {
    var g = makeGuild();
    assert.strictEqual(GP.hasPermission(g.state, g.leaderId, 'invite'), true);
    assert.strictEqual(GP.hasPermission(g.state, g.leaderId, 'kick'), true);
    assert.strictEqual(GP.hasPermission(g.state, g.leaderId, 'treasury'), true);
    assert.strictEqual(GP.hasPermission(g.state, g.leaderId, 'chat'), true);
  });

  test('hasPermission: officer has treasury permission', function() {
    var g = makeGuild();
    var officerId = uid();
    g.state = addMember(g.state, officerId, 'officer', 20);
    assert.strictEqual(GP.hasPermission(g.state, officerId, 'treasury'), true);
  });

  test('hasPermission: member does not have treasury permission', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    assert.strictEqual(GP.hasPermission(g.state, memberId, 'treasury'), false);
  });

  test('hasPermission: recruit can chat', function() {
    var g = makeGuild();
    var recruitId = uid();
    g.state = addMember(g.state, recruitId, 'recruit', 2);
    assert.strictEqual(GP.hasPermission(g.state, recruitId, 'chat'), true);
  });

  test('hasPermission: recruit cannot invite', function() {
    var g = makeGuild();
    var recruitId = uid();
    g.state = addMember(g.state, recruitId, 'recruit', 2);
    assert.strictEqual(GP.hasPermission(g.state, recruitId, 'invite'), false);
  });

  test('hasPermission: veteran can invite', function() {
    var g = makeGuild();
    var vetId = uid();
    g.state = addMember(g.state, vetId, 'veteran', 40);
    assert.strictEqual(GP.hasPermission(g.state, vetId, 'invite'), true);
  });

  test('hasPermission: non-member returns false for any permission', function() {
    var g = makeGuild();
    assert.strictEqual(GP.hasPermission(g.state, 'nobody', 'chat'), false);
  });

});

// ============================================================================
// SUITE 10 — Rank: setRank
// ============================================================================
suite('Rank: setRank', function() {

  test('leader can promote member to officer', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.setRank(g.state, g.leaderId, memberId, 'officer');
    assert.strictEqual(result.success, true);
    assert.strictEqual(GP.getRank(result.state, memberId), 'officer');
  });

  test('leader can demote officer to member', function() {
    var g = makeGuild();
    var officerId = uid();
    g.state = addMember(g.state, officerId, 'officer', 20);
    var result = GP.setRank(g.state, g.leaderId, officerId, 'member');
    assert.strictEqual(result.success, true);
    assert.strictEqual(GP.getRank(result.state, officerId), 'member');
  });

  test('setRank does not mutate original state', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    GP.setRank(g.state, g.leaderId, memberId, 'officer');
    assert.strictEqual(GP.getRank(g.state, memberId), 'member');
  });

  test('non-member setter returns success=false', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.setRank(g.state, 'outsider', memberId, 'officer');
    assert.strictEqual(result.success, false);
  });

  test('non-member target returns success=false', function() {
    var g = makeGuild();
    var result = GP.setRank(g.state, g.leaderId, 'nobody', 'member');
    assert.strictEqual(result.success, false);
  });

  test('invalid rank returns success=false', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.setRank(g.state, g.leaderId, memberId, 'warlord');
    assert.strictEqual(result.success, false);
  });

  test('setRank adds rank_change log entry', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.setRank(g.state, g.leaderId, memberId, 'officer');
    var rankChanges = result.state.log.filter(function(e) { return e.type === 'rank_change'; });
    assert(rankChanges.length >= 1);
  });

  test('leadership transfer changes leaderId', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.setRank(g.state, g.leaderId, memberId, 'leader');
    assert.strictEqual(result.state.leaderId, memberId);
  });

  test('leadership transfer demotes old leader to officer', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.setRank(g.state, g.leaderId, memberId, 'leader');
    assert.strictEqual(GP.getRank(result.state, g.leaderId), 'officer');
  });

  test('non-leader cannot transfer leadership', function() {
    var g = makeGuild();
    var officerId = uid();
    var memberId = uid();
    g.state = addMember(g.state, officerId, 'officer', 20);
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.setRank(g.state, officerId, memberId, 'leader');
    assert.strictEqual(result.success, false);
  });

  test('officer cannot promote to own rank', function() {
    var g = makeGuild();
    var officerId = uid();
    var memberId = uid();
    g.state = addMember(g.state, officerId, 'officer', 20);
    g.state = addMember(g.state, memberId, 'member', 10);
    var result = GP.setRank(g.state, officerId, memberId, 'officer');
    assert.strictEqual(result.success, false);
  });

});

// ============================================================================
// SUITE 11 — getMemberList
// ============================================================================
suite('getMemberList', function() {

  test('returns an array', function() {
    var g = makeGuild();
    assert(Array.isArray(GP.getMemberList(g.state)));
  });

  test('includes founding leader', function() {
    var g = makeGuild();
    var list = GP.getMemberList(g.state);
    var ids = list.map(function(m) { return m.id; });
    assert(ids.indexOf(g.leaderId) !== -1);
  });

  test('each entry has required fields', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var list = GP.getMemberList(g.state);
    list.forEach(function(m) {
      assert(m.id, 'missing id');
      assert(m.rank, 'missing rank');
      assert(typeof m.rankLevel === 'number', 'missing rankLevel');
      assert(typeof m.joined === 'number', 'missing joined');
      assert(typeof m.contributed === 'number', 'missing contributed');
    });
  });

  test('list is sorted by rank level descending', function() {
    var g = makeGuild();
    var officerId = uid();
    var memberId = uid();
    g.state = addMember(g.state, officerId, 'officer', 20);
    g.state = addMember(g.state, memberId, 'member', 10);
    var list = GP.getMemberList(g.state);
    for (var i = 0; i < list.length - 1; i++) {
      assert(list[i].rankLevel >= list[i + 1].rankLevel,
        'List not sorted by rank: ' + list[i].rank + ' before ' + list[i + 1].rank);
    }
  });

  test('leader appears first in sorted list', function() {
    var g = makeGuild();
    var memberId = uid();
    g.state = addMember(g.state, memberId, 'member', 10);
    var list = GP.getMemberList(g.state);
    assert.strictEqual(list[0].id, g.leaderId);
  });

  test('count matches number of members added', function() {
    var g = makeGuild();
    g.state = addMember(g.state, uid(), 'member', 10);
    g.state = addMember(g.state, uid(), 'recruit', 3);
    var list = GP.getMemberList(g.state);
    assert.strictEqual(list.length, 3); // leader + 2
  });

});

// ============================================================================
// SUITE 12 — Weekly Challenges
// ============================================================================
suite('Weekly Challenges', function() {

  test('getWeeklyChallenge(0) returns first challenge', function() {
    var c = GP.getWeeklyChallenge(0);
    assert.strictEqual(c.id, GP.WEEKLY_CHALLENGES[0].id);
  });

  test('getWeeklyChallenge cycles every 5 weeks', function() {
    for (var i = 0; i < 5; i++) {
      assert.strictEqual(GP.getWeeklyChallenge(i).id, GP.getWeeklyChallenge(i + 5).id);
    }
  });

  test('each challenge has required fields', function() {
    GP.WEEKLY_CHALLENGES.forEach(function(c, idx) {
      assert(c.id, 'challenge ' + idx + ' missing id');
      assert(c.title, 'challenge ' + idx + ' missing title');
      assert(c.desc, 'challenge ' + idx + ' missing desc');
      assert(typeof c.target === 'number', 'challenge ' + idx + ' missing target');
      assert(c.metric, 'challenge ' + idx + ' missing metric');
      assert(c.reward, 'challenge ' + idx + ' missing reward');
      assert(typeof c.reward.guildXP === 'number', 'challenge ' + idx + ' missing reward.guildXP');
      assert(typeof c.reward.spark === 'number', 'challenge ' + idx + ' missing reward.spark');
    });
  });

  // Helper: get the CURRENT week's active challenge (week-number-aware)
  function currentChallenge() {
    var now = new Date();
    var startOfYear = new Date(now.getFullYear(), 0, 1);
    var weekNumber = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
    return GP.getWeeklyChallenge(weekNumber);
  }

  test('updateChallengeProgress returns progress value', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    var result = GP.updateChallengeProgress(g.state, challenge.metric, 100);
    assert(typeof result.progress === 'number');
  });

  test('updateChallengeProgress accumulates progress', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    // Use amounts that together stay below the target to test accumulation
    var step1 = Math.floor(challenge.target * 0.2);
    var step2 = Math.floor(challenge.target * 0.3);
    var expected = step1 + step2;
    var r1 = GP.updateChallengeProgress(g.state, challenge.metric, step1);
    var r2 = GP.updateChallengeProgress(r1.state, challenge.metric, step2);
    assert.strictEqual(r2.progress, expected);
  });

  test('wrong metric does not advance progress', function() {
    var g = makeGuild();
    var r = GP.updateChallengeProgress(g.state, 'wrong_metric_xyz_impossible', 999);
    assert.strictEqual(r.progress, 0);
  });

  test('completing challenge returns completed=true', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    var result = GP.updateChallengeProgress(g.state, challenge.metric, challenge.target);
    assert.strictEqual(result.completed, true);
  });

  test('completing challenge returns reward object', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    var result = GP.updateChallengeProgress(g.state, challenge.metric, challenge.target);
    assert(result.reward !== null);
    assert.strictEqual(result.reward.guildXP, challenge.reward.guildXP);
    assert.strictEqual(result.reward.spark, challenge.reward.spark);
  });

  test('completing challenge awards guild XP automatically', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    var result = GP.updateChallengeProgress(g.state, challenge.metric, challenge.target);
    assert(result.state.guildXP >= challenge.reward.guildXP);
  });

  test('progress is capped at target on completion', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    var result = GP.updateChallengeProgress(g.state, challenge.metric, 999999);
    assert.strictEqual(result.progress, challenge.target);
  });

  test('cannot advance already-completed challenge further', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    var r1 = GP.updateChallengeProgress(g.state, challenge.metric, challenge.target);
    var r2 = GP.updateChallengeProgress(r1.state, challenge.metric, 100);
    assert.strictEqual(r2.reward, null); // no double reward
  });

  test('getChallengeProgress returns challenge object', function() {
    var g = makeGuild();
    var info = GP.getChallengeProgress(g.state);
    assert(info.challenge && info.challenge.id);
  });

  test('getChallengeProgress returns percentComplete 0 on new guild', function() {
    var g = makeGuild();
    var info = GP.getChallengeProgress(g.state);
    // New guild has no weekNumber set, so percent = 0
    assert.strictEqual(info.percentComplete, 0);
  });

  test('getChallengeProgress percentComplete is 100 after completion', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    var r = GP.updateChallengeProgress(g.state, challenge.metric, challenge.target);
    var info = GP.getChallengeProgress(r.state);
    assert.strictEqual(info.percentComplete, 100);
  });

  test('completing challenge adds challenge_completed log entry', function() {
    var g = makeGuild();
    var challenge = currentChallenge();
    var result = GP.updateChallengeProgress(g.state, challenge.metric, challenge.target);
    var completed = result.state.log.filter(function(e) { return e.type === 'challenge_completed'; });
    assert(completed.length >= 1);
  });

});

// ============================================================================
// SUITE 13 — Vault Operations
// ============================================================================
suite('Vault Operations', function() {

  function vaultGuild() {
    var g = guildAtLevel(7);
    return g;
  }

  test('addToVault at level 7 succeeds', function() {
    var g = vaultGuild();
    var result = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    assert.strictEqual(result.success, true);
  });

  test('addToVault below level 7 fails', function() {
    var g = guildAtLevel(6);
    var result = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    assert.strictEqual(result.success, false);
    assert(result.message.indexOf('level 7') !== -1);
  });

  test('addToVault by non-member fails', function() {
    var g = vaultGuild();
    var result = GP.addToVault(g.state, 'outsider', 'iron_ore', 10);
    assert.strictEqual(result.success, false);
  });

  test('addToVault zero qty fails', function() {
    var g = vaultGuild();
    var result = GP.addToVault(g.state, g.leaderId, 'iron_ore', 0);
    assert.strictEqual(result.success, false);
  });

  test('addToVault does not mutate original state', function() {
    var g = vaultGuild();
    GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    assert.strictEqual(g.state.vault.length, 0);
  });

  test('addToVault increases vault slot count', function() {
    var g = vaultGuild();
    var result = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    assert.strictEqual(result.state.vault.length, 1);
  });

  test('addToVault stacks same item in same slot', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var r2 = GP.addToVault(r1.state, g.leaderId, 'iron_ore', 5);
    assert.strictEqual(r2.state.vault.length, 1);
    assert.strictEqual(r2.state.vault[0].qty, 15);
  });

  test('addToVault different items use different slots', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var r2 = GP.addToVault(r1.state, g.leaderId, 'wood', 5);
    assert.strictEqual(r2.state.vault.length, 2);
  });

  test('vault max 20 slots enforced', function() {
    var g = vaultGuild();
    var s = g.state;
    for (var i = 0; i < 20; i++) {
      var r = GP.addToVault(s, g.leaderId, 'item_' + i, 1);
      s = r.state;
    }
    var overflow = GP.addToVault(s, g.leaderId, 'item_overflow', 1);
    assert.strictEqual(overflow.success, false);
    assert(overflow.message.indexOf('full') !== -1);
  });

  test('takeFromVault by non-member fails', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var result = GP.takeFromVault(r1.state, 'outsider', 'iron_ore', 5);
    assert.strictEqual(result.success, false);
  });

  test('takeFromVault by recruit fails', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var recruitId = uid();
    r1.state = addMember(r1.state, recruitId, 'recruit', 2);
    var result = GP.takeFromVault(r1.state, recruitId, 'iron_ore', 5);
    assert.strictEqual(result.success, false);
  });

  test('takeFromVault by member succeeds', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var memberId = uid();
    r1.state = addMember(r1.state, memberId, 'member', 10);
    var result = GP.takeFromVault(r1.state, memberId, 'iron_ore', 5);
    assert.strictEqual(result.success, true);
  });

  test('takeFromVault reduces item qty', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var result = GP.takeFromVault(r1.state, g.leaderId, 'iron_ore', 3);
    assert.strictEqual(result.state.vault[0].qty, 7);
  });

  test('takeFromVault removes slot when qty reaches 0', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var result = GP.takeFromVault(r1.state, g.leaderId, 'iron_ore', 10);
    assert.strictEqual(result.state.vault.length, 0);
  });

  test('takeFromVault excess qty fails', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 5);
    var result = GP.takeFromVault(r1.state, g.leaderId, 'iron_ore', 10);
    assert.strictEqual(result.success, false);
    assert(result.message.indexOf('5') !== -1);
  });

  test('takeFromVault missing item fails', function() {
    var g = vaultGuild();
    var result = GP.takeFromVault(g.state, g.leaderId, 'nonexistent', 1);
    assert.strictEqual(result.success, false);
    assert(result.message.indexOf('nonexistent') !== -1);
  });

  test('addToVault adds vault_deposit log entry', function() {
    var g = vaultGuild();
    var result = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var entries = result.state.log.filter(function(e) { return e.type === 'vault_deposit'; });
    assert(entries.length >= 1);
  });

  test('takeFromVault adds vault_withdrawal log entry', function() {
    var g = vaultGuild();
    var r1 = GP.addToVault(g.state, g.leaderId, 'iron_ore', 10);
    var result = GP.takeFromVault(r1.state, g.leaderId, 'iron_ore', 3);
    var entries = result.state.log.filter(function(e) { return e.type === 'vault_withdrawal'; });
    assert(entries.length >= 1);
  });

});

// ============================================================================
// SUITE 14 — getGuildSummary
// ============================================================================
suite('getGuildSummary', function() {

  test('returns an object with required fields', function() {
    var g = makeGuild();
    var summary = GP.getGuildSummary(g.state);
    var required = ['id', 'name', 'level', 'guildXP', 'treasury', 'memberCount', 'perks', 'currentChallenge', 'recentActivity'];
    required.forEach(function(field) {
      assert(summary[field] !== undefined, 'Summary missing field: ' + field);
    });
  });

  test('memberCount is accurate', function() {
    var g = makeGuild();
    g.state = addMember(g.state, uid(), 'member', 10);
    var summary = GP.getGuildSummary(g.state);
    assert.strictEqual(summary.memberCount, 2);
  });

  test('xpToNextLevel is correct', function() {
    var g = makeGuild();
    var summary = GP.getGuildSummary(g.state);
    assert.strictEqual(summary.xpToNextLevel, 500);
  });

  test('recentActivity is an array with max 5 entries', function() {
    var g = makeGuild();
    var summary = GP.getGuildSummary(g.state);
    assert(Array.isArray(summary.recentActivity));
    assert(summary.recentActivity.length <= 5);
  });

  test('vaultSlots is 0 on fresh guild', function() {
    var g = makeGuild();
    var summary = GP.getGuildSummary(g.state);
    assert.strictEqual(summary.vaultSlots, 0);
  });

  test('vaultMaxSlots is 20', function() {
    var g = makeGuild();
    var summary = GP.getGuildSummary(g.state);
    assert.strictEqual(summary.vaultMaxSlots, 20);
  });

});

// ============================================================================
// SUITE 15 — formatGuildBanner
// ============================================================================
suite('formatGuildBanner', function() {

  test('returns a string', function() {
    var g = makeGuild();
    var banner = GP.formatGuildBanner(g.state);
    assert(typeof banner === 'string');
  });

  test('banner contains guild name', function() {
    var state = GP.createGuildProgression('g1', 'Dragons', 'ldr1');
    var banner = GP.formatGuildBanner(state);
    assert(banner.indexOf('Dragons') !== -1);
  });

  test('banner contains level', function() {
    var state = GP.createGuildProgression('g1', 'Fire Guild', 'ldr1');
    var banner = GP.formatGuildBanner(state);
    assert(banner.indexOf('Level 1') !== -1 || banner.indexOf('1') !== -1);
  });

  test('banner contains member count', function() {
    var g = makeGuild();
    var banner = GP.formatGuildBanner(g.state);
    assert(banner.indexOf('Members') !== -1 || banner.indexOf('1') !== -1);
  });

  test('banner is multi-line', function() {
    var g = makeGuild();
    var banner = GP.formatGuildBanner(g.state);
    assert(banner.indexOf('\n') !== -1);
  });

  test('banner contains treasury info', function() {
    var g = makeGuild();
    var banner = GP.formatGuildBanner(g.state);
    assert(banner.indexOf('Treasury') !== -1 || banner.indexOf('Spark') !== -1);
  });

  test('banner contains ZION reference', function() {
    var g = makeGuild();
    var banner = GP.formatGuildBanner(g.state);
    assert(banner.indexOf('ZION') !== -1);
  });

});

// ============================================================================
// SUITE 16 — Edge Cases and Integration
// ============================================================================
suite('Edge Cases and Integration', function() {

  test('contributing then withdrawing exact amount leaves treasury at 0', function() {
    var g = makeGuild();
    var r1 = GP.contributeSpark(g.state, g.leaderId, 1000);
    var r2 = GP.withdrawSpark(r1.state, g.leaderId, 1000, 'all in');
    assert.strictEqual(r2.state.treasury, 0);
  });

  test('adding XP causes correct leveling through multiple levels', function() {
    var g = makeGuild();
    // To reach level 5 need 4*500 = 2000 XP
    var result = GP.addGuildXP(g.state, 2000, 'mass XP');
    assert.strictEqual(result.state.level, 5);
  });

  test('guild perks at level 5 include all perks from 1-5', function() {
    var g = guildAtLevel(5);
    var expectedIds = ['founded', 'guild_banner', 'trade_discount', 'garden_plot', 'guild_hall'];
    var perkIds = g.state.perks.map(function(p) { return p.id; });
    expectedIds.forEach(function(id) {
      assert(perkIds.indexOf(id) !== -1, 'Missing perk: ' + id);
    });
  });

  test('vault full error does not affect existing vault contents', function() {
    var g = guildAtLevel(7);
    var s = g.state;
    for (var i = 0; i < 20; i++) {
      s = GP.addToVault(s, g.leaderId, 'item_' + i, 1).state;
    }
    var overflow = GP.addToVault(s, g.leaderId, 'overflow', 1);
    assert.strictEqual(overflow.state.vault.length, 20);
  });

  test('multiple members contributing accumulates treasury correctly', function() {
    var g = makeGuild();
    var m1 = uid(); var m2 = uid();
    g.state = addMember(g.state, m1, 'member', 10);
    g.state = addMember(g.state, m2, 'member', 5);
    var r1 = GP.contributeSpark(g.state, g.leaderId, 300);
    var r2 = GP.contributeSpark(r1.state, m1, 200);
    var r3 = GP.contributeSpark(r2.state, m2, 100);
    assert.strictEqual(r3.state.treasury, 600);
  });

  test('WEEKLY_CHALLENGES all have unique metric names', function() {
    var metrics = GP.WEEKLY_CHALLENGES.map(function(c) { return c.metric; });
    var unique = metrics.filter(function(m, i) { return metrics.indexOf(m) === i; });
    assert.strictEqual(unique.length, 5);
  });

  test('WEEKLY_CHALLENGES all have positive targets', function() {
    GP.WEEKLY_CHALLENGES.forEach(function(c) {
      assert(c.target > 0, 'Challenge ' + c.id + ' has non-positive target');
    });
  });

  test('WEEKLY_CHALLENGES all have positive rewards', function() {
    GP.WEEKLY_CHALLENGES.forEach(function(c) {
      assert(c.reward.guildXP > 0, 'Challenge ' + c.id + ' has non-positive guildXP reward');
      assert(c.reward.spark > 0, 'Challenge ' + c.id + ' has non-positive spark reward');
    });
  });

  test('getGuildLevel is consistent with getXPForLevel for all levels', function() {
    for (var level = 1; level <= 10; level++) {
      var xp = GP.getXPForLevel(level);
      assert.strictEqual(GP.getGuildLevel(xp), level, 'Level mismatch at level ' + level + ' (XP=' + xp + ')');
    }
  });

  test('setRank with all valid rank names succeeds for leader', function() {
    var ranks = ['recruit', 'member', 'veteran', 'officer'];
    ranks.forEach(function(rank) {
      var g = makeGuild();
      var targetId = uid();
      g.state = addMember(g.state, targetId, 'member', 10);
      var result = GP.setRank(g.state, g.leaderId, targetId, rank);
      assert.strictEqual(result.success, true, 'Failed to set rank: ' + rank);
    });
  });

  test('full workflow: create guild, gain XP, contribute, level up, withdraw', function() {
    var state = GP.createGuildProgression('full_test', 'Zion Pioneers', 'pioneer1');

    // Contribute
    var r1 = GP.contributeSpark(state, 'pioneer1', 1000);
    state = r1.state;
    assert.strictEqual(state.treasury, 1000);

    // Gain XP and level up
    var r2 = GP.addGuildXP(state, 500, 'community work');
    state = r2.state;
    assert.strictEqual(state.level, 2);
    assert.strictEqual(r2.leveled, true);

    // Withdraw
    var r3 = GP.withdrawSpark(state, 'pioneer1', 200, 'event funding');
    state = r3.state;
    assert.strictEqual(state.treasury, 800);

    // Summary
    var summary = GP.getGuildSummary(state);
    assert.strictEqual(summary.level, 2);
    assert.strictEqual(summary.treasury, 800);
  });

});

// ============================================================================
// FINAL REPORT
// ============================================================================
var ok = report();
process.exit(ok ? 0 : 1);
