// Test that previously dead systems are now wired into the game loop
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

  console.log('Previously dead systems now wired into game loop');
  console.log('');

  var fs = require('fs');
  var src = fs.readFileSync(__dirname + '/../src/js/main.js', 'utf8');

  // Each system should appear in the game loop with a Math.random() tick guard
  var systems = [
    { name: 'RaidSystem', pattern: /RaidSystem && RaidSystem\.getAvailableRaids && raidStateStore && Math\.random\(\)/ },
    { name: 'GuildWars', pattern: /GuildWars && GuildWars\.getActiveWars && guildWarsState && Math\.random\(\)/ },
    { name: 'Apprenticeship', pattern: /Apprenticeship && Apprenticeship\.getActiveLessons && apprenticeshipState && Math\.random\(\)/ },
    { name: 'MinigameForge', pattern: /MinigameForge && MinigameForge\.getPublishedGames && minigameForgeState && Math\.random\(\)/ },
    { name: 'ConstitutionAmendments', pattern: /ConstitutionAmendments && ConstitutionAmendments\.getActiveAmendments && constitutionState && Math\.random\(\)/ },
    { name: 'EconomySimulator', pattern: /EconomySimulator && EconomySimulator\.getMarketHealthScore && economySimState && Math\.random\(\)/ },
    { name: 'GuildProgression', pattern: /GuildProgression && GuildProgression\.getGuildSummary && guildProgressionState && Math\.random\(\)/ },
    { name: 'Prestige', pattern: /Prestige && Prestige\.canAscend && prestigeState/ }
  ];

  for (var i = 0; i < systems.length; i++) {
    var sys = systems[i];
    assert(sys.pattern.test(src), sys.name + ' ticked in game loop');
  }

  console.log('');
  console.log('System modules export required functions');

  // Verify each module exports the functions called in the game loop
  var RaidSystem = require('../src/js/raid_system');
  assert(typeof RaidSystem.getAvailableRaids === 'function', 'RaidSystem.getAvailableRaids exported');
  assert(typeof RaidSystem.createRaidStateStore === 'function', 'RaidSystem.createRaidStateStore exported');

  var GuildWars = require('../src/js/guild_wars');
  assert(typeof GuildWars.getActiveWars === 'function', 'GuildWars.getActiveWars exported');
  assert(typeof GuildWars.resolveBattle === 'function', 'GuildWars.resolveBattle exported');

  var Apprenticeship = require('../src/js/apprenticeship');
  assert(typeof Apprenticeship.getActiveLessons === 'function', 'Apprenticeship.getActiveLessons exported');

  var MinigameForge = require('../src/js/minigame_forge');
  assert(typeof MinigameForge.getPublishedGames === 'function', 'MinigameForge.getPublishedGames exported');

  var ConstitutionAmendments = require('../src/js/constitution_amendments');
  assert(typeof ConstitutionAmendments.getActiveAmendments === 'function', 'ConstitutionAmendments.getActiveAmendments exported');
  assert(typeof ConstitutionAmendments.closeVoting === 'function', 'ConstitutionAmendments.closeVoting exported');

  var EconomySimulator = require('../src/js/economy_simulator');
  assert(typeof EconomySimulator.getMarketHealthScore === 'function', 'EconomySimulator.getMarketHealthScore exported');

  var GuildProgression = require('../src/js/guild_progression');
  assert(typeof GuildProgression.getGuildSummary === 'function', 'GuildProgression.getGuildSummary exported');

  var Prestige = require('../src/js/prestige');
  assert(typeof Prestige.canAscend === 'function', 'Prestige.canAscend exported');

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
