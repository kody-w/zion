/**
 * ZION Arena Scheduler
 * Schedules, announces, brackets, and concludes Arena zone events.
 * Manages weekly calendar of tournaments, races, card game championships,
 * dungeon speed runs, and other competitive events.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
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
  // EVENT TYPE DEFINITIONS — 10 arena event types
  // ---------------------------------------------------------------------------

  var EVENT_TYPES = [
    {
      id: 'combat_tournament',
      name: 'Combat Tournament',
      description: 'Single-elimination combat bracket where fighters face off until one champion remains.',
      category: 'combat',
      minPlayers: 4,
      maxPlayers: 16,
      bracketType: 'single_elimination',
      duration: 3600,
      entryFee: 10,
      prizePool: { first: 100, second: 50, third: 25 },
      xpReward: { winner: 50, participant: 10 },
      frequency: 'weekly',
      dayOfWeek: 0
    },
    {
      id: 'speed_dungeon',
      name: 'Speed Dungeon',
      description: 'Race through a procedural dungeon. Fastest clear time wins.',
      category: 'dungeon',
      minPlayers: 2,
      maxPlayers: 8,
      bracketType: 'round_robin',
      duration: 1800,
      entryFee: 15,
      prizePool: { first: 120, second: 60, third: 30 },
      xpReward: { winner: 60, participant: 12 },
      frequency: 'weekly',
      dayOfWeek: 2
    },
    {
      id: 'card_championship',
      name: 'Card Championship',
      description: 'Card game tournament using Swiss pairings for maximum fairness.',
      category: 'cards',
      minPlayers: 4,
      maxPlayers: 16,
      bracketType: 'swiss',
      duration: 4800,
      entryFee: 20,
      prizePool: { first: 150, second: 75, third: 35 },
      xpReward: { winner: 75, participant: 15 },
      frequency: 'weekly',
      dayOfWeek: 4
    },
    {
      id: 'fishing_derby',
      name: 'Fishing Derby',
      description: 'Catch the most or rarest fish within the time limit.',
      category: 'fishing',
      minPlayers: 2,
      maxPlayers: 20,
      bracketType: 'round_robin',
      duration: 900,
      entryFee: 5,
      prizePool: { first: 60, second: 30, third: 15 },
      xpReward: { winner: 30, participant: 5 },
      frequency: 'daily',
      dayOfWeek: null
    },
    {
      id: 'building_contest',
      name: 'Building Contest',
      description: 'Construct the best structure judged by community votes.',
      category: 'creative',
      minPlayers: 3,
      maxPlayers: 12,
      bracketType: 'round_robin',
      duration: 7200,
      entryFee: 25,
      prizePool: { first: 200, second: 100, third: 50 },
      xpReward: { winner: 100, participant: 20 },
      frequency: 'monthly',
      dayOfWeek: null
    },
    {
      id: 'music_battle',
      name: 'Music Battle',
      description: 'Compose and perform original music for audience votes.',
      category: 'creative',
      minPlayers: 2,
      maxPlayers: 8,
      bracketType: 'single_elimination',
      duration: 2400,
      entryFee: 10,
      prizePool: { first: 80, second: 40, third: 20 },
      xpReward: { winner: 40, participant: 8 },
      frequency: 'weekly',
      dayOfWeek: 5
    },
    {
      id: 'cooking_competition',
      name: 'Cooking Competition',
      description: 'Prepare the best meal judged on quality and creativity.',
      category: 'creative',
      minPlayers: 3,
      maxPlayers: 10,
      bracketType: 'round_robin',
      duration: 1800,
      entryFee: 8,
      prizePool: { first: 70, second: 35, third: 18 },
      xpReward: { winner: 35, participant: 7 },
      frequency: 'weekly',
      dayOfWeek: 3
    },
    {
      id: 'trivia_challenge',
      name: 'Trivia Challenge',
      description: 'Test your lore and world knowledge against other citizens.',
      category: 'trivia',
      minPlayers: 2,
      maxPlayers: 16,
      bracketType: 'swiss',
      duration: 1200,
      entryFee: 5,
      prizePool: { first: 50, second: 25, third: 12 },
      xpReward: { winner: 25, participant: 5 },
      frequency: 'daily',
      dayOfWeek: null
    },
    {
      id: 'obstacle_race',
      name: 'Obstacle Race',
      description: 'Speed run through the Arena obstacle course. Fastest time wins.',
      category: 'racing',
      minPlayers: 2,
      maxPlayers: 12,
      bracketType: 'round_robin',
      duration: 600,
      entryFee: 5,
      prizePool: { first: 55, second: 28, third: 14 },
      xpReward: { winner: 28, participant: 6 },
      frequency: 'daily',
      dayOfWeek: null
    },
    {
      id: 'grand_tournament',
      name: 'Grand Tournament',
      description: 'Multi-discipline seasonal championship. Glory awaits the all-around champion.',
      category: 'combat',
      minPlayers: 8,
      maxPlayers: 32,
      bracketType: 'double_elimination',
      duration: 14400,
      entryFee: 50,
      prizePool: { first: 500, second: 250, third: 125 },
      xpReward: { winner: 250, participant: 50 },
      frequency: 'seasonal',
      dayOfWeek: null
    }
  ];

  // ---------------------------------------------------------------------------
  // TICK CONSTANTS
  // ---------------------------------------------------------------------------

  var TICKS_PER_DAY = 1440;          // 1 tick = 1 minute
  var TICKS_PER_WEEK = TICKS_PER_DAY * 7;
  var TICKS_PER_MONTH = TICKS_PER_DAY * 30;
  var TICKS_PER_SEASON = TICKS_PER_DAY * 90;
  var REGISTRATION_WINDOW = 120;     // ticks of registration before event

  // ---------------------------------------------------------------------------
  // STATE INITIALIZER
  // ---------------------------------------------------------------------------

  /**
   * Create a blank scheduler state object.
   * @returns {Object}
   */
  function createSchedulerState() {
    return {
      events: {},          // eventId -> event object
      brackets: {},        // eventId -> bracket state
      playerHistory: {},   // playerId -> history object
      leaderboards: {},    // eventTypeId -> sorted array
      nextEventCounter: 1
    };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  function getEventType(id) {
    for (var i = 0; i < EVENT_TYPES.length; i++) {
      if (EVENT_TYPES[i].id === id) return EVENT_TYPES[i];
    }
    return null;
  }

  function generateEventId(state, typeId) {
    var counter = state.nextEventCounter;
    state.nextEventCounter = counter + 1;
    return typeId + '_' + counter;
  }

  function ensurePlayerHistory(state, playerId) {
    if (!state.playerHistory[playerId]) {
      state.playerHistory[playerId] = {
        playerId: playerId,
        events: [],       // [{eventId, type, placement, prize, xp, tick}]
        wins: 0,
        losses: 0,
        totalPrize: 0,
        totalXp: 0
      };
    }
    return state.playerHistory[playerId];
  }

  function ensureLeaderboard(state, typeId) {
    if (!state.leaderboards[typeId]) {
      state.leaderboards[typeId] = [];
    }
    return state.leaderboards[typeId];
  }

  /**
   * Seeded Fisher-Yates shuffle of an array copy.
   * @param {Array} arr
   * @param {Function} rand - seeded random returning [0,1)
   * @returns {Array} shuffled copy
   */
  function seededShuffle(arr, rand) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  /**
   * Round up to next power of 2 (for bracket padding).
   */
  function nextPow2(n) {
    var p = 1;
    while (p < n) p *= 2;
    return p;
  }

  /**
   * Get player balance from state. Supports both top-level balances map
   * and a nested ledger pattern.
   */
  function getBalance(state, playerId) {
    if (state.ledger && state.ledger.balances) {
      return state.ledger.balances[playerId] || 0;
    }
    if (state.balances) {
      return state.balances[playerId] || 0;
    }
    return 0;
  }

  function setBalance(state, playerId, amount) {
    if (state.ledger && state.ledger.balances) {
      state.ledger.balances[playerId] = amount;
    } else {
      if (!state.balances) state.balances = {};
      state.balances[playerId] = amount;
    }
  }

  function deductFee(state, playerId, amount) {
    var bal = getBalance(state, playerId);
    if (bal < amount) return false;
    setBalance(state, playerId, bal - amount);
    return true;
  }

  function addBalance(state, playerId, amount) {
    var bal = getBalance(state, playerId);
    setBalance(state, playerId, bal + amount);
  }

  // ---------------------------------------------------------------------------
  // SCHEDULE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Schedule a new arena event.
   * @param {Object} state - World / scheduler state (must have scheduler sub-key or be the scheduler state)
   * @param {string} eventTypeId
   * @param {number} startTick
   * @param {number} seed
   * @returns {{success: boolean, event: Object, reason: string}}
   */
  function scheduleEvent(state, eventTypeId, startTick, seed) {
    var sched = state.scheduler || state;
    var typeDef = getEventType(eventTypeId);

    if (!typeDef) {
      return { success: false, reason: 'Unknown event type: ' + eventTypeId };
    }

    if (typeof startTick !== 'number' || startTick < 0) {
      return { success: false, reason: 'Invalid startTick' };
    }

    var eventId = generateEventId(sched, eventTypeId);
    var registrationOpenTick = startTick - REGISTRATION_WINDOW;
    if (registrationOpenTick < 0) registrationOpenTick = 0;

    var event = {
      id: eventId,
      type: eventTypeId,
      name: typeDef.name,
      category: typeDef.category,
      bracketType: typeDef.bracketType,
      minPlayers: typeDef.minPlayers,
      maxPlayers: typeDef.maxPlayers,
      duration: typeDef.duration,
      entryFee: typeDef.entryFee,
      prizePool: { first: typeDef.prizePool.first, second: typeDef.prizePool.second, third: typeDef.prizePool.third },
      xpReward: { winner: typeDef.xpReward.winner, participant: typeDef.xpReward.participant },
      startTick: startTick,
      endTick: startTick + typeDef.duration,
      registrationOpenTick: registrationOpenTick,
      registrationOpen: true,
      status: 'registration',
      participants: [],
      seed: seed || 1,
      createdAt: startTick
    };

    sched.events[eventId] = event;

    return {
      success: true,
      event: {
        id: eventId,
        type: eventTypeId,
        startTick: startTick,
        registrationOpen: true
      }
    };
  }

  /**
   * Return all events within [fromTick, toTick].
   * @param {Object} state
   * @param {number} fromTick
   * @param {number} toTick
   * @returns {Array}
   */
  function getSchedule(state, fromTick, toTick) {
    var sched = state.scheduler || state;
    var results = [];
    for (var id in sched.events) {
      var ev = sched.events[id];
      if (ev.startTick >= fromTick && ev.startTick <= toTick) {
        results.push(ev);
      }
    }
    results.sort(function(a, b) { return a.startTick - b.startTick; });
    return results;
  }

  /**
   * Return next N upcoming events from currentTick.
   * @param {Object} state
   * @param {number} currentTick
   * @param {number} count
   * @returns {Array}
   */
  function getUpcomingEvents(state, currentTick, count) {
    var sched = state.scheduler || state;
    var results = [];
    for (var id in sched.events) {
      var ev = sched.events[id];
      if (ev.startTick > currentTick && ev.status !== 'cancelled' && ev.status !== 'completed') {
        results.push(ev);
      }
    }
    results.sort(function(a, b) { return a.startTick - b.startTick; });
    if (count && count > 0) {
      results = results.slice(0, count);
    }
    return results;
  }

  /**
   * Return currently running events at currentTick.
   * @param {Object} state
   * @param {number} currentTick
   * @returns {Array}
   */
  function getActiveEvents(state, currentTick) {
    var sched = state.scheduler || state;
    var results = [];
    for (var id in sched.events) {
      var ev = sched.events[id];
      if (ev.status === 'in_progress' && ev.startTick <= currentTick && ev.endTick >= currentTick) {
        results.push(ev);
      }
    }
    return results;
  }

  /**
   * Get a single event by ID.
   * @param {Object} state
   * @param {string} eventId
   * @returns {Object|null}
   */
  function getEventById(state, eventId) {
    var sched = state.scheduler || state;
    return sched.events[eventId] || null;
  }

  // ---------------------------------------------------------------------------
  // REGISTRATION
  // ---------------------------------------------------------------------------

  /**
   * Register a player for an event.
   * @param {Object} state - Full world state (must have balances/ledger + scheduler)
   * @param {string} playerId
   * @param {string} eventId
   * @returns {{success: boolean, reason: string}}
   */
  function register(state, playerId, eventId) {
    var sched = state.scheduler || state;
    var ev = sched.events[eventId];

    if (!ev) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (!ev.registrationOpen) {
      return { success: false, reason: 'Registration is closed' };
    }
    if (ev.status === 'cancelled') {
      return { success: false, reason: 'Event has been cancelled' };
    }
    if (ev.status === 'completed') {
      return { success: false, reason: 'Event is already completed' };
    }
    if (ev.status === 'in_progress') {
      return { success: false, reason: 'Event is already in progress' };
    }

    // Check for duplicate registration
    for (var i = 0; i < ev.participants.length; i++) {
      if (ev.participants[i] === playerId) {
        return { success: false, reason: 'Already registered for this event' };
      }
    }

    // Check capacity
    if (ev.participants.length >= ev.maxPlayers) {
      return { success: false, reason: 'Event is full' };
    }

    // Deduct entry fee
    if (ev.entryFee > 0) {
      var deducted = deductFee(state, playerId, ev.entryFee);
      if (!deducted) {
        return { success: false, reason: 'Insufficient Spark. Need ' + ev.entryFee };
      }
    }

    ev.participants.push(playerId);

    return { success: true, reason: 'Registered successfully' };
  }

  /**
   * Remove a player from an event and refund entry fee if before start.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} eventId
   * @returns {{success: boolean, refunded: number, reason: string}}
   */
  function unregister(state, playerId, eventId) {
    var sched = state.scheduler || state;
    var ev = sched.events[eventId];

    if (!ev) {
      return { success: false, refunded: 0, reason: 'Event not found: ' + eventId };
    }

    var idx = ev.participants.indexOf(playerId);
    if (idx === -1) {
      return { success: false, refunded: 0, reason: 'Player not registered for this event' };
    }

    if (ev.status === 'in_progress' || ev.status === 'completed') {
      return { success: false, refunded: 0, reason: 'Cannot unregister after event has started' };
    }

    ev.participants.splice(idx, 1);

    // Refund if before start (registration still open)
    var refunded = 0;
    if (ev.registrationOpen && ev.entryFee > 0) {
      addBalance(state, playerId, ev.entryFee);
      refunded = ev.entryFee;
    }

    return { success: true, refunded: refunded, reason: 'Unregistered successfully' };
  }

  /**
   * Return list of registered players for an event.
   * @param {Object} state
   * @param {string} eventId
   * @returns {Array}
   */
  function getParticipants(state, eventId) {
    var sched = state.scheduler || state;
    var ev = sched.events[eventId];
    if (!ev) return [];
    return ev.participants.slice();
  }

  // ---------------------------------------------------------------------------
  // BRACKET GENERATION
  // ---------------------------------------------------------------------------

  /**
   * Generate single elimination bracket from participants.
   * Pads with 'BYE' to reach next power-of-2 size.
   * @param {Array} participants - Shuffled player IDs
   * @returns {Array} Array of rounds, each round an array of match objects
   */
  function buildSingleElimination(participants, rand) {
    var shuffled = seededShuffle(participants, rand);
    var size = nextPow2(shuffled.length);

    // Pad with BYE slots
    while (shuffled.length < size) {
      shuffled.push('BYE');
    }

    var rounds = [];
    var current = shuffled;
    var roundNum = 0;

    while (current.length > 1) {
      var matches = [];
      for (var i = 0; i < current.length; i += 2) {
        matches.push({
          matchId: 'r' + roundNum + '_m' + (i / 2),
          round: roundNum,
          player1: current[i],
          player2: current[i + 1],
          winnerId: null,
          loserId: null,
          score: null,
          // Auto-advance BYE matches
          bye: (current[i] === 'BYE' || current[i + 1] === 'BYE')
        });
      }

      // Auto-resolve BYE matches
      for (var j = 0; j < matches.length; j++) {
        if (matches[j].bye) {
          if (matches[j].player1 === 'BYE') {
            matches[j].winnerId = matches[j].player2;
            matches[j].loserId = 'BYE';
          } else {
            matches[j].winnerId = matches[j].player1;
            matches[j].loserId = 'BYE';
          }
        }
      }

      rounds.push(matches);
      current = matches.map(function(m) { return m.winnerId; }).filter(function(w) { return w !== null; });
      roundNum++;

      // Safety: if all remaining are BYE winners, we are done
      if (current.length === 1) break;
    }

    return rounds;
  }

  /**
   * Generate round-robin bracket (everyone plays everyone once).
   * @param {Array} participants
   * @returns {Array} Single round containing all matchups
   */
  function buildRoundRobin(participants, rand) {
    var shuffled = seededShuffle(participants, rand);
    var matches = [];
    var matchIdx = 0;
    for (var i = 0; i < shuffled.length; i++) {
      for (var j = i + 1; j < shuffled.length; j++) {
        matches.push({
          matchId: 'rr_m' + matchIdx,
          round: 0,
          player1: shuffled[i],
          player2: shuffled[j],
          winnerId: null,
          loserId: null,
          score: null,
          bye: false
        });
        matchIdx++;
      }
    }
    // Wrap in a single "round"
    return [matches];
  }

  /**
   * Generate Swiss-system bracket (round 1 random, subsequent rounds matched by score).
   * For generation purposes we create round 1 pairings only.
   * @param {Array} participants
   * @returns {Array} Round 1 pairings
   */
  function buildSwiss(participants, rand) {
    var shuffled = seededShuffle(participants, rand);
    var matches = [];
    var matchIdx = 0;

    // Pair up players (odd one out gets a BYE)
    for (var i = 0; i < shuffled.length - 1; i += 2) {
      matches.push({
        matchId: 'sw_r0_m' + matchIdx,
        round: 0,
        player1: shuffled[i],
        player2: shuffled[i + 1],
        winnerId: null,
        loserId: null,
        score: null,
        bye: false
      });
      matchIdx++;
    }

    if (shuffled.length % 2 !== 0) {
      // Last player gets a bye
      var byePlayer = shuffled[shuffled.length - 1];
      matches.push({
        matchId: 'sw_r0_m' + matchIdx,
        round: 0,
        player1: byePlayer,
        player2: 'BYE',
        winnerId: byePlayer,
        loserId: 'BYE',
        score: null,
        bye: true
      });
    }

    return [matches];
  }

  /**
   * Generate double elimination bracket (winners + losers brackets).
   * Creates winners-bracket single-elim + a pre-seeded losers round.
   * The losers bracket is seeded with placeholder slots based on the number
   * of round-0 matches — actual players are assigned as results come in.
   * @param {Array} participants
   * @returns {Array} Rounds (tagged with bracket: 'winners'|'losers')
   */
  function buildDoubleElimination(participants, rand) {
    // Build the winners bracket via single elimination
    var winnersRounds = buildSingleElimination(participants, rand);

    // Tag each match as winners bracket
    for (var r = 0; r < winnersRounds.length; r++) {
      for (var m = 0; m < winnersRounds[r].length; m++) {
        winnersRounds[r][m].bracket = 'winners';
      }
    }

    // Create a losers bracket first round placeholder.
    // Number of losers = number of round-0 matches (one loser per match, excluding BYEs).
    var losersRound = [];
    if (winnersRounds.length > 0) {
      var r0Matches = winnersRounds[0];
      // Count non-BYE slots that will produce real losers
      var loserSlots = 0;
      for (var i = 0; i < r0Matches.length; i++) {
        if (!r0Matches[i].bye) loserSlots++;
      }
      // Pair the loser slots into LB matches
      for (var k = 0; k < loserSlots - 1; k += 2) {
        losersRound.push({
          matchId: 'lb_r0_m' + Math.floor(k / 2),
          round: 0,
          player1: 'TBD',    // filled after winners round 0 resolves
          player2: 'TBD',
          winnerId: null,
          loserId: null,
          score: null,
          bye: false,
          bracket: 'losers'
        });
      }
      // Odd slot gets a BYE
      if (loserSlots % 2 !== 0 && loserSlots >= 1) {
        losersRound.push({
          matchId: 'lb_r0_m' + Math.floor(loserSlots / 2),
          round: 0,
          player1: 'TBD',
          player2: 'BYE',
          winnerId: null,
          loserId: null,
          score: null,
          bye: true,
          bracket: 'losers'
        });
      }
    }

    var allRounds = winnersRounds.slice();
    if (losersRound.length > 0) {
      allRounds.push(losersRound);
    }

    return allRounds;
  }

  /**
   * Generate a bracket for an event.
   * @param {Object} state
   * @param {string} eventId
   * @param {number} seed
   * @returns {{success: boolean, bracket: Array, reason: string}}
   */
  function generateBracket(state, eventId, seed) {
    var sched = state.scheduler || state;
    var ev = sched.events[eventId];

    if (!ev) {
      return { success: false, bracket: null, reason: 'Event not found: ' + eventId };
    }

    if (ev.participants.length < ev.minPlayers) {
      return {
        success: false,
        bracket: null,
        reason: 'Not enough participants. Need at least ' + ev.minPlayers + ', have ' + ev.participants.length
      };
    }

    var actualSeed = seed || ev.seed || 1;
    var rand = mulberry32(actualSeed);
    var bracket;

    switch (ev.bracketType) {
      case 'single_elimination':
        bracket = buildSingleElimination(ev.participants, rand);
        break;
      case 'double_elimination':
        bracket = buildDoubleElimination(ev.participants, rand);
        break;
      case 'round_robin':
        bracket = buildRoundRobin(ev.participants, rand);
        break;
      case 'swiss':
        bracket = buildSwiss(ev.participants, rand);
        break;
      default:
        bracket = buildSingleElimination(ev.participants, rand);
    }

    ev.status = 'in_progress';
    ev.registrationOpen = false;

    // Store bracket state
    sched.brackets[eventId] = {
      eventId: eventId,
      type: ev.type,
      bracketType: ev.bracketType,
      status: 'in_progress',
      participants: ev.participants.slice(),
      bracket: bracket,
      currentRound: 0,
      scores: {},          // playerId -> {wins, losses, points}
      results: { first: null, second: null, third: null },
      startTick: ev.startTick,
      endTick: ev.endTick,
      prizeDistributed: false
    };

    // Initialize score tracking
    for (var i = 0; i < ev.participants.length; i++) {
      sched.brackets[eventId].scores[ev.participants[i]] = { wins: 0, losses: 0, points: 0 };
    }

    return { success: true, bracket: bracket, reason: 'Bracket generated' };
  }

  // ---------------------------------------------------------------------------
  // ROUND MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Return matchups for a specific round.
   * @param {Object} state
   * @param {string} eventId
   * @param {number} round
   * @returns {Array}
   */
  function getMatchups(state, eventId, round) {
    var sched = state.scheduler || state;
    var bs = sched.brackets[eventId];
    if (!bs) return [];
    if (round < 0 || round >= bs.bracket.length) return [];
    return bs.bracket[round].slice();
  }

  /**
   * Return current round number and matchups.
   * @param {Object} state
   * @param {string} eventId
   * @returns {{round: number, matchups: Array}}
   */
  function getCurrentRound(state, eventId) {
    var sched = state.scheduler || state;
    var bs = sched.brackets[eventId];
    if (!bs) return { round: -1, matchups: [] };
    var currentRound = bs.currentRound || 0;
    return {
      round: currentRound,
      matchups: getMatchups(state, eventId, currentRound)
    };
  }

  /**
   * Process match results and advance winners to next round (single_elimination).
   * @param {Object} state
   * @param {string} eventId
   * @param {Array} matchResults - [{matchId, winnerId, loserId, score}]
   * @returns {{success: boolean, bracket: Array, reason: string}}
   */
  function advanceRound(state, eventId, matchResults) {
    var sched = state.scheduler || state;
    var bs = sched.brackets[eventId];

    if (!bs) {
      return { success: false, bracket: null, reason: 'No bracket found for event: ' + eventId };
    }

    if (bs.status === 'completed') {
      return { success: false, bracket: bs.bracket, reason: 'Event already completed' };
    }

    var currentRoundIdx = bs.currentRound || 0;
    if (currentRoundIdx >= bs.bracket.length) {
      return { success: false, bracket: bs.bracket, reason: 'No more rounds to advance' };
    }

    var currentRoundMatches = bs.bracket[currentRoundIdx];

    // Apply results
    for (var i = 0; i < matchResults.length; i++) {
      var res = matchResults[i];
      for (var j = 0; j < currentRoundMatches.length; j++) {
        if (currentRoundMatches[j].matchId === res.matchId) {
          currentRoundMatches[j].winnerId = res.winnerId;
          currentRoundMatches[j].loserId = res.loserId;
          currentRoundMatches[j].score = res.score || null;
          break;
        }
      }
    }

    // Update scores
    for (var k = 0; k < currentRoundMatches.length; k++) {
      var match = currentRoundMatches[k];
      if (match.winnerId && match.winnerId !== 'BYE' && bs.scores[match.winnerId]) {
        bs.scores[match.winnerId].wins += 1;
        bs.scores[match.winnerId].points += 3;
      }
      if (match.loserId && match.loserId !== 'BYE' && bs.scores[match.loserId]) {
        bs.scores[match.loserId].losses += 1;
      }
    }

    // Check if all matches in current round are resolved
    var allResolved = true;
    for (var m = 0; m < currentRoundMatches.length; m++) {
      if (!currentRoundMatches[m].bye && !currentRoundMatches[m].winnerId) {
        allResolved = false;
        break;
      }
    }

    if (!allResolved) {
      return { success: true, bracket: bs.bracket, reason: 'Round partially updated, awaiting more results' };
    }

    // For single or double elimination, build next round dynamically from winners
    if (bs.bracketType === 'single_elimination' || bs.bracketType === 'double_elimination') {
      // Collect all non-BYE winners from the current round
      var winners = [];
      for (var n = 0; n < currentRoundMatches.length; n++) {
        var wid = currentRoundMatches[n].winnerId;
        if (wid && wid !== 'BYE') {
          winners.push(wid);
        }
      }

      // If there are 2+ winners, build the next round
      if (winners.length > 1) {
        var nextRoundNum = currentRoundIdx + 1;
        var nextMatches = [];
        for (var p = 0; p < winners.length - 1; p += 2) {
          nextMatches.push({
            matchId: 'r' + nextRoundNum + '_m' + Math.floor(p / 2),
            round: nextRoundNum,
            player1: winners[p],
            player2: winners[p + 1],
            winnerId: null,
            loserId: null,
            score: null,
            bye: false,
            bracket: (currentRoundMatches[0] && currentRoundMatches[0].bracket) || 'winners'
          });
        }
        // Replace the placeholder round if it exists or push new round
        if (nextRoundNum < bs.bracket.length) {
          bs.bracket[nextRoundNum] = nextMatches;
        } else {
          bs.bracket.push(nextMatches);
        }
      }
    }

    bs.currentRound = currentRoundIdx + 1;

    return { success: true, bracket: bs.bracket, reason: 'Round advanced' };
  }

  // ---------------------------------------------------------------------------
  // EVENT COMPLETION
  // ---------------------------------------------------------------------------

  /**
   * Finalize event, determine winners, distribute prizes.
   * @param {Object} state
   * @param {string} eventId
   * @returns {{success: boolean, results: Object, prizes: Object, reason: string}}
   */
  function completeEvent(state, eventId) {
    var sched = state.scheduler || state;
    var ev = sched.events[eventId];
    var bs = sched.brackets[eventId];

    if (!ev) {
      return { success: false, results: null, prizes: null, reason: 'Event not found: ' + eventId };
    }

    if (ev.status === 'completed') {
      return { success: false, results: bs ? bs.results : null, prizes: null, reason: 'Event already completed' };
    }

    if (ev.status === 'cancelled') {
      return { success: false, results: null, prizes: null, reason: 'Event was cancelled' };
    }

    var first = null, second = null, third = null;

    if (bs) {
      // Determine placement from bracket results
      var bracketType = bs.bracketType;

      if (bracketType === 'single_elimination' || bracketType === 'double_elimination') {
        // Last round winner is champion; finalist (last loser) is second
        var lastRound = bs.bracket[bs.bracket.length - 1] || [];
        var winnersLastRound = lastRound.filter(function(m) { return !m.bracket || m.bracket === 'winners'; });

        if (winnersLastRound.length > 0) {
          var finalMatch = winnersLastRound[winnersLastRound.length - 1];
          first = finalMatch.winnerId;
          second = finalMatch.loserId !== 'BYE' ? finalMatch.loserId : null;
        }

        // Third place: last loser from the penultimate round (semi-final loser with best run)
        if (bs.bracket.length >= 2) {
          var semiRound = bs.bracket[bs.bracket.length - 2] || [];
          var semiLosers = [];
          for (var i = 0; i < semiRound.length; i++) {
            if (semiRound[i].loserId && semiRound[i].loserId !== 'BYE') {
              semiLosers.push(semiRound[i].loserId);
            }
          }
          if (semiLosers.length > 0) {
            third = semiLosers[0];
          }
        }
      } else if (bracketType === 'round_robin' || bracketType === 'swiss') {
        // Rank by points/wins
        var scored = [];
        for (var pid in bs.scores) {
          scored.push({ playerId: pid, points: bs.scores[pid].points, wins: bs.scores[pid].wins });
        }
        scored.sort(function(a, b) {
          if (b.points !== a.points) return b.points - a.points;
          return b.wins - a.wins;
        });

        first = scored.length > 0 ? scored[0].playerId : null;
        second = scored.length > 1 ? scored[1].playerId : null;
        third = scored.length > 2 ? scored[2].playerId : null;
      }

      bs.results = { first: first, second: second, third: third };
      bs.status = 'completed';
    }

    // Distribute prizes
    var prizes = {};
    var prizePool = ev.prizePool;

    if (first) {
      addBalance(state, first, prizePool.first);
      prizes[first] = { amount: prizePool.first, placement: 1 };
    }
    if (second) {
      addBalance(state, second, prizePool.second);
      prizes[second] = { amount: prizePool.second, placement: 2 };
    }
    if (third) {
      addBalance(state, third, prizePool.third);
      prizes[third] = { amount: prizePool.third, placement: 3 };
    }

    // XP rewards and history for all participants
    var xpReward = ev.xpReward;
    for (var p = 0; p < ev.participants.length; p++) {
      var participant = ev.participants[p];
      var history = ensurePlayerHistory(state.scheduler || state, participant);
      var placement = null;
      if (participant === first) placement = 1;
      else if (participant === second) placement = 2;
      else if (participant === third) placement = 3;

      var xp = placement === 1 ? xpReward.winner : xpReward.participant;
      var prize = prizes[participant] ? prizes[participant].amount : 0;

      history.events.push({
        eventId: eventId,
        type: ev.type,
        placement: placement,
        prize: prize,
        xp: xp,
        tick: ev.endTick
      });
      if (placement === 1) history.wins += 1;
      else if (placement !== null) history.losses += 1;
      history.totalPrize += prize;
      history.totalXp += xp;
    }

    // Update leaderboard
    if (first) {
      _updateLeaderboard(sched, ev.type, first, prizePool.first, 1);
    }
    if (second) {
      _updateLeaderboard(sched, ev.type, second, prizePool.second, 2);
    }
    if (third) {
      _updateLeaderboard(sched, ev.type, third, prizePool.third, 3);
    }

    ev.status = 'completed';
    if (bs) bs.prizeDistributed = true;

    return {
      success: true,
      results: { first: first, second: second, third: third },
      prizes: prizes,
      reason: 'Event completed'
    };
  }

  function _updateLeaderboard(sched, typeId, playerId, prize, placement) {
    var lb = ensureLeaderboard(sched, typeId);

    // Find existing entry
    var entry = null;
    for (var i = 0; i < lb.length; i++) {
      if (lb[i].playerId === playerId) {
        entry = lb[i];
        break;
      }
    }

    if (!entry) {
      entry = {
        playerId: playerId,
        wins: 0,
        top3: 0,
        totalPrize: 0,
        eventCount: 0
      };
      lb.push(entry);
    }

    if (placement === 1) entry.wins += 1;
    if (placement <= 3) entry.top3 += 1;
    entry.totalPrize += prize;
    entry.eventCount += 1;

    // Sort by wins desc, then prize desc
    lb.sort(function(a, b) {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalPrize - a.totalPrize;
    });
  }

  /**
   * Cancel an event and refund all entry fees.
   * @param {Object} state
   * @param {string} eventId
   * @returns {{success: boolean, refunds: Object, reason: string}}
   */
  function cancelEvent(state, eventId) {
    var sched = state.scheduler || state;
    var ev = sched.events[eventId];

    if (!ev) {
      return { success: false, refunds: {}, reason: 'Event not found: ' + eventId };
    }

    if (ev.status === 'completed') {
      return { success: false, refunds: {}, reason: 'Cannot cancel a completed event' };
    }

    var refunds = {};

    // Refund all participants
    if (ev.entryFee > 0) {
      for (var i = 0; i < ev.participants.length; i++) {
        var pid = ev.participants[i];
        addBalance(state, pid, ev.entryFee);
        refunds[pid] = ev.entryFee;
      }
    }

    ev.status = 'cancelled';
    ev.registrationOpen = false;

    if (sched.brackets[eventId]) {
      sched.brackets[eventId].status = 'cancelled';
    }

    return { success: true, refunds: refunds, reason: 'Event cancelled and fees refunded' };
  }

  /**
   * Return final results for a completed event.
   * @param {Object} state
   * @param {string} eventId
   * @returns {Object|null}
   */
  function getResults(state, eventId) {
    var sched = state.scheduler || state;
    var bs = sched.brackets[eventId];
    if (!bs) return null;
    return bs.results;
  }

  // ---------------------------------------------------------------------------
  // HISTORY & LEADERBOARD
  // ---------------------------------------------------------------------------

  /**
   * Return player's arena event history.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object}
   */
  function getPlayerHistory(state, playerId) {
    var sched = state.scheduler || state;
    return sched.playerHistory[playerId] || {
      playerId: playerId,
      events: [],
      wins: 0,
      losses: 0,
      totalPrize: 0,
      totalXp: 0
    };
  }

  /**
   * Return top performers for an event type.
   * @param {Object} state
   * @param {string} eventTypeId
   * @param {number} count
   * @returns {Array}
   */
  function getLeaderboard(state, eventTypeId, count) {
    var sched = state.scheduler || state;
    var lb = sched.leaderboards[eventTypeId] || [];
    if (count && count > 0) {
      return lb.slice(0, count);
    }
    return lb.slice();
  }

  // ---------------------------------------------------------------------------
  // WEEKLY SCHEDULE GENERATION
  // ---------------------------------------------------------------------------

  /**
   * Auto-generate a full week of events based on frequencies.
   * @param {Object} state
   * @param {number} startTick - Start of the week (tick 0 of week)
   * @param {number} seed
   * @returns {{success: boolean, events: Array, count: number}}
   */
  function generateWeeklySchedule(state, startTick, seed) {
    var rand = mulberry32(seed || 42);
    var scheduledEvents = [];

    for (var t = 0; t < EVENT_TYPES.length; t++) {
      var typeDef = EVENT_TYPES[t];

      if (typeDef.frequency === 'daily') {
        // One event per day of the week
        for (var day = 0; day < 7; day++) {
          // Stagger daily events throughout the day using seeded offset
          var offset = Math.floor(rand() * (TICKS_PER_DAY - typeDef.duration));
          var tick = startTick + day * TICKS_PER_DAY + offset;
          var result = scheduleEvent(state, typeDef.id, tick, Math.floor(rand() * 99999));
          if (result.success) scheduledEvents.push(result.event);
        }
      } else if (typeDef.frequency === 'weekly') {
        // One event on its designated day of week
        var weekDay = typeDef.dayOfWeek !== null ? typeDef.dayOfWeek : Math.floor(rand() * 7);
        var weekOffset = Math.floor(rand() * (TICKS_PER_DAY / 2));
        var weekTick = startTick + weekDay * TICKS_PER_DAY + TICKS_PER_DAY / 2 + weekOffset;
        var weekResult = scheduleEvent(state, typeDef.id, weekTick, Math.floor(rand() * 99999));
        if (weekResult.success) scheduledEvents.push(weekResult.event);
      }
      // monthly and seasonal are not included in a single weekly schedule pass
    }

    return { success: true, events: scheduledEvents, count: scheduledEvents.length };
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Return all event type definitions.
   * @returns {Array}
   */
  function getEventTypes() {
    return EVENT_TYPES.slice();
  }

  exports.createSchedulerState = createSchedulerState;
  exports.getEventTypes = getEventTypes;
  exports.getEventType = getEventType;

  exports.scheduleEvent = scheduleEvent;
  exports.getSchedule = getSchedule;
  exports.getUpcomingEvents = getUpcomingEvents;
  exports.getActiveEvents = getActiveEvents;
  exports.getEventById = getEventById;

  exports.register = register;
  exports.unregister = unregister;
  exports.getParticipants = getParticipants;

  exports.generateBracket = generateBracket;
  exports.advanceRound = advanceRound;
  exports.getMatchups = getMatchups;
  exports.getCurrentRound = getCurrentRound;

  exports.completeEvent = completeEvent;
  exports.cancelEvent = cancelEvent;
  exports.getResults = getResults;

  exports.getPlayerHistory = getPlayerHistory;
  exports.getLeaderboard = getLeaderboard;

  exports.generateWeeklySchedule = generateWeeklySchedule;

})(typeof module !== 'undefined' ? module.exports : (window.ArenaScheduler = {}));
