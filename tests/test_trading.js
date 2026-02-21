const { test, suite, report, assert } = require('./test_runner');
const Trading = require('../src/js/trading');
const Inventory = require('../src/js/inventory');
const Economy = require('../src/js/economy');

// ============================================================
// Helpers
// ============================================================

/**
 * Reset Trading module's internal state between test groups.
 * Trading keeps activeTrades and pendingInvitations in closure-level
 * Maps and a monotonic tradeCounter.  We can't reset them directly, so
 * we use unique player IDs in every test to avoid cross-test collisions.
 *
 * For suites that DO need a clean slate we re-require the module.
 */

function makeInventoryWithItem(itemId, count) {
  const inv = Inventory.createInventory();
  Inventory.addItem(inv, itemId, count);
  return inv;
}

function makeLedgerWithBalance(playerId, amount) {
  const ledger = Economy.createLedger();
  ledger.balances[playerId] = amount;
  return ledger;
}

// Unique id generator so tests don't share state
let uid = 0;
function nextId(prefix) {
  return `${prefix || 'p'}_${++uid}`;
}

// ============================================================
// Suite 1 — initTrading
// ============================================================

suite('initTrading', () => {

  test('initTrading accepts a callback without throwing', () => {
    let called = false;
    assert.doesNotThrow(() => {
      Trading.initTrading((msg) => { called = true; });
    });
  });

  test('initTrading with null callback does not throw', () => {
    assert.doesNotThrow(() => {
      Trading.initTrading(null);
    });
  });

});

// ============================================================
// Suite 2 — requestTrade
// ============================================================

suite('requestTrade', () => {

  test('self-trade is rejected', () => {
    Trading.initTrading(null);
    const p = nextId('self');
    const result = Trading.requestTrade(p, p, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.success, false);
    assert(/yourself/i.test(result.message));
  });

  test('successful trade request returns tradeId', () => {
    Trading.initTrading(null);
    const a = nextId('req_a');
    const b = nextId('req_b');
    const result = Trading.requestTrade(a, b, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.success, true);
    assert(typeof result.tradeId === 'string', 'tradeId should be a string');
    assert(result.tradeId.length > 0, 'tradeId should be non-empty');
  });

  test('trade request triggers message callback', () => {
    const msgs = [];
    Trading.initTrading((msg) => msgs.push(msg));
    const a = nextId('cb_a');
    const b = nextId('cb_b');
    Trading.requestTrade(a, b, { x: 0, y: 0, z: 0 });
    assert.strictEqual(msgs.length, 1, 'Exactly one message should be emitted');
    assert.strictEqual(msgs[0].type, 'trade_offer');
  });

  test('duplicate trade request between same players is rejected', () => {
    Trading.initTrading(null);
    const a = nextId('dup_a');
    const b = nextId('dup_b');

    // First request — creates pending invitation
    Trading.requestTrade(a, b, {});

    // Accept so it becomes an active trade
    Trading.acceptTrade(
      Trading.getPendingInvitation(b).id, b, {}
    );

    // Second request between the same players
    const result = Trading.requestTrade(a, b, {});
    assert.strictEqual(result.success, false);
    assert(/already/i.test(result.message));
  });

  test('different player pairs can trade concurrently', () => {
    Trading.initTrading(null);
    const a = nextId('multi_a');
    const b = nextId('multi_b');
    const c = nextId('multi_c');
    const d = nextId('multi_d');

    const r1 = Trading.requestTrade(a, b, {});
    const r2 = Trading.requestTrade(c, d, {});

    assert.strictEqual(r1.success, true);
    assert.strictEqual(r2.success, true);
    assert.notStrictEqual(r1.tradeId, r2.tradeId, 'tradeIds must be unique');
  });

});

// ============================================================
// Suite 3 — acceptTrade
// ============================================================

suite('acceptTrade', () => {

  test('accept valid invitation creates active trade', () => {
    Trading.initTrading(null);
    const a = nextId('acc_a');
    const b = nextId('acc_b');

    const { tradeId } = Trading.requestTrade(a, b, {});
    const result = Trading.acceptTrade(tradeId, b, {});

    assert.strictEqual(result.success, true);
    assert(result.trade !== undefined, 'trade object should be returned');
    assert.strictEqual(result.trade.status, 'active');
    assert.strictEqual(result.trade.player1.id, a);
    assert.strictEqual(result.trade.player2.id, b);
  });

  test('accept with wrong player ID fails', () => {
    Trading.initTrading(null);
    const a = nextId('wrp_a');
    const b = nextId('wrp_b');
    const c = nextId('wrp_c');

    const { tradeId } = Trading.requestTrade(a, b, {});
    const result = Trading.acceptTrade(tradeId, c, {});

    assert.strictEqual(result.success, false);
    assert(/recipient/i.test(result.message));
  });

  test('accept nonexistent invitation fails', () => {
    Trading.initTrading(null);
    const result = Trading.acceptTrade('nonexistent_trade_id', nextId(), {});
    assert.strictEqual(result.success, false);
    assert(/not found/i.test(result.message));
  });

  test('accept removes invitation from pending', () => {
    Trading.initTrading(null);
    const a = nextId('rem_a');
    const b = nextId('rem_b');

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    // Invitation should no longer exist
    const inv = Trading.getPendingInvitation(b);
    assert.strictEqual(inv, null, 'Invitation should be removed after accept');
  });

  test('accept emits trade_accept message', () => {
    const msgs = [];
    Trading.initTrading((msg) => msgs.push(msg));
    const a = nextId('amsg_a');
    const b = nextId('amsg_b');

    const { tradeId } = Trading.requestTrade(a, b, {});
    msgs.length = 0; // clear request message

    Trading.acceptTrade(tradeId, b, {});
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].type, 'trade_accept');
  });

});

// ============================================================
// Suite 4 — declineTrade
// ============================================================

suite('declineTrade', () => {

  test('decline valid invitation succeeds', () => {
    Trading.initTrading(null);
    const a = nextId('dec_a');
    const b = nextId('dec_b');

    const { tradeId } = Trading.requestTrade(a, b, {});
    const result = Trading.declineTrade(tradeId, b, {});

    assert.strictEqual(result.success, true);
  });

  test('decline with wrong player fails', () => {
    Trading.initTrading(null);
    const a = nextId('dw_a');
    const b = nextId('dw_b');
    const c = nextId('dw_c');

    const { tradeId } = Trading.requestTrade(a, b, {});
    const result = Trading.declineTrade(tradeId, c, {});

    assert.strictEqual(result.success, false);
    assert(/recipient/i.test(result.message));
  });

  test('decline nonexistent invitation fails', () => {
    Trading.initTrading(null);
    const result = Trading.declineTrade('no_such_id', nextId(), {});
    assert.strictEqual(result.success, false);
  });

  test('decline removes invitation from pending', () => {
    Trading.initTrading(null);
    const a = nextId('drm_a');
    const b = nextId('drm_b');

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.declineTrade(tradeId, b, {});

    assert.strictEqual(Trading.getPendingInvitation(b), null);
  });

  test('decline emits trade_decline message', () => {
    const msgs = [];
    Trading.initTrading((msg) => msgs.push(msg));
    const a = nextId('dm_a');
    const b = nextId('dm_b');

    const { tradeId } = Trading.requestTrade(a, b, {});
    msgs.length = 0;

    Trading.declineTrade(tradeId, b, {});
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].type, 'trade_decline');
  });

});

// ============================================================
// Suite 5 — addItemToTrade
// ============================================================

suite('addItemToTrade', () => {

  function setupActiveTrade() {
    Trading.initTrading(null);
    const a = nextId('ai_a');
    const b = nextId('ai_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    return { tradeId, a, b };
  }

  test('add valid item to trade succeeds', () => {
    const { tradeId, a } = setupActiveTrade();
    const inv = makeInventoryWithItem('wood_oak', 5);
    const result = Trading.addItemToTrade(tradeId, a, 0, inv, {});
    assert.strictEqual(result.success, true);
  });

  test('add item to nonexistent trade fails', () => {
    const inv = makeInventoryWithItem('wood_oak', 1);
    const result = Trading.addItemToTrade('bad_id', nextId(), 0, inv, {});
    assert.strictEqual(result.success, false);
    assert(/not found/i.test(result.message));
  });

  test('add item when not part of trade fails', () => {
    const { tradeId } = setupActiveTrade();
    const outsider = nextId('outsider');
    const inv = makeInventoryWithItem('wood_oak', 1);
    const result = Trading.addItemToTrade(tradeId, outsider, 0, inv, {});
    assert.strictEqual(result.success, false);
    assert(/not part/i.test(result.message));
  });

  test('add item from empty slot fails', () => {
    const { tradeId, a } = setupActiveTrade();
    const inv = Inventory.createInventory(); // all null slots
    const result = Trading.addItemToTrade(tradeId, a, 0, inv, {});
    assert.strictEqual(result.success, false);
    assert(/no item/i.test(result.message));
  });

  test('adding same slot twice is rejected', () => {
    const { tradeId, a } = setupActiveTrade();
    const inv = makeInventoryWithItem('wood_oak', 10);
    Trading.addItemToTrade(tradeId, a, 0, inv, {});
    const result = Trading.addItemToTrade(tradeId, a, 0, inv, {});
    assert.strictEqual(result.success, false);
    assert(/already/i.test(result.message));
  });

  test('cannot add more than 6 items', () => {
    const { tradeId, a } = setupActiveTrade();
    const inv = Inventory.createInventory();
    const items = ['wood_oak', 'wood_pine', 'stone_common', 'stone_marble',
                   'flower_rose', 'flower_tulip', 'flower_lotus'];
    for (let i = 0; i < items.length; i++) {
      Inventory.addItem(inv, items[i], 1);
    }

    // Add 6 items — all should succeed
    for (let i = 0; i < 6; i++) {
      const r = Trading.addItemToTrade(tradeId, a, i, inv, {});
      assert.strictEqual(r.success, true, `Item ${i} should be added`);
    }

    // 7th should fail
    const r7 = Trading.addItemToTrade(tradeId, a, 6, inv, {});
    assert.strictEqual(r7.success, false);
    assert(/full|max/i.test(r7.message));
  });

  test('adding item resets ready status for both players', () => {
    const { tradeId, a, b } = setupActiveTrade();

    // Set both ready
    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    const inv = makeInventoryWithItem('wood_oak', 1);
    Trading.addItemToTrade(tradeId, a, 0, inv, {});

    // Check via getActiveTrade
    const trade = Trading.getActiveTrade(a);
    assert.strictEqual(trade.player1.ready, false, 'Player 1 ready should reset');
    assert.strictEqual(trade.player2.ready, false, 'Player 2 ready should reset');
  });

  test('player2 can add item to trade', () => {
    const { tradeId, b } = setupActiveTrade();
    const inv = makeInventoryWithItem('flower_rose', 3);
    const result = Trading.addItemToTrade(tradeId, b, 0, inv, {});
    assert.strictEqual(result.success, true);
  });

});

// ============================================================
// Suite 6 — removeItemFromTrade
// ============================================================

suite('removeItemFromTrade', () => {

  function setupTradeWithItem() {
    Trading.initTrading(null);
    const a = nextId('ri_a');
    const b = nextId('ri_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    const inv = makeInventoryWithItem('wood_oak', 5);
    Trading.addItemToTrade(tradeId, a, 0, inv, {});

    return { tradeId, a, b, inv };
  }

  test('remove valid trade slot succeeds', () => {
    const { tradeId, a } = setupTradeWithItem();
    const result = Trading.removeItemFromTrade(tradeId, a, 0, {});
    assert.strictEqual(result.success, true);
  });

  test('remove from nonexistent trade fails', () => {
    const result = Trading.removeItemFromTrade('bad_id', nextId(), 0, {});
    assert.strictEqual(result.success, false);
    assert(/not found/i.test(result.message));
  });

  test('remove with invalid slot index fails', () => {
    const { tradeId, a } = setupTradeWithItem();
    const result = Trading.removeItemFromTrade(tradeId, a, 99, {});
    assert.strictEqual(result.success, false);
    assert(/invalid|slot/i.test(result.message));
  });

  test('remove with negative slot index fails', () => {
    const { tradeId, a } = setupTradeWithItem();
    const result = Trading.removeItemFromTrade(tradeId, a, -1, {});
    assert.strictEqual(result.success, false);
  });

  test('remove item when not part of trade fails', () => {
    const { tradeId } = setupTradeWithItem();
    const outsider = nextId('ro');
    const result = Trading.removeItemFromTrade(tradeId, outsider, 0, {});
    assert.strictEqual(result.success, false);
    assert(/not part/i.test(result.message));
  });

  test('remove item decreases trade item count', () => {
    const { tradeId, a } = setupTradeWithItem();
    Trading.removeItemFromTrade(tradeId, a, 0, {});

    const trade = Trading.getActiveTrade(a);
    assert.strictEqual(trade.player1.items.length, 0, 'Items array should be empty');
  });

  test('remove item resets ready status', () => {
    const { tradeId, a, b } = setupTradeWithItem();
    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    Trading.removeItemFromTrade(tradeId, a, 0, {});

    const trade = Trading.getActiveTrade(a);
    assert.strictEqual(trade.player1.ready, false);
    assert.strictEqual(trade.player2.ready, false);
  });

});

// ============================================================
// Suite 7 — setSparkOffer
// ============================================================

suite('setSparkOffer', () => {

  function setupTrade() {
    Trading.initTrading(null);
    const a = nextId('sp_a');
    const b = nextId('sp_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    return { tradeId, a, b };
  }

  test('set valid spark amount succeeds', () => {
    const { tradeId, a } = setupTrade();
    const ledger = makeLedgerWithBalance(a, 100);
    const result = Trading.setSparkOffer(tradeId, a, 50, ledger, {});
    assert.strictEqual(result.success, true);
  });

  test('set zero spark is valid', () => {
    const { tradeId, a } = setupTrade();
    const ledger = makeLedgerWithBalance(a, 100);
    const result = Trading.setSparkOffer(tradeId, a, 0, ledger, {});
    assert.strictEqual(result.success, true);
  });

  test('negative spark amount is rejected', () => {
    const { tradeId, a } = setupTrade();
    const ledger = makeLedgerWithBalance(a, 100);
    const result = Trading.setSparkOffer(tradeId, a, -10, ledger, {});
    assert.strictEqual(result.success, false);
    assert(/non-negative/i.test(result.message));
  });

  test('spark offer exceeding balance is rejected', () => {
    const { tradeId, a } = setupTrade();
    const ledger = makeLedgerWithBalance(a, 10);
    const result = Trading.setSparkOffer(tradeId, a, 100, ledger, {});
    assert.strictEqual(result.success, false);
    assert(/insufficient/i.test(result.message));
  });

  test('spark offer for nonexistent trade fails', () => {
    const ledger = makeLedgerWithBalance('p_x', 100);
    const result = Trading.setSparkOffer('bad_trade', 'p_x', 10, ledger, {});
    assert.strictEqual(result.success, false);
    assert(/not found/i.test(result.message));
  });

  test('spark offer when not in trade fails', () => {
    const { tradeId } = setupTrade();
    const outsider = nextId('sp_out');
    const ledger = makeLedgerWithBalance(outsider, 100);
    const result = Trading.setSparkOffer(tradeId, outsider, 10, ledger, {});
    assert.strictEqual(result.success, false);
    assert(/not part/i.test(result.message));
  });

  test('setting spark resets ready status', () => {
    const { tradeId, a, b } = setupTrade();
    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    const ledger = makeLedgerWithBalance(a, 100);
    Trading.setSparkOffer(tradeId, a, 20, ledger, {});

    const trade = Trading.getActiveTrade(a);
    assert.strictEqual(trade.player1.ready, false);
    assert.strictEqual(trade.player2.ready, false);
  });

  test('spark offer is stored on trade object', () => {
    const { tradeId, a } = setupTrade();
    const ledger = makeLedgerWithBalance(a, 200);
    Trading.setSparkOffer(tradeId, a, 75, ledger, {});

    const trade = Trading.getActiveTrade(a);
    assert.strictEqual(trade.player1.spark, 75);
  });

  test('player2 can set spark offer', () => {
    const { tradeId, b } = setupTrade();
    const ledger = makeLedgerWithBalance(b, 50);
    const result = Trading.setSparkOffer(tradeId, b, 30, ledger, {});
    assert.strictEqual(result.success, true);

    const trade = Trading.getActiveTrade(b);
    assert.strictEqual(trade.player2.spark, 30);
  });

});

// ============================================================
// Suite 8 — setReady
// ============================================================

suite('setReady', () => {

  function setupTrade() {
    Trading.initTrading(null);
    const a = nextId('sr_a');
    const b = nextId('sr_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    return { tradeId, a, b };
  }

  test('setReady returns success and bothReady=false when only one ready', () => {
    const { tradeId, a } = setupTrade();
    const result = Trading.setReady(tradeId, a, {});
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.bothReady, false);
  });

  test('setReady returns bothReady=true when both players ready', () => {
    const { tradeId, a, b } = setupTrade();
    Trading.setReady(tradeId, a, {});
    const result = Trading.setReady(tradeId, b, {});
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.bothReady, true);
  });

  test('setReady on nonexistent trade fails', () => {
    const result = Trading.setReady('no_id', nextId(), {});
    assert.strictEqual(result.success, false);
  });

  test('setReady when not in trade fails', () => {
    const { tradeId } = setupTrade();
    const outsider = nextId('sr_out');
    const result = Trading.setReady(tradeId, outsider, {});
    assert.strictEqual(result.success, false);
    assert(/not part/i.test(result.message));
  });

  test('ready flag is stored on trade', () => {
    const { tradeId, a } = setupTrade();
    Trading.setReady(tradeId, a, {});
    const trade = Trading.getActiveTrade(a);
    assert.strictEqual(trade.player1.ready, true);
    assert.strictEqual(trade.player2.ready, false);
  });

});

// ============================================================
// Suite 9 — confirmTrade
// ============================================================

suite('confirmTrade', () => {

  function setupReadyTrade() {
    Trading.initTrading(null);
    const a = nextId('ct_a');
    const b = nextId('ct_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});
    return { tradeId, a, b };
  }

  test('confirm before ready fails', () => {
    Trading.initTrading(null);
    const a = nextId('cbr_a');
    const b = nextId('cbr_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    // Not calling setReady

    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();
    const ledger = Economy.createLedger();

    const result = Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    assert.strictEqual(result.success, false);
    assert(/ready/i.test(result.message));
  });

  test('first confirm returns executed=false', () => {
    const { tradeId, a } = setupReadyTrade();
    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();
    const ledger = Economy.createLedger();

    const result = Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.executed, false);
  });

  test('both confirm executes trade', () => {
    const { tradeId, a, b } = setupReadyTrade();
    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();
    const ledger = Economy.createLedger();

    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.executed, true);
  });

  test('confirm on nonexistent trade fails', () => {
    const result = Trading.confirmTrade('nope', nextId(), {}, {}, {}, {});
    assert.strictEqual(result.success, false);
    assert(/not found/i.test(result.message));
  });

  test('confirm when not in trade fails', () => {
    const { tradeId } = setupReadyTrade();
    const outsider = nextId('ct_out');
    const result = Trading.confirmTrade(tradeId, outsider, {}, {}, {}, {});
    assert.strictEqual(result.success, false);
    assert(/not part/i.test(result.message));
  });

  test('executed trade is removed from active trades', () => {
    const { tradeId, a, b } = setupReadyTrade();
    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();
    const ledger = Economy.createLedger();

    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(Trading.getActiveTrade(a), null, 'No active trade after completion');
    assert.strictEqual(Trading.getActiveTrade(b), null);
  });

});

// ============================================================
// Suite 10 — cancelTrade
// ============================================================

suite('cancelTrade', () => {

  test('player1 can cancel active trade', () => {
    Trading.initTrading(null);
    const a = nextId('can_a');
    const b = nextId('can_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    const result = Trading.cancelTrade(tradeId, a, {});
    assert.strictEqual(result.success, true);
  });

  test('player2 can cancel active trade', () => {
    Trading.initTrading(null);
    const a = nextId('can2_a');
    const b = nextId('can2_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    const result = Trading.cancelTrade(tradeId, b, {});
    assert.strictEqual(result.success, true);
  });

  test('initiator can cancel pending invitation', () => {
    Trading.initTrading(null);
    const a = nextId('cpend_a');
    const b = nextId('cpend_b');
    const { tradeId } = Trading.requestTrade(a, b, {});

    // Cancel before acceptance — tradeId is in pendingInvitations
    const result = Trading.cancelTrade(tradeId, a, {});
    assert.strictEqual(result.success, true);
  });

  test('outsider cannot cancel trade', () => {
    Trading.initTrading(null);
    const a = nextId('cext_a');
    const b = nextId('cext_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    const outsider = nextId('cext_out');
    const result = Trading.cancelTrade(tradeId, outsider, {});
    assert.strictEqual(result.success, false);
    assert(/not part/i.test(result.message));
  });

  test('cancel nonexistent trade fails', () => {
    const result = Trading.cancelTrade('nope_id', nextId(), {});
    assert.strictEqual(result.success, false);
  });

  test('cancel removes trade from active trades', () => {
    Trading.initTrading(null);
    const a = nextId('crm_a');
    const b = nextId('crm_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    Trading.cancelTrade(tradeId, a, {});

    assert.strictEqual(Trading.getActiveTrade(a), null);
    assert.strictEqual(Trading.getActiveTrade(b), null);
  });

  test('cancel emits trade_decline message', () => {
    const msgs = [];
    Trading.initTrading((msg) => msgs.push(msg));
    const a = nextId('cmsg_a');
    const b = nextId('cmsg_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    msgs.length = 0;

    Trading.cancelTrade(tradeId, a, {});
    assert.strictEqual(msgs.length, 1);
    assert.strictEqual(msgs[0].type, 'trade_decline');
  });

});

// ============================================================
// Suite 11 — executeTrade (via confirmTrade end-to-end)
// ============================================================

suite('executeTrade (end-to-end item swap)', () => {

  test('items swap between players on execution', () => {
    Trading.initTrading(null);
    const a = nextId('ex_a');
    const b = nextId('ex_b');

    const inv1 = makeInventoryWithItem('wood_oak', 5);
    const inv2 = makeInventoryWithItem('flower_rose', 3);

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    // Player a offers wood_oak (slot 0), player b offers flower_rose (slot 0)
    Trading.addItemToTrade(tradeId, a, 0, inv1, {});
    Trading.addItemToTrade(tradeId, b, 0, inv2, {});

    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    const ledger = Economy.createLedger();
    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.executed, true);

    // inv1 should now have flower_rose and no wood_oak
    assert(Inventory.hasItem(inv1, 'flower_rose'), 'Player 1 should have flower_rose');
    assert(!Inventory.hasItem(inv1, 'wood_oak'), 'Player 1 should not have wood_oak');

    // inv2 should now have wood_oak and no flower_rose
    assert(Inventory.hasItem(inv2, 'wood_oak'), 'Player 2 should have wood_oak');
    assert(!Inventory.hasItem(inv2, 'flower_rose'), 'Player 2 should not have flower_rose');
  });

  test('spark transfers correctly on execution', () => {
    Trading.initTrading(null);
    const a = nextId('sp_ex_a');
    const b = nextId('sp_ex_b');

    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();

    const ledger = Economy.createLedger();
    ledger.balances[a] = 50;
    ledger.balances[b] = 30;

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    // a offers 20 spark, b offers 10 spark
    Trading.setSparkOffer(tradeId, a, 20, ledger, {});
    Trading.setSparkOffer(tradeId, b, 10, ledger, {});

    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.executed, true);

    // a: 50 - 20 + 10 = 40
    assert.strictEqual(Economy.getBalance(ledger, a), 40, 'Player a balance after spark swap');
    // b: 30 - 10 + 20 = 40
    assert.strictEqual(Economy.getBalance(ledger, b), 40, 'Player b balance after spark swap');
  });

  test('trade fails when player1 no longer has offered item', () => {
    Trading.initTrading(null);
    const a = nextId('fl_a');
    const b = nextId('fl_b');

    const inv1 = makeInventoryWithItem('wood_oak', 1);
    const inv2 = Inventory.createInventory();

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    Trading.addItemToTrade(tradeId, a, 0, inv1, {});

    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    // Remove item from inventory before execution
    Inventory.removeItem(inv1, 'wood_oak', 1);

    const ledger = Economy.createLedger();
    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(result.success, false);
    assert(/player 1/i.test(result.message));
  });

  test('trade fails when player2 no longer has offered item', () => {
    Trading.initTrading(null);
    const a = nextId('fl2_a');
    const b = nextId('fl2_b');

    const inv1 = Inventory.createInventory();
    const inv2 = makeInventoryWithItem('flower_rose', 1);

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    Trading.addItemToTrade(tradeId, b, 0, inv2, {});

    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    // Remove from inv2 before execution
    Inventory.removeItem(inv2, 'flower_rose', 1);

    const ledger = Economy.createLedger();
    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(result.success, false);
    assert(/player 2/i.test(result.message));
  });

  test('trade fails when player1 has insufficient spark at execution', () => {
    Trading.initTrading(null);
    const a = nextId('isp_a');
    const b = nextId('isp_b');

    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();
    const ledger = Economy.createLedger();
    ledger.balances[a] = 100;

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    Trading.setSparkOffer(tradeId, a, 50, ledger, {});

    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    // Drain player a's balance before execution
    ledger.balances[a] = 10;

    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(result.success, false);
    assert(/player 1.*spark|spark.*player 1/i.test(result.message));
  });

  test('multi-item trade: both sides offer multiple items', () => {
    Trading.initTrading(null);
    const a = nextId('mi_a');
    const b = nextId('mi_b');

    const inv1 = Inventory.createInventory();
    Inventory.addItem(inv1, 'wood_oak', 5);
    Inventory.addItem(inv1, 'stone_common', 10);

    const inv2 = Inventory.createInventory();
    Inventory.addItem(inv2, 'flower_rose', 2);
    Inventory.addItem(inv2, 'potion_healing', 1);

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    Trading.addItemToTrade(tradeId, a, 0, inv1, {}); // wood_oak
    Trading.addItemToTrade(tradeId, a, 1, inv1, {}); // stone_common
    Trading.addItemToTrade(tradeId, b, 0, inv2, {}); // flower_rose
    Trading.addItemToTrade(tradeId, b, 1, inv2, {}); // potion_healing

    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    const ledger = Economy.createLedger();
    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.executed, true);

    assert(Inventory.hasItem(inv1, 'flower_rose'), 'a should have flower_rose');
    assert(Inventory.hasItem(inv1, 'potion_healing'), 'a should have potion_healing');
    assert(Inventory.hasItem(inv2, 'wood_oak'), 'b should have wood_oak');
    assert(Inventory.hasItem(inv2, 'stone_common'), 'b should have stone_common');
  });

});

// ============================================================
// Suite 12 — handleTradeMessage
// ============================================================

suite('handleTradeMessage', () => {

  test('returns null for null message', () => {
    const result = Trading.handleTradeMessage(null);
    assert.strictEqual(result, null);
  });

  test('returns null for message without type', () => {
    const result = Trading.handleTradeMessage({ payload: {} });
    assert.strictEqual(result, null);
  });

  test('returns null for message without payload', () => {
    const result = Trading.handleTradeMessage({ type: 'trade_offer' });
    assert.strictEqual(result, null);
  });

  test('trade_offer with targetPlayer yields trade_request', () => {
    const msg = {
      type: 'trade_offer',
      from: 'alice',
      payload: { tradeId: 'tid_001', targetPlayer: 'bob' }
    };
    const result = Trading.handleTradeMessage(msg);
    assert.strictEqual(result.type, 'trade_request');
    assert.strictEqual(result.data.tradeId, 'tid_001');
    assert.strictEqual(result.data.from, 'alice');
    assert.strictEqual(result.data.to, 'bob');
  });

  test('trade_offer without targetPlayer yields trade_update', () => {
    const msg = {
      type: 'trade_offer',
      from: 'alice',
      payload: {
        tradeId: 'tid_002',
        player1: { items: [], spark: 0, ready: false, confirmed: false },
        player2: { items: [], spark: 0, ready: false, confirmed: false },
        status: 'active'
      }
    };
    const result = Trading.handleTradeMessage(msg);
    assert.strictEqual(result.type, 'trade_update');
    assert.strictEqual(result.data.tradeId, 'tid_002');
    assert.strictEqual(result.data.status, 'active');
  });

  test('trade_accept with status=completed yields trade_complete', () => {
    const msg = {
      type: 'trade_accept',
      from: 'alice',
      payload: { tradeId: 'tid_003', status: 'completed' }
    };
    const result = Trading.handleTradeMessage(msg);
    assert.strictEqual(result.type, 'trade_complete');
    assert.strictEqual(result.data.tradeId, 'tid_003');
  });

  test('trade_accept with confirmed=true yields trade_confirm', () => {
    const msg = {
      type: 'trade_accept',
      from: 'bob',
      payload: { tradeId: 'tid_004', confirmed: true }
    };
    const result = Trading.handleTradeMessage(msg);
    assert.strictEqual(result.type, 'trade_confirm');
    assert.strictEqual(result.data.tradeId, 'tid_004');
    assert.strictEqual(result.data.playerId, 'bob');
  });

  test('trade_accept without special fields yields trade_accepted', () => {
    const msg = {
      type: 'trade_accept',
      from: 'bob',
      payload: { tradeId: 'tid_005' }
    };
    const result = Trading.handleTradeMessage(msg);
    assert.strictEqual(result.type, 'trade_accepted');
    assert.strictEqual(result.data.playerId, 'bob');
  });

  test('trade_decline yields trade_cancelled with declined reason', () => {
    const msg = {
      type: 'trade_decline',
      from: 'alice',
      payload: { tradeId: 'tid_006' }
    };
    const result = Trading.handleTradeMessage(msg);
    assert.strictEqual(result.type, 'trade_cancelled');
    assert.strictEqual(result.data.reason, 'declined');
  });

  test('trade_decline with custom reason preserves it', () => {
    const msg = {
      type: 'trade_decline',
      from: 'alice',
      payload: { tradeId: 'tid_007', reason: 'cancelled' }
    };
    const result = Trading.handleTradeMessage(msg);
    assert.strictEqual(result.data.reason, 'cancelled');
  });

  test('unknown message type returns null', () => {
    const msg = {
      type: 'move',
      from: 'alice',
      payload: {}
    };
    const result = Trading.handleTradeMessage(msg);
    assert.strictEqual(result, null);
  });

});

// ============================================================
// Suite 13 — getActiveTrade & getPendingInvitation
// ============================================================

suite('getActiveTrade and getPendingInvitation', () => {

  test('getActiveTrade returns null when no trade exists', () => {
    Trading.initTrading(null);
    const result = Trading.getActiveTrade('no_trade_player');
    assert.strictEqual(result, null);
  });

  test('getActiveTrade returns trade for player1', () => {
    Trading.initTrading(null);
    const a = nextId('gat_a');
    const b = nextId('gat_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    const trade = Trading.getActiveTrade(a);
    assert(trade !== null, 'Should find trade for player1');
    assert.strictEqual(trade.id, tradeId);
  });

  test('getActiveTrade returns trade for player2', () => {
    Trading.initTrading(null);
    const a = nextId('gat2_a');
    const b = nextId('gat2_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    const trade = Trading.getActiveTrade(b);
    assert(trade !== null, 'Should find trade for player2');
    assert.strictEqual(trade.id, tradeId);
  });

  test('getPendingInvitation returns null when none exist', () => {
    Trading.initTrading(null);
    const result = Trading.getPendingInvitation('nobody');
    assert.strictEqual(result, null);
  });

  test('getPendingInvitation returns invitation for target player', () => {
    Trading.initTrading(null);
    const a = nextId('gpi_a');
    const b = nextId('gpi_b');
    const { tradeId } = Trading.requestTrade(a, b, {});

    const inv = Trading.getPendingInvitation(b);
    assert(inv !== null, 'Should find invitation');
    assert.strictEqual(inv.id, tradeId);
    assert.strictEqual(inv.from, a);
    assert.strictEqual(inv.to, b);
  });

  test('getPendingInvitation returns null for sender (not recipient)', () => {
    Trading.initTrading(null);
    const a = nextId('gpis_a');
    const b = nextId('gpis_b');
    Trading.requestTrade(a, b, {});

    // The sender is not the recipient, so getPendingInvitation won't find them
    const inv = Trading.getPendingInvitation(a);
    assert.strictEqual(inv, null, 'Sender should not find invitation via getPendingInvitation');
  });

});

// ============================================================
// Suite 14 — Edge cases
// ============================================================

suite('Edge cases', () => {

  test('cannot operate on cancelled trade', () => {
    Trading.initTrading(null);
    const a = nextId('ec_a');
    const b = nextId('ec_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});
    Trading.cancelTrade(tradeId, a, {});

    // After cancel, trade is removed — operations should all fail
    const inv = makeInventoryWithItem('wood_oak', 1);
    const addResult = Trading.addItemToTrade(tradeId, a, 0, inv, {});
    assert.strictEqual(addResult.success, false);
  });

  test('multiple concurrent trades do not interfere', () => {
    Trading.initTrading(null);
    const a1 = nextId('mct_a1');
    const b1 = nextId('mct_b1');
    const a2 = nextId('mct_a2');
    const b2 = nextId('mct_b2');

    const { tradeId: tid1 } = Trading.requestTrade(a1, b1, {});
    const { tradeId: tid2 } = Trading.requestTrade(a2, b2, {});
    Trading.acceptTrade(tid1, b1, {});
    Trading.acceptTrade(tid2, b2, {});

    const inv1 = makeInventoryWithItem('wood_oak', 2);
    const inv2 = makeInventoryWithItem('flower_rose', 2);

    Trading.addItemToTrade(tid1, a1, 0, inv1, {});
    Trading.addItemToTrade(tid2, a2, 0, inv2, {});

    assert.strictEqual(Trading.getActiveTrade(a1).id, tid1);
    assert.strictEqual(Trading.getActiveTrade(a2).id, tid2);
  });

  test('trade with only spark (no items) executes successfully', () => {
    Trading.initTrading(null);
    const a = nextId('so_a');
    const b = nextId('so_b');

    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();

    const ledger = Economy.createLedger();
    ledger.balances[a] = 100;

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    Trading.setSparkOffer(tradeId, a, 25, ledger, {});

    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.executed, true);
    assert.strictEqual(Economy.getBalance(ledger, a), 75);
    assert.strictEqual(Economy.getBalance(ledger, b), 25);
  });

  test('empty trade (no items, no spark) executes successfully', () => {
    Trading.initTrading(null);
    const a = nextId('emp_a');
    const b = nextId('emp_b');

    const inv1 = Inventory.createInventory();
    const inv2 = Inventory.createInventory();
    const ledger = Economy.createLedger();

    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    Trading.setReady(tradeId, a, {});
    Trading.setReady(tradeId, b, {});

    Trading.confirmTrade(tradeId, a, inv1, inv2, ledger, {});
    const result = Trading.confirmTrade(tradeId, b, inv1, inv2, ledger, {});

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.executed, true);
  });

  test('invitation has timestamp', () => {
    Trading.initTrading(null);
    const a = nextId('ts_a');
    const b = nextId('ts_b');
    Trading.requestTrade(a, b, {});

    const inv = Trading.getPendingInvitation(b);
    assert(typeof inv.timestamp === 'number', 'Invitation should have numeric timestamp');
    assert(inv.timestamp > 0, 'Timestamp should be positive');
  });

  test('active trade has timestamp', () => {
    Trading.initTrading(null);
    const a = nextId('ats_a');
    const b = nextId('ats_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    const { trade } = Trading.acceptTrade(tradeId, b, {});
    assert(typeof trade.timestamp === 'number', 'Active trade should have numeric timestamp');
  });

  test('trade id format is predictable', () => {
    Trading.initTrading(null);
    const a = nextId('fmt_a');
    const b = nextId('fmt_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    assert(/^trade_\d+_\d+$/.test(tradeId), `tradeId "${tradeId}" should match trade_N_timestamp format`);
  });

  test('initTrading with callback enables message broadcasting', () => {
    const msgs = [];
    Trading.initTrading((msg) => msgs.push(msg));

    const a = nextId('bc_a');
    const b = nextId('bc_b');
    const { tradeId } = Trading.requestTrade(a, b, {});
    Trading.acceptTrade(tradeId, b, {});

    const inv = makeInventoryWithItem('wood_oak', 5);
    Trading.addItemToTrade(tradeId, a, 0, inv, {});

    // At minimum: requestTrade, acceptTrade, addItemToTrade should emit messages
    assert(msgs.length >= 3, `Expected at least 3 messages, got ${msgs.length}`);
  });

});

// ============================================================
// Final report
// ============================================================

const success = report();
process.exit(success ? 0 : 1);
