// world_chronicle.js
/**
 * ZION World Chronicle — Automated Living History System
 * Records significant world events (first builds, major auctions, guild wars,
 * amendments, raid kills, federation connections) into a searchable Chronicle
 * with player-nominated Historic Moments.
 *
 * Dependencies (guard pattern):
 *   WorldEvents, MetaEvents, Archival, NarrativeThreads
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // OPTIONAL DEPENDENCIES — guard pattern
  // ---------------------------------------------------------------------------

  var WorldEvents = (typeof window !== 'undefined' && window.WorldEvents) || {};
  var MetaEvents = (typeof window !== 'undefined' && window.MetaEvents) || {};
  var Archival = (typeof window !== 'undefined' && window.Archival) || {};
  var NarrativeThreads = (typeof window !== 'undefined' && window.NarrativeThreads) || {};

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

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var EVENT_CATEGORIES = [
    'construction',
    'combat',
    'economic',
    'governance',
    'social',
    'exploration',
    'federation'
  ];

  var ZONES_LIST = [
    'nexus', 'gardens', 'athenaeum', 'studio',
    'wilds', 'agora', 'commons', 'arena'
  ];

  // Significance thresholds — events above these values get auto-recorded
  var SIGNIFICANCE_THRESHOLDS = {
    construction: 100,   // structures built
    combat:       50,    // participants in battle
    economic:     500,   // spark value of transaction
    governance:   0,     // all governance events
    social:       10,    // players gathered
    exploration:  1,     // all exploration firsts
    federation:   1      // all federation events
  };

  // Era milestone thresholds (total events recorded)
  var ERA_MILESTONES = [
    { minEvents: 0,    name: 'The Dawn Age',       description: 'The earliest days of ZION — founding and first steps.' },
    { minEvents: 50,   name: 'The Age of Building', description: 'Citizens raise the first great structures across all zones.' },
    { minEvents: 150,  name: 'The Age of Commerce', description: 'Trade routes flourish and Spark economy takes hold.' },
    { minEvents: 300,  name: 'The Age of Conflict',  description: 'Rivalries and great battles shape the destiny of zones.' },
    { minEvents: 500,  name: 'The Age of Unity',     description: 'Guilds and federations bind the world together.' },
    { minEvents: 750,  name: 'The Age of Legends',   description: 'Heroes of ZION leave permanent marks on history.' },
    { minEvents: 1000, name: 'The Eternal Age',      description: 'ZION transcends its origins — a world without end.' }
  ];

  // Chronicle page size
  var PAGE_SIZE = 20;

  // Nomination vote threshold for Historic Moment preservation
  var HISTORIC_VOTE_THRESHOLD = 3;

  // Weekly digest — max events selected
  var WEEKLY_DIGEST_SIZE = 7;

  // ---------------------------------------------------------------------------
  // STATE FACTORY
  // ---------------------------------------------------------------------------

  function createChronicleState() {
    return {
      entries: [],            // ChronicleEntry[]
      historicMoments: [],    // HistoricMoment[]
      nominations: {},        // nominationId -> Nomination
      eras: [],               // Era[] — computed on demand
      playerInvolvement: {},  // playerId -> { entryIds: [], nominationIds: [] }
      weeklyDigests: [],      // WeeklyDigest[]
      entryCounter: 0,
      nominationCounter: 0,
      digestCounter: 0
    };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  function nextEntryId(state) {
    state.entryCounter = (state.entryCounter || 0) + 1;
    return 'entry_' + state.entryCounter;
  }

  function nextNominationId(state) {
    state.nominationCounter = (state.nominationCounter || 0) + 1;
    return 'nomination_' + state.nominationCounter;
  }

  function nextDigestId(state) {
    state.digestCounter = (state.digestCounter || 0) + 1;
    return 'digest_' + state.digestCounter;
  }

  function ensurePlayerInvolvement(state, playerId) {
    if (!state.playerInvolvement[playerId]) {
      state.playerInvolvement[playerId] = {
        playerId: playerId,
        entryIds: [],
        nominationIds: [],
        votedNominations: []
      };
    }
    return state.playerInvolvement[playerId];
  }

  function isValidCategory(cat) {
    return EVENT_CATEGORIES.indexOf(cat) !== -1;
  }

  function getEraForCount(count) {
    var era = ERA_MILESTONES[0];
    for (var i = ERA_MILESTONES.length - 1; i >= 0; i--) {
      if (count >= ERA_MILESTONES[i].minEvents) {
        era = ERA_MILESTONES[i];
        break;
      }
    }
    return era;
  }

  function matchesKeyword(entry, keyword) {
    var kw = keyword.toLowerCase();
    if (entry.title && entry.title.toLowerCase().indexOf(kw) !== -1) { return true; }
    if (entry.description && entry.description.toLowerCase().indexOf(kw) !== -1) { return true; }
    if (entry.category && entry.category.toLowerCase().indexOf(kw) !== -1) { return true; }
    if (entry.zone && entry.zone.toLowerCase().indexOf(kw) !== -1) { return true; }
    if (entry.tags) {
      for (var i = 0; i < entry.tags.length; i++) {
        if (entry.tags[i].toLowerCase().indexOf(kw) !== -1) { return true; }
      }
    }
    return false;
  }

  function matchesParticipant(entry, playerId) {
    if (!entry.participants) { return false; }
    return entry.participants.indexOf(playerId) !== -1;
  }

  function matchesDateRange(entry, fromTs, toTs) {
    if (fromTs !== null && fromTs !== undefined && entry.timestamp < fromTs) { return false; }
    if (toTs !== null && toTs !== undefined && entry.timestamp > toTs) { return false; }
    return true;
  }

  // ---------------------------------------------------------------------------
  // EVENT RECORDING
  // ---------------------------------------------------------------------------

  /**
   * Record a significant world event into the Chronicle.
   * Parameters:
   *   state       — chronicle state object
   *   type        — event category (construction|combat|economic|governance|social|exploration|federation)
   *   title       — short event title
   *   description — full narrative description
   *   participants — array of playerIds involved
   *   zone        — zone where event occurred (optional)
   *   metadata    — additional data (significance score, value, etc.)
   *   timestamp   — game tick / timestamp
   *   tags        — string array of search tags
   *
   * Returns: { success, entry, reason }
   */
  function recordEvent(state, type, title, description, participants, zone, metadata, timestamp, tags) {
    if (!isValidCategory(type)) {
      return { success: false, entry: null, reason: 'Invalid category: ' + type };
    }
    if (!title || typeof title !== 'string' || title.length === 0) {
      return { success: false, entry: null, reason: 'Title is required' };
    }
    if (!description || typeof description !== 'string' || description.length === 0) {
      return { success: false, entry: null, reason: 'Description is required' };
    }

    var ts = (timestamp !== undefined && timestamp !== null) ? timestamp : Date.now();
    var ps = Array.isArray(participants) ? participants.slice() : [];
    var tg = Array.isArray(tags) ? tags.slice() : [];
    var meta = metadata && typeof metadata === 'object' ? metadata : {};
    var zn = zone && ZONES_LIST.indexOf(zone) !== -1 ? zone : null;

    var currentCount = state.entries.length;
    var era = getEraForCount(currentCount);

    var entry = {
      id: nextEntryId(state),
      type: type,
      category: type,
      title: title,
      description: description,
      participants: ps,
      zone: zn,
      metadata: meta,
      timestamp: ts,
      tags: tg,
      era: era.name,
      significance: meta.significance || 1,
      isHistoricMoment: false
    };

    state.entries.push(entry);

    // Track player involvement
    for (var i = 0; i < ps.length; i++) {
      var pInv = ensurePlayerInvolvement(state, ps[i]);
      pInv.entryIds.push(entry.id);
    }

    return { success: true, entry: entry, reason: null };
  }

  /**
   * Auto-record an event if its significance exceeds category threshold.
   * Returns { recorded, entry, reason }
   */
  function autoRecord(state, type, title, description, participants, zone, metadata, timestamp, tags) {
    var meta = metadata && typeof metadata === 'object' ? metadata : {};
    var significance = meta.significance !== undefined ? meta.significance : 1;
    var threshold = SIGNIFICANCE_THRESHOLDS[type];
    if (threshold === undefined) { threshold = 1; }

    if (significance < threshold && threshold > 0) {
      return { recorded: false, entry: null, reason: 'Below significance threshold (' + significance + ' < ' + threshold + ')' };
    }

    var result = recordEvent(state, type, title, description, participants, zone, metadata, timestamp, tags);
    return { recorded: result.success, entry: result.entry, reason: result.reason };
  }

  // ---------------------------------------------------------------------------
  // CHRONICLE RETRIEVAL — paginated
  // ---------------------------------------------------------------------------

  /**
   * Get paginated chronicle entries.
   * page — 0-indexed page number
   * pageSize — entries per page (defaults to PAGE_SIZE)
   * Returns { entries, page, pageSize, totalEntries, totalPages }
   */
  function getChronicle(state, page, pageSize) {
    var ps = (pageSize && pageSize > 0) ? pageSize : PAGE_SIZE;
    var pg = (page && page > 0) ? page : 0;
    var total = state.entries.length;
    var totalPages = Math.ceil(total / ps);
    var start = pg * ps;
    var end = Math.min(start + ps, total);
    var slice = state.entries.slice(start, end);
    return {
      entries: slice,
      page: pg,
      pageSize: ps,
      totalEntries: total,
      totalPages: totalPages
    };
  }

  /**
   * Get entries filtered by category, paginated.
   */
  function getChronicleByCategory(state, category, page, pageSize) {
    if (!isValidCategory(category)) {
      return { entries: [], page: 0, pageSize: PAGE_SIZE, totalEntries: 0, totalPages: 0 };
    }
    var ps = (pageSize && pageSize > 0) ? pageSize : PAGE_SIZE;
    var pg = (page && page >= 0) ? page : 0;
    var filtered = [];
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].category === category) {
        filtered.push(state.entries[i]);
      }
    }
    var total = filtered.length;
    var totalPages = Math.ceil(total / ps);
    var start = pg * ps;
    var end = Math.min(start + ps, total);
    return {
      entries: filtered.slice(start, end),
      page: pg,
      pageSize: ps,
      totalEntries: total,
      totalPages: totalPages
    };
  }

  // ---------------------------------------------------------------------------
  // TIMELINE VIEW
  // ---------------------------------------------------------------------------

  /**
   * Return a chronological timeline view of events, optionally filtered.
   * filter — { category, zone, fromTs, toTs }
   * Returns ChronicleEntry[] sorted by timestamp ascending
   */
  function getTimeline(state, filter) {
    var results = state.entries.slice();

    if (filter) {
      if (filter.category && isValidCategory(filter.category)) {
        results = results.filter(function(e) { return e.category === filter.category; });
      }
      if (filter.zone) {
        results = results.filter(function(e) { return e.zone === filter.zone; });
      }
      if (filter.fromTs !== undefined && filter.fromTs !== null) {
        results = results.filter(function(e) { return e.timestamp >= filter.fromTs; });
      }
      if (filter.toTs !== undefined && filter.toTs !== null) {
        results = results.filter(function(e) { return e.timestamp <= filter.toTs; });
      }
    }

    // Sort by timestamp ascending
    results.sort(function(a, b) { return a.timestamp - b.timestamp; });

    return results;
  }

  // ---------------------------------------------------------------------------
  // CHRONICLE SEARCH
  // ---------------------------------------------------------------------------

  /**
   * Search chronicle entries.
   * query — { keyword, category, participant, fromTs, toTs, zone }
   * Returns matching ChronicleEntry[] sorted by timestamp descending
   */
  function searchChronicle(state, query) {
    if (!query) { return []; }
    var results = [];

    for (var i = 0; i < state.entries.length; i++) {
      var entry = state.entries[i];
      var match = true;

      if (query.keyword && query.keyword.length > 0) {
        if (!matchesKeyword(entry, query.keyword)) { match = false; }
      }
      if (match && query.category) {
        if (entry.category !== query.category) { match = false; }
      }
      if (match && query.zone) {
        if (entry.zone !== query.zone) { match = false; }
      }
      if (match && query.participant) {
        if (!matchesParticipant(entry, query.participant)) { match = false; }
      }
      if (match && (query.fromTs !== undefined || query.toTs !== undefined)) {
        if (!matchesDateRange(entry, query.fromTs, query.toTs)) { match = false; }
      }

      if (match) { results.push(entry); }
    }

    // Sort by timestamp descending (most recent first)
    results.sort(function(a, b) { return b.timestamp - a.timestamp; });

    return results;
  }

  // ---------------------------------------------------------------------------
  // NOMINATION SYSTEM
  // ---------------------------------------------------------------------------

  /**
   * Nominate a chronicle entry as a Historic Moment.
   * Returns { success, nomination, reason }
   */
  function nominateHistoricMoment(state, playerId, entryId, nominationText) {
    if (!playerId) {
      return { success: false, nomination: null, reason: 'playerId is required' };
    }
    if (!entryId) {
      return { success: false, nomination: null, reason: 'entryId is required' };
    }
    if (!nominationText || nominationText.length === 0) {
      return { success: false, nomination: null, reason: 'nominationText is required' };
    }

    // Find entry
    var entry = null;
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].id === entryId) { entry = state.entries[i]; break; }
    }
    if (!entry) {
      return { success: false, nomination: null, reason: 'Entry not found: ' + entryId };
    }

    // Check if already a historic moment
    if (entry.isHistoricMoment) {
      return { success: false, nomination: null, reason: 'Entry is already a Historic Moment' };
    }

    // Check for duplicate nomination by same player for same entry
    var nkeys = Object.keys(state.nominations);
    for (var j = 0; j < nkeys.length; j++) {
      var existing = state.nominations[nkeys[j]];
      if (existing.entryId === entryId && existing.nominatorId === playerId) {
        return { success: false, nomination: existing, reason: 'Already nominated by this player' };
      }
    }

    var nomination = {
      id: nextNominationId(state),
      entryId: entryId,
      nominatorId: playerId,
      nominationText: nominationText,
      votes: [],         // playerIds who voted
      voteCount: 0,
      status: 'pending', // pending | approved | rejected
      createdAt: Date.now()
    };

    state.nominations[nomination.id] = nomination;

    var pInv = ensurePlayerInvolvement(state, playerId);
    pInv.nominationIds.push(nomination.id);

    return { success: true, nomination: nomination, reason: null };
  }

  /**
   * Vote on a nomination.
   * Returns { success, voteCount, preserved, reason }
   */
  function voteOnNomination(state, playerId, nominationId) {
    if (!playerId) {
      return { success: false, voteCount: 0, preserved: false, reason: 'playerId is required' };
    }

    var nomination = state.nominations[nominationId];
    if (!nomination) {
      return { success: false, voteCount: 0, preserved: false, reason: 'Nomination not found: ' + nominationId };
    }

    if (nomination.status !== 'pending') {
      return { success: false, voteCount: nomination.voteCount, preserved: nomination.status === 'approved', reason: 'Nomination is not pending' };
    }

    // Prevent double voting
    if (nomination.votes.indexOf(playerId) !== -1) {
      return { success: false, voteCount: nomination.voteCount, preserved: false, reason: 'Player already voted on this nomination' };
    }

    nomination.votes.push(playerId);
    nomination.voteCount += 1;

    var pInv = ensurePlayerInvolvement(state, playerId);
    pInv.votedNominations.push(nominationId);

    // Check if threshold met
    var preserved = false;
    if (nomination.voteCount >= HISTORIC_VOTE_THRESHOLD) {
      nomination.status = 'approved';
      preserved = true;

      // Mark the chronicle entry as a Historic Moment
      for (var i = 0; i < state.entries.length; i++) {
        if (state.entries[i].id === nomination.entryId) {
          state.entries[i].isHistoricMoment = true;
          break;
        }
      }

      // Add to historicMoments list
      state.historicMoments.push({
        nominationId: nominationId,
        entryId: nomination.entryId,
        nominationText: nomination.nominationText,
        nominatorId: nomination.nominatorId,
        finalVoteCount: nomination.voteCount,
        preservedAt: Date.now()
      });
    }

    return { success: true, voteCount: nomination.voteCount, preserved: preserved, reason: null };
  }

  /**
   * Get all nominations, optionally filtered by status.
   * Returns Nomination[]
   */
  function getNominations(state, status) {
    var results = [];
    var keys = Object.keys(state.nominations);
    for (var i = 0; i < keys.length; i++) {
      var nom = state.nominations[keys[i]];
      if (!status || nom.status === status) {
        results.push(nom);
      }
    }
    return results;
  }

  /**
   * Get all approved Historic Moments.
   * Returns HistoricMoment[]
   */
  function getHistoricMoments(state) {
    return state.historicMoments.slice();
  }

  /**
   * Get pending nominations for a specific entry.
   */
  function getNominationsForEntry(state, entryId) {
    var results = [];
    var keys = Object.keys(state.nominations);
    for (var i = 0; i < keys.length; i++) {
      var nom = state.nominations[keys[i]];
      if (nom.entryId === entryId) {
        results.push(nom);
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // PLAYER INVOLVEMENT
  // ---------------------------------------------------------------------------

  /**
   * Get all chronicle entries involving a specific player.
   * Returns ChronicleEntry[]
   */
  function getPlayerHistory(state, playerId) {
    var pInv = state.playerInvolvement[playerId];
    if (!pInv) { return []; }

    var idSet = {};
    for (var i = 0; i < pInv.entryIds.length; i++) {
      idSet[pInv.entryIds[i]] = true;
    }

    var results = [];
    for (var j = 0; j < state.entries.length; j++) {
      if (idSet[state.entries[j].id]) {
        results.push(state.entries[j]);
      }
    }

    results.sort(function(a, b) { return b.timestamp - a.timestamp; });
    return results;
  }

  /**
   * Get player involvement statistics.
   * Returns { playerId, totalEvents, categories: {}, zones: {} }
   */
  function getPlayerStats(state, playerId) {
    var entries = getPlayerHistory(state, playerId);
    var categories = {};
    var zones = {};

    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      categories[e.category] = (categories[e.category] || 0) + 1;
      if (e.zone) {
        zones[e.zone] = (zones[e.zone] || 0) + 1;
      }
    }

    var pInv = state.playerInvolvement[playerId];
    var nominationsMade = pInv ? pInv.nominationIds.length : 0;
    var votesGiven = pInv ? pInv.votedNominations.length : 0;

    return {
      playerId: playerId,
      totalEvents: entries.length,
      categories: categories,
      zones: zones,
      nominationsMade: nominationsMade,
      votesGiven: votesGiven
    };
  }

  // ---------------------------------------------------------------------------
  // ERA SYSTEM
  // ---------------------------------------------------------------------------

  /**
   * Get the current era based on total entry count.
   */
  function getCurrentEra(state) {
    return getEraForCount(state.entries.length);
  }

  /**
   * Get all eras with entry counts and status.
   * Returns EraInfo[]
   */
  function getEras(state) {
    var total = state.entries.length;
    var result = [];

    for (var i = 0; i < ERA_MILESTONES.length; i++) {
      var m = ERA_MILESTONES[i];
      var nextM = ERA_MILESTONES[i + 1];
      var isActive = total >= m.minEvents && (!nextM || total < nextM.minEvents);
      var isPast = nextM ? total >= nextM.minEvents : false;

      // Count entries in this era
      var eraEntries = 0;
      for (var j = 0; j < state.entries.length; j++) {
        if (state.entries[j].era === m.name) {
          eraEntries++;
        }
      }

      result.push({
        name: m.name,
        description: m.description,
        minEvents: m.minEvents,
        maxEvents: nextM ? nextM.minEvents - 1 : null,
        entryCount: eraEntries,
        isActive: isActive,
        isPast: isPast,
        isFuture: !isActive && !isPast
      });
    }

    return result;
  }

  /**
   * Get all entries belonging to a specific era.
   */
  function getEraEntries(state, eraName) {
    var results = [];
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].era === eraName) {
        results.push(state.entries[i]);
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // WEEKLY DIGEST
  // ---------------------------------------------------------------------------

  /**
   * Generate a weekly digest of the most significant events in a given week.
   * weekSeed — deterministic seed for reproducible selection
   * weekId   — string identifier (e.g. "2026-W08")
   * fromTs   — start of week timestamp
   * toTs     — end of week timestamp
   * Returns WeeklyDigest
   */
  function generateWeeklyDigest(state, weekId, weekSeed, fromTs, toTs) {
    if (!weekId) {
      return { success: false, digest: null, reason: 'weekId is required' };
    }

    // Check for existing digest with same weekId
    for (var i = 0; i < state.weeklyDigests.length; i++) {
      if (state.weeklyDigests[i].weekId === weekId) {
        return { success: true, digest: state.weeklyDigests[i], reason: 'Existing digest returned' };
      }
    }

    // Collect events in the week range
    var weekEntries = [];
    for (var j = 0; j < state.entries.length; j++) {
      var e = state.entries[j];
      var inRange = true;
      if (fromTs !== undefined && fromTs !== null && e.timestamp < fromTs) { inRange = false; }
      if (toTs !== undefined && toTs !== null && e.timestamp > toTs) { inRange = false; }
      if (inRange) { weekEntries.push(e); }
    }

    // Sort by significance descending, then use seeded PRNG to break ties
    var seed = weekSeed !== undefined ? weekSeed : hashString(weekId);
    var rng = mulberry32(seed);

    var scored = weekEntries.map(function(e) {
      return { entry: e, score: (e.significance || 1) + rng() * 0.5 };
    });
    scored.sort(function(a, b) { return b.score - a.score; });

    var selected = scored.slice(0, WEEKLY_DIGEST_SIZE).map(function(s) { return s.entry; });

    // Identify standout event (highest significance in week)
    var standout = null;
    var maxSig = -1;
    for (var k = 0; k < weekEntries.length; k++) {
      var sig = weekEntries[k].significance || 1;
      if (sig > maxSig) {
        maxSig = sig;
        standout = weekEntries[k];
      }
    }

    // Identify most active participant in week
    var participantCounts = {};
    for (var l = 0; l < weekEntries.length; l++) {
      var ps = weekEntries[l].participants || [];
      for (var m = 0; m < ps.length; m++) {
        participantCounts[ps[m]] = (participantCounts[ps[m]] || 0) + 1;
      }
    }
    var topPlayer = null;
    var topCount = 0;
    var pkeys = Object.keys(participantCounts);
    for (var n = 0; n < pkeys.length; n++) {
      if (participantCounts[pkeys[n]] > topCount) {
        topCount = participantCounts[pkeys[n]];
        topPlayer = pkeys[n];
      }
    }

    // Category breakdown
    var categoryBreakdown = {};
    for (var o = 0; o < EVENT_CATEGORIES.length; o++) {
      categoryBreakdown[EVENT_CATEGORIES[o]] = 0;
    }
    for (var p = 0; p < weekEntries.length; p++) {
      var cat = weekEntries[p].category;
      if (categoryBreakdown.hasOwnProperty(cat)) {
        categoryBreakdown[cat]++;
      }
    }

    // Historic moments this week
    var weekHistoric = [];
    for (var q = 0; q < state.historicMoments.length; q++) {
      var hm = state.historicMoments[q];
      // Find the entry to get its timestamp
      for (var r = 0; r < state.entries.length; r++) {
        if (state.entries[r].id === hm.entryId) {
          var hmTs = state.entries[r].timestamp;
          var inHmRange = true;
          if (fromTs !== undefined && fromTs !== null && hmTs < fromTs) { inHmRange = false; }
          if (toTs !== undefined && toTs !== null && hmTs > toTs) { inHmRange = false; }
          if (inHmRange) { weekHistoric.push(hm); }
          break;
        }
      }
    }

    var digest = {
      id: nextDigestId(state),
      weekId: weekId,
      fromTs: fromTs || null,
      toTs: toTs || null,
      totalEvents: weekEntries.length,
      selectedEvents: selected,
      standoutEvent: standout,
      topParticipant: topPlayer,
      categoryBreakdown: categoryBreakdown,
      historicMomentsThisWeek: weekHistoric,
      era: getCurrentEra(state).name,
      generatedAt: Date.now()
    };

    state.weeklyDigests.push(digest);

    return { success: true, digest: digest, reason: null };
  }

  /**
   * Get all generated weekly digests.
   */
  function getWeeklyDigests(state) {
    return state.weeklyDigests.slice();
  }

  /**
   * Get a specific weekly digest by weekId.
   */
  function getWeeklyDigestByWeek(state, weekId) {
    for (var i = 0; i < state.weeklyDigests.length; i++) {
      if (state.weeklyDigests[i].weekId === weekId) {
        return state.weeklyDigests[i];
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // CONVENIENCE RECORDERS — domain-specific auto-record helpers
  // ---------------------------------------------------------------------------

  /**
   * Record a First Build event.
   */
  function recordFirstBuild(state, playerId, structureType, zone, timestamp) {
    return recordEvent(
      state,
      'construction',
      'First ' + structureType + ' Built in ' + (zone || 'ZION'),
      'Player ' + playerId + ' constructed the first ' + structureType + ' in ' + (zone || 'ZION') + ', marking a milestone in the world\'s development.',
      [playerId],
      zone,
      { significance: 200, structureType: structureType, isFirst: true },
      timestamp,
      ['first', 'build', structureType, zone || 'world']
    );
  }

  /**
   * Record a Major Auction event.
   */
  function recordMajorAuction(state, participants, itemName, finalValue, zone, timestamp) {
    return recordEvent(
      state,
      'economic',
      'Major Auction: ' + itemName,
      'A major auction for "' + itemName + '" concluded with a final value of ' + finalValue + ' Spark, involving ' + participants.length + ' bidders.',
      participants,
      zone,
      { significance: finalValue, itemName: itemName, finalValue: finalValue },
      timestamp,
      ['auction', 'economic', itemName]
    );
  }

  /**
   * Record a Guild War event.
   */
  function recordGuildWar(state, guild1, guild2, winner, participants, zone, timestamp) {
    return recordEvent(
      state,
      'combat',
      'Guild War: ' + guild1 + ' vs ' + guild2,
      'A guild war erupted between ' + guild1 + ' and ' + guild2 + '. After fierce combat, ' + (winner || 'no decisive victor') + ' emerged triumphant.',
      participants,
      zone,
      { significance: participants.length * 10, guild1: guild1, guild2: guild2, winner: winner },
      timestamp,
      ['guild', 'war', 'combat', guild1, guild2]
    );
  }

  /**
   * Record a Constitution Amendment event.
   */
  function recordAmendment(state, proposerId, amendmentTitle, result, participants, timestamp) {
    return recordEvent(
      state,
      'governance',
      'Amendment: ' + amendmentTitle,
      'A constitutional amendment "' + amendmentTitle + '" was ' + result + ' by the community. Proposed by ' + proposerId + '.',
      participants,
      null,
      { significance: 500, amendmentTitle: amendmentTitle, result: result },
      timestamp,
      ['amendment', 'governance', 'constitution', result]
    );
  }

  /**
   * Record a Raid Kill event.
   */
  function recordRaidKill(state, raidName, bossName, participants, zone, timestamp) {
    return recordEvent(
      state,
      'combat',
      'Raid Victory: ' + bossName + ' Defeated',
      'A raid party of ' + participants.length + ' brave citizens defeated ' + bossName + ' in the ' + raidName + ' raid.',
      participants,
      zone,
      { significance: participants.length * 15, raidName: raidName, bossName: bossName },
      timestamp,
      ['raid', 'boss', 'combat', raidName, bossName]
    );
  }

  /**
   * Record a Federation Connection event.
   */
  function recordFederationConnection(state, server1, server2, initiatorId, timestamp) {
    return recordEvent(
      state,
      'federation',
      'Federation Link: ' + server1 + ' <-> ' + server2,
      'A new federation connection was established between ' + server1 + ' and ' + server2 + ', expanding the reach of ZION across worlds.',
      initiatorId ? [initiatorId] : [],
      null,
      { significance: 1000, server1: server1, server2: server2 },
      timestamp,
      ['federation', 'connection', server1, server2]
    );
  }

  /**
   * Record an Exploration Discovery event.
   */
  function recordExplorationDiscovery(state, playerId, discoveryName, zone, timestamp) {
    return recordEvent(
      state,
      'exploration',
      'Discovery: ' + discoveryName,
      'Explorer ' + playerId + ' discovered "' + discoveryName + '" in the ' + (zone || 'unknown') + ' zone.',
      [playerId],
      zone,
      { significance: 50, discoveryName: discoveryName },
      timestamp,
      ['exploration', 'discovery', discoveryName, zone || 'world']
    );
  }

  // ---------------------------------------------------------------------------
  // ENTRY RETRIEVAL HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Get a single chronicle entry by ID.
   */
  function getEntry(state, entryId) {
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].id === entryId) { return state.entries[i]; }
    }
    return null;
  }

  /**
   * Get the most recent N entries.
   */
  function getRecentEntries(state, count) {
    var n = (count && count > 0) ? count : 10;
    var sorted = state.entries.slice().sort(function(a, b) { return b.timestamp - a.timestamp; });
    return sorted.slice(0, n);
  }

  /**
   * Get all entries in a zone.
   */
  function getZoneHistory(state, zone) {
    var results = [];
    for (var i = 0; i < state.entries.length; i++) {
      if (state.entries[i].zone === zone) {
        results.push(state.entries[i]);
      }
    }
    results.sort(function(a, b) { return b.timestamp - a.timestamp; });
    return results;
  }

  /**
   * Get top significant entries (sorted by significance descending).
   */
  function getTopEvents(state, count) {
    var n = (count && count > 0) ? count : 10;
    var sorted = state.entries.slice().sort(function(a, b) {
      return (b.significance || 1) - (a.significance || 1);
    });
    return sorted.slice(0, n);
  }

  /**
   * Get entries involving multiple specific players (intersection).
   */
  function getSharedHistory(state, playerIds) {
    if (!Array.isArray(playerIds) || playerIds.length === 0) { return []; }
    var results = [];
    for (var i = 0; i < state.entries.length; i++) {
      var e = state.entries[i];
      var allPresent = true;
      for (var j = 0; j < playerIds.length; j++) {
        if (!matchesParticipant(e, playerIds[j])) {
          allPresent = false;
          break;
        }
      }
      if (allPresent) { results.push(e); }
    }
    results.sort(function(a, b) { return b.timestamp - a.timestamp; });
    return results;
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get overall chronicle statistics.
   */
  function getStats(state) {
    var categoryCounts = {};
    for (var c = 0; c < EVENT_CATEGORIES.length; c++) {
      categoryCounts[EVENT_CATEGORIES[c]] = 0;
    }
    var zoneCounts = {};
    for (var z = 0; z < ZONES_LIST.length; z++) {
      zoneCounts[ZONES_LIST[z]] = 0;
    }

    var totalSignificance = 0;
    var historicCount = 0;

    for (var i = 0; i < state.entries.length; i++) {
      var e = state.entries[i];
      if (categoryCounts.hasOwnProperty(e.category)) {
        categoryCounts[e.category]++;
      }
      if (e.zone && zoneCounts.hasOwnProperty(e.zone)) {
        zoneCounts[e.zone]++;
      }
      totalSignificance += (e.significance || 1);
      if (e.isHistoricMoment) { historicCount++; }
    }

    var totalPlayers = Object.keys(state.playerInvolvement).length;
    var pendingNominations = getNominations(state, 'pending').length;
    var approvedNominations = getNominations(state, 'approved').length;

    return {
      totalEntries: state.entries.length,
      categoryCounts: categoryCounts,
      zoneCounts: zoneCounts,
      totalSignificance: totalSignificance,
      historicMomentsCount: historicCount,
      totalPlayersInvolved: totalPlayers,
      pendingNominations: pendingNominations,
      approvedNominations: approvedNominations,
      totalDigests: state.weeklyDigests.length,
      currentEra: getCurrentEra(state).name
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  // Core state
  exports.createChronicleState      = createChronicleState;

  // Event recording
  exports.recordEvent               = recordEvent;
  exports.autoRecord                = autoRecord;

  // Convenience recorders
  exports.recordFirstBuild          = recordFirstBuild;
  exports.recordMajorAuction        = recordMajorAuction;
  exports.recordGuildWar            = recordGuildWar;
  exports.recordAmendment           = recordAmendment;
  exports.recordRaidKill            = recordRaidKill;
  exports.recordFederationConnection = recordFederationConnection;
  exports.recordExplorationDiscovery = recordExplorationDiscovery;

  // Chronicle retrieval
  exports.getChronicle              = getChronicle;
  exports.getChronicleByCategory    = getChronicleByCategory;
  exports.getEntry                  = getEntry;
  exports.getRecentEntries          = getRecentEntries;
  exports.getZoneHistory            = getZoneHistory;
  exports.getTopEvents              = getTopEvents;
  exports.getSharedHistory          = getSharedHistory;

  // Timeline
  exports.getTimeline               = getTimeline;

  // Search
  exports.searchChronicle           = searchChronicle;

  // Nomination & Historic Moments
  exports.nominateHistoricMoment    = nominateHistoricMoment;
  exports.voteOnNomination          = voteOnNomination;
  exports.getNominations            = getNominations;
  exports.getHistoricMoments        = getHistoricMoments;
  exports.getNominationsForEntry    = getNominationsForEntry;

  // Player involvement
  exports.getPlayerHistory          = getPlayerHistory;
  exports.getPlayerStats            = getPlayerStats;

  // Era system
  exports.getCurrentEra             = getCurrentEra;
  exports.getEras                   = getEras;
  exports.getEraEntries             = getEraEntries;

  // Weekly digest
  exports.generateWeeklyDigest      = generateWeeklyDigest;
  exports.getWeeklyDigests          = getWeeklyDigests;
  exports.getWeeklyDigestByWeek     = getWeeklyDigestByWeek;

  // Statistics
  exports.getStats                  = getStats;

  // Exposed constants for tests
  exports._EVENT_CATEGORIES         = EVENT_CATEGORIES;
  exports._ZONES_LIST               = ZONES_LIST;
  exports._ERA_MILESTONES           = ERA_MILESTONES;
  exports._SIGNIFICANCE_THRESHOLDS  = SIGNIFICANCE_THRESHOLDS;
  exports._HISTORIC_VOTE_THRESHOLD  = HISTORIC_VOTE_THRESHOLD;
  exports._WEEKLY_DIGEST_SIZE       = WEEKLY_DIGEST_SIZE;
  exports._PAGE_SIZE                = PAGE_SIZE;
  exports._mulberry32               = mulberry32;
  exports._hashString               = hashString;

})(typeof module !== 'undefined' ? module.exports : (window.WorldChronicle = {}));
