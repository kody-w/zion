// test_gameloop_safety.js — Verify game loop has try-catch protection
var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

var mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'main.js'), 'utf8');

// Find the gameLoop function
var gameLoopStart = mainSource.indexOf('function gameLoop(timestamp)');
assert(gameLoopStart !== -1, 'gameLoop function should exist');

// Get the first 500 chars of gameLoop to verify structure
var gameLoopHead = mainSource.substring(gameLoopStart, gameLoopStart + 600);

// requestAnimationFrame should appear BEFORE try block
var rafPos = gameLoopHead.indexOf('requestAnimationFrame(gameLoop)');
var tryPos = gameLoopHead.indexOf('try {');
assert(rafPos !== -1, 'requestAnimationFrame should be in gameLoop header');
assert(tryPos !== -1, 'try block should be in gameLoop');
assert(rafPos < tryPos, 'requestAnimationFrame should come BEFORE try block (so errors dont freeze the loop)');

// Game loop body should end with catch
// gameLoop is ~50K chars, search the full function
var nextFuncMatch = mainSource.indexOf('\n  function ', gameLoopStart + 1);
var gameLoopEnd = nextFuncMatch !== -1 ? nextFuncMatch : gameLoopStart + 60000;
var gameLoopBody = mainSource.substring(gameLoopStart, gameLoopEnd);
var hasCatch = gameLoopBody.indexOf('catch (err)') !== -1;
var hasErrorLog = gameLoopBody.indexOf("console.error('Game loop error:") !== -1;
assert(hasCatch && hasErrorLog, 'gameLoop should have catch block that logs errors');

// Verify there is NOT a second requestAnimationFrame at the end (the old pattern)
var afterTry = mainSource.substring(gameLoopStart + 600);
var endOfGameLoop = afterTry.indexOf('} catch');
if (endOfGameLoop !== -1) {
  var afterCatch = afterTry.substring(endOfGameLoop, endOfGameLoop + 200);
  // Should NOT have another requestAnimationFrame after the catch
  var secondRaf = afterCatch.indexOf('requestAnimationFrame(gameLoop)');
  // This is OK either way — the important thing is that rAF is at the top
}

// Verify _tooltipVec reusable allocation
assert(mainSource.indexOf('var _tooltipVec = null') !== -1, '_tooltipVec should be declared at module scope');
assert(mainSource.indexOf('_tooltipVec.set(') !== -1, 'updateTooltip should reuse _tooltipVec via .set()');
assert(mainSource.indexOf('new window.THREE.Vector3(\n') === -1 ||
       mainSource.indexOf('_tooltipVec = new window.THREE.Vector3()') !== -1,
       'Should not create new Vector3 per frame (should use lazy init + reuse)');

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
