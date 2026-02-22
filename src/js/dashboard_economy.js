// dashboard_economy.js
/**
 * ZION Dashboard Economy Module
 * Economy & Trading panel for UI-only (dashboard) mode.
 * Manages Spark balance, market listings, transaction history, and stats.
 * Layer: standalone (no required project dependencies)
 */

(function(exports) {
  'use strict';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  var DEFAULT_BALANCE = 100;
  var LISTING_FEE_RATE = 0.05;
  var MINIMUM_LISTING_FEE = 1;
  var TREASURY_ID = '__treasury__';
  var MS_PER_DAY = 86400000;

  var WEALTH_BRACKETS = [0, 50, 100, 250, 500, 1000, 5000, Infinity];

  // =========================================================================
  // STATE
  // =========================================================================

  /**
   * Returns a fresh economy state object.
   * @returns {Object} Economy state
   */
  function createEconomyState() {
    return {
      balances: {},
      transactions: [],
      listings: [],
      nextListingId: 1,
      treasury: 1000000,
      ubiHistory: [],
      taxHistory: [],
      dailyStats: []
    };
  }

  // =========================================================================
  // BALANCE OPERATIONS
  // =========================================================================

  /**
   * Returns a player's Spark balance (default 100 for new players).
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getBalance(state, playerId) {
    if (!state || !state.balances) return DEFAULT_BALANCE;
    if (state.balances[playerId] === undefined) return DEFAULT_BALANCE;
    return state.balances[playerId];
  }

  /**
   * Add Spark to a player's balance and log the transaction.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} amount
   * @param {string} reason
   * @returns {Object} Updated state (mutated in place)
   */
  function earnSpark(state, playerId, amount, reason) {
    if (!state || !playerId || typeof amount !== 'number' || amount <= 0) {
      return state;
    }
    if (state.balances[playerId] === undefined) {
      state.balances[playerId] = DEFAULT_BALANCE;
    }
    state.balances[playerId] += amount;
    state.transactions.push({
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      type: 'earn',
      playerId: playerId,
      amount: amount,
      reason: reason || '',
      timestamp: Date.now(),
      counterparty: null
    });
    return state;
  }

  /**
   * Deduct Spark from a player's balance.
   * Fails if insufficient funds.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} amount
   * @param {string} reason
   * @returns {{ success: boolean, state: Object, message: string }}
   */
  function spendSpark(state, playerId, amount, reason) {
    if (!state || !playerId || typeof amount !== 'number' || amount <= 0) {
      return { success: false, state: state, message: 'Invalid arguments' };
    }
    var balance = getBalance(state, playerId);
    if (balance < amount) {
      return { success: false, state: state, message: 'Insufficient funds' };
    }
    if (state.balances[playerId] === undefined) {
      state.balances[playerId] = DEFAULT_BALANCE;
    }
    state.balances[playerId] -= amount;
    state.transactions.push({
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      type: 'spend',
      playerId: playerId,
      amount: -amount,
      reason: reason || '',
      timestamp: Date.now(),
      counterparty: null
    });
    return { success: true, state: state, message: 'OK' };
  }

  /**
   * Transfer Spark from one player to another.
   * @param {Object} state
   * @param {string} fromId
   * @param {string} toId
   * @param {number} amount
   * @param {string} reason
   * @returns {{ success: boolean, state: Object, message: string }}
   */
  function transferSpark(state, fromId, toId, amount, reason) {
    if (!state || !fromId || !toId || typeof amount !== 'number' || amount <= 0) {
      return { success: false, state: state, message: 'Invalid arguments' };
    }
    var senderBalance = getBalance(state, fromId);
    if (senderBalance < amount) {
      return { success: false, state: state, message: 'Insufficient funds' };
    }
    if (state.balances[fromId] === undefined) {
      state.balances[fromId] = DEFAULT_BALANCE;
    }
    if (state.balances[toId] === undefined) {
      state.balances[toId] = DEFAULT_BALANCE;
    }
    state.balances[fromId] -= amount;
    state.balances[toId] += amount;
    var ts = Date.now();
    var txBase = 'tx_' + ts + '_' + Math.random().toString(36).slice(2);
    // Debit transaction (for sender)
    state.transactions.push({
      id: txBase + '_debit',
      type: 'transfer_out',
      playerId: fromId,
      amount: -amount,
      reason: reason || '',
      timestamp: ts,
      counterparty: toId
    });
    // Credit transaction (for recipient)
    state.transactions.push({
      id: txBase + '_credit',
      type: 'transfer_in',
      playerId: toId,
      amount: amount,
      reason: reason || '',
      timestamp: ts,
      counterparty: fromId
    });
    return { success: true, state: state, message: 'OK' };
  }

  // =========================================================================
  // MARKET LISTINGS
  // =========================================================================

  /**
   * Create a market listing. Charges a listing fee (5% of total price, minimum 1 Spark).
   * @param {Object} state
   * @param {string} sellerId
   * @param {string} itemId
   * @param {number} quantity
   * @param {number} pricePerUnit
   * @returns {{ success: boolean, state: Object, listing: Object|null, fee: number, message: string }}
   */
  function createListing(state, sellerId, itemId, quantity, pricePerUnit) {
    if (!state || !sellerId || !itemId ||
        typeof quantity !== 'number' || quantity <= 0 ||
        typeof pricePerUnit !== 'number' || pricePerUnit <= 0) {
      return { success: false, state: state, listing: null, fee: 0, message: 'Invalid arguments' };
    }
    var totalPrice = quantity * pricePerUnit;
    var fee = Math.max(MINIMUM_LISTING_FEE, Math.floor(totalPrice * LISTING_FEE_RATE));
    var balance = getBalance(state, sellerId);
    if (balance < fee) {
      return { success: false, state: state, listing: null, fee: fee, message: 'Insufficient funds for listing fee' };
    }
    // Charge the fee
    if (state.balances[sellerId] === undefined) {
      state.balances[sellerId] = DEFAULT_BALANCE;
    }
    state.balances[sellerId] -= fee;
    state.treasury += fee;
    state.transactions.push({
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      type: 'listing_fee',
      playerId: sellerId,
      amount: -fee,
      reason: 'Listing fee for ' + itemId,
      timestamp: Date.now(),
      counterparty: TREASURY_ID
    });
    var listing = {
      id: 'listing_' + state.nextListingId++,
      sellerId: sellerId,
      itemId: itemId,
      quantity: quantity,
      pricePerUnit: pricePerUnit,
      createdAt: Date.now(),
      active: true
    };
    state.listings.push(listing);
    return { success: true, state: state, listing: listing, fee: fee, message: 'OK' };
  }

  /**
   * Buy from a market listing. Partial buys allowed.
   * @param {Object} state
   * @param {string} buyerId
   * @param {string} listingId
   * @param {number} quantity
   * @returns {{ success: boolean, state: Object, cost: number, items: number, message: string }}
   */
  function buyListing(state, buyerId, listingId, quantity) {
    if (!state || !buyerId || !listingId || typeof quantity !== 'number' || quantity <= 0) {
      return { success: false, state: state, cost: 0, items: 0, message: 'Invalid arguments' };
    }
    var listing = null;
    for (var i = 0; i < state.listings.length; i++) {
      if (state.listings[i].id === listingId) {
        listing = state.listings[i];
        break;
      }
    }
    if (!listing) {
      return { success: false, state: state, cost: 0, items: 0, message: 'Listing not found' };
    }
    if (!listing.active) {
      return { success: false, state: state, cost: 0, items: 0, message: 'Listing is not active' };
    }
    // Buyer cannot buy own listing
    if (listing.sellerId === buyerId) {
      return { success: false, state: state, cost: 0, items: 0, message: 'Cannot buy your own listing' };
    }
    var buyQty = Math.min(quantity, listing.quantity);
    var cost = buyQty * listing.pricePerUnit;
    var buyerBalance = getBalance(state, buyerId);
    if (buyerBalance < cost) {
      return { success: false, state: state, cost: cost, items: 0, message: 'Insufficient funds' };
    }
    if (state.balances[buyerId] === undefined) {
      state.balances[buyerId] = DEFAULT_BALANCE;
    }
    if (state.balances[listing.sellerId] === undefined) {
      state.balances[listing.sellerId] = DEFAULT_BALANCE;
    }
    // Transfer Spark from buyer to seller
    state.balances[buyerId] -= cost;
    state.balances[listing.sellerId] += cost;
    var ts = Date.now();
    var txBase = 'tx_' + ts + '_' + Math.random().toString(36).slice(2);
    state.transactions.push({
      id: txBase + '_buy',
      type: 'market_buy',
      playerId: buyerId,
      amount: -cost,
      reason: 'Purchase: ' + buyQty + 'x ' + listing.itemId,
      timestamp: ts,
      counterparty: listing.sellerId
    });
    state.transactions.push({
      id: txBase + '_sell',
      type: 'market_sell',
      playerId: listing.sellerId,
      amount: cost,
      reason: 'Sale: ' + buyQty + 'x ' + listing.itemId,
      timestamp: ts,
      counterparty: buyerId
    });
    // Reduce listing quantity
    listing.quantity -= buyQty;
    if (listing.quantity <= 0) {
      listing.active = false;
    }
    return { success: true, state: state, cost: cost, items: buyQty, message: 'OK' };
  }

  /**
   * Cancel a market listing. No refund on listing fee.
   * @param {Object} state
   * @param {string} sellerId
   * @param {string} listingId
   * @returns {{ success: boolean, state: Object, message: string }}
   */
  function cancelListing(state, sellerId, listingId) {
    if (!state || !sellerId || !listingId) {
      return { success: false, state: state, message: 'Invalid arguments' };
    }
    var listing = null;
    for (var i = 0; i < state.listings.length; i++) {
      if (state.listings[i].id === listingId) {
        listing = state.listings[i];
        break;
      }
    }
    if (!listing) {
      return { success: false, state: state, message: 'Listing not found' };
    }
    if (listing.sellerId !== sellerId) {
      return { success: false, state: state, message: 'Not your listing' };
    }
    if (!listing.active) {
      return { success: false, state: state, message: 'Listing already inactive' };
    }
    listing.active = false;
    return { success: true, state: state, message: 'OK' };
  }

  /**
   * Get filtered and sorted market listings (active only by default).
   * @param {Object} state
   * @param {Object} [filters] - { itemId, sellerId, minPrice, maxPrice, sortBy: 'price'|'date'|'quantity' }
   * @returns {Array}
   */
  function getListings(state, filters) {
    if (!state || !state.listings) return [];
    filters = filters || {};
    var results = [];
    for (var i = 0; i < state.listings.length; i++) {
      var l = state.listings[i];
      if (!l.active) continue;
      if (filters.itemId && l.itemId !== filters.itemId) continue;
      if (filters.sellerId && l.sellerId !== filters.sellerId) continue;
      if (typeof filters.minPrice === 'number' && l.pricePerUnit < filters.minPrice) continue;
      if (typeof filters.maxPrice === 'number' && l.pricePerUnit > filters.maxPrice) continue;
      results.push(l);
    }
    var sortBy = filters.sortBy || 'date';
    results.sort(function(a, b) {
      if (sortBy === 'price') return a.pricePerUnit - b.pricePerUnit;
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      // default: date descending
      return b.createdAt - a.createdAt;
    });
    return results;
  }

  // =========================================================================
  // TRANSACTION HISTORY
  // =========================================================================

  /**
   * Get the last N transactions for a player.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} [limit=50]
   * @returns {Array}
   */
  function getTransactionHistory(state, playerId, limit) {
    if (!state || !state.transactions || !playerId) return [];
    limit = (typeof limit === 'number' && limit > 0) ? limit : 50;
    var results = [];
    for (var i = 0; i < state.transactions.length; i++) {
      if (state.transactions[i].playerId === playerId) {
        results.push(state.transactions[i]);
      }
    }
    // Sort by timestamp descending
    results.sort(function(a, b) { return b.timestamp - a.timestamp; });
    return results.slice(0, limit);
  }

  /**
   * Sum of earnings (positive amounts) in the last 24 hours for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function calculateDailyIncome(state, playerId) {
    if (!state || !state.transactions || !playerId) return 0;
    var cutoff = Date.now() - MS_PER_DAY;
    var total = 0;
    for (var i = 0; i < state.transactions.length; i++) {
      var tx = state.transactions[i];
      if (tx.playerId === playerId && tx.timestamp >= cutoff && tx.amount > 0) {
        total += tx.amount;
      }
    }
    return total;
  }

  /**
   * Sum of spending (negative amounts) in the last 24 hours for a player.
   * Returns a positive number representing total spent.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function calculateDailyExpenses(state, playerId) {
    if (!state || !state.transactions || !playerId) return 0;
    var cutoff = Date.now() - MS_PER_DAY;
    var total = 0;
    for (var i = 0; i < state.transactions.length; i++) {
      var tx = state.transactions[i];
      if (tx.playerId === playerId && tx.timestamp >= cutoff && tx.amount < 0) {
        total += Math.abs(tx.amount);
      }
    }
    return total;
  }

  // =========================================================================
  // ECONOMY STATISTICS
  // =========================================================================

  /**
   * Compute Gini coefficient from an array of balance values.
   * 0 = perfect equality, 1 = maximum inequality.
   * @param {Array<number>} balances
   * @returns {number}
   */
  function calculateGiniCoefficient(balances) {
    if (!balances || balances.length === 0) return 0;
    var n = balances.length;
    if (n === 1) return 0;
    // Sort ascending
    var sorted = balances.slice().sort(function(a, b) { return a - b; });
    // Clamp negatives to 0 for Gini calculation
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i] < 0) sorted[i] = 0;
    }
    var sumOfAbsDiff = 0;
    var sumAll = 0;
    for (var i = 0; i < n; i++) {
      sumAll += sorted[i];
      for (var j = 0; j < n; j++) {
        sumOfAbsDiff += Math.abs(sorted[i] - sorted[j]);
      }
    }
    if (sumAll === 0) return 0;
    return sumOfAbsDiff / (2 * n * sumAll);
  }

  /**
   * Returns economy-wide statistics.
   * @param {Object} state
   * @returns {{ totalCirculation: number, averageWealth: number, medianWealth: number, giniCoefficient: number, activeTraders: number, totalListings: number, totalTransactions: number }}
   */
  function getEconomyStats(state) {
    if (!state) {
      return {
        totalCirculation: 0,
        averageWealth: 0,
        medianWealth: 0,
        giniCoefficient: 0,
        activeTraders: 0,
        totalListings: 0,
        totalTransactions: 0
      };
    }
    var playerBalances = [];
    var totalCirculation = 0;
    for (var pid in state.balances) {
      if (pid === TREASURY_ID) continue;
      var bal = state.balances[pid];
      playerBalances.push(bal);
      totalCirculation += bal;
    }
    var n = playerBalances.length;
    var avgWealth = n > 0 ? totalCirculation / n : 0;
    var medianWealth = 0;
    if (n > 0) {
      var sorted = playerBalances.slice().sort(function(a, b) { return a - b; });
      if (n % 2 === 0) {
        medianWealth = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
      } else {
        medianWealth = sorted[Math.floor(n / 2)];
      }
    }
    var gini = calculateGiniCoefficient(playerBalances);
    var activeListings = 0;
    var activeSellers = {};
    for (var i = 0; i < state.listings.length; i++) {
      if (state.listings[i].active) {
        activeListings++;
        activeSellers[state.listings[i].sellerId] = true;
      }
    }
    return {
      totalCirculation: totalCirculation,
      averageWealth: avgWealth,
      medianWealth: medianWealth,
      giniCoefficient: gini,
      activeTraders: Object.keys(activeSellers).length,
      totalListings: activeListings,
      totalTransactions: state.transactions.length
    };
  }

  /**
   * Group players into wealth distribution brackets.
   * @param {Object} state
   * @param {Array<number>} [brackets]
   * @returns {Array<{bracket: string, count: number, min: number, max: number}>}
   */
  function getWealthDistribution(state, brackets) {
    brackets = brackets || WEALTH_BRACKETS;
    var result = [];
    for (var i = 0; i < brackets.length - 1; i++) {
      var min = brackets[i];
      var max = brackets[i + 1];
      var label = max === Infinity
        ? (min + '+')
        : (min + '-' + (max - 1));
      result.push({ bracket: label, count: 0, min: min, max: max });
    }
    if (!state || !state.balances) return result;
    for (var pid in state.balances) {
      if (pid === TREASURY_ID) continue;
      var bal = state.balances[pid];
      for (var j = 0; j < result.length; j++) {
        var br = result[j];
        if (bal >= br.min && (br.max === Infinity || bal < br.max)) {
          br.count++;
          break;
        }
      }
    }
    return result;
  }

  // =========================================================================
  // UBI & WEALTH TAX
  // =========================================================================

  /**
   * Distribute equal UBI to all known players from treasury.
   * @param {Object} state
   * @param {number} amount  Amount per player
   * @param {number} [timestamp]
   * @returns {{ success: boolean, state: Object, perPlayer: number, recipients: number }}
   */
  function distributeUBI(state, amount, timestamp) {
    if (!state || typeof amount !== 'number' || amount <= 0) {
      return { success: false, state: state, perPlayer: 0, recipients: 0 };
    }
    var ts = timestamp || Date.now();
    var players = [];
    for (var pid in state.balances) {
      if (pid !== TREASURY_ID) players.push(pid);
    }
    if (players.length === 0) {
      return { success: true, state: state, perPlayer: amount, recipients: 0 };
    }
    var totalNeeded = amount * players.length;
    if (state.treasury < totalNeeded) {
      return { success: false, state: state, perPlayer: amount, recipients: 0, message: 'Insufficient treasury' };
    }
    state.treasury -= totalNeeded;
    for (var i = 0; i < players.length; i++) {
      state.balances[players[i]] += amount;
      state.transactions.push({
        id: 'tx_ubi_' + ts + '_' + players[i],
        type: 'ubi',
        playerId: players[i],
        amount: amount,
        reason: 'UBI distribution',
        timestamp: ts,
        counterparty: TREASURY_ID
      });
    }
    state.ubiHistory.push({ timestamp: ts, perPlayer: amount, recipients: players.length });
    return { success: true, state: state, perPlayer: amount, recipients: players.length };
  }

  /**
   * Tax balances above threshold at given rate. Transfer taxed amount to treasury.
   * @param {Object} state
   * @param {number} threshold
   * @param {number} rate
   * @param {number} [timestamp]
   * @returns {{ success: boolean, state: Object, taxed: Array<{playerId: string, amount: number}> }}
   */
  function applyWealthTax(state, threshold, rate, timestamp) {
    if (!state || typeof threshold !== 'number' || typeof rate !== 'number') {
      return { success: false, state: state, taxed: [] };
    }
    var ts = timestamp || Date.now();
    var taxed = [];
    for (var pid in state.balances) {
      if (pid === TREASURY_ID) continue;
      var bal = state.balances[pid];
      if (bal > threshold) {
        var excess = bal - threshold;
        var taxAmount = Math.floor(excess * rate);
        if (taxAmount <= 0) continue;
        state.balances[pid] -= taxAmount;
        state.treasury += taxAmount;
        taxed.push({ playerId: pid, amount: taxAmount });
        state.transactions.push({
          id: 'tx_tax_' + ts + '_' + pid,
          type: 'wealth_tax',
          playerId: pid,
          amount: -taxAmount,
          reason: 'Wealth tax (threshold: ' + threshold + ', rate: ' + (rate * 100) + '%)',
          timestamp: ts,
          counterparty: TREASURY_ID
        });
      }
    }
    state.taxHistory.push({ timestamp: ts, threshold: threshold, rate: rate, taxed: taxed });
    return { success: true, state: state, taxed: taxed };
  }

  // =========================================================================
  // FORMATTING
  // =========================================================================

  /**
   * Render an ASCII bar chart segment showing a percentage.
   * @param {number} value  0-100
   * @param {number} [width=20]
   * @returns {string}  e.g. "[####      ] 40%"
   */
  function _asciiBar(value, width) {
    width = width || 20;
    value = Math.max(0, Math.min(100, value));
    var filled = Math.round((value / 100) * width);
    var empty = width - filled;
    var bar = '[';
    for (var i = 0; i < filled; i++) bar += '#';
    for (var j = 0; j < empty; j++) bar += ' ';
    bar += '] ' + Math.round(value) + '%';
    return bar;
  }

  /**
   * Format a Spark amount with sign and [S] symbol.
   * @param {number} amount
   * @returns {string}
   */
  function _formatSpark(amount) {
    var sign = amount >= 0 ? '+' : '';
    return sign + amount + ' Spark';
  }

  /**
   * Format balance card HTML for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {string} HTML string
   */
  function formatBalanceCard(state, playerId) {
    var balance = getBalance(state, playerId);
    var income = calculateDailyIncome(state, playerId);
    var expenses = calculateDailyExpenses(state, playerId);
    var net = income - expenses;
    var netClass = net >= 0 ? 'spark-positive' : 'spark-negative';
    var netSign = net >= 0 ? '+' : '';
    // Sum UBI received
    var ubiReceived = 0;
    if (state && state.transactions) {
      for (var i = 0; i < state.transactions.length; i++) {
        var tx = state.transactions[i];
        if (tx.playerId === playerId && tx.type === 'ubi') ubiReceived += tx.amount;
      }
    }
    // Sum tax paid
    var taxPaid = 0;
    if (state && state.transactions) {
      for (var j = 0; j < state.transactions.length; j++) {
        var ttx = state.transactions[j];
        if (ttx.playerId === playerId && ttx.type === 'wealth_tax') taxPaid += Math.abs(ttx.amount);
      }
    }
    return '<div class="balance-card">' +
      '<div class="balance-main"><span class="spark-gold">' + balance + ' Spark</span></div>' +
      '<div class="balance-row"><span class="label">Daily Income</span><span class="spark-positive">+' + income + ' Spark</span></div>' +
      '<div class="balance-row"><span class="label">Daily Expenses</span><span class="spark-negative">-' + expenses + ' Spark</span></div>' +
      '<div class="balance-row"><span class="label">Net Change</span><span class="' + netClass + '">' + netSign + net + ' Spark</span></div>' +
      '<div class="balance-row"><span class="label">UBI Received</span><span class="spark-positive">+' + ubiReceived + ' Spark</span></div>' +
      '<div class="balance-row"><span class="label">Tax Paid</span><span class="spark-negative">-' + taxPaid + ' Spark</span></div>' +
      '</div>';
  }

  /**
   * Format a market listing as an HTML table row.
   * @param {Object} listing
   * @returns {string} HTML string
   */
  function formatListingRow(listing) {
    if (!listing) return '';
    var total = listing.quantity * listing.pricePerUnit;
    return '<tr class="listing-row" data-listing-id="' + listing.id + '">' +
      '<td class="listing-item">' + (listing.itemId || '') + '</td>' +
      '<td class="listing-qty">' + (listing.quantity || 0) + '</td>' +
      '<td class="listing-price">' + (listing.pricePerUnit || 0) + ' Spark</td>' +
      '<td class="listing-total">' + total + ' Spark</td>' +
      '<td class="listing-seller">' + (listing.sellerId || '') + '</td>' +
      '<td class="listing-action"><button class="btn-buy" data-listing-id="' + listing.id + '">Buy</button></td>' +
      '</tr>';
  }

  /**
   * Format a transaction as an HTML row.
   * @param {Object} tx
   * @returns {string} HTML string
   */
  function formatTransactionRow(tx) {
    if (!tx) return '';
    var isPositive = tx.amount >= 0;
    var amountClass = isPositive ? 'spark-positive' : 'spark-negative';
    var typeIcon = _txTypeIcon(tx.type);
    var amountStr = (isPositive ? '+' : '') + tx.amount + ' Spark';
    var dateStr = tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : '';
    var timeStr = tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : '';
    var counterparty = tx.counterparty || '';
    return '<tr class="tx-row">' +
      '<td class="tx-type">' + typeIcon + '</td>' +
      '<td class="tx-amount ' + amountClass + '">' + amountStr + '</td>' +
      '<td class="tx-reason">' + (tx.reason || '') + '</td>' +
      '<td class="tx-date">' + dateStr + ' ' + timeStr + '</td>' +
      '<td class="tx-counterparty">' + counterparty + '</td>' +
      '</tr>';
  }

  /**
   * Get a text icon for a transaction type.
   * @param {string} type
   * @returns {string}
   */
  function _txTypeIcon(type) {
    var icons = {
      'earn': '[+]',
      'spend': '[-]',
      'transfer_in': '[>>]',
      'transfer_out': '[<<]',
      'market_buy': '[B]',
      'market_sell': '[S]',
      'listing_fee': '[F]',
      'ubi': '[U]',
      'wealth_tax': '[T]'
    };
    return icons[type] || '[?]';
  }

  /**
   * Format economy stats as HTML.
   * @param {Object} stats
   * @returns {string} HTML string
   */
  function formatEconomyStats(stats) {
    if (!stats) return '<div class="stats-panel">No data</div>';
    var giniPct = Math.round((stats.giniCoefficient || 0) * 100);
    var giniBar = _asciiBar(giniPct);
    return '<div class="stats-panel">' +
      '<div class="stat-row"><span class="label">Total Circulation</span><span class="spark-gold">' + Math.round(stats.totalCirculation || 0) + ' Spark</span></div>' +
      '<div class="stat-row"><span class="label">Average Wealth</span><span>' + Math.round(stats.averageWealth || 0) + ' Spark</span></div>' +
      '<div class="stat-row"><span class="label">Median Wealth</span><span>' + Math.round(stats.medianWealth || 0) + ' Spark</span></div>' +
      '<div class="stat-row"><span class="label">Gini Coefficient</span><span>' + (stats.giniCoefficient || 0).toFixed(3) + '</span></div>' +
      '<div class="stat-row stat-bar"><span class="label">Inequality</span><pre>' + giniBar + '</pre></div>' +
      '<div class="stat-row"><span class="label">Active Traders</span><span>' + (stats.activeTraders || 0) + '</span></div>' +
      '<div class="stat-row"><span class="label">Active Listings</span><span>' + (stats.totalListings || 0) + '</span></div>' +
      '<div class="stat-row"><span class="label">Total Transactions</span><span>' + (stats.totalTransactions || 0) + '</span></div>' +
      '</div>';
  }

  /**
   * Render an ASCII line chart showing Spark balance over time.
   * @param {Array} transactions
   * @param {number} [days=7]
   * @returns {string} Multi-line string
   */
  function renderSparkChart(transactions, days) {
    days = (typeof days === 'number' && days > 0) ? days : 7;
    if (!transactions || transactions.length === 0) {
      return '(no data)';
    }
    // Build daily net change buckets
    var now = Date.now();
    var buckets = [];
    for (var d = days - 1; d >= 0; d--) {
      buckets.push({ dayOffset: d, net: 0 });
    }
    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      var age = now - tx.timestamp;
      var dayIndex = Math.floor(age / MS_PER_DAY);
      if (dayIndex >= 0 && dayIndex < days) {
        // buckets[0] is oldest, but we indexed from newest
        var bIdx = (days - 1) - dayIndex;
        buckets[bIdx].net += tx.amount;
      }
    }
    // Compute running balance (from first to last)
    var running = [];
    var runBal = 0;
    for (var k = 0; k < buckets.length; k++) {
      runBal += buckets[k].net;
      running.push(runBal);
    }
    // Normalize to chart height of 5 rows
    var chartHeight = 5;
    var maxVal = Math.max.apply(null, running);
    var minVal = Math.min.apply(null, running);
    var range = maxVal - minVal;
    if (range === 0) range = 1;
    var chart = [];
    for (var row = chartHeight; row >= 0; row--) {
      var line = '';
      var rowThreshold = minVal + (row / chartHeight) * range;
      for (var col = 0; col < running.length; col++) {
        if (running[col] >= rowThreshold) {
          line += '*';
        } else {
          line += ' ';
        }
      }
      chart.push(line);
    }
    // Add axis
    var axis = '';
    for (var a = 0; a < days; a++) axis += '-';
    chart.push(axis);
    // Add day labels
    var labels = '';
    for (var b = days; b >= 1; b--) {
      labels += 'D' + b;
      if (b > 1) labels += ' ';
    }
    chart.push(labels);
    return chart.join('\n');
  }

  // =========================================================================
  // UI PANEL
  // =========================================================================

  /**
   * Create the economy panel DOM element (for browser use).
   * @returns {Element|null} DOM element, or null if document is not available
   */
  function createEconomyPanel() {
    if (typeof document === 'undefined') return null;

    var panel = document.createElement('div');
    panel.className = 'economy-panel';
    panel.setAttribute('data-panel', 'economy');

    // Tab navigation
    var tabNav = document.createElement('div');
    tabNav.className = 'economy-tabs';
    var tabs = ['Balance', 'Market', 'History', 'Stats'];
    var tabBtns = [];
    for (var t = 0; t < tabs.length; t++) {
      var btn = document.createElement('button');
      btn.className = 'economy-tab-btn' + (t === 0 ? ' active' : '');
      btn.setAttribute('data-tab', tabs[t].toLowerCase());
      btn.textContent = tabs[t];
      tabBtns.push(btn);
      tabNav.appendChild(btn);
    }
    panel.appendChild(tabNav);

    // Tab content container
    var tabContent = document.createElement('div');
    tabContent.className = 'economy-tab-content';

    // Balance tab
    var balanceTab = document.createElement('div');
    balanceTab.className = 'economy-tab active';
    balanceTab.setAttribute('data-content', 'balance');
    balanceTab.innerHTML =
      '<div class="tab-header">Balance</div>' +
      '<div class="balance-display">' +
        '<div class="balance-amount spark-gold">100 Spark</div>' +
        '<div class="balance-meta">' +
          '<div class="meta-row"><span>Daily Income</span><span class="spark-positive">+0 Spark</span></div>' +
          '<div class="meta-row"><span>Daily Expenses</span><span class="spark-negative">-0 Spark</span></div>' +
          '<div class="meta-row"><span>UBI Status</span><span class="ubi-status">Active</span></div>' +
          '<div class="meta-row"><span>Wealth Tax</span><span class="tax-indicator">None</span></div>' +
        '</div>' +
      '</div>';
    tabContent.appendChild(balanceTab);

    // Market tab
    var marketTab = document.createElement('div');
    marketTab.className = 'economy-tab hidden';
    marketTab.setAttribute('data-content', 'market');
    marketTab.innerHTML =
      '<div class="tab-header">Market</div>' +
      '<div class="market-controls">' +
        '<label>Sort by: <select class="market-sort">' +
          '<option value="date">Date</option>' +
          '<option value="price">Price</option>' +
          '<option value="quantity">Quantity</option>' +
        '</select></label>' +
      '</div>' +
      '<table class="market-table">' +
        '<thead><tr>' +
          '<th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th>Seller</th><th>Action</th>' +
        '</tr></thead>' +
        '<tbody class="market-listing-body"><tr><td colspan="6">No listings available</td></tr></tbody>' +
      '</table>' +
      '<div class="create-listing">' +
        '<div class="form-header">Create Listing</div>' +
        '<div class="form-group"><label>Item ID <input type="text" class="listing-item-id" placeholder="item_wood"></label></div>' +
        '<div class="form-group"><label>Quantity <input type="number" class="listing-qty" min="1" value="1"></label></div>' +
        '<div class="form-group"><label>Price per Unit <input type="number" class="listing-price" min="1" value="10"></label></div>' +
        '<div class="form-group listing-fee-preview">Listing fee: 1 Spark</div>' +
        '<button class="btn-create-listing">Create Listing</button>' +
      '</div>';
    tabContent.appendChild(marketTab);

    // History tab
    var historyTab = document.createElement('div');
    historyTab.className = 'economy-tab hidden';
    historyTab.setAttribute('data-content', 'history');
    historyTab.innerHTML =
      '<div class="tab-header">Transaction History</div>' +
      '<table class="tx-table">' +
        '<thead><tr>' +
          '<th>Type</th><th>Amount</th><th>Reason</th><th>Date</th><th>Counterparty</th>' +
        '</tr></thead>' +
        '<tbody class="tx-body"><tr><td colspan="5">No transactions yet</td></tr></tbody>' +
      '</table>';
    tabContent.appendChild(historyTab);

    // Stats tab
    var statsTab = document.createElement('div');
    statsTab.className = 'economy-tab hidden';
    statsTab.setAttribute('data-content', 'stats');
    statsTab.innerHTML =
      '<div class="tab-header">Economy Statistics</div>' +
      '<div class="stats-container">' +
        '<div class="stat-row"><span>Total Circulation</span><span class="spark-gold">0 Spark</span></div>' +
        '<div class="stat-row"><span>Average Wealth</span><span>0 Spark</span></div>' +
        '<div class="stat-row"><span>Gini Coefficient</span><span>0.000</span></div>' +
        '<div class="stat-row"><span>Active Traders</span><span>0</span></div>' +
        '<div class="wealth-distribution">' +
          '<div class="dist-header">Wealth Distribution</div>' +
          '<div class="dist-bars"></div>' +
        '</div>' +
      '</div>';
    tabContent.appendChild(statsTab);

    panel.appendChild(tabContent);

    // Wire up tab switching
    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', function(e) {
        var target = e.target.getAttribute('data-tab');
        var allBtns = panel.querySelectorAll('.economy-tab-btn');
        var allContent = panel.querySelectorAll('.economy-tab');
        for (var b = 0; b < allBtns.length; b++) {
          allBtns[b].classList.remove('active');
        }
        for (var c = 0; c < allContent.length; c++) {
          allContent[c].classList.remove('active');
          allContent[c].classList.add('hidden');
        }
        e.target.classList.add('active');
        var targetPane = panel.querySelector('[data-content="' + target + '"]');
        if (targetPane) {
          targetPane.classList.remove('hidden');
          targetPane.classList.add('active');
        }
      });
    }

    return panel;
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.createEconomyPanel = createEconomyPanel;
  exports.createEconomyState = createEconomyState;
  exports.getBalance = getBalance;
  exports.earnSpark = earnSpark;
  exports.spendSpark = spendSpark;
  exports.transferSpark = transferSpark;
  exports.createListing = createListing;
  exports.buyListing = buyListing;
  exports.cancelListing = cancelListing;
  exports.getListings = getListings;
  exports.getTransactionHistory = getTransactionHistory;
  exports.calculateDailyIncome = calculateDailyIncome;
  exports.calculateDailyExpenses = calculateDailyExpenses;
  exports.getEconomyStats = getEconomyStats;
  exports.calculateGiniCoefficient = calculateGiniCoefficient;
  exports.distributeUBI = distributeUBI;
  exports.applyWealthTax = applyWealthTax;
  exports.formatBalanceCard = formatBalanceCard;
  exports.formatListingRow = formatListingRow;
  exports.formatTransactionRow = formatTransactionRow;
  exports.formatEconomyStats = formatEconomyStats;
  exports.renderSparkChart = renderSparkChart;
  exports.getWealthDistribution = getWealthDistribution;
  // Expose constants for tests
  exports.DEFAULT_BALANCE = DEFAULT_BALANCE;
  exports.LISTING_FEE_RATE = LISTING_FEE_RATE;
  exports.MINIMUM_LISTING_FEE = MINIMUM_LISTING_FEE;
  exports.WEALTH_BRACKETS = WEALTH_BRACKETS;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardEconomy = {}));
