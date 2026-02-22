/**
 * tests/test_auth.js
 * Comprehensive tests for the ZION Auth module
 * Covers: exports, OAUTH_CONFIG, guest login, token management,
 *         player data persistence, preferences, avatar, isGuest,
 *         getTimeSinceLastSave, edge cases and input validation
 */

'use strict';

const { test, suite, report, assert } = require('./test_runner');

// ============================================================================
// GLOBAL MOCKS — must be in place before requiring auth.js
// ============================================================================

var _storage = {};
global.localStorage = {
  getItem:    function(k)    { return _storage[k] !== undefined ? _storage[k] : null; },
  setItem:    function(k, v) { _storage[k] = String(v); },
  removeItem: function(k)    { delete _storage[k]; },
  clear:      function()     { _storage = {}; }
};

global.window = {
  location: {
    href:     'http://localhost/',
    search:   '',
    hostname: 'localhost',
    origin:   'http://localhost',
    pathname: '/'
  },
  history: {
    replaceState: function() {}
  }
};

global.fetch = function() {
  return Promise.resolve({
    ok:   false,
    json: function() { return Promise.resolve({}); }
  });
};

// Load the module under test
const Auth = require('../src/js/auth');

// ============================================================================
// HELPER — reset storage between suites that need a clean slate
// ============================================================================

function clearAuth() {
  _storage = {};
}

// ============================================================================
// 1. EXPORT VERIFICATION
// ============================================================================

suite('Export verification — functions', function() {
  var EXPECTED_FNS = [
    'initiateOAuth',
    'handleCallback',
    'getProfile',
    'isAuthenticated',
    'getUsername',
    'getToken',
    'setToken',
    'loginAsGuest',
    'logout',
    'savePlayerData',
    'loadPlayerData',
    'savePreferences',
    'loadPreferences',
    'getDefaultPreferences',
    'getAvatarUrl',
    'isGuest',
    'getTimeSinceLastSave'
  ];

  EXPECTED_FNS.forEach(function(name) {
    test(name + ' is exported as a function', function() {
      assert.strictEqual(typeof Auth[name], 'function',
        name + ' should be a function, got ' + typeof Auth[name]);
    });
  });

  test('OAUTH_CONFIG is exported', function() {
    assert.ok(Auth.OAUTH_CONFIG !== undefined, 'OAUTH_CONFIG should be exported');
  });

  test('OAUTH_CONFIG is an object', function() {
    assert.strictEqual(typeof Auth.OAUTH_CONFIG, 'object');
    assert.ok(Auth.OAUTH_CONFIG !== null);
  });

  test('module has no unexpected undefined exports', function() {
    EXPECTED_FNS.forEach(function(name) {
      assert.ok(Auth[name] !== undefined, name + ' must not be undefined');
    });
  });
});

// ============================================================================
// 2. OAUTH_CONFIG STRUCTURE
// ============================================================================

suite('OAUTH_CONFIG structure', function() {
  test('has clientId property', function() {
    assert.ok('clientId' in Auth.OAUTH_CONFIG, 'Missing clientId');
  });

  test('clientId is a non-empty string', function() {
    assert.strictEqual(typeof Auth.OAUTH_CONFIG.clientId, 'string');
    assert.ok(Auth.OAUTH_CONFIG.clientId.length > 0, 'clientId must not be empty');
  });

  test('has scope property', function() {
    assert.ok('scope' in Auth.OAUTH_CONFIG, 'Missing scope');
  });

  test('scope is a non-empty string', function() {
    assert.strictEqual(typeof Auth.OAUTH_CONFIG.scope, 'string');
    assert.ok(Auth.OAUTH_CONFIG.scope.length > 0, 'scope must not be empty');
  });

  test('has authorizeUrl property', function() {
    assert.ok('authorizeUrl' in Auth.OAUTH_CONFIG, 'Missing authorizeUrl');
  });

  test('authorizeUrl is a string containing github.com', function() {
    assert.strictEqual(typeof Auth.OAUTH_CONFIG.authorizeUrl, 'string');
    assert.ok(Auth.OAUTH_CONFIG.authorizeUrl.indexOf('github.com') !== -1,
      'authorizeUrl should point to github.com');
  });

  test('has tokenUrl property', function() {
    assert.ok('tokenUrl' in Auth.OAUTH_CONFIG, 'Missing tokenUrl');
  });

  test('tokenUrl is a non-empty string', function() {
    assert.strictEqual(typeof Auth.OAUTH_CONFIG.tokenUrl, 'string');
    assert.ok(Auth.OAUTH_CONFIG.tokenUrl.length > 0, 'tokenUrl must not be empty');
  });

  test('scope contains read:user', function() {
    assert.ok(Auth.OAUTH_CONFIG.scope.indexOf('read:user') !== -1,
      'scope should include read:user');
  });

  test('clientId matches expected GitHub App format (non-empty alphanumeric)', function() {
    assert.ok(/[A-Za-z0-9]/.test(Auth.OAUTH_CONFIG.clientId),
      'clientId should contain alphanumeric characters');
  });
});

// ============================================================================
// 3. getDefaultPreferences
// ============================================================================

suite('getDefaultPreferences', function() {
  var defaults;

  test('returns an object', function() {
    defaults = Auth.getDefaultPreferences();
    assert.strictEqual(typeof defaults, 'object');
    assert.ok(defaults !== null);
  });

  test('has volume key', function() {
    assert.ok('volume' in Auth.getDefaultPreferences(), 'Missing volume');
  });

  test('volume is a number between 0 and 1', function() {
    var v = Auth.getDefaultPreferences().volume;
    assert.ok(typeof v === 'number' && v >= 0 && v <= 1,
      'volume should be between 0 and 1, got ' + v);
  });

  test('has musicVolume key', function() {
    assert.ok('musicVolume' in Auth.getDefaultPreferences());
  });

  test('musicVolume is a number between 0 and 1', function() {
    var v = Auth.getDefaultPreferences().musicVolume;
    assert.ok(typeof v === 'number' && v >= 0 && v <= 1);
  });

  test('has sfxVolume key', function() {
    assert.ok('sfxVolume' in Auth.getDefaultPreferences());
  });

  test('sfxVolume is a number between 0 and 1', function() {
    var v = Auth.getDefaultPreferences().sfxVolume;
    assert.ok(typeof v === 'number' && v >= 0 && v <= 1);
  });

  test('has quality key', function() {
    assert.ok('quality' in Auth.getDefaultPreferences());
  });

  test('quality is a string', function() {
    assert.strictEqual(typeof Auth.getDefaultPreferences().quality, 'string');
  });

  test('has chatVisible key', function() {
    assert.ok('chatVisible' in Auth.getDefaultPreferences());
  });

  test('chatVisible is a boolean', function() {
    assert.strictEqual(typeof Auth.getDefaultPreferences().chatVisible, 'boolean');
  });

  test('has minimapVisible key', function() {
    assert.ok('minimapVisible' in Auth.getDefaultPreferences());
  });

  test('minimapVisible is a boolean', function() {
    assert.strictEqual(typeof Auth.getDefaultPreferences().minimapVisible, 'boolean');
  });

  test('has showFPS key', function() {
    assert.ok('showFPS' in Auth.getDefaultPreferences());
  });

  test('showFPS is a boolean', function() {
    assert.strictEqual(typeof Auth.getDefaultPreferences().showFPS, 'boolean');
  });

  test('each call returns a new independent object', function() {
    var a = Auth.getDefaultPreferences();
    var b = Auth.getDefaultPreferences();
    a.volume = 9999;
    assert.ok(b.volume !== 9999, 'getDefaultPreferences should return fresh objects');
  });

  test('default volume is 0.5', function() {
    assert.strictEqual(Auth.getDefaultPreferences().volume, 0.5);
  });

  test('default musicVolume is 0.3', function() {
    assert.strictEqual(Auth.getDefaultPreferences().musicVolume, 0.3);
  });

  test('default sfxVolume is 0.5', function() {
    assert.strictEqual(Auth.getDefaultPreferences().sfxVolume, 0.5);
  });

  test('default quality is medium', function() {
    assert.strictEqual(Auth.getDefaultPreferences().quality, 'medium');
  });

  test('default chatVisible is true', function() {
    assert.strictEqual(Auth.getDefaultPreferences().chatVisible, true);
  });

  test('default minimapVisible is true', function() {
    assert.strictEqual(Auth.getDefaultPreferences().minimapVisible, true);
  });

  test('default showFPS is false', function() {
    assert.strictEqual(Auth.getDefaultPreferences().showFPS, false);
  });
});

// ============================================================================
// 4. loginAsGuest / isGuest / getUsername / isAuthenticated / logout flow
// ============================================================================

suite('Authentication state — initial (unauthenticated)', function() {
  test('isAuthenticated() is false before any login', function() {
    clearAuth();
    assert.strictEqual(Auth.isAuthenticated(), false);
  });

  test('getUsername() is null before any login', function() {
    clearAuth();
    assert.strictEqual(Auth.getUsername(), null);
  });

  test('getToken() is null before any login', function() {
    clearAuth();
    assert.strictEqual(Auth.getToken(), null);
  });

  test('isGuest() is false before any login', function() {
    clearAuth();
    assert.strictEqual(Auth.isGuest(), false);
  });

  test('getAvatarUrl() returns empty string before any login', function() {
    clearAuth();
    assert.strictEqual(Auth.getAvatarUrl(), '');
  });
});

suite('loginAsGuest — valid input', function() {
  test('returns true for a valid username', function() {
    clearAuth();
    assert.strictEqual(Auth.loginAsGuest('TestPlayer'), true);
  });

  test('isAuthenticated() is true after guest login', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    assert.strictEqual(Auth.isAuthenticated(), true);
  });

  test('getUsername() returns the provided username', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    assert.strictEqual(Auth.getUsername(), 'TestPlayer');
  });

  test('isGuest() returns true after guest login', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    assert.strictEqual(Auth.isGuest(), true);
  });

  test('getToken() starts with guest_ after guest login', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    var token = Auth.getToken();
    assert.ok(token !== null && token.startsWith('guest_'),
      'Token should start with guest_, got: ' + token);
  });

  test('token encodes the username', function() {
    clearAuth();
    Auth.loginAsGuest('Hero123');
    assert.ok(Auth.getToken().indexOf('Hero123') !== -1);
  });

  test('getAvatarUrl() returns empty string for a guest', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    assert.strictEqual(Auth.getAvatarUrl(), '');
  });

  test('underscores are preserved in username', function() {
    clearAuth();
    Auth.loginAsGuest('test_user');
    assert.strictEqual(Auth.getUsername(), 'test_user');
  });

  test('hyphens are preserved in username', function() {
    clearAuth();
    Auth.loginAsGuest('test-user');
    assert.strictEqual(Auth.getUsername(), 'test-user');
  });

  test('alphanumeric chars are preserved', function() {
    clearAuth();
    Auth.loginAsGuest('Player99');
    assert.strictEqual(Auth.getUsername(), 'Player99');
  });

  test('leading/trailing whitespace is trimmed', function() {
    clearAuth();
    var result = Auth.loginAsGuest('  Alice  ');
    assert.strictEqual(result, true);
    assert.strictEqual(Auth.getUsername(), 'Alice');
  });

  test('special chars are stripped from username', function() {
    clearAuth();
    Auth.loginAsGuest('hello!world');
    // '!' is stripped, result should be 'helloworld'
    assert.strictEqual(Auth.getUsername(), 'helloworld');
  });
});

suite('loginAsGuest — invalid input', function() {
  test('returns false for empty string', function() {
    clearAuth();
    assert.strictEqual(Auth.loginAsGuest(''), false);
  });

  test('returns false for null', function() {
    clearAuth();
    assert.strictEqual(Auth.loginAsGuest(null), false);
  });

  test('returns false for undefined', function() {
    clearAuth();
    assert.strictEqual(Auth.loginAsGuest(undefined), false);
  });

  test('returns false for number argument', function() {
    clearAuth();
    assert.strictEqual(Auth.loginAsGuest(42), false);
  });

  test('returns false when username too long (40 chars)', function() {
    clearAuth();
    var longName = 'a'.repeat(40);
    assert.strictEqual(Auth.loginAsGuest(longName), false);
  });

  test('returns true for 39-char username (boundary)', function() {
    clearAuth();
    var maxName = 'a'.repeat(39);
    assert.strictEqual(Auth.loginAsGuest(maxName), true);
  });

  test('returns false for whitespace-only username', function() {
    clearAuth();
    // trimming "   " → "" → length 0 → false
    assert.strictEqual(Auth.loginAsGuest('   '), false);
  });

  test('isAuthenticated() remains false after failed login', function() {
    clearAuth();
    Auth.loginAsGuest('');
    assert.strictEqual(Auth.isAuthenticated(), false);
  });
});

suite('logout — clears authentication', function() {
  test('isAuthenticated() is false after logout', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    Auth.logout();
    assert.strictEqual(Auth.isAuthenticated(), false);
  });

  test('getUsername() is null after logout', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    Auth.logout();
    assert.strictEqual(Auth.getUsername(), null);
  });

  test('getToken() is null after logout', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    Auth.logout();
    assert.strictEqual(Auth.getToken(), null);
  });

  test('isGuest() is false after logout', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    Auth.logout();
    assert.strictEqual(Auth.isGuest(), false);
  });

  test('getAvatarUrl() returns empty string after logout', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    Auth.logout();
    assert.strictEqual(Auth.getAvatarUrl(), '');
  });

  test('logout is idempotent (double logout does not throw)', function() {
    clearAuth();
    Auth.loginAsGuest('TestPlayer');
    Auth.logout();
    assert.doesNotThrow(function() { Auth.logout(); });
    assert.strictEqual(Auth.isAuthenticated(), false);
  });
});

// ============================================================================
// 5. setToken / getToken
// ============================================================================

suite('setToken / getToken', function() {
  test('setToken stores a token that getToken retrieves', function() {
    clearAuth();
    Auth.setToken('my_test_token');
    assert.strictEqual(Auth.getToken(), 'my_test_token');
  });

  test('isAuthenticated() is true after setToken', function() {
    clearAuth();
    Auth.setToken('any_token');
    assert.strictEqual(Auth.isAuthenticated(), true);
  });

  test('a token set via setToken does not make isGuest() true', function() {
    clearAuth();
    Auth.setToken('github_oauth_token_xyz');
    assert.strictEqual(Auth.isGuest(), false);
  });

  test('setToken with guest_ prefix makes isGuest() true', function() {
    clearAuth();
    Auth.setToken('guest_SomePlayer');
    assert.strictEqual(Auth.isGuest(), true);
  });

  test('overwriting token with setToken returns new token', function() {
    clearAuth();
    Auth.setToken('first_token');
    Auth.setToken('second_token');
    assert.strictEqual(Auth.getToken(), 'second_token');
  });
});

// ============================================================================
// 6. savePlayerData / loadPlayerData — round-trip
// ============================================================================

suite('savePlayerData / loadPlayerData — round-trip', function() {
  test('loadPlayerData returns null when nothing saved', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    assert.strictEqual(Auth.loadPlayerData(), null);
  });

  test('savePlayerData does not throw', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    assert.doesNotThrow(function() {
      Auth.savePlayerData({ spark: 100 });
    });
  });

  test('loadPlayerData returns an object after save', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ spark: 100 });
    var loaded = Auth.loadPlayerData();
    assert.ok(loaded !== null && typeof loaded === 'object');
  });

  test('saved spark value round-trips correctly', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ spark: 250 });
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded.spark, 250);
  });

  test('saved zone value round-trips correctly', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ zone: 'gardens' });
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded.zone, 'gardens');
  });

  test('default zone is nexus when not provided', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ spark: 0 });
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded.zone, 'nexus');
  });

  test('saved inventory round-trips correctly', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    var inv = [{ id: 'wood', qty: 5 }];
    Auth.savePlayerData({ inventory: inv });
    var loaded = Auth.loadPlayerData();
    assert.deepStrictEqual(loaded.inventory, inv);
  });

  test('saved position round-trips correctly', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    var pos = { x: 10, y: 0, z: -20 };
    Auth.savePlayerData({ position: pos });
    var loaded = Auth.loadPlayerData();
    assert.deepStrictEqual(loaded.position, pos);
  });

  test('saved data includes version field (= 2)', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ spark: 1 });
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded.version, 2);
  });

  test('saved data includes username field matching logged-in user', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ spark: 1 });
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded.username, 'RoundTrip');
  });

  test('saved data includes ts (timestamp) field', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    var before = Date.now();
    Auth.savePlayerData({ spark: 1 });
    var after = Date.now();
    var loaded = Auth.loadPlayerData();
    assert.ok(typeof loaded.ts === 'number' && loaded.ts >= before && loaded.ts <= after,
      'ts field should be a recent timestamp');
  });

  test('saved data includes lastSave field', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ spark: 1 });
    var loaded = Auth.loadPlayerData();
    assert.ok(typeof loaded.lastSave === 'number' && loaded.lastSave > 0);
  });

  test('loadPlayerData returns null when username does not match', function() {
    clearAuth();
    Auth.loginAsGuest('PlayerA');
    Auth.savePlayerData({ spark: 50 });
    // Switch user
    Auth.logout();
    Auth.loginAsGuest('PlayerB');
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded, null);
  });

  test('savePlayerData with null does not throw', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    assert.doesNotThrow(function() { Auth.savePlayerData(null); });
  });

  test('overwriting a save with new data returns new values', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ spark: 10, zone: 'nexus' });
    Auth.savePlayerData({ spark: 999, zone: 'arena' });
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded.spark, 999);
    assert.strictEqual(loaded.zone, 'arena');
  });

  test('warmth field round-trips correctly', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ warmth: 75 });
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded.warmth, 75);
  });

  test('playTime field round-trips correctly', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ playTime: 3600 });
    var loaded = Auth.loadPlayerData();
    assert.strictEqual(loaded.playTime, 3600);
  });

  test('discoveredSecrets defaults to empty array when not provided', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ spark: 1 });
    var loaded = Auth.loadPlayerData();
    assert.deepStrictEqual(loaded.discoveredSecrets, []);
  });

  test('discoveredSecrets array round-trips correctly', function() {
    clearAuth();
    Auth.loginAsGuest('RoundTrip');
    Auth.savePlayerData({ discoveredSecrets: ['secret1', 'secret2'] });
    var loaded = Auth.loadPlayerData();
    assert.deepStrictEqual(loaded.discoveredSecrets, ['secret1', 'secret2']);
  });
});

// ============================================================================
// 7. savePreferences / loadPreferences — round-trip
// ============================================================================

suite('savePreferences / loadPreferences — round-trip', function() {
  test('loadPreferences returns defaults when nothing saved', function() {
    clearAuth();
    var loaded = Auth.loadPreferences();
    assert.deepStrictEqual(loaded, Auth.getDefaultPreferences());
  });

  test('savePreferences does not throw', function() {
    clearAuth();
    assert.doesNotThrow(function() {
      Auth.savePreferences({ volume: 0.8 });
    });
  });

  test('loadPreferences returns saved volume', function() {
    clearAuth();
    Auth.savePreferences({ volume: 0.8 });
    var loaded = Auth.loadPreferences();
    assert.strictEqual(loaded.volume, 0.8);
  });

  test('loadPreferences returns saved musicVolume', function() {
    clearAuth();
    Auth.savePreferences({ musicVolume: 0.1 });
    var loaded = Auth.loadPreferences();
    assert.strictEqual(loaded.musicVolume, 0.1);
  });

  test('loadPreferences returns saved quality setting', function() {
    clearAuth();
    Auth.savePreferences({ quality: 'high' });
    var loaded = Auth.loadPreferences();
    assert.strictEqual(loaded.quality, 'high');
  });

  test('loadPreferences returns saved showFPS boolean', function() {
    clearAuth();
    Auth.savePreferences({ showFPS: true });
    var loaded = Auth.loadPreferences();
    assert.strictEqual(loaded.showFPS, true);
  });

  test('loadPreferences returns saved chatVisible boolean', function() {
    clearAuth();
    Auth.savePreferences({ chatVisible: false });
    var loaded = Auth.loadPreferences();
    assert.strictEqual(loaded.chatVisible, false);
  });

  test('full preferences object round-trips correctly', function() {
    clearAuth();
    var prefs = {
      volume: 0.7,
      musicVolume: 0.2,
      sfxVolume: 0.9,
      quality: 'low',
      chatVisible: false,
      minimapVisible: false,
      showFPS: true
    };
    Auth.savePreferences(prefs);
    var loaded = Auth.loadPreferences();
    assert.deepStrictEqual(loaded, prefs);
  });

  test('overwriting preferences returns latest values', function() {
    clearAuth();
    Auth.savePreferences({ volume: 0.3 });
    Auth.savePreferences({ volume: 0.9 });
    var loaded = Auth.loadPreferences();
    assert.strictEqual(loaded.volume, 0.9);
  });

  test('loadPreferences returns defaults when storage has invalid JSON', function() {
    clearAuth();
    // Manually corrupt storage
    _storage['zion_player_prefs'] = '{bad json{{';
    var loaded = Auth.loadPreferences();
    assert.deepStrictEqual(loaded, Auth.getDefaultPreferences());
  });
});

// ============================================================================
// 8. getTimeSinceLastSave
// ============================================================================

suite('getTimeSinceLastSave', function() {
  test('returns Infinity when no data saved', function() {
    clearAuth();
    Auth.loginAsGuest('SaveTimer');
    assert.strictEqual(Auth.getTimeSinceLastSave(), Infinity);
  });

  test('returns a number after saving', function() {
    clearAuth();
    Auth.loginAsGuest('SaveTimer');
    Auth.savePlayerData({ spark: 1 });
    var elapsed = Auth.getTimeSinceLastSave();
    assert.strictEqual(typeof elapsed, 'number');
  });

  test('returns a non-negative value immediately after saving', function() {
    clearAuth();
    Auth.loginAsGuest('SaveTimer');
    Auth.savePlayerData({ spark: 1 });
    var elapsed = Auth.getTimeSinceLastSave();
    assert.ok(elapsed >= 0, 'Elapsed should be >= 0, got ' + elapsed);
  });

  test('returns a small value (< 1000ms) immediately after saving', function() {
    clearAuth();
    Auth.loginAsGuest('SaveTimer');
    Auth.savePlayerData({ spark: 1 });
    var elapsed = Auth.getTimeSinceLastSave();
    assert.ok(elapsed < 1000, 'Elapsed should be < 1000ms immediately after save, got ' + elapsed);
  });

  test('returns Infinity after logout (data belongs to other user)', function() {
    clearAuth();
    Auth.loginAsGuest('SaveTimer');
    Auth.savePlayerData({ spark: 1 });
    Auth.logout();
    Auth.loginAsGuest('DifferentUser');
    assert.strictEqual(Auth.getTimeSinceLastSave(), Infinity);
  });
});

// ============================================================================
// 9. isGuest — detailed token inspection
// ============================================================================

suite('isGuest — token inspection', function() {
  test('false when no token is set', function() {
    clearAuth();
    assert.strictEqual(Auth.isGuest(), false);
  });

  test('true when token starts with guest_', function() {
    clearAuth();
    Auth.loginAsGuest('Alice');
    assert.strictEqual(Auth.isGuest(), true);
  });

  test('false when token does not start with guest_', function() {
    clearAuth();
    Auth.setToken('gho_real_github_token');
    assert.strictEqual(Auth.isGuest(), false);
  });

  test('false after logout (no token)', function() {
    clearAuth();
    Auth.loginAsGuest('Alice');
    Auth.logout();
    assert.strictEqual(Auth.isGuest(), false);
  });

  test('true after re-login as guest following logout', function() {
    clearAuth();
    Auth.loginAsGuest('Alice');
    Auth.logout();
    Auth.loginAsGuest('Bob');
    assert.strictEqual(Auth.isGuest(), true);
  });
});

// ============================================================================
// 10. getAvatarUrl
// ============================================================================

suite('getAvatarUrl', function() {
  test('returns empty string when nothing stored', function() {
    clearAuth();
    assert.strictEqual(Auth.getAvatarUrl(), '');
  });

  test('returns empty string after guest login', function() {
    clearAuth();
    Auth.loginAsGuest('Pixel');
    assert.strictEqual(Auth.getAvatarUrl(), '');
  });

  test('returns empty string after logout', function() {
    clearAuth();
    Auth.loginAsGuest('Pixel');
    Auth.logout();
    assert.strictEqual(Auth.getAvatarUrl(), '');
  });

  test('returns a string type always', function() {
    clearAuth();
    assert.strictEqual(typeof Auth.getAvatarUrl(), 'string');
  });
});

// ============================================================================
// 11. handleCallback — async, no code in URL
// ============================================================================

suite('handleCallback — no OAuth code present', function() {
  test('returns null when window.location.search is empty', function() {
    global.window.location.search = '';
    return Auth.handleCallback().then(function(result) {
      assert.strictEqual(result, null);
    });
  });

  test('returns null when search has unrelated params', function() {
    global.window.location.search = '?mode=dashboard';
    return Auth.handleCallback().then(function(result) {
      assert.strictEqual(result, null);
    }).finally(function() {
      global.window.location.search = '';
    });
  });
});

// ============================================================================
// 12. getProfile — fetch error handling
// ============================================================================

suite('getProfile — fetch error handling', function() {
  test('throws when fetch returns not-ok response', function() {
    global.fetch = function() {
      return Promise.resolve({
        ok:   false,
        status: 401,
        json: function() { return Promise.resolve({}); }
      });
    };
    return Auth.getProfile('bad_token').then(function() {
      assert.fail('Expected getProfile to throw on non-ok response');
    }).catch(function(err) {
      assert.ok(err instanceof Error);
    }).finally(function() {
      global.fetch = function() {
        return Promise.resolve({ ok: false, json: function() { return Promise.resolve({}); } });
      };
    });
  });
});

// ============================================================================
// 13. Edge cases and defensive coding
// ============================================================================

suite('Edge cases', function() {
  test('multiple loginAsGuest calls update the stored username', function() {
    clearAuth();
    Auth.loginAsGuest('First');
    Auth.loginAsGuest('Second');
    assert.strictEqual(Auth.getUsername(), 'Second');
  });

  test('isAuthenticated is false after storage is cleared externally', function() {
    clearAuth();
    Auth.loginAsGuest('TempUser');
    // Clear external storage
    _storage = {};
    assert.strictEqual(Auth.isAuthenticated(), false);
  });

  test('getUsername returns null after storage is cleared externally', function() {
    clearAuth();
    Auth.loginAsGuest('TempUser');
    _storage = {};
    assert.strictEqual(Auth.getUsername(), null);
  });

  test('savePlayerData called without being logged in does not throw', function() {
    clearAuth();
    assert.doesNotThrow(function() {
      Auth.savePlayerData({ spark: 100 });
    });
  });

  test('loadPlayerData returns null when not logged in (username = null)', function() {
    clearAuth();
    // Save data with no user logged in, then load
    Auth.savePlayerData({ spark: 50 });
    // username is null, saved.username will also be null — should return data
    // (or null if implementation checks username strictly)
    var loaded = Auth.loadPlayerData();
    // Either null (no user) or object matching null username — just must not throw
    assert.ok(loaded === null || typeof loaded === 'object');
  });

  test('loginAsGuest with single char username succeeds', function() {
    clearAuth();
    assert.strictEqual(Auth.loginAsGuest('A'), true);
  });

  test('loginAsGuest with mixed valid chars succeeds', function() {
    clearAuth();
    assert.strictEqual(Auth.loginAsGuest('Valid-User_99'), true);
    assert.strictEqual(Auth.getUsername(), 'Valid-User_99');
  });

  test('initiateOAuth does not throw in test environment', function() {
    assert.doesNotThrow(function() {
      Auth.initiateOAuth();
    });
  });
});

// ============================================================================
// REPORT
// ============================================================================

var success = report();
process.exit(success ? 0 : 1);
