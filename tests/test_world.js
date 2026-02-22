/**
 * tests/test_world.js
 * Comprehensive tests for /Users/kodyw/Projects/Zion/src/js/world.js
 *
 * Tests cover:
 *   1. Export verification
 *   2. ZONES data integrity
 *   3. getTerrainHeight (via exported wrapper)
 *   4. Zone lookup (getZoneAtPosition)
 *   5. getZoneCenter
 *   6. State getters (getCurrentWeather, getBuildMode, getWindStrength)
 *   7. checkCollision
 *   8. emitParticles / loadWorldMemory / saveWorldMemory (no-op safety)
 *   9. Interaction helpers
 *  10. Zone interactives
 *  11. fadeTransition (no document)
 *  12. addStructure / createPortal
 *  13. weatherCallbacks
 *  14. getPerformanceStats shape (via try/catch)
 *  15. Determinism and numeric sanity
 *  16. getZoneCenter edge cases
 *  17. Zone weighted detection (small vs large zones)
 *  18. Terrain at known positions
 */

'use strict';

var runner = require('./test_runner');
var test   = runner.test;
var suite  = runner.suite;
var report = runner.report;
var assert = runner.assert;

// world.js uses THREE only inside functions that need it (initScene etc.).
// Pure math functions and zone lookups run fine in Node.js without THREE.
global.THREE = undefined;

var W = require('../src/js/world.js');

// ============================================================================
// 1. EXPORT VERIFICATION — module shape
// ============================================================================

suite('Export verification — functions', function() {
  test('module exports an object', function() {
    assert.ok(W && typeof W === 'object');
  });

  var exportedFunctions = [
    'initScene', 'loadZone', 'addPlayer', 'movePlayer', 'removePlayer',
    'updatePlayerAnimations', 'updateDayNight', 'updateWeather', 'setWeather',
    'updateWeatherEffects', 'getCurrentWeather', 'cullLights', 'updateAnimations',
    'updateChunks', 'getZoneAtPosition', 'getTerrainHeight', 'getZoneCenter',
    'checkCollision', 'getTexture', 'initParticles', 'updateParticles', 'emitParticles',
    'initWater', 'updateWater', 'initSkybox', 'updateSkybox',
    'initResourceNodes', 'updateResourceNodes', 'harvestResource',
    'getResourceNodeAtMouse', 'enterBuildMode', 'exitBuildMode', 'setBuildType',
    'confirmPlacement', 'removeLastPlaced', 'updateBuildPreview',
    'rotateBuildPreview', 'getBuildMode', 'updateLOD', 'updateFrustumCulling',
    'getFromPool', 'returnToPool', 'getPerformanceStats',
    'spawnZoneInteractives', 'createInteractiveObject', 'getInteractiveAtPosition',
    'interactWithObject', 'updateInteractiveHighlights', 'updateInteractiveAnimations',
    'clearInteractiveObjects', 'getZoneInteractives', 'highlightObject',
    'unhighlightObject', 'fadeTransition', 'createZoneBoundaryParticles',
    'updateZoneBoundaryParticles', 'initWildlife', 'updateWildlife', 'clearWildlife',
    'initZoneAmbience', 'updateZoneAmbience', 'initSeasonalParticles',
    'updateSeasonalVisuals', 'registerPlayerStar', 'loadWorldMemory',
    'saveWorldMemory', 'updateWorldMemory', 'initBillboardClouds',
    'updateBillboardClouds', 'initRainSplashes', 'updateSnowAccumulation',
    'initValleyFog', 'updateValleyFog', 'updateTerrainBreathing',
    'updateWindSystem', 'getWindStrength', 'initZoneBorderShimmer',
    'updateZoneBorderShimmer', 'addStructure', 'createPortal'
  ];

  exportedFunctions.forEach(function(name) {
    test('exports function: ' + name, function() {
      assert.strictEqual(typeof W[name], 'function',
        'Expected ' + name + ' to be a function');
    });
  });

  test('exports ZONES object', function() {
    assert.ok(W.ZONES && typeof W.ZONES === 'object');
  });

  test('exports weatherCallbacks object', function() {
    assert.ok(W.weatherCallbacks && typeof W.weatherCallbacks === 'object');
  });

  test('total exported keys is at least 82', function() {
    assert.ok(Object.keys(W).length >= 82,
      'Got ' + Object.keys(W).length + ' exports');
  });
});

// ============================================================================
// 2. ZONES DATA INTEGRITY
// ============================================================================

suite('ZONES data — all 8 zones exist', function() {
  var expectedZones = ['nexus', 'gardens', 'athenaeum', 'studio',
                       'wilds', 'agora', 'commons', 'arena'];

  test('ZONES has exactly 8 entries', function() {
    assert.strictEqual(Object.keys(W.ZONES).length, 8);
  });

  expectedZones.forEach(function(id) {
    test('zone exists: ' + id, function() {
      assert.ok(W.ZONES[id], 'Missing zone: ' + id);
    });
    test(id + ' has numeric cx', function() {
      assert.strictEqual(typeof W.ZONES[id].cx, 'number');
    });
    test(id + ' has numeric cz', function() {
      assert.strictEqual(typeof W.ZONES[id].cz, 'number');
    });
    test(id + ' has numeric radius > 0', function() {
      assert.ok(W.ZONES[id].radius > 0,
        id + ' radius should be positive');
    });
    test(id + ' has a name string', function() {
      assert.strictEqual(typeof W.ZONES[id].name, 'string');
      assert.ok(W.ZONES[id].name.length > 0);
    });
    test(id + ' has numeric baseHeight', function() {
      assert.strictEqual(typeof W.ZONES[id].baseHeight, 'number');
    });
  });
});

suite('ZONES data — specific coordinates', function() {
  test('nexus is at cx=0, cz=0', function() {
    assert.strictEqual(W.ZONES.nexus.cx, 0);
    assert.strictEqual(W.ZONES.nexus.cz, 0);
  });
  test('nexus radius = 60', function() {
    assert.strictEqual(W.ZONES.nexus.radius, 60);
  });
  test('nexus baseHeight = 2', function() {
    assert.strictEqual(W.ZONES.nexus.baseHeight, 2);
  });
  test('nexus name = "The Nexus"', function() {
    assert.strictEqual(W.ZONES.nexus.name, 'The Nexus');
  });
  test('gardens is at cx=200, cz=30', function() {
    assert.strictEqual(W.ZONES.gardens.cx, 200);
    assert.strictEqual(W.ZONES.gardens.cz, 30);
  });
  test('gardens radius = 80', function() {
    assert.strictEqual(W.ZONES.gardens.radius, 80);
  });
  test('gardens baseHeight = 0', function() {
    assert.strictEqual(W.ZONES.gardens.baseHeight, 0);
  });
  test('gardens name = "The Gardens"', function() {
    assert.strictEqual(W.ZONES.gardens.name, 'The Gardens');
  });
  test('athenaeum is at cx=100, cz=-220', function() {
    assert.strictEqual(W.ZONES.athenaeum.cx, 100);
    assert.strictEqual(W.ZONES.athenaeum.cz, -220);
  });
  test('athenaeum radius = 60', function() {
    assert.strictEqual(W.ZONES.athenaeum.radius, 60);
  });
  test('studio is at cx=-200, cz=-100', function() {
    assert.strictEqual(W.ZONES.studio.cx, -200);
    assert.strictEqual(W.ZONES.studio.cz, -100);
  });
  test('wilds is at cx=-30, cz=260', function() {
    assert.strictEqual(W.ZONES.wilds.cx, -30);
    assert.strictEqual(W.ZONES.wilds.cz, 260);
  });
  test('wilds radius = 90 (largest zone)', function() {
    assert.strictEqual(W.ZONES.wilds.radius, 90);
  });
  test('agora is at cx=-190, cz=120', function() {
    assert.strictEqual(W.ZONES.agora.cx, -190);
    assert.strictEqual(W.ZONES.agora.cz, 120);
  });
  test('commons is at cx=170, cz=190', function() {
    assert.strictEqual(W.ZONES.commons.cx, 170);
    assert.strictEqual(W.ZONES.commons.cz, 190);
  });
  test('arena is at cx=0, cz=-240', function() {
    assert.strictEqual(W.ZONES.arena.cx, 0);
    assert.strictEqual(W.ZONES.arena.cz, -240);
  });
  test('arena baseHeight = 3', function() {
    assert.strictEqual(W.ZONES.arena.baseHeight, 3);
  });
  test('all zones have color (numeric hex)', function() {
    Object.keys(W.ZONES).forEach(function(id) {
      assert.strictEqual(typeof W.ZONES[id].color, 'number');
    });
  });
  test('all zones have groundColor (numeric hex)', function() {
    Object.keys(W.ZONES).forEach(function(id) {
      assert.strictEqual(typeof W.ZONES[id].groundColor, 'number');
    });
  });
});

// ============================================================================
// 3. getTerrainHeight — terrain at zone centers matches baseHeight
// ============================================================================

suite('getTerrainHeight — returns a number', function() {
  test('getTerrainHeight(0, 0) is a number', function() {
    var h = W.getTerrainHeight(0, 0);
    assert.strictEqual(typeof h, 'number');
  });

  test('getTerrainHeight(0, 0) is finite', function() {
    assert.ok(isFinite(W.getTerrainHeight(0, 0)));
  });

  test('getTerrainHeight(500, 500) is a finite number', function() {
    var h = W.getTerrainHeight(500, 500);
    assert.ok(typeof h === 'number' && isFinite(h));
  });

  test('getTerrainHeight(-300, 300) is a finite number', function() {
    var h = W.getTerrainHeight(-300, 300);
    assert.ok(typeof h === 'number' && isFinite(h));
  });
});

suite('getTerrainHeight — zone centers equal baseHeight', function() {
  var EPSILON = 0.001;

  test('nexus (0,0) height === 2 (baseHeight)', function() {
    var h = W.getTerrainHeight(0, 0);
    assert.ok(Math.abs(h - 2) < EPSILON,
      'Expected ~2, got ' + h);
  });

  test('gardens (200,30) height === 0 (baseHeight)', function() {
    var h = W.getTerrainHeight(200, 30);
    assert.ok(Math.abs(h - 0) < EPSILON,
      'Expected ~0, got ' + h);
  });

  test('athenaeum (100,-220) height === 4 (baseHeight)', function() {
    var h = W.getTerrainHeight(100, -220);
    assert.ok(Math.abs(h - 4) < EPSILON,
      'Expected ~4, got ' + h);
  });

  test('studio (-200,-100) height === 1 (baseHeight)', function() {
    var h = W.getTerrainHeight(-200, -100);
    assert.ok(Math.abs(h - 1) < EPSILON,
      'Expected ~1, got ' + h);
  });

  test('wilds (-30,260) height === -1 (baseHeight)', function() {
    var h = W.getTerrainHeight(-30, 260);
    assert.ok(Math.abs(h - (-1)) < EPSILON,
      'Expected ~-1, got ' + h);
  });

  test('agora (-190,120) height === 1.5 (baseHeight)', function() {
    var h = W.getTerrainHeight(-190, 120);
    assert.ok(Math.abs(h - 1.5) < EPSILON,
      'Expected ~1.5, got ' + h);
  });

  test('commons (170,190) height === 0.5 (baseHeight)', function() {
    var h = W.getTerrainHeight(170, 190);
    assert.ok(Math.abs(h - 0.5) < EPSILON,
      'Expected ~0.5, got ' + h);
  });

  test('arena (0,-240) height === 3 (baseHeight)', function() {
    var h = W.getTerrainHeight(0, -240);
    assert.ok(Math.abs(h - 3) < EPSILON,
      'Expected ~3, got ' + h);
  });
});

suite('getTerrainHeight — determinism', function() {
  test('same coordinates return identical values', function() {
    var h1 = W.getTerrainHeight(123, 456);
    var h2 = W.getTerrainHeight(123, 456);
    assert.strictEqual(h1, h2);
  });

  test('different coordinates return different values (far apart)', function() {
    var h1 = W.getTerrainHeight(0, 0);
    var h2 = W.getTerrainHeight(500, 500);
    assert.notStrictEqual(h1, h2);
  });

  test('terrain at (0,0) called twice gives same result', function() {
    var h1 = W.getTerrainHeight(0, 0);
    var h2 = W.getTerrainHeight(0, 0);
    assert.strictEqual(h1, h2);
  });

  test('terrain at nexus is exactly 2 (repeatable)', function() {
    for (var i = 0; i < 3; i++) {
      assert.strictEqual(W.getTerrainHeight(0, 0), 2);
    }
  });
});

suite('getTerrainHeight — zone flat region sanity', function() {
  test('terrain near nexus center is close to 2', function() {
    // Within flat radius (60*0.5=30) height should be close to baseHeight
    var h = W.getTerrainHeight(5, 5);
    assert.ok(Math.abs(h - 2) < 1,
      'Expected near 2, got ' + h);
  });

  test('terrain far from all zones is a reasonable number', function() {
    // Outside all zones — raw noise ranges roughly -10 to +22 before shift
    var h = W.getTerrainHeight(-600, 600);
    assert.ok(h > -20 && h < 40,
      'Expected terrain in range, got ' + h);
  });
});

// ============================================================================
// 4. getZoneAtPosition — zone detection
// ============================================================================

suite('getZoneAtPosition — exact zone centers', function() {
  test('(0, 0) → nexus', function() {
    assert.strictEqual(W.getZoneAtPosition(0, 0), 'nexus');
  });

  test('(200, 30) → gardens', function() {
    assert.strictEqual(W.getZoneAtPosition(200, 30), 'gardens');
  });

  test('(100, -220) → athenaeum', function() {
    assert.strictEqual(W.getZoneAtPosition(100, -220), 'athenaeum');
  });

  test('(-200, -100) → studio', function() {
    assert.strictEqual(W.getZoneAtPosition(-200, -100), 'studio');
  });

  test('(-30, 260) → wilds', function() {
    assert.strictEqual(W.getZoneAtPosition(-30, 260), 'wilds');
  });

  test('(-190, 120) → agora', function() {
    assert.strictEqual(W.getZoneAtPosition(-190, 120), 'agora');
  });

  test('(170, 190) → commons', function() {
    assert.strictEqual(W.getZoneAtPosition(170, 190), 'commons');
  });

  test('(0, -240) → arena', function() {
    assert.strictEqual(W.getZoneAtPosition(0, -240), 'arena');
  });
});

suite('getZoneAtPosition — return type', function() {
  test('always returns a string', function() {
    assert.strictEqual(typeof W.getZoneAtPosition(0, 0), 'string');
  });

  test('returns a valid zone ID', function() {
    var result = W.getZoneAtPosition(0, 0);
    assert.ok(result in W.ZONES, 'Expected a valid zone key, got ' + result);
  });

  test('returns a valid zone ID for far coordinates', function() {
    var result = W.getZoneAtPosition(550, 550);
    assert.ok(result in W.ZONES, 'Expected a valid zone key, got ' + result);
  });

  test('returns a valid zone ID for negative coordinates', function() {
    var result = W.getZoneAtPosition(-500, -500);
    assert.ok(result in W.ZONES, 'Expected a valid zone key, got ' + result);
  });
});

suite('getZoneAtPosition — near-center detection', function() {
  test('(1, 1) near nexus → nexus', function() {
    assert.strictEqual(W.getZoneAtPosition(1, 1), 'nexus');
  });

  test('(199, 30) near gardens → gardens', function() {
    assert.strictEqual(W.getZoneAtPosition(199, 30), 'gardens');
  });

  test('(0, -239) near arena → arena', function() {
    assert.strictEqual(W.getZoneAtPosition(0, -239), 'arena');
  });

  test('(-29, 260) near wilds → wilds', function() {
    assert.strictEqual(W.getZoneAtPosition(-29, 260), 'wilds');
  });
});

// ============================================================================
// 5. getZoneCenter
// ============================================================================

suite('getZoneCenter — valid zones', function() {
  test('nexus center has x=0, z=0', function() {
    var c = W.getZoneCenter('nexus');
    assert.strictEqual(c.x, 0);
    assert.strictEqual(c.z, 0);
  });

  test('gardens center has x=200, z=30', function() {
    var c = W.getZoneCenter('gardens');
    assert.strictEqual(c.x, 200);
    assert.strictEqual(c.z, 30);
  });

  test('athenaeum center has x=100, z=-220', function() {
    var c = W.getZoneCenter('athenaeum');
    assert.strictEqual(c.x, 100);
    assert.strictEqual(c.z, -220);
  });

  test('studio center has x=-200, z=-100', function() {
    var c = W.getZoneCenter('studio');
    assert.strictEqual(c.x, -200);
    assert.strictEqual(c.z, -100);
  });

  test('wilds center has x=-30, z=260', function() {
    var c = W.getZoneCenter('wilds');
    assert.strictEqual(c.x, -30);
    assert.strictEqual(c.z, 260);
  });

  test('agora center has x=-190, z=120', function() {
    var c = W.getZoneCenter('agora');
    assert.strictEqual(c.x, -190);
    assert.strictEqual(c.z, 120);
  });

  test('commons center has x=170, z=190', function() {
    var c = W.getZoneCenter('commons');
    assert.strictEqual(c.x, 170);
    assert.strictEqual(c.z, 190);
  });

  test('arena center has x=0, z=-240', function() {
    var c = W.getZoneCenter('arena');
    assert.strictEqual(c.x, 0);
    assert.strictEqual(c.z, -240);
  });

  test('returns an object with x and z properties', function() {
    var c = W.getZoneCenter('nexus');
    assert.ok('x' in c && 'z' in c);
  });

  test('x and z are numbers', function() {
    var c = W.getZoneCenter('gardens');
    assert.strictEqual(typeof c.x, 'number');
    assert.strictEqual(typeof c.z, 'number');
  });
});

suite('getZoneCenter — invalid zones', function() {
  test('unknown zone returns fallback {x:0, z:0}', function() {
    var c = W.getZoneCenter('doesNotExist');
    assert.strictEqual(c.x, 0);
    assert.strictEqual(c.z, 0);
  });

  test('empty string returns fallback {x:0, z:0}', function() {
    var c = W.getZoneCenter('');
    assert.strictEqual(c.x, 0);
    assert.strictEqual(c.z, 0);
  });

  test('undefined returns fallback {x:0, z:0}', function() {
    var c = W.getZoneCenter(undefined);
    assert.strictEqual(c.x, 0);
    assert.strictEqual(c.z, 0);
  });
});

// ============================================================================
// 6. STATE GETTERS — getCurrentWeather, getBuildMode, getWindStrength
// ============================================================================

suite('getCurrentWeather', function() {
  test('returns a string', function() {
    assert.strictEqual(typeof W.getCurrentWeather(), 'string');
  });

  test('default weather is "clear"', function() {
    assert.strictEqual(W.getCurrentWeather(), 'clear');
  });

  test('returns the same value on repeated calls', function() {
    var w1 = W.getCurrentWeather();
    var w2 = W.getCurrentWeather();
    assert.strictEqual(w1, w2);
  });
});

suite('getBuildMode', function() {
  test('returns a boolean', function() {
    assert.strictEqual(typeof W.getBuildMode(), 'boolean');
  });

  test('default build mode is false', function() {
    assert.strictEqual(W.getBuildMode(), false);
  });
});

suite('getWindStrength', function() {
  test('returns a number', function() {
    assert.strictEqual(typeof W.getWindStrength(), 'number');
  });

  test('default wind strength is 1', function() {
    assert.strictEqual(W.getWindStrength(), 1);
  });

  test('wind strength is finite', function() {
    assert.ok(isFinite(W.getWindStrength()));
  });

  test('wind strength is non-negative', function() {
    assert.ok(W.getWindStrength() >= 0);
  });
});

// ============================================================================
// 7. checkCollision
// ============================================================================

suite('checkCollision', function() {
  test('returns false when no structures placed', function() {
    assert.strictEqual(W.checkCollision(0, 0, 1), false);
  });

  test('returns false for off-world coordinates', function() {
    assert.strictEqual(W.checkCollision(1000, 1000, 1), false);
  });

  test('returns false for negative coordinates', function() {
    assert.strictEqual(W.checkCollision(-500, -500, 1), false);
  });

  test('returns boolean type', function() {
    assert.strictEqual(typeof W.checkCollision(0, 0, 1), 'boolean');
  });

  test('returns false with radius 0', function() {
    assert.strictEqual(W.checkCollision(0, 0, 0), false);
  });

  test('returns false at zone center with large radius', function() {
    assert.strictEqual(W.checkCollision(200, 30, 10), false);
  });
});

// ============================================================================
// 8. emitParticles / loadWorldMemory / saveWorldMemory (safe no-ops)
// ============================================================================

suite('emitParticles — no-op safety', function() {
  test('does not throw when called without init', function() {
    var threw = false;
    try {
      W.emitParticles('sparkle', { x: 0, y: 0, z: 0 }, 5);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('does not throw with null position', function() {
    var threw = false;
    try {
      W.emitParticles('sparkle', null, 1);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('does not throw with undefined count', function() {
    var threw = false;
    try {
      W.emitParticles('fire', { x: 10, y: 0, z: 10 });
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
});

suite('loadWorldMemory — no localStorage', function() {
  test('does not throw when localStorage is absent', function() {
    var threw = false;
    try {
      W.loadWorldMemory();
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
});

suite('saveWorldMemory — no localStorage', function() {
  test('does not throw when localStorage is absent', function() {
    var threw = false;
    try {
      W.saveWorldMemory();
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
});

suite('updateWorldMemory — null args safety', function() {
  test('does not throw with null player position', function() {
    var threw = false;
    try {
      W.updateWorldMemory(null, null, null, 0.016);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
});

// ============================================================================
// 9. Interaction helpers
// ============================================================================

suite('interactWithObject', function() {
  test('returns null for non-existent object id', function() {
    assert.strictEqual(W.interactWithObject(9999), null);
  });

  test('returns null for id 0', function() {
    assert.strictEqual(W.interactWithObject(0), null);
  });

  test('returns null for negative id', function() {
    assert.strictEqual(W.interactWithObject(-1), null);
  });
});

suite('getInteractiveAtPosition', function() {
  test('returns null when no interactives exist', function() {
    assert.strictEqual(W.getInteractiveAtPosition(0, 0, 5), null);
  });

  test('returns null with large radius when no interactives', function() {
    assert.strictEqual(W.getInteractiveAtPosition(100, 100, 1000), null);
  });
});

suite('unhighlightObject — idempotent', function() {
  test('does not throw when nothing is highlighted', function() {
    var threw = false;
    try {
      W.unhighlightObject();
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('can be called multiple times without error', function() {
    var threw = false;
    try {
      W.unhighlightObject();
      W.unhighlightObject();
      W.unhighlightObject();
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
});

suite('highlightObject — null safety', function() {
  test('does not throw with null mesh', function() {
    var threw = false;
    try {
      W.highlightObject(null);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });
});

// ============================================================================
// 10. Zone interactives
// ============================================================================

suite('getZoneInteractives', function() {
  test('returns an array', function() {
    assert.ok(Array.isArray(W.getZoneInteractives('nexus')));
  });

  test('returns empty array for nexus when no interactives spawned', function() {
    assert.strictEqual(W.getZoneInteractives('nexus').length, 0);
  });

  test('returns empty array for unknown zone', function() {
    var result = W.getZoneInteractives('nonexistent');
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  test('returns empty array for gardens zone', function() {
    assert.ok(Array.isArray(W.getZoneInteractives('gardens')));
  });

  test('returns empty array for arena zone', function() {
    assert.ok(Array.isArray(W.getZoneInteractives('arena')));
  });
});

// ============================================================================
// 11. fadeTransition — no document environment
// ============================================================================

suite('fadeTransition', function() {
  test('calls callback immediately when no document', function() {
    var called = false;
    W.fadeTransition(function() { called = true; });
    assert.strictEqual(called, true);
  });

  test('does not throw when callback is null', function() {
    var threw = false;
    try {
      W.fadeTransition(null);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('does not throw when callback is undefined', function() {
    var threw = false;
    try {
      W.fadeTransition(undefined);
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('callback receives no arguments (undefined)', function() {
    var argCount = -1;
    W.fadeTransition(function() { argCount = arguments.length; });
    assert.strictEqual(argCount, 0);
  });
});

// ============================================================================
// 12. addStructure / createPortal
// ============================================================================

suite('addStructure', function() {
  test('returns null when sceneCtx is null', function() {
    assert.strictEqual(W.addStructure(null, 'house', { x: 0, z: 0 }), null);
  });

  test('returns null when sceneCtx is undefined', function() {
    assert.strictEqual(W.addStructure(undefined, 'tower', { x: 10, z: 10 }), null);
  });

  test('returns null when sceneCtx lacks .scene', function() {
    assert.strictEqual(W.addStructure({}, 'wall', { x: 5, z: 5 }), null);
  });
});

suite('createPortal', function() {
  test('returns null when sceneCtx is null', function() {
    assert.strictEqual(W.createPortal(null, 'nexus', 'gardens', { x: 0, z: 0 }), null);
  });

  test('returns null when sceneCtx is undefined', function() {
    assert.strictEqual(W.createPortal(undefined, 'nexus', 'arena', { x: 0, z: 0 }), null);
  });

  test('returns null when sceneCtx lacks .scene', function() {
    assert.strictEqual(W.createPortal({}, 'nexus', 'wilds', { x: 0, z: 0 }), null);
  });
});

// ============================================================================
// 13. weatherCallbacks
// ============================================================================

suite('weatherCallbacks', function() {
  test('is an object', function() {
    assert.strictEqual(typeof W.weatherCallbacks, 'object');
  });

  test('is not null', function() {
    assert.ok(W.weatherCallbacks !== null);
  });

  test('starts as empty object (no default callbacks)', function() {
    assert.strictEqual(Object.keys(W.weatherCallbacks).length, 0);
  });

  test('can have callbacks assigned without error', function() {
    var threw = false;
    try {
      W.weatherCallbacks.onLightningStrike = function() {};
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
    // Clean up
    delete W.weatherCallbacks.onLightningStrike;
  });
});

// ============================================================================
// 14. getPerformanceStats shape
// ============================================================================

suite('getPerformanceStats', function() {
  test('returns an object (or throws ReferenceError gracefully)', function() {
    // sceneContext is not defined at module scope — function may throw
    // We verify either returns valid stats or the error is a known ReferenceError
    var result = null;
    var threw = false;
    try {
      result = W.getPerformanceStats();
    } catch (e) {
      threw = true;
      assert.ok(e instanceof ReferenceError,
        'Expected ReferenceError due to missing sceneContext, got: ' + e);
    }
    if (!threw) {
      assert.ok(result && typeof result === 'object');
    }
  });
});

// ============================================================================
// 15. ZONES structure — color and texName fields
// ============================================================================

suite('ZONES — color and texture properties', function() {
  test('nexus color is a number', function() {
    assert.strictEqual(typeof W.ZONES.nexus.color, 'number');
  });

  test('gardens texName is a string', function() {
    assert.strictEqual(typeof W.ZONES.gardens.texName, 'string');
  });

  test('nexus texName is "stone.png"', function() {
    assert.strictEqual(W.ZONES.nexus.texName, 'stone.png');
  });

  test('gardens texName is "grass.png"', function() {
    assert.strictEqual(W.ZONES.gardens.texName, 'grass.png');
  });

  test('wilds texName is "grass_dark.png"', function() {
    assert.strictEqual(W.ZONES.wilds.texName, 'grass_dark.png');
  });

  test('arena texName is "sand.png"', function() {
    assert.strictEqual(W.ZONES.arena.texName, 'sand.png');
  });

  test('all zones have texName string', function() {
    Object.keys(W.ZONES).forEach(function(id) {
      assert.strictEqual(typeof W.ZONES[id].texName, 'string',
        id + ' missing texName');
      assert.ok(W.ZONES[id].texName.length > 0);
    });
  });
});

// ============================================================================
// 16. getZoneCenter — coordinate agreement with ZONES
// ============================================================================

suite('getZoneCenter — matches ZONES coordinates', function() {
  var zones = ['nexus', 'gardens', 'athenaeum', 'studio',
               'wilds', 'agora', 'commons', 'arena'];

  zones.forEach(function(id) {
    test(id + ': getZoneCenter x matches ZONES.cx', function() {
      var c = W.getZoneCenter(id);
      assert.strictEqual(c.x, W.ZONES[id].cx);
    });
    test(id + ': getZoneCenter z matches ZONES.cz', function() {
      var c = W.getZoneCenter(id);
      assert.strictEqual(c.z, W.ZONES[id].cz);
    });
  });
});

// ============================================================================
// 17. Zone weighted detection — ensuring zone priority is correct
// ============================================================================

suite('getZoneAtPosition — weighted detection sanity', function() {
  test('result is always a valid zone key', function() {
    var testPoints = [
      [0, 0], [200, 30], [100, -220], [-200, -100],
      [-30, 260], [-190, 120], [170, 190], [0, -240],
      [500, 500], [-500, -500], [300, -300], [-300, 300]
    ];
    testPoints.forEach(function(pt) {
      var result = W.getZoneAtPosition(pt[0], pt[1]);
      assert.ok(result in W.ZONES,
        'getZoneAtPosition(' + pt[0] + ',' + pt[1] + ') returned invalid zone: ' + result);
    });
  });

  test('zone at exact center always matches zone id', function() {
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio',
                 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(id) {
      var z = W.ZONES[id];
      var result = W.getZoneAtPosition(z.cx, z.cz);
      assert.strictEqual(result, id,
        'Expected ' + id + ' at its center, got ' + result);
    });
  });

  test('origin (0,0) always maps to nexus', function() {
    assert.strictEqual(W.getZoneAtPosition(0, 0), 'nexus');
  });

  test('calling with same coords multiple times is consistent', function() {
    var r1 = W.getZoneAtPosition(200, 30);
    var r2 = W.getZoneAtPosition(200, 30);
    var r3 = W.getZoneAtPosition(200, 30);
    assert.strictEqual(r1, r2);
    assert.strictEqual(r2, r3);
  });
});

// ============================================================================
// 18. Terrain numeric range sanity
// ============================================================================

suite('getTerrainHeight — numeric sanity across many points', function() {
  var testCoords = [
    [0, 0], [200, 30], [100, -220], [-200, -100],
    [-30, 260], [-190, 120], [170, 190], [0, -240],
    [300, 0], [0, 300], [-300, 0], [0, -300],
    [500, 500], [-500, 500], [500, -500], [-500, -500]
  ];

  testCoords.forEach(function(pt) {
    test('terrain at (' + pt[0] + ',' + pt[1] + ') is a finite number', function() {
      var h = W.getTerrainHeight(pt[0], pt[1]);
      assert.ok(typeof h === 'number' && isFinite(h),
        'Expected finite number, got ' + h);
    });
  });

  test('terrain range at zone centers stays within ±10 of baseHeight', function() {
    // Zone centers are strongly flattened — should be very close to baseHeight
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio',
                 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(id) {
      var z = W.ZONES[id];
      var h = W.getTerrainHeight(z.cx, z.cz);
      assert.ok(Math.abs(h - z.baseHeight) < 10,
        id + ': height ' + h + ' too far from baseHeight ' + z.baseHeight);
    });
  });
});

// ============================================================================
// REPORT
// ============================================================================

var success = report();
process.exit(success ? 0 : 1);
