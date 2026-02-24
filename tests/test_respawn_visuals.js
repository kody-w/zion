'use strict';

var runner = require('./test_runner');
var test   = runner.test;
var suite  = runner.suite;
var report = runner.report;
var assert = runner.assert;

global.THREE = undefined;
var W = require('../src/js/world.js');

suite('Resource Respawn Visual Stages', function() {
test('getResourceStage is exported', function() {
  assert.strictEqual(typeof W.getResourceStage, 'function', 'should export getResourceStage');
});

test('fresh resource is harvestable (stage 3)', function() {
  var resource = { harvested: false, respawnTime: 0, harvestedAt: null };
  assert.strictEqual(W.getResourceStage(resource), 3, 'untouched resource is harvestable');
});

test('just-harvested resource is empty (stage 0)', function() {
  var resource = {
    harvested: true,
    harvestedAt: Date.now(),
    respawnTime: Date.now() + 60000
  };
  assert.strictEqual(W.getResourceStage(resource), 0, 'just harvested = empty');
});

test('early regrowth is sprout (stage 1)', function() {
  var now = Date.now();
  var totalTime = 60000;
  // 8 seconds elapsed = 13% of 60s → stage 1 (0-33%)
  var resource = {
    harvested: true,
    harvestedAt: now - 8000,
    respawnTime: now - 8000 + totalTime
  };
  assert.strictEqual(W.getResourceStage(resource), 1, 'early regrowth = sprout');
});

test('mid regrowth is growing (stage 2)', function() {
  var now = Date.now();
  var totalTime = 60000;
  // 35 seconds elapsed = 58% of 60s → stage 2 (33-66%)
  var resource = {
    harvested: true,
    harvestedAt: now - 35000,
    respawnTime: now - 35000 + totalTime
  };
  assert.strictEqual(W.getResourceStage(resource), 2, 'mid regrowth = growing');
});

test('nearly done regrowth is harvestable (stage 3)', function() {
  var now = Date.now();
  var totalTime = 60000;
  // respawnTime in the past = done
  var resource = {
    harvested: true,
    harvestedAt: now - 70000,
    respawnTime: now - 10000
  };
  assert.strictEqual(W.getResourceStage(resource), 3, 'finished regrowth = harvestable');
});

test('stage 3 means resource is harvestable', function() {
  var resource = { harvested: false, respawnTime: 0, harvestedAt: null };
  var stage = W.getResourceStage(resource);
  assert(stage === 3, 'fresh resource should be harvestable stage');
});

test('returns 0-3 integer always', function() {
  var cases = [
    { harvested: false, respawnTime: 0, harvestedAt: null },
    { harvested: true, harvestedAt: Date.now(), respawnTime: Date.now() + 60000 },
    { harvested: true, harvestedAt: Date.now() - 100000, respawnTime: Date.now() - 1000 }
  ];
  cases.forEach(function(r) {
    var s = W.getResourceStage(r);
    assert(s >= 0 && s <= 3 && s === Math.floor(s), 'stage must be 0-3 integer, got ' + s);
  });
});
});

report();
