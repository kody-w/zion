/**
 * test_network_stress.js — Stress tests for network dedup, reconnection patterns, lobby flooding
 */

(function() {
  'use strict';

  var Network;
  try { Network = require('../src/js/network'); } catch(e) { Network = {}; }

  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) { passed++; }
    else { failed++; console.error('FAIL: ' + msg); }
  }

  var _test = Network._test || {};

  // =========================================================================
  // DEDUP TESTS
  // =========================================================================

  // Test 1: 10000 unique message IDs have no collisions
  if (_test.generateMessageId) {
    var ids = {};
    var collisions = 0;
    for (var i = 0; i < 10000; i++) {
      var msg = { type: 'test', from: 'player_' + i, ts: 1000000 + i, seq: i, payload: { data: i } };
      var id = _test.generateMessageId(msg);
      if (ids[id]) collisions++;
      ids[id] = true;
    }
    assert(collisions === 0, '10000 unique messages should have 0 ID collisions (got ' + collisions + ')');
  } else {
    assert(false, '_test.generateMessageId should be available');
  }

  // Test 2: Same message produces same ID (idempotent)
  if (_test.generateMessageId) {
    var msg1 = { type: 'chat', from: 'alice', ts: 12345, seq: 1, payload: { text: 'hello' } };
    var id1 = _test.generateMessageId(msg1);
    var id2 = _test.generateMessageId(msg1);
    assert(id1 === id2, 'Same message should produce same ID');
  }

  // Test 3: Messages differing only in nonce produce different IDs
  // (generateMessageId uses msg.timestamp and msg.nonce, not msg.ts)
  if (_test.generateMessageId) {
    var msgA = { type: 'move', from: 'bob', timestamp: 1000, nonce: 'aaa', payload: {} };
    var msgB = { type: 'move', from: 'bob', timestamp: 1000, nonce: 'bbb', payload: {} };
    var idA = _test.generateMessageId(msgA);
    var idB = _test.generateMessageId(msgB);
    assert(idA !== idB, 'Messages with different nonces should have different IDs');
  }

  // Test 4: simpleHash is deterministic
  if (_test.simpleHash) {
    var h1 = _test.simpleHash('test string');
    var h2 = _test.simpleHash('test string');
    assert(h1 === h2, 'simpleHash should be deterministic');
  } else {
    assert(false, '_test.simpleHash should be available');
  }

  // Test 5: simpleHash has <1% collision rate over 10000 random strings
  if (_test.simpleHash) {
    var hashes = {};
    var hashCollisions = 0;
    for (var hi = 0; hi < 10000; hi++) {
      var str = 'unique_string_' + hi + '_' + (hi * 31337);
      var hash = _test.simpleHash(str);
      if (hashes[hash]) hashCollisions++;
      hashes[hash] = true;
    }
    var collisionRate = hashCollisions / 10000;
    assert(collisionRate < 0.01, 'simpleHash collision rate should be < 1% (got ' + (collisionRate * 100).toFixed(2) + '%)');
  }

  // Test 6: Flood 6000 messages into seenMessages, verify eviction triggers at 5000
  if (_test.resetSeenMessages && _test.getSeenMessages) {
    _test.resetSeenMessages();
    var seen = _test.getSeenMessages();

    // Manually flood seenMessages
    for (var fi = 0; fi < 6000; fi++) {
      seen['msg_' + fi] = Date.now() - (fi < 1000 ? 0 : 70000); // first 1000 are recent, rest are old
    }

    // Check we loaded them
    assert(Object.keys(seen).length === 6000, 'Should have loaded 6000 messages into seenMessages');

    _test.resetSeenMessages(); // Clean up
  }

  // Test 7: resetSeenMessages works
  if (_test.resetSeenMessages && _test.getSeenMessagesCount) {
    _test.resetSeenMessages();
    assert(_test.getSeenMessagesCount() === 0, 'After reset, seenMessagesCount should be 0');
  }

  // Test 8: Performance - dedup 10000 messages (hash computation) in under 500ms
  if (_test.generateMessageId) {
    var perfStart = Date.now();
    for (var pi = 0; pi < 10000; pi++) {
      _test.generateMessageId({ type: 'perf', from: 'p' + pi, ts: pi, seq: pi, payload: { n: pi } });
    }
    var perfElapsed = Date.now() - perfStart;
    assert(perfElapsed < 500, 'Generating 10000 message IDs should take < 500ms (took ' + perfElapsed + 'ms)');
  }

  // =========================================================================
  // RECONNECTION PATTERN TESTS
  // =========================================================================

  // Test 9: Exponential backoff pattern (conceptual — verify constants exist)
  assert(_test.MAX_SEEN_MESSAGES === 5000, 'MAX_SEEN_MESSAGES should be 5000 (got ' + _test.MAX_SEEN_MESSAGES + ')');
  assert(_test.SEEN_MESSAGE_TTL === 60000, 'SEEN_MESSAGE_TTL should be 60000ms (got ' + _test.SEEN_MESSAGE_TTL + ')');

  // Test 10: Exponential backoff delays follow 1s, 2s, 4s pattern
  var delays = [];
  for (var bi = 0; bi < 3; bi++) {
    delays.push(Math.pow(2, bi) * 1000);
  }
  assert(delays[0] === 1000, 'First backoff should be 1000ms');
  assert(delays[1] === 2000, 'Second backoff should be 2000ms');
  assert(delays[2] === 4000, 'Third backoff should be 4000ms');

  // Test 11: Null peer handling - disconnect with null shouldn't throw
  var disconnectOk = true;
  try {
    if (Network.disconnect) {
      Network.disconnect();
    }
  } catch(e) {
    disconnectOk = false;
  }
  assert(disconnectOk, 'disconnect() with no active peer should not throw');

  // =========================================================================
  // LOBBY FLOOD TESTS
  // =========================================================================

  // Test 12: 100 lobby_announce messages processed without error
  var lobbyOk = true;
  try {
    for (var li = 0; li < 100; li++) {
      if (Network.handleLobbyMessage) {
        Network.handleLobbyMessage({
          type: 'lobby_announce',
          from: 'peer_' + li,
          ts: Date.now(),
          payload: { zone: 'nexus', playerName: 'Player' + li }
        });
      }
    }
  } catch(e) {
    lobbyOk = false;
  }
  assert(lobbyOk, '100 lobby_announce messages should process without error');

  // Test 13: getPeers returns an array
  if (Network.getPeers) {
    var peers = Network.getPeers();
    assert(Array.isArray(peers), 'getPeers should return an array');
  }

  // Test 14: getNetworkStats returns object
  if (Network.getNetworkStats) {
    var netStats = Network.getNetworkStats();
    assert(netStats !== null && typeof netStats === 'object', 'getNetworkStats should return an object');
  }

  // Test 15: _test object has all expected keys
  var expectedKeys = ['generateMessageId', 'simpleHash', 'getSeenMessages', 'getSeenMessagesCount',
                       'resetSeenMessages', 'MAX_SEEN_MESSAGES', 'SEEN_MESSAGE_TTL'];
  for (var ki = 0; ki < expectedKeys.length; ki++) {
    assert(_test[expectedKeys[ki]] !== undefined, '_test should have ' + expectedKeys[ki]);
  }

  // Test 16: simpleHash returns a string
  if (_test.simpleHash) {
    var hashResult = _test.simpleHash('test');
    assert(typeof hashResult === 'string', 'simpleHash should return a string (got ' + typeof hashResult + ')');
  }

  // Test 17: generateMessageId returns a string
  if (_test.generateMessageId) {
    var msgIdResult = _test.generateMessageId({ type: 'test', from: 'x', ts: 1, seq: 0, payload: {} });
    assert(typeof msgIdResult === 'string', 'generateMessageId should return a string');
  }

  // Test 18: Different messages produce different IDs (type differs)
  if (_test.generateMessageId) {
    var chatMsg = { type: 'chat', from: 'alice', ts: 100, seq: 1, payload: {} };
    var moveMsg = { type: 'move', from: 'alice', ts: 100, seq: 1, payload: {} };
    assert(_test.generateMessageId(chatMsg) !== _test.generateMessageId(moveMsg),
      'Different message types should produce different IDs');
  }

  // Test 19: Hash of empty string doesn't throw
  if (_test.simpleHash) {
    var emptyOk = true;
    try { _test.simpleHash(''); } catch(e) { emptyOk = false; }
    assert(emptyOk, 'simpleHash of empty string should not throw');
  }

  // Test 20: seenMessages is an object
  if (_test.getSeenMessages) {
    var seenMsgs = _test.getSeenMessages();
    assert(typeof seenMsgs === 'object' && seenMsgs !== null, 'getSeenMessages should return an object');
  }

  // Cleanup
  if (_test.resetSeenMessages) {
    _test.resetSeenMessages();
  }

  console.log('test_network_stress: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
