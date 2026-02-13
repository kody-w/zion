/**
 * ZION Economy System - Spark Ledger & Trading
 * Layer 1 - No project dependencies
 */

(function(exports) {
  'use strict';

  // Earn table: activity → Spark amount or [min, max]
  const EARN_TABLE = {
    daily_login: 10,
    harvest: [5, 15],
    craft: [5, 50],
    teach: [10, 30],
    discover: [5, 25],
    puzzle: [10, 100],
    perform: [5, 20],
    competition_win: [10, 100],
    build: [10, 50],
    mentor: 50,
    anchor_visit: [1, 5],
    gift: [1, 3]
  };

  let transactionCounter = 0;
  let listingCounter = 0;

  /**
   * Creates a new ledger instance
   * @returns {Object} Ledger with balances, transactions, and listings
   */
  function createLedger() {
    return {
      balances: {},
      transactions: [],
      listings: []
    };
  }

  /**
   * Calculates Spark amount based on activity and details
   * @param {string} activity - Activity type
   * @param {Object} details - Activity details (may include complexity/rarity 0-1)
   * @returns {number} Calculated Spark amount
   */
  function calculateEarnAmount(activity, details = {}) {
    const earnValue = EARN_TABLE[activity];

    if (!earnValue) {
      return 0;
    }

    // Fixed amount
    if (typeof earnValue === 'number') {
      return earnValue;
    }

    // Range [min, max] - interpolate based on complexity or rarity
    if (Array.isArray(earnValue) && earnValue.length === 2) {
      const [min, max] = earnValue;
      const factor = details.complexity !== undefined ? details.complexity :
                     details.rarity !== undefined ? details.rarity : 0.5;

      // Clamp factor to [0, 1]
      const clampedFactor = Math.max(0, Math.min(1, factor));
      return Math.round(min + (max - min) * clampedFactor);
    }

    return 0;
  }

  /**
   * Records a transaction in the ledger
   * @param {Object} ledger - Ledger instance
   * @param {string} from - Sender ID (or 'SYSTEM' for earnings)
   * @param {string} to - Recipient ID
   * @param {number} amount - Spark amount
   * @param {string} type - Transaction type
   * @param {Object} details - Additional details
   */
  function recordTransaction(ledger, from, to, amount, type, details = {}) {
    const transaction = {
      id: `tx_${transactionCounter++}_${Date.now()}`,
      ts: Date.now(),
      from,
      to,
      amount,
      type,
      details
    };
    ledger.transactions.push(transaction);
    return transaction;
  }

  /**
   * Earns Spark for a player - THE ONLY WAY TO CREATE SPARK
   * @param {Object} ledger - Ledger instance
   * @param {string} playerId - Player ID
   * @param {string} activity - Activity type from EARN_TABLE
   * @param {Object} details - Activity details
   * @returns {number} Amount earned
   */
  function earnSpark(ledger, playerId, activity, details = {}) {
    const amount = calculateEarnAmount(activity, details);

    if (amount <= 0) {
      return 0;
    }

    // Initialize balance if needed
    if (!ledger.balances[playerId]) {
      ledger.balances[playerId] = 0;
    }

    // Credit the player
    ledger.balances[playerId] += amount;

    // Record transaction
    recordTransaction(ledger, 'SYSTEM', playerId, amount, 'earn', {
      activity,
      ...details
    });

    return amount;
  }

  /**
   * Spends Spark from a player's balance
   * @param {Object} ledger - Ledger instance
   * @param {string} playerId - Player ID
   * @param {number} amount - Amount to spend
   * @returns {Object} {success: boolean, balance: number}
   */
  function spendSpark(ledger, playerId, amount) {
    const currentBalance = getBalance(ledger, playerId);

    if (amount <= 0) {
      return { success: false, balance: currentBalance };
    }

    if (currentBalance < amount) {
      return { success: false, balance: currentBalance };
    }

    // Deduct from balance
    ledger.balances[playerId] -= amount;

    // Record transaction
    recordTransaction(ledger, playerId, 'SYSTEM', amount, 'spend', {});

    return { success: true, balance: ledger.balances[playerId] };
  }

  /**
   * Transfers Spark between players
   * @param {Object} ledger - Ledger instance
   * @param {string} from - Sender player ID
   * @param {string} to - Recipient player ID
   * @param {number} amount - Amount to transfer
   * @returns {Object} {success: boolean}
   */
  function transferSpark(ledger, from, to, amount) {
    if (amount <= 0) {
      return { success: false };
    }

    const senderBalance = getBalance(ledger, from);
    if (senderBalance < amount) {
      return { success: false };
    }

    // Initialize recipient balance if needed
    if (!ledger.balances[to]) {
      ledger.balances[to] = 0;
    }

    // Perform transfer
    ledger.balances[from] -= amount;
    ledger.balances[to] += amount;

    // Record transaction
    recordTransaction(ledger, from, to, amount, 'transfer', {});

    return { success: true };
  }

  /**
   * Gets a player's current Spark balance
   * @param {Object} ledger - Ledger instance
   * @param {string} playerId - Player ID
   * @returns {number} Current balance (0 if not found)
   */
  function getBalance(ledger, playerId) {
    return ledger.balances[playerId] || 0;
  }

  /**
   * Creates a market listing
   * @param {Object} ledger - Ledger instance
   * @param {string} playerId - Seller player ID
   * @param {Object} item - Item being sold
   * @param {number} price - Price in Spark
   * @returns {Object} Listing object
   */
  function createMarketListing(ledger, playerId, item, price) {
    const listing = {
      id: `listing_${listingCounter++}_${Date.now()}`,
      seller: playerId,
      item,
      price,
      ts: Date.now(),
      active: true
    };

    ledger.listings.push(listing);
    return listing;
  }

  /**
   * Buys a market listing
   * @param {Object} ledger - Ledger instance
   * @param {string} buyerId - Buyer player ID
   * @param {string} listingId - Listing ID
   * @returns {Object} {success: boolean, item?: Object}
   */
  function buyListing(ledger, buyerId, listingId) {
    // Find the listing
    const listing = ledger.listings.find(l => l.id === listingId && l.active);

    if (!listing) {
      return { success: false };
    }

    // Check buyer's balance
    const buyerBalance = getBalance(ledger, buyerId);
    if (buyerBalance < listing.price) {
      return { success: false };
    }

    // Prevent self-purchase
    if (buyerId === listing.seller) {
      return { success: false };
    }

    // Initialize seller balance if needed
    if (!ledger.balances[listing.seller]) {
      ledger.balances[listing.seller] = 0;
    }

    // Transfer Spark from buyer to seller
    ledger.balances[buyerId] -= listing.price;
    ledger.balances[listing.seller] += listing.price;

    // Mark listing as inactive
    listing.active = false;

    // Record transaction
    recordTransaction(ledger, buyerId, listing.seller, listing.price, 'market_purchase', {
      listingId,
      item: listing.item
    });

    return { success: true, item: listing.item };
  }

  /**
   * Gets transaction log for a player
   * @param {Object} ledger - Ledger instance
   * @param {string} playerId - Player ID
   * @returns {Array} Array of transactions
   */
  function getTransactionLog(ledger, playerId) {
    return ledger.transactions.filter(tx =>
      tx.from === playerId || tx.to === playerId
    );
  }

  // ========================================================================
  // ECONOMY STATISTICS & MARKET BROWSING
  // ========================================================================

  function getActiveListings(ledger) {
    if (!ledger || !ledger.listings) return [];
    return ledger.listings.filter(function(l) { return l.active; });
  }

  function getListingsByItem(ledger, itemId) {
    return getActiveListings(ledger).filter(function(l) {
      return l.item === itemId || (l.item && l.item.id === itemId);
    });
  }

  function getListingsBySeller(ledger, sellerId) {
    return getActiveListings(ledger).filter(function(l) {
      return l.seller === sellerId;
    });
  }

  function cancelListing(ledger, listingId, sellerId) {
    if (!ledger || !ledger.listings) return { success: false, message: 'No ledger' };

    var listing = ledger.listings.find(function(l) { return l.id === listingId; });
    if (!listing) return { success: false, message: 'Listing not found' };
    if (listing.seller !== sellerId) return { success: false, message: 'Not your listing' };
    if (!listing.active) return { success: false, message: 'Already inactive' };

    listing.active = false;
    return { success: true, item: listing.item };
  }

  function getEconomyStats(ledger) {
    if (!ledger) return {};

    var totalSpark = 0;
    var playerCount = 0;
    for (var pid in ledger.balances) {
      totalSpark += ledger.balances[pid] || 0;
      playerCount++;
    }

    var activeListings = getActiveListings(ledger);
    var totalTransactions = ledger.transactions ? ledger.transactions.length : 0;

    // Calculate velocity (transactions per player)
    var velocity = playerCount > 0 ? totalTransactions / playerCount : 0;

    return {
      totalSpark: totalSpark,
      playerCount: playerCount,
      averageSpark: playerCount > 0 ? Math.floor(totalSpark / playerCount) : 0,
      activeListings: activeListings.length,
      totalTransactions: totalTransactions,
      velocity: Math.round(velocity * 100) / 100
    };
  }

  function getLeaderboard(ledger, limit) {
    if (!ledger || !ledger.balances) return [];
    limit = limit || 10;

    var players = [];
    for (var pid in ledger.balances) {
      players.push({ playerId: pid, spark: ledger.balances[pid] || 0 });
    }

    players.sort(function(a, b) { return b.spark - a.spark; });
    return players.slice(0, limit);
  }

  // Export public API
  exports.createLedger = createLedger;
  exports.earnSpark = earnSpark;
  exports.spendSpark = spendSpark;
  exports.transferSpark = transferSpark;
  exports.getBalance = getBalance;
  exports.createMarketListing = createMarketListing;
  exports.buyListing = buyListing;
  exports.getTransactionLog = getTransactionLog;
  exports.getActiveListings = getActiveListings;
  exports.getListingsByItem = getListingsByItem;
  exports.getListingsBySeller = getListingsBySeller;
  exports.cancelListing = cancelListing;
  exports.getEconomyStats = getEconomyStats;
  exports.getLeaderboard = getLeaderboard;
  exports.EARN_TABLE = EARN_TABLE;

})(typeof module !== 'undefined' ? module.exports : (window.Economy = {}));
