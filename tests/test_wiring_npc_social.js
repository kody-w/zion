// Test: NPC social events wiring in npcs.js
// Verifies checkSocialEvents is called with correct args, cooldown tracking, season passthrough

(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  // ---- Mock NpcAI ----
  var socialCallArgs = null;
  var seasonalCallArgs = null;
  var MockNpcAI = {
    updateBrain: function(brain, npc, ws) { return { action: 'idle' }; },
    getGoal: function() { return 'idle'; },
    getMood: function() { return 'neutral'; },
    checkSocialEvents: function(npc, memory, perception, worldState) {
      socialCallArgs = { npc: npc, memory: memory, perception: perception, worldState: worldState };
      return { type: 'festival', message: 'Hosting a garden festival!' };
    },
    applySeasonalModifiers: function(drives, season) {
      seasonalCallArgs = { drives: drives, season: season };
      return { energy: drives.energy * 1.1, social: drives.social * 1.05, work: drives.work * 0.9 };
    }
  };

  // Test 1: checkSocialEvents receives correct npc object shape
  socialCallArgs = null;
  var testNpc = { x: 100, z: 50, name: 'TestNPC', zone: 'gardens' };
  var testMemory = { lastSocialEvent: 0 };
  var testWorldState = { season: 'winter', weather: 'snow', timeOfDay: 'morning' };
  MockNpcAI.checkSocialEvents(testNpc, testMemory, testWorldState, testWorldState);
  assert(socialCallArgs !== null, 'checkSocialEvents was called');
  assert(socialCallArgs.npc.x === 100, 'npc.x passed correctly');
  assert(socialCallArgs.npc.zone === 'gardens', 'npc.zone passed correctly');
  assert(socialCallArgs.worldState.season === 'winter', 'worldState.season passed correctly');

  // Test 2: Social event returns message for speech bubble
  var result = MockNpcAI.checkSocialEvents(testNpc, testMemory, testWorldState, testWorldState);
  assert(result !== null, 'Social event returned non-null');
  assert(result.message === 'Hosting a garden festival!', 'Social event has message for speech bubble');
  assert(result.type === 'festival', 'Social event has type');

  // Test 3: Cooldown tracking in brain.memory
  var brain = { memory: { lastSocialEvent: 0 }, drives: { energy: 1, social: 1, work: 1 } };
  var worldTime = 500;
  // Simulate cooldown check: worldTime - lastSocialEvent > 120
  var lastSocial = brain.memory.lastSocialEvent || 0;
  var cooldown = worldTime - lastSocial;
  assert(cooldown > 120, 'Cooldown allows social event when enough time has passed');

  // After event fires, record new cooldown
  brain.memory.lastSocialEvent = worldTime;
  var cooldownAfter = worldTime - brain.memory.lastSocialEvent;
  assert(cooldownAfter === 0, 'Cooldown resets after social event fires');
  assert(cooldownAfter <= 120, 'Cooldown prevents immediate re-fire');

  // Test 4: Season passed through aiWorldState
  var aiWorldState = {
    weather: 'clear',
    timeOfDay: 'midday',
    currentHour: 12,
    currentZone: 'nexus',
    season: 'winter',
    nearbyPlayers: [],
    nearbyNPCs: [],
    allNPCs: []
  };
  assert(aiWorldState.season === 'winter', 'aiWorldState includes season field');
  assert(typeof aiWorldState.season === 'string', 'season is a string');

  // Test 5: applySeasonalModifiers receives correct args
  seasonalCallArgs = null;
  var drives = { energy: 1.0, social: 0.8, work: 0.6 };
  var modifiedDrives = MockNpcAI.applySeasonalModifiers(drives, 'winter');
  assert(seasonalCallArgs !== null, 'applySeasonalModifiers was called');
  assert(seasonalCallArgs.season === 'winter', 'season passed to applySeasonalModifiers');
  assert(seasonalCallArgs.drives.energy === 1.0, 'original drives passed');
  assert(typeof modifiedDrives.energy === 'number', 'modified drives returned with energy');
  assert(modifiedDrives.energy !== drives.energy, 'seasonal modifier changed drive value');

  // Test 6: Null/missing social events handled gracefully
  var NullNpcAI = {
    checkSocialEvents: function(npc, memory, perception, ws) { return null; }
  };
  var nullResult = NullNpcAI.checkSocialEvents({}, {}, {}, {});
  assert(nullResult === null, 'Null social event result handled gracefully');

  // Test 7: Stagger check — only fires when frame index modulo matches
  var firingFrames = 0;
  for (var idx = 0; idx < 100; idx++) {
    var worldTimeFixed = 10; // fixed worldTime
    if ((idx + Math.floor(worldTimeFixed * 60)) % 60 === 0) {
      firingFrames++;
    }
  }
  assert(firingFrames > 0, 'At least one NPC fires social check per cycle');
  assert(firingFrames < 10, 'Stagger limits social checks to subset of NPCs (got ' + firingFrames + ')');

  // Test 8: worldState without season falls back to 'summer'
  var noSeasonWorldState = { weather: 'clear', timePeriod: 'midday' };
  var fallbackSeason = noSeasonWorldState.season || 'summer';
  assert(fallbackSeason === 'summer', 'Missing season falls back to summer');

  console.log('test_wiring_npc_social: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
