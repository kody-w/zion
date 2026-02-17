var assert = require('assert');

var ZONE_LANDMARKS = {
  nexus: [
    {x: 0, z: 0, name: 'obelisk', types: ['all']},
    {x: 15, z: 15, name: 'bulletin', types: ['all']}
  ],
  gardens: [
    {x: 200, z: 30, name: 'fountain', types: ['gardener', 'healer']},
    {x: 210, z: 25, name: 'well', types: ['gardener']}
  ],
  athenaeum: [
    {x: 100, z: -220, name: 'library', types: ['teacher', 'philosopher', 'storyteller']}
  ],
  studio: [
    {x: -200, z: -100, name: 'easel', types: ['artist', 'builder']}
  ],
  wilds: [
    {x: -30, z: 260, name: 'campfire', types: ['explorer']}
  ],
  agora: [
    {x: -190, z: 120, name: 'market', types: ['merchant']}
  ]
};

function pickLandmarkDestination(agent) {
  var zone = agent.position.zone;
  var landmarks = ZONE_LANDMARKS[zone];
  if (!landmarks || landmarks.length === 0) return null;

  var matching = [];
  for (var i = 0; i < landmarks.length; i++) {
    var lm = landmarks[i];
    if (lm.types.indexOf('all') !== -1 || lm.types.indexOf(agent.archetype) !== -1) {
      matching.push(lm);
    }
  }

  if (matching.length === 0) return null;
  return matching[Math.floor(Math.random() * matching.length)];
}

(function testGardenerFindsGardenLandmarks() {
  var agent = { archetype: 'gardener', position: { zone: 'gardens', x: 200, z: 30 } };
  var lm = pickLandmarkDestination(agent);
  assert(lm !== null, 'Gardener should find landmarks in gardens');
  assert(lm.name === 'fountain' || lm.name === 'well', 'Gardener should find fountain or well');
  console.log('PASS: gardener finds garden landmarks');
})();

(function testTeacherFindsAthenaeumLandmarks() {
  var agent = { archetype: 'teacher', position: { zone: 'athenaeum', x: 100, z: -220 } };
  var lm = pickLandmarkDestination(agent);
  assert(lm !== null, 'Teacher should find landmarks in athenaeum');
  assert.strictEqual(lm.name, 'library', 'Teacher should find library');
  console.log('PASS: teacher finds athenaeum landmarks');
})();

(function testAnyoneFindsNexusLandmarks() {
  var agent = { archetype: 'musician', position: { zone: 'nexus', x: 0, z: 0 } };
  var lm = pickLandmarkDestination(agent);
  assert(lm !== null, 'Any archetype should find nexus landmarks (type: all)');
  console.log('PASS: anyone finds nexus landmarks');
})();

(function testNoMatchReturnsNull() {
  var agent = { archetype: 'explorer', position: { zone: 'gardens', x: 200, z: 30 } };
  var lm = pickLandmarkDestination(agent);
  assert.strictEqual(lm, null, 'Explorer should not match garden-specific landmarks');
  console.log('PASS: no match returns null');
})();

(function testMissingZoneReturnsNull() {
  var agent = { archetype: 'gardener', position: { zone: 'unknown_zone', x: 0, z: 0 } };
  var lm = pickLandmarkDestination(agent);
  assert.strictEqual(lm, null, 'Unknown zone should return null');
  console.log('PASS: missing zone returns null');
})();

console.log('All NPC landmark tests passed!');
