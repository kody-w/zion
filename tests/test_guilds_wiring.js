// Test guilds module wiring
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

  var Guilds = require('../src/js/guilds');

  console.log('Guilds module wiring');
  console.log('');

  console.log('Core exports');
  assert(typeof Guilds.initGuilds === 'function', 'initGuilds exported');
  assert(typeof Guilds.createGuild === 'function', 'createGuild exported');
  assert(typeof Guilds.leaveGuild === 'function', 'leaveGuild exported');
  assert(typeof Guilds.getPlayerGuild === 'function', 'getPlayerGuild exported');
  assert(typeof Guilds.getGuild === 'function', 'getGuild exported');
  assert(typeof Guilds.getGuildMembers === 'function', 'getGuildMembers exported');
  assert(typeof Guilds.searchGuilds === 'function', 'searchGuilds exported');
  assert(typeof Guilds.getGuildsByType === 'function', 'getGuildsByType exported');
  assert(typeof Guilds.inviteToGuild === 'function', 'inviteToGuild exported');
  assert(typeof Guilds.acceptInvite === 'function', 'acceptInvite exported');
  assert(typeof Guilds.disbandGuild === 'function', 'disbandGuild exported');
  assert(typeof Guilds.kickMember === 'function', 'kickMember exported');

  console.log('');
  console.log('Treasury and XP');
  assert(typeof Guilds.depositToTreasury === 'function', 'depositToTreasury exported');
  assert(typeof Guilds.withdrawFromTreasury === 'function', 'withdrawFromTreasury exported');
  assert(typeof Guilds.addGuildXP === 'function', 'addGuildXP exported');
  assert(typeof Guilds.getGuildLeaderboard === 'function', 'getGuildLeaderboard exported');

  console.log('');
  console.log('Social features');
  assert(typeof Guilds.sendGuildMessage === 'function', 'sendGuildMessage exported');
  assert(typeof Guilds.getGuildMessages === 'function', 'getGuildMessages exported');
  assert(typeof Guilds.setGuildBanner === 'function', 'setGuildBanner exported');
  assert(typeof Guilds.getGuildActivities === 'function', 'getGuildActivities exported');
  assert(typeof Guilds.getPendingInvites === 'function', 'getPendingInvites exported');
  assert(typeof Guilds.updateGuildSettings === 'function', 'updateGuildSettings exported');

  console.log('');
  console.log('Initialization flow');

  // Init with null (fresh state)
  Guilds.initGuilds(null);
  var state = Guilds.getGuildsState();
  assert(state !== null && typeof state === 'object', 'getGuildsState returns object after init');

  // No player guild initially
  var pg = Guilds.getPlayerGuild('test-player');
  assert(pg === null || pg === undefined, 'no guild for new player');

  // Create a guild (playerId, name, tag, type, description)
  var result = Guilds.createGuild('test-player', 'Test Guild', 'TEST', 'guild', 'A test guild');
  assert(result !== null, 'createGuild returns result');

  // Player should now be in a guild
  var guild = Guilds.getPlayerGuild('test-player');
  assert(guild !== null && guild !== undefined, 'player has guild after creation');
  if (guild) {
    assert(guild.name === 'Test Guild', 'guild name matches');
    assert(guild.tag === 'TEST', 'guild tag matches');
  }

  // Search guilds
  var results = Guilds.searchGuilds('Test');
  assert(Array.isArray(results), 'searchGuilds returns array');
  assert(results.length >= 1, 'found guild in search');

  // Leaderboard
  var lb = Guilds.getGuildLeaderboard();
  assert(Array.isArray(lb), 'getGuildLeaderboard returns array');

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
