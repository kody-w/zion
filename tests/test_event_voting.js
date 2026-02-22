// test_event_voting.js — Participatory Event Voting System Tests
// 130+ tests covering catalog, event creation, voting, tallying, effects, formatting, edge cases
const { test, suite, report, assert } = require('./test_runner');
const EV = require('../src/js/event_voting');

// ============================================================================
// HELPERS
// ============================================================================

function freshState() {
  return EV.createEventVotingState();
}

/**
 * Start an event, return { state, event }
 */
function startFresh(eventId, startTime) {
  var state = freshState();
  return EV.startEvent(state, eventId, startTime || 1000);
}

/**
 * Start an event and have N players vote for a given option.
 */
function voteN(state, instanceId, optionId, n, prefix) {
  prefix = prefix || 'player';
  for (var i = 0; i < n; i++) {
    var r = EV.castVote(state, instanceId, prefix + i, optionId);
    if (!r.success) { throw new Error('castVote failed: ' + r.message); }
    state = r.state;
  }
  return state;
}

// ============================================================================
suite('EventVoting — VOTEABLE_EVENTS catalog', function() {

  test('VOTEABLE_EVENTS is an object', function() {
    assert.strictEqual(typeof EV.VOTEABLE_EVENTS, 'object');
    assert(EV.VOTEABLE_EVENTS !== null);
  });

  test('VOTEABLE_EVENTS has exactly 10 events', function() {
    var keys = Object.keys(EV.VOTEABLE_EVENTS);
    assert.strictEqual(keys.length, 10, 'Expected 10 events, got ' + keys.length);
  });

  test('All 10 expected events exist', function() {
    var expected = [
      'harvest_festival', 'storm_approaching', 'merchant_caravan',
      'aurora_borealis', 'arena_tournament', 'knowledge_symposium',
      'art_exhibition', 'migration_season', 'full_moon', 'founders_day'
    ];
    expected.forEach(function(id) {
      assert(EV.VOTEABLE_EVENTS[id], 'Missing event: ' + id);
    });
  });

  test('Each event has id, title, description, options', function() {
    Object.values(EV.VOTEABLE_EVENTS).forEach(function(ev) {
      assert(typeof ev.id          === 'string' && ev.id.length > 0,          ev.id + ': missing id');
      assert(typeof ev.title       === 'string' && ev.title.length > 0,       ev.id + ': missing title');
      assert(typeof ev.description === 'string' && ev.description.length > 0, ev.id + ': missing description');
      assert(Array.isArray(ev.options) && ev.options.length > 0,              ev.id + ': missing options');
    });
  });

  test('Each event has exactly 3 options', function() {
    Object.values(EV.VOTEABLE_EVENTS).forEach(function(ev) {
      assert.strictEqual(ev.options.length, 3, ev.id + ' should have exactly 3 options');
    });
  });

  test('Each option has id, label, desc, effect', function() {
    Object.values(EV.VOTEABLE_EVENTS).forEach(function(ev) {
      ev.options.forEach(function(opt) {
        assert(typeof opt.id     === 'string' && opt.id.length > 0,     ev.id + '.' + opt.id + ': missing opt.id');
        assert(typeof opt.label  === 'string' && opt.label.length > 0,  ev.id + '.' + opt.id + ': missing opt.label');
        assert(typeof opt.desc   === 'string' && opt.desc.length > 0,   ev.id + '.' + opt.id + ': missing opt.desc');
        assert(typeof opt.effect === 'object' && opt.effect !== null,   ev.id + '.' + opt.id + ': missing opt.effect');
      });
    });
  });

  test('Each effect has a bonus field', function() {
    Object.values(EV.VOTEABLE_EVENTS).forEach(function(ev) {
      ev.options.forEach(function(opt) {
        assert(typeof opt.effect.bonus === 'string', ev.id + '.' + opt.id + ': effect.bonus must be string');
      });
    });
  });

  test('Option ids are unique within each event', function() {
    Object.values(EV.VOTEABLE_EVENTS).forEach(function(ev) {
      var ids = ev.options.map(function(o) { return o.id; });
      var unique = new Set(ids);
      assert.strictEqual(unique.size, ids.length, ev.id + ': duplicate option ids');
    });
  });

  test('harvest_festival zone is gardens', function() {
    assert.strictEqual(EV.VOTEABLE_EVENTS.harvest_festival.zone, 'gardens');
  });

  test('harvest_festival options are feast, market, preserve', function() {
    var ids = EV.VOTEABLE_EVENTS.harvest_festival.options.map(function(o) { return o.id; });
    assert.deepStrictEqual(ids, ['feast', 'market', 'preserve']);
  });

  test('harvest_festival feast effect has cooking_xp bonus and multiplier 1.2', function() {
    var feast = EV.VOTEABLE_EVENTS.harvest_festival.options[0];
    assert.strictEqual(feast.effect.bonus, 'cooking_xp');
    assert.strictEqual(feast.effect.multiplier, 1.2);
    assert.strictEqual(feast.effect.duration, 86400);
  });

  test('harvest_festival preserve effect gives bread qty 5', function() {
    var preserve = EV.VOTEABLE_EVENTS.harvest_festival.options[2];
    assert.strictEqual(preserve.effect.bonus, 'give_item');
    assert.strictEqual(preserve.effect.item, 'bread');
    assert.strictEqual(preserve.effect.qty, 5);
  });

  test('aurora_borealis zone is null (world-wide event)', function() {
    assert.strictEqual(EV.VOTEABLE_EVENTS.aurora_borealis.zone, null);
  });

  test('aurora_borealis stargaze effect multiplier is 1.5', function() {
    var stargaze = EV.VOTEABLE_EVENTS.aurora_borealis.options[0];
    assert.strictEqual(stargaze.effect.multiplier, 1.5);
  });

  test('full_moon zone is null', function() {
    assert.strictEqual(EV.VOTEABLE_EVENTS.full_moon.zone, null);
  });

  test('arena_tournament zone is arena', function() {
    assert.strictEqual(EV.VOTEABLE_EVENTS.arena_tournament.zone, 'arena');
  });

  test('arena_tournament prizes are [100, 50, 25] for each option', function() {
    EV.VOTEABLE_EVENTS.arena_tournament.options.forEach(function(opt) {
      assert.deepStrictEqual(opt.effect.prizes, [100, 50, 25]);
    });
  });

  test('migration_season hunt gives silk and feather', function() {
    var hunt = EV.VOTEABLE_EVENTS.migration_season.options[1];
    assert.strictEqual(hunt.effect.bonus, 'give_items');
    var items = hunt.effect.items;
    assert(Array.isArray(items));
    assert.strictEqual(items[0].item, 'silk');
    assert.strictEqual(items[1].item, 'feather');
  });

  test('merchant_caravan welcome discount amount is 0.05', function() {
    var welcome = EV.VOTEABLE_EVENTS.merchant_caravan.options[2];
    assert.strictEqual(welcome.effect.amount, 0.05);
  });

  test('founders_day zone is nexus', function() {
    assert.strictEqual(EV.VOTEABLE_EVENTS.founders_day.zone, 'nexus');
  });

  test('knowledge_symposium zone is athenaeum', function() {
    assert.strictEqual(EV.VOTEABLE_EVENTS.knowledge_symposium.zone, 'athenaeum');
  });

  test('art_exhibition zone is studio', function() {
    assert.strictEqual(EV.VOTEABLE_EVENTS.art_exhibition.zone, 'studio');
  });

  test('storm_approaching brave effect multiplier is 2.0', function() {
    var brave = EV.VOTEABLE_EVENTS.storm_approaching.options[1];
    assert.strictEqual(brave.effect.multiplier, 2.0);
    assert.strictEqual(brave.effect.duration, 43200);
  });

  test('VOTING_PERIOD_TICKS is 300', function() {
    assert.strictEqual(EV.VOTING_PERIOD_TICKS, 300);
  });

  test('EVENT_STATUS_VOTING and EVENT_STATUS_CLOSED are defined strings', function() {
    assert.strictEqual(typeof EV.EVENT_STATUS_VOTING, 'string');
    assert.strictEqual(typeof EV.EVENT_STATUS_CLOSED, 'string');
    assert(EV.EVENT_STATUS_VOTING !== EV.EVENT_STATUS_CLOSED);
  });

});

// ============================================================================
suite('EventVoting — createEventVotingState', function() {

  test('returns an object', function() {
    var s = freshState();
    assert.strictEqual(typeof s, 'object');
    assert(s !== null);
  });

  test('activeEvents is empty array', function() {
    var s = freshState();
    assert(Array.isArray(s.activeEvents));
    assert.strictEqual(s.activeEvents.length, 0);
  });

  test('votingHistory is empty array', function() {
    var s = freshState();
    assert(Array.isArray(s.votingHistory));
    assert.strictEqual(s.votingHistory.length, 0);
  });

  test('activeEffects is empty array', function() {
    var s = freshState();
    assert(Array.isArray(s.activeEffects));
    assert.strictEqual(s.activeEffects.length, 0);
  });

  test('nextEventId is 1', function() {
    var s = freshState();
    assert.strictEqual(s.nextEventId, 1);
  });

  test('two fresh states are independent', function() {
    var s1 = freshState();
    var s2 = freshState();
    s1.activeEvents.push('test');
    assert.strictEqual(s2.activeEvents.length, 0, 'states should be independent');
  });

});

// ============================================================================
suite('EventVoting — startEvent', function() {

  test('returns state and event on success', function() {
    var r = startFresh('harvest_festival', 1000);
    assert(r.state);
    assert(r.event);
    assert(!r.error);
  });

  test('event has correct eventId', function() {
    var r = startFresh('harvest_festival', 1000);
    assert.strictEqual(r.event.eventId, 'harvest_festival');
  });

  test('event instanceId is 1 for first event', function() {
    var r = startFresh('harvest_festival', 1000);
    assert.strictEqual(r.event.instanceId, 1);
  });

  test('second event has instanceId 2', function() {
    var r1 = startFresh('harvest_festival', 1000);
    var r2 = EV.startEvent(r1.state, 'storm_approaching', 1100);
    assert.strictEqual(r2.event.instanceId, 2);
  });

  test('state nextEventId increments', function() {
    var r = startFresh('harvest_festival', 1000);
    assert.strictEqual(r.state.nextEventId, 2);
  });

  test('event status is voting', function() {
    var r = startFresh('harvest_festival', 1000);
    assert.strictEqual(r.event.status, EV.EVENT_STATUS_VOTING);
  });

  test('event startTime is set correctly', function() {
    var r = startFresh('harvest_festival', 1234);
    assert.strictEqual(r.event.startTime, 1234);
  });

  test('event votes starts empty', function() {
    var r = startFresh('harvest_festival', 1000);
    assert.strictEqual(typeof r.event.votes, 'object');
    assert.strictEqual(Object.keys(r.event.votes).length, 0);
  });

  test('event options come from catalog', function() {
    var r = startFresh('harvest_festival', 1000);
    assert.strictEqual(r.event.options.length, 3);
    assert.strictEqual(r.event.options[0].id, 'feast');
  });

  test('event is added to state.activeEvents', function() {
    var r = startFresh('harvest_festival', 1000);
    assert.strictEqual(r.state.activeEvents.length, 1);
  });

  test('two events appear in activeEvents', function() {
    var r1 = startFresh('harvest_festival', 1000);
    var r2 = EV.startEvent(r1.state, 'full_moon', 1100);
    assert.strictEqual(r2.state.activeEvents.length, 2);
  });

  test('unknown event returns error', function() {
    var r = EV.startEvent(freshState(), 'nonexistent_event', 1000);
    assert(r.error);
    assert(!r.event);
  });

  test('event title matches catalog', function() {
    var r = startFresh('founders_day', 1000);
    assert.strictEqual(r.event.title, 'Founders Day');
  });

  test('event zone matches catalog', function() {
    var r = startFresh('harvest_festival', 1000);
    assert.strictEqual(r.event.zone, 'gardens');
  });

  test('null-zone event has zone null', function() {
    var r = startFresh('aurora_borealis', 1000);
    assert.strictEqual(r.event.zone, null);
  });

  test('original state is not mutated', function() {
    var s = freshState();
    EV.startEvent(s, 'harvest_festival', 1000);
    assert.strictEqual(s.activeEvents.length, 0, 'original state should not be mutated');
    assert.strictEqual(s.nextEventId, 1);
  });

});

// ============================================================================
suite('EventVoting — castVote', function() {

  test('returns success true on valid vote', function() {
    var r = startFresh('harvest_festival', 1000);
    var v = EV.castVote(r.state, 1, 'alice', 'feast');
    assert.strictEqual(v.success, true);
  });

  test('message mentions the option label', function() {
    var r = startFresh('harvest_festival', 1000);
    var v = EV.castVote(r.state, 1, 'alice', 'feast');
    assert(v.message.toLowerCase().indexOf('grand feast') !== -1 ||
           v.message.indexOf('feast') !== -1, 'message should mention option');
  });

  test('vote is recorded in event.votes', function() {
    var r = startFresh('harvest_festival', 1000);
    var v = EV.castVote(r.state, 1, 'alice', 'feast');
    var ev = v.state.activeEvents[0];
    assert.strictEqual(ev.votes['alice'], 'feast');
  });

  test('second player vote is also recorded', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var v2 = EV.castVote(v1.state, 1, 'bob', 'market');
    var ev = v2.state.activeEvents[0];
    assert.strictEqual(ev.votes['bob'], 'market');
  });

  test('duplicate vote returns success false', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var v2 = EV.castVote(v1.state, 1, 'alice', 'market');
    assert.strictEqual(v2.success, false);
  });

  test('duplicate vote message mentions change vote', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var v2 = EV.castVote(v1.state, 1, 'alice', 'market');
    assert(v2.message.toLowerCase().indexOf('changevote') !== -1 ||
           v2.message.toLowerCase().indexOf('change') !== -1 ||
           v2.message.toLowerCase().indexOf('already') !== -1);
  });

  test('invalid optionId returns success false', function() {
    var r = startFresh('harvest_festival', 1000);
    var v = EV.castVote(r.state, 1, 'alice', 'invalid_opt');
    assert.strictEqual(v.success, false);
  });

  test('vote on closed event returns success false', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    var v  = EV.castVote(cl.state, 1, 'alice', 'feast');
    assert.strictEqual(v.success, false);
  });

  test('vote on nonexistent event returns success false', function() {
    var v = EV.castVote(freshState(), 999, 'alice', 'feast');
    assert.strictEqual(v.success, false);
  });

  test('original state not mutated on cast vote', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s0 = r.state;
    EV.castVote(s0, 1, 'alice', 'feast');
    var ev = s0.activeEvents[0];
    assert.strictEqual(Object.keys(ev.votes).length, 0, 'original votes should be unchanged');
  });

});

// ============================================================================
suite('EventVoting — changeVote', function() {

  test('changeVote succeeds when player has voted', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var c  = EV.changeVote(v1.state, 1, 'alice', 'market');
    assert.strictEqual(c.success, true);
  });

  test('vote is updated to new option', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var c  = EV.changeVote(v1.state, 1, 'alice', 'market');
    var ev = c.state.activeEvents[0];
    assert.strictEqual(ev.votes['alice'], 'market');
  });

  test('changeVote fails when player has not voted', function() {
    var r = startFresh('harvest_festival', 1000);
    var c = EV.changeVote(r.state, 1, 'alice', 'market');
    assert.strictEqual(c.success, false);
  });

  test('changeVote fails for same option', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var c  = EV.changeVote(v1.state, 1, 'alice', 'feast');
    assert.strictEqual(c.success, false);
  });

  test('changeVote fails for invalid option', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var c  = EV.changeVote(v1.state, 1, 'alice', 'bad_opt');
    assert.strictEqual(c.success, false);
  });

  test('changeVote fails after voting closed', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var cl = EV.closeVoting(v1.state, 1, 2000);
    var c  = EV.changeVote(cl.state, 1, 'alice', 'market');
    assert.strictEqual(c.success, false);
  });

  test('changeVote fails for unknown event', function() {
    var c = EV.changeVote(freshState(), 999, 'alice', 'market');
    assert.strictEqual(c.success, false);
  });

  test('changeVote message mentions new option label', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var c  = EV.changeVote(v1.state, 1, 'alice', 'preserve');
    assert(c.message.toLowerCase().indexOf('preserve') !== -1 ||
           c.message.indexOf('Preserve') !== -1, 'message should mention option');
  });

  test('original state not mutated on changeVote', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var s1 = v1.state;
    EV.changeVote(s1, 1, 'alice', 'market');
    var ev = s1.activeEvents[0];
    assert.strictEqual(ev.votes['alice'], 'feast', 'original vote should be unchanged');
  });

});

// ============================================================================
suite('EventVoting — getVoteTally', function() {

  test('returns null for unknown event', function() {
    var t = EV.getVoteTally(freshState(), 999);
    assert.strictEqual(t, null);
  });

  test('returns object with all option ids initialized to 0', function() {
    var r = startFresh('harvest_festival', 1000);
    var t = EV.getVoteTally(r.state, 1);
    assert.strictEqual(t.feast,    0);
    assert.strictEqual(t.market,   0);
    assert.strictEqual(t.preserve, 0);
  });

  test('tally reflects a single vote', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var t  = EV.getVoteTally(v1.state, 1);
    assert.strictEqual(t.feast, 1);
    assert.strictEqual(t.market, 0);
  });

  test('tally counts multiple votes correctly', function() {
    var r = startFresh('harvest_festival', 1000);
    var s = voteN(r.state, 1, 'feast', 3, 'p');
    s     = voteN(s, 1, 'market', 2, 'q');
    var t = EV.getVoteTally(s, 1);
    assert.strictEqual(t.feast,  3);
    assert.strictEqual(t.market, 2);
    assert.strictEqual(t.preserve, 0);
  });

  test('tally for event with all options receiving votes', function() {
    var r = startFresh('harvest_festival', 1000);
    var s = voteN(r.state, 1, 'feast', 1, 'pa');
    s     = voteN(s, 1, 'market', 1, 'pb');
    s     = voteN(s, 1, 'preserve', 1, 'pc');
    var t = EV.getVoteTally(s, 1);
    assert.strictEqual(t.feast,    1);
    assert.strictEqual(t.market,   1);
    assert.strictEqual(t.preserve, 1);
  });

});

// ============================================================================
suite('EventVoting — closeVoting & winner determination', function() {

  test('closeVoting returns winner and effect', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    s      = voteN(s, 1, 'market', 1, 'q');
    var cl = EV.closeVoting(s, 1, 2000);
    assert.strictEqual(cl.winner, 'feast');
    assert(cl.effect);
  });

  test('closeVoting message mentions winning option', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'preserve', 5, 'p');
    var cl = EV.closeVoting(s, 1, 2000);
    assert(cl.message.toLowerCase().indexOf('preserve') !== -1 ||
           cl.message.indexOf('Preserve') !== -1, 'message: ' + cl.message);
  });

  test('event moves from activeEvents after close', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    assert.strictEqual(cl.state.activeEvents.length, 0);
  });

  test('closed event appears in votingHistory', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    assert.strictEqual(cl.state.votingHistory.length, 1);
  });

  test('history summary has correct eventId', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    assert.strictEqual(cl.state.votingHistory[0].eventId, 'harvest_festival');
  });

  test('history summary has totalVotes', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 4, 'p');
    var cl = EV.closeVoting(s, 1, 2000);
    assert.strictEqual(cl.state.votingHistory[0].totalVotes, 4);
  });

  test('tie broken by first option (feast vs market)', function() {
    var r = startFresh('harvest_festival', 1000);
    var s = voteN(r.state, 1, 'feast', 2, 'pa');
    s     = voteN(s, 1, 'market', 2, 'pb');
    var cl = EV.closeVoting(s, 1, 2000);
    assert.strictEqual(cl.winner, 'feast', 'First option should win tie');
  });

  test('tie broken by first option across different options', function() {
    var r = startFresh('harvest_festival', 1000);
    var s = voteN(r.state, 1, 'market', 2, 'pa');
    s     = voteN(s, 1, 'preserve', 2, 'pb');
    var cl = EV.closeVoting(s, 1, 2000);
    // feast has 0, market and preserve tied at 2 — market (index 1) wins tie
    assert.strictEqual(cl.winner, 'market', 'market (index 1) should win tie over preserve (index 2)');
  });

  test('closeVoting with no votes uses first option as winner', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    assert.strictEqual(cl.winner, 'feast');  // first option, index 0, with 0 votes beats others
  });

  test('effect applied to state.activeEffects', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 2000);
    assert.strictEqual(cl.state.activeEffects.length, 1);
  });

  test('applied effect has correct bonus type', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 2000);
    assert.strictEqual(cl.state.activeEffects[0].bonus, 'cooking_xp');
  });

  test('applied effect has appliedAt timestamp', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 5000);
    assert.strictEqual(cl.effect.appliedAt, 5000);
  });

  test('timed effect has activeUntil = appliedAt + duration', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    // feast duration is 86400
    assert.strictEqual(cl.effect.activeUntil, 1000 + 86400);
  });

  test('item-give effect (preserve) has activeUntil null', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'preserve', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(cl.effect.activeUntil, null);
  });

  test('closing already-closed event returns error', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    var cl2 = EV.closeVoting(cl.state, 1, 3000);
    assert(cl2.error);
  });

  test('closing nonexistent event returns error', function() {
    var cl = EV.closeVoting(freshState(), 999, 2000);
    assert(cl.error);
  });

  test('most recent history entry is first', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl1 = EV.closeVoting(r.state, 1, 2000);
    var r2  = EV.startEvent(cl1.state, 'full_moon', 3000);
    var cl2 = EV.closeVoting(r2.state, 2, 4000);
    assert.strictEqual(cl2.state.votingHistory[0].instanceId, 2);
    assert.strictEqual(cl2.state.votingHistory[1].instanceId, 1);
  });

  test('original state not mutated on closeVoting', function() {
    var r = startFresh('harvest_festival', 1000);
    var s0 = r.state;
    EV.closeVoting(s0, 1, 2000);
    assert.strictEqual(s0.activeEvents.length, 1, 'original activeEvents unchanged');
    assert.strictEqual(s0.votingHistory.length, 0, 'original history unchanged');
  });

});

// ============================================================================
suite('EventVoting — getActiveEffects', function() {

  test('returns empty array when no effects', function() {
    var eff = EV.getActiveEffects(freshState(), 1000);
    assert(Array.isArray(eff));
    assert.strictEqual(eff.length, 0);
  });

  test('returns timed effect while still active', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    // feast activeUntil = 1000 + 86400
    var eff = EV.getActiveEffects(cl.state, 2000);
    assert.strictEqual(eff.length, 1);
    assert.strictEqual(eff[0].bonus, 'cooking_xp');
  });

  test('returns empty when timed effect has expired', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    // feast expires at 1000 + 86400 = 87400; check at 87401
    var eff = EV.getActiveEffects(cl.state, 87401);
    assert.strictEqual(eff.length, 0);
  });

  test('permanent effect (no duration) always active', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'preserve', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    var eff = EV.getActiveEffects(cl.state, 9999999);
    assert.strictEqual(eff.length, 1);
  });

  test('multiple effects — returns only active ones', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    // Add a second event and close it
    var r2 = EV.startEvent(cl.state, 'storm_approaching', 2000);
    var s2 = voteN(r2.state, 2, 'brave', 2, 'q');
    var cl2 = EV.closeVoting(s2, 2, 2000);
    // At time 3000 both feast and brave should be active
    var eff = EV.getActiveEffects(cl2.state, 3000);
    assert.strictEqual(eff.length, 2);
  });

});

// ============================================================================
suite('EventVoting — isEffectActive', function() {

  test('returns false when no effects', function() {
    assert.strictEqual(EV.isEffectActive(freshState(), 'cooking_xp', 1000), false);
  });

  test('returns true when matching effect is active', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.isEffectActive(cl.state, 'cooking_xp', 2000), true);
  });

  test('returns false when effect type does not match', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.isEffectActive(cl.state, 'rare_loot', 2000), false);
  });

  test('returns false when matching effect has expired', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.isEffectActive(cl.state, 'cooking_xp', 100000), false);
  });

  test('all_xp effect active after ceremony vote', function() {
    var r  = startFresh('aurora_borealis', 1000);
    var s  = voteN(r.state, 1, 'ceremony', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.isEffectActive(cl.state, 'all_xp', 5000), true);
  });

});

// ============================================================================
suite('EventVoting — getEffectMultiplier', function() {

  test('returns 1.0 when no effects', function() {
    assert.strictEqual(EV.getEffectMultiplier(freshState(), 'cooking_xp', 1000), 1.0);
  });

  test('returns correct multiplier for active effect', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.getEffectMultiplier(cl.state, 'cooking_xp', 2000), 1.2);
  });

  test('returns 1.0 for non-matching effect type', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.getEffectMultiplier(cl.state, 'rare_loot', 2000), 1.0);
  });

  test('returns 1.0 after effect expires', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.getEffectMultiplier(cl.state, 'cooking_xp', 100000), 1.0);
  });

  test('returns best multiplier when multiple same-type effects overlap', function() {
    // Start two events that both give all_xp
    var r1  = startFresh('aurora_borealis', 1000);
    var s1  = voteN(r1.state, 1, 'ceremony', 3, 'p');
    var cl1 = EV.closeVoting(s1, 1, 1000);  // all_xp x1.25 until 1000+21600

    var r2  = EV.startEvent(cl1.state, 'founders_day', 1500);
    var s2  = voteN(r2.state, 2, 'party', 3, 'q');
    var cl2 = EV.closeVoting(s2, 2, 1500);  // all_xp x1.25 until 1500+86400

    var mult = EV.getEffectMultiplier(cl2.state, 'all_xp', 5000);
    // Both are 1.25, best is still 1.25
    assert.strictEqual(mult, 1.25);
  });

  test('brave storm gives rare_loot multiplier 2.0', function() {
    var r  = startFresh('storm_approaching', 1000);
    var s  = voteN(r.state, 1, 'brave', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.getEffectMultiplier(cl.state, 'rare_loot', 2000), 2.0);
  });

  test('full_moon fish gives rare_fish multiplier 2.0', function() {
    var r  = startFresh('full_moon', 1000);
    var s  = voteN(r.state, 1, 'fish', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.getEffectMultiplier(cl.state, 'rare_fish', 2000), 2.0);
  });

});

// ============================================================================
suite('EventVoting — getEventHistory', function() {

  test('returns empty array with no closed events', function() {
    var h = EV.getEventHistory(freshState());
    assert(Array.isArray(h));
    assert.strictEqual(h.length, 0);
  });

  test('returns one entry after one close', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    var h  = EV.getEventHistory(cl.state);
    assert.strictEqual(h.length, 1);
  });

  test('limit parameter restricts results', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl1 = EV.closeVoting(r.state, 1, 2000);
    var r2  = EV.startEvent(cl1.state, 'full_moon', 3000);
    var cl2 = EV.closeVoting(r2.state, 2, 4000);
    var r3  = EV.startEvent(cl2.state, 'founders_day', 5000);
    var cl3 = EV.closeVoting(r3.state, 3, 6000);

    var h = EV.getEventHistory(cl3.state, 2);
    assert.strictEqual(h.length, 2);
  });

  test('history is most recent first', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl1 = EV.closeVoting(r.state, 1, 2000);
    var r2  = EV.startEvent(cl1.state, 'full_moon', 3000);
    var cl2 = EV.closeVoting(r2.state, 2, 4000);
    var h = EV.getEventHistory(cl2.state);
    assert.strictEqual(h[0].instanceId, 2);
    assert.strictEqual(h[1].instanceId, 1);
  });

  test('history entry contains winner', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'market', 4, 'p');
    var cl = EV.closeVoting(s, 1, 2000);
    assert.strictEqual(cl.state.votingHistory[0].winner, 'market');
  });

  test('history entry contains tally', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 2000);
    assert.strictEqual(cl.state.votingHistory[0].tally.feast, 3);
  });

});

// ============================================================================
suite('EventVoting — getUpcomingEvents', function() {

  test('returns empty array when no active events', function() {
    var up = EV.getUpcomingEvents(freshState());
    assert.strictEqual(up.length, 0);
  });

  test('returns active event during voting phase', function() {
    var r  = startFresh('harvest_festival', 1000);
    var up = EV.getUpcomingEvents(r.state);
    assert.strictEqual(up.length, 1);
  });

  test('returns only voting-phase events (not closed)', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    var r2 = EV.startEvent(cl.state, 'full_moon', 3000);
    var up = EV.getUpcomingEvents(r2.state);
    assert.strictEqual(up.length, 1);
    assert.strictEqual(up[0].eventId, 'full_moon');
  });

  test('returns multiple active events', function() {
    var r1 = startFresh('harvest_festival', 1000);
    var r2 = EV.startEvent(r1.state, 'full_moon', 1100);
    var up = EV.getUpcomingEvents(r2.state);
    assert.strictEqual(up.length, 2);
  });

});

// ============================================================================
suite('EventVoting — formatEventCard', function() {

  test('returns a string', function() {
    var r  = startFresh('harvest_festival', 1000);
    var t  = EV.getVoteTally(r.state, 1);
    var html = EV.formatEventCard(r.event, t, 150);
    assert.strictEqual(typeof html, 'string');
    assert(html.length > 0);
  });

  test('contains event title', function() {
    var r  = startFresh('harvest_festival', 1000);
    var t  = EV.getVoteTally(r.state, 1);
    var html = EV.formatEventCard(r.event, t, 150);
    assert(html.indexOf('Harvest Festival') !== -1);
  });

  test('contains event description', function() {
    var r  = startFresh('harvest_festival', 1000);
    var t  = EV.getVoteTally(r.state, 1);
    var html = EV.formatEventCard(r.event, t, 150);
    assert(html.indexOf('overflow') !== -1 || html.indexOf('gardens') !== -1);
  });

  test('contains event-card class', function() {
    var r  = startFresh('harvest_festival', 1000);
    var t  = EV.getVoteTally(r.state, 1);
    var html = EV.formatEventCard(r.event, t, 150);
    assert(html.indexOf('event-card') !== -1);
  });

  test('shows time remaining for voting events', function() {
    var r  = startFresh('harvest_festival', 1000);
    var t  = EV.getVoteTally(r.state, 1);
    var html = EV.formatEventCard(r.event, t, 250);
    assert(html.indexOf('250') !== -1, 'should show 250 ticks remaining');
  });

  test('shows zone label for zoned event', function() {
    var r  = startFresh('harvest_festival', 1000);
    var t  = EV.getVoteTally(r.state, 1);
    var html = EV.formatEventCard(r.event, t, 100);
    assert(html.toLowerCase().indexOf('gardens') !== -1);
  });

  test('handles null event gracefully', function() {
    var html = EV.formatEventCard(null, {}, 100);
    assert.strictEqual(typeof html, 'string');
    assert(html.indexOf('event-card') !== -1);
  });

  test('contains total votes', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 4, 'p');
    var t  = EV.getVoteTally(s, 1);
    var html = EV.formatEventCard(r.event, t, 100);
    assert(html.indexOf('4') !== -1, 'total votes (4) should appear');
  });

  test('shows closed badge for closed event', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    var hist = cl.state.votingHistory[0];
    // Reconstruct a closed event-like object
    var closedEvent = Object.assign({}, r.event, {
      status: EV.EVENT_STATUS_CLOSED,
      winner: cl.winner
    });
    var html = EV.formatEventCard(closedEvent, hist.tally, 0);
    assert(html.toLowerCase().indexOf('closed') !== -1);
  });

});

// ============================================================================
suite('EventVoting — formatVoteBar', function() {

  test('returns a string', function() {
    var html = EV.formatVoteBar('Grand Feast', 3, 5);
    assert.strictEqual(typeof html, 'string');
  });

  test('contains option label', function() {
    var html = EV.formatVoteBar('Grand Feast', 3, 5);
    assert(html.indexOf('Grand Feast') !== -1);
  });

  test('contains vote-bar class', function() {
    var html = EV.formatVoteBar('Grand Feast', 3, 5);
    assert(html.indexOf('vote-bar') !== -1);
  });

  test('shows percentage (60%)', function() {
    var html = EV.formatVoteBar('Grand Feast', 3, 5);
    assert(html.indexOf('60%') !== -1, 'should show 60%');
  });

  test('shows vote count', function() {
    var html = EV.formatVoteBar('Grand Feast', 3, 5);
    assert(html.indexOf('3') !== -1);
  });

  test('shows 0% when no votes', function() {
    var html = EV.formatVoteBar('Preserve', 0, 5);
    assert(html.indexOf('0%') !== -1);
  });

  test('handles zero total votes without error', function() {
    var html = EV.formatVoteBar('Option', 0, 0);
    assert.strictEqual(typeof html, 'string');
    assert(html.indexOf('0%') !== -1);
  });

  test('bar contains # characters for filled portion', function() {
    var html = EV.formatVoteBar('Winner', 20, 20);
    assert(html.indexOf('#') !== -1, '100% should have filled bar');
  });

  test('bar contains - characters for empty portion', function() {
    var html = EV.formatVoteBar('Losing', 0, 10);
    assert(html.indexOf('-') !== -1, '0% should have empty bar');
  });

});

// ============================================================================
suite('EventVoting — formatActiveEffects', function() {

  test('returns string for empty effects array', function() {
    var html = EV.formatActiveEffects([]);
    assert.strictEqual(typeof html, 'string');
  });

  test('shows no-bonus message for empty array', function() {
    var html = EV.formatActiveEffects([]);
    assert(html.toLowerCase().indexOf('no active') !== -1 ||
           html.toLowerCase().indexOf('no event') !== -1);
  });

  test('returns string for null input', function() {
    var html = EV.formatActiveEffects(null);
    assert.strictEqual(typeof html, 'string');
  });

  test('contains active-effects class', function() {
    var html = EV.formatActiveEffects([]);
    assert(html.indexOf('active-effects') !== -1);
  });

  test('shows effect bonus for active effects', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    var eff = EV.getActiveEffects(cl.state, 2000);
    var html = EV.formatActiveEffects(eff);
    assert(html.indexOf('cooking') !== -1 || html.indexOf('xp') !== -1);
  });

  test('shows multiplier for timed effects', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'feast', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    var eff = EV.getActiveEffects(cl.state, 2000);
    var html = EV.formatActiveEffects(eff);
    assert(html.indexOf('1.20') !== -1 || html.indexOf('x1.2') !== -1 || html.indexOf('1.2') !== -1);
  });

  test('shows Permanent for non-expiring effect', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'preserve', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    var eff = EV.getActiveEffects(cl.state, 9999999);
    var html = EV.formatActiveEffects(eff);
    assert(html.toLowerCase().indexOf('permanent') !== -1);
  });

  test('multiple effects produce multiple entries', function() {
    var r1  = startFresh('harvest_festival', 1000);
    var s1  = voteN(r1.state, 1, 'feast', 3, 'p');
    var cl1 = EV.closeVoting(s1, 1, 1000);
    var r2  = EV.startEvent(cl1.state, 'storm_approaching', 2000);
    var s2  = voteN(r2.state, 2, 'brave', 3, 'q');
    var cl2 = EV.closeVoting(s2, 2, 2000);
    var eff = EV.getActiveEffects(cl2.state, 3000);
    var html = EV.formatActiveEffects(eff);
    // Both cooking_xp and rare_loot present
    assert(html.indexOf('cooking') !== -1);
    assert(html.indexOf('rare') !== -1 || html.indexOf('loot') !== -1);
  });

});

// ============================================================================
suite('EventVoting — edge cases', function() {

  test('voting period constant is exported', function() {
    assert.strictEqual(EV.VOTING_PERIOD_TICKS, 300);
  });

  test('can start all 10 event types without error', function() {
    var ids = Object.keys(EV.VOTEABLE_EVENTS);
    var s   = freshState();
    ids.forEach(function(id) {
      var r = EV.startEvent(s, id, 1000);
      assert(!r.error, 'Error starting ' + id + ': ' + r.error);
      s = r.state;
    });
    assert.strictEqual(s.activeEvents.length, 10);
  });

  test('effects from all 10 events are trackable after close', function() {
    var ids = Object.keys(EV.VOTEABLE_EVENTS);
    var s   = freshState();
    ids.forEach(function(id) {
      var r = EV.startEvent(s, id, 1000);
      s     = r.state;
    });
    // Close all events with first option winning
    var instanceId = 1;
    ids.forEach(function() {
      var cl = EV.closeVoting(s, instanceId++, 2000);
      if (!cl.error) { s = cl.state; }
    });
    // Should have at most 10 effects (some may be the same type)
    assert(s.activeEffects.length <= 10, 'Max 10 effects expected');
    assert(s.votingHistory.length === 10, 'Should have 10 history entries');
  });

  test('castVote after changeVote preserves final choice', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var c  = EV.changeVote(v1.state, 1, 'alice', 'preserve');
    var ev = c.state.activeEvents[0];
    assert.strictEqual(ev.votes['alice'], 'preserve');
  });

  test('tally is consistent after vote change', function() {
    var r  = startFresh('harvest_festival', 1000);
    var v1 = EV.castVote(r.state, 1, 'alice', 'feast');
    var c  = EV.changeVote(v1.state, 1, 'alice', 'market');
    var t  = EV.getVoteTally(c.state, 1);
    assert.strictEqual(t.feast,  0, 'feast should be 0 after change');
    assert.strictEqual(t.market, 1, 'market should be 1 after change');
  });

  test('getEffectMultiplier returns 1.0 for expired timed effect', function() {
    var r  = startFresh('aurora_borealis', 1000);
    var s  = voteN(r.state, 1, 'ceremony', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    // ceremony duration is 21600, expires at 22600
    var mult = EV.getEffectMultiplier(cl.state, 'all_xp', 30000);
    assert.strictEqual(mult, 1.0);
  });

  test('starting same event twice creates two instances', function() {
    var r1 = startFresh('harvest_festival', 1000);
    var r2 = EV.startEvent(r1.state, 'harvest_festival', 2000);
    assert.strictEqual(r2.state.activeEvents.length, 2);
    assert.strictEqual(r2.state.activeEvents[0].instanceId, 1);
    assert.strictEqual(r2.state.activeEvents[1].instanceId, 2);
  });

  test('history limit 0 returns all history', function() {
    var r  = startFresh('harvest_festival', 1000);
    var cl = EV.closeVoting(r.state, 1, 2000);
    var h  = EV.getEventHistory(cl.state, 0);
    assert.strictEqual(h.length, 1);
  });

  test('history without limit returns all entries', function() {
    var r   = startFresh('harvest_festival', 1000);
    var cl1 = EV.closeVoting(r.state, 1, 2000);
    var r2  = EV.startEvent(cl1.state, 'full_moon', 3000);
    var cl2 = EV.closeVoting(r2.state, 2, 4000);
    var h   = EV.getEventHistory(cl2.state);
    assert.strictEqual(h.length, 2);
  });

  test('getVoteTally returns tally even after voting is closed', function() {
    // getVoteTally should still work for events in history (if we use it on state)
    // For closed events we check history tally instead
    var r   = startFresh('harvest_festival', 1000);
    var s   = voteN(r.state, 1, 'feast', 2, 'p');
    var cl  = EV.closeVoting(s, 1, 2000);
    var hist = cl.state.votingHistory[0];
    assert.strictEqual(hist.tally.feast, 2);
  });

  test('isEffectActive returns false for item-give effect (no duration, no multiplier)', function() {
    var r  = startFresh('harvest_festival', 1000);
    var s  = voteN(r.state, 1, 'preserve', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    // preserve gives bread, not a multiplier effect — but it IS active (permanent)
    assert.strictEqual(EV.isEffectActive(cl.state, 'give_item', 9999999), true);
  });

  test('knowledge_symposium science effect has gather_efficiency bonus', function() {
    var r  = startFresh('knowledge_symposium', 1000);
    var s  = voteN(r.state, 1, 'science', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.isEffectActive(cl.state, 'gather_efficiency', 5000), true);
    assert.strictEqual(EV.getEffectMultiplier(cl.state, 'gather_efficiency', 5000), 1.2);
  });

  test('founders_day party gives all_xp with duration 86400', function() {
    var r  = startFresh('founders_day', 1000);
    var s  = voteN(r.state, 1, 'party', 3, 'p');
    var cl = EV.closeVoting(s, 1, 1000);
    assert.strictEqual(EV.getEffectMultiplier(cl.state, 'all_xp', 2000), 1.25);
    assert.strictEqual(EV.getEffectMultiplier(cl.state, 'all_xp', 87402), 1.0);
  });

});

// ============================================================================
// REPORT
// ============================================================================
var passed = report();
process.exit(passed ? 0 : 1);
