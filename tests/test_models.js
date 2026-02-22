// test_models.js — Tests for Models module (procedural 3D model generators)
// All functions require THREE.js for actual invocation, so tests cover
// module loading, export verification, and type correctness only.
'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

var Models = require('../src/js/models');

// ============================================================================
// Expected exports — 22 total
// ============================================================================

var EXPECTED_EXPORTS = [
  'createTree',
  'createRock',
  'createBuilding',
  'createFurniture',
  'createCreature',
  'createLandmark',
  'createResourceNode',
  'createWildlife',
  'createGrassPatch',
  'createMushroom',
  'createBush',
  'createFallenLog',
  'createRuinWall',
  'createColumnRow',
  'createAmphitheater',
  'createWishingWell',
  'createBookshelf',
  'createTorch',
  'createBridge',
  'createGardenArch',
  'createBannerPole',
  'animateModel'
];

// ============================================================================
// Suite 1: Module loads and exports object
// ============================================================================

suite('Module loading', function() {

  test('Models module loads without error', function() {
    assert.ok(Models !== null && Models !== undefined, 'Models should be non-null');
  });

  test('Models is an object', function() {
    assert.ok(typeof Models === 'object', 'Models should be an object, got: ' + typeof Models);
  });

  test('Models is not an array', function() {
    assert.ok(!Array.isArray(Models), 'Models should be a plain object, not an array');
  });

});

// ============================================================================
// Suite 2: Individual export existence — one test per function
// ============================================================================

suite('Module exports — individual function existence', function() {

  test('createTree is exported', function() {
    assert.ok('createTree' in Models, 'createTree should be exported');
  });

  test('createRock is exported', function() {
    assert.ok('createRock' in Models, 'createRock should be exported');
  });

  test('createBuilding is exported', function() {
    assert.ok('createBuilding' in Models, 'createBuilding should be exported');
  });

  test('createFurniture is exported', function() {
    assert.ok('createFurniture' in Models, 'createFurniture should be exported');
  });

  test('createCreature is exported', function() {
    assert.ok('createCreature' in Models, 'createCreature should be exported');
  });

  test('createLandmark is exported', function() {
    assert.ok('createLandmark' in Models, 'createLandmark should be exported');
  });

  test('createResourceNode is exported', function() {
    assert.ok('createResourceNode' in Models, 'createResourceNode should be exported');
  });

  test('createWildlife is exported', function() {
    assert.ok('createWildlife' in Models, 'createWildlife should be exported');
  });

  test('createGrassPatch is exported', function() {
    assert.ok('createGrassPatch' in Models, 'createGrassPatch should be exported');
  });

  test('createMushroom is exported', function() {
    assert.ok('createMushroom' in Models, 'createMushroom should be exported');
  });

  test('createBush is exported', function() {
    assert.ok('createBush' in Models, 'createBush should be exported');
  });

  test('createFallenLog is exported', function() {
    assert.ok('createFallenLog' in Models, 'createFallenLog should be exported');
  });

  test('createRuinWall is exported', function() {
    assert.ok('createRuinWall' in Models, 'createRuinWall should be exported');
  });

  test('createColumnRow is exported', function() {
    assert.ok('createColumnRow' in Models, 'createColumnRow should be exported');
  });

  test('createAmphitheater is exported', function() {
    assert.ok('createAmphitheater' in Models, 'createAmphitheater should be exported');
  });

  test('createWishingWell is exported', function() {
    assert.ok('createWishingWell' in Models, 'createWishingWell should be exported');
  });

  test('createBookshelf is exported', function() {
    assert.ok('createBookshelf' in Models, 'createBookshelf should be exported');
  });

  test('createTorch is exported', function() {
    assert.ok('createTorch' in Models, 'createTorch should be exported');
  });

  test('createBridge is exported', function() {
    assert.ok('createBridge' in Models, 'createBridge should be exported');
  });

  test('createGardenArch is exported', function() {
    assert.ok('createGardenArch' in Models, 'createGardenArch should be exported');
  });

  test('createBannerPole is exported', function() {
    assert.ok('createBannerPole' in Models, 'createBannerPole should be exported');
  });

  test('animateModel is exported', function() {
    assert.ok('animateModel' in Models, 'animateModel should be exported');
  });

});

// ============================================================================
// Suite 3: Function count — exactly 22 exports
// ============================================================================

suite('Function count', function() {

  test('exactly 22 exports exist', function() {
    var keys = Object.keys(Models);
    assert.strictEqual(keys.length, 22,
      'Expected exactly 22 exports, got: ' + keys.length + ' (' + keys.join(', ') + ')');
  });

  test('no unexpected extra keys', function() {
    var keys = Object.keys(Models);
    var extras = keys.filter(function(k) { return EXPECTED_EXPORTS.indexOf(k) === -1; });
    assert.strictEqual(extras.length, 0,
      'Unexpected extra exports: ' + extras.join(', '));
  });

  test('no missing keys from expected list', function() {
    var missing = EXPECTED_EXPORTS.filter(function(name) { return !(name in Models); });
    assert.strictEqual(missing.length, 0,
      'Missing exports: ' + missing.join(', '));
  });

});

// ============================================================================
// Suite 4: Type checks — every export must be a function
// ============================================================================

suite('Type checks — all exports are functions', function() {

  test('createTree is a function', function() {
    assert.strictEqual(typeof Models.createTree, 'function',
      'createTree should be a function, got: ' + typeof Models.createTree);
  });

  test('createRock is a function', function() {
    assert.strictEqual(typeof Models.createRock, 'function',
      'createRock should be a function, got: ' + typeof Models.createRock);
  });

  test('createBuilding is a function', function() {
    assert.strictEqual(typeof Models.createBuilding, 'function',
      'createBuilding should be a function, got: ' + typeof Models.createBuilding);
  });

  test('createFurniture is a function', function() {
    assert.strictEqual(typeof Models.createFurniture, 'function',
      'createFurniture should be a function, got: ' + typeof Models.createFurniture);
  });

  test('createCreature is a function', function() {
    assert.strictEqual(typeof Models.createCreature, 'function',
      'createCreature should be a function, got: ' + typeof Models.createCreature);
  });

  test('createLandmark is a function', function() {
    assert.strictEqual(typeof Models.createLandmark, 'function',
      'createLandmark should be a function, got: ' + typeof Models.createLandmark);
  });

  test('createResourceNode is a function', function() {
    assert.strictEqual(typeof Models.createResourceNode, 'function',
      'createResourceNode should be a function, got: ' + typeof Models.createResourceNode);
  });

  test('createWildlife is a function', function() {
    assert.strictEqual(typeof Models.createWildlife, 'function',
      'createWildlife should be a function, got: ' + typeof Models.createWildlife);
  });

  test('createGrassPatch is a function', function() {
    assert.strictEqual(typeof Models.createGrassPatch, 'function',
      'createGrassPatch should be a function, got: ' + typeof Models.createGrassPatch);
  });

  test('createMushroom is a function', function() {
    assert.strictEqual(typeof Models.createMushroom, 'function',
      'createMushroom should be a function, got: ' + typeof Models.createMushroom);
  });

  test('createBush is a function', function() {
    assert.strictEqual(typeof Models.createBush, 'function',
      'createBush should be a function, got: ' + typeof Models.createBush);
  });

  test('createFallenLog is a function', function() {
    assert.strictEqual(typeof Models.createFallenLog, 'function',
      'createFallenLog should be a function, got: ' + typeof Models.createFallenLog);
  });

  test('createRuinWall is a function', function() {
    assert.strictEqual(typeof Models.createRuinWall, 'function',
      'createRuinWall should be a function, got: ' + typeof Models.createRuinWall);
  });

  test('createColumnRow is a function', function() {
    assert.strictEqual(typeof Models.createColumnRow, 'function',
      'createColumnRow should be a function, got: ' + typeof Models.createColumnRow);
  });

  test('createAmphitheater is a function', function() {
    assert.strictEqual(typeof Models.createAmphitheater, 'function',
      'createAmphitheater should be a function, got: ' + typeof Models.createAmphitheater);
  });

  test('createWishingWell is a function', function() {
    assert.strictEqual(typeof Models.createWishingWell, 'function',
      'createWishingWell should be a function, got: ' + typeof Models.createWishingWell);
  });

  test('createBookshelf is a function', function() {
    assert.strictEqual(typeof Models.createBookshelf, 'function',
      'createBookshelf should be a function, got: ' + typeof Models.createBookshelf);
  });

  test('createTorch is a function', function() {
    assert.strictEqual(typeof Models.createTorch, 'function',
      'createTorch should be a function, got: ' + typeof Models.createTorch);
  });

  test('createBridge is a function', function() {
    assert.strictEqual(typeof Models.createBridge, 'function',
      'createBridge should be a function, got: ' + typeof Models.createBridge);
  });

  test('createGardenArch is a function', function() {
    assert.strictEqual(typeof Models.createGardenArch, 'function',
      'createGardenArch should be a function, got: ' + typeof Models.createGardenArch);
  });

  test('createBannerPole is a function', function() {
    assert.strictEqual(typeof Models.createBannerPole, 'function',
      'createBannerPole should be a function, got: ' + typeof Models.createBannerPole);
  });

  test('animateModel is a function', function() {
    assert.strictEqual(typeof Models.animateModel, 'function',
      'animateModel should be a function, got: ' + typeof Models.animateModel);
  });

  test('all 22 exports satisfy typeof === function (bulk check)', function() {
    var nonFunctions = EXPECTED_EXPORTS.filter(function(name) {
      return typeof Models[name] !== 'function';
    });
    assert.strictEqual(nonFunctions.length, 0,
      'Non-function exports found: ' + nonFunctions.join(', '));
  });

  test('no export is null', function() {
    var nullExports = EXPECTED_EXPORTS.filter(function(name) {
      return Models[name] === null;
    });
    assert.strictEqual(nullExports.length, 0,
      'Null exports found: ' + nullExports.join(', '));
  });

  test('no export is undefined', function() {
    var undefinedExports = EXPECTED_EXPORTS.filter(function(name) {
      return Models[name] === undefined;
    });
    assert.strictEqual(undefinedExports.length, 0,
      'Undefined exports found: ' + undefinedExports.join(', '));
  });

});

// ============================================================================
// Run & Report
// ============================================================================

if (!report()) process.exit(1);
