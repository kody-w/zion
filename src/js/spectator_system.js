// spectator_system.js
/**
 * ZION Spectator System
 * Watch arena matches, card tournaments, performances, festivals, raids, and dungeon runs.
 * Spectators earn Spark rewards, crowd-react, bookmark highlights, and unlock badges.
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
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var REWARD_TICKS_PER_SPARK = 50;   // 1 Spark every 50 ticks watched
  var MAX_HIGHLIGHTS_PER_EVENT = 50;
  var MAX_SPECTATORS_PER_EVENT = 500;

  // ---------------------------------------------------------------------------
  // EVENT TYPES — 6 watchable event types
  // ---------------------------------------------------------------------------

  var EVENT_TYPES = [
    {
      id: 'arena_match',
      name: 'Arena Match',
      description: 'Live PvP combat in the Arena zone. Watch fighters duel for glory and Spark.',
      maxSpectators: 200,
      minDuration: 10,
      zone: 'arena'
    },
    {
      id: 'card_tournament',
      name: 'Card Tournament',
      description: 'High-stakes card game championship with Swiss or bracket pairings.',
      maxSpectators: 150,
      minDuration: 20,
      zone: 'agora'
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'Live music, storytelling, or art showcase in The Studio or Gardens.',
      maxSpectators: 300,
      minDuration: 5,
      zone: 'studio'
    },
    {
      id: 'festival',
      name: 'Festival',
      description: 'Community celebration event spanning multiple zones with games and prizes.',
      maxSpectators: 500,
      minDuration: 30,
      zone: 'commons'
    },
    {
      id: 'raid',
      name: 'Raid',
      description: 'Watch a brave party tackle a multi-boss raid dungeon in real time.',
      maxSpectators: 100,
      minDuration: 40,
      zone: 'wilds'
    },
    {
      id: 'dungeon_run',
      name: 'Dungeon Run',
      description: 'Follow adventurers speed-running or exploring procedurally generated dungeons.',
      maxSpectators: 100,
      minDuration: 15,
      zone: 'arena'
    }
  ];

  // ---------------------------------------------------------------------------
  // CAMERA MODES — 4 spectator camera perspectives
  // ---------------------------------------------------------------------------

  var CAMERA_MODES = [
    {
      id: 'follow_player',
      name: 'Follow Player',
      description: 'Camera tracks a specific participant, staying close behind them.',
      available: ['arena_match', 'card_tournament', 'performance', 'festival', 'raid', 'dungeon_run']
    },
    {
      id: 'free_roam',
      name: 'Free Roam',
      description: 'Spectator moves their own camera freely around the event space.',
      available: ['festival', 'performance', 'raid', 'dungeon_run']
    },
    {
      id: 'overhead',
      name: 'Overhead',
      description: 'Bird\'s-eye top-down view of the entire event area.',
      available: ['arena_match', 'festival', 'raid', 'dungeon_run']
    },
    {
      id: 'cinematic',
      name: 'Cinematic',
      description: 'Automated sweeping camera cuts selected for dramatic effect.',
      available: ['arena_match', 'card_tournament', 'performance', 'festival', 'raid', 'dungeon_run']
    }
  ];

  // ---------------------------------------------------------------------------
  // CROWD REACTIONS — types with cooldowns (in ticks)
  // ---------------------------------------------------------------------------

  var CROWD_REACTIONS = [
    { id: 'cheer',    name: 'Cheer',    emoji: '🎉', cooldown: 5  },
    { id: 'gasp',     name: 'Gasp',     emoji: '😱', cooldown: 3  },
    { id: 'applause', name: 'Applause', emoji: '👏', cooldown: 10 },
    { id: 'boo',      name: 'Boo',      emoji: '👎', cooldown: 8  }
  ];

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  function getEventTypeDef(typeId) {
    for (var i = 0; i < EVENT_TYPES.length; i++) {
      if (EVENT_TYPES[i].id === typeId) return EVENT_TYPES[i];
    }
    return null;
  }

  function getCameraModeDef(modeId) {
    for (var i = 0; i < CAMERA_MODES.length; i++) {
      if (CAMERA_MODES[i].id === modeId) return CAMERA_MODES[i];
    }
    return null;
  }

  function getReactionDef(reactionId) {
    for (var i = 0; i < CROWD_REACTIONS.length; i++) {
      if (CROWD_REACTIONS[i].id === reactionId) return CROWD_REACTIONS[i];
    }
    return null;
  }

  function generateEventId(seed, counter) {
    var rng = mulberry32(seed ^ (counter * 0x9e3779b9));
    return 'evt_' + Math.floor(rng() * 0xFFFFFF).toString(16).padStart(6, '0') + '_' + counter;
  }

  function generateHighlightId(seed, counter) {
    var rng = mulberry32(seed ^ (counter * 0x45678901));
    return 'hl_' + Math.floor(rng() * 0xFFFFFF).toString(16).padStart(6, '0') + '_' + counter;
  }

  // Calculate Spark reward for watch time
  function calcSparkReward(watchTicks) {
    return Math.floor(watchTicks / REWARD_TICKS_PER_SPARK);
  }

  // Default camera mode for an event type
  function defaultCameraMode(eventTypeId) {
    return 'follow_player';
  }

  // ---------------------------------------------------------------------------
  // STATE FACTORY
  // ---------------------------------------------------------------------------

  function createState() {
    return {
      events: {},          // eventId -> event object
      spectators: {},      // playerId -> spectator session map { eventId -> session }
      highlights: [],      // global array of all highlights (also mirrored on events)
      rewardLog: [],       // { playerId, eventId, ticks, spark, tick }
      spectatorLog: [],    // { playerId, eventId, action, tick }
      _counter: 1          // internal ID counter
    };
  }

  // ---------------------------------------------------------------------------
  // registerEvent
  // ---------------------------------------------------------------------------

  function registerEvent(state, eventId, eventType, hostId, zone, currentTick) {
    if (!eventId || typeof eventId !== 'string') {
      return { success: false, reason: 'Invalid eventId' };
    }
    if (state.events[eventId]) {
      return { success: false, reason: 'Event already registered: ' + eventId };
    }
    var typeDef = getEventTypeDef(eventType);
    if (!typeDef) {
      return { success: false, reason: 'Unknown event type: ' + eventType };
    }
    if (!hostId || typeof hostId !== 'string') {
      return { success: false, reason: 'Invalid hostId' };
    }

    var event = {
      id: eventId,
      type: eventType,
      typeDef: typeDef,
      hostId: hostId,
      zone: zone || typeDef.zone,
      status: 'broadcasting',      // broadcasting | ended
      startTick: currentTick,
      endTick: null,
      spectatorIds: [],            // current live spectators
      peakSpectators: 0,
      totalWatchTicks: 0,          // sum of all watch times
      highlights: [],              // { id, playerId, description, tick }
      reactionCounts: {
        cheer: 0,
        gasp: 0,
        applause: 0,
        boo: 0
      },
      watchHistory: []             // { playerId, joinTick, leaveTick, watchTicks }
    };

    state.events[eventId] = event;
    state._counter = (state._counter || 1) + 1;

    return { success: true, event: event };
  }

  // ---------------------------------------------------------------------------
  // endEvent
  // ---------------------------------------------------------------------------

  function endEvent(state, eventId, currentTick) {
    var event = state.events[eventId];
    if (!event) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (event.status === 'ended') {
      return { success: false, reason: 'Event already ended: ' + eventId };
    }

    // Force-leave any still-watching spectators
    var spectatorIds = event.spectatorIds.slice();
    for (var i = 0; i < spectatorIds.length; i++) {
      leaveSpectator(state, spectatorIds[i], eventId, currentTick);
    }

    event.status = 'ended';
    event.endTick = currentTick;

    return {
      success: true,
      peakSpectators: event.peakSpectators,
      totalWatchTime: event.totalWatchTicks
    };
  }

  // ---------------------------------------------------------------------------
  // joinSpectator
  // ---------------------------------------------------------------------------

  function joinSpectator(state, playerId, eventId, currentTick) {
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, reason: 'Invalid playerId' };
    }
    var event = state.events[eventId];
    if (!event) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (event.status === 'ended') {
      return { success: false, reason: 'Event has ended' };
    }

    // Check if already watching
    if (!state.spectators[playerId]) {
      state.spectators[playerId] = {};
    }
    if (state.spectators[playerId][eventId]) {
      return { success: false, reason: 'Already watching event: ' + eventId };
    }

    // Check capacity
    var typeDef = event.typeDef;
    if (event.spectatorIds.length >= typeDef.maxSpectators) {
      return { success: false, reason: 'Event at maximum spectator capacity' };
    }

    // Create session
    var session = {
      playerId: playerId,
      eventId: eventId,
      joinTick: currentTick,
      cameraMode: defaultCameraMode(event.type),
      reactionCooldowns: {},   // reactionId -> lastUsedTick
      active: true
    };

    state.spectators[playerId][eventId] = session;
    event.spectatorIds.push(playerId);

    // Update peak
    if (event.spectatorIds.length > event.peakSpectators) {
      event.peakSpectators = event.spectatorIds.length;
    }

    // Log
    state.spectatorLog.push({
      playerId: playerId,
      eventId: eventId,
      action: 'join',
      tick: currentTick
    });

    return { success: true, cameraMode: session.cameraMode };
  }

  // ---------------------------------------------------------------------------
  // leaveSpectator
  // ---------------------------------------------------------------------------

  function leaveSpectator(state, playerId, eventId, currentTick) {
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, reason: 'Invalid playerId' };
    }
    var event = state.events[eventId];
    if (!event) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }

    if (!state.spectators[playerId] || !state.spectators[playerId][eventId]) {
      return { success: false, reason: 'Not watching event: ' + eventId };
    }

    var session = state.spectators[playerId][eventId];
    if (!session.active) {
      return { success: false, reason: 'Session already closed' };
    }

    var watchTicks = Math.max(0, currentTick - session.joinTick);
    var spark = calcSparkReward(watchTicks);

    // Record in watch history
    event.watchHistory.push({
      playerId: playerId,
      joinTick: session.joinTick,
      leaveTick: currentTick,
      watchTicks: watchTicks
    });
    event.totalWatchTicks += watchTicks;

    // Remove from active spectators
    var idx = event.spectatorIds.indexOf(playerId);
    if (idx !== -1) event.spectatorIds.splice(idx, 1);

    session.active = false;
    delete state.spectators[playerId][eventId];

    // Log reward
    if (spark > 0) {
      state.rewardLog.push({
        playerId: playerId,
        eventId: eventId,
        ticks: watchTicks,
        spark: spark,
        tick: currentTick
      });
    }

    // Log leave
    state.spectatorLog.push({
      playerId: playerId,
      eventId: eventId,
      action: 'leave',
      tick: currentTick
    });

    return { success: true, watchTime: watchTicks, reward: spark };
  }

  // ---------------------------------------------------------------------------
  // setCameraMode
  // ---------------------------------------------------------------------------

  function setCameraMode(state, playerId, eventId, mode) {
    var modeDef = getCameraModeDef(mode);
    if (!modeDef) {
      return { success: false, reason: 'Unknown camera mode: ' + mode };
    }
    var event = state.events[eventId];
    if (!event) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }

    if (!state.spectators[playerId] || !state.spectators[playerId][eventId]) {
      return { success: false, reason: 'Not watching event: ' + eventId };
    }

    var session = state.spectators[playerId][eventId];
    if (!session.active) {
      return { success: false, reason: 'Session is not active' };
    }

    // Check camera is available for this event type
    if (modeDef.available.indexOf(event.type) === -1) {
      return { success: false, reason: 'Camera mode not available for event type: ' + event.type };
    }

    session.cameraMode = mode;
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // sendReaction
  // ---------------------------------------------------------------------------

  function sendReaction(state, playerId, eventId, reactionType, currentTick) {
    var reactionDef = getReactionDef(reactionType);
    if (!reactionDef) {
      return { success: false, reason: 'Unknown reaction type: ' + reactionType };
    }
    var event = state.events[eventId];
    if (!event) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (event.status === 'ended') {
      return { success: false, reason: 'Event has ended' };
    }

    if (!state.spectators[playerId] || !state.spectators[playerId][eventId]) {
      return { success: false, reason: 'Not watching event: ' + eventId };
    }

    var session = state.spectators[playerId][eventId];
    if (!session.active) {
      return { success: false, reason: 'Session is not active' };
    }

    // Check cooldown
    var lastUsed = session.reactionCooldowns[reactionType];
    if (lastUsed !== undefined && currentTick - lastUsed < reactionDef.cooldown) {
      var remaining = reactionDef.cooldown - (currentTick - lastUsed);
      return { success: false, reason: 'Reaction on cooldown for ' + remaining + ' more ticks' };
    }

    // Apply reaction
    session.reactionCooldowns[reactionType] = currentTick;
    event.reactionCounts[reactionType] = (event.reactionCounts[reactionType] || 0) + 1;

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // addHighlight
  // ---------------------------------------------------------------------------

  function addHighlight(state, playerId, eventId, description, currentTick) {
    var event = state.events[eventId];
    if (!event) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (event.status === 'ended') {
      return { success: false, reason: 'Event has ended' };
    }

    if (!state.spectators[playerId] || !state.spectators[playerId][eventId]) {
      return { success: false, reason: 'Not watching event: ' + eventId };
    }

    var session = state.spectators[playerId][eventId];
    if (!session.active) {
      return { success: false, reason: 'Session is not active' };
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return { success: false, reason: 'Description is required' };
    }

    if (event.highlights.length >= MAX_HIGHLIGHTS_PER_EVENT) {
      return { success: false, reason: 'Max highlights reached for this event' };
    }

    var highlightId = generateHighlightId(currentTick, state._counter);
    state._counter = (state._counter || 1) + 1;

    var highlight = {
      id: highlightId,
      eventId: eventId,
      playerId: playerId,
      description: description.trim(),
      tick: currentTick
    };

    event.highlights.push(highlight);
    state.highlights.push(highlight);

    return { success: true, highlight: highlight };
  }

  // ---------------------------------------------------------------------------
  // QUERY FUNCTIONS
  // ---------------------------------------------------------------------------

  function getEvent(state, eventId) {
    var event = state.events[eventId];
    if (!event) return null;
    return {
      id: event.id,
      type: event.type,
      hostId: event.hostId,
      zone: event.zone,
      status: event.status,
      startTick: event.startTick,
      endTick: event.endTick,
      spectatorCount: event.spectatorIds.length,
      peakSpectators: event.peakSpectators,
      totalWatchTicks: event.totalWatchTicks,
      reactionCounts: event.reactionCounts,
      highlights: event.highlights.slice()
    };
  }

  function getActiveEvents(state) {
    var result = [];
    var keys = Object.keys(state.events);
    for (var i = 0; i < keys.length; i++) {
      var ev = state.events[keys[i]];
      if (ev.status === 'broadcasting') {
        result.push(getEvent(state, ev.id));
      }
    }
    return result;
  }

  function getEventSpectators(state, eventId) {
    var event = state.events[eventId];
    if (!event) return [];
    return event.spectatorIds.slice();
  }

  function getSpectatorCount(state, eventId) {
    var event = state.events[eventId];
    if (!event) return 0;
    return event.spectatorIds.length;
  }

  function getPlayerWatchHistory(state, playerId) {
    var history = [];
    var keys = Object.keys(state.events);
    for (var i = 0; i < keys.length; i++) {
      var ev = state.events[keys[i]];
      for (var j = 0; j < ev.watchHistory.length; j++) {
        if (ev.watchHistory[j].playerId === playerId) {
          history.push({
            eventId: ev.id,
            eventType: ev.type,
            joinTick: ev.watchHistory[j].joinTick,
            leaveTick: ev.watchHistory[j].leaveTick,
            watchTicks: ev.watchHistory[j].watchTicks
          });
        }
      }
    }
    return history;
  }

  function getEventHighlights(state, eventId) {
    var event = state.events[eventId];
    if (!event) return [];
    return event.highlights.slice();
  }

  function getSpectatorRewards(state, playerId) {
    var total = 0;
    var log = [];
    for (var i = 0; i < state.rewardLog.length; i++) {
      var entry = state.rewardLog[i];
      if (entry.playerId === playerId) {
        total += entry.spark;
        log.push(entry);
      }
    }
    return { playerId: playerId, totalSpark: total, rewardLog: log };
  }

  function getPopularEvents(state, count) {
    var keys = Object.keys(state.events);
    var events = [];
    for (var i = 0; i < keys.length; i++) {
      var ev = state.events[keys[i]];
      events.push({
        id: ev.id,
        type: ev.type,
        peakSpectators: ev.peakSpectators,
        totalWatchTicks: ev.totalWatchTicks,
        status: ev.status
      });
    }
    // Sort by peak spectators descending, then totalWatchTicks
    events.sort(function(a, b) {
      if (b.peakSpectators !== a.peakSpectators) return b.peakSpectators - a.peakSpectators;
      return b.totalWatchTicks - a.totalWatchTicks;
    });
    var n = (count && count > 0) ? Math.min(count, events.length) : events.length;
    return events.slice(0, n);
  }

  function getEventStats(state, eventId) {
    var event = state.events[eventId];
    if (!event) return null;

    var totalSpark = 0;
    for (var i = 0; i < state.rewardLog.length; i++) {
      if (state.rewardLog[i].eventId === eventId) {
        totalSpark += state.rewardLog[i].spark;
      }
    }

    var avgWatchTime = 0;
    if (event.watchHistory.length > 0) {
      var sum = 0;
      for (var j = 0; j < event.watchHistory.length; j++) {
        sum += event.watchHistory[j].watchTicks;
      }
      avgWatchTime = Math.floor(sum / event.watchHistory.length);
    }

    return {
      eventId: eventId,
      type: event.type,
      hostId: event.hostId,
      zone: event.zone,
      status: event.status,
      startTick: event.startTick,
      endTick: event.endTick,
      currentSpectators: event.spectatorIds.length,
      peakSpectators: event.peakSpectators,
      totalWatchTicks: event.totalWatchTicks,
      avgWatchTime: avgWatchTime,
      totalUniqueSpectators: event.watchHistory.length + event.spectatorIds.length,
      totalSparkDistributed: totalSpark,
      highlightCount: event.highlights.length,
      reactionCounts: event.reactionCounts,
      watchHistory: event.watchHistory.slice()
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.EVENT_TYPES = EVENT_TYPES;
  exports.CAMERA_MODES = CAMERA_MODES;
  exports.CROWD_REACTIONS = CROWD_REACTIONS;
  exports.REWARD_TICKS_PER_SPARK = REWARD_TICKS_PER_SPARK;

  exports.createState = createState;
  exports.registerEvent = registerEvent;
  exports.endEvent = endEvent;
  exports.joinSpectator = joinSpectator;
  exports.leaveSpectator = leaveSpectator;
  exports.setCameraMode = setCameraMode;
  exports.sendReaction = sendReaction;
  exports.addHighlight = addHighlight;

  exports.getEvent = getEvent;
  exports.getActiveEvents = getActiveEvents;
  exports.getEventSpectators = getEventSpectators;
  exports.getSpectatorCount = getSpectatorCount;
  exports.getPlayerWatchHistory = getPlayerWatchHistory;
  exports.getEventHighlights = getEventHighlights;
  exports.getSpectatorRewards = getSpectatorRewards;
  exports.getPopularEvents = getPopularEvents;
  exports.getEventStats = getEventStats;

})(typeof module !== 'undefined' ? module.exports : (window.SpectatorSystem = {}));
