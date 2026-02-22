// tests/test_reputation_ledger.js
// Comprehensive tests for the ReputationLedger module — 200+ tests
// Run with: node tests/test_reputation_ledger.js

'use strict';

var RL = require('../src/js/reputation_ledger');

// ============================================================================
// MINIMAL TEST HARNESS
// ============================================================================

var passed = 0;
var failed = 0;
var failures = [];
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  console.log('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  ok - ' + msg + '\n');
  } else {
    failed++;
    var fullMsg = '[' + currentSuite + '] FAIL: ' + msg;
    failures.push(fullMsg);
    process.stdout.write('  FAIL - ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, (msg || '') + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertGte(a, b, msg) {
  assert(a >= b, (msg || '') + ' (expected >= ' + b + ', got ' + a + ')');
}

function assertLte(a, b, msg) {
  assert(a <= b, (msg || '') + ' (expected <= ' + b + ', got ' + a + ')');
}

function assertBetween(val, lo, hi, msg) {
  assert(val >= lo && val <= hi, (msg || '') + ' (expected ' + lo + '..' + hi + ', got ' + val + ')');
}

function assertNotNull(val, msg) {
  assert(val !== null && val !== undefined, (msg || '') + ' (got null/undefined)');
}

function assertNull(val, msg) {
  assert(val === null || val === undefined, (msg || '') + ' (expected null/undefined, got ' + val + ')');
}

// ============================================================================
// HELPERS
// ============================================================================

function freshLedger(id) {
  return RL.createLedger(id || 'citizen_test');
}

function freshRegistry() {
  return RL.createRegistry();
}

// ============================================================================
// SUITE: CONSTANTS & EXPORTS
// ============================================================================

suite('Constants — exported values', function() {

  assert(typeof RL.STANDING_MIN === 'number', 'STANDING_MIN is a number');
  assertEqual(RL.STANDING_MIN, 0, 'STANDING_MIN is 0');

  assert(typeof RL.STANDING_MAX === 'number', 'STANDING_MAX is a number');
  assertEqual(RL.STANDING_MAX, 1000, 'STANDING_MAX is 1000');

  assert(typeof RL.SOURCE_WEIGHTS === 'object', 'SOURCE_WEIGHTS is an object');
  assert(RL.SOURCE_WEIGHTS.hasOwnProperty('npc_reputation'), 'SOURCE_WEIGHTS has npc_reputation');
  assert(RL.SOURCE_WEIGHTS.hasOwnProperty('trust_bonds'), 'SOURCE_WEIGHTS has trust_bonds');
  assert(RL.SOURCE_WEIGHTS.hasOwnProperty('diplomatic_standing'), 'SOURCE_WEIGHTS has diplomatic_standing');
  assert(RL.SOURCE_WEIGHTS.hasOwnProperty('multiverse_reputation'), 'SOURCE_WEIGHTS has multiverse_reputation');
  assert(RL.SOURCE_WEIGHTS.hasOwnProperty('guild_progression'), 'SOURCE_WEIGHTS has guild_progression');
  assert(RL.SOURCE_WEIGHTS.hasOwnProperty('zone_steward'), 'SOURCE_WEIGHTS has zone_steward');

  assert(Array.isArray(RL.STANDING_TIERS), 'STANDING_TIERS is an array');
  assertEqual(RL.STANDING_TIERS.length, 5, 'STANDING_TIERS has 5 tiers');

  assert(typeof RL.DECAY_CONFIG === 'object', 'DECAY_CONFIG is an object');
  assert(typeof RL.DECAY_CONFIG.ticksPerDecayUnit === 'number', 'DECAY_CONFIG.ticksPerDecayUnit is a number');
  assert(typeof RL.DECAY_CONFIG.decayAmountPerUnit === 'number', 'DECAY_CONFIG.decayAmountPerUnit is a number');

  assert(Array.isArray(RL.RECOVERY_ARCS), 'RECOVERY_ARCS is an array');
  assertGte(RL.RECOVERY_ARCS.length, 4, 'RECOVERY_ARCS has >= 4 arcs');

  assert(Array.isArray(RL.FACTION_TYPES), 'FACTION_TYPES is an array');
  assertGte(RL.FACTION_TYPES.length, 3, 'FACTION_TYPES has >= 3 types');

  assert(typeof RL.SNAPSHOT_INTERVAL === 'number', 'SNAPSHOT_INTERVAL is a number');
  assertGte(RL.SNAPSHOT_INTERVAL, 1, 'SNAPSHOT_INTERVAL >= 1');
});

// ============================================================================
// SUITE: STANDING_TIERS structure
// ============================================================================

suite('STANDING_TIERS — structure and coverage', function() {

  RL.STANDING_TIERS.forEach(function(tier, i) {
    assert(typeof tier.name === 'string', 'tier ' + i + ' has name');
    assert(typeof tier.min === 'number', 'tier ' + i + ' has min');
    assert(typeof tier.max === 'number', 'tier ' + i + ' has max');
    assert(typeof tier.color === 'string', 'tier ' + i + ' has color');
    assert(typeof tier.badge === 'string', 'tier ' + i + ' has badge');
    assert(typeof tier.description === 'string', 'tier ' + i + ' has description');
    assert(tier.min <= tier.max, 'tier ' + i + ' min <= max');
  });

  var firstTier = RL.STANDING_TIERS[0];
  assertEqual(firstTier.min, 0, 'first tier starts at 0');

  var lastTier = RL.STANDING_TIERS[RL.STANDING_TIERS.length - 1];
  assertEqual(lastTier.max, 1000, 'last tier ends at 1000');

  // Tiers must be contiguous
  for (var i = 0; i < RL.STANDING_TIERS.length - 1; i++) {
    var cur = RL.STANDING_TIERS[i];
    var nxt = RL.STANDING_TIERS[i + 1];
    assertEqual(nxt.min, cur.max + 1, 'tier ' + i + ' is contiguous with next');
  }

  assert(firstTier.name === 'Newcomer', 'first tier is Newcomer');
  assert(lastTier.name === 'Legendary', 'last tier is Legendary');
});

// ============================================================================
// SUITE: RECOVERY_ARCS structure
// ============================================================================

suite('RECOVERY_ARCS — structure', function() {

  RL.RECOVERY_ARCS.forEach(function(arc, i) {
    assert(typeof arc.id === 'string', 'arc ' + i + ' has id');
    assert(typeof arc.name === 'string', 'arc ' + i + ' has name');
    assert(typeof arc.description === 'string', 'arc ' + i + ' has description');
    assert(typeof arc.stepsRequired === 'number', 'arc ' + i + ' has stepsRequired');
    assert(typeof arc.standingPerStep === 'number', 'arc ' + i + ' has standingPerStep');
    assert(typeof arc.totalBonus === 'number', 'arc ' + i + ' has totalBonus');
    assertGte(arc.stepsRequired, 1, 'arc ' + i + ' stepsRequired >= 1');
    assertGte(arc.standingPerStep, 1, 'arc ' + i + ' standingPerStep >= 1');
    assertGte(arc.totalBonus, 0, 'arc ' + i + ' totalBonus >= 0');
  });
});

// ============================================================================
// SUITE: SOURCE_WEIGHTS sum check
// ============================================================================

suite('SOURCE_WEIGHTS — values', function() {

  var weights = RL.SOURCE_WEIGHTS;
  var total = 0;
  for (var k in weights) {
    if (weights.hasOwnProperty(k)) {
      assertGte(weights[k], 0, 'weight ' + k + ' >= 0');
      assertLte(weights[k], 1, 'weight ' + k + ' <= 1');
      total += weights[k];
    }
  }
  assert(Math.abs(total - 1.0) < 0.001, 'SOURCE_WEIGHTS sum to ~1 (sum=' + total + ')');
});

// ============================================================================
// SUITE: mulberry32 PRNG
// ============================================================================

suite('mulberry32 — seeded PRNG', function() {

  var rng1 = RL.mulberry32(42);
  var rng2 = RL.mulberry32(42);
  var v1 = rng1();
  var v2 = rng2();
  assertEqual(v1, v2, 'same seed produces same first value');

  var rng3 = RL.mulberry32(99);
  var v3 = rng3();
  assert(v3 !== v1, 'different seeds produce different values');

  var rng4 = RL.mulberry32(1);
  for (var i = 0; i < 20; i++) {
    var v = rng4();
    assertBetween(v, 0, 1, 'PRNG value in [0,1] iteration ' + i);
  }

  // Determinism across multiple calls
  var rngA = RL.mulberry32(7);
  var rngB = RL.mulberry32(7);
  var seqA = [rngA(), rngA(), rngA()];
  var seqB = [rngB(), rngB(), rngB()];
  assert(seqA[0] === seqB[0] && seqA[1] === seqB[1] && seqA[2] === seqB[2], 'sequence is deterministic');
});

// ============================================================================
// SUITE: clampStanding
// ============================================================================

suite('clampStanding — boundary clamping', function() {

  assertEqual(RL.clampStanding(0), 0, 'clamp(0) = 0');
  assertEqual(RL.clampStanding(1000), 1000, 'clamp(1000) = 1000');
  assertEqual(RL.clampStanding(500), 500, 'clamp(500) = 500');
  assertEqual(RL.clampStanding(-50), 0, 'clamp(-50) = 0');
  assertEqual(RL.clampStanding(1001), 1000, 'clamp(1001) = 1000');
  assertEqual(RL.clampStanding(-1000), 0, 'clamp(-1000) = 0');
  assertEqual(RL.clampStanding(999), 999, 'clamp(999) = 999');
  assertEqual(RL.clampStanding(1), 1, 'clamp(1) = 1');
});

// ============================================================================
// SUITE: getStandingTier
// ============================================================================

suite('getStandingTier — tier resolution', function() {

  var t0 = RL.getStandingTier(0);
  assertEqual(t0.name, 'Newcomer', 'score 0 = Newcomer');

  var t50 = RL.getStandingTier(50);
  assertEqual(t50.name, 'Newcomer', 'score 50 = Newcomer');

  var t100 = RL.getStandingTier(100);
  assertEqual(t100.name, 'Citizen', 'score 100 = Citizen');

  var t299 = RL.getStandingTier(299);
  assertEqual(t299.name, 'Citizen', 'score 299 = Citizen');

  var t300 = RL.getStandingTier(300);
  assertEqual(t300.name, 'Trusted', 'score 300 = Trusted');

  var t549 = RL.getStandingTier(549);
  assertEqual(t549.name, 'Trusted', 'score 549 = Trusted');

  var t550 = RL.getStandingTier(550);
  assertEqual(t550.name, 'Honored', 'score 550 = Honored');

  var t800 = RL.getStandingTier(800);
  assertEqual(t800.name, 'Legendary', 'score 800 = Legendary');

  var t1000 = RL.getStandingTier(1000);
  assertEqual(t1000.name, 'Legendary', 'score 1000 = Legendary');

  // Over-range clamping
  var tOver = RL.getStandingTier(9999);
  assertEqual(tOver.name, 'Legendary', 'score 9999 clamped to Legendary');

  // Under-range
  var tUnder = RL.getStandingTier(-100);
  assertEqual(tUnder.name, 'Newcomer', 'score -100 clamped to Newcomer');
});

// ============================================================================
// SUITE: normalizeWeights
// ============================================================================

suite('normalizeWeights — weight normalization', function() {

  var w = { a: 1, b: 1, c: 2 };
  var n = RL.normalizeWeights(w);
  assert(Math.abs(n.a - 0.25) < 0.001, 'a normalized to 0.25');
  assert(Math.abs(n.b - 0.25) < 0.001, 'b normalized to 0.25');
  assert(Math.abs(n.c - 0.50) < 0.001, 'c normalized to 0.50');

  var w2 = { x: 0, y: 0 };
  var n2 = RL.normalizeWeights(w2);
  assertEqual(n2.x, 0, 'zero total: x stays 0');

  var w3 = { p: 0.2, q: 0.8 };
  var n3 = RL.normalizeWeights(w3);
  var sum3 = n3.p + n3.q;
  assert(Math.abs(sum3 - 1.0) < 0.001, 'normalized sum = 1');
});

// ============================================================================
// SUITE: createLedger
// ============================================================================

suite('createLedger — initialization', function() {

  var ledger = freshLedger('alpha');

  assertEqual(ledger.citizenId, 'alpha', 'citizenId stored');
  assertEqual(ledger.standing, 0, 'initial standing is 0');

  assert(typeof ledger.sources === 'object', 'sources is object');
  assert(ledger.sources.hasOwnProperty('npc_reputation'), 'sources has npc_reputation');
  assert(ledger.sources.hasOwnProperty('trust_bonds'), 'sources has trust_bonds');
  assert(ledger.sources.hasOwnProperty('diplomatic_standing'), 'sources has diplomatic_standing');
  assert(ledger.sources.hasOwnProperty('multiverse_reputation'), 'sources has multiverse_reputation');
  assert(ledger.sources.hasOwnProperty('guild_progression'), 'sources has guild_progression');
  assert(ledger.sources.hasOwnProperty('zone_steward'), 'sources has zone_steward');

  // All sources start at 0
  for (var src in ledger.sources) {
    if (ledger.sources.hasOwnProperty(src)) {
      assertEqual(ledger.sources[src], 0, 'source ' + src + ' starts at 0');
    }
  }

  assert(Array.isArray(ledger.entries), 'entries is array');
  assertEqual(ledger.entries.length, 0, 'entries starts empty');

  assert(Array.isArray(ledger.snapshots), 'snapshots is array');
  assertEqual(ledger.snapshots.length, 0, 'snapshots starts empty');

  assert(typeof ledger.factions === 'object', 'factions is object');
  assert(typeof ledger.recoveryArcs === 'object', 'recoveryArcs is object');

  assertEqual(ledger.lastActiveTick, -1, 'lastActiveTick starts at -1');
  assert(typeof ledger.createdAt === 'number', 'createdAt is number');

  // Weights are set
  assert(typeof ledger.weights === 'object', 'weights is object');
  for (var w in ledger.weights) {
    if (ledger.weights.hasOwnProperty(w)) {
      assertGte(ledger.weights[w], 0, 'weight ' + w + ' >= 0');
    }
  }
});

// ============================================================================
// SUITE: createRegistry
// ============================================================================

suite('createRegistry — initialization', function() {

  var reg = freshRegistry();

  assert(typeof reg === 'object', 'registry is object');
  assert(typeof reg.ledgers === 'object', 'registry.ledgers is object');
  assert(Array.isArray(reg.globalHistory), 'globalHistory is array');
  assertEqual(reg.globalHistory.length, 0, 'globalHistory starts empty');
  assertEqual(reg.tick, 0, 'tick starts at 0');
});

// ============================================================================
// SUITE: computeStanding
// ============================================================================

suite('computeStanding — composite score calculation', function() {

  var ledger = freshLedger('test_compute');
  assertEqual(RL.computeStanding(ledger), 0, 'all-zero sources = 0 standing');

  // Set all sources to 100
  for (var src in ledger.sources) {
    if (ledger.sources.hasOwnProperty(src)) {
      ledger.sources[src] = 100;
    }
  }
  var result = RL.computeStanding(ledger);
  assertEqual(result, 1000, 'all sources at 100 = 1000 standing');

  // Set all to 50
  for (var src2 in ledger.sources) {
    if (ledger.sources.hasOwnProperty(src2)) {
      ledger.sources[src2] = 50;
    }
  }
  var result2 = RL.computeStanding(ledger);
  assertEqual(result2, 500, 'all sources at 50 = 500 standing');

  // Individual source contribution
  var ledger2 = freshLedger('test_single');
  ledger2.sources.npc_reputation = 100;
  var s = RL.computeStanding(ledger2);
  // npc_reputation weight = 0.20, so contribution = 100 * 0.20 * 10 = 200
  assertEqual(s, 200, 'single source npc_reputation=100 contributes 200 standing');
});

// ============================================================================
// SUITE: recalcStanding
// ============================================================================

suite('recalcStanding — updates ledger.standing', function() {

  var ledger = freshLedger('recalc_test');
  ledger.sources.npc_reputation = 100;
  ledger.sources.trust_bonds = 100;

  var newStanding = RL.recalcStanding(ledger);
  assert(newStanding > 0, 'recalcStanding returns positive value');
  assertEqual(ledger.standing, newStanding, 'ledger.standing updated');

  // Modify and recalc
  ledger.sources.npc_reputation = 0;
  var reduced = RL.recalcStanding(ledger);
  assert(reduced < newStanding, 'reduced source lowers standing');
});

// ============================================================================
// SUITE: setSource
// ============================================================================

suite('setSource — updating individual sources', function() {

  var ledger = freshLedger('setsrc');

  var result = RL.setSource(ledger, 'npc_reputation', 80, 'test', 1);
  assert(result.success, 'setSource returns success');
  assertEqual(ledger.sources.npc_reputation, 80, 'source value updated');
  assert(result.newStanding > result.oldStanding, 'standing increased');
  assertNotNull(result.tier, 'result has tier');
  assertEqual(result.delta, result.newStanding - result.oldStanding, 'delta correct');

  // Log entry created
  assertEqual(ledger.entries.length, 1, 'entry logged');
  var entry = ledger.entries[0];
  assertEqual(entry.type, 'source_set', 'entry type is source_set');
  assertEqual(entry.source, 'npc_reputation', 'entry source correct');
  assertEqual(entry.value, 80, 'entry value correct');
  assertEqual(entry.tick, 1, 'entry tick correct');
  assertEqual(entry.reason, 'test', 'entry reason correct');

  // Clamping at 100
  RL.setSource(ledger, 'npc_reputation', 150, 'clamp_test', 2);
  assertEqual(ledger.sources.npc_reputation, 100, 'source clamped at 100');

  // Clamping at 0
  RL.setSource(ledger, 'npc_reputation', -50, 'clamp_low', 3);
  assertEqual(ledger.sources.npc_reputation, 0, 'source clamped at 0');

  // Unknown source returns failure
  var fail = RL.setSource(ledger, 'unknown_source', 50, 'test', 4);
  assertEqual(fail.success, false, 'unknown source returns failure');
});

// ============================================================================
// SUITE: adjustSource
// ============================================================================

suite('adjustSource — incremental source changes', function() {

  var ledger = freshLedger('adjsrc');

  RL.setSource(ledger, 'trust_bonds', 40, 'init', 0);
  var before = ledger.standing;

  var result = RL.adjustSource(ledger, 'trust_bonds', 20, 'bonus', 5);
  assert(result.success, 'adjustSource success');
  assertEqual(ledger.sources.trust_bonds, 60, 'source adjusted correctly');

  // Negative adjustment
  RL.adjustSource(ledger, 'trust_bonds', -10, 'penalty', 6);
  assertEqual(ledger.sources.trust_bonds, 50, 'negative adjust works');

  // Clamping
  RL.adjustSource(ledger, 'trust_bonds', 1000, 'clamp', 7);
  assertEqual(ledger.sources.trust_bonds, 100, 'adjustSource clamps at 100');

  RL.adjustSource(ledger, 'trust_bonds', -1000, 'clamp_low', 8);
  assertEqual(ledger.sources.trust_bonds, 0, 'adjustSource clamps at 0');

  // Unknown source
  var fail = RL.adjustSource(ledger, 'bogus', 10, 'test', 9);
  assertEqual(fail.success, false, 'unknown source fails');
});

// ============================================================================
// SUITE: addReputationEntry
// ============================================================================

suite('addReputationEntry — direct standing changes', function() {

  var ledger = freshLedger('direct');
  ledger.standing = 200;

  var result = RL.addReputationEntry(ledger, 50, 'quest_complete', 'Helped gather herbs', 10);
  assertEqual(ledger.standing, 250, 'standing increased by 50');
  assertEqual(result.oldStanding, 200, 'oldStanding correct');
  assertEqual(result.newStanding, 250, 'newStanding correct');
  assertEqual(result.delta, 50, 'delta correct');
  assertNotNull(result.tier, 'tier returned');

  // Log entry
  var e = ledger.entries[ledger.entries.length - 1];
  assertEqual(e.type, 'direct', 'entry type is direct');
  assertEqual(e.amount, 50, 'entry amount correct');
  assertEqual(e.source, 'quest_complete', 'entry source correct');
  assertEqual(e.reason, 'Helped gather herbs', 'entry reason correct');
  assertEqual(e.tick, 10, 'entry tick correct');

  // Negative
  RL.addReputationEntry(ledger, -100, 'violation', 'Broke community rule', 11);
  assertEqual(ledger.standing, 150, 'standing decreased');

  // Clamping at 0
  ledger.standing = 10;
  RL.addReputationEntry(ledger, -500, 'large_penalty', 'test', 12);
  assertEqual(ledger.standing, 0, 'standing clamped at 0');

  // Clamping at 1000
  ledger.standing = 990;
  RL.addReputationEntry(ledger, 50, 'bonus', 'test', 13);
  assertEqual(ledger.standing, 1000, 'standing clamped at 1000');
});

// ============================================================================
// SUITE: applyDecay
// ============================================================================

suite('applyDecay — inactivity decay', function() {

  var ledger = freshLedger('decay_test');
  ledger.standing = 300;
  ledger.lastActiveTick = 0;

  // No decay if not enough ticks
  var r1 = RL.applyDecay(ledger, 100);
  assertEqual(r1.decayed, false, 'no decay before threshold ticks');
  assertEqual(r1.amount, 0, 'zero decay amount');

  // Enough ticks for one decay unit
  var decayTicks = RL.DECAY_CONFIG.ticksPerDecayUnit;
  var r2 = RL.applyDecay(ledger, decayTicks);
  assertEqual(r2.decayed, true, 'decay triggers after enough ticks');
  assertGte(r2.amount, 1, 'some amount decayed');
  assert(ledger.standing < 300, 'standing reduced after decay');

  // No decay if lastActiveTick < 0
  var ledger2 = freshLedger('no_last_tick');
  ledger2.standing = 300;
  ledger2.lastActiveTick = -1;
  var r3 = RL.applyDecay(ledger2, 10000);
  assertEqual(r3.decayed, false, 'no decay when lastActiveTick=-1');

  // No decay below threshold
  var ledger3 = freshLedger('below_threshold');
  ledger3.standing = RL.DECAY_CONFIG.decayThreshold - 1;
  ledger3.lastActiveTick = 0;
  var r4 = RL.applyDecay(ledger3, 10000);
  assertEqual(r4.decayed, false, 'no decay when standing below threshold');

  // Entry logged on decay
  var ledger4 = freshLedger('decay_entry');
  ledger4.standing = 200;
  ledger4.lastActiveTick = 0;
  RL.applyDecay(ledger4, decayTicks * 2);
  var decayEntries = ledger4.entries.filter(function(e) { return e.type === 'decay'; });
  assertEqual(decayEntries.length, 1, 'one decay entry logged');
  assertEqual(decayEntries[0].source, 'inactivity_decay', 'decay entry has correct source');
});

// ============================================================================
// SUITE: applyDecayAll
// ============================================================================

suite('applyDecayAll — registry-wide decay', function() {

  var reg = freshRegistry();
  var l1 = RL.getOrCreateLedger(reg, 'citizen_a');
  var l2 = RL.getOrCreateLedger(reg, 'citizen_b');

  l1.standing = 300;
  l1.lastActiveTick = 0;
  l2.standing = 200;
  l2.lastActiveTick = 0;

  var decayTicks = RL.DECAY_CONFIG.ticksPerDecayUnit * 2;
  var results = RL.applyDecayAll(reg, decayTicks);

  assert(Array.isArray(results), 'returns array');
  assertEqual(results.length, 2, 'both citizens decayed');
  assertEqual(reg.tick, decayTicks, 'registry tick updated');

  results.forEach(function(r) {
    assert(r.result.decayed, 'each result has decayed=true');
    assertGte(r.result.amount, 1, 'each result has amount >= 1');
  });
});

// ============================================================================
// SUITE: activateRecoveryArc
// ============================================================================

suite('activateRecoveryArc — starting recovery paths', function() {

  var arcId = RL.RECOVERY_ARCS[0].id;
  var ledger = freshLedger('recovery_test');
  ledger.standing = 50;

  var result = RL.activateRecoveryArc(ledger, arcId, 10);
  assertEqual(result.success, true, 'arc activation success');
  assertEqual(result.arcId, arcId, 'arcId returned');
  assertNotNull(result.arc, 'arc definition returned');

  // Arc is now active
  var arcState = ledger.recoveryArcs[arcId];
  assert(arcState.active, 'arc is active');
  assertEqual(arcState.stepsCompleted, 0, 'steps start at 0');
  assertEqual(arcState.startedAt, 10, 'startedAt recorded');

  // Log entry
  var e = ledger.entries.find(function(x) { return x.type === 'recovery_arc_started'; });
  assertNotNull(e, 'recovery_arc_started entry logged');
  assertEqual(e.arcId, arcId, 'entry arcId correct');

  // Cannot re-activate active arc
  var fail = RL.activateRecoveryArc(ledger, arcId, 20);
  assertEqual(fail.success, false, 'cannot re-activate active arc');
  assertEqual(fail.reason, 'already_active', 'reason is already_active');

  // Unknown arc
  var fail2 = RL.activateRecoveryArc(ledger, 'nonexistent_arc', 30);
  assertEqual(fail2.success, false, 'unknown arc fails');
  assertEqual(fail2.reason, 'unknown_arc', 'reason is unknown_arc');

  // Standing too high
  var arcDef = RL.RECOVERY_ARCS[0];
  var ledger2 = freshLedger('too_high');
  ledger2.standing = arcDef.maxScore + 1;
  var fail3 = RL.activateRecoveryArc(ledger2, arcId, 5);
  assertEqual(fail3.success, false, 'fails when standing too high');
  assertEqual(fail3.reason, 'standing_too_high', 'reason is standing_too_high');
});

// ============================================================================
// SUITE: advanceRecoveryArc
// ============================================================================

suite('advanceRecoveryArc — progressing through arcs', function() {

  var arcDef = RL.RECOVERY_ARCS[0];
  var arcId = arcDef.id;
  var ledger = freshLedger('advance_test');
  ledger.standing = 50;

  RL.activateRecoveryArc(ledger, arcId, 0);
  var standingBefore = ledger.standing;

  var result = RL.advanceRecoveryArc(ledger, arcId, 1);
  assert(result.success, 'advance success');
  assertEqual(result.stepsCompleted, 1, 'steps incremented');
  assertGte(result.gained, arcDef.standingPerStep, 'gained >= standingPerStep (recovery bonus applied)');
  assert(ledger.standing > standingBefore, 'standing increased');

  // Entry logged
  var e = ledger.entries.find(function(x) { return x.type === 'recovery_arc_step'; });
  assertNotNull(e, 'recovery_arc_step entry logged');
  assertEqual(e.arcId, arcId, 'entry arcId correct');
  assertEqual(e.step, 1, 'entry step = 1');

  // Complete the arc
  var stepsNeeded = arcDef.stepsRequired;
  for (var i = result.stepsCompleted; i < stepsNeeded; i++) {
    RL.advanceRecoveryArc(ledger, arcId, i + 2);
  }
  var arcState = ledger.recoveryArcs[arcId];
  assertEqual(arcState.active, false, 'arc no longer active after completion');
  assertNotNull(arcState.completedAt, 'completedAt recorded');

  // Cannot advance completed arc
  var fail = RL.advanceRecoveryArc(ledger, arcId, 99);
  assertEqual(fail.success, false, 'cannot advance completed arc');

  // Cannot advance without activation
  var ledger2 = freshLedger('not_activated');
  var fail2 = RL.advanceRecoveryArc(ledger2, arcId, 5);
  assertEqual(fail2.success, false, 'cannot advance unactivated arc');
  assertEqual(fail2.reason, 'arc_not_active', 'reason is arc_not_active');

  // Unknown arc
  var fail3 = RL.advanceRecoveryArc(ledger, 'fake_arc', 5);
  assertEqual(fail3.success, false, 'unknown arc fails');
});

// ============================================================================
// SUITE: getRecoveryArcStatus
// ============================================================================

suite('getRecoveryArcStatus — arc status listing', function() {

  var ledger = freshLedger('arc_status');
  ledger.standing = 50;

  var status = RL.getRecoveryArcStatus(ledger);
  assert(Array.isArray(status), 'returns array');
  assertEqual(status.length, RL.RECOVERY_ARCS.length, 'one entry per arc');

  status.forEach(function(s) {
    assert(typeof s.arcId === 'string', 'each status has arcId');
    assert(typeof s.name === 'string', 'each status has name');
    assert(typeof s.active === 'boolean', 'each status has active');
    assert(typeof s.stepsCompleted === 'number', 'each status has stepsCompleted');
    assert(typeof s.available === 'boolean', 'each status has available');
  });

  // Activate one arc and verify status changes
  var arcId = RL.RECOVERY_ARCS[0].id;
  RL.activateRecoveryArc(ledger, arcId, 1);

  var status2 = RL.getRecoveryArcStatus(ledger);
  var activeStatus = status2.find(function(s) { return s.arcId === arcId; });
  assertEqual(activeStatus.active, true, 'activated arc shown as active');
  assertEqual(activeStatus.stepsCompleted, 0, 'steps start at 0');
});

// ============================================================================
// SUITE: setFactionStanding
// ============================================================================

suite('setFactionStanding — faction reputation', function() {

  var ledger = freshLedger('faction_test');

  var result = RL.setFactionStanding(ledger, 'guild_builders', 'Builders Guild', 'guild', 75, 'founder', 5);
  assertEqual(result.success, true, 'setFactionStanding success');
  assertEqual(result.factionId, 'guild_builders', 'factionId correct');
  assertEqual(result.newVal, 75, 'standing set to 75');
  assertEqual(result.oldVal, 0, 'oldVal was 0');

  var faction = ledger.factions['guild_builders'];
  assertNotNull(faction, 'faction stored');
  assertEqual(faction.standing, 75, 'standing stored');
  assertEqual(faction.name, 'Builders Guild', 'name stored');
  assertEqual(faction.type, 'guild', 'type stored');
  assertEqual(faction.updatedAt, 5, 'updatedAt stored');

  // Entry logged
  var e = ledger.entries.find(function(x) { return x.type === 'faction_standing'; });
  assertNotNull(e, 'faction_standing entry logged');
  assertEqual(e.factionId, 'guild_builders', 'entry factionId correct');
  assertEqual(e.newVal, 75, 'entry newVal correct');

  // Clamping
  RL.setFactionStanding(ledger, 'guild_builders', 'Builders Guild', 'guild', 150, 'clamp', 6);
  assertEqual(ledger.factions['guild_builders'].standing, 100, 'faction standing clamped at 100');

  RL.setFactionStanding(ledger, 'guild_builders', 'Builders Guild', 'guild', -50, 'clamp_low', 7);
  assertEqual(ledger.factions['guild_builders'].standing, 0, 'faction standing clamped at 0');
});

// ============================================================================
// SUITE: adjustFactionStanding
// ============================================================================

suite('adjustFactionStanding — incremental faction changes', function() {

  var ledger = freshLedger('adj_faction');

  RL.setFactionStanding(ledger, 'merchants', 'Merchant Union', 'trade_coalition', 50, 'init', 0);

  var result = RL.adjustFactionStanding(ledger, 'merchants', 20, 'trade_deal', 1);
  assertEqual(result.success, true, 'adjustFactionStanding success');
  assertEqual(ledger.factions['merchants'].standing, 70, 'standing adjusted to 70');

  RL.adjustFactionStanding(ledger, 'merchants', -30, 'dispute', 2);
  assertEqual(ledger.factions['merchants'].standing, 40, 'negative adjust works');

  // Non-existent faction
  var fail = RL.adjustFactionStanding(ledger, 'unknown_faction', 10, 'test', 3);
  assertEqual(fail.success, false, 'unknown faction fails');
  assertEqual(fail.reason, 'faction_not_found', 'reason is faction_not_found');
});

// ============================================================================
// SUITE: getFactionStanding
// ============================================================================

suite('getFactionStanding — individual faction lookup', function() {

  var ledger = freshLedger('get_faction');

  var notFound = RL.getFactionStanding(ledger, 'nonexistent');
  assertNull(notFound, 'returns null for nonexistent faction');

  RL.setFactionStanding(ledger, 'zone_nexus', 'Nexus Stewards', 'zone', 60, 'init', 0);
  var found = RL.getFactionStanding(ledger, 'zone_nexus');
  assertNotNull(found, 'returns faction object');
  assertEqual(found.standing, 60, 'standing correct');
  assertEqual(found.name, 'Nexus Stewards', 'name correct');
});

// ============================================================================
// SUITE: getAllFactionStandings
// ============================================================================

suite('getAllFactionStandings — all factions sorted', function() {

  var ledger = freshLedger('all_factions');

  RL.setFactionStanding(ledger, 'f1', 'Faction 1', 'guild', 30, 'init', 0);
  RL.setFactionStanding(ledger, 'f2', 'Faction 2', 'zone', 80, 'init', 0);
  RL.setFactionStanding(ledger, 'f3', 'Faction 3', 'npc_group', 50, 'init', 0);

  var all = RL.getAllFactionStandings(ledger);
  assertEqual(all.length, 3, 'all 3 factions returned');
  assertEqual(all[0].factionId, 'f2', 'highest standing first');
  assertEqual(all[1].factionId, 'f3', 'second highest next');
  assertEqual(all[2].factionId, 'f1', 'lowest last');
});

// ============================================================================
// SUITE: takeSnapshot
// ============================================================================

suite('takeSnapshot — periodic snapshots', function() {

  var ledger = freshLedger('snapshot_test');
  ledger.standing = 350;
  ledger.sources.npc_reputation = 40;

  var snap = RL.takeSnapshot(ledger, 100);
  assertNotNull(snap, 'snapshot returned');
  assertEqual(snap.tick, 100, 'snapshot tick correct');
  assertEqual(snap.standing, 350, 'snapshot standing correct');
  assert(typeof snap.tier === 'string', 'snapshot tier is string');
  assertEqual(snap.tier, 'Trusted', 'snapshot tier = Trusted');
  assertEqual(snap.sources.npc_reputation, 40, 'snapshot captures source values');
  assert(typeof snap.factionCount === 'number', 'snapshot has factionCount');

  assertEqual(ledger.snapshots.length, 1, 'snapshot stored in ledger');
  assertEqual(ledger.snapshotCounter, 100, 'snapshotCounter updated');

  // Take another
  RL.takeSnapshot(ledger, 200);
  assertEqual(ledger.snapshots.length, 2, 'second snapshot stored');
});

// ============================================================================
// SUITE: maybeSnapshot
// ============================================================================

suite('maybeSnapshot — conditional snapshot', function() {

  var ledger = freshLedger('maybe_snap');
  ledger.standing = 200;
  ledger.snapshotCounter = 0;

  // Before interval
  var r1 = RL.maybeSnapshot(ledger, 50);
  assertNull(r1, 'no snapshot before interval');
  assertEqual(ledger.snapshots.length, 0, 'no snapshot stored');

  // At interval
  var r2 = RL.maybeSnapshot(ledger, RL.SNAPSHOT_INTERVAL);
  assertNotNull(r2, 'snapshot taken at interval');
  assertEqual(ledger.snapshots.length, 1, 'snapshot stored');

  // Before next interval
  var r3 = RL.maybeSnapshot(ledger, RL.SNAPSHOT_INTERVAL + 10);
  assertNull(r3, 'no snapshot before next interval');

  // At next interval
  var r4 = RL.maybeSnapshot(ledger, RL.SNAPSHOT_INTERVAL * 2);
  assertNotNull(r4, 'snapshot taken at second interval');
  assertEqual(ledger.snapshots.length, 2, 'two snapshots stored');
});

// ============================================================================
// SUITE: getStandingTrend
// ============================================================================

suite('getStandingTrend — trend analysis', function() {

  var ledger = freshLedger('trend_test');

  // No snapshots: returns current standing
  var t0 = RL.getStandingTrend(ledger);
  assertEqual(t0.average, ledger.standing, 'average = current when no snapshots');
  assertEqual(t0.trend, 'stable', 'stable with no snapshots');

  // Add rising snapshots
  ledger.standing = 100;
  RL.takeSnapshot(ledger, 100);
  ledger.standing = 200;
  RL.takeSnapshot(ledger, 200);
  ledger.standing = 350;
  RL.takeSnapshot(ledger, 300);

  var t1 = RL.getStandingTrend(ledger, 3);
  assertEqual(t1.trend, 'rising', 'trend is rising');
  assertGte(t1.average, 100, 'average >= 100');
  assertEqual(t1.min, 100, 'min is 100');
  assertEqual(t1.max, 350, 'max is 350');

  // Add falling snapshots
  var ledger2 = freshLedger('falling');
  ledger2.standing = 800;
  RL.takeSnapshot(ledger2, 100);
  ledger2.standing = 600;
  RL.takeSnapshot(ledger2, 200);
  ledger2.standing = 400;
  RL.takeSnapshot(ledger2, 300);

  var t2 = RL.getStandingTrend(ledger2, 3);
  assertEqual(t2.trend, 'falling', 'trend is falling');

  // Stable snapshots
  var ledger3 = freshLedger('stable');
  ledger3.standing = 300;
  RL.takeSnapshot(ledger3, 100);
  ledger3.standing = 310;
  RL.takeSnapshot(ledger3, 200);

  var t3 = RL.getStandingTrend(ledger3, 3);
  assertEqual(t3.trend, 'stable', 'small delta = stable');
});

// ============================================================================
// SUITE: syncNpcReputation
// ============================================================================

suite('syncNpcReputation — sync from NPC system', function() {

  var ledger = freshLedger('sync_npc');

  // All max scores: avg = 100 -> normalized = 100
  var result = RL.syncNpcReputation(ledger, [100, 100, 100], 5);
  assert(result.success, 'sync success with positive scores');
  assertEqual(ledger.sources.npc_reputation, 100, 'source set to 100 for all 100s');

  // All min scores: avg = -100 -> normalized = 0
  var ledger2 = freshLedger('sync_npc2');
  var result2 = RL.syncNpcReputation(ledger2, [-100, -100, -100], 5);
  assert(result2.success, 'sync success with negative scores');
  assertEqual(ledger2.sources.npc_reputation, 0, 'source set to 0 for all -100s');

  // Mixed: avg = 0 -> normalized = 50
  var ledger3 = freshLedger('sync_npc3');
  RL.syncNpcReputation(ledger3, [-100, 100], 5);
  assertEqual(ledger3.sources.npc_reputation, 50, 'mixed scores = 50');

  // Empty array
  var ledger4 = freshLedger('sync_npc4');
  var fail = RL.syncNpcReputation(ledger4, [], 5);
  assertEqual(fail.success, false, 'empty array fails');
});

// ============================================================================
// SUITE: syncTrustBonds
// ============================================================================

suite('syncTrustBonds — sync from Trust Bonds system', function() {

  var ledger = freshLedger('sync_tb');

  // 500 points = 100 source
  var r1 = RL.syncTrustBonds(ledger, 500, 1);
  assert(r1.success, 'sync success at 500');
  assertEqual(ledger.sources.trust_bonds, 100, '500 points = 100 source');

  // 0 points = 0 source
  var ledger2 = freshLedger('sync_tb2');
  RL.syncTrustBonds(ledger2, 0, 1);
  assertEqual(ledger2.sources.trust_bonds, 0, '0 points = 0 source');

  // 250 points = 50 source
  var ledger3 = freshLedger('sync_tb3');
  RL.syncTrustBonds(ledger3, 250, 1);
  assertEqual(ledger3.sources.trust_bonds, 50, '250 points = 50 source');

  // Over max clamped
  var ledger4 = freshLedger('sync_tb4');
  RL.syncTrustBonds(ledger4, 10000, 1);
  assertEqual(ledger4.sources.trust_bonds, 100, 'over max clamped to 100');
});

// ============================================================================
// SUITE: syncDiplomaticStanding
// ============================================================================

suite('syncDiplomaticStanding — sync from Diplomatic system', function() {

  var ledger = freshLedger('sync_dipl');

  // Max +100 -> 100
  RL.syncDiplomaticStanding(ledger, 100, 1);
  assertEqual(ledger.sources.diplomatic_standing, 100, '+100 diplomatic = 100 source');

  // -100 -> 0
  var ledger2 = freshLedger('sync_dipl2');
  RL.syncDiplomaticStanding(ledger2, -100, 1);
  assertEqual(ledger2.sources.diplomatic_standing, 0, '-100 diplomatic = 0 source');

  // 0 -> 50
  var ledger3 = freshLedger('sync_dipl3');
  RL.syncDiplomaticStanding(ledger3, 0, 1);
  assertEqual(ledger3.sources.diplomatic_standing, 50, '0 diplomatic = 50 source');
});

// ============================================================================
// SUITE: syncMultiverseReputation
// ============================================================================

suite('syncMultiverseReputation — sync from Multiverse system', function() {

  var ledger = freshLedger('sync_mv');

  RL.syncMultiverseReputation(ledger, 75, 1);
  assertEqual(ledger.sources.multiverse_reputation, 75, '75 synced correctly');

  var ledger2 = freshLedger('sync_mv2');
  RL.syncMultiverseReputation(ledger2, -20, 1);
  assertEqual(ledger2.sources.multiverse_reputation, 0, 'negative clamped to 0');

  var ledger3 = freshLedger('sync_mv3');
  RL.syncMultiverseReputation(ledger3, 200, 1);
  assertEqual(ledger3.sources.multiverse_reputation, 100, 'over 100 clamped to 100');
});

// ============================================================================
// SUITE: syncGuildProgression
// ============================================================================

suite('syncGuildProgression — sync from Guild system', function() {

  var ledger = freshLedger('sync_guild');

  // Level 10 = 100
  RL.syncGuildProgression(ledger, 10, 1);
  assertEqual(ledger.sources.guild_progression, 100, 'level 10 = 100');

  // Level 5 = 50
  var ledger2 = freshLedger('sync_guild2');
  RL.syncGuildProgression(ledger2, 5, 1);
  assertEqual(ledger2.sources.guild_progression, 50, 'level 5 = 50');

  // Level 1 = 10
  var ledger3 = freshLedger('sync_guild3');
  RL.syncGuildProgression(ledger3, 1, 1);
  assertEqual(ledger3.sources.guild_progression, 10, 'level 1 = 10');

  // Level 0 = 0
  var ledger4 = freshLedger('sync_guild4');
  RL.syncGuildProgression(ledger4, 0, 1);
  assertEqual(ledger4.sources.guild_progression, 0, 'level 0 = 0');
});

// ============================================================================
// SUITE: syncZoneSteward
// ============================================================================

suite('syncZoneSteward — sync from Zone system', function() {

  var ledger = freshLedger('sync_zone');

  RL.syncZoneSteward(ledger, 80, 1);
  assertEqual(ledger.sources.zone_steward, 80, '80 synced correctly');

  var ledger2 = freshLedger('sync_zone2');
  RL.syncZoneSteward(ledger2, 0, 1);
  assertEqual(ledger2.sources.zone_steward, 0, '0 synced correctly');

  var ledger3 = freshLedger('sync_zone3');
  RL.syncZoneSteward(ledger3, 150, 1);
  assertEqual(ledger3.sources.zone_steward, 100, 'over-max clamped to 100');
});

// ============================================================================
// SUITE: getPublicHistory
// ============================================================================

suite('getPublicHistory — auditable log (§6.3)', function() {

  var ledger = freshLedger('history_test');

  // Add several entries
  for (var i = 0; i < 10; i++) {
    RL.addReputationEntry(ledger, 5, 'quest', 'Quest ' + i, i);
  }

  var history = RL.getPublicHistory(ledger);
  assert(Array.isArray(history), 'history is array');
  assertEqual(history.length, 10, 'all 10 entries returned');

  // Limit
  var limited = RL.getPublicHistory(ledger, 5);
  assertEqual(limited.length, 5, 'limit=5 returns 5 entries');

  // Add many entries and check limit behavior
  for (var j = 0; j < 100; j++) {
    RL.addReputationEntry(ledger, 1, 'event', 'Event ' + j, j + 100);
  }
  var limited2 = RL.getPublicHistory(ledger, 50);
  assertEqual(limited2.length, 50, 'limit=50 returns 50 latest');

  // Default limit 50
  var def = RL.getPublicHistory(ledger);
  assertEqual(def.length, 50, 'default limit is 50');
});

// ============================================================================
// SUITE: getStandingSummary
// ============================================================================

suite('getStandingSummary — summary object', function() {

  var ledger = freshLedger('summary_test');
  ledger.standing = 450;
  RL.setSource(ledger, 'npc_reputation', 60, 'test', 1);

  var summary = RL.getStandingSummary(ledger);
  assertNotNull(summary, 'summary returned');
  assertEqual(summary.citizenId, 'summary_test', 'citizenId correct');
  assert(typeof summary.standing === 'number', 'standing is number');
  assertNotNull(summary.tier, 'tier included');
  assert(Array.isArray(summary.sources), 'sources is array');
  assert(typeof summary.entryCount === 'number', 'entryCount is number');
  assert(typeof summary.snapshotCount === 'number', 'snapshotCount is number');
  assert(typeof summary.factionCount === 'number', 'factionCount is number');

  // Sources sorted by value descending
  var sources = summary.sources;
  for (var i = 0; i < sources.length - 1; i++) {
    assertGte(sources[i].value, sources[i + 1].value, 'sources sorted descending at ' + i);
  }

  // Each source entry has required fields
  sources.forEach(function(s) {
    assert(typeof s.source === 'string', 'source entry has source');
    assert(typeof s.value === 'number', 'source entry has value');
    assert(typeof s.weight === 'number', 'source entry has weight');
  });
});

// ============================================================================
// SUITE: getOrCreateLedger
// ============================================================================

suite('getOrCreateLedger — registry operations', function() {

  var reg = freshRegistry();

  var l1 = RL.getOrCreateLedger(reg, 'alice');
  assertNotNull(l1, 'ledger created');
  assertEqual(l1.citizenId, 'alice', 'citizenId set');

  // Same ID returns same object
  var l2 = RL.getOrCreateLedger(reg, 'alice');
  assert(l1 === l2, 'same ledger returned for same ID');

  // Different ID creates new ledger
  var l3 = RL.getOrCreateLedger(reg, 'bob');
  assert(l3 !== l1, 'different ledger for different ID');
  assertEqual(l3.citizenId, 'bob', 'bob ledger has correct ID');

  // Registry has both
  assert(reg.ledgers['alice'] !== undefined, 'alice in registry');
  assert(reg.ledgers['bob'] !== undefined, 'bob in registry');
});

// ============================================================================
// SUITE: getLeaderboard
// ============================================================================

suite('getLeaderboard — ranking citizens by standing', function() {

  var reg = freshRegistry();
  var la = RL.getOrCreateLedger(reg, 'a');
  var lb = RL.getOrCreateLedger(reg, 'b');
  var lc = RL.getOrCreateLedger(reg, 'c');

  la.standing = 800;
  lb.standing = 400;
  lc.standing = 100;

  var board = RL.getLeaderboard(reg);
  assert(Array.isArray(board), 'returns array');
  assertEqual(board.length, 3, 'all citizens listed');
  assertEqual(board[0].citizenId, 'a', 'first is highest standing');
  assertEqual(board[1].citizenId, 'b', 'second is middle');
  assertEqual(board[2].citizenId, 'c', 'third is lowest');
  assertEqual(board[0].standing, 800, 'correct standing for first');

  // With limit
  var top2 = RL.getLeaderboard(reg, 2);
  assertEqual(top2.length, 2, 'limit=2 returns 2');

  // Tier included
  board.forEach(function(entry) {
    assert(typeof entry.tier === 'string', 'entry has tier');
  });
});

// ============================================================================
// SUITE: broadcastReputationEvent
// ============================================================================

suite('broadcastReputationEvent — global events', function() {

  var reg = freshRegistry();
  RL.getOrCreateLedger(reg, 'cit1');
  RL.getOrCreateLedger(reg, 'cit2');
  RL.getOrCreateLedger(reg, 'cit3');

  var results = RL.broadcastReputationEvent(
    reg, 'festival_bonus', ['cit1', 'cit2', 'cit3'], 25, 'Zion Festival', 100
  );

  assert(Array.isArray(results), 'returns array of results');
  assertEqual(results.length, 3, '3 results for 3 citizens');

  results.forEach(function(r) {
    assert(typeof r.citizenId === 'string', 'each result has citizenId');
    assertNotNull(r.result, 'each result has result object');
  });

  // Each citizen standing increased
  assertEqual(reg.ledgers['cit1'].standing, 25, 'cit1 standing increased');
  assertEqual(reg.ledgers['cit2'].standing, 25, 'cit2 standing increased');
  assertEqual(reg.ledgers['cit3'].standing, 25, 'cit3 standing increased');

  // Global history logged
  assertEqual(reg.globalHistory.length, 3, '3 global history entries');
  reg.globalHistory.forEach(function(h) {
    assertEqual(h.type, 'festival_bonus', 'history type correct');
    assertEqual(h.amount, 25, 'history amount correct');
    assertEqual(h.tick, 100, 'history tick correct');
  });

  // Creates ledger if not existing
  RL.broadcastReputationEvent(reg, 'new_citizen', ['newguy'], 10, 'Welcome', 200);
  assertNotNull(reg.ledgers['newguy'], 'ledger created for new citizen');
  assertEqual(reg.ledgers['newguy'].standing, 10, 'new citizen gets standing');
});

// ============================================================================
// SUITE: recordActivity
// ============================================================================

suite('recordActivity — track last active tick', function() {

  var ledger = freshLedger('activity_test');
  assertEqual(ledger.lastActiveTick, -1, 'starts at -1');

  RL.recordActivity(ledger, 50);
  assertEqual(ledger.lastActiveTick, 50, 'updated to 50');

  RL.recordActivity(ledger, 200);
  assertEqual(ledger.lastActiveTick, 200, 'updated to 200');
});

// ============================================================================
// SUITE: hasMinimumTier
// ============================================================================

suite('hasMinimumTier — tier access checks', function() {

  var ledger = freshLedger('tier_check');
  ledger.standing = 350; // Trusted tier

  assert(RL.hasMinimumTier(ledger, 'Newcomer'), 'Trusted has Newcomer');
  assert(RL.hasMinimumTier(ledger, 'Citizen'), 'Trusted has Citizen');
  assert(RL.hasMinimumTier(ledger, 'Trusted'), 'Trusted has Trusted');
  assert(!RL.hasMinimumTier(ledger, 'Honored'), 'Trusted does not have Honored');
  assert(!RL.hasMinimumTier(ledger, 'Legendary'), 'Trusted does not have Legendary');

  var ledger2 = freshLedger('newcomer_check');
  ledger2.standing = 50;
  assert(RL.hasMinimumTier(ledger2, 'Newcomer'), 'Newcomer has Newcomer');
  assert(!RL.hasMinimumTier(ledger2, 'Citizen'), 'Newcomer does not have Citizen');

  // Invalid tier
  assert(!RL.hasMinimumTier(ledger, 'FakeTier'), 'invalid tier = false');

  // Legendary can access all
  var ledger3 = freshLedger('legendary');
  ledger3.standing = 900;
  assert(RL.hasMinimumTier(ledger3, 'Legendary'), 'Legendary has Legendary');
  assert(RL.hasMinimumTier(ledger3, 'Honored'), 'Legendary has Honored');
});

// ============================================================================
// SUITE: getTierBenefits
// ============================================================================

suite('getTierBenefits — list of accessible tiers', function() {

  var ledger = freshLedger('benefits_test');
  ledger.standing = 350; // Trusted

  var benefits = RL.getTierBenefits(ledger);
  assert(Array.isArray(benefits), 'returns array');
  assert(benefits.indexOf('Newcomer') !== -1, 'includes Newcomer');
  assert(benefits.indexOf('Citizen') !== -1, 'includes Citizen');
  assert(benefits.indexOf('Trusted') !== -1, 'includes Trusted');
  assert(benefits.indexOf('Honored') === -1, 'does not include Honored');

  var ledger2 = freshLedger('legendary_benefits');
  ledger2.standing = 1000;
  var b2 = RL.getTierBenefits(ledger2);
  assertEqual(b2.length, RL.STANDING_TIERS.length, 'Legendary gets all tiers');
});

// ============================================================================
// SUITE: setWeights
// ============================================================================

suite('setWeights — custom weight configuration', function() {

  var ledger = freshLedger('weight_test');

  // Boost npc_reputation weight
  RL.setWeights(ledger, { npc_reputation: 0.5 });
  assertEqual(ledger.weights.npc_reputation, 0.5, 'npc_reputation weight updated');

  // Other weights unchanged
  assert(ledger.weights.trust_bonds > 0, 'trust_bonds weight unchanged');

  // Standing is recalculated
  ledger.sources.npc_reputation = 100;
  var standing = ledger.standing;
  assertGte(standing, 0, 'standing is non-negative after weight change');

  // Unknown source key ignored
  var prevWeights = JSON.stringify(ledger.weights);
  RL.setWeights(ledger, { nonexistent_source: 99 });
  // weights unchanged for unknown
  assert(ledger.weights.nonexistent_source === undefined, 'unknown source not added');

  // Negative weights clamped to 0
  RL.setWeights(ledger, { zone_steward: -5 });
  assertEqual(ledger.weights.zone_steward, 0, 'negative weight clamped to 0');
});

// ============================================================================
// SUITE: getEntriesByType
// ============================================================================

suite('getEntriesByType — filter entries by type', function() {

  var ledger = freshLedger('filter_type');

  RL.addReputationEntry(ledger, 10, 'quest', 'reason1', 1);
  RL.addReputationEntry(ledger, 20, 'event', 'reason2', 2);
  RL.setSource(ledger, 'npc_reputation', 50, 'sync', 3);

  var direct = RL.getEntriesByType(ledger, 'direct');
  assertEqual(direct.length, 2, '2 direct entries');
  direct.forEach(function(e) {
    assertEqual(e.type, 'direct', 'entry type is direct');
  });

  var sourceSets = RL.getEntriesByType(ledger, 'source_set');
  assertEqual(sourceSets.length, 1, '1 source_set entry');

  var none = RL.getEntriesByType(ledger, 'nonexistent_type');
  assertEqual(none.length, 0, 'no entries for unknown type');
});

// ============================================================================
// SUITE: getEntriesBySource
// ============================================================================

suite('getEntriesBySource — filter entries by source', function() {

  var ledger = freshLedger('filter_source');

  RL.addReputationEntry(ledger, 10, 'quest_complete', 'q1', 1);
  RL.addReputationEntry(ledger, 15, 'quest_complete', 'q2', 2);
  RL.addReputationEntry(ledger, 5, 'festival', 'f1', 3);
  RL.setSource(ledger, 'npc_reputation', 60, 'sync', 4);

  var quests = RL.getEntriesBySource(ledger, 'quest_complete');
  assertEqual(quests.length, 2, '2 quest_complete entries');

  var festival = RL.getEntriesBySource(ledger, 'festival');
  assertEqual(festival.length, 1, '1 festival entry');

  // Source_set entries: source field holds the source key ('npc_reputation')
  var npcSync = RL.getEntriesBySource(ledger, 'npc_reputation');
  assertGte(npcSync.length, 1, 'npc_reputation source_set entry found');
});

// ============================================================================
// SUITE: getEntriesByTickRange
// ============================================================================

suite('getEntriesByTickRange — filter by tick range', function() {

  var ledger = freshLedger('filter_tick');

  RL.addReputationEntry(ledger, 5, 'a', 'r', 10);
  RL.addReputationEntry(ledger, 5, 'b', 'r', 20);
  RL.addReputationEntry(ledger, 5, 'c', 'r', 30);
  RL.addReputationEntry(ledger, 5, 'd', 'r', 40);
  RL.addReputationEntry(ledger, 5, 'e', 'r', 50);

  var range1 = RL.getEntriesByTickRange(ledger, 20, 40);
  assertEqual(range1.length, 3, 'ticks 20-40 returns 3 entries');

  var range2 = RL.getEntriesByTickRange(ledger, 1, 100);
  assertEqual(range2.length, 5, 'full range returns 5 entries');

  var range3 = RL.getEntriesByTickRange(ledger, 99, 200);
  assertEqual(range3.length, 0, 'no entries outside range');

  var range4 = RL.getEntriesByTickRange(ledger, 10, 10);
  assertEqual(range4.length, 1, 'exact tick match works');
});

// ============================================================================
// SUITE: getNetStandingChange
// ============================================================================

suite('getNetStandingChange — net calculation', function() {

  var ledger = freshLedger('net_test');

  RL.addReputationEntry(ledger, 50, 'event', 'r', 1);
  RL.addReputationEntry(ledger, 30, 'event', 'r', 2);
  RL.addReputationEntry(ledger, -20, 'penalty', 'r', 3);

  var net = RL.getNetStandingChange(ledger);
  assertEqual(net, 60, 'net = 50+30-20 = 60');

  // With no entries
  var ledger2 = freshLedger('empty_net');
  assertEqual(RL.getNetStandingChange(ledger2), 0, 'empty entries = net 0');
});

// ============================================================================
// SUITE: INTEGRATION — full citizen lifecycle
// ============================================================================

suite('Integration — full citizen lifecycle', function() {

  var reg = freshRegistry();
  var ledger = RL.getOrCreateLedger(reg, 'zara');

  // New citizen starts at 0
  assertEqual(ledger.standing, 0, 'starts at 0');
  assertEqual(RL.getStandingTier(ledger.standing).name, 'Newcomer', 'starts as Newcomer');

  // Record first activity
  RL.recordActivity(ledger, 1);
  assertEqual(ledger.lastActiveTick, 1, 'activity recorded');

  // Sync positive data from all systems
  RL.syncNpcReputation(ledger, [20, 40, 60], 1);
  RL.syncTrustBonds(ledger, 100, 1);
  RL.syncDiplomaticStanding(ledger, 30, 1);
  RL.syncMultiverseReputation(ledger, 45, 1);
  RL.syncGuildProgression(ledger, 3, 1);
  RL.syncZoneSteward(ledger, 55, 1);

  var standing1 = ledger.standing;
  assertGte(standing1, 100, 'standing >= 100 after all syncs');
  // At these source values standing will be well above 100 (Citizen threshold)
  assert(RL.getStandingTier(ledger.standing).name !== 'Newcomer', 'promoted beyond Newcomer');

  // Add some direct gains
  RL.addReputationEntry(ledger, 50, 'quest', 'Completed zone quest', 5);
  RL.addReputationEntry(ledger, 30, 'event', 'Festival contribution', 6);

  // Take snapshot
  var snap = RL.takeSnapshot(ledger, 10);
  assertEqual(snap.tick, 10, 'snapshot at tick 10');

  // Add faction
  RL.setFactionStanding(ledger, 'artists', 'Artists Collective', 'npc_group', 70, 'collaboration', 8);
  var factions = RL.getAllFactionStandings(ledger);
  assertEqual(factions.length, 1, '1 faction');

  // Activate recovery arc (might not activate if standing too high)
  var arc = RL.RECOVERY_ARCS[0];
  if (ledger.standing <= arc.maxScore) {
    var arcResult = RL.activateRecoveryArc(ledger, arc.id, 10);
    assert(arcResult.success, 'arc activated');
    RL.advanceRecoveryArc(ledger, arc.id, 11);
    assertGte(ledger.recoveryArcs[arc.id].stepsCompleted, 1, 'arc progressed');
  }

  // History is auditable
  var history = RL.getPublicHistory(ledger);
  assert(history.length > 0, 'history has entries');
  history.forEach(function(h) {
    assert(typeof h.type === 'string', 'each history entry has type');
  });

  // Summary
  var summary = RL.getStandingSummary(ledger);
  assertEqual(summary.citizenId, 'zara', 'summary citizenId correct');
  assertGte(summary.standing, 0, 'summary standing >= 0');
});

// ============================================================================
// SUITE: INTEGRATION — decay and recovery
// ============================================================================

suite('Integration — decay and recovery', function() {

  var ledger = freshLedger('decay_recovery');
  ledger.standing = 400;
  ledger.lastActiveTick = 0;

  // Significant inactivity
  var bigTick = RL.DECAY_CONFIG.ticksPerDecayUnit * 10;
  var decayResult = RL.applyDecay(ledger, bigTick);

  assert(decayResult.decayed, 'decay happened');
  assert(ledger.standing < 400, 'standing reduced');

  var standingAfterDecay = ledger.standing;

  // Activate recovery arc if eligible
  var arc = RL.RECOVERY_ARCS[0];
  if (standingAfterDecay <= arc.maxScore) {
    RL.activateRecoveryArc(ledger, arc.id, bigTick + 1);

    // Advance all steps
    for (var s = 0; s < arc.stepsRequired; s++) {
      RL.advanceRecoveryArc(ledger, arc.id, bigTick + 2 + s);
    }

    var standingAfterRecovery = ledger.standing;
    assert(standingAfterRecovery > standingAfterDecay, 'recovery increases standing');

    var arcState = ledger.recoveryArcs[arc.id];
    assertEqual(arcState.active, false, 'arc completed');
    assertNotNull(arcState.completedAt, 'completedAt set');
  }

  // Trend analysis
  RL.takeSnapshot(ledger, 100);
  RL.takeSnapshot(ledger, 200);
  var trend = RL.getStandingTrend(ledger);
  assertNotNull(trend, 'trend returned');
  assert(typeof trend.trend === 'string', 'trend has trend string');
});

// ============================================================================
// SUITE: INTEGRATION — leaderboard and broadcast
// ============================================================================

suite('Integration — leaderboard and broadcast', function() {

  var reg = freshRegistry();
  var citizens = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];

  citizens.forEach(function(cid, i) {
    var ledger = RL.getOrCreateLedger(reg, cid);
    ledger.standing = (i + 1) * 100;
  });

  // Leaderboard reflects standings
  var board = RL.getLeaderboard(reg);
  assertEqual(board[0].citizenId, 'epsilon', 'highest standing first');
  assertEqual(board[board.length - 1].citizenId, 'alpha', 'lowest standing last');

  // Broadcast positive event to all
  RL.broadcastReputationEvent(reg, 'community_day', citizens, 50, 'Community celebration', 500);

  citizens.forEach(function(cid) {
    assertGte(reg.ledgers[cid].standing, 50, cid + ' has increased standing');
  });

  // Broadcast penalty
  RL.broadcastReputationEvent(reg, 'server_event', ['alpha', 'beta'], -20, 'World event penalty', 501);
  assert(reg.ledgers['alpha'].standing >= 0, 'alpha standing clamped at 0 or above');

  // Global history accumulates
  assertGte(reg.globalHistory.length, citizens.length + 2, 'global history has entries');
});

// ============================================================================
// SUITE: Edge cases
// ============================================================================

suite('Edge cases — robustness', function() {

  // Empty citizenId string
  var ledger = RL.createLedger('');
  assertEqual(ledger.citizenId, '', 'empty string citizenId works');
  assertEqual(ledger.standing, 0, 'standing still 0');

  // Standing exactly at tier boundaries
  var tiers = RL.STANDING_TIERS;
  for (var i = 0; i < tiers.length; i++) {
    var t = RL.getStandingTier(tiers[i].min);
    assertEqual(t.name, tiers[i].name, 'tier min resolves correctly for ' + tiers[i].name);
    var t2 = RL.getStandingTier(tiers[i].max);
    assertEqual(t2.name, tiers[i].name, 'tier max resolves correctly for ' + tiers[i].name);
  }

  // Multiple arcs active simultaneously
  var ledger2 = freshLedger('multi_arc');
  ledger2.standing = 0;
  var arcIds = RL.RECOVERY_ARCS.filter(function(a) { return a.maxScore >= 0; }).map(function(a) { return a.id; });
  var activated = 0;
  arcIds.forEach(function(aid) {
    var r = RL.activateRecoveryArc(ledger2, aid, 1);
    if (r.success) activated++;
  });
  assertGte(activated, 1, 'at least one arc activatable at standing=0');

  // getPublicHistory with limit 0 falls back to 50
  var ledger3 = freshLedger('limit_zero');
  for (var k = 0; k < 60; k++) {
    RL.addReputationEntry(ledger3, 1, 'e', 'r', k);
  }
  var histDefault = RL.getPublicHistory(ledger3, 0);
  // 0 is falsy so falls back to default 50
  assertEqual(histDefault.length, 50, 'limit=0 uses default 50');

  // normalizeWeights with single key
  var single = RL.normalizeWeights({ only: 5 });
  assert(Math.abs(single.only - 1.0) < 0.001, 'single weight normalizes to 1.0');

  // Snapshot sources are a copy (not reference)
  var ledger4 = freshLedger('snap_copy');
  ledger4.sources.npc_reputation = 50;
  var snap = RL.takeSnapshot(ledger4, 1);
  ledger4.sources.npc_reputation = 99;
  assertEqual(snap.sources.npc_reputation, 50, 'snapshot captures value at time, not later mutation');

  // setWeights with all-zero weights still recalculates
  var ledger5 = freshLedger('zero_weights');
  ledger5.standing = 500;
  RL.setWeights(ledger5, {
    npc_reputation: 0,
    trust_bonds: 0,
    diplomatic_standing: 0,
    multiverse_reputation: 0,
    guild_progression: 0,
    zone_steward: 0
  });
  // All zero weights: normalizeWeights returns original (zero total guard)
  assert(typeof ledger5.standing === 'number', 'standing still a number with zero weights');
});

// ============================================================================
// REPORT
// ============================================================================

console.log('\n' + passed + ' passed, ' + failed + ' failed');

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(function(f) { console.error('  ' + f); });
}

if (failed > 0) process.exit(1);
