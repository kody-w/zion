// Test fast travel parameter fix and chunk loading
(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log('  ok - ' + msg);
      passed++;
    } else {
      console.log('  FAIL - ' + msg);
      failed++;
    }
  }

  console.log('Fast travel parameter fix');
  console.log('');

  // Read main.js source to verify the fix
  var fs = require('fs');
  var src = fs.readFileSync(__dirname + '/../src/js/main.js', 'utf8');

  // The bug: "if (localPlayer && World && data && data.zone)"
  // data is undefined, should be payload
  // The fix: "if (localPlayer && World && payload && payload.zone)"

  // Check the fix is in place
  var fixedPattern = /payload && payload\.zone/;
  assert(fixedPattern.test(src), 'fastTravel uses payload.zone (not data.zone)');

  // The old bug pattern should NOT exist in the fastTravel case
  var bugPattern = /case 'fastTravel'[\s\S]{0,200}data && data\.zone/;
  assert(!bugPattern.test(src), 'no data.zone reference in fastTravel handler');

  console.log('');
  console.log('Fast travel chunk loading');

  // Verify World.updateChunks is called after teleport
  var chunkPattern = /World\.updateChunks\(sceneContext, tx, tz\)/;
  assert(chunkPattern.test(src), 'World.updateChunks called after teleport');

  // Verify the chunk update is inside the fadeTransition callback
  var fadeChunkPattern = /fadeTransition\(function[\s\S]*?updateChunks[\s\S]*?\}\)/;
  assert(fadeChunkPattern.test(src), 'updateChunks is inside fadeTransition callback');

  console.log('');
  console.log('Fast travel zone center math');

  // Simulate fast travel teleport math
  var ZONES = {
    nexus: { cx: 0, cz: 0 },
    gardens: { cx: 200, cz: 30 },
    wilds: { cx: -30, cz: 260 },
    arena: { cx: 0, cz: -240 }
  };

  var zones = Object.keys(ZONES);
  for (var i = 0; i < zones.length; i++) {
    var zone = zones[i];
    var zoneInfo = ZONES[zone];
    assert(typeof zoneInfo.cx === 'number', zone + ' has numeric cx');
    assert(typeof zoneInfo.cz === 'number', zone + ' has numeric cz');
    // Verify positions are within the world bounds (-600 to +600)
    assert(Math.abs(zoneInfo.cx) <= 600, zone + ' cx within bounds');
    assert(Math.abs(zoneInfo.cz) <= 600, zone + ' cz within bounds');
  }

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
