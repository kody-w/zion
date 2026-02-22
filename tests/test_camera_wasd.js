// test_camera_wasd.js — Verify WASD rotation uses Input.getCameraOrbit, not cameraYaw
var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

var mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'main.js'), 'utf8');

// Find the movement rotation section
var rotateIdx = mainSource.indexOf('Rotate movement delta by camera');
assert(rotateIdx !== -1, 'Should have camera rotation comment');

var rotateSection = mainSource.substring(rotateIdx, rotateIdx + 300);

// Should use Input.getCameraOrbit, NOT raw cameraYaw
assert(rotateSection.indexOf('Input.getCameraOrbit') !== -1,
  'Movement rotation should use Input.getCameraOrbit()');
assert(rotateSection.indexOf('Math.sin(actualYaw)') !== -1,
  'Should use actualYaw from getCameraOrbit, not cameraYaw directly');
assert(rotateSection.indexOf('Math.cos(actualYaw)') !== -1,
  'Should use actualYaw for cos as well');

// Verify cameraYaw is only a fallback
assert(rotateSection.indexOf('cameraYaw') !== -1,
  'cameraYaw should be fallback value');

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
