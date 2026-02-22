// test_bubble_safety.js — Verify NPC bubble systems use safe iteration and dispose GPU resources
var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

var npcsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'npcs.js'), 'utf8');

// === Chat bubbles: collect-then-delete pattern ===
var chatBubbleFunc = npcsSource.substring(
  npcsSource.indexOf('function updateChatBubbles'),
  npcsSource.indexOf('function updateChatBubbles') + 1500
);

// Should NOT delete during iteration (no .delete inside forEach)
assert(chatBubbleFunc.indexOf('chatBubbles.forEach') !== -1,
  'updateChatBubbles should use forEach (not for-of with delete)');
assert(chatBubbleFunc.indexOf('var toRemove = []') !== -1,
  'updateChatBubbles should collect items to remove');
assert(chatBubbleFunc.indexOf('toRemove.push(') !== -1,
  'updateChatBubbles should push to toRemove array');

// Should dispose GPU resources before removing
assert(chatBubbleFunc.indexOf('.material.map) bubble.mesh.material.map.dispose()') !== -1 ||
       chatBubbleFunc.indexOf('material.map.dispose()') !== -1,
  'updateChatBubbles should dispose texture map');
assert(chatBubbleFunc.indexOf('material.dispose()') !== -1,
  'updateChatBubbles should dispose material');

// === Speech bubbles: collect-then-delete + reusable Vector3 ===
var speechBubbleFunc = npcsSource.substring(
  npcsSource.indexOf('function updateSpeechBubbles'),
  npcsSource.indexOf('function updateSpeechBubbles') + 2000
);

assert(speechBubbleFunc.indexOf('speechBubbles.forEach') !== -1,
  'updateSpeechBubbles should use forEach (not for-of with delete)');
assert(speechBubbleFunc.indexOf('var toRemove = []') !== -1,
  'updateSpeechBubbles should collect items to remove');

// Should use reusable Vector3
assert(npcsSource.indexOf('var _speechWorldPos = null') !== -1,
  '_speechWorldPos should be declared at module scope');
assert(npcsSource.indexOf('var _speechScreenPos = null') !== -1,
  '_speechScreenPos should be declared at module scope');
assert(speechBubbleFunc.indexOf('_speechWorldPos') !== -1,
  'updateSpeechBubbles should use reusable _speechWorldPos');
assert(speechBubbleFunc.indexOf('_speechScreenPos.copy(') !== -1,
  'updateSpeechBubbles should copy worldPos to screenPos (not clone)');

// Should NOT create new THREE.Vector3() inside the forEach loop
// The lazy-init at the top of the function is OK
var forEachStart = speechBubbleFunc.indexOf('.forEach(');
var insideForEach = forEachStart !== -1 ? speechBubbleFunc.substring(forEachStart) : '';
assert(insideForEach.indexOf('new THREE.Vector3()') === -1,
  'updateSpeechBubbles forEach should NOT create new Vector3 per bubble');

// Should guard removeChild with parentNode check
assert(speechBubbleFunc.indexOf('.parentNode') !== -1,
  'updateSpeechBubbles should check parentNode before removeChild');

// === Speech bubble timers: collect-then-delete ===
var timerFunc = npcsSource.substring(
  npcsSource.indexOf('function updateSpeechBubbleTimers'),
  npcsSource.indexOf('function updateSpeechBubbleTimers') + 1000
);

assert(timerFunc.indexOf('speechBubbles.forEach') !== -1,
  'updateSpeechBubbleTimers should use forEach');
assert(timerFunc.indexOf('var toRemove = []') !== -1,
  'updateSpeechBubbleTimers should collect items to remove');
assert(timerFunc.indexOf('.parentNode') !== -1,
  'updateSpeechBubbleTimers should check parentNode before removeChild');

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
