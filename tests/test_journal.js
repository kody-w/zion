/**
 * tests/test_journal.js
 * 100+ tests for the ZION Personal Narrative Journal system.
 * Run with: node tests/test_journal.js
 */

'use strict';

var Journal = require('../src/js/journal');

// ---------------------------------------------------------------------------
// Minimal test framework (as specified)
// ---------------------------------------------------------------------------
var passed = 0;
var failed = 0;

function assert(condition, msg) {
    if (condition) {
        passed++;
        process.stdout.write('  PASS: ' + msg + '\n');
    } else {
        failed++;
        process.stdout.write('  FAIL: ' + msg + '\n');
    }
}

function suite(name) {
    process.stdout.write('\n--- ' + name + ' ---\n');
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeState() {
    return { players: {} };
}

var UID_COUNTER = 0;
function uid() {
    return 'player_' + (++UID_COUNTER);
}

function makeContext(overrides) {
    var base = {
        zone: 'Nexus',
        fishName: 'Silverfish',
        rarity: 'common',
        npcName: 'Willow',
        questName: 'The First Step',
        dungeonName: 'Iron Vault',
        floors: 3,
        constellationName: 'The Wanderer',
        itemName: 'Iron Dagger',
        partnerName: 'Trader Mak',
        capsuleNote: 'For whoever finds this.',
        opponentName: 'Card Master Tao',
        mealName: 'Mushroom Stew',
        loreName: 'The Founding of ZION',
        achievementName: 'First Blood',
        prestigeLevel: '2',
        guildName: 'The Builders Guild',
        proposalName: 'Clean Water Initiative',
        topic: 'alchemy',
        buildingName: 'Market Stall',
        newSeason: 'Winter',
        oldSeason: 'Autumn',
        eventName: 'The Great Storm',
        decorNote: 'Cozy.',
        craftNote: 'Well made.',
        tradeNote: 'Fair deal.',
        mealNote: 'Delicious.',
        loreNote: 'Fascinating.',
        achieveNote: 'Hard earned.',
        prestigeNote: 'A new beginning.',
        guildNote: 'Strength in numbers.',
        voteNote: 'My voice counts.',
        mentorNote: 'Knowledge shared.',
        buildNote: 'A mark on the world.',
        seasonNote: 'Change is constant.',
        eventNote: 'A day to remember.',
        gameNote: 'Skill and luck.',
        friendNote: 'A new bond.',
        rewardText: 'Worth every step.',
        impression: 'Breathtaking.',
        qualityText: 'A modest catch, but satisfying.',
        loreText: 'The ancients knew.'
    };
    overrides = overrides || {};
    for (var k in overrides) {
        if (overrides.hasOwnProperty(k)) {
            base[k] = overrides[k];
        }
    }
    return base;
}

var ALL_EVENT_TYPES = [
    'zone_visit', 'fish_caught', 'dungeon_cleared', 'constellation_found',
    'npc_befriended', 'quest_completed', 'item_crafted', 'trade_completed',
    'time_capsule_buried', 'time_capsule_found', 'card_game_won',
    'house_decorated', 'meal_cooked', 'lore_discovered', 'achievement_unlocked',
    'prestige_ascended', 'guild_joined', 'vote_cast', 'mentor_session',
    'building_placed', 'season_changed', 'world_event'
];

// ---------------------------------------------------------------------------
// SUITE 1 — Module shape
// ---------------------------------------------------------------------------
suite('Module Shape');

assert(typeof Journal === 'object' && Journal !== null, 'Journal module is an object');
assert(typeof Journal.ENTRY_TEMPLATES === 'object', 'ENTRY_TEMPLATES is exported');
assert(typeof Journal.JOURNAL_CATEGORIES === 'object', 'JOURNAL_CATEGORIES is exported');
assert(typeof Journal.EVENT_CATEGORY_MAP === 'object', 'EVENT_CATEGORY_MAP is exported');
assert(typeof Journal.addEntry === 'function', 'addEntry is a function');
assert(typeof Journal.getEntries === 'function', 'getEntries is a function');
assert(typeof Journal.getEntry === 'function', 'getEntry is a function');
assert(typeof Journal.getRecentEntries === 'function', 'getRecentEntries is a function');
assert(typeof Journal.getEntriesByZone === 'function', 'getEntriesByZone is a function');
assert(typeof Journal.getEntriesByCategory === 'function', 'getEntriesByCategory is a function');
assert(typeof Journal.searchEntries === 'function', 'searchEntries is a function');
assert(typeof Journal.getChapter === 'function', 'getChapter is a function');
assert(typeof Journal.getChapterCount === 'function', 'getChapterCount is a function');
assert(typeof Journal.getStats === 'function', 'getStats is a function');
assert(typeof Journal.generateSummary === 'function', 'generateSummary is a function');
assert(typeof Journal.exportJournal === 'function', 'exportJournal is a function');
assert(typeof Journal.deleteEntry === 'function', 'deleteEntry is a function');
assert(typeof Journal.pinEntry === 'function', 'pinEntry is a function');
assert(typeof Journal.getPinnedEntries === 'function', 'getPinnedEntries is a function');
assert(typeof Journal.getWordCount === 'function', 'getWordCount is a function');
assert(typeof Journal.tickToDate === 'function', 'tickToDate is a function');
assert(typeof Journal.fillTemplate === 'function', 'fillTemplate is a function');

// ---------------------------------------------------------------------------
// SUITE 2 — ENTRY_TEMPLATES completeness
// ---------------------------------------------------------------------------
suite('ENTRY_TEMPLATES Completeness');

var templates = Journal.ENTRY_TEMPLATES;

assert(Object.keys(templates).length >= 22, 'At least 22 event types have templates');

(function() {
    for (var i = 0; i < ALL_EVENT_TYPES.length; i++) {
        var et = ALL_EVENT_TYPES[i];
        assert(templates.hasOwnProperty(et), 'ENTRY_TEMPLATES has key: ' + et);
        if (templates[et]) {
            assert(Array.isArray(templates[et].templates), et + ' has a templates array');
            assert(templates[et].templates.length >= 2, et + ' has at least 2 templates');
        }
    }
})();

// ---------------------------------------------------------------------------
// SUITE 3 — JOURNAL_CATEGORIES
// ---------------------------------------------------------------------------
suite('JOURNAL_CATEGORIES');

var cats = Journal.JOURNAL_CATEGORIES;
assert(cats.adventures === 'adventures', 'category: adventures');
assert(cats.crafting === 'crafting', 'category: crafting');
assert(cats.social === 'social', 'category: social');
assert(cats.discoveries === 'discoveries', 'category: discoveries');
assert(cats.daily_life === 'daily_life', 'category: daily_life');

// ---------------------------------------------------------------------------
// SUITE 4 — tickToDate
// ---------------------------------------------------------------------------
suite('tickToDate');

(function() {
    var d0 = Journal.tickToDate(0);
    assert(typeof d0 === 'string', 'tickToDate returns a string');
    assert(d0.indexOf('Day') !== -1, 'tickToDate includes "Day"');
    assert(d0.indexOf('Year') !== -1, 'tickToDate includes "Year"');

    // tick 0 => Day 1, Spring of Year 1
    assert(d0 === 'Day 1, Spring of Year 1', 'tick 0 => Day 1, Spring of Year 1');

    // tick 24 => Day 2, Spring of Year 1 (one day passed)
    var d1 = Journal.tickToDate(24);
    assert(d1 === 'Day 2, Spring of Year 1', 'tick 24 => Day 2, Spring of Year 1');

    // tick 720 => first tick of Summer (season index 1)
    var dSummer = Journal.tickToDate(720);
    assert(dSummer.indexOf('Summer') !== -1, 'tick 720 is in Summer');

    // tick 1440 => first tick of Autumn
    var dAutumn = Journal.tickToDate(1440);
    assert(dAutumn.indexOf('Autumn') !== -1, 'tick 1440 is in Autumn');

    // tick 2160 => first tick of Winter
    var dWinter = Journal.tickToDate(2160);
    assert(dWinter.indexOf('Winter') !== -1, 'tick 2160 is in Winter');

    // negative ticks handled gracefully
    var dNeg = Journal.tickToDate(-50);
    assert(typeof dNeg === 'string', 'tickToDate handles negative tick');
})();

// ---------------------------------------------------------------------------
// SUITE 5 — fillTemplate
// ---------------------------------------------------------------------------
suite('fillTemplate');

(function() {
    var result = Journal.fillTemplate('Hello {name}!', { name: 'ZION' });
    assert(result === 'Hello ZION!', 'fillTemplate substitutes single key');

    var multi = Journal.fillTemplate('{a} and {b} and {a}', { a: 'fish', b: 'bread' });
    assert(multi === 'fish and bread and fish', 'fillTemplate replaces all occurrences');

    var missing = Journal.fillTemplate('Hello {unknown}!', {});
    assert(missing === 'Hello ...!', 'fillTemplate replaces unknown placeholders with ...');

    var none = Journal.fillTemplate('No placeholders here.', { key: 'val' });
    assert(none === 'No placeholders here.', 'fillTemplate passes through text with no placeholders');

    var empty = Journal.fillTemplate('', { key: 'val' });
    assert(empty === '', 'fillTemplate handles empty template');
})();

// ---------------------------------------------------------------------------
// SUITE 6 — addEntry basics
// ---------------------------------------------------------------------------
suite('addEntry Basics');

(function() {
    var state = makeState();
    var pid = uid();
    var ctx = makeContext({ zone: 'Gardens', fishName: 'Silverfish', rarity: 'common' });
    var result = Journal.addEntry(state, pid, 'fish_caught', ctx, 100);

    assert(typeof result === 'object', 'addEntry returns an object');
    assert(typeof result.entry === 'object', 'result has entry property');
    assert(typeof result.entryId === 'string', 'result has entryId property');
    assert(result.entryId === result.entry.id, 'entryId matches entry.id');

    var entry = result.entry;
    assert(typeof entry.id === 'string', 'entry has id');
    assert(entry.tick === 100, 'entry has correct tick');
    assert(typeof entry.date === 'string', 'entry has date string');
    assert(entry.zone === 'Gardens', 'entry has correct zone');
    assert(entry.eventType === 'fish_caught', 'entry has correct eventType');
    assert(typeof entry.category === 'string', 'entry has category');
    assert(typeof entry.text === 'string' && entry.text.length > 0, 'entry has non-empty text');
    assert(entry.pinned === false, 'entry starts unpinned');
    assert(typeof entry.context === 'object', 'entry has context object');

    // Verify entry is stored
    var allEntries = Journal.getEntries(state, pid);
    assert(allEntries.length === 1, 'journal has 1 entry after addEntry');
})();

// ---------------------------------------------------------------------------
// SUITE 7 — addEntry for all event types
// ---------------------------------------------------------------------------
suite('addEntry for All Event Types');

(function() {
    for (var i = 0; i < ALL_EVENT_TYPES.length; i++) {
        var et = ALL_EVENT_TYPES[i];
        var state = makeState();
        var pid = uid();
        var result = Journal.addEntry(state, pid, et, makeContext(), i * 10);
        assert(typeof result.entry === 'object', 'addEntry works for event type: ' + et);
        assert(result.entry.eventType === et, 'eventType set correctly for: ' + et);
        assert(typeof result.entry.text === 'string' && result.entry.text.length > 0,
            'non-empty text for event type: ' + et);
        assert(typeof result.entry.category === 'string', 'category set for: ' + et);
    }
})();

// ---------------------------------------------------------------------------
// SUITE 8 — Template substitution content
// ---------------------------------------------------------------------------
suite('Template Substitution Content');

(function() {
    var state = makeState();
    var pid = uid();

    // fish_caught with rare rarity
    Journal.addEntry(state, pid, 'fish_caught', makeContext({ fishName: 'GoldCarp', rarity: 'rare', zone: 'Gardens' }), 10);
    var entries = Journal.getEntries(state, pid);
    var text = entries[0].text;
    assert(text.indexOf('GoldCarp') !== -1, 'fish_caught: fishName substituted');
    assert(text.indexOf('Gardens') !== -1 || entries[0].zone === 'Gardens', 'fish_caught: zone substituted');

    // fish_caught with epic rarity
    var state2 = makeState();
    var pid2 = uid();
    Journal.addEntry(state2, pid2, 'fish_caught', makeContext({ fishName: 'LegendFish', rarity: 'epic' }), 5);
    var epicEntry = Journal.getEntries(state2, pid2)[0];
    assert(epicEntry.text.indexOf('LegendFish') !== -1, 'epic fish: fishName in text');
    assert(epicEntry.text.indexOf('legendary') !== -1, 'epic fish: quality text contains "legendary"');

    // npc_befriended substitutes npcName
    var state3 = makeState();
    var pid3 = uid();
    Journal.addEntry(state3, pid3, 'npc_befriended', { npcName: 'Master Kira', friendNote: 'A bond formed.' }, 20);
    var npcEntry = Journal.getEntries(state3, pid3)[0];
    assert(npcEntry.text.indexOf('Master Kira') !== -1, 'npc_befriended: npcName substituted');

    // quest_completed substitutes questName
    var state4 = makeState();
    var pid4 = uid();
    Journal.addEntry(state4, pid4, 'quest_completed', { questName: 'Into the Wilds', rewardText: 'A great reward.' }, 30);
    var questEntry = Journal.getEntries(state4, pid4)[0];
    assert(questEntry.text.indexOf('Into the Wilds') !== -1, 'quest_completed: questName substituted');
})();

// ---------------------------------------------------------------------------
// SUITE 9 — Category assignment
// ---------------------------------------------------------------------------
suite('Category Assignment');

(function() {
    var categoryTests = [
        { et: 'zone_visit',          expected: 'adventures' },
        { et: 'dungeon_cleared',     expected: 'adventures' },
        { et: 'quest_completed',     expected: 'adventures' },
        { et: 'building_placed',     expected: 'adventures' },
        { et: 'world_event',         expected: 'adventures' },
        { et: 'fish_caught',         expected: 'daily_life' },
        { et: 'card_game_won',       expected: 'daily_life' },
        { et: 'season_changed',      expected: 'daily_life' },
        { et: 'house_decorated',     expected: 'daily_life' },
        { et: 'item_crafted',        expected: 'crafting' },
        { et: 'meal_cooked',         expected: 'crafting' },
        { et: 'npc_befriended',      expected: 'social' },
        { et: 'trade_completed',     expected: 'social' },
        { et: 'guild_joined',        expected: 'social' },
        { et: 'vote_cast',           expected: 'social' },
        { et: 'mentor_session',      expected: 'social' },
        { et: 'constellation_found', expected: 'discoveries' },
        { et: 'lore_discovered',     expected: 'discoveries' },
        { et: 'achievement_unlocked',expected: 'discoveries' },
        { et: 'prestige_ascended',   expected: 'discoveries' },
        { et: 'time_capsule_buried', expected: 'discoveries' },
        { et: 'time_capsule_found',  expected: 'discoveries' }
    ];

    for (var i = 0; i < categoryTests.length; i++) {
        var tc = categoryTests[i];
        var state = makeState();
        var pid = uid();
        Journal.addEntry(state, pid, tc.et, makeContext(), i * 5);
        var e = Journal.getEntries(state, pid)[0];
        assert(e.category === tc.expected, tc.et + ' maps to category: ' + tc.expected);
    }
})();

// ---------------------------------------------------------------------------
// SUITE 10 — Unknown event type
// ---------------------------------------------------------------------------
suite('Unknown Event Type');

(function() {
    var state = makeState();
    var pid = uid();
    var result = Journal.addEntry(state, pid, 'totally_unknown_event', { description: 'Something weird happened', zone: 'Wilds' }, 99);
    assert(typeof result.entry === 'object', 'unknown event type returns an entry');
    assert(result.entry.eventType === 'totally_unknown_event', 'eventType preserved for unknown event');
    assert(typeof result.entry.text === 'string', 'unknown event has text');
    assert(Journal.getEntries(state, pid).length === 1, 'entry stored for unknown event type');
})();

// ---------------------------------------------------------------------------
// SUITE 11 — getEntries filtering
// ---------------------------------------------------------------------------
suite('getEntries Filtering');

(function() {
    var state = makeState();
    var pid = uid();

    // Add varied entries
    Journal.addEntry(state, pid, 'fish_caught',         makeContext({ zone: 'Gardens' }),  10);
    Journal.addEntry(state, pid, 'dungeon_cleared',     makeContext({ zone: 'Nexus' }),     20);
    Journal.addEntry(state, pid, 'npc_befriended',      makeContext({ zone: 'Gardens' }),   30);
    Journal.addEntry(state, pid, 'item_crafted',        makeContext({ zone: 'Athenaeum' }), 40);
    Journal.addEntry(state, pid, 'lore_discovered',     makeContext({ zone: 'Athenaeum' }), 50);
    Journal.addEntry(state, pid, 'trade_completed',     makeContext({ zone: 'Agora' }),     60);
    Journal.addEntry(state, pid, 'fish_caught',         makeContext({ zone: 'Agora' }),     70);
    Journal.addEntry(state, pid, 'achievement_unlocked',makeContext({ zone: 'Nexus' }),     80);

    var all = Journal.getEntries(state, pid);
    assert(all.length === 8, 'getEntries returns all 8 entries');

    // Filter by category
    var crafting = Journal.getEntries(state, pid, { category: 'crafting' });
    assert(crafting.length === 1, 'getEntries filters by category: crafting (1 item_crafted)');

    var adventures = Journal.getEntries(state, pid, { category: 'adventures' });
    assert(adventures.length === 1, 'getEntries filters by category: adventures (1 dungeon_cleared)');

    var social = Journal.getEntries(state, pid, { category: 'social' });
    assert(social.length === 2, 'getEntries filters by category: social (npc_befriended + trade)');

    var discoveries = Journal.getEntries(state, pid, { category: 'discoveries' });
    assert(discoveries.length === 2, 'getEntries filters by category: discoveries (lore + achievement)');

    var dailyLife = Journal.getEntries(state, pid, { category: 'daily_life' });
    assert(dailyLife.length === 2, 'getEntries filters by category: daily_life (2 fish_caught)');

    // Filter by zone
    var gardenEntries = Journal.getEntries(state, pid, { zone: 'Gardens' });
    assert(gardenEntries.length === 2, 'getEntries filters by zone: Gardens (2 entries)');

    var nexusEntries = Journal.getEntries(state, pid, { zone: 'Nexus' });
    assert(nexusEntries.length === 2, 'getEntries filters by zone: Nexus (2 entries)');

    // Filter by eventType
    var fishEntries = Journal.getEntries(state, pid, { eventType: 'fish_caught' });
    assert(fishEntries.length === 2, 'getEntries filters by eventType: fish_caught (2)');

    // Filter by tick range
    var earlyEntries = Journal.getEntries(state, pid, { fromTick: 0, toTick: 35 });
    assert(earlyEntries.length === 3, 'getEntries filters by tick range 0-35 (3 entries)');

    var midEntries = Journal.getEntries(state, pid, { fromTick: 30, toTick: 60 });
    assert(midEntries.length === 4, 'getEntries filters by tick range 30-60 includes 4 entries (ticks 30,40,50,60)');

    var lateEntries = Journal.getEntries(state, pid, { fromTick: 70 });
    assert(lateEntries.length === 2, 'getEntries fromTick=70 returns 2 entries');

    // Limit and offset
    var limited = Journal.getEntries(state, pid, { limit: 3 });
    assert(limited.length === 3, 'getEntries limit=3 returns 3 entries');

    var offset = Journal.getEntries(state, pid, { offset: 5 });
    assert(offset.length === 3, 'getEntries offset=5 returns 3 entries (8-5)');

    var limitOffset = Journal.getEntries(state, pid, { offset: 2, limit: 2 });
    assert(limitOffset.length === 2, 'getEntries offset=2 limit=2 returns 2 entries');
})();

// ---------------------------------------------------------------------------
// SUITE 12 — getEntry
// ---------------------------------------------------------------------------
suite('getEntry');

(function() {
    var state = makeState();
    var pid = uid();
    var result = Journal.addEntry(state, pid, 'fish_caught', makeContext(), 42);
    var found = Journal.getEntry(state, pid, result.entryId);
    assert(found !== null, 'getEntry finds existing entry');
    assert(found.id === result.entryId, 'getEntry returns correct entry');

    var notFound = Journal.getEntry(state, pid, 'nonexistent_id');
    assert(notFound === null, 'getEntry returns null for unknown id');

    // Empty journal
    var state2 = makeState();
    var pid2 = uid();
    var nf = Journal.getEntry(state2, pid2, 'any_id');
    assert(nf === null, 'getEntry returns null for empty journal');
})();

// ---------------------------------------------------------------------------
// SUITE 13 — getRecentEntries
// ---------------------------------------------------------------------------
suite('getRecentEntries');

(function() {
    var state = makeState();
    var pid = uid();

    for (var i = 0; i < 10; i++) {
        Journal.addEntry(state, pid, 'fish_caught', makeContext(), i * 10);
    }

    var recent5 = Journal.getRecentEntries(state, pid, 5);
    assert(recent5.length === 5, 'getRecentEntries returns 5 entries');
    assert(recent5[4].tick === 90, 'getRecentEntries last entry is most recent (tick 90)');
    assert(recent5[0].tick === 50, 'getRecentEntries first entry is oldest of the 5 (tick 50)');

    var all10 = Journal.getRecentEntries(state, pid, 10);
    assert(all10.length === 10, 'getRecentEntries returns all 10 when count=10');

    var overshoot = Journal.getRecentEntries(state, pid, 100);
    assert(overshoot.length === 10, 'getRecentEntries caps at journal size when count > total');

    // Edge case: count 0
    var zero = Journal.getRecentEntries(state, pid, 0);
    assert(zero.length === 0, 'getRecentEntries returns empty for count=0');

    // Empty journal
    var state2 = makeState();
    var pid2 = uid();
    var empty = Journal.getRecentEntries(state2, pid2, 5);
    assert(empty.length === 0, 'getRecentEntries returns empty for empty journal');
})();

// ---------------------------------------------------------------------------
// SUITE 14 — getEntriesByZone
// ---------------------------------------------------------------------------
suite('getEntriesByZone');

(function() {
    var state = makeState();
    var pid = uid();

    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Gardens' }),  10);
    Journal.addEntry(state, pid, 'zone_visit',      makeContext({ zone: 'Nexus' }),    20);
    Journal.addEntry(state, pid, 'npc_befriended',  makeContext({ zone: 'Gardens' }), 30);
    Journal.addEntry(state, pid, 'item_crafted',    makeContext({ zone: 'Studio' }),   40);

    var gardenEntries = Journal.getEntriesByZone(state, pid, 'Gardens');
    assert(gardenEntries.length === 2, 'getEntriesByZone returns 2 for Gardens');

    var nexusEntries = Journal.getEntriesByZone(state, pid, 'Nexus');
    assert(nexusEntries.length === 1, 'getEntriesByZone returns 1 for Nexus');

    var missingZone = Journal.getEntriesByZone(state, pid, 'Atlantis');
    assert(missingZone.length === 0, 'getEntriesByZone returns 0 for unknown zone');
})();

// ---------------------------------------------------------------------------
// SUITE 15 — getEntriesByCategory
// ---------------------------------------------------------------------------
suite('getEntriesByCategory');

(function() {
    var state = makeState();
    var pid = uid();

    Journal.addEntry(state, pid, 'fish_caught',     makeContext(), 10);
    Journal.addEntry(state, pid, 'meal_cooked',     makeContext(), 20);
    Journal.addEntry(state, pid, 'item_crafted',    makeContext(), 30);
    Journal.addEntry(state, pid, 'npc_befriended',  makeContext(), 40);
    Journal.addEntry(state, pid, 'lore_discovered', makeContext(), 50);

    var crafting = Journal.getEntriesByCategory(state, pid, 'crafting');
    assert(crafting.length === 2, 'getEntriesByCategory: crafting = 2 (meal + item)');

    var social = Journal.getEntriesByCategory(state, pid, 'social');
    assert(social.length === 1, 'getEntriesByCategory: social = 1 (npc_befriended)');

    var discoveries = Journal.getEntriesByCategory(state, pid, 'discoveries');
    assert(discoveries.length === 1, 'getEntriesByCategory: discoveries = 1 (lore)');

    var adventures = Journal.getEntriesByCategory(state, pid, 'adventures');
    assert(adventures.length === 0, 'getEntriesByCategory: adventures = 0 in this test');

    var notACategory = Journal.getEntriesByCategory(state, pid, 'nonexistent_category');
    assert(notACategory.length === 0, 'getEntriesByCategory returns 0 for unknown category');
})();

// ---------------------------------------------------------------------------
// SUITE 16 — searchEntries
// ---------------------------------------------------------------------------
suite('searchEntries');

(function() {
    var state = makeState();
    var pid = uid();

    // Add entries with known text
    Journal.addEntry(state, pid, 'npc_befriended',  { npcName: 'Aurora', friendNote: 'Wonderful.' }, 10);
    Journal.addEntry(state, pid, 'fish_caught',     { fishName: 'Moonfish', zone: 'Gardens', rarity: 'rare' }, 20);
    Journal.addEntry(state, pid, 'lore_discovered', { loreName: 'The Ancient Pact', loreNote: 'Deep history.' }, 30);

    var found = Journal.searchEntries(state, pid, 'Aurora');
    assert(found.length >= 1, 'searchEntries finds entry containing "Aurora"');

    var moonfish = Journal.searchEntries(state, pid, 'Moonfish');
    assert(moonfish.length >= 1, 'searchEntries finds entry containing "Moonfish"');

    var caseInsensitive = Journal.searchEntries(state, pid, 'aurora');
    assert(caseInsensitive.length >= 1, 'searchEntries is case-insensitive');

    var notFound = Journal.searchEntries(state, pid, 'xyzquuxquux');
    assert(notFound.length === 0, 'searchEntries returns empty for non-matching query');

    // Edge cases
    var emptyQuery = Journal.searchEntries(state, pid, '');
    assert(Array.isArray(emptyQuery), 'searchEntries returns array for empty query');

    var nullQuery = Journal.searchEntries(state, pid, null);
    assert(Array.isArray(nullQuery) && nullQuery.length === 0, 'searchEntries handles null query');

    // Empty journal
    var state2 = makeState();
    var pid2 = uid();
    var emptyJournal = Journal.searchEntries(state2, pid2, 'anything');
    assert(emptyJournal.length === 0, 'searchEntries returns empty for empty journal');
})();

// ---------------------------------------------------------------------------
// SUITE 17 — getChapter / getChapterCount
// ---------------------------------------------------------------------------
suite('getChapter and getChapterCount');

(function() {
    var state = makeState();
    var pid = uid();

    // 0 entries
    assert(Journal.getChapterCount(state, pid) === 0, 'getChapterCount is 0 for empty journal');
    assert(Journal.getChapter(state, pid, 1).length === 0, 'getChapter returns empty for empty journal');

    // Add 25 entries (should create 2 chapters)
    for (var i = 0; i < 25; i++) {
        Journal.addEntry(state, pid, 'fish_caught', makeContext({ zone: 'Gardens' }), i * 10);
    }

    var chCount = Journal.getChapterCount(state, pid);
    assert(chCount === 2, 'getChapterCount is 2 for 25 entries (20 + 5)');

    var ch1 = Journal.getChapter(state, pid, 1);
    assert(ch1.length === 20, 'chapter 1 has 20 entries');

    var ch2 = Journal.getChapter(state, pid, 2);
    assert(ch2.length === 5, 'chapter 2 has 5 entries');

    // Chapter 3 does not exist
    var ch3 = Journal.getChapter(state, pid, 3);
    assert(ch3.length === 0, 'chapter 3 is empty (beyond total)');

    // Exactly 20 entries = 1 chapter
    var state2 = makeState();
    var pid2 = uid();
    for (var j = 0; j < 20; j++) {
        Journal.addEntry(state2, pid2, 'zone_visit', makeContext(), j);
    }
    assert(Journal.getChapterCount(state2, pid2) === 1, 'getChapterCount is 1 for exactly 20 entries');
    assert(Journal.getChapter(state2, pid2, 1).length === 20, 'chapter 1 has exactly 20 entries');
})();

// ---------------------------------------------------------------------------
// SUITE 18 — getStats
// ---------------------------------------------------------------------------
suite('getStats');

(function() {
    // Empty journal
    var stateEmpty = makeState();
    var pidEmpty = uid();
    var emptyStats = Journal.getStats(stateEmpty, pidEmpty);
    assert(emptyStats.totalEntries === 0, 'getStats totalEntries=0 for empty journal');
    assert(emptyStats.favoriteZone === null, 'getStats favoriteZone=null for empty journal');
    assert(emptyStats.mostCommonEvent === null, 'getStats mostCommonEvent=null for empty journal');

    // Populated journal
    var state = makeState();
    var pid = uid();

    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Gardens' }), 10);
    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Gardens' }), 20);
    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Gardens' }), 30);
    Journal.addEntry(state, pid, 'npc_befriended',  makeContext({ zone: 'Nexus' }),   40);
    Journal.addEntry(state, pid, 'item_crafted',    makeContext({ zone: 'Nexus' }),   50);
    Journal.addEntry(state, pid, 'lore_discovered', makeContext({ zone: 'Athenaeum'}),60);

    var stats = Journal.getStats(state, pid);
    assert(stats.totalEntries === 6, 'getStats totalEntries=6');
    assert(stats.favoriteZone === 'Gardens', 'getStats favoriteZone is Gardens (3 entries)');
    assert(stats.mostCommonEvent === 'fish_caught', 'getStats mostCommonEvent is fish_caught (3)');
    assert(typeof stats.entriesByCategory === 'object', 'getStats has entriesByCategory');
    assert(typeof stats.entriesByZone === 'object', 'getStats has entriesByZone');
    assert(typeof stats.entriesByEventType === 'object', 'getStats has entriesByEventType');
    assert(stats.entriesByZone['Gardens'] === 3, 'getStats entriesByZone Gardens=3');
    assert(stats.entriesByZone['Nexus'] === 2, 'getStats entriesByZone Nexus=2');
    assert(stats.entriesByEventType['fish_caught'] === 3, 'getStats entriesByEventType fish_caught=3');
    assert(stats.entriesByCategory['daily_life'] === 3, 'getStats entriesByCategory daily_life=3');
    assert(stats.entriesByCategory['social'] === 1, 'getStats entriesByCategory social=1');
    assert(stats.entriesByCategory['crafting'] === 1, 'getStats entriesByCategory crafting=1');
    assert(stats.entriesByCategory['discoveries'] === 1, 'getStats entriesByCategory discoveries=1');
})();

// ---------------------------------------------------------------------------
// SUITE 19 — generateSummary
// ---------------------------------------------------------------------------
suite('generateSummary');

(function() {
    // Empty period
    var stateEmpty = makeState();
    var pidEmpty = uid();
    var emptySummary = Journal.generateSummary(stateEmpty, pidEmpty, 0, 1000);
    assert(typeof emptySummary === 'string', 'generateSummary returns a string');
    assert(emptySummary.length > 0, 'generateSummary is non-empty even for empty period');

    // Populated period
    var state = makeState();
    var pid = uid();

    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Gardens' }), 10);
    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Nexus' }),   20);
    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Nexus' }),   30);
    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Wilds' }),   40);
    Journal.addEntry(state, pid, 'fish_caught',     makeContext({ zone: 'Wilds' }),   50);
    Journal.addEntry(state, pid, 'quest_completed', makeContext({ zone: 'Nexus' }),   60);
    Journal.addEntry(state, pid, 'quest_completed', makeContext({ zone: 'Nexus' }),   70);
    Journal.addEntry(state, pid, 'npc_befriended',  makeContext({ zone: 'Gardens' }), 80);

    var summary = Journal.generateSummary(state, pid, 0, 100);
    assert(summary.indexOf('5') !== -1 || summary.indexOf('five') !== -1 || summary.indexOf('fish') !== -1,
        'generateSummary mentions fish count');
    assert(summary.indexOf('2') !== -1 || summary.indexOf('two') !== -1 || summary.indexOf('quest') !== -1,
        'generateSummary mentions quest count');
    assert(summary.indexOf('friend') !== -1 || summary.indexOf('new') !== -1 || summary.indexOf('1') !== -1,
        'generateSummary mentions friend');
    assert(summary.indexOf('zone') !== -1, 'generateSummary mentions zones');
    assert(summary.startsWith('During this period'), 'generateSummary starts with "During this period"');

    // Partial tick range
    var partial = Journal.generateSummary(state, pid, 60, 80);
    assert(typeof partial === 'string', 'generateSummary partial range returns string');

    // Out-of-range period
    var outOfRange = Journal.generateSummary(state, pid, 9000, 9999);
    assert(typeof outOfRange === 'string', 'generateSummary out-of-range returns string');
})();

// ---------------------------------------------------------------------------
// SUITE 20 — exportJournal
// ---------------------------------------------------------------------------
suite('exportJournal');

(function() {
    // Empty journal
    var stateEmpty = makeState();
    var pidEmpty = uid();
    var emptyExport = Journal.exportJournal(stateEmpty, pidEmpty);
    assert(typeof emptyExport === 'string', 'exportJournal returns a string');
    assert(emptyExport.length > 0, 'exportJournal returns non-empty for empty journal');
    assert(emptyExport.indexOf('No entries') !== -1, 'exportJournal notes empty journal');

    // With entries
    var state = makeState();
    var pid = uid();

    Journal.addEntry(state, pid, 'fish_caught',    makeContext(), 10);
    Journal.addEntry(state, pid, 'zone_visit',     makeContext(), 20);
    Journal.addEntry(state, pid, 'item_crafted',   makeContext(), 30);

    var exported = Journal.exportJournal(state, pid);
    assert(typeof exported === 'string', 'exportJournal returns a string with entries');
    assert(exported.indexOf('Journal') !== -1, 'exportJournal includes "Journal"');
    assert(exported.indexOf('Chapter') !== -1, 'exportJournal includes "Chapter"');
    assert(exported.indexOf('Day') !== -1, 'exportJournal includes dates');

    // Export with many entries (multiple chapters)
    var state2 = makeState();
    var pid2 = uid();
    for (var i = 0; i < 25; i++) {
        Journal.addEntry(state2, pid2, 'fish_caught', makeContext(), i * 10);
    }
    var exported2 = Journal.exportJournal(state2, pid2);
    assert(exported2.indexOf('Chapter 1') !== -1, 'exportJournal has Chapter 1');
    assert(exported2.indexOf('Chapter 2') !== -1, 'exportJournal has Chapter 2');
})();

// ---------------------------------------------------------------------------
// SUITE 21 — deleteEntry
// ---------------------------------------------------------------------------
suite('deleteEntry');

(function() {
    var state = makeState();
    var pid = uid();

    var r1 = Journal.addEntry(state, pid, 'fish_caught',  makeContext(), 10);
    var r2 = Journal.addEntry(state, pid, 'zone_visit',   makeContext(), 20);
    var r3 = Journal.addEntry(state, pid, 'item_crafted', makeContext(), 30);

    assert(Journal.getEntries(state, pid).length === 3, 'deleteEntry: 3 entries before delete');

    var deleted = Journal.deleteEntry(state, pid, r2.entryId);
    assert(deleted === true, 'deleteEntry returns true for existing entry');
    assert(Journal.getEntries(state, pid).length === 2, 'deleteEntry reduces count to 2');

    // Verify correct entry was deleted
    var remaining = Journal.getEntries(state, pid);
    var hasDeleted = remaining.some(function(e) { return e.id === r2.entryId; });
    assert(!hasDeleted, 'deleteEntry removes the correct entry');

    // Delete non-existent entry
    var falseDelete = Journal.deleteEntry(state, pid, 'ghost_id');
    assert(falseDelete === false, 'deleteEntry returns false for non-existent id');
    assert(Journal.getEntries(state, pid).length === 2, 'deleteEntry does not change count for missing entry');

    // Delete from empty journal
    var stateEmpty = makeState();
    var pidEmpty = uid();
    var emptyDelete = Journal.deleteEntry(stateEmpty, pidEmpty, 'any_id');
    assert(emptyDelete === false, 'deleteEntry returns false for empty journal');

    // Delete all entries
    Journal.deleteEntry(state, pid, r1.entryId);
    Journal.deleteEntry(state, pid, r3.entryId);
    assert(Journal.getEntries(state, pid).length === 0, 'deleteEntry can empty the journal');
})();

// ---------------------------------------------------------------------------
// SUITE 22 — pinEntry / getPinnedEntries
// ---------------------------------------------------------------------------
suite('pinEntry and getPinnedEntries');

(function() {
    var state = makeState();
    var pid = uid();

    var r1 = Journal.addEntry(state, pid, 'fish_caught',     makeContext(), 10);
    var r2 = Journal.addEntry(state, pid, 'zone_visit',      makeContext(), 20);
    var r3 = Journal.addEntry(state, pid, 'lore_discovered', makeContext(), 30);

    // Initially no pins
    var pinned = Journal.getPinnedEntries(state, pid);
    assert(pinned.length === 0, 'getPinnedEntries returns 0 initially');

    // Pin one entry
    var pinResult = Journal.pinEntry(state, pid, r1.entryId);
    assert(pinResult === true, 'pinEntry returns true for existing entry');

    pinned = Journal.getPinnedEntries(state, pid);
    assert(pinned.length === 1, 'getPinnedEntries returns 1 after pinning one entry');
    assert(pinned[0].id === r1.entryId, 'getPinnedEntries returns the pinned entry');
    assert(pinned[0].pinned === true, 'pinned entry has pinned=true');

    // Pin another
    Journal.pinEntry(state, pid, r3.entryId);
    pinned = Journal.getPinnedEntries(state, pid);
    assert(pinned.length === 2, 'getPinnedEntries returns 2 after pinning two entries');

    // Pin non-existent entry
    var failPin = Journal.pinEntry(state, pid, 'ghost_id');
    assert(failPin === false, 'pinEntry returns false for non-existent entry');

    // Unaffected entries remain unpinned
    var r2entry = Journal.getEntry(state, pid, r2.entryId);
    assert(r2entry.pinned === false, 'unpinned entry stays false');

    // Empty journal
    var stateEmpty = makeState();
    var pidEmpty = uid();
    var emptyPinned = Journal.getPinnedEntries(stateEmpty, pidEmpty);
    assert(emptyPinned.length === 0, 'getPinnedEntries returns empty array for empty journal');
})();

// ---------------------------------------------------------------------------
// SUITE 23 — getWordCount
// ---------------------------------------------------------------------------
suite('getWordCount');

(function() {
    // Empty journal
    var stateEmpty = makeState();
    var pidEmpty = uid();
    assert(Journal.getWordCount(stateEmpty, pidEmpty) === 0, 'getWordCount=0 for empty journal');

    // Manual entry with known word count
    var state = makeState();
    var pid = uid();

    // "Hello world foo bar" = 4 words
    // We can't set the text directly, but we can add an entry and verify count > 0
    Journal.addEntry(state, pid, 'fish_caught',    makeContext(), 10);
    Journal.addEntry(state, pid, 'zone_visit',     makeContext(), 20);
    Journal.addEntry(state, pid, 'npc_befriended', makeContext(), 30);

    var count = Journal.getWordCount(state, pid);
    assert(typeof count === 'number', 'getWordCount returns a number');
    assert(count > 0, 'getWordCount > 0 for journal with entries');

    // Word count increases as entries are added
    Journal.addEntry(state, pid, 'item_crafted', makeContext(), 40);
    var newCount = Journal.getWordCount(state, pid);
    assert(newCount > count, 'getWordCount increases as entries are added');
})();

// ---------------------------------------------------------------------------
// SUITE 24 — Entries ordered by tick
// ---------------------------------------------------------------------------
suite('Entries Ordered by Tick');

(function() {
    var state = makeState();
    var pid = uid();

    // Add entries out of order
    Journal.addEntry(state, pid, 'fish_caught',  makeContext(), 50);
    Journal.addEntry(state, pid, 'zone_visit',   makeContext(), 10);
    Journal.addEntry(state, pid, 'item_crafted', makeContext(), 30);
    Journal.addEntry(state, pid, 'npc_befriended',makeContext(), 20);
    Journal.addEntry(state, pid, 'lore_discovered',makeContext(), 40);

    var entries = Journal.getEntries(state, pid);
    assert(entries.length === 5, 'all 5 entries stored');
    assert(entries[0].tick === 10, 'entries[0] has tick=10');
    assert(entries[1].tick === 20, 'entries[1] has tick=20');
    assert(entries[2].tick === 30, 'entries[2] has tick=30');
    assert(entries[3].tick === 40, 'entries[3] has tick=40');
    assert(entries[4].tick === 50, 'entries[4] has tick=50');
})();

// ---------------------------------------------------------------------------
// SUITE 25 — Missing context variables
// ---------------------------------------------------------------------------
suite('Missing Context Variables');

(function() {
    var state = makeState();
    var pid = uid();

    // fish_caught with no context
    var result = Journal.addEntry(state, pid, 'fish_caught', {}, 5);
    assert(typeof result.entry.text === 'string', 'fish_caught with empty context produces text');
    assert(result.entry.text.length > 0, 'fish_caught with empty context has non-empty text');

    // zone_visit with no zone in context
    var result2 = Journal.addEntry(state, pid, 'zone_visit', {}, 10);
    assert(typeof result2.entry.text === 'string', 'zone_visit with empty context produces text');

    // Template should replace missing vars with '...'
    var missingText = result.entry.text;
    // text won't have raw {placeholders} — they should be filled with defaults or ...
    assert(missingText.indexOf('{') === -1, 'no raw {placeholders} remain in text');
})();

// ---------------------------------------------------------------------------
// SUITE 26 — Multiple players isolated
// ---------------------------------------------------------------------------
suite('Multiple Players Isolated');

(function() {
    var state = makeState();
    var pid1 = uid();
    var pid2 = uid();

    Journal.addEntry(state, pid1, 'fish_caught',  makeContext({ zone: 'Gardens' }), 10);
    Journal.addEntry(state, pid1, 'fish_caught',  makeContext({ zone: 'Gardens' }), 20);
    Journal.addEntry(state, pid2, 'zone_visit',   makeContext({ zone: 'Nexus' }),   30);

    var p1Entries = Journal.getEntries(state, pid1);
    var p2Entries = Journal.getEntries(state, pid2);

    assert(p1Entries.length === 2, 'player1 has 2 entries');
    assert(p2Entries.length === 1, 'player2 has 1 entry');
    assert(p1Entries[0].zone === 'Gardens', 'player1 entry has zone Gardens');
    assert(p2Entries[0].zone === 'Nexus', 'player2 entry has zone Nexus');
})();

// ---------------------------------------------------------------------------
// SUITE 27 — EVENT_CATEGORY_MAP completeness
// ---------------------------------------------------------------------------
suite('EVENT_CATEGORY_MAP');

(function() {
    var map = Journal.EVENT_CATEGORY_MAP;
    var validCategories = ['adventures', 'crafting', 'social', 'discoveries', 'daily_life'];

    for (var i = 0; i < ALL_EVENT_TYPES.length; i++) {
        var et = ALL_EVENT_TYPES[i];
        assert(map.hasOwnProperty(et), 'EVENT_CATEGORY_MAP has entry for: ' + et);
        if (map[et]) {
            assert(validCategories.indexOf(map[et]) !== -1, et + ' maps to valid category: ' + map[et]);
        }
    }
})();

// ---------------------------------------------------------------------------
// SUITE 28 — fish_caught rarity quality texts
// ---------------------------------------------------------------------------
suite('fish_caught Rarity Quality Texts');

(function() {
    var fishDef = Journal.ENTRY_TEMPLATES['fish_caught'];
    assert(typeof fishDef.qualityTexts === 'object', 'fish_caught has qualityTexts');
    assert(typeof fishDef.qualityTexts.common === 'string', 'fish_caught has common quality text');
    assert(typeof fishDef.qualityTexts.rare === 'string', 'fish_caught has rare quality text');
    assert(typeof fishDef.qualityTexts.epic === 'string', 'fish_caught has epic quality text');

    // Verify epic text flows into entry
    var state = makeState();
    var pid = uid();
    Journal.addEntry(state, pid, 'fish_caught', { fishName: 'Dragon Koi', rarity: 'epic', zone: 'Lakes' }, 1);
    var e = Journal.getEntries(state, pid)[0];
    assert(e.text.indexOf('Dragon Koi') !== -1, 'epic fish: fishName in text');
    assert(e.text.indexOf('legendary') !== -1, 'epic fish: epic quality text in entry');

    // Verify rare text flows in
    var state2 = makeState();
    var pid2 = uid();
    Journal.addEntry(state2, pid2, 'fish_caught', { fishName: 'Pearl Bass', rarity: 'rare', zone: 'Reef' }, 2);
    var e2 = Journal.getEntries(state2, pid2)[0];
    assert(e2.text.indexOf('Pearl Bass') !== -1, 'rare fish: fishName in text');
    assert(e2.text.indexOf('shimmer') !== -1, 'rare fish: rare quality text in entry');
})();

// ---------------------------------------------------------------------------
// SUITE 29 — ENTRIES_PER_CHAPTER constant
// ---------------------------------------------------------------------------
suite('ENTRIES_PER_CHAPTER Constant');

(function() {
    assert(typeof Journal.ENTRIES_PER_CHAPTER === 'number', 'ENTRIES_PER_CHAPTER is exported as number');
    assert(Journal.ENTRIES_PER_CHAPTER === 20, 'ENTRIES_PER_CHAPTER is 20');
})();

// ---------------------------------------------------------------------------
// SUITE 30 — generateSummary single-event cases
// ---------------------------------------------------------------------------
suite('generateSummary Single Event Coverage');

(function() {
    var eventTests = [
        { et: 'dungeon_cleared',     contains: 'dungeon' },
        { et: 'lore_discovered',     contains: 'lore' },
        { et: 'achievement_unlocked',contains: 'achievement' },
        { et: 'trade_completed',     contains: 'trade' },
        { et: 'guild_joined',        contains: 'guild' },
        { et: 'constellation_found', contains: 'constellation' },
        { et: 'building_placed',     contains: 'building' },
        { et: 'mentor_session',      contains: 'mentor' },
        { et: 'vote_cast',           contains: 'vote' },
        { et: 'world_event',         contains: 'event' },
        { et: 'season_changed',      contains: 'season' },
        { et: 'card_game_won',       contains: 'card' },
        { et: 'time_capsule_buried', contains: 'capsule' },
        { et: 'time_capsule_found',  contains: 'capsule' },
        { et: 'house_decorated',     contains: 'home' },
        { et: 'prestige_ascended',   contains: 'prestige' },
        { et: 'zone_visit',          contains: 'zone' },
        { et: 'item_crafted',        contains: 'item' },
        { et: 'meal_cooked',         contains: 'meal' },
        { et: 'npc_befriended',      contains: 'friend' }
    ];

    for (var i = 0; i < eventTests.length; i++) {
        var tc = eventTests[i];
        var state = makeState();
        var pid = uid();
        Journal.addEntry(state, pid, tc.et, makeContext(), i * 5);
        var summary = Journal.generateSummary(state, pid, 0, i * 5 + 1);
        assert(typeof summary === 'string', 'generateSummary returns string for ' + tc.et);
        assert(summary.indexOf(tc.contains) !== -1,
            'generateSummary mentions "' + tc.contains + '" for ' + tc.et);
    }
})();

// ---------------------------------------------------------------------------
// FINAL REPORT
// ---------------------------------------------------------------------------
process.stdout.write('\n========================================\n');
process.stdout.write('Journal Tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.stdout.write('========================================\n');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
