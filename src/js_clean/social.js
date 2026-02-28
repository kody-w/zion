(function(exports) {
  'use strict';

  var SAY_DISTANCE = 20;
  var SHOUT_DISTANCE = Infinity; // Zone-wide
  var EMOTE_DISTANCE = 30;
  var RATE_LIMIT_WINDOW = 60000; // 60 seconds
  var RATE_LIMIT_MAX = 30;

  // Consent store: { "from:to:type": true }
  var _consents = {};

  // Rate limit store: { playerId: [timestamp1, timestamp2, ...] }
  var _rateLimits = {};

  function getDistance(posA, posB) {
    var dx = (posA.x || 0) - (posB.x || 0);
    var dy = (posA.y || 0) - (posB.y || 0);
    var dz = (posA.z || 0) - (posB.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function getNearbyPlayers(position, state, maxDistance) {
    var nearby = [];
    var zone = position.zone;
    var playerIds = Object.keys(state.players);

    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      var player = state.players[pid];
      var playerZone = player.position ? player.position.zone : null;

      // Must be in same zone
      if (zone && playerZone && zone !== playerZone) continue;

      var dist = getDistance(position, player.position || { x: 0, y: 0, z: 0 });
      if (dist <= maxDistance) {
        nearby.push(pid);
      }
    }
    return nearby;
  }

  function handleSay(msg, state) {
    var from = msg.from;
    var position = msg.position;
    var zone = position.zone;
    var recipients = [];
    var playerIds = Object.keys(state.players);

    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      if (pid === from) continue;

      var player = state.players[pid];
      var playerZone = player.position ? player.position.zone : null;
      if (zone && playerZone && zone !== playerZone) continue;

      var dist = getDistance(position, player.position || { x: 0, y: 0, z: 0 });
      if (dist <= SAY_DISTANCE) {
        recipients.push(pid);
      }
    }

    return { recipients: recipients, text: msg.payload.message };
  }

  function handleShout(msg, state) {
    var from = msg.from;
    var zone = msg.position.zone;
    var recipients = [];
    var playerIds = Object.keys(state.players);

    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      if (pid === from) continue;

      var player = state.players[pid];
      var playerZone = player.position ? player.position.zone : null;
      if (zone && playerZone && zone !== playerZone) continue;

      recipients.push(pid);
    }

    return { recipients: recipients, text: msg.payload.message };
  }

  // §3.3 — Whisper requires consent
  function handleWhisper(msg, state) {
    var from = msg.from;
    var to = msg.to;

    if (!hasConsent(from, to, 'whisper')) {
      return { success: false, error: 'Whisper requires consent from the recipient' };
    }

    return { success: true, recipient: to, text: msg.payload.message };
  }

  function handleEmote(msg, state) {
    var from = msg.from;
    var position = msg.position;
    var zone = position.zone;
    var recipients = [];
    var playerIds = Object.keys(state.players);

    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      if (pid === from) continue;

      var player = state.players[pid];
      var playerZone = player.position ? player.position.zone : null;
      if (zone && playerZone && zone !== playerZone) continue;

      var dist = getDistance(position, player.position || { x: 0, y: 0, z: 0 });
      if (dist <= EMOTE_DISTANCE) {
        recipients.push(pid);
      }
    }

    return { recipients: recipients, emote: msg.payload.emote };
  }

  function _consentKey(from, to, type) {
    return from + ':' + to + ':' + type;
  }

  function grantConsent(from, to, type) {
    _consents[_consentKey(from, to, type)] = true;
  }

  function revokeConsent(from, to, type) {
    delete _consents[_consentKey(from, to, type)];
  }

  function hasConsent(from, to, type) {
    return !!_consents[_consentKey(from, to, type)];
  }

  // §7.3 — Rate limiting
  function checkRateLimit(playerId, now) {
    now = now || Date.now();
    if (!_rateLimits[playerId]) {
      _rateLimits[playerId] = [];
    }

    // Remove timestamps outside the window
    _rateLimits[playerId] = _rateLimits[playerId].filter(function(ts) {
      return (now - ts) < RATE_LIMIT_WINDOW;
    });

    if (_rateLimits[playerId].length >= RATE_LIMIT_MAX) {
      var oldestInWindow = _rateLimits[playerId][0];
      return {
        allowed: false,
        retryAfter: RATE_LIMIT_WINDOW - (now - oldestInWindow)
      };
    }

    _rateLimits[playerId].push(now);
    return { allowed: true };
  }

  exports.Social = {
    SAY_DISTANCE: SAY_DISTANCE,
    EMOTE_DISTANCE: EMOTE_DISTANCE,
    getDistance: getDistance,
    getNearbyPlayers: getNearbyPlayers,
    handleSay: handleSay,
    handleShout: handleShout,
    handleWhisper: handleWhisper,
    handleEmote: handleEmote,
    grantConsent: grantConsent,
    revokeConsent: revokeConsent,
    hasConsent: hasConsent,
    checkRateLimit: checkRateLimit
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.Social;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
