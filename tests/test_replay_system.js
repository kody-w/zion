const { test, suite, report, assert } = require('./test_runner');
const Replay = require('../src/js/replay');
const State = require('../src/js/state');

// ── parseChanges ─────────────────────────────────────────────────────────────

suite('Replay: parseChanges', function() {

  test('parses array of changes', function() {
    var changes = Replay.parseChanges([
      { type: 'craft', from: 'agent_001', ts: '2026-02-27T12:00:00Z' },
      { type: 'say', from: 'agent_002', ts: '2026-02-27T11:00:00Z' }
    ]);
    assert.strictEqual(changes.length, 2);
    assert.strictEqual(changes[0].type, 'say', 'Should be sorted by time (say is earlier)');
    assert.strictEqual(changes[1].type, 'craft');
  });

  test('parses object with changes key', function() {
    var changes = Replay.parseChanges({
      changes: [{ type: 'move', from: 'a', ts: '2026-01-01T00:00:00Z' }]
    });
    assert.strictEqual(changes.length, 1);
  });

  test('returns empty array for invalid input', function() {
    assert.deepStrictEqual(Replay.parseChanges(null), []);
    assert.deepStrictEqual(Replay.parseChanges(undefined), []);
    assert.deepStrictEqual(Replay.parseChanges({}), []);
  });

  test('adds _ts field for filtering', function() {
    var changes = Replay.parseChanges([
      { type: 'say', from: 'a', ts: '2026-02-27T12:00:00Z' }
    ]);
    assert.ok(changes[0]._ts > 0, '_ts should be a positive number');
  });
});

// ── changeToMessage ──────────────────────────────────────────────────────────

suite('Replay: changeToMessage', function() {

  test('converts change to protocol message', function() {
    var msg = Replay.changeToMessage({
      type: 'craft', from: 'agent_001', ts: '2026-02-27T12:00:00Z',
      zone: 'studio', payload: { recipe: 'ring' }
    });
    assert.strictEqual(msg.v, 1);
    assert.strictEqual(msg.type, 'craft');
    assert.strictEqual(msg.from, 'agent_001');
    assert.strictEqual(msg.payload.recipe, 'ring');
    assert.strictEqual(msg.position.zone, 'studio');
  });

  test('fills defaults for missing fields', function() {
    var msg = Replay.changeToMessage({ type: 'say', ts: '2026-01-01T00:00:00Z' });
    assert.strictEqual(msg.from, 'system');
    assert.strictEqual(msg.platform, 'api');
    assert.strictEqual(msg.position.zone, 'nexus');
  });
});

// ── Filters ──────────────────────────────────────────────────────────────────

suite('Replay: filters', function() {

  var changes = Replay.parseChanges([
    { type: 'craft', from: 'agent_001', ts: '2026-02-27T10:00:00Z', zone: 'studio' },
    { type: 'say', from: 'agent_002', ts: '2026-02-27T12:00:00Z', zone: 'nexus' },
    { type: 'craft', from: 'agent_001', ts: '2026-02-27T14:00:00Z', zone: 'studio' },
    { type: 'build', from: 'agent_003', ts: '2026-02-28T08:00:00Z', zone: 'commons' },
  ]);

  test('filterByTimeRange', function() {
    var filtered = Replay.filterByTimeRange(changes, '2026-02-27T11:00:00Z', '2026-02-27T15:00:00Z');
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered[0].type, 'say');
    assert.strictEqual(filtered[1].type, 'craft');
  });

  test('filterByType single', function() {
    var filtered = Replay.filterByType(changes, 'craft');
    assert.strictEqual(filtered.length, 2);
  });

  test('filterByType multiple', function() {
    var filtered = Replay.filterByType(changes, ['craft', 'build']);
    assert.strictEqual(filtered.length, 3);
  });

  test('filterByAgent', function() {
    var filtered = Replay.filterByAgent(changes, 'agent_001');
    assert.strictEqual(filtered.length, 2);
    filtered.forEach(function(c) { assert.strictEqual(c.from, 'agent_001'); });
  });
});

// ── replayToState ────────────────────────────────────────────────────────────

suite('Replay: replayToState', function() {

  test('replays join messages to create players', function() {
    var changes = Replay.parseChanges([
      { type: 'join', from: 'player1', ts: '2026-02-27T10:00:00Z',
        payload: { name: 'Alice', zone: 'nexus' } },
      { type: 'join', from: 'player2', ts: '2026-02-27T10:01:00Z',
        payload: { name: 'Bob', zone: 'gardens' } }
    ]);
    var result = Replay.replayToState(changes);
    assert.strictEqual(result.applied, 2);
    assert.ok(result.state.players.player1, 'player1 should exist');
    assert.ok(result.state.players.player2, 'player2 should exist');
  });

  test('replays build messages to create structures', function() {
    var changes = Replay.parseChanges([
      { type: 'build', from: 'builder1', ts: '2026-02-27T12:00:00Z',
        payload: { structure: { type: 'bench', position: { x: 1, y: 0, z: 1 } } } }
    ]);
    var result = Replay.replayToState(changes);
    assert.strictEqual(result.applied, 1);
    assert.ok(Object.keys(result.state.structures).length > 0, 'Should have a structure');
  });

  test('replays say messages to create chat entries', function() {
    var changes = Replay.parseChanges([
      { type: 'say', from: 'agent_001', ts: '2026-02-27T12:00:00Z',
        payload: { text: 'Hello world!' } }
    ]);
    var result = Replay.replayToState(changes);
    assert.strictEqual(result.state.chat.length, 1);
    assert.strictEqual(result.state.chat[0].text, 'Hello world!');
  });

  test('tracks applied and skipped counts', function() {
    var changes = Replay.parseChanges([
      { type: 'join', from: 'p1', ts: '2026-01-01T00:00:00Z', payload: {} },
      { type: 'say', from: 'p1', ts: '2026-01-01T00:01:00Z', payload: { text: 'hi' } },
    ]);
    var result = Replay.replayToState(changes);
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.applied + result.skipped, 2);
  });

  test('does not mutate initial state', function() {
    var initial = State.createWorldState();
    var changes = Replay.parseChanges([
      { type: 'join', from: 'p1', ts: '2026-01-01T00:00:00Z', payload: { name: 'Test' } }
    ]);
    Replay.replayToState(changes, initial);
    assert.deepStrictEqual(Object.keys(initial.players), [], 'Initial state should be unchanged');
  });
});

// ── replayToTime ─────────────────────────────────────────────────────────────

suite('Replay: replayToTime', function() {

  var changes = Replay.parseChanges([
    { type: 'join', from: 'p1', ts: '2026-02-27T10:00:00Z', payload: { name: 'Alice' } },
    { type: 'say', from: 'p1', ts: '2026-02-27T12:00:00Z', payload: { text: 'noon' } },
    { type: 'say', from: 'p1', ts: '2026-02-27T18:00:00Z', payload: { text: 'evening' } },
  ]);

  test('reconstructs state at noon (2 changes applied)', function() {
    var result = Replay.replayToTime(changes, '2026-02-27T12:00:00Z');
    assert.strictEqual(result.applied, 2);
    assert.ok(result.state.players.p1, 'Player should exist');
    assert.strictEqual(result.state.chat.length, 1);
  });

  test('reconstructs state at 11am (1 change applied)', function() {
    var result = Replay.replayToTime(changes, '2026-02-27T11:00:00Z');
    assert.strictEqual(result.applied, 1);
    assert.strictEqual(result.state.chat.length, 0);
  });

  test('reconstructs full state at end of day', function() {
    var result = Replay.replayToTime(changes, '2026-02-27T23:59:59Z');
    assert.strictEqual(result.applied, 3);
    assert.strictEqual(result.state.chat.length, 2);
  });
});

// ── summarizeChanges ─────────────────────────────────────────────────────────

suite('Replay: summarizeChanges', function() {

  var changes = Replay.parseChanges([
    { type: 'craft', from: 'a1', ts: '2026-02-27T10:00:00Z', zone: 'studio' },
    { type: 'craft', from: 'a1', ts: '2026-02-27T11:00:00Z', zone: 'studio' },
    { type: 'say', from: 'a2', ts: '2026-02-27T12:00:00Z', zone: 'nexus' },
    { type: 'build', from: 'a3', ts: '2026-02-28T08:00:00Z', zone: 'commons' },
  ]);

  test('counts total', function() {
    var s = Replay.summarizeChanges(changes);
    assert.strictEqual(s.total, 4);
  });

  test('counts by type', function() {
    var s = Replay.summarizeChanges(changes);
    assert.strictEqual(s.byType.craft, 2);
    assert.strictEqual(s.byType.say, 1);
    assert.strictEqual(s.byType.build, 1);
  });

  test('counts by agent', function() {
    var s = Replay.summarizeChanges(changes);
    assert.strictEqual(s.byAgent.a1, 2);
    assert.strictEqual(s.byAgent.a2, 1);
  });

  test('counts by zone', function() {
    var s = Replay.summarizeChanges(changes);
    assert.strictEqual(s.byZone.studio, 2);
    assert.strictEqual(s.byZone.nexus, 1);
  });

  test('has time range', function() {
    var s = Replay.summarizeChanges(changes);
    assert.ok(s.timeRange.first);
    assert.ok(s.timeRange.last);
  });
});

report();
