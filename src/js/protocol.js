// protocol.js — Universal message protocol for ZION
(function(exports) {
  'use strict';

  // Protocol version
  const PROTOCOL_VERSION = 1;

  // Valid message types
  const MESSAGE_TYPES = new Set([
    'join',
    'leave',
    'heartbeat',
    'idle',
    'move',
    'warp',
    'say',
    'shout',
    'whisper',
    'emote',
    'build',
    'plant',
    'craft',
    'compose',
    'harvest',
    'trade_offer',
    'trade_accept',
    'trade_decline',
    'buy',
    'sell',
    'gift',
    'teach',
    'learn',
    'mentor_offer',
    'mentor_accept',
    'challenge',
    'accept_challenge',
    'forfeit',
    'score',
    'discover',
    'anchor_place',
    'inspect',
    'intention_set',
    'intention_clear',
    'warp_fork',
    'return_home',
    'federation_announce',
    'federation_handshake'
  ]);

  // Message types that require consent
  const CONSENT_REQUIRED_TYPES = new Set([
    'whisper',
    'challenge',
    'trade_offer',
    'mentor_offer'
  ]);

  // Valid platforms
  const PLATFORMS = new Set([
    'desktop',
    'phone',
    'vr',
    'ar',
    'api'
  ]);

  // Per-player sequence counter storage
  const sequenceCounters = new Map();

  /**
   * Get the next sequence number for a player
   * @param {string} playerId - The player ID
   * @returns {number} The next sequence number
   */
  function getNextSeq(playerId) {
    if (!sequenceCounters.has(playerId)) {
      sequenceCounters.set(playerId, 0);
    }
    const current = sequenceCounters.get(playerId);
    sequenceCounters.set(playerId, current + 1);
    return current;
  }

  /**
   * Generate a UUID v4
   * @returns {string} A UUID string
   */
  function generateUUID() {
    // Use crypto.randomUUID if available (Node 16.7+ and modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate an ISO-8601 timestamp
   * @returns {string} ISO-8601 formatted timestamp
   */
  function generateTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Create a message object
   * @param {string} type - Message type (must be in MESSAGE_TYPES)
   * @param {string} from - Player ID sending the message
   * @param {object} payload - Message payload data
   * @param {object} opts - Optional fields (platform, position, geo)
   * @returns {object} Valid message object
   */
  function createMessage(type, from, payload, opts = {}) {
    if (!MESSAGE_TYPES.has(type)) {
      throw new Error(`Invalid message type: ${type}`);
    }

    if (!from || typeof from !== 'string') {
      throw new Error('Invalid from: must be a non-empty string');
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Invalid payload: must be an object');
    }

    const message = {
      v: PROTOCOL_VERSION,
      id: generateUUID(),
      ts: generateTimestamp(),
      seq: getNextSeq(from),
      from: from,
      type: type,
      platform: opts.platform || 'desktop',
      position: opts.position || { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: opts.geo || null,
      payload: payload
    };

    return message;
  }

  /**
   * Validate a message object
   * @param {object} msg - Message to validate
   * @returns {object} {valid: boolean, errors: string[]}
   */
  function validateMessage(msg) {
    const errors = [];

    // Check if msg is an object
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      return { valid: false, errors: ['Message must be an object'] };
    }

    // Validate version
    if (msg.v !== PROTOCOL_VERSION) {
      errors.push(`Invalid version: expected ${PROTOCOL_VERSION}, got ${msg.v}`);
    }

    // Validate id
    if (!msg.id || typeof msg.id !== 'string') {
      errors.push('Invalid id: must be a non-empty string');
    }

    // Validate timestamp
    if (!msg.ts || typeof msg.ts !== 'string') {
      errors.push('Invalid ts: must be a non-empty string');
    } else {
      // Check if it's a valid ISO-8601 timestamp
      const date = new Date(msg.ts);
      if (isNaN(date.getTime())) {
        errors.push('Invalid ts: must be a valid ISO-8601 timestamp');
      }
    }

    // Validate sequence
    if (typeof msg.seq !== 'number' || msg.seq < 0 || !Number.isInteger(msg.seq)) {
      errors.push('Invalid seq: must be a non-negative integer');
    }

    // Validate from
    if (!msg.from || typeof msg.from !== 'string') {
      errors.push('Invalid from: must be a non-empty string');
    }

    // Validate type
    if (!MESSAGE_TYPES.has(msg.type)) {
      errors.push(`Invalid type: ${msg.type} is not a valid message type`);
    }

    // Validate platform
    if (!PLATFORMS.has(msg.platform)) {
      errors.push(`Invalid platform: ${msg.platform} is not a valid platform`);
    }

    // Validate position
    if (!msg.position || typeof msg.position !== 'object' || Array.isArray(msg.position)) {
      errors.push('Invalid position: must be an object');
    } else {
      if (typeof msg.position.x !== 'number') {
        errors.push('Invalid position.x: must be a number');
      }
      if (typeof msg.position.y !== 'number') {
        errors.push('Invalid position.y: must be a number');
      }
      if (typeof msg.position.z !== 'number') {
        errors.push('Invalid position.z: must be a number');
      }
      if (!msg.position.zone || typeof msg.position.zone !== 'string') {
        errors.push('Invalid position.zone: must be a non-empty string');
      }
    }

    // Validate geo (optional)
    if (msg.geo !== null && msg.geo !== undefined) {
      if (typeof msg.geo !== 'object' || Array.isArray(msg.geo)) {
        errors.push('Invalid geo: must be an object or null');
      } else {
        if (msg.geo.lat !== null && msg.geo.lat !== undefined && typeof msg.geo.lat !== 'number') {
          errors.push('Invalid geo.lat: must be a number or null');
        }
        if (msg.geo.lon !== null && msg.geo.lon !== undefined && typeof msg.geo.lon !== 'number') {
          errors.push('Invalid geo.lon: must be a number or null');
        }
      }
    }

    // Validate payload
    if (!msg.payload || typeof msg.payload !== 'object' || Array.isArray(msg.payload)) {
      errors.push('Invalid payload: must be an object');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Export all functions and constants
  exports.PROTOCOL_VERSION = PROTOCOL_VERSION;
  exports.MESSAGE_TYPES = MESSAGE_TYPES;
  exports.CONSENT_REQUIRED_TYPES = CONSENT_REQUIRED_TYPES;
  exports.PLATFORMS = PLATFORMS;
  exports.createMessage = createMessage;
  exports.validateMessage = validateMessage;
  exports.getNextSeq = getNextSeq;
  exports.generateUUID = generateUUID;
  exports.generateTimestamp = generateTimestamp;

})(typeof module !== 'undefined' ? module.exports : (window.Protocol = {}));
