/**
 * Tests for src/js/event_consequences.js
 * Run with: node tests/test_event_consequences.js
 */

var EventConsequences = require('../src/js/event_consequences');

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
// Helpers
// ---------------------------------------------------------------------------
function makeState() {
  return EventConsequences.createVoteState();
}

// ---------------------------------------------------------------------------
// SECTION 1: Module Exports
// ---------------------------------------------------------------------------
section('Module Exports');

assert(typeof EventConsequences === 'object', 'EventConsequences is an object');
assert(Array.isArray(EventConsequences.CONSEQUENCE_TYPES), 'CONSEQUENCE_TYPES exported');
assert(Array.isArray(EventConsequences.CASCADE_RULES), 'CASCADE_RULES exported');
assert(typeof EventConsequences.createVoteState === 'function', 'createVoteState exported');
assert(typeof EventConsequences.proposeVote === 'function', 'proposeVote exported');
assert(typeof EventConsequences.castVote === 'function', 'castVote exported');
assert(typeof EventConsequences.closeVoting === 'function', 'closeVoting exported');
assert(typeof EventConsequences.applyCascades === 'function', 'applyCascades exported');
assert(typeof EventConsequences.getActiveEffects === 'function', 'getActiveEffects exported');
assert(typeof EventConsequences.getEffectValue === 'function', 'getEffectValue exported');
assert(typeof EventConsequences.expireEffects === 'function', 'expireEffects exported');
assert(typeof EventConsequences.getOpenVotes === 'function', 'getOpenVotes exported');
assert(typeof EventConsequences.getVoteById === 'function', 'getVoteById exported');
assert(typeof EventConsequences.getVoteHistory === 'function', 'getVoteHistory exported');
assert(typeof EventConsequences.getPlayerVotes === 'function', 'getPlayerVotes exported');
assert(typeof EventConsequences.getConsequenceTypes === 'function', 'getConsequenceTypes exported');
assert(typeof EventConsequences.getCascadeRules === 'function', 'getCascadeRules exported');
assert(typeof EventConsequences.getVoteLedger === 'function', 'getVoteLedger exported');
assert(typeof EventConsequences.getZoneEffectSummary === 'function', 'getZoneEffectSummary exported');
assert(typeof EventConsequences.getWorldPolicy === 'function', 'getWorldPolicy exported');
assert(typeof EventConsequences.canVote === 'function', 'canVote exported');
assert(typeof EventConsequences.getVoteResults === 'function', 'getVoteResults exported');

// ---------------------------------------------------------------------------
// SECTION 2: CONSEQUENCE_TYPES Structure
// ---------------------------------------------------------------------------
section('CONSEQUENCE_TYPES Structure');

var CT = EventConsequences.getConsequenceTypes();

assert(Array.isArray(CT), 'getConsequenceTypes returns array');
assert(CT.length === 10, 'Exactly 10 consequence types');

var ctIds = CT.map(function(c) { return c.id; });
assert(ctIds.indexOf('zone_weather') !== -1, 'zone_weather exists');
assert(ctIds.indexOf('resource_access') !== -1, 'resource_access exists');
assert(ctIds.indexOf('npc_leadership') !== -1, 'npc_leadership exists');
assert(ctIds.indexOf('zone_rules') !== -1, 'zone_rules exists');
assert(ctIds.indexOf('market_regulation') !== -1, 'market_regulation exists');
assert(ctIds.indexOf('festival_theme') !== -1, 'festival_theme exists');
assert(ctIds.indexOf('building_priority') !== -1, 'building_priority exists');
assert(ctIds.indexOf('tax_rate') !== -1, 'tax_rate exists');
assert(ctIds.indexOf('event_schedule') !== -1, 'event_schedule exists');
assert(ctIds.indexOf('world_policy') !== -1, 'world_policy exists');

// Validate each consequence type has required fields
for (var i = 0; i < CT.length; i++) {
  var ct = CT[i];
  assert(typeof ct.id === 'string' && ct.id.length > 0, ct.id + ' has valid id');
  assert(typeof ct.name === 'string' && ct.name.length > 0, ct.id + ' has name');
  assert(typeof ct.description === 'string' && ct.description.length > 0, ct.id + ' has description');
  assert(Array.isArray(ct.options) && ct.options.length >= 2, ct.id + ' has at least 2 options');
  assert(typeof ct.duration === 'number' && ct.duration > 0, ct.id + ' has positive duration');
  assert(typeof ct.cooldown === 'number' && ct.cooldown > 0, ct.id + ' has positive cooldown');
  assert(ct.cooldown > ct.duration, ct.id + ' cooldown > duration');
}

// Validate zone_weather options
var weatherType = null;
for (var wi = 0; wi < CT.length; wi++) {
  if (CT[wi].id === 'zone_weather') { weatherType = CT[wi]; break; }
}
assert(weatherType !== null, 'Found zone_weather type');
var weatherOptionIds = weatherType.options.map(function(o) { return o.id; });
assert(weatherOptionIds.indexOf('sunny') !== -1, 'zone_weather has sunny option');
assert(weatherOptionIds.indexOf('rainy') !== -1, 'zone_weather has rainy option');
assert(weatherOptionIds.indexOf('stormy') !== -1, 'zone_weather has stormy option');

// Validate each option has effect
for (var oi = 0; oi < weatherType.options.length; oi++) {
  var opt = weatherType.options[oi];
  assert(typeof opt.id === 'string', 'Weather option ' + oi + ' has id');
  assert(typeof opt.label === 'string', 'Weather option ' + oi + ' has label');
  assert(typeof opt.effect === 'object' && opt.effect !== null, 'Weather option ' + oi + ' has effect');
}

// Validate sunny effect
var sunnyOpt = null;
for (var si = 0; si < weatherType.options.length; si++) {
  if (weatherType.options[si].id === 'sunny') { sunnyOpt = weatherType.options[si]; break; }
}
assert(sunnyOpt !== null, 'Found sunny option');
assert(sunnyOpt.effect.gathering_bonus === 0.2, 'Sunny has gathering_bonus 0.2');
assert(sunnyOpt.effect.fishing_penalty === -0.1, 'Sunny has fishing_penalty -0.1');

// ---------------------------------------------------------------------------
// SECTION 3: CASCADE_RULES Structure
// ---------------------------------------------------------------------------
section('CASCADE_RULES Structure');

var CR = EventConsequences.getCascadeRules();

assert(Array.isArray(CR), 'getCascadeRules returns array');
assert(CR.length === 15, 'Exactly 15 cascade rules');

for (var ci = 0; ci < CR.length; ci++) {
  var rule = CR[ci];
  assert(typeof rule.trigger === 'object', 'Rule ' + ci + ' has trigger');
  assert(typeof rule.trigger.type === 'string', 'Rule ' + ci + ' trigger has type');
  assert(typeof rule.trigger.option === 'string', 'Rule ' + ci + ' trigger has option');
  assert(typeof rule.cascade === 'object', 'Rule ' + ci + ' has cascade');
  assert(typeof rule.cascade.type === 'string', 'Rule ' + ci + ' cascade has type');
  assert(typeof rule.description === 'string' && rule.description.length > 0, 'Rule ' + ci + ' has description');
}

// Check specific cascade: resource_access restricted -> market_price_surge
var resourceCascade = null;
for (var rci = 0; rci < CR.length; rci++) {
  if (CR[rci].trigger.type === 'resource_access' && CR[rci].trigger.option === 'restricted') {
    resourceCascade = CR[rci];
    break;
  }
}
assert(resourceCascade !== null, 'resource_access restricted cascade exists');
assert(resourceCascade.cascade.type === 'market_price_surge', 'Cascade type is market_price_surge');
assert(resourceCascade.cascade.zone === 'agora', 'Cascade targets agora');
assert(resourceCascade.cascade.multiplier === 1.3, 'Cascade multiplier is 1.3');
assert(resourceCascade.cascade.delay === 100, 'Cascade delay is 100');

// ---------------------------------------------------------------------------
// SECTION 4: createVoteState
// ---------------------------------------------------------------------------
section('createVoteState');

var state = makeState();
assert(typeof state === 'object', 'createVoteState returns object');
assert(Array.isArray(state.votes), 'state.votes is array');
assert(Array.isArray(state.activeEffects), 'state.activeEffects is array');
assert(Array.isArray(state.voteLedger), 'state.voteLedger is array');
assert(typeof state.zoneCooldowns === 'object', 'state.zoneCooldowns is object');
assert(state.votes.length === 0, 'state.votes initially empty');
assert(state.activeEffects.length === 0, 'state.activeEffects initially empty');
assert(state.voteLedger.length === 0, 'state.voteLedger initially empty');

// ---------------------------------------------------------------------------
// SECTION 5: proposeVote
// ---------------------------------------------------------------------------
section('proposeVote');

var s1 = makeState();
var result = EventConsequences.proposeVote(s1, 'alice', 'zone_weather', 'gardens', 1000);
assert(result.success === true, 'proposeVote succeeds for valid type');
assert(result.vote !== null, 'proposeVote returns vote');
assert(result.reason === null, 'proposeVote reason is null on success');
assert(typeof result.vote.id === 'string', 'Vote has string id');
assert(result.vote.consequenceType === 'zone_weather', 'Vote has correct consequenceType');
assert(result.vote.zone === 'gardens', 'Vote has correct zone');
assert(result.vote.status === 'open', 'Vote status is open');
assert(result.vote.openedAt === 1000, 'Vote openedAt = 1000');
assert(result.vote.closesAt === 1500, 'Vote closesAt = openedAt + 500');
assert(result.vote.proposerId === 'alice', 'Vote proposerId = alice');
assert(result.vote.appliedAt === null, 'Vote appliedAt initially null');
assert(result.vote.result === null, 'Vote result initially null');
assert(Array.isArray(result.vote.options), 'Vote options is array');
assert(result.vote.options.length === 3, 'Vote has 3 options (zone_weather)');
assert(result.vote.options[0].votes === 0, 'Option votes start at 0');
assert(Array.isArray(result.vote.options[0].voters), 'Option voters is array');
assert(s1.votes.length === 1, 'Vote added to state.votes');
assert(s1.voteLedger.length === 1, 'Ledger entry created');
assert(s1.voteLedger[0].event === 'vote_proposed', 'Ledger event is vote_proposed');

// Unknown consequence type
var badResult = EventConsequences.proposeVote(s1, 'alice', 'nonexistent_type', 'gardens', 1000);
assert(badResult.success === false, 'proposeVote fails for unknown type');
assert(badResult.vote === null, 'proposeVote returns null vote on failure');
assert(typeof badResult.reason === 'string', 'proposeVote returns reason on failure');

// Duplicate open vote
var s2 = makeState();
EventConsequences.proposeVote(s2, 'alice', 'zone_weather', 'gardens', 1000);
var dupResult = EventConsequences.proposeVote(s2, 'bob', 'zone_weather', 'gardens', 1001);
assert(dupResult.success === false, 'Cannot open duplicate vote same type+zone');
assert(typeof dupResult.reason === 'string', 'Duplicate vote has reason');

// Different zone same type is allowed
var diffZoneResult = EventConsequences.proposeVote(s2, 'bob', 'zone_weather', 'nexus', 1001);
assert(diffZoneResult.success === true, 'Different zone same type is allowed');

// Cooldown check
var s3 = makeState();
var v3 = EventConsequences.proposeVote(s3, 'alice', 'resource_access', 'gardens', 1000);
assert(v3.success === true, 'First resource_access vote opens');
EventConsequences.closeVoting(s3, v3.vote.id, 1100);
// cooldown is 1200, so at tick 1100 + 1200 = 2300 we're in cooldown
var cooldownResult = EventConsequences.proposeVote(s3, 'alice', 'resource_access', 'gardens', 1500);
assert(cooldownResult.success === false, 'proposeVote blocked by cooldown');
assert(typeof cooldownResult.reason === 'string', 'Cooldown block has reason string');
// After cooldown expires
var afterCooldown = EventConsequences.proposeVote(s3, 'alice', 'resource_access', 'gardens', 3000);
assert(afterCooldown.success === true, 'proposeVote succeeds after cooldown');

// ---------------------------------------------------------------------------
// SECTION 6: castVote
// ---------------------------------------------------------------------------
section('castVote');

var s4 = makeState();
var v4 = EventConsequences.proposeVote(s4, 'alice', 'zone_weather', 'gardens', 1000);
var voteId4 = v4.vote.id;

var cv1 = EventConsequences.castVote(s4, 'bob', voteId4, 'sunny');
assert(cv1.success === true, 'castVote succeeds for valid params');
assert(cv1.option.votes === 1, 'Option vote count incremented to 1');
assert(cv1.option.voters.indexOf('bob') !== -1, 'Bob added to voters');

var cv2 = EventConsequences.castVote(s4, 'carol', voteId4, 'rainy');
assert(cv2.success === true, 'Second voter succeeds');
assert(cv2.option.votes === 1, 'Rainy has 1 vote');

// Duplicate vote by same player
var dupVote = EventConsequences.castVote(s4, 'bob', voteId4, 'rainy');
assert(dupVote.success === false, 'Player cannot vote twice');
assert(typeof dupVote.reason === 'string', 'Duplicate vote has reason');

// Unknown vote id
var badVote = EventConsequences.castVote(s4, 'dave', 'nonexistent_vote_id', 'sunny');
assert(badVote.success === false, 'castVote fails for unknown voteId');

// Unknown option id
var badOpt = EventConsequences.castVote(s4, 'dave', voteId4, 'hurricane');
assert(badOpt.success === false, 'castVote fails for unknown optionId');

// Vote after close
var s5 = makeState();
var v5 = EventConsequences.proposeVote(s5, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.closeVoting(s5, v5.vote.id, 1200);
var lateVote = EventConsequences.castVote(s5, 'bob', v5.vote.id, 'sunny');
assert(lateVote.success === false, 'Cannot vote after vote is closed');

// ---------------------------------------------------------------------------
// SECTION 7: closeVoting
// ---------------------------------------------------------------------------
section('closeVoting');

var s6 = makeState();
var v6 = EventConsequences.proposeVote(s6, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.castVote(s6, 'bob', v6.vote.id, 'sunny');
EventConsequences.castVote(s6, 'carol', v6.vote.id, 'sunny');
EventConsequences.castVote(s6, 'dave', v6.vote.id, 'rainy');

var closeResult = EventConsequences.closeVoting(s6, v6.vote.id, 1500);
assert(closeResult.success === true, 'closeVoting succeeds');
assert(closeResult.result !== null, 'closeVoting has result');
assert(closeResult.result.id === 'sunny', 'Sunny wins with most votes');
assert(Array.isArray(closeResult.effects), 'closeVoting returns effects array');
assert(closeResult.effects.length > 0, 'Effects are applied');
assert(typeof closeResult.totalVotes === 'number', 'closeVoting returns totalVotes');
assert(closeResult.totalVotes === 3, 'Total votes = 3');

var closedVote = EventConsequences.getVoteById(s6, v6.vote.id);
assert(closedVote.status === 'closed', 'Vote status changed to closed');
assert(closedVote.result === 'sunny', 'Vote result is sunny');
assert(closedVote.appliedAt === 1500, 'Vote appliedAt = 1500');
assert(closedVote.effects.length > 0, 'Vote effects list populated');

// Effects are in state
assert(s6.activeEffects.length > 0, 'Active effects added to state');
var gatheringEffect = null;
for (var gei = 0; gei < s6.activeEffects.length; gei++) {
  if (s6.activeEffects[gei].type === 'gathering_bonus') {
    gatheringEffect = s6.activeEffects[gei];
    break;
  }
}
assert(gatheringEffect !== null, 'gathering_bonus effect created');
assert(gatheringEffect.value === 0.2, 'gathering_bonus value = 0.2');
assert(gatheringEffect.zone === 'gardens', 'Effect zone = gardens');
assert(gatheringEffect.startTick === 1500, 'Effect startTick = 1500');
assert(gatheringEffect.endTick === 2000, 'Effect endTick = startTick + 500 (zone_weather duration)');

// Cannot close already-closed vote
var reclose = EventConsequences.closeVoting(s6, v6.vote.id, 1600);
assert(reclose.success === false, 'Cannot close already-closed vote');

// Close nonexistent vote
var noVote = EventConsequences.closeVoting(s6, 'fake_vote_id', 1600);
assert(noVote.success === false, 'closeVoting fails for unknown voteId');

// Close with no votes — default to first option
var s7 = makeState();
var v7 = EventConsequences.proposeVote(s7, 'alice', 'zone_weather', 'nexus', 2000);
var emptyClose = EventConsequences.closeVoting(s7, v7.vote.id, 2100);
assert(emptyClose.success === true, 'closeVoting succeeds with no votes');
assert(emptyClose.result !== null, 'Result set even with no votes');

// ---------------------------------------------------------------------------
// SECTION 8: getActiveEffects
// ---------------------------------------------------------------------------
section('getActiveEffects');

var s8 = makeState();
var v8 = EventConsequences.proposeVote(s8, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.castVote(s8, 'bob', v8.vote.id, 'sunny');
EventConsequences.closeVoting(s8, v8.vote.id, 1500);

// During effect window
var effects8 = EventConsequences.getActiveEffects(s8, 'gardens', 1600);
assert(Array.isArray(effects8), 'getActiveEffects returns array');
assert(effects8.length > 0, 'Active effects found during window');

// After effect window (duration 500, closed at 1500, expires at 2000)
var effects8Later = EventConsequences.getActiveEffects(s8, 'gardens', 2100);
assert(effects8Later.length === 0, 'No active effects after expiry');

// Before effect starts
var effects8Before = EventConsequences.getActiveEffects(s8, 'gardens', 1400);
assert(effects8Before.length === 0, 'No active effects before start');

// Wrong zone
var effects8WrongZone = EventConsequences.getActiveEffects(s8, 'nexus', 1600);
// Global effects should appear, but zone-specific shouldn't
var nonGlobalCount = 0;
for (var effI = 0; effI < effects8WrongZone.length; effI++) {
  if (effects8WrongZone[effI].zone === 'gardens') nonGlobalCount++;
}
assert(nonGlobalCount === 0, 'Zone-specific effects not shown for different zone');

// null zone returns all
var effects8All = EventConsequences.getActiveEffects(s8, null, 1600);
assert(effects8All.length >= effects8.length, 'null zone returns at least as many effects');

// ---------------------------------------------------------------------------
// SECTION 9: getEffectValue
// ---------------------------------------------------------------------------
section('getEffectValue');

var s9 = makeState();
var v9 = EventConsequences.proposeVote(s9, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.castVote(s9, 'bob', v9.vote.id, 'sunny');
EventConsequences.closeVoting(s9, v9.vote.id, 1500);

var gatherVal = EventConsequences.getEffectValue(s9, 'gardens', 'gathering_bonus', 1600);
assert(gatherVal === 0.2, 'gathering_bonus value = 0.2 in gardens at tick 1600');

var fishVal = EventConsequences.getEffectValue(s9, 'gardens', 'fishing_penalty', 1600);
assert(fishVal === -0.1, 'fishing_penalty value = -0.1 in gardens at tick 1600');

var noVal = EventConsequences.getEffectValue(s9, 'gardens', 'nonexistent_effect', 1600);
assert(noVal === 0, 'nonexistent effect returns 0');

var expiredVal = EventConsequences.getEffectValue(s9, 'gardens', 'gathering_bonus', 2100);
assert(expiredVal === 0, 'Expired effect returns 0');

// Multiple effects stack
var s9b = makeState();
var v9a = EventConsequences.proposeVote(s9b, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.castVote(s9b, 'bob', v9a.vote.id, 'sunny');
EventConsequences.closeVoting(s9b, v9a.vote.id, 1500);

var v9b = EventConsequences.proposeVote(s9b, 'carol', 'festival_theme', 'gardens', 1200);
// Close without voting to get default (harvest_festival has gathering_bonus: 0.4)
EventConsequences.castVote(s9b, 'dave', v9b.vote.id, 'harvest_festival');
EventConsequences.closeVoting(s9b, v9b.vote.id, 1600);

var stackedVal = EventConsequences.getEffectValue(s9b, 'gardens', 'gathering_bonus', 1700);
assert(stackedVal > 0.2, 'Stacked gathering_bonus is greater than single value');

// ---------------------------------------------------------------------------
// SECTION 10: expireEffects
// ---------------------------------------------------------------------------
section('expireEffects');

var s10 = makeState();
var v10 = EventConsequences.proposeVote(s10, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.castVote(s10, 'bob', v10.vote.id, 'sunny');
EventConsequences.closeVoting(s10, v10.vote.id, 1500);

var countBefore = s10.activeEffects.length;
assert(countBefore > 0, 'Have active effects before expiry');

var expireResult = EventConsequences.expireEffects(s10, 1800);
assert(typeof expireResult.expired === 'object', 'expireEffects returns expired array');
assert(typeof expireResult.remaining === 'number', 'expireEffects returns remaining count');
// At tick 1800, effects from sunny (zone_weather duration 500, start 1500, end 2000) should still be active
assert(expireResult.expired.length === 0, 'No effects expired at tick 1800 (end is 2000)');

var expireResult2 = EventConsequences.expireEffects(s10, 2100);
assert(expireResult2.expired.length > 0, 'Effects expired at tick 2100');
assert(expireResult2.remaining === 0, 'No remaining effects after full expiry');
assert(s10.activeEffects.length === 0, 'state.activeEffects emptied');

// Expired open votes
var s10b = makeState();
var v10b = EventConsequences.proposeVote(s10b, 'alice', 'zone_weather', 'gardens', 1000);
// Vote closes at 1500, expire at 2000
EventConsequences.expireEffects(s10b, 2000);
var expiredVote = EventConsequences.getVoteById(s10b, v10b.vote.id);
assert(expiredVote.status === 'expired', 'Open vote past closesAt becomes expired');

// ---------------------------------------------------------------------------
// SECTION 11: getOpenVotes
// ---------------------------------------------------------------------------
section('getOpenVotes');

var s11 = makeState();
EventConsequences.proposeVote(s11, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.proposeVote(s11, 'bob', 'resource_access', 'gardens', 1000);
EventConsequences.proposeVote(s11, 'carol', 'zone_weather', 'nexus', 1000);

var openGardens = EventConsequences.getOpenVotes(s11, 'gardens');
assert(Array.isArray(openGardens), 'getOpenVotes returns array');
assert(openGardens.length === 2, 'Two open votes in gardens');

var openNexus = EventConsequences.getOpenVotes(s11, 'nexus');
assert(openNexus.length === 1, 'One open vote in nexus');

var openAll = EventConsequences.getOpenVotes(s11, null);
assert(openAll.length === 3, 'getOpenVotes null zone returns all open votes');

var openAll2 = EventConsequences.getOpenVotes(s11);
assert(openAll2.length === 3, 'getOpenVotes no zone returns all open votes');

// After closing one, count decreases
EventConsequences.closeVoting(s11, openGardens[0].id, 1500);
var openGardens2 = EventConsequences.getOpenVotes(s11, 'gardens');
assert(openGardens2.length === 1, 'One less open vote after close');

// ---------------------------------------------------------------------------
// SECTION 12: getVoteById
// ---------------------------------------------------------------------------
section('getVoteById');

var s12 = makeState();
var v12 = EventConsequences.proposeVote(s12, 'alice', 'zone_weather', 'gardens', 1000);
var foundVote = EventConsequences.getVoteById(s12, v12.vote.id);
assert(foundVote !== null, 'getVoteById finds existing vote');
assert(foundVote.id === v12.vote.id, 'Found vote has correct id');

var notFound = EventConsequences.getVoteById(s12, 'fake_id_xyz');
assert(notFound === null, 'getVoteById returns null for missing id');

// ---------------------------------------------------------------------------
// SECTION 13: getVoteHistory
// ---------------------------------------------------------------------------
section('getVoteHistory');

var s13 = makeState();
var v13a = EventConsequences.proposeVote(s13, 'alice', 'zone_weather', 'gardens', 1000);
var v13b = EventConsequences.proposeVote(s13, 'bob', 'resource_access', 'gardens', 1010);
var v13c = EventConsequences.proposeVote(s13, 'carol', 'zone_weather', 'nexus', 1020);

EventConsequences.closeVoting(s13, v13a.vote.id, 1500);
EventConsequences.closeVoting(s13, v13b.vote.id, 1600);
EventConsequences.closeVoting(s13, v13c.vote.id, 1700);

var history13 = EventConsequences.getVoteHistory(s13, 'gardens');
assert(Array.isArray(history13), 'getVoteHistory returns array');
assert(history13.length === 2, 'Two closed votes in gardens history');

var historyNexus = EventConsequences.getVoteHistory(s13, 'nexus');
assert(historyNexus.length === 1, 'One closed vote in nexus history');

var historyAll = EventConsequences.getVoteHistory(s13, null);
assert(historyAll.length === 3, 'All history when zone is null');

// Count limit
var historyLimited = EventConsequences.getVoteHistory(s13, null, 2);
assert(historyLimited.length === 2, 'History limited to count=2');

// Sorted most recent first
assert(historyAll[0].openedAt >= historyAll[1].openedAt, 'History sorted most recent first');

// Open votes not in history
var openVotesInHistory = 0;
for (var hvi = 0; hvi < historyAll.length; hvi++) {
  if (historyAll[hvi].status === 'open') openVotesInHistory++;
}
assert(openVotesInHistory === 0, 'No open votes in history');

// ---------------------------------------------------------------------------
// SECTION 14: getPlayerVotes
// ---------------------------------------------------------------------------
section('getPlayerVotes');

var s14 = makeState();
var v14a = EventConsequences.proposeVote(s14, 'alice', 'zone_weather', 'gardens', 1000);
var v14b = EventConsequences.proposeVote(s14, 'bob', 'resource_access', 'gardens', 1010);

EventConsequences.castVote(s14, 'alice', v14b.vote.id, 'open');

var aliceVotes = EventConsequences.getPlayerVotes(s14, 'alice');
assert(Array.isArray(aliceVotes), 'getPlayerVotes returns array');
assert(aliceVotes.length === 2, 'Alice participated in 2 votes (proposed 1, voted in 1)');

var aliceProposed = aliceVotes.filter(function(v) { return v.role === 'proposer'; });
assert(aliceProposed.length === 1, 'Alice has 1 proposer role');

var aliceVoter = aliceVotes.filter(function(v) { return v.role === 'voter'; });
assert(aliceVoter.length === 1, 'Alice has 1 voter role');
assert(aliceVoter[0].optionVoted === 'open', 'Alice voted for open');

var bobVotes = EventConsequences.getPlayerVotes(s14, 'bob');
assert(bobVotes.length === 1, 'Bob participated in 1 vote (proposed only)');

var carolVotes = EventConsequences.getPlayerVotes(s14, 'carol');
assert(carolVotes.length === 0, 'Carol has no votes');

// ---------------------------------------------------------------------------
// SECTION 15: getVoteLedger
// ---------------------------------------------------------------------------
section('getVoteLedger');

var s15 = makeState();
var v15 = EventConsequences.proposeVote(s15, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.castVote(s15, 'bob', v15.vote.id, 'sunny');
EventConsequences.closeVoting(s15, v15.vote.id, 1500);

var ledger15 = EventConsequences.getVoteLedger(s15);
assert(Array.isArray(ledger15), 'getVoteLedger returns array');
assert(ledger15.length >= 2, 'Ledger has at least 2 entries (propose + close)');

// Filter by tick range
var ledger15Filtered = EventConsequences.getVoteLedger(s15, 1000, 1200);
assert(Array.isArray(ledger15Filtered), 'getVoteLedger with range returns array');
// Proposed event at tick 1000 should be in range
var hasProposed = false;
for (var li = 0; li < ledger15Filtered.length; li++) {
  if (ledger15Filtered[li].event === 'vote_proposed') { hasProposed = true; break; }
}
assert(hasProposed, 'vote_proposed appears in ledger range 1000-1200');

// Closed event at tick 1500 should not be in 1000-1200 range
var hasClosedInRange = false;
for (var lii = 0; lii < ledger15Filtered.length; lii++) {
  if (ledger15Filtered[lii].event === 'vote_closed' && ledger15Filtered[lii].tick > 1200) {
    hasClosedInRange = true; break;
  }
}
assert(!hasClosedInRange, 'vote_closed at 1500 not in range 1000-1200');

// Ledger entry structure
var proposeEntry = ledger15Filtered[0];
assert(typeof proposeEntry.tick === 'number', 'Ledger entry has tick');
assert(typeof proposeEntry.event === 'string', 'Ledger entry has event');
assert(typeof proposeEntry.voteId === 'string', 'Ledger entry has voteId');

// ---------------------------------------------------------------------------
// SECTION 16: getZoneEffectSummary
// ---------------------------------------------------------------------------
section('getZoneEffectSummary');

var s16 = makeState();
var v16 = EventConsequences.proposeVote(s16, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.castVote(s16, 'bob', v16.vote.id, 'sunny');
EventConsequences.closeVoting(s16, v16.vote.id, 1500);

var summary16 = EventConsequences.getZoneEffectSummary(s16, 'gardens', 1600);
assert(typeof summary16 === 'object', 'getZoneEffectSummary returns object');
assert(summary16.zone === 'gardens', 'Summary has correct zone');
assert(summary16.tick === 1600, 'Summary has correct tick');
assert(typeof summary16.totalEffects === 'number', 'Summary has totalEffects');
assert(summary16.totalEffects > 0, 'Summary has positive totalEffects');
assert(typeof summary16.effectsByType === 'object', 'Summary has effectsByType');
assert(typeof summary16.totalValue === 'number', 'Summary has totalValue');

// Check gathering_bonus in summary
assert(typeof summary16.effectsByType.gathering_bonus === 'object', 'Summary has gathering_bonus type');
assert(summary16.effectsByType.gathering_bonus.count === 1, 'One gathering_bonus effect');
assert(summary16.effectsByType.gathering_bonus.totalValue === 0.2, 'gathering_bonus total = 0.2');

// No effects zone
var emptySummary = EventConsequences.getZoneEffectSummary(s16, 'nexus', 1600);
assert(emptySummary.totalEffects === 0, 'Empty summary for zone with no effects');
assert(emptySummary.totalValue === 0, 'Empty summary totalValue = 0');

// Expired effects
var expiredSummary = EventConsequences.getZoneEffectSummary(s16, 'gardens', 2100);
assert(expiredSummary.totalEffects === 0, 'No effects in summary after expiry');

// ---------------------------------------------------------------------------
// SECTION 17: getWorldPolicy
// ---------------------------------------------------------------------------
section('getWorldPolicy');

var s17 = makeState();
var worldPolicy = EventConsequences.getWorldPolicy(s17, 1000);
assert(typeof worldPolicy === 'object', 'getWorldPolicy returns object');
assert(Array.isArray(worldPolicy.activePolicies), 'getWorldPolicy has activePolicies');
assert(worldPolicy.count === 0, 'No active policies initially');

// Propose and close world_policy vote
var v17 = EventConsequences.proposeVote(s17, 'alice', 'world_policy', 'global', 1000);
EventConsequences.castVote(s17, 'bob', v17.vote.id, 'open_borders');
EventConsequences.castVote(s17, 'carol', v17.vote.id, 'open_borders');
EventConsequences.closeVoting(s17, v17.vote.id, 1500);

var worldPolicy2 = EventConsequences.getWorldPolicy(s17, 1600);
assert(worldPolicy2.activePolicies.length === 1, 'One active world policy after vote');
assert(worldPolicy2.activePolicies[0].policy === 'open_borders', 'Active policy is open_borders');

// After expiry
var worldPolicyExpired = EventConsequences.getWorldPolicy(s17, 5000);
assert(worldPolicyExpired.activePolicies.length === 0, 'No active policies after expiry');

// ---------------------------------------------------------------------------
// SECTION 18: canVote
// ---------------------------------------------------------------------------
section('canVote');

var s18 = makeState();
var v18 = EventConsequences.proposeVote(s18, 'alice', 'zone_weather', 'gardens', 1000);
var voteId18 = v18.vote.id;

assert(EventConsequences.canVote(s18, 'bob', voteId18) === true, 'Bob can vote before voting');
assert(EventConsequences.canVote(s18, 'carol', voteId18) === true, 'Carol can vote before voting');

EventConsequences.castVote(s18, 'bob', voteId18, 'sunny');
assert(EventConsequences.canVote(s18, 'bob', voteId18) === false, 'Bob cannot vote again');
assert(EventConsequences.canVote(s18, 'carol', voteId18) === true, 'Carol can still vote');

// After close
EventConsequences.closeVoting(s18, voteId18, 1500);
assert(EventConsequences.canVote(s18, 'carol', voteId18) === false, 'Cannot vote on closed vote');

// Nonexistent vote
assert(EventConsequences.canVote(s18, 'bob', 'fake_id') === false, 'canVote false for fake voteId');

// ---------------------------------------------------------------------------
// SECTION 19: getVoteResults
// ---------------------------------------------------------------------------
section('getVoteResults');

var s19 = makeState();
var v19 = EventConsequences.proposeVote(s19, 'alice', 'zone_weather', 'gardens', 1000);
var voteId19 = v19.vote.id;

// Before any votes
var results19pre = EventConsequences.getVoteResults(s19, voteId19);
assert(typeof results19pre === 'object' && results19pre !== null, 'getVoteResults returns object');
assert(results19pre.totalVotes === 0, 'No votes cast yet');
assert(results19pre.status === 'open', 'Vote still open');
assert(Array.isArray(results19pre.options), 'Results has options array');

// Cast votes
EventConsequences.castVote(s19, 'bob', voteId19, 'sunny');
EventConsequences.castVote(s19, 'carol', voteId19, 'sunny');
EventConsequences.castVote(s19, 'dave', voteId19, 'rainy');

var results19 = EventConsequences.getVoteResults(s19, voteId19);
assert(results19.totalVotes === 3, 'Total votes = 3');
assert(results19.options.length === 3, 'Three options in results');

var sunnyResult = null;
for (var ri = 0; ri < results19.options.length; ri++) {
  if (results19.options[ri].id === 'sunny') { sunnyResult = results19.options[ri]; break; }
}
assert(sunnyResult !== null, 'Sunny option in results');
assert(sunnyResult.votes === 2, 'Sunny has 2 votes');
assert(Math.abs(sunnyResult.percentage - 66.67) < 0.1, 'Sunny percentage ≈ 66.67%');

var rainyResult = null;
for (var ri2 = 0; ri2 < results19.options.length; ri2++) {
  if (results19.options[ri2].id === 'rainy') { rainyResult = results19.options[ri2]; break; }
}
assert(rainyResult.votes === 1, 'Rainy has 1 vote');
assert(Math.abs(rainyResult.percentage - 33.33) < 0.1, 'Rainy percentage ≈ 33.33%');

// Nonexistent vote
var noResults = EventConsequences.getVoteResults(s19, 'fake_vote_id');
assert(noResults === null, 'getVoteResults returns null for unknown voteId');

// ---------------------------------------------------------------------------
// SECTION 20: applyCascades
// ---------------------------------------------------------------------------
section('applyCascades');

var s20 = makeState();
var v20 = EventConsequences.proposeVote(s20, 'alice', 'resource_access', 'gardens', 1000);
EventConsequences.castVote(s20, 'bob', v20.vote.id, 'restricted');
EventConsequences.castVote(s20, 'carol', v20.vote.id, 'restricted');
var closeResult20 = EventConsequences.closeVoting(s20, v20.vote.id, 1500);

assert(Array.isArray(closeResult20.cascades), 'closeVoting returns cascades array');
assert(closeResult20.cascades.length > 0, 'Cascades triggered for resource_access restricted');

var cascade20 = closeResult20.cascades[0];
assert(typeof cascade20.description === 'string', 'Cascade has description');
assert(typeof cascade20.effect === 'object', 'Cascade has effect');
assert(cascade20.effect.type === 'market_price_surge', 'Cascade type is market_price_surge');
assert(cascade20.effect.zone === 'agora', 'Cascade affects agora');

// Cascade effects added to state
var hasCascadeEffect = false;
for (var cfi = 0; cfi < s20.activeEffects.length; cfi++) {
  if (s20.activeEffects[cfi].isCascade === true) { hasCascadeEffect = true; break; }
}
assert(hasCascadeEffect, 'Cascade effects added to state.activeEffects');

// No cascades for option without rules
var s20b = makeState();
var v20b = EventConsequences.proposeVote(s20b, 'alice', 'resource_access', 'gardens', 1000);
EventConsequences.castVote(s20b, 'bob', v20b.vote.id, 'open');
var closeResult20b = EventConsequences.closeVoting(s20b, v20b.vote.id, 1500);
assert(closeResult20b.cascades.length === 0, 'No cascades for resource_access open');

// applyCascades directly on unknown vote
var cascadeEmpty = EventConsequences.applyCascades(s20, 'fake_vote_id', 2000);
assert(cascadeEmpty.cascades.length === 0, 'applyCascades on unknown vote returns empty cascades');

// ---------------------------------------------------------------------------
// SECTION 21: Zone-specific consequence types
// ---------------------------------------------------------------------------
section('Zone-specific consequence types');

// market_regulation is zone-specific (agora)
var marketType = null;
for (var mti = 0; mti < CT.length; mti++) {
  if (CT[mti].id === 'market_regulation') { marketType = CT[mti]; break; }
}
assert(marketType !== null, 'market_regulation found');
assert(marketType.zone === 'agora', 'market_regulation is agora-specific');

// world_policy is global
var policyType = null;
for (var pti = 0; pti < CT.length; pti++) {
  if (CT[pti].id === 'world_policy') { policyType = CT[pti]; break; }
}
assert(policyType !== null, 'world_policy found');
assert(policyType.zone === 'global', 'world_policy is global');

// zone-specific types have null zone (apply per-zone)
var weatherCT = null;
for (var wcti = 0; wcti < CT.length; wcti++) {
  if (CT[wcti].id === 'zone_weather') { weatherCT = CT[wcti]; break; }
}
assert(weatherCT.zone === null, 'zone_weather zone field is null (per-zone)');

// ---------------------------------------------------------------------------
// SECTION 22: Full Voting Workflow
// ---------------------------------------------------------------------------
section('Full Voting Workflow');

var sFlow = makeState();

// 1. Propose
var vFlow = EventConsequences.proposeVote(sFlow, 'alice', 'festival_theme', 'nexus', 5000);
assert(vFlow.success === true, 'Workflow: propose succeeds');
var vFlowId = vFlow.vote.id;

// 2. Multiple players cast votes
EventConsequences.castVote(sFlow, 'bob', vFlowId, 'arts_festival');
EventConsequences.castVote(sFlow, 'carol', vFlowId, 'arts_festival');
EventConsequences.castVote(sFlow, 'dave', vFlowId, 'harvest_festival');
EventConsequences.castVote(sFlow, 'eve', vFlowId, 'arts_festival');

// 3. Verify state before close
var resultsFlow = EventConsequences.getVoteResults(sFlow, vFlowId);
assert(resultsFlow.totalVotes === 4, 'Workflow: 4 votes cast');

// 4. Close voting
var closeFlow = EventConsequences.closeVoting(sFlow, vFlowId, 5500);
assert(closeFlow.success === true, 'Workflow: close succeeds');
assert(closeFlow.result.id === 'arts_festival', 'Workflow: arts_festival wins (3 votes)');

// 5. Effects active
var activeFlow = EventConsequences.getActiveEffects(sFlow, 'nexus', 5600);
assert(activeFlow.length > 0, 'Workflow: effects active after close');

// 6. Get summary
var summaryFlow = EventConsequences.getZoneEffectSummary(sFlow, 'nexus', 5600);
assert(summaryFlow.totalEffects > 0, 'Workflow: summary shows active effects');

// 7. Expire
EventConsequences.expireEffects(sFlow, 7000);
var afterExpire = EventConsequences.getActiveEffects(sFlow, 'nexus', 7000);
assert(afterExpire.length === 0, 'Workflow: effects expired');

// 8. History
var histFlow = EventConsequences.getVoteHistory(sFlow, 'nexus');
assert(histFlow.length === 1, 'Workflow: one entry in history');

// 9. Ledger
var ledgerFlow = EventConsequences.getVoteLedger(sFlow, 5000, 6000);
assert(ledgerFlow.length >= 2, 'Workflow: ledger has propose + close entries');

// ---------------------------------------------------------------------------
// SECTION 23: Cascades from storm trigger
// ---------------------------------------------------------------------------
section('Cascades from storm trigger');

var sStorm = makeState();
var vStorm = EventConsequences.proposeVote(sStorm, 'alice', 'zone_weather', 'wilds', 2000);
EventConsequences.castVote(sStorm, 'bob', vStorm.vote.id, 'stormy');
EventConsequences.castVote(sStorm, 'carol', vStorm.vote.id, 'stormy');
var closeStorm = EventConsequences.closeVoting(sStorm, vStorm.vote.id, 2500);

assert(closeStorm.result.id === 'stormy', 'Stormy wins');
assert(closeStorm.cascades.length > 0, 'Storm triggers cascades');

var npcShelterCascade = null;
for (var sci = 0; sci < closeStorm.cascades.length; sci++) {
  if (closeStorm.cascades[sci].effect.type === 'npc_shelter') {
    npcShelterCascade = closeStorm.cascades[sci];
    break;
  }
}
assert(npcShelterCascade !== null, 'Storm triggers npc_shelter cascade');
assert(npcShelterCascade.effect.isCascade === true, 'npc_shelter effect is cascade');

// ---------------------------------------------------------------------------
// SECTION 24: tax_rate cascade
// ---------------------------------------------------------------------------
section('tax_rate cascade');

var sTax = makeState();
var vTax = EventConsequences.proposeVote(sTax, 'alice', 'tax_rate', 'agora', 3000);
EventConsequences.castVote(sTax, 'bob', vTax.vote.id, 'high_tax');
EventConsequences.castVote(sTax, 'carol', vTax.vote.id, 'high_tax');
var closeTax = EventConsequences.closeVoting(sTax, vTax.vote.id, 3500);

assert(closeTax.result.id === 'high_tax', 'high_tax wins');
assert(closeTax.cascades.length > 0, 'high_tax triggers cascades');

var migrationCascade = null;
for (var tci = 0; tci < closeTax.cascades.length; tci++) {
  if (closeTax.cascades[tci].effect.type === 'trade_migration') {
    migrationCascade = closeTax.cascades[tci];
    break;
  }
}
assert(migrationCascade !== null, 'high_tax triggers trade_migration cascade');
assert(migrationCascade.effect.value < 0, 'trade_migration has negative value (penalty)');

// ---------------------------------------------------------------------------
// SECTION 25: Cooldown and re-vote
// ---------------------------------------------------------------------------
section('Cooldown and re-vote');

var sCool = makeState();

// Propose and close
var vCool = EventConsequences.proposeVote(sCool, 'alice', 'zone_rules', 'arena', 1000);
assert(vCool.success === true, 'First zone_rules vote opens');
EventConsequences.castVote(sCool, 'bob', vCool.vote.id, 'contested');
EventConsequences.closeVoting(sCool, vCool.vote.id, 1500);

// Immediately propose again — should fail (cooldown = 1600)
var coolFail = EventConsequences.proposeVote(sCool, 'carol', 'zone_rules', 'arena', 1600);
assert(coolFail.success === false, 'Cannot re-vote during cooldown');
assert(coolFail.reason.indexOf('Cooldown') !== -1, 'Reason mentions cooldown');

// After cooldown (1500 + 1600 = 3100)
var coolOk = EventConsequences.proposeVote(sCool, 'carol', 'zone_rules', 'arena', 3200);
assert(coolOk.success === true, 'Can vote again after cooldown expires');

// Different zone not affected by cooldown
var otherZone = EventConsequences.proposeVote(sCool, 'dave', 'zone_rules', 'commons', 1600);
assert(otherZone.success === true, 'Different zone not affected by cooldown');

// ---------------------------------------------------------------------------
// SECTION 26: Effect field validation
// ---------------------------------------------------------------------------
section('Effect field validation');

var sEff = makeState();
var vEff = EventConsequences.proposeVote(sEff, 'alice', 'building_priority', 'gardens', 1000);
EventConsequences.castVote(sEff, 'bob', vEff.vote.id, 'marketplace');
var closeEff = EventConsequences.closeVoting(sEff, vEff.vote.id, 1500);

assert(closeEff.effects.length > 0, 'building_priority close creates effects');
var firstEffect = closeEff.effects[0];
assert(typeof firstEffect.id === 'string', 'Effect has string id');
assert(typeof firstEffect.voteId === 'string', 'Effect has voteId');
assert(typeof firstEffect.type === 'string', 'Effect has type');
assert(typeof firstEffect.value === 'number', 'Effect has numeric value');
assert(typeof firstEffect.zone === 'string', 'Effect has zone string');
assert(typeof firstEffect.startTick === 'number', 'Effect has startTick');
assert(typeof firstEffect.endTick === 'number', 'Effect has endTick');
assert(typeof firstEffect.description === 'string', 'Effect has description');
assert(firstEffect.endTick > firstEffect.startTick, 'endTick > startTick');
assert(firstEffect.endTick - firstEffect.startTick === 900, 'Duration = 900 (building_priority)');

// ---------------------------------------------------------------------------
// SECTION 27: Multiple consequence types voting
// ---------------------------------------------------------------------------
section('Multiple consequence types voting');

var sMulti = makeState();
var zones = ['gardens', 'nexus', 'commons', 'wilds'];
var ctypes = ['zone_weather', 'zone_rules', 'festival_theme', 'event_schedule'];

for (var mi = 0; mi < zones.length; mi++) {
  var vMulti = EventConsequences.proposeVote(sMulti, 'player' + mi, ctypes[mi], zones[mi], 1000 + mi * 10);
  assert(vMulti.success === true, 'Multi-zone vote ' + mi + ' proposed');
}

var allOpen = EventConsequences.getOpenVotes(sMulti);
assert(allOpen.length === 4, 'All 4 votes are open');

// Close all
for (var mci = 0; mci < allOpen.length; mci++) {
  EventConsequences.castVote(sMulti, 'voter' + mci, allOpen[mci].id, allOpen[mci].options[0].id);
  EventConsequences.closeVoting(sMulti, allOpen[mci].id, 2000 + mci * 10);
}

var stillOpen = EventConsequences.getOpenVotes(sMulti);
assert(stillOpen.length === 0, 'All votes closed');

var allHistory = EventConsequences.getVoteHistory(sMulti, null);
assert(allHistory.length === 4, 'All 4 votes in history');

// ---------------------------------------------------------------------------
// SECTION 28: Ledger completeness
// ---------------------------------------------------------------------------
section('Ledger completeness');

var sLedger = makeState();
var vLedger = EventConsequences.proposeVote(sLedger, 'alice', 'zone_weather', 'studio', 1000);
EventConsequences.castVote(sLedger, 'bob', vLedger.vote.id, 'sunny');
EventConsequences.closeVoting(sLedger, vLedger.vote.id, 1500);

var fullLedger = EventConsequences.getVoteLedger(sLedger);
var eventTypes = fullLedger.map(function(e) { return e.event; });
assert(eventTypes.indexOf('vote_proposed') !== -1, 'Ledger has vote_proposed event');
assert(eventTypes.indexOf('vote_closed') !== -1, 'Ledger has vote_closed event');

// Every ledger entry has required fields
for (var lei = 0; lei < fullLedger.length; lei++) {
  var entry = fullLedger[lei];
  assert(typeof entry.tick === 'number', 'Ledger entry ' + lei + ' has tick number');
  assert(typeof entry.event === 'string', 'Ledger entry ' + lei + ' has event string');
}

// Expiry event in ledger
var sLedger2 = makeState();
var vLedger2 = EventConsequences.proposeVote(sLedger2, 'alice', 'zone_weather', 'gardens', 1000);
EventConsequences.expireEffects(sLedger2, 2000); // vote.closesAt=1500, should expire
var ledger2 = EventConsequences.getVoteLedger(sLedger2);
var hasExpired = false;
for (var lei2 = 0; lei2 < ledger2.length; lei2++) {
  if (ledger2[lei2].event === 'vote_expired') { hasExpired = true; break; }
}
assert(hasExpired, 'Ledger has vote_expired event after expiry');

// ---------------------------------------------------------------------------
// SECTION 29: CONSEQUENCE_TYPES reference check
// ---------------------------------------------------------------------------
section('CONSEQUENCE_TYPES reference check');

var CT2 = EventConsequences.CONSEQUENCE_TYPES;
assert(CT2 === CT, 'CONSEQUENCE_TYPES reference matches getConsequenceTypes() result');

var CR2 = EventConsequences.CASCADE_RULES;
assert(CR2 === CR, 'CASCADE_RULES reference matches getCascadeRules() result');

// Validate tax_rate options
var taxType = null;
for (var tti = 0; tti < CT.length; tti++) {
  if (CT[tti].id === 'tax_rate') { taxType = CT[tti]; break; }
}
assert(taxType !== null, 'tax_rate type found');
assert(taxType.options.length === 4, 'tax_rate has 4 options');
var taxOptIds = taxType.options.map(function(o) { return o.id; });
assert(taxOptIds.indexOf('no_tax') !== -1, 'tax_rate has no_tax option');
assert(taxOptIds.indexOf('low_tax') !== -1, 'tax_rate has low_tax option');
assert(taxOptIds.indexOf('moderate_tax') !== -1, 'tax_rate has moderate_tax option');
assert(taxOptIds.indexOf('high_tax') !== -1, 'tax_rate has high_tax option');

// Validate world_policy options
var worldPT = null;
for (var wpti = 0; wpti < CT.length; wpti++) {
  if (CT[wpti].id === 'world_policy') { worldPT = CT[wpti]; break; }
}
assert(worldPT !== null, 'world_policy type found');
assert(worldPT.options.length === 4, 'world_policy has 4 options');
var wpOptIds = worldPT.options.map(function(o) { return o.id; });
assert(wpOptIds.indexOf('open_borders') !== -1, 'world_policy has open_borders option');
assert(wpOptIds.indexOf('zone_sovereignty') !== -1, 'world_policy has zone_sovereignty option');
assert(wpOptIds.indexOf('unified_economy') !== -1, 'world_policy has unified_economy option');
assert(wpOptIds.indexOf('competitive_zones') !== -1, 'world_policy has competitive_zones option');

// ---------------------------------------------------------------------------
// SECTION 30: Edge cases and robustness
// ---------------------------------------------------------------------------
section('Edge cases and robustness');

// Propose vote with null zone
var sEdge = makeState();
var vEdgeNull = EventConsequences.proposeVote(sEdge, 'alice', 'zone_weather', null, 1000);
assert(vEdgeNull.success === true, 'Can propose vote with null zone');
assert(vEdgeNull.vote.zone === null, 'Vote zone is null');

// getEffectValue with no state effects
var emptyState = makeState();
var noEffectVal = EventConsequences.getEffectValue(emptyState, 'gardens', 'gathering_bonus', 1000);
assert(noEffectVal === 0, 'getEffectValue returns 0 for empty state');

// expireEffects on empty state
var emptyExpire = EventConsequences.expireEffects(makeState(), 1000);
assert(emptyExpire.expired.length === 0, 'expireEffects on empty state has 0 expired');
assert(emptyExpire.remaining === 0, 'expireEffects on empty state has 0 remaining');

// getOpenVotes on empty state
var emptyOpen = EventConsequences.getOpenVotes(makeState());
assert(emptyOpen.length === 0, 'getOpenVotes on empty state is empty');

// getVoteHistory on empty state
var emptyHistory = EventConsequences.getVoteHistory(makeState(), null);
assert(emptyHistory.length === 0, 'getVoteHistory on empty state is empty');

// getPlayerVotes on empty state
var emptyPlayer = EventConsequences.getPlayerVotes(makeState(), 'alice');
assert(emptyPlayer.length === 0, 'getPlayerVotes on empty state is empty');

// getVoteLedger on empty state
var emptyLedger = EventConsequences.getVoteLedger(makeState());
assert(emptyLedger.length === 0, 'getVoteLedger on empty state is empty');

// getZoneEffectSummary on empty state
var emptySummaryState = EventConsequences.getZoneEffectSummary(makeState(), 'gardens', 1000);
assert(emptySummaryState.totalEffects === 0, 'getZoneEffectSummary on empty state = 0 effects');

// getWorldPolicy on empty state
var emptyPolicy = EventConsequences.getWorldPolicy(makeState(), 1000);
assert(emptyPolicy.count === 0, 'getWorldPolicy on empty state = 0 policies');

// canVote on empty state
assert(EventConsequences.canVote(makeState(), 'alice', 'fake_id') === false, 'canVote on empty state = false');

// getVoteResults on empty state
assert(EventConsequences.getVoteResults(makeState(), 'fake_id') === null, 'getVoteResults on empty state = null');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log('Results: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
}
