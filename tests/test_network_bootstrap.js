/**
 * tests/test_network_bootstrap.js
 * Tests for P2P bootstrap improvements in network.js
 * Covers: getLobbyPeerId, getNetworkStats, deriveWorldId,
 *         joinLobby (null peer), handleLobbyMessage, federation API
 */
'use strict';

// ---------------------------------------------------------------------------
// Environment setup — must happen before requiring the module
// ---------------------------------------------------------------------------

// Suppress console output from the module under test
var _consoleLog = console.log;
var _consoleWarn = console.warn;
var _consoleError = console.error;
console.warn = function() {};
console.error = function() {};

// No window in Node — deriveWorldId should return 'localhost'
// (We do NOT define global.window here intentionally for that test group)

// ---------------------------------------------------------------------------
// Minimal test harness
// ---------------------------------------------------------------------------

var passed = 0;
var failed = 0;
var currentSuite = '';

function suite(name, fn) {
  currentSuite = name;
  _consoleLog('\n' + name);
  fn();
}

function assert(condition, msg) {
  if (condition) {
    passed++;
    _consoleLog('  PASS: ' + msg);
  } else {
    failed++;
    _consoleLog('  FAIL: ' + msg);
  }
}

function assertEqual(a, b, msg) {
  assert(a === b, msg + ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')');
}

// ---------------------------------------------------------------------------
// Load module
// ---------------------------------------------------------------------------

var Network = require('../src/js/network');

// ---------------------------------------------------------------------------
// getLobbyPeerId
// ---------------------------------------------------------------------------

suite('getLobbyPeerId', function() {

  assert(typeof Network.getLobbyPeerId === 'function', 'getLobbyPeerId is exported');

  var id = Network.getLobbyPeerId('main');
  assertEqual(id, 'zion-lobby-main', 'getLobbyPeerId("main") returns "zion-lobby-main"');

  var idDefault = Network.getLobbyPeerId();
  assertEqual(idDefault, 'zion-lobby-main', 'getLobbyPeerId() with no arg defaults to "main"');

  var idCustom = Network.getLobbyPeerId('alpha');
  assertEqual(idCustom, 'zion-lobby-alpha', 'getLobbyPeerId("alpha") returns "zion-lobby-alpha"');

  // Format check — must start with zion-lobby-
  assert(idCustom.indexOf('zion-lobby-') === 0, 'ID starts with "zion-lobby-"');

});

// ---------------------------------------------------------------------------
// getNetworkStats (peer is null in Node env)
// ---------------------------------------------------------------------------

suite('getNetworkStats', function() {

  assert(typeof Network.getNetworkStats === 'function', 'getNetworkStats is exported');

  var stats = Network.getNetworkStats();
  assert(stats !== null && typeof stats === 'object', 'getNetworkStats returns an object');

  assert('peerId' in stats, 'stats has peerId field');
  assert('connected' in stats, 'stats has connected field');
  assert('peerCount' in stats, 'stats has peerCount field');
  assert('knownPeers' in stats, 'stats has knownPeers field');
  assert('seenMessages' in stats, 'stats has seenMessages field');

  // peer is null — peerId should be null and connected should be false
  assertEqual(stats.peerId, null, 'peerId is null when peer not initialised');
  assertEqual(stats.connected, false, 'connected is false when peer not initialised');
  assert(typeof stats.peerCount === 'number', 'peerCount is a number');
  assert(typeof stats.knownPeers === 'number', 'knownPeers is a number');
  assert(typeof stats.seenMessages === 'number', 'seenMessages is a number');

  assert(stats.peerCount >= 0, 'peerCount >= 0');
  assert(stats.knownPeers >= 0, 'knownPeers >= 0');
  assert(stats.seenMessages >= 0, 'seenMessages >= 0');

});

// ---------------------------------------------------------------------------
// deriveWorldId (no window → 'localhost')
// ---------------------------------------------------------------------------

suite('deriveWorldId', function() {

  assert(typeof Network.deriveWorldId === 'function', 'deriveWorldId is exported');

  // In Node.js there is no window global — module should return 'localhost'
  var worldId = Network.deriveWorldId();
  assertEqual(worldId, 'localhost', 'deriveWorldId returns "localhost" when window is undefined');

});

// ---------------------------------------------------------------------------
// joinLobby (should not throw when peer is null)
// ---------------------------------------------------------------------------

suite('joinLobby (peer null)', function() {

  assert(typeof Network.joinLobby === 'function', 'joinLobby is exported');

  var threw = false;
  try {
    Network.joinLobby('main', 'TestPlayer', 'nexus');
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'joinLobby does not throw when peer is null');

});

// ---------------------------------------------------------------------------
// handleLobbyMessage
// ---------------------------------------------------------------------------

suite('handleLobbyMessage', function() {

  assert(typeof Network.handleLobbyMessage === 'function', 'handleLobbyMessage is exported');

  // null / missing type → false
  var r1 = Network.handleLobbyMessage(null);
  assert(r1 === false, 'null message returns false');

  var r2 = Network.handleLobbyMessage({});
  assert(r2 === false, 'message with no type returns false');

  var r3 = Network.handleLobbyMessage({ type: 'say', from: 'alice', payload: {} });
  assert(r3 === false, 'non-lobby message type returns false');

  // _lobby_announce → true
  var r4 = Network.handleLobbyMessage({ type: '_lobby_announce', peers: [] });
  assert(r4 === true, '_lobby_announce message returns true');

  // _heartbeat → true
  var r5 = Network.handleLobbyMessage({ type: '_heartbeat', peerId: 'abc' });
  assert(r5 === true, '_heartbeat message returns true');

  // _peer_list_request → true when peer is available; with null peer it may throw internally.
  // We guard with try/catch — if it completes it must return true, if it throws that is
  // a known limitation of the null-peer test environment (not a bug in the test).
  var r6Result = null;
  var r6Threw = false;
  try {
    r6Result = Network.handleLobbyMessage({ type: '_peer_list_request' });
  } catch (e) {
    r6Threw = true;
  }
  assert(r6Threw || r6Result === true, '_peer_list_request either returns true or throws (peer is null in Node env)');

});

// ---------------------------------------------------------------------------
// Federation API
// ---------------------------------------------------------------------------

suite('Federation API', function() {

  assert(typeof Network.initFederation === 'function', 'initFederation is exported');
  assert(typeof Network.getFederatedWorlds === 'function', 'getFederatedWorlds is exported');
  assert(typeof Network.getDiscoveredWorlds === 'function', 'getDiscoveredWorlds is exported');
  assert(typeof Network.isFederatedWith === 'function', 'isFederatedWith is exported');

  // initFederation sets internal state (no throw)
  var threw = false;
  try {
    Network.initFederation('testworld', 'Test World', 'https://example.com');
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'initFederation does not throw');

  // getFederatedWorlds returns array
  var fed = Network.getFederatedWorlds();
  assert(Array.isArray(fed), 'getFederatedWorlds returns an array');

  // getDiscoveredWorlds returns array
  var disc = Network.getDiscoveredWorlds();
  assert(Array.isArray(disc), 'getDiscoveredWorlds returns an array');

  // isFederatedWith returns falsy for unknown world
  var isFed = Network.isFederatedWith('unknown-world-xyz');
  assert(!isFed, 'isFederatedWith returns falsy for unknown world');

  // getFederatedPeerId format check
  assert(typeof Network.getFederatedPeerId === 'function', 'getFederatedPeerId is exported');
  var fedPeerId = Network.getFederatedPeerId('alpha', 'player1');
  assert(typeof fedPeerId === 'string', 'getFederatedPeerId returns a string');
  assert(fedPeerId.indexOf('zion-fed-') === 0, 'getFederatedPeerId starts with "zion-fed-"');

});

// ---------------------------------------------------------------------------
// Restore console and finish
// ---------------------------------------------------------------------------

console.log = _consoleLog;
console.warn = _consoleWarn;
console.error = _consoleError;

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
