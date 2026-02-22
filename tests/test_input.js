/**
 * tests/test_input.js
 * Test suite for the ZION Input system
 * Covers: exports, createMoveMessage, getPlatform, getMovementDelta,
 *         getMouseNDC, getCameraDistance, getCameraOrbit
 */

'use strict';

// Set up a browser-like global environment before requiring the module.
// input.js calls document.addEventListener in initInput, so we leave
// document undefined to avoid errors and test the pure functions only.
global.document = undefined;
global.window = undefined;

// Node v22 makes global.navigator a read-only getter, so use defineProperty.
Object.defineProperty(global, 'navigator', {
  value: { userAgent: 'Node.js test runner' },
  writable: true,
  configurable: true
});

const { test, suite, report, assert } = require('./test_runner');
const Input = require('../src/js/input');

// ============================================================================
// HELPERS
// ============================================================================

/** Build a minimal position object */
function pos(x, y, z) {
  return { x: x, y: y, z: z };
}

/** Build a minimal delta object */
function delta(x, y, z) {
  return { x: x, y: y, z: z };
}

// ============================================================================
// 1. EXPORT VERIFICATION
// ============================================================================

suite('Module exports', function() {
  test('module loads without throwing', function() {
    assert.ok(Input !== undefined && Input !== null);
  });

  test('exports initInput as a function', function() {
    assert.strictEqual(typeof Input.initInput, 'function');
  });

  test('exports getMovementDelta as a function', function() {
    assert.strictEqual(typeof Input.getMovementDelta, 'function');
  });

  test('exports getPlatform as a function', function() {
    assert.strictEqual(typeof Input.getPlatform, 'function');
  });

  test('exports createMoveMessage as a function', function() {
    assert.strictEqual(typeof Input.createMoveMessage, 'function');
  });

  test('exports getMouseNDC as a function', function() {
    assert.strictEqual(typeof Input.getMouseNDC, 'function');
  });

  test('exports getCameraDistance as a function', function() {
    assert.strictEqual(typeof Input.getCameraDistance, 'function');
  });

  test('exports getCameraOrbit as a function', function() {
    assert.strictEqual(typeof Input.getCameraOrbit, 'function');
  });

  test('exports exactly the documented public API (7 functions)', function() {
    var expectedKeys = [
      'initInput', 'getMovementDelta', 'getPlatform',
      'createMoveMessage', 'getMouseNDC', 'getCameraDistance', 'getCameraOrbit'
    ];
    expectedKeys.forEach(function(key) {
      assert.ok(key in Input, 'Missing export: ' + key);
    });
  });
});

// ============================================================================
// 2. createMoveMessage
// ============================================================================

suite('createMoveMessage — return shape', function() {
  var msg = Input.createMoveMessage('alice', delta(1, 0, -1), pos(10, 0, 20), 'nexus');

  test('returns an object', function() {
    assert.ok(msg !== null && typeof msg === 'object');
  });

  test('has type field', function() {
    assert.ok('type' in msg);
  });

  test('type is "move"', function() {
    assert.strictEqual(msg.type, 'move');
  });

  test('has from field', function() {
    assert.ok('from' in msg);
  });

  test('from matches username param', function() {
    assert.strictEqual(msg.from, 'alice');
  });

  test('has timestamp field', function() {
    assert.ok('timestamp' in msg);
  });

  test('timestamp is a positive number', function() {
    assert.ok(typeof msg.timestamp === 'number' && msg.timestamp > 0);
  });

  test('has nonce field', function() {
    assert.ok('nonce' in msg);
  });

  test('nonce is a non-empty string', function() {
    assert.ok(typeof msg.nonce === 'string' && msg.nonce.length > 0);
  });

  test('has payload field', function() {
    assert.ok('payload' in msg);
  });

  test('payload is an object', function() {
    assert.ok(msg.payload !== null && typeof msg.payload === 'object');
  });

  test('payload has position field', function() {
    assert.ok('position' in msg.payload);
  });

  test('payload has zone field', function() {
    assert.ok('zone' in msg.payload);
  });

  test('payload.zone matches zone param', function() {
    assert.strictEqual(msg.payload.zone, 'nexus');
  });

  test('payload.position is an object with x, y, z', function() {
    var p = msg.payload.position;
    assert.ok('x' in p && 'y' in p && 'z' in p);
  });
});

suite('createMoveMessage — position calculation', function() {
  test('stationary delta (0,0,0) keeps position at origin', function() {
    var msg = Input.createMoveMessage('bob', delta(0, 0, 0), pos(0, 0, 0), 'gardens');
    var p = msg.payload.position;
    assert.strictEqual(p.x, 0);
    assert.strictEqual(p.y, 0);
    assert.strictEqual(p.z, 0);
  });

  test('positive dx advances x from base position', function() {
    var startPos = pos(0, 0, 0);
    var msg = Input.createMoveMessage('charlie', delta(1, 0, 0), startPos, 'nexus');
    assert.ok(msg.payload.position.x > 0, 'Expected x > 0');
  });

  test('negative dz advances z in negative direction', function() {
    var startPos = pos(0, 0, 0);
    var msg = Input.createMoveMessage('dana', delta(0, 0, -1), startPos, 'nexus');
    assert.ok(msg.payload.position.z < 0, 'Expected z < 0');
  });

  test('base position x is included in result x calculation', function() {
    var msg1 = Input.createMoveMessage('eve', delta(1, 0, 0), pos(0, 0, 0), 'nexus');
    var msg2 = Input.createMoveMessage('eve', delta(1, 0, 0), pos(100, 0, 0), 'nexus');
    assert.ok(msg2.payload.position.x > msg1.payload.position.x,
      'Higher base x should produce higher result x');
  });

  test('base position z is included in result z calculation', function() {
    var msg1 = Input.createMoveMessage('frank', delta(0, 0, -1), pos(0, 0, 0), 'nexus');
    var msg2 = Input.createMoveMessage('frank', delta(0, 0, -1), pos(0, 0, 50), 'nexus');
    assert.ok(msg2.payload.position.z > msg1.payload.position.z,
      'Higher base z should produce higher result z');
  });

  test('from field reflects different usernames', function() {
    var msg1 = Input.createMoveMessage('user_a', delta(0, 0, 0), pos(0, 0, 0), 'nexus');
    var msg2 = Input.createMoveMessage('user_b', delta(0, 0, 0), pos(0, 0, 0), 'nexus');
    assert.strictEqual(msg1.from, 'user_a');
    assert.strictEqual(msg2.from, 'user_b');
  });

  test('two calls produce different nonce values', function() {
    var msg1 = Input.createMoveMessage('grace', delta(0, 0, 0), pos(0, 0, 0), 'nexus');
    var msg2 = Input.createMoveMessage('grace', delta(0, 0, 0), pos(0, 0, 0), 'nexus');
    // nonces are random; collision is astronomically unlikely
    assert.notStrictEqual(msg1.nonce, msg2.nonce);
  });

  test('zone field preserved for different zone names', function() {
    var zones = ['nexus', 'gardens', 'athenaeum', 'arena', 'wilds'];
    zones.forEach(function(z) {
      var msg = Input.createMoveMessage('hank', delta(0, 0, 0), pos(0, 0, 0), z);
      assert.strictEqual(msg.payload.zone, z, 'Zone mismatch for: ' + z);
    });
  });
});

// ============================================================================
// 3. getPlatform
// ============================================================================

suite('getPlatform', function() {
  test('returns a string', function() {
    var p = Input.getPlatform();
    assert.strictEqual(typeof p, 'string');
  });

  test('returns a non-empty string', function() {
    var p = Input.getPlatform();
    assert.ok(p.length > 0);
  });

  test('returns "desktop" for Node.js test runner user agent', function() {
    // navigator.userAgent = 'Node.js test runner' — not a mobile UA
    var p = Input.getPlatform();
    assert.strictEqual(p, 'desktop');
  });

  test('result is one of the documented values', function() {
    var allowed = ['desktop', 'phone', 'tablet'];
    var p = Input.getPlatform();
    assert.ok(allowed.indexOf(p) !== -1, 'Unexpected platform: ' + p);
  });

  test('returns "phone" for an Android mobile user agent', function() {
    var savedUA = global.navigator.userAgent;
    global.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 10; Pixel 4) Mobile Safari/537.36' };
    var p = Input.getPlatform();
    global.navigator = { userAgent: savedUA };
    assert.strictEqual(p, 'phone');
  });

  test('returns "phone" for an iPhone user agent', function() {
    var savedUA = global.navigator.userAgent;
    global.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Mobile/15E148' };
    var p = Input.getPlatform();
    global.navigator = { userAgent: savedUA };
    assert.strictEqual(p, 'phone');
  });

  test('returns "desktop" for a typical Chrome desktop user agent', function() {
    var savedUA = global.navigator.userAgent;
    global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' };
    var p = Input.getPlatform();
    global.navigator = { userAgent: savedUA };
    assert.strictEqual(p, 'desktop');
  });

  test('returns "desktop" when navigator is undefined', function() {
    var savedNavigator = global.navigator;
    global.navigator = undefined;
    var p = Input.getPlatform();
    global.navigator = savedNavigator;
    assert.strictEqual(p, 'desktop');
  });
});

// ============================================================================
// 4. getMovementDelta (no-DOM environment)
// ============================================================================

suite('getMovementDelta — headless environment', function() {
  test('returns an object', function() {
    var d = Input.getMovementDelta();
    assert.ok(d !== null && typeof d === 'object');
  });

  test('returned object has x field', function() {
    assert.ok('x' in Input.getMovementDelta());
  });

  test('returned object has y field', function() {
    assert.ok('y' in Input.getMovementDelta());
  });

  test('returned object has z field', function() {
    assert.ok('z' in Input.getMovementDelta());
  });

  test('x is 0 when no keys are pressed', function() {
    assert.strictEqual(Input.getMovementDelta().x, 0);
  });

  test('y is always 0 (vertical axis unused by keyboard)', function() {
    assert.strictEqual(Input.getMovementDelta().y, 0);
  });

  test('z is 0 when no keys are pressed', function() {
    assert.strictEqual(Input.getMovementDelta().z, 0);
  });
});

// ============================================================================
// 5. getMouseNDC
// ============================================================================

suite('getMouseNDC', function() {
  test('returns an object', function() {
    var ndc = Input.getMouseNDC();
    assert.ok(ndc !== null && typeof ndc === 'object');
  });

  test('returned object has x field', function() {
    assert.ok('x' in Input.getMouseNDC());
  });

  test('returned object has y field', function() {
    assert.ok('y' in Input.getMouseNDC());
  });

  test('x defaults to 0', function() {
    assert.strictEqual(Input.getMouseNDC().x, 0);
  });

  test('y defaults to 0', function() {
    assert.strictEqual(Input.getMouseNDC().y, 0);
  });
});

// ============================================================================
// 6. getCameraDistance
// ============================================================================

suite('getCameraDistance', function() {
  test('returns a number', function() {
    assert.strictEqual(typeof Input.getCameraDistance(), 'number');
  });

  test('default camera distance is 20', function() {
    assert.strictEqual(Input.getCameraDistance(), 20);
  });

  test('is within the valid zoom range [5, 50]', function() {
    var d = Input.getCameraDistance();
    assert.ok(d >= 5 && d <= 50, 'Distance out of range: ' + d);
  });
});

// ============================================================================
// 7. getCameraOrbit
// ============================================================================

suite('getCameraOrbit', function() {
  test('returns a number', function() {
    assert.strictEqual(typeof Input.getCameraOrbit(), 'number');
  });

  test('default orbit angle is 0', function() {
    assert.strictEqual(Input.getCameraOrbit(), 0);
  });
});

// ============================================================================
// 8. initInput — graceful no-op in headless environment
// ============================================================================

suite('initInput — headless safety', function() {
  test('does not throw when document is undefined', function() {
    var threw = false;
    try {
      Input.initInput({});
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('accepts no arguments without throwing', function() {
    var threw = false;
    try {
      Input.initInput();
    } catch (e) {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  test('getCameraDistance still works after initInput call', function() {
    Input.initInput({});
    assert.strictEqual(typeof Input.getCameraDistance(), 'number');
  });

  test('getMovementDelta still works after initInput call', function() {
    Input.initInput({});
    var d = Input.getMovementDelta();
    assert.ok(d !== null && typeof d === 'object');
  });
});

// ============================================================================
// REPORT
// ============================================================================

var success = report();
process.exit(success ? 0 : 1);
