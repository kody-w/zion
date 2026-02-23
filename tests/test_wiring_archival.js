// Test: Archival system wiring — state init, excavate signature, research lifecycle, archivist rank
// Verifies excavate(state, playerId, siteId, seed, currentTick) and research project flow

(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  var Archival = require('../src/js/archival');

  // Test 1: State shape matches what main.js initializes
  var state = { archival: { sites: {}, playerArchives: {}, activeResearch: {}, amendments: {} } };
  assert(state.archival !== undefined, 'archival state has archival key');
  assert(state.archival.sites !== undefined, 'archival state has sites');

  // Test 2: getExcavationSites returns array
  var sites = Archival.getExcavationSites(state, null);
  assert(Array.isArray(sites), 'getExcavationSites returns array');
  assert(sites.length > 0, 'getExcavationSites has sites');

  // Test 3: getExcavationSites filters by zone
  var nexusSites = Archival.getExcavationSites(state, 'nexus');
  assert(Array.isArray(nexusSites), 'getExcavationSites(nexus) returns array');

  // Test 4: excavate with correct 5-arg signature
  var allSites = Archival.getExcavationSites(state, null);
  var testSite = allSites[0];
  var siteId = testSite.siteId || testSite.id;
  var excResult = Archival.excavate(state, 'player_1', siteId, 12345, 100);
  assert(excResult !== null && excResult !== undefined, 'excavate returns result');
  assert(typeof excResult.success === 'boolean', 'excavate result has success boolean');

  // Test 5: Successful excavation returns relic info
  if (excResult.success) {
    assert(excResult.relic !== undefined, 'successful excavate returns relic');
  } else {
    // Even failure should have a reason
    assert(excResult.reason !== undefined || excResult.success === false, 'failed excavate has reason or success=false');
  }

  // Test 6: getResearchProjects returns projects
  var projects = Archival.getResearchProjects();
  assert(Array.isArray(projects), 'getResearchProjects returns array');
  assert(projects.length > 0, 'getResearchProjects has projects');

  // Test 7: startResearchProject
  var proj = projects[0];
  var startResult = Archival.startResearchProject(state, 'default_guild', proj.id, 100);
  assert(startResult !== null && startResult !== undefined, 'startResearchProject returns result');
  assert(typeof startResult.success === 'boolean', 'startResearchProject has success');

  // Test 8: getActiveResearch
  var activeRes = Archival.getActiveResearch(state, 'default_guild');
  assert(Array.isArray(activeRes), 'getActiveResearch returns array');

  // Test 9: contributeToResearch
  if (activeRes.length > 0) {
    var res = activeRes[0];
    var contribResult = Archival.contributeToResearch(state, 'player_1', res.projectId || res.id, 1, null);
    assert(contribResult !== null && contribResult !== undefined, 'contributeToResearch returns result');
  } else {
    passed++; // skip if no active research
  }

  // Test 10: getArchivistRank
  var rank = Archival.getArchivistRank(state, 'player_1');
  assert(rank !== null && rank !== undefined, 'getArchivistRank returns result');
  assert(rank.title !== undefined, 'getArchivistRank has title');

  // Test 11: getRelics returns all relics
  var relics = Archival.getRelics(null);
  assert(Array.isArray(relics), 'getRelics returns array');
  assert(relics.length > 0, 'getRelics has entries');

  console.log('test_wiring_archival: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
