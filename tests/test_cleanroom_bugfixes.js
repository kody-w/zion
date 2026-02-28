const { test, suite, report, assert } = require('./test_runner');
const Economy = require('../src/js/economy');
const State = require('../src/js/state');
const Zones = require('../src/js/zones');
const Physical = require('../src/js/physical');
const Exploration = require('../src/js/exploration');

suite('Bug Fix Regression Tests — Clean-Room Discovered Bugs', () => {

  // ========================================================================
  // Bug #1: Tax bracket-boundary exploitation
  // ========================================================================

  test('Tax: player at bracket boundary taxed at post-earning rate', () => {
    var ledger = Economy.createLedger();
    // Put player at 499 (just below 500+ bracket)
    ledger.balances['boundary_player'] = 499;

    // Earn 50 → projected balance = 549, which is in 500+ bracket (40%)
    var earned = Economy.earnSpark(ledger, 'boundary_player', 'craft', { complexity: 1 });
    // gross = 50, projected = 549, rate should be 40%, tax = floor(50*0.40) = 20, net = 30
    assert.strictEqual(earned, 30, 'Should be taxed at 500+ rate (40%), not 250-499 rate (25%)');
  });

  test('Tax: new player at 0 balance pays no tax', () => {
    var ledger = Economy.createLedger();
    var earned = Economy.earnSpark(ledger, 'new_player', 'daily_login');
    // projected = 0 + 10 = 10, bracket [0,19] = 0% tax
    assert.strictEqual(earned, 10, 'New player should pay no tax');
  });

  // ========================================================================
  // Bug #2: Negative balance floor
  // ========================================================================

  test('Balance never goes below 0 after spend', () => {
    var ledger = Economy.createLedger();
    ledger.balances['test_player'] = 5;

    // Try to spend exactly 5
    var result = Economy.spendSpark(ledger, 'test_player', 5);
    assert.strictEqual(result.success, true);
    assert(Economy.getBalance(ledger, 'test_player') >= 0, 'Balance must be >= 0');
  });

  test('Balance never goes below 0 after transfer', () => {
    var ledger = Economy.createLedger();
    ledger.balances['sender'] = 10;

    Economy.transferSpark(ledger, 'sender', 'receiver', 10);
    assert(Economy.getBalance(ledger, 'sender') >= 0, 'Sender balance must be >= 0');
  });

  test('Overspend is rejected (balance floor)', () => {
    var ledger = Economy.createLedger();
    ledger.balances['poor_player'] = 3;

    var result = Economy.spendSpark(ledger, 'poor_player', 10);
    assert.strictEqual(result.success, false, 'Overspend should be rejected');
    assert.strictEqual(Economy.getBalance(ledger, 'poor_player'), 3, 'Balance unchanged');
  });

  // ========================================================================
  // Bug #3: Auction settlement race condition (escrow)
  // ========================================================================

  test('Auction: bid escrows funds immediately', () => {
    var ledger = Economy.createLedger();
    ledger.balances['bidder1'] = 100;

    var auction = Economy.createAuction(ledger, 'seller1', { type: 'sword' }, 10, 1000);
    Economy.placeBid(ledger, auction.id, 'bidder1', 50);

    // Funds should be escrowed — bidder balance should be reduced
    assert.strictEqual(Economy.getBalance(ledger, 'bidder1'), 50, 'Bid should escrow 50');
  });

  test('Auction: outbid refunds previous bidder', () => {
    var ledger = Economy.createLedger();
    ledger.balances['bidder1'] = 100;
    ledger.balances['bidder2'] = 200;

    var auction = Economy.createAuction(ledger, 'seller1', { type: 'sword' }, 10, 5000);
    Economy.placeBid(ledger, auction.id, 'bidder1', 50);
    assert.strictEqual(Economy.getBalance(ledger, 'bidder1'), 50, 'First bid escrowed');

    Economy.placeBid(ledger, auction.id, 'bidder2', 75);
    assert.strictEqual(Economy.getBalance(ledger, 'bidder1'), 100, 'First bidder refunded');
    assert.strictEqual(Economy.getBalance(ledger, 'bidder2'), 125, 'Second bid escrowed');
  });

  test('Auction: cannot spend escrowed funds (prevents race condition)', () => {
    var ledger = Economy.createLedger();
    ledger.balances['bidder1'] = 100;

    var auction = Economy.createAuction(ledger, 'seller1', { type: 'gem' }, 10, 5000);
    Economy.placeBid(ledger, auction.id, 'bidder1', 80);

    // Bidder has 20 left after escrow
    assert.strictEqual(Economy.getBalance(ledger, 'bidder1'), 20);

    // Try to spend 50 — should fail because only 20 available
    var result = Economy.spendSpark(ledger, 'bidder1', 50);
    assert.strictEqual(result.success, false, 'Cannot spend escrowed funds');
  });

  // ========================================================================
  // Bug #4: addPlayer() purity (no input mutation)
  // ========================================================================

  test('addPlayer returns new state without mutating input', () => {
    var state = State.createWorldState();
    var originalPlayerCount = Object.keys(state.players).length;

    var newState = State.addPlayer(state, {
      id: 'test_player',
      name: 'Test',
      position: { x: 0, y: 0, z: 0 }
    });

    // Original state must NOT be modified
    assert.strictEqual(Object.keys(state.players).length, originalPlayerCount,
      'Original state must not be mutated');

    // New state should have the player
    assert(newState.players['test_player'] !== undefined, 'Player should be in new state');
  });

  test('removePlayer returns new state without mutating input', () => {
    var state = State.createWorldState();
    state.players['alice'] = { id: 'alice', online: true };

    var newState = State.removePlayer(state, 'alice');

    // Original should still have online=true
    assert.strictEqual(state.players['alice'].online, true,
      'Original state must not be mutated');
    assert.strictEqual(newState.players['alice'].online, false,
      'New state should have offline player');
  });

  // ========================================================================
  // Bug #5: Chat deduplication in conflict merge
  // ========================================================================

  test('resolveConflict deduplicates chat messages', () => {
    var stateA = State.createWorldState();
    var stateB = State.createWorldState();

    var msg = { from: 'alice', text: 'hello', ts: 1000, type: 'say' };

    // Same message in both states (simulates network split)
    stateA.chat.push(msg);
    stateB.chat.push(msg);

    var merged = State.resolveConflict(stateA, stateB);

    // Should only appear once
    assert.strictEqual(merged.chat.length, 1, 'Duplicate chat should be deduplicated');
  });

  test('resolveConflict preserves unique chat messages', () => {
    var stateA = State.createWorldState();
    var stateB = State.createWorldState();

    stateA.chat.push({ from: 'alice', text: 'hello', ts: 1000, type: 'say' });
    stateB.chat.push({ from: 'bob', text: 'hi', ts: 2000, type: 'say' });

    var merged = State.resolveConflict(stateA, stateB);

    assert.strictEqual(merged.chat.length, 2, 'Unique messages should be preserved');
  });

  // ========================================================================
  // Bug #6: Portal symmetry enforcement
  // ========================================================================

  test('All portal connections are bidirectional', () => {
    var ids = Zones.getAllZoneIds();
    ids.forEach(function(a) {
      var zone = Zones.getZone(a);
      (zone.portals || []).forEach(function(b) {
        var other = Zones.getZone(b);
        assert(other.portals.indexOf(a) !== -1,
          a + ' -> ' + b + ' portal is not bidirectional');
      });
    });
  });

  // ========================================================================
  // Bug #7: Walking speed threshold (was 25km/h, now 9km/h)
  // ========================================================================

  test('calculateWarmth rejects cycling speed (15 km/h)', () => {
    var now = Date.now();
    // 15 km/h = 0.25 km/min → move 0.25 km in 1 minute
    // 0.25 km ≈ 0.00225° lat
    var gpsHistory = [
      { lat: 37.7749, lon: -122.4194, ts: now },
      { lat: 37.7749 + 0.00225, lon: -122.4194, ts: now + 60000 }
    ];

    var warmth = Physical.calculateWarmth(gpsHistory);
    assert.strictEqual(warmth, 0, 'Cycling speed (15 km/h) should not count as walking');
  });

  test('calculateWarmth accepts slow walking (4 km/h)', () => {
    var now = Date.now();
    // 4 km/h = 0.0667 km/min → 0.0006° lat per minute
    var gpsHistory = [
      { lat: 37.7749, lon: -122.4194, ts: now },
      { lat: 37.7749 + 0.0006, lon: -122.4194, ts: now + 60000 },
      { lat: 37.7749 + 0.0012, lon: -122.4194, ts: now + 120000 },
      { lat: 37.7749 + 0.0018, lon: -122.4194, ts: now + 180000 },
      { lat: 37.7749 + 0.0024, lon: -122.4194, ts: now + 240000 }
    ];

    var warmth = Physical.calculateWarmth(gpsHistory);
    assert(warmth > 0, 'Slow walking (4 km/h) should accumulate warmth');
  });

  // ========================================================================
  // Bug #8: Discovery dedup boundary (was <=, now <)
  // ========================================================================

  test('Discovery at exactly distance 5 is NOT a duplicate', () => {
    var state = {
      discoveries: [{
        id: 'disc1',
        discoverer: 'alice',
        position: { x: 0, y: 0, z: 0 },
        type: 'location'
      }]
    };

    // Position exactly 5 units away (5, 0, 0)
    var isDupe = Exploration.isDuplicate('alice', { x: 5, y: 0, z: 0 }, state);
    assert.strictEqual(isDupe, false, 'Exactly at distance 5 should be allowed');
  });

  test('Discovery at distance 4.9 IS a duplicate', () => {
    var state = {
      discoveries: [{
        id: 'disc1',
        discoverer: 'alice',
        position: { x: 0, y: 0, z: 0 },
        type: 'location'
      }]
    };

    var isDupe = Exploration.isDuplicate('alice', { x: 4.9, y: 0, z: 0 }, state);
    assert.strictEqual(isDupe, true, 'Within distance 5 should be duplicate');
  });

  // ========================================================================
  // Bug #9: Challenge only requires competition rule, not pvp
  // ========================================================================

  test('Challenge allowed in competition-only zone (no pvp needed)', () => {
    // Currently only arena has competition:true, but the rule should be
    // competition-only, not competition AND pvp
    var allowed = Zones.isActionAllowed('challenge', 'arena');
    assert.strictEqual(allowed, true, 'Challenge should be allowed in arena');
  });

  test('Challenge still blocked in non-competition zones', () => {
    assert.strictEqual(Zones.isActionAllowed('challenge', 'nexus'), false);
    assert.strictEqual(Zones.isActionAllowed('challenge', 'gardens'), false);
    assert.strictEqual(Zones.isActionAllowed('challenge', 'commons'), false);
  });
});

var success = report();
process.exit(success ? 0 : 1);
