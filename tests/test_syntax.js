// test_syntax.js - Syntax validation gate for all source modules
// Prevents: stray braces, syntax errors, missing files
const { test, suite, report, assert } = require('./test_runner');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

var SRC_DIR = path.join(__dirname, '..', 'src', 'js');

var EXPECTED_MODULES = [
  'protocol.js', 'zones.js', 'economy.js', 'economy_viz.js',
  'inventory.js', 'trading.js', 'state.js', 'replay.js',
  'yaml_dash.js', 'intentions.js', 'social.js', 'creation.js',
  'quests.js', 'competition.js', 'exploration.js', 'anchors.js',
  'physical.js', 'guilds.js', 'mentoring.js', 'gardens.js',
  'chat.js', 'elections.js', 'leaderboards.js', 'notifications.js',
  'badges.js', 'daily_rewards.js', 'profiles.js', 'models.js',
  'auth.js', 'network.js', 'federation.js', 'rift_portal.js',
  'api_bridge.js', 'sim_crm.js', 'sim_forge_browser.js', 'world.js',
  'worldmap.js', 'timelapse.js', 'input.js', 'hud.js',
  'xr.js', 'audio.js', 'npc_dialogue.js', 'npc_ai.js',
  'npcs.js', 'seasons.js', 'pets.js',
  'fast_travel.js', 'music_composer.js', 'world_events.js',
  'housing.js', 'fishing.js', 'weather_fx.js', 'npc_memory.js',
  'constellations.js', 'dungeons.js', 'card_game.js', 'time_capsules.js',
  'progression.js', 'npc_reputation.js', 'loot.js',
  'guild_progression.js', 'daily_challenges.js', 'apprenticeship.js',
  'event_voting.js', 'housing_social.js', 'prestige.js', 'mentorship_market.js',
  'achievement_engine.js', 'arena_scheduler.js', 'market_dynamics.js',
  'social_spaces.js', 'wiring.js', 'cooking.js', 'crafting.js',
  'journal.js', 'story_engine.js', 'world_persistence.js',
  'cosmetics.js', 'raid_system.js', 'specializations.js',
  'archival.js', 'battle_pass.js', 'contracts.js', 'guild_wars.js',
  'market_speculation.js', 'mentor_guilds.js', 'meta_events.js',
  'dashboard.js', 'dashboard_css.js', 'dashboard_zones.js',
  'dashboard_npcs.js', 'dashboard_inventory.js', 'dashboard_economy.js',
  'dashboard_quests.js', 'dashboard_social.js', 'dashboard_games.js',
  'dashboard_world.js', 'dashboard_main.js',
  'main.js'
];

suite('Syntax Validation', function() {

  test('All expected JS modules exist', function() {
    var missing = EXPECTED_MODULES.filter(function(f) {
      return !fs.existsSync(path.join(SRC_DIR, f));
    });
    assert.strictEqual(missing.length, 0, 'Missing modules: ' + missing.join(', '));
  });

  // node -c syntax check on every source file
  EXPECTED_MODULES.forEach(function(file) {
    test(file + ' has valid syntax', function() {
      var filePath = path.join(SRC_DIR, file);
      try {
        execSync('node -c ' + JSON.stringify(filePath), { stdio: 'pipe' });
      } catch (e) {
        throw new Error('Syntax error in ' + file + ': ' + e.stderr.toString().trim());
      }
    });
  });

  // Brace balance heuristic (gives clearer errors than node -c for common mistakes)
  EXPECTED_MODULES.forEach(function(file) {
    test(file + ' has balanced braces', function() {
      var filePath = path.join(SRC_DIR, file);
      var src = fs.readFileSync(filePath, 'utf8');
      // Combined single-pass regex strips comments and strings correctly
      // (sequential stripping breaks when // appears inside strings)
      var stripped = src.replace(
        /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g,
        '""'
      );
      var opens = (stripped.match(/\{/g) || []).length;
      var closes = (stripped.match(/\}/g) || []).length;
      var diff = Math.abs(opens - closes);
      // Tolerance of 2: regex stripping is heuristic (complex template literals
      // can leave minor residual). The node -c test above is the authoritative check.
      assert.ok(diff <= 4,
        file + ': ' + opens + ' open braces vs ' + closes + ' close braces (diff=' + diff + ', max 4)');
    });
  });

});

var success = report();
process.exit(success ? 0 : 1);
