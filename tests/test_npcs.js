// test_npcs.js — Tests for NPCs module (AI citizen simulation)
// npcs.js uses AGENTS_PLACEHOLDER (a bundle-time token) and THREE.js for visual
// work, so we stub the placeholder before requiring and test only pure-data
// functions and pre-init state.
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

// Inject the bundle-time placeholder before requiring the module.
// The bundle script replaces this token with agent JSON; in tests we use [].
global.AGENTS_PLACEHOLDER = [];

var NPCs = require('../src/js/npcs');

// ============================================================================
// Expected exports — 26 total
// ============================================================================

var EXPECTED_EXPORTS = [
  'initNPCs',
  'updateNPCs',
  'reloadZoneNPCs',
  'getNPCsInZone',
  'getNPCById',
  'findNearestNPC',
  'interactWithNPC',
  'getNPCPositions',
  'broadcastEvent',
  'getNPCMood',
  'getNPCGoal',
  'getNPCActivity',
  'updateQuestIndicators',
  'playEmoteAnimation',
  'getNPCSchedule',
  'getActivityDialogue',
  'getActivityZone',
  'getTimePeriod',
  'showNPCSpeechBubble',
  'updateSpeechBubbles',
  'clearSpeechBubbles',
  'getAgents',
  'buildNpcDialogueContext',
  'getDialogueHistory',
  'getDialogueTrend',
  'getNearbyNPCCount'
];

// ============================================================================
// Suite 1: Module exports — all 26 functions exist and are functions
// ============================================================================

suite('Module exports — individual function existence', function() {

  test('NPCs module loads without error', function() {
    assert.ok(NPCs !== null && NPCs !== undefined, 'NPCs should be non-null');
  });

  test('NPCs is an object', function() {
    assert.ok(typeof NPCs === 'object', 'NPCs should be an object, got: ' + typeof NPCs);
  });

  test('initNPCs is exported', function() {
    assert.ok('initNPCs' in NPCs, 'initNPCs should be exported');
  });

  test('updateNPCs is exported', function() {
    assert.ok('updateNPCs' in NPCs, 'updateNPCs should be exported');
  });

  test('reloadZoneNPCs is exported', function() {
    assert.ok('reloadZoneNPCs' in NPCs, 'reloadZoneNPCs should be exported');
  });

  test('getNPCsInZone is exported', function() {
    assert.ok('getNPCsInZone' in NPCs, 'getNPCsInZone should be exported');
  });

  test('getNPCById is exported', function() {
    assert.ok('getNPCById' in NPCs, 'getNPCById should be exported');
  });

  test('findNearestNPC is exported', function() {
    assert.ok('findNearestNPC' in NPCs, 'findNearestNPC should be exported');
  });

  test('interactWithNPC is exported', function() {
    assert.ok('interactWithNPC' in NPCs, 'interactWithNPC should be exported');
  });

  test('getNPCPositions is exported', function() {
    assert.ok('getNPCPositions' in NPCs, 'getNPCPositions should be exported');
  });

  test('broadcastEvent is exported', function() {
    assert.ok('broadcastEvent' in NPCs, 'broadcastEvent should be exported');
  });

  test('getNPCMood is exported', function() {
    assert.ok('getNPCMood' in NPCs, 'getNPCMood should be exported');
  });

  test('getNPCGoal is exported', function() {
    assert.ok('getNPCGoal' in NPCs, 'getNPCGoal should be exported');
  });

  test('getNPCActivity is exported', function() {
    assert.ok('getNPCActivity' in NPCs, 'getNPCActivity should be exported');
  });

  test('updateQuestIndicators is exported', function() {
    assert.ok('updateQuestIndicators' in NPCs, 'updateQuestIndicators should be exported');
  });

  test('playEmoteAnimation is exported', function() {
    assert.ok('playEmoteAnimation' in NPCs, 'playEmoteAnimation should be exported');
  });

  test('getNPCSchedule is exported', function() {
    assert.ok('getNPCSchedule' in NPCs, 'getNPCSchedule should be exported');
  });

  test('getActivityDialogue is exported', function() {
    assert.ok('getActivityDialogue' in NPCs, 'getActivityDialogue should be exported');
  });

  test('getActivityZone is exported', function() {
    assert.ok('getActivityZone' in NPCs, 'getActivityZone should be exported');
  });

  test('getTimePeriod is exported', function() {
    assert.ok('getTimePeriod' in NPCs, 'getTimePeriod should be exported');
  });

  test('showNPCSpeechBubble is exported', function() {
    assert.ok('showNPCSpeechBubble' in NPCs, 'showNPCSpeechBubble should be exported');
  });

  test('updateSpeechBubbles is exported', function() {
    assert.ok('updateSpeechBubbles' in NPCs, 'updateSpeechBubbles should be exported');
  });

  test('clearSpeechBubbles is exported', function() {
    assert.ok('clearSpeechBubbles' in NPCs, 'clearSpeechBubbles should be exported');
  });

  test('getAgents is exported', function() {
    assert.ok('getAgents' in NPCs, 'getAgents should be exported');
  });

  test('buildNpcDialogueContext is exported', function() {
    assert.ok('buildNpcDialogueContext' in NPCs, 'buildNpcDialogueContext should be exported');
  });

  test('getDialogueHistory is exported', function() {
    assert.ok('getDialogueHistory' in NPCs, 'getDialogueHistory should be exported');
  });

  test('getDialogueTrend is exported', function() {
    assert.ok('getDialogueTrend' in NPCs, 'getDialogueTrend should be exported');
  });

  test('getNearbyNPCCount is exported', function() {
    assert.ok('getNearbyNPCCount' in NPCs, 'getNearbyNPCCount should be exported');
  });

  test('all 26 exports are functions (bulk check)', function() {
    var nonFunctions = EXPECTED_EXPORTS.filter(function(name) {
      return typeof NPCs[name] !== 'function';
    });
    assert.strictEqual(nonFunctions.length, 0,
      'Non-function exports found: ' + nonFunctions.join(', '));
  });

  test('no export is null', function() {
    var nullExports = EXPECTED_EXPORTS.filter(function(name) {
      return NPCs[name] === null;
    });
    assert.strictEqual(nullExports.length, 0,
      'Null exports: ' + nullExports.join(', '));
  });

  test('no export is undefined', function() {
    var undefinedExports = EXPECTED_EXPORTS.filter(function(name) {
      return NPCs[name] === undefined;
    });
    assert.strictEqual(undefinedExports.length, 0,
      'Undefined exports: ' + undefinedExports.join(', '));
  });

});

// ============================================================================
// Suite 2: getTimePeriod — all 6 time bands with boundary values
// Time bands:
//   dawn      360 <= t < 420
//   morning   420 <= t < 660
//   midday    660 <= t < 780
//   afternoon 780 <= t < 1020
//   evening   1020 <= t < 1140
//   night     everything else (0-359, 1140-1439)
// ============================================================================

suite('getTimePeriod — boundary values', function() {

  test('returns dawn at exactly 360 (start of dawn)', function() {
    assert.strictEqual(NPCs.getTimePeriod(360), 'dawn',
      'Time 360 should be dawn');
  });

  test('returns dawn at 390 (middle of dawn)', function() {
    assert.strictEqual(NPCs.getTimePeriod(390), 'dawn',
      'Time 390 should be dawn');
  });

  test('returns dawn at 419 (last minute of dawn)', function() {
    assert.strictEqual(NPCs.getTimePeriod(419), 'dawn',
      'Time 419 should be dawn');
  });

  test('returns morning at exactly 420 (start of morning)', function() {
    assert.strictEqual(NPCs.getTimePeriod(420), 'morning',
      'Time 420 should be morning');
  });

  test('returns morning at 540 (middle of morning)', function() {
    assert.strictEqual(NPCs.getTimePeriod(540), 'morning',
      'Time 540 should be morning');
  });

  test('returns morning at 659 (last minute of morning)', function() {
    assert.strictEqual(NPCs.getTimePeriod(659), 'morning',
      'Time 659 should be morning');
  });

  test('returns midday at exactly 660 (start of midday)', function() {
    assert.strictEqual(NPCs.getTimePeriod(660), 'midday',
      'Time 660 should be midday');
  });

  test('returns midday at 720 (middle of midday)', function() {
    assert.strictEqual(NPCs.getTimePeriod(720), 'midday',
      'Time 720 should be midday');
  });

  test('returns midday at 779 (last minute of midday)', function() {
    assert.strictEqual(NPCs.getTimePeriod(779), 'midday',
      'Time 779 should be midday');
  });

  test('returns afternoon at exactly 780 (start of afternoon)', function() {
    assert.strictEqual(NPCs.getTimePeriod(780), 'afternoon',
      'Time 780 should be afternoon');
  });

  test('returns afternoon at 900 (middle of afternoon)', function() {
    assert.strictEqual(NPCs.getTimePeriod(900), 'afternoon',
      'Time 900 should be afternoon');
  });

  test('returns afternoon at 1019 (last minute of afternoon)', function() {
    assert.strictEqual(NPCs.getTimePeriod(1019), 'afternoon',
      'Time 1019 should be afternoon');
  });

  test('returns evening at exactly 1020 (start of evening)', function() {
    assert.strictEqual(NPCs.getTimePeriod(1020), 'evening',
      'Time 1020 should be evening');
  });

  test('returns evening at 1080 (middle of evening)', function() {
    assert.strictEqual(NPCs.getTimePeriod(1080), 'evening',
      'Time 1080 should be evening');
  });

  test('returns evening at 1139 (last minute of evening)', function() {
    assert.strictEqual(NPCs.getTimePeriod(1139), 'evening',
      'Time 1139 should be evening');
  });

  test('returns night at exactly 0 (midnight)', function() {
    assert.strictEqual(NPCs.getTimePeriod(0), 'night',
      'Time 0 should be night');
  });

  test('returns night at 180 (deep night)', function() {
    assert.strictEqual(NPCs.getTimePeriod(180), 'night',
      'Time 180 should be night');
  });

  test('returns night at 359 (just before dawn)', function() {
    assert.strictEqual(NPCs.getTimePeriod(359), 'night',
      'Time 359 should be night');
  });

  test('returns night at exactly 1140 (start of night after evening)', function() {
    assert.strictEqual(NPCs.getTimePeriod(1140), 'night',
      'Time 1140 should be night');
  });

  test('returns night at 1300 (late night)', function() {
    assert.strictEqual(NPCs.getTimePeriod(1300), 'night',
      'Time 1300 should be night');
  });

  test('returns night at 1439 (last minute of the day)', function() {
    assert.strictEqual(NPCs.getTimePeriod(1439), 'night',
      'Time 1439 should be night');
  });

  test('return value is always a non-empty string', function() {
    var samples = [0, 100, 360, 420, 540, 660, 720, 780, 900, 1020, 1080, 1140, 1300, 1439];
    samples.forEach(function(t) {
      var result = NPCs.getTimePeriod(t);
      assert.ok(typeof result === 'string' && result.length > 0,
        'getTimePeriod(' + t + ') should return non-empty string, got: ' + JSON.stringify(result));
    });
  });

  test('return value is always one of the 6 valid period names', function() {
    var validPeriods = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night'];
    var samples = [0, 100, 360, 420, 540, 660, 720, 780, 900, 1020, 1080, 1140, 1300, 1439];
    samples.forEach(function(t) {
      var result = NPCs.getTimePeriod(t);
      assert.ok(validPeriods.indexOf(result) !== -1,
        'getTimePeriod(' + t + ') returned invalid period: ' + result);
    });
  });

});

// ============================================================================
// Suite 3: getTimePeriod — edge cases (negative values, values > 1440)
// The implementation uses worldTime % 1440; negative values get +1440 added.
// ============================================================================

suite('getTimePeriod — edge cases', function() {

  test('value of 1440 wraps to 0 (night)', function() {
    // 1440 % 1440 === 0, which is night
    assert.strictEqual(NPCs.getTimePeriod(1440), 'night',
      'Time 1440 should wrap to 0 and return night');
  });

  test('value of 1800 wraps to 360 (dawn)', function() {
    // 1800 % 1440 === 360
    assert.strictEqual(NPCs.getTimePeriod(1800), 'dawn',
      'Time 1800 should wrap to 360 and return dawn');
  });

  test('value of 2100 wraps to 660 (midday)', function() {
    // 2100 % 1440 === 660
    assert.strictEqual(NPCs.getTimePeriod(2100), 'midday',
      'Time 2100 should wrap to 660 and return midday');
  });

  test('value of 2880 wraps to 0 (night)', function() {
    // 2880 % 1440 === 0
    assert.strictEqual(NPCs.getTimePeriod(2880), 'night',
      'Time 2880 (double day) should wrap to 0 and return night');
  });

  test('negative value -1080 wraps to 360 (dawn)', function() {
    // -1080 % 1440 === -1080 in JS, then +1440 === 360
    assert.strictEqual(NPCs.getTimePeriod(-1080), 'dawn',
      'Time -1080 should wrap to 360 (dawn)');
  });

  test('negative value -1440 wraps to 0 (night)', function() {
    // -1440 % 1440 === 0 in JS (no adjustment needed)
    assert.strictEqual(NPCs.getTimePeriod(-1440), 'night',
      'Time -1440 should wrap to 0 (night)');
  });

  test('negative value -720 wraps to 720 (midday)', function() {
    // -720 % 1440 === -720, then +1440 === 720
    assert.strictEqual(NPCs.getTimePeriod(-720), 'midday',
      'Time -720 should wrap to 720 (midday)');
  });

  test('large value 10000 wraps correctly', function() {
    // 10000 % 1440 === 400, which is dawn
    var wrapped = 10000 % 1440; // 400
    var expected = NPCs.getTimePeriod(wrapped);
    assert.strictEqual(NPCs.getTimePeriod(10000), expected,
      'getTimePeriod(10000) should match getTimePeriod(' + wrapped + ')');
  });

  test('fractional time 420.5 returns morning', function() {
    // 420.5 is within morning band (420-660)
    assert.strictEqual(NPCs.getTimePeriod(420.5), 'morning',
      'Time 420.5 should return morning');
  });

  test('fractional time 659.9 returns morning', function() {
    assert.strictEqual(NPCs.getTimePeriod(659.9), 'morning',
      'Time 659.9 should still return morning');
  });

});

// ============================================================================
// Suite 4: getActivityDialogue — returns strings for known activities
// ============================================================================

suite('getActivityDialogue — known activities', function() {

  test('returns a string for selling activity', function() {
    var result = NPCs.getActivityDialogue('selling');
    assert.ok(typeof result === 'string' && result.length > 0,
      'selling should return non-empty string, got: ' + JSON.stringify(result));
  });

  test('returns a string for tending_garden activity', function() {
    var result = NPCs.getActivityDialogue('tending_garden');
    assert.ok(typeof result === 'string' && result.length > 0,
      'tending_garden should return non-empty string');
  });

  test('returns a string for harvesting activity', function() {
    var result = NPCs.getActivityDialogue('harvesting');
    assert.ok(typeof result === 'string' && result.length > 0,
      'harvesting should return non-empty string');
  });

  test('returns a string for teaching activity', function() {
    var result = NPCs.getActivityDialogue('teaching');
    assert.ok(typeof result === 'string' && result.length > 0,
      'teaching should return non-empty string');
  });

  test('returns a string for practicing activity', function() {
    var result = NPCs.getActivityDialogue('practicing');
    assert.ok(typeof result === 'string' && result.length > 0,
      'practicing should return non-empty string');
  });

  test('returns a string for composing activity', function() {
    var result = NPCs.getActivityDialogue('composing');
    assert.ok(typeof result === 'string' && result.length > 0,
      'composing should return non-empty string');
  });

  test('returns a string for exploring activity', function() {
    var result = NPCs.getActivityDialogue('exploring');
    assert.ok(typeof result === 'string' && result.length > 0,
      'exploring should return non-empty string');
  });

  test('returns a string for sleeping activity', function() {
    var result = NPCs.getActivityDialogue('sleeping');
    assert.ok(typeof result === 'string' && result.length > 0,
      'sleeping should return non-empty string');
  });

  test('returns a string for reading activity', function() {
    var result = NPCs.getActivityDialogue('reading');
    assert.ok(typeof result === 'string' && result.length > 0,
      'reading should return non-empty string');
  });

  test('returns a string for sketching activity', function() {
    var result = NPCs.getActivityDialogue('sketching');
    assert.ok(typeof result === 'string' && result.length > 0,
      'sketching should return non-empty string');
  });

  test('unknown activity returns fallback containing activity name', function() {
    var result = NPCs.getActivityDialogue('banging_drums');
    assert.ok(typeof result === 'string' && result.length > 0,
      'Unknown activity should return a non-empty fallback string');
    // Fallback is: 'Busy with ' + activity.replace(/_/g, ' ') + '.'
    assert.ok(result.indexOf('banging drums') !== -1 || result.indexOf('Busy') !== -1,
      'Fallback should reference the activity name, got: ' + result);
  });

  test('unknown activity with underscores replaces underscores in fallback', function() {
    var result = NPCs.getActivityDialogue('doing_something_weird');
    assert.ok(result.indexOf('doing something weird') !== -1,
      'Underscores should be replaced with spaces in fallback, got: ' + result);
  });

  test('empty string activity returns a string (does not throw)', function() {
    assert.doesNotThrow(function() {
      var result = NPCs.getActivityDialogue('');
      assert.ok(typeof result === 'string', 'Should return string for empty activity');
    }, 'Should not throw on empty string activity');
  });

  test('all returned values are strings, never null', function() {
    var activities = [
      'selling', 'tending_garden', 'harvesting', 'planting', 'watering',
      'resting', 'reading', 'teaching', 'researching', 'lecturing',
      'studying', 'practicing', 'composing', 'performing', 'exploring',
      'sleeping', 'sketching', 'painting', 'creating'
    ];
    activities.forEach(function(activity) {
      var result = NPCs.getActivityDialogue(activity);
      assert.ok(typeof result === 'string',
        'getActivityDialogue(' + activity + ') should return string, got: ' + typeof result);
      assert.ok(result !== null && result !== undefined,
        'getActivityDialogue(' + activity + ') should not be null/undefined');
    });
  });

});

// ============================================================================
// Suite 5: getActivityZone — returns valid zone strings
// ============================================================================

suite('getActivityZone — zone routing', function() {

  test('merchant selling maps to agora', function() {
    assert.strictEqual(NPCs.getActivityZone('merchant', 'selling'), 'agora',
      'Merchant selling should be in agora');
  });

  test('merchant sleeping maps to commons', function() {
    assert.strictEqual(NPCs.getActivityZone('merchant', 'sleeping'), 'commons',
      'Merchant sleeping should be in commons');
  });

  test('gardener tending_garden maps to gardens', function() {
    assert.strictEqual(NPCs.getActivityZone('gardener', 'tending_garden'), 'gardens',
      'Gardener tending should be in gardens');
  });

  test('teacher teaching maps to athenaeum', function() {
    assert.strictEqual(NPCs.getActivityZone('teacher', 'teaching'), 'athenaeum',
      'Teacher teaching should be in athenaeum');
  });

  test('musician practicing maps to studio', function() {
    assert.strictEqual(NPCs.getActivityZone('musician', 'practicing'), 'studio',
      'Musician practicing should be in studio');
  });

  test('musician performing maps to nexus', function() {
    assert.strictEqual(NPCs.getActivityZone('musician', 'performing'), 'nexus',
      'Musician performing should be in nexus');
  });

  test('explorer exploring maps to wilds', function() {
    assert.strictEqual(NPCs.getActivityZone('explorer', 'exploring'), 'wilds',
      'Explorer exploring should be in wilds');
  });

  test('healer gathering_herbs maps to gardens', function() {
    assert.strictEqual(NPCs.getActivityZone('healer', 'gathering_herbs'), 'gardens',
      'Healer gathering herbs should be in gardens');
  });

  test('builder building maps to commons', function() {
    assert.strictEqual(NPCs.getActivityZone('builder', 'building'), 'commons',
      'Builder building should be in commons');
  });

  test('artist painting maps to studio', function() {
    assert.strictEqual(NPCs.getActivityZone('artist', 'painting'), 'studio',
      'Artist painting should be in studio');
  });

  test('philosopher contemplating maps to athenaeum', function() {
    assert.strictEqual(NPCs.getActivityZone('philosopher', 'contemplating'), 'athenaeum',
      'Philosopher contemplating should be in athenaeum');
  });

  test('unknown archetype returns nexus as default', function() {
    var result = NPCs.getActivityZone('wizard', 'casting_spells');
    assert.strictEqual(result, 'nexus',
      'Unknown archetype should fall back to nexus, got: ' + result);
  });

  test('known archetype with unknown activity returns nexus as default', function() {
    var result = NPCs.getActivityZone('gardener', 'space_travel');
    assert.strictEqual(result, 'nexus',
      'Known archetype with unknown activity should fall back to nexus, got: ' + result);
  });

  test('all returned values are non-empty strings', function() {
    var pairs = [
      ['merchant', 'selling'],
      ['gardener', 'harvesting'],
      ['teacher', 'reading'],
      ['musician', 'composing'],
      ['explorer', 'mapping'],
      ['healer', 'meditating'],
      ['builder', 'planning'],
      ['storyteller', 'writing'],
      ['philosopher', 'debating'],
      ['artist', 'creating']
    ];
    pairs.forEach(function(pair) {
      var result = NPCs.getActivityZone(pair[0], pair[1]);
      assert.ok(typeof result === 'string' && result.length > 0,
        'getActivityZone(' + pair[0] + ', ' + pair[1] + ') should be a non-empty string, got: ' + JSON.stringify(result));
    });
  });

});

// ============================================================================
// Suite 6: Pre-init state — getAgents, getNPCPositions, getDialogueHistory,
//          getNearbyNPCCount before initNPCs is called
// ============================================================================

suite('Pre-init state', function() {

  test('getAgents returns an array before initNPCs', function() {
    var agents = NPCs.getAgents();
    assert.ok(Array.isArray(agents), 'getAgents should return an array, got: ' + typeof agents);
  });

  test('getAgents returns empty array before initNPCs', function() {
    var agents = NPCs.getAgents();
    assert.strictEqual(agents.length, 0,
      'getAgents should be empty before init, length: ' + agents.length);
  });

  test('getNPCPositions returns an array before initNPCs', function() {
    var positions = NPCs.getNPCPositions();
    assert.ok(Array.isArray(positions),
      'getNPCPositions should return an array, got: ' + typeof positions);
  });

  test('getNPCPositions returns empty array before initNPCs', function() {
    var positions = NPCs.getNPCPositions();
    assert.strictEqual(positions.length, 0,
      'getNPCPositions should be empty before init, length: ' + positions.length);
  });

  test('getDialogueHistory returns an array before initNPCs', function() {
    var history = NPCs.getDialogueHistory();
    assert.ok(Array.isArray(history),
      'getDialogueHistory should return an array, got: ' + typeof history);
  });

  test('getDialogueHistory returns empty array before initNPCs', function() {
    var history = NPCs.getDialogueHistory();
    assert.strictEqual(history.length, 0,
      'getDialogueHistory should be empty before init, length: ' + history.length);
  });

  test('getNearbyNPCCount returns 0 before initNPCs with valid position', function() {
    var count = NPCs.getNearbyNPCCount({ x: 0, y: 0, z: 0 }, 50);
    assert.strictEqual(count, 0,
      'getNearbyNPCCount should be 0 before init, got: ' + count);
  });

  test('getNearbyNPCCount returns 0 with null playerPos', function() {
    var count = NPCs.getNearbyNPCCount(null, 50);
    assert.strictEqual(count, 0,
      'getNearbyNPCCount with null pos should return 0, got: ' + count);
  });

  test('getNearbyNPCCount returns 0 with undefined playerPos', function() {
    var count = NPCs.getNearbyNPCCount(undefined, 100);
    assert.strictEqual(count, 0,
      'getNearbyNPCCount with undefined pos should return 0, got: ' + count);
  });

  test('getNearbyNPCCount returns 0 with large radius before init', function() {
    var count = NPCs.getNearbyNPCCount({ x: 0, y: 0, z: 0 }, 99999);
    assert.strictEqual(count, 0,
      'getNearbyNPCCount with large radius should still be 0 before init');
  });

  test('getDialogueTrend returns null before initNPCs (no dialogue module)', function() {
    var trend = NPCs.getDialogueTrend();
    // With no dialogue module loaded and empty history, should be null
    assert.ok(trend === null || trend === undefined,
      'getDialogueTrend should be null before init, got: ' + JSON.stringify(trend));
  });

  test('getDialogueHistory returns a copy (mutation does not affect internal state)', function() {
    var history1 = NPCs.getDialogueHistory();
    history1.push({ npcId: 'fake', message: 'injected' });
    var history2 = NPCs.getDialogueHistory();
    assert.strictEqual(history2.length, 0,
      'Pushing to returned array should not affect internal history (got length: ' + history2.length + ')');
  });

});

// ============================================================================
// Run & Report
// ============================================================================

if (!report()) process.exit(1);
