/**
 * ZION Trading System - Player-to-Player Trading
 * Peer-to-peer item and Spark trading with confirmation flow
 */

(function(exports) {
  'use strict';

  // Import references
  const Protocol = typeof require !== 'undefined' ? require('./protocol') : window.Protocol;
  const Inventory = typeof require !== 'undefined' ? require('./inventory') : window.Inventory;
  const Economy = typeof require !== 'undefined' ? require('./economy') : window.Economy;

  // Active trades by trade ID
  const activeTrades = new Map();

  // Trade invitations (pending requests)
  const pendingInvitations = new Map();

  let tradeCounter = 0;
  let messageCallback = null;

  /**
   * Initialize trading system
   * @param {Function} onMessage - Callback to send trade protocol messages
   */
  function initTrading(onMessage) {
    messageCallback = onMessage;
    console.log('Trading system initialized');
  }

  /**
   * Request trade with another player
   * @param {string} fromPlayerId - Initiating player ID
   * @param {string} toPlayerId - Target player ID
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean, tradeId?: string}
   */
  function requestTrade(fromPlayerId, toPlayerId, position) {
    if (fromPlayerId === toPlayerId) {
      return { success: false, message: 'Cannot trade with yourself' };
    }

    // Check if already in a trade with this player
    for (const [tradeId, trade] of activeTrades.entries()) {
      if ((trade.player1.id === fromPlayerId && trade.player2.id === toPlayerId) ||
          (trade.player1.id === toPlayerId && trade.player2.id === fromPlayerId)) {
        return { success: false, message: 'Already in a trade with this player' };
      }
    }

    const tradeId = `trade_${tradeCounter++}_${Date.now()}`;

    // Create pending invitation
    pendingInvitations.set(tradeId, {
      id: tradeId,
      from: fromPlayerId,
      to: toPlayerId,
      timestamp: Date.now()
    });

    // Send trade offer message
    if (messageCallback) {
      const msg = Protocol.create.trade_offer(fromPlayerId, {
        tradeId: tradeId,
        targetPlayer: toPlayerId
      }, { position: position });
      messageCallback(msg);
    }

    return { success: true, tradeId: tradeId };
  }

  /**
   * Accept trade request
   * @param {string} tradeId - Trade ID
   * @param {string} playerId - Accepting player ID
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean, trade?: Object}
   */
  function acceptTrade(tradeId, playerId, position) {
    const invitation = pendingInvitations.get(tradeId);

    if (!invitation) {
      return { success: false, message: 'Trade invitation not found' };
    }

    if (invitation.to !== playerId) {
      return { success: false, message: 'Not the intended recipient' };
    }

    // Create trade session
    const trade = {
      id: tradeId,
      player1: {
        id: invitation.from,
        items: [], // Array of {slot: number, itemId: string, count: number}
        spark: 0,
        ready: false,
        confirmed: false
      },
      player2: {
        id: invitation.to,
        items: [],
        spark: 0,
        ready: false,
        confirmed: false
      },
      status: 'active', // active, cancelled, completed
      timestamp: Date.now()
    };

    activeTrades.set(tradeId, trade);
    pendingInvitations.delete(tradeId);

    // Send acceptance message
    if (messageCallback) {
      const msg = Protocol.create.trade_accept(playerId, {
        tradeId: tradeId
      }, { position: position });
      messageCallback(msg);
    }

    return { success: true, trade: trade };
  }

  /**
   * Decline trade request
   * @param {string} tradeId - Trade ID
   * @param {string} playerId - Declining player ID
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean}
   */
  function declineTrade(tradeId, playerId, position) {
    const invitation = pendingInvitations.get(tradeId);

    if (!invitation) {
      return { success: false, message: 'Trade invitation not found' };
    }

    if (invitation.to !== playerId) {
      return { success: false, message: 'Not the intended recipient' };
    }

    pendingInvitations.delete(tradeId);

    // Send decline message
    if (messageCallback) {
      const msg = Protocol.create.trade_decline(playerId, {
        tradeId: tradeId
      }, { position: position });
      messageCallback(msg);
    }

    return { success: true };
  }

  /**
   * Add item to trade offer
   * @param {string} tradeId - Trade ID
   * @param {string} playerId - Player adding item
   * @param {number} itemSlot - Inventory slot index
   * @param {Object} inventory - Player's inventory
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean}
   */
  function addItemToTrade(tradeId, playerId, itemSlot, inventory, position) {
    const trade = activeTrades.get(tradeId);

    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }

    if (trade.status !== 'active') {
      return { success: false, message: 'Trade is not active' };
    }

    const player = trade.player1.id === playerId ? trade.player1 : trade.player2;

    if (!player || player.id !== playerId) {
      return { success: false, message: 'Not part of this trade' };
    }

    // Check if already at max items (6 slots)
    if (player.items.length >= 6) {
      return { success: false, message: 'Trade slots full (max 6 items)' };
    }

    // Verify item exists in inventory
    const item = inventory.slots[itemSlot];
    if (!item) {
      return { success: false, message: 'No item in that slot' };
    }

    // Check if already added
    if (player.items.find(i => i.slot === itemSlot)) {
      return { success: false, message: 'Item already in trade' };
    }

    // Add to trade offer
    player.items.push({
      slot: itemSlot,
      itemId: item.itemId,
      count: item.count
    });

    // Reset ready status when trade changes
    player.ready = false;
    (player === trade.player1 ? trade.player2 : trade.player1).ready = false;

    // Broadcast update
    broadcastTradeUpdate(trade, position);

    return { success: true };
  }

  /**
   * Remove item from trade offer
   * @param {string} tradeId - Trade ID
   * @param {string} playerId - Player removing item
   * @param {number} tradeSlot - Trade slot index (0-5)
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean}
   */
  function removeItemFromTrade(tradeId, playerId, tradeSlot, position) {
    const trade = activeTrades.get(tradeId);

    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }

    if (trade.status !== 'active') {
      return { success: false, message: 'Trade is not active' };
    }

    const player = trade.player1.id === playerId ? trade.player1 : trade.player2;

    if (!player || player.id !== playerId) {
      return { success: false, message: 'Not part of this trade' };
    }

    if (tradeSlot < 0 || tradeSlot >= player.items.length) {
      return { success: false, message: 'Invalid trade slot' };
    }

    // Remove item
    player.items.splice(tradeSlot, 1);

    // Reset ready status
    player.ready = false;
    (player === trade.player1 ? trade.player2 : trade.player1).ready = false;

    // Broadcast update
    broadcastTradeUpdate(trade, position);

    return { success: true };
  }

  /**
   * Set Spark amount in trade offer
   * @param {string} tradeId - Trade ID
   * @param {string} playerId - Player setting Spark
   * @param {number} amount - Spark amount
   * @param {Object} ledger - Economy ledger to verify balance
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean}
   */
  function setSparkOffer(tradeId, playerId, amount, ledger, position) {
    const trade = activeTrades.get(tradeId);

    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }

    if (trade.status !== 'active') {
      return { success: false, message: 'Trade is not active' };
    }

    const player = trade.player1.id === playerId ? trade.player1 : trade.player2;

    if (!player || player.id !== playerId) {
      return { success: false, message: 'Not part of this trade' };
    }

    if (amount < 0) {
      return { success: false, message: 'Amount must be non-negative' };
    }

    // Verify player has enough Spark
    if (Economy && ledger) {
      const balance = Economy.getBalance(ledger, playerId);
      if (balance < amount) {
        return { success: false, message: 'Insufficient Spark' };
      }
    }

    player.spark = amount;

    // Reset ready status
    player.ready = false;
    (player === trade.player1 ? trade.player2 : trade.player1).ready = false;

    // Broadcast update
    broadcastTradeUpdate(trade, position);

    return { success: true };
  }

  /**
   * Set ready status (lock in offer)
   * @param {string} tradeId - Trade ID
   * @param {string} playerId - Player setting ready
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean, bothReady: boolean}
   */
  function setReady(tradeId, playerId, position) {
    const trade = activeTrades.get(tradeId);

    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }

    if (trade.status !== 'active') {
      return { success: false, message: 'Trade is not active' };
    }

    const player = trade.player1.id === playerId ? trade.player1 : trade.player2;

    if (!player || player.id !== playerId) {
      return { success: false, message: 'Not part of this trade' };
    }

    player.ready = true;

    // Broadcast update
    broadcastTradeUpdate(trade, position);

    const bothReady = trade.player1.ready && trade.player2.ready;
    return { success: true, bothReady: bothReady };
  }

  /**
   * Confirm trade (execute if both confirmed)
   * @param {string} tradeId - Trade ID
   * @param {string} playerId - Player confirming
   * @param {Object} inventory1 - Player 1's inventory
   * @param {Object} inventory2 - Player 2's inventory
   * @param {Object} ledger - Economy ledger
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean, executed?: boolean}
   */
  function confirmTrade(tradeId, playerId, inventory1, inventory2, ledger, position) {
    const trade = activeTrades.get(tradeId);

    if (!trade) {
      return { success: false, message: 'Trade not found' };
    }

    if (trade.status !== 'active') {
      return { success: false, message: 'Trade is not active' };
    }

    // Both players must be ready before confirming
    if (!trade.player1.ready || !trade.player2.ready) {
      return { success: false, message: 'Both players must be ready first' };
    }

    const player = trade.player1.id === playerId ? trade.player1 : trade.player2;

    if (!player || player.id !== playerId) {
      return { success: false, message: 'Not part of this trade' };
    }

    player.confirmed = true;

    // Check if both confirmed - execute trade
    if (trade.player1.confirmed && trade.player2.confirmed) {
      const result = executeTrade(trade, inventory1, inventory2, ledger);

      if (result.success) {
        trade.status = 'completed';

        // Send completion message
        if (messageCallback) {
          const msg = Protocol.create.trade_accept(playerId, {
            tradeId: tradeId,
            status: 'completed'
          }, { position: position });
          messageCallback(msg);
        }

        // Clean up
        activeTrades.delete(tradeId);

        return { success: true, executed: true };
      } else {
        // Trade execution failed, reset confirmations
        trade.player1.confirmed = false;
        trade.player2.confirmed = false;
        return { success: false, message: result.message };
      }
    }

    // Send confirmation message
    if (messageCallback) {
      const msg = Protocol.create.trade_accept(playerId, {
        tradeId: tradeId,
        confirmed: true
      }, { position: position });
      messageCallback(msg);
    }

    return { success: true, executed: false };
  }

  /**
   * Cancel trade at any point
   * @param {string} tradeId - Trade ID
   * @param {string} playerId - Player cancelling
   * @param {Object} position - Position for protocol message
   * @returns {Object} {success: boolean}
   */
  function cancelTrade(tradeId, playerId, position) {
    const trade = activeTrades.get(tradeId);

    if (!trade) {
      // Check pending invitations
      const invitation = pendingInvitations.get(tradeId);
      if (invitation) {
        pendingInvitations.delete(tradeId);
        return { success: true };
      }
      return { success: false, message: 'Trade not found' };
    }

    if (trade.player1.id !== playerId && trade.player2.id !== playerId) {
      return { success: false, message: 'Not part of this trade' };
    }

    trade.status = 'cancelled';

    // Send cancellation message
    if (messageCallback) {
      const msg = Protocol.create.trade_decline(playerId, {
        tradeId: tradeId,
        reason: 'cancelled'
      }, { position: position });
      messageCallback(msg);
    }

    activeTrades.delete(tradeId);

    return { success: true };
  }

  /**
   * Execute trade atomically (swap items and Spark)
   * @param {Object} trade - Trade object
   * @param {Object} inventory1 - Player 1's inventory
   * @param {Object} inventory2 - Player 2's inventory
   * @param {Object} ledger - Economy ledger
   * @returns {Object} {success: boolean}
   */
  function executeTrade(trade, inventory1, inventory2, ledger) {
    if (!Inventory || !Economy) {
      return { success: false, message: 'Trading systems not available' };
    }

    // Verify both players have the items and Spark they're offering

    // Check player 1's items
    for (const tradeItem of trade.player1.items) {
      const invItem = inventory1.slots[tradeItem.slot];
      if (!invItem || invItem.itemId !== tradeItem.itemId || invItem.count < tradeItem.count) {
        return { success: false, message: 'Player 1 no longer has offered items' };
      }
    }

    // Check player 2's items
    for (const tradeItem of trade.player2.items) {
      const invItem = inventory2.slots[tradeItem.slot];
      if (!invItem || invItem.itemId !== tradeItem.itemId || invItem.count < tradeItem.count) {
        return { success: false, message: 'Player 2 no longer has offered items' };
      }
    }

    // Check Spark balances
    const balance1 = Economy.getBalance(ledger, trade.player1.id);
    const balance2 = Economy.getBalance(ledger, trade.player2.id);

    if (balance1 < trade.player1.spark) {
      return { success: false, message: 'Player 1 insufficient Spark' };
    }
    if (balance2 < trade.player2.spark) {
      return { success: false, message: 'Player 2 insufficient Spark' };
    }

    // Verify both players have inventory space
    // Count empty slots needed
    const p1NeedsSlots = trade.player2.items.length - trade.player1.items.length;
    const p2NeedsSlots = trade.player1.items.length - trade.player2.items.length;

    const p1EmptySlots = inventory1.slots.filter(s => s === null).length;
    const p2EmptySlots = inventory2.slots.filter(s => s === null).length;

    if (p1NeedsSlots > p1EmptySlots) {
      return { success: false, message: 'Player 1 insufficient inventory space' };
    }
    if (p2NeedsSlots > p2EmptySlots) {
      return { success: false, message: 'Player 2 insufficient inventory space' };
    }

    // Execute atomically:

    // 1. Remove items from both players
    for (const tradeItem of trade.player1.items) {
      Inventory.removeItem(inventory1, tradeItem.itemId, tradeItem.count);
    }
    for (const tradeItem of trade.player2.items) {
      Inventory.removeItem(inventory2, tradeItem.itemId, tradeItem.count);
    }

    // 2. Add items to other player
    for (const tradeItem of trade.player1.items) {
      Inventory.addItem(inventory2, tradeItem.itemId, tradeItem.count);
    }
    for (const tradeItem of trade.player2.items) {
      Inventory.addItem(inventory1, tradeItem.itemId, tradeItem.count);
    }

    // 3. Transfer Spark
    if (trade.player1.spark > 0) {
      Economy.transferSpark(ledger, trade.player1.id, trade.player2.id, trade.player1.spark);
    }
    if (trade.player2.spark > 0) {
      Economy.transferSpark(ledger, trade.player2.id, trade.player1.id, trade.player2.spark);
    }

    return { success: true };
  }

  /**
   * Broadcast trade update message
   * @param {Object} trade - Trade object
   * @param {Object} position - Position for protocol message
   */
  function broadcastTradeUpdate(trade, position) {
    if (!messageCallback) return;

    const msg = Protocol.create.trade_offer(trade.player1.id, {
      tradeId: trade.id,
      player1: {
        items: trade.player1.items,
        spark: trade.player1.spark,
        ready: trade.player1.ready,
        confirmed: trade.player1.confirmed
      },
      player2: {
        items: trade.player2.items,
        spark: trade.player2.spark,
        ready: trade.player2.ready,
        confirmed: trade.player2.confirmed
      },
      status: trade.status
    }, { position: position });

    messageCallback(msg);
  }

  /**
   * Handle incoming trade protocol message
   * @param {Object} msg - Protocol message
   * @returns {Object} {type: string, data: Object}
   */
  function handleTradeMessage(msg) {
    if (!msg || !msg.type || !msg.payload) {
      return null;
    }

    switch (msg.type) {
      case 'trade_offer':
        if (msg.payload.targetPlayer) {
          // New trade request
          return {
            type: 'trade_request',
            data: {
              tradeId: msg.payload.tradeId,
              from: msg.from,
              to: msg.payload.targetPlayer
            }
          };
        } else {
          // Trade update
          return {
            type: 'trade_update',
            data: {
              tradeId: msg.payload.tradeId,
              player1: msg.payload.player1,
              player2: msg.payload.player2,
              status: msg.payload.status
            }
          };
        }

      case 'trade_accept':
        if (msg.payload.status === 'completed') {
          return {
            type: 'trade_complete',
            data: {
              tradeId: msg.payload.tradeId
            }
          };
        } else if (msg.payload.confirmed) {
          return {
            type: 'trade_confirm',
            data: {
              tradeId: msg.payload.tradeId,
              playerId: msg.from
            }
          };
        } else {
          return {
            type: 'trade_accepted',
            data: {
              tradeId: msg.payload.tradeId,
              playerId: msg.from
            }
          };
        }

      case 'trade_decline':
        return {
          type: 'trade_cancelled',
          data: {
            tradeId: msg.payload.tradeId,
            reason: msg.payload.reason || 'declined'
          }
        };

      default:
        return null;
    }
  }

  /**
   * Get active trade for a player
   * @param {string} playerId - Player ID
   * @returns {Object|null} Trade object or null
   */
  function getActiveTrade(playerId) {
    for (const [tradeId, trade] of activeTrades.entries()) {
      if (trade.player1.id === playerId || trade.player2.id === playerId) {
        return trade;
      }
    }
    return null;
  }

  /**
   * Get pending invitation for a player
   * @param {string} playerId - Player ID
   * @returns {Object|null} Invitation object or null
   */
  function getPendingInvitation(playerId) {
    for (const [tradeId, invitation] of pendingInvitations.entries()) {
      if (invitation.to === playerId) {
        return invitation;
      }
    }
    return null;
  }

  // Export public API
  exports.initTrading = initTrading;
  exports.requestTrade = requestTrade;
  exports.acceptTrade = acceptTrade;
  exports.declineTrade = declineTrade;
  exports.addItemToTrade = addItemToTrade;
  exports.removeItemFromTrade = removeItemFromTrade;
  exports.setSparkOffer = setSparkOffer;
  exports.setReady = setReady;
  exports.confirmTrade = confirmTrade;
  exports.cancelTrade = cancelTrade;
  exports.handleTradeMessage = handleTradeMessage;
  exports.getActiveTrade = getActiveTrade;
  exports.getPendingInvitation = getPendingInvitation;

})(typeof module !== 'undefined' ? module.exports : (window.Trading = {}));
