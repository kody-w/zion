// Test lobby message handling is properly wired
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

  console.log('Lobby message handling wired');
  console.log('');

  // Verify handleLobbyMessage is exported
  assert(typeof Network.handleLobbyMessage === 'function', 'handleLobbyMessage exported');

  // Verify it handles lobby message types
  var lobbyAnnounce = Network.handleLobbyMessage({ type: '_lobby_announce', peers: [] });
  // May return true (handled) or false (peer not initialized), but should not throw
  assert(lobbyAnnounce === true || lobbyAnnounce === false, '_lobby_announce processed without throw');

  var heartbeat = Network.handleLobbyMessage({ type: '_heartbeat' });
  assert(heartbeat === true, '_heartbeat returns true (handled)');

  // Regular game messages should NOT be handled by lobby handler
  var gameMsg = Network.handleLobbyMessage({ type: 'chat', payload: {} });
  assert(gameMsg === false, 'regular chat message returns false (not a lobby message)');

  var moveMsg = Network.handleLobbyMessage({ type: 'move', payload: {} });
  assert(moveMsg === false, 'regular move message returns false');

  // Null/undefined should be safe
  var nullMsg = Network.handleLobbyMessage(null);
  assert(nullMsg === false || nullMsg === undefined, 'null message is safe');

  var emptyMsg = Network.handleLobbyMessage({});
  assert(emptyMsg === false || emptyMsg === undefined, 'empty message is safe');

  console.log('');
  console.log('Source code verification');

  var fs = require('fs');
  var src = fs.readFileSync(__dirname + '/../src/js/network.js', 'utf8');

  // Verify handleLobbyMessage is called from handleIncomingMessage
  var wiredPattern = /handleLobbyMessage\(msg\)/;
  assert(wiredPattern.test(src), 'handleLobbyMessage called in message flow');

  // Verify lobby messages return early before messageCallback
  var interceptPattern = /handleLobbyMessage\(msg\)\)\s*\{[\s\S]{0,80}return/;
  assert(interceptPattern.test(src), 'lobby messages intercepted before game callback');

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
