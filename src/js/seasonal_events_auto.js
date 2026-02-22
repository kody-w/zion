// seasonal_events_auto.js
/**
 * ZION Seasonal Events Auto-Generation System
 * Auto-generate seasonal challenges from seed templates.
 * Each season gets unique challenges without hand-coding.
 * Leaderboards reset each season. Rewards escalate.
 * Layer: after economy.js (uses spark/xp reward shapes)
 */

(function(exports) {
    'use strict';

    // ============================================================================
    // SEEDED PRNG — mulberry32
    // ============================================================================

    function mulberry32(seed) {
        var s = seed >>> 0;
        return function() {
            s += 0x6D2B79F5;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function seedFromString(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        }
        return hash >>> 0;
    }

    function randInt(rng, min, max) {
        return Math.floor(rng() * (max - min + 1)) + min;
    }

    function randChoice(rng, arr) {
        return arr[Math.floor(rng() * arr.length)];
    }

    function shuffle(rng, arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
    }

    // ============================================================================
    // CHALLENGE TEMPLATES — 20 parametric templates
    // ============================================================================

    var CHALLENGE_TEMPLATES = [
        // --- Gathering (3) ---
        {
            id: 'harvest_bounty',
            name: '{season} Bounty',
            description: 'Harvest {count} items during {season}',
            category: 'gathering',
            paramRanges: { count: { min: 20, max: 100, step: 10 } },
            seasons: ['spring', 'summer', 'autumn'],
            baseReward: { spark: 20, xp: 50 },
            rewardScale: 1.5,
            tier: 1
        },
        {
            id: 'rare_herb_hunt',
            name: '{season} Herb Hunt',
            description: 'Collect {count} rare herbs in {season}',
            category: 'gathering',
            paramRanges: { count: { min: 5, max: 25, step: 5 } },
            seasons: ['spring', 'summer'],
            baseReward: { spark: 35, xp: 80 },
            rewardScale: 1.8,
            tier: 2
        },
        {
            id: 'winter_forage',
            name: 'Winter Forager',
            description: 'Forage {count} items in the winter cold',
            category: 'gathering',
            paramRanges: { count: { min: 10, max: 40, step: 5 } },
            seasons: ['winter'],
            baseReward: { spark: 40, xp: 90 },
            rewardScale: 2.0,
            tier: 2
        },

        // --- Fishing (3) ---
        {
            id: 'ice_fishing',
            name: '{season} Ice Angler',
            description: 'Catch {count} fish through the ice in {season}',
            category: 'fishing',
            paramRanges: { count: { min: 5, max: 30, step: 5 } },
            seasons: ['winter'],
            baseReward: { spark: 45, xp: 100 },
            rewardScale: 1.9,
            tier: 2
        },
        {
            id: 'seasonal_catch',
            name: '{season} Catch',
            description: 'Catch {count} fish during {season}',
            category: 'fishing',
            paramRanges: { count: { min: 10, max: 60, step: 5 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 25, xp: 60 },
            rewardScale: 1.6,
            tier: 1
        },
        {
            id: 'legendary_fish',
            name: '{season} Legend',
            description: 'Catch {count} legendary fish in {season}',
            category: 'fishing',
            paramRanges: { count: { min: 1, max: 5, step: 1 } },
            seasons: ['spring', 'summer', 'autumn'],
            baseReward: { spark: 80, xp: 200 },
            rewardScale: 2.5,
            tier: 3
        },

        // --- Crafting (2) ---
        {
            id: 'seasonal_craft',
            name: '{season} Artisan',
            description: 'Craft {count} items during {season}',
            category: 'crafting',
            paramRanges: { count: { min: 15, max: 75, step: 15 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 30, xp: 70 },
            rewardScale: 1.7,
            tier: 1
        },
        {
            id: 'master_craft',
            name: '{season} Masterwork',
            description: 'Craft {count} rare items in {season}',
            category: 'crafting',
            paramRanges: { count: { min: 3, max: 15, step: 3 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 70, xp: 180 },
            rewardScale: 2.3,
            tier: 3
        },

        // --- Exploration (3) ---
        {
            id: 'zone_explorer',
            name: '{season} Explorer',
            description: 'Explore {count} zones during {season}',
            category: 'exploration',
            paramRanges: { count: { min: 2, max: 8, step: 1 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 20, xp: 55 },
            rewardScale: 1.4,
            tier: 1
        },
        {
            id: 'hidden_discovery',
            name: '{season} Discovery',
            description: 'Find {count} hidden locations in {season}',
            category: 'exploration',
            paramRanges: { count: { min: 1, max: 6, step: 1 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 50, xp: 120 },
            rewardScale: 2.0,
            tier: 2
        },
        {
            id: 'grand_traverse',
            name: 'Grand {season} Traverse',
            description: 'Travel {count} zones from edge to edge in {season}',
            category: 'exploration',
            paramRanges: { count: { min: 6, max: 8, step: 1 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 90, xp: 220 },
            rewardScale: 2.8,
            tier: 3
        },

        // --- Social (3) ---
        {
            id: 'festival_host',
            name: '{season} Festival Host',
            description: 'Host {count} festival events in {season}',
            category: 'social',
            paramRanges: { count: { min: 1, max: 5, step: 1 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 55, xp: 130 },
            rewardScale: 2.0,
            tier: 2
        },
        {
            id: 'community_builder',
            name: '{season} Community',
            description: 'Interact with {count} players during {season}',
            category: 'social',
            paramRanges: { count: { min: 5, max: 30, step: 5 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 15, xp: 40 },
            rewardScale: 1.3,
            tier: 1
        },
        {
            id: 'guild_champion',
            name: '{season} Guild Champion',
            description: 'Complete {count} guild tasks in {season}',
            category: 'social',
            paramRanges: { count: { min: 3, max: 20, step: 3 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 60, xp: 140 },
            rewardScale: 2.1,
            tier: 2
        },

        // --- Combat (2) ---
        {
            id: 'seasonal_warrior',
            name: '{season} Warrior',
            description: 'Win {count} battles during {season}',
            category: 'combat',
            paramRanges: { count: { min: 5, max: 40, step: 5 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 25, xp: 65 },
            rewardScale: 1.6,
            tier: 1
        },
        {
            id: 'arena_champion',
            name: '{season} Arena Champion',
            description: 'Win {count} arena matches in {season}',
            category: 'combat',
            paramRanges: { count: { min: 3, max: 15, step: 3 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 75, xp: 190 },
            rewardScale: 2.4,
            tier: 3
        },

        // --- Cooking (2) ---
        {
            id: 'seasonal_cook',
            name: '{season} Chef',
            description: 'Cook {count} seasonal dishes in {season}',
            category: 'cooking',
            paramRanges: { count: { min: 10, max: 50, step: 10 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 22, xp: 55 },
            rewardScale: 1.5,
            tier: 1
        },
        {
            id: 'feast_master',
            name: '{season} Feast Master',
            description: 'Prepare {count} feasts during {season}',
            category: 'cooking',
            paramRanges: { count: { min: 2, max: 10, step: 2 } },
            seasons: ['autumn', 'winter'],
            baseReward: { spark: 65, xp: 160 },
            rewardScale: 2.2,
            tier: 2
        },

        // --- Building (2) ---
        {
            id: 'seasonal_builder',
            name: '{season} Builder',
            description: 'Build {count} structures during {season}',
            category: 'building',
            paramRanges: { count: { min: 5, max: 30, step: 5 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 28, xp: 68 },
            rewardScale: 1.6,
            tier: 1
        },
        {
            id: 'grand_architect',
            name: 'Grand {season} Architect',
            description: 'Complete {count} landmark builds in {season}',
            category: 'building',
            paramRanges: { count: { min: 1, max: 5, step: 1 } },
            seasons: ['spring', 'summer', 'autumn', 'winter'],
            baseReward: { spark: 85, xp: 210 },
            rewardScale: 2.6,
            tier: 3
        }
    ];

    // ============================================================================
    // SEASON CONFIG
    // ============================================================================

    var SEASON_CONFIG = {
        spring: {
            id: 'spring',
            name: 'Spring',
            tickRange: [0, 719],
            theme: 'growth',
            specialRewards: [{ type: 'cosmetic', id: 'spring_crown' }],
            bonusCategory: 'gathering'
        },
        summer: {
            id: 'summer',
            name: 'Summer',
            tickRange: [720, 1439],
            theme: 'abundance',
            specialRewards: [{ type: 'cosmetic', id: 'summer_wreath' }],
            bonusCategory: 'exploration'
        },
        autumn: {
            id: 'autumn',
            name: 'Autumn',
            tickRange: [1440, 2159],
            theme: 'harvest',
            specialRewards: [{ type: 'cosmetic', id: 'autumn_cloak' }],
            bonusCategory: 'cooking'
        },
        winter: {
            id: 'winter',
            name: 'Winter',
            tickRange: [2160, 2879],
            theme: 'endurance',
            specialRewards: [{ type: 'cosmetic', id: 'winter_mantle' }],
            bonusCategory: 'crafting'
        }
    };

    var TICKS_PER_YEAR = 2880;
    var SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];
    var MIN_CHALLENGES_PER_SEASON = 10;
    var MAX_CHALLENGES_PER_SEASON = 15;
    var SEASON_REWARD_THRESHOLD = 8; // need this many completions to claim season reward

    // ============================================================================
    // HELPERS
    // ============================================================================

    function interpolateString(template, params, seasonName) {
        var result = template;
        result = result.replace(/\{season\}/g, seasonName);
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), String(params[key]));
            }
        }
        return result;
    }

    function snapToStep(value, min, step) {
        var steps = Math.round((value - min) / step);
        return min + steps * step;
    }

    function scaleReward(baseReward, scale) {
        return {
            spark: Math.round(baseReward.spark * scale),
            xp: Math.round(baseReward.xp * scale)
        };
    }

    function makeEventId(season, year, templateId) {
        return season + '_' + year + '_' + templateId;
    }

    function getStateEvents(state, season, year) {
        if (!state.seasonalEvents) { return []; }
        var key = season + '_' + year;
        return state.seasonalEvents[key] || [];
    }

    function ensureStateStructure(state) {
        if (!state.seasonalEvents) { state.seasonalEvents = {}; }
        if (!state.seasonalProgress) { state.seasonalProgress = {}; }
        if (!state.seasonalRewardsClaimed) { state.seasonalRewardsClaimed = {}; }
        return state;
    }

    function getSeasonKey(season, year) {
        return season + '_' + year;
    }

    // ============================================================================
    // CORE FUNCTIONS
    // ============================================================================

    /**
     * Generate 10-15 challenges for a season from templates using seed.
     * Returns {challenges: [...], specialReward}
     */
    function generateSeason(season, year, seed) {
        var config = SEASON_CONFIG[season];
        if (!config) {
            throw new Error('Unknown season: ' + season);
        }

        var seedNum;
        if (typeof seed === 'number') {
            seedNum = seed >>> 0;
        } else {
            seedNum = seedFromString(season + '_' + year);
        }

        var rng = mulberry32(seedNum);

        // Filter templates valid for this season
        var validTemplates = [];
        for (var i = 0; i < CHALLENGE_TEMPLATES.length; i++) {
            var t = CHALLENGE_TEMPLATES[i];
            if (t.seasons.indexOf(season) !== -1) {
                validTemplates.push(t);
            }
        }

        // Shuffle and pick 10-15
        var shuffled = shuffle(rng, validTemplates);
        var count = randInt(rng, MIN_CHALLENGES_PER_SEASON, MAX_CHALLENGES_PER_SEASON);
        count = Math.min(count, shuffled.length);
        var selected = shuffled.slice(0, count);

        var challenges = [];
        for (var j = 0; j < selected.length; j++) {
            var tmpl = selected[j];
            var params = {};

            for (var paramKey in tmpl.paramRanges) {
                if (tmpl.paramRanges.hasOwnProperty(paramKey)) {
                    var range = tmpl.paramRanges[paramKey];
                    var rawVal = range.min + rng() * (range.max - range.min);
                    params[paramKey] = snapToStep(rawVal, range.min, range.step);
                }
            }

            // Scale reward based on tier
            var tierMultiplier = 1.0;
            if (tmpl.tier === 2) { tierMultiplier = tmpl.rewardScale; }
            if (tmpl.tier === 3) { tierMultiplier = tmpl.rewardScale * 1.5; }

            // Bonus category gets 2x
            var bonusMultiplier = (tmpl.category === config.bonusCategory) ? 2.0 : 1.0;

            var finalReward = scaleReward(tmpl.baseReward, tierMultiplier * bonusMultiplier);

            var seasonName = config.name;

            challenges.push({
                id: makeEventId(season, year, tmpl.id),
                templateId: tmpl.id,
                season: season,
                year: year,
                params: params,
                name: interpolateString(tmpl.name, params, seasonName),
                description: interpolateString(tmpl.description, params, seasonName),
                category: tmpl.category,
                tier: tmpl.tier,
                reward: finalReward,
                leaderboard: [],
                status: 'active'
            });
        }

        return {
            challenges: challenges,
            specialReward: config.specialRewards[0] || null,
            season: season,
            year: year,
            seed: seedNum,
            bonusCategory: config.bonusCategory
        };
    }

    /**
     * Get all active events for a season/year from state.
     */
    function getActiveEvents(state, season, year) {
        var events = getStateEvents(state, season, year);
        var result = [];
        for (var i = 0; i < events.length; i++) {
            if (events[i].status === 'active') {
                result.push(events[i]);
            }
        }
        return result;
    }

    /**
     * Mark a challenge as completed by a player.
     */
    function completeChallenge(state, playerId, eventId, currentTick) {
        ensureStateStructure(state);

        var parts = eventId.split('_');
        // eventId format: season_year_templateId (season may be multi-part, year is numeric)
        // Find year index
        var yearIdx = -1;
        for (var i = 1; i < parts.length; i++) {
            if (/^\d{4}$/.test(parts[i])) {
                yearIdx = i;
                break;
            }
        }
        if (yearIdx === -1) { return { success: false, reason: 'invalid_event_id' }; }

        var season = parts.slice(0, yearIdx).join('_');
        var year = parseInt(parts[yearIdx], 10);
        var key = getSeasonKey(season, year);

        var events = state.seasonalEvents[key];
        if (!events) { return { success: false, reason: 'season_not_found' }; }

        var event = null;
        for (var j = 0; j < events.length; j++) {
            if (events[j].id === eventId) {
                event = events[j];
                break;
            }
        }
        if (!event) { return { success: false, reason: 'event_not_found' }; }
        if (event.status !== 'active') { return { success: false, reason: 'event_not_active' }; }

        // Check player progress
        var progressKey = playerId + ':' + eventId;
        var playerProgress = state.seasonalProgress[progressKey] || { progress: 0, completed: false };
        if (playerProgress.completed) {
            return { success: false, reason: 'already_completed' };
        }

        // Mark complete
        playerProgress.completed = true;
        playerProgress.completedAt = currentTick;
        state.seasonalProgress[progressKey] = playerProgress;

        // Add to leaderboard
        if (!event.leaderboard) { event.leaderboard = []; }
        event.leaderboard.push({
            playerId: playerId,
            progress: playerProgress.progress,
            completedAt: currentTick
        });

        return {
            success: true,
            reward: event.reward,
            event: event
        };
    }

    /**
     * Update a player's progress on a challenge.
     */
    function updateProgress(state, playerId, eventId, amount) {
        ensureStateStructure(state);
        var progressKey = playerId + ':' + eventId;
        var playerProgress = state.seasonalProgress[progressKey] || { progress: 0, completed: false };
        if (!playerProgress.completed) {
            playerProgress.progress = (playerProgress.progress || 0) + amount;
        }
        state.seasonalProgress[progressKey] = playerProgress;
        return playerProgress;
    }

    /**
     * Get a player's progress on a challenge.
     */
    function getProgress(state, playerId, eventId) {
        ensureStateStructure(state);
        var progressKey = playerId + ':' + eventId;
        return state.seasonalProgress[progressKey] || { progress: 0, completed: false };
    }

    /**
     * Get all challenges for a season with completion status for a player.
     */
    function getPlayerSeasonProgress(state, playerId, season, year) {
        ensureStateStructure(state);
        var events = getStateEvents(state, season, year);
        var result = [];
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var progress = getProgress(state, playerId, event.id);
            result.push({
                event: event,
                progress: progress.progress || 0,
                completed: progress.completed || false,
                completedAt: progress.completedAt || null
            });
        }
        return result;
    }

    /**
     * Get top players by challenges completed for a season.
     */
    function getSeasonLeaderboard(state, season, year, count) {
        ensureStateStructure(state);
        var events = getStateEvents(state, season, year);
        var playerCounts = {};

        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var lb = event.leaderboard || [];
            for (var j = 0; j < lb.length; j++) {
                var entry = lb[j];
                if (!playerCounts[entry.playerId]) {
                    playerCounts[entry.playerId] = { playerId: entry.playerId, completed: 0, latestTick: 0 };
                }
                playerCounts[entry.playerId].completed++;
                if (entry.completedAt > playerCounts[entry.playerId].latestTick) {
                    playerCounts[entry.playerId].latestTick = entry.completedAt;
                }
            }
        }

        var entries = [];
        for (var pid in playerCounts) {
            if (playerCounts.hasOwnProperty(pid)) {
                entries.push(playerCounts[pid]);
            }
        }

        entries.sort(function(a, b) {
            if (b.completed !== a.completed) { return b.completed - a.completed; }
            return a.latestTick - b.latestTick;
        });

        var n = count || entries.length;
        return entries.slice(0, n);
    }

    /**
     * Get top players for a specific challenge.
     */
    function getChallengeLeaderboard(state, eventId, count) {
        ensureStateStructure(state);
        var parts = eventId.split('_');
        var yearIdx = -1;
        for (var i = 1; i < parts.length; i++) {
            if (/^\d{4}$/.test(parts[i])) {
                yearIdx = i;
                break;
            }
        }
        if (yearIdx === -1) { return []; }

        var season = parts.slice(0, yearIdx).join('_');
        var year = parseInt(parts[yearIdx], 10);
        var events = getStateEvents(state, season, year);

        var event = null;
        for (var j = 0; j < events.length; j++) {
            if (events[j].id === eventId) {
                event = events[j];
                break;
            }
        }
        if (!event) { return []; }

        var lb = (event.leaderboard || []).slice();
        lb.sort(function(a, b) {
            if (a.completedAt && b.completedAt) { return a.completedAt - b.completedAt; }
            if (a.completedAt) { return -1; }
            if (b.completedAt) { return 1; }
            return b.progress - a.progress;
        });

        var n = count || lb.length;
        return lb.slice(0, n);
    }

    /**
     * Get special rewards for a season.
     */
    function getSeasonRewards(season) {
        var config = SEASON_CONFIG[season];
        if (!config) { return []; }
        return config.specialRewards.slice();
    }

    /**
     * Claim special season reward when enough challenges are completed.
     */
    function claimSeasonReward(state, playerId, season, year) {
        ensureStateStructure(state);

        var progressList = getPlayerSeasonProgress(state, playerId, season, year);
        var completedCount = 0;
        for (var i = 0; i < progressList.length; i++) {
            if (progressList[i].completed) { completedCount++; }
        }

        if (completedCount < SEASON_REWARD_THRESHOLD) {
            return {
                success: false,
                reason: 'insufficient_completions',
                completed: completedCount,
                required: SEASON_REWARD_THRESHOLD
            };
        }

        var claimKey = playerId + ':' + getSeasonKey(season, year);
        if (state.seasonalRewardsClaimed[claimKey]) {
            return { success: false, reason: 'already_claimed' };
        }

        state.seasonalRewardsClaimed[claimKey] = true;
        var rewards = getSeasonRewards(season);

        return {
            success: true,
            rewards: rewards,
            completedChallenges: completedCount
        };
    }

    /**
     * Get all challenge templates.
     */
    function getTemplates() {
        return CHALLENGE_TEMPLATES.slice();
    }

    /**
     * Get all season configs.
     */
    function getSeasons() {
        var result = [];
        for (var i = 0; i < SEASON_ORDER.length; i++) {
            result.push(SEASON_CONFIG[SEASON_ORDER[i]]);
        }
        return result;
    }

    /**
     * Check if a season is active at a given tick (within the year).
     */
    function isSeasonActive(currentTick, season) {
        var config = SEASON_CONFIG[season];
        if (!config) { return false; }
        var tickInYear = ((currentTick % TICKS_PER_YEAR) + TICKS_PER_YEAR) % TICKS_PER_YEAR;
        return tickInYear >= config.tickRange[0] && tickInYear <= config.tickRange[1];
    }

    /**
     * Get the current season from a tick.
     */
    function getCurrentSeason(currentTick) {
        var tickInYear = ((currentTick % TICKS_PER_YEAR) + TICKS_PER_YEAR) % TICKS_PER_YEAR;
        for (var i = 0; i < SEASON_ORDER.length; i++) {
            var s = SEASON_ORDER[i];
            var config = SEASON_CONFIG[s];
            if (tickInYear >= config.tickRange[0] && tickInYear <= config.tickRange[1]) {
                return s;
            }
        }
        return 'spring'; // fallback
    }

    /**
     * Get past seasons with completion stats for a player.
     */
    function getSeasonHistory(state, playerId) {
        ensureStateStructure(state);
        var history = [];

        for (var key in state.seasonalEvents) {
            if (!state.seasonalEvents.hasOwnProperty(key)) { continue; }

            // Parse key: season_year
            var lastUnderscore = key.lastIndexOf('_');
            if (lastUnderscore === -1) { continue; }
            var season = key.slice(0, lastUnderscore);
            var year = parseInt(key.slice(lastUnderscore + 1), 10);
            if (isNaN(year)) { continue; }

            var events = state.seasonalEvents[key];
            var totalChallenges = events.length;
            var completed = 0;
            var totalSpark = 0;
            var totalXp = 0;

            for (var i = 0; i < events.length; i++) {
                var progress = getProgress(state, playerId, events[i].id);
                if (progress.completed) {
                    completed++;
                    totalSpark += events[i].reward.spark || 0;
                    totalXp += events[i].reward.xp || 0;
                }
            }

            var claimKey = playerId + ':' + key;
            var rewardClaimed = !!state.seasonalRewardsClaimed[claimKey];

            history.push({
                season: season,
                year: year,
                totalChallenges: totalChallenges,
                completedChallenges: completed,
                totalSpark: totalSpark,
                totalXp: totalXp,
                rewardClaimed: rewardClaimed
            });
        }

        history.sort(function(a, b) {
            if (a.year !== b.year) { return a.year - b.year; }
            return SEASON_ORDER.indexOf(a.season) - SEASON_ORDER.indexOf(b.season);
        });

        return history;
    }

    /**
     * Get yearly stats aggregated across all seasons for a year.
     */
    function getYearlyStats(state, year) {
        ensureStateStructure(state);
        var stats = {
            year: year,
            totalEvents: 0,
            completedEvents: 0,
            totalPlayers: 0,
            bySeasons: {}
        };

        var allPlayers = {};

        for (var i = 0; i < SEASON_ORDER.length; i++) {
            var season = SEASON_ORDER[i];
            var key = getSeasonKey(season, year);
            var events = state.seasonalEvents[key] || [];

            var seasonStats = {
                season: season,
                totalEvents: events.length,
                completions: 0,
                players: {}
            };

            for (var j = 0; j < events.length; j++) {
                var lb = events[j].leaderboard || [];
                seasonStats.completions += lb.length;
                stats.completedEvents += lb.length;
                for (var k = 0; k < lb.length; k++) {
                    seasonStats.players[lb[k].playerId] = true;
                    allPlayers[lb[k].playerId] = true;
                }
            }

            seasonStats.uniquePlayers = Object.keys(seasonStats.players).length;
            delete seasonStats.players;

            stats.totalEvents += events.length;
            stats.bySeasons[season] = seasonStats;
        }

        stats.totalPlayers = Object.keys(allPlayers).length;
        return stats;
    }

    /**
     * Get challenges filtered by category for a season/year.
     */
    function getChallengesByCategory(state, season, year, category) {
        var events = getStateEvents(state, season, year);
        var result = [];
        for (var i = 0; i < events.length; i++) {
            if (events[i].category === category) {
                result.push(events[i]);
            }
        }
        return result;
    }

    /**
     * Get difficulty distribution (tier 1/2/3 counts) for a season/year.
     */
    function getDifficultyDistribution(state, season, year) {
        var events = getStateEvents(state, season, year);
        var dist = { tier1: 0, tier2: 0, tier3: 0 };
        for (var i = 0; i < events.length; i++) {
            var tier = events[i].tier;
            if (tier === 1) { dist.tier1++; }
            else if (tier === 2) { dist.tier2++; }
            else if (tier === 3) { dist.tier3++; }
        }
        return dist;
    }

    // ============================================================================
    // STATE HELPERS — store generated season into state
    // ============================================================================

    /**
     * Store a generated season's challenges into state.
     */
    function storeGeneratedSeason(state, generated) {
        ensureStateStructure(state);
        var key = getSeasonKey(generated.season, generated.year);
        state.seasonalEvents[key] = generated.challenges;
        return state;
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================

    exports.generateSeason = generateSeason;
    exports.getActiveEvents = getActiveEvents;
    exports.completeChallenge = completeChallenge;
    exports.updateProgress = updateProgress;
    exports.getProgress = getProgress;
    exports.getPlayerSeasonProgress = getPlayerSeasonProgress;
    exports.getSeasonLeaderboard = getSeasonLeaderboard;
    exports.getChallengeLeaderboard = getChallengeLeaderboard;
    exports.getSeasonRewards = getSeasonRewards;
    exports.claimSeasonReward = claimSeasonReward;
    exports.getTemplates = getTemplates;
    exports.getSeasons = getSeasons;
    exports.isSeasonActive = isSeasonActive;
    exports.getCurrentSeason = getCurrentSeason;
    exports.getSeasonHistory = getSeasonHistory;
    exports.getYearlyStats = getYearlyStats;
    exports.getChallengesByCategory = getChallengesByCategory;
    exports.getDifficultyDistribution = getDifficultyDistribution;
    exports.storeGeneratedSeason = storeGeneratedSeason;

    // Expose constants
    exports.CHALLENGE_TEMPLATES = CHALLENGE_TEMPLATES;
    exports.SEASON_CONFIG = SEASON_CONFIG;
    exports.SEASON_REWARD_THRESHOLD = SEASON_REWARD_THRESHOLD;
    exports.TICKS_PER_YEAR = TICKS_PER_YEAR;

})(typeof module !== 'undefined' ? module.exports : (window.SeasonalEventsAuto = {}));
