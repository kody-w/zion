// test_world_events.js — Tests for the Living World Events system
const { test, suite, report, assert } = require('./test_runner');
const WE = require('../src/js/world_events');

// ── Time injection helpers ──────────────────────────────────────────────────

var _mockNow = Date.now();
function setMockNow(ts) { _mockNow = ts; WE.setNowFn(function() { return _mockNow; }); }
function advanceMockTime(ms) { _mockNow += ms; }
function resetMockNow() { WE.setNowFn(function() { return Date.now(); }); }

// Initialise mock time
setMockNow(1700000000000); // fixed epoch

// ── Helpers ─────────────────────────────────────────────────────────────────

function freshState() {
  // Reset mock time to a fixed epoch for each test that needs determinism
  setMockNow(1700000000000);
  return WE.createEventsState();
}

function startFreshEvent(state, typeId, zone) {
  var ev = WE.createEvent(state, typeId, { zone: zone });
  WE.startEvent(state, ev);
  return ev;
}

// ────────────────────────────────────────────────────────────────────────────

suite('EVENT_CATALOG — structure', function() {

  test('EVENT_CATALOG is an object', function() {
    assert.strictEqual(typeof WE.EVENT_CATALOG, 'object');
    assert(WE.EVENT_CATALOG !== null);
  });

  test('EVENT_CATALOG has at least 15 events', function() {
    var count = Object.keys(WE.EVENT_CATALOG).length;
    assert(count >= 15, 'Expected >= 15 events, got ' + count);
  });

  test('All 4 categories are present', function() {
    var cats = {};
    Object.values(WE.EVENT_CATALOG).forEach(function(e) { cats[e.category] = true; });
    assert(cats['celestial'], 'Missing celestial category');
    assert(cats['nature'],    'Missing nature category');
    assert(cats['social'],    'Missing social category');
    assert(cats['mystery'],   'Missing mystery category');
  });

  test('Celestial events: meteor_shower exists', function() {
    assert(WE.EVENT_CATALOG.meteor_shower, 'meteor_shower missing');
    assert.strictEqual(WE.EVENT_CATALOG.meteor_shower.category, 'celestial');
  });

  test('Celestial events: aurora exists', function() {
    assert(WE.EVENT_CATALOG.aurora);
    assert.strictEqual(WE.EVENT_CATALOG.aurora.category, 'celestial');
  });

  test('Celestial events: solar_eclipse exists', function() {
    assert(WE.EVENT_CATALOG.solar_eclipse);
    assert.strictEqual(WE.EVENT_CATALOG.solar_eclipse.category, 'celestial');
  });

  test('Celestial events: blood_moon exists', function() {
    assert(WE.EVENT_CATALOG.blood_moon);
    assert.strictEqual(WE.EVENT_CATALOG.blood_moon.category, 'celestial');
  });

  test('Nature events: wild_bloom exists', function() {
    assert(WE.EVENT_CATALOG.wild_bloom);
    assert.strictEqual(WE.EVENT_CATALOG.wild_bloom.category, 'nature');
  });

  test('Nature events: creature_migration exists', function() {
    assert(WE.EVENT_CATALOG.creature_migration);
    assert.strictEqual(WE.EVENT_CATALOG.creature_migration.category, 'nature');
  });

  test('Nature events: great_storm exists', function() {
    assert(WE.EVENT_CATALOG.great_storm);
    assert.strictEqual(WE.EVENT_CATALOG.great_storm.category, 'nature');
  });

  test('Nature events: earthquake exists', function() {
    assert(WE.EVENT_CATALOG.earthquake);
    assert.strictEqual(WE.EVENT_CATALOG.earthquake.category, 'nature');
  });

  test('Social events: festival exists', function() {
    assert(WE.EVENT_CATALOG.festival);
    assert.strictEqual(WE.EVENT_CATALOG.festival.category, 'social');
  });

  test('Social events: market_day exists', function() {
    assert(WE.EVENT_CATALOG.market_day);
    assert.strictEqual(WE.EVENT_CATALOG.market_day.category, 'social');
  });

  test('Social events: tournament exists', function() {
    assert(WE.EVENT_CATALOG.tournament);
    assert.strictEqual(WE.EVENT_CATALOG.tournament.category, 'social');
  });

  test('Social events: storytelling_circle exists', function() {
    assert(WE.EVENT_CATALOG.storytelling_circle);
    assert.strictEqual(WE.EVENT_CATALOG.storytelling_circle.category, 'social');
  });

  test('Mystery events: ancient_ruins_appear exists', function() {
    assert(WE.EVENT_CATALOG.ancient_ruins_appear);
    assert.strictEqual(WE.EVENT_CATALOG.ancient_ruins_appear.category, 'mystery');
  });

  test('Mystery events: treasure_hunt exists', function() {
    assert(WE.EVENT_CATALOG.treasure_hunt);
    assert.strictEqual(WE.EVENT_CATALOG.treasure_hunt.category, 'mystery');
  });

  test('Mystery events: rift_surge exists', function() {
    assert(WE.EVENT_CATALOG.rift_surge);
    assert.strictEqual(WE.EVENT_CATALOG.rift_surge.category, 'mystery');
  });

  test('Every event has required fields', function() {
    var required = ['id', 'category', 'name', 'description', 'durationMinutes',
                    'zones', 'effects', 'rewards', 'contributionGoal',
                    'contributionUnit', 'rarity', 'cooldownHours', 'announceMessage'];
    Object.keys(WE.EVENT_CATALOG).forEach(function(key) {
      var ev = WE.EVENT_CATALOG[key];
      required.forEach(function(field) {
        assert(ev[field] !== undefined, key + ' missing field: ' + field);
      });
    });
  });

  test('Every event has at least one zone', function() {
    Object.keys(WE.EVENT_CATALOG).forEach(function(key) {
      var ev = WE.EVENT_CATALOG[key];
      assert(Array.isArray(ev.zones) && ev.zones.length >= 1, key + ' has no zones');
    });
  });

  test('Every event has at least one effect', function() {
    Object.keys(WE.EVENT_CATALOG).forEach(function(key) {
      var ev = WE.EVENT_CATALOG[key];
      assert(Array.isArray(ev.effects) && ev.effects.length >= 1, key + ' has no effects');
    });
  });

  test('Every event rewards object has participation and completion tiers', function() {
    Object.keys(WE.EVENT_CATALOG).forEach(function(key) {
      var ev = WE.EVENT_CATALOG[key];
      assert(ev.rewards.participation, key + ' missing participation reward');
      assert(ev.rewards.completion, key + ' missing completion reward');
    });
  });

  test('MAX_CONCURRENT_EVENTS is 3', function() {
    assert.strictEqual(WE.MAX_CONCURRENT_EVENTS, 3);
  });

  test('EVENT_COOLDOWN_HOURS is 4', function() {
    assert.strictEqual(WE.EVENT_COOLDOWN_HOURS, 4);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('createEventsState', function() {

  test('returns object with activeEvents array', function() {
    var s = WE.createEventsState();
    assert(Array.isArray(s.activeEvents));
    assert.strictEqual(s.activeEvents.length, 0);
  });

  test('returns object with eventHistory array', function() {
    var s = WE.createEventsState();
    assert(Array.isArray(s.eventHistory));
  });

  test('returns object with participants map', function() {
    var s = WE.createEventsState();
    assert.strictEqual(typeof s.participants, 'object');
  });

  test('returns object with contributions map', function() {
    var s = WE.createEventsState();
    assert.strictEqual(typeof s.contributions, 'object');
  });

  test('returns object with cooldowns map', function() {
    var s = WE.createEventsState();
    assert.strictEqual(typeof s.cooldowns, 'object');
  });

  test('returns object with upcomingEvents array', function() {
    var s = WE.createEventsState();
    assert(Array.isArray(s.upcomingEvents));
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('createEvent', function() {

  test('returns null for unknown event type', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'nonexistent_type');
    assert.strictEqual(ev, null);
  });

  test('returns event instance for valid type', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'meteor_shower');
    assert(ev !== null);
    assert.strictEqual(typeof ev, 'object');
  });

  test('event instance has instanceId', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'meteor_shower');
    assert(ev.instanceId, 'Missing instanceId');
  });

  test('event instance has correct typeId', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'aurora');
    assert.strictEqual(ev.typeId, 'aurora');
  });

  test('event instance has correct category', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'aurora');
    assert.strictEqual(ev.category, 'celestial');
  });

  test('event instance has pending status', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'festival');
    assert.strictEqual(ev.status, 'pending');
  });

  test('event instance defaults zone to first in template zones', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'meteor_shower');
    assert.strictEqual(ev.zone, WE.EVENT_CATALOG.meteor_shower.zones[0]);
  });

  test('event instance respects custom zone option', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'meteor_shower', { zone: 'wilds' });
    assert.strictEqual(ev.zone, 'wilds');
  });

  test('event instance has endTime > startTime', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'meteor_shower');
    assert(ev.endTime > ev.startTime, 'endTime should be after startTime');
  });

  test('sequential createEvent calls get distinct instanceIds', function() {
    var s = freshState();
    var e1 = WE.createEvent(s, 'meteor_shower');
    var e2 = WE.createEvent(s, 'aurora');
    assert(e1.instanceId !== e2.instanceId, 'instanceIds must be unique');
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('startEvent', function() {

  test('starts event successfully', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'meteor_shower');
    var result = WE.startEvent(s, ev);
    assert.strictEqual(result.success, true);
  });

  test('started event has active status', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'festival');
    WE.startEvent(s, ev);
    assert.strictEqual(ev.status, 'active');
  });

  test('started event appears in activeEvents', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'festival');
    WE.startEvent(s, ev);
    assert.strictEqual(s.activeEvents.length, 1);
    assert.strictEqual(s.activeEvents[0].instanceId, ev.instanceId);
  });

  test('fails when MAX_CONCURRENT_EVENTS reached', function() {
    var s = freshState();
    WE.startEvent(s, WE.createEvent(s, 'meteor_shower'));
    WE.startEvent(s, WE.createEvent(s, 'aurora'));
    WE.startEvent(s, WE.createEvent(s, 'wild_bloom'));
    // 4th should fail
    var r = WE.startEvent(s, WE.createEvent(s, 'festival'));
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'max_concurrent_events_reached');
  });

  test('fails when same type is already active', function() {
    var s = freshState();
    WE.startEvent(s, WE.createEvent(s, 'festival'));
    var r = WE.startEvent(s, WE.createEvent(s, 'festival'));
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'event_already_active');
  });

  test('fails with null event', function() {
    var s = freshState();
    var r = WE.startEvent(s, null);
    assert.strictEqual(r.success, false);
  });

  test('fails when on cooldown', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'meteor_shower');
    WE.startEvent(s, ev);
    WE.endEvent(s, ev.instanceId);
    // Cooldown is now active; try to start again immediately
    var ev2 = WE.createEvent(s, 'meteor_shower');
    var r = WE.startEvent(s, ev2);
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'event_on_cooldown');
  });

  test('initialises participant list for event', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'festival');
    WE.startEvent(s, ev);
    assert(Array.isArray(s.participants[ev.instanceId]));
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('endEvent', function() {

  test('ends active event successfully', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'meteor_shower', 'nexus');
    var r = WE.endEvent(s, ev.instanceId);
    assert.strictEqual(r.success, true);
  });

  test('ended event is removed from activeEvents', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'meteor_shower', 'nexus');
    WE.endEvent(s, ev.instanceId);
    assert.strictEqual(s.activeEvents.length, 0);
  });

  test('ended event is added to eventHistory', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'meteor_shower', 'nexus');
    WE.endEvent(s, ev.instanceId);
    assert.strictEqual(s.eventHistory.length, 1);
    assert.strictEqual(s.eventHistory[0].instanceId, ev.instanceId);
  });

  test('event status set to completed when reason=completed', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.endEvent(s, ev.instanceId, { reason: 'completed' });
    assert.strictEqual(ev.status, 'completed');
    assert.strictEqual(ev.completed, true);
  });

  test('event status set to expired when reason=expired', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.endEvent(s, ev.instanceId, { reason: 'expired' });
    assert.strictEqual(ev.status, 'expired');
    assert.strictEqual(ev.completed, false);
  });

  test('sets cooldown on event type after ending', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'blood_moon', 'nexus');
    WE.endEvent(s, ev.instanceId);
    assert(s.cooldowns['blood_moon'] > _mockNow, 'Cooldown not set');
  });

  test('returns error when instanceId not found', function() {
    var s = freshState();
    var r = WE.endEvent(s, 'nonexistent_instance_id');
    assert.strictEqual(r.success, false);
  });

  test('default reason is completed', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'aurora', 'nexus');
    WE.endEvent(s, ev.instanceId);
    assert.strictEqual(ev.status, 'completed');
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('getActiveEvents', function() {

  test('returns empty array when no events', function() {
    var s = freshState();
    assert.deepStrictEqual(WE.getActiveEvents(s), []);
  });

  test('returns active events', function() {
    var s = freshState();
    startFreshEvent(s, 'festival', 'nexus');
    assert.strictEqual(WE.getActiveEvents(s).length, 1);
  });

  test('auto-expires events past their endTime', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'earthquake', 'nexus');
    // Advance time past event end
    advanceMockTime(ev.durationMinutes * 60 * 1000 + 10000);
    var active = WE.getActiveEvents(s);
    assert.strictEqual(active.length, 0);
    // Should be in history
    assert.strictEqual(s.eventHistory.length, 1);
  });

  test('returns a copy not the internal array', function() {
    var s = freshState();
    startFreshEvent(s, 'festival', 'nexus');
    var result = WE.getActiveEvents(s);
    result.pop();
    assert.strictEqual(WE.getActiveEvents(s).length, 1);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('getUpcomingEvents', function() {

  test('returns empty array when no upcoming events', function() {
    var s = freshState();
    assert.deepStrictEqual(WE.getUpcomingEvents(s), []);
  });

  test('returns scheduled upcoming events', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'meteor_shower', { startTime: _mockNow + 60000 });
    s.upcomingEvents.push(ev);
    var upcoming = WE.getUpcomingEvents(s);
    assert.strictEqual(upcoming.length, 1);
  });

  test('returns a copy not the internal array', function() {
    var s = freshState();
    s.upcomingEvents.push({ typeId: 'aurora', instanceId: 'u1' });
    var result = WE.getUpcomingEvents(s);
    result.pop();
    assert.strictEqual(WE.getUpcomingEvents(s).length, 1);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('joinEvent / leaveEvent / getParticipants', function() {

  test('player joins event successfully', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    var r = WE.joinEvent(s, ev.instanceId, 'alice');
    assert.strictEqual(r.success, true);
  });

  test('joined player appears in participants', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.joinEvent(s, ev.instanceId, 'alice');
    var participants = WE.getParticipants(s, ev.instanceId);
    assert(participants.indexOf('alice') !== -1);
  });

  test('multiple players can join', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.joinEvent(s, ev.instanceId, 'alice');
    WE.joinEvent(s, ev.instanceId, 'bob');
    WE.joinEvent(s, ev.instanceId, 'charlie');
    assert.strictEqual(WE.getParticipants(s, ev.instanceId).length, 3);
  });

  test('joining non-existent event fails', function() {
    var s = freshState();
    var r = WE.joinEvent(s, 'bad_id', 'alice');
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'event_not_found');
  });

  test('joining same event twice fails', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.joinEvent(s, ev.instanceId, 'alice');
    var r = WE.joinEvent(s, ev.instanceId, 'alice');
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'already_joined');
  });

  test('joining full event fails', function() {
    var s = freshState();
    // blood_moon has maxParticipants=50; let's use tournament (maxParticipants=64)
    // Use a custom event type with small capacity by testing blood_moon with 50 already in
    var ev = startFreshEvent(s, 'blood_moon', 'nexus');
    for (var i = 0; i < ev.maxParticipants; i++) {
      WE.joinEvent(s, ev.instanceId, 'user_' + i);
    }
    var r = WE.joinEvent(s, ev.instanceId, 'overflow_user');
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'event_full');
  });

  test('player leaves event successfully', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.joinEvent(s, ev.instanceId, 'alice');
    var r = WE.leaveEvent(s, ev.instanceId, 'alice');
    assert.strictEqual(r.success, true);
  });

  test('player removed from participants after leaving', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.joinEvent(s, ev.instanceId, 'alice');
    WE.leaveEvent(s, ev.instanceId, 'alice');
    var participants = WE.getParticipants(s, ev.instanceId);
    assert(participants.indexOf('alice') === -1);
  });

  test('leaving event player is not in fails', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    var r = WE.leaveEvent(s, ev.instanceId, 'nobody');
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'not_joined');
  });

  test('leaving non-existent event fails', function() {
    var s = freshState();
    var r = WE.leaveEvent(s, 'bad_id', 'alice');
    assert.strictEqual(r.success, false);
  });

  test('getParticipants returns empty array for unknown event', function() {
    var s = freshState();
    var participants = WE.getParticipants(s, 'unknown');
    assert.deepStrictEqual(participants, []);
  });

  test('getParticipants returns a copy', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.joinEvent(s, ev.instanceId, 'alice');
    var p = WE.getParticipants(s, ev.instanceId);
    p.pop();
    assert.strictEqual(WE.getParticipants(s, ev.instanceId).length, 1);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('getEventRewards', function() {

  test('returns full rewards for valid type', function() {
    var r = WE.getEventRewards('meteor_shower');
    assert(r !== null);
    assert(r.participation);
    assert(r.completion);
  });

  test('returns null for unknown type', function() {
    var r = WE.getEventRewards('nonexistent');
    assert.strictEqual(r, null);
  });

  test('returns participation tier when specified', function() {
    var r = WE.getEventRewards('festival', 'participation');
    assert(r !== null);
    assert(r.sparks !== undefined);
  });

  test('returns completion tier when specified', function() {
    var r = WE.getEventRewards('festival', 'completion');
    assert(r !== null);
    assert(r.sparks !== undefined);
  });

  test('completion rewards have higher sparks than participation', function() {
    var participation = WE.getEventRewards('meteor_shower', 'participation');
    var completion = WE.getEventRewards('meteor_shower', 'completion');
    assert(completion.sparks > participation.sparks, 'Completion should award more sparks');
  });

  test('returns null for invalid tier', function() {
    var r = WE.getEventRewards('festival', 'nonexistent_tier');
    assert.strictEqual(r, null);
  });

  test('rift_surge has high completion sparks (>=50)', function() {
    var r = WE.getEventRewards('rift_surge', 'completion');
    assert(r.sparks >= 50, 'rift_surge completion should give >=50 sparks');
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('getEventProgress', function() {

  test('returns null for unknown instance', function() {
    var s = freshState();
    var p = WE.getEventProgress(s, 'bad_id');
    assert.strictEqual(p, null);
  });

  test('returns progress object for active event', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'meteor_shower', 'nexus');
    var p = WE.getEventProgress(s, ev.instanceId);
    assert(p !== null);
    assert.strictEqual(typeof p.current, 'number');
    assert.strictEqual(typeof p.goal, 'number');
    assert.strictEqual(typeof p.percent, 'number');
  });

  test('initial progress is 0', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'meteor_shower', 'nexus');
    var p = WE.getEventProgress(s, ev.instanceId);
    assert.strictEqual(p.current, 0);
    assert.strictEqual(p.percent, 0);
  });

  test('percent is capped at 100', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'meteor_shower', 'nexus');
    // Contribute way more than goal
    WE.contributeToEvent(s, ev.instanceId, 'alice', 9999);
    var p = WE.getEventProgress(s, ev.instanceId);
    assert.strictEqual(p.percent, 100);
  });

  test('returns progress for historical event', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'aurora', 'nexus');
    WE.contributeToEvent(s, ev.instanceId, 'alice', 10);
    WE.endEvent(s, ev.instanceId, { reason: 'completed' });
    var p = WE.getEventProgress(s, ev.instanceId);
    assert(p !== null);
    assert.strictEqual(p.current, 10);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('contributeToEvent', function() {

  test('valid contribution succeeds', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'meteor_shower', 'nexus');
    WE.joinEvent(s, ev.instanceId, 'alice');
    var r = WE.contributeToEvent(s, ev.instanceId, 'alice', 5);
    assert.strictEqual(r.success, true);
  });

  test('non-participant is auto-joined on contribution', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.contributeToEvent(s, ev.instanceId, 'newuser', 10);
    var participants = WE.getParticipants(s, ev.instanceId);
    assert(participants.indexOf('newuser') !== -1);
  });

  test('contribution increments totalContributions', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'meteor_shower', 'nexus');
    WE.contributeToEvent(s, ev.instanceId, 'alice', 5);
    WE.contributeToEvent(s, ev.instanceId, 'bob', 10);
    assert.strictEqual(ev.totalContributions, 15);
  });

  test('multiple contributions from same user accumulate', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.contributeToEvent(s, ev.instanceId, 'alice', 5);
    WE.contributeToEvent(s, ev.instanceId, 'alice', 3);
    assert.strictEqual(s.contributions[ev.instanceId]['alice'], 8);
  });

  test('returns goalReached=true when goal is met', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'aurora', 'nexus'); // goal = 30
    var r = WE.contributeToEvent(s, ev.instanceId, 'alice', 30);
    assert.strictEqual(r.goalReached, true);
  });

  test('returns goalReached=false before goal', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'aurora', 'nexus'); // goal = 30
    var r = WE.contributeToEvent(s, ev.instanceId, 'alice', 5);
    assert.strictEqual(r.goalReached, false);
  });

  test('fails with invalid amount (0)', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    var r = WE.contributeToEvent(s, ev.instanceId, 'alice', 0);
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'invalid_amount');
  });

  test('fails with negative amount', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    var r = WE.contributeToEvent(s, ev.instanceId, 'alice', -5);
    assert.strictEqual(r.success, false);
  });

  test('fails for non-existent event', function() {
    var s = freshState();
    var r = WE.contributeToEvent(s, 'bad_id', 'alice', 5);
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.reason, 'event_not_found');
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('scheduleRandomEvent', function() {

  test('returns a schedule object', function() {
    var result = WE.scheduleRandomEvent(1700000000000, 42);
    assert(result !== null);
    assert.strictEqual(typeof result.typeId, 'string');
    assert.strictEqual(typeof result.zone, 'string');
    assert.strictEqual(typeof result.scheduledTime, 'number');
  });

  test('returned typeId exists in EVENT_CATALOG', function() {
    var result = WE.scheduleRandomEvent(1700000000000, 42);
    assert(WE.EVENT_CATALOG[result.typeId], 'typeId must be in EVENT_CATALOG');
  });

  test('returned zone is valid for the event type', function() {
    var result = WE.scheduleRandomEvent(1700000000000, 42);
    var template = WE.EVENT_CATALOG[result.typeId];
    assert(template.zones.indexOf(result.zone) !== -1, 'zone must be in event zones');
  });

  test('scheduledTime is in the future relative to worldTime', function() {
    var worldTime = 1700000000000;
    var result = WE.scheduleRandomEvent(worldTime, 42);
    assert(result.scheduledTime > worldTime, 'scheduledTime should be in the future');
  });

  test('is deterministic — same seed and time returns same result', function() {
    var r1 = WE.scheduleRandomEvent(1700000000000, 99);
    var r2 = WE.scheduleRandomEvent(1700000000000, 99);
    assert.strictEqual(r1.typeId, r2.typeId);
    assert.strictEqual(r1.zone, r2.zone);
    assert.strictEqual(r1.scheduledTime, r2.scheduledTime);
  });

  test('different seeds produce potentially different results', function() {
    // We can't guarantee different but we at least verify it runs both
    var r1 = WE.scheduleRandomEvent(1700000000000, 1);
    var r2 = WE.scheduleRandomEvent(1700000000000, 999999);
    assert(r1 !== null);
    assert(r2 !== null);
  });

  test('respects cooldowns when state provided', function() {
    var s = freshState();
    // Put all events on cooldown except one
    var keys = Object.keys(WE.EVENT_CATALOG);
    var targetType = 'meteor_shower';
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== targetType) {
        s.cooldowns[keys[i]] = _mockNow + 99999999;
      }
    }
    var result = WE.scheduleRandomEvent(_mockNow, 42, s);
    if (result !== null) {
      assert.strictEqual(result.typeId, targetType);
    }
    // null is also acceptable if meteor_shower is being filtered
  });

  test('returns null when all events are on cooldown', function() {
    var s = freshState();
    var keys = Object.keys(WE.EVENT_CATALOG);
    for (var i = 0; i < keys.length; i++) {
      s.cooldowns[keys[i]] = _mockNow + 99999999;
    }
    var result = WE.scheduleRandomEvent(_mockNow, 42, s);
    assert.strictEqual(result, null);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('getEventsByZone', function() {

  test('returns empty array for zone with no events', function() {
    var s = freshState();
    var r = WE.getEventsByZone(s, 'nexus');
    assert.deepStrictEqual(r, []);
  });

  test('returns events in the given zone', function() {
    var s = freshState();
    startFreshEvent(s, 'festival', 'nexus');
    var r = WE.getEventsByZone(s, 'nexus');
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].zone, 'nexus');
  });

  test('does not return events in other zones', function() {
    var s = freshState();
    startFreshEvent(s, 'festival', 'nexus');
    var r = WE.getEventsByZone(s, 'wilds');
    assert.strictEqual(r.length, 0);
  });

  test('returns multiple events in the same zone', function() {
    var s = freshState();
    startFreshEvent(s, 'festival', 'nexus');
    startFreshEvent(s, 'meteor_shower', 'nexus');
    var r = WE.getEventsByZone(s, 'nexus');
    assert.strictEqual(r.length, 2);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('getEventHistory', function() {

  test('returns empty array when no history', function() {
    var s = freshState();
    assert.deepStrictEqual(WE.getEventHistory(s), []);
  });

  test('returns ended events', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    WE.endEvent(s, ev.instanceId);
    var history = WE.getEventHistory(s);
    assert.strictEqual(history.length, 1);
  });

  test('filters by category', function() {
    var s = freshState();
    var ev1 = startFreshEvent(s, 'festival', 'nexus');
    WE.endEvent(s, ev1.instanceId);
    var ev2 = startFreshEvent(s, 'meteor_shower', 'nexus');
    WE.endEvent(s, ev2.instanceId);

    var celestial = WE.getEventHistory(s, { category: 'celestial' });
    assert.strictEqual(celestial.length, 1);
    assert.strictEqual(celestial[0].typeId, 'meteor_shower');
  });

  test('filters by typeId', function() {
    var s = freshState();
    var ev1 = startFreshEvent(s, 'festival', 'nexus');
    WE.endEvent(s, ev1.instanceId);
    // Advance past festival cooldownHours (24h)
    advanceMockTime(25 * 60 * 60 * 1000);
    var ev2 = WE.createEvent(s, 'festival', { zone: 'nexus' });
    var r2 = WE.startEvent(s, ev2);
    assert.strictEqual(r2.success, true, 'Should start after cooldown: ' + r2.reason);
    WE.endEvent(s, ev2.instanceId, { reason: 'completed' });

    var r = WE.getEventHistory(s, { typeId: 'festival' });
    assert.strictEqual(r.length, 2);
  });

  test('limits results with limit option', function() {
    var s = freshState();
    var types = ['festival', 'meteor_shower', 'aurora'];
    for (var i = 0; i < types.length; i++) {
      var ev = startFreshEvent(s, types[i], 'nexus');
      WE.endEvent(s, ev.instanceId);
    }
    var r = WE.getEventHistory(s, { limit: 2 });
    assert.strictEqual(r.length, 2);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('formatEventAnnouncement', function() {

  test('formats announcement from type id string', function() {
    var msg = WE.formatEventAnnouncement('meteor_shower');
    assert.strictEqual(typeof msg, 'string');
    assert(msg.length > 0);
    assert(msg.indexOf('[EVENT]') !== -1);
  });

  test('formats announcement from event instance', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    var msg = WE.formatEventAnnouncement(ev);
    assert(typeof msg === 'string' && msg.length > 0);
    assert(msg.indexOf('[EVENT]') !== -1);
  });

  test('includes zone in instance announcement', function() {
    var s = freshState();
    var ev = startFreshEvent(s, 'festival', 'nexus');
    var msg = WE.formatEventAnnouncement(ev);
    assert(msg.indexOf('nexus') !== -1, 'Announcement should include zone');
  });

  test('returns empty string for null input', function() {
    var msg = WE.formatEventAnnouncement(null);
    assert.strictEqual(msg, '');
  });

  test('returns unknown event message for bad type id', function() {
    var msg = WE.formatEventAnnouncement('nonexistent_event');
    assert(msg.indexOf('[EVENT]') !== -1);
    assert(msg.indexOf('Unknown') !== -1 || msg.length > 7);
  });

  test('blood_moon announcement mentions warriors', function() {
    var msg = WE.formatEventAnnouncement('blood_moon');
    assert(msg.toLowerCase().indexOf('warrior') !== -1 ||
           msg.toLowerCase().indexOf('blood') !== -1,
           'blood_moon announcement should mention blood or warriors');
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('getEventEffects', function() {

  test('returns array for valid type', function() {
    var effects = WE.getEventEffects('meteor_shower');
    assert(Array.isArray(effects));
    assert(effects.length >= 1);
  });

  test('returns null for unknown type', function() {
    var effects = WE.getEventEffects('nonexistent');
    assert.strictEqual(effects, null);
  });

  test('returns a copy not the original array', function() {
    var effects = WE.getEventEffects('aurora');
    var original = WE.EVENT_CATALOG.aurora.effects;
    effects.pop();
    assert.strictEqual(WE.getEventEffects('aurora').length, original.length);
  });

  test('effects have type and value fields', function() {
    var effects = WE.getEventEffects('blood_moon');
    effects.forEach(function(e) {
      assert(e.type !== undefined, 'Effect missing type');
      assert(e.value !== undefined, 'Effect missing value');
    });
  });

  test('rift_surge has magic_amplify effect', function() {
    var effects = WE.getEventEffects('rift_surge');
    var found = effects.some(function(e) { return e.type === 'magic_amplify'; });
    assert(found, 'rift_surge should have magic_amplify effect');
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('Category constants', function() {

  test('CATEGORY_CELESTIAL is "celestial"', function() {
    assert.strictEqual(WE.CATEGORY_CELESTIAL, 'celestial');
  });

  test('CATEGORY_NATURE is "nature"', function() {
    assert.strictEqual(WE.CATEGORY_NATURE, 'nature');
  });

  test('CATEGORY_SOCIAL is "social"', function() {
    assert.strictEqual(WE.CATEGORY_SOCIAL, 'social');
  });

  test('CATEGORY_MYSTERY is "mystery"', function() {
    assert.strictEqual(WE.CATEGORY_MYSTERY, 'mystery');
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('Integration scenarios', function() {

  test('Full event lifecycle: create -> start -> contribute -> end', function() {
    var s = freshState();
    var ev = WE.createEvent(s, 'treasure_hunt', { zone: 'wilds' });
    assert.strictEqual(ev.status, 'pending');

    var r = WE.startEvent(s, ev);
    assert.strictEqual(r.success, true);
    assert.strictEqual(ev.status, 'active');

    WE.joinEvent(s, ev.instanceId, 'explorer1');
    WE.joinEvent(s, ev.instanceId, 'explorer2');

    WE.contributeToEvent(s, ev.instanceId, 'explorer1', 5);
    WE.contributeToEvent(s, ev.instanceId, 'explorer2', 5);

    var progress = WE.getEventProgress(s, ev.instanceId);
    assert.strictEqual(progress.current, 10);

    WE.endEvent(s, ev.instanceId, { reason: 'completed' });
    assert.strictEqual(ev.completed, true);
    assert.strictEqual(WE.getActiveEvents(s).length, 0);
  });

  test('After cooldown expires, same event type can run again', function() {
    var s = freshState();
    var ev1 = startFreshEvent(s, 'market_day', 'nexus');
    WE.endEvent(s, ev1.instanceId);

    // Advance past cooldown
    var cooldownMs = WE.EVENT_CATALOG.market_day.cooldownHours * 60 * 60 * 1000;
    advanceMockTime(cooldownMs + 1000);

    var ev2 = WE.createEvent(s, 'market_day', { zone: 'nexus' });
    var r = WE.startEvent(s, ev2);
    assert.strictEqual(r.success, true, 'Should be able to start after cooldown expires');
  });

  test('Running three concurrent events then failing on fourth', function() {
    var s = freshState();
    var r1 = WE.startEvent(s, WE.createEvent(s, 'festival', 'nexus'));
    var r2 = WE.startEvent(s, WE.createEvent(s, 'meteor_shower', 'nexus'));
    var r3 = WE.startEvent(s, WE.createEvent(s, 'wild_bloom', 'gardens'));
    var r4 = WE.startEvent(s, WE.createEvent(s, 'earthquake', 'nexus'));

    assert.strictEqual(r1.success, true);
    assert.strictEqual(r2.success, true);
    assert.strictEqual(r3.success, true);
    assert.strictEqual(r4.success, false);
    assert.strictEqual(r4.reason, 'max_concurrent_events_reached');
  });

  test('Zone query returns correct events', function() {
    var s = freshState();
    startFreshEvent(s, 'festival', 'agora');
    startFreshEvent(s, 'storytelling_circle', 'athenaeum');

    assert.strictEqual(WE.getEventsByZone(s, 'agora').length, 1);
    assert.strictEqual(WE.getEventsByZone(s, 'athenaeum').length, 1);
    assert.strictEqual(WE.getEventsByZone(s, 'wilds').length, 0);
  });

  test('History accumulates events in order', function() {
    var s = freshState();
    var ev1 = startFreshEvent(s, 'festival', 'nexus');
    WE.endEvent(s, ev1.instanceId);

    var ev2 = startFreshEvent(s, 'aurora', 'nexus');
    WE.endEvent(s, ev2.instanceId);

    var history = WE.getEventHistory(s);
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].typeId, 'festival');
    assert.strictEqual(history[1].typeId, 'aurora');
  });
});

// ────────────────────────────────────────────────────────────────────────────

var passed = report();
process.exit(passed ? 0 : 1);
