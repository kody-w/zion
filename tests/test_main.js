/**
 * tests/test_main.js
 * Test suite for main.js — the ZION game loop orchestrator
 *
 * Strategy:
 *   1. Stub all ~80 dependencies so the UMD module loads cleanly under Node.js
 *   2. Verify every exported function exists and has the right type
 *   3. Probe each function's behaviour with safe (null / undefined / stub) inputs
 *   4. Cover the getSimCrmState pre-init contract
 *   5. Verify static file properties (existence, non-zero size, syntax)
 */

'use strict';

var fs   = require('fs');
var path = require('path');
var { test, suite, report, assert } = require('./test_runner');

// ─── 1. DEPENDENCY STUBS ────────────────────────────────────────────────────

// Every name that main.js requires('./…') — compile the full list from the
// import block at the top of main.js.
var STUB_NAMES = [
  'protocol', 'state', 'zones', 'economy', 'inventory', 'trading',
  'intentions', 'social', 'creation', 'competition', 'exploration',
  'physical', 'auth', 'network', 'models', 'world', 'input', 'hud',
  'xr', 'audio', 'npcs', 'quests', 'mentoring', 'guilds', 'seasons',
  'pets', 'api_bridge', 'fast_travel', 'weather_fx', 'progression',
  'npc_reputation', 'loot', 'guild_progression', 'daily_challenges',
  'apprenticeship', 'event_voting', 'housing_social', 'prestige',
  'mentorship_market', 'achievement_engine', 'arena_scheduler',
  'market_dynamics', 'social_spaces', 'wiring', 'cooking', 'crafting',
  'journal', 'story_engine', 'world_persistence', 'cosmetics',
  'raid_system', 'specializations', 'archival', 'battle_pass',
  'contracts', 'guild_wars', 'market_speculation', 'mentor_guilds',
  'meta_events', 'async_collab', 'economy_simulator', 'narrative_threads',
  'minigame_forge', 'multiverse_reputation', 'npc_delegation',
  'radio_station', 'seasonal_events_auto', 'event_consequences',
  'player_onboarding', 'skill_mastery', 'world_shaper', 'trust_bonds',
  'recovery_system', 'bounty_board', 'market_signals',
  'consequence_branching', 'diplomatic_system', 'merchant_guilds',
  'grief_recovery', 'anchor_management', 'community_board',
  'constitution_amendments', 'lore_discovery', 'spectator_system',
  'warmth_system', 'zone_stewards'
];

// Intercept Node's module resolution so every stub name resolves to our cache.
var Module = require('module');
var originalResolve = Module._resolveFilename;

Module._resolveFilename = function(request, parent, isMain, options) {
  var basename = request.replace(/^\.\//, '').replace(/\.js$/, '');
  if (STUB_NAMES.indexOf(basename) >= 0) {
    // Return a synthetic path that we will pre-populate in the cache.
    return '__stub__/' + basename;
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

// Pre-populate the require cache with empty-object stubs.
STUB_NAMES.forEach(function(name) {
  var key = '__stub__/' + name;
  require.cache[key] = {
    id: key,
    filename: key,
    loaded: true,
    exports: {}
  };
});

// ─── 2. BROWSER GLOBALS ─────────────────────────────────────────────────────

// main.js references window, document, THREE, SOULS_PLACEHOLDER, etc.
// Provide minimal stubs so module-level code doesn't throw.
global.THREE = undefined;  // no Three.js in Node

var _domStyle = function() { return { position: '', top: '', left: '', width: '', height: '',
    pointerEvents: '', zIndex: '', opacity: '', transition: '', boxShadow: '',
    backgroundColor: '', display: '' }; };

var _domEl = function() {
  var el = {
    style: _domStyle(),
    appendChild: function() {},
    innerHTML: '',
    className: '',
    id: ''
  };
  return el;
};

global.document = {
  getElementById:     function() { return null; },
  createElement:      function() { return _domEl(); },
  addEventListener:   function() {},
  body:               _domEl()
};

global.window = {
  requestAnimationFrame: function() { return 0; },
  addEventListener:      function() {},
  location:              { search: '' },
  URLSearchParams:       undefined
};

// Placeholders replaced at bundle time — provide valid JSON strings.
global.SOULS_PLACEHOLDER  = '[]';
global.AGENTS_PLACEHOLDER = '[]';

// ─── 3. LOAD MAIN.JS ────────────────────────────────────────────────────────

var Main = null;
var loadError = null;

try {
  Main = require('../src/js/main');
} catch (e) {
  loadError = e;
}

// ─── 4. TEST SUITES ─────────────────────────────────────────────────────────

// ── 4a. File-level checks (always run, even if require() failed) ────────────

suite('File properties', function() {
  var mainPath = path.resolve(__dirname, '../src/js/main.js');

  test('main.js exists on disk', function() {
    assert.ok(fs.existsSync(mainPath), 'File not found: ' + mainPath);
  });

  test('main.js is non-empty (>= 100 bytes)', function() {
    var size = fs.statSync(mainPath).size;
    assert.ok(size >= 100, 'File too small: ' + size + ' bytes');
  });

  test('main.js is large (> 50 000 bytes)', function() {
    // The live file is ~6 700 lines; a tiny file would signal accidental truncation.
    var size = fs.statSync(mainPath).size;
    assert.ok(size > 50000, 'File suspiciously small: ' + size + ' bytes');
  });

  test('main.js uses UMD export pattern', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(
      src.indexOf("typeof module !== 'undefined' ? module.exports") !== -1,
      'UMD pattern not found'
    );
  });

  test('main.js exports.init is present in source', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('exports.init') !== -1, 'exports.init not found in source');
  });

  test('main.js exports.joinWorld is present in source', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('exports.joinWorld') !== -1);
  });

  test('main.js exports.leaveWorld is present in source', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('exports.leaveWorld') !== -1);
  });

  test('main.js exports.handleLocalAction is present in source', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('exports.handleLocalAction') !== -1);
  });

  test('main.js exports.triggerCameraShake is present in source', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('exports.triggerCameraShake') !== -1);
  });

  test('main.js exports.triggerScreenFlash is present in source', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('exports.triggerScreenFlash') !== -1);
  });

  test('main.js exports.setVignetteIntensity is present in source', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('exports.setVignetteIntensity') !== -1);
  });

  test('main.js exports.getSimCrmState is present in source', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('exports.getSimCrmState') !== -1);
  });

  test('main.js contains SOULS_PLACEHOLDER reference', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('SOULS_PLACEHOLDER') !== -1);
  });

  test('main.js contains handleLocalAction switch-case for move', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf("case 'move':") !== -1);
  });

  test('main.js contains handleLocalAction switch-case for chat', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf("case 'chat':") !== -1);
  });

  test('main.js defines cameraShake object', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('cameraShake') !== -1);
  });

  test('main.js defines worldEvents object', function() {
    var src = fs.readFileSync(mainPath, 'utf8');
    assert.ok(src.indexOf('worldEvents') !== -1);
  });
});

// ── 4b. Module load check ────────────────────────────────────────────────────

suite('Module loads under Node.js', function() {
  test('require("../src/js/main") did not throw', function() {
    assert.strictEqual(loadError, null,
      loadError ? 'Load error: ' + loadError.message : 'ok');
  });

  test('require returns an object', function() {
    assert.ok(Main !== null && typeof Main === 'object');
  });
});

// Only run the deeper suites when the module actually loaded.
if (Main) {

  // ── 4c. Export shape ────────────────────────────────────────────────────────

  suite('Export verification — all 8 exports present', function() {
    var EXPECTED_EXPORTS = [
      'init', 'joinWorld', 'leaveWorld', 'handleLocalAction',
      'triggerCameraShake', 'triggerScreenFlash', 'setVignetteIntensity',
      'getSimCrmState'
    ];

    EXPECTED_EXPORTS.forEach(function(name) {
      test('exports.' + name + ' exists', function() {
        assert.ok(name in Main, 'Missing export: ' + name);
      });

      test('exports.' + name + ' is a function', function() {
        assert.strictEqual(typeof Main[name], 'function',
          name + ' should be a function, got ' + typeof Main[name]);
      });
    });

    test('no unexpected extra exports beyond the 8 known ones', function() {
      // All keys must be from the known set
      var keys = Object.keys(Main);
      keys.forEach(function(k) {
        assert.ok(
          EXPECTED_EXPORTS.indexOf(k) !== -1,
          'Unexpected export: ' + k
        );
      });
    });
  });

  // ── 4d. getSimCrmState — pre-init contract ──────────────────────────────────

  suite('getSimCrmState pre-init contract', function() {
    test('returns null before init() is called', function() {
      var result = Main.getSimCrmState();
      assert.strictEqual(result, null);
    });

    test('calling getSimCrmState twice gives same null result', function() {
      var a = Main.getSimCrmState();
      var b = Main.getSimCrmState();
      assert.strictEqual(a, b);
    });

    test('getSimCrmState is idempotent (no side effects)', function() {
      // The null state should not mutate between calls
      Main.getSimCrmState();
      Main.getSimCrmState();
      assert.strictEqual(Main.getSimCrmState(), null);
    });
  });

  // ── 4e. Function safety — null / undefined arguments ───────────────────────

  suite('triggerCameraShake — argument safety', function() {
    test('does not throw when called with (0, 0)', function() {
      assert.doesNotThrow(function() { Main.triggerCameraShake(0, 0); });
    });

    test('does not throw when called with positive values (0.5, 1)', function() {
      assert.doesNotThrow(function() { Main.triggerCameraShake(0.5, 1); });
    });

    test('does not throw when called with large values (10, 100)', function() {
      assert.doesNotThrow(function() { Main.triggerCameraShake(10, 100); });
    });

    test('does not throw when called with undefined arguments', function() {
      assert.doesNotThrow(function() { Main.triggerCameraShake(undefined, undefined); });
    });

    test('does not throw when called with null arguments', function() {
      assert.doesNotThrow(function() { Main.triggerCameraShake(null, null); });
    });

    test('returns undefined (no return value expected)', function() {
      var r = Main.triggerCameraShake(0.3, 0.5);
      assert.strictEqual(r, undefined);
    });
  });

  suite('triggerScreenFlash — argument safety', function() {
    test('does not throw with (null, null)', function() {
      // document.createElement returns our stub, so appendChild should not throw
      assert.doesNotThrow(function() { Main.triggerScreenFlash(null, null); });
    });

    test('does not throw with (undefined, undefined)', function() {
      assert.doesNotThrow(function() { Main.triggerScreenFlash(undefined, undefined); });
    });

    test('does not throw with valid color and duration', function() {
      assert.doesNotThrow(function() { Main.triggerScreenFlash('#ff0000', 0.5); });
    });

    test('returns undefined', function() {
      var r = Main.triggerScreenFlash('#ffffff', 0.2);
      assert.strictEqual(r, undefined);
    });
  });

  suite('setVignetteIntensity — argument safety', function() {
    test('does not throw with intensity 0', function() {
      assert.doesNotThrow(function() { Main.setVignetteIntensity(0); });
    });

    test('does not throw with intensity 1.0', function() {
      assert.doesNotThrow(function() { Main.setVignetteIntensity(1.0); });
    });

    test('does not throw with intensity 0.5', function() {
      assert.doesNotThrow(function() { Main.setVignetteIntensity(0.5); });
    });

    test('does not throw with null', function() {
      assert.doesNotThrow(function() { Main.setVignetteIntensity(null); });
    });

    test('does not throw with undefined', function() {
      assert.doesNotThrow(function() { Main.setVignetteIntensity(undefined); });
    });

    test('returns undefined', function() {
      var r = Main.setVignetteIntensity(0.5);
      assert.strictEqual(r, undefined);
    });
  });

  suite('leaveWorld — safety when no localPlayer', function() {
    test('does not throw when stubs are empty (no Protocol.create.leave)', function() {
      // With empty stubs, Protocol is {} so Protocol.create is undefined;
      // leaveWorld guards with "if (!Protocol || !Network || !localPlayer) return"
      assert.doesNotThrow(function() { Main.leaveWorld(); });
    });

    test('returns undefined', function() {
      var r = Main.leaveWorld();
      assert.strictEqual(r, undefined);
    });
  });

  suite('joinWorld — behaviour with stub dependencies', function() {
    // joinWorld guards "if (!Protocol || !Network) return" but Protocol stub is {}
    // (truthy), so it proceeds and throws accessing Protocol.create.join.
    // This documents the real observable behaviour: joinWorld requires Protocol
    // to have a functional .create.join method — a pure empty stub is insufficient.

    test('throws when Protocol stub has no create.join method', function() {
      // We expect a TypeError accessing undefined.join on the empty stub
      assert.throws(function() {
        Main.joinWorld();
      }, function(err) {
        return err instanceof TypeError;
      });
    });

    test('error message references "join" or property access', function() {
      var caught = null;
      try { Main.joinWorld(); } catch(e) { caught = e; }
      assert.ok(caught !== null, 'Expected an error to be thrown');
      assert.ok(
        caught.message.indexOf('join') !== -1 || caught.message.indexOf('undefined') !== -1,
        'Unexpected error message: ' + caught.message
      );
    });
  });

  suite('handleLocalAction — safety with various inputs', function() {
    test('does not throw with (undefined, undefined)', function() {
      assert.doesNotThrow(function() { Main.handleLocalAction(undefined, undefined); });
    });

    test('does not throw with (null, null)', function() {
      assert.doesNotThrow(function() { Main.handleLocalAction(null, null); });
    });

    test('does not throw with unknown action type', function() {
      // Should fall through the switch with no match and do nothing
      assert.doesNotThrow(function() { Main.handleLocalAction('unknown_action_xyz', {}); });
    });

    test('does not throw with empty string type', function() {
      assert.doesNotThrow(function() { Main.handleLocalAction('', {}); });
    });

    test('returns undefined for unknown action type', function() {
      var r = Main.handleLocalAction('totally_unknown', {});
      assert.strictEqual(r, undefined);
    });
  });

  // ── 4f. init — called with stub environment ──────────────────────────────────

  suite('init — async function contracts', function() {
    test('init is an async function (returns a Promise or thenable)', function() {
      // An async function always returns a Promise when invoked
      var result = Main.init();
      assert.ok(result !== null && typeof result === 'object' && typeof result.then === 'function',
        'init() should return a Promise');
      // Swallow the rejection/resolution so it doesn't cause unhandled rejection
      result.then(function() {}).catch(function() {});
    });

    test('init resolves without throwing synchronously', function() {
      // The synchronous part of init must not throw even with minimal stubs
      var threw = false;
      try {
        var p = Main.init();
        if (p && typeof p.catch === 'function') p.catch(function() {});
      } catch(e) {
        threw = true;
      }
      assert.strictEqual(threw, false);
    });
  });

} // end if (Main)

// ─── 5. REPORT ──────────────────────────────────────────────────────────────

var success = report();
process.exit(success ? 0 : 1);
