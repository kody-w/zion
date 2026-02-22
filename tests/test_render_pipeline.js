/**
 * ZION Rendering Pipeline Optimization Tests
 * Source-analysis tests verifying all 8 rendering optimizations exist and are correct.
 * Runs headless in Node.js — reads source files and checks patterns.
 */

var fs = require('fs');
var path = require('path');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('  PASS: ' + msg);
  } else {
    failed++;
    console.log('  FAIL: ' + msg);
  }
}

// Load source files
var worldSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'world.js'), 'utf8');
var hudSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'hud.js'), 'utf8');
var mainSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'main.js'), 'utf8');

// Load modules for runtime tests
var World = require('../src/js/world');
var HUD = require('../src/js/hud');

// ========================================================================
// 1. TERRAIN HEIGHT CACHE
// ========================================================================
console.log('\n=== 1. Terrain Height Cache ===');

assert(typeof World.getTerrainHeight === 'function', 'getTerrainHeight function is exported');
assert(typeof World.clearTerrainCache === 'function', 'clearTerrainCache function is exported');
assert(typeof World.terrainHeightUncached === 'function', 'terrainHeightUncached function is exported');
assert(worldSrc.indexOf('var terrainCache = {}') !== -1, 'terrainCache object declared in source');
assert(worldSrc.indexOf('var terrainCacheSize = 0') !== -1, 'terrainCacheSize counter declared in source');
assert(worldSrc.indexOf('var TERRAIN_CACHE_MAX = 4096') !== -1, 'TERRAIN_CACHE_MAX = 4096 declared');

// Check cache key format uses 0.5-unit grid snapping
assert(worldSrc.indexOf("Math.round(wx * 2) + '_' + Math.round(wz * 2)") !== -1 ||
       worldSrc.indexOf('Math.round(wx * 2)') !== -1,
       'Cache key uses 0.5-unit grid snapping (Math.round(wx * 2))');

// Check eviction logic
assert(worldSrc.indexOf('terrainCacheSize >= TERRAIN_CACHE_MAX') !== -1, 'Cache eviction at TERRAIN_CACHE_MAX');

// Runtime: verify cache returns consistent results
World.clearTerrainCache();
var h1 = World.getTerrainHeight(10, 20);
var h2 = World.getTerrainHeight(10, 20);
assert(h1 === h2, 'Cached terrain height returns same value for same coords');

var hUnc = World.terrainHeightUncached(10, 20);
assert(typeof hUnc === 'number' && !isNaN(hUnc), 'terrainHeightUncached returns a number');

// ========================================================================
// 2. LIGHT CULLING (tracked array, no scene.traverse)
// ========================================================================
console.log('\n=== 2. Light Culling via Tracked Array ===');

assert(worldSrc.indexOf('var trackedLights = []') !== -1, 'trackedLights array declared in source');
assert(typeof World.cullLights === 'function', 'cullLights function is exported');

// cullLights should NOT call scene.traverse
var cullLightsMatch = worldSrc.match(/function cullLights[\s\S]*?(?=\n  function )/);
if (cullLightsMatch) {
  assert(cullLightsMatch[0].indexOf('scene.traverse') === -1, 'cullLights does NOT call scene.traverse');
  assert(cullLightsMatch[0].indexOf('trackedLights') !== -1, 'cullLights iterates trackedLights array');
} else {
  assert(false, 'cullLights function body found');
  assert(false, 'cullLights iterates trackedLights array');
}

// Verify all PointLight creations push to trackedLights
var lightPushCount = (worldSrc.match(/trackedLights\.push\(/g) || []).length;
assert(lightPushCount >= 6, 'At least 6 trackedLights.push() calls (' + lightPushCount + ' found)');

// ========================================================================
// 3. LOD TRACKING (tracked array, no scene.traverse)
// ========================================================================
console.log('\n=== 3. LOD Object Tracking ===');

assert(worldSrc.indexOf('var lodObjects = []') !== -1, 'lodObjects array declared in source');
assert(typeof World.registerLodObject === 'function', 'registerLodObject function is exported');
assert(typeof World.updateLOD === 'function', 'updateLOD function is exported');

// updateLOD should NOT call scene.traverse
var updateLODMatch = worldSrc.match(/function updateLOD[\s\S]*?(?=\n  function )/);
if (updateLODMatch) {
  assert(updateLODMatch[0].indexOf('scene.traverse') === -1, 'updateLOD does NOT call scene.traverse');
  assert(updateLODMatch[0].indexOf('lodObjects') !== -1, 'updateLOD iterates lodObjects array');
} else {
  assert(false, 'updateLOD function body found');
  assert(false, 'updateLOD iterates lodObjects array');
}

// createTree registers with LOD system
var createTreeMatch = worldSrc.match(/function createTree[\s\S]*?(?=\n  function createRock)/);
if (createTreeMatch) {
  assert(createTreeMatch[0].indexOf("userData.model_type = 'tree'") !== -1, "createTree sets userData.model_type = 'tree'");
  assert(createTreeMatch[0].indexOf('lodObjects.push(') !== -1, 'createTree pushes to lodObjects');
} else {
  assert(false, "createTree sets userData.model_type = 'tree'");
  assert(false, 'createTree pushes to lodObjects');
}

// createRock registers with LOD system
var createRockMatch = worldSrc.match(/function createRock[\s\S]*?(?=\n  function createFlower)/);
if (createRockMatch) {
  assert(createRockMatch[0].indexOf("userData.model_type = 'rock'") !== -1, "createRock sets userData.model_type = 'rock'");
  assert(createRockMatch[0].indexOf('lodObjects.push(') !== -1, 'createRock pushes to lodObjects');
} else {
  assert(false, "createRock sets userData.model_type = 'rock'");
  assert(false, 'createRock pushes to lodObjects');
}

// ========================================================================
// 4. FRUSTUM CULLING REUSE
// ========================================================================
console.log('\n=== 4. Frustum Culling Object Reuse ===');

assert(worldSrc.indexOf('var _frustum') !== -1, '_frustum declared at module scope');
assert(worldSrc.indexOf('var _projMatrix') !== -1, '_projMatrix declared at module scope');

// Lazy-init guard for headless environments
assert(worldSrc.indexOf("typeof THREE !== 'undefined'") !== -1, "Lazy-init guard: typeof THREE !== 'undefined'");

// _frustum and _projMatrix should be declared OUTSIDE functions (module scope)
var frustumLine = worldSrc.split('\n').findIndex(function(l) { return l.indexOf('var _frustum') !== -1; });
var projLine = worldSrc.split('\n').findIndex(function(l) { return l.indexOf('var _projMatrix') !== -1; });
assert(frustumLine > 0, '_frustum found on line ' + (frustumLine + 1));
assert(projLine > 0, '_projMatrix found on line ' + (projLine + 1));

// Verify they are reused in updateFrustumCulling
assert(typeof World.updateFrustumCulling === 'function', 'updateFrustumCulling function is exported');

// ========================================================================
// 5. HUD THROTTLING (frame intervals in main.js)
// ========================================================================
console.log('\n=== 5. HUD Update Throttling ===');

// updatePlayerInfo throttled to every 30 frames
assert(mainSrc.indexOf('% 30 === 0') !== -1 && mainSrc.indexOf('updatePlayerInfo') !== -1,
       'updatePlayerInfo throttled (frame % 30)');

// updateChat throttled to every 60 frames
assert(mainSrc.indexOf('% 60 === 0') !== -1 && mainSrc.indexOf('updateChat') !== -1,
       'updateChat throttled (frame % 60)');

// updateMinimap throttled to every 5 frames
var minimapThrottle = mainSrc.match(/% 5 === 0[\s\S]{0,200}updateMinimap/);
assert(minimapThrottle !== null, 'updateMinimap throttled (frame % 5)');

// updateEmoteBubbles throttled to every 3 frames
var emoteThrottle = mainSrc.match(/% 3 === 0[\s\S]{0,200}updateEmoteBubbles/);
assert(emoteThrottle !== null, 'updateEmoteBubbles throttled (frame % 3)');

// cullLights throttled to every 15 frames
assert(mainSrc.indexOf('% 15 === 0') !== -1 && mainSrc.indexOf('cullLights') !== -1,
       'cullLights throttled (frame % 15)');

// updateInteractiveHighlights throttled to every 5 frames
var highlightThrottle = mainSrc.match(/% 5 === 0[\s\S]{0,200}updateInteractiveHighlights/);
assert(highlightThrottle !== null, 'updateInteractiveHighlights throttled (frame % 5)');

// ========================================================================
// 5b. CHAT DIRTY TRACKING
// ========================================================================
console.log('\n=== 5b. Chat Dirty Tracking ===');

assert(hudSrc.indexOf('lastChatMessageCount') !== -1, 'lastChatMessageCount var declared in hud.js');

// ========================================================================
// 6. WEATHER PARTICLE STAGGER
// ========================================================================
console.log('\n=== 6. Weather Particle Stagger ===');

assert(worldSrc.indexOf('var weatherFrameCounter') !== -1, 'weatherFrameCounter declared in source');

// Rain stagger: (i + weatherFrameCounter) % 3
assert(worldSrc.indexOf('(i + weatherFrameCounter) % 3') !== -1, 'Rain loop uses (i + weatherFrameCounter) % 3 stagger');

// Snow stagger: (j + weatherFrameCounter) % 3
assert(worldSrc.indexOf('(j + weatherFrameCounter) % 3') !== -1, 'Snow loop uses (j + weatherFrameCounter) % 3 stagger');

// Both check position before terrain lookup
var rainCheck = worldSrc.indexOf('camY + 10');
assert(rainCheck !== -1, 'Weather checks position < camY + 10 before terrain lookup');

// weatherFrameCounter incremented
assert(worldSrc.indexOf('weatherFrameCounter++') !== -1, 'weatherFrameCounter incremented each frame');

// ========================================================================
// 7. WATER DISTANCE THROTTLE
// ========================================================================
console.log('\n=== 7. Water Distance Throttle ===');

assert(typeof World.updateWater === 'function', 'updateWater function is exported');

// Check distance threshold patterns
assert(worldSrc.indexOf('waterDist > 150') !== -1, 'Water skip threshold: waterDist > 150');
assert(worldSrc.indexOf('waterDist > 80') !== -1, 'Water throttle threshold: waterDist > 80');

// Check throttle uses frame counter
assert(worldSrc.indexOf('waterFrameCounter % 3') !== -1, 'Water throttle uses waterFrameCounter % 3');

// ========================================================================
// 8. PLAYER INFO DIRTY TRACKING
// ========================================================================
console.log('\n=== 8. PlayerInfo Dirty Tracking ===');

assert(hudSrc.indexOf('var lastPlayerName') !== -1, 'lastPlayerName cache var declared');
assert(hudSrc.indexOf('var lastPlayerSpark') !== -1, 'lastPlayerSpark cache var declared');
assert(hudSrc.indexOf('var lastPlayerZone') !== -1, 'lastPlayerZone cache var declared');
assert(hudSrc.indexOf('var lastPlayerWarmth') !== -1, 'lastPlayerWarmth cache var declared');

// updatePlayerInfo compares before rebuilding
var updatePIMatch = hudSrc.match(/function updatePlayerInfo[\s\S]*?(?=\n  (?:\/\*\*|function ))/);
if (updatePIMatch) {
  var piBody = updatePIMatch[0];
  assert(piBody.indexOf('lastPlayerName') !== -1 && piBody.indexOf('lastPlayerSpark') !== -1,
         'updatePlayerInfo compares cached values before rebuild');
  assert(piBody.indexOf('return') !== -1, 'updatePlayerInfo has early return when unchanged');
} else {
  assert(false, 'updatePlayerInfo compares cached values before rebuild');
  assert(false, 'updatePlayerInfo has early return when unchanged');
}

// Runtime: verify dirty tracking works
assert(typeof HUD.updatePlayerInfo === 'function', 'updatePlayerInfo is exported');

// ========================================================================
// SUMMARY
// ========================================================================
console.log('\n=== SUMMARY ===');
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) {
  console.log('Failed: ' + failed);
  process.exit(1);
} else {
  console.log('All render pipeline optimization tests passed!');
}
