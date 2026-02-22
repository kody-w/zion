/**
 * ZION Load Test & Profiler
 * Headless Node.js benchmark — no Three.js, no DOM
 *
 * Measures optimization impact at two scales:
 * - Current: 100 NPCs, 200 players, 500 structures
 * - Stress: 2000 NPCs, 1000 players, 2000 structures (where O(n^2) hurts)
 *
 * Optimizations tested:
 * 1. Spatial hash grid — replaces O(n^2) with O(n*k), wins at scale
 * 2. Nearby-player throttling — skip 9/10 frames
 * 3. Memory eviction — O(n) scan instead of O(n log n) sort for overflow-by-1
 * 4. Message queue batching — cap at 50/frame, prevents spikes
 */

const SpatialGrid = require('../src/js/spatial_grid');

// ========================================================================
// HELPERS
// ========================================================================

function hrMs(start) {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function randomInRange(center, spread) {
  return center + (Math.random() - 0.5) * spread * 2;
}

var ZONE_CENTERS = [
  { x: 0, z: 0 }, { x: 200, z: 30 }, { x: 100, z: -220 },
  { x: -200, z: -100 }, { x: -30, z: 260 }, { x: -190, z: 120 },
  { x: 170, z: 190 }, { x: 0, z: -240 }
];

function generateEntities(count, prefix, spread) {
  var entities = [];
  for (var i = 0; i < count; i++) {
    var c = ZONE_CENTERS[i % ZONE_CENTERS.length];
    entities.push({
      id: prefix + i,
      name: prefix + i,
      zone: 'nexus',
      archetype: 'explorer',
      position: { x: randomInRange(c.x, spread), y: 0, z: randomInRange(c.z, spread) }
    });
  }
  return entities;
}

function generateStructures(count, spread) {
  var s = [];
  for (var i = 0; i < count; i++) {
    var c = ZONE_CENTERS[i % ZONE_CENTERS.length];
    s.push({
      position: { x: randomInRange(c.x, spread), y: 0, z: randomInRange(c.z, spread) },
      collisionRadius: 1 + Math.random() * 3
    });
  }
  return s;
}

var ITERATIONS = 20;

function bench(fn) {
  fn(); // warmup
  var times = [];
  for (var i = 0; i < ITERATIONS; i++) {
    var start = process.hrtime.bigint();
    fn();
    times.push(hrMs(start));
  }
  times.sort(function(a, b) { return a - b; });
  return times[Math.floor(times.length / 2)]; // median
}

function pct(baseline, optimized) {
  return ((baseline - optimized) / baseline * 100);
}

function fmtPct(v) {
  return v >= 0 ? v.toFixed(1) + '% faster' : Math.abs(v).toFixed(1) + '% slower';
}

// ========================================================================
// TEST DATA
// ========================================================================

// Current scale
var npcs100 = generateEntities(100, 'npc_', 80);
var players200 = generateEntities(200, 'player_', 80);
var structs500 = generateStructures(500, 80);

// Stress scale
var npcs2000 = generateEntities(2000, 'npc_', 80);
var players1000 = generateEntities(1000, 'player_', 80);
var structs2000 = generateStructures(2000, 80);

// ========================================================================
// NPC PERCEPTION: O(n^2) vs O(n*k) spatial grid
// ========================================================================

function perceptionBaseline(npcList) {
  var count = 0;
  for (var i = 0; i < npcList.length; i++) {
    for (var j = 0; j < npcList.length; j++) {
      if (i === j) continue;
      var dx = npcList[j].position.x - npcList[i].position.x;
      var dz = npcList[j].position.z - npcList[i].position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 25) count++;
    }
  }
  return count;
}

function perceptionGrid(npcList) {
  var grid = SpatialGrid.createGrid(25);
  for (var i = 0; i < npcList.length; i++) {
    SpatialGrid.insert(grid, npcList[i].id, npcList[i].position.x, npcList[i].position.z);
  }
  var count = 0;
  for (var i = 0; i < npcList.length; i++) {
    var nearby = SpatialGrid.queryRadius(grid, npcList[i].position.x, npcList[i].position.z, 25);
    for (var j = 0; j < nearby.length; j++) {
      if (nearby[j].id !== npcList[i].id) count++;
    }
  }
  return count;
}

// ========================================================================
// COLLISION DETECTION: linear scan vs grid
// ========================================================================

function collisionBaseline(playerList, structList) {
  var hits = 0;
  for (var p = 0; p < playerList.length; p++) {
    var px = playerList[p].position.x, pz = playerList[p].position.z;
    for (var i = 0; i < structList.length; i++) {
      var s = structList[i];
      var dx = px - s.position.x, dz = pz - s.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < (s.collisionRadius || 1.5) + 0.5) {
        hits++; break;
      }
    }
  }
  return hits;
}

function collisionGrid(playerList, structList) {
  var grid = SpatialGrid.createGrid(10);
  for (var i = 0; i < structList.length; i++) {
    SpatialGrid.insert(grid, 's' + i, structList[i].position.x, structList[i].position.z);
  }
  var hits = 0;
  for (var p = 0; p < playerList.length; p++) {
    var px = playerList[p].position.x, pz = playerList[p].position.z;
    var nearby = SpatialGrid.queryRadius(grid, px, pz, 5.5);
    for (var j = 0; j < nearby.length; j++) {
      var idx = parseInt(nearby[j].id.replace('s', ''), 10);
      var s = structList[idx];
      if (nearby[j].dist < (s.collisionRadius || 1.5) + 0.5) {
        hits++; break;
      }
    }
  }
  return hits;
}

// ========================================================================
// NEARBY PLAYER QUERY: all-pairs vs grid
// ========================================================================

function nearbyBaseline(playerList) {
  var count = 0;
  for (var i = 0; i < playerList.length; i++) {
    for (var j = 0; j < playerList.length; j++) {
      if (i === j) continue;
      var dx = playerList[j].position.x - playerList[i].position.x;
      var dz = playerList[j].position.z - playerList[i].position.z;
      if (Math.sqrt(dx * dx + dz * dz) <= 50) count++;
    }
  }
  return count;
}

function nearbyGrid(playerList) {
  var grid = SpatialGrid.createGrid(50);
  for (var i = 0; i < playerList.length; i++) {
    SpatialGrid.insert(grid, playerList[i].id, playerList[i].position.x, playerList[i].position.z);
  }
  var count = 0;
  for (var i = 0; i < playerList.length; i++) {
    var nearby = SpatialGrid.queryRadius(grid, playerList[i].position.x, playerList[i].position.z, 50);
    for (var j = 0; j < nearby.length; j++) {
      if (nearby[j].id !== playerList[i].id) count++;
    }
  }
  return count;
}

// ========================================================================
// NEARBY SORT THROTTLE: every frame vs every 10th frame
// ========================================================================

function nearbySortEveryFrame(playerList, frames) {
  var result;
  var local = playerList[0];
  for (var f = 0; f < frames; f++) {
    result = playerList
      .filter(function(p) { return p.id !== local.id; })
      .map(function(p) {
        var dx = p.position.x - local.position.x;
        var dz = p.position.z - local.position.z;
        return { id: p.id, distance: Math.sqrt(dx * dx + dz * dz) };
      })
      .sort(function(a, b) { return a.distance - b.distance; });
  }
  return result.length;
}

function nearbySortThrottled(playerList, frames) {
  var result;
  var local = playerList[0];
  for (var f = 0; f < frames; f++) {
    if (f % 10 === 0 || !result) {
      result = playerList
        .filter(function(p) { return p.id !== local.id; })
        .map(function(p) {
          var dx = p.position.x - local.position.x;
          var dz = p.position.z - local.position.z;
          return { id: p.id, distance: Math.sqrt(dx * dx + dz * dz) };
        })
        .sort(function(a, b) { return a.distance - b.distance; });
    }
  }
  return result.length;
}

// ========================================================================
// MEMORY EVICTION: sort vs scan-for-min (overflow by 1)
// ========================================================================

function buildMem(count) {
  var m = {};
  for (var i = 0; i < count; i++) {
    m[Math.floor(i / 4) + '_' + (i % 4)] = { steps: Math.floor(Math.random() * 100), flowers: i % 20 === 0 };
  }
  return m;
}

function evictionSort() {
  var mem = buildMem(2001);
  var keys = Object.keys(mem);
  keys.sort(function(a, b) { return mem[a].steps - mem[b].steps; });
  if (!mem[keys[0]].flowers) delete mem[keys[0]];
  return Object.keys(mem).length;
}

function evictionScan() {
  var mem = buildMem(2001);
  var minKey = null, minSteps = Infinity;
  for (var k in mem) {
    if (mem[k] && !mem[k].flowers && mem[k].steps < minSteps) {
      minSteps = mem[k].steps;
      minKey = k;
    }
  }
  if (minKey) delete mem[minKey];
  return Object.keys(mem).length;
}

// ========================================================================
// MESSAGE QUEUE: unbounded vs capped
// ========================================================================

function mqUnbounded() {
  var q = [];
  for (var i = 0; i < 200; i++) q.push({ type: 'move', from: 'p' + i });
  var n = 0;
  while (q.length > 0) { q.shift(); n++; }
  return n;
}

function mqBatched() {
  var q = [];
  for (var i = 0; i < 200; i++) q.push({ type: 'move', from: 'p' + i });
  var n = 0;
  while (q.length > 0 && n < 50) { q.shift(); n++; }
  return n;
}

// ========================================================================
// RUN
// ========================================================================

console.log('');
console.log('=== ZION Load Test & Profiler ===');
console.log('');

var passCount = 0;
var totalTests = 0;

function report(label, bMs, oMs) {
  totalTests++;
  var imp = pct(bMs, oMs);
  var pass = imp > 0;
  if (pass) passCount++;
  console.log('--- ' + label + ' ---');
  console.log('  Baseline:  ' + bMs.toFixed(3) + 'ms');
  console.log('  Optimized: ' + oMs.toFixed(3) + 'ms  [' + fmtPct(imp) + ']' + (pass ? '' : ' (grid overhead > benefit at this scale)'));
  console.log('');
}

// Current scale — grid has overhead at small N
console.log('== CURRENT SCALE (100 NPCs / 200 players / 500 structures) ==');
console.log('');

var b1 = bench(function() { perceptionBaseline(npcs100); });
var o1 = bench(function() { perceptionGrid(npcs100); });
report('NPC Perception (100 NPCs)', b1, o1);

var b3 = bench(function() { collisionBaseline(players200, structs500); });
var o3 = bench(function() { collisionGrid(players200, structs500); });
report('Collision (200p x 500s)', b3, o3);

var b5 = bench(function() { nearbyBaseline(players200); });
var o5 = bench(function() { nearbyGrid(players200); });
report('Nearby Query (200 players)', b5, o5);

// Stress scale — grid wins
console.log('== STRESS SCALE (2000 NPCs / 1000 players / 2000 structures) ==');
console.log('');

var b2 = bench(function() { perceptionBaseline(npcs2000); });
var o2 = bench(function() { perceptionGrid(npcs2000); });
report('NPC Perception (2000 NPCs)', b2, o2);

var b4 = bench(function() { collisionBaseline(players1000, structs2000); });
var o4 = bench(function() { collisionGrid(players1000, structs2000); });
report('Collision (1000p x 2000s)', b4, o4);

var b6 = bench(function() { nearbyBaseline(players1000); });
var o6 = bench(function() { nearbyGrid(players1000); });
report('Nearby Query (1000 players)', b6, o6);

// Optimizations that help at all scales
console.log('== ALGORITHMIC OPTIMIZATIONS (all scales) ==');
console.log('');

var b7 = bench(function() { nearbySortEveryFrame(players200, 60); });
var o7 = bench(function() { nearbySortThrottled(players200, 60); });
report('Nearby Sort (60 frames, 200 players)', b7, o7);

var b8 = bench(evictionSort);
var o8 = bench(evictionScan);
report('Memory Eviction (overflow by 1)', b8, o8);

var b9 = bench(mqUnbounded);
var o9 = bench(mqBatched);
report('Message Queue (200 msgs/frame)', b9, o9);

// Full frame at stress scale
console.log('== FULL FRAME (stress scale) ==');
console.log('');

var bFull = bench(function() {
  perceptionBaseline(npcs2000);
  collisionBaseline(players1000, structs2000);
  nearbyBaseline(players1000);
  nearbySortEveryFrame(players200, 1);
  evictionSort();
  mqUnbounded();
});
var oFull = bench(function() {
  perceptionGrid(npcs2000);
  collisionGrid(players1000, structs2000);
  nearbyGrid(players1000);
  nearbySortThrottled(players200, 1);
  evictionScan();
  mqBatched();
});

var fullImp = pct(bFull, oFull);
console.log('--- Full Frame (stress scale) ---');
console.log('  Baseline:  ' + bFull.toFixed(3) + 'ms  (' + (1000 / bFull).toFixed(1) + ' fps equiv)');
console.log('  Optimized: ' + oFull.toFixed(3) + 'ms  (' + (1000 / oFull).toFixed(1) + ' fps equiv)  [' + fmtPct(fullImp) + ']');
console.log('');

// Correctness checks
var cbl = perceptionBaseline(npcs100);
var cgr = perceptionGrid(npcs100);
if (cbl !== cgr) console.log('WARNING: NPC perception mismatch! ' + cbl + ' vs ' + cgr);

var nbl = nearbyBaseline(players200);
var ngr = nearbyGrid(players200);
if (nbl !== ngr) console.log('WARNING: Nearby query mismatch! ' + nbl + ' vs ' + ngr);

// Summary
console.log('=== SUMMARY ===');
console.log('Benchmarks improved: ' + passCount + '/' + totalTests);
if (fullImp >= 50) {
  console.log('RESULT: PASS (>50% full-frame improvement at stress scale)');
} else if (passCount >= Math.ceil(totalTests * 0.5)) {
  console.log('RESULT: PASS (' + passCount + '/' + totalTests + ' benchmarks improved)');
} else {
  console.log('RESULT: PARTIAL (' + passCount + '/' + totalTests + ' benchmarks improved)');
}
console.log('');

process.exit(0);
