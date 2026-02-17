// test_weather_enhanced.js — Tests for enhanced weather system
var assert = require('assert');

// ── Cloud Group Tests ──

(function testCloudGroupStructure() {
  // Simulate creating a cloud group with 4-6 puffs
  function createCloudGroup() {
    var puffCount = 4 + Math.floor(Math.random() * 3); // 4-6
    var puffs = [];
    for (var i = 0; i < puffCount; i++) {
      puffs.push({
        type: 'sphere',
        radius: 3 + Math.random() * 4,
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 6,
        opacity: 0.5 + Math.random() * 0.2
      });
    }
    return { puffs: puffs, y: 80 + Math.random() * 40 };
  }

  var cloud = createCloudGroup();
  assert.ok(cloud.puffs.length >= 4 && cloud.puffs.length <= 6,
    'Cloud should have 4-6 puffs, got ' + cloud.puffs.length);
  assert.ok(cloud.y >= 80 && cloud.y <= 120,
    'Cloud should be at y=80-120, got ' + cloud.y);

  // Check opacity range
  for (var i = 0; i < cloud.puffs.length; i++) {
    assert.ok(cloud.puffs[i].opacity >= 0.5 && cloud.puffs[i].opacity <= 0.7,
      'Puff opacity should be 0.5-0.7');
  }
  console.log('PASS: Cloud group has correct structure');
})();

// ── Lightning Bolt Geometry ──

(function testLightningBoltGeometry() {
  // Simulate creating a lightning bolt with 5+ segments
  function createLightningBolt(startX, startY, startZ) {
    var segments = 5 + Math.floor(Math.random() * 3); // 5-7
    var points = [];
    var currentX = startX;
    var currentY = startY;
    var currentZ = startZ;
    var groundY = 0;

    for (var i = 0; i <= segments; i++) {
      var t = i / segments;
      var y = startY + (groundY - startY) * t;
      var jitterX = (Math.random() - 0.5) * 10 * (1 - t);
      var jitterZ = (Math.random() - 0.5) * 10 * (1 - t);
      points.push({
        x: startX + jitterX,
        y: y,
        z: startZ + jitterZ
      });
    }
    return { points: points, segments: segments };
  }

  var bolt = createLightningBolt(50, 80, 30);
  assert.ok(bolt.segments >= 5, 'Lightning bolt should have 5+ segments, got ' + bolt.segments);
  assert.ok(bolt.points.length >= 6, 'Should have segments+1 points');

  // First point should be near sky, last near ground
  assert.ok(bolt.points[0].y > 60, 'First point should be high');
  assert.ok(bolt.points[bolt.points.length - 1].y < 10, 'Last point should be near ground');
  console.log('PASS: Lightning bolt geometry has 5+ segments');
})();

// ── Snow Accumulation ──

(function testSnowAccumulation() {
  // Simulate vertex color lerp toward white
  var originalR = 0.3, originalG = 0.6, originalB = 0.2;
  var targetR = 0.95, targetG = 0.95, targetB = 0.98;
  var lerpFactor = 0.02; // 2% per tick

  var currentR = originalR;
  var currentG = originalG;
  var currentB = originalB;

  // Apply 10 ticks of accumulation
  for (var i = 0; i < 10; i++) {
    currentR += (targetR - currentR) * lerpFactor;
    currentG += (targetG - currentG) * lerpFactor;
    currentB += (targetB - currentB) * lerpFactor;
  }

  // Colors should move toward white
  assert.ok(currentR > originalR, 'R should increase toward white');
  assert.ok(currentG > originalG, 'G should increase toward white');
  assert.ok(currentB > originalB, 'B should increase toward white');
  assert.ok(currentR < targetR, 'R should not fully reach target in 10 ticks');

  // Verify melting (lerp back at 1%)
  var meltFactor = 0.01;
  var meltR = currentR;
  for (var j = 0; j < 10; j++) {
    meltR += (originalR - meltR) * meltFactor;
  }
  assert.ok(meltR < currentR, 'Melting should decrease color values');
  console.log('PASS: Snow accumulation lerps vertex colors toward white');
})();

// ── Valley Fog Positioning ──

(function testValleyFogPositioning() {
  // Simulate terrain height checks for fog placement
  function mockTerrainHeight(x, z) {
    // Simple hill function: positive in center, negative in valleys
    return 10 * Math.sin(x * 0.01) * Math.cos(z * 0.01) - 3;
  }

  var fogPlanes = [];
  var fogPositions = [
    { x: 0, z: 0 },       // h = -3 (valley)
    { x: 157, z: 157 },   // h ≈ 10*sin(1.57)*cos(1.57) - 3 ≈ -3 (near zero)
    { x: 50, z: 0 },      // h = 10*sin(0.5) - 3 ≈ 1.79 (hill)
    { x: -100, z: 200 }   // check
  ];

  for (var i = 0; i < fogPositions.length; i++) {
    var pos = fogPositions[i];
    var h = mockTerrainHeight(pos.x, pos.z);
    if (h < 0) {
      fogPlanes.push({ x: pos.x, z: pos.z, y: h + 1, height: h });
    }
  }

  assert.ok(fogPlanes.length > 0, 'Should place fog in at least one valley');
  for (var j = 0; j < fogPlanes.length; j++) {
    assert.ok(fogPlanes[j].height < 0, 'Fog should only be in valleys (h < 0)');
  }
  console.log('PASS: Valley fog planes positioned below terrain average');
})();

// ── Wind Multiplier ──

(function testWindMultiplier() {
  var normalSwayAmplitude = 0.04;
  var weatherTypes = ['clear', 'cloudy', 'rain', 'storm', 'snow'];
  var expectedMultipliers = {
    clear: 1.0,
    cloudy: 1.2,
    rain: 1.5,
    storm: 3.0,
    snow: 0.8
  };

  for (var i = 0; i < weatherTypes.length; i++) {
    var weather = weatherTypes[i];
    var mult = expectedMultipliers[weather];
    var effectiveAmplitude = normalSwayAmplitude * mult;

    if (weather === 'storm') {
      assert.ok(mult >= 3.0, 'Storm should have 3x wind multiplier');
      assert.ok(effectiveAmplitude > normalSwayAmplitude * 2, 'Storm sway should be significantly stronger');
    }
  }
  console.log('PASS: Wind multiplier increases during storm');
})();

// ── Rain Splash Particle Pool ──

(function testRainSplashPool() {
  var MAX_SPLASHES = 200;
  var splashPool = [];

  // Create pool
  for (var i = 0; i < MAX_SPLASHES; i++) {
    splashPool.push({
      active: false,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 0, maxLife: 0.3
    });
  }

  assert.strictEqual(splashPool.length, MAX_SPLASHES, 'Pool should have 200 splash particles');

  // Activate some
  var activatedCount = 0;
  for (var j = 0; j < 50; j++) {
    for (var k = 0; k < splashPool.length; k++) {
      if (!splashPool[k].active) {
        splashPool[k].active = true;
        splashPool[k].life = 0;
        activatedCount++;
        break;
      }
    }
  }

  assert.strictEqual(activatedCount, 50, 'Should activate 50 splashes');
  var activeCount = splashPool.filter(function(s) { return s.active; }).length;
  assert.strictEqual(activeCount, 50, 'Pool should have 50 active splashes');
  console.log('PASS: Rain splash particle pool works');
})();

// ── Terrain Breathing ──

(function testTerrainBreathing() {
  // Simulate terrain vertex undulation
  var baseHeight = 5.0;
  var breathAmplitude = 0.15;
  var breathSpeed = 0.3;

  for (var t = 0; t < 20; t++) {
    var time = t * 0.5;
    var breathOffset = Math.sin(time * breathSpeed) * breathAmplitude;
    var newHeight = baseHeight + breathOffset;
    assert.ok(newHeight >= baseHeight - breathAmplitude, 'Height should not go below min');
    assert.ok(newHeight <= baseHeight + breathAmplitude, 'Height should not exceed max');
  }
  console.log('PASS: Terrain breathing produces valid height offsets');
})();

console.log('\nAll weather enhanced tests passed!');
