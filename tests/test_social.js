const { test, suite, report, assert } = require('./test_runner');
const Social = require('../src/js/social');

// Mock state with multiple players at known positions
const mockState = {
  players: new Map([
    ['alice', { position: { x: 0, y: 0, z: 0, zone: 'nexus' }, online: true }],
    ['bob', { position: { x: 10, y: 0, z: 0, zone: 'nexus' }, online: true }],
    ['charlie', { position: { x: 50, y: 0, z: 0, zone: 'nexus' }, online: true }],
    ['diana', { position: { x: 5, y: 0, z: 5, zone: 'gardens' }, online: true }]
  ])
};

suite('Social Module Tests', () => {

  test('handleSay returns nearby players only (within distance 20)', () => {
    const msg = {
      from: 'alice',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      payload: { message: 'Hello' }
    };

    const result = Social.handleSay(msg, mockState);

    // Bob is at distance 10, should be included
    // Charlie is at distance 50, should be excluded
    // Diana is in different zone, should be excluded
    assert(result.recipients.includes('bob'), 'Bob should receive say message');
    assert(!result.recipients.includes('charlie'), 'Charlie should not receive say message (too far)');
    assert(!result.recipients.includes('diana'), 'Diana should not receive say message (different zone)');
    assert(!result.recipients.includes('alice'), 'Alice should not receive own message');
  });

  test('handleSay excludes players in different zones', () => {
    const msg = {
      from: 'alice',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      payload: { message: 'Hello' }
    };

    const result = Social.handleSay(msg, mockState);

    assert(!result.recipients.includes('diana'), 'Diana in different zone should not receive message');
  });

  test('handleShout returns all players in same zone', () => {
    const msg = {
      from: 'alice',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      payload: { message: 'Hello everyone!' }
    };

    const result = Social.handleShout(msg, mockState);

    // Bob and Charlie are in same zone (nexus)
    // Diana is in different zone (gardens)
    assert(result.recipients.includes('bob'), 'Bob should receive shout');
    assert(result.recipients.includes('charlie'), 'Charlie should receive shout');
    assert(!result.recipients.includes('diana'), 'Diana in different zone should not receive shout');
    assert(!result.recipients.includes('alice'), 'Alice should not receive own shout');
  });

  test('handleShout excludes players in different zones', () => {
    const msg = {
      from: 'diana',
      position: { x: 5, y: 0, z: 5, zone: 'gardens' },
      payload: { message: 'Hello from gardens!' }
    };

    const result = Social.handleShout(msg, mockState);

    // Only Diana is in gardens zone
    assert(!result.recipients.includes('alice'), 'Alice in different zone should not receive');
    assert(!result.recipients.includes('bob'), 'Bob in different zone should not receive');
    assert(!result.recipients.includes('charlie'), 'Charlie in different zone should not receive');
  });

  test('handleWhisper succeeds when consent granted', () => {
    Social.grantConsent('alice', 'bob', 'whisper');

    const msg = {
      from: 'alice',
      to: 'bob',
      payload: { message: 'Secret message' }
    };

    const result = Social.handleWhisper(msg, mockState);

    assert(result.success === true, 'Whisper should succeed with consent');
  });

  test('handleWhisper fails without consent', () => {
    // Ensure no consent exists
    Social.revokeConsent('charlie', 'alice', 'whisper');

    const msg = {
      from: 'charlie',
      to: 'alice',
      payload: { message: 'Secret message' }
    };

    const result = Social.handleWhisper(msg, mockState);

    assert(result.success === false, 'Whisper should fail without consent');
    assert(result.error.includes('consent'), 'Error should mention consent requirement');
  });

  test('grantConsent/revokeConsent/hasConsent works correctly', () => {
    // Grant consent
    Social.grantConsent('alice', 'bob', 'trade_offer');
    assert(Social.hasConsent('alice', 'bob', 'trade_offer') === true, 'Consent should be granted');

    // Revoke consent
    Social.revokeConsent('alice', 'bob', 'trade_offer');
    assert(Social.hasConsent('alice', 'bob', 'trade_offer') === false, 'Consent should be revoked');

    // Different type should not have consent
    assert(Social.hasConsent('alice', 'bob', 'challenge') === false, 'Different type should not have consent');
  });

  test('handleEmote returns nearby players (within distance 30)', () => {
    const msg = {
      from: 'alice',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      payload: { emote: 'wave' }
    };

    const result = Social.handleEmote(msg, mockState);

    // Bob is at distance 10, should be included
    // Charlie is at distance 50, should be excluded (emote distance is 30)
    assert(result.recipients.includes('bob'), 'Bob should see emote');
    assert(!result.recipients.includes('charlie'), 'Charlie should not see emote (too far)');
    assert(!result.recipients.includes('alice'), 'Alice should not receive own emote');
  });

  test('checkRateLimit allows normal message rate', () => {
    const now = Date.now();

    // Send first message
    const result1 = Social.checkRateLimit('test_player', now);
    assert(result1.allowed === true, 'First message should be allowed');

    // Send second message immediately
    const result2 = Social.checkRateLimit('test_player', now + 1000);
    assert(result2.allowed === true, 'Second message should be allowed');
  });

  test('checkRateLimit blocks after 30 messages in 60 seconds', () => {
    const playerId = 'spam_player';
    const now = Date.now();

    // Send 30 messages
    for (let i = 0; i < 30; i++) {
      Social.checkRateLimit(playerId, now + i * 100);
    }

    // 31st message should be blocked
    const result = Social.checkRateLimit(playerId, now + 3000);
    assert(result.allowed === false, '31st message should be blocked');
    assert(result.retryAfter !== undefined, 'Should provide retryAfter time');
  });

  test('getDistance calculates correct Euclidean distance', () => {
    const posA = { x: 0, y: 0, z: 0 };
    const posB = { x: 3, y: 4, z: 0 };

    const distance = Social.getDistance(posA, posB);

    // Distance should be 5 (3-4-5 triangle)
    assert(Math.abs(distance - 5) < 0.01, 'Distance should be 5');
  });

  test('getNearbyPlayers finds correct players', () => {
    const position = { x: 0, y: 0, z: 0, zone: 'nexus' };

    const nearbyPlayers = Social.getNearbyPlayers(position, mockState, 20);

    // Bob at distance 10 should be included
    // Charlie at distance 50 should not be included
    assert(nearbyPlayers.includes('alice'), 'Alice should be in nearby (distance 0)');
    assert(nearbyPlayers.includes('bob'), 'Bob should be in nearby');
    assert(!nearbyPlayers.includes('charlie'), 'Charlie should not be in nearby');
    assert(!nearbyPlayers.includes('diana'), 'Diana should not be in nearby (different zone)');
  });
});

const success = report();
process.exit(success ? 0 : 1);
