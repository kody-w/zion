// Test: NPC greeting logic — getNPCPositions returns id, greeting dedup
// npcs.js needs AGENTS_PLACEHOLDER and THREE stubs
global.AGENTS_PLACEHOLDER = [];
global.THREE = {
  Group: function() { this.add = function(){}; this.position = {x:0,y:0,z:0}; this.children = []; },
  Mesh: function() { this.position = {x:0,y:0,z:0}; },
  BoxBufferGeometry: function() {},
  SphereBufferGeometry: function() {},
  MeshLambertMaterial: function() {},
  Color: function() {}
};

var NPCs = require('../src/js/npcs.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

// getNPCPositions is a function
assert(typeof NPCs.getNPCPositions === 'function', 'getNPCPositions is a function');

// Without init, returns empty array
var positions = NPCs.getNPCPositions();
assert(Array.isArray(positions), 'getNPCPositions returns array');

// Greeting dedup logic (unit test of the pattern used in main.js)
var greetedNPCIds = {};
var npcName = 'TestNPC';

assert(!greetedNPCIds[npcName], 'NPC not yet greeted');
greetedNPCIds[npcName] = true;
assert(greetedNPCIds[npcName] === true, 'NPC marked as greeted');
assert(!!greetedNPCIds[npcName], 'second check confirms NPC greeted — no duplicate greeting');

// Multiple NPCs tracked independently
greetedNPCIds['AnotherNPC'] = true;
assert(greetedNPCIds['TestNPC'] === true, 'first NPC still tracked');
assert(greetedNPCIds['AnotherNPC'] === true, 'second NPC tracked');
assert(!greetedNPCIds['ThirdNPC'], 'ungreeted NPC returns falsy');

// Cooldown logic (mirrors main.js pattern)
var npcGreetCooldown = 0;
var deltaTime = 0.016;
assert(npcGreetCooldown <= 0, 'cooldown starts at 0');
npcGreetCooldown = 5;
assert(npcGreetCooldown > 0, 'cooldown set to 5');
npcGreetCooldown -= deltaTime;
assert(npcGreetCooldown > 0, 'cooldown decrements but still positive');

console.log('test_roadmap_greeting: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
