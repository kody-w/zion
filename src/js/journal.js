/**
 * ZION Personal Narrative Journal System
 * Aggregates player experiences from all game systems into readable story entries.
 * Auto-writes narrative entries combining game data with template prose.
 */

(function(exports) {
    'use strict';

    // ---------------------------------------------------------------------------
    // CONSTANTS
    // ---------------------------------------------------------------------------

    var ENTRIES_PER_CHAPTER = 20;

    var SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
    var TICKS_PER_DAY = 24;
    var TICKS_PER_SEASON = TICKS_PER_DAY * 30; // 720 ticks per season
    var TICKS_PER_YEAR = TICKS_PER_SEASON * 4;  // 2880 ticks per year

    // ---------------------------------------------------------------------------
    // JOURNAL CATEGORIES
    // ---------------------------------------------------------------------------

    var JOURNAL_CATEGORIES = {
        adventures:   'adventures',
        crafting:     'crafting',
        social:       'social',
        discoveries:  'discoveries',
        daily_life:   'daily_life'
    };

    // Map event types to categories
    var EVENT_CATEGORY_MAP = {
        zone_visit:          'adventures',
        dungeon_cleared:     'adventures',
        building_placed:     'adventures',
        fish_caught:         'daily_life',
        house_decorated:     'daily_life',
        meal_cooked:         'crafting',
        item_crafted:        'crafting',
        trade_completed:     'social',
        npc_befriended:      'social',
        guild_joined:        'social',
        vote_cast:           'social',
        mentor_session:      'social',
        constellation_found: 'discoveries',
        lore_discovered:     'discoveries',
        achievement_unlocked:'discoveries',
        prestige_ascended:   'discoveries',
        time_capsule_buried: 'discoveries',
        time_capsule_found:  'discoveries',
        quest_completed:     'adventures',
        card_game_won:       'daily_life',
        season_changed:      'daily_life',
        world_event:         'adventures'
    };

    // ---------------------------------------------------------------------------
    // SEEDED PRNG
    // ---------------------------------------------------------------------------

    function mulberry32(seed) {
        return function() {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // ---------------------------------------------------------------------------
    // TEMPLATE SUBSTITUTION
    // ---------------------------------------------------------------------------

    function fillTemplate(template, context) {
        var result = template;
        for (var key in context) {
            if (context.hasOwnProperty(key)) {
                result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), context[key]);
            }
        }
        // Clean up any unreplaced placeholders
        result = result.replace(/\{[^}]+\}/g, '...');
        return result;
    }

    // ---------------------------------------------------------------------------
    // ENTRY TEMPLATES — 60+ narrative templates across all event types
    // ---------------------------------------------------------------------------

    var ENTRY_TEMPLATES = {

        zone_visit: {
            category: 'adventures',
            templates: [
                'Today I set foot in {zone} for the first time. {impression}',
                'My wandering took me to {zone}. {impression}',
                'I crossed into {zone} as the light shifted. The air felt different here. {impression}',
                'A new path led me to {zone}. {impression}',
                'I finally made it to {zone}. The journey was worth every step. {impression}'
            ],
            defaults: {
                impression: 'There is something unique about this place.',
                zone: 'an unknown region'
            }
        },

        fish_caught: {
            category: 'daily_life',
            templates: [
                'While fishing in {zone}, I caught a {fishName}. {qualityText}',
                'The waters of {zone} yielded a {fishName} today. {qualityText}',
                'A patient wait by the {zone} shore was rewarded with a {fishName}. {qualityText}',
                'I dropped my line into the {zone} waters and pulled up a {fishName}. {qualityText}',
                'The fish were running well in {zone}. A fine {fishName} took my bait. {qualityText}'
            ],
            qualityTexts: {
                common: 'A modest catch, but satisfying.',
                rare: 'A rare find — the scales shimmered in the light.',
                epic: 'A legendary specimen! The other anglers looked on in awe.'
            },
            defaults: {
                fishName: 'fish',
                zone: 'the lake',
                qualityText: 'A satisfying catch.'
            }
        },

        dungeon_cleared: {
            category: 'adventures',
            templates: [
                'I descended into the depths of {dungeonName} and emerged victorious. {rewardText}',
                '{dungeonName} has been cleared. The darkness yielded to my perseverance. {rewardText}',
                'After {floors} floors of peril, {dungeonName} lies conquered. {rewardText}',
                'The ancient halls of {dungeonName} echoed with my footsteps as I claimed the final room. {rewardText}',
                'I navigated the treacherous {dungeonName} from entrance to final boss. {rewardText}'
            ],
            defaults: {
                dungeonName: 'the dungeon',
                floors: 'several',
                rewardText: 'The spoils were worthy of the challenge.'
            }
        },

        constellation_found: {
            category: 'discoveries',
            templates: [
                'Under the clear skies of {zone}, I traced the outline of {constellationName}. {loreText}',
                'Gazing up from {zone}, I recognized the pattern of {constellationName} among the stars. {loreText}',
                'The stars aligned tonight — I discovered {constellationName}. {loreText}',
                'In the quiet of {zone}, I mapped {constellationName} for the first time. {loreText}',
                'My sky journal grows: {constellationName} is now charted. {loreText}'
            ],
            defaults: {
                constellationName: 'a new constellation',
                zone: 'the open sky',
                loreText: 'The ancients must have looked upon these same stars.'
            }
        },

        npc_befriended: {
            category: 'social',
            templates: [
                'I spent time with {npcName} today. {friendNote}',
                '{npcName} and I shared stories, and I feel we have become true friends. {friendNote}',
                'A conversation with {npcName} turned into something deeper. {friendNote}',
                'After all our interactions, {npcName} considers me a friend. {friendNote}',
                'The bond between {npcName} and me has grown strong. {friendNote}'
            ],
            defaults: {
                npcName: 'a citizen',
                friendNote: 'ZION grows warmer with every connection made.'
            }
        },

        quest_completed: {
            category: 'adventures',
            templates: [
                'I completed the quest "{questName}". {rewardText}',
                'After much effort, "{questName}" is finished. {rewardText}',
                'The task known as "{questName}" is done. {rewardText}',
                'I delivered on my promise for "{questName}". {rewardText}',
                '"{questName}" — another quest added to my growing record. {rewardText}'
            ],
            defaults: {
                questName: 'an unnamed quest',
                rewardText: 'The reward was fair for the work done.'
            }
        },

        item_crafted: {
            category: 'crafting',
            templates: [
                'I crafted a {itemName} today. {craftNote}',
                'Using gathered materials, I produced a {itemName}. {craftNote}',
                'My hands worked the materials into a fine {itemName}. {craftNote}',
                'A {itemName} now sits in my inventory, made by my own effort. {craftNote}',
                'The workshop yielded a new {itemName}. {craftNote}'
            ],
            defaults: {
                itemName: 'item',
                craftNote: 'Each crafted piece is a small act of creation.'
            }
        },

        trade_completed: {
            category: 'social',
            templates: [
                'I completed a trade with {partnerName}. {tradeNote}',
                'An exchange of goods with {partnerName} left both parties satisfied. {tradeNote}',
                '{partnerName} and I struck a fair deal today. {tradeNote}',
                'Trade flows through ZION, and today I was part of it — dealing with {partnerName}. {tradeNote}',
                'The market brought {partnerName} and me together for a mutually beneficial exchange. {tradeNote}'
            ],
            defaults: {
                partnerName: 'another citizen',
                tradeNote: 'Commerce keeps ZION alive.'
            }
        },

        time_capsule_buried: {
            category: 'discoveries',
            templates: [
                'I buried a time capsule in {zone}. {capsuleNote}',
                'In {zone}, I sealed a capsule with memories of this moment. {capsuleNote}',
                'A future version of me — or someone else — will find what I left in {zone}. {capsuleNote}',
                'I entrusted a time capsule to the earth of {zone}. {capsuleNote}',
                'Hidden in {zone}, my time capsule waits. {capsuleNote}'
            ],
            defaults: {
                zone: 'an undisclosed location',
                capsuleNote: 'Some things are worth preserving for the future.'
            }
        },

        time_capsule_found: {
            category: 'discoveries',
            templates: [
                'I discovered a time capsule buried in {zone}! {capsuleNote}',
                'While exploring {zone}, I unearthed an old time capsule. {capsuleNote}',
                'Someone left a time capsule in {zone}, and I found it. {capsuleNote}',
                'The ground of {zone} gave up a hidden treasure — a time capsule. {capsuleNote}',
                'A time capsule from {zone} fell into my hands today. {capsuleNote}'
            ],
            defaults: {
                zone: 'the wilds',
                capsuleNote: 'A connection across time — ZION holds many such surprises.'
            }
        },

        card_game_won: {
            category: 'daily_life',
            templates: [
                'I won a card game against {opponentName}. {gameNote}',
                'The cards favored me today — I defeated {opponentName}. {gameNote}',
                'My deck proved superior against {opponentName} in today\'s match. {gameNote}',
                '{opponentName} put up a good fight, but I claimed victory. {gameNote}',
                'A tense card battle with {opponentName} ended in my favor. {gameNote}'
            ],
            defaults: {
                opponentName: 'an opponent',
                gameNote: 'Victory in the card game requires wit and a bit of luck.'
            }
        },

        house_decorated: {
            category: 'daily_life',
            templates: [
                'I added a {itemName} to my home. {decorNote}',
                'My dwelling now features a fine {itemName}. {decorNote}',
                'I spent time decorating — a {itemName} now graces my space. {decorNote}',
                'The {itemName} I placed today makes my home feel more alive. {decorNote}',
                'Home improvement continues: I installed a {itemName}. {decorNote}'
            ],
            defaults: {
                itemName: 'decoration',
                decorNote: 'A home reflects its inhabitant\'s soul.'
            }
        },

        meal_cooked: {
            category: 'crafting',
            templates: [
                'I cooked a {mealName} today. {mealNote}',
                'The kitchen yielded a hearty {mealName}. {mealNote}',
                'Using fresh ingredients, I prepared a {mealName}. {mealNote}',
                'A {mealName} made from scratch — simple pleasures in ZION. {mealNote}',
                'My cooking skills produced a {mealName} today. {mealNote}'
            ],
            defaults: {
                mealName: 'meal',
                mealNote: 'Good food nourishes body and spirit alike.'
            }
        },

        lore_discovered: {
            category: 'discoveries',
            templates: [
                'I uncovered a piece of ZION\'s history: "{loreName}". {loreNote}',
                'The archives revealed something remarkable — "{loreName}". {loreNote}',
                'A hidden scroll told me about "{loreName}". {loreNote}',
                'I learned the lore of "{loreName}" today. {loreNote}',
                'The knowledge of "{loreName}" is now mine. {loreNote}'
            ],
            defaults: {
                loreName: 'ancient lore',
                loreNote: 'Every discovery adds to the great tapestry of knowledge.'
            }
        },

        achievement_unlocked: {
            category: 'discoveries',
            templates: [
                'Achievement unlocked: {achievementName}. {achieveNote}',
                'I earned the achievement "{achievementName}" today. {achieveNote}',
                'The feat of {achievementName} is now mine to claim. {achieveNote}',
                'A new mark on my record: {achievementName}. {achieveNote}',
                'I accomplished something worthy of note — {achievementName}. {achieveNote}'
            ],
            defaults: {
                achievementName: 'an achievement',
                achieveNote: 'Progress is measured in moments like these.'
            }
        },

        prestige_ascended: {
            category: 'discoveries',
            templates: [
                'I ascended to Prestige {prestigeLevel}. {prestigeNote}',
                'A new chapter begins — I am now Prestige {prestigeLevel}. {prestigeNote}',
                'The journey to Prestige {prestigeLevel} is complete. {prestigeNote}',
                'Prestige {prestigeLevel} claimed. The path ahead grows steeper and more rewarding. {prestigeNote}',
                'I reached Prestige rank {prestigeLevel} today. {prestigeNote}'
            ],
            defaults: {
                prestigeLevel: '1',
                prestigeNote: 'Each prestige is a rebirth with greater understanding.'
            }
        },

        guild_joined: {
            category: 'social',
            templates: [
                'I joined {guildName} today. {guildNote}',
                'My application to {guildName} was accepted. {guildNote}',
                '{guildName} welcomed me as a new member. {guildNote}',
                'I am now a proud member of {guildName}. {guildNote}',
                'A new chapter of fellowship begins — I joined {guildName}. {guildNote}'
            ],
            defaults: {
                guildName: 'a guild',
                guildNote: 'Together we are stronger than apart.'
            }
        },

        vote_cast: {
            category: 'social',
            templates: [
                'I cast my vote in the {proposalName} referendum. {voteNote}',
                'My voice was heard today — I voted on {proposalName}. {voteNote}',
                'ZION\'s democracy in action: I participated in the vote for {proposalName}. {voteNote}',
                'I exercised my civic duty and voted on {proposalName}. {voteNote}',
                'The poll for {proposalName} received my honest vote today. {voteNote}'
            ],
            defaults: {
                proposalName: 'a community proposal',
                voteNote: 'Every vote shapes the world we share.'
            }
        },

        mentor_session: {
            category: 'social',
            templates: [
                'I shared a mentor session with {partnerName}. {mentorNote}',
                'Teaching {partnerName} reminded me of how far I have come. {mentorNote}',
                '{partnerName} and I spent time in focused learning together. {mentorNote}',
                'A productive mentor session with {partnerName} — knowledge freely given. {mentorNote}',
                'I guided {partnerName} through {topic} today. {mentorNote}'
            ],
            defaults: {
                partnerName: 'a fellow citizen',
                topic: 'a new skill',
                mentorNote: 'Wisdom grows when it is shared.'
            }
        },

        building_placed: {
            category: 'adventures',
            templates: [
                'I placed a {buildingName} in {zone}. {buildNote}',
                'Construction complete: a {buildingName} now stands in {zone}. {buildNote}',
                'I contributed to {zone} by building a {buildingName}. {buildNote}',
                'The landscape of {zone} changed today — I added a {buildingName}. {buildNote}',
                'My {buildingName} is now part of {zone}. {buildNote}'
            ],
            defaults: {
                buildingName: 'structure',
                zone: 'the world',
                buildNote: 'Every building shapes the world a little more.'
            }
        },

        season_changed: {
            category: 'daily_life',
            templates: [
                'The season turned to {newSeason} today. {seasonNote}',
                '{newSeason} has arrived in ZION. {seasonNote}',
                'I watched the world shift as {newSeason} replaced {oldSeason}. {seasonNote}',
                'A new season begins — {newSeason} brings its own rhythm. {seasonNote}',
                'The calendar turned to {newSeason}. {seasonNote}'
            ],
            defaults: {
                newSeason: 'a new season',
                oldSeason: 'the previous season',
                seasonNote: 'The seasons remind us that change is the nature of all things.'
            }
        },

        world_event: {
            category: 'adventures',
            templates: [
                'A world event unfolded today: {eventName}. {eventNote}',
                'I witnessed {eventName} — a moment that affected all of ZION. {eventNote}',
                '{eventName} swept through the world today. {eventNote}',
                'The world event {eventName} is one I will not forget. {eventNote}',
                'History was made today with {eventName}. {eventNote}'
            ],
            defaults: {
                eventName: 'a remarkable event',
                eventNote: 'Events like these bind ZION\'s citizens together.'
            }
        }

    };

    // ---------------------------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------------------------

    function ensurePlayerJournal(state, playerId) {
        if (!state.players) {
            state.players = {};
        }
        if (!state.players[playerId]) {
            state.players[playerId] = {};
        }
        if (!state.players[playerId].journal) {
            state.players[playerId].journal = [];
        }
        return state.players[playerId].journal;
    }

    function getJournal(state, playerId) {
        if (!state.players || !state.players[playerId] || !state.players[playerId].journal) {
            return [];
        }
        return state.players[playerId].journal;
    }

    function generateEntryId(playerId, tick) {
        return 'journal_' + playerId + '_' + tick + '_' + Math.floor(Math.random() * 100000);
    }

    function selectTemplate(templates, seed) {
        var rng = mulberry32(seed >>> 0);
        var idx = Math.floor(rng() * templates.length);
        return templates[idx];
    }

    // ---------------------------------------------------------------------------
    // tickToDate
    // ---------------------------------------------------------------------------

    function tickToDate(tick) {
        var t = Math.max(0, Math.floor(tick));
        var day = Math.floor(t / TICKS_PER_DAY) + 1;
        var seasonIndex = Math.floor(t / TICKS_PER_SEASON) % SEASONS.length;
        var year = Math.floor(t / TICKS_PER_YEAR) + 1;
        var season = SEASONS[seasonIndex];
        return 'Day ' + day + ', ' + season + ' of Year ' + year;
    }

    // ---------------------------------------------------------------------------
    // addEntry
    // ---------------------------------------------------------------------------

    function addEntry(state, playerId, eventType, context, tick) {
        var journal = ensurePlayerJournal(state, playerId);
        var templateDef = ENTRY_TEMPLATES[eventType];

        // Unknown event type — create a generic entry
        if (!templateDef) {
            var genericText = 'Something notable happened: ' + (context.description || eventType) + '.';
            var genericEntry = {
                id: generateEntryId(playerId, tick),
                tick: tick,
                date: tickToDate(tick),
                zone: context.zone || 'ZION',
                eventType: eventType,
                category: EVENT_CATEGORY_MAP[eventType] || 'adventures',
                text: genericText,
                pinned: false,
                context: context || {}
            };
            journal.push(genericEntry);
            return { entry: genericEntry, entryId: genericEntry.id };
        }

        // Merge defaults into context
        var fullContext = {};
        if (templateDef.defaults) {
            for (var dk in templateDef.defaults) {
                if (templateDef.defaults.hasOwnProperty(dk)) {
                    fullContext[dk] = templateDef.defaults[dk];
                }
            }
        }
        for (var ck in context) {
            if (context.hasOwnProperty(ck)) {
                fullContext[ck] = context[ck];
            }
        }

        // Handle qualityText special case for fish_caught
        if (eventType === 'fish_caught' && context.rarity && templateDef.qualityTexts) {
            var qt = templateDef.qualityTexts[context.rarity];
            if (qt) {
                fullContext.qualityText = qt;
            }
        }

        // Select template using tick + playerId as seed
        var seed = 0;
        for (var i = 0; i < playerId.length; i++) {
            seed = (seed * 31 + playerId.charCodeAt(i)) | 0;
        }
        seed = (seed ^ tick) | 0;

        var template = selectTemplate(templateDef.templates, seed);
        var text = fillTemplate(template, fullContext);

        var category = EVENT_CATEGORY_MAP[eventType] || templateDef.category || 'adventures';

        var entry = {
            id: generateEntryId(playerId, tick),
            tick: tick,
            date: tickToDate(tick),
            zone: fullContext.zone || 'ZION',
            eventType: eventType,
            category: category,
            text: text,
            pinned: false,
            context: fullContext
        };

        journal.push(entry);
        // Keep journal sorted by tick ascending
        journal.sort(function(a, b) { return a.tick - b.tick; });

        return { entry: entry, entryId: entry.id };
    }

    // ---------------------------------------------------------------------------
    // getEntries
    // ---------------------------------------------------------------------------

    function getEntries(state, playerId, options) {
        var journal = getJournal(state, playerId);
        options = options || {};

        var result = journal.slice(); // copy

        // Filter by category
        if (options.category) {
            result = result.filter(function(e) { return e.category === options.category; });
        }

        // Filter by zone
        if (options.zone) {
            result = result.filter(function(e) { return e.zone === options.zone; });
        }

        // Filter by eventType
        if (options.eventType) {
            result = result.filter(function(e) { return e.eventType === options.eventType; });
        }

        // Filter by tick range
        if (typeof options.fromTick === 'number') {
            result = result.filter(function(e) { return e.tick >= options.fromTick; });
        }
        if (typeof options.toTick === 'number') {
            result = result.filter(function(e) { return e.tick <= options.toTick; });
        }

        // Pagination: offset then limit
        if (typeof options.offset === 'number' && options.offset > 0) {
            result = result.slice(options.offset);
        }
        if (typeof options.limit === 'number' && options.limit > 0) {
            result = result.slice(0, options.limit);
        }

        return result;
    }

    // ---------------------------------------------------------------------------
    // getEntry
    // ---------------------------------------------------------------------------

    function getEntry(state, playerId, entryId) {
        var journal = getJournal(state, playerId);
        for (var i = 0; i < journal.length; i++) {
            if (journal[i].id === entryId) {
                return journal[i];
            }
        }
        return null;
    }

    // ---------------------------------------------------------------------------
    // getRecentEntries
    // ---------------------------------------------------------------------------

    function getRecentEntries(state, playerId, count) {
        var journal = getJournal(state, playerId);
        var n = typeof count === 'number' ? Math.max(0, count) : 10;
        if (n === 0) {
            return [];
        }
        return journal.slice(-n);
    }

    // ---------------------------------------------------------------------------
    // getEntriesByZone
    // ---------------------------------------------------------------------------

    function getEntriesByZone(state, playerId, zone) {
        return getEntries(state, playerId, { zone: zone });
    }

    // ---------------------------------------------------------------------------
    // getEntriesByCategory
    // ---------------------------------------------------------------------------

    function getEntriesByCategory(state, playerId, category) {
        return getEntries(state, playerId, { category: category });
    }

    // ---------------------------------------------------------------------------
    // searchEntries
    // ---------------------------------------------------------------------------

    function searchEntries(state, playerId, query) {
        if (!query || typeof query !== 'string') {
            return [];
        }
        var lowerQuery = query.toLowerCase();
        var journal = getJournal(state, playerId);
        return journal.filter(function(e) {
            return e.text.toLowerCase().indexOf(lowerQuery) !== -1;
        });
    }

    // ---------------------------------------------------------------------------
    // getChapter / getChapterCount
    // ---------------------------------------------------------------------------

    function getChapter(state, playerId, chapterNumber) {
        var journal = getJournal(state, playerId);
        var chapter = Math.max(1, Math.floor(chapterNumber));
        var startIndex = (chapter - 1) * ENTRIES_PER_CHAPTER;
        return journal.slice(startIndex, startIndex + ENTRIES_PER_CHAPTER);
    }

    function getChapterCount(state, playerId) {
        var journal = getJournal(state, playerId);
        if (journal.length === 0) {
            return 0;
        }
        return Math.ceil(journal.length / ENTRIES_PER_CHAPTER);
    }

    // ---------------------------------------------------------------------------
    // getStats
    // ---------------------------------------------------------------------------

    function getStats(state, playerId) {
        var journal = getJournal(state, playerId);

        var entriesByCategory = {};
        var entriesByZone = {};
        var entriesByEventType = {};

        for (var i = 0; i < journal.length; i++) {
            var e = journal[i];

            // By category
            if (!entriesByCategory[e.category]) {
                entriesByCategory[e.category] = 0;
            }
            entriesByCategory[e.category]++;

            // By zone
            var zone = e.zone || 'ZION';
            if (!entriesByZone[zone]) {
                entriesByZone[zone] = 0;
            }
            entriesByZone[zone]++;

            // By event type
            if (!entriesByEventType[e.eventType]) {
                entriesByEventType[e.eventType] = 0;
            }
            entriesByEventType[e.eventType]++;
        }

        // Favorite zone (most visited)
        var favoriteZone = null;
        var maxZoneCount = 0;
        for (var z in entriesByZone) {
            if (entriesByZone.hasOwnProperty(z) && entriesByZone[z] > maxZoneCount) {
                maxZoneCount = entriesByZone[z];
                favoriteZone = z;
            }
        }

        // Most common event
        var mostCommonEvent = null;
        var maxEventCount = 0;
        for (var ev in entriesByEventType) {
            if (entriesByEventType.hasOwnProperty(ev) && entriesByEventType[ev] > maxEventCount) {
                maxEventCount = entriesByEventType[ev];
                mostCommonEvent = ev;
            }
        }

        return {
            totalEntries: journal.length,
            entriesByCategory: entriesByCategory,
            entriesByZone: entriesByZone,
            entriesByEventType: entriesByEventType,
            favoriteZone: favoriteZone,
            mostCommonEvent: mostCommonEvent
        };
    }

    // ---------------------------------------------------------------------------
    // generateSummary
    // ---------------------------------------------------------------------------

    function generateSummary(state, playerId, fromTick, toTick) {
        var filtered = getEntries(state, playerId, { fromTick: fromTick, toTick: toTick });

        if (filtered.length === 0) {
            return 'Nothing of note happened during this period.';
        }

        // Count by event type
        var counts = {};
        var zones = {};
        for (var i = 0; i < filtered.length; i++) {
            var e = filtered[i];
            counts[e.eventType] = (counts[e.eventType] || 0) + 1;
            if (e.zone) {
                zones[e.zone] = true;
            }
        }

        var parts = [];
        var zoneList = Object.keys(zones);

        if (zoneList.length > 0) {
            parts.push('visited ' + zoneList.length + ' zone' + (zoneList.length !== 1 ? 's' : ''));
        }
        if (counts.fish_caught) {
            parts.push('caught ' + counts.fish_caught + ' fish');
        }
        if (counts.quest_completed) {
            parts.push('completed ' + counts.quest_completed + ' quest' + (counts.quest_completed !== 1 ? 's' : ''));
        }
        if (counts.npc_befriended) {
            parts.push('made ' + counts.npc_befriended + ' new friend' + (counts.npc_befriended !== 1 ? 's' : ''));
        }
        if (counts.item_crafted) {
            parts.push('crafted ' + counts.item_crafted + ' item' + (counts.item_crafted !== 1 ? 's' : ''));
        }
        if (counts.meal_cooked) {
            parts.push('cooked ' + counts.meal_cooked + ' meal' + (counts.meal_cooked !== 1 ? 's' : ''));
        }
        if (counts.dungeon_cleared) {
            parts.push('cleared ' + counts.dungeon_cleared + ' dungeon' + (counts.dungeon_cleared !== 1 ? 's' : ''));
        }
        if (counts.lore_discovered) {
            parts.push('discovered ' + counts.lore_discovered + ' piece' + (counts.lore_discovered !== 1 ? 's' : '') + ' of lore');
        }
        if (counts.achievement_unlocked) {
            parts.push('unlocked ' + counts.achievement_unlocked + ' achievement' + (counts.achievement_unlocked !== 1 ? 's' : ''));
        }
        if (counts.trade_completed) {
            parts.push('completed ' + counts.trade_completed + ' trade' + (counts.trade_completed !== 1 ? 's' : ''));
        }
        if (counts.guild_joined) {
            parts.push('joined ' + counts.guild_joined + ' guild' + (counts.guild_joined !== 1 ? 's' : ''));
        }
        if (counts.constellation_found) {
            parts.push('found ' + counts.constellation_found + ' constellation' + (counts.constellation_found !== 1 ? 's' : ''));
        }
        if (counts.building_placed) {
            parts.push('placed ' + counts.building_placed + ' building' + (counts.building_placed !== 1 ? 's' : ''));
        }
        if (counts.mentor_session) {
            parts.push('held ' + counts.mentor_session + ' mentor session' + (counts.mentor_session !== 1 ? 's' : ''));
        }
        if (counts.vote_cast) {
            parts.push('cast ' + counts.vote_cast + ' vote' + (counts.vote_cast !== 1 ? 's' : ''));
        }
        if (counts.world_event) {
            parts.push('witnessed ' + counts.world_event + ' world event' + (counts.world_event !== 1 ? 's' : ''));
        }
        if (counts.season_changed) {
            parts.push('lived through ' + counts.season_changed + ' season change' + (counts.season_changed !== 1 ? 's' : ''));
        }
        if (counts.card_game_won) {
            parts.push('won ' + counts.card_game_won + ' card game' + (counts.card_game_won !== 1 ? 's' : ''));
        }
        if (counts.time_capsule_buried) {
            parts.push('buried ' + counts.time_capsule_buried + ' time capsule' + (counts.time_capsule_buried !== 1 ? 's' : ''));
        }
        if (counts.time_capsule_found) {
            parts.push('found ' + counts.time_capsule_found + ' time capsule' + (counts.time_capsule_found !== 1 ? 's' : ''));
        }
        if (counts.house_decorated) {
            parts.push('decorated your home ' + counts.house_decorated + ' time' + (counts.house_decorated !== 1 ? 's' : ''));
        }
        if (counts.prestige_ascended) {
            parts.push('ascended ' + counts.prestige_ascended + ' prestige level' + (counts.prestige_ascended !== 1 ? 's' : ''));
        }
        if (counts.zone_visit) {
            parts.push('explored ' + counts.zone_visit + ' new zone' + (counts.zone_visit !== 1 ? 's' : ''));
        }

        if (parts.length === 0) {
            return 'During this period, ' + filtered.length + ' event' + (filtered.length !== 1 ? 's were' : ' was') + ' recorded in your journal.';
        }

        var summary = 'During this period, you ';
        if (parts.length === 1) {
            summary += parts[0] + '.';
        } else if (parts.length === 2) {
            summary += parts[0] + ' and ' + parts[1] + '.';
        } else {
            summary += parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1] + '.';
        }

        return summary;
    }

    // ---------------------------------------------------------------------------
    // exportJournal
    // ---------------------------------------------------------------------------

    function exportJournal(state, playerId) {
        var journal = getJournal(state, playerId);
        if (journal.length === 0) {
            return '=== ' + playerId + '\'s Journal ===\n\n(No entries yet.)';
        }

        var lines = [];
        lines.push('=== ' + playerId + '\'s Journal ===');
        lines.push('Total entries: ' + journal.length);
        lines.push('');

        var chapterCount = getChapterCount(state, playerId);
        for (var c = 1; c <= chapterCount; c++) {
            lines.push('--- Chapter ' + c + ' ---');
            lines.push('');
            var entries = getChapter(state, playerId, c);
            for (var i = 0; i < entries.length; i++) {
                var e = entries[i];
                var pin = e.pinned ? ' [PINNED]' : '';
                lines.push('[' + e.date + ']' + pin);
                lines.push(e.text);
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    // ---------------------------------------------------------------------------
    // deleteEntry
    // ---------------------------------------------------------------------------

    function deleteEntry(state, playerId, entryId) {
        var journal = ensurePlayerJournal(state, playerId);
        var beforeLen = journal.length;
        for (var i = 0; i < journal.length; i++) {
            if (journal[i].id === entryId) {
                journal.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    // ---------------------------------------------------------------------------
    // pinEntry / getPinnedEntries
    // ---------------------------------------------------------------------------

    function pinEntry(state, playerId, entryId) {
        var entry = getEntry(state, playerId, entryId);
        if (!entry) {
            return false;
        }
        entry.pinned = true;
        return true;
    }

    function getPinnedEntries(state, playerId) {
        var journal = getJournal(state, playerId);
        return journal.filter(function(e) { return e.pinned === true; });
    }

    // ---------------------------------------------------------------------------
    // getWordCount
    // ---------------------------------------------------------------------------

    function getWordCount(state, playerId) {
        var journal = getJournal(state, playerId);
        var total = 0;
        for (var i = 0; i < journal.length; i++) {
            var words = journal[i].text.trim().split(/\s+/);
            if (words.length === 1 && words[0] === '') {
                continue;
            }
            total += words.length;
        }
        return total;
    }

    // ---------------------------------------------------------------------------
    // EXPORTS
    // ---------------------------------------------------------------------------

    exports.ENTRY_TEMPLATES    = ENTRY_TEMPLATES;
    exports.JOURNAL_CATEGORIES = JOURNAL_CATEGORIES;
    exports.EVENT_CATEGORY_MAP = EVENT_CATEGORY_MAP;
    exports.ENTRIES_PER_CHAPTER = ENTRIES_PER_CHAPTER;

    exports.tickToDate          = tickToDate;
    exports.fillTemplate        = fillTemplate;
    exports.addEntry            = addEntry;
    exports.getEntries          = getEntries;
    exports.getEntry            = getEntry;
    exports.getRecentEntries    = getRecentEntries;
    exports.getEntriesByZone    = getEntriesByZone;
    exports.getEntriesByCategory= getEntriesByCategory;
    exports.searchEntries       = searchEntries;
    exports.getChapter          = getChapter;
    exports.getChapterCount     = getChapterCount;
    exports.getStats            = getStats;
    exports.generateSummary     = generateSummary;
    exports.exportJournal       = exportJournal;
    exports.deleteEntry         = deleteEntry;
    exports.pinEntry            = pinEntry;
    exports.getPinnedEntries    = getPinnedEntries;
    exports.getWordCount        = getWordCount;

})(typeof module !== 'undefined' ? module.exports : (window.Journal = {}));
