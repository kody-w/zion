// Test: Level-up celebration — Progression.awardXP leveled flag, Audio PIANO_ACCENTS has level_up
var Progression = require('../src/js/progression.js');
var Audio = require('../src/js/audio.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// Progression.awardXP exists
assert(typeof Progression.awardXP === 'function', 'Progression.awardXP is a function');

// Create progression state
assert(typeof Progression.createPlayerProgression === 'function', 'createPlayerProgression is a function');
var progState = Progression.createPlayerProgression('levelTestPlayer');
assert(progState !== null && typeof progState === 'object', 'progression state created');

// Award XP and check for leveled flag
var result = Progression.awardXP(progState, 'exploring');
assert(typeof result === 'object', 'awardXP returns object');
assert('leveled' in result, 'result has leveled field');
assert('newLevel' in result, 'result has newLevel field');
assert(result.state !== null, 'result has updated state');

// Audio getPianoAccentTypes includes level_up
assert(typeof Audio.getPianoAccentTypes === 'function', 'getPianoAccentTypes is a function');
var accents = Audio.getPianoAccentTypes();
assert(accents !== undefined && accents !== null, 'getPianoAccentTypes returns object');
assert('level_up' in accents, 'accents has level_up key');
var levelUp = accents.level_up;
assert(Array.isArray(levelUp.notes), 'level_up has notes array');
assert(levelUp.notes.length >= 5, 'level_up has at least 5 notes');
assert(levelUp.noteSpacing > 0, 'level_up has positive noteSpacing');
assert(levelUp.noteDuration > 0, 'level_up has positive noteDuration');
assert(levelUp.volume > 0, 'level_up has positive volume');

// playPianoAccent is a function
assert(typeof Audio.playPianoAccent === 'function', 'playPianoAccent is a function');

// Verify other accents still exist
assert('quest_complete' in accents, 'quest_complete accent still exists');
assert('achievement' in accents, 'achievement accent still exists');

console.log('test_roadmap_levelup: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
