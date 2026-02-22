'use strict';
/**
 * test_dashboard_social.js - 130+ tests for DashboardSocial module
 */

const { test, suite, report, assert } = require('./test_runner');
const DS = require('../src/js/dashboard_social');

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeMsg(overrides) {
  return Object.assign({
    from: 'player1',
    text: 'Hello world',
    timestamp: 1700000000000,
    type: 'chat'
  }, overrides || {});
}

function fillChannel(state, channel, count) {
  for (var i = 0; i < count; i++) {
    state = DS.addMessage(state, channel, makeMsg({ text: 'msg ' + i, timestamp: 1700000000000 + i }));
  }
  return state;
}

// ─── Suite 1: createChatState ──────────────────────────────────────────────

suite('createChatState', function() {
  test('returns an object', function() {
    var s = DS.createChatState();
    assert(s && typeof s === 'object');
  });

  test('has channels.global array', function() {
    var s = DS.createChatState();
    assert(Array.isArray(s.channels.global));
  });

  test('has channels.zone array', function() {
    var s = DS.createChatState();
    assert(Array.isArray(s.channels.zone));
  });

  test('has channels.guild array', function() {
    var s = DS.createChatState();
    assert(Array.isArray(s.channels.guild));
  });

  test('has channels.whisper object', function() {
    var s = DS.createChatState();
    assert(s.channels.whisper && typeof s.channels.whisper === 'object');
  });

  test('activeChannel is global', function() {
    var s = DS.createChatState();
    assert.strictEqual(s.activeChannel, 'global');
  });

  test('unread starts at 0 for all channels', function() {
    var s = DS.createChatState();
    assert.strictEqual(s.unread.global, 0);
    assert.strictEqual(s.unread.zone, 0);
    assert.strictEqual(s.unread.guild, 0);
    assert.strictEqual(s.unread.whisper, 0);
  });

  test('channels start empty', function() {
    var s = DS.createChatState();
    assert.strictEqual(s.channels.global.length, 0);
    assert.strictEqual(s.channels.zone.length, 0);
    assert.strictEqual(s.channels.guild.length, 0);
  });
});

// ─── Suite 2: addMessage ──────────────────────────────────────────────────

suite('addMessage', function() {
  test('adds message to global channel', function() {
    var s = DS.createChatState();
    var s2 = DS.addMessage(s, 'global', makeMsg());
    assert.strictEqual(s2.channels.global.length, 1);
  });

  test('adds message to zone channel', function() {
    var s = DS.createChatState();
    var s2 = DS.addMessage(s, 'zone', makeMsg({ text: 'zone msg' }));
    assert.strictEqual(s2.channels.zone.length, 1);
    assert.strictEqual(s2.channels.zone[0].text, 'zone msg');
  });

  test('adds message to guild channel', function() {
    var s = DS.createChatState();
    var s2 = DS.addMessage(s, 'guild', makeMsg({ text: 'guild msg' }));
    assert.strictEqual(s2.channels.guild.length, 1);
  });

  test('preserves message properties', function() {
    var s = DS.createChatState();
    var msg = makeMsg({ from: 'alice', text: 'test', timestamp: 12345, type: 'emote' });
    var s2 = DS.addMessage(s, 'global', msg);
    var stored = s2.channels.global[0];
    assert.strictEqual(stored.from, 'alice');
    assert.strictEqual(stored.text, 'test');
    assert.strictEqual(stored.timestamp, 12345);
    assert.strictEqual(stored.type, 'emote');
  });

  test('does not mutate original state', function() {
    var s = DS.createChatState();
    DS.addMessage(s, 'global', makeMsg());
    assert.strictEqual(s.channels.global.length, 0);
  });

  test('returns new state object', function() {
    var s = DS.createChatState();
    var s2 = DS.addMessage(s, 'global', makeMsg());
    assert(s2 !== s);
  });

  test('increments unread for non-active channel', function() {
    var s = DS.createChatState(); // activeChannel = 'global'
    var s2 = DS.addMessage(s, 'zone', makeMsg());
    assert.strictEqual(s2.unread.zone, 1);
  });

  test('does not increment unread for active channel', function() {
    var s = DS.createChatState(); // activeChannel = 'global'
    var s2 = DS.addMessage(s, 'global', makeMsg());
    assert.strictEqual(s2.unread.global, 0);
  });

  test('handles null state gracefully', function() {
    var result = DS.addMessage(null, 'global', makeMsg());
    assert(result === null);
  });

  test('handles null channel gracefully', function() {
    var s = DS.createChatState();
    var result = DS.addMessage(s, null, makeMsg());
    assert(result === s);
  });

  test('handles null message gracefully', function() {
    var s = DS.createChatState();
    var result = DS.addMessage(s, 'global', null);
    assert(result === s);
  });

  test('uses default type if not provided', function() {
    var s = DS.createChatState();
    var s2 = DS.addMessage(s, 'global', { from: 'x', text: 'y', timestamp: 1 });
    assert.strictEqual(s2.channels.global[0].type, 'chat');
  });
});

// ─── Suite 3: Channel capacity (200 message cap) ──────────────────────────

suite('Channel capacity (200 message cap)', function() {
  test('caps global channel at 200 messages', function() {
    var s = DS.createChatState();
    s = fillChannel(s, 'global', 210);
    assert.strictEqual(s.channels.global.length, DS.MAX_MESSAGES_PER_CHANNEL);
  });

  test('keeps the most recent messages when capping', function() {
    var s = DS.createChatState();
    s = fillChannel(s, 'global', 201);
    // The oldest (msg 0) should be gone, the newest (msg 200) should be present
    var last = s.channels.global[s.channels.global.length - 1];
    assert.strictEqual(last.text, 'msg 200');
  });

  test('caps zone channel at 200 messages', function() {
    var s = DS.createChatState();
    s = fillChannel(s, 'zone', 205);
    assert.strictEqual(s.channels.zone.length, DS.MAX_MESSAGES_PER_CHANNEL);
  });

  test('caps guild channel at 200 messages', function() {
    var s = DS.createChatState();
    s = fillChannel(s, 'guild', 202);
    assert.strictEqual(s.channels.guild.length, DS.MAX_MESSAGES_PER_CHANNEL);
  });

  test('caps whisper channel at 200 messages', function() {
    var s = DS.createChatState();
    var key = 'player1:player2';
    for (var i = 0; i < 205; i++) {
      s = DS.addMessage(s, key, makeMsg({ text: 'w' + i }));
    }
    assert.strictEqual(s.channels.whisper[key].length, DS.MAX_MESSAGES_PER_CHANNEL);
  });

  test('exactly 200 messages is allowed', function() {
    var s = DS.createChatState();
    s = fillChannel(s, 'global', 200);
    assert.strictEqual(s.channels.global.length, 200);
  });
});

// ─── Suite 4: getMessages ─────────────────────────────────────────────────

suite('getMessages', function() {
  test('returns empty array for empty channel', function() {
    var s = DS.createChatState();
    var msgs = DS.getMessages(s, 'global');
    assert(Array.isArray(msgs) && msgs.length === 0);
  });

  test('returns last 50 by default', function() {
    var s = DS.createChatState();
    s = fillChannel(s, 'global', 100);
    var msgs = DS.getMessages(s, 'global');
    assert.strictEqual(msgs.length, 50);
  });

  test('returns custom limit', function() {
    var s = DS.createChatState();
    s = fillChannel(s, 'global', 100);
    var msgs = DS.getMessages(s, 'global', 10);
    assert.strictEqual(msgs.length, 10);
  });

  test('returns all messages if fewer than limit', function() {
    var s = DS.createChatState();
    s = fillChannel(s, 'global', 5);
    var msgs = DS.getMessages(s, 'global', 50);
    assert.strictEqual(msgs.length, 5);
  });

  test('returns messages from zone channel', function() {
    var s = DS.createChatState();
    s = DS.addMessage(s, 'zone', makeMsg({ text: 'zone' }));
    var msgs = DS.getMessages(s, 'zone');
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].text, 'zone');
  });

  test('returns messages from whisper channel key', function() {
    var s = DS.createChatState();
    var key = 'alpha:beta';
    s = DS.addMessage(s, key, makeMsg({ text: 'whisper msg' }));
    var msgs = DS.getMessages(s, key);
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].text, 'whisper msg');
  });

  test('returns empty for unknown whisper channel', function() {
    var s = DS.createChatState();
    var msgs = DS.getMessages(s, 'nobody:player');
    assert(Array.isArray(msgs) && msgs.length === 0);
  });

  test('handles null state gracefully', function() {
    var msgs = DS.getMessages(null, 'global');
    assert(Array.isArray(msgs) && msgs.length === 0);
  });
});

// ─── Suite 5: switchChannel ───────────────────────────────────────────────

suite('switchChannel', function() {
  test('changes activeChannel', function() {
    var s = DS.createChatState();
    var s2 = DS.switchChannel(s, 'zone');
    assert.strictEqual(s2.activeChannel, 'zone');
  });

  test('clears unread for new channel', function() {
    var s = DS.createChatState();
    // Add zone messages to create unread
    s = DS.addMessage(s, 'zone', makeMsg());
    s = DS.addMessage(s, 'zone', makeMsg());
    assert.strictEqual(s.unread.zone, 2);
    var s2 = DS.switchChannel(s, 'zone');
    assert.strictEqual(s2.unread.zone, 0);
  });

  test('does not affect unread for other channels', function() {
    var s = DS.createChatState();
    s = DS.addMessage(s, 'zone', makeMsg());
    s = DS.addMessage(s, 'guild', makeMsg());
    var s2 = DS.switchChannel(s, 'zone');
    assert.strictEqual(s2.unread.guild, 1);
  });

  test('handles null state gracefully', function() {
    var result = DS.switchChannel(null, 'zone');
    assert(result === null);
  });

  test('handles null channel gracefully', function() {
    var s = DS.createChatState();
    var result = DS.switchChannel(s, null);
    assert(result === s);
  });

  test('does not mutate original state', function() {
    var s = DS.createChatState();
    DS.switchChannel(s, 'guild');
    assert.strictEqual(s.activeChannel, 'global');
  });
});

// ─── Suite 6: getUnreadCount ──────────────────────────────────────────────

suite('getUnreadCount', function() {
  test('returns 0 for active channel (no unread)', function() {
    var s = DS.createChatState();
    DS.addMessage(s, 'global', makeMsg());
    assert.strictEqual(DS.getUnreadCount(s, 'global'), 0);
  });

  test('returns correct count for inactive channel', function() {
    var s = DS.createChatState();
    s = DS.addMessage(s, 'zone', makeMsg());
    s = DS.addMessage(s, 'zone', makeMsg());
    assert.strictEqual(DS.getUnreadCount(s, 'zone'), 2);
  });

  test('returns 0 for null state', function() {
    assert.strictEqual(DS.getUnreadCount(null, 'global'), 0);
  });

  test('returns 0 for unknown channel', function() {
    var s = DS.createChatState();
    assert.strictEqual(DS.getUnreadCount(s, 'nonexistent'), 0);
  });
});

// ─── Suite 7: sendWhisper ─────────────────────────────────────────────────

suite('sendWhisper', function() {
  test('creates whisper channel if not exists', function() {
    var s = DS.createChatState();
    var s2 = DS.sendWhisper(s, 'alice', 'bob', 'hi');
    var key = ['alice', 'bob'].sort().join(':');
    assert(s2.channels.whisper[key]);
    assert.strictEqual(s2.channels.whisper[key].length, 1);
  });

  test('stores message in whisper channel', function() {
    var s = DS.createChatState();
    var s2 = DS.sendWhisper(s, 'alice', 'bob', 'secret message');
    var key = ['alice', 'bob'].sort().join(':');
    assert.strictEqual(s2.channels.whisper[key][0].text, 'secret message');
    assert.strictEqual(s2.channels.whisper[key][0].from, 'alice');
  });

  test('uses consistent key regardless of sender/receiver order', function() {
    var s = DS.createChatState();
    var s2 = DS.sendWhisper(s, 'alice', 'bob', 'msg1');
    var s3 = DS.sendWhisper(s2, 'bob', 'alice', 'msg2');
    var key = ['alice', 'bob'].sort().join(':');
    assert.strictEqual(s3.channels.whisper[key].length, 2);
  });

  test('handles null parameters gracefully', function() {
    var s = DS.createChatState();
    var result = DS.sendWhisper(null, 'alice', 'bob', 'hi');
    assert(result === null);
  });

  test('returns unchanged state for missing fromId', function() {
    var s = DS.createChatState();
    var result = DS.sendWhisper(s, null, 'bob', 'hi');
    assert(result === s);
  });

  test('returns unchanged state for missing text', function() {
    var s = DS.createChatState();
    var result = DS.sendWhisper(s, 'alice', 'bob', null);
    assert(result === s);
  });
});

// ─── Suite 8: formatMessage ───────────────────────────────────────────────

suite('formatMessage', function() {
  test('returns HTML string', function() {
    var html = DS.formatMessage(makeMsg());
    assert(typeof html === 'string' && html.length > 0);
  });

  test('includes timestamp', function() {
    var html = DS.formatMessage(makeMsg({ timestamp: 1700000000000 }));
    // Should have [HH:MM] pattern
    assert(/\[\d{2}:\d{2}\]/.test(html));
  });

  test('includes sender name', function() {
    var html = DS.formatMessage(makeMsg({ from: 'TestPlayer' }));
    assert(html.indexOf('TestPlayer') !== -1);
  });

  test('includes message text', function() {
    var html = DS.formatMessage(makeMsg({ text: 'hello world' }));
    assert(html.indexOf('hello world') !== -1);
  });

  test('system messages use gold color', function() {
    var html = DS.formatMessage(makeMsg({ type: 'system', text: 'server event' }));
    assert(html.indexOf('#DAA520') !== -1 || html.indexOf('gold') !== -1 || html.toLowerCase().indexOf('daa520') !== -1);
  });

  test('system messages are in italic', function() {
    var html = DS.formatMessage(makeMsg({ type: 'system', text: 'server event' }));
    assert(html.indexOf('<em>') !== -1);
  });

  test('whisper messages use purple color', function() {
    var html = DS.formatMessage(makeMsg({ type: 'chat', _whisper: true }));
    assert(html.indexOf('#C77DFF') !== -1 || html.toLowerCase().indexOf('c77dff') !== -1);
  });

  test('emote messages are italic', function() {
    var html = DS.formatMessage(makeMsg({ type: 'emote', text: 'waves' }));
    assert(html.indexOf('italic') !== -1 || html.indexOf('<em>') !== -1);
  });

  test('emote includes sender name', function() {
    var html = DS.formatMessage(makeMsg({ type: 'emote', from: 'alice', text: 'waves' }));
    assert(html.indexOf('alice') !== -1);
  });

  test('escapes HTML in message text', function() {
    var html = DS.formatMessage(makeMsg({ text: '<script>alert(1)</script>' }));
    assert(html.indexOf('<script>') === -1);
    assert(html.indexOf('&lt;script&gt;') !== -1);
  });

  test('escapes HTML in sender name', function() {
    var html = DS.formatMessage(makeMsg({ from: '<b>hax</b>' }));
    assert(html.indexOf('<b>hax</b>') === -1);
  });

  test('returns empty string for null msg', function() {
    var html = DS.formatMessage(null);
    assert.strictEqual(html, '');
  });

  test('trade messages have trade color', function() {
    var html = DS.formatMessage(makeMsg({ type: 'trade', text: 'selling sword' }));
    assert(html.indexOf('#FFB347') !== -1 || html.toLowerCase().indexOf('ffb347') !== -1);
  });
});

// ─── Suite 9: createGuildState ────────────────────────────────────────────

suite('createGuildState', function() {
  test('returns object with guilds array', function() {
    var s = DS.createGuildState();
    assert(Array.isArray(s.guilds));
  });

  test('returns object with playerGuild map', function() {
    var s = DS.createGuildState();
    assert(s.playerGuild && typeof s.playerGuild === 'object');
  });

  test('returns object with invites array', function() {
    var s = DS.createGuildState();
    assert(Array.isArray(s.invites));
  });

  test('guilds starts empty', function() {
    var s = DS.createGuildState();
    assert.strictEqual(s.guilds.length, 0);
  });
});

// ─── Suite 10: createGuild ────────────────────────────────────────────────

suite('createGuild', function() {
  test('creates a guild successfully', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Test Guild', 'leader1', 'Our motto');
    assert.strictEqual(result.success, true);
    assert(result.guild);
  });

  test('new guild has correct name', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    assert.strictEqual(result.guild.name, 'Test Guild');
  });

  test('new guild has correct motto', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Test Guild', 'leader1', 'Our motto here');
    assert.strictEqual(result.guild.motto, 'Our motto here');
  });

  test('leader is auto-added as member', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var members = result.guild.members;
    var leaderMember = members.filter(function(m) { return m.playerId === 'leader1'; });
    assert.strictEqual(leaderMember.length, 1);
    assert.strictEqual(leaderMember[0].role, 'leader');
  });

  test('guild has level 1', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    assert.strictEqual(result.guild.level, 1);
  });

  test('updates state.guilds array', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    assert.strictEqual(result.state.guilds.length, 1);
  });

  test('registers player in playerGuild map', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    assert.strictEqual(result.state.playerGuild['leader1'], result.guild.id);
  });

  test('fails for name exceeding max length', function() {
    var s = DS.createGuildState();
    var longName = new Array(DS.MAX_GUILD_NAME_LENGTH + 2).join('x');
    var result = DS.createGuild(s, longName, 'leader1', 'motto');
    assert.strictEqual(result.success, false);
    assert(result.error);
  });

  test('fails for motto exceeding max length', function() {
    var s = DS.createGuildState();
    var longMotto = new Array(DS.MAX_GUILD_MOTTO_LENGTH + 2).join('y');
    var result = DS.createGuild(s, 'Test Guild', 'leader1', longMotto);
    assert.strictEqual(result.success, false);
  });

  test('fails for duplicate guild name (case insensitive)', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Warriors', 'leader1', 'motto');
    var r2 = DS.createGuild(r1.state, 'WARRIORS', 'leader2', 'motto');
    assert.strictEqual(r2.success, false);
  });

  test('fails if player already in a guild', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Warriors', 'leader1', 'motto');
    var r2 = DS.createGuild(r1.state, 'Mages', 'leader1', 'motto');
    assert.strictEqual(r2.success, false);
  });

  test('fails for missing name', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, null, 'leader1', 'motto');
    assert.strictEqual(result.success, false);
  });

  test('fails for missing leaderId', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Guild', null, 'motto');
    assert.strictEqual(result.success, false);
  });

  test('allows empty motto', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'Test Guild', 'leader1');
    assert.strictEqual(result.success, true);
  });

  test('max name length exactly allowed', function() {
    var s = DS.createGuildState();
    var exactName = new Array(DS.MAX_GUILD_NAME_LENGTH + 1).join('x');
    var result = DS.createGuild(s, exactName, 'leader1', 'motto');
    assert.strictEqual(result.success, true);
  });
});

// ─── Suite 11: joinGuild ──────────────────────────────────────────────────

suite('joinGuild', function() {
  test('player can join a guild', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    assert.strictEqual(r2.success, true);
  });

  test('player is added to member list', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    var members = DS.getGuildMembers(r2.state, r1.guild.id);
    var found = members.filter(function(m) { return m.playerId === 'player2'; });
    assert.strictEqual(found.length, 1);
  });

  test('player is registered in playerGuild map', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    assert.strictEqual(r2.state.playerGuild['player2'], r1.guild.id);
  });

  test('fails for non-existent guild', function() {
    var s = DS.createGuildState();
    var result = DS.joinGuild(s, 'guild_nonexistent', 'player1');
    assert.strictEqual(result.success, false);
  });

  test('fails if player already in guild', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    var r3 = DS.joinGuild(r2.state, r1.guild.id, 'player2');
    assert.strictEqual(r3.success, false);
  });

  test('fails if player is already in another guild', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Guild A', 'leader1', 'motto');
    var r2 = DS.createGuild(r1.state, 'Guild B', 'leader2', 'motto');
    // leader1 is in Guild A
    var r3 = DS.joinGuild(r2.state, r2.guild.id, 'leader1');
    assert.strictEqual(r3.success, false);
  });

  test('fails when guild is full', function() {
    var s = DS.createGuildState();
    var r = DS.createGuild(s, 'Full Guild', 'leader1', 'motto');
    var state = r.state;
    var guildId = r.guild.id;
    // Fill up to MAX_GUILD_MEMBERS
    for (var i = 2; i <= DS.MAX_GUILD_MEMBERS; i++) {
      var jr = DS.joinGuild(state, guildId, 'player' + i);
      state = jr.state;
    }
    // Now try to join again
    var finalResult = DS.joinGuild(state, guildId, 'playerover');
    assert.strictEqual(finalResult.success, false);
  });

  test('member count is exactly MAX_GUILD_MEMBERS when full', function() {
    var s = DS.createGuildState();
    var r = DS.createGuild(s, 'Full Guild', 'leader1', 'motto');
    var state = r.state;
    var guildId = r.guild.id;
    for (var i = 2; i <= DS.MAX_GUILD_MEMBERS; i++) {
      var jr = DS.joinGuild(state, guildId, 'player' + i);
      state = jr.state;
    }
    var members = DS.getGuildMembers(state, guildId);
    assert.strictEqual(members.length, DS.MAX_GUILD_MEMBERS);
  });
});

// ─── Suite 12: leaveGuild ─────────────────────────────────────────────────

suite('leaveGuild', function() {
  test('member can leave guild', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    var r3 = DS.leaveGuild(r2.state, r1.guild.id, 'player2');
    assert.strictEqual(r3.success, true);
  });

  test('member is removed from member list', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    var r3 = DS.leaveGuild(r2.state, r1.guild.id, 'player2');
    var members = DS.getGuildMembers(r3.state, r1.guild.id);
    var found = members.filter(function(m) { return m.playerId === 'player2'; });
    assert.strictEqual(found.length, 0);
  });

  test('player is removed from playerGuild map', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    var r3 = DS.leaveGuild(r2.state, r1.guild.id, 'player2');
    assert(!r3.state.playerGuild['player2']);
  });

  test('leader cannot leave guild', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.leaveGuild(r1.state, r1.guild.id, 'leader1');
    assert.strictEqual(r2.success, false);
    assert(r2.message || r2.error);
  });

  test('fails for non-member', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.leaveGuild(r1.state, r1.guild.id, 'nobody');
    assert.strictEqual(r2.success, false);
  });

  test('fails for non-existent guild', function() {
    var s = DS.createGuildState();
    var result = DS.leaveGuild(s, 'guild_fake', 'player1');
    assert.strictEqual(result.success, false);
  });

  test('returns success message on leave', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    var r3 = DS.leaveGuild(r2.state, r1.guild.id, 'player2');
    assert(r3.message);
  });
});

// ─── Suite 13: inviteToGuild ──────────────────────────────────────────────

suite('inviteToGuild', function() {
  test('invite is created successfully', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.inviteToGuild(r1.state, r1.guild.id, 'leader1', 'player2');
    assert.strictEqual(r2.success, true);
    assert(r2.invite);
  });

  test('invite has correct guildId', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.inviteToGuild(r1.state, r1.guild.id, 'leader1', 'player2');
    assert.strictEqual(r2.invite.guildId, r1.guild.id);
  });

  test('invite is stored in state.invites', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.inviteToGuild(r1.state, r1.guild.id, 'leader1', 'player2');
    assert.strictEqual(r2.state.invites.length, 1);
  });

  test('cannot invite yourself', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.inviteToGuild(r1.state, r1.guild.id, 'leader1', 'leader1');
    assert.strictEqual(r2.success, false);
  });

  test('cannot invite existing member', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.joinGuild(r1.state, r1.guild.id, 'player2');
    var r3 = DS.inviteToGuild(r2.state, r1.guild.id, 'leader1', 'player2');
    assert.strictEqual(r3.success, false);
  });

  test('fails if inviter is not a guild member', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.inviteToGuild(r1.state, r1.guild.id, 'nonmember', 'player2');
    assert.strictEqual(r2.success, false);
  });

  test('fails for duplicate invite', function() {
    var s = DS.createGuildState();
    var r1 = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var r2 = DS.inviteToGuild(r1.state, r1.guild.id, 'leader1', 'player2');
    var r3 = DS.inviteToGuild(r2.state, r1.guild.id, 'leader1', 'player2');
    assert.strictEqual(r3.success, false);
  });

  test('fails for full guild', function() {
    var s = DS.createGuildState();
    var r = DS.createGuild(s, 'Full Guild', 'leader1', 'motto');
    var state = r.state;
    var guildId = r.guild.id;
    for (var i = 2; i <= DS.MAX_GUILD_MEMBERS; i++) {
      var jr = DS.joinGuild(state, guildId, 'player' + i);
      state = jr.state;
    }
    var invResult = DS.inviteToGuild(state, guildId, 'leader1', 'playerover');
    assert.strictEqual(invResult.success, false);
  });
});

// ─── Suite 14: getGuildInfo / getGuildMembers ─────────────────────────────

suite('getGuildInfo and getGuildMembers', function() {
  test('getGuildInfo returns correct guild', function() {
    var s = DS.createGuildState();
    var r = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var info = DS.getGuildInfo(r.state, r.guild.id);
    assert.strictEqual(info.name, 'Test Guild');
  });

  test('getGuildInfo returns null for unknown guild', function() {
    var s = DS.createGuildState();
    var info = DS.getGuildInfo(s, 'guild_fake');
    assert(info === null);
  });

  test('getGuildInfo includes all required fields', function() {
    var s = DS.createGuildState();
    var r = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var info = DS.getGuildInfo(r.state, r.guild.id);
    assert(info.hasOwnProperty('id'));
    assert(info.hasOwnProperty('name'));
    assert(info.hasOwnProperty('motto'));
    assert(info.hasOwnProperty('leader'));
    assert(info.hasOwnProperty('members'));
    assert(info.hasOwnProperty('createdAt'));
    assert(info.hasOwnProperty('level'));
  });

  test('getGuildMembers returns member array', function() {
    var s = DS.createGuildState();
    var r = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var members = DS.getGuildMembers(r.state, r.guild.id);
    assert(Array.isArray(members));
    assert.strictEqual(members.length, 1);
  });

  test('getGuildMembers returns empty for unknown guild', function() {
    var s = DS.createGuildState();
    var members = DS.getGuildMembers(s, 'fake');
    assert.deepStrictEqual(members, []);
  });

  test('getGuildMembers includes roles', function() {
    var s = DS.createGuildState();
    var r = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var members = DS.getGuildMembers(r.state, r.guild.id);
    assert(members[0].role);
  });
});

// ─── Suite 15: formatGuildCard ────────────────────────────────────────────

suite('formatGuildCard', function() {
  test('returns HTML string', function() {
    var s = DS.createGuildState();
    var r = DS.createGuild(s, 'Test Guild', 'leader1', 'motto');
    var html = DS.formatGuildCard(r.guild, false);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('includes guild name', function() {
    var html = DS.formatGuildCard({ name: 'Warriors', motto: '', members: [], level: 1 }, false);
    assert(html.indexOf('Warriors') !== -1);
  });

  test('includes motto if present', function() {
    var html = DS.formatGuildCard({ name: 'Warriors', motto: 'Fight hard', members: [], level: 1 }, false);
    assert(html.indexOf('Fight hard') !== -1);
  });

  test('shows own guild badge when isOwn=true', function() {
    var html = DS.formatGuildCard({ name: 'Warriors', motto: '', members: [], level: 1 }, true);
    assert(html.indexOf('Your Guild') !== -1);
  });

  test('handles null guild gracefully', function() {
    var html = DS.formatGuildCard(null, false);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('includes member count', function() {
    var members = [{ playerId: 'p1', role: 'leader' }, { playerId: 'p2', role: 'member' }];
    var html = DS.formatGuildCard({ name: 'G', motto: '', members: members, level: 1 }, false);
    assert(html.indexOf('2') !== -1);
  });
});

// ─── Suite 16: createPlayerProfile ───────────────────────────────────────

suite('createPlayerProfile', function() {
  test('returns profile object', function() {
    var p = DS.createPlayerProfile('p1', { name: 'Alice' });
    assert(p && typeof p === 'object');
  });

  test('stores player id', function() {
    var p = DS.createPlayerProfile('p1', {});
    assert.strictEqual(p.id, 'p1');
  });

  test('stores name from data', function() {
    var p = DS.createPlayerProfile('p1', { name: 'Alice' });
    assert.strictEqual(p.name, 'Alice');
  });

  test('defaults name to playerId if not provided', function() {
    var p = DS.createPlayerProfile('p1', {});
    assert.strictEqual(p.name, 'p1');
  });

  test('stores all provided fields', function() {
    var p = DS.createPlayerProfile('p1', {
      name: 'Alice',
      level: 5,
      zone: 'gardens',
      spark: 100,
      questsCompleted: 3,
      reputation: 50
    });
    assert.strictEqual(p.level, 5);
    assert.strictEqual(p.zone, 'gardens');
    assert.strictEqual(p.spark, 100);
    assert.strictEqual(p.questsCompleted, 3);
    assert.strictEqual(p.reputation, 50);
  });

  test('returns null for missing playerId', function() {
    var p = DS.createPlayerProfile(null, {});
    assert(p === null);
  });

  test('uses defaults for missing fields', function() {
    var p = DS.createPlayerProfile('p1', {});
    assert.strictEqual(p.level, 1);
    assert.strictEqual(p.zone, 'nexus');
    assert.strictEqual(p.spark, 0);
  });
});

// ─── Suite 17: getPlayerLevel (XP formula) ────────────────────────────────

suite('getPlayerLevel (XP formula)', function() {
  test('level 1 at 0 XP', function() {
    assert.strictEqual(DS.getPlayerLevel(0), 1);
  });

  test('level 1 at 49 XP', function() {
    assert.strictEqual(DS.getPlayerLevel(49), 1);
  });

  test('level 2 at 50 XP', function() {
    // floor(sqrt(50/50)) + 1 = floor(1) + 1 = 2
    assert.strictEqual(DS.getPlayerLevel(50), 2);
  });

  test('level 2 at 99 XP', function() {
    // floor(sqrt(99/50)) + 1 = floor(1.407) + 1 = 2
    assert.strictEqual(DS.getPlayerLevel(99), 2);
  });

  test('level 3 at 200 XP', function() {
    // floor(sqrt(200/50)) + 1 = floor(sqrt(4)) + 1 = 2 + 1 = 3
    assert.strictEqual(DS.getPlayerLevel(200), 3);
  });

  test('level 4 at 450 XP', function() {
    // floor(sqrt(450/50)) + 1 = floor(sqrt(9)) + 1 = 3 + 1 = 4
    assert.strictEqual(DS.getPlayerLevel(450), 4);
  });

  test('level 5 at 800 XP', function() {
    // floor(sqrt(800/50)) + 1 = floor(sqrt(16)) + 1 = 4 + 1 = 5
    assert.strictEqual(DS.getPlayerLevel(800), 5);
  });

  test('capped at MAX_PLAYER_LEVEL', function() {
    assert.strictEqual(DS.getPlayerLevel(9999999), DS.MAX_PLAYER_LEVEL);
  });

  test('handles null XP gracefully', function() {
    assert.strictEqual(DS.getPlayerLevel(null), 1);
  });

  test('handles negative XP gracefully', function() {
    assert.strictEqual(DS.getPlayerLevel(-100), 1);
  });
});

// ─── Suite 18: getPlayerTitle ─────────────────────────────────────────────

suite('getPlayerTitle', function() {
  test('level 1 is Newcomer', function() {
    assert.strictEqual(DS.getPlayerTitle(1), 'Newcomer');
  });

  test('level 5 is Newcomer', function() {
    assert.strictEqual(DS.getPlayerTitle(5), 'Newcomer');
  });

  test('level 6 is Citizen', function() {
    assert.strictEqual(DS.getPlayerTitle(6), 'Citizen');
  });

  test('level 10 is Citizen', function() {
    assert.strictEqual(DS.getPlayerTitle(10), 'Citizen');
  });

  test('level 11 is Veteran', function() {
    assert.strictEqual(DS.getPlayerTitle(11), 'Veteran');
  });

  test('level 20 is Veteran', function() {
    assert.strictEqual(DS.getPlayerTitle(20), 'Veteran');
  });

  test('level 21 is Elder', function() {
    assert.strictEqual(DS.getPlayerTitle(21), 'Elder');
  });

  test('level 30 is Elder', function() {
    assert.strictEqual(DS.getPlayerTitle(30), 'Elder');
  });

  test('level 31 is Master', function() {
    assert.strictEqual(DS.getPlayerTitle(31), 'Master');
  });

  test('level 40 is Master', function() {
    assert.strictEqual(DS.getPlayerTitle(40), 'Master');
  });

  test('level 41 is Legend', function() {
    assert.strictEqual(DS.getPlayerTitle(41), 'Legend');
  });

  test('level 50 is Legend', function() {
    assert.strictEqual(DS.getPlayerTitle(50), 'Legend');
  });

  test('null level returns Newcomer', function() {
    assert.strictEqual(DS.getPlayerTitle(null), 'Newcomer');
  });
});

// ─── Suite 19: formatProfileCard ─────────────────────────────────────────

suite('formatProfileCard', function() {
  test('returns HTML string', function() {
    var p = DS.createPlayerProfile('p1', { name: 'Alice', level: 5 });
    var html = DS.formatProfileCard(p);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('includes player name', function() {
    var p = DS.createPlayerProfile('p1', { name: 'TestPlayer' });
    var html = DS.formatProfileCard(p);
    assert(html.indexOf('TestPlayer') !== -1);
  });

  test('includes level', function() {
    var p = DS.createPlayerProfile('p1', { name: 'Alice', level: 7 });
    var html = DS.formatProfileCard(p);
    assert(html.indexOf('7') !== -1);
  });

  test('includes zone', function() {
    var p = DS.createPlayerProfile('p1', { name: 'Alice', zone: 'gardens' });
    var html = DS.formatProfileCard(p);
    assert(html.indexOf('gardens') !== -1);
  });

  test('includes spark', function() {
    var p = DS.createPlayerProfile('p1', { name: 'Alice', spark: 250 });
    var html = DS.formatProfileCard(p);
    assert(html.indexOf('250') !== -1);
  });

  test('includes title', function() {
    var p = DS.createPlayerProfile('p1', { name: 'Alice', title: 'Elder' });
    var html = DS.formatProfileCard(p);
    assert(html.indexOf('Elder') !== -1);
  });

  test('escapes HTML in player name', function() {
    var p = DS.createPlayerProfile('p1', { name: '<b>hacker</b>' });
    var html = DS.formatProfileCard(p);
    assert(html.indexOf('<b>hacker</b>') === -1);
  });

  test('handles null profile gracefully', function() {
    var html = DS.formatProfileCard(null);
    assert(typeof html === 'string' && html.length > 0);
  });
});

// ─── Suite 20: searchPlayers ──────────────────────────────────────────────

suite('searchPlayers', function() {
  var profiles = [
    DS.createPlayerProfile('p1', { name: 'Alice', title: 'Veteran', zone: 'nexus' }),
    DS.createPlayerProfile('p2', { name: 'Bob', title: 'Newcomer', zone: 'gardens' }),
    DS.createPlayerProfile('p3', { name: 'Charlie', title: 'Legend', zone: 'nexus' }),
    DS.createPlayerProfile('p4', { name: 'Diana', title: 'Citizen', zone: 'wilds' })
  ];

  test('finds player by name', function() {
    var results = DS.searchPlayers(profiles, 'alice');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, 'Alice');
  });

  test('finds player by partial name (case insensitive)', function() {
    var results = DS.searchPlayers(profiles, 'ali');
    assert.strictEqual(results.length, 1);
  });

  test('finds player by title', function() {
    var results = DS.searchPlayers(profiles, 'legend');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, 'Charlie');
  });

  test('finds players by zone', function() {
    var results = DS.searchPlayers(profiles, 'nexus');
    assert.strictEqual(results.length, 2);
  });

  test('returns empty array for no matches', function() {
    var results = DS.searchPlayers(profiles, 'zzz_nomatch');
    assert.strictEqual(results.length, 0);
  });

  test('returns all profiles for empty query', function() {
    var results = DS.searchPlayers(profiles, '');
    assert.strictEqual(results.length, profiles.length);
  });

  test('handles null profiles gracefully', function() {
    var results = DS.searchPlayers(null, 'alice');
    assert(Array.isArray(results));
  });

  test('handles null query gracefully', function() {
    var results = DS.searchPlayers(profiles, null);
    assert(Array.isArray(results));
  });
});

// ─── Suite 21: createLeaderboardState ────────────────────────────────────

suite('createLeaderboardState', function() {
  test('returns object with categories', function() {
    var s = DS.createLeaderboardState();
    assert(s.categories && typeof s.categories === 'object');
  });

  test('returns object with lastUpdated', function() {
    var s = DS.createLeaderboardState();
    assert(s.hasOwnProperty('lastUpdated'));
  });

  test('categories starts empty', function() {
    var s = DS.createLeaderboardState();
    assert.strictEqual(Object.keys(s.categories).length, 0);
  });

  test('lastUpdated starts at 0', function() {
    var s = DS.createLeaderboardState();
    assert.strictEqual(s.lastUpdated, 0);
  });
});

// ─── Suite 22: updateLeaderboard ─────────────────────────────────────────

suite('updateLeaderboard', function() {
  test('stores entries for category', function() {
    var s = DS.createLeaderboardState();
    var entries = [{ playerId: 'p1', name: 'Alice', score: 100 }];
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    assert(s2.categories['spark']);
    assert.strictEqual(s2.categories['spark'].length, 1);
  });

  test('sorts entries by score descending', function() {
    var s = DS.createLeaderboardState();
    var entries = [
      { playerId: 'p1', name: 'Alice', score: 50 },
      { playerId: 'p2', name: 'Bob', score: 200 },
      { playerId: 'p3', name: 'Charlie', score: 100 }
    ];
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    var cat = s2.categories['spark'];
    assert.strictEqual(cat[0].score, 200);
    assert.strictEqual(cat[1].score, 100);
    assert.strictEqual(cat[2].score, 50);
  });

  test('keeps top 100 entries only', function() {
    var s = DS.createLeaderboardState();
    var entries = [];
    for (var i = 0; i < 110; i++) {
      entries.push({ playerId: 'p' + i, name: 'Player' + i, score: i });
    }
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    assert.strictEqual(s2.categories['spark'].length, DS.MAX_LEADERBOARD_ENTRIES);
  });

  test('updates lastUpdated timestamp', function() {
    var s = DS.createLeaderboardState();
    var s2 = DS.updateLeaderboard(s, 'spark', [{ playerId: 'p1', name: 'Alice', score: 10 }]);
    assert(s2.lastUpdated > 0);
  });

  test('does not mutate original state', function() {
    var s = DS.createLeaderboardState();
    DS.updateLeaderboard(s, 'spark', [{ playerId: 'p1', name: 'Alice', score: 10 }]);
    assert(!s.categories['spark']);
  });

  test('handles null state gracefully', function() {
    var result = DS.updateLeaderboard(null, 'spark', []);
    assert(result === null);
  });

  test('supports all leaderboard categories', function() {
    var s = DS.createLeaderboardState();
    DS.LEADERBOARD_CATEGORIES.forEach(function(cat) {
      var s2 = DS.updateLeaderboard(s, cat, [{ playerId: 'p1', name: 'Alice', score: 1 }]);
      assert(s2.categories[cat], 'Should support category: ' + cat);
    });
  });
});

// ─── Suite 23: getLeaderboard ─────────────────────────────────────────────

suite('getLeaderboard', function() {
  test('returns top 10 by default', function() {
    var s = DS.createLeaderboardState();
    var entries = [];
    for (var i = 0; i < 20; i++) {
      entries.push({ playerId: 'p' + i, name: 'P' + i, score: i });
    }
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    var result = DS.getLeaderboard(s2, 'spark');
    assert.strictEqual(result.length, 10);
  });

  test('returns custom limit', function() {
    var s = DS.createLeaderboardState();
    var entries = [];
    for (var i = 0; i < 20; i++) {
      entries.push({ playerId: 'p' + i, name: 'P' + i, score: i });
    }
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    var result = DS.getLeaderboard(s2, 'spark', 5);
    assert.strictEqual(result.length, 5);
  });

  test('returns top scores in order', function() {
    var s = DS.createLeaderboardState();
    var entries = [
      { playerId: 'p1', name: 'A', score: 10 },
      { playerId: 'p2', name: 'B', score: 30 },
      { playerId: 'p3', name: 'C', score: 20 }
    ];
    var s2 = DS.updateLeaderboard(s, 'quests', entries);
    var result = DS.getLeaderboard(s2, 'quests');
    assert.strictEqual(result[0].score, 30);
    assert.strictEqual(result[1].score, 20);
  });

  test('returns empty array for unknown category', function() {
    var s = DS.createLeaderboardState();
    var result = DS.getLeaderboard(s, 'unknown_cat');
    assert(Array.isArray(result) && result.length === 0);
  });

  test('handles null state gracefully', function() {
    var result = DS.getLeaderboard(null, 'spark');
    assert(Array.isArray(result) && result.length === 0);
  });
});

// ─── Suite 24: getPlayerRank ──────────────────────────────────────────────

suite('getPlayerRank', function() {
  test('returns rank 1 for top player', function() {
    var s = DS.createLeaderboardState();
    var entries = [
      { playerId: 'top', name: 'Top', score: 1000 },
      { playerId: 'mid', name: 'Mid', score: 500 }
    ];
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    var rank = DS.getPlayerRank(s2, 'spark', 'top');
    assert.strictEqual(rank.rank, 1);
  });

  test('returns correct score', function() {
    var s = DS.createLeaderboardState();
    var entries = [{ playerId: 'p1', name: 'A', score: 777 }];
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    var rank = DS.getPlayerRank(s2, 'spark', 'p1');
    assert.strictEqual(rank.score, 777);
  });

  test('returns total count', function() {
    var s = DS.createLeaderboardState();
    var entries = [
      { playerId: 'p1', name: 'A', score: 100 },
      { playerId: 'p2', name: 'B', score: 50 }
    ];
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    var rank = DS.getPlayerRank(s2, 'spark', 'p1');
    assert.strictEqual(rank.total, 2);
  });

  test('returns null for player not in leaderboard', function() {
    var s = DS.createLeaderboardState();
    var entries = [{ playerId: 'p1', name: 'A', score: 100 }];
    var s2 = DS.updateLeaderboard(s, 'spark', entries);
    var rank = DS.getPlayerRank(s2, 'spark', 'nobody');
    assert(rank === null);
  });

  test('returns null for unknown category', function() {
    var s = DS.createLeaderboardState();
    var rank = DS.getPlayerRank(s, 'unknown', 'p1');
    assert(rank === null);
  });

  test('handles null state gracefully', function() {
    var rank = DS.getPlayerRank(null, 'spark', 'p1');
    assert(rank === null);
  });

  test('rank 2 for second highest', function() {
    var s = DS.createLeaderboardState();
    var entries = [
      { playerId: 'p1', name: 'A', score: 100 },
      { playerId: 'p2', name: 'B', score: 200 },
      { playerId: 'p3', name: 'C', score: 150 }
    ];
    var s2 = DS.updateLeaderboard(s, 'quests', entries);
    var rank = DS.getPlayerRank(s2, 'quests', 'p3');
    assert.strictEqual(rank.rank, 2);
  });
});

// ─── Suite 25: formatLeaderboardTable ────────────────────────────────────

suite('formatLeaderboardTable', function() {
  test('returns HTML string', function() {
    var entries = [{ playerId: 'p1', name: 'Alice', score: 100 }];
    var html = DS.formatLeaderboardTable(entries, 'spark', null);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('includes player names', function() {
    var entries = [{ playerId: 'p1', name: 'Alice', score: 100 }];
    var html = DS.formatLeaderboardTable(entries, 'spark', null);
    assert(html.indexOf('Alice') !== -1);
  });

  test('includes scores', function() {
    var entries = [{ playerId: 'p1', name: 'Alice', score: 42 }];
    var html = DS.formatLeaderboardTable(entries, 'spark', null);
    assert(html.indexOf('42') !== -1);
  });

  test('includes gold badge for rank 1', function() {
    var entries = [
      { playerId: 'p1', name: 'Alice', score: 100 },
      { playerId: 'p2', name: 'Bob', score: 50 }
    ];
    var html = DS.formatLeaderboardTable(entries, 'spark', null);
    // Should have [1st] and gold color
    assert(html.indexOf('[1st]') !== -1);
    assert(html.toLowerCase().indexOf('ffd700') !== -1 || html.indexOf('#FFD700') !== -1);
  });

  test('includes silver badge for rank 2', function() {
    var entries = [
      { playerId: 'p1', name: 'Alice', score: 100 },
      { playerId: 'p2', name: 'Bob', score: 50 }
    ];
    var html = DS.formatLeaderboardTable(entries, 'spark', null);
    assert(html.indexOf('[2nd]') !== -1);
  });

  test('includes bronze badge for rank 3', function() {
    var entries = [
      { playerId: 'p1', name: 'Alice', score: 100 },
      { playerId: 'p2', name: 'Bob', score: 80 },
      { playerId: 'p3', name: 'Charlie', score: 60 }
    ];
    var html = DS.formatLeaderboardTable(entries, 'spark', null);
    assert(html.indexOf('[3rd]') !== -1);
  });

  test('handles empty entries', function() {
    var html = DS.formatLeaderboardTable([], 'spark', null);
    assert(typeof html === 'string' && html.length > 0);
  });

  test('handles null entries', function() {
    var html = DS.formatLeaderboardTable(null, 'spark', null);
    assert(typeof html === 'string');
  });

  test('includes category label in header', function() {
    var entries = [{ playerId: 'p1', name: 'Alice', score: 1 }];
    var html = DS.formatLeaderboardTable(entries, 'quests', null);
    assert(html.indexOf('quests') !== -1);
  });

  test('escapes HTML in player names', function() {
    var entries = [{ playerId: 'p1', name: '<script>xss</script>', score: 1 }];
    var html = DS.formatLeaderboardTable(entries, 'spark', null);
    assert(html.indexOf('<script>xss</script>') === -1);
  });
});

// ─── Suite 26: createSocialPanel ─────────────────────────────────────────

suite('createSocialPanel', function() {
  test('returns an object', function() {
    var panel = DS.createSocialPanel();
    assert(panel && typeof panel === 'object');
  });

  test('has expected tab names', function() {
    var panel = DS.createSocialPanel();
    // In Node.js returns mock
    assert(panel.tabs || panel._type === 'social-panel');
    if (panel.tabs) {
      assert(panel.tabs.indexOf('Chat') !== -1);
      assert(panel.tabs.indexOf('Guild') !== -1);
      assert(panel.tabs.indexOf('Players') !== -1);
      assert(panel.tabs.indexOf('Leaderboards') !== -1);
    }
  });

  test('accepts chatState option', function() {
    var chatState = DS.createChatState();
    chatState = DS.addMessage(chatState, 'global', makeMsg({ text: 'test' }));
    var panel = DS.createSocialPanel({ chatState: chatState });
    assert(panel);
  });

  test('accepts guildState option', function() {
    var guildState = DS.createGuildState();
    var panel = DS.createSocialPanel({ guildState: guildState });
    assert(panel);
  });

  test('accepts profiles option', function() {
    var profiles = [DS.createPlayerProfile('p1', { name: 'Alice' })];
    var panel = DS.createSocialPanel({ profiles: profiles });
    assert(panel);
  });

  test('accepts lbState option', function() {
    var lbState = DS.createLeaderboardState();
    var panel = DS.createSocialPanel({ lbState: lbState });
    assert(panel);
  });

  test('works with no options', function() {
    var panel = DS.createSocialPanel();
    assert(panel);
  });
});

// ─── Suite 27: Edge Cases ─────────────────────────────────────────────────

suite('Edge Cases', function() {
  test('addMessage to empty whisper channel creates it', function() {
    var s = DS.createChatState();
    var key = 'userA:userB';
    var s2 = DS.addMessage(s, key, makeMsg({ text: 'hi' }));
    assert(s2.channels.whisper[key]);
    assert.strictEqual(s2.channels.whisper[key].length, 1);
  });

  test('multiple whisper conversations are independent', function() {
    var s = DS.createChatState();
    var s2 = DS.addMessage(s, 'a:b', makeMsg({ text: 'to b' }));
    var s3 = DS.addMessage(s2, 'a:c', makeMsg({ text: 'to c' }));
    assert.strictEqual(s3.channels.whisper['a:b'].length, 1);
    assert.strictEqual(s3.channels.whisper['a:c'].length, 1);
  });

  test('guild with exactly 1 char motto is valid', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'G', 'leader1', 'x');
    assert.strictEqual(result.success, true);
  });

  test('guild name of 1 character is valid', function() {
    var s = DS.createGuildState();
    var result = DS.createGuild(s, 'X', 'leader1', 'motto');
    assert.strictEqual(result.success, true);
  });

  test('leaderboard with single entry still ranks correctly', function() {
    var s = DS.createLeaderboardState();
    var s2 = DS.updateLeaderboard(s, 'spark', [{ playerId: 'only', name: 'Only', score: 1 }]);
    var rank = DS.getPlayerRank(s2, 'spark', 'only');
    assert.strictEqual(rank.rank, 1);
    assert.strictEqual(rank.total, 1);
  });

  test('searchPlayers returns empty array for empty profiles list', function() {
    var results = DS.searchPlayers([], 'alice');
    assert(Array.isArray(results) && results.length === 0);
  });

  test('formatLeaderboardTable with single entry renders correctly', function() {
    var entries = [{ playerId: 'p1', name: 'Solo', score: 999 }];
    var html = DS.formatLeaderboardTable(entries, 'spark', null);
    assert(html.indexOf('Solo') !== -1);
    assert(html.indexOf('999') !== -1);
  });

  test('getPlayerLevel at exactly level boundary (XP=200, level 3)', function() {
    // floor(sqrt(200/50)) + 1 = floor(2) + 1 = 3
    assert.strictEqual(DS.getPlayerLevel(200), 3);
  });

  test('getPlayerTitle for level 0 returns Newcomer', function() {
    assert.strictEqual(DS.getPlayerTitle(0), 'Newcomer');
  });

  test('addMessage with undefined type defaults to chat', function() {
    var s = DS.createChatState();
    var msg = { from: 'x', text: 'y', timestamp: 1 };
    var s2 = DS.addMessage(s, 'global', msg);
    assert.strictEqual(s2.channels.global[0].type, 'chat');
  });
});

// ─── Run all tests ─────────────────────────────────────────────────────────

var ok = report();
process.exit(ok ? 0 : 1);
