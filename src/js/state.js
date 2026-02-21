/**
 * ZION State Management System - Three-tier state management
 * Layer 2 - Self-contained (conceptually depends on protocol.js)
 */

(function(exports) {
  'use strict';

  // In-memory live state
  let liveState = null;

  /**
   * Creates initial world state with all required keys
   * @returns {Object} Initial world state
   */
  function createWorldState() {
    return {
      world: {
        time: 0,
        weather: 'clear',
        season: 'spring',
        dayPhase: 'day'
      },
      players: {},
      economy: {
        balances: {},
        transactions: [],
        listings: []
      },
      gardens: {},
      structures: {},
      discoveries: {},
      anchors: {},
      chat: [],
      actions: [],
      changes: [],
      competitions: {},
      federation: {
        federations: []
      },
      playerStars: {}
    };
  }

  /**
   * Gets current live state
   * @returns {Object} Current in-memory state
   */
  function getLiveState() {
    if (!liveState) {
      liveState = createWorldState();
    }
    return liveState;
  }

  /**
   * Sets a value at a dot-separated path in live state
   * @param {string} path - Dot-separated path (e.g., 'world.time')
   * @param {*} value - Value to set
   */
  function setLiveState(path, value) {
    if (!liveState) {
      liveState = createWorldState();
    }

    const parts = path.split('.');
    let current = liveState;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Flushes live state to localStorage
   */
  function flushToLocal() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const state = getLiveState();
      localStorage.setItem('zion_state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to flush to localStorage:', e);
    }
  }

  /**
   * Loads state from localStorage to live state
   */
  function loadFromLocal() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('zion_state');
      if (stored) {
        liveState = JSON.parse(stored);
      } else {
        liveState = createWorldState();
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      liveState = createWorldState();
    }
  }

  /**
   * Flushes to canonical JSON string
   * @returns {string} JSON string of current state
   */
  function flushToCanonical() {
    const state = getLiveState();
    return JSON.stringify(state);
  }

  /**
   * Loads from canonical JSON string
   * @param {string} json - JSON string
   */
  function loadFromCanonical(json) {
    try {
      liveState = JSON.parse(json);
    } catch (e) {
      console.error('Failed to parse canonical state:', e);
      liveState = createWorldState();
    }
  }

  /**
   * Applies a protocol message to state (PURE function)
   * @param {Object} state - Current state
   * @param {Object} message - Protocol message
   * @returns {Object} New state
   */
  function applyMessage(state, message) {
    // Deep clone state for immutability
    const newState = JSON.parse(JSON.stringify(state));

    const { type, from, payload } = message;
    const timestamp = message.ts || Date.now();

    switch (type) {
      case 'join':
        newState.players[from] = {
          id: from,
          name: payload.name || from,
          position: payload.position || { x: 0, y: 0, z: 0 },
          zone: payload.zone || 'default',
          online: true,
          last_seen: timestamp,
          idle: false,
          inventory: [],
          intentions: [],
          ...payload
        };
        break;

      case 'leave':
        if (newState.players[from]) {
          newState.players[from].online = false;
          newState.players[from].last_seen = timestamp;
        }
        break;

      case 'heartbeat':
        if (newState.players[from]) {
          newState.players[from].last_seen = timestamp;
          newState.players[from].idle = false;
        }
        break;

      case 'idle':
        if (newState.players[from]) {
          newState.players[from].idle = true;
        }
        break;

      case 'move':
        if (newState.players[from] && payload.position) {
          newState.players[from].position = payload.position;
        }
        break;

      case 'warp':
        if (newState.players[from]) {
          if (payload.position) {
            newState.players[from].position = payload.position;
          }
          if (payload.zone) {
            newState.players[from].zone = payload.zone;
          }
        }
        break;

      case 'say':
      case 'shout':
      case 'whisper':
      case 'emote':
        newState.chat.push({
          id: `chat_${timestamp}_${from}`,
          type,
          from,
          to: payload.to,
          text: payload.text || payload.message || '',
          ts: timestamp
        });
        break;

      case 'build':
        if (payload.structure) {
          const structureId = `struct_${timestamp}_${from}`;
          newState.structures[structureId] = {
            id: structureId,
            builder: from,
            type: payload.structure.type,
            position: payload.structure.position,
            data: payload.structure.data || {},
            ts: timestamp
          };
        }
        break;

      case 'plant':
        if (payload.plant) {
          const gardenId = `garden_${timestamp}_${from}`;
          newState.gardens[gardenId] = {
            id: gardenId,
            gardener: from,
            plant: payload.plant.type,
            position: payload.plant.position,
            planted_at: timestamp,
            ready_at: timestamp + (payload.plant.grow_time || 60000),
            ready: false
          };
        }
        break;

      case 'harvest':
        if (payload.gardenId && newState.gardens[payload.gardenId]) {
          const garden = newState.gardens[payload.gardenId];
          if (garden.ready || timestamp >= garden.ready_at) {
            delete newState.gardens[payload.gardenId];
            // Add harvested item to player inventory
            if (newState.players[from] && newState.players[from].inventory) {
              newState.players[from].inventory.push({
                type: garden.plant,
                harvested_at: timestamp
              });
            }
          }
        }
        break;

      case 'craft':
        if (payload.item && newState.players[from]) {
          if (!newState.players[from].inventory) {
            newState.players[from].inventory = [];
          }
          newState.players[from].inventory.push({
            type: payload.item.type,
            crafted_at: timestamp,
            data: payload.item.data || {}
          });
        }
        break;

      case 'compose':
        if (payload.art) {
          const artId = `art_${timestamp}_${from}`;
          newState.structures[artId] = {
            id: artId,
            artist: from,
            type: 'art',
            art_type: payload.art.type,
            position: payload.art.position,
            data: payload.art.data || {},
            ts: timestamp
          };
        }
        break;

      case 'trade_offer':
        newState.actions.push({
          id: `trade_${timestamp}_${from}`,
          type: 'trade_offer',
          from,
          to: payload.to,
          offered: payload.offered || [],
          requested: payload.requested || [],
          status: 'pending',
          ts: timestamp
        });
        break;

      case 'trade_accept':
        if (payload.tradeId) {
          const trade = newState.actions.find(a => a.id === payload.tradeId);
          if (trade && trade.type === 'trade_offer') {
            trade.status = 'accepted';
            trade.completed_at = timestamp;
            // Exchange items between players
            var sender = newState.players[trade.from];
            var recipient = newState.players[trade.to];
            if (sender && recipient) {
              if (!sender.inventory) sender.inventory = [];
              if (!recipient.inventory) recipient.inventory = [];
              // Move offered items from sender to recipient
              if (trade.offered && trade.offered.length > 0) {
                trade.offered.forEach(function(item) {
                  var idx = sender.inventory.findIndex(function(inv) { return inv.type === item.type; });
                  if (idx !== -1) {
                    sender.inventory.splice(idx, 1);
                    recipient.inventory.push(item);
                  }
                });
              }
              // Move requested items from recipient to sender
              if (trade.requested && trade.requested.length > 0) {
                trade.requested.forEach(function(item) {
                  var idx = recipient.inventory.findIndex(function(inv) { return inv.type === item.type; });
                  if (idx !== -1) {
                    recipient.inventory.splice(idx, 1);
                    sender.inventory.push(item);
                  }
                });
              }
            }
          }
        }
        break;

      case 'trade_decline':
        if (payload.tradeId) {
          const trade = newState.actions.find(a => a.id === payload.tradeId);
          if (trade && trade.type === 'trade_offer') {
            trade.status = 'declined';
            trade.completed_at = timestamp;
          }
        }
        break;

      case 'buy':
        // Market buy — find listing, transfer Spark, transfer item
        var buyActionId = 'buy_' + timestamp + '_' + from;
        var listing = (newState.economy.listings || []).find(function(l) { return l.id === payload.listingId && l.active; });
        if (listing) {
          var buyerBal = (newState.economy.balances[from] || 0);
          if (buyerBal >= listing.price) {
            // Transfer Spark: buyer pays, seller receives
            newState.economy.balances[from] = (newState.economy.balances[from] || 0) - listing.price;
            newState.economy.balances[listing.seller] = (newState.economy.balances[listing.seller] || 0) + listing.price;
            listing.active = false;
            listing.sold_to = from;
            listing.sold_at = timestamp;
            // Transfer item to buyer's inventory
            if (newState.players[from]) {
              if (!newState.players[from].inventory) newState.players[from].inventory = [];
              newState.players[from].inventory.push({
                type: listing.itemType || listing.item,
                purchased_at: timestamp,
                data: listing.data || {}
              });
            }
            // Record transaction
            newState.economy.transactions.push({
              id: buyActionId,
              type: 'buy',
              from: from,
              to: listing.seller,
              amount: listing.price,
              item: listing.itemType || listing.item,
              ts: timestamp
            });
          }
        }
        newState.actions.push({
          id: buyActionId,
          type: 'buy',
          buyer: from,
          listingId: payload.listingId,
          success: !!listing,
          ts: timestamp
        });
        break;

      case 'sell':
        // Market sell — create listing from player's item
        var sellActionId = 'sell_' + timestamp + '_' + from;
        var listingId = 'listing_' + timestamp + '_' + from;
        if (!newState.economy.listings) newState.economy.listings = [];
        newState.economy.listings.push({
          id: listingId,
          seller: from,
          item: payload.item,
          itemType: payload.item && payload.item.type ? payload.item.type : payload.item,
          price: payload.price || 0,
          active: true,
          data: payload.data || {},
          ts: timestamp
        });
        newState.actions.push({
          id: sellActionId,
          type: 'sell',
          seller: from,
          listingId: listingId,
          item: payload.item,
          price: payload.price,
          ts: timestamp
        });
        break;

      case 'gift':
        if (payload.to && payload.item) {
          newState.actions.push({
            id: `gift_${timestamp}_${from}`,
            type: 'gift',
            from,
            to: payload.to,
            item: payload.item,
            ts: timestamp
          });
          // Transfer item from sender to recipient
          if (newState.players[from] && newState.players[payload.to]) {
            if (!newState.players[payload.to].inventory) {
              newState.players[payload.to].inventory = [];
            }
            newState.players[payload.to].inventory.push({
              ...payload.item,
              gifted_from: from,
              gifted_at: timestamp
            });
          }
        }
        break;

      case 'teach':
        newState.actions.push({
          id: `teach_${timestamp}_${from}`,
          type: 'teach',
          teacher: from,
          student: payload.to,
          skill: payload.skill,
          ts: timestamp
        });
        break;

      case 'learn':
        newState.actions.push({
          id: `learn_${timestamp}_${from}`,
          type: 'learn',
          learner: from,
          skill: payload.skill,
          source: payload.source,
          ts: timestamp
        });
        break;

      case 'mentor_offer':
        newState.actions.push({
          id: `mentor_${timestamp}_${from}`,
          type: 'mentor_offer',
          mentor: from,
          mentee: payload.to,
          status: 'pending',
          ts: timestamp
        });
        break;

      case 'mentor_accept':
        if (payload.mentorId) {
          const mentorship = newState.actions.find(a => a.id === payload.mentorId);
          if (mentorship && mentorship.type === 'mentor_offer') {
            mentorship.status = 'accepted';
            mentorship.accepted_at = timestamp;
          }
        }
        break;

      case 'challenge':
        const challengeId = `challenge_${timestamp}_${from}`;
        newState.competitions[challengeId] = {
          id: challengeId,
          challenger: from,
          challenged: payload.to,
          type: payload.challenge_type,
          status: 'pending',
          ts: timestamp
        };
        break;

      case 'accept_challenge':
        if (payload.challengeId && newState.competitions[payload.challengeId]) {
          newState.competitions[payload.challengeId].status = 'active';
          newState.competitions[payload.challengeId].accepted_at = timestamp;
        }
        break;

      case 'forfeit':
        if (payload.challengeId && newState.competitions[payload.challengeId]) {
          newState.competitions[payload.challengeId].status = 'forfeited';
          newState.competitions[payload.challengeId].forfeited_by = from;
          newState.competitions[payload.challengeId].completed_at = timestamp;
        }
        break;

      case 'score':
        if (payload.challengeId && newState.competitions[payload.challengeId]) {
          const comp = newState.competitions[payload.challengeId];
          if (!comp.scores) {
            comp.scores = {};
          }
          comp.scores[from] = payload.score;
        }
        break;

      case 'discover':
        if (payload.discovery) {
          const discoveryId = `discovery_${timestamp}_${from}`;
          newState.discoveries[discoveryId] = {
            id: discoveryId,
            discoverer: from,
            type: payload.discovery.type,
            location: payload.discovery.location,
            data: payload.discovery.data || {},
            ts: timestamp
          };
        }
        break;

      case 'anchor_place':
        if (payload.anchor) {
          const anchorId = `anchor_${timestamp}_${from}`;
          newState.anchors[anchorId] = {
            id: anchorId,
            owner: from,
            position: payload.anchor.position,
            zone: payload.anchor.zone || 'default',
            name: payload.anchor.name,
            ts: timestamp
          };
        }
        break;

      case 'inspect':
        // No state change - returns info only
        break;

      case 'intention_set':
        if (newState.players[from] && payload.intention) {
          if (!newState.players[from].intentions) {
            newState.players[from].intentions = [];
          }
          newState.players[from].intentions.push({
            text: payload.intention,
            set_at: timestamp
          });
        }
        break;

      case 'intention_clear':
        if (newState.players[from]) {
          newState.players[from].intentions = [];
        }
        break;

      case 'warp_fork':
        if (newState.players[from] && payload.target_world) {
          newState.players[from].current_world = payload.target_world;
          newState.players[from].home_world = newState.players[from].home_world || 'default';
          if (payload.position) {
            newState.players[from].position = payload.position;
          }
        }
        break;

      case 'return_home':
        if (newState.players[from]) {
          const homeWorld = newState.players[from].home_world || 'default';
          newState.players[from].current_world = homeWorld;
          if (payload.position) {
            newState.players[from].position = payload.position;
          }
        }
        break;

      case 'federation_announce':
        if (payload.federation) {
          newState.federation.federations.push({
            id: `fed_${timestamp}_${from}`,
            announced_by: from,
            name: payload.federation.name,
            endpoint: payload.federation.endpoint,
            ts: timestamp
          });
        }
        break;

      case 'federation_handshake':
        if (payload.federationId) {
          const fed = newState.federation.federations.find(f => f.id === payload.federationId);
          if (fed) {
            fed.handshake_complete = true;
            fed.handshake_at = timestamp;
          }
        }
        break;

      case 'star_register':
        if (!newState.playerStars) newState.playerStars = {};
        if (payload) {
          newState.playerStars[from] = {
            name: payload.name || from,
            x: payload.x || 0,
            y: payload.y || 0,
            z: payload.z || 0,
            color: payload.color || 0xFFDD88,
            ts: timestamp
          };
        }
        break;

      case 'election_start':
        if (!newState.elections) newState.elections = {};
        var electionId = 'election_' + timestamp + '_' + (payload.zone || 'nexus');
        newState.elections[electionId] = {
          id: electionId,
          zone: payload.zone,
          started_by: from,
          candidates: [from],
          votes: {},
          started_at: timestamp,
          ends_at: timestamp + (30 * 24 * 60 * 60 * 1000), // 30-day term
          status: 'active'
        };
        break;

      case 'election_vote':
        if (newState.elections && payload.electionId) {
          var election = newState.elections[payload.electionId];
          if (election && election.status === 'active') {
            election.votes[from] = payload.candidate;
            if (payload.candidate && election.candidates.indexOf(payload.candidate) === -1) {
              election.candidates.push(payload.candidate);
            }
          }
        }
        break;

      case 'election_finalize':
        if (newState.elections && payload.electionId) {
          var elecFinal = newState.elections[payload.electionId];
          if (elecFinal && elecFinal.status === 'active') {
            // Count votes
            var voteCounts = {};
            Object.values(elecFinal.votes).forEach(function(candidate) {
              voteCounts[candidate] = (voteCounts[candidate] || 0) + 1;
            });
            var winner = null;
            var maxVotes = 0;
            Object.keys(voteCounts).forEach(function(c) {
              if (voteCounts[c] > maxVotes) { maxVotes = voteCounts[c]; winner = c; }
            });
            elecFinal.status = 'complete';
            elecFinal.winner = winner;
            elecFinal.completed_at = timestamp;
            // Set steward for the zone
            if (!newState.stewards) newState.stewards = {};
            if (winner) {
              newState.stewards[elecFinal.zone] = {
                playerId: winner,
                zone: elecFinal.zone,
                elected_at: timestamp,
                term_ends: timestamp + (30 * 24 * 60 * 60 * 1000)
              };
            }
          }
        }
        break;

      case 'steward_set_welcome':
        if (!newState.stewards) newState.stewards = {};
        var steward = newState.stewards[payload.zone];
        if (steward && steward.playerId === from) {
          steward.welcomeMessage = payload.message;
        }
        break;

      case 'steward_set_policy':
        if (!newState.stewards) newState.stewards = {};
        var stewardPolicy = newState.stewards[payload.zone];
        if (stewardPolicy && stewardPolicy.playerId === from) {
          stewardPolicy.policy = payload.policy;
        }
        break;

      case 'steward_moderate':
        if (!newState.stewards) newState.stewards = {};
        var stewardMod = newState.stewards[payload.zone];
        if (stewardMod && stewardMod.playerId === from) {
          newState.actions.push({
            id: 'moderate_' + timestamp + '_' + from,
            type: 'moderation',
            steward: from,
            zone: payload.zone,
            target: payload.target,
            action: payload.action,
            reason: payload.reason,
            ts: timestamp
          });
        }
        break;

      case 'sim_crm_action':
        // Route simulation actions to state for peer visibility
        if (!newState.simulations) newState.simulations = {};
        if (!newState.simulations.crm) newState.simulations.crm = { actions: [] };
        newState.simulations.crm.actions.push({
          id: 'sim_' + timestamp + '_' + from,
          from: from,
          action: payload.action,
          data: payload.data || {},
          ts: timestamp
        });
        break;

      case 'propose_amendment':
        // Record a constitutional amendment proposal
        if (!newState.amendments) newState.amendments = [];
        if (payload.title && payload.description && payload.diff_text) {
          var amendId = 'amend_' + timestamp + '_' + from;
          var discussionDays = Math.max(7, parseInt(payload.discussion_period_days || 7, 10));
          var proposedAt = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
          var closesAt = new Date(proposedAt.getTime() + discussionDays * 86400000);
          newState.amendments.push({
            id: amendId,
            title: payload.title,
            description: payload.description,
            diff_text: payload.diff_text,
            proposed_by: from,
            proposed_at: typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString(),
            discussion_period_days: discussionDays,
            voting_closes_at: closesAt.toISOString(),
            status: 'open',
            votes: [],
            result: null
          });
        }
        break;

      case 'vote_amendment':
        // Record a vote on an open amendment
        if (newState.amendments && payload.amendment_id && payload.vote) {
          var voteAmend = null;
          for (var ai = 0; ai < newState.amendments.length; ai++) {
            if (newState.amendments[ai].id === payload.amendment_id) {
              voteAmend = newState.amendments[ai];
              break;
            }
          }
          if (voteAmend && voteAmend.status === 'open') {
            // Deduplicate: one vote per citizen
            var alreadyVoted = false;
            for (var vi = 0; vi < voteAmend.votes.length; vi++) {
              if (voteAmend.votes[vi].from === from) { alreadyVoted = true; break; }
            }
            if (!alreadyVoted && (payload.vote === 'for' || payload.vote === 'against')) {
              var sparkWeight = Math.max(1, (newState.economy && newState.economy.balances && newState.economy.balances[from]) || 1);
              voteAmend.votes.push({
                from: from,
                vote: payload.vote,
                spark_weight: sparkWeight,
                ts: typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString()
              });
            }
          }
        }
        break;

      case 'close_amendment':
        // Record the result of a closed amendment (typically sent by ZION-GOVERNANCE system)
        if (newState.amendments && payload.amendment_id) {
          for (var ci = 0; ci < newState.amendments.length; ci++) {
            if (newState.amendments[ci].id === payload.amendment_id) {
              newState.amendments[ci].status = 'closed';
              newState.amendments[ci].result = payload.result || null;
              if (payload.tally) {
                newState.amendments[ci].tally = payload.tally;
              }
              newState.amendments[ci].closed_at = typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString();
              break;
            }
          }
        }
        break;

      default:
        // Unknown message type - no state change
        break;
    }

    // Record state change
    newState.changes.push({
      type,
      from,
      ts: timestamp
    });

    return newState;
  }

  /**
   * Resolves conflicts between two states using last-writer-wins
   * @param {Object} stateA - First state
   * @param {Object} stateB - Second state
   * @returns {Object} Merged state
   */
  function resolveConflict(stateA, stateB) {
    // Start with a deep clone of stateA
    const merged = JSON.parse(JSON.stringify(stateA));

    // Merge changes arrays and sort by timestamp
    const allChanges = [
      ...(stateA.changes || []),
      ...(stateB.changes || [])
    ].sort((a, b) => a.ts - b.ts);

    // Remove duplicates
    const uniqueChanges = [];
    const seen = new Set();
    for (const change of allChanges) {
      const key = `${change.type}_${change.from}_${change.ts}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueChanges.push(change);
      }
    }

    merged.changes = uniqueChanges;

    // Merge players (last-writer-wins based on last_seen)
    merged.players = { ...stateA.players };
    for (const [playerId, playerB] of Object.entries(stateB.players || {})) {
      const playerA = merged.players[playerId];
      if (!playerA || (playerB.last_seen || 0) > (playerA.last_seen || 0)) {
        merged.players[playerId] = playerB;
      }
    }

    // Merge collections (combine and deduplicate by ID)
    const mergeById = (collectionA, collectionB) => {
      const result = { ...collectionA };
      for (const [id, item] of Object.entries(collectionB || {})) {
        if (!result[id] || (item.ts || 0) > (result[id].ts || 0)) {
          result[id] = item;
        }
      }
      return result;
    };

    merged.gardens = mergeById(stateA.gardens || {}, stateB.gardens || {});
    merged.structures = mergeById(stateA.structures || {}, stateB.structures || {});
    merged.discoveries = mergeById(stateA.discoveries || {}, stateB.discoveries || {});
    merged.anchors = mergeById(stateA.anchors || {}, stateB.anchors || {});
    merged.competitions = mergeById(stateA.competitions || {}, stateB.competitions || {});

    // Merge chat (combine and sort by timestamp)
    merged.chat = [
      ...(stateA.chat || []),
      ...(stateB.chat || [])
    ].sort((a, b) => a.ts - b.ts);

    // Merge actions (combine and deduplicate)
    merged.actions = [
      ...(stateA.actions || []),
      ...(stateB.actions || [])
    ];
    const actionIds = new Set();
    merged.actions = merged.actions.filter(action => {
      if (actionIds.has(action.id)) {
        return false;
      }
      actionIds.add(action.id);
      return true;
    });

    // Merge economy (combine transactions and listings)
    merged.economy = {
      balances: { ...(stateA.economy?.balances || {}), ...(stateB.economy?.balances || {}) },
      transactions: [
        ...(stateA.economy?.transactions || []),
        ...(stateB.economy?.transactions || [])
      ].sort((a, b) => a.ts - b.ts),
      listings: [
        ...(stateA.economy?.listings || []),
        ...(stateB.economy?.listings || [])
      ]
    };

    // Merge federation
    merged.federation = {
      federations: [
        ...(stateA.federation?.federations || []),
        ...(stateB.federation?.federations || [])
      ]
    };

    // World state - use most recent
    const worldATime = stateA.world?.time || 0;
    const worldBTime = stateB.world?.time || 0;
    merged.world = worldBTime > worldATime ? stateB.world : stateA.world;

    return merged;
  }

  // Convenience helpers used by main.js
  function initState() {
    return createWorldState();
  }

  function addPlayer(state, player) {
    if (!state || !player) return;
    state.players[player.id] = {
      id: player.id,
      name: player.name || player.id,
      position: player.position || { x: 0, y: 0, z: 0 },
      zone: player.zone || 'nexus',
      spark: player.spark || 0,
      warmth: player.warmth || 0,
      online: true,
      lastSeen: new Date().toISOString()
    };
  }

  function removePlayer(state, playerId) {
    if (!state || !playerId) return;
    if (state.players[playerId]) {
      state.players[playerId].online = false;
      state.players[playerId].lastSeen = new Date().toISOString();
    }
  }

  function getPlayer(state, playerId) {
    if (!state || !playerId) return null;
    return state.players[playerId] || null;
  }

  function getPlayers(state) {
    if (!state) return [];
    return Object.values(state.players);
  }

  // Export public API
  exports.createWorldState = createWorldState;
  exports.initState = initState;
  exports.addPlayer = addPlayer;
  exports.removePlayer = removePlayer;
  exports.getPlayer = getPlayer;
  exports.getPlayers = getPlayers;
  exports.getLiveState = getLiveState;
  exports.setLiveState = setLiveState;
  exports.flushToLocal = flushToLocal;
  exports.loadFromLocal = loadFromLocal;
  exports.flushToCanonical = flushToCanonical;
  exports.loadFromCanonical = loadFromCanonical;
  exports.applyMessage = applyMessage;
  exports.resolveConflict = resolveConflict;

})(typeof module !== 'undefined' ? module.exports : (window.State = {}));
