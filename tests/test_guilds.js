const { test, suite, report, assert } = require('./test_runner');
const Guilds = require('../src/js/guilds');

// ─────────────────────────────────────────────────────────────
// Helper: reset module-level state between suites by re-initialising
// with an empty dataset. Because the UMD module keeps state in
// closed-over variables we call initGuilds with an explicit empty
// object so that every suite starts from a blank slate.
// ─────────────────────────────────────────────────────────────
function resetGuilds() {
  Guilds.initGuilds({
    guilds: [],
    invites: [],
    guildMessages: [],
    nextGuildId: 1,
    nextInviteId: 1,
    nextMessageId: 1
  });
}

// Convenience wrappers
function makeGuild(playerId, name, tag, type, description) {
  return Guilds.createGuild(
    playerId || 'founder1',
    name        || 'Test Guild',
    tag         || 'TST',
    type        || 'guild',
    description || 'A test guild'
  );
}

// ─────────────────────────────────────────────────────────────
// Suite 1: initGuilds / getGuildsState
// ─────────────────────────────────────────────────────────────
suite('initGuilds / getGuildsState', () => {
  test('initGuilds with no argument does nothing', () => {
    resetGuilds();
    // Calling with undefined should not throw
    Guilds.initGuilds(undefined);
    const state = Guilds.getGuildsState();
    assert.strictEqual(state.guilds.length, 0);
  });

  test('initGuilds restores saved data', () => {
    const savedData = {
      guilds: [{ id: 'guild_99', name: 'Old Guild', tag: 'OLD', members: [], activities: [] }],
      invites: [],
      guildMessages: [],
      nextGuildId: 100,
      nextInviteId: 50,
      nextMessageId: 25
    };
    Guilds.initGuilds(savedData);

    const state = Guilds.getGuildsState();
    assert.strictEqual(state.guilds.length, 1);
    assert.strictEqual(state.guilds[0].name, 'Old Guild');
    assert.strictEqual(state.nextGuildId, 100);
    assert.strictEqual(state.nextInviteId, 50);
    assert.strictEqual(state.nextMessageId, 25);
  });

  test('getGuildsState returns all expected keys', () => {
    resetGuilds();
    const state = Guilds.getGuildsState();
    assert(state.hasOwnProperty('guilds'), 'state must have guilds');
    assert(state.hasOwnProperty('invites'), 'state must have invites');
    assert(state.hasOwnProperty('guildMessages'), 'state must have guildMessages');
    assert(state.hasOwnProperty('nextGuildId'), 'state must have nextGuildId');
    assert(state.hasOwnProperty('nextInviteId'), 'state must have nextInviteId');
    assert(state.hasOwnProperty('nextMessageId'), 'state must have nextMessageId');
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 2: createGuild
// ─────────────────────────────────────────────────────────────
suite('createGuild', () => {
  test('successfully creates a guild with all required fields', () => {
    resetGuilds();
    const result = makeGuild('player1', 'Sunset Order', 'SUN', 'guild', 'Warriors of dusk');
    assert.strictEqual(result.success, true);
    assert(result.guild, 'result should contain guild object');
    assert(result.guild.id.startsWith('guild_'), 'id should start with guild_');
    assert.strictEqual(result.guild.name, 'Sunset Order');
    assert.strictEqual(result.guild.tag, 'SUN');
    assert.strictEqual(result.guild.type, 'guild');
    assert.strictEqual(result.guild.description, 'Warriors of dusk');
    assert.strictEqual(result.guild.founder, 'player1');
    assert.strictEqual(result.guild.level, 1);
    assert.strictEqual(result.guild.xp, 0);
    assert.strictEqual(result.guild.treasury, 0);
    assert.strictEqual(result.guild.maxMembers, 20);
  });

  test('founder is automatically the first member with leader role', () => {
    resetGuilds();
    const result = makeGuild('alice');
    assert.strictEqual(result.success, true);
    const members = result.guild.members;
    assert.strictEqual(members.length, 1);
    assert.strictEqual(members[0].playerId, 'alice');
    assert.strictEqual(members[0].role, 'leader');
  });

  test('founder appears in guild leaders array', () => {
    resetGuilds();
    const result = makeGuild('alice');
    assert(result.guild.leaders.includes('alice'), 'alice should be in leaders');
  });

  test('returns creation cost', () => {
    resetGuilds();
    const result = makeGuild('alice');
    assert.strictEqual(result.cost, 100);
  });

  test('fails when playerId is missing', () => {
    resetGuilds();
    const result = Guilds.createGuild('', 'Test', 'TST', 'guild', '');
    assert.strictEqual(result.success, false);
    assert(result.error, 'should have error message');
  });

  test('fails when name is missing', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', '', 'TST', 'guild', '');
    assert.strictEqual(result.success, false);
  });

  test('fails when tag is missing', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', 'Test', '', 'guild', '');
    assert.strictEqual(result.success, false);
  });

  test('fails when type is missing', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', 'Test', 'TST', '', '');
    assert.strictEqual(result.success, false);
  });

  test('fails when tag is too short (< 3 chars)', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', 'Test Guild', 'AB', 'guild', '');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('3-5'), 'error should mention tag length');
  });

  test('fails when tag is too long (> 5 chars)', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', 'Test Guild', 'TOOLONG', 'guild', '');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('3-5'), 'error should mention tag length');
  });

  test('accepts tag of exactly 3 characters', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', 'Alpha Guild', 'ALF', 'guild', '');
    assert.strictEqual(result.success, true);
  });

  test('accepts tag of exactly 5 characters', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', 'Alpha Guild', 'ALPHA', 'guild', '');
    assert.strictEqual(result.success, true);
  });

  test('fails with invalid guild type', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', 'Test Guild', 'TST', 'clan', '');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Invalid guild type'), 'error should mention invalid type');
  });

  test('accepts all valid guild types: guild, garden, studio, community', () => {
    const types = ['guild', 'garden', 'studio', 'community'];
    types.forEach(function(type, i) {
      resetGuilds();
      const result = Guilds.createGuild('player' + i, 'Guild ' + i, 'G' + i + 'X', type, '');
      assert.strictEqual(result.success, true, 'type ' + type + ' should be valid');
    });
  });

  test('fails when player is already in a guild', () => {
    resetGuilds();
    makeGuild('alice', 'First Guild', 'FST', 'guild', '');
    const result = Guilds.createGuild('alice', 'Second Guild', 'SND', 'guild', '');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Already in a guild'), 'error should say already in guild');
  });

  test('fails when guild name is already taken', () => {
    resetGuilds();
    makeGuild('alice', 'Unique Name', 'UN1', 'guild', '');
    const result = Guilds.createGuild('bob', 'Unique Name', 'UN2', 'guild', '');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('name already taken'), 'error should mention name conflict');
  });

  test('fails when guild tag is already taken', () => {
    resetGuilds();
    makeGuild('alice', 'Guild Alpha', 'TAG', 'guild', '');
    const result = Guilds.createGuild('bob', 'Guild Beta', 'TAG', 'guild', '');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('tag already taken'), 'error should mention tag conflict');
  });

  test('description defaults to empty string when omitted', () => {
    resetGuilds();
    const result = Guilds.createGuild('player1', 'Bare Guild', 'BRE', 'guild');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.guild.description, '');
  });

  test('new guild has default banner', () => {
    resetGuilds();
    const result = makeGuild('player1');
    assert(result.guild.banner, 'banner should exist');
    assert(result.guild.banner.primaryColor, 'banner should have primaryColor');
    assert(result.guild.banner.icon, 'banner should have icon');
  });

  test('new guild has open setting true by default', () => {
    resetGuilds();
    const result = makeGuild('player1');
    assert.strictEqual(result.guild.settings.open, true);
  });

  test('new guild activities log is populated with founding event', () => {
    resetGuilds();
    const result = makeGuild('player1', 'My Guild', 'MYG', 'guild', '');
    assert(result.guild.activities.length > 0, 'activities should include founding event');
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 3: disbandGuild
// ─────────────────────────────────────────────────────────────
suite('disbandGuild', () => {
  test('founder can disband their guild', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.disbandGuild(created.guild.id, 'alice');
    assert.strictEqual(result.success, true);
    assert.strictEqual(Guilds.getGuild(created.guild.id), null, 'guild should be gone');
  });

  test('non-founder cannot disband', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.disbandGuild(created.guild.id, 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('founder'), 'error should mention founder');
  });

  test('disbanding nonexistent guild fails', () => {
    resetGuilds();
    const result = Guilds.disbandGuild('guild_9999', 'alice');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });

  test('disbanding removes associated invites', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    // Issue an invite
    Guilds.inviteToGuild(guildId, 'alice', 'bob');
    // Disband
    Guilds.disbandGuild(guildId, 'alice');
    // Bob's pending invites should be empty
    const pending = Guilds.getPendingInvites('bob');
    assert.strictEqual(pending.length, 0, 'invites should be cleaned up');
  });

  test('after disband, getPlayerGuild returns null for former founder', () => {
    resetGuilds();
    const created = makeGuild('alice');
    Guilds.disbandGuild(created.guild.id, 'alice');
    assert.strictEqual(Guilds.getPlayerGuild('alice'), null);
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 4: Invite flow (inviteToGuild / acceptInvite / declineInvite)
// ─────────────────────────────────────────────────────────────
suite('Invite flow', () => {
  test('leader can invite a player', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    assert.strictEqual(result.success, true);
    assert(result.invite, 'should return invite object');
    assert.strictEqual(result.invite.status, 'pending');
    assert.strictEqual(result.invite.targetId, 'bob');
  });

  test('invite includes guild name and tag', () => {
    resetGuilds();
    const created = makeGuild('alice', 'Fancy Guild', 'FNC', 'guild', '');
    const result = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    assert.strictEqual(result.invite.guildName, 'Fancy Guild');
    assert.strictEqual(result.invite.guildTag, 'FNC');
  });

  test('regular member cannot invite', () => {
    resetGuilds();
    const created = makeGuild('alice');
    // Force-add bob as member
    const guild = Guilds.getGuild(created.guild.id);
    guild.members.push({ playerId: 'bob', role: 'member', joinedAt: Date.now() });
    const result = Guilds.inviteToGuild(created.guild.id, 'bob', 'charlie');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('permission'), 'error should say no permission');
  });

  test('officer can invite', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guild = Guilds.getGuild(created.guild.id);
    guild.members.push({ playerId: 'bob', role: 'officer', joinedAt: Date.now() });
    const result = Guilds.inviteToGuild(created.guild.id, 'bob', 'charlie');
    assert.strictEqual(result.success, true);
  });

  test('cannot invite player already in this guild', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guild = Guilds.getGuild(created.guild.id);
    guild.members.push({ playerId: 'bob', role: 'member', joinedAt: Date.now() });
    const result = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('already in guild'), 'error should mention already in guild');
  });

  test('cannot invite player who is in another guild', () => {
    resetGuilds();
    const g1 = makeGuild('alice', 'Guild A', 'GA1', 'guild', '');
    const g2 = makeGuild('bob', 'Guild B', 'GB2', 'guild', '');
    // charlie joins guild B
    const invite = Guilds.inviteToGuild(g2.guild.id, 'bob', 'charlie');
    Guilds.acceptInvite(invite.invite.id, 'charlie');

    // Now alice tries to invite charlie to guild A
    const result = Guilds.inviteToGuild(g1.guild.id, 'alice', 'charlie');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('another guild'), 'error should mention another guild');
  });

  test('duplicate invite is rejected', () => {
    resetGuilds();
    const created = makeGuild('alice');
    Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    const result = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('already sent'), 'error should say invite already sent');
  });

  test('invite fails when guild not found', () => {
    resetGuilds();
    const result = Guilds.inviteToGuild('guild_9999', 'alice', 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });

  test('acceptInvite adds player to guild as member', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    const result = Guilds.acceptInvite(inv.invite.id, 'bob');
    assert.strictEqual(result.success, true);
    const guild = Guilds.getGuild(created.guild.id);
    const member = guild.members.find(function(m) { return m.playerId === 'bob'; });
    assert(member, 'bob should now be a member');
    assert.strictEqual(member.role, 'member');
  });

  test('acceptInvite marks invite as accepted', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');
    const state = Guilds.getGuildsState();
    const invite = state.invites.find(function(i) { return i.id === inv.invite.id; });
    assert.strictEqual(invite.status, 'accepted');
  });

  test('acceptInvite fails when invite does not exist', () => {
    resetGuilds();
    const result = Guilds.acceptInvite('invite_9999', 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });

  test('acceptInvite fails when wrong player tries to accept', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    const result = Guilds.acceptInvite(inv.invite.id, 'charlie');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not for this player'));
  });

  test('acceptInvite fails when invite already accepted', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');
    const result = Guilds.acceptInvite(inv.invite.id, 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('already responded'));
  });

  test('acceptInvite fails when player already in a guild', () => {
    resetGuilds();
    const g1 = makeGuild('alice', 'Guild A', 'GA1', 'guild', '');
    const g2 = makeGuild('bob', 'Guild B', 'GB2', 'guild', '');
    const inv = Guilds.inviteToGuild(g1.guild.id, 'alice', 'charlie');
    // charlie joins guild B directly (simulate)
    const g2Invite = Guilds.inviteToGuild(g2.guild.id, 'bob', 'charlie');
    Guilds.acceptInvite(g2Invite.invite.id, 'charlie');
    // Now charlie tries to accept first invite
    const result = Guilds.acceptInvite(inv.invite.id, 'charlie');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Already in a guild'));
  });

  test('declineInvite marks invite as declined', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    const result = Guilds.declineInvite(inv.invite.id, 'bob');
    assert.strictEqual(result.success, true);
    const state = Guilds.getGuildsState();
    const invite = state.invites.find(function(i) { return i.id === inv.invite.id; });
    assert.strictEqual(invite.status, 'declined');
  });

  test('declineInvite fails for wrong player', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    const result = Guilds.declineInvite(inv.invite.id, 'charlie');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not for this player'));
  });

  test('declineInvite fails when already declined', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    Guilds.declineInvite(inv.invite.id, 'bob');
    const result = Guilds.declineInvite(inv.invite.id, 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('already responded'));
  });

  test('getPendingInvites returns only non-expired pending invites for player', () => {
    resetGuilds();
    const created = makeGuild('alice');
    Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    const pending = Guilds.getPendingInvites('bob');
    assert.strictEqual(pending.length, 1);
    assert.strictEqual(pending[0].targetId, 'bob');
    assert.strictEqual(pending[0].status, 'pending');
  });

  test('getPendingInvites returns empty for player with no invites', () => {
    resetGuilds();
    const pending = Guilds.getPendingInvites('nobody');
    assert.strictEqual(pending.length, 0);
  });

  test('getPendingInvites excludes accepted invites', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');
    // bob is now in guild, pending list should be empty
    const pending = Guilds.getPendingInvites('bob');
    assert.strictEqual(pending.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 5: leaveGuild
// ─────────────────────────────────────────────────────────────
suite('leaveGuild', () => {
  test('member can leave a guild', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');

    const result = Guilds.leaveGuild(guildId, 'bob');
    assert.strictEqual(result.success, true);
    const guild = Guilds.getGuild(guildId);
    const stillMember = guild.members.some(function(m) { return m.playerId === 'bob'; });
    assert.strictEqual(stillMember, false, 'bob should no longer be a member');
  });

  test('founder cannot leave — must disband', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.leaveGuild(created.guild.id, 'alice');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('disband'), 'error should mention disband');
  });

  test('non-member cannot leave', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.leaveGuild(created.guild.id, 'stranger');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Not a member'));
  });

  test('leaveGuild fails for nonexistent guild', () => {
    resetGuilds();
    const result = Guilds.leaveGuild('guild_9999', 'alice');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });

  test('leaving removes player from leaders array if they were a leader', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    // Invite and accept bob
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');
    // Promote bob to leader
    Guilds.promoteRole(guildId, 'alice', 'bob', 'leader');
    // Bob leaves
    Guilds.leaveGuild(guildId, 'bob');
    const guild = Guilds.getGuild(guildId);
    assert(!guild.leaders.includes('bob'), 'bob should be removed from leaders');
  });

  test('getPlayerGuild returns null after leaving', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const inv = Guilds.inviteToGuild(created.guild.id, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');
    Guilds.leaveGuild(created.guild.id, 'bob');
    assert.strictEqual(Guilds.getPlayerGuild('bob'), null);
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 6: kickMember
// ─────────────────────────────────────────────────────────────
suite('kickMember', () => {
  test('leader can kick a regular member', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');

    const result = Guilds.kickMember(guildId, 'alice', 'bob');
    assert.strictEqual(result.success, true);
    const guild = Guilds.getGuild(guildId);
    assert(!guild.members.some(function(m) { return m.playerId === 'bob'; }), 'bob should be removed');
  });

  test('officer can kick a regular member', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'officer', joinedAt: Date.now() });
    guild.members.push({ playerId: 'charlie', role: 'member', joinedAt: Date.now() });

    const result = Guilds.kickMember(guildId, 'bob', 'charlie');
    assert.strictEqual(result.success, true);
  });

  test('officer cannot kick another officer', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'officer', joinedAt: Date.now() });
    guild.members.push({ playerId: 'charlie', role: 'officer', joinedAt: Date.now() });

    const result = Guilds.kickMember(guildId, 'bob', 'charlie');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Insufficient permission'));
  });

  test('officer cannot kick a leader', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'officer', joinedAt: Date.now() });
    // alice is both founder and leader — the founder check fires first
    const result = Guilds.kickMember(guildId, 'bob', 'alice');
    assert.strictEqual(result.success, false);
    // The module protects the founder first; that error is equally valid
    assert(result.error, 'should return an error');
  });

  test('regular member cannot kick anyone', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'member', joinedAt: Date.now() });
    guild.members.push({ playerId: 'charlie', role: 'member', joinedAt: Date.now() });

    const result = Guilds.kickMember(guildId, 'bob', 'charlie');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('No permission'));
  });

  test('cannot kick the founder', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'leader', joinedAt: Date.now() });
    guild.leaders.push('bob');

    const result = Guilds.kickMember(guildId, 'bob', 'alice');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Cannot kick founder'));
  });

  test('cannot kick yourself', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    // Add bob as a second leader (not the founder) so the founder-guard is skipped
    guild.members.push({ playerId: 'bob', role: 'leader', joinedAt: Date.now() });
    guild.leaders.push('bob');
    const result = Guilds.kickMember(guildId, 'bob', 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Cannot kick yourself'));
  });

  test('kicking nonexistent guild fails', () => {
    resetGuilds();
    const result = Guilds.kickMember('guild_9999', 'alice', 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });

  test('kicking player not in guild fails', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.kickMember(created.guild.id, 'alice', 'stranger');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not in guild'));
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 7: promoteRole
// ─────────────────────────────────────────────────────────────
suite('promoteRole', () => {
  test('leader can promote member to officer', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'member', joinedAt: Date.now() });

    const result = Guilds.promoteRole(guildId, 'alice', 'bob', 'officer');
    assert.strictEqual(result.success, true);
    const member = guild.members.find(function(m) { return m.playerId === 'bob'; });
    assert.strictEqual(member.role, 'officer');
  });

  test('leader can promote member to leader', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'member', joinedAt: Date.now() });

    Guilds.promoteRole(guildId, 'alice', 'bob', 'leader');
    const member = guild.members.find(function(m) { return m.playerId === 'bob'; });
    assert.strictEqual(member.role, 'leader');
    assert(guild.leaders.includes('bob'), 'bob should be in leaders array');
  });

  test('leader can demote officer to member', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'officer', joinedAt: Date.now() });

    const result = Guilds.promoteRole(guildId, 'alice', 'bob', 'member');
    assert.strictEqual(result.success, true);
    const member = guild.members.find(function(m) { return m.playerId === 'bob'; });
    assert.strictEqual(member.role, 'member');
  });

  test('non-leader cannot promote', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'officer', joinedAt: Date.now() });
    guild.members.push({ playerId: 'charlie', role: 'member', joinedAt: Date.now() });

    const result = Guilds.promoteRole(guildId, 'bob', 'charlie', 'officer');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Only leaders can promote'));
  });

  test('cannot demote the founder', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'leader', joinedAt: Date.now() });
    guild.leaders.push('bob');

    const result = Guilds.promoteRole(guildId, 'bob', 'alice', 'member');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Cannot demote founder'));
  });

  test('fails with invalid role', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guild = Guilds.getGuild(created.guild.id);
    guild.members.push({ playerId: 'bob', role: 'member', joinedAt: Date.now() });

    const result = Guilds.promoteRole(created.guild.id, 'alice', 'bob', 'god');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Invalid role'));
  });

  test('fails when target not in guild', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.promoteRole(created.guild.id, 'alice', 'stranger', 'officer');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not in guild'));
  });

  test('demoting a leader removes them from leaders array', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    guild.members.push({ playerId: 'bob', role: 'leader', joinedAt: Date.now() });
    guild.leaders.push('bob');

    Guilds.promoteRole(guildId, 'alice', 'bob', 'member');
    assert(!guild.leaders.includes('bob'), 'bob should be removed from leaders');
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 8: Member limits
// ─────────────────────────────────────────────────────────────
suite('Member limits', () => {
  test('guild starts with maxMembers 20 (level 1)', () => {
    resetGuilds();
    const created = makeGuild('alice');
    assert.strictEqual(created.guild.maxMembers, 20);
  });

  test('invite rejected when guild is at maxMembers', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const guild = Guilds.getGuild(guildId);
    // Fill to max (founder already counts as 1)
    for (var i = 0; i < 19; i++) {
      guild.members.push({ playerId: 'filler' + i, role: 'member', joinedAt: Date.now() });
    }
    assert.strictEqual(guild.members.length, 20);

    const result = Guilds.inviteToGuild(guildId, 'alice', 'newPlayer');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('full'), 'error should say guild is full');
  });

  test('acceptInvite rejected when guild is full', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    // Issue invite before filling
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    // Now fill to max
    const guild = Guilds.getGuild(guildId);
    for (var j = 0; j < 19; j++) {
      guild.members.push({ playerId: 'filler' + j, role: 'member', joinedAt: Date.now() });
    }
    // Try to accept — guild is now at 20 members (founder + 19 fillers)
    const result = Guilds.acceptInvite(inv.invite.id, 'bob');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('full'), 'error should say guild is full');
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 9: Treasury operations
// ─────────────────────────────────────────────────────────────
suite('Treasury operations', () => {
  test('treasury starts at 0', () => {
    resetGuilds();
    const created = makeGuild('alice');
    assert.strictEqual(created.guild.treasury, 0);
  });

  test('any member can deposit to treasury', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');

    const result = Guilds.depositToTreasury(guildId, 'bob', 250);
    assert.strictEqual(result.success, true);
    assert.strictEqual(Guilds.getGuild(guildId).treasury, 250);
  });

  test('founder can deposit to treasury', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.depositToTreasury(created.guild.id, 'alice', 100);
    assert.strictEqual(result.success, true);
    assert.strictEqual(Guilds.getGuild(created.guild.id).treasury, 100);
  });

  test('multiple deposits accumulate correctly', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    Guilds.depositToTreasury(guildId, 'alice', 50);
    Guilds.depositToTreasury(guildId, 'alice', 150);
    assert.strictEqual(Guilds.getGuild(guildId).treasury, 200);
  });

  test('deposit fails for non-member', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.depositToTreasury(created.guild.id, 'stranger', 100);
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Not a member'));
  });

  test('deposit fails with amount <= 0', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const r1 = Guilds.depositToTreasury(created.guild.id, 'alice', 0);
    const r2 = Guilds.depositToTreasury(created.guild.id, 'alice', -10);
    assert.strictEqual(r1.success, false, 'zero amount should fail');
    assert.strictEqual(r2.success, false, 'negative amount should fail');
    assert(r1.error.includes('Invalid amount'));
    assert(r2.error.includes('Invalid amount'));
  });

  test('only leader can withdraw from treasury', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    Guilds.depositToTreasury(guildId, 'alice', 500);
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');

    const result = Guilds.withdrawFromTreasury(guildId, 'bob', 100);
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Only leaders'), 'error should say leaders only');
  });

  test('leader can withdraw from treasury', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    Guilds.depositToTreasury(guildId, 'alice', 500);

    const result = Guilds.withdrawFromTreasury(guildId, 'alice', 200);
    assert.strictEqual(result.success, true);
    assert.strictEqual(Guilds.getGuild(guildId).treasury, 300);
  });

  test('withdrawal fails with insufficient funds', () => {
    resetGuilds();
    const created = makeGuild('alice');
    Guilds.depositToTreasury(created.guild.id, 'alice', 50);

    const result = Guilds.withdrawFromTreasury(created.guild.id, 'alice', 100);
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Insufficient treasury'));
  });

  test('withdrawal fails with amount <= 0', () => {
    resetGuilds();
    const created = makeGuild('alice');
    Guilds.depositToTreasury(created.guild.id, 'alice', 100);
    const r1 = Guilds.withdrawFromTreasury(created.guild.id, 'alice', 0);
    const r2 = Guilds.withdrawFromTreasury(created.guild.id, 'alice', -5);
    assert.strictEqual(r1.success, false);
    assert.strictEqual(r2.success, false);
  });

  test('withdrawal fails for nonexistent guild', () => {
    resetGuilds();
    const result = Guilds.withdrawFromTreasury('guild_9999', 'alice', 10);
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });

  test('deposit fails for nonexistent guild', () => {
    resetGuilds();
    const result = Guilds.depositToTreasury('guild_9999', 'alice', 10);
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 10: Guild XP and levelling
// ─────────────────────────────────────────────────────────────
suite('Guild XP and levelling', () => {
  test('addGuildXP increases guild xp', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;

    const result = Guilds.addGuildXP(guildId, 100, 'Quest completed');
    assert.strictEqual(result.success, true);
    assert.strictEqual(Guilds.getGuild(guildId).xp, 100);
  });

  test('addGuildXP returns leveledUp false when below threshold', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.addGuildXP(created.guild.id, 100, '');
    assert.strictEqual(result.leveledUp, false);
  });

  test('guild levels up at 500 XP (level 2)', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;

    const result = Guilds.addGuildXP(guildId, 500, 'Big milestone');
    assert.strictEqual(result.leveledUp, true);
    assert.strictEqual(result.newLevel, 2);
    assert.strictEqual(Guilds.getGuild(guildId).level, 2);
  });

  test('maxMembers increases on level up to level 2 (30 slots)', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    Guilds.addGuildXP(guildId, 500, '');
    assert.strictEqual(Guilds.getGuild(guildId).maxMembers, 30);
  });

  test('guild levels up at 1500 XP (level 3)', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    Guilds.addGuildXP(guildId, 1500, '');
    assert.strictEqual(Guilds.getGuild(guildId).level, 3);
    assert.strictEqual(Guilds.getGuild(guildId).maxMembers, 40);
  });

  test('guild levels up at 3000 XP (level 4)', () => {
    resetGuilds();
    const created = makeGuild('alice');
    Guilds.addGuildXP(created.guild.id, 3000, '');
    assert.strictEqual(Guilds.getGuild(created.guild.id).level, 4);
    assert.strictEqual(Guilds.getGuild(created.guild.id).maxMembers, 50);
  });

  test('guild levels up at 6000 XP (level 5, max)', () => {
    resetGuilds();
    const created = makeGuild('alice');
    Guilds.addGuildXP(created.guild.id, 6000, '');
    assert.strictEqual(Guilds.getGuild(created.guild.id).level, 5);
    assert.strictEqual(Guilds.getGuild(created.guild.id).maxMembers, 60);
  });

  test('addGuildXP fails for nonexistent guild', () => {
    resetGuilds();
    const result = Guilds.addGuildXP('guild_9999', 100, '');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.leveledUp, false);
  });

  test('XP accumulates across multiple calls', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    Guilds.addGuildXP(guildId, 200, '');
    Guilds.addGuildXP(guildId, 300, '');
    assert.strictEqual(Guilds.getGuild(guildId).xp, 500);
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 11: Guild lookup and search
// ─────────────────────────────────────────────────────────────
suite('Guild lookup and search', () => {
  test('getGuild returns guild by id', () => {
    resetGuilds();
    const created = makeGuild('alice', 'Find Me', 'FME', 'guild', '');
    const guild = Guilds.getGuild(created.guild.id);
    assert(guild, 'guild should be found');
    assert.strictEqual(guild.name, 'Find Me');
  });

  test('getGuild returns null for unknown id', () => {
    resetGuilds();
    assert.strictEqual(Guilds.getGuild('guild_9999'), null);
  });

  test('getPlayerGuild returns guild when player is member', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guild = Guilds.getPlayerGuild('alice');
    assert(guild, 'alice should have a guild');
    assert.strictEqual(guild.id, created.guild.id);
  });

  test('getPlayerGuild returns null when player has no guild', () => {
    resetGuilds();
    assert.strictEqual(Guilds.getPlayerGuild('nobody'), null);
  });

  test('getGuildMembers returns all members with roles', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');

    const members = Guilds.getGuildMembers(guildId);
    assert.strictEqual(members.length, 2);
    const aliceMember = members.find(function(m) { return m.playerId === 'alice'; });
    const bobMember = members.find(function(m) { return m.playerId === 'bob'; });
    assert(aliceMember, 'alice should be in member list');
    assert.strictEqual(aliceMember.role, 'leader');
    assert(bobMember, 'bob should be in member list');
    assert.strictEqual(bobMember.role, 'member');
  });

  test('getGuildMembers returns empty array for nonexistent guild', () => {
    resetGuilds();
    const members = Guilds.getGuildMembers('guild_9999');
    assert.strictEqual(members.length, 0);
  });

  test('searchGuilds finds guilds by name (case-insensitive)', () => {
    resetGuilds();
    makeGuild('alice', 'Dragon Slayers', 'DRG', 'guild', '');
    makeGuild('bob', 'Night Hawks', 'NHK', 'guild', '');
    const results = Guilds.searchGuilds('dragon');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, 'Dragon Slayers');
  });

  test('searchGuilds finds guilds by tag (case-insensitive)', () => {
    resetGuilds();
    makeGuild('alice', 'Dragon Slayers', 'DRG', 'guild', '');
    makeGuild('bob', 'Night Hawks', 'NHK', 'guild', '');
    const results = Guilds.searchGuilds('nhk');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].name, 'Night Hawks');
  });

  test('searchGuilds returns empty when no match', () => {
    resetGuilds();
    makeGuild('alice', 'Dragon Slayers', 'DRG', 'guild', '');
    const results = Guilds.searchGuilds('zzznotexist');
    assert.strictEqual(results.length, 0);
  });

  test('searchGuilds returns multiple matches', () => {
    resetGuilds();
    makeGuild('alice', 'Fire Guild', 'FGD', 'guild', '');
    makeGuild('bob', 'Fire Starters', 'FST', 'guild', '');
    makeGuild('charlie', 'Ice Order', 'ICE', 'guild', '');
    const results = Guilds.searchGuilds('fire');
    assert.strictEqual(results.length, 2);
  });

  test('getGuildsByType returns guilds of correct type only', () => {
    resetGuilds();
    makeGuild('alice', 'Garden A', 'GA1', 'garden', '');
    makeGuild('bob', 'Studio B', 'SB2', 'studio', '');
    makeGuild('charlie', 'Garden C', 'GC3', 'garden', '');

    const gardens = Guilds.getGuildsByType('garden');
    assert.strictEqual(gardens.length, 2);
    gardens.forEach(function(g) {
      assert.strictEqual(g.type, 'garden');
    });
  });

  test('getGuildsByType returns empty for type with no guilds', () => {
    resetGuilds();
    makeGuild('alice', 'Garden A', 'GA1', 'garden', '');
    const communities = Guilds.getGuildsByType('community');
    assert.strictEqual(communities.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 12: Guild leaderboard
// ─────────────────────────────────────────────────────────────
suite('Guild leaderboard', () => {
  test('getGuildLeaderboard returns guilds sorted by XP descending', () => {
    resetGuilds();
    const g1 = makeGuild('alice', 'Guild A', 'GA1', 'guild', '');
    const g2 = makeGuild('bob', 'Guild B', 'GB2', 'guild', '');
    Guilds.addGuildXP(g1.guild.id, 100, '');
    Guilds.addGuildXP(g2.guild.id, 300, '');

    const board = Guilds.getGuildLeaderboard();
    assert(board.length >= 2);
    assert.strictEqual(board[0].name, 'Guild B', 'highest XP guild first');
    assert.strictEqual(board[1].name, 'Guild A');
  });

  test('getGuildLeaderboard limits to 10 entries', () => {
    resetGuilds();
    for (var i = 0; i < 12; i++) {
      var tag = 'G' + (i < 10 ? '0' + i : i);
      Guilds.createGuild('player' + i, 'Guild ' + i, tag, 'guild', '');
    }
    const board = Guilds.getGuildLeaderboard();
    assert(board.length <= 10, 'leaderboard should be capped at 10');
  });

  test('leaderboard entries contain expected fields', () => {
    resetGuilds();
    makeGuild('alice', 'Test Guild', 'TST', 'guild', '');
    const board = Guilds.getGuildLeaderboard();
    assert.strictEqual(board.length, 1);
    const entry = board[0];
    assert(entry.hasOwnProperty('id'));
    assert(entry.hasOwnProperty('name'));
    assert(entry.hasOwnProperty('tag'));
    assert(entry.hasOwnProperty('type'));
    assert(entry.hasOwnProperty('level'));
    assert(entry.hasOwnProperty('xp'));
    assert(entry.hasOwnProperty('memberCount'));
  });

  test('leaderboard memberCount reflects current membership', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');

    const board = Guilds.getGuildLeaderboard();
    assert.strictEqual(board[0].memberCount, 2);
  });

  test('getGuildLeaderboard returns empty array when no guilds', () => {
    resetGuilds();
    const board = Guilds.getGuildLeaderboard();
    assert.strictEqual(board.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 13: Guild banner
// ─────────────────────────────────────────────────────────────
suite('Guild banner', () => {
  test('leader can set guild banner', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const banner = { primaryColor: '#FF0000', secondaryColor: '#0000FF', icon: 'flame' };
    const result = Guilds.setGuildBanner(created.guild.id, 'alice', banner);
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(Guilds.getGuild(created.guild.id).banner, banner);
  });

  test('non-leader cannot set guild banner', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');

    const result = Guilds.setGuildBanner(guildId, 'bob', { primaryColor: '#FF0000' });
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Only leaders'));
  });

  test('setGuildBanner fails for nonexistent guild', () => {
    resetGuilds();
    const result = Guilds.setGuildBanner('guild_9999', 'alice', {});
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 14: Guild messages
// ─────────────────────────────────────────────────────────────
suite('Guild messages', () => {
  test('member can send guild message', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.sendGuildMessage(created.guild.id, 'alice', 'Hello guild!');
    assert.strictEqual(result.success, true);
    assert(result.message, 'should return message object');
    assert.strictEqual(result.message.text, 'Hello guild!');
    assert.strictEqual(result.message.playerId, 'alice');
  });

  test('non-member cannot send guild message', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.sendGuildMessage(created.guild.id, 'stranger', 'Infiltration!');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Not a member'));
  });

  test('sendGuildMessage fails for nonexistent guild', () => {
    resetGuilds();
    const result = Guilds.sendGuildMessage('guild_9999', 'alice', 'Hello');
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });

  test('getGuildMessages returns messages for the guild', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    Guilds.sendGuildMessage(guildId, 'alice', 'First message');
    Guilds.sendGuildMessage(guildId, 'alice', 'Second message');
    const messages = Guilds.getGuildMessages(guildId);
    assert.strictEqual(messages.length, 2);
  });

  test('getGuildMessages respects limit parameter', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    for (var i = 0; i < 10; i++) {
      Guilds.sendGuildMessage(guildId, 'alice', 'Message ' + i);
    }
    const messages = Guilds.getGuildMessages(guildId, 3);
    assert.strictEqual(messages.length, 3);
  });

  test('getGuildMessages does not return messages from another guild', () => {
    resetGuilds();
    const g1 = makeGuild('alice', 'Guild A', 'GA1', 'guild', '');
    const g2 = makeGuild('bob', 'Guild B', 'GB2', 'guild', '');
    Guilds.sendGuildMessage(g1.guild.id, 'alice', 'Guild A message');
    Guilds.sendGuildMessage(g2.guild.id, 'bob', 'Guild B message');

    const g1Messages = Guilds.getGuildMessages(g1.guild.id);
    assert.strictEqual(g1Messages.length, 1);
    assert.strictEqual(g1Messages[0].text, 'Guild A message');
  });

  test('message has unique id and timestamp', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const r1 = Guilds.sendGuildMessage(created.guild.id, 'alice', 'Msg 1');
    const r2 = Guilds.sendGuildMessage(created.guild.id, 'alice', 'Msg 2');
    assert.notStrictEqual(r1.message.id, r2.message.id);
    assert(r1.message.timestamp, 'should have timestamp');
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 15: Guild activity log
// ─────────────────────────────────────────────────────────────
suite('Guild activity log', () => {
  test('getGuildActivities returns activities for a guild', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const activities = Guilds.getGuildActivities(created.guild.id);
    assert(activities.length > 0, 'at least founding activity should exist');
  });

  test('getGuildActivities respects limit parameter', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    // Generate activities via deposits
    for (var i = 0; i < 10; i++) {
      Guilds.depositToTreasury(guildId, 'alice', 10);
    }
    const all = Guilds.getGuildActivities(guildId);
    const limited = Guilds.getGuildActivities(guildId, 3);
    assert(all.length > 3, 'should have more than 3 activities');
    assert.strictEqual(limited.length, 3);
  });

  test('getGuildActivities returns empty array for nonexistent guild', () => {
    resetGuilds();
    const activities = Guilds.getGuildActivities('guild_9999');
    assert.strictEqual(activities.length, 0);
  });

  test('activities are returned most-recent first', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    Guilds.depositToTreasury(guildId, 'alice', 1);
    Guilds.depositToTreasury(guildId, 'alice', 2);
    const activities = Guilds.getGuildActivities(guildId);
    // The most recent deposit (amount 2) should appear before the earlier one
    const depositActivities = activities.filter(function(a) { return a.text.includes('deposited'); });
    assert(depositActivities.length >= 2, 'should have at least 2 deposit activities');
    // Most recent first means "2 Spark" appears before "1 Spark"
    const idxOf2 = depositActivities.findIndex(function(a) { return a.text.includes('deposited 2'); });
    const idxOf1 = depositActivities.findIndex(function(a) { return a.text.includes('deposited 1'); });
    assert(idxOf2 < idxOf1, 'most recent (2 Spark) should appear before earlier (1 Spark)');
  });

  test('activity log is capped at 50 entries', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    for (var i = 0; i < 60; i++) {
      Guilds.depositToTreasury(guildId, 'alice', 1);
    }
    const guild = Guilds.getGuild(guildId);
    assert(guild.activities.length <= 50, 'activities should be capped at 50');
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 16: updateGuildSettings
// ─────────────────────────────────────────────────────────────
suite('updateGuildSettings', () => {
  test('leader can toggle open setting to false', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.updateGuildSettings(created.guild.id, 'alice', { open: false });
    assert.strictEqual(result.success, true);
    assert.strictEqual(Guilds.getGuild(created.guild.id).settings.open, false);
  });

  test('leader can set minLevel', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const result = Guilds.updateGuildSettings(created.guild.id, 'alice', { minLevel: 10 });
    assert.strictEqual(result.success, true);
    assert.strictEqual(Guilds.getGuild(created.guild.id).settings.minLevel, 10);
  });

  test('non-leader cannot update settings', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');

    const result = Guilds.updateGuildSettings(guildId, 'bob', { open: false });
    assert.strictEqual(result.success, false);
    assert(result.error.includes('Only leaders'));
  });

  test('updateGuildSettings fails for nonexistent guild', () => {
    resetGuilds();
    const result = Guilds.updateGuildSettings('guild_9999', 'alice', { open: false });
    assert.strictEqual(result.success, false);
    assert(result.error.includes('not found'));
  });
});

// ─────────────────────────────────────────────────────────────
// Suite 17: Edge cases and integration
// ─────────────────────────────────────────────────────────────
suite('Edge cases and integration', () => {
  test('guild IDs are unique across multiple creations', () => {
    resetGuilds();
    const g1 = makeGuild('alice', 'Guild Alpha', 'ALF', 'guild', '');
    const g2 = makeGuild('bob', 'Guild Beta', 'BTA', 'guild', '');
    assert.notStrictEqual(g1.guild.id, g2.guild.id);
  });

  test('full workflow: create, invite, accept, promote, kick, leave, disband', () => {
    resetGuilds();

    // Create
    const created = makeGuild('founder', 'Epic Guild', 'EPC', 'studio', 'An epic studio');
    assert.strictEqual(created.success, true);
    const guildId = created.guild.id;

    // Invite and accept charlie
    const inv1 = Guilds.inviteToGuild(guildId, 'founder', 'charlie');
    Guilds.acceptInvite(inv1.invite.id, 'charlie');
    assert.strictEqual(Guilds.getGuild(guildId).members.length, 2);

    // Invite and accept dave
    const inv2 = Guilds.inviteToGuild(guildId, 'founder', 'dave');
    Guilds.acceptInvite(inv2.invite.id, 'dave');
    assert.strictEqual(Guilds.getGuild(guildId).members.length, 3);

    // Promote charlie to officer
    Guilds.promoteRole(guildId, 'founder', 'charlie', 'officer');
    const charlieM = Guilds.getGuild(guildId).members.find(function(m) { return m.playerId === 'charlie'; });
    assert.strictEqual(charlieM.role, 'officer');

    // Deposit to treasury
    Guilds.depositToTreasury(guildId, 'charlie', 200);
    assert.strictEqual(Guilds.getGuild(guildId).treasury, 200);

    // Add XP — should level up to 2
    Guilds.addGuildXP(guildId, 500, 'Quest complete');
    assert.strictEqual(Guilds.getGuild(guildId).level, 2);

    // Kick dave
    Guilds.kickMember(guildId, 'founder', 'dave');
    assert.strictEqual(Guilds.getGuild(guildId).members.length, 2);

    // Charlie leaves
    Guilds.leaveGuild(guildId, 'charlie');
    assert.strictEqual(Guilds.getGuild(guildId).members.length, 1);

    // Founder disbands
    const disband = Guilds.disbandGuild(guildId, 'founder');
    assert.strictEqual(disband.success, true);
    assert.strictEqual(Guilds.getGuild(guildId), null);
  });

  test('after disband, former members have no guild', () => {
    resetGuilds();
    const created = makeGuild('alice');
    const guildId = created.guild.id;
    const inv = Guilds.inviteToGuild(guildId, 'alice', 'bob');
    Guilds.acceptInvite(inv.invite.id, 'bob');
    Guilds.disbandGuild(guildId, 'alice');
    // alice's guild is gone, bob's guild is also gone
    assert.strictEqual(Guilds.getPlayerGuild('bob'), null);
  });

  test('getGuildsState round-trips through initGuilds', () => {
    resetGuilds();
    const created = makeGuild('alice', 'Persist Guild', 'PRS', 'community', 'Will persist');
    Guilds.depositToTreasury(created.guild.id, 'alice', 50);

    const savedState = Guilds.getGuildsState();

    // Re-initialise with saved state
    Guilds.initGuilds(savedState);

    const restoredGuild = Guilds.getGuild(created.guild.id);
    assert(restoredGuild, 'guild should survive round-trip');
    assert.strictEqual(restoredGuild.name, 'Persist Guild');
    assert.strictEqual(restoredGuild.treasury, 50);
  });

  test('multiple guilds can coexist independently', () => {
    resetGuilds();
    const g1 = makeGuild('alice', 'Alpha', 'ALP', 'guild', '');
    const g2 = makeGuild('bob', 'Beta', 'BET', 'guild', '');
    const g3 = makeGuild('charlie', 'Gamma', 'GAM', 'guild', '');

    Guilds.depositToTreasury(g1.guild.id, 'alice', 100);
    Guilds.addGuildXP(g2.guild.id, 1500, '');

    assert.strictEqual(Guilds.getGuild(g1.guild.id).treasury, 100);
    assert.strictEqual(Guilds.getGuild(g2.guild.id).level, 3);
    assert.strictEqual(Guilds.getGuild(g3.guild.id).treasury, 0);
    assert.strictEqual(Guilds.getGuild(g3.guild.id).level, 1);
  });
});

// ─────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────
const success = report();
process.exit(success ? 0 : 1);
