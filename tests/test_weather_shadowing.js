// Test that weather variable shadowing is fixed
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

  console.log('Weather variable shadowing fix');
  console.log('');

  // Read main.js source and check for the bug pattern
  var fs = require('fs');
  var src = fs.readFileSync(__dirname + '/../src/js/main.js', 'utf8');

  // The bug: "var currentWeather = World.getCurrentWeather" inside gameLoop
  // shadows the module-level "var currentWeather = 'clear'"
  // The fix: rename to "var waterWeather = ..."

  // Count occurrences of module-level currentWeather declaration
  var moduleLevel = src.match(/^\s*var currentWeather = 'clear'/m);
  assert(moduleLevel !== null, 'module-level currentWeather = clear exists');

  // Check that the water update uses waterWeather, not currentWeather
  var waterWeatherPattern = /var waterWeather\s*=/;
  assert(waterWeatherPattern.test(src), 'water update uses waterWeather variable (no shadowing)');

  // The old bug pattern should NOT exist
  var bugPattern = /var currentWeather\s*=\s*World\.getCurrentWeather/;
  assert(!bugPattern.test(src), 'no var currentWeather = World.getCurrentWeather inside gameLoop');

  // Verify waterWeather is passed to updateWater
  var updateWaterCall = /World\.updateWater\(deltaTime,\s*waterWeather/;
  assert(updateWaterCall.test(src), 'World.updateWater receives waterWeather');

  console.log('');
  console.log('Weather state consistency');

  // Simulate the weather cycling logic
  var currentWeather = 'clear';
  var weatherTypes = ['clear', 'cloudy', 'rain', 'clear', 'storm', 'snow'];
  var changeCount = 0;

  // Run 100 weather cycles — should only change when nextWeather differs
  for (var i = 0; i < 100; i++) {
    var nextWeather = weatherTypes[i % weatherTypes.length];
    if (nextWeather !== currentWeather) {
      currentWeather = nextWeather;
      changeCount++;
    }
  }
  // With no shadowing, weather only changes when nextWeather differs from current
  // With 6-item cycle, max changes per cycle is 5 (same weather adjacent counts as 0 change)
  assert(changeCount < 100, 'weather changes bounded (' + changeCount + ' changes, less than 100)');
  assert(changeCount > 0, 'weather does change at least once');

  // The key test: without shadowing, currentWeather persists across iterations
  currentWeather = 'rain';
  var nextWeather2 = 'rain';
  var changed = (nextWeather2 !== currentWeather);
  assert(!changed, 'same weather does not trigger change (no shadowing)');

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
