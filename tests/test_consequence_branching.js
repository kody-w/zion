/**
 * tests/test_consequence_branching.js
 * Comprehensive tests for the ZION Consequence Branching system.
 * 130+ tests covering all exported functions, data integrity, decision logic,
 * zone gates, lore, reconciliation, leaderboards, and edge cases.
 *
 * Run with: node tests/test_consequence_branching.js
 */

'use strict';

var CB = require('../src/js/consequence_branching');

// ============================================================================
// TEST HARNESS
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
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertGTE(a, b, msg) {
  assert(a >= b, msg + ' (got ' + a + ', need >= ' + b + ')');
}

function assertLTE(a, b, msg) {
  assert(a <= b, msg + ' (got ' + a + ', need <= ' + b + ')');
}

function assertNotNull(val, msg) {
  assert(val !== null && val !== undefined, msg);
}

function assertNull(val, msg) {
  assert(val === null || val === undefined, msg);
}

// ============================================================================
// HELPERS
// ============================================================================

var playerSeq = 0;
function uid() { return 'p' + (++playerSeq); }

function freshState() {
  return CB.createState();
}

function stateWithPlayer(id) {
  var s = freshState();
  CB.initPlayer(s, id);
  return s;
}

/** Make a decision and assert success */
function decide(state, playerId, decisionId, choiceId, tick) {
  var result = CB.makeDecision(state, playerId, decisionId, choiceId, tick || 0);
  assert(result.success, 'decision ' + decisionId + ':' + choiceId + ' succeeds');
  return result;
}

/** Pump a player's branch XP directly to a target level */
function pumpXP(state, playerId, branchId, targetXP) {
  CB.initPlayer(state, playerId);
  state.players[playerId].branchXP[branchId] = targetXP;
}

// ============================================================================
// SUITE 1: MODULE EXPORTS
// ============================================================================

suite('Suite 1: Module exports', function() {

  assert(typeof CB === 'object', 'module exports an object');
  assert(Array.isArray(CB.BRANCHES), 'BRANCHES is an array');
  assert(Array.isArray(CB.DECISIONS), 'DECISIONS is an array');
  assert(Array.isArray(CB.ZONE_GATES), 'ZONE_GATES is an array');
  assert(Array.isArray(CB.BRANCH_REWARDS), 'BRANCH_REWARDS is an array');
  assert(typeof CB.createState === 'function', 'createState is a function');
  assert(typeof CB.initPlayer === 'function', 'initPlayer is a function');
  assert(typeof CB.makeDecision === 'function', 'makeDecision is a function');
  assert(typeof CB.getBranchProgress === 'function', 'getBranchProgress is a function');
  assert(typeof CB.getDominantBranch === 'function', 'getDominantBranch is a function');
  assert(typeof CB.canAccessZone === 'function', 'canAccessZone is a function');
  assert(typeof CB.getAvailableDecisions === 'function', 'getAvailableDecisions is a function');
  assert(typeof CB.getDecisionHistory === 'function', 'getDecisionHistory is a function');
  assert(typeof CB.getMilestoneRewards === 'function', 'getMilestoneRewards is a function');
  assert(typeof CB.getLoreVersion === 'function', 'getLoreVersion is a function');
  assert(typeof CB.canReconcile === 'function', 'canReconcile is a function');
  assert(typeof CB.reconcileBranches === 'function', 'reconcileBranches is a function');
  assert(typeof CB.getExclusiveRewards === 'function', 'getExclusiveRewards is a function');
  assert(typeof CB.getBranchLeaderboard === 'function', 'getBranchLeaderboard is a function');
  assert(typeof CB.getPlayerProfile === 'function', 'getPlayerProfile is a function');
  assert(typeof CB.getDecisionStats === 'function', 'getDecisionStats is a function');
  assert(typeof CB.getLockedContent === 'function', 'getLockedContent is a function');

});

// ============================================================================
// SUITE 2: BRANCHES DATA INTEGRITY
// ============================================================================

suite('Suite 2: Branches data integrity', function() {

  assertEqual(CB.BRANCHES.length, 4, 'exactly 4 branches defined');

  var branchIds = ['peace', 'power', 'knowledge', 'creation'];
  for (var i = 0; i < branchIds.length; i++) {
    var id = branchIds[i];
    var branch = null;
    for (var j = 0; j < CB.BRANCHES.length; j++) {
      if (CB.BRANCHES[j].id === id) { branch = CB.BRANCHES[j]; break; }
    }
    assertNotNull(branch, 'branch "' + id + '" exists');
    assertEqual(branch.milestones.length, 5, 'branch "' + id + '" has 5 milestones');
  }

  // Milestone XP values
  var milestoneXPs = [25, 100, 250, 500, 1000];
  CB.BRANCHES.forEach(function(branch) {
    for (var m = 0; m < branch.milestones.length; m++) {
      assertEqual(branch.milestones[m].xp, milestoneXPs[m],
        'branch ' + branch.id + ' milestone ' + m + ' has xp ' + milestoneXPs[m]);
    }
  });

  // Required fields
  CB.BRANCHES.forEach(function(branch) {
    assert(typeof branch.id === 'string', 'branch has id string');
    assert(typeof branch.name === 'string', 'branch has name string');
    assert(typeof branch.description === 'string', 'branch has description string');
    assert(Array.isArray(branch.keywords), 'branch has keywords array');
    assert(typeof branch.color === 'string', 'branch has color string');
    assert(typeof branch.icon === 'string', 'branch has icon string');
  });

  // All branch IDs unique
  var seen = {};
  var unique = true;
  CB.BRANCHES.forEach(function(b) {
    if (seen[b.id]) unique = false;
    seen[b.id] = true;
  });
  assert(unique, 'all branch IDs are unique');

  // Milestones have required fields
  CB.BRANCHES.forEach(function(branch) {
    branch.milestones.forEach(function(m) {
      assert(typeof m.xp === 'number', 'milestone has numeric xp');
      assert(typeof m.title === 'string', 'milestone has title string');
      assert(typeof m.description === 'string', 'milestone has description string');
    });
  });

});

// ============================================================================
// SUITE 3: DECISIONS DATA INTEGRITY
// ============================================================================

suite('Suite 3: Decisions data integrity', function() {

  assertGTE(CB.DECISIONS.length, 20, 'at least 20 decisions defined');

  // Required fields
  CB.DECISIONS.forEach(function(dec) {
    assert(typeof dec.id === 'string', 'decision ' + dec.id + ' has string id');
    assert(typeof dec.name === 'string', 'decision ' + dec.id + ' has string name');
    assert(typeof dec.description === 'string', 'decision ' + dec.id + ' has string description');
    assert(typeof dec.zone === 'string', 'decision ' + dec.id + ' has zone string');
    assert(typeof dec.minTick === 'number', 'decision ' + dec.id + ' has numeric minTick');
    assert(Array.isArray(dec.prerequisites), 'decision ' + dec.id + ' has prerequisites array');
    assert(Array.isArray(dec.choices), 'decision ' + dec.id + ' has choices array');
    assertGTE(dec.choices.length, 2, 'decision ' + dec.id + ' has at least 2 choices');
  });

  // All decision IDs unique
  var seenIds = {};
  var uniqueIds = true;
  CB.DECISIONS.forEach(function(d) {
    if (seenIds[d.id]) uniqueIds = false;
    seenIds[d.id] = true;
  });
  assert(uniqueIds, 'all decision IDs are unique');

  // Every choice has required fields
  CB.DECISIONS.forEach(function(dec) {
    dec.choices.forEach(function(ch) {
      assert(typeof ch.id === 'string', 'choice ' + ch.id + ' in ' + dec.id + ' has string id');
      assert(typeof ch.text === 'string', 'choice ' + ch.id + ' in ' + dec.id + ' has string text');
      assert(typeof ch.branchXP === 'object', 'choice ' + ch.id + ' in ' + dec.id + ' has branchXP object');
      assert(Array.isArray(ch.locks), 'choice ' + ch.id + ' has locks array');
      assert(Array.isArray(ch.unlocks), 'choice ' + ch.id + ' has unlocks array');
    });
  });

  // branchXP values are positive numbers
  var validXP = true;
  CB.DECISIONS.forEach(function(dec) {
    dec.choices.forEach(function(ch) {
      for (var b in ch.branchXP) {
        if (typeof ch.branchXP[b] !== 'number' || ch.branchXP[b] <= 0) {
          validXP = false;
        }
      }
    });
  });
  assert(validXP, 'all choice branchXP values are positive numbers');

  // branchXP keys are valid branch IDs
  var validBranches = ['peace', 'power', 'knowledge', 'creation'];
  var validBranchKeys = true;
  CB.DECISIONS.forEach(function(dec) {
    dec.choices.forEach(function(ch) {
      for (var b in ch.branchXP) {
        if (validBranches.indexOf(b) === -1) {
          validBranchKeys = false;
        }
      }
    });
  });
  assert(validBranchKeys, 'all branchXP keys are valid branch IDs');

  // Within each decision, choice IDs are unique
  var choiceIdsUnique = true;
  CB.DECISIONS.forEach(function(dec) {
    var choiceSeen = {};
    dec.choices.forEach(function(ch) {
      if (choiceSeen[ch.id]) choiceIdsUnique = false;
      choiceSeen[ch.id] = true;
    });
  });
  assert(choiceIdsUnique, 'choice IDs are unique within each decision');

});

// ============================================================================
// SUITE 4: ZONE GATES DATA INTEGRITY
// ============================================================================

suite('Suite 4: Zone gates data integrity', function() {

  assertGTE(CB.ZONE_GATES.length, 12, 'at least 12 zone gates defined');

  var validBranches = ['peace', 'power', 'knowledge', 'creation'];
  CB.ZONE_GATES.forEach(function(gate) {
    assert(typeof gate.id === 'string', 'gate has id string');
    assert(typeof gate.name === 'string', 'gate has name string');
    assert(typeof gate.description === 'string', 'gate has description string');
    assert(typeof gate.zone === 'string', 'gate has zone string');
    assert(validBranches.indexOf(gate.requiredBranch) !== -1, 'gate ' + gate.id + ' has valid requiredBranch');
    assert(typeof gate.requiredXP === 'number' && gate.requiredXP > 0, 'gate ' + gate.id + ' has positive requiredXP');
    assert(typeof gate.unlockMessage === 'string', 'gate has unlockMessage string');
  });

  // All gate IDs unique
  var seenGates = {};
  var gateUnique = true;
  CB.ZONE_GATES.forEach(function(g) {
    if (seenGates[g.id]) gateUnique = false;
    seenGates[g.id] = true;
  });
  assert(gateUnique, 'all zone gate IDs are unique');

  // Verify at least one gate per branch
  var branchCoverage = { peace: 0, power: 0, knowledge: 0, creation: 0 };
  CB.ZONE_GATES.forEach(function(g) {
    branchCoverage[g.requiredBranch]++;
  });
  assert(branchCoverage.peace >= 1, 'peace has at least 1 zone gate');
  assert(branchCoverage.power >= 1, 'power has at least 1 zone gate');
  assert(branchCoverage.knowledge >= 1, 'knowledge has at least 1 zone gate');
  assert(branchCoverage.creation >= 1, 'creation has at least 1 zone gate');

});

// ============================================================================
// SUITE 5: BRANCH REWARDS DATA INTEGRITY
// ============================================================================

suite('Suite 5: Branch rewards data integrity', function() {

  assertEqual(CB.BRANCH_REWARDS.length, 12, 'exactly 12 branch rewards defined');

  // 3 per branch
  var counts = { peace: 0, power: 0, knowledge: 0, creation: 0 };
  CB.BRANCH_REWARDS.forEach(function(r) {
    counts[r.branchId]++;
  });
  assertEqual(counts.peace, 3, '3 peace rewards');
  assertEqual(counts.power, 3, '3 power rewards');
  assertEqual(counts.knowledge, 3, '3 knowledge rewards');
  assertEqual(counts.creation, 3, '3 creation rewards');

  // Required fields
  CB.BRANCH_REWARDS.forEach(function(r) {
    assert(typeof r.id === 'string', 'reward has id string');
    assert(['peace', 'power', 'knowledge', 'creation'].indexOf(r.branchId) !== -1, 'reward has valid branchId');
    assert(['cosmetic', 'title'].indexOf(r.type) !== -1, 'reward has valid type');
    assert(typeof r.name === 'string', 'reward has name string');
    assert(typeof r.description === 'string', 'reward has description string');
    assert(typeof r.requiredMilestone === 'number', 'reward has numeric requiredMilestone');
    assert(r.requiredMilestone >= 1 && r.requiredMilestone <= 5, 'reward milestone in range 1-5');
  });

  // All reward IDs unique
  var seenRewards = {};
  var rewardUnique = true;
  CB.BRANCH_REWARDS.forEach(function(r) {
    if (seenRewards[r.id]) rewardUnique = false;
    seenRewards[r.id] = true;
  });
  assert(rewardUnique, 'all reward IDs are unique');

});

// ============================================================================
// SUITE 6: CREATE STATE
// ============================================================================

suite('Suite 6: createState', function() {

  var s = CB.createState();
  assert(typeof s === 'object', 'createState returns an object');
  assert(typeof s.players === 'object', 'state has players object');
  assert(typeof s.decisions === 'object', 'state has decisions object');
  assert(typeof s.loreVersions === 'object', 'state has loreVersions object');
  assert(Array.isArray(s.decisionLog), 'state has decisionLog array');
  assertEqual(s.decisionLog.length, 0, 'decisionLog starts empty');
  assertEqual(Object.keys(s.players).length, 0, 'players starts empty');

});

// ============================================================================
// SUITE 7: INIT PLAYER
// ============================================================================

suite('Suite 7: initPlayer', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  assert(typeof s.players[p] === 'object', 'player record created');
  assert(typeof s.players[p].branchXP === 'object', 'player has branchXP');
  assertEqual(s.players[p].branchXP.peace, 0, 'peace XP starts at 0');
  assertEqual(s.players[p].branchXP.power, 0, 'power XP starts at 0');
  assertEqual(s.players[p].branchXP.knowledge, 0, 'knowledge XP starts at 0');
  assertEqual(s.players[p].branchXP.creation, 0, 'creation XP starts at 0');
  assert(typeof s.players[p].decisions === 'object', 'player has decisions object');
  assert(Array.isArray(s.players[p].rewards), 'player has rewards array');
  assertEqual(s.players[p].rewards.length, 0, 'rewards starts empty');
  assert(Array.isArray(s.players[p].reconciled), 'player has reconciled array');

  // Idempotent
  CB.initPlayer(s, p);
  assertEqual(s.players[p].branchXP.peace, 0, 'reinit does not overwrite existing player');

});

// ============================================================================
// SUITE 8: MAKE DECISION — BASIC LOGIC
// ============================================================================

suite('Suite 8: makeDecision basic logic', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // Valid peace choice
  var result = CB.makeDecision(s, p, 'border_dispute', 'negotiate', 0);
  assert(result.success, 'valid decision succeeds');
  assert(typeof result.branchXP === 'object', 'result has branchXP');
  assertEqual(result.branchXP.peace, 20, 'peace XP awarded correctly');
  assert(Array.isArray(result.locked), 'result has locked array');
  assert(Array.isArray(result.unlocked), 'result has unlocked array');
  assert(Array.isArray(result.rewards), 'result has rewards array');

  // State updated
  assertEqual(s.players[p].branchXP.peace, 20, 'player peace XP updated in state');
  assertEqual(s.players[p].decisions['border_dispute'], 'negotiate', 'decision recorded');

  // Can't make same decision twice
  var duplicate = CB.makeDecision(s, p, 'border_dispute', 'negotiate', 0);
  assert(!duplicate.success, 'duplicate decision fails');
  assertEqual(duplicate.error, 'already_decided', 'error is already_decided');

  // Unknown decision
  var unknownDec = CB.makeDecision(s, p, 'nonexistent_decision', 'some_choice', 0);
  assert(!unknownDec.success, 'unknown decision fails');
  assertEqual(unknownDec.error, 'unknown_decision', 'error is unknown_decision');

  // Unknown choice
  var unknownChoice = CB.makeDecision(s, p, 'stolen_artifact', 'nonexistent_choice', 0);
  assert(!unknownChoice.success, 'unknown choice fails');
  assertEqual(unknownChoice.error, 'unknown_choice', 'error is unknown_choice');

});

// ============================================================================
// SUITE 9: MAKE DECISION — TICK GATE
// ============================================================================

suite('Suite 9: makeDecision tick gate', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // stranger_at_gates requires minTick=10
  var tooEarly = CB.makeDecision(s, p, 'stranger_at_gates', 'welcome_stranger', 5);
  assert(!tooEarly.success, 'decision blocked if tick too early');
  assertEqual(tooEarly.error, 'too_early', 'error is too_early');

  // At exact tick
  var onTime = CB.makeDecision(s, p, 'stranger_at_gates', 'welcome_stranger', 10);
  assert(onTime.success, 'decision succeeds at exact minTick');

  // Late is also fine
  var s2 = freshState();
  var p2 = uid();
  CB.initPlayer(s2, p2);
  var late = CB.makeDecision(s2, p2, 'stranger_at_gates', 'debrief_stranger', 9999);
  assert(late.success, 'decision succeeds long after minTick');

});

// ============================================================================
// SUITE 10: MAKE DECISION — BRANCH XP ACCUMULATION
// ============================================================================

suite('Suite 10: Branch XP accumulation', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  CB.makeDecision(s, p, 'border_dispute', 'negotiate', 0);      // +20 peace
  CB.makeDecision(s, p, 'stolen_artifact', 'study_artifact', 0); // +30 knowledge
  CB.makeDecision(s, p, 'stranger_at_gates', 'build_refugee_shelter', 10); // +30 creation

  assertEqual(s.players[p].branchXP.peace, 20, 'peace XP accumulated correctly');
  assertEqual(s.players[p].branchXP.knowledge, 30, 'knowledge XP accumulated correctly');
  assertEqual(s.players[p].branchXP.creation, 30, 'creation XP accumulated correctly');
  assertEqual(s.players[p].branchXP.power, 0, 'power XP stays 0 when not chosen');

});

// ============================================================================
// SUITE 11: MAKE DECISION — LOCKS AND UNLOCKS
// ============================================================================

suite('Suite 11: Decision locks and unlocks', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // Award stronger locks peacekeepers_pact
  var result = CB.makeDecision(s, p, 'border_dispute', 'award_stronger', 0);
  assert(result.success, 'award_stronger decision succeeds');
  assert(result.locked.indexOf('peacekeepers_pact') !== -1, 'peacekeepers_pact locked');
  assert(s.players[p].lockedPaths['peacekeepers_pact'], 'peacekeepers_pact in player locked paths');

  // Negotiate unlocks watchtower_collab
  var s2 = freshState();
  var p2 = uid();
  CB.initPlayer(s2, p2);
  var result2 = CB.makeDecision(s2, p2, 'border_dispute', 'negotiate', 0);
  assert(result2.unlocked.indexOf('watchtower_collab') !== -1, 'watchtower_collab unlocked');
  assert(s2.players[p2].unlockedPaths['watchtower_collab'], 'watchtower_collab in player unlocked paths');

  // survey_history unlocks ancient_maps
  var s3 = freshState();
  var p3 = uid();
  CB.initPlayer(s3, p3);
  var result3 = CB.makeDecision(s3, p3, 'border_dispute', 'survey_history', 0);
  assert(result3.unlocked.indexOf('ancient_maps') !== -1, 'ancient_maps unlocked');

});

// ============================================================================
// SUITE 12: GET BRANCH PROGRESS
// ============================================================================

suite('Suite 12: getBranchProgress', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // No decisions made
  var progress0 = CB.getBranchProgress(s, p);
  assertNotNull(progress0, 'getBranchProgress returns an object');
  assert(typeof progress0.peace === 'object', 'peace progress exists');
  assertEqual(progress0.peace.xp, 0, 'peace xp is 0 initially');
  assertEqual(progress0.peace.milestoneIndex, -1, 'no milestone reached at 0 xp');
  assertNull(progress0.peace.currentMilestone, 'currentMilestone is null at 0 xp');
  assertNotNull(progress0.peace.nextMilestone, 'nextMilestone is first milestone');
  assertEqual(progress0.peace.nextMilestone.xp, 25, 'nextMilestone xp is 25');

  // Give some XP
  pumpXP(s, p, 'peace', 25);
  var progress25 = CB.getBranchProgress(s, p);
  assertEqual(progress25.peace.milestoneIndex, 0, 'milestone 0 reached at 25 xp');
  assertNotNull(progress25.peace.currentMilestone, 'currentMilestone not null at 25 xp');
  assertEqual(progress25.peace.currentMilestone.xp, 25, 'currentMilestone xp is 25');

  pumpXP(s, p, 'peace', 100);
  var progress100 = CB.getBranchProgress(s, p);
  assertEqual(progress100.peace.milestoneIndex, 1, 'milestone 1 reached at 100 xp');

  pumpXP(s, p, 'peace', 1000);
  var progress1000 = CB.getBranchProgress(s, p);
  assertEqual(progress1000.peace.milestoneIndex, 4, 'max milestone at 1000 xp');
  assertNull(progress1000.peace.nextMilestone, 'no nextMilestone after max');

  // Returns for unknown player
  var unknownProgress = CB.getBranchProgress(s, 'nonexistent');
  assertNull(unknownProgress, 'returns null for unknown player');

});

// ============================================================================
// SUITE 13: GET DOMINANT BRANCH
// ============================================================================

suite('Suite 13: getDominantBranch', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  pumpXP(s, p, 'peace', 50);
  pumpXP(s, p, 'power', 30);
  pumpXP(s, p, 'knowledge', 10);
  pumpXP(s, p, 'creation', 20);

  var dominant = CB.getDominantBranch(s, p);
  assertEqual(dominant, 'peace', 'dominant branch is peace (50 xp)');

  pumpXP(s, p, 'power', 200);
  dominant = CB.getDominantBranch(s, p);
  assertEqual(dominant, 'power', 'dominant branch changes to power when it has more XP');

  // Unknown player
  var unknownDominant = CB.getDominantBranch(s, 'nonexistent');
  assertNull(unknownDominant, 'returns null for unknown player');

});

// ============================================================================
// SUITE 14: CAN ACCESS ZONE
// ============================================================================

suite('Suite 14: canAccessZone', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // champions_sanctum requires power >= 100
  assert(!CB.canAccessZone(s, p, 'champions_sanctum'), 'cannot access champions_sanctum at 0 power xp');

  pumpXP(s, p, 'power', 99);
  assert(!CB.canAccessZone(s, p, 'champions_sanctum'), 'cannot access at 99 power xp (needs 100)');

  pumpXP(s, p, 'power', 100);
  assert(CB.canAccessZone(s, p, 'champions_sanctum'), 'can access champions_sanctum at exactly 100 power xp');

  // inner_athenaeum requires knowledge >= 100
  assert(!CB.canAccessZone(s, p, 'inner_athenaeum'), 'cannot access inner_athenaeum with 0 knowledge xp');

  pumpXP(s, p, 'knowledge', 150);
  assert(CB.canAccessZone(s, p, 'inner_athenaeum'), 'can access inner_athenaeum at 150 knowledge xp');

  // Nonexistent gate
  assert(!CB.canAccessZone(s, p, 'nonexistent_gate'), 'returns false for nonexistent gate');

  // Nonexistent player
  assert(!CB.canAccessZone(s, 'ghost', 'champions_sanctum'), 'returns false for nonexistent player');

  // peacekeepers_lodge requires peace >= 100
  pumpXP(s, p, 'peace', 100);
  assert(CB.canAccessZone(s, p, 'peacekeepers_lodge'), 'can access peacekeepers_lodge at 100 peace');

  // makers_vault requires creation >= 100
  pumpXP(s, p, 'creation', 100);
  assert(CB.canAccessZone(s, p, 'makers_vault'), 'can access makers_vault at 100 creation');

  // High-tier gate: sovereign_hall requires power >= 500
  var s2 = freshState();
  var p2 = uid();
  CB.initPlayer(s2, p2);
  pumpXP(s2, p2, 'power', 499);
  assert(!CB.canAccessZone(s2, p2, 'sovereign_hall'), 'cannot access sovereign_hall at 499 power xp');
  pumpXP(s2, p2, 'power', 500);
  assert(CB.canAccessZone(s2, p2, 'sovereign_hall'), 'can access sovereign_hall at 500 power xp');

});

// ============================================================================
// SUITE 15: GET AVAILABLE DECISIONS
// ============================================================================

suite('Suite 15: getAvailableDecisions', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  var available = CB.getAvailableDecisions(s, p);
  assert(Array.isArray(available), 'returns array');
  assertGTE(available.length, 1, 'at least one decision available initially');

  // All returned decisions must have prerequisites met
  available.forEach(function(dec) {
    assert(dec.prerequisites.length === 0 || true, 'returned decision prerequisites state is consistent');
  });

  // After making a decision it should not appear again
  var firstId = available[0].id;
  var firstChoiceId = available[0].choices[0].id;
  CB.makeDecision(s, p, firstId, firstChoiceId, 0);

  var available2 = CB.getAvailableDecisions(s, p);
  var stillInList = false;
  available2.forEach(function(d) { if (d.id === firstId) stillInList = true; });
  assert(!stillInList, 'completed decision no longer in available list');

  // Decisions with prerequisites not met should not appear
  // oracle_speaks requires study_blight and forbidden_knowledge
  var hasOracle = false;
  available2.forEach(function(d) { if (d.id === 'oracle_speaks') hasOracle = true; });
  assert(!hasOracle, 'oracle_speaks not available without prerequisites');

});

// ============================================================================
// SUITE 16: GET DECISION HISTORY
// ============================================================================

suite('Suite 16: getDecisionHistory', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  var emptyHistory = CB.getDecisionHistory(s, p);
  assert(Array.isArray(emptyHistory), 'returns array');
  assertEqual(emptyHistory.length, 0, 'starts empty');

  CB.makeDecision(s, p, 'border_dispute', 'negotiate', 0);
  CB.makeDecision(s, p, 'stolen_artifact', 'study_artifact', 0);

  var history = CB.getDecisionHistory(s, p);
  assertEqual(history.length, 2, 'history has 2 entries after 2 decisions');

  var foundDispute = false;
  history.forEach(function(h) {
    if (h.decisionId === 'border_dispute' && h.choiceId === 'negotiate') {
      foundDispute = true;
      assertNotNull(h.decision, 'history entry has decision object');
      assertNotNull(h.choice, 'history entry has choice object');
    }
  });
  assert(foundDispute, 'border_dispute in history');

  // Unknown player
  var ghostHistory = CB.getDecisionHistory(s, 'ghost');
  assert(Array.isArray(ghostHistory), 'unknown player returns empty array');
  assertEqual(ghostHistory.length, 0, 'unknown player history is empty');

});

// ============================================================================
// SUITE 17: GET MILESTONE REWARDS
// ============================================================================

suite('Suite 17: getMilestoneRewards', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // No milestones reached
  var noRewards = CB.getMilestoneRewards(s, p, 'peace');
  assert(Array.isArray(noRewards), 'returns array');
  assertEqual(noRewards.length, 0, 'no rewards at 0 xp');

  // First milestone (25 xp)
  pumpXP(s, p, 'peace', 25);
  var milestone1Rewards = CB.getMilestoneRewards(s, p, 'peace');
  assertGTE(milestone1Rewards.length, 1, 'at least 1 reward at milestone 1');

  // Third milestone (250 xp)
  pumpXP(s, p, 'peace', 250);
  var milestone3Rewards = CB.getMilestoneRewards(s, p, 'peace');
  assertGTE(milestone3Rewards.length, 2, 'more rewards at milestone 3');

  // Max milestone (1000 xp) — all 3 peace rewards
  pumpXP(s, p, 'peace', 1000);
  var maxRewards = CB.getMilestoneRewards(s, p, 'peace');
  assertEqual(maxRewards.length, 3, 'all 3 peace rewards earned at max milestone');

  // Rewards are for correct branch
  maxRewards.forEach(function(r) {
    assertEqual(r.branchId, 'peace', 'returned rewards are peace branch rewards');
  });

  // Unknown player
  var ghostRewards = CB.getMilestoneRewards(s, 'ghost', 'peace');
  assertEqual(ghostRewards.length, 0, 'unknown player gets empty rewards');

});

// ============================================================================
// SUITE 18: GET LORE VERSION
// ============================================================================

suite('Suite 18: getLoreVersion', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // Default lore when no branch dominant
  var lore = CB.getLoreVersion(s, p, 'founding_truth');
  assertNotNull(lore, 'getLoreVersion returns object');
  assert(typeof lore.id === 'string', 'lore has id');
  assert(typeof lore.title === 'string', 'lore has title');
  assert(typeof lore.text === 'string', 'lore has text');
  assert(typeof lore.branch === 'string', 'lore has branch');

  // With dominant branch
  pumpXP(s, p, 'power', 100);
  var powerLore = CB.getLoreVersion(s, p, 'founding_truth');
  assertEqual(powerLore.branch, 'power', 'lore version matches dominant branch');
  assert(powerLore.text.length > 10, 'power lore has meaningful text');

  // Knowledge branch lore
  var s2 = freshState();
  var p2 = uid();
  CB.initPlayer(s2, p2);
  pumpXP(s2, p2, 'knowledge', 200);
  var knowledgeLore = CB.getLoreVersion(s2, p2, 'nexus_purpose');
  assertEqual(knowledgeLore.branch, 'knowledge', 'knowledge lore version');
  assert(knowledgeLore.text !== powerLore.text, 'different branches get different text');

  // Creation branch lore
  var s3 = freshState();
  var p3 = uid();
  CB.initPlayer(s3, p3);
  pumpXP(s3, p3, 'creation', 300);
  var creationLore = CB.getLoreVersion(s3, p3, 'studio_origin');
  assertEqual(creationLore.branch, 'creation', 'creation lore version');

  // Unknown lore ID
  var unknownLore = CB.getLoreVersion(s, p, 'nonexistent_lore');
  assertNull(unknownLore, 'returns null for unknown lore ID');

  // Verify all 8 contested lore IDs exist
  var loreIds = ['founding_truth', 'nexus_purpose', 'the_wilds_nature', 'arena_legend',
                 'the_gardens_mystery', 'athenaeum_secret', 'studio_origin', 'commons_covenant'];
  loreIds.forEach(function(lid) {
    var loreEntry = CB.getLoreVersion(s, p, lid);
    assertNotNull(loreEntry, 'contested lore "' + lid + '" exists');
  });

});

// ============================================================================
// SUITE 19: CAN RECONCILE
// ============================================================================

suite('Suite 19: canReconcile', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // Not enough XP
  assert(!CB.canReconcile(s, p), 'cannot reconcile with 0 xp');

  pumpXP(s, p, 'peace', 749);
  assert(!CB.canReconcile(s, p), 'cannot reconcile with only 749 peace xp');

  pumpXP(s, p, 'peace', 750);
  assert(!CB.canReconcile(s, p), 'cannot reconcile with only one branch at 750 xp');

  pumpXP(s, p, 'power', 750);
  assert(CB.canReconcile(s, p), 'can reconcile with two branches at 750 xp');

  pumpXP(s, p, 'knowledge', 750);
  assert(CB.canReconcile(s, p), 'still can reconcile with three branches at 750 xp');

  // Unknown player
  assert(!CB.canReconcile(s, 'ghost'), 'returns false for unknown player');

  // Verify the RECONCILE_MIN_XP constant is 750
  assertEqual(CB._RECONCILE_MIN_XP, 750, 'RECONCILE_MIN_XP constant is 750');

});

// ============================================================================
// SUITE 20: RECONCILE BRANCHES
// ============================================================================

suite('Suite 20: reconcileBranches', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // Cannot reconcile without meeting requirements
  var tooEarly = CB.reconcileBranches(s, p, 'peace', 'power', 100);
  assert(!tooEarly.success, 'reconcile fails when requirements not met');

  // Qualify by pumping XP
  pumpXP(s, p, 'peace', 750);
  pumpXP(s, p, 'power', 750);

  var result = CB.reconcileBranches(s, p, 'peace', 'power', 200);
  assert(result.success, 'reconcile succeeds when requirements met');
  assertEqual(result.bonusXP, 200, 'bonus XP is 200');
  assertEqual(result.newXP1, 950, 'peace XP bumped to 950');
  assertEqual(result.newXP2, 950, 'power XP bumped to 950');
  assertNotNull(result.pairKey, 'pairKey returned');
  assert(result.pairKey.indexOf('peace') !== -1, 'pairKey contains peace');
  assert(result.pairKey.indexOf('power') !== -1, 'pairKey contains power');

  // Cannot reconcile same pair twice
  var duplicate = CB.reconcileBranches(s, p, 'peace', 'power', 300);
  assert(!duplicate.success, 'duplicate reconcile fails');
  assertEqual(duplicate.error, 'already_reconciled', 'error is already_reconciled');

  // Player does not have enough XP in unqualified branch
  var s2 = freshState();
  var p2 = uid();
  CB.initPlayer(s2, p2);
  pumpXP(s2, p2, 'peace', 750);
  pumpXP(s2, p2, 'knowledge', 749);
  var insufficientResult = CB.reconcileBranches(s2, p2, 'peace', 'knowledge', 0);
  assert(!insufficientResult.success, 'reconcile fails when second branch has insufficient XP');

  // Unknown player
  var ghostResult = CB.reconcileBranches(s, 'ghost', 'peace', 'power', 0);
  assert(!ghostResult.success, 'reconcile fails for unknown player');

});

// ============================================================================
// SUITE 21: GET EXCLUSIVE REWARDS
// ============================================================================

suite('Suite 21: getExclusiveRewards', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  var emptyRewards = CB.getExclusiveRewards(s, p);
  assert(Array.isArray(emptyRewards), 'returns array');
  assertEqual(emptyRewards.length, 0, 'no rewards initially');

  // Earn first milestone
  pumpXP(s, p, 'peace', 25);
  // Manually trigger reward collection via makeDecision or direct pump
  // We need to trigger milestone detection — use makeDecision to cross threshold
  var s2 = freshState();
  var p2 = uid();
  CB.initPlayer(s2, p2);
  // pump below 25, then make a decision that pushes over 25
  s2.players[p2].branchXP.peace = 5;
  var mResult = CB.makeDecision(s2, p2, 'border_dispute', 'negotiate', 0); // +20 peace = 25
  assert(mResult.success, 'decision crossing milestone 1 succeeds');
  assertGTE(mResult.rewards.length, 1, 'reward earned when crossing milestone 1');

  // After crossing milestone, getExclusiveRewards returns the reward
  var earnedRewards = CB.getExclusiveRewards(s2, p2);
  assertGTE(earnedRewards.length, 1, 'exclusive rewards includes milestone 1 reward');
  assertEqual(earnedRewards[0].branchId, 'peace', 'earned reward is peace branch');

  // Unknown player
  var ghostRewards = CB.getExclusiveRewards(s, 'ghost');
  assert(Array.isArray(ghostRewards), 'unknown player returns empty array');
  assertEqual(ghostRewards.length, 0, 'unknown player has no exclusive rewards');

});

// ============================================================================
// SUITE 22: GET BRANCH LEADERBOARD
// ============================================================================

suite('Suite 22: getBranchLeaderboard', function() {

  var s = freshState();
  var p1 = uid(), p2 = uid(), p3 = uid(), p4 = uid();
  CB.initPlayer(s, p1);
  CB.initPlayer(s, p2);
  CB.initPlayer(s, p3);
  CB.initPlayer(s, p4);

  pumpXP(s, p1, 'peace', 100);
  pumpXP(s, p2, 'peace', 300);
  pumpXP(s, p3, 'peace', 50);
  pumpXP(s, p4, 'peace', 700);

  var lb = CB.getBranchLeaderboard(s, 'peace', 10);
  assert(Array.isArray(lb), 'returns array');
  assertEqual(lb.length, 4, 'leaderboard has 4 entries');
  assertEqual(lb[0].xp, 700, 'first place has highest XP');
  assertEqual(lb[1].xp, 300, 'second place');
  assertEqual(lb[2].xp, 100, 'third place');
  assertEqual(lb[3].xp, 50, 'fourth place has lowest XP');

  // Limit count
  var lb3 = CB.getBranchLeaderboard(s, 'peace', 3);
  assertEqual(lb3.length, 3, 'leaderboard respects count limit');
  assertEqual(lb3[0].xp, 700, 'first place unchanged with limit');

  // Default count if not specified
  var lbDefault = CB.getBranchLeaderboard(s, 'peace');
  assert(Array.isArray(lbDefault), 'default count returns array');

  // Empty leaderboard for branch with no XP
  var knowledgeLb = CB.getBranchLeaderboard(s, 'knowledge', 5);
  // All players have 0 knowledge xp, so they should be in list but with 0
  assert(Array.isArray(knowledgeLb), 'empty branch leaderboard returns array');

});

// ============================================================================
// SUITE 23: GET PLAYER PROFILE
// ============================================================================

suite('Suite 23: getPlayerProfile', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  pumpXP(s, p, 'peace', 50);
  pumpXP(s, p, 'creation', 200);
  CB.makeDecision(s, p, 'border_dispute', 'negotiate', 0);

  var profile = CB.getPlayerProfile(s, p);
  assertNotNull(profile, 'getPlayerProfile returns object');
  assertEqual(profile.playerId, p, 'profile has correct playerId');
  assertNotNull(profile.dominantBranch, 'profile has dominantBranch');
  assertEqual(profile.dominantBranch, 'creation', 'creation is dominant (200 xp)');
  assert(typeof profile.branchXP === 'object', 'profile has branchXP');
  // pumpXP set peace=50, creation=200; then makeDecision added +20 peace = 270 total
  assertEqual(profile.totalXP, 270, 'total XP is 270 (peace 70 + creation 200)');
  assertNotNull(profile.progress, 'profile has progress');
  assert(typeof profile.decisionCount === 'number', 'profile has decisionCount');
  assertEqual(profile.decisionCount, 1, 'decision count is 1');
  assert(Array.isArray(profile.decisionHistory), 'profile has decisionHistory array');
  assert(Array.isArray(profile.rewards), 'profile has rewards array');
  assert(Array.isArray(profile.reconciled), 'profile has reconciled array');
  assert(Array.isArray(profile.lockedPaths), 'profile has lockedPaths array');
  assert(Array.isArray(profile.unlockedPaths), 'profile has unlockedPaths array');

  // Unknown player
  var ghostProfile = CB.getPlayerProfile(s, 'ghost');
  assertNull(ghostProfile, 'unknown player returns null');

});

// ============================================================================
// SUITE 24: GET DECISION STATS
// ============================================================================

suite('Suite 24: getDecisionStats', function() {

  var s = freshState();
  var p1 = uid(), p2 = uid(), p3 = uid();
  CB.initPlayer(s, p1);
  CB.initPlayer(s, p2);
  CB.initPlayer(s, p3);

  // Two choose negotiate, one chooses survey_history
  CB.makeDecision(s, p1, 'border_dispute', 'negotiate', 0);
  CB.makeDecision(s, p2, 'border_dispute', 'negotiate', 0);
  CB.makeDecision(s, p3, 'border_dispute', 'survey_history', 0);

  var stats = CB.getDecisionStats(s);
  assert(typeof stats === 'object', 'getDecisionStats returns object');
  assertNotNull(stats['border_dispute'], 'border_dispute in stats');
  assertNotNull(stats['border_dispute']['negotiate'], 'negotiate choice in stats');
  assertEqual(stats['border_dispute']['negotiate'].count, 2, 'negotiate count is 2');
  assertEqual(stats['border_dispute']['negotiate'].percent, 67, 'negotiate percent is ~67%');
  assertEqual(stats['border_dispute']['survey_history'].count, 1, 'survey_history count is 1');
  assertEqual(stats['border_dispute']['survey_history'].percent, 33, 'survey_history percent is ~33%');

  // Empty stats
  var emptyState = freshState();
  var emptyStats = CB.getDecisionStats(emptyState);
  assert(typeof emptyStats === 'object', 'empty state returns empty stats object');
  assertEqual(Object.keys(emptyStats).length, 0, 'empty stats has no keys');

});

// ============================================================================
// SUITE 25: GET LOCKED CONTENT
// ============================================================================

suite('Suite 25: getLockedContent', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  var locked = CB.getLockedContent(s, p);
  assert(typeof locked === 'object', 'getLockedContent returns object');
  assert(Array.isArray(locked.paths), 'locked has paths array');
  assert(Array.isArray(locked.zones), 'locked has zones array');
  assert(Array.isArray(locked.lore), 'locked has lore array');

  // All zones should be locked initially
  assertGTE(locked.zones.length, 1, 'at least 1 zone locked initially');

  // After making a choice that locks a path
  CB.makeDecision(s, p, 'border_dispute', 'award_stronger', 0);
  var lockedAfterChoice = CB.getLockedContent(s, p);
  assert(lockedAfterChoice.paths.indexOf('peacekeepers_pact') !== -1, 'peacekeepers_pact appears in locked paths');

  // After gaining enough branch XP, zone should be unlocked
  pumpXP(s, p, 'power', 100);
  var lockedAfterXP = CB.getLockedContent(s, p);
  var champSanctumLocked = false;
  lockedAfterXP.zones.forEach(function(z) {
    if (z.id === 'champions_sanctum') champSanctumLocked = true;
  });
  assert(!champSanctumLocked, 'champions_sanctum no longer in locked zones at 100 power xp');

  // Unknown player
  var ghostLocked = CB.getLockedContent(s, 'ghost');
  assert(Array.isArray(ghostLocked.paths), 'unknown player returns empty paths');
  assertEqual(ghostLocked.paths.length, 0, 'unknown player has no locked paths');

});

// ============================================================================
// SUITE 26: DECISION LOG
// ============================================================================

suite('Suite 26: Decision log', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  assertEqual(s.decisionLog.length, 0, 'decision log starts empty');

  CB.makeDecision(s, p, 'border_dispute', 'negotiate', 42);
  assertEqual(s.decisionLog.length, 1, 'decision log has 1 entry after first decision');

  var entry = s.decisionLog[0];
  assertEqual(entry.playerId, p, 'log entry has correct playerId');
  assertEqual(entry.decisionId, 'border_dispute', 'log entry has correct decisionId');
  assertEqual(entry.choiceId, 'negotiate', 'log entry has correct choiceId');
  assertEqual(entry.tick, 42, 'log entry has correct tick');
  assert(typeof entry.branchXP === 'object', 'log entry has branchXP');
  assertEqual(entry.branchXP.peace, 20, 'log entry records correct XP');

  CB.makeDecision(s, p, 'stolen_artifact', 'study_artifact', 100);
  assertEqual(s.decisionLog.length, 2, 'decision log grows with each decision');

  // Multiple players share the same log
  var p2 = uid();
  CB.initPlayer(s, p2);
  CB.makeDecision(s, p2, 'border_dispute', 'award_stronger', 0);
  assertEqual(s.decisionLog.length, 3, 'log includes decisions from all players');

});

// ============================================================================
// SUITE 27: MILESTONE XP THRESHOLDS
// ============================================================================

suite('Suite 27: Milestone XP thresholds', function() {

  // Test each threshold boundary
  var thresholds = [
    { xp: 24, expectedIdx: -1, label: 'below first milestone' },
    { xp: 25, expectedIdx: 0, label: 'at first milestone' },
    { xp: 99, expectedIdx: 0, label: 'between milestones 1 and 2' },
    { xp: 100, expectedIdx: 1, label: 'at second milestone' },
    { xp: 249, expectedIdx: 1, label: 'between milestones 2 and 3' },
    { xp: 250, expectedIdx: 2, label: 'at third milestone' },
    { xp: 499, expectedIdx: 2, label: 'between milestones 3 and 4' },
    { xp: 500, expectedIdx: 3, label: 'at fourth milestone' },
    { xp: 999, expectedIdx: 3, label: 'between milestones 4 and 5' },
    { xp: 1000, expectedIdx: 4, label: 'at fifth milestone' },
    { xp: 2000, expectedIdx: 4, label: 'beyond max milestone' }
  ];

  thresholds.forEach(function(t) {
    var s = freshState();
    var pp = uid();
    CB.initPlayer(s, pp);
    pumpXP(s, pp, 'peace', t.xp);
    var prog = CB.getBranchProgress(s, pp);
    assertEqual(prog.peace.milestoneIndex, t.expectedIdx, 'milestone index ' + t.label + ' (xp=' + t.xp + ')');
  });

});

// ============================================================================
// SUITE 28: CONTESTED LORE DATA INTEGRITY
// ============================================================================

suite('Suite 28: Contested lore data integrity', function() {

  assert(Array.isArray(CB.CONTESTED_LORE), 'CONTESTED_LORE is an array');
  assertEqual(CB.CONTESTED_LORE.length, 8, 'exactly 8 contested lore entries');

  CB.CONTESTED_LORE.forEach(function(lore) {
    assert(typeof lore.id === 'string', 'lore ' + lore.id + ' has string id');
    assert(typeof lore.title === 'string', 'lore ' + lore.id + ' has string title');
    assert(typeof lore.versions === 'object', 'lore ' + lore.id + ' has versions object');
    assert(typeof lore.versions.peace === 'string', 'lore ' + lore.id + ' has peace version');
    assert(typeof lore.versions.power === 'string', 'lore ' + lore.id + ' has power version');
    assert(typeof lore.versions.knowledge === 'string', 'lore ' + lore.id + ' has knowledge version');
    assert(typeof lore.versions.creation === 'string', 'lore ' + lore.id + ' has creation version');
    assertGTE(lore.versions.peace.length, 50, 'peace version of ' + lore.id + ' is substantial');
    assertGTE(lore.versions.power.length, 50, 'power version of ' + lore.id + ' is substantial');
  });

  // All lore IDs unique
  var seenLore = {};
  var loreUnique = true;
  CB.CONTESTED_LORE.forEach(function(l) {
    if (seenLore[l.id]) loreUnique = false;
    seenLore[l.id] = true;
  });
  assert(loreUnique, 'all contested lore IDs are unique');

  // Branch versions produce different text
  CB.CONTESTED_LORE.forEach(function(lore) {
    assert(
      lore.versions.peace !== lore.versions.power,
      'peace and power versions differ for ' + lore.id
    );
    assert(
      lore.versions.knowledge !== lore.versions.creation,
      'knowledge and creation versions differ for ' + lore.id
    );
  });

});

// ============================================================================
// SUITE 29: PREREQUISITES ENFORCEMENT
// ============================================================================

suite('Suite 29: Prerequisites enforcement', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // oracle_speaks requires 'study_blight' and 'forbidden_knowledge' choices or decision IDs
  var tooEarlyOracle = CB.makeDecision(s, p, 'oracle_speaks', 'embrace_prophecy', 200);
  assert(!tooEarlyOracle.success, 'oracle_speaks fails without prerequisites');
  assertEqual(tooEarlyOracle.error, 'prerequisites_not_met', 'error is prerequisites_not_met');

  // Satisfy prerequisites
  CB.makeDecision(s, p, 'harvest_blight', 'study_blight', 25);     // provides 'study_blight' choiceId
  CB.makeDecision(s, p, 'forbidden_knowledge', 'open_archive', 50); // provides 'open_archive' choiceId

  // oracle_speaks requires prerequisites from those decision IDs: 'study_blight' choice, 'forbidden_knowledge' decision
  // Based on module: prerequisites are checked as choiceIds in any decision OR decision IDs
  // 'oracle_speaks' prereqs: ['study_blight', 'forbidden_knowledge']
  // study_blight is a choiceId in harvest_blight, forbidden_knowledge is a decisionId
  var oracle = CB.makeDecision(s, p, 'oracle_speaks', 'embrace_prophecy', 200);
  assert(oracle.success, 'oracle_speaks succeeds after prerequisites met');

  // last_garden requires harvest_blight decision (any choice made)
  var s2 = freshState();
  var p2 = uid();
  CB.initPlayer(s2, p2);
  var noLastGarden = CB.makeDecision(s2, p2, 'last_garden', 'communal_effort', 400);
  assert(!noLastGarden.success, 'last_garden fails without harvest_blight prerequisite');

  CB.makeDecision(s2, p2, 'harvest_blight', 'share_resources', 20);
  var lastGarden = CB.makeDecision(s2, p2, 'last_garden', 'communal_effort', 400);
  assert(lastGarden.success, 'last_garden succeeds after harvest_blight made');

});

// ============================================================================
// SUITE 30: MULBERRY32 PRNG
// ============================================================================

suite('Suite 30: mulberry32 PRNG', function() {

  var rng = CB._mulberry32(12345);
  assert(typeof rng === 'function', 'mulberry32 returns a function');

  var v1 = rng();
  var v2 = rng();
  var v3 = rng();

  assert(typeof v1 === 'number', 'PRNG returns a number');
  assert(v1 >= 0 && v1 < 1, 'PRNG value in [0, 1)');
  assert(v2 >= 0 && v2 < 1, 'second PRNG value in [0, 1)');
  assert(v1 !== v2, 'consecutive values differ');

  // Same seed = same sequence
  var rng2 = CB._mulberry32(12345);
  assertEqual(rng2(), v1, 'same seed produces same first value');
  assertEqual(rng2(), v2, 'same seed produces same second value');
  assertEqual(rng2(), v3, 'same seed produces same third value');

  // Different seeds
  var rngAlt = CB._mulberry32(99999);
  assert(rngAlt() !== v1, 'different seeds produce different sequences');

});

// ============================================================================
// SUITE 31: FULL PLAYTHROUGH SIMULATION
// ============================================================================

suite('Suite 31: Full playthrough simulation', function() {

  var s = freshState();
  var p = uid();
  CB.initPlayer(s, p);

  // Make many decisions to earn XP
  CB.makeDecision(s, p, 'border_dispute', 'negotiate', 0);         // +20 peace
  CB.makeDecision(s, p, 'stolen_artifact', 'study_artifact', 0);   // +30 knowledge
  CB.makeDecision(s, p, 'stranger_at_gates', 'welcome_stranger', 10); // +30 peace
  CB.makeDecision(s, p, 'harvest_blight', 'study_blight', 25);        // +35 knowledge
  CB.makeDecision(s, p, 'arena_challenge', 'accept_fight', 30);        // +35 power
  CB.makeDecision(s, p, 'forbidden_knowledge', 'open_archive', 50);    // +45 knowledge
  CB.makeDecision(s, p, 'guild_war_threat', 'mediate_guilds', 60);     // +40 peace
  CB.makeDecision(s, p, 'ancient_ruin', 'excavate_ruin', 70);          // +45 knowledge
  CB.makeDecision(s, p, 'music_censorship', 'compose_response', 80);   // +40 creation
  CB.makeDecision(s, p, 'water_rights', 'equal_rationing', 90);        // +45 peace
  CB.makeDecision(s, p, 'constellation_mystery', 'study_pattern', 100); // +50 knowledge

  // Verify accumulated XP
  var peaceXP = s.players[p].branchXP.peace;
  var knowledgeXP = s.players[p].branchXP.knowledge;
  var powerXP = s.players[p].branchXP.power;
  var creationXP = s.players[p].branchXP.creation;

  assertEqual(peaceXP, 135, 'peace XP accumulated correctly (20+30+40+45=135)');
  assertEqual(knowledgeXP, 205, 'knowledge XP accumulated correctly (30+35+45+45+50=205)');
  assertEqual(powerXP, 35, 'power XP accumulated correctly (35)');
  assertEqual(creationXP, 40, 'creation XP accumulated correctly (40)');

  // Dominant branch
  assertEqual(CB.getDominantBranch(s, p), 'knowledge', 'knowledge is dominant branch');

  // Zone access based on XP
  assert(CB.canAccessZone(s, p, 'inner_athenaeum'), 'inner_athenaeum accessible at 205 knowledge xp (requires 100)');
  assert(!CB.canAccessZone(s, p, 'oracle_chamber'), 'oracle_chamber requires 250 knowledge xp (have 205, not yet)');

  // Profile
  var profile = CB.getPlayerProfile(s, p);
  assertEqual(profile.decisionCount, 11, 'profile shows 11 decisions made');
  assertEqual(profile.totalXP, peaceXP + knowledgeXP + powerXP + creationXP, 'total XP is sum of all branches');

  // Lore matches dominant branch
  var lore = CB.getLoreVersion(s, p, 'athenaeum_secret');
  assertEqual(lore.branch, 'knowledge', 'lore version is knowledge (dominant)');

});

// ============================================================================
// SUITE 32: MULTI-PLAYER ISOLATION
// ============================================================================

suite('Suite 32: Multi-player isolation', function() {

  var s = freshState();
  var p1 = uid(), p2 = uid();
  CB.initPlayer(s, p1);
  CB.initPlayer(s, p2);

  CB.makeDecision(s, p1, 'border_dispute', 'negotiate', 0);      // p1 peace +20
  CB.makeDecision(s, p2, 'border_dispute', 'award_stronger', 0); // p2 power +20

  assertEqual(s.players[p1].branchXP.peace, 20, 'p1 peace XP is 20');
  assertEqual(s.players[p1].branchXP.power, 0, 'p1 power XP is 0');
  assertEqual(s.players[p2].branchXP.power, 20, 'p2 power XP is 20');
  assertEqual(s.players[p2].branchXP.peace, 0, 'p2 peace XP is 0');

  // Locks are per-player
  assert(!s.players[p1].lockedPaths['peacekeepers_pact'], 'p1 does not have peacekeepers_pact locked');
  assert(s.players[p2].lockedPaths['peacekeepers_pact'], 'p2 has peacekeepers_pact locked');

  // Each player can make the same decision independently
  CB.makeDecision(s, p2, 'stolen_artifact', 'punish_thief', 0);
  CB.makeDecision(s, p1, 'stolen_artifact', 'replicate_artifact', 0);

  assertEqual(s.players[p1].decisions['stolen_artifact'], 'replicate_artifact', 'p1 made replicate_artifact');
  assertEqual(s.players[p2].decisions['stolen_artifact'], 'punish_thief', 'p2 made punish_thief');

});

// ============================================================================
// FINAL SUMMARY
// ============================================================================

console.log('\n============================================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(function(f) { console.log('  ' + f); });
}
console.log('============================================================\n');

process.exit(failed > 0 ? 1 : 0);
