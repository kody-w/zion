(function(exports) {
  'use strict';

  // §3.2 — All message types from the Constitution
  var MESSAGE_TYPES = [
    // Presence
    'join', 'leave', 'heartbeat', 'idle',
    // Movement
    'move', 'warp',
    // Communication
    'say', 'shout', 'whisper', 'emote',
    // Creation
    'build', 'plant', 'craft', 'compose', 'harvest',
    // Economy
    'trade_offer', 'trade_accept', 'trade_decline', 'buy', 'sell', 'gift',
    // Learning
    'teach', 'learn', 'mentor_offer', 'mentor_accept',
    // Competition
    'challenge', 'accept_challenge', 'forfeit', 'score',
    // Exploration
    'discover', 'anchor_place', 'inspect',
    // Multiverse
    'warp_fork', 'return_home', 'federation_announce', 'federation_handshake',
    // Meta
    'intention_set', 'intention_clear'
  ];

  var VALID_PLATFORMS = ['desktop', 'phone', 'vr', 'ar', 'api'];

  // §3.5 — Per-player monotonic sequence counters
  var _sequenceCounters = {};

  function _nextSeq(playerId) {
    if (_sequenceCounters[playerId] === undefined) {
      _sequenceCounters[playerId] = 0;
    }
    return _sequenceCounters[playerId]++;
  }

  function _generateId() {
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  // §3.1 — The Universal Message
  function createMessage(type, from, payload) {
    if (!from) {
      throw new Error('Invalid from field');
    }
    if (MESSAGE_TYPES.indexOf(type) === -1) {
      throw new Error('Invalid message type: ' + type);
    }

    return {
      v: 1,
      id: _generateId(),
      ts: new Date().toISOString(),
      seq: _nextSeq(from),
      from: from,
      type: type,
      platform: 'desktop',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: null,
      payload: payload || {}
    };
  }

  // §3.4 — Validation at the Gate
  function validateMessage(msg) {
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: 'Message is not an object' };
    }
    if (!msg.from) {
      return { valid: false, error: 'Missing from field' };
    }
    if (!msg.type || MESSAGE_TYPES.indexOf(msg.type) === -1) {
      return { valid: false, error: 'Invalid or missing type field' };
    }
    if (!msg.position || typeof msg.position !== 'object') {
      return { valid: false, error: 'Missing or invalid position field' };
    }
    if (VALID_PLATFORMS.indexOf(msg.platform) === -1) {
      return { valid: false, error: 'Invalid platform: ' + msg.platform };
    }
    if (typeof msg.seq !== 'number' || msg.seq < 0 || !Number.isInteger(msg.seq)) {
      return { valid: false, error: 'seq must be a non-negative integer' };
    }
    return { valid: true };
  }

  exports.Protocol = {
    MESSAGE_TYPES: MESSAGE_TYPES,
    VALID_PLATFORMS: VALID_PLATFORMS,
    createMessage: createMessage,
    validateMessage: validateMessage
  };

  // Support direct require() in Node
  if (typeof module !== 'undefined') {
    module.exports = exports.Protocol;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
