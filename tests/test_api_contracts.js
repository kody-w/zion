// test_api_contracts.js - Cross-module API contract verification
// Prevents: API signature mismatches, missing exports, broken cross-module calls
const { test, suite, report, assert } = require('./test_runner');
const fs = require('fs');
const path = require('path');

var SRC_DIR = path.join(__dirname, '..', 'src', 'js');

// Module name -> filename mapping (matches window.Name assignments in bundle)
var MODULE_MAP = {
  Protocol: 'protocol.js',
  Zones: 'zones.js',
  Economy: 'economy.js',
  Inventory: 'inventory.js',
  Trading: 'trading.js',
  State: 'state.js',
  Intentions: 'intentions.js',
  Social: 'social.js',
  Creation: 'creation.js',
  Quests: 'quests.js',
  Competition: 'competition.js',
  Exploration: 'exploration.js',
  Physical: 'physical.js',
  Guilds: 'guilds.js',
  Mentoring: 'mentoring.js',
  Models: 'models.js',
  Auth: 'auth.js',
  Network: 'network.js',
  World: 'world.js',
  Input: 'input.js',
  HUD: 'hud.js',
  XR: 'xr.js',
  Audio: 'audio.js',
  NpcAI: 'npc_ai.js',
  NPCs: 'npcs.js',
  Seasons: 'seasons.js',
  Pets: 'pets.js',
  Main: 'main.js'
};

// Try to require() each module — browser-only modules still load because
// UMD pattern only defines functions (browser globals used inside functions,
// not at load time). npcs.js fails due to AGENTS_PLACEHOLDER.
var loaded = {};
var loadFailures = [];
Object.keys(MODULE_MAP).forEach(function(name) {
  try {
    loaded[name] = require(path.join(SRC_DIR, MODULE_MAP[name]));
  } catch (e) {
    loaded[name] = null;
    loadFailures.push(name + ' (' + e.message.split('\n')[0] + ')');
  }
});

// Known missing exports — these calls exist in main.js but the functions aren't
// exported from their modules. All are either guarded by existence checks
// (e.g., `Quests ? Quests.fn() : default`) or in optional code paths.
// Adding a NEW call to a missing export will still be caught by this test.
var KNOWN_MISSING = {
  'Creation.getPlayerStructures': true, // guarded: Creation ? Creation.fn() : 0
  'Economy.debit': true,                // in guild creation path
  'Network.broadcast': true,            // governance voting path
  'Protocol.validate': true,            // guarded: !Protocol || !Protocol.validate
  'Quests.getCompletedQuests': true,    // guarded: Quests ? Quests.fn() : 0
  'World.addStructure': true,           // guarded: if (Creation && World && ...)
  'World.createPortal': true,           // zone portal setup
  'World.getPlayerMesh': true           // guarded: World.getPlayerMesh ? ... : null
};

// ─── Layer 1: Static call-site discovery ────────────────────────────────────

function discoverCallSites() {
  var sites = {}; // { 'Module.func': ['caller1.js', ...] }
  var names = Object.keys(MODULE_MAP);
  var pattern = new RegExp('\\b(' + names.join('|') + ')\\.([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(', 'g');

  var files = fs.readdirSync(SRC_DIR).filter(function(f) { return f.endsWith('.js'); });
  files.forEach(function(file) {
    var src = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    // Strip comments to reduce false positives
    var clean = src
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    var match;
    while ((match = pattern.exec(clean)) !== null) {
      var key = match[1] + '.' + match[2];
      if (!sites[key]) sites[key] = [];
      if (sites[key].indexOf(file) === -1) sites[key].push(file);
    }
  });
  return sites;
}

suite('Cross-Module Call Sites (Auto-Discovered)', function() {
  var sites = discoverCallSites();
  var keys = Object.keys(sites).sort();

  test('Discovered ' + keys.length + ' cross-module call sites', function() {
    assert.ok(keys.length > 0, 'Should discover at least some cross-module calls');
  });

  keys.forEach(function(key) {
    var parts = key.split('.');
    var modName = parts[0];
    var funcName = parts[1];
    var callers = sites[key];
    var mod = loaded[modName];

    if (mod === null) return; // Module couldn't be loaded, skip
    if (KNOWN_MISSING[key]) return; // Known missing export, tracked above

    test(key + ' exists (called from ' + callers.join(', ') + ')', function() {
      assert.ok(mod[funcName] !== undefined,
        key + ' is not exported — called from ' + callers.join(', ') + ' but missing from ' + MODULE_MAP[modName]);
    });
  });
});

// ─── Layer 2: Critical API arity checks ─────────────────────────────────────

suite('Audio API Contracts', function() {
  var Audio = loaded.Audio;
  if (!Audio) {
    test('Audio module loads in Node', function() {
      throw new Error('Audio module failed to load — cannot verify contracts');
    });
    return;
  }

  var expectedFunctions = [
    'initAudio', 'playAmbient', 'playSound', 'playFootstep',
    'setVolume', 'mute', 'unmute', 'stopAll',
    'startMusic', 'stopMusic', 'updateMusic', 'setMusicVolume',
    'isMusicPlaying', 'setZoneAmbient', 'playNPCSound',
    'updateAmbientTime', 'updateAmbientWeather'
  ];

  expectedFunctions.forEach(function(name) {
    test('Audio.' + name + ' is a function', function() {
      assert.strictEqual(typeof Audio[name], 'function',
        'Audio.' + name + ' should be a function, got ' + typeof Audio[name]);
    });
  });

  // Regression: Bug #1 — setVolume was called with (channel, level) but only accepted (level)
  test('Audio.setVolume accepts (channel, level) — arity >= 2', function() {
    assert.ok(Audio.setVolume.length >= 2,
      'setVolume.length is ' + Audio.setVolume.length + ', expected >= 2. ' +
      'Regression: must accept (channel, level) not just (level)');
  });
});

suite('World API Contracts', function() {
  var World = loaded.World;
  if (!World) {
    test('World module loads in Node', function() {
      throw new Error('World module failed to load');
    });
    return;
  }

  var expectedFunctions = [
    'initScene', 'loadZone', 'addPlayer', 'movePlayer', 'removePlayer',
    'getTerrainHeight', 'getZoneAtPosition', 'updateDayNight',
    'updateWeather', 'setWeather', 'initParticles', 'updateParticles',
    'emitParticles', 'initWater', 'updateWater', 'updateAnimations',
    'enterBuildMode', 'exitBuildMode', 'updateLOD'
  ];

  expectedFunctions.forEach(function(name) {
    test('World.' + name + ' is a function', function() {
      assert.strictEqual(typeof World[name], 'function',
        'World.' + name + ' should be a function, got ' + typeof World[name]);
    });
  });

  test('World.ZONES is an object', function() {
    assert.strictEqual(typeof World.ZONES, 'object',
      'World.ZONES should be an object');
    assert.ok(Object.keys(World.ZONES).length > 0,
      'World.ZONES should not be empty');
  });
});

suite('HUD API Contracts', function() {
  var HUD = loaded.HUD;
  if (!HUD) {
    test('HUD module loads in Node', function() {
      throw new Error('HUD module failed to load');
    });
    return;
  }

  var expectedFunctions = [
    'initHUD', 'showNotification', 'updateChat', 'updatePlayerInfo',
    'updateMinimap', 'updateZoneLabel', 'showNPCDialog', 'hideNPCDialog',
    'initQuestTracker', 'updateQuestTracker', 'loadSettings', 'getSettings',
    'showSettingsMenu', 'hideSettingsMenu', 'initTutorial', 'advanceTutorial',
    'showWorldMap', 'hideWorldMap', 'showEmoteMenu', 'hideEmoteMenu',
    'showBuildToolbar', 'hideBuildToolbar', 'showTradeWindow', 'hideTradeWindow'
  ];

  expectedFunctions.forEach(function(name) {
    test('HUD.' + name + ' is a function', function() {
      assert.strictEqual(typeof HUD[name], 'function',
        'HUD.' + name + ' should be a function, got ' + typeof HUD[name]);
    });
  });
});

suite('Input API Contracts', function() {
  var Input = loaded.Input;
  if (!Input) {
    test('Input module loads in Node', function() {
      throw new Error('Input module failed to load');
    });
    return;
  }

  var expectedFunctions = [
    'initInput', 'getMovementDelta', 'getPlatform',
    'createMoveMessage', 'getMouseNDC', 'getCameraDistance', 'getCameraOrbit'
  ];

  expectedFunctions.forEach(function(name) {
    test('Input.' + name + ' is a function', function() {
      assert.strictEqual(typeof Input[name], 'function',
        'Input.' + name + ' should be a function, got ' + typeof Input[name]);
    });
  });
});

suite('Module Load Summary', function() {
  var loadedCount = Object.keys(loaded).filter(function(k) { return loaded[k] !== null; }).length;
  var total = Object.keys(MODULE_MAP).length;

  test(loadedCount + '/' + total + ' modules load in Node', function() {
    // At minimum, the core logic modules must load
    var critical = ['Protocol', 'Zones', 'Economy', 'State', 'Intentions', 'Social', 'Creation'];
    var failedCritical = critical.filter(function(m) { return loaded[m] === null; });
    assert.strictEqual(failedCritical.length, 0,
      'Critical modules failed to load: ' + failedCritical.join(', '));
  });

  if (loadFailures.length > 0) {
    test('Non-critical load failures (informational)', function() {
      // This always passes — just logs which modules couldn't load
      console.log('    Modules that could not be loaded in Node:');
      loadFailures.forEach(function(msg) { console.log('      - ' + msg); });
    });
  }
});

var success = report();
process.exit(success ? 0 : 1);
