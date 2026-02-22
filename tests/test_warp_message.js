// test_warp_message.js — Verify fast travel warp broadcast has required fields
var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

var mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'main.js'), 'utf8');

// Find the warp broadcast section
var warpIdx = mainSource.indexOf("type: 'warp'");
assert(warpIdx !== -1, 'Should have warp message type');

var warpSection = mainSource.substring(warpIdx - 50, warpIdx + 300);

// Should have from field
assert(warpSection.indexOf('from: localPlayer.id') !== -1,
  'Warp message should include from: localPlayer.id');

// Should have ts field
assert(warpSection.indexOf('ts: Date.now()') !== -1,
  'Warp message should include ts: Date.now()');

// Should have payload with zone and position
assert(warpSection.indexOf('zone: currentZone') !== -1,
  'Warp payload should include zone');
assert(warpSection.indexOf('position:') !== -1,
  'Warp payload should include position');

// Verify competitions treated as object not array
var compIdx = mainSource.indexOf('var comps = gameState.competitions');
assert(compIdx !== -1, 'Should have competitions access');
var compSection = mainSource.substring(compIdx, compIdx + 200);
assert(compSection.indexOf('Object.keys(comps)') !== -1,
  'Competitions should use Object.keys() not .length');

// Verify tooltip uses _escHtml
var tooltipIdx = mainSource.indexOf('tooltipEl.innerHTML');
assert(tooltipIdx !== -1, 'Should have tooltip innerHTML');
var tooltipSection = mainSource.substring(tooltipIdx, tooltipIdx + 200);
assert(tooltipSection.indexOf('_escHtml(') !== -1,
  'Tooltip should escape HTML in target name');

// Verify join/leave notifications use string concat not template literals
var joinIdx = mainSource.indexOf('joined the world');
assert(joinIdx !== -1, 'Should have join notification');
var joinLine = mainSource.substring(joinIdx - 60, joinIdx + 30);
assert(joinLine.indexOf('`') === -1, 'Join notification should not use template literal');

var leaveIdx = mainSource.indexOf('left the world');
assert(leaveIdx !== -1, 'Should have leave notification');
var leaveLine = mainSource.substring(leaveIdx - 60, leaveIdx + 30);
assert(leaveLine.indexOf('`') === -1, 'Leave notification should not use template literal');

// Verify getScreenPosition reuses Vector3
assert(mainSource.indexOf('var _screenPosVec = null') !== -1,
  '_screenPosVec should be at module scope');
assert(mainSource.indexOf('_screenPosVec.set(') !== -1,
  'getScreenPosition should reuse _screenPosVec via .set()');

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
