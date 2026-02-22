// test_seasonal_events_auto.js
// Tests for seasonal_events_auto.js
// Run with: node tests/test_seasonal_events_auto.js

var SEA = require('../src/js/seasonal_events_auto.js');

var passed = 0;
var failed = 0;
var failMessages = [];

function assert(condition, msg) {
    if (condition) {
        passed++;
    } else {
        failed++;
        failMessages.push('FAIL: ' + msg);
        console.log('FAIL: ' + msg);
    }
}

function assertEqual(a, b, msg) {
    assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')');
}

function assertDeepEqual(a, b, msg) {
    assert(JSON.stringify(a) === JSON.stringify(b), msg);
}

function assertType(val, type, msg) {
    assert(typeof val === type, msg + ' (expected ' + type + ', got ' + typeof val + ')');
}

function assertArray(val, msg) {
    assert(Array.isArray(val), msg + ' (expected array)');
}

function assertGte(a, b, msg) {
    assert(a >= b, msg + ' (expected ' + a + ' >= ' + b + ')');
}

function assertLte(a, b, msg) {
    assert(a <= b, msg + ' (expected ' + a + ' <= ' + b + ')');
}

function assertInRange(val, min, max, msg) {
    assert(val >= min && val <= max, msg + ' (expected ' + val + ' in [' + min + ', ' + max + '])');
}

function makeState() {
    return {};
}

function makeStateWithSeason(season, year) {
    var state = makeState();
    var gen = SEA.generateSeason(season, year, 42);
    SEA.storeGeneratedSeason(state, gen);
    return state;
}

// ============================================================================
// SECTION 1: Module exports
// ============================================================================

console.log('\n--- Section 1: Module Exports ---');
assert(typeof SEA.generateSeason === 'function', '1.1 generateSeason is a function');
assert(typeof SEA.getActiveEvents === 'function', '1.2 getActiveEvents is a function');
assert(typeof SEA.completeChallenge === 'function', '1.3 completeChallenge is a function');
assert(typeof SEA.updateProgress === 'function', '1.4 updateProgress is a function');
assert(typeof SEA.getProgress === 'function', '1.5 getProgress is a function');
assert(typeof SEA.getPlayerSeasonProgress === 'function', '1.6 getPlayerSeasonProgress is a function');
assert(typeof SEA.getSeasonLeaderboard === 'function', '1.7 getSeasonLeaderboard is a function');
assert(typeof SEA.getChallengeLeaderboard === 'function', '1.8 getChallengeLeaderboard is a function');
assert(typeof SEA.getSeasonRewards === 'function', '1.9 getSeasonRewards is a function');
assert(typeof SEA.claimSeasonReward === 'function', '1.10 claimSeasonReward is a function');
assert(typeof SEA.getTemplates === 'function', '1.11 getTemplates is a function');
assert(typeof SEA.getSeasons === 'function', '1.12 getSeasons is a function');
assert(typeof SEA.isSeasonActive === 'function', '1.13 isSeasonActive is a function');
assert(typeof SEA.getCurrentSeason === 'function', '1.14 getCurrentSeason is a function');
assert(typeof SEA.getSeasonHistory === 'function', '1.15 getSeasonHistory is a function');
assert(typeof SEA.getYearlyStats === 'function', '1.16 getYearlyStats is a function');
assert(typeof SEA.getChallengesByCategory === 'function', '1.17 getChallengesByCategory is a function');
assert(typeof SEA.getDifficultyDistribution === 'function', '1.18 getDifficultyDistribution is a function');
assert(typeof SEA.storeGeneratedSeason === 'function', '1.19 storeGeneratedSeason is a function');

// ============================================================================
// SECTION 2: Constants
// ============================================================================

console.log('\n--- Section 2: Constants ---');
assert(Array.isArray(SEA.CHALLENGE_TEMPLATES), '2.1 CHALLENGE_TEMPLATES is array');
assert(SEA.CHALLENGE_TEMPLATES.length === 20, '2.2 CHALLENGE_TEMPLATES has 20 entries');
assertType(SEA.SEASON_CONFIG, 'object', '2.3 SEASON_CONFIG is object');
assert(typeof SEA.SEASON_CONFIG.spring === 'object', '2.4 spring config exists');
assert(typeof SEA.SEASON_CONFIG.summer === 'object', '2.5 summer config exists');
assert(typeof SEA.SEASON_CONFIG.autumn === 'object', '2.6 autumn config exists');
assert(typeof SEA.SEASON_CONFIG.winter === 'object', '2.7 winter config exists');
assertEqual(SEA.TICKS_PER_YEAR, 2880, '2.8 TICKS_PER_YEAR is 2880');
assertEqual(SEA.SEASON_REWARD_THRESHOLD, 8, '2.9 SEASON_REWARD_THRESHOLD is 8');

// ============================================================================
// SECTION 3: Template structure
// ============================================================================

console.log('\n--- Section 3: Template Structure ---');
var templates = SEA.getTemplates();
assert(Array.isArray(templates), '3.1 getTemplates returns array');
assertEqual(templates.length, 20, '3.2 getTemplates returns 20 templates');

var tmpl0 = templates[0];
assert(typeof tmpl0.id === 'string', '3.3 template has string id');
assert(typeof tmpl0.name === 'string', '3.4 template has string name');
assert(typeof tmpl0.description === 'string', '3.5 template has string description');
assert(typeof tmpl0.category === 'string', '3.6 template has string category');
assert(typeof tmpl0.paramRanges === 'object', '3.7 template has paramRanges object');
assert(Array.isArray(tmpl0.seasons), '3.8 template has seasons array');
assert(typeof tmpl0.baseReward === 'object', '3.9 template has baseReward object');
assert(typeof tmpl0.baseReward.spark === 'number', '3.10 baseReward has spark');
assert(typeof tmpl0.baseReward.xp === 'number', '3.11 baseReward has xp');
assert(typeof tmpl0.rewardScale === 'number', '3.12 template has rewardScale');
assert(typeof tmpl0.tier === 'number', '3.13 template has tier');
assertInRange(tmpl0.tier, 1, 3, '3.14 tier in range 1-3');

// Check all templates have valid tier
var allTiersValid = true;
for (var ti = 0; ti < templates.length; ti++) {
    if (templates[ti].tier < 1 || templates[ti].tier > 3) { allTiersValid = false; }
}
assert(allTiersValid, '3.15 all templates have valid tier 1-3');

// Check categories
var validCats = ['gathering', 'fishing', 'crafting', 'exploration', 'social', 'combat', 'cooking', 'building'];
var allCatsValid = true;
for (var ci = 0; ci < templates.length; ci++) {
    if (validCats.indexOf(templates[ci].category) === -1) { allCatsValid = false; }
}
assert(allCatsValid, '3.16 all templates have valid category');

// Ensure template IDs unique
var tmplIds = {};
var tmplIdsUnique = true;
for (var tui = 0; tui < templates.length; tui++) {
    if (tmplIds[templates[tui].id]) { tmplIdsUnique = false; }
    tmplIds[templates[tui].id] = true;
}
assert(tmplIdsUnique, '3.17 template IDs are unique');

// ============================================================================
// SECTION 4: Season config
// ============================================================================

console.log('\n--- Section 4: Season Config ---');
var seasons = SEA.getSeasons();
assertArray(seasons, '4.1 getSeasons returns array');
assertEqual(seasons.length, 4, '4.2 getSeasons returns 4 seasons');

var springCfg = SEA.SEASON_CONFIG.spring;
assertEqual(springCfg.id, 'spring', '4.3 spring id correct');
assertEqual(springCfg.name, 'Spring', '4.4 spring name correct');
assertArray(springCfg.tickRange, '4.5 spring tickRange is array');
assertEqual(springCfg.tickRange[0], 0, '4.6 spring tickRange starts at 0');
assertEqual(springCfg.tickRange[1], 719, '4.7 spring tickRange ends at 719');
assertType(springCfg.theme, 'string', '4.8 spring has theme');
assertArray(springCfg.specialRewards, '4.9 spring has specialRewards');
assertType(springCfg.bonusCategory, 'string', '4.10 spring has bonusCategory');

var summerCfg = SEA.SEASON_CONFIG.summer;
assertEqual(summerCfg.tickRange[0], 720, '4.11 summer starts at tick 720');
assertEqual(summerCfg.tickRange[1], 1439, '4.12 summer ends at tick 1439');

var autumnCfg = SEA.SEASON_CONFIG.autumn;
assertEqual(autumnCfg.tickRange[0], 1440, '4.13 autumn starts at tick 1440');
assertEqual(autumnCfg.tickRange[1], 2159, '4.14 autumn ends at tick 2159');

var winterCfg = SEA.SEASON_CONFIG.winter;
assertEqual(winterCfg.tickRange[0], 2160, '4.15 winter starts at tick 2160');
assertEqual(winterCfg.tickRange[1], 2879, '4.16 winter ends at tick 2879');

// ============================================================================
// SECTION 5: generateSeason
// ============================================================================

console.log('\n--- Section 5: generateSeason ---');
var gen1 = SEA.generateSeason('spring', 2026, 42);
assert(typeof gen1 === 'object', '5.1 generateSeason returns object');
assertArray(gen1.challenges, '5.2 result has challenges array');
assertInRange(gen1.challenges.length, 10, 15, '5.3 challenge count 10-15');
assert(gen1.specialReward !== undefined, '5.4 result has specialReward');
assertEqual(gen1.season, 'spring', '5.5 result has correct season');
assertEqual(gen1.year, 2026, '5.6 result has correct year');

// Check challenge shape
var ch0 = gen1.challenges[0];
assertType(ch0.id, 'string', '5.7 challenge has string id');
assertType(ch0.templateId, 'string', '5.8 challenge has templateId');
assertEqual(ch0.season, 'spring', '5.9 challenge has season');
assertEqual(ch0.year, 2026, '5.10 challenge has year');
assertType(ch0.params, 'object', '5.11 challenge has params');
assertType(ch0.name, 'string', '5.12 challenge has name');
assertType(ch0.description, 'string', '5.13 challenge has description');
assertType(ch0.category, 'string', '5.14 challenge has category');
assertType(ch0.tier, 'number', '5.15 challenge has tier');
assertType(ch0.reward, 'object', '5.16 challenge has reward');
assertType(ch0.reward.spark, 'number', '5.17 reward has spark');
assertType(ch0.reward.xp, 'number', '5.18 reward has xp');
assertArray(ch0.leaderboard, '5.19 challenge has leaderboard array');
assertEqual(ch0.status, 'active', '5.20 challenge starts as active');

// Determinism: same seed gives same result
var gen1b = SEA.generateSeason('spring', 2026, 42);
assertEqual(gen1.challenges.length, gen1b.challenges.length, '5.21 same seed same count');
assertEqual(gen1.challenges[0].id, gen1b.challenges[0].id, '5.22 same seed same first id');

// Different seed gives different result
var gen2 = SEA.generateSeason('spring', 2026, 99);
assertArray(gen2.challenges, '5.23 different seed produces challenges');
// At least one challenge differs (very high probability with different seeds)
var atLeastOneDiff = false;
for (var gi = 0; gi < Math.min(gen1.challenges.length, gen2.challenges.length); gi++) {
    if (gen1.challenges[gi].id !== gen2.challenges[gi].id ||
        JSON.stringify(gen1.challenges[gi].params) !== JSON.stringify(gen2.challenges[gi].params)) {
        atLeastOneDiff = true;
        break;
    }
}
assert(atLeastOneDiff, '5.24 different seeds produce different challenges');

// All challenges for spring should have valid seasons
var allValidSeason = true;
for (var gi2 = 0; gi2 < gen1.challenges.length; gi2++) {
    var tmplId = gen1.challenges[gi2].templateId;
    var tmplFound = null;
    for (var tfi = 0; tfi < templates.length; tfi++) {
        if (templates[tfi].id === tmplId) { tmplFound = templates[tfi]; break; }
    }
    if (!tmplFound || tmplFound.seasons.indexOf('spring') === -1) {
        allValidSeason = false;
    }
}
assert(allValidSeason, '5.25 all spring challenges are valid for spring');

// Different years with same seed should differ
var gen2026 = SEA.generateSeason('summer', 2026, 100);
var gen2027 = SEA.generateSeason('summer', 2027, 100);
// Both should produce valid results
assertArray(gen2026.challenges, '5.26 summer 2026 produces challenges');
assertArray(gen2027.challenges, '5.27 summer 2027 produces challenges');

// generateSeason winter
var genWinter = SEA.generateSeason('winter', 2026, 42);
assertArray(genWinter.challenges, '5.28 winter generates challenges');
assertInRange(genWinter.challenges.length, 10, 15, '5.29 winter challenge count 10-15');

// generateSeason autumn
var genAutumn = SEA.generateSeason('autumn', 2026, 42);
assertArray(genAutumn.challenges, '5.30 autumn generates challenges');

// Interpolation: name and description have season name
var nameHasSpring = gen1.challenges.some(function(c) {
    return c.name.indexOf('Spring') !== -1 || c.description.indexOf('Spring') !== -1;
});
assert(nameHasSpring, '5.31 at least one challenge name/desc contains season name');

// Reward scaling: tier 3 challenges have higher rewards than tier 1
var tier1Chs = gen1.challenges.filter(function(c) { return c.tier === 1; });
var tier3Chs = gen1.challenges.filter(function(c) { return c.tier === 3; });
if (tier1Chs.length > 0 && tier3Chs.length > 0) {
    assert(tier3Chs[0].reward.spark > tier1Chs[0].reward.spark || tier3Chs[0].reward.xp > tier1Chs[0].reward.xp,
        '5.32 tier 3 rewards exceed tier 1 rewards');
}

// No duplicate challenge IDs within a season
var genIds = {};
var genIdsUnique = true;
for (var gi3 = 0; gi3 < gen1.challenges.length; gi3++) {
    if (genIds[gen1.challenges[gi3].id]) { genIdsUnique = false; }
    genIds[gen1.challenges[gi3].id] = true;
}
assert(genIdsUnique, '5.33 no duplicate challenge IDs in a season');

// ============================================================================
// SECTION 6: storeGeneratedSeason & getActiveEvents
// ============================================================================

console.log('\n--- Section 6: storeGeneratedSeason & getActiveEvents ---');
var state6 = makeState();
var gen6 = SEA.generateSeason('spring', 2026, 42);
SEA.storeGeneratedSeason(state6, gen6);

assert(typeof state6.seasonalEvents === 'object', '6.1 state has seasonalEvents after store');
assert(Array.isArray(state6.seasonalEvents['spring_2026']), '6.2 spring_2026 key exists');
assertEqual(state6.seasonalEvents['spring_2026'].length, gen6.challenges.length, '6.3 stored correct count');

var active6 = SEA.getActiveEvents(state6, 'spring', 2026);
assertArray(active6, '6.4 getActiveEvents returns array');
assertEqual(active6.length, gen6.challenges.length, '6.5 all generated events are active');

// Manually set one to expired
state6.seasonalEvents['spring_2026'][0].status = 'expired';
var active6b = SEA.getActiveEvents(state6, 'spring', 2026);
assertEqual(active6b.length, gen6.challenges.length - 1, '6.6 expired events not returned');

// Empty state
var emptyState = makeState();
var noActive = SEA.getActiveEvents(emptyState, 'summer', 2025);
assertArray(noActive, '6.7 getActiveEvents empty state returns array');
assertEqual(noActive.length, 0, '6.8 getActiveEvents empty state returns 0 events');

// ============================================================================
// SECTION 7: updateProgress & getProgress
// ============================================================================

console.log('\n--- Section 7: updateProgress & getProgress ---');
var state7 = makeStateWithSeason('spring', 2026);
var eventId7 = state7.seasonalEvents['spring_2026'][0].id;

var progress7 = SEA.getProgress(state7, 'alice', eventId7);
assertType(progress7, 'object', '7.1 getProgress returns object');
assertEqual(progress7.progress, 0, '7.2 initial progress is 0');
assertEqual(progress7.completed, false, '7.3 initial completed is false');

var updated7 = SEA.updateProgress(state7, 'alice', eventId7, 10);
assertType(updated7, 'object', '7.4 updateProgress returns object');
assertEqual(updated7.progress, 10, '7.5 progress updated to 10');

SEA.updateProgress(state7, 'alice', eventId7, 5);
var progress7b = SEA.getProgress(state7, 'alice', eventId7);
assertEqual(progress7b.progress, 15, '7.6 progress accumulates correctly');

// Different player doesn't share progress
var progress7c = SEA.getProgress(state7, 'bob', eventId7);
assertEqual(progress7c.progress, 0, '7.7 different player has independent progress');

// Update for different player
SEA.updateProgress(state7, 'bob', eventId7, 20);
var progress7d = SEA.getProgress(state7, 'bob', eventId7);
assertEqual(progress7d.progress, 20, '7.8 bob progress updated independently');

// Alice not affected
var progress7e = SEA.getProgress(state7, 'alice', eventId7);
assertEqual(progress7e.progress, 15, '7.9 alice progress unchanged');

// updateProgress on unknown event doesn't crash
SEA.updateProgress(state7, 'alice', 'nonexistent_event', 5);
var progress7f = SEA.getProgress(state7, 'alice', 'nonexistent_event');
assertEqual(progress7f.progress, 5, '7.10 updateProgress works for new event ids');

// Progress doesn't increase after completion
SEA.completeChallenge(state7, 'alice', eventId7, 100);
SEA.updateProgress(state7, 'alice', eventId7, 100);
var progress7g = SEA.getProgress(state7, 'alice', eventId7);
assertEqual(progress7g.progress, 15, '7.11 progress not further accumulated after completion'); // stays at 15 since already completed

// ============================================================================
// SECTION 8: completeChallenge
// ============================================================================

console.log('\n--- Section 8: completeChallenge ---');
var state8 = makeStateWithSeason('summer', 2026);
var events8 = state8.seasonalEvents['summer_2026'];
var eventId8 = events8[0].id;

var result8 = SEA.completeChallenge(state8, 'player1', eventId8, 500);
assert(result8.success === true, '8.1 completeChallenge succeeds');
assert(typeof result8.reward === 'object', '8.2 result has reward');
assertType(result8.reward.spark, 'number', '8.3 reward has spark');
assertType(result8.reward.xp, 'number', '8.4 reward has xp');
assert(typeof result8.event === 'object', '8.5 result has event');

// Cannot complete again
var result8b = SEA.completeChallenge(state8, 'player1', eventId8, 600);
assertEqual(result8b.success, false, '8.6 cannot complete twice');
assertEqual(result8b.reason, 'already_completed', '8.7 reason is already_completed');

// Another player can complete same event
var result8c = SEA.completeChallenge(state8, 'player2', eventId8, 700);
assertEqual(result8c.success, true, '8.8 different player can complete same event');

// Invalid event id returns error
var result8d = SEA.completeChallenge(state8, 'player1', 'bad_id', 800);
assertEqual(result8d.success, false, '8.9 invalid event id fails');

// Event added to leaderboard
var lb8 = events8[0].leaderboard;
assertArray(lb8, '8.10 event has leaderboard');
assert(lb8.length >= 2, '8.11 leaderboard has both players');

var lbEntry = lb8[0];
assertType(lbEntry.playerId, 'string', '8.12 leaderboard entry has playerId');
assertType(lbEntry.completedAt, 'number', '8.13 leaderboard entry has completedAt');

// Complete on expired event fails
var state8e = makeStateWithSeason('autumn', 2026);
state8e.seasonalEvents['autumn_2026'][0].status = 'expired';
var expiredEventId = state8e.seasonalEvents['autumn_2026'][0].id;
var result8e = SEA.completeChallenge(state8e, 'player1', expiredEventId, 100);
assertEqual(result8e.success, false, '8.14 cannot complete expired event');
assertEqual(result8e.reason, 'event_not_active', '8.15 reason is event_not_active');

// Nonexistent season
var result8f = SEA.completeChallenge(state8, 'player1', 'winter_2026_harvest_bounty', 100);
assertEqual(result8f.success, false, '8.16 nonexistent season event fails');

// ============================================================================
// SECTION 9: getPlayerSeasonProgress
// ============================================================================

console.log('\n--- Section 9: getPlayerSeasonProgress ---');
var state9 = makeStateWithSeason('spring', 2026);
var events9 = state9.seasonalEvents['spring_2026'];
var eid9a = events9[0].id;
var eid9b = events9[1].id;

SEA.updateProgress(state9, 'alice', eid9a, 30);
SEA.completeChallenge(state9, 'alice', eid9a, 200);
SEA.updateProgress(state9, 'alice', eid9b, 10);

var prog9 = SEA.getPlayerSeasonProgress(state9, 'alice', 'spring', 2026);
assertArray(prog9, '9.1 getPlayerSeasonProgress returns array');
assertEqual(prog9.length, events9.length, '9.2 returns all challenges');

var prog9a = prog9.find(function(p) { return p.event.id === eid9a; });
assert(prog9a !== undefined, '9.3 finds challenge a');
assertEqual(prog9a.completed, true, '9.4 challenge a is completed');

var prog9b = prog9.find(function(p) { return p.event.id === eid9b; });
assert(prog9b !== undefined, '9.5 finds challenge b');
assertEqual(prog9b.completed, false, '9.6 challenge b is not completed');
assertEqual(prog9b.progress, 10, '9.7 challenge b has correct progress');

// Empty season for player
var prog9c = SEA.getPlayerSeasonProgress(state9, 'newplayer', 'spring', 2026);
assertEqual(prog9c.length, events9.length, '9.8 new player sees all challenges');
var allZero = prog9c.every(function(p) { return p.progress === 0 && !p.completed; });
assert(allZero, '9.9 new player has zero progress');

// Empty season
var prog9d = SEA.getPlayerSeasonProgress(state9, 'alice', 'winter', 2025);
assertArray(prog9d, '9.10 empty season returns empty array');
assertEqual(prog9d.length, 0, '9.11 empty season has 0 items');

// ============================================================================
// SECTION 10: getSeasonLeaderboard
// ============================================================================

console.log('\n--- Section 10: getSeasonLeaderboard ---');
var state10 = makeStateWithSeason('autumn', 2026);
var events10 = state10.seasonalEvents['autumn_2026'];

// Complete some challenges for multiple players
SEA.completeChallenge(state10, 'alice', events10[0].id, 100);
SEA.completeChallenge(state10, 'alice', events10[1].id, 200);
SEA.completeChallenge(state10, 'alice', events10[2].id, 300);
SEA.completeChallenge(state10, 'bob', events10[0].id, 150);
SEA.completeChallenge(state10, 'bob', events10[1].id, 250);
SEA.completeChallenge(state10, 'charlie', events10[0].id, 120);

var lb10 = SEA.getSeasonLeaderboard(state10, 'autumn', 2026, 10);
assertArray(lb10, '10.1 getSeasonLeaderboard returns array');
assertEqual(lb10[0].playerId, 'alice', '10.2 alice is first (3 completions)');
assertEqual(lb10[0].completed, 3, '10.3 alice has 3 completions');
assertEqual(lb10[1].playerId, 'bob', '10.4 bob is second (2 completions)');
assertEqual(lb10[2].playerId, 'charlie', '10.5 charlie is third (1 completion)');

// count parameter
var lb10b = SEA.getSeasonLeaderboard(state10, 'autumn', 2026, 2);
assertEqual(lb10b.length, 2, '10.6 count parameter limits results');

// Empty leaderboard
var lb10c = SEA.getSeasonLeaderboard(makeState(), 'spring', 2025, 10);
assertArray(lb10c, '10.7 empty leaderboard returns array');
assertEqual(lb10c.length, 0, '10.8 empty leaderboard has 0 entries');

// ============================================================================
// SECTION 11: getChallengeLeaderboard
// ============================================================================

console.log('\n--- Section 11: getChallengeLeaderboard ---');
var state11 = makeStateWithSeason('summer', 2026);
var events11 = state11.seasonalEvents['summer_2026'];
var eid11 = events11[0].id;

SEA.completeChallenge(state11, 'alpha', eid11, 100);
SEA.completeChallenge(state11, 'beta', eid11, 200);
SEA.completeChallenge(state11, 'gamma', eid11, 150);

var clb11 = SEA.getChallengeLeaderboard(state11, eid11, 10);
assertArray(clb11, '11.1 getChallengeLeaderboard returns array');
assertEqual(clb11.length, 3, '11.2 3 completions in leaderboard');
assertEqual(clb11[0].playerId, 'alpha', '11.3 first finisher is alpha');
assertEqual(clb11[0].completedAt, 100, '11.4 completedAt is 100');

// count parameter
var clb11b = SEA.getChallengeLeaderboard(state11, eid11, 2);
assertEqual(clb11b.length, 2, '11.5 count limits challenge leaderboard');

// Nonexistent event
var clb11c = SEA.getChallengeLeaderboard(state11, 'bad_id_nonexistent', 10);
assertArray(clb11c, '11.6 nonexistent event returns array');
assertEqual(clb11c.length, 0, '11.7 nonexistent event has 0 entries');

// ============================================================================
// SECTION 12: getSeasonRewards
// ============================================================================

console.log('\n--- Section 12: getSeasonRewards ---');
var rewards12s = SEA.getSeasonRewards('spring');
assertArray(rewards12s, '12.1 getSeasonRewards spring returns array');
assert(rewards12s.length > 0, '12.2 spring has at least one reward');
assertEqual(rewards12s[0].type, 'cosmetic', '12.3 spring reward is cosmetic');
assertEqual(rewards12s[0].id, 'spring_crown', '12.4 spring reward id is spring_crown');

var rewards12su = SEA.getSeasonRewards('summer');
assertEqual(rewards12su[0].id, 'summer_wreath', '12.5 summer reward id is summer_wreath');

var rewards12a = SEA.getSeasonRewards('autumn');
assertEqual(rewards12a[0].id, 'autumn_cloak', '12.6 autumn reward id is autumn_cloak');

var rewards12w = SEA.getSeasonRewards('winter');
assertEqual(rewards12w[0].id, 'winter_mantle', '12.7 winter reward id is winter_mantle');

// Unknown season
var rewards12bad = SEA.getSeasonRewards('badseason');
assertArray(rewards12bad, '12.8 unknown season returns empty array');
assertEqual(rewards12bad.length, 0, '12.9 unknown season has no rewards');

// getSeasonRewards returns copy (not reference)
var rewards12copy = SEA.getSeasonRewards('spring');
rewards12copy.push({ type: 'fake' });
var rewards12copy2 = SEA.getSeasonRewards('spring');
assert(rewards12copy2.length !== rewards12copy.length, '12.10 getSeasonRewards returns copy');

// ============================================================================
// SECTION 13: claimSeasonReward
// ============================================================================

console.log('\n--- Section 13: claimSeasonReward ---');
var state13 = makeStateWithSeason('winter', 2026);
var events13 = state13.seasonalEvents['winter_2026'];

// Complete fewer than threshold (8)
for (var ci13 = 0; ci13 < 5; ci13++) {
    SEA.completeChallenge(state13, 'alice', events13[ci13].id, ci13 * 100);
}

var claim13a = SEA.claimSeasonReward(state13, 'alice', 'winter', 2026);
assertEqual(claim13a.success, false, '13.1 cannot claim with < 8 completions');
assertEqual(claim13a.reason, 'insufficient_completions', '13.2 reason is insufficient_completions');
assertEqual(claim13a.completed, 5, '13.3 shows 5 completions');
assertEqual(claim13a.required, 8, '13.4 shows required 8');

// Complete enough
for (var ci13b = 5; ci13b < 9; ci13b++) {
    SEA.completeChallenge(state13, 'alice', events13[ci13b].id, ci13b * 100);
}

var claim13b = SEA.claimSeasonReward(state13, 'alice', 'winter', 2026);
assertEqual(claim13b.success, true, '13.5 claim succeeds with 9 completions');
assertArray(claim13b.rewards, '13.6 claim returns rewards array');
assert(claim13b.rewards.length > 0, '13.7 claim returns at least one reward');
assertType(claim13b.completedChallenges, 'number', '13.8 claim returns completedChallenges');

// Cannot claim again
var claim13c = SEA.claimSeasonReward(state13, 'alice', 'winter', 2026);
assertEqual(claim13c.success, false, '13.9 cannot claim twice');
assertEqual(claim13c.reason, 'already_claimed', '13.10 reason is already_claimed');

// Different player can still claim
for (var ci13c = 0; ci13c < 9; ci13c++) {
    SEA.completeChallenge(state13, 'bob', events13[ci13c].id, 50 + ci13c);
}
var claim13d = SEA.claimSeasonReward(state13, 'bob', 'winter', 2026);
assertEqual(claim13d.success, true, '13.11 different player can claim their own reward');

// ============================================================================
// SECTION 14: isSeasonActive
// ============================================================================

console.log('\n--- Section 14: isSeasonActive ---');
assert(SEA.isSeasonActive(0, 'spring') === true, '14.1 tick 0 is spring');
assert(SEA.isSeasonActive(360, 'spring') === true, '14.2 tick 360 is spring');
assert(SEA.isSeasonActive(719, 'spring') === true, '14.3 tick 719 is still spring');
assert(SEA.isSeasonActive(720, 'spring') === false, '14.4 tick 720 is not spring');
assert(SEA.isSeasonActive(720, 'summer') === true, '14.5 tick 720 is summer');
assert(SEA.isSeasonActive(1439, 'summer') === true, '14.6 tick 1439 is still summer');
assert(SEA.isSeasonActive(1440, 'summer') === false, '14.7 tick 1440 is not summer');
assert(SEA.isSeasonActive(1440, 'autumn') === true, '14.8 tick 1440 is autumn');
assert(SEA.isSeasonActive(2159, 'autumn') === true, '14.9 tick 2159 is still autumn');
assert(SEA.isSeasonActive(2160, 'autumn') === false, '14.10 tick 2160 is not autumn');
assert(SEA.isSeasonActive(2160, 'winter') === true, '14.11 tick 2160 is winter');
assert(SEA.isSeasonActive(2879, 'winter') === true, '14.12 tick 2879 is still winter');

// Wrapping: tick 2880 = start of new year = spring
assert(SEA.isSeasonActive(2880, 'spring') === true, '14.13 tick 2880 wraps to spring');
assert(SEA.isSeasonActive(5760, 'spring') === true, '14.14 tick 5760 (year 2) wraps to spring');

// Unknown season
assert(SEA.isSeasonActive(100, 'badseason') === false, '14.15 unknown season returns false');

// ============================================================================
// SECTION 15: getCurrentSeason
// ============================================================================

console.log('\n--- Section 15: getCurrentSeason ---');
assertEqual(SEA.getCurrentSeason(0), 'spring', '15.1 tick 0 is spring');
assertEqual(SEA.getCurrentSeason(360), 'spring', '15.2 tick 360 is spring');
assertEqual(SEA.getCurrentSeason(719), 'spring', '15.3 tick 719 is spring');
assertEqual(SEA.getCurrentSeason(720), 'summer', '15.4 tick 720 is summer');
assertEqual(SEA.getCurrentSeason(1000), 'summer', '15.5 tick 1000 is summer');
assertEqual(SEA.getCurrentSeason(1439), 'summer', '15.6 tick 1439 is summer');
assertEqual(SEA.getCurrentSeason(1440), 'autumn', '15.7 tick 1440 is autumn');
assertEqual(SEA.getCurrentSeason(1800), 'autumn', '15.8 tick 1800 is autumn');
assertEqual(SEA.getCurrentSeason(2159), 'autumn', '15.9 tick 2159 is autumn');
assertEqual(SEA.getCurrentSeason(2160), 'winter', '15.10 tick 2160 is winter');
assertEqual(SEA.getCurrentSeason(2500), 'winter', '15.11 tick 2500 is winter');
assertEqual(SEA.getCurrentSeason(2879), 'winter', '15.12 tick 2879 is winter');
assertEqual(SEA.getCurrentSeason(2880), 'spring', '15.13 tick 2880 wraps to spring');
assertEqual(SEA.getCurrentSeason(5760), 'spring', '15.14 tick 5760 wraps to spring');
assertEqual(SEA.getCurrentSeason(4320), 'autumn', '15.15 tick 4320 (4320 % 2880 = 1440) is autumn');

// ============================================================================
// SECTION 16: getSeasonHistory
// ============================================================================

console.log('\n--- Section 16: getSeasonHistory ---');
var state16 = makeState();
var gen16s = SEA.generateSeason('spring', 2025, 1);
var gen16su = SEA.generateSeason('summer', 2025, 2);
SEA.storeGeneratedSeason(state16, gen16s);
SEA.storeGeneratedSeason(state16, gen16su);

// Complete 2 spring, 1 summer
SEA.completeChallenge(state16, 'alice', gen16s.challenges[0].id, 100);
SEA.completeChallenge(state16, 'alice', gen16s.challenges[1].id, 200);
SEA.completeChallenge(state16, 'alice', gen16su.challenges[0].id, 300);

var history16 = SEA.getSeasonHistory(state16, 'alice');
assertArray(history16, '16.1 getSeasonHistory returns array');
assertEqual(history16.length, 2, '16.2 history has 2 seasons');

var springEntry = history16.find(function(h) { return h.season === 'spring' && h.year === 2025; });
assert(springEntry !== undefined, '16.3 spring 2025 in history');
assertEqual(springEntry.completedChallenges, 2, '16.4 spring has 2 completions');
assertType(springEntry.totalChallenges, 'number', '16.5 spring has totalChallenges');
assert(springEntry.totalSpark > 0, '16.6 spring has accumulated spark');
assert(springEntry.totalXp > 0, '16.7 spring has accumulated xp');
assertEqual(springEntry.rewardClaimed, false, '16.8 spring reward not claimed');

var summerEntry = history16.find(function(h) { return h.season === 'summer' && h.year === 2025; });
assert(summerEntry !== undefined, '16.9 summer 2025 in history');
assertEqual(summerEntry.completedChallenges, 1, '16.10 summer has 1 completion');

// Claim reward and check
for (var ci16 = 0; ci16 < 9; ci16++) {
    SEA.completeChallenge(state16, 'alice', gen16s.challenges[ci16] ? gen16s.challenges[ci16].id : gen16s.challenges[0].id, 400 + ci16);
}
SEA.claimSeasonReward(state16, 'alice', 'spring', 2025);
var history16b = SEA.getSeasonHistory(state16, 'alice');
var spring16b = history16b.find(function(h) { return h.season === 'spring' && h.year === 2025; });
assertEqual(spring16b.rewardClaimed, true, '16.11 spring reward claimed shows in history');

// Empty history for new player
var history16c = SEA.getSeasonHistory(state16, 'newplayer');
assertArray(history16c, '16.12 new player history is array');

// History is sorted by year then season
assertEqual(history16[0].year, 2025, '16.13 history sorted by year');

// ============================================================================
// SECTION 17: getYearlyStats
// ============================================================================

console.log('\n--- Section 17: getYearlyStats ---');
var state17 = makeState();
var gen17sp = SEA.generateSeason('spring', 2026, 10);
var gen17su = SEA.generateSeason('summer', 2026, 11);
SEA.storeGeneratedSeason(state17, gen17sp);
SEA.storeGeneratedSeason(state17, gen17su);

SEA.completeChallenge(state17, 'p1', gen17sp.challenges[0].id, 100);
SEA.completeChallenge(state17, 'p2', gen17sp.challenges[0].id, 150);
SEA.completeChallenge(state17, 'p1', gen17su.challenges[0].id, 200);

var ys17 = SEA.getYearlyStats(state17, 2026);
assertType(ys17, 'object', '17.1 getYearlyStats returns object');
assertEqual(ys17.year, 2026, '17.2 year is 2026');
assertType(ys17.totalEvents, 'number', '17.3 has totalEvents');
assert(ys17.totalEvents > 0, '17.4 totalEvents is positive');
assertType(ys17.completedEvents, 'number', '17.5 has completedEvents');
assertEqual(ys17.completedEvents, 3, '17.6 3 total completions');
assertType(ys17.totalPlayers, 'number', '17.7 has totalPlayers');
assertEqual(ys17.totalPlayers, 2, '17.8 2 unique players');
assertType(ys17.bySeasons, 'object', '17.9 has bySeasons object');

var springStats17 = ys17.bySeasons['spring'];
assert(springStats17 !== undefined, '17.10 bySeasons has spring');
assertEqual(springStats17.completions, 2, '17.11 spring has 2 completions');

var summerStats17 = ys17.bySeasons['summer'];
assert(summerStats17 !== undefined, '17.12 bySeasons has summer');
assertEqual(summerStats17.completions, 1, '17.13 summer has 1 completion');

// Year with no data
var ys17b = SEA.getYearlyStats(state17, 2020);
assertEqual(ys17b.totalEvents, 0, '17.14 empty year has 0 events');
assertEqual(ys17b.completedEvents, 0, '17.15 empty year has 0 completions');
assertEqual(ys17b.totalPlayers, 0, '17.16 empty year has 0 players');

// ============================================================================
// SECTION 18: getChallengesByCategory
// ============================================================================

console.log('\n--- Section 18: getChallengesByCategory ---');
var state18 = makeStateWithSeason('spring', 2026);

var categories18 = ['gathering', 'fishing', 'crafting', 'exploration', 'social', 'combat', 'cooking', 'building'];
var totalByCat = 0;
for (var cati = 0; cati < categories18.length; cati++) {
    var cat18 = categories18[cati];
    var catChs = SEA.getChallengesByCategory(state18, 'spring', 2026, cat18);
    assertArray(catChs, '18.' + (cati * 2 + 1) + ' getChallengesByCategory ' + cat18 + ' returns array');
    var allCorrectCat = catChs.every(function(c) { return c.category === cat18; });
    assert(allCorrectCat, '18.' + (cati * 2 + 2) + ' all ' + cat18 + ' challenges have correct category');
    totalByCat += catChs.length;
}

// Total by category should equal total challenges
var allChs18 = state18.seasonalEvents['spring_2026'];
assertEqual(totalByCat, allChs18.length, '18.17 category totals sum to total challenges');

// Unknown category
var unk18 = SEA.getChallengesByCategory(state18, 'spring', 2026, 'magic');
assertArray(unk18, '18.18 unknown category returns array');
assertEqual(unk18.length, 0, '18.19 unknown category has 0 results');

// Empty season
var empty18 = SEA.getChallengesByCategory(makeState(), 'summer', 2020, 'gathering');
assertArray(empty18, '18.20 empty season returns array');
assertEqual(empty18.length, 0, '18.21 empty season has 0 results');

// ============================================================================
// SECTION 19: getDifficultyDistribution
// ============================================================================

console.log('\n--- Section 19: getDifficultyDistribution ---');
var state19 = makeStateWithSeason('winter', 2026);

var dist19 = SEA.getDifficultyDistribution(state19, 'winter', 2026);
assertType(dist19, 'object', '19.1 getDifficultyDistribution returns object');
assertType(dist19.tier1, 'number', '19.2 has tier1 count');
assertType(dist19.tier2, 'number', '19.3 has tier2 count');
assertType(dist19.tier3, 'number', '19.4 has tier3 count');

var totalTiers = dist19.tier1 + dist19.tier2 + dist19.tier3;
var totalChs19 = state19.seasonalEvents['winter_2026'].length;
assertEqual(totalTiers, totalChs19, '19.5 tier counts sum to total challenges');
assertGte(dist19.tier1, 0, '19.6 tier1 count non-negative');
assertGte(dist19.tier2, 0, '19.7 tier2 count non-negative');
assertGte(dist19.tier3, 0, '19.8 tier3 count non-negative');

// Empty season
var dist19b = SEA.getDifficultyDistribution(makeState(), 'spring', 2020);
assertEqual(dist19b.tier1, 0, '19.9 empty season tier1 is 0');
assertEqual(dist19b.tier2, 0, '19.10 empty season tier2 is 0');
assertEqual(dist19b.tier3, 0, '19.11 empty season tier3 is 0');

// All seasons generate challenges with valid tiers
var seasons19 = ['spring', 'summer', 'autumn', 'winter'];
for (var si19 = 0; si19 < seasons19.length; si19++) {
    var st19 = makeStateWithSeason(seasons19[si19], 2026);
    var d19 = SEA.getDifficultyDistribution(st19, seasons19[si19], 2026);
    var tot19 = d19.tier1 + d19.tier2 + d19.tier3;
    assertGte(tot19, 10, '19.' + (12 + si19) + ' ' + seasons19[si19] + ' has >= 10 challenges across tiers');
}

// ============================================================================
// SECTION 20: Bonus category rewards
// ============================================================================

console.log('\n--- Section 20: Bonus Category Rewards ---');
// Spring bonus is gathering — gathering challenges should have doubled rewards vs base
var state20 = makeState();
var gen20 = SEA.generateSeason('spring', 2026, 7);
SEA.storeGeneratedSeason(state20, gen20);

var gatheringChs20 = gen20.challenges.filter(function(c) { return c.category === 'gathering'; });
var nonGatheringChs20 = gen20.challenges.filter(function(c) { return c.category !== 'gathering'; });

if (gatheringChs20.length > 0) {
    // Find same-tier non-gathering challenge
    var tier1Gathering = gatheringChs20.filter(function(c) { return c.tier === 1; });
    var tier1NonGathering = nonGatheringChs20.filter(function(c) { return c.tier === 1; });
    if (tier1Gathering.length > 0 && tier1NonGathering.length > 0) {
        // Gathering reward should be at least as large (bonus 2x)
        assert(tier1Gathering[0].reward.spark >= tier1NonGathering[0].reward.spark,
            '20.1 spring gathering tier1 reward >= non-gathering tier1');
    } else {
        assert(true, '20.1 bonus category check skipped (no comparable tiers)');
    }
}

// Summer bonus is exploration
var gen20su = SEA.generateSeason('summer', 2026, 7);
var explorationChs20 = gen20su.challenges.filter(function(c) { return c.category === 'exploration'; });
assert(gen20su.bonusCategory === 'exploration', '20.2 summer bonus category is exploration');

// Winter bonus is crafting
var gen20w = SEA.generateSeason('winter', 2026, 7);
assert(gen20w.bonusCategory === 'crafting', '20.3 winter bonus category is crafting');

// Autumn bonus is cooking
var gen20a = SEA.generateSeason('autumn', 2026, 7);
assert(gen20a.bonusCategory === 'cooking', '20.4 autumn bonus category is cooking');

// ============================================================================
// SECTION 21: Edge cases and robustness
// ============================================================================

console.log('\n--- Section 21: Edge Cases ---');

// generateSeason with no numeric seed (string-based)
var gen21a = SEA.generateSeason('spring', 2026);
assertArray(gen21a.challenges, '21.1 generateSeason without seed uses default');
assertInRange(gen21a.challenges.length, 10, 15, '21.2 default seed produces valid count');

// State is mutated in place
var state21 = makeState();
SEA.ensureStateStructure && SEA.ensureStateStructure(state21); // if exported
var gen21b = SEA.generateSeason('summer', 2025, 55);
SEA.storeGeneratedSeason(state21, gen21b);
assert(typeof state21.seasonalEvents === 'object', '21.3 state mutated with seasonalEvents');

// Multiple seasons in same state
var gen21sp = SEA.generateSeason('spring', 2026, 1);
var gen21su = SEA.generateSeason('summer', 2026, 2);
var gen21au = SEA.generateSeason('autumn', 2026, 3);
var gen21wi = SEA.generateSeason('winter', 2026, 4);
var state21b = makeState();
SEA.storeGeneratedSeason(state21b, gen21sp);
SEA.storeGeneratedSeason(state21b, gen21su);
SEA.storeGeneratedSeason(state21b, gen21au);
SEA.storeGeneratedSeason(state21b, gen21wi);
assert(typeof state21b.seasonalEvents['spring_2026'] !== 'undefined', '21.4 spring stored');
assert(typeof state21b.seasonalEvents['summer_2026'] !== 'undefined', '21.5 summer stored');
assert(typeof state21b.seasonalEvents['autumn_2026'] !== 'undefined', '21.6 autumn stored');
assert(typeof state21b.seasonalEvents['winter_2026'] !== 'undefined', '21.7 winter stored');

// getSeasonLeaderboard tie-breaking (same completions, earlier finisher wins)
var state21c = makeStateWithSeason('spring', 2025);
var events21c = state21c.seasonalEvents['spring_2025'];
SEA.completeChallenge(state21c, 'early', events21c[0].id, 50);
SEA.completeChallenge(state21c, 'late', events21c[0].id, 500);
var lb21c = SEA.getSeasonLeaderboard(state21c, 'spring', 2025, 2);
assertEqual(lb21c[0].playerId, 'early', '21.8 tie broken by earlier completion time');

// Leaderboard count defaults to all when not specified
var state21d = makeStateWithSeason('autumn', 2025);
var events21d = state21d.seasonalEvents['autumn_2025'];
for (var pi21 = 0; pi21 < 3; pi21++) {
    SEA.completeChallenge(state21d, 'p' + pi21, events21d[0].id, pi21 * 10);
}
var lb21d = SEA.getSeasonLeaderboard(state21d, 'autumn', 2025);
assertEqual(lb21d.length, 3, '21.9 leaderboard without count returns all entries');

// updateProgress returns current progress object
var state21e = makeStateWithSeason('winter', 2025);
var eid21e = state21e.seasonalEvents['winter_2025'][0].id;
var prog21e = SEA.updateProgress(state21e, 'testplayer', eid21e, 0);
assertType(prog21e, 'object', '21.10 updateProgress with 0 returns object');
assertEqual(prog21e.progress, 0, '21.11 progress starts at 0');

// ============================================================================
// SECTION 22: Template parameter ranges
// ============================================================================

console.log('\n--- Section 22: Template Parameter Ranges ---');

// Reference CHALLENGE_TEMPLATES from module
var CHALLENGE_TEMPLATES = SEA.CHALLENGE_TEMPLATES;

// Generate multiple seasons and check params are within template ranges
var paramRangeValid = true;
var seasons22 = ['spring', 'summer', 'autumn', 'winter'];
for (var si22 = 0; si22 < seasons22.length; si22++) {
    var gen22 = SEA.generateSeason(seasons22[si22], 2026, si22 * 100);
    for (var ci22 = 0; ci22 < gen22.challenges.length; ci22++) {
        var ch22 = gen22.challenges[ci22];
        var tmpl22 = null;
        for (var ti22 = 0; ti22 < CHALLENGE_TEMPLATES.length; ti22++) {
            if (CHALLENGE_TEMPLATES[ti22].id === ch22.templateId) {
                tmpl22 = CHALLENGE_TEMPLATES[ti22];
                break;
            }
        }
        if (!tmpl22) { paramRangeValid = false; continue; }
        for (var pk22 in tmpl22.paramRanges) {
            if (!tmpl22.paramRanges.hasOwnProperty(pk22)) { continue; }
            var range22 = tmpl22.paramRanges[pk22];
            var val22 = ch22.params[pk22];
            if (val22 === undefined || val22 < range22.min || val22 > range22.max) {
                paramRangeValid = false;
            }
        }
    }
}
assert(paramRangeValid, '22.1 all challenge params within template ranges');

// Check step snapping: params should be multiples of step from min
var stepValid = true;
var gen22b = SEA.generateSeason('spring', 2026, 999);
for (var ci22b = 0; ci22b < gen22b.challenges.length; ci22b++) {
    var ch22b = gen22b.challenges[ci22b];
    var tmpl22b = null;
    for (var ti22b = 0; ti22b < CHALLENGE_TEMPLATES.length; ti22b++) {
        if (CHALLENGE_TEMPLATES[ti22b].id === ch22b.templateId) {
            tmpl22b = CHALLENGE_TEMPLATES[ti22b];
            break;
        }
    }
    if (!tmpl22b) { continue; }
    for (var pk22b in tmpl22b.paramRanges) {
        if (!tmpl22b.paramRanges.hasOwnProperty(pk22b)) { continue; }
        var range22b = tmpl22b.paramRanges[pk22b];
        var val22b = ch22b.params[pk22b];
        var remainder = (val22b - range22b.min) % range22b.step;
        if (Math.abs(remainder) > 0.001) { stepValid = false; }
    }
}
assert(stepValid, '22.2 all params snapped to step boundaries');

// ============================================================================
// FINAL SUMMARY
// ============================================================================

console.log('\n============================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('============================================');

if (failed > 0) {
    console.log('\nFailed tests:');
    for (var fi = 0; fi < failMessages.length; fi++) {
        console.log('  ' + failMessages[fi]);
    }
    process.exit(1);
} else {
    console.log('All tests passed!');
    process.exit(0);
}
