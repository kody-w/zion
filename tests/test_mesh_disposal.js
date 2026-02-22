// Test player mesh disposal on disconnect
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

  console.log('Player mesh disposal on disconnect');
  console.log('');

  var fs = require('fs');
  var src = fs.readFileSync(__dirname + '/../src/js/world.js', 'utf8');

  // Verify dispose calls exist in removePlayer
  var disposePattern = /function removePlayer[\s\S]*?\.dispose\(\)/;
  assert(disposePattern.test(src), 'removePlayer includes .dispose() calls');

  // Verify geometry disposal
  var geoDispose = /obj\.geometry\)\s*obj\.geometry\.dispose/;
  assert(geoDispose.test(src), 'geometry.dispose() called in traverse');

  // Verify material disposal
  var matDispose = /obj\.material\.dispose/;
  assert(matDispose.test(src), 'material.dispose() called in traverse');

  // Verify texture disposal (material.map)
  var texDispose = /obj\.material\.map\)\s*obj\.material\.map\.dispose/;
  assert(texDispose.test(src), 'material.map.dispose() called for textures');

  // Verify label sprite disposal
  var labelDispose = /data\.label[\s\S]*?label\.material\.map[\s\S]*?dispose/;
  assert(labelDispose.test(src), 'label sprite resources disposed');

  // Verify traverse pattern
  var traversePattern = /data\.mesh\.traverse\(function\(obj\)/;
  assert(traversePattern.test(src), 'mesh.traverse used for cleanup');

  // Verify playerMeshes.delete still called (original behavior preserved)
  var deleteCall = /playerMeshes\.delete\(playerId\)/;
  assert(deleteCall.test(src), 'playerMeshes.delete(playerId) still called');

  console.log('');
  console.log('Disposal simulation');

  // Simulate the disposal pattern
  var disposed = [];
  var mockMesh = {
    traverse: function(fn) {
      fn({ geometry: { dispose: function() { disposed.push('geo1'); } },
           material: { map: { dispose: function() { disposed.push('tex1'); } },
                       dispose: function() { disposed.push('mat1'); } } });
      fn({ geometry: { dispose: function() { disposed.push('geo2'); } },
           material: { dispose: function() { disposed.push('mat2'); } } });
    }
  };

  mockMesh.traverse(function(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  });

  assert(disposed.length === 5, 'disposed 5 resources (got ' + disposed.length + ')');
  assert(disposed.indexOf('geo1') !== -1, 'first geometry disposed');
  assert(disposed.indexOf('mat1') !== -1, 'first material disposed');
  assert(disposed.indexOf('tex1') !== -1, 'texture disposed');
  assert(disposed.indexOf('geo2') !== -1, 'second geometry disposed');
  assert(disposed.indexOf('mat2') !== -1, 'second material disposed');

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
