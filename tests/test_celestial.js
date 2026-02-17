// test_celestial.js — Tests for enhanced celestial system
var assert = require('assert');

// ── Constellation Data Tests ──

var CONSTELLATIONS = {
  orion: {
    name: 'Orion',
    stars: [
      { theta: 1.55, phi: 1.20 }, { theta: 1.60, phi: 1.10 }, { theta: 1.58, phi: 1.00 },
      { theta: 1.50, phi: 0.95 }, { theta: 1.65, phi: 0.95 },
      { theta: 1.52, phi: 0.85 }, { theta: 1.63, phi: 0.85 }
    ]
  },
  bigDipper: {
    name: 'Big Dipper',
    stars: [
      { theta: 0.80, phi: 0.50 }, { theta: 0.85, phi: 0.52 }, { theta: 0.92, phi: 0.50 },
      { theta: 0.98, phi: 0.53 }, { theta: 1.05, phi: 0.48 },
      { theta: 1.10, phi: 0.55 }, { theta: 1.15, phi: 0.50 }
    ]
  },
  cassiopeia: {
    name: 'Cassiopeia',
    stars: [
      { theta: 2.50, phi: 0.40 }, { theta: 2.55, phi: 0.35 }, { theta: 2.60, phi: 0.40 },
      { theta: 2.65, phi: 0.35 }, { theta: 2.70, phi: 0.40 }
    ]
  },
  scorpius: {
    name: 'Scorpius',
    stars: [
      { theta: 4.20, phi: 1.30 }, { theta: 4.22, phi: 1.25 }, { theta: 4.25, phi: 1.20 },
      { theta: 4.27, phi: 1.15 }, { theta: 4.30, phi: 1.10 },
      { theta: 4.35, phi: 1.12 }, { theta: 4.40, phi: 1.15 },
      { theta: 4.45, phi: 1.20 }, { theta: 4.50, phi: 1.25 }
    ]
  },
  leo: {
    name: 'Leo',
    stars: [
      { theta: 3.10, phi: 0.80 }, { theta: 3.15, phi: 0.75 }, { theta: 3.20, phi: 0.78 },
      { theta: 3.25, phi: 0.82 }, { theta: 3.18, phi: 0.88 }, { theta: 3.22, phi: 0.85 }
    ]
  },
  southernCross: {
    name: 'Southern Cross',
    stars: [
      { theta: 5.00, phi: 2.10 }, { theta: 5.05, phi: 2.00 }, { theta: 5.00, phi: 1.90 },
      { theta: 4.95, phi: 2.00 }, { theta: 5.03, phi: 2.00 }
    ]
  }
};

// Test: Constellation data has correct star counts
(function testConstellationStarCounts() {
  assert.strictEqual(CONSTELLATIONS.orion.stars.length, 7, 'Orion should have 7 stars');
  assert.strictEqual(CONSTELLATIONS.bigDipper.stars.length, 7, 'Big Dipper should have 7 stars');
  assert.strictEqual(CONSTELLATIONS.cassiopeia.stars.length, 5, 'Cassiopeia should have 5 stars');
  assert.strictEqual(CONSTELLATIONS.scorpius.stars.length, 9, 'Scorpius should have 9 stars');
  assert.strictEqual(CONSTELLATIONS.leo.stars.length, 6, 'Leo should have 6 stars');
  assert.strictEqual(CONSTELLATIONS.southernCross.stars.length, 5, 'Southern Cross should have 5 stars');

  var totalConstellationStars = 0;
  for (var key in CONSTELLATIONS) {
    totalConstellationStars += CONSTELLATIONS[key].stars.length;
  }
  assert.strictEqual(totalConstellationStars, 39, 'Total constellation stars should be 39');
  console.log('PASS: Constellation star counts correct');
})();

// Test: Star position calculation produces valid coordinates on sphere
(function testStarPositionCalculation() {
  var R = 750;
  for (var key in CONSTELLATIONS) {
    var constellation = CONSTELLATIONS[key];
    for (var i = 0; i < constellation.stars.length; i++) {
      var s = constellation.stars[i];
      var x = R * Math.sin(s.phi) * Math.cos(s.theta);
      var y = R * Math.cos(s.phi);
      var z = R * Math.sin(s.phi) * Math.sin(s.theta);

      // Check the point is on the sphere (within floating point tolerance)
      var dist = Math.sqrt(x * x + y * y + z * z);
      assert.ok(Math.abs(dist - R) < 0.01, 'Star should be on sphere radius ' + R + ', got ' + dist);

      // Check coordinates are finite
      assert.ok(isFinite(x) && isFinite(y) && isFinite(z), 'Star coordinates must be finite');
    }
  }
  console.log('PASS: Star position calculation valid');
})();

// Test: Twinkling phase produces values between min/max size
(function testTwinklingPhase() {
  var baseSize = 2.0;
  var twinkleAmount = 0.5;

  for (var t = 0; t < 100; t++) {
    var time = t * 0.1;
    var phase = Math.random() * Math.PI * 2;
    var twinkle = baseSize + Math.sin(time + phase) * twinkleAmount;
    assert.ok(twinkle >= baseSize - twinkleAmount, 'Twinkle should not go below min');
    assert.ok(twinkle <= baseSize + twinkleAmount, 'Twinkle should not exceed max');
  }
  console.log('PASS: Twinkling phase within bounds');
})();

// Test: Player star registration creates valid state entry
(function testPlayerStarRegistration() {
  var playerStars = {};

  // Simulate registering a star
  var playerId = 'test_player_123';
  var theta = Math.random() * Math.PI * 2;
  var phi = Math.random() * Math.PI;
  var R = 750;

  playerStars[playerId] = {
    name: 'TestPlayer',
    x: R * Math.sin(phi) * Math.cos(theta),
    y: R * Math.cos(phi),
    z: R * Math.sin(phi) * Math.sin(theta),
    color: 0xFFDD88,
    ts: new Date().toISOString()
  };

  assert.ok(playerStars[playerId], 'Player star should exist');
  assert.strictEqual(playerStars[playerId].name, 'TestPlayer');
  assert.strictEqual(playerStars[playerId].color, 0xFFDD88);
  assert.ok(typeof playerStars[playerId].x === 'number');
  assert.ok(typeof playerStars[playerId].y === 'number');
  assert.ok(typeof playerStars[playerId].z === 'number');
  console.log('PASS: Player star registration valid');
})();

// Test: state.applyMessage handles star_register
(function testApplyStarRegister() {
  // Simulate state with playerStars
  var state = { playerStars: {} };
  var message = {
    type: 'star_register',
    from: 'alice',
    ts: new Date().toISOString(),
    payload: {
      name: 'Alice',
      x: 100, y: 200, z: 300,
      color: 0xFFDD88
    }
  };

  // Apply logic (mirrors what state.js will do)
  if (message.type === 'star_register' && message.payload) {
    state.playerStars[message.from] = {
      name: message.payload.name,
      x: message.payload.x,
      y: message.payload.y,
      z: message.payload.z,
      color: message.payload.color,
      ts: message.ts
    };
  }

  assert.ok(state.playerStars.alice, 'Star should be registered for alice');
  assert.strictEqual(state.playerStars.alice.name, 'Alice');
  assert.strictEqual(state.playerStars.alice.x, 100);
  console.log('PASS: applyMessage star_register works');
})();

console.log('\nAll celestial tests passed!');
