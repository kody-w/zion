/**
 * tests/test_chat.js
 * Comprehensive tests for src/js/chat.js — Chat Channel System
 * 70+ tests covering all public API surface.
 */

const { test, suite, report, assert } = require('./test_runner');
const Chat = require('../src/js/chat');

// Helper: fresh state before each suite that needs it
function resetChat() {
  Chat.reset();
}

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — Constants & Exports', () => {

  test('CHANNEL_TYPES exports required keys', () => {
    const ct = Chat.CHANNEL_TYPES;
    assert(ct.GLOBAL  === 'global',  'GLOBAL type');
    assert(ct.ZONE    === 'zone',    'ZONE type');
    assert(ct.GUILD   === 'guild',   'GUILD type');
    assert(ct.WHISPER === 'whisper', 'WHISPER type');
    assert(ct.SYSTEM  === 'system',  'SYSTEM type');
    assert(ct.TRADE   === 'trade',   'TRADE type');
  });

  test('MESSAGE_COLORS has an entry for every channel type', () => {
    const mc = Chat.MESSAGE_COLORS;
    assert(typeof mc.global  === 'string', 'global color');
    assert(typeof mc.zone    === 'string', 'zone color');
    assert(typeof mc.guild   === 'string', 'guild color');
    assert(typeof mc.whisper === 'string', 'whisper color');
    assert(typeof mc.system  === 'string', 'system color');
    assert(typeof mc.trade   === 'string', 'trade color');
  });

  test('MESSAGE_COLORS values are non-empty CSS color strings', () => {
    const mc = Chat.MESSAGE_COLORS;
    Object.keys(mc).forEach(function(k) {
      assert(mc[k].length > 0, 'color for ' + k + ' must be non-empty');
    });
  });

  test('maxHistoryPerChannel is a positive integer', () => {
    assert(typeof Chat.maxHistoryPerChannel === 'number', 'is a number');
    assert(Chat.maxHistoryPerChannel > 0, 'is positive');
    assert(Number.isInteger(Chat.maxHistoryPerChannel), 'is integer');
  });

  test('default maxHistoryPerChannel is 200', () => {
    assert(Chat.maxHistoryPerChannel === 200, 'default is 200');
  });

  test('CHANNEL_BADGES exported with expected keys', () => {
    const cb = Chat.CHANNEL_BADGES;
    assert(typeof cb.global  === 'string', 'global badge');
    assert(typeof cb.system  === 'string', 'system badge');
    assert(typeof cb.whisper === 'string', 'whisper badge');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — createChannel', () => {

  test('creates a global channel with correct fields', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', { displayName: 'Global' });
    assert(ch !== null, 'returns non-null');
    assert(ch.type === 'global', 'type is global');
    assert(ch.name === 'global', 'name is global');
    assert(ch.displayName === 'Global', 'displayName set');
    assert(Array.isArray(ch.messages), 'messages is array');
    assert(ch.unreadCount === 0, 'unread starts at 0');
    assert(ch.muted === false, 'muted starts false');
  });

  test('creates zone channel', () => {
    resetChat();
    const ch = Chat.createChannel('zone', 'zone_nexus', { displayName: 'Nexus', zoneName: 'nexus' });
    assert(ch.type === 'zone', 'zone type');
    assert(ch.zoneName === 'nexus', 'zoneName stored');
  });

  test('creates guild channel', () => {
    resetChat();
    const ch = Chat.createChannel('guild', 'guild_123', { guildId: '123' });
    assert(ch.type === 'guild', 'guild type');
    assert(ch.guildId === '123', 'guildId stored');
  });

  test('creates whisper channel', () => {
    resetChat();
    const ch = Chat.createChannel('whisper', 'whisper_alice_bob', { targetPlayer: 'bob' });
    assert(ch.type === 'whisper', 'whisper type');
    assert(ch.targetPlayer === 'bob', 'targetPlayer stored');
  });

  test('creates system channel', () => {
    resetChat();
    const ch = Chat.createChannel('system', 'system', {});
    assert(ch.type === 'system', 'system type');
  });

  test('creates trade channel', () => {
    resetChat();
    const ch = Chat.createChannel('trade', 'trade', {});
    assert(ch.type === 'trade', 'trade type');
  });

  test('returns null for invalid type', () => {
    resetChat();
    const ch = Chat.createChannel('invalid_type', 'mychan', {});
    assert(ch === null, 'returns null for bad type');
  });

  test('returns null when name is missing', () => {
    resetChat();
    const ch = Chat.createChannel('global', '', {});
    assert(ch === null, 'returns null for empty name');
  });

  test('returns null when type is missing', () => {
    resetChat();
    const ch = Chat.createChannel('', 'global', {});
    assert(ch === null, 'returns null for empty type');
  });

  test('channel is registered in getAllChannels after creation', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const all = Chat.getAllChannels();
    assert(all['global'] !== undefined, 'global registered');
  });

  test('persistent defaults to true when not specified', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', {});
    assert(ch.persistent === true, 'persistent defaults true');
  });

  test('persistent can be set to false', () => {
    resetChat();
    const ch = Chat.createChannel('whisper', 'w_temp', { persistent: false });
    assert(ch.persistent === false, 'persistent set to false');
  });

  test('createdAt is a recent timestamp', () => {
    resetChat();
    const before = Date.now();
    const ch = Chat.createChannel('global', 'global', {});
    const after = Date.now();
    assert(ch.createdAt >= before && ch.createdAt <= after, 'createdAt within range');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — getDefaultChannels', () => {

  test('returns an array', () => {
    resetChat();
    const defs = Chat.getDefaultChannels();
    assert(Array.isArray(defs), 'returns array');
  });

  test('returns 3 default channels', () => {
    resetChat();
    const defs = Chat.getDefaultChannels();
    assert(defs.length === 3, 'exactly 3 defaults');
  });

  test('default channels include global', () => {
    resetChat();
    const defs = Chat.getDefaultChannels();
    const types = defs.map(function(c) { return c.type; });
    assert(types.indexOf('global') !== -1, 'global included');
  });

  test('default channels include system', () => {
    resetChat();
    const defs = Chat.getDefaultChannels();
    const types = defs.map(function(c) { return c.type; });
    assert(types.indexOf('system') !== -1, 'system included');
  });

  test('default channels include trade', () => {
    resetChat();
    const defs = Chat.getDefaultChannels();
    const types = defs.map(function(c) { return c.type; });
    assert(types.indexOf('trade') !== -1, 'trade included');
  });

  test('calling getDefaultChannels twice returns same channel objects', () => {
    resetChat();
    const first  = Chat.getDefaultChannels();
    const second = Chat.getDefaultChannels();
    assert(first[0] === second[0], 'same reference on second call');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — addMessage', () => {

  test('adds a message and returns a record', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'Hello!' });
    assert(rec !== null, 'returns non-null');
    assert(rec.sender === 'alice', 'sender stored');
    assert(rec.text === 'Hello!', 'text stored');
  });

  test('message record has id', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'Hi' });
    assert(typeof rec.id === 'string' && rec.id.length > 0, 'has id');
  });

  test('message record has ts', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'Hi' });
    assert(typeof rec.ts === 'number', 'ts is number');
  });

  test('message record has badge matching channel type', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'Hi' });
    assert(rec.badge === Chat.CHANNEL_BADGES['global'], 'badge matches channel type');
  });

  test('message is appended to channel messages array', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'msg1' });
    Chat.addMessage('global', { sender: 'bob',   text: 'msg2' });
    const msgs = Chat.getMessages('global');
    assert(msgs.length === 2, 'two messages stored');
  });

  test('returns null for missing sender', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { text: 'No sender' });
    assert(rec === null, 'null without sender');
  });

  test('returns null for missing text', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice' });
    assert(rec === null, 'null without text');
  });

  test('returns null for non-existent channel', () => {
    resetChat();
    const rec = Chat.addMessage('no_such_channel', { sender: 'alice', text: 'hi' });
    assert(rec === null, 'null for missing channel');
  });

  test('returns null for null message', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', null);
    assert(rec === null, 'null for null message');
  });

  test('accepts custom ts', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const ts = 1700000000000;
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'hi', ts: ts });
    assert(rec.ts === ts, 'custom ts stored');
  });

  test('accepts meta field', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'hi', meta: { color: 'red' } });
    assert(rec.meta.color === 'red', 'meta stored');
  });

  test('text is coerced to string', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 42 });
    assert(typeof rec.text === 'string', 'text coerced to string');
    assert(rec.text === '42', 'text value correct');
  });

  test('accepts channel object instead of name', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage(ch, { sender: 'alice', text: 'hi' });
    assert(rec !== null, 'accepts channel object');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — getMessages', () => {

  test('returns empty array for empty channel', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const msgs = Chat.getMessages('global');
    assert(Array.isArray(msgs) && msgs.length === 0, 'empty array');
  });

  test('returns empty array for non-existent channel', () => {
    resetChat();
    const msgs = Chat.getMessages('no_such_channel');
    assert(Array.isArray(msgs) && msgs.length === 0, 'empty array');
  });

  test('returns all messages when no limit', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    for (var i = 0; i < 10; i++) {
      Chat.addMessage('global', { sender: 'alice', text: 'msg ' + i });
    }
    const msgs = Chat.getMessages('global');
    assert(msgs.length === 10, '10 messages returned');
  });

  test('respects limit parameter', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    for (var i = 0; i < 20; i++) {
      Chat.addMessage('global', { sender: 'alice', text: 'msg ' + i });
    }
    const msgs = Chat.getMessages('global', 5);
    assert(msgs.length === 5, 'only 5 returned');
  });

  test('limit returns most recent messages', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'first' });
    Chat.addMessage('global', { sender: 'bob',   text: 'last'  });
    const msgs = Chat.getMessages('global', 1);
    assert(msgs[0].text === 'last', 'most recent message returned');
  });

  test('before parameter filters by timestamp', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'early', ts: 1000 });
    Chat.addMessage('global', { sender: 'bob',   text: 'late',  ts: 3000 });
    const msgs = Chat.getMessages('global', undefined, 2000);
    assert(msgs.length === 1 && msgs[0].text === 'early', 'before filters correctly');
  });

  test('before=0 returns no messages', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'hi', ts: 1000 });
    const msgs = Chat.getMessages('global', undefined, 0);
    assert(msgs.length === 0, 'nothing before ts 0');
  });

  test('limit + before combined work together', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    for (var i = 1; i <= 10; i++) {
      Chat.addMessage('global', { sender: 'alice', text: 'msg ' + i, ts: i * 1000 });
    }
    // before=6000 gives msgs with ts < 6000: ts 1000..5000 (5 msgs), limit=3 → last 3
    const msgs = Chat.getMessages('global', 3, 6000);
    assert(msgs.length === 3, '3 messages with limit + before');
    assert(msgs[msgs.length - 1].ts === 5000, 'last message ts=5000');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — maxHistoryPerChannel enforcement', () => {

  test('enforces max history limit', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const limit = Chat.maxHistoryPerChannel;
    for (var i = 0; i < limit + 50; i++) {
      Chat.addMessage('global', { sender: 'alice', text: 'msg ' + i });
    }
    const msgs = Chat.getMessages('global');
    assert(msgs.length === limit, 'history capped at maxHistoryPerChannel');
  });

  test('oldest messages are dropped when limit exceeded', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const limit = Chat.maxHistoryPerChannel;
    // First message
    Chat.addMessage('global', { sender: 'alice', text: 'FIRST', ts: 1 });
    // Fill up beyond limit
    for (var i = 0; i < limit; i++) {
      Chat.addMessage('global', { sender: 'alice', text: 'fill ' + i });
    }
    const msgs = Chat.getMessages('global');
    const hasFirst = msgs.some(function(m) { return m.text === 'FIRST'; });
    assert(!hasFirst, 'first (oldest) message was dropped');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — Unread Tracking', () => {

  test('unreadCount starts at 0', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    assert(Chat.getUnreadCount('global') === 0, 'starts at 0');
  });

  test('unreadCount increments when channel is not active', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.createChannel('trade', 'trade', {});
    Chat.switchChannel('global'); // global is active
    Chat.addMessage('trade', { sender: 'alice', text: 'hi' });
    assert(Chat.getUnreadCount('trade') === 1, 'trade unread = 1');
  });

  test('unreadCount does not increment for active channel', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.switchChannel('global');
    Chat.addMessage('global', { sender: 'alice', text: 'hi' });
    assert(Chat.getUnreadCount('global') === 0, 'active channel stays 0');
  });

  test('markAsRead resets unreadCount to 0', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.createChannel('trade', 'trade', {});
    Chat.switchChannel('global');
    Chat.addMessage('trade', { sender: 'alice', text: 'msg1' });
    Chat.addMessage('trade', { sender: 'alice', text: 'msg2' });
    assert(Chat.getUnreadCount('trade') === 2, 'pre-read = 2');
    Chat.markAsRead('trade');
    assert(Chat.getUnreadCount('trade') === 0, 'after markAsRead = 0');
  });

  test('switchChannel marks channel as read', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.createChannel('trade', 'trade', {});
    Chat.switchChannel('global');
    Chat.addMessage('trade', { sender: 'x', text: 'hi' });
    Chat.switchChannel('trade');
    assert(Chat.getUnreadCount('trade') === 0, 'unread cleared on switch');
  });

  test('getUnreadCount returns 0 for non-existent channel', () => {
    resetChat();
    assert(Chat.getUnreadCount('no_such') === 0, 'missing channel = 0');
  });

  test('unreadCount accumulates across multiple inactive messages', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.createChannel('zone', 'zone_nexus', {});
    Chat.switchChannel('global');
    for (var i = 0; i < 5; i++) {
      Chat.addMessage('zone_nexus', { sender: 'bob', text: 'hi ' + i });
    }
    assert(Chat.getUnreadCount('zone_nexus') === 5, 'unread = 5');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — switchChannel / getActiveChannel', () => {

  test('switchChannel returns the channel object', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const ch = Chat.switchChannel('global');
    assert(ch !== null && ch.name === 'global', 'returns channel object');
  });

  test('switchChannel returns null for unknown channel', () => {
    resetChat();
    const ch = Chat.switchChannel('no_such_channel');
    assert(ch === null, 'null for missing channel');
  });

  test('getActiveChannel returns null when none selected', () => {
    resetChat();
    const ch = Chat.getActiveChannel();
    assert(ch === null, 'null when no active channel');
  });

  test('getActiveChannel returns the switched channel', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.switchChannel('global');
    const ch = Chat.getActiveChannel();
    assert(ch !== null && ch.name === 'global', 'active channel correct');
  });

  test('switching channels updates active channel', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.createChannel('trade',  'trade',  {});
    Chat.switchChannel('global');
    Chat.switchChannel('trade');
    const ch = Chat.getActiveChannel();
    assert(ch.name === 'trade', 'active is now trade');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — formatMessage', () => {

  test('formats a message with time, badge and sender: text', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'Hello world', ts: new Date('2024-01-01T12:34:00').getTime() });
    const formatted = Chat.formatMessage(rec);
    assert(typeof formatted === 'string', 'returns string');
    assert(formatted.indexOf('alice') !== -1, 'contains sender');
    assert(formatted.indexOf('Hello world') !== -1, 'contains text');
    assert(formatted.indexOf('[') !== -1, 'contains bracket (time or badge)');
  });

  test('returns empty string for null input', () => {
    const formatted = Chat.formatMessage(null);
    assert(formatted === '', 'empty string for null');
  });

  test('returns empty string for non-object input', () => {
    const formatted = Chat.formatMessage('not an object');
    assert(formatted === '', 'empty string for string input');
  });

  test('formatted message contains colon separator', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'bob', text: 'test' });
    const formatted = Chat.formatMessage(rec);
    assert(formatted.indexOf('bob:') !== -1, 'sender: colon separator');
  });

  test('formatted message includes badge', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'hi' });
    const formatted = Chat.formatMessage(rec);
    assert(formatted.indexOf(Chat.CHANNEL_BADGES['global']) !== -1, 'badge in formatted output');
  });

  test('whisper channel badge appears in formatted output', () => {
    resetChat();
    Chat.createChannel('whisper', 'whisper_a_b', { targetPlayer: 'b' });
    const rec = Chat.addMessage('whisper_a_b', { sender: 'alice', text: 'secret' });
    const formatted = Chat.formatMessage(rec);
    assert(formatted.indexOf(Chat.CHANNEL_BADGES['whisper']) !== -1, 'whisper badge present');
  });

  test('time portion is present in format [HH:MM]', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'x', text: 'y' });
    const formatted = Chat.formatMessage(rec);
    // Should match pattern [DD:DD]
    assert(/\[\d{2}:\d{2}\]/.test(formatted), 'time format [HH:MM]');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — filterMessages', () => {

  test('returns all messages for empty query', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'hello' });
    Chat.addMessage('global', { sender: 'bob',   text: 'world' });
    const result = Chat.filterMessages('global', '');
    assert(result.length === 2, 'empty query returns all');
  });

  test('filters by text match (case-insensitive)', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'Hello World' });
    Chat.addMessage('global', { sender: 'bob',   text: 'goodbye'    });
    const result = Chat.filterMessages('global', 'hello');
    assert(result.length === 1 && result[0].sender === 'alice', 'case-insensitive text match');
  });

  test('filters by sender match (case-insensitive)', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'Alice', text: 'hi' });
    Chat.addMessage('global', { sender: 'Bob',   text: 'hey' });
    const result = Chat.filterMessages('global', 'alice');
    assert(result.length === 1, 'matched by sender');
  });

  test('returns empty array for non-matching query', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'hello' });
    const result = Chat.filterMessages('global', 'zzznomatch');
    assert(result.length === 0, 'no matches returns empty');
  });

  test('returns empty array for non-existent channel', () => {
    resetChat();
    const result = Chat.filterMessages('no_such', 'hello');
    assert(Array.isArray(result) && result.length === 0, 'missing channel returns []');
  });

  test('returns all messages when query is not a string', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'hi' });
    const result = Chat.filterMessages('global', null);
    assert(result.length === 1, 'null query returns all messages');
  });

  test('partial text match works', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'I love ZION!' });
    const result = Chat.filterMessages('global', 'zion');
    assert(result.length === 1, 'partial match works');
  });

  test('special characters in query are treated literally', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'price is 5.00' });
    Chat.addMessage('global', { sender: 'bob',   text: 'no dots here'  });
    const result = Chat.filterMessages('global', '5.00');
    assert(result.length === 1, 'special chars in query work');
  });

  test('emoji in messages can be matched', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'hello :wave:' });
    const result = Chat.filterMessages('global', ':wave:');
    assert(result.length === 1, 'emoji text match');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — muteChannel / unmuteChannel', () => {

  test('muted starts as false', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', {});
    assert(ch.muted === false, 'not muted by default');
  });

  test('muteChannel sets muted to true', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', {});
    Chat.muteChannel('global');
    assert(ch.muted === true, 'muted after muteChannel');
  });

  test('unmuteChannel sets muted to false', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', {});
    Chat.muteChannel('global');
    Chat.unmuteChannel('global');
    assert(ch.muted === false, 'unmuted after unmuteChannel');
  });

  test('muteChannel does not throw for non-existent channel', () => {
    resetChat();
    // Should not throw
    Chat.muteChannel('no_such_channel');
    assert(true, 'no error for missing channel');
  });

  test('unmuteChannel does not throw for non-existent channel', () => {
    resetChat();
    Chat.unmuteChannel('no_such_channel');
    assert(true, 'no error for missing channel');
  });

  test('muted channel still stores messages', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.muteChannel('global');
    Chat.addMessage('global', { sender: 'alice', text: 'hi' });
    const msgs = Chat.getMessages('global');
    assert(msgs.length === 1, 'muted channel still stores messages');
  });

  test('muteChannel accepts channel object', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', {});
    Chat.muteChannel(ch);
    assert(ch.muted === true, 'muted via object reference');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — getChannelForZone', () => {

  test('returns a channel for a valid zone name', () => {
    resetChat();
    const ch = Chat.getChannelForZone('nexus');
    assert(ch !== null, 'returns non-null');
    assert(ch.type === 'zone', 'type is zone');
    assert(ch.zoneName === 'nexus', 'zoneName correct');
  });

  test('channel name is zone_<zoneName>', () => {
    resetChat();
    const ch = Chat.getChannelForZone('gardens');
    assert(ch.name === 'zone_gardens', 'channel name pattern');
  });

  test('same channel returned on repeated calls', () => {
    resetChat();
    const ch1 = Chat.getChannelForZone('nexus');
    const ch2 = Chat.getChannelForZone('nexus');
    assert(ch1 === ch2, 'same channel object returned');
  });

  test('returns null for null zone name', () => {
    resetChat();
    const ch = Chat.getChannelForZone(null);
    assert(ch === null, 'null for null zone');
  });

  test('returns null for empty zone name', () => {
    resetChat();
    const ch = Chat.getChannelForZone('');
    assert(ch === null, 'null for empty zone');
  });

  test('each zone gets its own channel', () => {
    resetChat();
    const nexus   = Chat.getChannelForZone('nexus');
    const gardens = Chat.getChannelForZone('gardens');
    assert(nexus !== gardens, 'distinct channels');
  });

  test('displayName is capitalized zone name', () => {
    resetChat();
    const ch = Chat.getChannelForZone('nexus');
    assert(ch.displayName.charAt(0) === ch.displayName.charAt(0).toUpperCase(), 'display name capitalized');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — getGuildChannel', () => {

  test('returns a channel for a valid guild ID', () => {
    resetChat();
    const ch = Chat.getGuildChannel('guild_1');
    assert(ch !== null, 'non-null');
    assert(ch.type === 'guild', 'type is guild');
    assert(ch.guildId === 'guild_1', 'guildId stored');
  });

  test('channel name is guild_<guildId>', () => {
    resetChat();
    const ch = Chat.getGuildChannel('g42');
    assert(ch.name === 'guild_g42', 'channel name pattern');
  });

  test('same channel returned on repeated calls', () => {
    resetChat();
    const ch1 = Chat.getGuildChannel('g1');
    const ch2 = Chat.getGuildChannel('g1');
    assert(ch1 === ch2, 'same object');
  });

  test('returns null for null guild ID', () => {
    resetChat();
    const ch = Chat.getGuildChannel(null);
    assert(ch === null, 'null for null guildId');
  });

  test('returns null for empty guild ID', () => {
    resetChat();
    const ch = Chat.getGuildChannel('');
    assert(ch === null, 'null for empty guildId');
  });

  test('different guilds get different channels', () => {
    resetChat();
    const ch1 = Chat.getGuildChannel('g1');
    const ch2 = Chat.getGuildChannel('g2');
    assert(ch1 !== ch2, 'distinct channels');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — createWhisperChannel', () => {

  test('creates a whisper channel between two players', () => {
    resetChat();
    const ch = Chat.createWhisperChannel('alice', 'bob');
    assert(ch !== null, 'non-null channel');
    assert(ch.type === 'whisper', 'type is whisper');
  });

  test('channel name is deterministic regardless of order', () => {
    resetChat();
    const ch1 = Chat.createWhisperChannel('alice', 'bob');
    resetChat();
    const ch2 = Chat.createWhisperChannel('bob', 'alice');
    assert(ch1.name === ch2.name, 'same channel name regardless of argument order');
  });

  test('same channel returned on repeated calls', () => {
    resetChat();
    const ch1 = Chat.createWhisperChannel('alice', 'bob');
    const ch2 = Chat.createWhisperChannel('alice', 'bob');
    assert(ch1 === ch2, 'same object');
  });

  test('returns null when localPlayer is null', () => {
    resetChat();
    const ch = Chat.createWhisperChannel(null, 'bob');
    assert(ch === null, 'null for null localPlayer');
  });

  test('returns null when targetPlayer is null', () => {
    resetChat();
    const ch = Chat.createWhisperChannel('alice', null);
    assert(ch === null, 'null for null targetPlayer');
  });

  test('returns null when both players are the same', () => {
    resetChat();
    const ch = Chat.createWhisperChannel('alice', 'alice');
    assert(ch === null, 'null when same player');
  });

  test('targetPlayer is stored on the channel', () => {
    resetChat();
    const ch = Chat.createWhisperChannel('alice', 'bob');
    assert(ch.targetPlayer === 'bob', 'targetPlayer stored');
  });

  test('whisper channel name contains both player names', () => {
    resetChat();
    const ch = Chat.createWhisperChannel('alice', 'bob');
    assert(ch.name.indexOf('alice') !== -1, 'alice in name');
    assert(ch.name.indexOf('bob') !== -1,   'bob in name');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — getChannel / getAllChannels / removeChannel', () => {

  test('getChannel returns null for unknown channel', () => {
    resetChat();
    assert(Chat.getChannel('no_such') === null, 'null for missing');
  });

  test('getChannel returns correct channel after creation', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const ch = Chat.getChannel('global');
    assert(ch !== null && ch.name === 'global', 'returns channel');
  });

  test('getAllChannels returns empty object after reset', () => {
    resetChat();
    const all = Chat.getAllChannels();
    assert(typeof all === 'object' && Object.keys(all).length === 0, 'empty after reset');
  });

  test('getAllChannels includes all created channels', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.createChannel('trade',  'trade',  {});
    const all = Chat.getAllChannels();
    assert(all['global'] !== undefined, 'global in all');
    assert(all['trade']  !== undefined, 'trade in all');
    assert(Object.keys(all).length === 2, 'exactly 2 channels');
  });

  test('removeChannel removes the channel', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const removed = Chat.removeChannel('global');
    assert(removed === true, 'returns true');
    assert(Chat.getChannel('global') === null, 'channel gone');
  });

  test('removeChannel returns false for missing channel', () => {
    resetChat();
    const removed = Chat.removeChannel('no_such');
    assert(removed === false, 'returns false');
  });

  test('removeChannel clears active channel if it was active', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.switchChannel('global');
    Chat.removeChannel('global');
    assert(Chat.getActiveChannel() === null, 'active channel cleared');
  });

  test('removeChannel accepts channel object', () => {
    resetChat();
    const ch = Chat.createChannel('global', 'global', {});
    const removed = Chat.removeChannel(ch);
    assert(removed === true, 'removed via object');
    assert(Chat.getChannel('global') === null, 'gone');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
suite('Chat — Edge Cases', () => {

  test('adding message with special characters in text', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const special = '<script>alert("xss")</script>';
    const rec = Chat.addMessage('global', { sender: 'hacker', text: special });
    assert(rec.text === special, 'special chars stored as-is');
  });

  test('unicode emoji text stored correctly', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'alice', text: 'Hello \uD83D\uDE00!' });
    assert(rec.text.indexOf('\uD83D\uDE00') !== -1, 'emoji preserved');
  });

  test('very long text is stored without truncation', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    var longText = '';
    for (var i = 0; i < 2000; i++) longText += 'a';
    const rec = Chat.addMessage('global', { sender: 'alice', text: longText });
    assert(rec.text.length === 2000, 'long text stored fully');
  });

  test('adding to two different channels is independent', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.createChannel('trade',  'trade',  {});
    Chat.addMessage('global', { sender: 'alice', text: 'in global' });
    Chat.addMessage('trade',  { sender: 'bob',   text: 'in trade'  });
    assert(Chat.getMessages('global').length === 1, 'global has 1');
    assert(Chat.getMessages('trade').length  === 1, 'trade has 1');
  });

  test('getMessages returns a copy (mutation does not affect channel)', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'hi' });
    const msgs = Chat.getMessages('global');
    msgs.push({ sender: 'hacker', text: 'injected' });
    assert(Chat.getMessages('global').length === 1, 'original not mutated');
  });

  test('reset clears all state', () => {
    Chat.createChannel('global', 'global', {});
    Chat.addMessage('global', { sender: 'alice', text: 'hi' });
    Chat.switchChannel('global');
    Chat.reset();
    assert(Object.keys(Chat.getAllChannels()).length === 0, 'channels cleared');
    assert(Chat.getActiveChannel() === null, 'active channel cleared');
  });

  test('sender with spaces in name', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    const rec = Chat.addMessage('global', { sender: 'Lord Vex', text: 'hi' });
    assert(rec.sender === 'Lord Vex', 'spaces in sender name');
  });

  test('message IDs are unique across multiple messages', () => {
    resetChat();
    Chat.createChannel('global', 'global', {});
    var ids = {};
    var collision = false;
    for (var i = 0; i < 100; i++) {
      var rec = Chat.addMessage('global', { sender: 'alice', text: 'msg ' + i });
      if (ids[rec.id]) { collision = true; break; }
      ids[rec.id] = true;
    }
    assert(!collision, 'no ID collision across 100 messages');
  });

  test('multiple zones can coexist independently', () => {
    resetChat();
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(z) {
      Chat.getChannelForZone(z);
      Chat.addMessage('zone_' + z, { sender: 'traveler', text: 'hi from ' + z });
    });
    zones.forEach(function(z) {
      assert(Chat.getMessages('zone_' + z).length === 1, z + ' has its own message');
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────

const allPassed = report();
process.exit(allPassed ? 0 : 1);
