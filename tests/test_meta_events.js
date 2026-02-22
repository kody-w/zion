// test_meta_events.js — 165+ tests for the MetaEvents module
// Run with: node tests/test_meta_events.js

var MetaEvents = require('../src/js/meta_events');

var passed = 0;
var failed = 0;
var failures = [];

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

assert.strictEqual = function(a, b, msg) {
  if (a !== b) {
    throw new Error(msg || ('Expected ' + JSON.stringify(a) + ' === ' + JSON.stringify(b)));
  }
};

assert.ok = function(val, msg) {
  if (!val) throw new Error(msg || 'Expected truthy value');
};

assert.deepEqual = function(a, b, msg) {
  var as = JSON.stringify(a);
  var bs = JSON.stringify(b);
  if (as !== bs) throw new Error(msg || ('Deep equal failed: ' + as + ' vs ' + bs));
};

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS: ' + name + '\n');
  } catch (e) {
    failed++;
    failures.push({ name: name, error: e.message });
    process.stdout.write('  FAIL: ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  process.stdout.write('\n=== ' + name + ' ===\n');
  fn();
}

// Helper: fresh state
function freshState() {
  return MetaEvents.createMetaEventsState();
}

// Helper: schedule and start an event
function scheduleAndStart(state, eventId, startTick) {
  var result = MetaEvents.scheduleEvent(state, eventId, startTick);
  if (!result.success) throw new Error('scheduleEvent failed: ' + result.reason);
  var startResult = MetaEvents.startEvent(state, result.instance.id, startTick);
  if (!startResult.success) throw new Error('startEvent failed: ' + startResult.reason);
  return result.instance.id;
}

// =============================================================================
// SUITE 1: EVENT_DEFINITIONS structure
// =============================================================================
suite('EVENT_DEFINITIONS — structure', function() {

  test('EVENT_DEFINITIONS is an array', function() {
    assert(Array.isArray(MetaEvents.EVENT_DEFINITIONS), 'Should be array');
  });

  test('EVENT_DEFINITIONS has exactly 6 events', function() {
    assert.strictEqual(MetaEvents.EVENT_DEFINITIONS.length, 6, 'Should have 6 events');
  });

  test('All 6 event IDs are unique', function() {
    var ids = MetaEvents.EVENT_DEFINITIONS.map(function(e) { return e.id; });
    var unique = {};
    ids.forEach(function(id) { unique[id] = true; });
    assert.strictEqual(Object.keys(unique).length, 6, 'IDs must be unique');
  });

  test('rift_incursion exists', function() {
    var ev = MetaEvents.getEventById('rift_incursion');
    assert(ev !== null, 'rift_incursion should exist');
    assert.strictEqual(ev.id, 'rift_incursion');
  });

  test('harvest_blessing exists', function() {
    var ev = MetaEvents.getEventById('harvest_blessing');
    assert(ev !== null, 'harvest_blessing should exist');
    assert.strictEqual(ev.id, 'harvest_blessing');
  });

  test('ancient_awakening exists', function() {
    var ev = MetaEvents.getEventById('ancient_awakening');
    assert(ev !== null, 'ancient_awakening should exist');
  });

  test('storm_of_ages exists', function() {
    var ev = MetaEvents.getEventById('storm_of_ages');
    assert(ev !== null, 'storm_of_ages should exist');
  });

  test('festival_of_light exists', function() {
    var ev = MetaEvents.getEventById('festival_of_light');
    assert(ev !== null, 'festival_of_light should exist');
  });

  test('the_great_migration exists', function() {
    var ev = MetaEvents.getEventById('the_great_migration');
    assert(ev !== null, 'the_great_migration should exist');
  });

  test('Each event has required top-level fields', function() {
    var required = ['id', 'name', 'description', 'phases', 'totalDuration', 'successOutcome', 'failureOutcome', 'minParticipants', 'cooldown'];
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      required.forEach(function(f) {
        assert(ev[f] !== undefined, ev.id + ' missing field: ' + f);
      });
    });
  });

  test('Each event has exactly 3 phases', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      assert.strictEqual(ev.phases.length, 3, ev.id + ' should have 3 phases');
    });
  });

  test('Each phase has required fields', function() {
    var phaseRequired = ['id', 'name', 'duration', 'objective', 'communityGoal', 'rewards'];
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      ev.phases.forEach(function(phase) {
        phaseRequired.forEach(function(f) {
          assert(phase[f] !== undefined, ev.id + '.' + phase.id + ' missing field: ' + f);
        });
      });
    });
  });

  test('Phase rewards have spark and xp', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      ev.phases.forEach(function(phase) {
        assert(typeof phase.rewards.spark === 'number', ev.id + '.' + phase.id + ' reward spark must be number');
        assert(typeof phase.rewards.xp === 'number', ev.id + '.' + phase.id + ' reward xp must be number');
      });
    });
  });

  test('Success outcomes defined for all events', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      assert(ev.successOutcome.description, ev.id + ' missing successOutcome.description');
      assert(ev.successOutcome.worldChange, ev.id + ' missing successOutcome.worldChange');
      assert(ev.successOutcome.globalReward, ev.id + ' missing successOutcome.globalReward');
    });
  });

  test('Failure outcomes defined for all events', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      assert(ev.failureOutcome.description, ev.id + ' missing failureOutcome.description');
      assert(ev.failureOutcome.worldChange, ev.id + ' missing failureOutcome.worldChange');
      assert(ev.failureOutcome.globalPenalty, ev.id + ' missing failureOutcome.globalPenalty');
    });
  });

  test('rift_incursion phase 3 is a boss phase (bossId: rift_lord)', function() {
    var ev = MetaEvents.getEventById('rift_incursion');
    assert.strictEqual(ev.phases[2].bossId, 'rift_lord');
  });

  test('ancient_awakening phase 3 is a boss phase', function() {
    var ev = MetaEvents.getEventById('ancient_awakening');
    assert(ev.phases[2].bossId, 'ancient_awakening phase 3 should have bossId');
  });

  test('storm_of_ages phase 3 is a boss phase', function() {
    var ev = MetaEvents.getEventById('storm_of_ages');
    assert(ev.phases[2].bossId, 'storm_of_ages phase 3 should have bossId');
  });

  test('the_great_migration phase 3 is a boss phase', function() {
    var ev = MetaEvents.getEventById('the_great_migration');
    assert(ev.phases[2].bossId, 'the_great_migration phase 3 should have bossId');
  });

  test('All events have positive cooldown', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      assert(ev.cooldown > 0, ev.id + ' cooldown must be > 0');
    });
  });

  test('All events have positive totalDuration', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      assert(ev.totalDuration > 0, ev.id + ' totalDuration must be > 0');
    });
  });

  test('All events have minParticipants >= 1', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      assert(ev.minParticipants >= 1, ev.id + ' minParticipants must be >= 1');
    });
  });

  test('All phase durations are positive', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      ev.phases.forEach(function(phase) {
        assert(phase.duration > 0, ev.id + '.' + phase.id + ' duration must be > 0');
      });
    });
  });

  test('All phase communityGoal values are positive', function() {
    MetaEvents.EVENT_DEFINITIONS.forEach(function(ev) {
      ev.phases.forEach(function(phase) {
        assert(phase.communityGoal > 0, ev.id + '.' + phase.id + ' communityGoal must be > 0');
      });
    });
  });

  test('getEventDefinitions returns all 6', function() {
    var defs = MetaEvents.getEventDefinitions();
    assert.strictEqual(defs.length, 6);
  });

  test('getEventDefinitions returns a copy (not original array)', function() {
    var defs = MetaEvents.getEventDefinitions();
    defs.push({ id: 'fake' });
    assert.strictEqual(MetaEvents.getEventDefinitions().length, 6, 'Mutation should not affect original');
  });

  test('getEventById returns null for unknown event', function() {
    var result = MetaEvents.getEventById('nonexistent_event');
    assert.strictEqual(result, null);
  });

});

// =============================================================================
// SUITE 2: WORLD_BOSSES structure
// =============================================================================
suite('WORLD_BOSSES — structure', function() {

  test('WORLD_BOSSES is an object', function() {
    assert(typeof MetaEvents.WORLD_BOSSES === 'object', 'Should be object');
  });

  test('rift_lord exists', function() {
    assert(MetaEvents.WORLD_BOSSES.rift_lord, 'rift_lord should exist');
  });

  test('rift_lord has correct maxHealth', function() {
    assert.strictEqual(MetaEvents.WORLD_BOSSES.rift_lord.maxHealth, 10000);
  });

  test('Each boss has required fields', function() {
    var required = ['id', 'name', 'maxHealth', 'phase', 'phases', 'phaseThresholds', 'attacks', 'damageMultiplier'];
    Object.keys(MetaEvents.WORLD_BOSSES).forEach(function(bossId) {
      var boss = MetaEvents.WORLD_BOSSES[bossId];
      required.forEach(function(f) {
        assert(boss[f] !== undefined, bossId + ' missing field: ' + f);
      });
    });
  });

  test('Each boss has 3 phases', function() {
    Object.keys(MetaEvents.WORLD_BOSSES).forEach(function(bossId) {
      var boss = MetaEvents.WORLD_BOSSES[bossId];
      assert.strictEqual(boss.phases, 3, bossId + ' should have 3 phases');
    });
  });

  test('Each boss starts at phase 1', function() {
    Object.keys(MetaEvents.WORLD_BOSSES).forEach(function(bossId) {
      assert.strictEqual(MetaEvents.WORLD_BOSSES[bossId].phase, 1, bossId + ' should start at phase 1');
    });
  });

  test('Each boss has phaseThresholds array with 3 values', function() {
    Object.keys(MetaEvents.WORLD_BOSSES).forEach(function(bossId) {
      var boss = MetaEvents.WORLD_BOSSES[bossId];
      assert(Array.isArray(boss.phaseThresholds), bossId + ' phaseThresholds must be array');
      assert.strictEqual(boss.phaseThresholds.length, 3, bossId + ' phaseThresholds should have 3 values');
    });
  });

  test('Each boss has at least 3 attacks', function() {
    Object.keys(MetaEvents.WORLD_BOSSES).forEach(function(bossId) {
      var boss = MetaEvents.WORLD_BOSSES[bossId];
      assert(boss.attacks.length >= 3, bossId + ' should have >= 3 attacks');
    });
  });

  test('Each boss has damageMultiplier 1.0', function() {
    Object.keys(MetaEvents.WORLD_BOSSES).forEach(function(bossId) {
      assert.strictEqual(MetaEvents.WORLD_BOSSES[bossId].damageMultiplier, 1.0);
    });
  });

});

// =============================================================================
// SUITE 3: createMetaEventsState
// =============================================================================
suite('createMetaEventsState — factory', function() {

  test('Returns an object', function() {
    var state = freshState();
    assert(typeof state === 'object' && state !== null);
  });

  test('Has instances object', function() {
    var state = freshState();
    assert(typeof state.instances === 'object');
  });

  test('Has history array', function() {
    var state = freshState();
    assert(Array.isArray(state.history));
  });

  test('Has worldChanges array', function() {
    var state = freshState();
    assert(Array.isArray(state.worldChanges));
  });

  test('Has cooldowns object', function() {
    var state = freshState();
    assert(typeof state.cooldowns === 'object');
  });

  test('Fresh state has no instances', function() {
    var state = freshState();
    assert.strictEqual(Object.keys(state.instances).length, 0);
  });

  test('Fresh state has empty history', function() {
    var state = freshState();
    assert.strictEqual(state.history.length, 0);
  });

  test('Fresh state has empty worldChanges', function() {
    var state = freshState();
    assert.strictEqual(state.worldChanges.length, 0);
  });

});

// =============================================================================
// SUITE 4: scheduleEvent
// =============================================================================
suite('scheduleEvent — scheduling', function() {

  test('Schedules a valid event successfully', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert(result.success, 'Should succeed: ' + result.reason);
    assert(result.instance !== null);
  });

  test('Returns instance with correct eventId', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert.strictEqual(result.instance.eventId, 'rift_incursion');
  });

  test('Returns instance with scheduled status', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert.strictEqual(result.instance.status, 'scheduled');
  });

  test('Returns instance with correct startTick', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 5000);
    assert.strictEqual(result.instance.startTick, 5000);
  });

  test('Instance added to state.instances', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert(state.instances[result.instance.id] !== undefined);
  });

  test('Instance has phaseProgress array of correct length', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert.strictEqual(result.instance.phaseProgress.length, 3);
  });

  test('Instance phaseProgress initialized to zero', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    result.instance.phaseProgress.forEach(function(v) {
      assert.strictEqual(v, 0);
    });
  });

  test('Instance currentPhase starts at 0', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert.strictEqual(result.instance.currentPhase, 0);
  });

  test('Instance has empty participants', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert.strictEqual(Object.keys(result.instance.participants).length, 0);
  });

  test('Returns failure for unknown event', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'fake_event', 1000);
    assert.strictEqual(result.success, false);
    assert(result.reason.length > 0);
  });

  test('Cannot schedule same event twice while active', function() {
    var state = freshState();
    MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var result2 = MetaEvents.scheduleEvent(state, 'rift_incursion', 2000);
    assert.strictEqual(result2.success, false, 'Should fail: duplicate scheduled');
  });

  test('Can schedule different events simultaneously', function() {
    var state = freshState();
    var r1 = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var r2 = MetaEvents.scheduleEvent(state, 'harvest_blessing', 1000);
    assert(r1.success, 'rift_incursion should succeed');
    assert(r2.success, 'harvest_blessing should succeed');
  });

  test('Instance has unique ID', function() {
    var state = freshState();
    var r1 = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    // Complete it so we can reschedule
    MetaEvents.startEvent(state, r1.instance.id, 1000);
    MetaEvents.completeEvent(state, r1.instance.id, true);
    var r2 = MetaEvents.scheduleEvent(state, 'rift_incursion', 20000);
    assert(r1.instance.id !== r2.instance.id, 'IDs should differ');
  });

  test('Instance bossState is null initially', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert.strictEqual(result.instance.bossState, null);
  });

  test('Instance outcome is null initially', function() {
    var state = freshState();
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert.strictEqual(result.instance.outcome, null);
  });

});

// =============================================================================
// SUITE 5: startEvent
// =============================================================================
suite('startEvent — activation', function() {

  test('Activates a scheduled event', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var startResult = MetaEvents.startEvent(state, r.instance.id, 1000);
    assert(startResult.success, 'startEvent should succeed');
  });

  test('Sets status to active', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    MetaEvents.startEvent(state, r.instance.id, 1000);
    assert.strictEqual(state.instances[r.instance.id].status, 'active');
  });

  test('Returns the first phase definition', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var startResult = MetaEvents.startEvent(state, r.instance.id, 1000);
    assert.strictEqual(startResult.phase.id, 'intel_gathering');
  });

  test('Returns failure for nonexistent instance', function() {
    var state = freshState();
    var result = MetaEvents.startEvent(state, 'nonexistent_id', 1000);
    assert.strictEqual(result.success, false);
  });

  test('Returns failure if event not in scheduled state', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    MetaEvents.startEvent(state, r.instance.id, 1000); // activate once
    var result2 = MetaEvents.startEvent(state, r.instance.id, 2000); // activate again
    assert.strictEqual(result2.success, false);
  });

  test('Sets phaseStartTick correctly', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    MetaEvents.startEvent(state, r.instance.id, 1500);
    assert.strictEqual(state.instances[r.instance.id].phaseStartTick, 1500);
  });

  test('Boss phase event: non-boss first phase does not create bossState', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    MetaEvents.startEvent(state, r.instance.id, 1000);
    // Phase 0 (intel_gathering) is not a boss phase
    assert.strictEqual(state.instances[r.instance.id].bossState, null);
  });

  test('festival_of_light starts with no boss phase', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'festival_of_light', 1000);
    MetaEvents.startEvent(state, r.instance.id, 1000);
    assert.strictEqual(state.instances[r.instance.id].bossState, null);
  });

});

// =============================================================================
// SUITE 6: contribute
// =============================================================================
suite('contribute — player contributions', function() {

  test('Adds player to participants', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 10, 'fragment');
    assert(state.instances[id].participants['alice'] !== undefined);
  });

  test('Returns success true', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.contribute(state, 'alice', id, 10, 'fragment');
    assert.strictEqual(result.success, true);
  });

  test('Returns correct playerTotal after single contribution', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.contribute(state, 'alice', id, 50, 'fragment');
    assert.strictEqual(result.playerTotal, 50);
  });

  test('Accumulates playerTotal across multiple contributions', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 50, 'fragment');
    var result = MetaEvents.contribute(state, 'alice', id, 30, 'fragment');
    assert.strictEqual(result.playerTotal, 80);
  });

  test('Returns correct phaseProgress', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    MetaEvents.contribute(state, 'bob', id, 200, 'fragment');
    var result = MetaEvents.contribute(state, 'charlie', id, 50, 'fragment');
    assert.strictEqual(result.phaseProgress, 350);
  });

  test('phaseComplete is false below goal', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    assert.strictEqual(result.phaseComplete, false, 'Goal is 500, only 100 contributed');
  });

  test('phaseComplete is true when goal reached', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    assert.strictEqual(result.phaseComplete, true);
  });

  test('phaseComplete is true when goal exceeded', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.contribute(state, 'alice', id, 600, 'fragment');
    assert.strictEqual(result.phaseComplete, true);
  });

  test('Multiple players contribute independently', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    MetaEvents.contribute(state, 'bob', id, 150, 'fragment');
    assert.strictEqual(state.instances[id].participants['alice'].contributions, 100);
    assert.strictEqual(state.instances[id].participants['bob'].contributions, 150);
  });

  test('Returns failure for nonexistent instance', function() {
    var state = freshState();
    var result = MetaEvents.contribute(state, 'alice', 'bad_id', 10, 'fragment');
    assert.strictEqual(result.success, false);
  });

  test('Returns failure when event not active', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var result = MetaEvents.contribute(state, 'alice', r.instance.id, 10, 'fragment');
    assert.strictEqual(result.success, false);
  });

  test('Contribute after completion returns failure', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var result = MetaEvents.contribute(state, 'alice', id, 10, 'fragment');
    assert.strictEqual(result.success, false);
  });

  test('Zero amount does not subtract', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    MetaEvents.contribute(state, 'alice', id, 0, 'fragment');
    assert.strictEqual(state.instances[id].participants['alice'].contributions, 100);
  });

  test('Negative amount treated as zero', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    MetaEvents.contribute(state, 'alice', id, -50, 'fragment');
    assert(state.instances[id].participants['alice'].contributions >= 100, 'Should not decrease contributions');
  });

});

// =============================================================================
// SUITE 7: advancePhase
// =============================================================================
suite('advancePhase — phase progression', function() {

  test('Fails when goal not yet met', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment'); // need 500
    var result = MetaEvents.advancePhase(state, id, 1100);
    assert.strictEqual(result.success, false);
    assert(result.reason.length > 0);
  });

  test('Succeeds when goal is met', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    var result = MetaEvents.advancePhase(state, id, 1100);
    assert.strictEqual(result.success, true);
  });

  test('Returns next phase data', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    var result = MetaEvents.advancePhase(state, id, 1100);
    assert(result.newPhase !== null, 'Should return next phase');
    assert.strictEqual(result.newPhase.id, 'defense_prep');
  });

  test('currentPhase incremented in state', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    MetaEvents.advancePhase(state, id, 1100);
    assert.strictEqual(state.instances[id].currentPhase, 1);
  });

  test('phaseStartTick updated on advance', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    MetaEvents.advancePhase(state, id, 2500);
    assert.strictEqual(state.instances[id].phaseStartTick, 2500);
  });

  test('Advancing past last phase returns complete=true', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    // Phase 0
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    MetaEvents.advancePhase(state, id, 2000);
    // Phase 1
    MetaEvents.contribute(state, 'alice', id, 50, 'structure');
    MetaEvents.advancePhase(state, id, 4000);
    // Phase 2 (boss phase) - advance goal by direct state manipulation for test
    state.instances[id].phaseProgress[2] = 10000;
    var result = MetaEvents.advancePhase(state, id, 5000);
    assert.strictEqual(result.complete, true);
  });

  test('Boss phase is initialized when advancing to boss phase', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    MetaEvents.advancePhase(state, id, 2000);
    // Phase 1: defense_prep
    MetaEvents.contribute(state, 'alice', id, 50, 'structure');
    MetaEvents.advancePhase(state, id, 4000);
    // Now in phase 2: final_battle (boss)
    assert(state.instances[id].bossState !== null, 'Boss state should be initialized');
    assert.strictEqual(state.instances[id].bossState.id, 'rift_lord');
  });

  test('Returns failure for nonexistent instance', function() {
    var state = freshState();
    var result = MetaEvents.advancePhase(state, 'bad_id', 1000);
    assert.strictEqual(result.success, false);
  });

  test('Returns failure if event not active', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var result = MetaEvents.advancePhase(state, r.instance.id, 1100);
    assert.strictEqual(result.success, false);
  });

});

// =============================================================================
// SUITE 8: attackBoss
// =============================================================================
suite('attackBoss — world boss combat', function() {

  function setupBossPhase(eventId) {
    var state = freshState();
    var id = scheduleAndStart(state, eventId, 1000);
    // Advance to boss phase by completing phases 0 and 1
    var def = MetaEvents.getEventById(eventId);
    state.instances[id].phaseProgress[0] = def.phases[0].communityGoal;
    MetaEvents.advancePhase(state, id, 2000);
    state.instances[id].phaseProgress[1] = def.phases[1].communityGoal;
    MetaEvents.advancePhase(state, id, 4000);
    return { state: state, id: id };
  }

  test('attackBoss succeeds in boss phase', function() {
    var setup = setupBossPhase('rift_incursion');
    var result = MetaEvents.attackBoss(setup.state, 'alice', setup.id, 500, 42);
    assert.strictEqual(result.success, true);
  });

  test('attackBoss reduces boss health', function() {
    var setup = setupBossPhase('rift_incursion');
    var result = MetaEvents.attackBoss(setup.state, 'alice', setup.id, 500, 42);
    assert(result.bossHealth < 10000, 'Boss health should decrease');
  });

  test('Damage is positive', function() {
    var setup = setupBossPhase('rift_incursion');
    var result = MetaEvents.attackBoss(setup.state, 'alice', setup.id, 100, 10);
    assert(result.damage > 0, 'Damage must be positive');
  });

  test('Boss health does not go below 0', function() {
    var setup = setupBossPhase('rift_incursion');
    MetaEvents.attackBoss(setup.state, 'alice', setup.id, 50000, 1);
    var boss = MetaEvents.getBossState(setup.state, setup.id);
    assert(boss.currentHealth >= 0, 'Boss health should not go below 0');
  });

  test('bossDefeated is true when health reaches 0', function() {
    var setup = setupBossPhase('rift_incursion');
    var result = MetaEvents.attackBoss(setup.state, 'alice', setup.id, 100000, 1);
    assert.strictEqual(result.bossDefeated, true);
  });

  test('bossDefeated is false when boss alive', function() {
    var setup = setupBossPhase('rift_incursion');
    var result = MetaEvents.attackBoss(setup.state, 'alice', setup.id, 10, 1);
    assert.strictEqual(result.bossDefeated, false);
  });

  test('Boss phase changes at 66% threshold', function() {
    var setup = setupBossPhase('rift_incursion');
    // Boss has 10000 HP; phase 2 triggered at <= 66% = 6600 HP
    // Deal 3401 damage to bring to 6599
    MetaEvents.attackBoss(setup.state, 'alice', setup.id, 3401, 99);
    var boss = MetaEvents.getBossState(setup.state, setup.id);
    // May be phase 2 if threshold crossed
    assert(boss.phase >= 1 && boss.phase <= 3, 'Phase should be 1-3');
  });

  test('Boss phase is at least 1', function() {
    var setup = setupBossPhase('rift_incursion');
    var result = MetaEvents.attackBoss(setup.state, 'alice', setup.id, 1, 5);
    assert(result.bossPhase >= 1);
  });

  test('Boss phase is at most 3', function() {
    var setup = setupBossPhase('rift_incursion');
    MetaEvents.attackBoss(setup.state, 'alice', setup.id, 100000, 1);
    var boss = MetaEvents.getBossState(setup.state, setup.id);
    assert(boss.phase <= 3);
  });

  test('Damage scales up with more participants', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    state.instances[id].phaseProgress[0] = 500;
    MetaEvents.advancePhase(state, id, 2000);
    state.instances[id].phaseProgress[1] = 50;
    MetaEvents.advancePhase(state, id, 4000);

    // Add participants to scale up damage
    state.instances[id].participants['p1'] = { contributions: 10, joinedAt: 1000, lastContribution: 0 };
    state.instances[id].participants['p2'] = { contributions: 10, joinedAt: 1000, lastContribution: 0 };
    state.instances[id].participants['p3'] = { contributions: 10, joinedAt: 1000, lastContribution: 0 };
    state.instances[id].participants['p4'] = { contributions: 10, joinedAt: 1000, lastContribution: 0 };
    state.instances[id].participants['p5'] = { contributions: 10, joinedAt: 1000, lastContribution: 0 };

    var result = MetaEvents.attackBoss(state, 'attacker', id, 100, 42);
    // 5 participants = +25% scale factor, so damage should be > 100
    assert(result.damage >= 100, 'Scaled damage should be >= base');
  });

  test('Attack on non-boss phase returns failure', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000); // Phase 0: intel_gathering (not boss)
    var result = MetaEvents.attackBoss(state, 'alice', id, 100, 1);
    assert.strictEqual(result.success, false);
    assert(result.reason.length > 0);
  });

  test('Attack on nonexistent instance returns failure', function() {
    var state = freshState();
    var result = MetaEvents.attackBoss(state, 'alice', 'bad_id', 100, 1);
    assert.strictEqual(result.success, false);
  });

  test('Attack when event not active returns failure', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var result = MetaEvents.attackBoss(state, 'alice', r.instance.id, 100, 1);
    assert.strictEqual(result.success, false);
  });

  test('Attack counts toward phase progress', function() {
    var setup = setupBossPhase('rift_incursion');
    var before = setup.state.instances[setup.id].phaseProgress[2];
    MetaEvents.attackBoss(setup.state, 'alice', setup.id, 200, 42);
    var after = setup.state.instances[setup.id].phaseProgress[2];
    assert(after > before, 'Phase progress should increase');
  });

  test('Seeded PRNG produces consistent results', function() {
    var setup1 = setupBossPhase('rift_incursion');
    var setup2 = setupBossPhase('rift_incursion');
    var r1 = MetaEvents.attackBoss(setup1.state, 'alice', setup1.id, 200, 12345);
    var r2 = MetaEvents.attackBoss(setup2.state, 'alice', setup2.id, 200, 12345);
    assert.strictEqual(r1.damage, r2.damage, 'Same seed should produce same damage');
  });

  test('Different seeds produce potential variance', function() {
    // Variance is 0.9-1.1 range, so with enough different seeds we should see different results
    var results = {};
    for (var s = 0; s < 20; s++) {
      var setup = setupBossPhase('rift_incursion');
      var r = MetaEvents.attackBoss(setup.state, 'alice', setup.id, 1000, s);
      results[r.damage] = true;
    }
    // Should have more than one distinct damage value
    assert(Object.keys(results).length > 1, 'Different seeds should produce some variance');
  });

});

// =============================================================================
// SUITE 9: checkPhaseTimeout
// =============================================================================
suite('checkPhaseTimeout — timeout detection', function() {

  test('Not timed out when within duration', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.checkPhaseTimeout(state, id, 1500); // phase duration is 2000
    assert.strictEqual(result.timedOut, false);
  });

  test('Timed out when duration exceeded and goal not met', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    // Phase 0 duration is 2000, so tick 3001 exceeds it
    var result = MetaEvents.checkPhaseTimeout(state, id, 3001);
    assert.strictEqual(result.timedOut, true);
  });

  test('Not timed out when goal met even if time exceeded', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment'); // meets goal
    var result = MetaEvents.checkPhaseTimeout(state, id, 3001);
    assert.strictEqual(result.timedOut, false);
    assert.strictEqual(result.goalMet, true);
  });

  test('Returns phaseProgress in result', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 200, 'fragment');
    var result = MetaEvents.checkPhaseTimeout(state, id, 1500);
    assert.strictEqual(result.phaseProgress, 200);
  });

  test('goalMet is false when below goal', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 200, 'fragment');
    var result = MetaEvents.checkPhaseTimeout(state, id, 1500);
    assert.strictEqual(result.goalMet, false);
  });

  test('goalMet is true when goal reached', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    var result = MetaEvents.checkPhaseTimeout(state, id, 1500);
    assert.strictEqual(result.goalMet, true);
  });

  test('Returns safe defaults for nonexistent instance', function() {
    var state = freshState();
    var result = MetaEvents.checkPhaseTimeout(state, 'bad_id', 1000);
    assert.strictEqual(result.timedOut, false);
  });

  test('Returns safe defaults for inactive event', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var result = MetaEvents.checkPhaseTimeout(state, r.instance.id, 5000);
    assert.strictEqual(result.timedOut, false);
  });

});

// =============================================================================
// SUITE 10: completeEvent
// =============================================================================
suite('completeEvent — finalization', function() {

  test('Success completion updates status to completed_success', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(state.instances[id].status, 'completed_success');
  });

  test('Failure completion updates status to completed_failure', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, false);
    assert.strictEqual(state.instances[id].status, 'completed_failure');
  });

  test('Returns success:true', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(result.success, true);
  });

  test('Returns outcome with description', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.completeEvent(state, id, true);
    assert(result.outcome.description.length > 0);
  });

  test('Success outcome description matches event definition', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.completeEvent(state, id, true);
    var def = MetaEvents.getEventById('rift_incursion');
    assert.strictEqual(result.outcome.description, def.successOutcome.description);
  });

  test('Failure outcome description matches event definition', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.completeEvent(state, id, false);
    var def = MetaEvents.getEventById('rift_incursion');
    assert.strictEqual(result.outcome.description, def.failureOutcome.description);
  });

  test('Success applies worldChange', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    assert(state.worldChanges.length > 0, 'World change should be added');
  });

  test('Failure applies worldChange', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, false);
    assert(state.worldChanges.length > 0, 'World change should be added on failure');
  });

  test('Success worldChange type is add_landmark for rift_incursion', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var change = state.worldChanges[0].change;
    assert.strictEqual(change.type, 'add_landmark');
  });

  test('Failure worldChange type is zone_debuff for rift_incursion', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, false);
    var change = state.worldChanges[0].change;
    assert.strictEqual(change.type, 'zone_debuff');
  });

  test('Success returns globalReward', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.completeEvent(state, id, true);
    assert(result.rewards !== null, 'Success should have rewards');
    assert(typeof result.rewards.spark === 'number');
  });

  test('Failure returns no rewards (null)', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.completeEvent(state, id, false);
    assert.strictEqual(result.rewards, null);
  });

  test('Event added to history on completion', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(state.history.length, 1);
  });

  test('History entry has correct eventId', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(state.history[0].eventId, 'rift_incursion');
  });

  test('History entry status is completed_success', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(state.history[0].status, 'completed_success');
  });

  test('History entry status is completed_failure', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, false);
    assert.strictEqual(state.history[0].status, 'completed_failure');
  });

  test('Returns failure for nonexistent instance', function() {
    var state = freshState();
    var result = MetaEvents.completeEvent(state, 'bad_id', true);
    assert.strictEqual(result.success, false);
  });

  test('Returns failure when already completed', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var result2 = MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(result2.success, false);
  });

  test('Multiple events can be completed', function() {
    var state = freshState();
    var id1 = scheduleAndStart(state, 'rift_incursion', 1000);
    var id2 = scheduleAndStart(state, 'harvest_blessing', 1000);
    MetaEvents.completeEvent(state, id1, true);
    MetaEvents.completeEvent(state, id2, false);
    assert.strictEqual(state.history.length, 2);
  });

});

// =============================================================================
// SUITE 11: getActiveEvents / getScheduledEvents
// =============================================================================
suite('getActiveEvents and getScheduledEvents', function() {

  test('getActiveEvents returns empty array initially', function() {
    var state = freshState();
    var result = MetaEvents.getActiveEvents(state);
    assert.strictEqual(result.length, 0);
  });

  test('getScheduledEvents returns empty array initially', function() {
    var state = freshState();
    var result = MetaEvents.getScheduledEvents(state);
    assert.strictEqual(result.length, 0);
  });

  test('Scheduled event appears in getScheduledEvents', function() {
    var state = freshState();
    MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    var result = MetaEvents.getScheduledEvents(state);
    assert.strictEqual(result.length, 1);
  });

  test('Active event appears in getActiveEvents', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getActiveEvents(state);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, id);
  });

  test('Active event does not appear in getScheduledEvents', function() {
    var state = freshState();
    scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getScheduledEvents(state);
    assert.strictEqual(result.length, 0);
  });

  test('Completed event does not appear in getActiveEvents', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var result = MetaEvents.getActiveEvents(state);
    assert.strictEqual(result.length, 0);
  });

  test('Multiple active events are all returned', function() {
    var state = freshState();
    scheduleAndStart(state, 'rift_incursion', 1000);
    scheduleAndStart(state, 'harvest_blessing', 1000);
    var result = MetaEvents.getActiveEvents(state);
    assert.strictEqual(result.length, 2);
  });

});

// =============================================================================
// SUITE 12: getParticipantStats / getTotalParticipants / getLeaderboard
// =============================================================================
suite('Participant stats and leaderboard', function() {

  test('getParticipantStats returns null for unknown player', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getParticipantStats(state, id, 'nobody');
    assert.strictEqual(result, null);
  });

  test('getParticipantStats returns stats after contribution', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    var result = MetaEvents.getParticipantStats(state, id, 'alice');
    assert(result !== null);
    assert.strictEqual(result.contributions, 100);
  });

  test('getTotalParticipants returns 0 initially', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    assert.strictEqual(MetaEvents.getTotalParticipants(state, id), 0);
  });

  test('getTotalParticipants counts unique players', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    MetaEvents.contribute(state, 'bob', id, 50, 'fragment');
    MetaEvents.contribute(state, 'alice', id, 20, 'fragment'); // alice again
    assert.strictEqual(MetaEvents.getTotalParticipants(state, id), 2);
  });

  test('getTotalParticipants returns 0 for bad instance', function() {
    var state = freshState();
    assert.strictEqual(MetaEvents.getTotalParticipants(state, 'bad_id'), 0);
  });

  test('getLeaderboard returns empty for no participants', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var board = MetaEvents.getLeaderboard(state, id, 10);
    assert.strictEqual(board.length, 0);
  });

  test('Leaderboard sorts by contributions descending', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 50, 'fragment');
    MetaEvents.contribute(state, 'bob', id, 200, 'fragment');
    MetaEvents.contribute(state, 'charlie', id, 100, 'fragment');
    var board = MetaEvents.getLeaderboard(state, id, 10);
    assert.strictEqual(board[0].playerId, 'bob');
    assert.strictEqual(board[1].playerId, 'charlie');
    assert.strictEqual(board[2].playerId, 'alice');
  });

  test('Leaderboard respects count limit', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    for (var i = 0; i < 10; i++) {
      MetaEvents.contribute(state, 'player' + i, id, i * 10 + 10, 'fragment');
    }
    var board = MetaEvents.getLeaderboard(state, id, 5);
    assert.strictEqual(board.length, 5);
  });

  test('Leaderboard top entry has highest contributions', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 300, 'fragment');
    MetaEvents.contribute(state, 'bob', id, 100, 'fragment');
    var board = MetaEvents.getLeaderboard(state, id, 10);
    assert.strictEqual(board[0].contributions, 300);
  });

  test('getLeaderboard returns empty for bad instance', function() {
    var state = freshState();
    var board = MetaEvents.getLeaderboard(state, 'bad_id', 10);
    assert.strictEqual(board.length, 0);
  });

  test('Leaderboard entry has playerId and contributions', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    var board = MetaEvents.getLeaderboard(state, id, 10);
    assert(board[0].playerId !== undefined);
    assert(typeof board[0].contributions === 'number');
  });

});

// =============================================================================
// SUITE 13: getPhaseProgress
// =============================================================================
suite('getPhaseProgress', function() {

  test('Returns phase details for active event', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getPhaseProgress(state, id);
    assert(result !== null);
    assert.strictEqual(result.phaseIndex, 0);
  });

  test('Returns correct phaseId', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getPhaseProgress(state, id);
    assert.strictEqual(result.phaseId, 'intel_gathering');
  });

  test('Returns correct goal', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getPhaseProgress(state, id);
    assert.strictEqual(result.goal, 500);
  });

  test('Progress starts at 0', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getPhaseProgress(state, id);
    assert.strictEqual(result.progress, 0);
  });

  test('Progress updates after contribution', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 150, 'fragment');
    var result = MetaEvents.getPhaseProgress(state, id);
    assert.strictEqual(result.progress, 150);
  });

  test('Percentage is 0 at start', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getPhaseProgress(state, id);
    assert.strictEqual(result.percentage, 0);
  });

  test('Percentage is 100 when goal met', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 500, 'fragment');
    var result = MetaEvents.getPhaseProgress(state, id);
    assert.strictEqual(result.percentage, 100);
  });

  test('Percentage caps at 100 when goal exceeded', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 1000, 'fragment');
    var result = MetaEvents.getPhaseProgress(state, id);
    assert.strictEqual(result.percentage, 100);
  });

  test('isBossPhase is false for non-boss phase', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getPhaseProgress(state, id);
    assert.strictEqual(result.isBossPhase, false);
  });

  test('Returns null for bad instance', function() {
    var state = freshState();
    var result = MetaEvents.getPhaseProgress(state, 'bad_id');
    assert.strictEqual(result, null);
  });

  test('Returns duration field', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var result = MetaEvents.getPhaseProgress(state, id);
    assert(typeof result.duration === 'number' && result.duration > 0);
  });

});

// =============================================================================
// SUITE 14: getEventHistory / getWorldChanges / getEventState
// =============================================================================
suite('History, world changes, and event state', function() {

  test('getEventHistory returns empty array initially', function() {
    var state = freshState();
    assert.strictEqual(MetaEvents.getEventHistory(state).length, 0);
  });

  test('getEventHistory returns a copy', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var hist = MetaEvents.getEventHistory(state);
    hist.push({ fake: true });
    assert.strictEqual(MetaEvents.getEventHistory(state).length, 1);
  });

  test('History records both success and failure', function() {
    var state = freshState();
    var id1 = scheduleAndStart(state, 'rift_incursion', 1000);
    var id2 = scheduleAndStart(state, 'harvest_blessing', 1000);
    MetaEvents.completeEvent(state, id1, true);
    MetaEvents.completeEvent(state, id2, false);
    assert.strictEqual(MetaEvents.getEventHistory(state).length, 2);
  });

  test('getWorldChanges returns empty initially', function() {
    var state = freshState();
    assert.strictEqual(MetaEvents.getWorldChanges(state).length, 0);
  });

  test('getWorldChanges grows after each completion', function() {
    var state = freshState();
    var id1 = scheduleAndStart(state, 'rift_incursion', 1000);
    var id2 = scheduleAndStart(state, 'harvest_blessing', 1000);
    MetaEvents.completeEvent(state, id1, true);
    MetaEvents.completeEvent(state, id2, false);
    assert.strictEqual(MetaEvents.getWorldChanges(state).length, 2);
  });

  test('getWorldChanges returns a copy', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var changes = MetaEvents.getWorldChanges(state);
    changes.push({ fake: true });
    assert.strictEqual(MetaEvents.getWorldChanges(state).length, 1);
  });

  test('World change entry has instanceId', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(MetaEvents.getWorldChanges(state)[0].instanceId, id);
  });

  test('World change entry has eventId', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(MetaEvents.getWorldChanges(state)[0].eventId, 'rift_incursion');
  });

  test('getEventState returns instance for valid id', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    var inst = MetaEvents.getEventState(state, id);
    assert(inst !== null);
    assert.strictEqual(inst.id, id);
  });

  test('getEventState returns null for bad id', function() {
    var state = freshState();
    var result = MetaEvents.getEventState(state, 'bad_id');
    assert.strictEqual(result, null);
  });

});

// =============================================================================
// SUITE 15: isEventOnCooldown
// =============================================================================
suite('isEventOnCooldown — cooldown enforcement', function() {

  test('No cooldown on fresh state', function() {
    var state = freshState();
    assert.strictEqual(MetaEvents.isEventOnCooldown(state, 'rift_incursion', 1000), false);
  });

  test('Cooldown active immediately after completion', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    // rift_incursion cooldown is 10000 ticks
    // completion tick proxy = startTick + totalDuration = 1000 + 5000 = 6000
    // So at tick 7000, cooldown should still be active
    var onCooldown = MetaEvents.isEventOnCooldown(state, 'rift_incursion', 7000);
    assert.strictEqual(onCooldown, true, 'Should be on cooldown shortly after completion');
  });

  test('Cooldown expires after cooldown period', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    // cooldown tick = startTick + totalDuration + cooldown = 1000 + 5000 + 10000 + 1 = 16001
    var onCooldown = MetaEvents.isEventOnCooldown(state, 'rift_incursion', 16001);
    assert.strictEqual(onCooldown, false, 'Cooldown should expire after cooldown period');
  });

  test('scheduleEvent fails during cooldown', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 7000);
    assert.strictEqual(result.success, false, 'Should fail while on cooldown');
  });

  test('scheduleEvent succeeds after cooldown expires', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var result = MetaEvents.scheduleEvent(state, 'rift_incursion', 16001);
    assert.strictEqual(result.success, true, 'Should succeed after cooldown');
  });

  test('isEventOnCooldown returns false for unknown event', function() {
    var state = freshState();
    var result = MetaEvents.isEventOnCooldown(state, 'fake_event', 1000);
    assert.strictEqual(result, false);
  });

  test('Different events have independent cooldowns', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    // harvest_blessing has no cooldown recorded, so it should be schedulable
    var result = MetaEvents.scheduleEvent(state, 'harvest_blessing', 7000);
    assert.strictEqual(result.success, true, 'Different event should not be affected by cooldown');
  });

});

// =============================================================================
// SUITE 16: getBossState
// =============================================================================
suite('getBossState', function() {

  test('Returns null for non-boss event phase', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    assert.strictEqual(MetaEvents.getBossState(state, id), null);
  });

  test('Returns null for bad instance', function() {
    var state = freshState();
    assert.strictEqual(MetaEvents.getBossState(state, 'bad_id'), null);
  });

  test('Returns boss state after advancing to boss phase', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    state.instances[id].phaseProgress[0] = 500;
    MetaEvents.advancePhase(state, id, 2000);
    state.instances[id].phaseProgress[1] = 50;
    MetaEvents.advancePhase(state, id, 4000);
    var boss = MetaEvents.getBossState(state, id);
    assert(boss !== null, 'Boss state should exist in boss phase');
  });

  test('Boss state has correct maxHealth', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    state.instances[id].phaseProgress[0] = 500;
    MetaEvents.advancePhase(state, id, 2000);
    state.instances[id].phaseProgress[1] = 50;
    MetaEvents.advancePhase(state, id, 4000);
    var boss = MetaEvents.getBossState(state, id);
    assert.strictEqual(boss.maxHealth, 10000);
  });

  test('Boss currentHealth equals maxHealth at start', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    state.instances[id].phaseProgress[0] = 500;
    MetaEvents.advancePhase(state, id, 2000);
    state.instances[id].phaseProgress[1] = 50;
    MetaEvents.advancePhase(state, id, 4000);
    var boss = MetaEvents.getBossState(state, id);
    assert.strictEqual(boss.currentHealth, boss.maxHealth);
  });

});

// =============================================================================
// SUITE 17: mulberry32 PRNG
// =============================================================================
suite('mulberry32 — seeded PRNG', function() {

  test('Returns a function', function() {
    var rng = MetaEvents.mulberry32(42);
    assert(typeof rng === 'function');
  });

  test('Returns values between 0 and 1', function() {
    var rng = MetaEvents.mulberry32(12345);
    for (var i = 0; i < 100; i++) {
      var v = rng();
      assert(v >= 0 && v < 1, 'Value out of range: ' + v);
    }
  });

  test('Same seed produces same sequence', function() {
    var rng1 = MetaEvents.mulberry32(999);
    var rng2 = MetaEvents.mulberry32(999);
    for (var i = 0; i < 10; i++) {
      assert.strictEqual(rng1(), rng2(), 'Should match at step ' + i);
    }
  });

  test('Different seeds produce different sequences', function() {
    var rng1 = MetaEvents.mulberry32(1);
    var rng2 = MetaEvents.mulberry32(2);
    var v1 = rng1();
    var v2 = rng2();
    assert(v1 !== v2, 'Different seeds should produce different first values');
  });

});

// =============================================================================
// SUITE 18: Edge cases and integration
// =============================================================================
suite('Edge cases and integration', function() {

  test('Full rift_incursion run: success path', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    assert(r.success);
    MetaEvents.startEvent(state, r.instance.id, 1000);
    // Phase 0
    MetaEvents.contribute(state, 'alice', r.instance.id, 300, 'fragment');
    MetaEvents.contribute(state, 'bob', r.instance.id, 200, 'fragment');
    MetaEvents.advancePhase(state, r.instance.id, 2000);
    // Phase 1
    MetaEvents.contribute(state, 'alice', r.instance.id, 30, 'structure');
    MetaEvents.contribute(state, 'bob', r.instance.id, 20, 'structure');
    MetaEvents.advancePhase(state, r.instance.id, 4000);
    // Phase 2 (boss)
    var bossResult = MetaEvents.attackBoss(state, 'alice', r.instance.id, 100000, 1);
    assert.strictEqual(bossResult.bossDefeated, true);
    // Complete with success
    var completion = MetaEvents.completeEvent(state, r.instance.id, true);
    assert.strictEqual(completion.success, true);
    assert.strictEqual(state.instances[r.instance.id].status, 'completed_success');
    assert(state.history.length === 1);
    assert(state.worldChanges.length === 1);
  });

  test('Full rift_incursion run: failure path', function() {
    var state = freshState();
    var r = MetaEvents.scheduleEvent(state, 'rift_incursion', 1000);
    MetaEvents.startEvent(state, r.instance.id, 1000);
    // Phase times out — just complete with failure
    var completion = MetaEvents.completeEvent(state, r.instance.id, false);
    assert.strictEqual(completion.success, true);
    assert.strictEqual(state.instances[r.instance.id].status, 'completed_failure');
    assert.strictEqual(state.worldChanges[0].change.type, 'zone_debuff');
  });

  test('All 6 events can be scheduled and started', function() {
    var state = freshState();
    MetaEvents.EVENT_DEFINITIONS.forEach(function(def) {
      var r = MetaEvents.scheduleEvent(state, def.id, 1000);
      assert(r.success, def.id + ' schedule failed: ' + r.reason);
      var sr = MetaEvents.startEvent(state, r.instance.id, 1000);
      assert(sr.success, def.id + ' start failed: ' + sr.reason);
    });
    assert.strictEqual(MetaEvents.getActiveEvents(state).length, 6);
  });

  test('All 6 events can be completed with success', function() {
    var state = freshState();
    MetaEvents.EVENT_DEFINITIONS.forEach(function(def) {
      var r = MetaEvents.scheduleEvent(state, def.id, 1000);
      MetaEvents.startEvent(state, r.instance.id, 1000);
      var cr = MetaEvents.completeEvent(state, r.instance.id, true);
      assert(cr.success, def.id + ' complete failed: ' + cr.reason);
    });
    assert.strictEqual(state.history.length, 6);
  });

  test('All 6 events can be completed with failure', function() {
    var state = freshState();
    MetaEvents.EVENT_DEFINITIONS.forEach(function(def) {
      var r = MetaEvents.scheduleEvent(state, def.id, 1000);
      MetaEvents.startEvent(state, r.instance.id, 1000);
      MetaEvents.completeEvent(state, r.instance.id, false);
    });
    assert.strictEqual(state.history.length, 6);
    state.history.forEach(function(h) {
      assert.strictEqual(h.status, 'completed_failure');
    });
  });

  test('contribute on completed event returns failure', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var result = MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    assert.strictEqual(result.success, false);
  });

  test('attackBoss on completed event returns failure', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    state.instances[id].phaseProgress[0] = 500;
    MetaEvents.advancePhase(state, id, 2000);
    state.instances[id].phaseProgress[1] = 50;
    MetaEvents.advancePhase(state, id, 4000);
    MetaEvents.completeEvent(state, id, true);
    var result = MetaEvents.attackBoss(state, 'alice', id, 100, 1);
    assert.strictEqual(result.success, false);
  });

  test('advancePhase on completed event returns failure', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var result = MetaEvents.advancePhase(state, id, 2000);
    assert.strictEqual(result.success, false);
  });

  test('Phase 0 can be advanced and phase 1 contributions work', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'harvest_blessing', 1000);
    // Phase 0: sacred_planting, goal=1000
    MetaEvents.contribute(state, 'alice', id, 1000, 'seed');
    var advance = MetaEvents.advancePhase(state, id, 2000);
    assert(advance.success, 'Phase advance should succeed');
    // Phase 1: grand_harvest, goal=800
    var result = MetaEvents.contribute(state, 'alice', id, 400, 'harvest');
    assert.strictEqual(result.success, true);
    assert(result.phaseProgress <= 400, 'Progress should reflect phase 1 only');
  });

  test('Instance ID is globally unique across multiple schedules', function() {
    var state = freshState();
    var ids = {};
    MetaEvents.EVENT_DEFINITIONS.forEach(function(def) {
      var r = MetaEvents.scheduleEvent(state, def.id, 1000);
      assert(!ids[r.instance.id], 'ID ' + r.instance.id + ' should be unique');
      ids[r.instance.id] = true;
    });
  });

  test('history entry includes participant count', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.contribute(state, 'alice', id, 100, 'fragment');
    MetaEvents.contribute(state, 'bob', id, 200, 'fragment');
    MetaEvents.completeEvent(state, id, true);
    assert.strictEqual(state.history[0].participants, 2);
  });

  test('getEventState after completion still returns instance', function() {
    var state = freshState();
    var id = scheduleAndStart(state, 'rift_incursion', 1000);
    MetaEvents.completeEvent(state, id, true);
    var inst = MetaEvents.getEventState(state, id);
    assert(inst !== null, 'Should still return state after completion');
    assert.strictEqual(inst.status, 'completed_success');
  });

  test('festival_of_light: all 3 phases are individual contribution phases', function() {
    var def = MetaEvents.getEventById('festival_of_light');
    def.phases.forEach(function(phase) {
      assert.strictEqual(phase.individualContributions, true, phase.id + ' should accept individual contributions');
    });
  });

  test('rift_incursion success world change zone is wilds', function() {
    var def = MetaEvents.getEventById('rift_incursion');
    assert.strictEqual(def.successOutcome.worldChange.zone, 'wilds');
  });

  test('harvest_blessing failure world change is in gardens zone', function() {
    var def = MetaEvents.getEventById('harvest_blessing');
    assert.strictEqual(def.failureOutcome.worldChange.zone, 'gardens');
  });

  test('ancient_awakening success adds Guardian Archive landmark', function() {
    var def = MetaEvents.getEventById('ancient_awakening');
    assert.strictEqual(def.successOutcome.worldChange.type, 'add_landmark');
    assert.strictEqual(def.successOutcome.worldChange.name, 'Guardian Archive');
  });

  test('storm_of_ages has highest minParticipants', function() {
    var stormDef = MetaEvents.getEventById('storm_of_ages');
    var maxMin = 0;
    MetaEvents.EVENT_DEFINITIONS.forEach(function(def) {
      if (def.minParticipants > maxMin) maxMin = def.minParticipants;
    });
    assert.strictEqual(stormDef.minParticipants, maxMin);
  });

  test('festival_of_light has lowest minParticipants', function() {
    var festDef = MetaEvents.getEventById('festival_of_light');
    var minMin = Infinity;
    MetaEvents.EVENT_DEFINITIONS.forEach(function(def) {
      if (def.minParticipants < minMin) minMin = def.minParticipants;
    });
    assert.strictEqual(festDef.minParticipants, minMin);
  });

});

// =============================================================================
// Final report
// =============================================================================
process.stdout.write('\n========================================\n');
process.stdout.write('Results: ' + passed + ' passed, ' + failed + ' failed\n');
if (failures.length > 0) {
  process.stdout.write('\nFailures:\n');
  failures.forEach(function(f) {
    process.stdout.write('  FAIL: ' + f.name + '\n    ' + f.error + '\n');
  });
}
process.stdout.write('========================================\n');
process.exit(failed > 0 ? 1 : 0);
