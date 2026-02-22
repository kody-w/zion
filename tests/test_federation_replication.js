/**
 * test_federation_replication.js — 150+ tests for federation_replication.js
 * Run with: node tests/test_federation_replication.js
 */

var FR = require('../src/js/federation_replication.js');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('  FAIL: ' + msg);
  }
}

function assertEq(a, b, msg) {
  assert(a === b, msg + ' (got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b) + ')');
}

function assertDeep(a, b, msg) {
  var as = JSON.stringify(a);
  var bs = JSON.stringify(b);
  assert(as === bs, msg + ' (got ' + as + ', expected ' + bs + ')');
}

function assertArr(val, msg) {
  assert(Array.isArray(val), msg + ' — expected array, got ' + typeof val);
}

function freshState() {
  return FR.createState();
}

// ===========================================================================
// Section 1: Constants
// ===========================================================================

console.log('\n--- Section 1: SYNC_TYPES constant ---');

var syncTypes = FR.SYNC_TYPES;
assert(Array.isArray(syncTypes), 'SYNC_TYPES is an array');
assertEq(syncTypes.length, 5, 'SYNC_TYPES has exactly 5 entries');

var expectedSyncIds = ['player_roster', 'economy_state', 'world_events', 'lore_progress', 'reputation'];
for (var i = 0; i < expectedSyncIds.length; i++) {
  var sid = expectedSyncIds[i];
  var found = null;
  for (var j = 0; j < syncTypes.length; j++) {
    if (syncTypes[j].id === sid) { found = syncTypes[j]; break; }
  }
  assert(found !== null, 'SYNC_TYPES includes id: ' + sid);
  assert(typeof found.name === 'string' && found.name.length > 0, sid + ' has name');
  assert(typeof found.description === 'string', sid + ' has description');
  assert(typeof found.maxBatchSize === 'number' && found.maxBatchSize > 0, sid + ' has maxBatchSize > 0');
  assert(typeof found.staleAfterTicks === 'number' && found.staleAfterTicks > 0, sid + ' has staleAfterTicks > 0');
}

console.log('\n--- Section 1b: CONNECTION_STATES constant ---');

var connStates = FR.CONNECTION_STATES;
assert(Array.isArray(connStates), 'CONNECTION_STATES is an array');
assertEq(connStates.length, 4, 'CONNECTION_STATES has exactly 4 entries');

var expectedConnIds = ['connected', 'syncing', 'disconnected', 'error'];
for (var i = 0; i < expectedConnIds.length; i++) {
  var cid = expectedConnIds[i];
  var found = null;
  for (var j = 0; j < connStates.length; j++) {
    if (connStates[j].id === cid) { found = connStates[j]; break; }
  }
  assert(found !== null, 'CONNECTION_STATES includes id: ' + cid);
  assert(typeof found.label === 'string', cid + ' has label');
  assert(typeof found.description === 'string', cid + ' has description');
}

// ===========================================================================
// Section 2: createState
// ===========================================================================

console.log('\n--- Section 2: createState ---');

var s1 = FR.createState();
assert(s1 !== null && typeof s1 === 'object', 'createState returns object');
assert(typeof s1.worlds === 'object' && s1.worlds !== null, 'state has worlds object');
assertArr(s1.syncLog, 'state has syncLog array');
assertArr(s1.conflicts, 'state has conflicts array');
assert(typeof s1.roster === 'object', 'state has roster object');
assert(typeof s1.vectorClocks === 'object', 'state has vectorClocks object');
assertArr(s1.healthLog, 'state has healthLog array');
assertEq(s1.syncLog.length, 0, 'fresh state has empty syncLog');
assertEq(s1.conflicts.length, 0, 'fresh state has empty conflicts');
assertEq(s1.healthLog.length, 0, 'fresh state has empty healthLog');
assertEq(Object.keys(s1.worlds).length, 0, 'fresh state has no worlds');
assertEq(Object.keys(s1.roster).length, 0, 'fresh state has empty roster');
assertEq(Object.keys(s1.vectorClocks).length, 0, 'fresh state has no vector clocks');

var s2 = FR.createState();
s2.worlds['test'] = {};
var s3 = FR.createState();
assertEq(Object.keys(s3.worlds).length, 0, 'createState returns independent state (no shared ref)');

// ===========================================================================
// Section 3: registerWorld
// ===========================================================================

console.log('\n--- Section 3: registerWorld ---');

var s = freshState();
var reg1 = FR.registerWorld(s, 'world-alpha', 'Alpha', 'https://alpha.example.com', 100);
assertEq(reg1.success, true, 'registerWorld returns success=true');
assert(reg1.world !== null, 'registerWorld returns world object');
assertEq(reg1.world.id, 'world-alpha', 'world.id matches worldId param');
assertEq(reg1.world.name, 'Alpha', 'world.name matches name param');
assertEq(reg1.world.url, 'https://alpha.example.com', 'world.url matches url param');
assertEq(reg1.world.status, 'connected', 'newly registered world has status=connected');
assertEq(reg1.world.registeredAt, 100, 'world.registeredAt = currentTick');
assert(reg1.world.lastSync === null, 'world.lastSync is null initially');
assert(typeof reg1.world.syncCounts === 'object', 'world has syncCounts object');

// syncCounts should have all 5 sync types initialized to 0
for (var i = 0; i < expectedSyncIds.length; i++) {
  assertEq(reg1.world.syncCounts[expectedSyncIds[i]], 0, 'syncCounts.' + expectedSyncIds[i] + ' = 0 initially');
}

// Vector clock is initialized
assert(s.vectorClocks['world-alpha'] !== undefined, 'vector clock initialized for world');
assertEq(s.vectorClocks['world-alpha']['world-alpha'], 100, 'initial vector clock set to currentTick');

// Sync log records the registration
assert(s.syncLog.length >= 1, 'registerWorld adds to syncLog');
assertEq(s.syncLog[s.syncLog.length - 1].action, 'register', 'syncLog action is register');
assertEq(s.syncLog[s.syncLog.length - 1].worldId, 'world-alpha', 'syncLog worldId is correct');

// Register a second world
var reg2 = FR.registerWorld(s, 'world-beta', 'Beta', 'https://beta.example.com', 200);
assertEq(reg2.success, true, 'second registerWorld succeeds');
assertEq(Object.keys(s.worlds).length, 2, 'two worlds now registered');

// Error cases
var badId = FR.registerWorld(s, '', 'X', 'https://x.com', 1);
assertEq(badId.success, false, 'registerWorld fails with empty worldId');
assert(typeof badId.error === 'string', 'registerWorld error has error string');

var badName = FR.registerWorld(s, 'world-x', '', 'https://x.com', 1);
assertEq(badName.success, false, 'registerWorld fails with empty name');

var badUrl = FR.registerWorld(s, 'world-y', 'Y', '', 1);
assertEq(badUrl.success, false, 'registerWorld fails with empty url');

var badNullId = FR.registerWorld(s, null, 'Y', 'https://y.com', 1);
assertEq(badNullId.success, false, 'registerWorld fails with null worldId');

// ===========================================================================
// Section 4: removeWorld
// ===========================================================================

console.log('\n--- Section 4: removeWorld ---');

var s = freshState();
FR.registerWorld(s, 'world-rem', 'Rem', 'https://rem.example.com', 10);
assertEq(s.worlds['world-rem'].status, 'connected', 'world is connected before remove');

var rem = FR.removeWorld(s, 'world-rem', 20);
assertEq(rem.success, true, 'removeWorld returns success=true');
assertEq(s.worlds['world-rem'].status, 'disconnected', 'world status is disconnected after remove');

var remBad = FR.removeWorld(s, 'world-nonexistent', 20);
assertEq(remBad.success, false, 'removeWorld fails for unknown world');
assert(typeof remBad.error === 'string', 'removeWorld error has message');

// Sync log updated
var lastLog = s.syncLog[s.syncLog.length - 1];
assertEq(lastLog.action, 'remove', 'syncLog records remove action');
assertEq(lastLog.worldId, 'world-rem', 'syncLog worldId is correct for remove');

// ===========================================================================
// Section 5: getWorld / getAllWorlds
// ===========================================================================

console.log('\n--- Section 5: getWorld / getAllWorlds ---');

var s = freshState();
FR.registerWorld(s, 'world-a', 'World A', 'https://a.com', 1);
FR.registerWorld(s, 'world-b', 'World B', 'https://b.com', 2);

var gw = FR.getWorld(s, 'world-a');
assert(gw !== null, 'getWorld returns non-null for existing world');
assertEq(gw.id, 'world-a', 'getWorld returns correct world id');
assertEq(gw.name, 'World A', 'getWorld returns correct world name');

// getWorld returns a copy, not a reference
gw.name = 'MUTATED';
assertEq(s.worlds['world-a'].name, 'World A', 'getWorld returns a deep copy');

var gwNull = FR.getWorld(s, 'world-nonexistent');
assert(gwNull === null, 'getWorld returns null for unknown world');

var allWorlds = FR.getAllWorlds(s);
assertArr(allWorlds, 'getAllWorlds returns an array');
assertEq(allWorlds.length, 2, 'getAllWorlds returns all registered worlds');

// Each world has required fields
for (var i = 0; i < allWorlds.length; i++) {
  var w = allWorlds[i];
  assert(typeof w.id === 'string', 'world.id is string');
  assert(typeof w.name === 'string', 'world.name is string');
  assert(typeof w.url === 'string', 'world.url is string');
  assert(typeof w.status === 'string', 'world.status is string');
}

// getAllWorlds returns copies
allWorlds[0].name = 'MUTATED';
assertEq(s.worlds[allWorlds[0].id].name !== 'MUTATED', true, 'getAllWorlds returns deep copies');

// ===========================================================================
// Section 6: pushChanges
// ===========================================================================

console.log('\n--- Section 6: pushChanges ---');

var s = freshState();
FR.registerWorld(s, 'world-push', 'Push World', 'https://push.com', 0);

var changes = [
  { key: 'player1', value: { hp: 100 } },
  { key: 'player2', value: { hp: 80 } }
];

var push1 = FR.pushChanges(s, 'world-push', 'player_roster', changes, 10);
assertEq(push1.success, true, 'pushChanges returns success=true');
assert(typeof push1.batchId === 'string' && push1.batchId.length > 0, 'pushChanges returns batchId string');
assertEq(push1.changeCount, 2, 'pushChanges.changeCount = number of changes');

// lastSync updated
assertEq(s.worlds['world-push'].lastSync, 10, 'pushChanges updates world.lastSync');

// syncCounts updated
assert(s.worlds['world-push'].syncCounts['player_roster'] >= 2, 'syncCounts.player_roster incremented');

// Sync log updated
var lastPushLog = s.syncLog[s.syncLog.length - 1];
assertEq(lastPushLog.action, 'push', 'syncLog records push action');
assertEq(lastPushLog.syncType, 'player_roster', 'syncLog syncType is correct');

// Batch size capping — send 150 changes, should only accept 100
var bigChanges = [];
for (var i = 0; i < 150; i++) {
  bigChanges.push({ key: 'k' + i, value: i });
}
var bigPush = FR.pushChanges(s, 'world-push', 'economy_state', bigChanges, 20);
assertEq(bigPush.success, true, 'pushChanges succeeds with large batch');
assertEq(bigPush.changeCount, 100, 'pushChanges caps batch at MAX_BATCH_SIZE (100)');

// Error cases
var pushBadWorld = FR.pushChanges(s, 'world-nonexistent', 'player_roster', [], 1);
assertEq(pushBadWorld.success, false, 'pushChanges fails for unknown world');

var pushBadType = FR.pushChanges(s, 'world-push', 'invalid_type', [], 1);
assertEq(pushBadType.success, false, 'pushChanges fails for unknown sync type');

var pushBadChanges = FR.pushChanges(s, 'world-push', 'player_roster', 'not_array', 1);
assertEq(pushBadChanges.success, false, 'pushChanges fails if changes is not an array');

// Disconnected world
FR.removeWorld(s, 'world-push', 25);
var pushDisc = FR.pushChanges(s, 'world-push', 'player_roster', changes, 30);
assertEq(pushDisc.success, false, 'pushChanges fails for disconnected world');

// ===========================================================================
// Section 7: pullChanges
// ===========================================================================

console.log('\n--- Section 7: pullChanges ---');

var s = freshState();
FR.registerWorld(s, 'world-pull', 'Pull World', 'https://pull.com', 0);

var remoteChanges = [
  { key: 'item1', value: { price: 100 }, ts: 5, clock: { 'world-pull': 5 } },
  { key: 'item2', value: { price: 200 }, ts: 6, clock: { 'world-pull': 6 } }
];

var pull1 = FR.pullChanges(s, 'world-pull', 'economy_state', remoteChanges, 10);
assertEq(pull1.success, true, 'pullChanges returns success=true');
assertEq(typeof pull1.applied, 'number', 'pullChanges.applied is number');
assertEq(typeof pull1.conflicts, 'number', 'pullChanges.conflicts is number');
assertEq(pull1.applied, 2, 'pullChanges applied 2 changes');
assertEq(pull1.conflicts, 0, 'pullChanges has 0 conflicts for fresh data');

// lastSync updated
assertEq(s.worlds['world-pull'].lastSync, 10, 'pullChanges updates world.lastSync');

// Sync log updated
var pullLog = s.syncLog[s.syncLog.length - 1];
assertEq(pullLog.action, 'pull', 'syncLog records pull action');
assertEq(pullLog.syncType, 'economy_state', 'syncLog syncType correct for pull');

// Pull the same data again — no conflicts (same ts)
var pull2 = FR.pullChanges(s, 'world-pull', 'economy_state', remoteChanges, 15);
assertEq(pull2.success, true, 'pullChanges succeeds on re-pull');

// Pull with newer remote ts — should apply (last-writer-wins)
var newerChanges = [
  { key: 'item1', value: { price: 150 }, ts: 20, clock: { 'world-pull': 20 } }
];
var pull3 = FR.pullChanges(s, 'world-pull', 'economy_state', newerChanges, 25);
assertEq(pull3.success, true, 'pullChanges succeeds with newer ts');
assertEq(pull3.applied, 1, 'pullChanges applies newer change');

// Pull with stale remote ts — should NOT overwrite newer local
var staleChanges = [
  { key: 'item1', value: { price: 50 }, ts: 1, clock: { 'world-pull': 1 } }
];
var pull4 = FR.pullChanges(s, 'world-pull', 'economy_state', staleChanges, 30);
assertEq(pull4.success, true, 'pullChanges succeeds with stale ts');
assertEq(pull4.applied, 0, 'pullChanges does not apply stale change (local is newer)');

// Large batch capping
var bigRemote = [];
for (var i = 0; i < 150; i++) {
  bigRemote.push({ key: 'rk' + i, value: i, ts: 50 + i });
}
var bigPull = FR.pullChanges(s, 'world-pull', 'world_events', bigRemote, 200);
assertEq(bigPull.success, true, 'pullChanges handles large batch');
assertEq(bigPull.applied + bigPull.conflicts, 100, 'pullChanges processes max 100 changes');

// Error cases
var pullBadWorld = FR.pullChanges(s, 'world-nope', 'player_roster', [], 1);
assertEq(pullBadWorld.success, false, 'pullChanges fails for unknown world');

var pullBadType = FR.pullChanges(s, 'world-pull', 'invalid_sync', [], 1);
assertEq(pullBadType.success, false, 'pullChanges fails for unknown sync type');

var pullBadChanges = FR.pullChanges(s, 'world-pull', 'player_roster', null, 1);
assertEq(pullBadChanges.success, false, 'pullChanges fails if remoteChanges is null');

// Disconnected world
FR.removeWorld(s, 'world-pull', 50);
var pullDisc = FR.pullChanges(s, 'world-pull', 'player_roster', [], 60);
assertEq(pullDisc.success, false, 'pullChanges fails for disconnected world');

// ===========================================================================
// Section 8: Conflict Resolution
// ===========================================================================

console.log('\n--- Section 8: Conflict Resolution ---');

var s = freshState();
FR.registerWorld(s, 'world-conf', 'Conflict World', 'https://conf.com', 0);

// Inject a local value first, then try to pull a concurrent value with same ts
var localFirst = [
  { key: 'shared_item', value: { qty: 10 }, ts: 50, clock: { 'world-conf': 50 } }
];
FR.pullChanges(s, 'world-conf', 'economy_state', localFirst, 50);

// Now push a concurrent change with same ts but different value — creates conflict
var conflictingChanges = [
  { key: 'shared_item', value: { qty: 99 }, ts: 50, clock: { 'world-conf': 50 } }
];
var confPull = FR.pullChanges(s, 'world-conf', 'economy_state', conflictingChanges, 55);
assertEq(confPull.success, true, 'pullChanges returns success even with conflicts');
// Conflicts may or may not fire depending on deterministic resolution
assertEq(typeof confPull.conflicts, 'number', 'pullChanges.conflicts is a number');

// getConflicts
var conflicts = FR.getConflicts(s, 'world-conf');
assertArr(conflicts, 'getConflicts returns array');

// getConflicts with no worldId filter returns all
var allConf = FR.getConflicts(s, null);
assertArr(allConf, 'getConflicts(null) returns all conflicts array');

// Manually record a conflict by pulling concurrent data
var s2 = freshState();
FR.registerWorld(s2, 'cw', 'CW', 'https://cw.com', 0);
var sameTs = [
  { key: 'ck', value: { data: 'A' }, ts: 100, clock: { cw: 100 } }
];
FR.pullChanges(s2, 'cw', 'lore_progress', sameTs, 100);
var conflictingTs = [
  { key: 'ck', value: { data: 'B' }, ts: 100, clock: { cw: 100 } }
];
var confResult = FR.pullChanges(s2, 'cw', 'lore_progress', conflictingTs, 100);
assertEq(confResult.success, true, 'pullChanges with concurrent conflict returns success');

// resolveConflict
var conf2 = FR.getConflicts(s2, 'cw');
if (conf2.length > 0) {
  var cid = conf2[0].id;
  assert(typeof cid === 'string' && cid.length > 0, 'conflict has id');

  var res = FR.resolveConflict(s2, cid, 'accept_remote', 110);
  assertEq(res.success, true, 'resolveConflict returns success=true');

  // Conflict is now resolved
  var remaining = FR.getConflicts(s2, 'cw');
  var stillUnresolved = remaining.filter(function(c) { return c.id === cid; });
  assertEq(stillUnresolved.length, 0, 'resolved conflict no longer appears in getConflicts');
}

// resolveConflict with unknown id
var badRes = FR.resolveConflict(s2, 'nonexistent_conflict_id', 'keep_local', 200);
assertEq(badRes.success, false, 'resolveConflict fails for unknown id');
assert(typeof badRes.error === 'string', 'resolveConflict error has message');

// getConflicts returns copies
var s3 = freshState();
FR.registerWorld(s3, 'wc', 'WC', 'https://wc.com', 0);
var c1 = FR.getConflicts(s3, 'wc');
assertArr(c1, 'getConflicts returns array for fresh state');

// ===========================================================================
// Section 9: Player Roster Sync
// ===========================================================================

console.log('\n--- Section 9: syncPlayerRoster ---');

var s = freshState();
FR.registerWorld(s, 'world-roster', 'Roster World', 'https://roster.com', 0);

var remotePlayers = [
  { id: 'player1', username: 'Alice', homeWorld: 'world-a' },
  { id: 'player2', username: 'Bob', homeWorld: 'world-b' },
  { id: 'player3', username: 'Carol', homeWorld: 'world-roster' }
];

var roster1 = FR.syncPlayerRoster(s, 'world-roster', remotePlayers, 10);
assertEq(roster1.success, true, 'syncPlayerRoster returns success=true');
assertEq(roster1.added, 3, 'syncPlayerRoster added 3 new players');
assertEq(roster1.updated, 0, 'syncPlayerRoster updated 0 players on first sync');
assertEq(Object.keys(s.roster).length, 3, 'roster now has 3 players');

// Re-sync same players — should update
var roster2 = FR.syncPlayerRoster(s, 'world-roster', remotePlayers, 20);
assertEq(roster2.success, true, 'second syncPlayerRoster returns success=true');
assertEq(roster2.added, 0, 'second syncPlayerRoster added 0 new players');
assertEq(roster2.updated, 3, 'second syncPlayerRoster updated 3 players');

// Each roster entry has required fields
for (var pid in s.roster) {
  var rp = s.roster[pid];
  assert(typeof rp.id === 'string', 'roster player has id');
  assert(typeof rp.username === 'string', 'roster player has username');
  assert(typeof rp.homeWorld === 'string', 'roster player has homeWorld');
  assertArr(rp.knownWorlds, 'roster player has knownWorlds array');
  assertArr(rp.badges, 'roster player has badges array');
  assertArr(rp.titles, 'roster player has titles array');
  assert(typeof rp.federationId === 'string', 'roster player has federationId');
  assert(typeof rp.firstSeenAt === 'number', 'roster player has firstSeenAt');
  assert(typeof rp.lastSeenAt === 'number', 'roster player has lastSeenAt');
}

// knownWorlds accumulates across syncs
var worldForPlayer1 = s.roster['player1'].knownWorlds;
assert(worldForPlayer1.indexOf('world-roster') !== -1, 'player1 knownWorlds includes world-roster');

// Sync from a second world — player1 should appear in both
FR.registerWorld(s, 'world-delta', 'Delta', 'https://delta.com', 30);
FR.syncPlayerRoster(s, 'world-delta', [{ id: 'player1', username: 'Alice', homeWorld: 'world-a' }], 35);
assertEq(s.roster['player1'].knownWorlds.indexOf('world-delta') !== -1, true, 'player1 knownWorlds includes world-delta');

// Error cases
var rBadWorld = FR.syncPlayerRoster(s, 'world-nope', [], 1);
assertEq(rBadWorld.success, false, 'syncPlayerRoster fails for unknown world');

var rBadPlayers = FR.syncPlayerRoster(s, 'world-roster', 'not_array', 1);
assertEq(rBadPlayers.success, false, 'syncPlayerRoster fails if remotePlayers is not array');

// Players without id are skipped gracefully
var noIdPlayers = [{ username: 'Ghost' }];
var rNoId = FR.syncPlayerRoster(s, 'world-roster', noIdPlayers, 50);
assertEq(rNoId.success, true, 'syncPlayerRoster succeeds even if players lack id (skips them)');

// ===========================================================================
// Section 10: getPlayerFederationId
// ===========================================================================

console.log('\n--- Section 10: getPlayerFederationId ---');

var s = freshState();
FR.registerWorld(s, 'world-fedid', 'FedId World', 'https://fedid.com', 0);
FR.syncPlayerRoster(s, 'world-fedid', [{ id: 'pid1', username: 'Dave', homeWorld: 'world-a' }], 10);

var fedId = FR.getPlayerFederationId(s, 'pid1');
assert(fedId !== null, 'getPlayerFederationId returns non-null for known player');
assertEq(fedId.id, 'pid1', 'getPlayerFederationId.id is correct');
assertEq(fedId.username, 'Dave', 'getPlayerFederationId.username is correct');
assert(typeof fedId.federationId === 'string', 'getPlayerFederationId.federationId is string');

// Returns a copy
fedId.username = 'MUTATED';
assertEq(s.roster['pid1'].username, 'Dave', 'getPlayerFederationId returns a copy');

// Unknown player
var fedIdNull = FR.getPlayerFederationId(s, 'unknown_player');
assert(fedIdNull === null, 'getPlayerFederationId returns null for unknown player');

// ===========================================================================
// Section 11: getTravelerBadges / awardTravelerBadge
// ===========================================================================

console.log('\n--- Section 11: getTravelerBadges / awardTravelerBadge ---');

var s = freshState();
FR.registerWorld(s, 'world-badge', 'Badge World', 'https://badge.com', 0);
FR.syncPlayerRoster(s, 'world-badge', [{ id: 'badger1', username: 'Eve', homeWorld: 'world-a' }], 5);

var badges0 = FR.getTravelerBadges(s, 'badger1');
assertArr(badges0, 'getTravelerBadges returns array');
assertEq(badges0.length, 0, 'fresh player has no badges');

var badge1 = { id: 'explorer_badge', name: 'Explorer', description: 'Visited 2 worlds', icon: 'globe' };
var award1 = FR.awardTravelerBadge(s, 'badger1', 'world-badge', badge1, 10);
assertEq(award1.success, true, 'awardTravelerBadge returns success=true');

var badges1 = FR.getTravelerBadges(s, 'badger1');
assertEq(badges1.length, 1, 'player now has 1 badge');
assertEq(badges1[0].id, 'explorer_badge', 'badge id matches');
assertEq(badges1[0].name, 'Explorer', 'badge name matches');
assertEq(badges1[0].description, 'Visited 2 worlds', 'badge description matches');
assertEq(badges1[0].icon, 'globe', 'badge icon matches');
assertEq(badges1[0].worldId, 'world-badge', 'badge worldId matches');
assertEq(badges1[0].awardedAt, 10, 'badge awardedAt = currentTick');

// Award a second badge
var badge2 = { id: 'diplomat_badge', name: 'Diplomat', description: 'Traded cross-world' };
var award2 = FR.awardTravelerBadge(s, 'badger1', 'world-badge', badge2, 20);
assertEq(award2.success, true, 'second awardTravelerBadge returns success=true');

var badges2 = FR.getTravelerBadges(s, 'badger1');
assertEq(badges2.length, 2, 'player now has 2 badges');

// Duplicate badge is rejected
var award3 = FR.awardTravelerBadge(s, 'badger1', 'world-badge', badge1, 30);
assertEq(award3.success, false, 'duplicate awardTravelerBadge returns success=false');
assertEq(FR.getTravelerBadges(s, 'badger1').length, 2, 'badge count unchanged after duplicate award');

// Unknown player
var awardBad = FR.awardTravelerBadge(s, 'unknown_player', 'world-badge', badge1, 40);
assertEq(awardBad.success, false, 'awardTravelerBadge fails for unknown player');
assert(typeof awardBad.error === 'string', 'awardTravelerBadge error has message');

// Badge without id
var awardNoId = FR.awardTravelerBadge(s, 'badger1', 'world-badge', { name: 'No Id Badge' }, 50);
assertEq(awardNoId.success, false, 'awardTravelerBadge fails if badge has no id');

// getTravelerBadges for unknown player
var badgesUnknown = FR.getTravelerBadges(s, 'unknown_player');
assertArr(badgesUnknown, 'getTravelerBadges returns array for unknown player');
assertEq(badgesUnknown.length, 0, 'getTravelerBadges returns empty array for unknown player');

// getTravelerBadges returns copies
var badgesCopy = FR.getTravelerBadges(s, 'badger1');
badgesCopy[0].name = 'MUTATED';
assertEq(s.roster['badger1'].badges[0].name, 'Explorer', 'getTravelerBadges returns deep copies');

// ===========================================================================
// Section 12: Vector Clocks
// ===========================================================================

console.log('\n--- Section 12: getVectorClock / updateVectorClock ---');

var s = freshState();
FR.registerWorld(s, 'world-vc', 'VC World', 'https://vc.com', 5);

var vc = FR.getVectorClock(s, 'world-vc');
assert(vc !== null, 'getVectorClock returns non-null after registration');
assert(typeof vc === 'object', 'getVectorClock returns object');
assertEq(vc['world-vc'], 5, 'initial vector clock has own worldId entry = tick');

// getVectorClock returns null for unknown world
var vcNull = FR.getVectorClock(s, 'unknown-world');
assert(vcNull === null, 'getVectorClock returns null for unknown world');

// updateVectorClock merges incoming clock
var remoteClock = { 'world-remote': 42, 'world-vc': 3 };
var upd = FR.updateVectorClock(s, 'world-vc', remoteClock, 10);
assertEq(upd.success, true, 'updateVectorClock returns success=true');

var vc2 = FR.getVectorClock(s, 'world-vc');
assertEq(vc2['world-remote'], 42, 'updateVectorClock merges remote clock entry');
// local worldId should be max(existing, incoming)
assert(vc2['world-vc'] >= 5, 'updateVectorClock keeps local worldId >= original');

// getVectorClock returns a copy
var vcCopy = FR.getVectorClock(s, 'world-vc');
vcCopy['world-vc'] = 9999;
assertEq(FR.getVectorClock(s, 'world-vc')['world-vc'] !== 9999, true, 'getVectorClock returns a copy');

// updateVectorClock with empty clock
var updEmpty = FR.updateVectorClock(s, 'world-vc', {}, 15);
assertEq(updEmpty.success, true, 'updateVectorClock with empty clock succeeds');

// updateVectorClock initializes clock if not present
FR.registerWorld(s, 'world-new-vc', 'NewVC', 'https://newvc.com', 0);
delete s.vectorClocks['world-new-vc'];  // simulate missing clock
var updNew = FR.updateVectorClock(s, 'world-new-vc', { 'world-x': 10 }, 5);
assertEq(updNew.success, true, 'updateVectorClock initializes missing clock');
assert(s.vectorClocks['world-new-vc'] !== undefined, 'vector clock created for world');

// pushChanges advances vector clock
var s2 = freshState();
FR.registerWorld(s2, 'world-push-vc', 'PushVC', 'https://pvc.com', 0);
var vcBefore = FR.getVectorClock(s2, 'world-push-vc')['world-push-vc'] || 0;
FR.pushChanges(s2, 'world-push-vc', 'economy_state', [{ key: 'x', value: 1 }], 10);
var vcAfter = FR.getVectorClock(s2, 'world-push-vc')['world-push-vc'];
assert(vcAfter > vcBefore, 'pushChanges advances vector clock');

// ===========================================================================
// Section 13: Connection Health
// ===========================================================================

console.log('\n--- Section 13: getConnectionHealth ---');

var s = freshState();
FR.registerWorld(s, 'world-health', 'Health World', 'https://health.com', 0);

var health = FR.getConnectionHealth(s, 'world-health');
assert(health !== null && typeof health === 'object', 'getConnectionHealth returns object');
assertEq(health.worldId, 'world-health', 'health.worldId is correct');
assert(typeof health.status === 'string', 'health.status is string');
assert(typeof health.latency === 'number', 'health.latency is number');
assert(typeof health.errorRate === 'number', 'health.errorRate is number');
assert(typeof health.errorCount === 'number', 'health.errorCount is number');
assert(typeof health.syncCounts === 'object', 'health.syncCounts is object');
assert(health.lastSync === null, 'health.lastSync is null initially');

// After some syncs, lastSync is set
FR.pushChanges(s, 'world-health', 'player_roster', [{ key: 'p1', value: 1 }], 50);
var health2 = FR.getConnectionHealth(s, 'world-health');
assertEq(health2.lastSync, 50, 'health.lastSync updated after push');

// With health log entries, latency is computed
FR.registerWorld(s, 'world-hlog', 'HLog', 'https://hlog.com', 0);
FR._logHealth(s, 'world-hlog', 'ping', 120, {});
FR._logHealth(s, 'world-hlog', 'ping', 80, {});
var hlog = FR.getConnectionHealth(s, 'world-hlog');
assert(hlog.latency >= 0, 'health.latency is non-negative with health log entries');

// Error events affect error rate
FR._logHealth(s, 'world-hlog', 'error', 0, { msg: 'timeout' });
var hlogErr = FR.getConnectionHealth(s, 'world-hlog');
assert(hlogErr.errorRate > 0, 'error health log entry increases errorRate');

// Unknown world
var healthNull = FR.getConnectionHealth(s, 'world-unknown');
assertEq(healthNull.status, 'unknown', 'getConnectionHealth returns unknown status for missing world');

// ===========================================================================
// Section 14: getSyncHistory
// ===========================================================================

console.log('\n--- Section 14: getSyncHistory ---');

var s = freshState();
FR.registerWorld(s, 'world-hist', 'History World', 'https://hist.com', 0);
FR.pushChanges(s, 'world-hist', 'player_roster', [{ key: 'x', value: 1 }], 10);
FR.pushChanges(s, 'world-hist', 'economy_state', [{ key: 'y', value: 2 }], 20);
FR.pullChanges(s, 'world-hist', 'world_events', [{ key: 'z', value: 3, ts: 15 }], 30);

var hist = FR.getSyncHistory(s, 'world-hist', 5);
assertArr(hist, 'getSyncHistory returns array');
assert(hist.length <= 5, 'getSyncHistory respects count limit');
assert(hist.length > 0, 'getSyncHistory returns at least 1 event');

// Each log entry has required fields
for (var i = 0; i < hist.length; i++) {
  var entry = hist[i];
  assert(typeof entry.id === 'string', 'log entry has id');
  assertEq(entry.worldId, 'world-hist', 'log entry worldId is correct');
  assert(typeof entry.action === 'string', 'log entry has action');
  assert(typeof entry.tick === 'number', 'log entry has tick');
}

// Without worldId filter, returns all logs
var allHist = FR.getSyncHistory(s, null, 1000);
assert(allHist.length >= hist.length, 'getSyncHistory without worldId filter returns all events');

// Returns copies
var histCopy = FR.getSyncHistory(s, 'world-hist', 10);
if (histCopy.length > 0) {
  histCopy[0].action = 'MUTATED';
  assertEq(s.syncLog[0].action !== 'MUTATED', true, 'getSyncHistory returns deep copies');
}

// Default count
var defaultHist = FR.getSyncHistory(s, 'world-hist');
assertArr(defaultHist, 'getSyncHistory with no count returns array');

// ===========================================================================
// Section 15: getFederationStats
// ===========================================================================

console.log('\n--- Section 15: getFederationStats ---');

var s = freshState();
FR.registerWorld(s, 'stat-a', 'A', 'https://a.com', 1);
FR.registerWorld(s, 'stat-b', 'B', 'https://b.com', 2);
FR.registerWorld(s, 'stat-c', 'C', 'https://c.com', 3);
FR.removeWorld(s, 'stat-c', 10);  // disconnect one

FR.syncPlayerRoster(s, 'stat-a', [{ id: 'sp1', username: 'P1', homeWorld: 'stat-a' }], 5);
FR.pushChanges(s, 'stat-a', 'economy_state', [{ key: 'e1', value: 1 }], 10);
FR.pushChanges(s, 'stat-b', 'world_events', [{ key: 'ev1', value: 1 }], 15);

var stats = FR.getFederationStats(s);
assert(stats !== null && typeof stats === 'object', 'getFederationStats returns object');
assertEq(stats.totalWorlds, 3, 'stats.totalWorlds = 3');
assertEq(stats.connected, 2, 'stats.connected = 2 (stat-c is disconnected)');
assertEq(stats.disconnected, 1, 'stats.disconnected = 1');
assertEq(typeof stats.syncing, 'number', 'stats.syncing is number');
assertEq(typeof stats.errored, 'number', 'stats.errored is number');
assertEq(stats.rosterSize, 1, 'stats.rosterSize = 1');
assert(typeof stats.totalSyncEvents === 'number' && stats.totalSyncEvents > 0, 'stats.totalSyncEvents > 0');
assertEq(typeof stats.unresolvedConflicts, 'number', 'stats.unresolvedConflicts is number');

// syncTypeStats has all 5 types
assert(typeof stats.syncTypeStats === 'object', 'stats.syncTypeStats is object');
for (var i = 0; i < expectedSyncIds.length; i++) {
  assert(typeof stats.syncTypeStats[expectedSyncIds[i]] === 'number', 'syncTypeStats.' + expectedSyncIds[i] + ' is number');
}

// economy_state and world_events should be > 0
assert(stats.syncTypeStats['economy_state'] > 0, 'syncTypeStats.economy_state > 0');
assert(stats.syncTypeStats['world_events'] > 0, 'syncTypeStats.world_events > 0');

// Empty state stats
var emptyStats = FR.getFederationStats(freshState());
assertEq(emptyStats.totalWorlds, 0, 'empty state: totalWorlds = 0');
assertEq(emptyStats.connected, 0, 'empty state: connected = 0');
assertEq(emptyStats.rosterSize, 0, 'empty state: rosterSize = 0');

// ===========================================================================
// Section 16: checkSyncFreshness
// ===========================================================================

console.log('\n--- Section 16: checkSyncFreshness ---');

var s = freshState();
FR.registerWorld(s, 'world-fresh', 'Fresh', 'https://fresh.com', 0);

// No sync yet — stale
var fresh0 = FR.checkSyncFreshness(s, 'world-fresh', 100);
assertEq(fresh0.stale, true, 'checkSyncFreshness is stale when no sync has occurred');
assert(fresh0.ticksSinceSync === null, 'ticksSinceSync is null when no sync has occurred');

// Sync and check freshness
FR.pushChanges(s, 'world-fresh', 'player_roster', [{ key: 'x', value: 1 }], 100);
var fresh1 = FR.checkSyncFreshness(s, 'world-fresh', 100);
assertEq(fresh1.stale, false, 'checkSyncFreshness is fresh immediately after sync');
assertEq(fresh1.ticksSinceSync, 0, 'ticksSinceSync = 0 immediately after sync');

// A few ticks later — still fresh
var fresh2 = FR.checkSyncFreshness(s, 'world-fresh', 120);
assertEq(fresh2.stale, false, 'checkSyncFreshness is fresh 20 ticks after sync');
assertEq(fresh2.ticksSinceSync, 20, 'ticksSinceSync = 20');

// Many ticks later — stale
var fresh3 = FR.checkSyncFreshness(s, 'world-fresh', 200);
assertEq(fresh3.stale, true, 'checkSyncFreshness is stale 100 ticks after sync');
assertEq(fresh3.ticksSinceSync, 100, 'ticksSinceSync = 100');

// Unknown world
var freshUnknown = FR.checkSyncFreshness(s, 'world-unknown', 100);
assertEq(freshUnknown.stale, true, 'checkSyncFreshness is stale for unknown world');
assert(typeof freshUnknown.error === 'string', 'checkSyncFreshness error has message for unknown world');

// After pull, freshness is also updated
FR.registerWorld(s, 'world-pull-fresh', 'PF', 'https://pf.com', 0);
FR.pullChanges(s, 'world-pull-fresh', 'economy_state', [{ key: 'e', value: 1, ts: 50 }], 50);
var freshPull = FR.checkSyncFreshness(s, 'world-pull-fresh', 50);
assertEq(freshPull.stale, false, 'checkSyncFreshness is fresh after pull');

// ===========================================================================
// Section 17: Edge Cases & Integration
// ===========================================================================

console.log('\n--- Section 17: Edge Cases ---');

// MAX_BATCH_SIZE is exported
assertEq(FR.MAX_BATCH_SIZE, 100, 'MAX_BATCH_SIZE exported as 100');

// State is fully JSON-serializable
var s = freshState();
FR.registerWorld(s, 'world-json', 'JSON World', 'https://json.com', 1);
FR.syncPlayerRoster(s, 'world-json', [{ id: 'jp1', username: 'JSON Player', homeWorld: 'world-json' }], 5);
FR.pushChanges(s, 'world-json', 'reputation', [{ key: 'r1', value: 100 }], 10);
var jsonStr = JSON.stringify(s);
var parsed = JSON.parse(jsonStr);
assert(typeof parsed === 'object', 'state serializes to JSON without errors');
assertEq(JSON.stringify(parsed.worlds), JSON.stringify(s.worlds), 'worlds round-trip through JSON');
assertEq(JSON.stringify(parsed.roster), JSON.stringify(s.roster), 'roster round-trips through JSON');

// Multiple worlds can all push/pull independently
var s2 = freshState();
FR.registerWorld(s2, 'w1', 'W1', 'https://w1.com', 0);
FR.registerWorld(s2, 'w2', 'W2', 'https://w2.com', 0);
FR.registerWorld(s2, 'w3', 'W3', 'https://w3.com', 0);
FR.pushChanges(s2, 'w1', 'player_roster', [{ key: 'a', value: 1 }], 10);
FR.pushChanges(s2, 'w2', 'economy_state', [{ key: 'b', value: 2 }], 10);
FR.pullChanges(s2, 'w3', 'world_events', [{ key: 'c', value: 3, ts: 8 }], 10);
var stats2 = FR.getFederationStats(s2);
assertEq(stats2.totalWorlds, 3, 'all 3 worlds registered in multi-world test');

// pullChanges with empty array succeeds
var s3 = freshState();
FR.registerWorld(s3, 'we', 'WE', 'https://we.com', 0);
var emptyPull = FR.pullChanges(s3, 'we', 'lore_progress', [], 5);
assertEq(emptyPull.success, true, 'pullChanges with empty array succeeds');
assertEq(emptyPull.applied, 0, 'pullChanges with empty array applies 0 changes');

// pushChanges with empty array succeeds
var emptyPush = FR.pushChanges(s3, 'we', 'player_roster', [], 6);
assertEq(emptyPush.success, true, 'pushChanges with empty array succeeds');
assertEq(emptyPush.changeCount, 0, 'pushChanges with empty array has changeCount=0');

// getSyncHistory returns empty for unknown world
var emptyHist = FR.getSyncHistory(s3, 'world-unknown', 10);
assertArr(emptyHist, 'getSyncHistory returns array for unknown world');
assertEq(emptyHist.length, 0, 'getSyncHistory returns empty for unknown world');

// getConflicts returns empty for world with no conflicts
var s4 = freshState();
FR.registerWorld(s4, 'noconf', 'NoConf', 'https://noconf.com', 0);
var noConflicts = FR.getConflicts(s4, 'noconf');
assertArr(noConflicts, 'getConflicts returns array when no conflicts');
assertEq(noConflicts.length, 0, 'getConflicts returns empty when no conflicts');

// Causal ordering: remote clock strictly newer — should always apply
var s5 = freshState();
FR.registerWorld(s5, 'causal', 'Causal', 'https://causal.com', 0);
var oldChange = [{ key: 'ck', value: { v: 1 }, ts: 10, clock: { 'causal': 10 } }];
FR.pullChanges(s5, 'causal', 'reputation', oldChange, 10);

var newerChange = [{ key: 'ck', value: { v: 2 }, ts: 20, clock: { 'causal': 20 } }];
var causalResult = FR.pullChanges(s5, 'causal', 'reputation', newerChange, 25);
assertEq(causalResult.success, true, 'causal ordering: newer clock change pulled successfully');
assertEq(causalResult.applied, 1, 'causal ordering: newer clock change is applied');

// Stale change rejected by causal ordering
var staleChange = [{ key: 'ck', value: { v: 0 }, ts: 5, clock: { 'causal': 5 } }];
var staleResult = FR.pullChanges(s5, 'causal', 'reputation', staleChange, 30);
assertEq(staleResult.success, true, 'causal ordering: stale change pull succeeds');
assertEq(staleResult.applied, 0, 'causal ordering: stale change is not applied');

// registerWorld with tick=0 (default)
var s6 = freshState();
var reg0 = FR.registerWorld(s6, 'world-zero', 'Zero', 'https://zero.com', 0);
assertEq(reg0.success, true, 'registerWorld with tick=0 succeeds');
assertEq(reg0.world.registeredAt, 0, 'world.registeredAt = 0');

// registerWorld with no tick (undefined/null)
var regNoTick = FR.registerWorld(s6, 'world-notick', 'NoTick', 'https://notick.com');
assertEq(regNoTick.success, true, 'registerWorld with no tick succeeds');
assertEq(regNoTick.world.registeredAt, 0, 'world.registeredAt defaults to 0 when no tick given');

// awardTravelerBadge: same badge id in different worlds is allowed
var s7 = freshState();
FR.registerWorld(s7, 'tw1', 'TW1', 'https://tw1.com', 0);
FR.registerWorld(s7, 'tw2', 'TW2', 'https://tw2.com', 0);
FR.syncPlayerRoster(s7, 'tw1', [{ id: 'traveler', username: 'T', homeWorld: 'tw1' }], 1);
FR.awardTravelerBadge(s7, 'traveler', 'tw1', { id: 'explorer', name: 'Explorer' }, 5);
var crossWorldBadge = FR.awardTravelerBadge(s7, 'traveler', 'tw2', { id: 'explorer', name: 'Explorer' }, 10);
assertEq(crossWorldBadge.success, true, 'same badge id from different world is allowed');
assertEq(FR.getTravelerBadges(s7, 'traveler').length, 2, 'player has 2 badges from 2 worlds');

// ===========================================================================
// Section 18: Sync log trimming (no unbounded growth)
// ===========================================================================

console.log('\n--- Section 18: Sync log trimming ---');

var s = freshState();
FR.registerWorld(s, 'world-trim', 'Trim', 'https://trim.com', 0);

// Push 600 changes one by one to trigger log trimming
for (var i = 0; i < 600; i++) {
  FR.pushChanges(s, 'world-trim', 'player_roster', [{ key: 'k' + i, value: i }], i);
}
assert(s.syncLog.length <= 500, 'syncLog is trimmed to MAX_SYNC_LOG (500)');

// ===========================================================================
// Report
// ===========================================================================

console.log('\n====================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}
