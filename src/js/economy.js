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

  // Progressive tax brackets (§6.4): tax on NEW earnings only
  const TAX_BRACKETS = [
    { min: 0,   max: 19,  rate: 0.00 },
    { min: 20,  max: 49,  rate: 0.05 },
    { min: 50,  max: 99,  rate: 0.10 },
    { min: 100, max: 249, rate: 0.15 },
    { min: 250, max: 499, rate: 0.25 },
    { min: 500, max: Infinity, rate: 0.40 },
  ];

  const TREASURY_ID = 'TREASURY';
  const BASE_UBI_AMOUNT = 5;
  const WEALTH_TAX_THRESHOLD = 500;
  const WEALTH_TAX_RATE = 0.02;
  const BALANCE_FLOOR = 0;

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
   * Gets the tax rate for a given balance
   * @param {number} currentBalance - Player's current balance
   * @returns {number} Tax rate (0.0 to 0.25)
   */
  function getTaxRate(currentBalance) {
    if (currentBalance < 0) return 0;
    for (let i = 0; i < TAX_BRACKETS.length; i++) {
      if (currentBalance >= TAX_BRACKETS[i].min && currentBalance <= TAX_BRACKETS[i].max) {
        return TAX_BRACKETS[i].rate;
      }
    }
    return 0;
  }

  /**
   * Calculates tax on an earning amount based on current balance
   * @param {number} grossAmount - Amount earned before tax
   * @param {number} currentBalance - Player's current balance
   * @returns {Object} {netAmount, taxAmount, taxRate}
   */
  function calculateTax(grossAmount, currentBalance) {
    const taxRate = getTaxRate(currentBalance);
    const taxAmount = Math.floor(grossAmount * taxRate);
    return {
      netAmount: grossAmount - taxAmount,
      taxAmount: taxAmount,
      taxRate: taxRate
    };
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

    // Calculate tax based on current balance (§6.4)
    const tax = calculateTax(amount, ledger.balances[playerId]);

    // Credit the player with net amount
    ledger.balances[playerId] += tax.netAmount;

    // Record earn transaction
    recordTransaction(ledger, 'SYSTEM', playerId, tax.netAmount, 'earn', {
      activity,
      grossAmount: amount,
      taxWithheld: tax.taxAmount,
      taxRate: tax.taxRate,
      ...details
    });

    // Credit TREASURY with tax amount
    if (tax.taxAmount > 0) {
      if (!ledger.balances[TREASURY_ID]) {
        ledger.balances[TREASURY_ID] = 0;
      }
      ledger.balances[TREASURY_ID] += tax.taxAmount;

      recordTransaction(ledger, playerId, TREASURY_ID, tax.taxAmount, 'tax', {
        activity,
        grossAmount: amount,
        taxRate: tax.taxRate
      });
    }

    return tax.netAmount;
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
      if (pid === TREASURY_ID || pid === 'SYSTEM') continue;
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
      velocity: Math.round(velocity * 100) / 100,
      treasury: ledger.balances[TREASURY_ID] || 0
    };
  }

  function getLeaderboard(ledger, limit) {
    if (!ledger || !ledger.balances) return [];
    limit = limit || 10;

    var players = [];
    for (var pid in ledger.balances) {
      if (pid === TREASURY_ID || pid === 'SYSTEM') continue;
      players.push({ playerId: pid, spark: ledger.balances[pid] || 0 });
    }

    players.sort(function(a, b) { return b.spark - a.spark; });
    return players.slice(0, limit);
  }

  // ========================================================================
  // UNIVERSAL BASIC INCOME (§6.4)
  // ========================================================================

  /**
   * Distributes UBI from TREASURY to eligible players
   * @param {Object} ledger - Ledger instance
   * @param {Array} eligiblePlayerIds - Array of player IDs to receive UBI
   * @returns {Object} {distributed, perPlayer, recipients}
   */
  function distributeUBI(ledger, eligiblePlayerIds) {
    if (!eligiblePlayerIds || eligiblePlayerIds.length === 0) {
      return { distributed: 0, perPlayer: 0, recipients: 0 };
    }

    var treasuryBalance = ledger.balances[TREASURY_ID] || 0;
    if (treasuryBalance <= 0) {
      return { distributed: 0, perPlayer: 0, recipients: 0 };
    }

    var perPlayer = Math.min(BASE_UBI_AMOUNT, Math.floor(treasuryBalance / eligiblePlayerIds.length));
    if (perPlayer < 1) {
      return { distributed: 0, perPlayer: 0, recipients: 0 };
    }

    var totalDistributed = 0;
    var recipientCount = 0;

    for (var i = 0; i < eligiblePlayerIds.length; i++) {
      var pid = eligiblePlayerIds[i];
      if (pid === TREASURY_ID || pid === 'SYSTEM') continue;

      // Check treasury still has enough
      if ((ledger.balances[TREASURY_ID] || 0) < perPlayer) break;

      if (!ledger.balances[pid]) {
        ledger.balances[pid] = 0;
      }

      ledger.balances[pid] += perPlayer;
      ledger.balances[TREASURY_ID] -= perPlayer;
      totalDistributed += perPlayer;
      recipientCount++;

      recordTransaction(ledger, TREASURY_ID, pid, perPlayer, 'ubi', {});
    }

    return { distributed: totalDistributed, perPlayer: perPlayer, recipients: recipientCount };
  }

  /**
   * Gets treasury information
   * @param {Object} ledger - Ledger instance
   * @returns {Object} {balance, totalTaxCollected, totalUbiDistributed}
   */
  function getTreasuryInfo(ledger) {
    var balance = (ledger.balances && ledger.balances[TREASURY_ID]) || 0;
    var totalTaxCollected = 0;
    var totalUbiDistributed = 0;

    if (ledger.transactions) {
      for (var i = 0; i < ledger.transactions.length; i++) {
        var tx = ledger.transactions[i];
        if (tx.type === 'tax') {
          totalTaxCollected += tx.amount;
        } else if (tx.type === 'ubi') {
          totalUbiDistributed += tx.amount;
        }
      }
    }

    return {
      balance: balance,
      totalTaxCollected: totalTaxCollected,
      totalUbiDistributed: totalUbiDistributed
    };
  }

  /**
   * Applies wealth tax to all balances above WEALTH_TAX_THRESHOLD (§6.4)
   * @param {Object} ledger - Ledger instance
   * @returns {Object} {totalCollected, playersAffected}
   */
  function applyWealthTax(ledger) {
    var totalCollected = 0;
    var playersAffected = 0;

    if (!ledger.balances[TREASURY_ID]) {
      ledger.balances[TREASURY_ID] = 0;
    }

    for (var pid in ledger.balances) {
      if (pid === TREASURY_ID || pid === 'SYSTEM') continue;
      var balance = ledger.balances[pid];
      if (balance > WEALTH_TAX_THRESHOLD) {
        var taxableAmount = balance - WEALTH_TAX_THRESHOLD;
        var tax = Math.floor(taxableAmount * WEALTH_TAX_RATE);
        if (tax > 0) {
          ledger.balances[pid] -= tax;
          ledger.balances[TREASURY_ID] += tax;
          totalCollected += tax;
          playersAffected++;

          recordTransaction(ledger, pid, TREASURY_ID, tax, 'wealth_tax', {
            balance: balance,
            threshold: WEALTH_TAX_THRESHOLD,
            rate: WEALTH_TAX_RATE
          });
        }
      }
    }

    return { totalCollected: totalCollected, playersAffected: playersAffected };
  }

  // ========================================================================
  // AUCTION HOUSE - Timed bid system
  // ========================================================================

  var auctionCounter = 0;

  /**
   * Create an auction listing
   * @param {Object} ledger
   * @param {string} sellerId
   * @param {Object} item - Item being auctioned
   * @param {number} startingBid - Minimum bid
   * @param {number} durationMs - Auction duration in milliseconds
   * @returns {Object} Auction object
   */
  function createAuction(ledger, sellerId, item, startingBid, durationMs) {
    if (!ledger.auctions) ledger.auctions = [];

    var auction = {
      id: 'auction_' + (auctionCounter++) + '_' + Date.now(),
      seller: sellerId,
      item: item,
      startingBid: startingBid || 1,
      currentBid: 0,
      currentBidder: null,
      bids: [],
      startTime: Date.now(),
      endTime: Date.now() + (durationMs || 300000), // Default 5 min
      status: 'active'
    };

    ledger.auctions.push(auction);
    return auction;
  }

  /**
   * Place a bid on an auction
   * @param {Object} ledger
   * @param {string} auctionId
   * @param {string} bidderId
   * @param {number} amount
   * @returns {Object} {success, message}
   */
  function placeBid(ledger, auctionId, bidderId, amount) {
    if (!ledger.auctions) return { success: false, message: 'No auctions' };

    var auction = ledger.auctions.find(function(a) { return a.id === auctionId; });
    if (!auction) return { success: false, message: 'Auction not found' };
    if (auction.status !== 'active') return { success: false, message: 'Auction not active' };
    if (Date.now() > auction.endTime) return { success: false, message: 'Auction ended' };
    if (auction.seller === bidderId) return { success: false, message: 'Cannot bid on own auction' };
    if (amount <= auction.currentBid) return { success: false, message: 'Bid must be higher than current bid' };
    if (amount < auction.startingBid) return { success: false, message: 'Bid below minimum' };

    var balance = getBalance(ledger, bidderId);
    if (balance < amount) return { success: false, message: 'Insufficient Spark' };

    // Record bid
    auction.currentBid = amount;
    auction.currentBidder = bidderId;
    auction.bids.push({ bidder: bidderId, amount: amount, ts: Date.now() });

    // Extend auction if bid in last 30s (anti-sniping)
    if (auction.endTime - Date.now() < 30000) {
      auction.endTime = Date.now() + 30000;
    }

    return { success: true, message: 'Bid placed' };
  }

  /**
   * Finalize ended auctions
   * @param {Object} ledger
   * @returns {Array} Completed auctions
   */
  function finalizeAuctions(ledger) {
    if (!ledger.auctions) return [];

    var now = Date.now();
    var completed = [];

    for (var i = 0; i < ledger.auctions.length; i++) {
      var auction = ledger.auctions[i];
      if (auction.status !== 'active') continue;
      if (now < auction.endTime) continue;

      if (auction.currentBidder && auction.currentBid > 0) {
        // Check winner still has funds
        var winnerBalance = getBalance(ledger, auction.currentBidder);
        if (winnerBalance >= auction.currentBid) {
          // Transfer Spark
          if (!ledger.balances[auction.seller]) ledger.balances[auction.seller] = 0;
          ledger.balances[auction.currentBidder] -= auction.currentBid;
          ledger.balances[auction.seller] += auction.currentBid;

          recordTransaction(ledger, auction.currentBidder, auction.seller, auction.currentBid, 'auction', {
            auctionId: auction.id,
            item: auction.item
          });

          auction.status = 'sold';
          completed.push({ auction: auction, winner: auction.currentBidder, item: auction.item });
        } else {
          auction.status = 'failed';
        }
      } else {
        auction.status = 'expired';
      }
    }

    return completed;
  }

  function getActiveAuctions(ledger) {
    if (!ledger.auctions) return [];
    var now = Date.now();
    return ledger.auctions.filter(function(a) {
      return a.status === 'active' && now < a.endTime;
    });
  }

  // ========================================================================
  // ECONOMIC EVENTS - Rotating modifiers
  // ========================================================================

  var ECONOMIC_EVENTS = [
    { id: 'harvest_festival', name: 'Harvest Festival', description: 'Harvesting rewards doubled', modifier: { activity: 'harvest', multiplier: 2 } },
    { id: 'craft_fair', name: 'Craft Fair', description: 'Crafting rewards +50%', modifier: { activity: 'craft', multiplier: 1.5 } },
    { id: 'trading_day', name: 'Grand Trading Day', description: 'Trade bonuses increased', modifier: { activity: 'gift', multiplier: 3 } },
    { id: 'scholars_week', name: "Scholar's Week", description: 'Teaching and discovery rewards doubled', modifier: { activity: 'teach', multiplier: 2 } },
    { id: 'builders_boom', name: "Builder's Boom", description: 'Building rewards +50%', modifier: { activity: 'build', multiplier: 1.5 } },
    { id: 'exploration_surge', name: 'Exploration Surge', description: 'Discovery rewards doubled', modifier: { activity: 'discover', multiplier: 2 } }
  ];

  /**
   * Get current economic event based on day
   * @returns {Object|null} Current event or null
   */
  function getCurrentEvent() {
    var now = new Date();
    var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    // Events rotate every 3 days, with 1 day of no event between
    var cycle = dayOfYear % 4;
    if (cycle === 3) return null; // Rest day
    var eventIndex = Math.floor(dayOfYear / 4) % ECONOMIC_EVENTS.length;
    return ECONOMIC_EVENTS[eventIndex];
  }

  /**
   * Apply economic event modifier to earn amount
   * @param {number} baseAmount
   * @param {string} activity
   * @returns {number} Modified amount
   */
  function applyEventModifier(baseAmount, activity) {
    var event = getCurrentEvent();
    if (!event || !event.modifier) return baseAmount;
    if (event.modifier.activity === activity) {
      return Math.round(baseAmount * event.modifier.multiplier);
    }
    return baseAmount;
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
  exports.TAX_BRACKETS = TAX_BRACKETS;
  exports.TREASURY_ID = TREASURY_ID;
  exports.BASE_UBI_AMOUNT = BASE_UBI_AMOUNT;
  exports.getTaxRate = getTaxRate;
  exports.calculateTax = calculateTax;
  exports.distributeUBI = distributeUBI;
  exports.getTreasuryInfo = getTreasuryInfo;
  exports.applyWealthTax = applyWealthTax;
  exports.WEALTH_TAX_THRESHOLD = WEALTH_TAX_THRESHOLD;
  exports.WEALTH_TAX_RATE = WEALTH_TAX_RATE;
  exports.BALANCE_FLOOR = BALANCE_FLOOR;
  exports.createAuction = createAuction;
  exports.placeBid = placeBid;
  exports.finalizeAuctions = finalizeAuctions;
  exports.getActiveAuctions = getActiveAuctions;
  exports.ECONOMIC_EVENTS = ECONOMIC_EVENTS;
  exports.getCurrentEvent = getCurrentEvent;
  exports.applyEventModifier = applyEventModifier;

})(typeof module !== 'undefined' ? module.exports : (window.Economy = {}));
