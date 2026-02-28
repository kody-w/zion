(function(exports) {
  'use strict';

  // §6.2 — Earn table from the Constitution
  var EARN_TABLE = {
    daily_login: { base: 10, max: 10 },
    harvest: { base: 5, max: 15 },
    craft: { base: 5, max: 50 },
    teach: { base: 10, max: 30 },
    discover: { base: 5, max: 25 },
    build: { base: 10, max: 50 },
    compose: { base: 5, max: 20 },
    compete_win: { base: 10, max: 100 },
    mentor: { base: 50, max: 50 },
    gift: { base: 1, max: 3 },
    anchor_visit: { base: 1, max: 5 }
  };

  function createLedger() {
    return {
      balances: {},
      transactions: [],
      listings: []
    };
  }

  function getBalance(ledger, playerId) {
    return ledger.balances[playerId] || 0;
  }

  function _recordTransaction(ledger, type, from, to, amount, reason) {
    ledger.transactions.push({
      type: type,
      from: from,
      to: to || null,
      amount: amount,
      reason: reason || '',
      ts: Date.now()
    });
  }

  // §6.2 — Earning Spark
  function earnSpark(ledger, playerId, activity, opts) {
    opts = opts || {};
    var entry = EARN_TABLE[activity];
    if (!entry) return 0;

    var complexity = opts.complexity !== undefined ? opts.complexity : (opts.rarity !== undefined ? opts.rarity : 0.5);
    var amount;

    if (entry.base === entry.max) {
      amount = entry.base;
    } else {
      amount = Math.floor(entry.base + complexity * (entry.max - entry.base));
    }

    // §6.3 — No admin minting; only earnSpark can create Spark
    if (!ledger.balances[playerId]) {
      ledger.balances[playerId] = 0;
    }
    ledger.balances[playerId] += amount;

    _recordTransaction(ledger, 'earn', playerId, null, amount, activity);
    return amount;
  }

  // §6.3 — Transparent ledger, transfers only move existing Spark
  function transferSpark(ledger, from, to, amount) {
    if (getBalance(ledger, from) < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    ledger.balances[from] -= amount;
    if (!ledger.balances[to]) ledger.balances[to] = 0;
    ledger.balances[to] += amount;

    _recordTransaction(ledger, 'transfer', from, to, amount, 'transfer');
    return { success: true };
  }

  // §6.5 — Balance floor: no balance below 0
  function spendSpark(ledger, playerId, amount) {
    if (getBalance(ledger, playerId) < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    ledger.balances[playerId] -= amount;
    _recordTransaction(ledger, 'spend', playerId, 'SYSTEM', amount, 'spend');
    return { success: true };
  }

  // §6.5 — Market listing fee: 5% of asking price (min 1 Spark), destroyed
  function createMarketListing(ledger, seller, item, price) {
    var fee = Math.max(1, Math.floor(price * 0.05));
    if (getBalance(ledger, seller) < fee) {
      return { success: false, error: 'Insufficient balance for listing fee' };
    }

    ledger.balances[seller] -= fee;
    _recordTransaction(ledger, 'spend', seller, 'SYSTEM', fee, 'listing_fee');

    var listing = {
      id: 'listing_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6),
      seller: seller,
      item: item,
      price: price,
      active: true,
      createdAt: Date.now()
    };

    ledger.listings.push(listing);
    return listing;
  }

  function buyListing(ledger, buyer, listingId) {
    var listing = null;
    for (var i = 0; i < ledger.listings.length; i++) {
      if (ledger.listings[i].id === listingId && ledger.listings[i].active) {
        listing = ledger.listings[i];
        break;
      }
    }

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (getBalance(ledger, buyer) < listing.price) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Transfer Spark from buyer to seller
    ledger.balances[buyer] -= listing.price;
    if (!ledger.balances[listing.seller]) ledger.balances[listing.seller] = 0;
    ledger.balances[listing.seller] += listing.price;

    listing.active = false;

    _recordTransaction(ledger, 'purchase', buyer, listing.seller, listing.price, 'buy_listing');

    return { success: true, item: listing.item };
  }

  function getTransactionLog(ledger, playerId) {
    return ledger.transactions.filter(function(tx) {
      return tx.from === playerId || tx.to === playerId;
    });
  }

  exports.Economy = {
    EARN_TABLE: EARN_TABLE,
    createLedger: createLedger,
    getBalance: getBalance,
    earnSpark: earnSpark,
    transferSpark: transferSpark,
    spendSpark: spendSpark,
    createMarketListing: createMarketListing,
    buyListing: buyListing,
    getTransactionLog: getTransactionLog
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.Economy;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
