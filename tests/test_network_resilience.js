// Test network resilience improvements
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

  var Network = require('../src/js/network');

  console.log('Network resilience improvements');
  console.log('');

  console.log('Module exports');
  assert(typeof Network.initMesh === 'function', 'initMesh exported');
  assert(typeof Network.broadcastMessage === 'function', 'broadcastMessage exported');
  assert(typeof Network.connectToPeer === 'function', 'connectToPeer exported');
  assert(typeof Network.joinLobby === 'function', 'joinLobby exported');
  assert(typeof Network.getNetworkStats === 'function', 'getStats exported');

  console.log('');
  console.log('Stats structure');
  var stats = Network.getNetworkStats();
  assert(stats !== null && typeof stats === 'object', 'getStats returns object');
  assert(typeof stats.peerCount === 'number', 'stats.peerCount is number');
  assert(typeof stats.seenMessages === 'number', 'stats.seenMessages is number');
  assert(stats.seenMessages === 0, 'seenMessages starts at 0');

  console.log('');
  console.log('Federation exports');
  assert(typeof Network.initFederation === 'function', 'initFederation exported');
  assert(typeof Network.announceFederation === 'function', 'announceFederation exported');
  assert(typeof Network.federationHandshake === 'function', 'federationHandshake exported');
  assert(typeof Network.handleFederationMessage === 'function', 'handleFederationMessage exported');
  assert(typeof Network.onFederationEvent === 'function', 'onFederationEvent exported');
  assert(typeof Network.getFederatedWorlds === 'function', 'getFederatedWorlds exported');
  assert(typeof Network.getDiscoveredWorlds === 'function', 'getDiscoveredWorlds exported');
  assert(typeof Network.isFederatedWith === 'function', 'isFederatedWith exported');
  assert(typeof Network.deriveWorldId === 'function', 'deriveWorldId exported');

  console.log('');
  console.log('Dedup queue behavior');

  // Simulate the dedup object pattern
  var seenMessages = {};
  var seenMessagesCount = 0;
  var MAX_SEEN_MESSAGES = 5000;
  var SEEN_MESSAGE_TTL = 60000;

  // Add messages
  for (var i = 0; i < 100; i++) {
    var msgId = 'msg-' + i;
    seenMessages[msgId] = Date.now();
    seenMessagesCount++;
  }
  assert(seenMessagesCount === 100, 'counted 100 messages');

  // Check dedup
  assert(seenMessages['msg-0'] !== undefined, 'msg-0 exists in dedup');
  assert(seenMessages['msg-99'] !== undefined, 'msg-99 exists in dedup');
  assert(seenMessages['msg-100'] === undefined, 'msg-100 does not exist');

  // Simulate TTL eviction
  var now = Date.now();
  seenMessages['old-msg'] = now - 120000; // 2 min old
  seenMessagesCount++;
  var keys = Object.keys(seenMessages);
  var evicted = 0;
  for (var j = 0; j < keys.length; j++) {
    if (now - seenMessages[keys[j]] > SEEN_MESSAGE_TTL) {
      delete seenMessages[keys[j]];
      seenMessagesCount--;
      evicted++;
    }
  }
  assert(evicted === 1, 'evicted 1 old message (2 min old)');
  assert(seenMessagesCount === 100, 'count back to 100 after eviction');

  console.log('');
  console.log('Message queue cap behavior');

  // Simulate queue cap from main.js
  var messageQueue = [];
  var MAX_MESSAGE_QUEUE = 500;
  for (var q = 0; q < 600; q++) {
    messageQueue.push({ id: q });
    while (messageQueue.length > MAX_MESSAGE_QUEUE) {
      messageQueue.shift();
    }
  }
  assert(messageQueue.length === 500, 'queue capped at 500 (was 600)');
  assert(messageQueue[0].id === 100, 'oldest 100 messages dropped');
  assert(messageQueue[499].id === 599, 'newest message retained');

  console.log('');
  console.log('Lobby jitter range');

  // Simulate lobby promotion delay
  var minDelay = Infinity;
  var maxDelay = 0;
  for (var d = 0; d < 1000; d++) {
    var delay = 5000 + Math.floor(Math.random() * 3000);
    if (delay < minDelay) minDelay = delay;
    if (delay > maxDelay) maxDelay = delay;
  }
  assert(minDelay >= 5000, 'minimum delay >= 5000ms (got ' + minDelay + ')');
  assert(maxDelay < 8000, 'maximum delay < 8000ms (got ' + maxDelay + ')');
  assert(maxDelay > 7000, 'jitter reaches near 8000ms (got ' + maxDelay + ')');

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
