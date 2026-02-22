/**
 * auction_house.js — Time-Limited Sealed-Bid & Open-Bid Auctions for ZION
 * Agora Zone: list items, bid in open or sealed mode, Spark escrow,
 * auto-resolve on expiry, outbid notifications, transparent bid history.
 * Constitution §6.5: 5% listing fee destroyed at listing time (SYSTEM sink).
 *
 * Layer: after economy.js, inventory.js, trading.js, market_dynamics.js
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Dependency guards
  // ---------------------------------------------------------------------------

  var Economy       = (typeof window !== 'undefined' && window.Economy)        || {};
  var Inventory     = (typeof window !== 'undefined' && window.Inventory)      || {};
  var Trading       = (typeof window !== 'undefined' && window.Trading)        || {};
  var Notifications = (typeof window !== 'undefined' && window.Notifications)  || {};
  var MarketDynamics= (typeof window !== 'undefined' && window.MarketDynamics) || {};

  // ---------------------------------------------------------------------------
  // Seeded PRNG — mulberry32 (deterministic mechanics)
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var LISTING_FEE_RATE  = 0.05;       // 5% of reserve — destroyed (SYSTEM)
  var MIN_LISTING_FEE   = 1;          // Minimum 1 Spark
  var SYSTEM_SINK_ID    = 'SYSTEM';

  // Allowed durations in milliseconds (1 h, 6 h, 24 h, 48 h)
  var VALID_DURATIONS   = [3600000, 21600000, 86400000, 172800000];

  // Bid increment: open bids must exceed current by at least this ratio
  var MIN_BID_INCREMENT = 0.01;       // 1 % over current top bid

  // Seller rating decay: each transaction recency window in ms
  var RATING_WINDOW_MS  = 86400000 * 30;  // 30 days

  // Max auctions a single seller may have active simultaneously
  var MAX_ACTIVE_LISTINGS_PER_SELLER = 20;

  // Max bids logged per auction (FIFO drop oldest)
  var MAX_BID_HISTORY   = 200;

  // Auction mode constants
  var MODE_OPEN   = 'open';
  var MODE_SEALED = 'sealed';

  // Auction status constants
  var STATUS_ACTIVE    = 'active';
  var STATUS_ENDED     = 'ended';
  var STATUS_CANCELLED = 'cancelled';

  // Internal counters
  var auctionCounter = 0;
  var bidCounter     = 0;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function clamp(val, lo, hi) {
    return val < lo ? lo : val > hi ? hi : val;
  }

  function isValidDuration(ms) {
    for (var i = 0; i < VALID_DURATIONS.length; i++) {
      if (VALID_DURATIONS[i] === ms) return true;
    }
    return false;
  }

  function now() {
    return Date.now();
  }

  function calcListingFee(reservePrice) {
    var fee = Math.round(reservePrice * LISTING_FEE_RATE);
    return Math.max(fee, MIN_LISTING_FEE);
  }

  function getAuctionById(state, auctionId) {
    if (!state.auctionHouse || !state.auctionHouse.auctions) return null;
    var auctions = state.auctionHouse.auctions;
    for (var i = 0; i < auctions.length; i++) {
      if (auctions[i].id === auctionId) return auctions[i];
    }
    return null;
  }

  function getBalance(state, playerId) {
    if (!state.ledger || !state.ledger.balances) return 0;
    return state.ledger.balances[playerId] || 0;
  }

  function debitBalance(state, playerId, amount) {
    if (!state.ledger) state.ledger = { balances: {}, transactions: [] };
    if (!state.ledger.balances) state.ledger.balances = {};
    var bal = state.ledger.balances[playerId] || 0;
    state.ledger.balances[playerId] = Math.max(0, bal - amount);
  }

  function creditBalance(state, playerId, amount) {
    if (!state.ledger) state.ledger = { balances: {}, transactions: [] };
    if (!state.ledger.balances) state.ledger.balances = {};
    state.ledger.balances[playerId] = (state.ledger.balances[playerId] || 0) + amount;
  }

  function sinkSpark(state, amount) {
    // Destroy Spark — send to SYSTEM (irrecoverable per §6.5)
    if (!state.ledger) state.ledger = { balances: {}, transactions: [] };
    if (!state.ledger.balances) state.ledger.balances = {};
    state.ledger.balances[SYSTEM_SINK_ID] = (state.ledger.balances[SYSTEM_SINK_ID] || 0) + amount;
    if (!state.ledger.transactions) state.ledger.transactions = [];
    state.ledger.transactions.push({
      type: 'spark_sink',
      to: SYSTEM_SINK_ID,
      amount: amount,
      reason: 'auction_listing_fee',
      ts: now()
    });
  }

  function recordTx(state, from, to, amount, reason, auctionId) {
    if (!state.ledger) state.ledger = { balances: {}, transactions: [] };
    if (!state.ledger.transactions) state.ledger.transactions = [];
    state.ledger.transactions.push({
      type: 'auction',
      from: from,
      to: to,
      amount: amount,
      reason: reason,
      auctionId: auctionId,
      ts: now()
    });
  }

  function countActiveListingsBySeller(state, sellerId) {
    if (!state.auctionHouse || !state.auctionHouse.auctions) return 0;
    var count = 0;
    var auctions = state.auctionHouse.auctions;
    for (var i = 0; i < auctions.length; i++) {
      if (auctions[i].sellerId === sellerId && auctions[i].status === STATUS_ACTIVE) {
        count++;
      }
    }
    return count;
  }

  function resolveHighestBid(auction) {
    // For sealed auctions, find highest bid (bids are stored with amount obscured as -1 until revealed)
    var bids = auction.bids;
    if (!bids || bids.length === 0) return null;
    var best = null;
    for (var i = 0; i < bids.length; i++) {
      var b = bids[i];
      if (!best || b.amount > best.amount) {
        best = b;
      }
    }
    return best;
  }

  function notify(eventType, data) {
    if (Notifications && typeof Notifications.emit === 'function') {
      Notifications.emit(eventType, data);
    }
  }

  // ---------------------------------------------------------------------------
  // initAuctionHouse(state)
  // ---------------------------------------------------------------------------

  /**
   * Initialise (or no-op if already present) the auction house state bucket.
   * @param {Object} state - Mutable world state
   * @returns {Object} state
   */
  function initAuctionHouse(state) {
    if (!state.auctionHouse) {
      state.auctionHouse = {
        auctions: [],
        escrow: {},          // auctionId -> { [bidderId]: amount }
        sellerRatings: {},   // sellerId -> { wins, sales, cancels, ratingHistory[] }
        searchIndex: {}      // category -> [auctionId]
      };
    }
    return state;
  }

  // ---------------------------------------------------------------------------
  // listItem(state, params)
  // ---------------------------------------------------------------------------

  /**
   * Create a new auction listing.
   * @param {Object} state           - World state
   * @param {Object} params
   * @param {string}  params.sellerId     - Player ID of seller
   * @param {string}  params.itemId       - Item identifier
   * @param {string}  params.itemName     - Display name
   * @param {string}  params.category     - Item category for search
   * @param {number}  params.quantity     - Stack size
   * @param {number}  params.reservePrice - Minimum acceptable bid (Spark)
   * @param {number}  params.durationMs   - One of VALID_DURATIONS
   * @param {string}  [params.mode]       - 'open' (default) | 'sealed'
   * @param {number}  [params.buyoutPrice]- Optional instant-buy price
   * @param {string}  [params.description]- Optional flavour text
   * @returns {Object} { success, auctionId?, message? }
   */
  function listItem(state, params) {
    initAuctionHouse(state);

    if (!params || !params.sellerId) {
      return { success: false, message: 'sellerId required' };
    }
    if (!params.itemId) {
      return { success: false, message: 'itemId required' };
    }
    if (!params.itemName) {
      return { success: false, message: 'itemName required' };
    }
    if (typeof params.quantity !== 'number' || params.quantity < 1) {
      return { success: false, message: 'quantity must be >= 1' };
    }
    if (typeof params.reservePrice !== 'number' || params.reservePrice < 1) {
      return { success: false, message: 'reservePrice must be >= 1' };
    }
    if (!isValidDuration(params.durationMs)) {
      return { success: false, message: 'durationMs must be one of: 3600000, 21600000, 86400000, 172800000' };
    }
    if (params.buyoutPrice !== undefined && params.buyoutPrice !== null) {
      if (typeof params.buyoutPrice !== 'number' || params.buyoutPrice <= params.reservePrice) {
        return { success: false, message: 'buyoutPrice must be > reservePrice' };
      }
    }

    var mode = (params.mode === MODE_SEALED) ? MODE_SEALED : MODE_OPEN;

    // Enforce active-listing cap per seller
    if (countActiveListingsBySeller(state, params.sellerId) >= MAX_ACTIVE_LISTINGS_PER_SELLER) {
      return { success: false, message: 'Max active listings reached (' + MAX_ACTIVE_LISTINGS_PER_SELLER + ')' };
    }

    // Calculate and charge listing fee (destroyed — §6.5)
    var listingFee = calcListingFee(params.reservePrice);
    var sellerBalance = getBalance(state, params.sellerId);
    if (sellerBalance < listingFee) {
      return { success: false, message: 'Insufficient Spark for listing fee (' + listingFee + ' required)' };
    }

    debitBalance(state, params.sellerId, listingFee);
    sinkSpark(state, listingFee);

    var auctionId = 'auction_' + (++auctionCounter) + '_' + now();
    var startTime = now();
    var endTime   = startTime + params.durationMs;

    var auction = {
      id:           auctionId,
      sellerId:     params.sellerId,
      itemId:       params.itemId,
      itemName:     params.itemName,
      category:     params.category || 'misc',
      quantity:     params.quantity,
      reservePrice: params.reservePrice,
      buyoutPrice:  params.buyoutPrice || null,
      description:  params.description || '',
      mode:         mode,
      status:       STATUS_ACTIVE,
      startTime:    startTime,
      endTime:      endTime,
      durationMs:   params.durationMs,
      listingFee:   listingFee,
      bids:         [],            // bid objects
      topBidAmount: 0,             // current winning amount (0 = no bids yet)
      topBidderId:  null,
      buyoutBy:     null,
      resolvedAt:   null,
      winnerId:     null,
      finalPrice:   null
    };

    state.auctionHouse.auctions.push(auction);

    // Update search index
    var cat = auction.category;
    if (!state.auctionHouse.searchIndex[cat]) {
      state.auctionHouse.searchIndex[cat] = [];
    }
    state.auctionHouse.searchIndex[cat].push(auctionId);

    // Initialise escrow bucket
    state.auctionHouse.escrow[auctionId] = {};

    // Initialise or update seller rating record
    if (!state.auctionHouse.sellerRatings[params.sellerId]) {
      state.auctionHouse.sellerRatings[params.sellerId] = {
        totalSales: 0,
        totalCancels: 0,
        successRate: 1.0,
        ratingHistory: []
      };
    }

    return { success: true, auctionId: auctionId, listingFee: listingFee };
  }

  // ---------------------------------------------------------------------------
  // placeBid(state, params)
  // ---------------------------------------------------------------------------

  /**
   * Place a bid on an active auction.
   * @param {Object} state
   * @param {Object} params
   * @param {string}  params.bidderId  - Player placing bid
   * @param {string}  params.auctionId - Target auction
   * @param {number}  params.amount    - Bid amount in Spark
   * @returns {Object} { success, bidId?, message? }
   */
  function placeBid(state, params) {
    initAuctionHouse(state);

    if (!params || !params.bidderId) return { success: false, message: 'bidderId required' };
    if (!params.auctionId)           return { success: false, message: 'auctionId required' };
    if (typeof params.amount !== 'number' || params.amount < 1) {
      return { success: false, message: 'amount must be >= 1' };
    }

    var auction = getAuctionById(state, params.auctionId);
    if (!auction) return { success: false, message: 'Auction not found' };
    if (auction.status !== STATUS_ACTIVE) {
      return { success: false, message: 'Auction is not active (status: ' + auction.status + ')' };
    }
    if (now() >= auction.endTime) {
      return { success: false, message: 'Auction has expired' };
    }
    if (params.bidderId === auction.sellerId) {
      return { success: false, message: 'Seller cannot bid on own auction' };
    }

    // Must meet reserve
    if (params.amount < auction.reservePrice) {
      return { success: false, message: 'Bid must meet reserve price (' + auction.reservePrice + ')' };
    }

    // Open-bid increment check: must exceed current top by at least 1%
    if (auction.mode === MODE_OPEN && auction.topBidAmount > 0) {
      var minNext = Math.ceil(auction.topBidAmount * (1 + MIN_BID_INCREMENT));
      if (params.amount < minNext) {
        return { success: false, message: 'Open bid must be >= ' + minNext + ' (current top + 1%)' };
      }
    }

    // Sealed: each bidder may only bid once
    if (auction.mode === MODE_SEALED) {
      for (var s = 0; s < auction.bids.length; s++) {
        if (auction.bids[s].bidderId === params.bidderId) {
          return { success: false, message: 'Sealed auction: only one bid per bidder allowed' };
        }
      }
    }

    // Check bidder balance
    var bidderBalance = getBalance(state, params.bidderId);
    var currentEscrow = (state.auctionHouse.escrow[params.auctionId] &&
                         state.auctionHouse.escrow[params.auctionId][params.bidderId]) || 0;
    var additionalRequired = params.amount - currentEscrow;

    if (additionalRequired > 0 && bidderBalance < additionalRequired) {
      return { success: false, message: 'Insufficient Spark (need ' + additionalRequired + ' more)' };
    }

    // Handle previous bidder outbid refund (open mode)
    var prevTopBidder = auction.topBidderId;
    var prevTopAmount = auction.topBidAmount;

    if (auction.mode === MODE_OPEN && prevTopBidder && prevTopBidder !== params.bidderId) {
      // Refund previous top bidder's escrow
      var prevEscrow = state.auctionHouse.escrow[params.auctionId][prevTopBidder] || 0;
      if (prevEscrow > 0) {
        creditBalance(state, prevTopBidder, prevEscrow);
        recordTx(state, params.auctionId, prevTopBidder, prevEscrow, 'outbid_refund', params.auctionId);
        state.auctionHouse.escrow[params.auctionId][prevTopBidder] = 0;
      }
      // Notify outbid
      notify('auction_outbid', {
        auctionId: params.auctionId,
        outbidPlayerId: prevTopBidder,
        previousAmount: prevTopAmount,
        newAmount: params.amount,
        newBidderId: params.bidderId
      });
    }

    // Escrow the new bid amount (top up for same bidder)
    if (additionalRequired > 0) {
      debitBalance(state, params.bidderId, additionalRequired);
    } else if (additionalRequired < 0 && auction.mode === MODE_OPEN) {
      // Bidder is the same top bidder increasing their bid — additional already handled
    }
    state.auctionHouse.escrow[params.auctionId][params.bidderId] = params.amount;

    var bidId = 'bid_' + (++bidCounter) + '_' + now();

    var bid = {
      id:       bidId,
      bidderId: params.bidderId,
      // In sealed mode, store actual amount but display as -1 to other players until reveal
      amount:   params.amount,
      ts:       now()
    };

    // Cap bid history
    if (auction.bids.length >= MAX_BID_HISTORY) {
      auction.bids.shift();
    }
    auction.bids.push(bid);

    // Update top bid (open mode always tracks; sealed mode tracks internally for resolution)
    if (params.amount > auction.topBidAmount) {
      auction.topBidAmount = params.amount;
      auction.topBidderId  = params.bidderId;
    }

    return { success: true, bidId: bidId, amount: params.amount };
  }

  // ---------------------------------------------------------------------------
  // buyout(state, params)
  // ---------------------------------------------------------------------------

  /**
   * Instantly purchase an auction at buyout price.
   * @param {Object} state
   * @param {Object} params
   * @param {string}  params.buyerId   - Player ID
   * @param {string}  params.auctionId - Target auction
   * @returns {Object} { success, message? }
   */
  function buyout(state, params) {
    initAuctionHouse(state);

    if (!params || !params.buyerId)   return { success: false, message: 'buyerId required' };
    if (!params.auctionId)            return { success: false, message: 'auctionId required' };

    var auction = getAuctionById(state, params.auctionId);
    if (!auction)                          return { success: false, message: 'Auction not found' };
    if (auction.status !== STATUS_ACTIVE)  return { success: false, message: 'Auction is not active' };
    if (now() >= auction.endTime)          return { success: false, message: 'Auction has expired' };
    if (!auction.buyoutPrice)              return { success: false, message: 'No buyout price set' };
    if (params.buyerId === auction.sellerId) return { success: false, message: 'Seller cannot buy own auction' };

    var buyerBalance = getBalance(state, params.buyerId);
    var existingEscrow = (state.auctionHouse.escrow[params.auctionId] &&
                          state.auctionHouse.escrow[params.auctionId][params.buyerId]) || 0;
    var needed = auction.buyoutPrice - existingEscrow;

    if (needed > 0 && buyerBalance < needed) {
      return { success: false, message: 'Insufficient Spark for buyout (' + auction.buyoutPrice + ' required)' };
    }

    // Debit additional needed
    if (needed > 0) {
      debitBalance(state, params.buyerId, needed);
    }

    // Refund all other bidders' escrow
    var escrowBucket = state.auctionHouse.escrow[params.auctionId] || {};
    for (var bidderId in escrowBucket) {
      if (bidderId !== params.buyerId && escrowBucket[bidderId] > 0) {
        creditBalance(state, bidderId, escrowBucket[bidderId]);
        recordTx(state, params.auctionId, bidderId, escrowBucket[bidderId], 'buyout_refund', params.auctionId);
        escrowBucket[bidderId] = 0;
      }
    }

    // Pay seller
    creditBalance(state, auction.sellerId, auction.buyoutPrice);
    recordTx(state, params.buyerId, auction.sellerId, auction.buyoutPrice, 'buyout_payment', params.auctionId);

    // Finalise auction
    auction.status      = STATUS_ENDED;
    auction.winnerId    = params.buyerId;
    auction.finalPrice  = auction.buyoutPrice;
    auction.resolvedAt  = now();
    auction.buyoutBy    = params.buyerId;
    state.auctionHouse.escrow[params.auctionId][params.buyerId] = 0;

    // Update seller rating
    _recordSellerSale(state, auction.sellerId, true);

    notify('auction_buyout', {
      auctionId:  params.auctionId,
      buyerId:    params.buyerId,
      sellerId:   auction.sellerId,
      price:      auction.buyoutPrice,
      itemId:     auction.itemId,
      itemName:   auction.itemName
    });

    return { success: true, finalPrice: auction.buyoutPrice };
  }

  // ---------------------------------------------------------------------------
  // resolveAuction(state, auctionId)
  // ---------------------------------------------------------------------------

  /**
   * Resolve an expired auction: determine winner, transfer Spark, refund losers.
   * Safe to call multiple times — idempotent if already ended.
   * @param {Object} state
   * @param {string} auctionId
   * @returns {Object} { success, winnerId?, finalPrice?, message? }
   */
  function resolveAuction(state, auctionId) {
    initAuctionHouse(state);

    var auction = getAuctionById(state, auctionId);
    if (!auction) return { success: false, message: 'Auction not found' };
    if (auction.status === STATUS_CANCELLED) {
      return { success: false, message: 'Auction was cancelled' };
    }
    if (auction.status === STATUS_ENDED) {
      return { success: true, winnerId: auction.winnerId, finalPrice: auction.finalPrice, alreadyResolved: true };
    }
    if (now() < auction.endTime) {
      return { success: false, message: 'Auction has not expired yet' };
    }

    auction.status     = STATUS_ENDED;
    auction.resolvedAt = now();

    var winner = resolveHighestBid(auction);
    var escrowBucket = state.auctionHouse.escrow[auctionId] || {};

    if (!winner || winner.amount < auction.reservePrice) {
      // No winner — reserve not met
      // Refund all bidders
      for (var bid in escrowBucket) {
        if (escrowBucket[bid] > 0) {
          creditBalance(state, bid, escrowBucket[bid]);
          recordTx(state, auctionId, bid, escrowBucket[bid], 'no_winner_refund', auctionId);
          escrowBucket[bid] = 0;
        }
      }
      auction.winnerId   = null;
      auction.finalPrice = null;

      notify('auction_ended_no_winner', {
        auctionId: auctionId,
        sellerId:  auction.sellerId,
        itemId:    auction.itemId
      });

      return { success: true, winnerId: null, finalPrice: null };
    }

    // Winner found
    auction.winnerId   = winner.bidderId;
    auction.finalPrice = winner.amount;

    // Refund losing bidders
    for (var loserId in escrowBucket) {
      if (loserId !== winner.bidderId && escrowBucket[loserId] > 0) {
        creditBalance(state, loserId, escrowBucket[loserId]);
        recordTx(state, auctionId, loserId, escrowBucket[loserId], 'losing_bid_refund', auctionId);
        escrowBucket[loserId] = 0;
      }
    }

    // Transfer winner's escrowed amount to seller
    creditBalance(state, auction.sellerId, winner.amount);
    recordTx(state, winner.bidderId, auction.sellerId, winner.amount, 'auction_sale', auctionId);
    escrowBucket[winner.bidderId] = 0;

    // Update seller rating
    _recordSellerSale(state, auction.sellerId, true);

    notify('auction_ended_with_winner', {
      auctionId:  auctionId,
      sellerId:   auction.sellerId,
      winnerId:   winner.bidderId,
      finalPrice: winner.amount,
      itemId:     auction.itemId,
      itemName:   auction.itemName,
      mode:       auction.mode
    });

    return { success: true, winnerId: winner.bidderId, finalPrice: winner.amount };
  }

  // ---------------------------------------------------------------------------
  // cancelAuction(state, params)
  // ---------------------------------------------------------------------------

  /**
   * Cancel an auction (only allowed if no bids have been placed).
   * @param {Object} state
   * @param {Object} params
   * @param {string}  params.sellerId  - Must match auction seller
   * @param {string}  params.auctionId
   * @returns {Object} { success, message? }
   */
  function cancelAuction(state, params) {
    initAuctionHouse(state);

    if (!params || !params.sellerId)  return { success: false, message: 'sellerId required' };
    if (!params.auctionId)            return { success: false, message: 'auctionId required' };

    var auction = getAuctionById(state, params.auctionId);
    if (!auction)                          return { success: false, message: 'Auction not found' };
    if (auction.status !== STATUS_ACTIVE)  return { success: false, message: 'Auction is not active' };
    if (auction.sellerId !== params.sellerId) {
      return { success: false, message: 'Only the seller can cancel this auction' };
    }

    // Policy: can only cancel if no bids placed
    if (auction.bids.length > 0) {
      return { success: false, message: 'Cannot cancel auction after bids have been placed' };
    }

    auction.status     = STATUS_CANCELLED;
    auction.resolvedAt = now();

    _recordSellerSale(state, auction.sellerId, false);

    notify('auction_cancelled', {
      auctionId: params.auctionId,
      sellerId:  auction.sellerId,
      itemId:    auction.itemId
    });

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // getBidHistory(state, auctionId, requesterId)
  // ---------------------------------------------------------------------------

  /**
   * Get bid history for an auction.
   * In sealed mode, amounts are obscured (shown as -1) for non-sellers until resolved.
   * @param {Object} state
   * @param {string} auctionId
   * @param {string} [requesterId] - Player requesting; seller/winner see full amounts
   * @returns {Object} { success, bids?, message? }
   */
  function getBidHistory(state, auctionId, requesterId) {
    initAuctionHouse(state);

    var auction = getAuctionById(state, auctionId);
    if (!auction) return { success: false, message: 'Auction not found' };

    var isSealed   = auction.mode === MODE_SEALED;
    var isEnded    = auction.status !== STATUS_ACTIVE;
    var isSeller   = requesterId && requesterId === auction.sellerId;

    var bids = [];
    for (var i = 0; i < auction.bids.length; i++) {
      var b = auction.bids[i];
      var revealed = !isSealed || isEnded || isSeller || (requesterId && b.bidderId === requesterId);
      bids.push({
        id:       b.id,
        bidderId: b.bidderId,
        amount:   revealed ? b.amount : -1,
        ts:       b.ts
      });
    }

    return { success: true, bids: bids, mode: auction.mode, status: auction.status };
  }

  // ---------------------------------------------------------------------------
  // searchAuctions(state, filters)
  // ---------------------------------------------------------------------------

  /**
   * Search and filter active auctions.
   * @param {Object} state
   * @param {Object} [filters]
   * @param {string}  [filters.category]    - Filter by category
   * @param {string}  [filters.itemId]      - Filter by exact itemId
   * @param {string}  [filters.sellerId]    - Filter by seller
   * @param {number}  [filters.minPrice]    - Min reserve price
   * @param {number}  [filters.maxPrice]    - Max reserve price
   * @param {string}  [filters.mode]        - 'open' | 'sealed'
   * @param {boolean} [filters.hasBuyout]   - Only auctions with buyout price
   * @param {string}  [filters.sortBy]      - 'price_asc'|'price_desc'|'time_asc'|'time_desc'|'bids_desc'
   * @param {number}  [filters.limit]       - Max results (default 50)
   * @param {number}  [filters.offset]      - Pagination offset
   * @returns {Object} { success, results[], total }
   */
  function searchAuctions(state, filters) {
    initAuctionHouse(state);

    var f      = filters || {};
    var limit  = (typeof f.limit === 'number' && f.limit > 0) ? f.limit : 50;
    var offset = (typeof f.offset === 'number' && f.offset >= 0) ? f.offset : 0;
    var ts     = now();

    var results = [];
    var auctions = state.auctionHouse.auctions;

    for (var i = 0; i < auctions.length; i++) {
      var a = auctions[i];
      // Only show active non-expired
      if (a.status !== STATUS_ACTIVE || ts >= a.endTime) continue;

      if (f.category  && a.category  !== f.category)  continue;
      if (f.itemId    && a.itemId    !== f.itemId)     continue;
      if (f.sellerId  && a.sellerId  !== f.sellerId)   continue;
      if (f.mode      && a.mode      !== f.mode)       continue;
      if (typeof f.minPrice === 'number' && a.reservePrice < f.minPrice) continue;
      if (typeof f.maxPrice === 'number' && a.reservePrice > f.maxPrice) continue;
      if (f.hasBuyout && !a.buyoutPrice) continue;

      results.push({
        id:           a.id,
        sellerId:     a.sellerId,
        itemId:       a.itemId,
        itemName:     a.itemName,
        category:     a.category,
        quantity:     a.quantity,
        reservePrice: a.reservePrice,
        buyoutPrice:  a.buyoutPrice,
        topBidAmount: a.topBidAmount,
        bidCount:     a.bids.length,
        mode:         a.mode,
        endTime:      a.endTime,
        timeLeft:     a.endTime - ts,
        description:  a.description
      });
    }

    // Sort
    var sortBy = f.sortBy || 'time_asc';
    if (sortBy === 'price_asc') {
      results.sort(function(a, b) { return a.reservePrice - b.reservePrice; });
    } else if (sortBy === 'price_desc') {
      results.sort(function(a, b) { return b.reservePrice - a.reservePrice; });
    } else if (sortBy === 'time_asc') {
      results.sort(function(a, b) { return a.endTime - b.endTime; });
    } else if (sortBy === 'time_desc') {
      results.sort(function(a, b) { return b.endTime - a.endTime; });
    } else if (sortBy === 'bids_desc') {
      results.sort(function(a, b) { return b.bidCount - a.bidCount; });
    }

    var total = results.length;
    var page  = results.slice(offset, offset + limit);

    return { success: true, results: page, total: total, offset: offset, limit: limit };
  }

  // ---------------------------------------------------------------------------
  // getAuction(state, auctionId)
  // ---------------------------------------------------------------------------

  /**
   * Retrieve a single auction's public summary.
   * @param {Object} state
   * @param {string} auctionId
   * @returns {Object|null} auction summary or null
   */
  function getAuction(state, auctionId) {
    initAuctionHouse(state);
    var auction = getAuctionById(state, auctionId);
    if (!auction) return null;
    return {
      id:           auction.id,
      sellerId:     auction.sellerId,
      itemId:       auction.itemId,
      itemName:     auction.itemName,
      category:     auction.category,
      quantity:     auction.quantity,
      reservePrice: auction.reservePrice,
      buyoutPrice:  auction.buyoutPrice,
      description:  auction.description,
      mode:         auction.mode,
      status:       auction.status,
      startTime:    auction.startTime,
      endTime:      auction.endTime,
      durationMs:   auction.durationMs,
      topBidAmount: auction.topBidAmount,
      topBidderId:  auction.topBidderId,
      bidCount:     auction.bids.length,
      winnerId:     auction.winnerId,
      finalPrice:   auction.finalPrice,
      resolvedAt:   auction.resolvedAt,
      buyoutBy:     auction.buyoutBy,
      listingFee:   auction.listingFee
    };
  }

  // ---------------------------------------------------------------------------
  // getSellerRating(state, sellerId)
  // ---------------------------------------------------------------------------

  /**
   * Get a seller's rating summary.
   * @param {Object} state
   * @param {string} sellerId
   * @returns {Object} { sellerId, totalSales, totalCancels, successRate, ratingHistory[] }
   */
  function getSellerRating(state, sellerId) {
    initAuctionHouse(state);
    var r = state.auctionHouse.sellerRatings[sellerId];
    if (!r) {
      return {
        sellerId:     sellerId,
        totalSales:   0,
        totalCancels: 0,
        successRate:  1.0,
        ratingHistory:[]
      };
    }
    return {
      sellerId:     sellerId,
      totalSales:   r.totalSales,
      totalCancels: r.totalCancels,
      successRate:  r.successRate,
      ratingHistory:r.ratingHistory.slice()
    };
  }

  // Internal: record a seller's sale or cancel event for rating
  function _recordSellerSale(state, sellerId, wasSuccess) {
    if (!state.auctionHouse.sellerRatings[sellerId]) {
      state.auctionHouse.sellerRatings[sellerId] = {
        totalSales:   0,
        totalCancels: 0,
        successRate:  1.0,
        ratingHistory:[]
      };
    }
    var r = state.auctionHouse.sellerRatings[sellerId];
    if (wasSuccess) {
      r.totalSales++;
    } else {
      r.totalCancels++;
    }
    var total = r.totalSales + r.totalCancels;
    r.successRate = total > 0 ? r.totalSales / total : 1.0;
    r.ratingHistory.push({ ts: now(), success: wasSuccess });
    // Keep history trimmed
    if (r.ratingHistory.length > 100) r.ratingHistory.shift();
  }

  // ---------------------------------------------------------------------------
  // tickAuctions(state)
  // ---------------------------------------------------------------------------

  /**
   * Resolve all expired-but-unresolved auctions. Call once per game tick.
   * @param {Object} state
   * @returns {Object[]} Array of resolution results
   */
  function tickAuctions(state) {
    initAuctionHouse(state);
    var results = [];
    var ts = now();
    var auctions = state.auctionHouse.auctions;
    for (var i = 0; i < auctions.length; i++) {
      var a = auctions[i];
      if (a.status === STATUS_ACTIVE && ts >= a.endTime) {
        var r = resolveAuction(state, a.id);
        r.auctionId = a.id;
        results.push(r);
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // getEscrowBalance(state, auctionId, bidderId)
  // ---------------------------------------------------------------------------

  /**
   * Check how much Spark a bidder has in escrow for a given auction.
   * @param {Object} state
   * @param {string} auctionId
   * @param {string} bidderId
   * @returns {number} escrow amount
   */
  function getEscrowBalance(state, auctionId, bidderId) {
    initAuctionHouse(state);
    if (!state.auctionHouse.escrow[auctionId]) return 0;
    return state.auctionHouse.escrow[auctionId][bidderId] || 0;
  }

  // ---------------------------------------------------------------------------
  // getAuctionsByCategory(state, category)
  // ---------------------------------------------------------------------------

  /**
   * Return active auction IDs for a category (raw index lookup).
   * @param {Object} state
   * @param {string} category
   * @returns {string[]}
   */
  function getAuctionsByCategory(state, category) {
    initAuctionHouse(state);
    var ids = state.auctionHouse.searchIndex[category] || [];
    // Filter to only currently active
    var active = [];
    for (var i = 0; i < ids.length; i++) {
      var a = getAuctionById(state, ids[i]);
      if (a && a.status === STATUS_ACTIVE) active.push(ids[i]);
    }
    return active;
  }

  // ---------------------------------------------------------------------------
  // getStats(state)
  // ---------------------------------------------------------------------------

  /**
   * Return aggregate stats for the auction house.
   * @param {Object} state
   * @returns {Object}
   */
  function getStats(state) {
    initAuctionHouse(state);
    var auctions = state.auctionHouse.auctions;
    var active   = 0;
    var ended    = 0;
    var cancelled= 0;
    var totalFeesDestroyed = 0;
    var totalVolumeTraded  = 0;

    for (var i = 0; i < auctions.length; i++) {
      var a = auctions[i];
      totalFeesDestroyed += a.listingFee;
      if (a.status === STATUS_ACTIVE)    active++;
      if (a.status === STATUS_ENDED)     ended++;
      if (a.status === STATUS_CANCELLED) cancelled++;
      if (a.finalPrice) totalVolumeTraded += a.finalPrice;
    }

    return {
      totalListings:     auctions.length,
      activeListings:    active,
      endedListings:     ended,
      cancelledListings: cancelled,
      totalFeesDestroyed:totalFeesDestroyed,
      totalVolumeTraded: totalVolumeTraded,
      uniqueSellers:     Object.keys(state.auctionHouse.sellerRatings).length
    };
  }

  // ---------------------------------------------------------------------------
  // getActiveAuctions(state)
  // ---------------------------------------------------------------------------

  /**
   * Return all currently active auctions (not expired).
   * @param {Object} state
   * @returns {Object[]} array of auction summaries
   */
  function getActiveAuctions(state) {
    initAuctionHouse(state);
    var ts = now();
    var result = [];
    var auctions = state.auctionHouse.auctions;
    for (var i = 0; i < auctions.length; i++) {
      var a = auctions[i];
      if (a.status === STATUS_ACTIVE && ts < a.endTime) {
        result.push(getAuction(state, a.id));
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // calcListingFee (exported for testing)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  exports.initAuctionHouse      = initAuctionHouse;
  exports.listItem              = listItem;
  exports.placeBid              = placeBid;
  exports.buyout                = buyout;
  exports.resolveAuction        = resolveAuction;
  exports.cancelAuction         = cancelAuction;
  exports.getBidHistory         = getBidHistory;
  exports.searchAuctions        = searchAuctions;
  exports.getAuction            = getAuction;
  exports.getSellerRating       = getSellerRating;
  exports.tickAuctions          = tickAuctions;
  exports.getEscrowBalance      = getEscrowBalance;
  exports.getAuctionsByCategory = getAuctionsByCategory;
  exports.getStats              = getStats;
  exports.getActiveAuctions     = getActiveAuctions;
  exports.calcListingFee        = calcListingFee;
  exports.mulberry32            = mulberry32;

  // Constants for external consumers
  exports.MODE_OPEN      = MODE_OPEN;
  exports.MODE_SEALED    = MODE_SEALED;
  exports.STATUS_ACTIVE  = STATUS_ACTIVE;
  exports.STATUS_ENDED   = STATUS_ENDED;
  exports.STATUS_CANCELLED = STATUS_CANCELLED;
  exports.VALID_DURATIONS  = VALID_DURATIONS;
  exports.LISTING_FEE_RATE = LISTING_FEE_RATE;
  exports.MIN_LISTING_FEE  = MIN_LISTING_FEE;
  exports.MAX_ACTIVE_LISTINGS_PER_SELLER = MAX_ACTIVE_LISTINGS_PER_SELLER;

})(typeof module !== 'undefined' ? module.exports : (window.AuctionHouse = {}));
