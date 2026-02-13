const { test, suite, report, assert } = require('./test_runner');
const Protocol = require('../src/js/protocol');

suite('Protocol Tests', () => {

  test('Create valid join message', () => {
    const msg = Protocol.createMessage('join', 'player1', { name: 'Alice' });
    assert.strictEqual(msg.type, 'join');
    assert.strictEqual(msg.from, 'player1');
    assert.strictEqual(msg.payload.name, 'Alice');
  });

  test('Create valid move message', () => {
    const msg = Protocol.createMessage('move', 'player1', { position: { x: 10, y: 5, z: 3 } });
    assert.strictEqual(msg.type, 'move');
    assert.strictEqual(msg.from, 'player1');
  });

  test('Create valid say message', () => {
    const msg = Protocol.createMessage('say', 'player1', { text: 'Hello world' });
    assert.strictEqual(msg.type, 'say');
    assert.strictEqual(msg.payload.text, 'Hello world');
  });

  test('Create valid build message', () => {
    const msg = Protocol.createMessage('build', 'player1', { structure: { type: 'wall' } });
    assert.strictEqual(msg.type, 'build');
    assert.strictEqual(msg.payload.structure.type, 'wall');
  });

  test('Create valid trade_offer message', () => {
    const msg = Protocol.createMessage('trade_offer', 'player1', { to: 'player2', offered: ['item1'] });
    assert.strictEqual(msg.type, 'trade_offer');
    assert.strictEqual(msg.payload.to, 'player2');
  });

  test('Create valid challenge message', () => {
    const msg = Protocol.createMessage('challenge', 'player1', { to: 'player2', challenge_type: 'duel' });
    assert.strictEqual(msg.type, 'challenge');
    assert.strictEqual(msg.payload.challenge_type, 'duel');
  });

  test('Create valid discover message', () => {
    const msg = Protocol.createMessage('discover', 'player1', { discovery: { type: 'artifact' } });
    assert.strictEqual(msg.type, 'discover');
    assert.strictEqual(msg.payload.discovery.type, 'artifact');
  });

  test('Create valid intention_set message', () => {
    const msg = Protocol.createMessage('intention_set', 'player1', { intention: 'greet nearby players' });
    assert.strictEqual(msg.type, 'intention_set');
    assert.strictEqual(msg.payload.intention, 'greet nearby players');
  });

  test('Create valid warp_fork message', () => {
    const msg = Protocol.createMessage('warp_fork', 'player1', { target_world: 'world2' });
    assert.strictEqual(msg.type, 'warp_fork');
    assert.strictEqual(msg.payload.target_world, 'world2');
  });

  test('Create valid federation_announce message', () => {
    const msg = Protocol.createMessage('federation_announce', 'server1', { federation: { name: 'FedA', endpoint: 'https://fed.example' } });
    assert.strictEqual(msg.type, 'federation_announce');
    assert.strictEqual(msg.payload.federation.name, 'FedA');
  });

  test('Message has all required fields', () => {
    const msg = Protocol.createMessage('join', 'player1', { name: 'Alice' });
    assert(msg.v !== undefined, 'Missing v field');
    assert(msg.id !== undefined, 'Missing id field');
    assert(msg.ts !== undefined, 'Missing ts field');
    assert(msg.seq !== undefined, 'Missing seq field');
    assert(msg.from !== undefined, 'Missing from field');
    assert(msg.type !== undefined, 'Missing type field');
    assert(msg.platform !== undefined, 'Missing platform field');
    assert(msg.position !== undefined, 'Missing position field');
    assert(msg.geo !== undefined, 'Missing geo field');
    assert(msg.payload !== undefined, 'Missing payload field');
  });

  test('Reject message with missing from field', () => {
    assert.throws(() => {
      Protocol.createMessage('join', null, { name: 'Alice' });
    }, /Invalid from/);
  });

  test('Reject message with missing type field', () => {
    const result = Protocol.validateMessage({
      v: 1,
      id: 'test-id',
      ts: new Date().toISOString(),
      seq: 0,
      from: 'player1',
      type: null,
      platform: 'desktop',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: null,
      payload: {}
    });
    assert.strictEqual(result.valid, false);
  });

  test('Reject message with missing position field', () => {
    const result = Protocol.validateMessage({
      v: 1,
      id: 'test-id',
      ts: new Date().toISOString(),
      seq: 0,
      from: 'player1',
      type: 'join',
      platform: 'desktop',
      position: null,
      geo: null,
      payload: {}
    });
    assert.strictEqual(result.valid, false);
  });

  test('Reject message with invalid type', () => {
    assert.throws(() => {
      Protocol.createMessage('invalid_type', 'player1', {});
    }, /Invalid message type/);
  });

  test('Reject message with invalid platform', () => {
    const result = Protocol.validateMessage({
      v: 1,
      id: 'test-id',
      ts: new Date().toISOString(),
      seq: 0,
      from: 'player1',
      type: 'join',
      platform: 'xbox',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: null,
      payload: {}
    });
    assert.strictEqual(result.valid, false);
  });

  test('Position has x, y, z, zone fields', () => {
    const msg = Protocol.createMessage('join', 'player1', { name: 'Alice' });
    assert(msg.position.x !== undefined, 'Missing position.x');
    assert(msg.position.y !== undefined, 'Missing position.y');
    assert(msg.position.z !== undefined, 'Missing position.z');
    assert(msg.position.zone !== undefined, 'Missing position.zone');
  });

  test('Validate seq is non-negative integer', () => {
    const result = Protocol.validateMessage({
      v: 1,
      id: 'test-id',
      ts: new Date().toISOString(),
      seq: -1,
      from: 'player1',
      type: 'join',
      platform: 'desktop',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: null,
      payload: {}
    });
    assert.strictEqual(result.valid, false);
  });

  test('Validate ts is ISO-8601 format', () => {
    const msg = Protocol.createMessage('join', 'player1', { name: 'Alice' });
    const date = new Date(msg.ts);
    assert(!isNaN(date.getTime()), 'ts is not a valid ISO-8601 timestamp');
  });

  test('Validate id is non-empty string', () => {
    const msg = Protocol.createMessage('join', 'player1', { name: 'Alice' });
    assert(typeof msg.id === 'string' && msg.id.length > 0, 'id is not a non-empty string');
  });

  test('Per-player sequence counter increments', () => {
    const msg1 = Protocol.createMessage('join', 'player1', {});
    const msg2 = Protocol.createMessage('move', 'player1', {});
    const msg3 = Protocol.createMessage('say', 'player1', { text: 'hi' });
    assert(msg2.seq > msg1.seq, 'Sequence did not increment');
    assert(msg3.seq > msg2.seq, 'Sequence did not increment');
  });

});

const success = report();
process.exit(success ? 0 : 1);
