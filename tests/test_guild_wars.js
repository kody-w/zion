/**
 * test_guild_wars.js — Full test suite for src/js/guild_wars.js
 * Run: node tests/test_guild_wars.js
 * Uses var everywhere (ES5 compat), zero dependencies besides the module itself.
 */

var GuildWars = require('../src/js/guild_wars');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  PASS: ' + msg + '\n');
  } else {
    failed++;
    process.stdout.write('  FAIL: ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  if (a === b) {
    passed++;
    process.stdout.write('  PASS: ' + msg + '\n');
  } else {
    failed++;
    process.stdout.write('  FAIL: ' + msg + ' — expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + '\n');
  }
}

function assertNull(v, msg) {
  assertEqual(v, null, msg);
}

function assertNotNull(v, msg) {
  assert(v !== null && v !== undefined, msg);
}

function suite(name) {
  process.stdout.write('\n=== ' + name + ' ===\n');
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeState(opts) {
  var s = GuildWars.createGuildWarsState();
  opts = opts || {};
  if (opts.guilds) {
    // pre-fund guild treasuries
    for (var id in opts.guilds) {
      if (opts.guilds.hasOwnProperty(id)) {
        s.guildTreasuries[id] = opts.guilds[id];
      }
    }
  }
  if (opts.playerGuilds) {
    s.playerGuilds = opts.playerGuilds;
  }
  return s;
}

// Fund a guild and return state
function fundedState(guildId, amount, extra) {
  var opts = { guilds: {} };
  opts.guilds[guildId] = amount;
  if (extra) {
    for (var k in extra) {
      if (extra.hasOwnProperty(k)) opts.guilds[k] = extra[k];
    }
  }
  return makeState(opts);
}

// Claim a territory on behalf of a guild; state is mutated in place.
function quickClaim(state, guildId, territoryId, tick) {
  return GuildWars.claimTerritory(state, guildId, territoryId, tick || 100);
}

// Declare war helper (attacker and defender both funded)
function quickWar(state, attackerId, defenderId, territoryId, tick) {
  return GuildWars.declareWar(state, attackerId, defenderId, territoryId, tick || 200);
}

// ---------------------------------------------------------------------------
// SUITE 1 — TERRITORIES static data
// ---------------------------------------------------------------------------
suite('TERRITORIES static data');

(function() {
  var T = GuildWars.TERRITORIES;
  assertEqual(T.length, 16, 'exactly 16 territory definitions');

  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
  zones.forEach(function(zone) {
    var count = 0;
    for (var i = 0; i < T.length; i++) {
      if (T[i].zone === zone) count++;
    }
    assertEqual(count, 2, zone + ' has exactly 2 territories');
  });

  // All have required fields
  for (var i = 0; i < T.length; i++) {
    var t = T[i];
    assert(typeof t.id === 'string' && t.id.length > 0, t.id + ' has non-empty id');
    assert(typeof t.name === 'string' && t.name.length > 0, t.id + ' has non-empty name');
    assert(typeof t.zone === 'string', t.id + ' has zone');
    assert(typeof t.value === 'number' && t.value >= 1 && t.value <= 5, t.id + ' value 1-5');
    assert(typeof t.taxRate === 'number' && t.taxRate > 0, t.id + ' positive taxRate');
    assert(t.bonus && typeof t.bonus.type === 'string', t.id + ' has bonus type');
    assert(typeof t.bonus.value === 'number', t.id + ' has bonus value');
    assertEqual(t.maxClaimPerGuild, 3, t.id + ' maxClaimPerGuild = 3');
  }

  // IDs are unique
  var seen = {};
  for (var j = 0; j < T.length; j++) {
    assert(!seen[T[j].id], 'territory id ' + T[j].id + ' is unique');
    seen[T[j].id] = true;
  }

  // Value range coverage: at least one value-5 and one value-2
  var has5 = false, has2 = false;
  for (var k = 0; k < T.length; k++) {
    if (T[k].value === 5) has5 = true;
    if (T[k].value === 2) has2 = true;
  }
  assert(has5, 'at least one value-5 territory exists');
  assert(has2, 'at least one value-2 territory exists');
})();

// ---------------------------------------------------------------------------
// SUITE 2 — createGuildWarsState
// ---------------------------------------------------------------------------
suite('createGuildWarsState');

(function() {
  var s = GuildWars.createGuildWarsState();
  assertNotNull(s, 'state object created');
  assert(typeof s.territoryStates === 'object', 'has territoryStates');
  assert(Array.isArray(s.wars), 'has wars array');
  assert(Array.isArray(s.warHistory), 'has warHistory array');
  assertEqual(s.wars.length, 0, 'wars initially empty');
  assertEqual(s.warHistory.length, 0, 'warHistory initially empty');
  assertEqual(s.warCounter, 1, 'warCounter starts at 1');
  assert(typeof s.guildTreasuries === 'object', 'has guildTreasuries');
  assert(typeof s.playerGuilds === 'object', 'has playerGuilds');
  // All 16 territories pre-initialised
  assertEqual(Object.keys(s.territoryStates).length, 16, 'all 16 territory states initialised');

  // Each territory state has correct defaults
  var ts = s.territoryStates['nexus_plaza'];
  assertNotNull(ts, 'nexus_plaza state exists');
  assertNull(ts.ownerId, 'nexus_plaza initially unclaimed');
  assertEqual(ts.defenseLevel, 0, 'nexus_plaza defense 0');
  assertEqual(ts.taxCollected, 0, 'nexus_plaza taxCollected 0');
  assert(Array.isArray(ts.fortifications), 'nexus_plaza fortifications array');
})();

// ---------------------------------------------------------------------------
// SUITE 3 — claimTerritory
// ---------------------------------------------------------------------------
suite('claimTerritory');

(function() {
  // Success path
  var s = fundedState('guild_a', 5000);
  var r = quickClaim(s, 'guild_a', 'nexus_plaza', 100);
  assert(r.success, 'claim succeeds with sufficient funds');
  assertEqual(s.territoryStates['nexus_plaza'].ownerId, 'guild_a', 'ownerId set after claim');
  assertEqual(s.territoryStates['nexus_plaza'].claimedAt, 100, 'claimedAt set to tick');
  // nexus_plaza value=5, cost=500
  assertEqual(s.guildTreasuries['guild_a'], 4500, 'treasury deducted correctly (5000-500)');

  // Claim cost = value * 100
  var s2 = fundedState('guild_b', 200);
  var r2 = quickClaim(s2, 'guild_b', 'gardens_spring', 50); // value=2, cost=200
  assert(r2.success, 'claim with exact cost succeeds');
  assertEqual(s2.guildTreasuries['guild_b'], 0, 'treasury fully deducted');

  // Insufficient treasury
  var s3 = fundedState('guild_c', 100);
  var r3 = quickClaim(s3, 'guild_c', 'nexus_plaza', 10); // needs 500
  assert(!r3.success, 'claim fails with insufficient treasury');
  assert(typeof r3.reason === 'string', 'failure reason provided');
  assertNull(s3.territoryStates['nexus_plaza'].ownerId, 'territory still unclaimed after failure');

  // Already claimed
  var s4 = fundedState('guild_a', 5000, { guild_b: 5000 });
  quickClaim(s4, 'guild_a', 'nexus_plaza', 10);
  var r4 = GuildWars.claimTerritory(s4, 'guild_b', 'nexus_plaza', 20);
  assert(!r4.success, 'cannot claim already-claimed territory');

  // Max territory limit (3)
  var s5 = fundedState('guild_a', 10000);
  GuildWars.claimTerritory(s5, 'guild_a', 'nexus_plaza', 1);      // 1
  GuildWars.claimTerritory(s5, 'guild_a', 'nexus_gate', 1);       // 2
  GuildWars.claimTerritory(s5, 'guild_a', 'gardens_grove', 1);    // 3
  var r5 = GuildWars.claimTerritory(s5, 'guild_a', 'agora_market', 1); // 4 — should fail
  assert(!r5.success, 'claim fails when guild holds 3 territories');
  assert(r5.reason.indexOf('maximum') !== -1, 'reason mentions maximum limit');

  // Non-existent territory
  var s6 = fundedState('guild_a', 5000);
  var r6 = GuildWars.claimTerritory(s6, 'guild_a', 'invalid_territory', 1);
  assert(!r6.success, 'claim fails for unknown territory id');

  // Return value includes territory object on success
  var s7 = fundedState('guild_a', 5000);
  var r7 = GuildWars.claimTerritory(s7, 'guild_a', 'nexus_plaza', 1);
  assert(r7.territory && r7.territory.def, 'result includes territory.def');
  assert(r7.territory && r7.territory.state, 'result includes territory.state');
  assertEqual(r7.cost, 500, 'result includes cost');
})();

// ---------------------------------------------------------------------------
// SUITE 4 — abandonTerritory
// ---------------------------------------------------------------------------
suite('abandonTerritory');

(function() {
  var s = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s, 'guild_a', 'nexus_plaza', 10); // costs 500
  var balanceBefore = s.guildTreasuries['guild_a']; // 4500

  var r = GuildWars.abandonTerritory(s, 'guild_a', 'nexus_plaza');
  assert(r.success, 'abandon succeeds for owner');
  assertEqual(r.refund, 250, '50% refund of 500 = 250');
  assertEqual(s.guildTreasuries['guild_a'], balanceBefore + 250, 'refund credited to treasury');
  assertNull(s.territoryStates['nexus_plaza'].ownerId, 'territory unclaimed after abandon');
  assertEqual(s.territoryStates['nexus_plaza'].defenseLevel, 0, 'defense reset after abandon');

  // Cannot abandon territory you don't own
  var s2 = fundedState('guild_a', 5000, { guild_b: 5000 });
  GuildWars.claimTerritory(s2, 'guild_a', 'nexus_plaza', 1);
  var r2 = GuildWars.abandonTerritory(s2, 'guild_b', 'nexus_plaza');
  assert(!r2.success, 'non-owner cannot abandon');

  // Cannot abandon unclaimed territory
  var s3 = GuildWars.createGuildWarsState();
  var r3 = GuildWars.abandonTerritory(s3, 'guild_a', 'nexus_plaza');
  assert(!r3.success, 'cannot abandon unclaimed territory');

  // Invalid territory
  var s4 = GuildWars.createGuildWarsState();
  var r4 = GuildWars.abandonTerritory(s4, 'guild_a', 'bad_id');
  assert(!r4.success, 'abandon fails for unknown territory');

  // Value-2 territory: cost=200, refund=100
  var s5 = fundedState('guild_a', 1000);
  GuildWars.claimTerritory(s5, 'guild_a', 'gardens_spring', 1); // cost 200
  var r5 = GuildWars.abandonTerritory(s5, 'guild_a', 'gardens_spring');
  assertEqual(r5.refund, 100, 'value-2 territory: 50% of 200 = 100');

  // Territory can be re-claimed after abandon
  var s6 = fundedState('guild_a', 5000, { guild_b: 5000 });
  GuildWars.claimTerritory(s6, 'guild_a', 'nexus_plaza', 1);
  GuildWars.abandonTerritory(s6, 'guild_a', 'nexus_plaza');
  var r6 = GuildWars.claimTerritory(s6, 'guild_b', 'nexus_plaza', 2);
  assert(r6.success, 'territory can be re-claimed after abandon');
  assertEqual(s6.territoryStates['nexus_plaza'].ownerId, 'guild_b', 'new owner set after re-claim');
})();

// ---------------------------------------------------------------------------
// SUITE 5 — declareWar
// ---------------------------------------------------------------------------
suite('declareWar');

(function() {
  // Basic success
  var s = fundedState('guild_a', 5000, { guild_b: 5000 });
  GuildWars.claimTerritory(s, 'guild_b', 'nexus_plaza', 50);
  var r = GuildWars.declareWar(s, 'guild_a', 'guild_b', 'nexus_plaza', 200);
  assert(r.success, 'war declaration succeeds');
  assertNotNull(r.war, 'war object returned');
  assert(r.war.id.startsWith('war_'), 'war id prefixed with war_');
  assertEqual(r.war.attackerId, 'guild_a', 'attacker set');
  assertEqual(r.war.defenderId, 'guild_b', 'defender set');
  assertEqual(r.war.territoryId, 'nexus_plaza', 'territory set');
  assertEqual(r.war.declaredAt, 200, 'declaredAt = currentTick');
  assertEqual(r.war.battleTick, 200 + GuildWars.WAR_NOTICE_TICKS, 'battleTick = tick + 700');
  assertEqual(r.war.status, 'declared', 'initial status is declared');
  assertEqual(r.war.attackerForce, 0, 'initial attacker force 0');
  assertEqual(r.war.defenderForce, 0, 'initial defender force 0');
  assertEqual(r.war.result, null, 'result null initially');
  assertEqual(r.battleTick, 200 + GuildWars.WAR_NOTICE_TICKS, 'battleTick on result matches');
  // War tax deducted (200 Spark) — guild_b paid the claim cost, not guild_a
  assertEqual(s.guildTreasuries['guild_a'], 5000 - 200, 'war tax deducted from attacker (guild_a started at 5000, only paid 200 war tax)');

  // participants arrays initialized
  assert(Array.isArray(r.war.participants.attackers), 'participants.attackers is array');
  assert(Array.isArray(r.war.participants.defenders), 'participants.defenders is array');

  // Cannot declare war on own territory
  var s2 = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s2, 'guild_a', 'nexus_plaza', 10);
  var r2 = GuildWars.declareWar(s2, 'guild_a', 'guild_b', 'nexus_plaza', 20);
  assert(!r2.success, 'cannot declare war on own territory');

  // Cannot declare war on own guild
  var s3 = fundedState('guild_a', 5000);
  var r3 = GuildWars.declareWar(s3, 'guild_a', 'guild_a', 'nexus_plaza', 10);
  assert(!r3.success, 'cannot declare war on own guild');

  // Defender must own the territory
  var s4 = fundedState('guild_a', 5000, { guild_b: 5000 });
  GuildWars.claimTerritory(s4, 'guild_a', 'nexus_plaza', 1);
  var r4 = GuildWars.declareWar(s4, 'guild_a', 'guild_b', 'nexus_plaza', 10);
  assert(!r4.success, 'war fails when defender does not own territory');

  // Attacker needs 200 Spark war tax
  var s5 = fundedState('guild_a', 100, { guild_b: 5000 });
  GuildWars.claimTerritory(s5, 'guild_b', 'nexus_gate', 1); // value=4, cost=400 for b
  var r5 = GuildWars.declareWar(s5, 'guild_a', 'guild_b', 'nexus_gate', 10);
  assert(!r5.success, 'war fails with insufficient treasury');

  // Duplicate war on same territory blocked
  var s6 = fundedState('guild_a', 5000, { guild_b: 5000 });
  GuildWars.claimTerritory(s6, 'guild_b', 'nexus_plaza', 1);
  GuildWars.declareWar(s6, 'guild_a', 'guild_b', 'nexus_plaza', 10);
  var r6 = GuildWars.declareWar(s6, 'guild_a', 'guild_b', 'nexus_plaza', 20);
  assert(!r6.success, 'duplicate war on same territory blocked');

  // War on unclaimed territory fails (defender doesn't own it)
  var s7 = fundedState('guild_a', 5000);
  var r7 = GuildWars.declareWar(s7, 'guild_a', 'guild_b', 'nexus_plaza', 10);
  assert(!r7.success, 'cannot declare war on unclaimed territory');

  // Invalid territory
  var s8 = fundedState('guild_a', 5000);
  var r8 = GuildWars.declareWar(s8, 'guild_a', 'guild_b', 'fake_node', 10);
  assert(!r8.success, 'war fails for unknown territory id');

  // warCounter increments
  var s9 = fundedState('guild_a', 5000, { guild_b: 5000, guild_c: 5000 });
  GuildWars.claimTerritory(s9, 'guild_b', 'nexus_plaza', 1);
  GuildWars.claimTerritory(s9, 'guild_c', 'nexus_gate', 1);
  var w1 = GuildWars.declareWar(s9, 'guild_a', 'guild_b', 'nexus_plaza', 10);
  var w2 = GuildWars.declareWar(s9, 'guild_a', 'guild_c', 'nexus_gate', 10);
  assert(w1.war.id !== w2.war.id, 'each war gets unique id');
  assertEqual(s9.wars.length, 2, 'two active wars stored');
})();

// ---------------------------------------------------------------------------
// SUITE 6 — cancelWar
// ---------------------------------------------------------------------------
suite('cancelWar');

(function() {
  // Setup: active war
  function makeWarState() {
    var s = fundedState('guild_a', 5000, { guild_b: 5000 });
    GuildWars.claimTerritory(s, 'guild_b', 'nexus_plaza', 1);
    GuildWars.declareWar(s, 'guild_a', 'guild_b', 'nexus_plaza', 10);
    var warId = s.wars[0].id;
    return { s: s, warId: warId };
  }

  var w1 = makeWarState();
  var r1 = GuildWars.cancelWar(w1.s, 'guild_a', w1.warId);
  assert(r1.success, 'attacker can cancel own war during notice period');
  assertEqual(w1.s.wars.length, 0, 'war removed from active list');
  assertEqual(w1.s.warHistory.length, 1, 'cancelled war moved to history');
  assertEqual(w1.s.warHistory[0].status, 'cancelled', 'history entry status is cancelled');

  // Non-attacker cannot cancel
  var w2 = makeWarState();
  var r2 = GuildWars.cancelWar(w2.s, 'guild_b', w2.warId);
  assert(!r2.success, 'defender cannot cancel attacker war');
  assertEqual(w2.s.wars.length, 1, 'war still active');

  // Non-existent war
  var w3 = makeWarState();
  var r3 = GuildWars.cancelWar(w3.s, 'guild_a', 'war_9999');
  assert(!r3.success, 'cancel fails for unknown war id');

  // Cannot cancel after it moves to in_battle
  var w4 = makeWarState();
  w4.s.wars[0].status = 'in_battle';
  var r4 = GuildWars.cancelWar(w4.s, 'guild_a', w4.warId);
  assert(!r4.success, 'cannot cancel war in in_battle status');

  // Cannot cancel already resolved war
  var w5 = makeWarState();
  var rResolve = GuildWars.resolveBattle(w5.s, w5.warId, 42);
  // After resolve the war is in history; try to cancel with original warId
  var r5 = GuildWars.cancelWar(w5.s, 'guild_a', w5.warId);
  assert(!r5.success, 'cannot cancel already-resolved war');

  // No Spark refund on cancel (war tax is non-refundable)
  var w6 = makeWarState();
  var balBefore = w6.s.guildTreasuries['guild_a'];
  GuildWars.cancelWar(w6.s, 'guild_a', w6.warId);
  assertEqual(w6.s.guildTreasuries['guild_a'], balBefore, 'no refund on war cancel');
})();

// ---------------------------------------------------------------------------
// SUITE 7 — joinBattle
// ---------------------------------------------------------------------------
suite('joinBattle');

(function() {
  function makeWarForJoin(playerGuildMap) {
    var s = fundedState('guild_a', 5000, { guild_b: 5000 });
    s.playerGuilds = playerGuildMap || { player1: 'guild_a', player2: 'guild_b' };
    GuildWars.claimTerritory(s, 'guild_b', 'nexus_plaza', 1);
    GuildWars.declareWar(s, 'guild_a', 'guild_b', 'nexus_plaza', 10);
    var warId = s.wars[0].id;
    return { s: s, warId: warId };
  }

  var w1 = makeWarForJoin();
  var r1 = GuildWars.joinBattle(w1.s, 'player1', w1.warId, 'attacker');
  assert(r1.success, 'guild_a member joins as attacker');
  assert(w1.s.wars[0].participants.attackers.indexOf('player1') !== -1, 'player1 in attackers');

  var w2 = makeWarForJoin();
  var r2 = GuildWars.joinBattle(w2.s, 'player2', w2.warId, 'defender');
  assert(r2.success, 'guild_b member joins as defender');
  assert(w2.s.wars[0].participants.defenders.indexOf('player2') !== -1, 'player2 in defenders');

  // Wrong guild on attacker side
  var w3 = makeWarForJoin({ player1: 'guild_c', player2: 'guild_b' });
  var r3 = GuildWars.joinBattle(w3.s, 'player1', w3.warId, 'attacker');
  assert(!r3.success, 'non-guild-a member cannot join as attacker');

  // Wrong guild on defender side
  var w4 = makeWarForJoin({ player1: 'guild_a', player2: 'guild_c' });
  var r4 = GuildWars.joinBattle(w4.s, 'player2', w4.warId, 'defender');
  assert(!r4.success, 'non-guild-b member cannot join as defender');

  // Double join prevention
  var w5 = makeWarForJoin();
  GuildWars.joinBattle(w5.s, 'player1', w5.warId, 'attacker');
  var r5 = GuildWars.joinBattle(w5.s, 'player1', w5.warId, 'attacker');
  assert(!r5.success, 'player cannot join the same battle twice');

  // Invalid side
  var w6 = makeWarForJoin();
  var r6 = GuildWars.joinBattle(w6.s, 'player1', w6.warId, 'neutral');
  assert(!r6.success, 'invalid side rejected');

  // Non-existent war
  var w7 = makeWarForJoin();
  var r7 = GuildWars.joinBattle(w7.s, 'player1', 'war_9999', 'attacker');
  assert(!r7.success, 'join fails for unknown war id');

  // Cannot join resolved war
  var w8 = makeWarForJoin();
  GuildWars.resolveBattle(w8.s, w8.warId, 100);
  var r8 = GuildWars.joinBattle(w8.s, 'player1', w8.warId, 'attacker');
  assert(!r8.success, 'cannot join resolved war');

  // Player with no guild assignment
  var w9 = makeWarForJoin({ player1: 'guild_a' }); // player2 has no guild
  var r9 = GuildWars.joinBattle(w9.s, 'player2', w9.warId, 'defender');
  assert(!r9.success, 'player with wrong guild cannot join defender side');
})();

// ---------------------------------------------------------------------------
// SUITE 8 — contributeWarEffort
// ---------------------------------------------------------------------------
suite('contributeWarEffort');

(function() {
  function makeContribState() {
    var s = fundedState('guild_a', 5000, { guild_b: 5000 });
    s.playerGuilds = { player1: 'guild_a', player2: 'guild_b' };
    GuildWars.claimTerritory(s, 'guild_b', 'nexus_plaza', 1);
    GuildWars.declareWar(s, 'guild_a', 'guild_b', 'nexus_plaza', 10);
    GuildWars.joinBattle(s, 'player1', s.wars[0].id, 'attacker');
    GuildWars.joinBattle(s, 'player2', s.wars[0].id, 'defender');
    return { s: s, warId: s.wars[0].id };
  }

  var c1 = makeContribState();
  var r1 = GuildWars.contributeWarEffort(c1.s, 'player1', c1.warId, 100);
  assert(r1.success, 'attacker contributes war effort');
  assertEqual(r1.totalForce, 100, 'attacker force = 100');
  assertEqual(c1.s.wars[0].attackerForce, 100, 'attackerForce updated in war');

  var c2 = makeContribState();
  var r2 = GuildWars.contributeWarEffort(c2.s, 'player2', c2.warId, 150);
  assert(r2.success, 'defender contributes war effort');
  assertEqual(r2.totalForce, 150, 'defender force = 150');
  assertEqual(c2.s.wars[0].defenderForce, 150, 'defenderForce updated in war');

  // Accumulates across multiple contributions
  var c3 = makeContribState();
  GuildWars.contributeWarEffort(c3.s, 'player1', c3.warId, 50);
  GuildWars.contributeWarEffort(c3.s, 'player1', c3.warId, 75);
  assertEqual(c3.s.wars[0].attackerForce, 125, 'attacker force accumulates');

  // Non-participant cannot contribute
  var c4 = makeContribState();
  var r4 = GuildWars.contributeWarEffort(c4.s, 'stranger', c4.warId, 100);
  assert(!r4.success, 'non-participant cannot contribute');

  // Zero points rejected
  var c5 = makeContribState();
  var r5 = GuildWars.contributeWarEffort(c5.s, 'player1', c5.warId, 0);
  assert(!r5.success, 'zero points rejected');

  // Negative points rejected
  var c6 = makeContribState();
  var r6 = GuildWars.contributeWarEffort(c6.s, 'player1', c6.warId, -10);
  assert(!r6.success, 'negative points rejected');

  // Non-existent war
  var c7 = makeContribState();
  var r7 = GuildWars.contributeWarEffort(c7.s, 'player1', 'war_9999', 100);
  assert(!r7.success, 'contribute fails for unknown war id');

  // Contribution via guild membership (no explicit join required)
  var c8 = makeContribState();
  // Remove player1 from participants.attackers so they haven't "joined"
  c8.s.wars[0].participants.attackers = [];
  var r8 = GuildWars.contributeWarEffort(c8.s, 'player1', c8.warId, 80);
  assert(r8.success, 'guild member can contribute without explicit joinBattle call');
  assertEqual(c8.s.wars[0].attackerForce, 80, 'force added via guild membership path');
})();

// ---------------------------------------------------------------------------
// SUITE 9 — resolveBattle
// ---------------------------------------------------------------------------
suite('resolveBattle');

(function() {
  function makeResolvableWar(attackForce, defendForce, defenseLevel) {
    var s = fundedState('guild_a', 10000, { guild_b: 10000 });
    s.playerGuilds = { pa: 'guild_a', pb: 'guild_b' };
    GuildWars.claimTerritory(s, 'guild_b', 'nexus_plaza', 1);
    if (defenseLevel && defenseLevel > 0) {
      for (var lvl = 0; lvl < defenseLevel; lvl++) {
        GuildWars.upgradeDefense(s, 'guild_b', 'nexus_plaza', (lvl + 1) * 200);
      }
    }
    GuildWars.declareWar(s, 'guild_a', 'guild_b', 'nexus_plaza', 10);
    var warId = s.wars[0].id;
    GuildWars.joinBattle(s, 'pa', warId, 'attacker');
    GuildWars.joinBattle(s, 'pb', warId, 'defender');
    GuildWars.contributeWarEffort(s, 'pa', warId, attackForce);
    GuildWars.contributeWarEffort(s, 'pb', warId, defendForce);
    return { s: s, warId: warId };
  }

  // Attacker clearly wins
  var r1 = makeResolvableWar(1000, 100, 0);
  var res1 = GuildWars.resolveBattle(r1.s, r1.warId, 42);
  assert(res1.success, 'resolveBattle returns success');
  assertEqual(res1.result, 'attacker_wins', 'attacker wins with overwhelming force');
  assertEqual(res1.winner, 'guild_a', 'winner is attacker guild');
  assertEqual(res1.loser, 'guild_b', 'loser is defender guild');
  assert(res1.territoryTransferred, 'territory transferred on attacker win');
  assertEqual(r1.s.territoryStates['nexus_plaza'].ownerId, 'guild_a', 'nexus_plaza now owned by guild_a');

  // Defender wins with home advantage (20% boost)
  // Attacker 100, Defender 85 → effective defender = 85 * 1.20 = 102 > 100
  var r2 = makeResolvableWar(100, 85, 0);
  var res2 = GuildWars.resolveBattle(r2.s, r2.warId, 42);
  assertEqual(res2.result, 'defender_wins', 'defender wins with home advantage');
  assertEqual(res2.winner, 'guild_b', 'winner is defender guild');
  assert(!res2.territoryTransferred, 'territory NOT transferred on defender win');
  assertEqual(r2.s.territoryStates['nexus_plaza'].ownerId, 'guild_b', 'territory stays with defender');

  // Defense level amplifies home advantage
  // Attacker 100, Defender 70, defenseLevel=3 → bonus=20%+15%=35% → effective=70*1.35=94.5 < 100
  // So attacker should win
  var r3a = makeResolvableWar(100, 70, 3);
  var res3a = GuildWars.resolveBattle(r3a.s, r3a.warId, 42);
  // With defense 3: bonus = 0.20 + 3*0.05 = 0.35; effective defender = 70*1.35 = 94.5 < 100
  assertEqual(res3a.result, 'attacker_wins', 'attacker wins when force > defender*1.35');

  // Defuse test: very high defense swings result to defender
  // Attacker 100, Defender 70, defenseLevel=5 → bonus = 0.45 → effective=70*1.45=101.5 > 100
  var r3b = makeResolvableWar(100, 70, 5);
  var res3b = GuildWars.resolveBattle(r3b.s, r3b.warId, 42);
  assertEqual(res3b.result, 'defender_wins', 'high defense level swings battle to defender');

  // War moved to history and removed from active list
  var r4 = makeResolvableWar(500, 100, 0);
  GuildWars.resolveBattle(r4.s, r4.warId, 1);
  assertEqual(r4.s.wars.length, 0, 'active wars empty after resolution');
  assertEqual(r4.s.warHistory.length, 1, 'resolved war in history');

  // Status becomes resolved
  var r5 = makeResolvableWar(200, 100, 0);
  GuildWars.resolveBattle(r5.s, r5.warId, 1);
  assertEqual(r5.s.warHistory[0].status, 'resolved', 'war status is resolved in history');

  // Looting: attacker takes 10% of defender treasury
  var r6 = fundedState('guild_a', 10000, { guild_b: 5000 });
  r6.playerGuilds = { pa: 'guild_a', pb: 'guild_b' };
  GuildWars.claimTerritory(r6, 'guild_b', 'nexus_plaza', 1);
  GuildWars.declareWar(r6, 'guild_a', 'guild_b', 'nexus_plaza', 10);
  var wid6 = r6.wars[0].id;
  GuildWars.joinBattle(r6, 'pa', wid6, 'attacker');
  GuildWars.joinBattle(r6, 'pb', wid6, 'defender');
  GuildWars.contributeWarEffort(r6, 'pa', wid6, 5000);
  GuildWars.contributeWarEffort(r6, 'pb', wid6, 10);
  var defBalBefore = r6.guildTreasuries['guild_b'];
  var atkBalBefore = r6.guildTreasuries['guild_a'];
  var res6 = GuildWars.resolveBattle(r6, wid6, 1);
  assert(res6.result === 'attacker_wins', 'attacker wins for loot test');
  assert(res6.spoils && res6.spoils.treasuryLooted > 0, 'spoils include looted treasury amount');
  assertEqual(res6.spoils.treasuryLooted, Math.floor(defBalBefore * 0.10), 'looted 10% of defender treasury');

  // Cannot resolve same war twice
  var r7 = makeResolvableWar(500, 100, 0);
  GuildWars.resolveBattle(r7.s, r7.warId, 1);
  var res7 = GuildWars.resolveBattle(r7.s, r7.warId, 1);
  assert(!res7.success, 'cannot resolve war twice');

  // Non-existent war
  var r8 = GuildWars.createGuildWarsState();
  var res8 = GuildWars.resolveBattle(r8, 'war_9999', 1);
  assert(!res8.success, 'resolve fails for unknown war id');

  // Territory defense resets to 0 after transfer
  var r9 = makeResolvableWar(1000, 10, 3);
  GuildWars.resolveBattle(r9.s, r9.warId, 1);
  assertEqual(r9.s.territoryStates['nexus_plaza'].defenseLevel, 0, 'defense reset after territory transfer');

  // Battle resolves deterministically for same seed
  var r10a = makeResolvableWar(100, 90, 0);
  var r10b = makeResolvableWar(100, 90, 0);
  var res10a = GuildWars.resolveBattle(r10a.s, r10a.warId, 777);
  var res10b = GuildWars.resolveBattle(r10b.s, r10b.warId, 777);
  assertEqual(res10a.result, res10b.result, 'same seed produces same battle result');
})();

// ---------------------------------------------------------------------------
// SUITE 10 — upgradeDefense
// ---------------------------------------------------------------------------
suite('upgradeDefense');

(function() {
  // Success: level 0 → 1, cost = 1 * 200 = 200
  var s1 = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s1, 'guild_a', 'nexus_plaza', 1);
  var r1 = GuildWars.upgradeDefense(s1, 'guild_a', 'nexus_plaza', 200);
  assert(r1.success, 'defense upgrade succeeds');
  assertEqual(r1.newLevel, 1, 'new defense level is 1');
  assertEqual(r1.cost, 200, 'cost is 200 for level 1');
  assertEqual(s1.territoryStates['nexus_plaza'].defenseLevel, 1, 'defenseLevel updated in state');
  assertEqual(s1.territoryStates['nexus_plaza'].fortifications.length, 1, 'fortification recorded');

  // Sequential upgrades: costs scale with level
  var s2 = fundedState('guild_a', 10000);
  GuildWars.claimTerritory(s2, 'guild_a', 'nexus_plaza', 1);
  var expectedCosts = [200, 400, 600, 800, 1000];
  for (var lvl = 0; lvl < 5; lvl++) {
    var ru = GuildWars.upgradeDefense(s2, 'guild_a', 'nexus_plaza', expectedCosts[lvl]);
    assert(ru.success, 'upgrade to level ' + (lvl + 1) + ' succeeds');
    assertEqual(ru.newLevel, lvl + 1, 'level is ' + (lvl + 1));
    assertEqual(ru.cost, expectedCosts[lvl], 'cost matches for level ' + (lvl + 1));
  }
  assertEqual(s2.territoryStates['nexus_plaza'].defenseLevel, 5, 'max defense level reached');

  // Cannot exceed max level
  var s3 = fundedState('guild_a', 50000);
  GuildWars.claimTerritory(s3, 'guild_a', 'nexus_plaza', 1);
  for (var i = 0; i < 5; i++) GuildWars.upgradeDefense(s3, 'guild_a', 'nexus_plaza');
  var r3 = GuildWars.upgradeDefense(s3, 'guild_a', 'nexus_plaza');
  assert(!r3.success, 'cannot upgrade beyond max level 5');

  // Non-owner cannot upgrade
  var s4 = fundedState('guild_a', 5000, { guild_b: 5000 });
  GuildWars.claimTerritory(s4, 'guild_a', 'nexus_plaza', 1);
  var r4 = GuildWars.upgradeDefense(s4, 'guild_b', 'nexus_plaza', 200);
  assert(!r4.success, 'non-owner cannot upgrade defense');

  // Insufficient treasury
  var s5 = fundedState('guild_a', 100);
  GuildWars.claimTerritory(s5, 'guild_a', 'gardens_spring', 1); // costs 200, balance =100 before
  // Actually with 100 spark and cost 200 claim will fail first
  // Re-fund properly:
  s5.guildTreasuries['guild_a'] = 300; // enough for claim (200), not for upgrade (200)
  GuildWars.claimTerritory(s5, 'guild_a', 'gardens_spring', 1); // costs 200, leaves 100
  var r5 = GuildWars.upgradeDefense(s5, 'guild_a', 'gardens_spring', 200);
  assert(!r5.success, 'upgrade fails with insufficient treasury');

  // Unknown territory
  var s6 = GuildWars.createGuildWarsState();
  var r6 = GuildWars.upgradeDefense(s6, 'guild_a', 'bad_territory', 200);
  assert(!r6.success, 'upgrade fails for unknown territory');

  // Mismatched sparkCost rejected
  var s7 = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s7, 'guild_a', 'nexus_plaza', 1);
  var r7 = GuildWars.upgradeDefense(s7, 'guild_a', 'nexus_plaza', 999);
  assert(!r7.success, 'mismatched sparkCost rejected');

  // Treasury deducted correctly
  var s8 = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s8, 'guild_a', 'nexus_plaza', 1); // costs 500
  var balAfterClaim = s8.guildTreasuries['guild_a'];
  GuildWars.upgradeDefense(s8, 'guild_a', 'nexus_plaza', 200);
  assertEqual(s8.guildTreasuries['guild_a'], balAfterClaim - 200, 'treasury deducted after upgrade');
})();

// ---------------------------------------------------------------------------
// SUITE 11 — collectTax
// ---------------------------------------------------------------------------
suite('collectTax');

(function() {
  var s1 = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s1, 'guild_a', 'nexus_plaza', 1); // taxRate = 0.10
  var balBefore = s1.guildTreasuries['guild_a'];
  var r1 = GuildWars.collectTax(s1, 'nexus_plaza', 1000);
  assertEqual(r1.taxAmount, 100, '10% of 1000 = 100');
  assertEqual(r1.ownerGuild, 'guild_a', 'ownerGuild is guild_a');
  assertEqual(s1.guildTreasuries['guild_a'], balBefore + 100, 'tax credited to owner treasury');
  assertEqual(s1.territoryStates['nexus_plaza'].taxCollected, 100, 'taxCollected updated');

  // Tax accumulates
  GuildWars.collectTax(s1, 'nexus_plaza', 500);
  assertEqual(s1.territoryStates['nexus_plaza'].taxCollected, 150, 'taxCollected accumulates');

  // Unclaimed territory: no tax
  var s2 = GuildWars.createGuildWarsState();
  var r2 = GuildWars.collectTax(s2, 'nexus_plaza', 1000);
  assertEqual(r2.taxAmount, 0, 'no tax on unclaimed territory');
  assertNull(r2.ownerGuild, 'ownerGuild null for unclaimed');

  // Unknown territory: no tax
  var s3 = GuildWars.createGuildWarsState();
  var r3 = GuildWars.collectTax(s3, 'unknown_place', 1000);
  assertEqual(r3.taxAmount, 0, 'no tax for unknown territory');

  // Various tax rates
  var s4 = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s4, 'guild_a', 'gardens_spring', 1); // taxRate = 0.05
  var r4 = GuildWars.collectTax(s4, 'gardens_spring', 1000);
  assertEqual(r4.taxAmount, 50, '5% of 1000 = 50');

  var s5 = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s5, 'guild_a', 'agora_market', 1); // taxRate = 0.10, cost=500
  var r5 = GuildWars.collectTax(s5, 'agora_market', 200);
  assertEqual(r5.taxAmount, 20, '10% of 200 = 20');

  // Tax floors to integer (Math.floor)
  var s6 = fundedState('guild_a', 5000);
  GuildWars.claimTerritory(s6, 'guild_a', 'gardens_spring', 1); // taxRate=0.05
  var r6 = GuildWars.collectTax(s6, 'gardens_spring', 3); // 5% of 3 = 0.15 → 0
  assertEqual(r6.taxAmount, 0, 'tax floors to 0 for tiny amounts');
})();

// ---------------------------------------------------------------------------
// SUITE 12 — getTerritory / getTerritories
// ---------------------------------------------------------------------------
suite('getTerritory / getTerritories');

(function() {
  var s1 = GuildWars.createGuildWarsState();
  var t1 = GuildWars.getTerritory(s1, 'nexus_plaza');
  assertNotNull(t1, 'getTerritory returns object for valid id');
  assert(t1.def && t1.def.id === 'nexus_plaza', 'getTerritory returns correct def');
  assertNotNull(t1.state, 'getTerritory returns state object');
  assertNull(t1.state.ownerId, 'initially unclaimed');

  // Null for unknown id
  var t2 = GuildWars.getTerritory(s1, 'unknown_id');
  assertNull(t2, 'getTerritory returns null for unknown id');

  // getTerritories: all 16
  var all = GuildWars.getTerritories(s1);
  assertEqual(all.length, 16, 'getTerritories returns 16 entries');

  // Filter by zone
  var nexusTerrs = GuildWars.getTerritories(s1, 'nexus');
  assertEqual(nexusTerrs.length, 2, 'getTerritories filtered to nexus zone gives 2');
  for (var i = 0; i < nexusTerrs.length; i++) {
    assertEqual(nexusTerrs[i].def.zone, 'nexus', 'all filtered entries are nexus zone');
  }

  // Filter unknown zone returns empty
  var unknownZone = GuildWars.getTerritories(s1, 'atlantis');
  assertEqual(unknownZone.length, 0, 'unknown zone filter returns empty array');
})();

// ---------------------------------------------------------------------------
// SUITE 13 — getGuildTerritories
// ---------------------------------------------------------------------------
suite('getGuildTerritories');

(function() {
  var s = fundedState('guild_a', 10000, { guild_b: 5000 });
  GuildWars.claimTerritory(s, 'guild_a', 'nexus_plaza', 1);
  GuildWars.claimTerritory(s, 'guild_a', 'nexus_gate', 1);
  GuildWars.claimTerritory(s, 'guild_b', 'gardens_grove', 1);

  var gaTerrs = GuildWars.getGuildTerritories(s, 'guild_a');
  assertEqual(gaTerrs.length, 2, 'guild_a holds 2 territories');

  var gbTerrs = GuildWars.getGuildTerritories(s, 'guild_b');
  assertEqual(gbTerrs.length, 1, 'guild_b holds 1 territory');

  var gcTerrs = GuildWars.getGuildTerritories(s, 'guild_c');
  assertEqual(gcTerrs.length, 0, 'guild with no territories returns empty array');

  // Verify IDs
  var gaIds = gaTerrs.map(function(t) { return t.def.id; });
  assert(gaIds.indexOf('nexus_plaza') !== -1, 'nexus_plaza in guild_a territories');
  assert(gaIds.indexOf('nexus_gate') !== -1, 'nexus_gate in guild_a territories');
})();

// ---------------------------------------------------------------------------
// SUITE 14 — getActiveWars / getWarById
// ---------------------------------------------------------------------------
suite('getActiveWars / getWarById');

(function() {
  var s = fundedState('guild_a', 10000, { guild_b: 5000, guild_c: 5000 });
  GuildWars.claimTerritory(s, 'guild_b', 'nexus_plaza', 1);
  GuildWars.claimTerritory(s, 'guild_c', 'nexus_gate', 1);

  assertEqual(GuildWars.getActiveWars(s).length, 0, 'no active wars initially');

  GuildWars.declareWar(s, 'guild_a', 'guild_b', 'nexus_plaza', 10);
  assertEqual(GuildWars.getActiveWars(s).length, 1, 'one active war after declaration');

  GuildWars.declareWar(s, 'guild_a', 'guild_c', 'nexus_gate', 10);
  assertEqual(GuildWars.getActiveWars(s).length, 2, 'two active wars');

  var wars = GuildWars.getActiveWars(s);
  var warId = wars[0].id;
  var found = GuildWars.getWarById(s, warId);
  assertNotNull(found, 'getWarById finds active war');
  assertEqual(found.id, warId, 'correct war returned');

  // Not found returns null
  var notFound = GuildWars.getWarById(s, 'war_9999');
  assertNull(notFound, 'getWarById returns null for unknown id');

  // Resolved war found in history
  GuildWars.resolveBattle(s, warId, 42);
  var inHistory = GuildWars.getWarById(s, warId);
  assertNotNull(inHistory, 'resolved war found in history via getWarById');
  assertEqual(inHistory.status, 'resolved', 'found war in resolved status');
})();

// ---------------------------------------------------------------------------
// SUITE 15 — getWarHistory
// ---------------------------------------------------------------------------
suite('getWarHistory');

(function() {
  function runWar(s, attackerId, defenderId, territoryId, atkForce, defForce, seed) {
    s.playerGuilds = s.playerGuilds || {};
    s.playerGuilds['pa_' + attackerId] = attackerId;
    s.playerGuilds['pb_' + defenderId] = defenderId;
    GuildWars.declareWar(s, attackerId, defenderId, territoryId, 10);
    var warId = s.wars[s.wars.length - 1].id;
    GuildWars.contributeWarEffort(s, 'pa_' + attackerId, warId, atkForce);
    GuildWars.contributeWarEffort(s, 'pb_' + defenderId, warId, defForce);
    GuildWars.resolveBattle(s, warId, seed || 42);
  }

  // guild_a wins attacking nexus_plaza
  var s1 = fundedState('guild_a', 50000, { guild_b: 50000, guild_c: 50000 });
  GuildWars.claimTerritory(s1, 'guild_b', 'nexus_plaza', 1);
  runWar(s1, 'guild_a', 'guild_b', 'nexus_plaza', 5000, 100, 42);

  var hist1 = GuildWars.getWarHistory(s1, 'guild_a');
  assertEqual(hist1.wars.length, 1, 'guild_a has 1 war in history');
  assertEqual(hist1.wins, 1, 'guild_a has 1 win');
  assertEqual(hist1.losses, 0, 'guild_a has 0 losses');
  assertEqual(hist1.draws, 0, 'guild_a has 0 draws');

  var hist2 = GuildWars.getWarHistory(s1, 'guild_b');
  assertEqual(hist2.wins, 0, 'guild_b has 0 wins');
  assertEqual(hist2.losses, 1, 'guild_b has 1 loss');

  // guild_c defends successfully
  GuildWars.claimTerritory(s1, 'guild_c', 'nexus_gate', 1);
  runWar(s1, 'guild_a', 'guild_c', 'nexus_gate', 50, 5000, 42);
  var hist3 = GuildWars.getWarHistory(s1, 'guild_a');
  assertEqual(hist3.losses, 1, 'guild_a now has 1 loss after failed attack');

  var hist4 = GuildWars.getWarHistory(s1, 'guild_c');
  assertEqual(hist4.wins, 1, 'guild_c has 1 win (defensive)');

  // Guild with no wars
  var hist5 = GuildWars.getWarHistory(s1, 'guild_d');
  assertEqual(hist5.wins, 0, 'guild with no wars: 0 wins');
  assertEqual(hist5.losses, 0, 'guild with no wars: 0 losses');
  assertEqual(hist5.wars.length, 0, 'guild with no wars: empty list');
})();

// ---------------------------------------------------------------------------
// SUITE 16 — getGuildPower
// ---------------------------------------------------------------------------
suite('getGuildPower');

(function() {
  var s = fundedState('guild_a', 2000);
  var p0 = GuildWars.getGuildPower(s, 'guild_a');
  assertEqual(p0.territories, 0, 'no territories initially');
  assertEqual(p0.treasury, 2000, 'treasury reported correctly');
  // power = 0 territories * 100 + floor(2000/10) + 0 defense = 200
  assertEqual(p0.power, 200, 'power calculated: 0 terr + 2000/10 + 0 def');

  GuildWars.claimTerritory(s, 'guild_a', 'nexus_plaza', 1); // costs 500
  var p1 = GuildWars.getGuildPower(s, 'guild_a');
  assertEqual(p1.territories, 1, 'one territory after claim');
  var expectedPower1 = (1 * 100) + Math.floor(1500 / 10) + (0 * 20);
  assertEqual(p1.power, expectedPower1, 'power with 1 territory and 1500 treasury');

  // Upgrade defense increases power
  GuildWars.upgradeDefense(s, 'guild_a', 'nexus_plaza', 200); // treasury 1300, defense=1
  var p2 = GuildWars.getGuildPower(s, 'guild_a');
  assertEqual(p2.totalDefense, 1, 'totalDefense is 1');
  var expectedPower2 = (1 * 100) + Math.floor(1300 / 10) + (1 * 20);
  assertEqual(p2.power, expectedPower2, 'power includes defense contribution');

  // Unknown guild returns 0 power
  var p3 = GuildWars.getGuildPower(s, 'guild_unknown');
  assertEqual(p3.territories, 0, 'unknown guild has 0 territories');
  assertEqual(p3.treasury, 0, 'unknown guild has 0 treasury');
})();

// ---------------------------------------------------------------------------
// SUITE 17 — getTerritoryMap
// ---------------------------------------------------------------------------
suite('getTerritoryMap');

(function() {
  var s = fundedState('guild_a', 5000, { guild_b: 5000 });
  GuildWars.claimTerritory(s, 'guild_a', 'nexus_plaza', 1);
  GuildWars.claimTerritory(s, 'guild_b', 'agora_market', 1);

  var map = GuildWars.getTerritoryMap(s);
  assertEqual(map.length, 16, 'map contains all 16 territories');

  // Find nexus_plaza entry
  var nexus = null;
  for (var i = 0; i < map.length; i++) {
    if (map[i].id === 'nexus_plaza') { nexus = map[i]; break; }
  }
  assertNotNull(nexus, 'nexus_plaza in map');
  assertEqual(nexus.ownerId, 'guild_a', 'nexus_plaza owner in map');
  assertEqual(nexus.value, 5, 'nexus_plaza value in map');
  assertNotNull(nexus.bonus, 'nexus_plaza bonus in map');

  // Unclaimed territory has null ownerId
  var unclaimed = null;
  for (var j = 0; j < map.length; j++) {
    if (map[j].id === 'gardens_grove') { unclaimed = map[j]; break; }
  }
  assertNull(unclaimed.ownerId, 'unclaimed territory has null ownerId in map');

  // Map has required fields on each entry
  for (var k = 0; k < map.length; k++) {
    var entry = map[k];
    assert(typeof entry.id === 'string', 'map entry has id');
    assert(typeof entry.name === 'string', 'map entry has name');
    assert(typeof entry.zone === 'string', 'map entry has zone');
    assert(typeof entry.defenseLevel === 'number', 'map entry has defenseLevel');
    assert(typeof entry.taxCollected === 'number', 'map entry has taxCollected');
  }
})();

// ---------------------------------------------------------------------------
// SUITE 18 — resetTerritories
// ---------------------------------------------------------------------------
suite('resetTerritories');

(function() {
  var s = fundedState('guild_a', 10000, { guild_b: 5000 });
  GuildWars.claimTerritory(s, 'guild_a', 'nexus_plaza', 1);  // cost 500
  GuildWars.claimTerritory(s, 'guild_a', 'nexus_gate', 1);   // cost 400
  GuildWars.claimTerritory(s, 'guild_b', 'gardens_grove', 1);// cost 300
  GuildWars.upgradeDefense(s, 'guild_a', 'nexus_plaza', 200);

  // Declare a war too
  GuildWars.claimTerritory(s, 'guild_b', 'agora_market', 1); // b claims this
  // Actually need guild_a to have treasury for war, let's fund it more
  s.guildTreasuries['guild_a'] = 5000;
  s.guildTreasuries['guild_b'] = 5000;
  // b already owns gardens_grove and agora_market; declare war against b on gardens_grove
  GuildWars.declareWar(s, 'guild_a', 'guild_b', 'gardens_grove', 10);
  assertEqual(s.wars.length, 1, 'one war active before reset');

  var balA = s.guildTreasuries['guild_a'];
  var balB = s.guildTreasuries['guild_b'];

  var result = GuildWars.resetTerritories(s, 5000);
  assertNotNull(result.reset, 'reset result has reset array');
  assert(result.reset.length >= 1, 'at least one territory reset');

  // All territories unclaimed
  for (var i = 0; i < GuildWars.TERRITORIES.length; i++) {
    var tid = GuildWars.TERRITORIES[i].id;
    assertNull(s.territoryStates[tid].ownerId, tid + ' unclaimed after reset');
    assertEqual(s.territoryStates[tid].defenseLevel, 0, tid + ' defense 0 after reset');
    assertEqual(s.territoryStates[tid].taxCollected, 0, tid + ' taxCollected 0 after reset');
  }

  // Active wars cancelled
  assertEqual(s.wars.length, 0, 'no active wars after reset');

  // Refunds: 25% of claim cost to previous owners
  // nexus_plaza (value=5, cost=500): refund = 125
  // nexus_gate (value=4, cost=400): refund = 100
  // Total for guild_a = 225
  var aRefund = 0;
  var bRefund = 0;
  for (var j = 0; j < result.reset.length; j++) {
    var entry = result.reset[j];
    if (entry.previousOwner === 'guild_a') aRefund += entry.refund;
    if (entry.previousOwner === 'guild_b') bRefund += entry.refund;
    assertEqual(entry.refund, Math.floor(
      GuildWars.TERRITORIES.find(function(t) { return t.id === entry.territoryId; }).value * 100 * 0.25
    ), 'refund for ' + entry.territoryId + ' is 25% of claim cost');
  }
  assert(aRefund > 0, 'guild_a received some refund');
  assert(bRefund > 0, 'guild_b received some refund');

  // Territories in reset log match previously owned territories
  var resetIds = result.reset.map(function(e) { return e.territoryId; });
  assert(resetIds.indexOf('nexus_plaza') !== -1, 'nexus_plaza in reset log');
  assert(resetIds.indexOf('nexus_gate') !== -1, 'nexus_gate in reset log');

  // Reset on already-empty state produces empty log
  var s2 = GuildWars.createGuildWarsState();
  var r2 = GuildWars.resetTerritories(s2, 100);
  assertEqual(r2.reset.length, 0, 'empty reset on state with no owned territories');
})();

// ---------------------------------------------------------------------------
// SUITE 19 — getDungeons (alias for TERRITORIES)
// ---------------------------------------------------------------------------
suite('getDungeons');

(function() {
  var d = GuildWars.getDungeons();
  assertEqual(d.length, 16, 'getDungeons returns 16 territory definitions');
  // Should be a copy (not the same reference)
  d.push({ id: 'fake' });
  assertEqual(GuildWars.getDungeons().length, 16, 'getDungeons returns fresh copy each call');
})();

// ---------------------------------------------------------------------------
// SUITE 20 — CONSTANTS exported
// ---------------------------------------------------------------------------
suite('Exported constants');

(function() {
  assertEqual(GuildWars.WAR_NOTICE_TICKS, 700, 'WAR_NOTICE_TICKS = 700');
  assertEqual(GuildWars.MAX_GUILD_TERRITORIES, 3, 'MAX_GUILD_TERRITORIES = 3');
  assertEqual(GuildWars.MAX_DEFENSE_LEVEL, 5, 'MAX_DEFENSE_LEVEL = 5');
  assertEqual(GuildWars.DEFENDER_HOME_BONUS, 0.20, 'DEFENDER_HOME_BONUS = 0.20');
})();

// ---------------------------------------------------------------------------
// SUITE 21 — Edge cases / interactions
// ---------------------------------------------------------------------------
suite('Edge cases and interactions');

(function() {
  // War declared → territory abandoned during notice → should still resolve (territory ownership changed)
  var s1 = fundedState('guild_a', 10000, { guild_b: 5000 });
  GuildWars.claimTerritory(s1, 'guild_b', 'nexus_plaza', 1);
  GuildWars.declareWar(s1, 'guild_a', 'guild_b', 'nexus_plaza', 10);
  GuildWars.abandonTerritory(s1, 'guild_b', 'nexus_plaza');
  // territory now unclaimed; battle resolves — attacker wins but territory was already unclaimed
  var warId1 = s1.wars[0].id;
  GuildWars.contributeWarEffort(s1, 'guild_a', warId1, 1000);
  var res1 = GuildWars.resolveBattle(s1, warId1, 1);
  // Result is valid (no crash)
  assert(typeof res1.result === 'string', 'battle resolves even after defender abandons');

  // Claim after abandon then re-war
  var s2 = fundedState('guild_a', 10000, { guild_b: 5000 });
  GuildWars.claimTerritory(s2, 'guild_b', 'nexus_gate', 1);
  GuildWars.declareWar(s2, 'guild_a', 'guild_b', 'nexus_gate', 10);
  GuildWars.cancelWar(s2, 'guild_a', s2.wars[0].id);
  // Should be able to declare again
  var r2 = GuildWars.declareWar(s2, 'guild_a', 'guild_b', 'nexus_gate', 20);
  assert(r2.success, 'can re-declare war after cancellation');

  // Max guild territories exact boundary
  var s3 = fundedState('guild_a', 50000);
  GuildWars.claimTerritory(s3, 'guild_a', 'nexus_plaza', 1);
  GuildWars.claimTerritory(s3, 'guild_a', 'nexus_gate', 1);
  GuildWars.claimTerritory(s3, 'guild_a', 'gardens_grove', 1);
  // At max; abandon one then claim
  GuildWars.abandonTerritory(s3, 'guild_a', 'nexus_plaza');
  var r3 = GuildWars.claimTerritory(s3, 'guild_a', 'agora_market', 1);
  assert(r3.success, 'can claim after dropping below max');

  // Multiple guilds war same zone simultaneously (different territories)
  var s4 = fundedState('guild_a', 10000, { guild_b: 5000, guild_c: 5000 });
  GuildWars.claimTerritory(s4, 'guild_b', 'agora_market', 1);
  GuildWars.claimTerritory(s4, 'guild_c', 'agora_square', 1);
  var wa = GuildWars.declareWar(s4, 'guild_a', 'guild_b', 'agora_market', 10);
  var wc = GuildWars.declareWar(s4, 'guild_a', 'guild_c', 'agora_square', 10);
  assert(wa.success, 'first war declared');
  assert(wc.success, 'second war declared (different territory)');
  assertEqual(s4.wars.length, 2, 'two concurrent wars active');

  // Battle with zero forces — defender wins (home advantage)
  var s5 = fundedState('guild_a', 5000, { guild_b: 5000 });
  GuildWars.claimTerritory(s5, 'guild_b', 'nexus_plaza', 1);
  GuildWars.declareWar(s5, 'guild_a', 'guild_b', 'nexus_plaza', 10);
  var warId5 = s5.wars[0].id;
  // No contributions at all
  var res5 = GuildWars.resolveBattle(s5, warId5, 42);
  assertEqual(res5.result, 'defender_wins', 'zero forces: defender wins (home advantage applies to 0)');

  // Tax collected after territory transfer via war
  var s6 = fundedState('guild_a', 10000, { guild_b: 10000 });
  s6.playerGuilds = { pa: 'guild_a', pb: 'guild_b' };
  GuildWars.claimTerritory(s6, 'guild_b', 'gardens_spring', 1); // taxRate=0.05
  GuildWars.declareWar(s6, 'guild_a', 'guild_b', 'gardens_spring', 10);
  var wid6 = s6.wars[0].id;
  GuildWars.joinBattle(s6, 'pa', wid6, 'attacker');
  GuildWars.joinBattle(s6, 'pb', wid6, 'defender');
  GuildWars.contributeWarEffort(s6, 'pa', wid6, 5000);
  GuildWars.contributeWarEffort(s6, 'pb', wid6, 10);
  GuildWars.resolveBattle(s6, wid6, 42);
  assertEqual(s6.territoryStates['gardens_spring'].ownerId, 'guild_a', 'guild_a owns territory after win');
  var taxRes = GuildWars.collectTax(s6, 'gardens_spring', 1000);
  assertEqual(taxRes.ownerGuild, 'guild_a', 'tax now goes to new owner');
})();

// ---------------------------------------------------------------------------
// FINAL REPORT
// ---------------------------------------------------------------------------
process.stdout.write('\n');
process.stdout.write('======================================\n');
process.stdout.write('  Passed: ' + passed + '\n');
process.stdout.write('  Failed: ' + failed + '\n');
process.stdout.write('======================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
