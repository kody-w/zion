/**
 * tests/test_archival.js
 * Comprehensive tests for src/js/archival.js — ZION Archival System
 * Run with: node tests/test_archival.js
 */

'use strict';

var Archival = require('../src/js/archival');

var passed = 0;
var failed = 0;
var errors = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    process.stdout.write('  PASS: ' + msg + '\n');
  } else {
    failed++;
    errors.push(msg);
    process.stdout.write('  FAIL: ' + msg + '\n');
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

function assertGTE(a, b, msg) {
  assert(a >= b, msg + ' (' + a + ' >= ' + b + ')');
}

function assertLTE(a, b, msg) {
  assert(a <= b, msg + ' (' + a + ' <= ' + b + ')');
}

function assertIn(arr, item, msg) {
  assert(arr.indexOf(item) !== -1, msg + ' (' + JSON.stringify(item) + ' in array)');
}

function assertNotIn(arr, item, msg) {
  assert(arr.indexOf(item) === -1, msg + ' (' + JSON.stringify(item) + ' NOT in array)');
}

function assertExists(val, msg) {
  assert(val !== null && val !== undefined, msg + ' (value exists)');
}

function makeState() {
  return {};
}

// Sequential IDs
var playerSeq = 0;
function uid() {
  return 'player_' + (++playerSeq);
}

var guildSeq = 0;
function gid() {
  return 'guild_' + (++guildSeq);
}

// ============================================================================
// SUITE 1: RELICS DATA INTEGRITY
// ============================================================================

console.log('\n== Suite 1: Relics Data Integrity ==');

(function() {
  var relics = Archival._RELICS;

  assert(Array.isArray(relics), 'RELICS is an array');
  assertGTE(relics.length, 20, 'RELICS has at least 20 entries');

  var requiredFields = ['id', 'name', 'description', 'rarity', 'zone', 'discoveryMethod', 'loreChain', 'xpReward', 'sparkReward'];
  relics.forEach(function(r) {
    requiredFields.forEach(function(field) {
      assert(r.hasOwnProperty(field), 'Relic ' + r.id + ' has field: ' + field);
    });
  });

  // IDs unique
  var ids = {};
  relics.forEach(function(r) {
    assert(!ids[r.id], 'Relic ID is unique: ' + r.id);
    ids[r.id] = true;
  });

  // Valid rarities
  var validRarities = Archival._RARITIES;
  relics.forEach(function(r) {
    assertIn(validRarities, r.rarity, 'Relic ' + r.id + ' has valid rarity');
  });

  // Valid zones
  var validZones = Archival._ZONES_LIST;
  relics.forEach(function(r) {
    assertIn(validZones, r.zone, 'Relic ' + r.id + ' has valid zone');
  });

  // Valid discovery methods
  var validMethods = ['excavation', 'exploration', 'quest', 'trade', 'raid'];
  relics.forEach(function(r) {
    assertIn(validMethods, r.discoveryMethod, 'Relic ' + r.id + ' has valid discoveryMethod');
  });

  // loreChain is array
  relics.forEach(function(r) {
    assert(Array.isArray(r.loreChain), 'Relic ' + r.id + ' loreChain is array');
    assertGTE(r.loreChain.length, 1, 'Relic ' + r.id + ' loreChain has at least 1 entry');
  });

  // Rewards are positive numbers
  relics.forEach(function(r) {
    assert(typeof r.xpReward === 'number' && r.xpReward > 0, 'Relic ' + r.id + ' has positive xpReward');
    assert(typeof r.sparkReward === 'number' && r.sparkReward > 0, 'Relic ' + r.id + ' has positive sparkReward');
  });
})();

// ============================================================================
// SUITE 2: EACH RARITY HAS AT LEAST ONE RELIC
// ============================================================================

console.log('\n== Suite 2: Rarity Coverage ==');

(function() {
  var relics = Archival._RELICS;
  var rarities = Archival._RARITIES;

  rarities.forEach(function(rarity) {
    var count = relics.filter(function(r) { return r.rarity === rarity; }).length;
    assertGTE(count, 1, 'Rarity "' + rarity + '" has at least 1 relic (found ' + count + ')');
  });

  // Check each specific rarity
  var byRarity = {};
  relics.forEach(function(r) {
    byRarity[r.rarity] = (byRarity[r.rarity] || 0) + 1;
  });
  assertGTE(byRarity['common'] || 0, 1, 'At least 1 common relic');
  assertGTE(byRarity['uncommon'] || 0, 1, 'At least 1 uncommon relic');
  assertGTE(byRarity['rare'] || 0, 1, 'At least 1 rare relic');
  assertGTE(byRarity['epic'] || 0, 1, 'At least 1 epic relic');
  assertGTE(byRarity['legendary'] || 0, 1, 'At least 1 legendary relic');
})();

// ============================================================================
// SUITE 3: EXCAVATION SITES DATA INTEGRITY
// ============================================================================

console.log('\n== Suite 3: Excavation Sites Data Integrity ==');

(function() {
  var sites = Archival._EXCAVATION_SITES;
  var relicIds = Archival._RELICS.map(function(r) { return r.id; });

  assert(Array.isArray(sites), 'EXCAVATION_SITES is an array');
  assertGTE(sites.length, 10, 'EXCAVATION_SITES has at least 10 entries');

  var requiredFields = ['id', 'name', 'zone', 'difficulty', 'relicPool', 'digTime', 'maxDigs', 'respawnTime', 'requiredTool'];
  sites.forEach(function(s) {
    requiredFields.forEach(function(field) {
      assert(s.hasOwnProperty(field), 'Site ' + s.id + ' has field: ' + field);
    });
  });

  // IDs unique
  var ids = {};
  sites.forEach(function(s) {
    assert(!ids[s.id], 'Site ID is unique: ' + s.id);
    ids[s.id] = true;
  });

  // Valid zones
  var validZones = Archival._ZONES_LIST;
  sites.forEach(function(s) {
    assertIn(validZones, s.zone, 'Site ' + s.id + ' has valid zone');
  });

  // Difficulty 1-5
  sites.forEach(function(s) {
    assert(s.difficulty >= 1 && s.difficulty <= 5, 'Site ' + s.id + ' difficulty in range [1,5]');
  });

  // relicPool references valid relics
  sites.forEach(function(s) {
    assert(Array.isArray(s.relicPool), 'Site ' + s.id + ' relicPool is array');
    assertGTE(s.relicPool.length, 1, 'Site ' + s.id + ' relicPool has at least 1 relic');
    s.relicPool.forEach(function(rid) {
      assertIn(relicIds, rid, 'Site ' + s.id + ' relicPool member "' + rid + '" is a valid relic');
    });
  });

  // Positive timing values
  sites.forEach(function(s) {
    assert(s.digTime > 0, 'Site ' + s.id + ' digTime > 0');
    assert(s.maxDigs > 0, 'Site ' + s.id + ' maxDigs > 0');
    assert(s.respawnTime > 0, 'Site ' + s.id + ' respawnTime > 0');
  });
})();

// ============================================================================
// SUITE 4: EACH ZONE HAS AT LEAST ONE EXCAVATION SITE
// ============================================================================

console.log('\n== Suite 4: Zone Coverage for Sites ==');

(function() {
  var sites = Archival._EXCAVATION_SITES;
  var zones = Archival._ZONES_LIST;

  // The spec has 8 zones but only asks for 10 sites covering most zones
  // Check that every site zone is a valid zone, and that major zones have coverage
  var coveredZones = {};
  sites.forEach(function(s) { coveredZones[s.zone] = true; });

  // At least 5 distinct zones covered
  var coveredCount = Object.keys(coveredZones).length;
  assertGTE(coveredCount, 5, 'Sites cover at least 5 distinct zones (covered: ' + coveredCount + ')');

  // Core zones that MUST have a site
  var mustHave = ['wilds', 'nexus', 'athenaeum', 'gardens', 'commons', 'arena', 'agora', 'studio'];
  mustHave.forEach(function(zone) {
    var hasSite = sites.some(function(s) { return s.zone === zone; });
    assert(hasSite, 'Zone "' + zone + '" has at least 1 excavation site');
  });
})();

// ============================================================================
// SUITE 5: RESEARCH PROJECTS DATA INTEGRITY
// ============================================================================

console.log('\n== Suite 5: Research Projects Data Integrity ==');

(function() {
  var projects = Archival._RESEARCH_PROJECTS;
  var relicIds = Archival._RELICS.map(function(r) { return r.id; });

  assert(Array.isArray(projects), 'RESEARCH_PROJECTS is an array');
  assertGTE(projects.length, 8, 'RESEARCH_PROJECTS has at least 8 entries');

  var requiredFields = ['id', 'name', 'description', 'category', 'phases', 'reward', 'duration'];
  projects.forEach(function(p) {
    requiredFields.forEach(function(field) {
      assert(p.hasOwnProperty(field), 'Project ' + p.id + ' has field: ' + field);
    });
  });

  // IDs unique
  var ids = {};
  projects.forEach(function(p) {
    assert(!ids[p.id], 'Project ID is unique: ' + p.id);
    ids[p.id] = true;
  });

  // Each project has at least 2 phases
  projects.forEach(function(p) {
    assert(Array.isArray(p.phases), 'Project ' + p.id + ' phases is array');
    assertGTE(p.phases.length, 2, 'Project ' + p.id + ' has at least 2 phases');
  });

  // Phase structure
  projects.forEach(function(p) {
    p.phases.forEach(function(ph, idx) {
      assert(ph.hasOwnProperty('name'), 'Project ' + p.id + ' phase ' + idx + ' has name');
      assert(ph.hasOwnProperty('contributionGoal'), 'Project ' + p.id + ' phase ' + idx + ' has contributionGoal');
      assert(ph.contributionGoal > 0, 'Project ' + p.id + ' phase ' + idx + ' contributionGoal > 0');
    });
  });

  // relicsRequired reference valid relics (where present)
  projects.forEach(function(p) {
    p.phases.forEach(function(ph, idx) {
      if (ph.relicsRequired && ph.relicsRequired.length > 0) {
        ph.relicsRequired.forEach(function(rid) {
          assertIn(relicIds, rid, 'Project ' + p.id + ' phase ' + idx + ' relicsRequired "' + rid + '" is a valid relic');
        });
      }
    });
  });

  // Reward structure
  projects.forEach(function(p) {
    assert(p.reward.hasOwnProperty('spark'), 'Project ' + p.id + ' reward has spark');
    assert(p.reward.hasOwnProperty('xp'), 'Project ' + p.id + ' reward has xp');
    assert(p.reward.spark > 0, 'Project ' + p.id + ' reward spark > 0');
    assert(p.reward.xp > 0, 'Project ' + p.id + ' reward xp > 0');
  });

  // Duration > 0
  projects.forEach(function(p) {
    assert(p.duration > 0, 'Project ' + p.id + ' duration > 0');
  });
})();

// ============================================================================
// SUITE 6: getRelicById and getRelics
// ============================================================================

console.log('\n== Suite 6: getRelicById and getRelics ==');

(function() {
  var relic = Archival.getRelicById('crystal_shard');
  assertExists(relic, 'getRelicById returns relic for known ID');
  assertEqual(relic.id, 'crystal_shard', 'getRelicById returns correct relic');
  assertEqual(relic.zone, 'wilds', 'crystal_shard is in wilds');

  var unknown = Archival.getRelicById('does_not_exist');
  assert(unknown === null || unknown === undefined, 'getRelicById returns null for unknown ID');

  var allRelics = Archival.getRelics();
  assertGTE(allRelics.length, 20, 'getRelics() returns all 20+ relics');

  var wildsRelics = Archival.getRelics('wilds');
  assertGTE(wildsRelics.length, 1, 'getRelics("wilds") returns at least 1 relic');
  wildsRelics.forEach(function(r) {
    assertEqual(r.zone, 'wilds', 'getRelics("wilds") only returns wilds relics');
  });

  var nexusRelics = Archival.getRelics('nexus');
  assertGTE(nexusRelics.length, 1, 'getRelics("nexus") returns at least 1 relic');

  var emptyZone = Archival.getRelics('unknown_zone');
  assertEqual(emptyZone.length, 0, 'getRelics with invalid zone returns empty array');
})();

// ============================================================================
// SUITE 7: getResearchProjects
// ============================================================================

console.log('\n== Suite 7: getResearchProjects ==');

(function() {
  var projects = Archival.getResearchProjects();
  assertGTE(projects.length, 8, 'getResearchProjects returns at least 8 projects');
  assert(Array.isArray(projects), 'getResearchProjects returns array');

  // Mutating returned array should not affect internals
  projects.push({ id: 'fake' });
  var projects2 = Archival.getResearchProjects();
  assertGTE(projects2.length, 8, 'getResearchProjects returns independent copy');
})();

// ============================================================================
// SUITE 8: discoverRelic
// ============================================================================

console.log('\n== Suite 8: discoverRelic ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Discover a valid relic
  var result = Archival.discoverRelic(state, pid, 'crystal_shard');
  assert(result.success, 'discoverRelic succeeds for valid relic');
  assertExists(result.relic, 'discoverRelic returns relic definition');
  assertEqual(result.relic.id, 'crystal_shard', 'discoverRelic returns correct relic');
  assert(Array.isArray(result.loreUnlocked), 'discoverRelic returns loreUnlocked array');
  assertGTE(result.loreUnlocked.length, 1, 'discoverRelic unlocks at least 1 lore entry');

  // Idempotent — second discover returns no lore
  var result2 = Archival.discoverRelic(state, pid, 'crystal_shard');
  assert(result2.success, 'discoverRelic idempotent — succeeds');
  assert(result2.alreadyOwned === true, 'discoverRelic idempotent — marks alreadyOwned');
  assertEqual(result2.loreUnlocked.length, 0, 'discoverRelic idempotent — no duplicate lore unlocked');

  // Player archive updated
  var playerRelics = Archival.getPlayerRelics(state, pid);
  assertEqual(playerRelics.length, 1, 'getPlayerRelics returns 1 relic after discovery');
  assertEqual(playerRelics[0].id, 'crystal_shard', 'getPlayerRelics correct relic');

  // Unknown relic fails
  var bad = Archival.discoverRelic(state, pid, 'fake_relic');
  assert(!bad.success, 'discoverRelic fails for unknown relic');

  // Lore chain of legendary relic is longer
  var state2 = makeState();
  var pid2 = uid();
  var legendResult = Archival.discoverRelic(state2, pid2, 'founding_ember');
  assertGTE(legendResult.loreUnlocked.length, 4, 'Legendary relic unlocks 4+ lore entries');
})();

// ============================================================================
// SUITE 9: getPlayerRelics
// ============================================================================

console.log('\n== Suite 9: getPlayerRelics ==');

(function() {
  var state = makeState();
  var pid = uid();

  // No relics initially
  var empty = Archival.getPlayerRelics(state, pid);
  assertEqual(empty.length, 0, 'getPlayerRelics returns empty for new player');

  // Add multiple relics
  Archival.discoverRelic(state, pid, 'crystal_shard');
  Archival.discoverRelic(state, pid, 'stone_tablet');
  Archival.discoverRelic(state, pid, 'root_bead');

  var relics = Archival.getPlayerRelics(state, pid);
  assertEqual(relics.length, 3, 'getPlayerRelics returns 3 relics');

  // All are valid definitions
  relics.forEach(function(r) {
    assertExists(r.id, 'getPlayerRelics returns relic with id');
    assertExists(r.name, 'getPlayerRelics returns relic with name');
  });
})();

// ============================================================================
// SUITE 10: getRelicCollection
// ============================================================================

console.log('\n== Suite 10: getRelicCollection ==');

(function() {
  var state = makeState();
  var pid = uid();

  var empty = Archival.getRelicCollection(state, pid);
  assertEqual(empty.found, 0, 'getRelicCollection found=0 for new player');
  assertGTE(empty.total, 20, 'getRelicCollection total >= 20');
  assertEqual(empty.percent, 0, 'getRelicCollection percent=0 for new player');
  assertExists(empty.byRarity, 'getRelicCollection has byRarity');

  // Discover some relics
  Archival.discoverRelic(state, pid, 'crystal_shard');     // rare
  Archival.discoverRelic(state, pid, 'root_bead');          // common
  Archival.discoverRelic(state, pid, 'founding_ember');     // legendary

  var col = Archival.getRelicCollection(state, pid);
  assertEqual(col.found, 3, 'getRelicCollection found=3 after 3 discoveries');
  assert(col.percent > 0, 'getRelicCollection percent > 0 after discoveries');
  assertEqual(col.byRarity['rare'].found, 1, 'byRarity.rare.found = 1');
  assertEqual(col.byRarity['common'].found, 1, 'byRarity.common.found = 1');
  assertEqual(col.byRarity['legendary'].found, 1, 'byRarity.legendary.found = 1');
  assertEqual(col.byRarity['epic'].found, 0, 'byRarity.epic.found = 0 (none discovered)');

  // byRarity totals sum correctly
  var totalFromRarity = 0;
  var rarities = Archival._RARITIES;
  rarities.forEach(function(r) {
    totalFromRarity += col.byRarity[r].total;
  });
  assertEqual(totalFromRarity, col.total, 'byRarity totals sum to overall total');
})();

// ============================================================================
// SUITE 11: getSiteStatus and getExcavationSites
// ============================================================================

console.log('\n== Suite 11: getSiteStatus and getExcavationSites ==');

(function() {
  var state = makeState();

  // Fresh state — site should be at full digs
  var status = Archival.getSiteStatus(state, 'wilds_ruins', 0);
  assertExists(status, 'getSiteStatus returns status for valid site');
  assertEqual(status.siteId, 'wilds_ruins', 'getSiteStatus correct siteId');
  assertEqual(status.zone, 'wilds', 'getSiteStatus correct zone');
  assertEqual(status.maxDigs, 10, 'getSiteStatus correct maxDigs');
  assertEqual(status.digsRemaining, 10, 'getSiteStatus full digs on pristine site');
  assert(!status.depleted, 'getSiteStatus not depleted on fresh site');

  // Unknown site
  var unknown = Archival.getSiteStatus(state, 'fake_site', 0);
  assert(unknown === null, 'getSiteStatus returns null for unknown site');

  // getExcavationSites — all
  var allSites = Archival.getExcavationSites(state);
  assertGTE(allSites.length, 10, 'getExcavationSites returns all 10+ sites');

  // getExcavationSites — filtered by zone
  var wildsSites = Archival.getExcavationSites(state, 'wilds');
  assertGTE(wildsSites.length, 1, 'getExcavationSites("wilds") returns at least 1 site');
  wildsSites.forEach(function(s) {
    assertEqual(s.zone, 'wilds', 'getExcavationSites zone filter works');
  });

  // getExcavationSites — zone with no sites
  var fakeSites = Archival.getExcavationSites(state, 'nonexistent_zone');
  assertEqual(fakeSites.length, 0, 'getExcavationSites unknown zone returns empty array');
})();

// ============================================================================
// SUITE 12: excavate — basic behavior
// ============================================================================

console.log('\n== Suite 12: Excavate Basic Behavior ==');

(function() {
  var state = makeState();
  var pid = uid();

  // excavate at valid site
  var result = Archival.excavate(state, pid, 'wilds_ruins', 12345, 100);
  assert(result.success, 'excavate returns success');
  assert(result.hasOwnProperty('relic'), 'excavate result has relic field');
  assert(typeof result.xp === 'number', 'excavate result has numeric xp');
  assert(typeof result.spark === 'number', 'excavate result has numeric spark');
  assert(typeof result.siteDepletionRemaining === 'number', 'excavate result has siteDepletionRemaining');
  assert(result.siteDepletionRemaining >= 0, 'siteDepletionRemaining >= 0');
  assert(Array.isArray(result.loreUnlocked), 'excavate result has loreUnlocked array');

  // Rewards are non-negative
  assert(result.xp >= 0, 'excavate xp >= 0');
  assert(result.spark >= 0, 'excavate spark >= 0');

  // If relic found, it has required fields
  if (result.relic) {
    assertExists(result.relic.id, 'excavate relic has id');
    assertExists(result.relic.name, 'excavate relic has name');
    assertGTE(result.xp, 10, 'excavate with relic gives xp >= 10');
    assertGTE(result.spark, 5, 'excavate with relic gives spark >= 5');
  }

  // Excavating unknown site fails
  var bad = Archival.excavate(state, pid, 'fake_site', 1, 0);
  assert(!bad.success, 'excavate unknown site fails');
})();

// ============================================================================
// SUITE 13: excavate — seeded determinism
// ============================================================================

console.log('\n== Suite 13: Excavate Seeded Determinism ==');

(function() {
  // Same seed + site + player should produce same outcome
  var state1 = makeState();
  var state2 = makeState();
  var pid = uid();

  var r1 = Archival.excavate(state1, pid, 'wilds_ruins', 99999, 100);
  var r2 = Archival.excavate(state2, pid, 'wilds_ruins', 99999, 100);

  assertEqual(r1.relic === null, r2.relic === null, 'Excavate deterministic: relic found matches');
  if (r1.relic && r2.relic) {
    assertEqual(r1.relic.id, r2.relic.id, 'Excavate deterministic: relic ID matches');
  }

  // Different seeds produce independent outcomes
  var state3 = makeState();
  var state4 = makeState();
  var pid2 = uid();
  // Run many digs with different seeds to verify no crash
  var successes = 0;
  for (var i = 0; i < 8; i++) {
    var res = Archival.excavate(state3, pid2, 'wilds_ruins', i * 7777, 100 + i);
    assert(res.success || res.reason !== undefined, 'Excavate returns valid result for seed ' + i);
    if (res.success) { successes++; }
  }
  assert(successes > 0, 'At least some excavations succeed across different seeds');
})();

// ============================================================================
// SUITE 14: excavate — site depletion
// ============================================================================

console.log('\n== Suite 14: Excavate Site Depletion ==');

(function() {
  var state = makeState();
  var pid = uid();
  var siteId = 'gardens_old_beds'; // maxDigs = 15

  // Deplete the site
  for (var i = 0; i < 15; i++) {
    Archival.excavate(state, pid, siteId, i * 1000 + 13, i);
  }

  var status = Archival.getSiteStatus(state, siteId, 14);
  assertEqual(status.digsRemaining, 0, 'Site depleted after maxDigs excavations');
  assert(status.depleted, 'Site marked as depleted');

  // Excavating depleted site fails
  var bad = Archival.excavate(state, pid, siteId, 12345, 14);
  assert(!bad.success, 'Excavate on depleted site fails');
  assertEqual(bad.relic, null, 'Depleted site yields no relic');
  assertExists(bad.reason, 'Depleted site result has reason');
})();

// ============================================================================
// SUITE 15: Site respawn
// ============================================================================

console.log('\n== Suite 15: Site Respawn ==');

(function() {
  var state = makeState();
  var pid = uid();
  var siteId = 'arena_founder_quarter'; // maxDigs=10, respawnTime=400

  // Deplete
  for (var i = 0; i < 10; i++) {
    Archival.excavate(state, pid, siteId, i * 500, i);
  }

  // Check depleted
  var depletedStatus = Archival.getSiteStatus(state, siteId, 9);
  assert(depletedStatus.depleted, 'Site is depleted after maxDigs');

  // Before respawn — still depleted
  var earlyStatus = Archival.getSiteStatus(state, siteId, 200);
  assert(earlyStatus.depleted, 'Site still depleted before respawnTime');
  assertGTE(earlyStatus.respawnIn, 1, 'respawnIn > 0 before respawn');

  // After respawn tick — site revives
  var revivedStatus = Archival.getSiteStatus(state, siteId, 410);
  assert(!revivedStatus.depleted, 'Site revived after respawnTime elapses');
  assertEqual(revivedStatus.digsRemaining, 10, 'Revived site has full digs');
  assertEqual(revivedStatus.respawnIn, 0, 'Revived site respawnIn = 0');

  // Can excavate again after respawn
  var afterRespawn = Archival.excavate(state, pid, siteId, 9999, 420);
  assert(afterRespawn.success, 'Can excavate after site respawn');
})();

// ============================================================================
// SUITE 16: startResearchProject
// ============================================================================

console.log('\n== Suite 16: startResearchProject ==');

(function() {
  var state = makeState();
  var guildId = gid();

  var result = Archival.startResearchProject(state, guildId, 'origin_mystery', 100);
  assert(result.success, 'startResearchProject succeeds for valid project');
  assertExists(result.project, 'startResearchProject returns project');
  assertEqual(result.project.projectId, 'origin_mystery', 'Project has correct projectId');
  assertEqual(result.project.guildId, guildId, 'Project has correct guildId');
  assertEqual(result.project.status, 'active', 'Project starts as active');
  assertEqual(result.project.currentPhase, 0, 'Project starts at phase 0');
  assertGTE(result.project.phases.length, 3, 'origin_mystery has 3 phases');
  assertEqual(result.project.startedAt, 100, 'Project startedAt = currentTick');

  // Phase structure
  result.project.phases.forEach(function(ph, idx) {
    assert(ph.hasOwnProperty('name'), 'Phase ' + idx + ' has name');
    assert(ph.hasOwnProperty('currentContribution'), 'Phase ' + idx + ' has currentContribution');
    assertEqual(ph.currentContribution, 0, 'Phase ' + idx + ' starts at 0');
    assert(!ph.complete, 'Phase ' + idx + ' starts incomplete');
    assert(Array.isArray(ph.relicsContributed), 'Phase ' + idx + ' has relicsContributed array');
  });

  // Starting same project for same guild fails
  var dup = Archival.startResearchProject(state, guildId, 'origin_mystery', 200);
  assert(!dup.success, 'Cannot start already-active project for same guild');

  // Different guild can start same project
  var guild2 = gid();
  var result2 = Archival.startResearchProject(state, guild2, 'origin_mystery', 100);
  assert(result2.success, 'Different guild can start same project');

  // Unknown project
  var bad = Archival.startResearchProject(state, guildId, 'fake_project', 100);
  assert(!bad.success, 'startResearchProject fails for unknown project');
})();

// ============================================================================
// SUITE 17: contributeToResearch
// ============================================================================

console.log('\n== Suite 17: contributeToResearch ==');

(function() {
  var state = makeState();
  var guildId = gid();
  var pid = uid();

  Archival.startResearchProject(state, guildId, 'arena_philosophy', 0);
  // arena_philosophy phase 0 goal = 70

  var result = Archival.contributeToResearch(state, pid, 'arena_philosophy', 30, null);
  assert(result.success, 'contributeToResearch succeeds');
  assertEqual(result.phaseProgress, 30, 'phaseProgress = 30 after contributing 30');
  assert(!result.phaseComplete, 'Phase not complete after partial contribution');

  // Add more — still not complete
  Archival.contributeToResearch(state, pid, 'arena_philosophy', 30, null);
  var r2 = Archival.contributeToResearch(state, pid, 'arena_philosophy', 10, null);
  assertEqual(r2.phaseProgress, 70, 'phaseProgress = 70 after total of 70');
  assert(!r2.phaseComplete, 'Phase still incomplete (relics not contributed)');

  // Contribute the required relic
  Archival.discoverRelic(state, pid, 'davans_debate_notes');
  var r3 = Archival.contributeToResearch(state, pid, 'arena_philosophy', 0, 'davans_debate_notes');
  assert(r3.phaseComplete, 'Phase complete after relic + contribution goal met');

  // Verify player contributions tracked
  var arch = state.archival;
  var playerArchive = arch.playerArchives[pid];
  assertGTE(playerArchive.researchContributions['arena_philosophy'], 70, 'Player contributions tracked');
})();

// ============================================================================
// SUITE 18: contributeToResearch — edge cases
// ============================================================================

console.log('\n== Suite 18: contributeToResearch Edge Cases ==');

(function() {
  // Contribute to non-existent project
  var state = makeState();
  var pid = uid();
  var result = Archival.contributeToResearch(state, pid, 'fake_project', 50, null);
  assert(!result.success, 'contributeToResearch fails for non-existent project');
  assertExists(result.reason, 'contributeToResearch reason given for failure');

  // Contribute to completed research
  var state2 = makeState();
  var guildId2 = gid();
  var pid2 = uid();
  Archival.startResearchProject(state2, guildId2, 'arena_philosophy', 0);
  // Fill all 3 phases manually
  // Phase 0: goal=70, requires davans_debate_notes
  Archival.contributeToResearch(state2, pid2, 'arena_philosophy', 70, 'davans_debate_notes');
  Archival.advanceResearchPhase(state2, 'arena_philosophy');
  // Phase 1: goal=140
  Archival.contributeToResearch(state2, pid2, 'arena_philosophy', 140, null);
  Archival.advanceResearchPhase(state2, 'arena_philosophy');
  // Phase 2: goal=90
  Archival.contributeToResearch(state2, pid2, 'arena_philosophy', 90, null);
  Archival.completeResearch(state2, 'arena_philosophy');

  var lateContrib = Archival.contributeToResearch(state2, pid2, 'arena_philosophy', 10, null);
  assert(!lateContrib.success, 'Cannot contribute to completed research');
})();

// ============================================================================
// SUITE 19: advanceResearchPhase
// ============================================================================

console.log('\n== Suite 19: advanceResearchPhase ==');

(function() {
  var state = makeState();
  var guildId = gid();
  var pid = uid();

  Archival.startResearchProject(state, guildId, 'commons_architecture', 0);
  // commons_architecture phases: goal=90/relics, goal=180, goal=110

  // Cannot advance when phase is not complete
  var bad = Archival.advanceResearchPhase(state, 'commons_architecture');
  assert(!bad.success, 'advanceResearchPhase fails when phase incomplete');

  // Complete phase 0 (requires builders_oath_stone + communal_hearth_ash + 90 pts)
  Archival.contributeToResearch(state, pid, 'commons_architecture', 90, 'builders_oath_stone');
  Archival.contributeToResearch(state, pid, 'commons_architecture', 0, 'communal_hearth_ash');

  var advance = Archival.advanceResearchPhase(state, 'commons_architecture');
  assert(advance.success, 'advanceResearchPhase succeeds when phase complete');
  assertEqual(advance.newPhase, 1, 'Advances to phase 1');

  // Complete phase 1 (goal=180)
  Archival.contributeToResearch(state, pid, 'commons_architecture', 180, null);
  var advance2 = Archival.advanceResearchPhase(state, 'commons_architecture');
  assert(advance2.success, 'advanceResearchPhase phase 1 → 2');
  assertEqual(advance2.newPhase, 2, 'Now at phase 2');

  // Complete phase 2 (goal=110) — then advanceResearchPhase should fail
  Archival.contributeToResearch(state, pid, 'commons_architecture', 110, null);
  var noAdvance = Archival.advanceResearchPhase(state, 'commons_architecture');
  assert(!noAdvance.success, 'advanceResearchPhase fails after all phases complete (use completeResearch)');

  // Unknown project
  var unk = Archival.advanceResearchPhase(state, 'fake_project');
  assert(!unk.success, 'advanceResearchPhase fails for unknown project');
})();

// ============================================================================
// SUITE 20: completeResearch
// ============================================================================

console.log('\n== Suite 20: completeResearch ==');

(function() {
  var state = makeState();
  var guildId = gid();
  var pid = uid();

  Archival.startResearchProject(state, guildId, 'verdanas_legacy', 0);
  // Phase 0: relicsRequired=[verdana_seed_pouch, root_bead], goal=90
  // Phase 1: goal=180
  // Phase 2: goal=100

  // Cannot complete before all phases done
  var premature = Archival.completeResearch(state, 'verdanas_legacy');
  assert(!premature.success, 'Cannot complete research with phases outstanding');

  // Fill phases
  Archival.contributeToResearch(state, pid, 'verdanas_legacy', 90, 'verdana_seed_pouch');
  Archival.contributeToResearch(state, pid, 'verdanas_legacy', 0, 'root_bead');
  Archival.advanceResearchPhase(state, 'verdanas_legacy');
  Archival.contributeToResearch(state, pid, 'verdanas_legacy', 180, null);
  Archival.advanceResearchPhase(state, 'verdanas_legacy');
  Archival.contributeToResearch(state, pid, 'verdanas_legacy', 100, null);

  var done = Archival.completeResearch(state, 'verdanas_legacy');
  assert(done.success, 'completeResearch succeeds when all phases complete');
  assertExists(done.reward, 'completeResearch returns reward');
  assertExists(done.loreCreated, 'completeResearch returns loreCreated');
  assertEqual(done.loreCreated, 'verdanas_full_legacy', 'Correct lore entry created');
  assert(done.reward.spark > 0, 'Reward includes spark');
  assert(done.reward.xp > 0, 'Reward includes xp');

  // Cannot complete again
  var again = Archival.completeResearch(state, 'verdanas_legacy');
  assert(!again.success, 'Cannot complete already-completed research');
})();

// ============================================================================
// SUITE 21: getResearchProgress
// ============================================================================

console.log('\n== Suite 21: getResearchProgress ==');

(function() {
  var state = makeState();
  var guildId = gid();
  var pid = uid();

  var nullResult = Archival.getResearchProgress(state, 'origin_mystery');
  assert(nullResult === null, 'getResearchProgress returns null for not-started project');

  Archival.startResearchProject(state, guildId, 'origin_mystery', 0);
  Archival.contributeToResearch(state, pid, 'origin_mystery', 50, null);

  var progress = Archival.getResearchProgress(state, 'origin_mystery');
  assertExists(progress, 'getResearchProgress returns data for active project');
  assertEqual(progress.projectId, 'origin_mystery', 'Progress has correct projectId');
  assertEqual(progress.status, 'active', 'Progress shows active status');
  assertGTE(progress.phases.length, 1, 'Progress has phases array');
  assertEqual(progress.phases[0].current, 50, 'Phase 0 current = 50');
  assert(typeof progress.phases[0].percent === 'number', 'Phase has percent');
  assertExists(progress.contributors, 'Progress has contributors');
  assertExists(progress.contributors[pid], 'Progress tracks contributor');
})();

// ============================================================================
// SUITE 22: getActiveResearch
// ============================================================================

console.log('\n== Suite 22: getActiveResearch ==');

(function() {
  var state = makeState();
  var guildId = gid();

  var empty = Archival.getActiveResearch(state, guildId);
  assertEqual(empty.length, 0, 'getActiveResearch empty for guild with no projects');

  Archival.startResearchProject(state, guildId, 'origin_mystery', 0);
  Archival.startResearchProject(state, guildId, 'founders_covenant', 0);

  var active = Archival.getActiveResearch(state, guildId);
  assertEqual(active.length, 2, 'getActiveResearch returns 2 active projects');

  // Different guild gets only its own projects
  var guild2 = gid();
  var other = Archival.getActiveResearch(state, guild2);
  assertEqual(other.length, 0, 'getActiveResearch isolates by guild');
})();

// ============================================================================
// SUITE 23: proposeAmendment
// ============================================================================

console.log('\n== Suite 23: proposeAmendment ==');

(function() {
  var state = makeState();
  var pid = uid();

  var result = Archival.proposeAmendment(state, pid, 'founding_of_nexus', 'New text about the nexus...', 'New evidence from crystal shard discovery', 1000);
  assert(result.success, 'proposeAmendment succeeds');
  assertExists(result.amendment, 'proposeAmendment returns amendment');
  assertEqual(result.amendment.proposerId, pid, 'Amendment has correct proposerId');
  assertEqual(result.amendment.loreId, 'founding_of_nexus', 'Amendment has correct loreId');
  assertEqual(result.amendment.status, 'voting', 'Amendment starts in voting status');
  assertEqual(result.amendment.votes.yes, 0, 'Amendment starts with 0 yes votes');
  assertEqual(result.amendment.votes.no, 0, 'Amendment starts with 0 no votes');
  assertEqual(result.amendment.votes.voters.length, 0, 'Amendment starts with no voters');
  assertEqual(result.amendment.requiredApproval, 0.66, 'Amendment requires 66% approval');
  assertEqual(result.amendment.createdAt, 1000, 'Amendment has correct createdAt');

  // Player archive tracks it
  var arch = state.archival;
  assertIn(arch.playerArchives[pid].proposedAmendments, result.amendment.id, 'Player archive records amendment');

  // Missing fields fail
  var bad1 = Archival.proposeAmendment(state, pid, '', 'text', 'reason', 1001);
  assert(!bad1.success, 'proposeAmendment fails with empty loreId');

  var bad2 = Archival.proposeAmendment(state, pid, 'some_lore', '', 'reason', 1002);
  assert(!bad2.success, 'proposeAmendment fails with empty newText');

  var bad3 = Archival.proposeAmendment(state, pid, 'some_lore', 'text', '', 1003);
  assert(!bad3.success, 'proposeAmendment fails with empty reason');
})();

// ============================================================================
// SUITE 24: voteOnAmendment
// ============================================================================

console.log('\n== Suite 24: voteOnAmendment ==');

(function() {
  var state = makeState();
  var pid = uid();
  var voter1 = uid();
  var voter2 = uid();
  var voter3 = uid();

  var prop = Archival.proposeAmendment(state, pid, 'builders_oath', 'Updated oath text', 'Rediscovered records', 500);
  var amendId = prop.amendment.id;

  // Vote yes
  var v1 = Archival.voteOnAmendment(state, voter1, amendId, true, 3);
  assert(v1.success, 'voteOnAmendment succeeds');
  assertEqual(v1.currentVotes.yes, 1, 'Vote count yes = 1');
  assertEqual(v1.currentVotes.no, 0, 'Vote count no = 0');
  assert(v1.approved === null, 'Not yet approved (1/3 votes = 33%)');

  // Vote yes again — double vote blocked
  var dup = Archival.voteOnAmendment(state, voter1, amendId, true, 3);
  assert(!dup.success, 'Cannot vote twice');
  assertEqual(dup.reason, 'Already voted', 'Correct reason for double vote');

  // Second yes vote
  var v2 = Archival.voteOnAmendment(state, voter2, amendId, true, 3);
  assert(v2.success, 'Second vote succeeds');
  assertEqual(v2.currentVotes.yes, 2, 'Vote count yes = 2');
  assert(v2.approved === true, '2/3 yes votes (66.7%) meets 66% threshold → approved');

  // Amendment status updated
  var amendments = Archival.getAmendments(state, 'approved');
  assertEqual(amendments.length, 1, 'One approved amendment');
  assertEqual(amendments[0].id, amendId, 'Correct amendment approved');
})();

// ============================================================================
// SUITE 25: Amendment rejection
// ============================================================================

console.log('\n== Suite 25: Amendment Rejection ==');

(function() {
  var state = makeState();
  var pid = uid();

  var prop = Archival.proposeAmendment(state, pid, 'founding_of_nexus', 'Controversial text', 'Disputed theory', 200);
  var amendId = prop.amendment.id;

  var voter1 = uid();
  var voter2 = uid();
  var voter3 = uid();

  // All 3 stewards vote — 1 yes, 2 no (33% approval < 66%)
  Archival.voteOnAmendment(state, voter1, amendId, true, 3);
  Archival.voteOnAmendment(state, voter2, amendId, false, 3);
  var v3 = Archival.voteOnAmendment(state, voter3, amendId, false, 3);

  assert(v3.approved === false, 'Amendment rejected when not enough yes votes');
  var rejected = Archival.getAmendments(state, 'rejected');
  assertEqual(rejected.length, 1, 'One rejected amendment');
})();

// ============================================================================
// SUITE 26: getAmendments
// ============================================================================

console.log('\n== Suite 26: getAmendments ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Create multiple amendments
  Archival.proposeAmendment(state, pid, 'lore_1', 'text1', 'reason1', 100);
  Archival.proposeAmendment(state, pid, 'lore_2', 'text2', 'reason2', 200);
  Archival.proposeAmendment(state, pid, 'lore_3', 'text3', 'reason3', 300);

  var all = Archival.getAmendments(state);
  assertEqual(all.length, 3, 'getAmendments returns all 3 amendments');

  var voting = Archival.getAmendments(state, 'voting');
  assertEqual(voting.length, 3, 'All amendments start in voting status');

  var approved = Archival.getAmendments(state, 'approved');
  assertEqual(approved.length, 0, 'No approved amendments yet');

  var rejected = Archival.getAmendments(state, 'rejected');
  assertEqual(rejected.length, 0, 'No rejected amendments yet');

  // Vote on amendment not found
  var bad = Archival.voteOnAmendment(state, pid, 'amendment_does_not_exist', true, 1);
  assert(!bad.success, 'voteOnAmendment fails for unknown amendment');
})();

// ============================================================================
// SUITE 27: getArchivistRank
// ============================================================================

console.log('\n== Suite 27: getArchivistRank ==');

(function() {
  var state = makeState();
  var pid = uid();

  // New player = novice
  var rank = Archival.getArchivistRank(state, pid);
  assertEqual(rank.rank, 'novice', 'New player rank is novice');
  assertEqual(rank.nextRank, 'scholar', 'Next rank is scholar');
  assert(rank.score >= 0, 'Score >= 0');
  assertGTE(rank.progress, 0, 'Progress >= 0');
  assertLTE(rank.progress, 100, 'Progress <= 100');

  // Add relics to progress rank
  Archival.discoverRelic(state, pid, 'crystal_shard');
  Archival.discoverRelic(state, pid, 'stone_tablet');
  Archival.discoverRelic(state, pid, 'root_bead');
  Archival.discoverRelic(state, pid, 'first_journal');
  Archival.discoverRelic(state, pid, 'davans_debate_notes');

  // 5 relics x 20 = 100 points => scholar threshold
  var rank2 = Archival.getArchivistRank(state, pid);
  assertGTE(rank2.score, 100, 'Score >= 100 after 5 relics');
  assertEqual(rank2.rank, 'scholar', 'Rank advances to scholar at score 100');
  assertEqual(rank2.nextRank, 'historian', 'Next rank after scholar is historian');
})();

// ============================================================================
// SUITE 28: Rank Progression
// ============================================================================

console.log('\n== Suite 28: Rank Progression ==');

(function() {
  var state = makeState();
  var pid = uid();

  var ranks = Archival._ARCHIVIST_RANKS;
  assertEqual(ranks.length, 5, 'There are exactly 5 archivist ranks');
  assertEqual(ranks[0].rank, 'novice', 'First rank is novice');
  assertEqual(ranks[4].rank, 'lorekeeper', 'Last rank is lorekeeper');

  // Verify rank order by minScore
  for (var i = 1; i < ranks.length; i++) {
    assert(ranks[i].minScore > ranks[i-1].minScore, 'Rank ' + ranks[i].rank + ' minScore > ' + ranks[i-1].rank);
  }

  // Discover enough relics to reach historian (score >= 300)
  var relicIds = ['crystal_shard', 'stone_tablet', 'rusted_compass', 'founding_ember',
                  'crossing_stone', 'first_coin', 'caelens_quill', 'first_journal',
                  'verdana_seed_pouch', 'root_bead', 'first_canvas_fragment', 'painters_lens',
                  'night_trade_ledger', 'market_bell', 'builders_oath_stone'];
  // 15 relics x 20 = 300 points => historian
  for (var j = 0; j < relicIds.length; j++) {
    Archival.discoverRelic(state, pid, relicIds[j]);
  }
  var rank = Archival.getArchivistRank(state, pid);
  assertGTE(rank.score, 300, 'Score >= 300 after 15 relics');
  assertEqual(rank.rank, 'historian', 'Rank is historian at score >= 300');

  // Max rank lorekeeper — progress = 100
  var state2 = makeState();
  var pid2 = uid();
  var allRelicIds = Archival._RELICS.map(function(r) { return r.id; });
  allRelicIds.forEach(function(rid) { Archival.discoverRelic(state2, pid2, rid); });
  // Add contributions to push score high
  // 20 relics x 20 = 400; need 1100+ contributions to reach lorekeeper (1500)
  var guildId2 = gid();
  Archival.startResearchProject(state2, guildId2, 'origin_mystery', 0);
  for (var k = 0; k < 23; k++) {
    Archival.contributeToResearch(state2, pid2, 'origin_mystery', 50, null);
  }
  // Also propose several amendments (10 pts each)
  for (var m = 0; m < 5; m++) {
    Archival.proposeAmendment(state2, pid2, 'lore_' + m, 'text', 'reason', m);
  }
  var topRank = Archival.getArchivistRank(state2, pid2);
  assertGTE(topRank.score, 1500, 'Can reach lorekeeper score (>= 1500)');
  // Could be lorekeeper depending on contributions
  assert(topRank.rank !== undefined, 'Top player has a rank');
})();

// ============================================================================
// SUITE 29: getArchivalLeaderboard
// ============================================================================

console.log('\n== Suite 29: getArchivalLeaderboard ==');

(function() {
  var state = makeState();

  // Empty leaderboard
  var empty = Archival.getArchivalLeaderboard(state, 10);
  assertEqual(empty.length, 0, 'Empty leaderboard for no players');

  // Add some players
  var pid1 = uid();
  var pid2 = uid();
  var pid3 = uid();

  // pid1 = 3 relics, pid2 = 5 relics, pid3 = 1 relic
  Archival.discoverRelic(state, pid1, 'crystal_shard');
  Archival.discoverRelic(state, pid1, 'stone_tablet');
  Archival.discoverRelic(state, pid1, 'root_bead');

  Archival.discoverRelic(state, pid2, 'founding_ember');
  Archival.discoverRelic(state, pid2, 'first_coin');
  Archival.discoverRelic(state, pid2, 'caelens_quill');
  Archival.discoverRelic(state, pid2, 'verdana_seed_pouch');
  Archival.discoverRelic(state, pid2, 'rusted_compass');

  Archival.discoverRelic(state, pid3, 'root_bead');

  var board = Archival.getArchivalLeaderboard(state, 10);
  assertEqual(board.length, 3, 'Leaderboard has 3 players');
  // Top player has most relics
  assertEqual(board[0].playerId, pid2, 'pid2 tops leaderboard with 5 relics');
  assertEqual(board[1].playerId, pid1, 'pid1 second with 3 relics');
  assertEqual(board[2].playerId, pid3, 'pid3 third with 1 relic');

  // Limit respected
  var limited = Archival.getArchivalLeaderboard(state, 2);
  assertEqual(limited.length, 2, 'Leaderboard respects count limit');

  // Entries have required fields
  board.forEach(function(entry) {
    assertExists(entry.playerId, 'Leaderboard entry has playerId');
    assertExists(entry.rank, 'Leaderboard entry has rank');
    assertExists(entry.title, 'Leaderboard entry has title');
    assert(typeof entry.score === 'number', 'Leaderboard entry has numeric score');
    assert(typeof entry.relicsFound === 'number', 'Leaderboard entry has numeric relicsFound');
  });

  // Scores descending
  for (var i = 0; i < board.length - 1; i++) {
    assert(board[i].score >= board[i+1].score, 'Leaderboard sorted by score descending');
  }
})();

// ============================================================================
// SUITE 30: Multiple Relics and Lore Chains
// ============================================================================

console.log('\n== Suite 30: Multiple Relics and Lore Chains ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Discover relics and verify lore chains are properly associated
  var relics = Archival._RELICS;
  var totalLoreExpected = 0;
  relics.forEach(function(r) {
    totalLoreExpected += r.loreChain.length;
  });

  // Discover all relics and collect all lore
  var allLoreUnlocked = [];
  relics.forEach(function(r) {
    var result = Archival.discoverRelic(state, pid, r.id);
    result.loreUnlocked.forEach(function(l) {
      allLoreUnlocked.push(l);
    });
  });

  assertEqual(allLoreUnlocked.length, totalLoreExpected, 'All lore entries unlocked across all relics');

  // Second pass — all idempotent
  var secondPassLore = [];
  relics.forEach(function(r) {
    var result = Archival.discoverRelic(state, pid, r.id);
    result.loreUnlocked.forEach(function(l) {
      secondPassLore.push(l);
    });
  });
  assertEqual(secondPassLore.length, 0, 'Second pass yields 0 lore (idempotent)');

  // Collection should be complete
  var col = Archival.getRelicCollection(state, pid);
  assertEqual(col.found, relics.length, 'All relics discovered');
  assertEqual(col.percent, 100, 'Collection 100% complete');
})();

// ============================================================================
// SUITE 31: Vote on non-voting amendment
// ============================================================================

console.log('\n== Suite 31: Vote on Non-Voting Amendment ==');

(function() {
  var state = makeState();
  var pid = uid();
  var voter1 = uid();
  var voter2 = uid();

  var prop = Archival.proposeAmendment(state, pid, 'lore_a', 'text', 'reason', 100);
  var amendId = prop.amendment.id;

  // Approve it
  Archival.voteOnAmendment(state, voter1, amendId, true, 1);

  // Now try to vote again on an already-approved amendment
  var late = Archival.voteOnAmendment(state, voter2, amendId, true, 1);
  assert(!late.success, 'Cannot vote on approved amendment');
  assertExists(late.reason, 'Reason given for late vote failure');
})();

// ============================================================================
// SUITE 32: Research with no active project
// ============================================================================

console.log('\n== Suite 32: Research Edge Cases ==');

(function() {
  var state = makeState();
  var pid = uid();

  // advanceResearchPhase on non-existent project
  var adv = Archival.advanceResearchPhase(state, 'fake_project');
  assert(!adv.success, 'advanceResearchPhase fails for unknown project');

  // completeResearch on non-existent project
  var comp = Archival.completeResearch(state, 'fake_project');
  assert(!comp.success, 'completeResearch fails for unknown project');

  // getResearchProgress for unknown project
  var prog = Archival.getResearchProgress(state, 'nonexistent');
  assert(prog === null, 'getResearchProgress returns null for unknown project');
})();

// ============================================================================
// SUITE 33: Excavation increments completedExcavations
// ============================================================================

console.log('\n== Suite 33: Excavation Counters ==');

(function() {
  var state = makeState();
  var pid = uid();

  // Before any excavation
  Archival.excavate(state, pid, 'nexus_crossroads_pit', 1000, 0);
  Archival.excavate(state, pid, 'nexus_crossroads_pit', 2000, 1);

  var playerArchive = state.archival.playerArchives[pid];
  assertGTE(playerArchive.completedExcavations, 2, 'completedExcavations >= 2 after 2 digs');
})();

// ============================================================================
// SUITE 34: Rank influenced by excavations and contributions
// ============================================================================

console.log('\n== Suite 34: Rank Score Components ==');

(function() {
  var state = makeState();
  var pid = uid();

  var rankBefore = Archival.getArchivistRank(state, pid);
  assertEqual(rankBefore.score, 0, 'Score starts at 0');

  // Add excavations (5 pts each)
  // Manually set completedExcavations via excavation
  var arch = state.archival || { playerArchives: {} };
  state.archival = arch;
  if (!arch.playerArchives) { arch.playerArchives = {}; }
  if (!arch.playerArchives[pid]) {
    Archival.getArchivistRank(state, pid); // creates archive
  }
  arch.playerArchives[pid].completedExcavations = 10;

  var rankExcav = Archival.getArchivistRank(state, pid);
  assertGTE(rankExcav.score, 50, 'Score >= 50 from 10 excavations (5 pts each)');

  // Add research contributions (1 pt each)
  var guildId = gid();
  Archival.startResearchProject(state, guildId, 'spark_economy_origins', 0);
  Archival.contributeToResearch(state, pid, 'spark_economy_origins', 100, null);

  var rankContrib = Archival.getArchivistRank(state, pid);
  assertGTE(rankContrib.score, 50 + 100, 'Score increases by research contributions');

  // Add amendments (10 pts each)
  Archival.proposeAmendment(state, pid, 'lore_x', 'text', 'reason', 999);
  var rankAmend = Archival.getArchivistRank(state, pid);
  assertGTE(rankAmend.score, rankContrib.score + 10, 'Score increases by amendment proposals');
})();

// ============================================================================
// SUITE 35: Excavation finds relics from correct pool
// ============================================================================

console.log('\n== Suite 35: Excavation Pool Integrity ==');

(function() {
  var state = makeState();
  var foundRelics = [];

  // Run 100 excavations with varied seeds to capture relic finds
  for (var i = 0; i < 100; i++) {
    var pid = uid();
    var freshState = makeState();
    var result = Archival.excavate(freshState, pid, 'wilds_ruins', i * 11111, 0);
    if (result.relic) {
      foundRelics.push(result.relic.id);
    }
  }

  // All found relics should be in wilds_ruins pool: ['crystal_shard', 'stone_tablet']
  var validPool = ['crystal_shard', 'stone_tablet'];
  foundRelics.forEach(function(rid) {
    assertIn(validPool, rid, 'Excavated relic ' + rid + ' is in site pool');
  });

  assert(foundRelics.length > 0, 'At least some relics found in 100 excavation attempts');
})();

// ============================================================================
// FINAL SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed');
if (errors.length > 0) {
  console.log('\nFailed tests:');
  errors.forEach(function(msg) { console.log('  - ' + msg); });
}
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
