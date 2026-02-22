/**
 * Tests for src/js/diplomatic_system.js
 * Run with: node tests/test_diplomatic_system.js
 */

var DiplomaticSystem = require('../src/js/diplomatic_system');

var passed = 0;
var failed = 0;
var total  = 0;

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
  return DiplomaticSystem.createState();
}

// Propose + accept a treaty between two guilds, returns treaty
function activeTreaty(state, guildA, guildB, type, terms, tick) {
  var pr = DiplomaticSystem.proposeTreaty(state, guildA, guildB, type, terms || {}, tick || 0);
  DiplomaticSystem.acceptTreaty(state, pr.treaty.id, guildB, (tick || 0) + 1);
  return pr.treaty;
}

// ---------------------------------------------------------------------------
// SECTION 1: TREATY_TYPES definitions
// ---------------------------------------------------------------------------
section('TREATY_TYPES definitions');

var TREATY_TYPES = DiplomaticSystem.TREATY_TYPES;

assert(Array.isArray(TREATY_TYPES), 'TREATY_TYPES is an array');
assert(TREATY_TYPES.length === 6, 'There are exactly 6 treaty types');

var typeIds = TREATY_TYPES.map(function(t) { return t.id; });
assert(typeIds.indexOf('trade_alliance')     !== -1, 'trade_alliance exists');
assert(typeIds.indexOf('military_pact')      !== -1, 'military_pact exists');
assert(typeIds.indexOf('non_aggression')     !== -1, 'non_aggression exists');
assert(typeIds.indexOf('cultural_exchange')  !== -1, 'cultural_exchange exists');
assert(typeIds.indexOf('resource_sharing')   !== -1, 'resource_sharing exists');
assert(typeIds.indexOf('mutual_defense')     !== -1, 'mutual_defense exists');

for (var i = 0; i < TREATY_TYPES.length; i++) {
  var tt = TREATY_TYPES[i];
  assert(typeof tt.id          === 'string' && tt.id.length > 0,   tt.id + ' has id');
  assert(typeof tt.name        === 'string' && tt.name.length > 0,  tt.id + ' has name');
  assert(typeof tt.description === 'string' && tt.description.length > 0, tt.id + ' has description');
  assert(typeof tt.benefit     === 'object', tt.id + ' has benefit object');
  assert(typeof tt.defaultDuration === 'number' && tt.defaultDuration > 0, tt.id + ' has positive defaultDuration');
}

// Benefit shapes
var ta = TREATY_TYPES.filter(function(t) { return t.id === 'trade_alliance'; })[0];
assert(ta.benefit.type === 'fee_reduction', 'trade_alliance benefit type is fee_reduction');
assert(typeof ta.benefit.value === 'number', 'trade_alliance benefit value is number');

var mp = TREATY_TYPES.filter(function(t) { return t.id === 'military_pact'; })[0];
assert(mp.benefit.type === 'war_buff', 'military_pact benefit type is war_buff');

var na = TREATY_TYPES.filter(function(t) { return t.id === 'non_aggression'; })[0];
assert(na.benefit.type === 'raid_cooldown_reduction', 'non_aggression benefit type is raid_cooldown_reduction');

var ce = TREATY_TYPES.filter(function(t) { return t.id === 'cultural_exchange'; })[0];
assert(ce.benefit.type === 'shared_recipes', 'cultural_exchange benefit type is shared_recipes');

var rs = TREATY_TYPES.filter(function(t) { return t.id === 'resource_sharing'; })[0];
assert(rs.benefit.type === 'shared_nodes', 'resource_sharing benefit type is shared_nodes');

var md = TREATY_TYPES.filter(function(t) { return t.id === 'mutual_defense'; })[0];
assert(md.benefit.type === 'auto_aid', 'mutual_defense benefit type is auto_aid');

// ---------------------------------------------------------------------------
// SECTION 2: createState
// ---------------------------------------------------------------------------
section('createState');

var freshState = DiplomaticSystem.createState();
assert(Array.isArray(freshState.treaties),                 'createState has treaties array');
assert(Array.isArray(freshState.embargoes),                'createState has embargoes array');
assert(typeof freshState.ambassadors === 'object',         'createState has ambassadors object');
assert(Array.isArray(freshState.incidents),                'createState has incidents array');
assert(Array.isArray(freshState.conferences),              'createState has conferences array');
assert(Array.isArray(freshState.standingLog),              'createState has standingLog array');
assert(freshState.treaties.length    === 0,                'treaties starts empty');
assert(freshState.embargoes.length   === 0,                'embargoes starts empty');
assert(freshState.incidents.length   === 0,                'incidents starts empty');
assert(freshState.conferences.length === 0,                'conferences starts empty');
assert(freshState.standingLog.length === 0,                'standingLog starts empty');
assert(Object.keys(freshState.ambassadors).length === 0,   'ambassadors starts empty');

// ---------------------------------------------------------------------------
// SECTION 3: proposeTreaty
// ---------------------------------------------------------------------------
section('proposeTreaty');

var ps = makeState();
var pr1 = DiplomaticSystem.proposeTreaty(ps, 'guildA', 'guildB', 'trade_alliance', {}, 100);
assert(pr1.success === true,                         'proposeTreaty succeeds');
assert(typeof pr1.treaty === 'object',               'proposeTreaty returns treaty object');
assert(typeof pr1.treaty.id === 'string',            'treaty has string id');
assert(pr1.treaty.fromGuildId === 'guildA',          'fromGuildId is guildA');
assert(pr1.treaty.toGuildId   === 'guildB',          'toGuildId is guildB');
assert(pr1.treaty.type        === 'trade_alliance',  'treaty type is trade_alliance');
assert(pr1.treaty.status      === 'proposed',        'initial status is proposed');
assert(pr1.treaty.proposedAt  === 100,               'proposedAt is 100');
assert(pr1.treaty.acceptedAt  === null,              'acceptedAt is null');
assert(pr1.treaty.expiresAt   === null,              'expiresAt is null');
assert(ps.treaties.length === 1,                     'treaties array has 1 entry');

// Cannot propose to self
var selfProp = DiplomaticSystem.proposeTreaty(ps, 'guildA', 'guildA', 'trade_alliance', {}, 100);
assert(selfProp.success === false,                   'cannot propose treaty to own guild');
assert(typeof selfProp.reason === 'string',          'self-proposal has reason string');

// Unknown treaty type
var badType = DiplomaticSystem.proposeTreaty(ps, 'guildA', 'guildC', 'fake_type', {}, 100);
assert(badType.success === false,                    'unknown treaty type fails');

// Duplicate pending treaty
var dupRes = DiplomaticSystem.proposeTreaty(ps, 'guildA', 'guildB', 'trade_alliance', {}, 200);
assert(dupRes.success === false,                     'duplicate pending treaty rejected');

// Can propose different type to same guild
var diffType = DiplomaticSystem.proposeTreaty(ps, 'guildA', 'guildB', 'military_pact', {}, 300);
assert(diffType.success === true,                    'can propose different treaty type to same guild');

// Proposing raises standing
var standAfterProp = DiplomaticSystem.getDiplomaticStanding(ps, 'guildA', 'guildB');
assert(standAfterProp > 0,                           'standing improves after proposal');

// Missing guildId args
var missingArgs = DiplomaticSystem.proposeTreaty(ps, '', 'guildB', 'trade_alliance', {}, 0);
assert(missingArgs.success === false,                'proposeTreaty fails with empty fromGuildId');

// Custom terms stored
var customTerms = { fee_reduction: 0.08, duration: 2000 };
var customProp = DiplomaticSystem.proposeTreaty(makeState(), 'gA', 'gB', 'trade_alliance', customTerms, 0);
assert(customProp.success === true,                  'proposeTreaty with custom terms succeeds');
assert(customProp.treaty.terms.fee_reduction === 0.08, 'custom terms stored on treaty');

// Each treaty gets unique id
var s2 = makeState();
var p2a = DiplomaticSystem.proposeTreaty(s2, 'g1', 'g2', 'trade_alliance',  {}, 0);
var p2b = DiplomaticSystem.proposeTreaty(s2, 'g1', 'g3', 'military_pact',   {}, 0);
var p2c = DiplomaticSystem.proposeTreaty(s2, 'g2', 'g3', 'non_aggression',  {}, 0);
assert(p2a.treaty.id !== p2b.treaty.id,              'treaty IDs are unique (1 vs 2)');
assert(p2b.treaty.id !== p2c.treaty.id,              'treaty IDs are unique (2 vs 3)');

// ---------------------------------------------------------------------------
// SECTION 4: acceptTreaty
// ---------------------------------------------------------------------------
section('acceptTreaty');

var as = makeState();
var apr = DiplomaticSystem.proposeTreaty(as, 'gA', 'gB', 'trade_alliance', {}, 0);
var accRes = DiplomaticSystem.acceptTreaty(as, apr.treaty.id, 'gB', 50);
assert(accRes.success === true,                       'acceptTreaty succeeds');
assert(typeof accRes.treaty === 'object',             'acceptTreaty returns treaty');
assert(typeof accRes.benefits === 'object',           'acceptTreaty returns benefits');
assert(accRes.treaty.status === 'active',             'treaty status becomes active');
assert(accRes.treaty.acceptedAt === 50,               'acceptedAt is 50');
assert(accRes.treaty.expiresAt !== null,              'expiresAt is set');
assert(accRes.treaty.expiresAt > 50,                  'expiresAt is after acceptedAt');

// Cannot accept again
var accAgain = DiplomaticSystem.acceptTreaty(as, apr.treaty.id, 'gB', 60);
assert(accAgain.success === false,                    'cannot accept already-active treaty');

// Non-recipient cannot accept
var as2 = makeState();
var apr2 = DiplomaticSystem.proposeTreaty(as2, 'gA', 'gB', 'military_pact', {}, 0);
var wrongAccept = DiplomaticSystem.acceptTreaty(as2, apr2.treaty.id, 'gA', 10);
assert(wrongAccept.success === false,                 'only toGuildId can accept treaty');

// Nonexistent treaty
var fakeTreatyAcc = DiplomaticSystem.acceptTreaty(as2, 'treaty_999', 'gB', 0);
assert(fakeTreatyAcc.success === false,               'accept nonexistent treaty fails');

// Benefits have correct shape for trade_alliance
assert(accRes.benefits.type  === 'fee_reduction',     'trade_alliance benefits type correct');
assert(typeof accRes.benefits.value === 'number',     'trade_alliance benefits value is number');

// Standing improves on acceptance
var standAcc = DiplomaticSystem.getDiplomaticStanding(as, 'gA', 'gB');
assert(standAcc > 0,                                  'standing > 0 after accept');

// expiresAt = acceptedAt + defaultDuration (for trade_alliance = 7000)
var expectedExpiry = 50 + ta.defaultDuration;
assert(accRes.treaty.expiresAt === expectedExpiry,    'expiresAt = acceptedAt + defaultDuration');

// Custom duration from terms
var durState = makeState();
var durProp = DiplomaticSystem.proposeTreaty(durState, 'gA', 'gB', 'trade_alliance', { duration: 500 }, 0);
var durAcc  = DiplomaticSystem.acceptTreaty(durState, durProp.treaty.id, 'gB', 10);
assert(durAcc.treaty.expiresAt === 10 + 500,         'custom duration respected in expiresAt');

// ---------------------------------------------------------------------------
// SECTION 5: rejectTreaty
// ---------------------------------------------------------------------------
section('rejectTreaty');

var rjState = makeState();
var rjProp = DiplomaticSystem.proposeTreaty(rjState, 'gA', 'gB', 'resource_sharing', {}, 0);
var rjRes = DiplomaticSystem.rejectTreaty(rjState, rjProp.treaty.id, 'gB', 20);
assert(rjRes.success === true,                        'rejectTreaty succeeds');
assert(rjState.treaties[0].status === 'rejected',     'treaty status becomes rejected');
assert(rjState.treaties[0].terminatedAt === 20,       'terminatedAt set on rejection');

// Cannot reject active treaty
var rjActive = makeState();
var rjActiveProp = DiplomaticSystem.proposeTreaty(rjActive, 'gA', 'gB', 'military_pact', {}, 0);
DiplomaticSystem.acceptTreaty(rjActive, rjActiveProp.treaty.id, 'gB', 1);
var rjActiveRes = DiplomaticSystem.rejectTreaty(rjActive, rjActiveProp.treaty.id, 'gB', 5);
assert(rjActiveRes.success === false,                 'cannot reject active treaty');

// Non-party cannot reject
var rjNonParty = makeState();
var rjNPProp = DiplomaticSystem.proposeTreaty(rjNonParty, 'gA', 'gB', 'cultural_exchange', {}, 0);
var rjNPRes = DiplomaticSystem.rejectTreaty(rjNonParty, rjNPProp.treaty.id, 'gC', 5);
assert(rjNPRes.success === false,                     'non-party cannot reject treaty');

// Nonexistent treaty rejection
var rjFake = DiplomaticSystem.rejectTreaty(rjState, 'treaty_999', 'gB', 0);
assert(rjFake.success === false,                      'reject nonexistent treaty fails');

// Standing decreases slightly on rejection
var standBefore = DiplomaticSystem.getDiplomaticStanding(rjState, 'gA', 'gB');
// (proposal already added 2, rejection subtracts 5, net should be -3)
assert(standBefore < 2,                               'standing decreases after rejection');

// Proposer can also reject (withdraw) their own proposal
var rjWithdraw = makeState();
var rjWProp = DiplomaticSystem.proposeTreaty(rjWithdraw, 'gA', 'gB', 'mutual_defense', {}, 0);
var rjWRes = DiplomaticSystem.rejectTreaty(rjWithdraw, rjWProp.treaty.id, 'gA', 5);
assert(rjWRes.success === true,                       'proposer can withdraw (reject) own proposal');

// ---------------------------------------------------------------------------
// SECTION 6: terminateTreaty
// ---------------------------------------------------------------------------
section('terminateTreaty');

var tmState = makeState();
var tmProp = DiplomaticSystem.proposeTreaty(tmState, 'gA', 'gB', 'non_aggression', {}, 0);
DiplomaticSystem.acceptTreaty(tmState, tmProp.treaty.id, 'gB', 1);

var tmRes = DiplomaticSystem.terminateTreaty(tmState, tmProp.treaty.id, 'gA', 1000);
assert(tmRes.success === true,                        'terminateTreaty succeeds');
assert(typeof tmRes.cooldownEnd === 'number',         'cooldownEnd is a number');
assert(tmRes.cooldownEnd === 1000 + DiplomaticSystem.COOLING_OFF_TICKS, 'cooldownEnd = currentTick + 700');
assert(tmState.treaties[0].status === 'terminated',  'treaty status is terminated');
assert(tmState.treaties[0].terminatedAt === 1000,    'terminatedAt is 1000');
assert(tmState.treaties[0].coolingOffEnd === tmRes.cooldownEnd, 'coolingOffEnd on treaty matches result');

// Cannot terminate proposed treaty (not active)
var tmProposed = makeState();
var tmProp2 = DiplomaticSystem.proposeTreaty(tmProposed, 'gA', 'gB', 'trade_alliance', {}, 0);
var tmProposedRes = DiplomaticSystem.terminateTreaty(tmProposed, tmProp2.treaty.id, 'gA', 5);
assert(tmProposedRes.success === false,               'cannot terminate proposed (not active) treaty');

// Non-party cannot terminate
var tmNonParty = makeState();
var tmNPProp = DiplomaticSystem.proposeTreaty(tmNonParty, 'gA', 'gB', 'military_pact', {}, 0);
DiplomaticSystem.acceptTreaty(tmNonParty, tmNPProp.treaty.id, 'gB', 1);
var tmNPRes = DiplomaticSystem.terminateTreaty(tmNonParty, tmNPProp.treaty.id, 'gC', 10);
assert(tmNPRes.success === false,                     'non-party cannot terminate treaty');

// Either party can terminate
var tmEither = makeState();
var tmEProp = DiplomaticSystem.proposeTreaty(tmEither, 'gA', 'gB', 'resource_sharing', {}, 0);
DiplomaticSystem.acceptTreaty(tmEither, tmEProp.treaty.id, 'gB', 1);
var tmERes = DiplomaticSystem.terminateTreaty(tmEither, tmEProp.treaty.id, 'gB', 500);
assert(tmERes.success === true,                       'toGuildId can also terminate treaty');

// Fake treaty terminate
var tmFake = DiplomaticSystem.terminateTreaty(tmState, 'treaty_9999', 'gA', 0);
assert(tmFake.success === false,                      'terminate nonexistent treaty fails');

// Standing decreases on termination
var standTerm = DiplomaticSystem.getDiplomaticStanding(tmState, 'gA', 'gB');
assert(standTerm < 15,                                'standing reduced after termination');

// ---------------------------------------------------------------------------
// SECTION 7: getTreaty / getGuildTreaties / getActiveTreaties
// ---------------------------------------------------------------------------
section('getTreaty / getGuildTreaties / getActiveTreaties');

var qState = makeState();
var qP1 = DiplomaticSystem.proposeTreaty(qState, 'g1', 'g2', 'trade_alliance',    {}, 0);
var qP2 = DiplomaticSystem.proposeTreaty(qState, 'g1', 'g3', 'military_pact',     {}, 0);
var qP3 = DiplomaticSystem.proposeTreaty(qState, 'g2', 'g3', 'non_aggression',    {}, 0);
DiplomaticSystem.acceptTreaty(qState, qP1.treaty.id, 'g2', 10);
DiplomaticSystem.acceptTreaty(qState, qP2.treaty.id, 'g3', 10);
// qP3 stays proposed

// getTreaty
var fetchedTreaty = DiplomaticSystem.getTreaty(qState, qP1.treaty.id);
assert(fetchedTreaty !== null,                        'getTreaty returns treaty by id');
assert(fetchedTreaty.id === qP1.treaty.id,            'getTreaty returns correct treaty');

var fakeFetch = DiplomaticSystem.getTreaty(qState, 'treaty_fake');
assert(fakeFetch === null,                            'getTreaty returns null for unknown id');

// getGuildTreaties — g1 is in treaties with g2 and g3
var g1Treaties = DiplomaticSystem.getGuildTreaties(qState, 'g1');
assert(g1Treaties.length === 2,                      'getGuildTreaties returns 2 treaties for g1');

var g3Treaties = DiplomaticSystem.getGuildTreaties(qState, 'g3');
assert(g3Treaties.length === 2,                      'getGuildTreaties returns 2 treaties for g3');

var g4Treaties = DiplomaticSystem.getGuildTreaties(qState, 'g4');
assert(g4Treaties.length === 0,                      'getGuildTreaties returns 0 for unknown guild');

// getActiveTreaties
var activeG1G2 = DiplomaticSystem.getActiveTreaties(qState, 'g1', 'g2');
assert(activeG1G2.length === 1,                      'getActiveTreaties returns 1 between g1 and g2');
assert(activeG1G2[0].status === 'active',            'returned treaty is active');

var activeG2G3 = DiplomaticSystem.getActiveTreaties(qState, 'g2', 'g3');
assert(activeG2G3.length === 0,                      'getActiveTreaties returns 0 for proposed treaty (g2,g3)');

var activeNone = DiplomaticSystem.getActiveTreaties(qState, 'g1', 'g4');
assert(activeNone.length === 0,                      'getActiveTreaties returns 0 for no relationship');

// Symmetric: g2,g1 same as g1,g2
var activeSymm = DiplomaticSystem.getActiveTreaties(qState, 'g2', 'g1');
assert(activeSymm.length === 1,                      'getActiveTreaties is symmetric (g2,g1)');

// ---------------------------------------------------------------------------
// SECTION 8: declareEmbargo
// ---------------------------------------------------------------------------
section('declareEmbargo');

var emState = makeState();
var emRes = DiplomaticSystem.declareEmbargo(emState, 'gA', 'gB', 'Trade violation', 200);
assert(emRes.success === true,                        'declareEmbargo succeeds');
assert(typeof emRes.embargo === 'object',             'declareEmbargo returns embargo object');
assert(typeof emRes.embargo.id === 'string',          'embargo has string id');
assert(emRes.embargo.fromGuildId === 'gA',            'fromGuildId is gA');
assert(emRes.embargo.toGuildId   === 'gB',            'toGuildId is gB');
assert(emRes.embargo.active      === true,            'embargo is active');
assert(emRes.embargo.declaredAt  === 200,             'declaredAt is 200');
assert(emRes.embargo.reason === 'Trade violation',    'reason stored correctly');
assert(emState.embargoes.length === 1,                'embargoes array has 1 entry');

// Cannot embargo self
var selfEmb = DiplomaticSystem.declareEmbargo(emState, 'gA', 'gA', 'self', 0);
assert(selfEmb.success === false,                     'cannot embargo own guild');

// Duplicate active embargo fails
var dupEmb = DiplomaticSystem.declareEmbargo(emState, 'gA', 'gB', 'duplicate', 300);
assert(dupEmb.success === false,                      'duplicate active embargo rejected');

// Reverse direction embargo is allowed
var revEmb = DiplomaticSystem.declareEmbargo(emState, 'gB', 'gA', 'counter-embargo', 300);
assert(revEmb.success === true,                       'reverse direction embargo allowed');

// Missing guild IDs
var missingEmb = DiplomaticSystem.declareEmbargo(emState, '', 'gB', 'test', 0);
assert(missingEmb.success === false,                  'declareEmbargo fails with empty fromGuildId');

// Standing decreases on embargo
var standEmb = DiplomaticSystem.getDiplomaticStanding(emState, 'gA', 'gB');
assert(standEmb < 0,                                  'standing is negative after embargo');

// Unique embargo IDs
var s3 = makeState();
var em1 = DiplomaticSystem.declareEmbargo(s3, 'gX', 'gY', 'r1', 0);
var em2 = DiplomaticSystem.declareEmbargo(s3, 'gX', 'gZ', 'r2', 0);
assert(em1.embargo.id !== em2.embargo.id,             'embargo IDs are unique');

// ---------------------------------------------------------------------------
// SECTION 9: liftEmbargo
// ---------------------------------------------------------------------------
section('liftEmbargo');

var liftState = makeState();
var liftEmb = DiplomaticSystem.declareEmbargo(liftState, 'gA', 'gB', 'test', 0);
var liftRes = DiplomaticSystem.liftEmbargo(liftState, liftEmb.embargo.id, 500);
assert(liftRes.success === true,                      'liftEmbargo succeeds');
assert(liftState.embargoes[0].active    === false,    'embargo is no longer active');
assert(liftState.embargoes[0].liftedAt  === 500,      'liftedAt is 500');

// Cannot lift already-lifted
var liftAgain = DiplomaticSystem.liftEmbargo(liftState, liftEmb.embargo.id, 600);
assert(liftAgain.success === false,                   'cannot lift already-lifted embargo');

// Nonexistent embargo
var liftFake = DiplomaticSystem.liftEmbargo(liftState, 'embargo_999', 0);
assert(liftFake.success === false,                    'liftEmbargo fails for unknown embargo id');

// Standing improves after lift
var standLift = DiplomaticSystem.getDiplomaticStanding(liftState, 'gA', 'gB');
// declare = -15, lift = +5, net = -10
assert(standLift === -10,                             'standing is -10 after embargo then lift');

// After lift, isEmbargoed is false
assert(DiplomaticSystem.isEmbargoed(liftState, 'gA', 'gB') === false, 'isEmbargoed false after lift');

// ---------------------------------------------------------------------------
// SECTION 10: getEmbargoes / isEmbargoed
// ---------------------------------------------------------------------------
section('getEmbargoes / isEmbargoed');

var isEmbState = makeState();
DiplomaticSystem.declareEmbargo(isEmbState, 'gA', 'gB', 'r', 0);
DiplomaticSystem.declareEmbargo(isEmbState, 'gC', 'gA', 'r', 0);

var embsA = DiplomaticSystem.getEmbargoes(isEmbState, 'gA');
assert(embsA.length === 2,                            'getEmbargoes returns 2 embargoes involving gA');

var embsB = DiplomaticSystem.getEmbargoes(isEmbState, 'gB');
assert(embsB.length === 1,                            'getEmbargoes returns 1 embargo for gB');

var embsD = DiplomaticSystem.getEmbargoes(isEmbState, 'gD');
assert(embsD.length === 0,                            'getEmbargoes returns 0 for unrelated guild');

// isEmbargoed — both directions
assert(DiplomaticSystem.isEmbargoed(isEmbState, 'gA', 'gB') === true,  'gA embargoes gB — isEmbargoed true');
assert(DiplomaticSystem.isEmbargoed(isEmbState, 'gB', 'gA') === true,  'symmetric isEmbargoed check (gB,gA)');
assert(DiplomaticSystem.isEmbargoed(isEmbState, 'gC', 'gA') === true,  'gC embargoes gA — isEmbargoed true');
assert(DiplomaticSystem.isEmbargoed(isEmbState, 'gA', 'gC') === true,  'symmetric (gA,gC)');
assert(DiplomaticSystem.isEmbargoed(isEmbState, 'gB', 'gC') === false, 'gB and gC not embargoed');

// After lifting one embargo, isEmbargoed changes
var liftedId = isEmbState.embargoes[0].id;
DiplomaticSystem.liftEmbargo(isEmbState, liftedId, 100);
assert(DiplomaticSystem.isEmbargoed(isEmbState, 'gA', 'gB') === false, 'isEmbargoed false after lift');

// ---------------------------------------------------------------------------
// SECTION 11: appointAmbassador / getAmbassador
// ---------------------------------------------------------------------------
section('appointAmbassador / getAmbassador');

var ambState = makeState();
var ambRes = DiplomaticSystem.appointAmbassador(ambState, 'gA', 'player1', 0);
assert(ambRes.success === true,                       'appointAmbassador succeeds');

var amb = DiplomaticSystem.getAmbassador(ambState, 'gA');
assert(amb !== null,                                  'getAmbassador returns ambassador');
assert(amb.guildId    === 'gA',                       'ambassador guildId is gA');
assert(amb.playerId   === 'player1',                  'ambassador playerId is player1');
assert(amb.active     === true,                       'ambassador is active');
assert(amb.appointedAt === 0,                         'appointedAt is 0');

// Replacing ambassador
var replaceRes = DiplomaticSystem.appointAmbassador(ambState, 'gA', 'player2', 100);
assert(replaceRes.success === true,                   'can replace ambassador');
var newAmb = DiplomaticSystem.getAmbassador(ambState, 'gA');
assert(newAmb.playerId === 'player2',                 'new ambassador is player2');

// getAmbassador for guild with no ambassador
var noAmb = DiplomaticSystem.getAmbassador(ambState, 'gZ');
assert(noAmb === null,                                'getAmbassador returns null for guild with no ambassador');

// Missing guildId
var missingAmb = DiplomaticSystem.appointAmbassador(ambState, '', 'p', 0);
assert(missingAmb.success === false,                  'appointAmbassador fails with empty guildId');

// Missing playerId
var missingPlayer = DiplomaticSystem.appointAmbassador(ambState, 'gA', '', 0);
assert(missingPlayer.success === false,               'appointAmbassador fails with empty playerId');

// Multiple guilds have independent ambassadors
var amb2Res = DiplomaticSystem.appointAmbassador(ambState, 'gB', 'playerX', 50);
assert(amb2Res.success === true,                      'appoint ambassador for second guild');
var ambB = DiplomaticSystem.getAmbassador(ambState, 'gB');
assert(ambB.playerId === 'playerX',                   'gB ambassador is playerX');
assert(DiplomaticSystem.getAmbassador(ambState, 'gA').playerId === 'player2', 'gA ambassador unchanged');

// ---------------------------------------------------------------------------
// SECTION 12: reportIncident / getIncidents
// ---------------------------------------------------------------------------
section('reportIncident / getIncidents');

var incState = makeState();
var incProp = DiplomaticSystem.proposeTreaty(incState, 'gA', 'gB', 'non_aggression', {}, 0);
DiplomaticSystem.acceptTreaty(incState, incProp.treaty.id, 'gB', 1);

var incRes = DiplomaticSystem.reportIncident(incState, 'gA', incProp.treaty.id, 'gB launched raid', 500);
assert(incRes.success === true,                       'reportIncident succeeds');
assert(typeof incRes.incident === 'object',           'reportIncident returns incident');
assert(typeof incRes.incident.id === 'string',        'incident has string id');
assert(incRes.incident.reportingGuildId === 'gA',     'reportingGuildId is gA');
assert(incRes.incident.violatorGuildId  === 'gB',     'violatorGuildId is gB');
assert(incRes.incident.treatyId === incProp.treaty.id, 'incident treatyId matches');
assert(incRes.incident.description === 'gB launched raid', 'description stored');
assert(incRes.incident.reportedAt  === 500,           'reportedAt is 500');
assert(typeof incRes.penalty === 'number',            'penalty is a number');
assert(incRes.penalty > 0,                            'penalty is positive');
assert(incState.incidents.length === 1,               'incidents array has 1 entry');

// Standing decreases on incident
var standInc = DiplomaticSystem.getDiplomaticStanding(incState, 'gA', 'gB');
// proposal +2, accept +15, incident -10, net = 7
assert(standInc < 17,                                 'standing decreases after incident');

// Non-party cannot report
var nonPartyInc = DiplomaticSystem.reportIncident(incState, 'gC', incProp.treaty.id, 'desc', 600);
assert(nonPartyInc.success === false,                 'non-party cannot report incident');

// Nonexistent treaty incident
var fakeInc = DiplomaticSystem.reportIncident(incState, 'gA', 'treaty_fake', 'desc', 0);
assert(fakeInc.success === false,                     'reportIncident fails for unknown treaty');

// Multiple incidents accumulate
var incRes2 = DiplomaticSystem.reportIncident(incState, 'gA', incProp.treaty.id, 'second violation', 600);
assert(incRes2.success === true,                      'second incident report succeeds');
assert(incState.incidents.length === 2,               'two incidents recorded');

// getIncidents — returns all incidents for guild
var incListA = DiplomaticSystem.getIncidents(incState, 'gA');
assert(incListA.length === 2,                         'getIncidents returns 2 for gA (reporter)');

var incListB = DiplomaticSystem.getIncidents(incState, 'gB');
assert(incListB.length === 2,                         'getIncidents returns 2 for gB (violator)');

var incListC = DiplomaticSystem.getIncidents(incState, 'gC');
assert(incListC.length === 0,                         'getIncidents returns 0 for uninvolved guild');

// Unique incident IDs
assert(incRes.incident.id !== incRes2.incident.id,    'incident IDs are unique');

// toGuildId can also report incident against fromGuildId
var toRep = DiplomaticSystem.reportIncident(incState, 'gB', incProp.treaty.id, 'counter-claim', 700);
assert(toRep.success === true,                        'toGuildId can report incident against fromGuildId');
assert(toRep.incident.reportingGuildId === 'gB',      'reporter is gB');
assert(toRep.incident.violatorGuildId  === 'gA',      'violator is gA');

// ---------------------------------------------------------------------------
// SECTION 13: getDiplomaticStanding
// ---------------------------------------------------------------------------
section('getDiplomaticStanding');

var dsState = makeState();
// Initially 0
var initStand = DiplomaticSystem.getDiplomaticStanding(dsState, 'gA', 'gB');
assert(initStand === 0,                               'initial standing is 0');

// Symmetric — same value both ways
DiplomaticSystem.proposeTreaty(dsState, 'gA', 'gB', 'trade_alliance', {}, 0);
var standForward = DiplomaticSystem.getDiplomaticStanding(dsState, 'gA', 'gB');
var standReverse = DiplomaticSystem.getDiplomaticStanding(dsState, 'gB', 'gA');
assert(standForward === standReverse,                 'getDiplomaticStanding is symmetric');

// Proposal = +2
assert(standForward === 2,                            'standing is +2 after proposal');

// Accept adds more
var dsProp = DiplomaticSystem.proposeTreaty(dsState, 'gA', 'gC', 'military_pact', {}, 0);
DiplomaticSystem.acceptTreaty(dsState, dsProp.treaty.id, 'gC', 1);
var standAC = DiplomaticSystem.getDiplomaticStanding(dsState, 'gA', 'gC');
// proposal +2, accept +15 = 17
assert(standAC === 17,                                'standing is 17 after propose+accept (2+15)');

// Independent per-pair
var standAB = DiplomaticSystem.getDiplomaticStanding(dsState, 'gA', 'gB');
assert(standAB !== standAC,                           'standing is independent per guild pair');

// Unknown pair returns 0
var standUnknown = DiplomaticSystem.getDiplomaticStanding(dsState, 'gX', 'gY');
assert(standUnknown === 0,                            'unknown guild pair standing is 0');

// Standing is bounded at MIN/MAX via multiple adjustments
var boundState = makeState();
for (var b = 0; b < 10; b++) {
  DiplomaticSystem.declareEmbargo(boundState, 'gA', 'gB', 'r', b * 100);
  DiplomaticSystem.liftEmbargo(boundState, boundState.embargoes[b].id, b * 100 + 1);
}
var boundStand = DiplomaticSystem.getDiplomaticStanding(boundState, 'gA', 'gB');
assert(boundStand >= -100 && boundStand <= 100,      'standing bounded between -100 and 100');

// ---------------------------------------------------------------------------
// SECTION 14: scheduleConference / getConferences
// ---------------------------------------------------------------------------
section('scheduleConference / getConferences');

var confState = makeState();
var confRes = DiplomaticSystem.scheduleConference(confState, ['gA', 'gB', 'gC'], 'Peace Summit', 1000);
assert(confRes.success === true,                      'scheduleConference succeeds');
assert(typeof confRes.conference === 'object',        'scheduleConference returns conference');
assert(typeof confRes.conference.id === 'string',     'conference has string id');
assert(confRes.conference.topic === 'Peace Summit',   'conference topic stored');
assert(confRes.conference.startTick === 1000,         'conference startTick is 1000');
assert(confRes.conference.status === 'scheduled',     'conference status is scheduled');
assert(Array.isArray(confRes.conference.guildIds),    'conference guildIds is array');
assert(confRes.conference.guildIds.length === 3,      'conference has 3 guilds');
assert(confState.conferences.length === 1,            'conferences array has 1 entry');

// Less than 2 guilds fails
var tooFewConf = DiplomaticSystem.scheduleConference(confState, ['gA'], 'Solo', 2000);
assert(tooFewConf.success === false,                  'conference with < 2 guilds fails');

// Not an array fails
var badConf = DiplomaticSystem.scheduleConference(confState, 'gA', 'Topic', 1000);
assert(badConf.success === false,                     'conference with non-array guildIds fails');

// Missing topic
var noTopic = DiplomaticSystem.scheduleConference(confState, ['gA', 'gB'], '', 1000);
assert(noTopic.success === false,                     'conference with empty topic fails');

// Negative startTick
var negTick = DiplomaticSystem.scheduleConference(confState, ['gA', 'gB'], 'Topic', -1);
assert(negTick.success === false,                     'conference with negative startTick fails');

// Multiple conferences get unique IDs
var conf2 = DiplomaticSystem.scheduleConference(confState, ['gA', 'gB'], 'Trade Forum', 2000);
var conf3 = DiplomaticSystem.scheduleConference(confState, ['gB', 'gC'], 'Alliance Talk', 3000);
assert(conf2.conference.id !== conf3.conference.id,  'conference IDs are unique');

// getConferences
var allConfs = DiplomaticSystem.getConferences(confState);
assert(Array.isArray(allConfs),                       'getConferences returns array');
assert(allConfs.length === 3,                         'getConferences returns all 3 conferences');

// getConferences returns defensive copy
allConfs.push({ id: 'injected' });
var allConfs2 = DiplomaticSystem.getConferences(confState);
assert(allConfs2.length === 3,                        'getConferences returns defensive copy');

// Conference with exactly 2 guilds (minimum)
var minConf = DiplomaticSystem.scheduleConference(confState, ['g1', 'g2'], 'Bilateral', 5000);
assert(minConf.success === true,                      'conference with exactly 2 guilds succeeds');

// tick 0 is valid
var zeroTick = DiplomaticSystem.scheduleConference(confState, ['g1', 'g2'], 'Urgent', 0);
assert(zeroTick.success === true,                     'conference at tick 0 succeeds');

// ---------------------------------------------------------------------------
// SECTION 15: getTreatyBenefits
// ---------------------------------------------------------------------------
section('getTreatyBenefits');

var tbState = makeState();
var tbP1 = DiplomaticSystem.proposeTreaty(tbState, 'gA', 'gB', 'trade_alliance', {}, 0);
var tbP2 = DiplomaticSystem.proposeTreaty(tbState, 'gA', 'gC', 'military_pact', {}, 0);
var tbP3 = DiplomaticSystem.proposeTreaty(tbState, 'gA', 'gB', 'mutual_defense', {}, 0);
var tbP4 = DiplomaticSystem.proposeTreaty(tbState, 'gD', 'gA', 'non_aggression', {}, 0);
DiplomaticSystem.acceptTreaty(tbState, tbP1.treaty.id, 'gB', 1);
DiplomaticSystem.acceptTreaty(tbState, tbP2.treaty.id, 'gC', 1);
DiplomaticSystem.acceptTreaty(tbState, tbP4.treaty.id, 'gA', 1);
// tbP3 stays proposed — should NOT appear in benefits

var benefitsA = DiplomaticSystem.getTreatyBenefits(tbState, 'gA');
assert(Array.isArray(benefitsA),                      'getTreatyBenefits returns array');
assert(benefitsA.length === 3,                        'gA has 3 active treaty benefits (trade, military, non_agg)');

var hasTradeAllianceBenefit = benefitsA.some(function(b) { return b.type === 'trade_alliance'; });
var hasMilitaryBenefit      = benefitsA.some(function(b) { return b.type === 'military_pact'; });
var hasNonAggressionBenefit = benefitsA.some(function(b) { return b.type === 'non_aggression'; });
assert(hasTradeAllianceBenefit,                       'gA has trade_alliance benefit');
assert(hasMilitaryBenefit,                            'gA has military_pact benefit');
assert(hasNonAggressionBenefit,                       'gA has non_aggression benefit');

// Each benefit has required fields
for (var bi = 0; bi < benefitsA.length; bi++) {
  var ben = benefitsA[bi];
  assert(typeof ben.treatyId === 'string',             'benefit has treatyId string');
  assert(typeof ben.type     === 'string',             'benefit has type string');
  assert(typeof ben.otherGuildId === 'string',         'benefit has otherGuildId');
  assert(typeof ben.benefit  === 'object',             'benefit has benefit object');
}

// gB has 1 active benefit (trade_alliance only; mutual_defense is still proposed)
var benefitsB = DiplomaticSystem.getTreatyBenefits(tbState, 'gB');
assert(benefitsB.length === 1,                        'gB has 1 active treaty benefit');

// Guild with no treaties
var benefitsZ = DiplomaticSystem.getTreatyBenefits(tbState, 'gZ');
assert(benefitsZ.length === 0,                        'guild with no treaties has 0 benefits');

// After termination, benefit disappears
DiplomaticSystem.terminateTreaty(tbState, tbP1.treaty.id, 'gA', 2000);
var benefitsAfterTerm = DiplomaticSystem.getTreatyBenefits(tbState, 'gA');
var hasTradeAfterTerm = benefitsAfterTerm.some(function(b) { return b.type === 'trade_alliance'; });
assert(!hasTradeAfterTerm,                            'trade_alliance benefit gone after termination');

// ---------------------------------------------------------------------------
// SECTION 16: expireTreaties
// ---------------------------------------------------------------------------
section('expireTreaties');

var expState = makeState();
// Treaty that expires at tick 1000
var expP1 = DiplomaticSystem.proposeTreaty(expState, 'gA', 'gB', 'trade_alliance', { duration: 1000 }, 0);
DiplomaticSystem.acceptTreaty(expState, expP1.treaty.id, 'gB', 0);
// expiresAt = 0 + 1000 = 1000

// Treaty that expires at tick 5000
var expP2 = DiplomaticSystem.proposeTreaty(expState, 'gA', 'gC', 'military_pact', { duration: 5000 }, 0);
DiplomaticSystem.acceptTreaty(expState, expP2.treaty.id, 'gC', 0);
// expiresAt = 0 + 5000 = 5000

// Expire at tick 999 — nothing should expire
var exp999 = DiplomaticSystem.expireTreaties(expState, 999);
assert(Array.isArray(exp999.expired),                 'expireTreaties returns expired array');
assert(exp999.expired.length === 0,                   'no treaties expire at tick 999');

// Expire at tick 1000 — first treaty expires
var exp1000 = DiplomaticSystem.expireTreaties(expState, 1000);
assert(exp1000.expired.length === 1,                  'one treaty expires at tick 1000');
assert(exp1000.expired[0].id === expP1.treaty.id,     'expired treaty is the trade_alliance');
assert(exp1000.expired[0].status === 'expired',       'expired treaty status is "expired"');

// Verify treaty in state is also marked expired
var fetchedExpired = DiplomaticSystem.getTreaty(expState, expP1.treaty.id);
assert(fetchedExpired.status === 'expired',           'getTreaty shows expired status');

// Second treaty still active
var activeG1G3 = DiplomaticSystem.getActiveTreaties(expState, 'gA', 'gC');
assert(activeG1G3.length === 1,                       'military_pact still active after first expiry');

// Expire at tick 5001 — second treaty expires
var exp5001 = DiplomaticSystem.expireTreaties(expState, 5001);
assert(exp5001.expired.length === 1,                  'second treaty expires at tick 5001');

// Expire with no active treaties returns empty array
var expEmpty = DiplomaticSystem.expireTreaties(makeState(), 99999);
assert(expEmpty.expired.length === 0,                 'expireTreaties with no treaties returns empty');

// Already-expired treaties not double-expired
var expAgain = DiplomaticSystem.expireTreaties(expState, 99999);
assert(expAgain.expired.length === 0,                 'already-expired treaties not double-expired');

// Proposed (not accepted) treaty does not expire via expireTreaties
var expProposed = makeState();
var epProp = DiplomaticSystem.proposeTreaty(expProposed, 'gA', 'gB', 'trade_alliance', {}, 0);
// expiresAt is null for proposed treaty
var epRes = DiplomaticSystem.expireTreaties(expProposed, 99999);
assert(epRes.expired.length === 0,                    'proposed treaty (expiresAt null) not expired');
assert(epProp.treaty.status === 'proposed',           'proposed treaty status unchanged after expireTreaties');

// ---------------------------------------------------------------------------
// SECTION 17: COOLING_OFF_TICKS constant
// ---------------------------------------------------------------------------
section('COOLING_OFF_TICKS constant');

assert(typeof DiplomaticSystem.COOLING_OFF_TICKS === 'number', 'COOLING_OFF_TICKS is exported as number');
assert(DiplomaticSystem.COOLING_OFF_TICKS === 700,             'COOLING_OFF_TICKS equals 700');

// Termination sets coolingOffEnd = currentTick + 700
var coolState = makeState();
var coolProp = DiplomaticSystem.proposeTreaty(coolState, 'gA', 'gB', 'resource_sharing', {}, 0);
DiplomaticSystem.acceptTreaty(coolState, coolProp.treaty.id, 'gB', 1);
var coolRes = DiplomaticSystem.terminateTreaty(coolState, coolProp.treaty.id, 'gA', 300);
assert(coolRes.cooldownEnd === 300 + 700,              'cooldownEnd = 300 + 700 = 1000');

// Different currentTicks give different cooldownEnds
var cool2State = makeState();
var cool2Prop = DiplomaticSystem.proposeTreaty(cool2State, 'gA', 'gB', 'resource_sharing', {}, 0);
DiplomaticSystem.acceptTreaty(cool2State, cool2Prop.treaty.id, 'gB', 1);
var cool2Res = DiplomaticSystem.terminateTreaty(cool2State, cool2Prop.treaty.id, 'gA', 1500);
assert(cool2Res.cooldownEnd === 1500 + 700,            'cooldownEnd = 1500 + 700 = 2200');

// ---------------------------------------------------------------------------
// SECTION 18: Integration scenarios
// ---------------------------------------------------------------------------
section('Integration scenarios');

// Full treaty lifecycle: proposed -> active -> terminated
var fullState = makeState();
var fProp = DiplomaticSystem.proposeTreaty(fullState, 'gA', 'gB', 'cultural_exchange', {}, 100);
assert(fProp.treaty.status === 'proposed',             'lifecycle: proposed');
DiplomaticSystem.acceptTreaty(fullState, fProp.treaty.id, 'gB', 200);
assert(DiplomaticSystem.getTreaty(fullState, fProp.treaty.id).status === 'active', 'lifecycle: active');
DiplomaticSystem.terminateTreaty(fullState, fProp.treaty.id, 'gA', 1000);
assert(DiplomaticSystem.getTreaty(fullState, fProp.treaty.id).status === 'terminated', 'lifecycle: terminated');

// Can propose same type again after termination (no duplicate block since old one is terminated)
var rePropose = DiplomaticSystem.proposeTreaty(fullState, 'gA', 'gB', 'cultural_exchange', {}, 1800);
assert(rePropose.success === true,                     'can re-propose after termination cooling off');

// Embargo + embargo lift sequence preserves standing correctly
var seqState = makeState();
DiplomaticSystem.proposeTreaty(seqState, 'gA', 'gB', 'trade_alliance', {}, 0);
var seqPr = DiplomaticSystem.proposeTreaty(seqState, 'gA', 'gB', 'trade_alliance', {}, 0);
// Second prop should fail (duplicate)
assert(seqPr.success === false,                        'cannot propose duplicate in same sequence');

// Conference with many guilds
var manyConf = DiplomaticSystem.scheduleConference(
  makeState(),
  ['gA','gB','gC','gD','gE','gF'],
  'Grand Summit',
  9999
);
assert(manyConf.success === true,                      'conference with 6 guilds succeeds');
assert(manyConf.conference.guildIds.length === 6,      'conference has 6 guilds');

// Incident on mutual_defense treaty — toGuildId reports
var intState = makeState();
var intProp = DiplomaticSystem.proposeTreaty(intState, 'gX', 'gY', 'mutual_defense', {}, 0);
DiplomaticSystem.acceptTreaty(intState, intProp.treaty.id, 'gY', 1);
var intInc = DiplomaticSystem.reportIncident(intState, 'gY', intProp.treaty.id, 'attack', 500);
assert(intInc.success === true,                        'toGuildId can report incident on mutual_defense');
assert(intInc.incident.reportingGuildId === 'gY',      'reporter is gY');
assert(intInc.incident.violatorGuildId  === 'gX',      'violator is gX');

// Standing log is populated
assert(intState.standingLog.length > 0,                'standingLog populated after operations');

// All-guild query works for getGuildTreaties with no treaties
var emptyGT = DiplomaticSystem.getGuildTreaties(makeState(), 'gUnknown');
assert(Array.isArray(emptyGT) && emptyGT.length === 0, 'getGuildTreaties on fresh state returns []');

// ---------------------------------------------------------------------------
// RESULTS SUMMARY
// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log('Diplomatic System Test Results');
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
