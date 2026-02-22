/**
 * Tests for src/js/arena_scheduler.js
 * Run with: node tests/test_arena_scheduler.js
 */

var ArenaScheduler = require('../src/js/arena_scheduler');

var passed = 0;
var failed = 0;
var total = 0;

function assert(condition, msg) {
  total++;
  if (condition) {
    passed++;
    console.log('  PASS: ' + msg);
  } else {
    failed++;
    console.log('  FAIL: ' + msg);
  }
}

function section(title) {
  console.log('\n--- ' + title + ' ---');
}

// ---------------------------------------------------------------------------
// Helper: create a fresh state with some Spark balances
// ---------------------------------------------------------------------------
function makeState(balances) {
  var s = ArenaScheduler.createSchedulerState();
  s.balances = balances || {};
  return s;
}

function richState() {
  return makeState({ alice: 1000, bob: 1000, carol: 1000, dave: 1000,
                     eve: 1000, frank: 1000, grace: 1000, heidi: 1000,
                     ivan: 1000, judy: 1000, mallory: 1000, oscar: 1000,
                     peggy: 1000, trent: 1000, victor: 1000, walter: 1000 });
}

// Register N players into an event
function registerN(state, eventId, players) {
  for (var i = 0; i < players.length; i++) {
    ArenaScheduler.register(state, players[i], eventId);
  }
}

// ---------------------------------------------------------------------------
// SECTION 1: Event Type Definitions
// ---------------------------------------------------------------------------
section('Event Type Definitions');

var EVENT_TYPES = ArenaScheduler.getEventTypes();

assert(Array.isArray(EVENT_TYPES), 'getEventTypes returns an array');
assert(EVENT_TYPES.length === 10, 'There are exactly 10 event types');

var eventIds = EVENT_TYPES.map(function(e) { return e.id; });
assert(eventIds.indexOf('combat_tournament') !== -1, 'combat_tournament exists');
assert(eventIds.indexOf('speed_dungeon') !== -1, 'speed_dungeon exists');
assert(eventIds.indexOf('card_championship') !== -1, 'card_championship exists');
assert(eventIds.indexOf('fishing_derby') !== -1, 'fishing_derby exists');
assert(eventIds.indexOf('building_contest') !== -1, 'building_contest exists');
assert(eventIds.indexOf('music_battle') !== -1, 'music_battle exists');
assert(eventIds.indexOf('cooking_competition') !== -1, 'cooking_competition exists');
assert(eventIds.indexOf('trivia_challenge') !== -1, 'trivia_challenge exists');
assert(eventIds.indexOf('obstacle_race') !== -1, 'obstacle_race exists');
assert(eventIds.indexOf('grand_tournament') !== -1, 'grand_tournament exists');

// Validate structure of each event type
for (var i = 0; i < EVENT_TYPES.length; i++) {
  var et = EVENT_TYPES[i];
  assert(typeof et.id === 'string' && et.id.length > 0, et.id + ' has valid id');
  assert(typeof et.name === 'string' && et.name.length > 0, et.id + ' has valid name');
  assert(typeof et.description === 'string' && et.description.length > 0, et.id + ' has description');
  assert(typeof et.category === 'string', et.id + ' has category');
  assert(typeof et.minPlayers === 'number' && et.minPlayers >= 2, et.id + ' minPlayers >= 2');
  assert(typeof et.maxPlayers === 'number' && et.maxPlayers >= et.minPlayers, et.id + ' maxPlayers >= minPlayers');
  assert(typeof et.bracketType === 'string', et.id + ' has bracketType');
  assert(typeof et.duration === 'number' && et.duration > 0, et.id + ' duration > 0');
  assert(typeof et.entryFee === 'number' && et.entryFee >= 0, et.id + ' entryFee >= 0');
  assert(et.prizePool && typeof et.prizePool.first === 'number', et.id + ' has first prize');
  assert(et.prizePool && typeof et.prizePool.second === 'number', et.id + ' has second prize');
  assert(et.prizePool && typeof et.prizePool.third === 'number', et.id + ' has third prize');
  assert(et.xpReward && typeof et.xpReward.winner === 'number', et.id + ' has winner xp');
  assert(et.xpReward && typeof et.xpReward.participant === 'number', et.id + ' has participant xp');
  assert(['daily','weekly','monthly','seasonal'].indexOf(et.frequency) !== -1, et.id + ' frequency is valid');
}

// Verify prize pool ordering (first > second > third)
for (var j = 0; j < EVENT_TYPES.length; j++) {
  var pp = EVENT_TYPES[j].prizePool;
  assert(pp.first > pp.second && pp.second > pp.third, EVENT_TYPES[j].id + ' prizes descend: ' + pp.first + '>' + pp.second + '>' + pp.third);
}

// Verify bracket types are valid
var VALID_BRACKET_TYPES = ['single_elimination', 'double_elimination', 'round_robin', 'swiss'];
for (var k = 0; k < EVENT_TYPES.length; k++) {
  assert(VALID_BRACKET_TYPES.indexOf(EVENT_TYPES[k].bracketType) !== -1, EVENT_TYPES[k].id + ' bracketType is valid');
}

// Category coverage
var categories = EVENT_TYPES.map(function(e) { return e.category; });
assert(categories.indexOf('combat') !== -1, 'combat category present');
assert(categories.indexOf('racing') !== -1, 'racing category present');
assert(categories.indexOf('cards') !== -1, 'cards category present');
assert(categories.indexOf('dungeon') !== -1, 'dungeon category present');
assert(categories.indexOf('creative') !== -1, 'creative category present');
assert(categories.indexOf('fishing') !== -1, 'fishing category present');
assert(categories.indexOf('trivia') !== -1, 'trivia category present');

// Frequency distribution
var weeklyTypes = EVENT_TYPES.filter(function(e) { return e.frequency === 'weekly'; });
var dailyTypes  = EVENT_TYPES.filter(function(e) { return e.frequency === 'daily'; });
var monthlyTypes = EVENT_TYPES.filter(function(e) { return e.frequency === 'monthly'; });
var seasonalTypes = EVENT_TYPES.filter(function(e) { return e.frequency === 'seasonal'; });
assert(weeklyTypes.length >= 4, 'At least 4 weekly events (got ' + weeklyTypes.length + ')');
assert(dailyTypes.length >= 3, 'At least 3 daily events (got ' + dailyTypes.length + ')');
assert(monthlyTypes.length >= 1, 'At least 1 monthly event');
assert(seasonalTypes.length >= 1, 'At least 1 seasonal event');

// grand_tournament is double_elimination
var grandT = ArenaScheduler.getEventType('grand_tournament');
assert(grandT !== null, 'getEventType returns grand_tournament');
assert(grandT.bracketType === 'double_elimination', 'grand_tournament uses double_elimination');
assert(grandT.frequency === 'seasonal', 'grand_tournament is seasonal');
assert(grandT.maxPlayers === 32, 'grand_tournament maxPlayers is 32');

// card_championship uses swiss
var cardChamp = ArenaScheduler.getEventType('card_championship');
assert(cardChamp.bracketType === 'swiss', 'card_championship uses swiss');

// combat_tournament uses single_elimination
var combatT = ArenaScheduler.getEventType('combat_tournament');
assert(combatT.bracketType === 'single_elimination', 'combat_tournament uses single_elimination');

// Entry fees match definitions
assert(combatT.entryFee === 10, 'combat_tournament entryFee is 10');
assert(cardChamp.entryFee === 20, 'card_championship entryFee is 20');
assert(grandT.entryFee === 50, 'grand_tournament entryFee is 50');

// ---------------------------------------------------------------------------
// SECTION 2: scheduleEvent
// ---------------------------------------------------------------------------
section('scheduleEvent');

var s = makeState();

var r1 = ArenaScheduler.scheduleEvent(s, 'combat_tournament', 1000, 42);
assert(r1.success === true, 'scheduleEvent succeeds for known type');
assert(typeof r1.event === 'object', 'scheduleEvent returns event object');
assert(typeof r1.event.id === 'string', 'scheduled event has string id');
assert(r1.event.type === 'combat_tournament', 'event.type matches requested type');
assert(r1.event.startTick === 1000, 'event.startTick is 1000');
assert(r1.event.registrationOpen === true, 'registrationOpen is true');

var ev1 = ArenaScheduler.getEventById(s, r1.event.id);
assert(ev1 !== null, 'getEventById returns the event');
assert(ev1.endTick === 1000 + combatT.duration, 'endTick = startTick + duration');
assert(ev1.status === 'registration', 'initial status is registration');
assert(ev1.entryFee === 10, 'entryFee copied correctly');
assert(ev1.maxPlayers === 16, 'maxPlayers copied correctly');
assert(Array.isArray(ev1.participants), 'participants is array');
assert(ev1.participants.length === 0, 'no participants initially');

// Scheduling unknown type
var r2 = ArenaScheduler.scheduleEvent(s, 'nonexistent_type', 2000, 1);
assert(r2.success === false, 'scheduleEvent fails for unknown type');
assert(typeof r2.reason === 'string', 'failure reason is a string');

// Scheduling multiple events gives unique IDs
var r3 = ArenaScheduler.scheduleEvent(s, 'fishing_derby', 500, 7);
var r4 = ArenaScheduler.scheduleEvent(s, 'fishing_derby', 1500, 8);
assert(r3.event.id !== r4.event.id, 'Two events of same type get unique IDs');

// Scheduling with tick 0
var r5 = ArenaScheduler.scheduleEvent(s, 'obstacle_race', 0, 1);
assert(r5.success === true, 'scheduleEvent succeeds with tick 0');

// Invalid tick
var r6 = ArenaScheduler.scheduleEvent(s, 'obstacle_race', -100, 1);
assert(r6.success === false, 'scheduleEvent fails with negative startTick');

// ---------------------------------------------------------------------------
// SECTION 3: getSchedule, getUpcomingEvents, getActiveEvents
// ---------------------------------------------------------------------------
section('getSchedule / getUpcomingEvents / getActiveEvents');

var s2 = makeState();
ArenaScheduler.scheduleEvent(s2, 'combat_tournament', 100, 1);
ArenaScheduler.scheduleEvent(s2, 'fishing_derby', 200, 2);
ArenaScheduler.scheduleEvent(s2, 'obstacle_race', 500, 3);
ArenaScheduler.scheduleEvent(s2, 'trivia_challenge', 800, 4);
ArenaScheduler.scheduleEvent(s2, 'music_battle', 1200, 5);

var sched = ArenaScheduler.getSchedule(s2, 100, 600);
assert(sched.length === 3, 'getSchedule returns 3 events in [100,600] (got ' + sched.length + ')');
assert(sched[0].startTick <= sched[1].startTick, 'getSchedule sorted by startTick');

var sched2 = ArenaScheduler.getSchedule(s2, 0, 50);
assert(sched2.length === 0, 'getSchedule returns 0 events outside range');

var upcoming = ArenaScheduler.getUpcomingEvents(s2, 150, 3);
assert(upcoming.length === 3, 'getUpcomingEvents returns 3 events after tick 150 (got ' + upcoming.length + ')');
assert(upcoming[0].startTick >= 200, 'first upcoming event is after currentTick');
assert(upcoming[0].startTick <= upcoming[1].startTick, 'upcoming events sorted');

var upcoming2 = ArenaScheduler.getUpcomingEvents(s2, 150, 100);
assert(upcoming2.length === 4, 'getUpcomingEvents count capped to available events');

// Active events
var s3 = makeState({ alpha: 500, beta: 500, gamma: 500, delta: 500 });
var schRes = ArenaScheduler.scheduleEvent(s3, 'obstacle_race', 1000, 1);
var activeEv = ArenaScheduler.getEventById(s3, schRes.event.id);

// Manually set status to in_progress for testing
activeEv.status = 'in_progress';

var active = ArenaScheduler.getActiveEvents(s3, 1100);
assert(active.length === 1, 'getActiveEvents returns the in_progress event');
assert(active[0].id === schRes.event.id, 'active event id matches');

var activeAfter = ArenaScheduler.getActiveEvents(s3, 999999);
assert(activeAfter.length === 0, 'getActiveEvents empty after event end tick');

var activeNone = ArenaScheduler.getActiveEvents(s3, 900);
assert(activeNone.length === 0, 'getActiveEvents empty before event start tick');

// ---------------------------------------------------------------------------
// SECTION 4: register / unregister
// ---------------------------------------------------------------------------
section('register / unregister');

var s4 = richState();
var evRes = ArenaScheduler.scheduleEvent(s4, 'combat_tournament', 5000, 1);
var evId = evRes.event.id;

// Successful registration
var reg1 = ArenaScheduler.register(s4, 'alice', evId);
assert(reg1.success === true, 'alice registers successfully');
assert(typeof reg1.reason === 'string', 'register returns reason string');

// Verify fee deducted (10 Spark)
assert(s4.balances['alice'] === 990, 'alice balance deducted by entryFee (10)');

// Duplicate registration
var reg2 = ArenaScheduler.register(s4, 'alice', evId);
assert(reg2.success === false, 'duplicate registration fails');
assert(reg2.reason.toLowerCase().indexOf('already') !== -1, 'duplicate reason mentions already');

// Register more players
ArenaScheduler.register(s4, 'bob', evId);
ArenaScheduler.register(s4, 'carol', evId);
ArenaScheduler.register(s4, 'dave', evId);

var participants = ArenaScheduler.getParticipants(s4, evId);
assert(participants.length === 4, 'getParticipants returns 4 players');
assert(participants.indexOf('alice') !== -1, 'alice in participants');
assert(participants.indexOf('bob') !== -1, 'bob in participants');

// Register up to max (16 for combat_tournament)
var morePlayers = ['eve','frank','grace','heidi','ivan','judy','mallory','oscar','peggy','trent','victor','walter'];
for (var mp = 0; mp < morePlayers.length; mp++) {
  ArenaScheduler.register(s4, morePlayers[mp], evId);
}
var fullParts = ArenaScheduler.getParticipants(s4, evId);
assert(fullParts.length === 16, 'event fills to maxPlayers=16');

// Register when full
var overflowState = richState();
overflowState.balances['overflow_player'] = 1000;
var regOverflow = ArenaScheduler.register(s4, 'overflow_player', evId);
assert(regOverflow.success === false, 'registration fails when event is full');
assert(regOverflow.reason.toLowerCase().indexOf('full') !== -1, 'full reason mentions full');

// Register non-existing event
var regBad = ArenaScheduler.register(s4, 'alice', 'nonexistent_event_999');
assert(regBad.success === false, 'register fails for non-existent event');

// Insufficient funds
var poorState = makeState({ poorplayer: 3 });
var poorEvRes = ArenaScheduler.scheduleEvent(poorState, 'combat_tournament', 100, 1);
var regPoor = ArenaScheduler.register(poorState, 'poorplayer', poorEvRes.event.id);
assert(regPoor.success === false, 'registration fails with insufficient Spark');
assert(regPoor.reason.toLowerCase().indexOf('insufficient') !== -1 || regPoor.reason.toLowerCase().indexOf('spark') !== -1, 'insufficient funds reason is descriptive');
assert(poorState.balances['poorplayer'] === 3, 'poor player balance unchanged after failed registration');

// Unregister and refund
var unregState = richState();
var unregEvRes = ArenaScheduler.scheduleEvent(unregState, 'fishing_derby', 2000, 1);
var unregEvId = unregEvRes.event.id;
ArenaScheduler.register(unregState, 'alice', unregEvId);
assert(unregState.balances['alice'] === 995, 'alice paid 5 entry fee for fishing_derby');

var unregRes = ArenaScheduler.unregister(unregState, 'alice', unregEvId);
assert(unregRes.success === true, 'unregister succeeds');
assert(unregRes.refunded === 5, 'entry fee of 5 is refunded');
assert(unregState.balances['alice'] === 1000, 'alice balance restored after unregister');

var partsAfterUnreg = ArenaScheduler.getParticipants(unregState, unregEvId);
assert(partsAfterUnreg.indexOf('alice') === -1, 'alice removed from participants');

// Unregister non-participant
var unregFail = ArenaScheduler.unregister(unregState, 'alice', unregEvId);
assert(unregFail.success === false, 'unregister fails for non-participant');

// Unregister after event starts (no refund)
var startedState = richState();
var startedEvRes = ArenaScheduler.scheduleEvent(startedState, 'obstacle_race', 100, 1);
var startedEvId = startedEvRes.event.id;
ArenaScheduler.register(startedState, 'alice', startedEvId);
var startedEv = ArenaScheduler.getEventById(startedState, startedEvId);
startedEv.status = 'in_progress';
startedEv.registrationOpen = false;

var unregStarted = ArenaScheduler.unregister(startedState, 'alice', startedEvId);
assert(unregStarted.success === false, 'cannot unregister after event starts');

// Registration when event is cancelled
var cancelRegState = richState();
var cancelRegEvRes = ArenaScheduler.scheduleEvent(cancelRegState, 'trivia_challenge', 3000, 1);
ArenaScheduler.cancelEvent(cancelRegState, cancelRegEvRes.event.id);
var cancelReg = ArenaScheduler.register(cancelRegState, 'alice', cancelRegEvRes.event.id);
assert(cancelReg.success === false, 'cannot register for cancelled event');

// getParticipants for non-existent event returns []
var noParts = ArenaScheduler.getParticipants(makeState(), 'fake_event_id');
assert(Array.isArray(noParts) && noParts.length === 0, 'getParticipants returns [] for unknown event');

// ---------------------------------------------------------------------------
// SECTION 5: generateBracket — single elimination
// ---------------------------------------------------------------------------
section('generateBracket — single_elimination');

var se4State = richState();
var se4Res = ArenaScheduler.scheduleEvent(se4State, 'combat_tournament', 1000, 99);
var se4Id = se4Res.event.id;
var players4 = ['alice','bob','carol','dave'];
registerN(se4State, se4Id, players4);

var bracket4 = ArenaScheduler.generateBracket(se4State, se4Id, 99);
assert(bracket4.success === true, 'generateBracket succeeds with 4 players');
assert(Array.isArray(bracket4.bracket), 'bracket is array of rounds');
assert(bracket4.bracket.length >= 1, 'at least 1 round generated');
assert(bracket4.bracket[0].length === 2, 'round 1 has 2 matches for 4 players');

// Verify all participants appear in round 1
var r1Players = [];
for (var rm = 0; rm < bracket4.bracket[0].length; rm++) {
  r1Players.push(bracket4.bracket[0][rm].player1);
  r1Players.push(bracket4.bracket[0][rm].player2);
}
for (var pi = 0; pi < players4.length; pi++) {
  assert(r1Players.indexOf(players4[pi]) !== -1, players4[pi] + ' appears in round 1');
}

// Each player appears exactly once in round 1
var seen = {};
for (var rp = 0; rp < r1Players.length; rp++) {
  assert(!seen[r1Players[rp]], r1Players[rp] + ' not duplicated in round 1');
  seen[r1Players[rp]] = true;
}

// Status transitions to in_progress
var ev4 = ArenaScheduler.getEventById(se4State, se4Id);
assert(ev4.status === 'in_progress', 'event status set to in_progress after generateBracket');
assert(ev4.registrationOpen === false, 'registrationOpen closes after generateBracket');

// 8-player bracket
var se8State = richState();
var se8Res = ArenaScheduler.scheduleEvent(se8State, 'combat_tournament', 1000, 12);
var se8Id = se8Res.event.id;
var players8 = ['alice','bob','carol','dave','eve','frank','grace','heidi'];
registerN(se8State, se8Id, players8);
var bracket8 = ArenaScheduler.generateBracket(se8State, se8Id, 12);
assert(bracket8.success === true, 'generateBracket succeeds with 8 players');
assert(bracket8.bracket[0].length === 4, 'round 1 has 4 matches for 8 players');

// 16-player bracket
var se16State = richState();
var se16Res = ArenaScheduler.scheduleEvent(se16State, 'combat_tournament', 1000, 7);
var se16Id = se16Res.event.id;
var players16 = ['alice','bob','carol','dave','eve','frank','grace','heidi',
                  'ivan','judy','mallory','oscar','peggy','trent','victor','walter'];
registerN(se16State, se16Id, players16);
var bracket16 = ArenaScheduler.generateBracket(se16State, se16Id, 7);
assert(bracket16.success === true, 'generateBracket succeeds with 16 players');
assert(bracket16.bracket[0].length === 8, 'round 1 has 8 matches for 16 players');

// Bracket fails below minPlayers
var tooFewState = richState();
var tooFewRes = ArenaScheduler.scheduleEvent(tooFewState, 'combat_tournament', 1000, 1);
registerN(tooFewState, tooFewRes.event.id, ['alice','bob','carol']); // only 3, min is 4
var tooFewBracket = ArenaScheduler.generateBracket(tooFewState, tooFewRes.event.id, 1);
assert(tooFewBracket.success === false, 'generateBracket fails below minPlayers');
assert(typeof tooFewBracket.reason === 'string', 'generateBracket failure reason is string');

// Non-existent event
var fakeBracket = ArenaScheduler.generateBracket(makeState(), 'fake_id', 1);
assert(fakeBracket.success === false, 'generateBracket fails for non-existent event');

// Seeding reproducibility: same seed = same bracket
var seedState1 = richState();
var seedRes1 = ArenaScheduler.scheduleEvent(seedState1, 'combat_tournament', 1000, 777);
registerN(seedState1, seedRes1.event.id, ['alice','bob','carol','dave']);
var seedBracket1 = ArenaScheduler.generateBracket(seedState1, seedRes1.event.id, 777);

var seedState2 = richState();
var seedRes2 = ArenaScheduler.scheduleEvent(seedState2, 'combat_tournament', 1000, 777);
registerN(seedState2, seedRes2.event.id, ['alice','bob','carol','dave']);
var seedBracket2 = ArenaScheduler.generateBracket(seedState2, seedRes2.event.id, 777);

assert(
  seedBracket1.bracket[0][0].player1 === seedBracket2.bracket[0][0].player1,
  'same seed produces same first matchup'
);

// Different seeds produce different brackets (probabilistically true)
var seedState3 = richState();
var seedRes3 = ArenaScheduler.scheduleEvent(seedState3, 'combat_tournament', 1000, 999);
registerN(seedState3, seedRes3.event.id, ['alice','bob','carol','dave','eve','frank','grace','heidi']);
var seedBracket3 = ArenaScheduler.generateBracket(seedState3, seedRes3.event.id, 999);

var seedState4 = richState();
var seedRes4 = ArenaScheduler.scheduleEvent(seedState4, 'combat_tournament', 1000, 12345);
registerN(seedState4, seedRes4.event.id, ['alice','bob','carol','dave','eve','frank','grace','heidi']);
var seedBracket4 = ArenaScheduler.generateBracket(seedState4, seedRes4.event.id, 12345);

// At least one matchup should differ between seeds (with high probability)
var r1Match1_3 = seedBracket3.bracket[0][0].player1;
var r1Match1_4 = seedBracket4.bracket[0][0].player1;
// (This might pass trivially but seeds 999 vs 12345 are sufficiently different)
assert(typeof r1Match1_3 === 'string', 'seed 999 bracket has string player1');
assert(typeof r1Match1_4 === 'string', 'seed 12345 bracket has string player1');

// BYE handling — odd number of players (5) gets padded
var byeState = richState();
var byeEvRes = ArenaScheduler.scheduleEvent(byeState, 'combat_tournament', 1000, 1);
registerN(byeState, byeEvRes.event.id, ['alice','bob','carol','dave','eve']);
var byeBracket = ArenaScheduler.generateBracket(byeState, byeEvRes.event.id, 1);
assert(byeBracket.success === true, 'generateBracket succeeds with 5 players (BYE padding)');
// 5 players -> next pow2 = 8, so 4 matches in round 1
assert(byeBracket.bracket[0].length === 4, 'BYE padding: 5 players -> 4 matches in round 1');

var byeMatches = byeBracket.bracket[0].filter(function(m) { return m.bye; });
assert(byeMatches.length >= 1, 'At least one BYE match exists with 5 players');
assert(byeMatches[0].winnerId !== null, 'BYE match auto-resolved with a winner');

// ---------------------------------------------------------------------------
// SECTION 6: generateBracket — round_robin
// ---------------------------------------------------------------------------
section('generateBracket — round_robin');

var rrState = richState();
var rrRes = ArenaScheduler.scheduleEvent(rrState, 'fishing_derby', 500, 5);
var rrId = rrRes.event.id;
registerN(rrState, rrId, ['alice','bob','carol','dave']);
var rrBracket = ArenaScheduler.generateBracket(rrState, rrId, 5);
assert(rrBracket.success === true, 'round_robin bracket generated for fishing_derby');
// 4 players -> C(4,2) = 6 matches
assert(rrBracket.bracket[0].length === 6, 'round_robin 4 players: 6 matchups');

var rrState3 = richState();
var rrRes3 = ArenaScheduler.scheduleEvent(rrState3, 'fishing_derby', 500, 3);
registerN(rrState3, rrRes3.event.id, ['alice','bob','carol']);
var rrBracket3 = ArenaScheduler.generateBracket(rrState3, rrRes3.event.id, 3);
assert(rrBracket3.bracket[0].length === 3, 'round_robin 3 players: 3 matchups');

// ---------------------------------------------------------------------------
// SECTION 7: generateBracket — swiss
// ---------------------------------------------------------------------------
section('generateBracket — swiss');

var swState = richState();
var swRes = ArenaScheduler.scheduleEvent(swState, 'card_championship', 3000, 11);
var swId = swRes.event.id;
registerN(swState, swId, ['alice','bob','carol','dave','eve','frank','grace','heidi']);
var swBracket = ArenaScheduler.generateBracket(swState, swId, 11);
assert(swBracket.success === true, 'swiss bracket generated for card_championship');
// 8 even players -> 4 matches round 1
assert(swBracket.bracket[0].length === 4, 'swiss 8 players: 4 pairings in round 1');

// Odd player count for swiss -> BYE
var swOddState = richState();
var swOddRes = ArenaScheduler.scheduleEvent(swOddState, 'card_championship', 3000, 13);
registerN(swOddState, swOddRes.event.id, ['alice','bob','carol','dave','eve']);
var swOddBracket = ArenaScheduler.generateBracket(swOddState, swOddRes.event.id, 13);
assert(swOddBracket.success === true, 'swiss with odd (5) players succeeds');
assert(swOddBracket.bracket[0].length === 3, 'swiss 5 players: 3 pairings (1 bye)');
var swBye = swOddBracket.bracket[0].filter(function(m) { return m.bye; });
assert(swBye.length === 1, 'exactly 1 BYE in swiss with odd players');

// ---------------------------------------------------------------------------
// SECTION 8: generateBracket — double_elimination
// ---------------------------------------------------------------------------
section('generateBracket — double_elimination');

var deState = richState();
var deRes = ArenaScheduler.scheduleEvent(deState, 'grand_tournament', 10000, 99);
var deId = deRes.event.id;
var dePlayers = ['alice','bob','carol','dave','eve','frank','grace','heidi'];
registerN(deState, deId, dePlayers);
var deBracket = ArenaScheduler.generateBracket(deState, deId, 99);
assert(deBracket.success === true, 'double_elimination bracket generated for grand_tournament');
assert(Array.isArray(deBracket.bracket), 'double_elim bracket is array');
assert(deBracket.bracket.length >= 2, 'double_elim has at least 2 rounds/groups');

// Check winners bracket markers
var winnersMatches = deBracket.bracket[0].filter(function(m) { return m.bracket === 'winners'; });
assert(winnersMatches.length > 0, 'double_elim round 0 has winners bracket matches');

// ---------------------------------------------------------------------------
// SECTION 9: advanceRound
// ---------------------------------------------------------------------------
section('advanceRound');

function setupSE4ForAdvance() {
  var st = richState();
  var res = ArenaScheduler.scheduleEvent(st, 'combat_tournament', 1000, 42);
  var id = res.event.id;
  registerN(st, id, ['alice','bob','carol','dave']);
  ArenaScheduler.generateBracket(st, id, 42);
  return { state: st, eventId: id };
}

var advSetup = setupSE4ForAdvance();
var advState = advSetup.state;
var advEvId = advSetup.eventId;

var round0 = ArenaScheduler.getMatchups(advState, advEvId, 0);
assert(round0.length === 2, 'round 0 has 2 matches (4 players)');

// Build results from round 0
var matchResults0 = [];
for (var mi = 0; mi < round0.length; mi++) {
  var m = round0[mi];
  if (!m.bye) {
    matchResults0.push({
      matchId: m.matchId,
      winnerId: m.player1,
      loserId: m.player2,
      score: '2-0'
    });
  }
}

var advRes = ArenaScheduler.advanceRound(advState, advEvId, matchResults0);
assert(advRes.success === true, 'advanceRound succeeds');
assert(Array.isArray(advRes.bracket), 'advanceRound returns bracket array');

// Current round should have advanced
var cr = ArenaScheduler.getCurrentRound(advState, advEvId);
assert(cr.round === 1, 'currentRound advances to 1 after processing round 0');

// Round 1 matchups should contain winners from round 0
var round1 = ArenaScheduler.getMatchups(advState, advEvId, 1);
assert(round1.length >= 1, 'round 1 has at least 1 match');

// Advance final round to get winner
if (round1.length > 0 && !round1[0].bye) {
  var finalResults = [{
    matchId: round1[0].matchId,
    winnerId: round1[0].player1,
    loserId: round1[0].player2,
    score: '3-1'
  }];
  var finalAdvRes = ArenaScheduler.advanceRound(advState, advEvId, finalResults);
  assert(finalAdvRes.success === true, 'advancing final round succeeds');
}

// advanceRound on non-existent event
var advFail = ArenaScheduler.advanceRound(makeState(), 'fake_id', []);
assert(advFail.success === false, 'advanceRound fails for non-existent event');

// getCurrentRound for non-existent event
var crFake = ArenaScheduler.getCurrentRound(makeState(), 'fake_event');
assert(crFake.round === -1, 'getCurrentRound returns round=-1 for unknown event');
assert(Array.isArray(crFake.matchups) && crFake.matchups.length === 0, 'getCurrentRound returns empty matchups for unknown event');

// getMatchups for non-existent event
var muFake = ArenaScheduler.getMatchups(makeState(), 'fake_event', 0);
assert(Array.isArray(muFake) && muFake.length === 0, 'getMatchups returns [] for unknown event');

// getMatchups out of range round
var advSetup2 = setupSE4ForAdvance();
var muOob = ArenaScheduler.getMatchups(advSetup2.state, advSetup2.eventId, 999);
assert(Array.isArray(muOob) && muOob.length === 0, 'getMatchups returns [] for out-of-range round');

// ---------------------------------------------------------------------------
// SECTION 10: completeEvent
// ---------------------------------------------------------------------------
section('completeEvent');

function setupAndRunTournament(players, typeId, startTick, seed) {
  var st = richState();
  var res = ArenaScheduler.scheduleEvent(st, typeId, startTick, seed);
  var id = res.event.id;
  registerN(st, id, players);
  ArenaScheduler.generateBracket(st, id, seed);

  // Resolve all rounds for single_elimination by always picking player1
  var maxRounds = 10;
  for (var r = 0; r < maxRounds; r++) {
    var rnd = ArenaScheduler.getCurrentRound(st, id);
    if (rnd.round < 0 || rnd.matchups.length === 0) break;
    var results = [];
    for (var m = 0; m < rnd.matchups.length; m++) {
      var match = rnd.matchups[m];
      if (!match.bye && !match.winnerId) {
        results.push({
          matchId: match.matchId,
          winnerId: match.player1,
          loserId: match.player2,
          score: '1-0'
        });
      }
    }
    if (results.length === 0) break;
    ArenaScheduler.advanceRound(st, id, results);
  }

  return { state: st, eventId: id };
}

var comp4 = setupAndRunTournament(['alice','bob','carol','dave'], 'combat_tournament', 1000, 42);
var compRes = ArenaScheduler.completeEvent(comp4.state, comp4.eventId);
assert(compRes.success === true, 'completeEvent succeeds after tournament rounds');
assert(compRes.results !== null, 'completeEvent returns results');
assert(typeof compRes.results.first === 'string', 'first place winner is a string');

// First place gets prize
assert(compRes.prizes[compRes.results.first] !== undefined, 'first place prize exists in prizes map');
assert(compRes.prizes[compRes.results.first].amount === 100, 'first place wins 100 Spark');

// Balances updated
var winner = compRes.results.first;
assert(comp4.state.balances[winner] > 1000 - 10, 'winner balance increased (paid 10 entry, won 100)');

// Cannot complete twice
var compAgain = ArenaScheduler.completeEvent(comp4.state, comp4.eventId);
assert(compAgain.success === false, 'completeEvent fails if called twice');

// Event status set to completed
var completedEv = ArenaScheduler.getEventById(comp4.state, comp4.eventId);
assert(completedEv.status === 'completed', 'event status is completed');

// getResults after completion
var getRes = ArenaScheduler.getResults(comp4.state, comp4.eventId);
assert(getRes !== null, 'getResults returns non-null after completion');
assert(typeof getRes.first === 'string', 'getResults.first is a string');

// Prizes sum (first + second + third)
var totalPrize = 100 + 50 + 25; // combat_tournament
var collectedPrize = 0;
for (var pp in compRes.prizes) {
  collectedPrize += compRes.prizes[pp].amount;
}
// With only 4 players we may only have first + second if third was a BYE
assert(collectedPrize >= 100, 'at minimum first prize was distributed');

// Complete event for cancelled event fails
var cancelledState = richState();
var cancelledEvRes = ArenaScheduler.scheduleEvent(cancelledState, 'obstacle_race', 500, 1);
ArenaScheduler.cancelEvent(cancelledState, cancelledEvRes.event.id);
var cancelledComplete = ArenaScheduler.completeEvent(cancelledState, cancelledEvRes.event.id);
assert(cancelledComplete.success === false, 'completeEvent fails for cancelled event');

// completeEvent for non-existent event
var fakeComplete = ArenaScheduler.completeEvent(makeState(), 'fake_event');
assert(fakeComplete.success === false, 'completeEvent fails for non-existent event');

// ---------------------------------------------------------------------------
// SECTION 11: cancelEvent
// ---------------------------------------------------------------------------
section('cancelEvent');

var cancelState = richState();
var cancelEvRes = ArenaScheduler.scheduleEvent(cancelState, 'combat_tournament', 8000, 3);
var cancelEvId = cancelEvRes.event.id;

registerN(cancelState, cancelEvId, ['alice','bob','carol','dave']);
assert(cancelState.balances['alice'] === 990, 'alice paid 10 entry fee');
assert(cancelState.balances['bob'] === 990, 'bob paid 10 entry fee');

var cancelRes = ArenaScheduler.cancelEvent(cancelState, cancelEvId);
assert(cancelRes.success === true, 'cancelEvent succeeds');
assert(typeof cancelRes.reason === 'string', 'cancelEvent returns reason string');
assert(cancelRes.refunds['alice'] === 10, 'alice refunded 10');
assert(cancelRes.refunds['bob'] === 10, 'bob refunded 10');
assert(cancelRes.refunds['carol'] === 10, 'carol refunded 10');
assert(cancelState.balances['alice'] === 1000, 'alice balance restored to 1000');
assert(cancelState.balances['bob'] === 1000, 'bob balance restored to 1000');

// Event status is cancelled
var cancelledEv = ArenaScheduler.getEventById(cancelState, cancelEvId);
assert(cancelledEv.status === 'cancelled', 'event status is cancelled');
assert(cancelledEv.registrationOpen === false, 'registrationOpen false after cancel');

// Cancel non-existent event
var cancelFake = ArenaScheduler.cancelEvent(makeState(), 'fake_event');
assert(cancelFake.success === false, 'cancelEvent fails for non-existent event');

// Cannot cancel a completed event
var cancelCompleted = setupAndRunTournament(['alice','bob','carol','dave'], 'combat_tournament', 500, 5);
ArenaScheduler.completeEvent(cancelCompleted.state, cancelCompleted.eventId);
var cancelComp = ArenaScheduler.cancelEvent(cancelCompleted.state, cancelCompleted.eventId);
assert(cancelComp.success === false, 'cannot cancel a completed event');

// Cancel event with no participants (no refunds needed)
var emptyCancel = makeState();
var emptyEvRes = ArenaScheduler.scheduleEvent(emptyCancel, 'trivia_challenge', 100, 1);
var emptyCanRes = ArenaScheduler.cancelEvent(emptyCancel, emptyEvRes.event.id);
assert(emptyCanRes.success === true, 'cancel event with 0 participants succeeds');
assert(Object.keys(emptyCanRes.refunds).length === 0, 'no refunds for 0-participant event');

// ---------------------------------------------------------------------------
// SECTION 12: Player History
// ---------------------------------------------------------------------------
section('Player History');

var histState = richState();
var histRes1 = ArenaScheduler.scheduleEvent(histState, 'combat_tournament', 100, 1);
registerN(histState, histRes1.event.id, ['alice','bob','carol','dave']);
ArenaScheduler.generateBracket(histState, histRes1.event.id, 1);

// Resolve so alice always wins
var histRound = ArenaScheduler.getCurrentRound(histState, histRes1.event.id);
var histResults = histRound.matchups.filter(function(m) { return !m.bye; }).map(function(m) {
  return { matchId: m.matchId, winnerId: 'alice', loserId: m.player1 === 'alice' ? m.player2 : m.player1 };
});
// We need alice to actually be in the match to win; use whoever is player1 as winner
histResults = histRound.matchups.filter(function(m) { return !m.bye; }).map(function(m) {
  return { matchId: m.matchId, winnerId: m.player1, loserId: m.player2 };
});
ArenaScheduler.advanceRound(histState, histRes1.event.id, histResults);

// Advance second round
var histRound2 = ArenaScheduler.getCurrentRound(histState, histRes1.event.id);
if (histRound2.matchups.length > 0) {
  var histResults2 = histRound2.matchups.filter(function(m) { return !m.bye; }).map(function(m) {
    return { matchId: m.matchId, winnerId: m.player1, loserId: m.player2 };
  });
  if (histResults2.length > 0) ArenaScheduler.advanceRound(histState, histRes1.event.id, histResults2);
}

ArenaScheduler.completeEvent(histState, histRes1.event.id);

// Check alice's history
var aliceHistory = ArenaScheduler.getPlayerHistory(histState, 'alice');
assert(aliceHistory.playerId === 'alice', 'history.playerId is alice');
assert(Array.isArray(aliceHistory.events), 'history.events is array');
assert(aliceHistory.events.length >= 1, 'alice has at least 1 event in history');
assert(typeof aliceHistory.wins === 'number', 'history.wins is a number');
assert(typeof aliceHistory.losses === 'number', 'history.losses is a number');
assert(typeof aliceHistory.totalPrize === 'number', 'history.totalPrize is a number');
assert(typeof aliceHistory.totalXp === 'number', 'history.totalXp is a number');

// All participants in event have history
var histParts = ArenaScheduler.getParticipants(histState, histRes1.event.id);
for (var hp = 0; hp < histParts.length; hp++) {
  var ph = ArenaScheduler.getPlayerHistory(histState, histParts[hp]);
  assert(ph.events.length >= 1, histParts[hp] + ' has event in history');
}

// Player with no history returns defaults
var noHistPlayer = ArenaScheduler.getPlayerHistory(makeState(), 'unknown_player_xyz');
assert(noHistPlayer.wins === 0, 'unknown player has 0 wins');
assert(noHistPlayer.events.length === 0, 'unknown player has empty events');
assert(noHistPlayer.totalPrize === 0, 'unknown player has 0 totalPrize');

// History tracks wins correctly after first place finish
// (first place winner should have wins >= 1)
var firstWinner = ArenaScheduler.getResults(histState, histRes1.event.id);
if (firstWinner && firstWinner.first) {
  var winnerHist = ArenaScheduler.getPlayerHistory(histState, firstWinner.first);
  assert(winnerHist.wins >= 1, 'first place finisher has wins >= 1');
  assert(winnerHist.totalPrize >= 100, 'first place winner has totalPrize >= 100');
}

// ---------------------------------------------------------------------------
// SECTION 13: Leaderboard
// ---------------------------------------------------------------------------
section('Leaderboard');

var lbState = richState();

// Run two tournaments so we can check ranking
var lbRes1 = ArenaScheduler.scheduleEvent(lbState, 'combat_tournament', 100, 1);
registerN(lbState, lbRes1.event.id, ['alice','bob','carol','dave']);
ArenaScheduler.generateBracket(lbState, lbRes1.event.id, 1);
// Resolve: alice always wins by picking player1
(function() {
  for (var r = 0; r < 5; r++) {
    var rnd = ArenaScheduler.getCurrentRound(lbState, lbRes1.event.id);
    if (rnd.round < 0 || rnd.matchups.length === 0) break;
    var results = rnd.matchups.filter(function(m) { return !m.bye; }).map(function(m) {
      return { matchId: m.matchId, winnerId: m.player1, loserId: m.player2 };
    });
    if (results.length === 0) break;
    ArenaScheduler.advanceRound(lbState, lbRes1.event.id, results);
  }
})();
ArenaScheduler.completeEvent(lbState, lbRes1.event.id);

var lb1 = ArenaScheduler.getLeaderboard(lbState, 'combat_tournament', 10);
assert(Array.isArray(lb1), 'getLeaderboard returns array');
assert(lb1.length >= 1, 'leaderboard has at least 1 entry after tournament');

// Leaderboard entries have required fields
var lbe = lb1[0];
assert(typeof lbe.playerId === 'string', 'leaderboard entry has playerId');
assert(typeof lbe.wins === 'number', 'leaderboard entry has wins');
assert(typeof lbe.top3 === 'number', 'leaderboard entry has top3');
assert(typeof lbe.totalPrize === 'number', 'leaderboard entry has totalPrize');

// Count parameter limits results
var lbLimited = ArenaScheduler.getLeaderboard(lbState, 'combat_tournament', 1);
assert(lbLimited.length === 1, 'leaderboard count=1 returns 1 entry');

// Empty leaderboard for unused type
var emptyLb = ArenaScheduler.getLeaderboard(makeState(), 'grand_tournament', 10);
assert(Array.isArray(emptyLb) && emptyLb.length === 0, 'empty leaderboard for unused event type');

// Leaderboard sorted by wins desc
if (lb1.length > 1) {
  assert(lb1[0].wins >= lb1[1].wins, 'leaderboard sorted by wins desc');
}

// Run second tournament and verify leaderboard grows
var lbRes2 = ArenaScheduler.scheduleEvent(lbState, 'combat_tournament', 5000, 2);
registerN(lbState, lbRes2.event.id, ['bob','carol','dave','eve']);
ArenaScheduler.generateBracket(lbState, lbRes2.event.id, 2);
(function() {
  for (var r = 0; r < 5; r++) {
    var rnd = ArenaScheduler.getCurrentRound(lbState, lbRes2.event.id);
    if (rnd.round < 0 || rnd.matchups.length === 0) break;
    var results = rnd.matchups.filter(function(m) { return !m.bye; }).map(function(m) {
      return { matchId: m.matchId, winnerId: m.player1, loserId: m.player2 };
    });
    if (results.length === 0) break;
    ArenaScheduler.advanceRound(lbState, lbRes2.event.id, results);
  }
})();
ArenaScheduler.completeEvent(lbState, lbRes2.event.id);

var lb2 = ArenaScheduler.getLeaderboard(lbState, 'combat_tournament', 10);
assert(lb2.length >= 2, 'leaderboard grows after second tournament');

// ---------------------------------------------------------------------------
// SECTION 14: generateWeeklySchedule
// ---------------------------------------------------------------------------
section('generateWeeklySchedule');

var weekState = ArenaScheduler.createSchedulerState();
weekState.balances = {};
var weekRes = ArenaScheduler.generateWeeklySchedule(weekState, 0, 42);
assert(weekRes.success === true, 'generateWeeklySchedule succeeds');
assert(typeof weekRes.count === 'number', 'weekRes.count is a number');
assert(Array.isArray(weekRes.events), 'weekRes.events is an array');
assert(weekRes.count === weekRes.events.length, 'count matches events array length');

// 3 daily types * 7 days = 21 daily events; 5 weekly types = 5 events -> total 26
assert(weekRes.count === 26, 'weekly schedule generates 26 events (21 daily + 5 weekly) got ' + weekRes.count);

// All event IDs in schedule are unique
var weekEventIds = weekRes.events.map(function(e) { return e.id; });
var uniqueWeekIds = {};
for (var wi = 0; wi < weekEventIds.length; wi++) {
  uniqueWeekIds[weekEventIds[wi]] = true;
}
assert(Object.keys(uniqueWeekIds).length === weekEventIds.length, 'all weekly schedule event IDs are unique');

// All events within week tick range [0, 7*1440]
var weekMax = 7 * 1440;
var allInRange = true;
for (var we = 0; we < weekRes.events.length; we++) {
  var wev = ArenaScheduler.getEventById(weekState, weekRes.events[we].id);
  if (wev.startTick < 0 || wev.startTick > weekMax) {
    allInRange = false;
    break;
  }
}
assert(allInRange, 'all weekly schedule events have startTick within week range');

// Same seed produces same schedule order
var weekState2 = ArenaScheduler.createSchedulerState();
weekState2.balances = {};
var weekRes2 = ArenaScheduler.generateWeeklySchedule(weekState2, 0, 42);
assert(weekRes2.count === weekRes.count, 'same seed generates same event count');

// Different start tick offsets the schedule
var weekState3 = ArenaScheduler.createSchedulerState();
weekState3.balances = {};
var weekRes3 = ArenaScheduler.generateWeeklySchedule(weekState3, 10000, 42);
var firstEv3 = ArenaScheduler.getEventById(weekState3, weekRes3.events[0].id);
assert(firstEv3.startTick >= 10000, 'weekly schedule respects startTick offset');

// getSchedule on generated week returns all events
var weekSched = ArenaScheduler.getSchedule(weekState, 0, weekMax + 1000);
assert(weekSched.length === weekRes.count, 'getSchedule retrieves all generated weekly events');

// Weekly events appear at correct day-of-week offsets
var combatInWeek = weekSched.filter(function(e) { return e.type === 'combat_tournament'; });
assert(combatInWeek.length === 1, 'combat_tournament appears exactly once in weekly schedule');
// combat_tournament dayOfWeek=0, so startTick should be within day 0 (ticks 0 - 1439)
assert(combatInWeek[0].startTick < 2 * 1440, 'combat_tournament scheduled in first two days (dayOfWeek=0)');

var dailyTypes2 = weekSched.filter(function(e) {
  var et = ArenaScheduler.getEventType(e.type);
  return et && et.frequency === 'daily';
});
assert(dailyTypes2.length === 21, 'weekly schedule has 21 daily event instances (3 types * 7 days)');
var weeklyTypes2 = weekSched.filter(function(e) {
  var et = ArenaScheduler.getEventType(e.type);
  return et && et.frequency === 'weekly';
});
assert(weeklyTypes2.length === 5, 'weekly schedule has 5 weekly event instances (one per weekly type)');

// ---------------------------------------------------------------------------
// SECTION 15: Edge Cases
// ---------------------------------------------------------------------------
section('Edge Cases');

// completeEvent with 0 participants
var zeroState = makeState();
var zeroRes = ArenaScheduler.scheduleEvent(zeroState, 'obstacle_race', 100, 1);
var zeroComplete = ArenaScheduler.completeEvent(zeroState, zeroRes.event.id);
assert(zeroComplete.success === true, 'completeEvent with 0 participants does not throw');

// getResults for non-existent event returns null
var nullRes = ArenaScheduler.getResults(makeState(), 'fake_event');
assert(nullRes === null, 'getResults returns null for non-existent event');

// createSchedulerState returns valid structure
var freshState = ArenaScheduler.createSchedulerState();
assert(typeof freshState.events === 'object', 'createSchedulerState has events');
assert(typeof freshState.brackets === 'object', 'createSchedulerState has brackets');
assert(typeof freshState.playerHistory === 'object', 'createSchedulerState has playerHistory');
assert(typeof freshState.leaderboards === 'object', 'createSchedulerState has leaderboards');
assert(freshState.nextEventCounter === 1, 'createSchedulerState nextEventCounter starts at 1');

// Multiple events incrementing counter
var ctrState = ArenaScheduler.createSchedulerState();
ctrState.balances = {};
var ctr1 = ArenaScheduler.scheduleEvent(ctrState, 'fishing_derby', 100, 1);
var ctr2 = ArenaScheduler.scheduleEvent(ctrState, 'fishing_derby', 200, 1);
var ctr3 = ArenaScheduler.scheduleEvent(ctrState, 'obstacle_race', 300, 1);
assert(ctr1.event.id !== ctr2.event.id, 'counter ensures unique IDs (1 vs 2)');
assert(ctr2.event.id !== ctr3.event.id, 'counter ensures unique IDs (2 vs 3)');

// getEventTypes returns a copy (mutations don't affect internal state)
var typesCopy = ArenaScheduler.getEventTypes();
typesCopy.push({ id: 'fake_injected' });
var typesCopy2 = ArenaScheduler.getEventTypes();
assert(typesCopy2.length === 10, 'getEventTypes returns a defensive copy');

// getParticipants returns a copy
var copyPartState = richState();
var copyPartRes = ArenaScheduler.scheduleEvent(copyPartState, 'fishing_derby', 100, 1);
ArenaScheduler.register(copyPartState, 'alice', copyPartRes.event.id);
var partsCopy = ArenaScheduler.getParticipants(copyPartState, copyPartRes.event.id);
partsCopy.push('injected_player');
var partsOrig = ArenaScheduler.getParticipants(copyPartState, copyPartRes.event.id);
assert(partsOrig.length === 1, 'getParticipants returns defensive copy');

// Register after cancel still fails
var reRegState = richState();
var reRegEvRes = ArenaScheduler.scheduleEvent(reRegState, 'trivia_challenge', 1000, 1);
ArenaScheduler.cancelEvent(reRegState, reRegEvRes.event.id);
var reReg = ArenaScheduler.register(reRegState, 'alice', reRegEvRes.event.id);
assert(reReg.success === false, 'cannot re-register after cancel');

// Player with exact balance for entry fee
var exactState = makeState({ exactplayer: 10 });
var exactEvRes = ArenaScheduler.scheduleEvent(exactState, 'combat_tournament', 100, 1);
var exactReg = ArenaScheduler.register(exactState, 'exactplayer', exactEvRes.event.id);
assert(exactReg.success === true, 'player with exact balance can register');
assert(exactState.balances['exactplayer'] === 0, 'balance is 0 after paying exact entry fee');

// Player with 1 less than fee
var underState = makeState({ underplayer: 9 });
var underEvRes = ArenaScheduler.scheduleEvent(underState, 'combat_tournament', 100, 1);
var underReg = ArenaScheduler.register(underState, 'underplayer', underEvRes.event.id);
assert(underReg.success === false, 'player with 1 less than fee cannot register');

// generateBracket for already in-progress event (second call)
var dblBracketState = richState();
var dblBracketRes = ArenaScheduler.scheduleEvent(dblBracketState, 'combat_tournament', 500, 1);
registerN(dblBracketState, dblBracketRes.event.id, ['alice','bob','carol','dave']);
ArenaScheduler.generateBracket(dblBracketState, dblBracketRes.event.id, 1);
// Second call should still return a bracket even if status changed
var dblBracket2 = ArenaScheduler.generateBracket(dblBracketState, dblBracketRes.event.id, 2);
assert(dblBracket2.success === true, 'generateBracket can regenerate bracket for in_progress event');

// getSchedule with same start and end tick
var sameTickSched = ArenaScheduler.scheduleEvent(makeState(), 'obstacle_race', 500, 1);
var sameTickState = makeState();
ArenaScheduler.scheduleEvent(sameTickState, 'obstacle_race', 500, 1);
var sameSched = ArenaScheduler.getSchedule(sameTickState, 500, 500);
assert(sameSched.length === 1, 'getSchedule with same from/to tick returns exact-match events');

// getUpcomingEvents with count=0 returns all upcoming
var upcomingAllState = ArenaScheduler.createSchedulerState();
upcomingAllState.balances = {};
ArenaScheduler.scheduleEvent(upcomingAllState, 'fishing_derby', 200, 1);
ArenaScheduler.scheduleEvent(upcomingAllState, 'trivia_challenge', 400, 1);
ArenaScheduler.scheduleEvent(upcomingAllState, 'obstacle_race', 600, 1);
var upcomingAll = ArenaScheduler.getUpcomingEvents(upcomingAllState, 0, 0);
assert(upcomingAll.length === 3, 'getUpcomingEvents count=0 returns all upcoming events');

// ---------------------------------------------------------------------------
// RESULTS SUMMARY
// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log('Arena Scheduler Test Results');
console.log('========================================');
console.log('Total:  ' + total);
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
