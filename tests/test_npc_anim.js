'use strict';

var runner = require('./test_runner');
var test   = runner.test;
var suite  = runner.suite;
var report = runner.report;
var assert = runner.assert;

global.AGENTS_PLACEHOLDER = [];
var N = require('../src/js/npcs.js');

suite('NPC Role-Specific Idle Animations', function() {
test('getNPCAnimState is exported', function() {
  assert.strictEqual(typeof N.getNPCAnimState, 'function', 'should export getNPCAnimState');
});

test('gardener maps to tend animation', function() {
  assert.strictEqual(N.getNPCAnimState('gardener'), 'tend', 'gardener → tend');
});

test('builder maps to hammer animation', function() {
  assert.strictEqual(N.getNPCAnimState('builder'), 'hammer', 'builder → hammer');
});

test('musician maps to sway animation', function() {
  assert.strictEqual(N.getNPCAnimState('musician'), 'sway', 'musician → sway');
});

test('merchant maps to idle-look animation', function() {
  assert.strictEqual(N.getNPCAnimState('merchant'), 'idle-look', 'merchant → idle-look');
});

test('explorer maps to scan animation', function() {
  assert.strictEqual(N.getNPCAnimState('explorer'), 'scan', 'explorer → scan');
});

test('teacher maps to an animation state', function() {
  var s = N.getNPCAnimState('teacher');
  assert(typeof s === 'string' && s.length > 0, 'teacher should have an animation state');
});

test('healer maps to an animation state', function() {
  var s = N.getNPCAnimState('healer');
  assert(typeof s === 'string' && s.length > 0, 'healer should have an animation state');
});

test('philosopher maps to an animation state', function() {
  var s = N.getNPCAnimState('philosopher');
  assert(typeof s === 'string' && s.length > 0, 'philosopher should have an animation state');
});

test('artist maps to an animation state', function() {
  var s = N.getNPCAnimState('artist');
  assert(typeof s === 'string' && s.length > 0, 'artist should have an animation state');
});

test('unknown archetype returns idle', function() {
  assert.strictEqual(N.getNPCAnimState('wizard_king'), 'idle', 'unknown → idle');
});

test('all 10 founding archetypes have anim states', function() {
  var archetypes = ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                    'teacher', 'musician', 'healer', 'philosopher', 'artist'];
  archetypes.forEach(function(a) {
    var s = N.getNPCAnimState(a);
    assert(typeof s === 'string' && s.length > 0, a + ' must have an animation state');
  });
});

test('return value is always a string', function() {
  assert(typeof N.getNPCAnimState(null) === 'string');
  assert(typeof N.getNPCAnimState(undefined) === 'string');
  assert(typeof N.getNPCAnimState('') === 'string');
});
});

report();
