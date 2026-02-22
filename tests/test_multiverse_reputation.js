'use strict';

var MR = require('../src/js/multiverse_reputation.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
    if (condition) {
        passed++;
        // console.log('  PASS: ' + msg);
    } else {
        failed++;
        console.log('  FAIL: ' + msg);
    }
}

function assertEqual(a, b, msg) {
    assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertDeepEqual(a, b, msg) {
    assert(JSON.stringify(a) === JSON.stringify(b), msg +
        ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function section(name) {
    console.log('\n--- ' + name + ' ---');
}

// ---------------------------------------------------------------------------
// REPUTATION_TIERS
// ---------------------------------------------------------------------------
section('REPUTATION_TIERS structure');

assert(Array.isArray(MR.REPUTATION_TIERS), 'REPUTATION_TIERS is an array');
assertEqual(MR.REPUTATION_TIERS.length, 8, 'REPUTATION_TIERS has 8 tiers');

var tierIds = ['unknown', 'newcomer', 'known', 'respected', 'distinguished', 'renowned', 'legendary', 'eternal'];
for (var i = 0; i < tierIds.length; i++) {
    assertEqual(MR.REPUTATION_TIERS[i].id, tierIds[i], 'tier[' + i + '].id is ' + tierIds[i]);
}

assertEqual(MR.REPUTATION_TIERS[0].minScore, 0,    'unknown minScore is 0');
assertEqual(MR.REPUTATION_TIERS[1].minScore, 10,   'newcomer minScore is 10');
assertEqual(MR.REPUTATION_TIERS[2].minScore, 50,   'known minScore is 50');
assertEqual(MR.REPUTATION_TIERS[3].minScore, 150,  'respected minScore is 150');
assertEqual(MR.REPUTATION_TIERS[4].minScore, 300,  'distinguished minScore is 300');
assertEqual(MR.REPUTATION_TIERS[5].minScore, 500,  'renowned minScore is 500');
assertEqual(MR.REPUTATION_TIERS[6].minScore, 1000, 'legendary minScore is 1000');
assertEqual(MR.REPUTATION_TIERS[7].minScore, 2000, 'eternal minScore is 2000');

assertEqual(MR.REPUTATION_TIERS[0].badge, 'gray_circle',    'unknown badge');
assertEqual(MR.REPUTATION_TIERS[1].badge, 'white_star',     'newcomer badge');
assertEqual(MR.REPUTATION_TIERS[2].badge, 'bronze_star',    'known badge');
assertEqual(MR.REPUTATION_TIERS[3].badge, 'silver_star',    'respected badge');
assertEqual(MR.REPUTATION_TIERS[4].badge, 'gold_star',      'distinguished badge');
assertEqual(MR.REPUTATION_TIERS[5].badge, 'platinum_star',  'renowned badge');
assertEqual(MR.REPUTATION_TIERS[6].badge, 'diamond_star',   'legendary badge');
assertEqual(MR.REPUTATION_TIERS[7].badge, 'cosmic_star',    'eternal badge');

assertEqual(MR.REPUTATION_TIERS[0].name, 'Unknown',       'tier name Unknown');
assertEqual(MR.REPUTATION_TIERS[1].name, 'Newcomer',      'tier name Newcomer');
assertEqual(MR.REPUTATION_TIERS[2].name, 'Known',         'tier name Known');
assertEqual(MR.REPUTATION_TIERS[3].name, 'Respected',     'tier name Respected');
assertEqual(MR.REPUTATION_TIERS[4].name, 'Distinguished', 'tier name Distinguished');
assertEqual(MR.REPUTATION_TIERS[5].name, 'Renowned',      'tier name Renowned');
assertEqual(MR.REPUTATION_TIERS[6].name, 'Legendary',     'tier name Legendary');
assertEqual(MR.REPUTATION_TIERS[7].name, 'Eternal',       'tier name Eternal');

// ---------------------------------------------------------------------------
// createState
// ---------------------------------------------------------------------------
section('createState');

var state = MR.createState();
assert(state !== null && typeof state === 'object', 'createState returns object');
assert(typeof state.players === 'object',     'state has players');
assert(typeof state.history === 'object',     'state has history');
assert(typeof state.achievements === 'object','state has achievements');

// ---------------------------------------------------------------------------
// getTier
// ---------------------------------------------------------------------------
section('getTier');

assertEqual(MR.getTier(0).id,    'unknown',       'getTier(0) = unknown');
assertEqual(MR.getTier(5).id,    'unknown',       'getTier(5) = unknown');
assertEqual(MR.getTier(9).id,    'unknown',       'getTier(9) = unknown');
assertEqual(MR.getTier(10).id,   'newcomer',      'getTier(10) = newcomer');
assertEqual(MR.getTier(49).id,   'newcomer',      'getTier(49) = newcomer');
assertEqual(MR.getTier(50).id,   'known',         'getTier(50) = known');
assertEqual(MR.getTier(149).id,  'known',         'getTier(149) = known');
assertEqual(MR.getTier(150).id,  'respected',     'getTier(150) = respected');
assertEqual(MR.getTier(299).id,  'respected',     'getTier(299) = respected');
assertEqual(MR.getTier(300).id,  'distinguished', 'getTier(300) = distinguished');
assertEqual(MR.getTier(499).id,  'distinguished', 'getTier(499) = distinguished');
assertEqual(MR.getTier(500).id,  'renowned',      'getTier(500) = renowned');
assertEqual(MR.getTier(999).id,  'renowned',      'getTier(999) = renowned');
assertEqual(MR.getTier(1000).id, 'legendary',     'getTier(1000) = legendary');
assertEqual(MR.getTier(1999).id, 'legendary',     'getTier(1999) = legendary');
assertEqual(MR.getTier(2000).id, 'eternal',       'getTier(2000) = eternal');
assertEqual(MR.getTier(9999).id, 'eternal',       'getTier(9999) = eternal');

assert(typeof MR.getTier(100).badge === 'string', 'getTier returns badge string');
assert(typeof MR.getTier(100).name  === 'string', 'getTier returns name string');

// ---------------------------------------------------------------------------
// getTiers
// ---------------------------------------------------------------------------
section('getTiers');

var tiers = MR.getTiers();
assert(Array.isArray(tiers), 'getTiers returns array');
assertEqual(tiers.length, 8, 'getTiers returns 8 tiers');
// Should be a copy
tiers.push({id: 'fake'});
assertEqual(MR.getTiers().length, 8, 'getTiers returns a copy');

// ---------------------------------------------------------------------------
// initPlayer
// ---------------------------------------------------------------------------
section('initPlayer');

var s1 = MR.createState();
var player = MR.initPlayer(s1, 'alice', 'zion_main');
assert(player !== null, 'initPlayer returns player object');
assertEqual(player.playerId, 'alice', 'initPlayer sets playerId');
assertEqual(player.homeWorld, 'zion_main', 'initPlayer sets homeWorld');
assert(typeof player.worlds === 'object',          'player has worlds');
assert(Array.isArray(player.federatedGuilds),      'player has federatedGuilds array');
assert(typeof player.travelerBadge === 'object',   'player has travelerBadge');
assertEqual(player.travelerBadge.worldsVisited, 0, 'travelerBadge starts at 0 worlds');
assertEqual(player.travelerBadge.totalScore, 0,    'travelerBadge starts at 0 totalScore');

// initPlayer is idempotent
var player2 = MR.initPlayer(s1, 'alice', 'zion_prime');
assertEqual(player2.homeWorld, 'zion_prime', 'initPlayer updates homeWorld on re-init');

// Second player
var bob = MR.initPlayer(s1, 'bob', 'zion_east');
assertEqual(bob.playerId, 'bob', 'initPlayer creates separate players');

// ---------------------------------------------------------------------------
// visitWorld
// ---------------------------------------------------------------------------
section('visitWorld');

var s2 = MR.createState();
MR.initPlayer(s2, 'alice', 'zion_main');
var rec = MR.visitWorld(s2, 'alice', 'zion_main', 'ZION Prime', 'https://kody-w.github.io/zion/', 1000);

assert(rec !== null, 'visitWorld returns WORLD_RECORD');
assertEqual(rec.worldId, 'zion_main',                    'rec.worldId set');
assertEqual(rec.worldName, 'ZION Prime',                 'rec.worldName set');
assertEqual(rec.worldUrl, 'https://kody-w.github.io/zion/', 'rec.worldUrl set');
assertEqual(rec.visitedAt, 1000,                         'rec.visitedAt set');
assertEqual(rec.reputationScore, 0,                      'initial reputationScore is 0');
assertEqual(rec.tier, 'unknown',                         'initial tier is unknown');
assert(Array.isArray(rec.achievements),                  'rec.achievements is array');

// visitedAt should not change on revisit
var rec2 = MR.visitWorld(s2, 'alice', 'zion_main', 'ZION Prime v2', 'https://new.url/', 2000);
assertEqual(rec2.visitedAt, 1000, 'visitedAt does not change on revisit');
assertEqual(rec2.worldName, 'ZION Prime v2', 'worldName updates on revisit');
assertEqual(rec2.lastSync, 2000,  'lastSync updates on revisit');

// travelerBadge updates after visit
var badge = MR.getTravelerBadge(s2, 'alice');
assertEqual(badge.worldsVisited, 1, 'travelerBadge worldsVisited incremented');

// Visit a second world
MR.visitWorld(s2, 'alice', 'zion_east', 'ZION East', 'https://east.zion/', 1500);
var badge2 = MR.getTravelerBadge(s2, 'alice');
assertEqual(badge2.worldsVisited, 2, 'travelerBadge worldsVisited = 2 after two visits');

// visitWorld on uninitialized player auto-creates player
var s3 = MR.createState();
var recDirect = MR.visitWorld(s3, 'charlie', 'zion_west', 'ZION West', '', 500);
assert(recDirect !== null, 'visitWorld auto-creates player if needed');
assertEqual(s3.players['charlie'].playerId, 'charlie', 'auto-created player has correct id');

// ---------------------------------------------------------------------------
// earnReputation
// ---------------------------------------------------------------------------
section('earnReputation');

var s4 = MR.createState();
MR.initPlayer(s4, 'alice', 'zion_main');
MR.visitWorld(s4, 'alice', 'zion_main', 'ZION Prime', '', 1000);

var result = MR.earnReputation(s4, 'alice', 'zion_main', 100, 'questing');
assert(result !== null, 'earnReputation returns WORLD_RECORD');
assertEqual(result.reputationScore, 100, 'earnReputation adds score');
assertEqual(result.tier, 'known', 'tier updates after earning rep (100 = known)');

MR.earnReputation(s4, 'alice', 'zion_main', 60, 'crafting');
var rep = MR.getReputation(s4, 'alice', 'zion_main');
assertEqual(rep.reputationScore, 160, 'second earnReputation accumulates');
assertEqual(rep.tier, 'respected', 'tier updates to respected at 150+');

// Tier progression
MR.earnReputation(s4, 'alice', 'zion_main', 140, 'epic_quest');
assertEqual(MR.getReputation(s4, 'alice', 'zion_main').tier, 'distinguished', 'tier reaches distinguished at 300');

MR.earnReputation(s4, 'alice', 'zion_main', 200, 'legend');
assertEqual(MR.getReputation(s4, 'alice', 'zion_main').tier, 'renowned', 'tier reaches renowned at 500');

// Earn on nonexistent world returns null
var nullResult = MR.earnReputation(s4, 'alice', 'no_world', 10, 'x');
assert(nullResult === null, 'earnReputation returns null for unknown world');

// Earn for uninitialized player returns null
var nullPlayer = MR.earnReputation(s4, 'ghost', 'zion_main', 10, 'x');
assert(nullPlayer === null, 'earnReputation returns null for unknown player');

// Negative amount is ignored (clamped to 0)
var before = MR.getReputation(s4, 'alice', 'zion_main').reputationScore;
MR.earnReputation(s4, 'alice', 'zion_main', -50, 'bad');
assertEqual(MR.getReputation(s4, 'alice', 'zion_main').reputationScore, before, 'negative amount does not reduce score');

// travelerBadge totalScore updates
var b = MR.getTravelerBadge(s4, 'alice');
assert(b.totalScore > 0, 'travelerBadge totalScore updates when earning rep');

// ---------------------------------------------------------------------------
// getReputation
// ---------------------------------------------------------------------------
section('getReputation');

var s5 = MR.createState();
MR.initPlayer(s5, 'alice', 'zion_main');
MR.visitWorld(s5, 'alice', 'zion_main', 'ZION Prime', '', 1000);
MR.earnReputation(s5, 'alice', 'zion_main', 250, 'quest');

var r = MR.getReputation(s5, 'alice', 'zion_main');
assert(r !== null, 'getReputation returns record');
assertEqual(r.reputationScore, 250, 'getReputation score is correct');

// Unknown player
assert(MR.getReputation(s5, 'ghost', 'zion_main') === null, 'getReputation returns null for unknown player');
// Unknown world
assert(MR.getReputation(s5, 'alice', 'no_world') === null, 'getReputation returns null for unknown world');

// ---------------------------------------------------------------------------
// getPlayerProfile
// ---------------------------------------------------------------------------
section('getPlayerProfile');

var s6 = MR.createState();
MR.initPlayer(s6, 'alice', 'zion_main');
MR.visitWorld(s6, 'alice', 'zion_main', 'ZION Prime', 'https://zion/', 1000);
MR.visitWorld(s6, 'alice', 'zion_east', 'ZION East', 'https://east/', 1100);
MR.earnReputation(s6, 'alice', 'zion_main', 200, 'exp');

var profile = MR.getPlayerProfile(s6, 'alice');
assert(profile !== null,                        'getPlayerProfile returns object');
assertEqual(profile.playerId, 'alice',          'profile.playerId');
assertEqual(profile.homeWorld, 'zion_main',     'profile.homeWorld');
assert(Array.isArray(profile.worlds),           'profile.worlds is array');
assertEqual(profile.totalWorlds, 2,             'profile.totalWorlds is 2');
assert(typeof profile.travelerBadge === 'object', 'profile has travelerBadge');
assert(Array.isArray(profile.federatedGuilds),  'profile has federatedGuilds');

// Unknown player
assert(MR.getPlayerProfile(s6, 'ghost') === null, 'getPlayerProfile returns null for unknown player');

// ---------------------------------------------------------------------------
// getTravelerBadge
// ---------------------------------------------------------------------------
section('getTravelerBadge');

var s7 = MR.createState();
MR.initPlayer(s7, 'alice', 'zion_main');
var initBadge = MR.getTravelerBadge(s7, 'alice');
assert(initBadge !== null,                        'getTravelerBadge returns object');
assertEqual(initBadge.worldsVisited, 0,           'initial worldsVisited = 0');
assertEqual(initBadge.totalScore, 0,              'initial totalScore = 0');
assertEqual(initBadge.highestTier, 'unknown',     'initial highestTier = unknown');

MR.visitWorld(s7, 'alice', 'zion_main', 'ZION Prime', '', 1000);
MR.earnReputation(s7, 'alice', 'zion_main', 500, 'epic');
var badge7 = MR.getTravelerBadge(s7, 'alice');
assertEqual(badge7.totalScore, 500,    'badge totalScore updated');
assertEqual(badge7.highestTier, 'renowned', 'badge highestTier updated to renowned');

// Unknown player
assert(MR.getTravelerBadge(s7, 'ghost') === null, 'getTravelerBadge returns null for unknown player');

// ---------------------------------------------------------------------------
// getWorldsVisited
// ---------------------------------------------------------------------------
section('getWorldsVisited');

var s8 = MR.createState();
MR.initPlayer(s8, 'alice', 'zion_main');
assertEqual(MR.getWorldsVisited(s8, 'alice').length, 0, 'getWorldsVisited empty initially');

MR.visitWorld(s8, 'alice', 'zion_main', 'ZION Prime', '', 1000);
MR.visitWorld(s8, 'alice', 'zion_east', 'ZION East', '', 1100);
var worlds = MR.getWorldsVisited(s8, 'alice');
assertEqual(worlds.length, 2, 'getWorldsVisited returns 2 worlds');

// Returns copy
worlds.push({worldId: 'fake'});
assertEqual(MR.getWorldsVisited(s8, 'alice').length, 2, 'getWorldsVisited returns a copy');

// Unknown player
assertEqual(MR.getWorldsVisited(s8, 'ghost').length, 0, 'getWorldsVisited returns [] for unknown player');

// ---------------------------------------------------------------------------
// syncReputation
// ---------------------------------------------------------------------------
section('syncReputation');

var s9 = MR.createState();
MR.initPlayer(s9, 'alice', 'zion_main');

var foreignData = {
    reputationScore: 250,
    worldName: 'ZION Remote',
    worldUrl: 'https://remote.zion/',
    achievements: ['first_visit', 'zone_explorer']
};

var synced = MR.syncReputation(s9, 'alice', 'zion_remote', foreignData, 3000);
assert(synced !== null, 'syncReputation returns WORLD_RECORD');
assertEqual(synced.reputationScore, 250,           'synced reputationScore from foreignData');
assertEqual(synced.tier, 'respected',              'synced tier calculated correctly');
assertEqual(synced.worldName, 'ZION Remote',       'synced worldName from foreignData');
assertEqual(synced.lastSync, 3000,                 'synced lastSync = currentTick');
assertEqual(synced.achievements.length, 2,         'synced achievements from foreignData');
assert(synced.achievements.indexOf('first_visit') !== -1, 'first_visit achievement synced');

// Sync does not duplicate achievements
MR.syncReputation(s9, 'alice', 'zion_remote', {reputationScore: 260, achievements: ['first_visit']}, 4000);
var repSynced = MR.getReputation(s9, 'alice', 'zion_remote');
assertEqual(repSynced.achievements.length, 2, 'sync does not duplicate achievements');
assertEqual(repSynced.reputationScore, 260, 'sync updates reputationScore');

// Sync with null foreignData
var synced2 = MR.syncReputation(s9, 'alice', 'zion_remote', null, 5000);
assert(synced2 !== null, 'syncReputation with null foreignData returns record');
assertEqual(synced2.lastSync, 5000, 'syncReputation with null updates lastSync');

// Sync creates world record if not existing
MR.syncReputation(s9, 'alice', 'new_world', {reputationScore: 50}, 1000);
var newRec = MR.getReputation(s9, 'alice', 'new_world');
assert(newRec !== null, 'syncReputation creates world record for new world');
assertEqual(newRec.reputationScore, 50, 'new world record has correct score after sync');

// travelerBadge updates after sync
var badge9 = MR.getTravelerBadge(s9, 'alice');
assert(badge9.worldsVisited >= 2, 'travelerBadge worldsVisited updates after sync');

// ---------------------------------------------------------------------------
// exportReputation
// ---------------------------------------------------------------------------
section('exportReputation');

var s10 = MR.createState();
MR.initPlayer(s10, 'alice', 'zion_main');
MR.visitWorld(s10, 'alice', 'zion_main', 'ZION Prime', 'https://zion/', 1000);
MR.earnReputation(s10, 'alice', 'zion_main', 300, 'questing');
MR.awardAchievement(s10, 'alice', 'zion_main', 'first_visit');

var exported = MR.exportReputation(s10, 'alice', 'zion_main');
assert(exported !== null,                          'exportReputation returns object');
assertEqual(exported.playerId, 'alice',            'exported.playerId');
assertEqual(exported.worldId, 'zion_main',         'exported.worldId');
assertEqual(exported.worldName, 'ZION Prime',      'exported.worldName');
assertEqual(exported.worldUrl, 'https://zion/',    'exported.worldUrl');
assertEqual(exported.reputationScore, 300,         'exported.reputationScore');
assertEqual(exported.tier, 'distinguished',        'exported.tier');
assert(Array.isArray(exported.achievements),       'exported.achievements is array');
assert(exported.achievements.indexOf('first_visit') !== -1, 'exported.achievements includes first_visit');
assert(typeof exported.exportedAt === 'number',    'exported.exportedAt is number');

// Export is a snapshot (copy of achievements)
exported.achievements.push('fake');
var exported2 = MR.exportReputation(s10, 'alice', 'zion_main');
assertEqual(exported2.achievements.length, 1, 'exportReputation returns copy of achievements');

// Unknown player
assert(MR.exportReputation(s10, 'ghost', 'zion_main') === null, 'exportReputation null for unknown player');
// Unknown world
assert(MR.exportReputation(s10, 'alice', 'no_world') === null, 'exportReputation null for unknown world');

// ---------------------------------------------------------------------------
// joinFederatedGuild / leaveFederatedGuild / getFederatedGuilds
// ---------------------------------------------------------------------------
section('Federated Guilds');

var s11 = MR.createState();
MR.initPlayer(s11, 'alice', 'zion_main');

var joined = MR.joinFederatedGuild(s11, 'alice', 'guild_alpha', 'zion_main');
assert(joined === true, 'joinFederatedGuild returns true on success');

var guilds = MR.getFederatedGuilds(s11, 'alice');
assertEqual(guilds.length, 1,                    'getFederatedGuilds returns 1 guild');
assertEqual(guilds[0].guildId, 'guild_alpha',    'guild guildId set');
assertEqual(guilds[0].worldId, 'zion_main',      'guild worldId set');

// Duplicate join
var dup = MR.joinFederatedGuild(s11, 'alice', 'guild_alpha', 'zion_main');
assert(dup === false, 'joinFederatedGuild returns false if already member');
assertEqual(MR.getFederatedGuilds(s11, 'alice').length, 1, 'no duplicate guild entry');

// Same guildId different world is allowed
var joined2 = MR.joinFederatedGuild(s11, 'alice', 'guild_alpha', 'zion_east');
assert(joined2 === true, 'same guildId different worldId is allowed');
assertEqual(MR.getFederatedGuilds(s11, 'alice').length, 2, 'two guild entries for diff worlds');

// Join second guild
MR.joinFederatedGuild(s11, 'alice', 'guild_beta', 'zion_main');
assertEqual(MR.getFederatedGuilds(s11, 'alice').length, 3, 'three guilds after joining guild_beta');

// Leave guild
var left = MR.leaveFederatedGuild(s11, 'alice', 'guild_alpha');
assert(left === true, 'leaveFederatedGuild returns true on success');
// Should remove first matching guildId regardless of worldId
assertEqual(MR.getFederatedGuilds(s11, 'alice').length, 2, 'guild count reduced after leave');

// Leave non-existent
var leftMissing = MR.leaveFederatedGuild(s11, 'alice', 'no_guild');
assert(leftMissing === false, 'leaveFederatedGuild returns false for non-member');

// Leave from unknown player
var leftUnknown = MR.leaveFederatedGuild(s11, 'ghost', 'guild_alpha');
assert(leftUnknown === false, 'leaveFederatedGuild returns false for unknown player');

// getFederatedGuilds returns copy
var gCopy = MR.getFederatedGuilds(s11, 'alice');
gCopy.push({guildId: 'hacked'});
assertEqual(MR.getFederatedGuilds(s11, 'alice').length, 2, 'getFederatedGuilds returns copy');

// getFederatedGuilds for unknown player
assertEqual(MR.getFederatedGuilds(s11, 'ghost').length, 0, 'getFederatedGuilds returns [] for unknown player');

// ---------------------------------------------------------------------------
// getReputationHistory
// ---------------------------------------------------------------------------
section('getReputationHistory');

var s12 = MR.createState();
MR.initPlayer(s12, 'alice', 'zion_main');
MR.visitWorld(s12, 'alice', 'zion_main', 'ZION Prime', '', 1000);

assertEqual(MR.getReputationHistory(s12, 'alice', 'zion_main').length, 0, 'empty history initially');

MR.earnReputation(s12, 'alice', 'zion_main', 50, 'quest_a');
MR.earnReputation(s12, 'alice', 'zion_main', 100, 'quest_b');

var hist = MR.getReputationHistory(s12, 'alice', 'zion_main');
assertEqual(hist.length, 2,              'history has 2 entries');
assertEqual(hist[0].delta, 50,           'first entry delta = 50');
assertEqual(hist[0].reason, 'quest_a',   'first entry reason');
assertEqual(hist[1].delta, 100,          'second entry delta = 100');
assertEqual(hist[1].reason, 'quest_b',   'second entry reason');
assert(typeof hist[0].score === 'number','history entry has score');

// History returns copy
hist.push({delta: 999});
assertEqual(MR.getReputationHistory(s12, 'alice', 'zion_main').length, 2, 'getReputationHistory returns copy');

// Unknown player
assertEqual(MR.getReputationHistory(s12, 'ghost', 'zion_main').length, 0, 'history [] for unknown player');
// Unknown world
assertEqual(MR.getReputationHistory(s12, 'alice', 'no_world').length, 0, 'history [] for unknown world');

// ---------------------------------------------------------------------------
// awardAchievement / getAchievements
// ---------------------------------------------------------------------------
section('Achievements');

var s13 = MR.createState();
MR.initPlayer(s13, 'alice', 'zion_main');
MR.visitWorld(s13, 'alice', 'zion_main', 'ZION Prime', '', 1000);

// Award
var awarded = MR.awardAchievement(s13, 'alice', 'zion_main', 'first_visit');
assert(awarded === true, 'awardAchievement returns true on first award');

var achs = MR.getAchievements(s13, 'alice', 'zion_main');
assertEqual(achs.length, 1,                     'getAchievements returns 1 achievement');
assertEqual(achs[0], 'first_visit',             'achievement is first_visit');

// Duplicate award
var dupAward = MR.awardAchievement(s13, 'alice', 'zion_main', 'first_visit');
assert(dupAward === false, 'awardAchievement returns false for duplicate');
assertEqual(MR.getAchievements(s13, 'alice', 'zion_main').length, 1, 'no duplicate achievement stored');

// Multiple achievements
MR.awardAchievement(s13, 'alice', 'zion_main', 'zone_explorer');
MR.awardAchievement(s13, 'alice', 'zion_main', 'master_crafter');
var achs2 = MR.getAchievements(s13, 'alice', 'zion_main');
assertEqual(achs2.length, 3, 'getAchievements returns 3 achievements');

// Also stored in WORLD_RECORD
var rec13 = MR.getReputation(s13, 'alice', 'zion_main');
assertEqual(rec13.achievements.length, 3, 'WORLD_RECORD.achievements also updated');

// Award returns false for unknown player
var badAward = MR.awardAchievement(s13, 'ghost', 'zion_main', 'first_visit');
assert(badAward === false, 'awardAchievement returns false for unknown player');

// Award returns false for unknown world
var badAward2 = MR.awardAchievement(s13, 'alice', 'no_world', 'first_visit');
assert(badAward2 === false, 'awardAchievement returns false for unknown world');

// getAchievements returns copy
achs.push('hacked');
assertEqual(MR.getAchievements(s13, 'alice', 'zion_main').length, 3, 'getAchievements returns copy');

// getAchievements for unknown player
assertEqual(MR.getAchievements(s13, 'ghost', 'zion_main').length, 0, 'getAchievements [] for unknown player');

// ---------------------------------------------------------------------------
// getTopTravelers
// ---------------------------------------------------------------------------
section('getTopTravelers');

var s14 = MR.createState();
MR.initPlayer(s14, 'alice', 'zion_main');
MR.initPlayer(s14, 'bob', 'zion_main');
MR.initPlayer(s14, 'charlie', 'zion_main');

// alice: 3 worlds, high score
MR.visitWorld(s14, 'alice', 'zion_main', 'ZION Prime', '', 1000);
MR.visitWorld(s14, 'alice', 'zion_east', 'ZION East', '', 1100);
MR.visitWorld(s14, 'alice', 'zion_west', 'ZION West', '', 1200);
MR.earnReputation(s14, 'alice', 'zion_main', 500, 'exp');

// bob: 2 worlds
MR.visitWorld(s14, 'bob', 'zion_main', 'ZION Prime', '', 1000);
MR.visitWorld(s14, 'bob', 'zion_east', 'ZION East', '', 1100);
MR.earnReputation(s14, 'bob', 'zion_main', 200, 'exp');

// charlie: 1 world, very high score
MR.visitWorld(s14, 'charlie', 'zion_main', 'ZION Prime', '', 1000);
MR.earnReputation(s14, 'charlie', 'zion_main', 2000, 'legendary');

var top = MR.getTopTravelers(s14, 10);
assert(Array.isArray(top), 'getTopTravelers returns array');
assertEqual(top.length, 3, 'getTopTravelers returns all 3 players');
assertEqual(top[0].playerId, 'alice', 'alice is top traveler (most worlds)');
assertEqual(top[1].playerId, 'bob', 'bob is second (2 worlds)');
assertEqual(top[2].playerId, 'charlie', 'charlie is third (1 world)');

// Limit works
var top2 = MR.getTopTravelers(s14, 2);
assertEqual(top2.length, 2, 'getTopTravelers respects count limit');

// Total score tiebreak: two players with same worlds visited
var s14b = MR.createState();
MR.initPlayer(s14b, 'p1', 'zion_main');
MR.initPlayer(s14b, 'p2', 'zion_main');
MR.visitWorld(s14b, 'p1', 'zion_main', 'ZION Prime', '', 1000);
MR.visitWorld(s14b, 'p2', 'zion_main', 'ZION Prime', '', 1000);
MR.earnReputation(s14b, 'p1', 'zion_main', 100, 'x');
MR.earnReputation(s14b, 'p2', 'zion_main', 200, 'x');
var top3 = MR.getTopTravelers(s14b, 10);
assertEqual(top3[0].playerId, 'p2', 'totalScore tiebreak: p2 wins with higher score');

// Entry structure
assert(typeof top[0].worldsVisited === 'number', 'topTraveler entry has worldsVisited');
assert(typeof top[0].totalScore === 'number',    'topTraveler entry has totalScore');
assert(typeof top[0].highestTier === 'string',   'topTraveler entry has highestTier');

// ---------------------------------------------------------------------------
// getWorldLeaderboard
// ---------------------------------------------------------------------------
section('getWorldLeaderboard');

var s15 = MR.createState();
MR.initPlayer(s15, 'alice', 'zion_main');
MR.initPlayer(s15, 'bob', 'zion_main');
MR.initPlayer(s15, 'charlie', 'zion_main');
MR.initPlayer(s15, 'diana', 'zion_east');

MR.visitWorld(s15, 'alice', 'zion_main', 'ZION Prime', '', 1000);
MR.visitWorld(s15, 'bob', 'zion_main', 'ZION Prime', '', 1000);
MR.visitWorld(s15, 'charlie', 'zion_main', 'ZION Prime', '', 1000);
MR.visitWorld(s15, 'diana', 'zion_east', 'ZION East', '', 1000);

MR.earnReputation(s15, 'alice', 'zion_main', 300, 'exp');
MR.earnReputation(s15, 'bob', 'zion_main', 500, 'exp');
MR.earnReputation(s15, 'charlie', 'zion_main', 100, 'exp');

var board = MR.getWorldLeaderboard(s15, 'zion_main', 10);
assert(Array.isArray(board), 'getWorldLeaderboard returns array');
assertEqual(board.length, 3, 'getWorldLeaderboard returns 3 players in zion_main');
assertEqual(board[0].playerId, 'bob',     'bob is #1 in zion_main');
assertEqual(board[1].playerId, 'alice',   'alice is #2 in zion_main');
assertEqual(board[2].playerId, 'charlie', 'charlie is #3 in zion_main');

// diana is not in zion_main
var board2 = MR.getWorldLeaderboard(s15, 'zion_east', 10);
assertEqual(board2.length, 1, 'getWorldLeaderboard only includes players in that world');
assertEqual(board2[0].playerId, 'diana', 'diana is #1 in zion_east');

// Limit works
var board3 = MR.getWorldLeaderboard(s15, 'zion_main', 2);
assertEqual(board3.length, 2, 'getWorldLeaderboard respects count limit');

// Unknown world
var board4 = MR.getWorldLeaderboard(s15, 'no_world', 10);
assertEqual(board4.length, 0, 'getWorldLeaderboard returns [] for unknown world');

// Entry structure
assert(typeof board[0].playerId === 'string',          'leaderboard entry has playerId');
assert(typeof board[0].reputationScore === 'number',   'leaderboard entry has reputationScore');
assert(typeof board[0].tier === 'string',              'leaderboard entry has tier');

// ---------------------------------------------------------------------------
// calculateTravelerRank
// ---------------------------------------------------------------------------
section('calculateTravelerRank');

var s16 = MR.createState();
MR.initPlayer(s16, 'alice', 'zion_main');

// No worlds visited
assertEqual(MR.calculateTravelerRank(s16, 'alice'), 0, 'rank = 0 with no worlds');

// One world
MR.visitWorld(s16, 'alice', 'zion_main', 'ZION Prime', '', 1000);
MR.earnReputation(s16, 'alice', 'zion_main', 100, 'exp');
// rank = 1 world * avgScore(100) = 100
assertEqual(MR.calculateTravelerRank(s16, 'alice'), 100, 'rank = 100 with 1 world at 100 score');

// Two worlds
MR.visitWorld(s16, 'alice', 'zion_east', 'ZION East', '', 1100);
MR.earnReputation(s16, 'alice', 'zion_east', 300, 'exp');
// rank = 2 * avg(100, 300) = 2 * 200 = 400
assertEqual(MR.calculateTravelerRank(s16, 'alice'), 400, 'rank = 400 with 2 worlds (100 + 300)');

// Unknown player
assertEqual(MR.calculateTravelerRank(s16, 'ghost'), 0, 'rank = 0 for unknown player');

// Three worlds: 0, 200, 1000 -> avg = 400 -> rank = 3 * 400 = 1200
MR.visitWorld(s16, 'alice', 'zion_west', 'ZION West', '', 1200);
MR.earnReputation(s16, 'alice', 'zion_west', 1000, 'exp');
// worlds: zion_main=100, zion_east=300, zion_west=1000 -> avg=466.67 -> rank = 3 * 466.67 = 1400
var rank3 = MR.calculateTravelerRank(s16, 'alice');
assert(rank3 > 1000, 'rank increases with more worlds and higher scores');

// ---------------------------------------------------------------------------
// Integration: full workflow
// ---------------------------------------------------------------------------
section('Integration: full multiverse workflow');

var sInt = MR.createState();

// Multiple players join
MR.initPlayer(sInt, 'alice', 'zion_main');
MR.initPlayer(sInt, 'bob', 'zion_main');

// Alice travels to multiple worlds
MR.visitWorld(sInt, 'alice', 'zion_main', 'ZION Prime', 'https://zion/', 1000);
MR.visitWorld(sInt, 'alice', 'zion_east', 'ZION East',  'https://east/', 1200);
MR.visitWorld(sInt, 'alice', 'zion_beta', 'ZION Beta',  'https://beta/', 1500);

// Earn rep in different worlds
MR.earnReputation(sInt, 'alice', 'zion_main', 600, 'legendary_quest');
MR.earnReputation(sInt, 'alice', 'zion_east', 200, 'exploration');
MR.earnReputation(sInt, 'alice', 'zion_beta', 50, 'newcomer_quest');

// Award achievements
MR.awardAchievement(sInt, 'alice', 'zion_main', 'first_visit');
MR.awardAchievement(sInt, 'alice', 'zion_main', 'zone_explorer');
MR.awardAchievement(sInt, 'alice', 'zion_east', 'first_visit');

// Join guilds
MR.joinFederatedGuild(sInt, 'alice', 'explorers_guild', 'zion_main');
MR.joinFederatedGuild(sInt, 'alice', 'crafters_guild', 'zion_east');

// Bob stays home
MR.visitWorld(sInt, 'bob', 'zion_main', 'ZION Prime', 'https://zion/', 1000);
MR.earnReputation(sInt, 'bob', 'zion_main', 400, 'questing');

// Validate alice profile
var aliceProfile = MR.getPlayerProfile(sInt, 'alice');
assertEqual(aliceProfile.totalWorlds, 3, 'alice visited 3 worlds');
assertEqual(aliceProfile.federatedGuilds.length, 2, 'alice in 2 guilds');

// Validate traveler badge
var aliceBadge = MR.getTravelerBadge(sInt, 'alice');
assertEqual(aliceBadge.worldsVisited, 3, 'alice badge: 3 worlds');
assertEqual(aliceBadge.totalScore, 850, 'alice badge: totalScore = 600+200+50');
assertEqual(aliceBadge.highestTier, 'renowned', 'alice badge: highestTier = renowned (600)');

// World leaderboard
var mainBoard = MR.getWorldLeaderboard(sInt, 'zion_main', 10);
assertEqual(mainBoard[0].playerId, 'alice', 'alice leads zion_main (600 > 400)');
assertEqual(mainBoard[1].playerId, 'bob',   'bob second in zion_main');

// Top travelers
var topT = MR.getTopTravelers(sInt, 10);
assertEqual(topT[0].playerId, 'alice', 'alice is top traveler (3 worlds vs 1)');

// Export and re-sync
var exported = MR.exportReputation(sInt, 'alice', 'zion_main');
assertEqual(exported.reputationScore, 600, 'export has correct score');
MR.syncReputation(sInt, 'bob', 'zion_main', exported, 2000);
// Bob already has zion_main, so sync updates it
var bobRep = MR.getReputation(sInt, 'bob', 'zion_main');
assertEqual(bobRep.reputationScore, 600, 'sync overwrites bob zion_main score with export');

// Rank calculations
var aliceRank = MR.calculateTravelerRank(sInt, 'alice');
assert(aliceRank > 0, 'alice traveler rank > 0');

console.log('\n=====================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed out of ' + (passed + failed) + ' tests');
if (failed > 0) {
    process.exit(1);
} else {
    console.log('All tests passed!');
}
