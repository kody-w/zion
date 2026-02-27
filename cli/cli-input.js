// cli-input.js — Raw terminal input handler for ZION CLI
// Handles keypress detection, movement, chat mode, and action keys.

'use strict';

var MOVE_KEYS = {
  w: { x: 0, z: -1 }, a: { x: -1, z: 0 },
  s: { x: 0, z: 1 },  d: { x: 1, z: 0 },
  // Arrow key escape sequences are handled separately
};

var ACTION_KEYS = {
  e: 'interact', i: 'inventory', h: 'help',
  q: 'quit', '\t': 'cycle_panel',
  '1': 'portal_1', '2': 'portal_2', '3': 'portal_3',
  '4': 'portal_4', '5': 'portal_5', '6': 'portal_6',
  '7': 'portal_7', '8': 'portal_8',
};

// Arrow key sequences (after ESC [)
var ARROW_MOVES = {
  A: { x: 0, z: -1 },  // Up
  B: { x: 0, z: 1 },   // Down
  C: { x: 1, z: 0 },   // Right
  D: { x: -1, z: 0 },  // Left
};

/**
 * Create a CLI input handler
 * @param {object} callbacks
 * @param {function} callbacks.onMove - Called with {x, z} delta
 * @param {function} callbacks.onAction - Called with action string
 * @param {function} callbacks.onChat - Called with chat text string
 * @param {function} callbacks.onQuit - Called when quitting
 * @returns {object} Input handler with destroy()
 */
function createInputHandler(callbacks) {
  callbacks = callbacks || {};
  var chatMode = false;
  var chatBuffer = '';
  var destroyed = false;

  function handleData(data) {
    if (destroyed) return;
    var str = data.toString();

    // Chat mode: accumulate text
    if (chatMode) {
      for (var ci = 0; ci < str.length; ci++) {
        var ch = str[ci];
        var code = ch.charCodeAt(0);

        if (ch === '\r' || ch === '\n') {
          // Send chat message
          if (chatBuffer.length > 0 && callbacks.onChat) {
            callbacks.onChat(chatBuffer);
          }
          chatBuffer = '';
          chatMode = false;
          if (callbacks.onAction) callbacks.onAction('chat_close');
          return;
        } else if (code === 27) {
          // ESC exits chat mode
          chatBuffer = '';
          chatMode = false;
          if (callbacks.onAction) callbacks.onAction('chat_close');
          return;
        } else if (code === 127 || code === 8) {
          // Backspace
          chatBuffer = chatBuffer.slice(0, -1);
          if (callbacks.onAction) callbacks.onAction('chat_update', chatBuffer);
        } else if (code >= 32) {
          chatBuffer += ch;
          if (callbacks.onAction) callbacks.onAction('chat_update', chatBuffer);
        }
      }
      return;
    }

    // Normal mode
    // Check for escape sequences (arrow keys: ESC [ A/B/C/D)
    if (str.length === 3 && str[0] === '\x1b' && str[1] === '[') {
      var arrowDir = ARROW_MOVES[str[2]];
      if (arrowDir && callbacks.onMove) {
        callbacks.onMove(arrowDir);
      }
      return;
    }

    // Single character keys
    for (var i = 0; i < str.length; i++) {
      var key = str[i];
      var keyLower = key.toLowerCase();
      var keyCode = key.charCodeAt(0);

      // Enter opens chat mode
      if (key === '\r' || key === '\n') {
        chatMode = true;
        chatBuffer = '';
        if (callbacks.onAction) callbacks.onAction('chat_open');
        return;
      }

      // Ctrl+C quits
      if (keyCode === 3) {
        if (callbacks.onQuit) callbacks.onQuit();
        return;
      }

      // Movement keys
      var move = MOVE_KEYS[keyLower];
      if (move && callbacks.onMove) {
        callbacks.onMove(move);
        continue;
      }

      // Action keys
      var action = ACTION_KEYS[keyLower];
      if (action) {
        if (action === 'quit') {
          if (callbacks.onQuit) callbacks.onQuit();
        } else if (callbacks.onAction) {
          callbacks.onAction(action);
        }
        continue;
      }
    }
  }

  return {
    handleData: handleData,
    isChatMode: function() { return chatMode; },
    getChatBuffer: function() { return chatBuffer; },
    destroy: function() { destroyed = true; }
  };
}

// Export for Node.js
if (typeof module !== 'undefined') {
  module.exports = {
    createInputHandler: createInputHandler,
    MOVE_KEYS: MOVE_KEYS,
    ACTION_KEYS: ACTION_KEYS,
    ARROW_MOVES: ARROW_MOVES
  };
}
