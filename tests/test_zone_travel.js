// test_zone_travel.js — Tests for seamless zone transitions and fast travel
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var mainSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'main.js'), 'utf8');
var hudSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'hud.js'), 'utf8');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  \u2713 ' + name + '\n');
  } catch (e) {
    failed++;
    process.stdout.write('  \u2717 ' + name + ': ' + e.message + '\n');
  }
}

// ── Seamless zone transitions ──

console.log('\nSeamless Zone Transition Tests');

test('zone boundary crossing does not call loadZone', function() {
  // Find the zone detection block
  var detectIdx = mainSrc.indexOf('detectedZone !== currentZone');
  assert(detectIdx !== -1, 'Should have zone detection logic');

  // Get the zone change handler block (until the next major section)
  var blockEnd = mainSrc.indexOf('visitedZones[currentZone] = true', detectIdx);
  var zoneChangeBlock = mainSrc.substring(detectIdx, blockEnd);

  // loadZone should NOT be called directly in the zone change handler
  assert(!zoneChangeBlock.includes('World.loadZone'), 
    'Zone boundary crossing should not call loadZone (seamless transition)');
});

test('zone boundary crossing still plays zone_enter sound', function() {
  var detectIdx = mainSrc.indexOf('detectedZone !== currentZone');
  var blockEnd = mainSrc.indexOf('visitedZones[currentZone] = true', detectIdx);
  var block = mainSrc.substring(detectIdx, blockEnd);
  assert(block.includes("playSound('zone_enter')"), 'Should play zone entry sound');
});

test('zone boundary crossing still updates HUD label', function() {
  var detectIdx = mainSrc.indexOf('detectedZone !== currentZone');
  var blockEnd = mainSrc.indexOf('visitedZones[currentZone] = true', detectIdx);
  var block = mainSrc.substring(detectIdx, blockEnd);
  assert(block.includes('updateZoneLabel'), 'Should update zone label');
});

test('zone boundary crossing still updates audio', function() {
  var detectIdx = mainSrc.indexOf('detectedZone !== currentZone');
  var blockEnd = mainSrc.indexOf('visitedZones[currentZone] = true', detectIdx);
  var block = mainSrc.substring(detectIdx, blockEnd);
  assert(block.includes('playAmbient'), 'Should update ambient audio');
});

// ── Fast travel via world map ──

console.log('\nFast Travel Tests');

test('showWorldMap accepts onFastTravel callback', function() {
  assert(hudSrc.includes('function showWorldMap(playerPos, npcs, landmarks, onFastTravel)'),
    'showWorldMap should accept 4th parameter: onFastTravel');
});

test('world map has click handler for fast travel', function() {
  var fnStart = hudSrc.indexOf('function showWorldMap');
  var fnEnd = hudSrc.indexOf('\n  function ', fnStart + 20);
  var fnBody = hudSrc.substring(fnStart, fnEnd);
  assert(fnBody.includes("addEventListener('click'"), 'Should add click event listener');
  assert(fnBody.includes('onFastTravel'), 'Click handler should call onFastTravel');
  assert(fnBody.includes('getZoneAtMapClick'), 'Should use getZoneAtMapClick helper');
});

test('getZoneAtMapClick function exists', function() {
  assert(hudSrc.includes('function getZoneAtMapClick'), 'Should define getZoneAtMapClick');
});

test('getZoneAtMapClick checks all zones', function() {
  var fnStart = hudSrc.indexOf('function getZoneAtMapClick');
  var fnEnd = hudSrc.indexOf('\n  function ', fnStart + 20);
  var fnBody = hudSrc.substring(fnStart, fnEnd);
  assert(fnBody.includes('WORLD_MAP_ZONES'), 'Should iterate over WORLD_MAP_ZONES');
  assert(fnBody.includes('return zoneId'), 'Should return the zone id on hit');
  assert(fnBody.includes('return null'), 'Should return null on miss');
});

test('world map instructions mention click to travel', function() {
  var fnStart = hudSrc.indexOf('function showWorldMap');
  var fnEnd = hudSrc.indexOf('\n  function ', fnStart + 20);
  var fnBody = hudSrc.substring(fnStart, fnEnd);
  assert(fnBody.includes('Click a zone to fast travel'),
    'Instructions should tell user to click for fast travel');
});

test('hover tooltip says click to fast travel', function() {
  var fnStart = hudSrc.indexOf('function handleMapHover');
  var fnEnd = hudSrc.indexOf('\n  function ', fnStart + 20);
  var fnBody = hudSrc.substring(fnStart, fnEnd);
  assert(fnBody.includes('Click to fast travel'), 'Hover tooltip should mention fast travel');
});

// ── Fast travel handler in main.js ──

console.log('\nFast Travel Handler Tests');

test('fastTravel action case exists in main.js', function() {
  assert(mainSrc.includes("case 'fastTravel'"), 'Should handle fastTravel action');
});

test('fastTravel uses fadeTransition', function() {
  var caseIdx = mainSrc.indexOf("case 'fastTravel'");
  var nextCase = mainSrc.indexOf('\n      case ', caseIdx + 20);
  var handler = mainSrc.substring(caseIdx, nextCase);
  assert(handler.includes('fadeTransition'), 'fastTravel should use fade transition');
});

test('fastTravel teleports player to zone center', function() {
  var caseIdx = mainSrc.indexOf("case 'fastTravel'");
  var nextCase = mainSrc.indexOf('\n      case ', caseIdx + 20);
  var handler = mainSrc.substring(caseIdx, nextCase);
  assert(handler.includes('localPlayer.position.x = tx'), 'Should set player X to zone center');
  assert(handler.includes('localPlayer.position.z = tz'), 'Should set player Z to zone center');
});

test('fastTravel sends warp protocol message', function() {
  var caseIdx = mainSrc.indexOf("case 'fastTravel'");
  var nextCase = mainSrc.indexOf('\n      case ', caseIdx + 20);
  var handler = mainSrc.substring(caseIdx, nextCase);
  assert(handler.includes("type: 'warp'"), 'Should send warp message');
  assert(handler.includes('broadcastMessage'), 'Should use Network.broadcastMessage');
});

test('fastTravel updates audio, HUD, and NPCs', function() {
  var caseIdx = mainSrc.indexOf("case 'fastTravel'");
  var nextCase = mainSrc.indexOf('\n      case ', caseIdx + 20);
  var handler = mainSrc.substring(caseIdx, nextCase);
  assert(handler.includes('updateZoneLabel'), 'Should update zone label');
  assert(handler.includes('playAmbient'), 'Should update ambient audio');
  assert(handler.includes('reloadZoneNPCs'), 'Should reload NPCs');
});

test('fastTravel starts cinematic camera', function() {
  var caseIdx = mainSrc.indexOf("case 'fastTravel'");
  var nextCase = mainSrc.indexOf('\n      case ', caseIdx + 20);
  var handler = mainSrc.substring(caseIdx, nextCase);
  assert(handler.includes('startZoneCinematic'), 'Should start cinematic camera swoop');
});

test('toggleMap passes fast travel callback to showWorldMap', function() {
  var toggleIdx = mainSrc.indexOf("case 'toggleMap'");
  var nextCase = mainSrc.indexOf("\n      case 'fastTravel'", toggleIdx);
  var handler = mainSrc.substring(toggleIdx, nextCase);
  assert(handler.includes('function(zoneId)'), 'Should pass callback function');
  assert(handler.includes("handleLocalAction('fastTravel'"), 'Callback should trigger fastTravel action');
});

// Report
console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
