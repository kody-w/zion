/**
 * ZION Multiverse Reputation System
 * Cross-world reputation ledger for federated ZION instances.
 * Reputation is earned locally, read-only in foreign worlds.
 * Traveler badges, federated guild recruitment.
 */

(function(exports) {
    'use strict';

    // ---------------------------------------------------------------------------
    // REPUTATION_TIERS
    // ---------------------------------------------------------------------------
    var REPUTATION_TIERS = [
        {id: 'unknown',       name: 'Unknown',       minScore: 0,    badge: 'gray_circle'},
        {id: 'newcomer',      name: 'Newcomer',      minScore: 10,   badge: 'white_star'},
        {id: 'known',         name: 'Known',         minScore: 50,   badge: 'bronze_star'},
        {id: 'respected',     name: 'Respected',     minScore: 150,  badge: 'silver_star'},
        {id: 'distinguished', name: 'Distinguished', minScore: 300,  badge: 'gold_star'},
        {id: 'renowned',      name: 'Renowned',      minScore: 500,  badge: 'platinum_star'},
        {id: 'legendary',     name: 'Legendary',     minScore: 1000, badge: 'diamond_star'},
        {id: 'eternal',       name: 'Eternal',       minScore: 2000, badge: 'cosmic_star'}
    ];

    // ---------------------------------------------------------------------------
    // State initializer
    // ---------------------------------------------------------------------------

    /**
     * Create a fresh multiverse reputation state object.
     * @returns {Object} state
     */
    function createState() {
        return {
            players: {},         // playerId -> PLAYER_MULTIVERSE
            history: {},         // playerId -> worldId -> [{tick, delta, reason}]
            achievements: {}     // playerId -> worldId -> [achievementId]
        };
    }

    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------

    function _ensurePlayer(state, playerId) {
        if (!state.players[playerId]) {
            state.players[playerId] = {
                playerId: playerId,
                homeWorld: null,
                worlds: {},
                travelerBadge: {worldsVisited: 0, highestTier: 'unknown', totalScore: 0},
                federatedGuilds: []
            };
        }
        return state.players[playerId];
    }

    function _ensureHistory(state, playerId, worldId) {
        if (!state.history[playerId]) {
            state.history[playerId] = {};
        }
        if (!state.history[playerId][worldId]) {
            state.history[playerId][worldId] = [];
        }
        return state.history[playerId][worldId];
    }

    function _ensureAchievements(state, playerId, worldId) {
        if (!state.achievements[playerId]) {
            state.achievements[playerId] = {};
        }
        if (!state.achievements[playerId][worldId]) {
            state.achievements[playerId][worldId] = [];
        }
        return state.achievements[playerId][worldId];
    }

    function _updateTravelerBadge(state, playerId) {
        var player = state.players[playerId];
        if (!player) return;

        var worlds = player.worlds;
        var worldIds = Object.keys(worlds);
        var totalScore = 0;
        var highestScore = 0;

        for (var i = 0; i < worldIds.length; i++) {
            var rec = worlds[worldIds[i]];
            totalScore += rec.reputationScore;
            if (rec.reputationScore > highestScore) {
                highestScore = rec.reputationScore;
            }
        }

        var highestTierObj = getTier(highestScore);
        player.travelerBadge = {
            worldsVisited: worldIds.length,
            highestTier: highestTierObj.id,
            totalScore: totalScore
        };
    }

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------

    /**
     * Initialize a player in the multiverse state.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} homeWorldId
     */
    function initPlayer(state, playerId, homeWorldId) {
        var player = _ensurePlayer(state, playerId);
        player.homeWorld = homeWorldId || null;
        return player;
    }

    /**
     * Record a world visit for a player. Creates a WORLD_RECORD if needed.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} worldId
     * @param {string} worldName
     * @param {string} worldUrl
     * @param {number} currentTick
     * @returns {Object} WORLD_RECORD
     */
    function visitWorld(state, playerId, worldId, worldName, worldUrl, currentTick) {
        var player = _ensurePlayer(state, playerId);
        var tick = currentTick || 0;

        if (!player.worlds[worldId]) {
            player.worlds[worldId] = {
                worldId: worldId,
                worldName: worldName || worldId,
                worldUrl: worldUrl || '',
                visitedAt: tick,
                reputationScore: 0,
                tier: 'unknown',
                achievements: [],
                lastSync: tick
            };
            _ensureHistory(state, playerId, worldId);
            _ensureAchievements(state, playerId, worldId);
            _updateTravelerBadge(state, playerId);
        } else {
            // Update name/url/lastSync on revisit
            var rec = player.worlds[worldId];
            if (worldName) rec.worldName = worldName;
            if (worldUrl) rec.worldUrl = worldUrl;
            rec.lastSync = tick;
        }

        return player.worlds[worldId];
    }

    /**
     * Earn reputation in a specific world.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} worldId
     * @param {number} amount
     * @param {string} reason
     * @returns {Object} WORLD_RECORD
     */
    function earnReputation(state, playerId, worldId, amount, reason) {
        var player = _ensurePlayer(state, playerId);
        if (!player.worlds[worldId]) {
            return null;
        }

        var rec = player.worlds[worldId];
        var delta = amount || 0;
        if (delta < 0) delta = 0; // earnReputation only adds; use syncReputation for adjustments

        rec.reputationScore += delta;
        var tierObj = getTier(rec.reputationScore);
        rec.tier = tierObj.id;

        var hist = _ensureHistory(state, playerId, worldId);
        hist.push({delta: delta, reason: reason || '', score: rec.reputationScore});

        _updateTravelerBadge(state, playerId);
        return rec;
    }

    /**
     * Get reputation record for a player in a specific world.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} worldId
     * @returns {Object|null} WORLD_RECORD or null
     */
    function getReputation(state, playerId, worldId) {
        var player = state.players[playerId];
        if (!player) return null;
        return player.worlds[worldId] || null;
    }

    /**
     * Get the reputation tier for a given score.
     * @param {number} score
     * @returns {Object} tier object from REPUTATION_TIERS
     */
    function getTier(score) {
        var s = score || 0;
        var result = REPUTATION_TIERS[0];
        for (var i = 0; i < REPUTATION_TIERS.length; i++) {
            if (s >= REPUTATION_TIERS[i].minScore) {
                result = REPUTATION_TIERS[i];
            }
        }
        return result;
    }

    /**
     * Get the full multiverse profile for a player.
     * @param {Object} state
     * @param {string} playerId
     * @returns {Object|null}
     */
    function getPlayerProfile(state, playerId) {
        var player = state.players[playerId];
        if (!player) return null;

        var worldIds = Object.keys(player.worlds);
        var worldProfiles = [];
        for (var i = 0; i < worldIds.length; i++) {
            worldProfiles.push(player.worlds[worldIds[i]]);
        }

        return {
            playerId: player.playerId,
            homeWorld: player.homeWorld,
            travelerBadge: player.travelerBadge,
            federatedGuilds: player.federatedGuilds,
            worlds: worldProfiles,
            totalWorlds: worldIds.length
        };
    }

    /**
     * Get the traveler badge for a player.
     * @param {Object} state
     * @param {string} playerId
     * @returns {Object|null}
     */
    function getTravelerBadge(state, playerId) {
        var player = state.players[playerId];
        if (!player) return null;
        return player.travelerBadge;
    }

    /**
     * Get list of worlds visited by a player.
     * @param {Object} state
     * @param {string} playerId
     * @returns {Array} array of WORLD_RECORD objects
     */
    function getWorldsVisited(state, playerId) {
        var player = state.players[playerId];
        if (!player) return [];
        var worldIds = Object.keys(player.worlds);
        var result = [];
        for (var i = 0; i < worldIds.length; i++) {
            result.push(player.worlds[worldIds[i]]);
        }
        return result;
    }

    /**
     * Import read-only reputation data from a foreign world.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} worldId
     * @param {Object} foreignData  {reputationScore, achievements, worldName, worldUrl}
     * @param {number} currentTick
     * @returns {Object|null} updated WORLD_RECORD
     */
    function syncReputation(state, playerId, worldId, foreignData, currentTick) {
        var player = _ensurePlayer(state, playerId);
        var tick = currentTick || 0;

        if (!player.worlds[worldId]) {
            visitWorld(state, playerId, worldId,
                (foreignData && foreignData.worldName) || worldId,
                (foreignData && foreignData.worldUrl) || '',
                tick);
        }

        var rec = player.worlds[worldId];
        if (!foreignData) {
            rec.lastSync = tick;
            return rec;
        }

        if (typeof foreignData.reputationScore === 'number') {
            rec.reputationScore = foreignData.reputationScore;
        }
        if (foreignData.worldName) rec.worldName = foreignData.worldName;
        if (foreignData.worldUrl)  rec.worldUrl  = foreignData.worldUrl;

        var tierObj = getTier(rec.reputationScore);
        rec.tier = tierObj.id;
        rec.lastSync = tick;

        // Merge achievements
        if (Array.isArray(foreignData.achievements)) {
            var existing = rec.achievements;
            for (var i = 0; i < foreignData.achievements.length; i++) {
                var ach = foreignData.achievements[i];
                if (existing.indexOf(ach) === -1) {
                    existing.push(ach);
                }
            }
        }

        _updateTravelerBadge(state, playerId);
        return rec;
    }

    /**
     * Export local reputation for sharing with other worlds.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} worldId
     * @returns {Object|null} exportable snapshot
     */
    function exportReputation(state, playerId, worldId) {
        var player = state.players[playerId];
        if (!player) return null;
        var rec = player.worlds[worldId];
        if (!rec) return null;

        return {
            playerId: playerId,
            worldId: worldId,
            worldName: rec.worldName,
            worldUrl: rec.worldUrl,
            reputationScore: rec.reputationScore,
            tier: rec.tier,
            achievements: rec.achievements.slice(),
            exportedAt: Date.now()
        };
    }

    /**
     * Join a federated guild.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} guildId
     * @param {string} worldId  world where guild is based
     * @returns {boolean} true if joined, false if already member
     */
    function joinFederatedGuild(state, playerId, guildId, worldId) {
        var player = _ensurePlayer(state, playerId);
        var guilds = player.federatedGuilds;

        for (var i = 0; i < guilds.length; i++) {
            if (guilds[i].guildId === guildId && guilds[i].worldId === worldId) {
                return false; // already member
            }
        }

        guilds.push({guildId: guildId, worldId: worldId, joinedAt: Date.now()});
        return true;
    }

    /**
     * Leave a federated guild.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} guildId
     * @returns {boolean} true if removed, false if not found
     */
    function leaveFederatedGuild(state, playerId, guildId) {
        var player = state.players[playerId];
        if (!player) return false;

        var guilds = player.federatedGuilds;
        for (var i = 0; i < guilds.length; i++) {
            if (guilds[i].guildId === guildId) {
                guilds.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Get all federated guilds for a player.
     * @param {Object} state
     * @param {string} playerId
     * @returns {Array}
     */
    function getFederatedGuilds(state, playerId) {
        var player = state.players[playerId];
        if (!player) return [];
        return player.federatedGuilds.slice();
    }

    /**
     * Get reputation history for a player in a world.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} worldId
     * @returns {Array} history entries [{delta, reason, score}]
     */
    function getReputationHistory(state, playerId, worldId) {
        if (!state.history[playerId]) return [];
        return (state.history[playerId][worldId] || []).slice();
    }

    /**
     * Get top travelers by worlds visited then aggregate score.
     * @param {Object} state
     * @param {number} count
     * @returns {Array} sorted player summaries
     */
    function getTopTravelers(state, count) {
        var n = count || 10;
        var playerIds = Object.keys(state.players);
        var list = [];

        for (var i = 0; i < playerIds.length; i++) {
            var pid = playerIds[i];
            var player = state.players[pid];
            list.push({
                playerId: pid,
                worldsVisited: player.travelerBadge.worldsVisited,
                totalScore: player.travelerBadge.totalScore,
                highestTier: player.travelerBadge.highestTier
            });
        }

        list.sort(function(a, b) {
            if (b.worldsVisited !== a.worldsVisited) {
                return b.worldsVisited - a.worldsVisited;
            }
            return b.totalScore - a.totalScore;
        });

        return list.slice(0, n);
    }

    /**
     * Get top reputation holders for a specific world.
     * @param {Object} state
     * @param {string} worldId
     * @param {number} count
     * @returns {Array} sorted player summaries
     */
    function getWorldLeaderboard(state, worldId, count) {
        var n = count || 10;
        var playerIds = Object.keys(state.players);
        var list = [];

        for (var i = 0; i < playerIds.length; i++) {
            var pid = playerIds[i];
            var player = state.players[pid];
            if (player.worlds[worldId]) {
                var rec = player.worlds[worldId];
                list.push({
                    playerId: pid,
                    reputationScore: rec.reputationScore,
                    tier: rec.tier
                });
            }
        }

        list.sort(function(a, b) {
            return b.reputationScore - a.reputationScore;
        });

        return list.slice(0, n);
    }

    /**
     * Get all reputation tiers.
     * @returns {Array}
     */
    function getTiers() {
        return REPUTATION_TIERS.slice();
    }

    /**
     * Get achievements for a player in a world.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} worldId
     * @returns {Array}
     */
    function getAchievements(state, playerId, worldId) {
        if (!state.achievements[playerId]) return [];
        return (state.achievements[playerId][worldId] || []).slice();
    }

    /**
     * Award an achievement to a player in a world.
     * Also stores in the WORLD_RECORD achievements array.
     * @param {Object} state
     * @param {string} playerId
     * @param {string} worldId
     * @param {string} achievementId
     * @returns {boolean} true if newly awarded, false if already had it
     */
    function awardAchievement(state, playerId, worldId, achievementId) {
        var player = state.players[playerId];
        if (!player || !player.worlds[worldId]) return false;

        var achList = _ensureAchievements(state, playerId, worldId);
        if (achList.indexOf(achievementId) !== -1) return false;

        achList.push(achievementId);

        // Mirror into WORLD_RECORD
        var rec = player.worlds[worldId];
        if (rec.achievements.indexOf(achievementId) === -1) {
            rec.achievements.push(achievementId);
        }

        return true;
    }

    /**
     * Calculate traveler rank based on worlds visited * avg tier score.
     * @param {Object} state
     * @param {string} playerId
     * @returns {number} rank score
     */
    function calculateTravelerRank(state, playerId) {
        var player = state.players[playerId];
        if (!player) return 0;

        var worldIds = Object.keys(player.worlds);
        var numWorlds = worldIds.length;
        if (numWorlds === 0) return 0;

        var totalScore = 0;
        for (var i = 0; i < worldIds.length; i++) {
            totalScore += player.worlds[worldIds[i]].reputationScore;
        }

        var avgScore = totalScore / numWorlds;
        return numWorlds * avgScore;
    }

    // ---------------------------------------------------------------------------
    // Exports
    // ---------------------------------------------------------------------------
    exports.REPUTATION_TIERS     = REPUTATION_TIERS;
    exports.createState          = createState;
    exports.initPlayer           = initPlayer;
    exports.visitWorld           = visitWorld;
    exports.earnReputation       = earnReputation;
    exports.getReputation        = getReputation;
    exports.getTier              = getTier;
    exports.getPlayerProfile     = getPlayerProfile;
    exports.getTravelerBadge     = getTravelerBadge;
    exports.getWorldsVisited     = getWorldsVisited;
    exports.syncReputation       = syncReputation;
    exports.exportReputation     = exportReputation;
    exports.joinFederatedGuild   = joinFederatedGuild;
    exports.leaveFederatedGuild  = leaveFederatedGuild;
    exports.getFederatedGuilds   = getFederatedGuilds;
    exports.getReputationHistory = getReputationHistory;
    exports.getTopTravelers      = getTopTravelers;
    exports.getWorldLeaderboard  = getWorldLeaderboard;
    exports.getTiers             = getTiers;
    exports.getAchievements      = getAchievements;
    exports.awardAchievement     = awardAchievement;
    exports.calculateTravelerRank = calculateTravelerRank;

})(typeof module !== 'undefined' ? module.exports : (window.MultiverseReputation = {}));
