/**
 * tests/test_fps_toggle.js
 * Verifies that input.js loads without error and exports the expected API.
 * Covers: module load, initInput, getMovementDelta, getPlatform,
 *         createMoveMessage, getMouseNDC, getCameraDistance, getCameraOrbit
 */
'use strict';

// ---------------------------------------------------------------------------
// Environment setup — input.js references window/document/navigator
// Provide stubs before requiring the module.
// ---------------------------------------------------------------------------

global.window = {
  addEventListener: function() {},
  removeEventListener: function() {},
  innerWidth: 1280,
  innerHeight: 720,
  location: { hostname: 'localhost', href: 'http://localhost/' }
};

global.document = {
  addEventListener: function() {},
  removeEventListener: function() {},
  getElementById: function() { return null; },
  pointerLockElement: null
};

try {
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'node-test', platform: 'node' },
    writable: true,
    configurable: true
  });
} catch (e) {
  // navigator already defined and non-configurable — leave as-is
}

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log('PASS: ' + msg);
  } else {
    failed++;
    console.log('FAIL: ' + msg);
  }
}

// ---------------------------------------------------------------------------
// Load module — this is the primary test: it must not throw
// ---------------------------------------------------------------------------

var Input = null;
var loadError = null;

try {
  Input = require('../src/js/input');
} catch (e) {
  loadError = e;
}

assert(loadError === null, 'input.js loads without throwing (error: ' + (loadError ? loadError.message : 'none') + ')');
assert(Input !== null, 'input.js exports a non-null object');

// ---------------------------------------------------------------------------
// Export shape — each expected function exists
// ---------------------------------------------------------------------------

if (Input) {

  assert(typeof Input.initInput === 'function', 'initInput is exported');
  assert(typeof Input.getMovementDelta === 'function', 'getMovementDelta is exported');
  assert(typeof Input.getPlatform === 'function', 'getPlatform is exported');
  assert(typeof Input.createMoveMessage === 'function', 'createMoveMessage is exported');
  assert(typeof Input.getMouseNDC === 'function', 'getMouseNDC is exported');
  assert(typeof Input.getCameraDistance === 'function', 'getCameraDistance is exported');
  assert(typeof Input.getCameraOrbit === 'function', 'getCameraOrbit is exported');

  // ---------------------------------------------------------------------------
  // Basic call smoke-tests (no DOM — just verify they don't throw)
  // ---------------------------------------------------------------------------

  var platform = null;
  var getPlatformThrew = false;
  try {
    platform = Input.getPlatform();
  } catch (e) {
    getPlatformThrew = true;
  }
  assert(!getPlatformThrew, 'getPlatform() does not throw');
  assert(typeof platform === 'string', 'getPlatform() returns a string');

  var delta = null;
  var deltaThrew = false;
  try {
    delta = Input.getMovementDelta();
  } catch (e) {
    deltaThrew = true;
  }
  assert(!deltaThrew, 'getMovementDelta() does not throw');
  assert(delta !== null && typeof delta === 'object', 'getMovementDelta() returns an object');

  var ndcThrew = false;
  try {
    Input.getMouseNDC();
  } catch (e) {
    ndcThrew = true;
  }
  assert(!ndcThrew, 'getMouseNDC() does not throw');

  var camDistThrew = false;
  try {
    Input.getCameraDistance();
  } catch (e) {
    camDistThrew = true;
  }
  assert(!camDistThrew, 'getCameraDistance() does not throw');

  var camOrbitThrew = false;
  try {
    Input.getCameraOrbit();
  } catch (e) {
    camOrbitThrew = true;
  }
  assert(!camOrbitThrew, 'getCameraOrbit() does not throw');

}

// ---------------------------------------------------------------------------

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
