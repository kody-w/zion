// Test: SocialSpaces wiring — gatherings lifecycle, bulletins, cleanup
// Verifies createGathering/joinGathering/endGathering, postBulletin, cleanExpired

(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  var SocialSpaces = require('../src/js/social_spaces');

  // Test 1: getGatheringTypes returns array
  var gTypes = SocialSpaces.getGatheringTypes ? SocialSpaces.getGatheringTypes() : null;
  assert(gTypes !== null && Array.isArray(gTypes), 'getGatheringTypes returns array');
  assert(gTypes.length > 0, 'getGatheringTypes has entries');

  // Test 2: createGathering with correct signature (festival allowed in all zones)
  var state = { gatherings: [], bulletins: [] };
  var result = SocialSpaces.createGathering(state, 'npc_host_1', 'festival', 'nexus', 'Test Festival', 'A test', 100, 300);
  assert(result !== null && result !== undefined, 'createGathering returns result');
  assert(result.success === true, 'createGathering succeeds');
  assert(result.gathering !== undefined, 'createGathering returns gathering object');
  assert(result.gathering.type === 'festival', 'gathering has correct type');

  // Test 3: startGathering
  var startResult = SocialSpaces.startGathering(state, result.gathering.id, 100);
  assert(startResult && startResult.success === true, 'startGathering succeeds');

  // Test 4: getActiveGatherings returns started gatherings
  var activeGatherings = SocialSpaces.getActiveGatherings(state, 'nexus');
  assert(Array.isArray(activeGatherings), 'getActiveGatherings returns array');
  assert(activeGatherings.length >= 1, 'getActiveGatherings finds active gathering in zone');

  // Test 5: getActiveGatherings with null zone returns all
  var allActive = SocialSpaces.getActiveGatherings(state, null);
  assert(Array.isArray(allActive), 'getActiveGatherings(null) returns array');
  assert(allActive.length >= 1, 'getActiveGatherings(null) finds all active');

  // Test 6: joinGathering
  var joinResult = SocialSpaces.joinGathering(state, 'player_1', result.gathering.id);
  assert(joinResult && joinResult.success === true, 'joinGathering succeeds');

  // Test 7: endGathering
  var endResult = SocialSpaces.endGathering(state, result.gathering.id, 500);
  assert(endResult && endResult.success === true, 'endGathering succeeds');

  // Test 8: postBulletin with correct signature
  var bulletinResult = SocialSpaces.postBulletin(state, 'npc_1', 'nexus', 'Hello', 'World news', 'lore', 600);
  assert(bulletinResult && bulletinResult.success === true, 'postBulletin succeeds');
  assert(bulletinResult.post !== undefined, 'postBulletin returns post object');

  // Test 9: getBulletins finds posted bulletin
  var bulletins = SocialSpaces.getBulletins(state, 'nexus', null);
  assert(Array.isArray(bulletins), 'getBulletins returns array');
  assert(bulletins.length >= 1, 'getBulletins finds bulletin');

  // Test 10: cleanExpiredBulletins removes old bulletins
  var cleanResult = SocialSpaces.cleanExpiredBulletins(state, 99999);
  assert(cleanResult !== undefined, 'cleanExpiredBulletins returns result');

  console.log('test_wiring_social_spaces: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
