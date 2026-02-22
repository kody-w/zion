// test_xr.js — Comprehensive tests for the XR (WebXR VR/AR) module
'use strict';

// ─── Headless environment setup ───────────────────────────────────────────────
// Must be set before requiring xr.js so initXR and enterAR see no navigator.xr.
// Node v22 makes global.navigator a read-only getter, so use defineProperty.
Object.defineProperty(global, 'navigator', {
  value: { xr: undefined },
  writable: true,
  configurable: true
});
global.document = undefined;

const { test, suite, report, assert } = require('./test_runner');
const XR = require('../src/js/xr');

// ─── 1. Export verification ───────────────────────────────────────────────────

suite('Export verification — all public API members are present', function() {

  test('XR module exports an object', function() {
    assert(typeof XR === 'object' && XR !== null, 'XR should be a non-null object');
  });

  test('initXR is exported as a function', function() {
    assert(typeof XR.initXR === 'function', 'initXR should be a function');
  });

  test('enterVR is exported as a function', function() {
    assert(typeof XR.enterVR === 'function', 'enterVR should be a function');
  });

  test('enterAR is exported as a function', function() {
    assert(typeof XR.enterAR === 'function', 'enterAR should be a function');
  });

  test('exitXR is exported as a function', function() {
    assert(typeof XR.exitXR === 'function', 'exitXR should be a function');
  });

  test('checkSpeed is exported as a function', function() {
    assert(typeof XR.checkSpeed === 'function', 'checkSpeed should be a function');
  });

  test('showSafetyWarning is exported as a function', function() {
    assert(typeof XR.showSafetyWarning === 'function', 'showSafetyWarning should be a function');
  });

  test('no unexpected non-function exports', function() {
    var expectedFunctions = ['initXR', 'enterVR', 'enterAR', 'exitXR', 'checkSpeed', 'showSafetyWarning'];
    Object.keys(XR).forEach(function(key) {
      assert(
        expectedFunctions.indexOf(key) !== -1,
        'Unexpected export: ' + key
      );
    });
  });
});

// ─── 2. checkSpeed — pure math ────────────────────────────────────────────────

suite('checkSpeed — pure math function', function() {

  test('returns an object with safe and speed keys', function() {
    var result = XR.checkSpeed({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert(typeof result === 'object' && result !== null, 'Should return object');
    assert('safe' in result, 'Result should have safe key');
    assert('speed' in result, 'Result should have speed key');
  });

  test('zero displacement returns speed of 0', function() {
    var result = XR.checkSpeed({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert.strictEqual(result.speed, 0, 'Speed should be 0 when positions are identical');
  });

  test('zero displacement is marked safe', function() {
    var result = XR.checkSpeed({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert.strictEqual(result.safe, true, 'Zero speed should be safe');
  });

  test('speed property is always a number', function() {
    var result = XR.checkSpeed({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert(typeof result.speed === 'number', 'speed should be a number');
    assert(!isNaN(result.speed), 'speed should not be NaN');
  });

  test('speed is always non-negative', function() {
    var result = XR.checkSpeed({ x: -10, y: -5, z: -3 }, { x: 0, y: 0, z: 0 }, 1);
    assert(result.speed >= 0, 'Speed must be >= 0, got: ' + result.speed);
  });

  test('10 m in 1 s along X axis returns ~36 km/h', function() {
    // 10 m/s * 3.6 = 36 km/h
    var result = XR.checkSpeed({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert(Math.abs(result.speed - 36) < 0.001, 'Expected ~36 km/h, got ' + result.speed);
  });

  test('10 m in 1 s is above the 25 km/h safety threshold (marked unsafe)', function() {
    var result = XR.checkSpeed({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert.strictEqual(result.safe, false, 'Moving at 36 km/h should not be safe');
  });

  test('10 m in 1 s along Z axis also returns ~36 km/h', function() {
    var result = XR.checkSpeed({ x: 0, y: 0, z: 10 }, { x: 0, y: 0, z: 0 }, 1);
    assert(Math.abs(result.speed - 36) < 0.001, 'Expected ~36 km/h on Z axis, got ' + result.speed);
  });

  test('10 m in 0.5 s gives ~72 km/h (distance / time scaling)', function() {
    // distance = 10 m, time = 0.5 s => 20 m/s => 72 km/h
    var result = XR.checkSpeed({ x: 0, y: 0, z: 10 }, { x: 0, y: 0, z: 0 }, 0.5);
    assert(Math.abs(result.speed - 72) < 0.001, 'Expected ~72 km/h, got ' + result.speed);
  });

  test('halving deltaTime doubles the reported speed', function() {
    var slow = XR.checkSpeed({ x: 6, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 2);
    var fast = XR.checkSpeed({ x: 6, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert(Math.abs(fast.speed - slow.speed * 2) < 0.001,
      'Halving deltaTime should double speed: ' + slow.speed + ' vs ' + fast.speed);
  });

  test('slow walking speed (1 m in 1 s = 3.6 km/h) is marked safe', function() {
    // 1 m/s * 3.6 = 3.6 km/h — well under 25 km/h
    var result = XR.checkSpeed({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert.strictEqual(result.safe, true, '3.6 km/h should be safe');
  });

  test('exactly 25 km/h (6.944... m/s) is marked safe (boundary)', function() {
    // 25 km/h = 25/3.6 m/s ≈ 6.9444 m/s
    var mps = 25 / 3.6;
    var result = XR.checkSpeed({ x: mps, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert.strictEqual(result.safe, true, 'Exactly 25 km/h should be safe (<=)');
  });

  test('3D diagonal displacement calculates Euclidean distance correctly', function() {
    // 3-4-5 right triangle scaled: dx=3, dy=4 => distance=5 in 1 s => 18 km/h => safe
    var result = XR.checkSpeed({ x: 3, y: 4, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    var expected = 5 * 3.6; // 18 km/h
    assert(Math.abs(result.speed - expected) < 0.001,
      'Expected ' + expected + ' km/h via Pythagorean, got ' + result.speed);
    assert.strictEqual(result.safe, true, '18 km/h should be safe');
  });

  test('null position returns safe:true and speed:0', function() {
    var result = XR.checkSpeed(null, { x: 0, y: 0, z: 0 }, 1);
    assert.strictEqual(result.safe, true, 'null position should return safe');
    assert.strictEqual(result.speed, 0, 'null position should return speed 0');
  });

  test('null lastPosition returns safe:true and speed:0', function() {
    var result = XR.checkSpeed({ x: 5, y: 0, z: 0 }, null, 1);
    assert.strictEqual(result.safe, true, 'null lastPosition should return safe');
    assert.strictEqual(result.speed, 0, 'null lastPosition should return speed 0');
  });

  test('deltaTime of 0 returns safe:true and speed:0 (guard against divide-by-zero)', function() {
    var result = XR.checkSpeed({ x: 100, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0);
    assert.strictEqual(result.safe, true, 'deltaTime=0 should be safe');
    assert.strictEqual(result.speed, 0, 'deltaTime=0 should return speed 0');
  });

  test('negative position displacement still produces non-negative speed', function() {
    var result = XR.checkSpeed({ x: -5, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert(result.speed >= 0, 'Speed must be non-negative even with negative displacement');
  });

  test('speed is symmetric — swapping position and lastPosition gives same speed', function() {
    var r1 = XR.checkSpeed({ x: 7, y: 3, z: 1 }, { x: 0, y: 0, z: 0 }, 1);
    var r2 = XR.checkSpeed({ x: 0, y: 0, z: 0 }, { x: 7, y: 3, z: 1 }, 1);
    assert(Math.abs(r1.speed - r2.speed) < 0.001,
      'Speed should be symmetric: ' + r1.speed + ' vs ' + r2.speed);
  });
});

// ─── 3. initXR — headless (no navigator.xr) ──────────────────────────────────

suite('initXR — headless environment (no WebXR available)', function() {

  test('initXR returns a Promise', function() {
    var result = XR.initXR();
    assert(result instanceof Promise, 'initXR should return a Promise');
    result.catch(function() {}); // suppress unhandled rejection
  });

  test('initXR resolves to an object with vrSupported and arSupported', function(done) {
    return XR.initXR().then(function(caps) {
      assert(typeof caps === 'object' && caps !== null, 'Should resolve to object');
      assert('vrSupported' in caps, 'Should have vrSupported');
      assert('arSupported' in caps, 'Should have arSupported');
    });
  });

  test('initXR resolves vrSupported:false when navigator.xr is undefined', function() {
    return XR.initXR().then(function(caps) {
      assert.strictEqual(caps.vrSupported, false, 'vrSupported should be false in headless');
    });
  });

  test('initXR resolves arSupported:false when navigator.xr is undefined', function() {
    return XR.initXR().then(function(caps) {
      assert.strictEqual(caps.arSupported, false, 'arSupported should be false in headless');
    });
  });

  test('initXR does not throw synchronously', function() {
    var threw = false;
    try {
      XR.initXR();
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'initXR should not throw synchronously');
  });
});

// ─── 4. enterVR — headless (no navigator.xr) ─────────────────────────────────

suite('enterVR — headless environment (no WebXR available)', function() {

  test('enterVR returns a Promise', function() {
    var result = XR.enterVR({}, {}, {});
    assert(result instanceof Promise, 'enterVR should return a Promise');
    result.catch(function() {}); // suppress unhandled rejection
  });

  test('enterVR rejects when navigator.xr is unavailable', function() {
    return XR.enterVR({}, {}, {}).then(function() {
      throw new Error('Should have rejected');
    }, function(err) {
      assert(err instanceof Error, 'Should reject with an Error');
      assert(err.message.indexOf('WebXR') !== -1 || err.message.length > 0,
        'Error message should be meaningful');
    });
  });

  test('enterVR rejects even with null renderer', function() {
    return XR.enterVR(null, {}, {}).then(function() {
      throw new Error('Should have rejected');
    }, function(err) {
      assert(err instanceof Error, 'Should reject with an Error for null renderer');
    });
  });
});

// ─── 5. enterAR — headless (no navigator.xr) ─────────────────────────────────

suite('enterAR — headless environment (no WebXR available)', function() {

  test('enterAR returns a Promise', function() {
    var result = XR.enterAR({}, {}, {});
    assert(result instanceof Promise, 'enterAR should return a Promise');
    result.catch(function() {}); // suppress unhandled rejection
  });

  test('enterAR rejects when navigator.xr is unavailable', function() {
    return XR.enterAR({}, {}, {}).then(function() {
      throw new Error('Should have rejected');
    }, function(err) {
      assert(err instanceof Error, 'Should reject with an Error');
    });
  });
});

// ─── 6. exitXR — no active session ───────────────────────────────────────────

suite('exitXR — safety in headless (no active session)', function() {

  test('exitXR returns a Promise', function() {
    var result = XR.exitXR();
    assert(result instanceof Promise, 'exitXR should return a Promise');
    result.catch(function() {}); // suppress unhandled rejection
  });

  test('exitXR resolves without throwing when no session is active', function() {
    return XR.exitXR().then(function() {
      assert(true, 'exitXR should resolve cleanly with no active session');
    });
  });

  test('calling exitXR twice in a row does not throw', function() {
    return XR.exitXR()
      .then(function() { return XR.exitXR(); })
      .then(function() {
        assert(true, 'Second exitXR call should also resolve cleanly');
      });
  });
});

// ─── 7. showSafetyWarning — headless (document undefined) ────────────────────

suite('showSafetyWarning — headless (document is undefined)', function() {

  test('showSafetyWarning returns a Promise', function() {
    var result = XR.showSafetyWarning();
    assert(result instanceof Promise, 'showSafetyWarning should return a Promise');
    result.catch(function() {}); // suppress unhandled rejection
  });

  test('showSafetyWarning resolves to true when document is undefined', function() {
    return XR.showSafetyWarning().then(function(accepted) {
      assert.strictEqual(accepted, true,
        'Should auto-accept when document is undefined (headless)');
    });
  });

  test('showSafetyWarning does not throw synchronously', function() {
    var threw = false;
    try {
      XR.showSafetyWarning();
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'showSafetyWarning should not throw synchronously');
  });

  test('showSafetyWarning can be called multiple times without error', function() {
    return XR.showSafetyWarning()
      .then(function() { return XR.showSafetyWarning(); })
      .then(function(result) {
        assert.strictEqual(result, true, 'Second call should also resolve true in headless');
      });
  });
});

// ─── 8. checkSpeed — edge cases and integration ───────────────────────────────

suite('checkSpeed — edge cases', function() {

  test('large displacement (100 m in 1 s = 360 km/h) is unsafe', function() {
    var result = XR.checkSpeed({ x: 100, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert.strictEqual(result.safe, false, '360 km/h should not be safe');
    assert(Math.abs(result.speed - 360) < 0.001, 'Expected 360 km/h, got ' + result.speed);
  });

  test('very small movement (0.001 m in 1 s) is safe', function() {
    var result = XR.checkSpeed({ x: 0.001, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert.strictEqual(result.safe, true, 'Tiny movement should be safe');
    assert(result.speed < 0.01, 'Speed should be near zero, got ' + result.speed);
  });

  test('Y-axis only movement is correctly measured', function() {
    // 5 m up in 1 s = 18 km/h — safe
    var result = XR.checkSpeed({ x: 0, y: 5, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    var expected = 5 * 3.6; // 18 km/h
    assert(Math.abs(result.speed - expected) < 0.001,
      'Y-axis: expected ' + expected + ', got ' + result.speed);
    assert.strictEqual(result.safe, true, '18 km/h on Y should be safe');
  });

  test('large deltaTime reduces reported speed proportionally', function() {
    // 10 m in 10 s = 1 m/s = 3.6 km/h (safe)
    var result = XR.checkSpeed({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 10);
    assert(Math.abs(result.speed - 3.6) < 0.001, 'Expected 3.6 km/h, got ' + result.speed);
    assert.strictEqual(result.safe, true, '3.6 km/h should be safe');
  });

  test('safe flag is a boolean', function() {
    var result = XR.checkSpeed({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert(typeof result.safe === 'boolean', 'safe should be a boolean, got ' + typeof result.safe);
  });

  test('speed is in km/h units — 1 m/s gives 3.6', function() {
    // 1 m/s = 3.6 km/h by the formula speedMetersPerSecond * 3.6
    var result = XR.checkSpeed({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    assert(Math.abs(result.speed - 3.6) < 0.001,
      'Unit check: 1 m/s should give 3.6 km/h, got ' + result.speed);
  });
});

// ─── Report ───────────────────────────────────────────────────────────────────

var success = report();
process.exit(success ? 0 : 1);
