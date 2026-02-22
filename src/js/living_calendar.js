/**
 * ZION Living Calendar
 * World-wide event scheduling — maintains rolling 30-day calendar of
 * tournaments, festivals, guild wars, auctions, elections, raids, concerts.
 * Players subscribe to categories and receive notifications.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // External dependency guards
  // ---------------------------------------------------------------------------

  var ArenaScheduler = (typeof window !== 'undefined' && window.ArenaScheduler) || {};
  var SeasonalEventsAuto = (typeof window !== 'undefined' && window.SeasonalEventsAuto) || {};
  var MetaEvents = (typeof window !== 'undefined' && window.MetaEvents) || {};
  var Notifications = (typeof window !== 'undefined' && window.Notifications) || {};
  var Elections = (typeof window !== 'undefined' && window.Elections) || {};

  // ---------------------------------------------------------------------------
  // Seeded PRNG — mulberry32
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

  var SECONDS_PER_MINUTE = 60;
  var SECONDS_PER_HOUR   = 3600;
  var SECONDS_PER_DAY    = 86400;
  var SECONDS_PER_WEEK   = 604800;
  var SECONDS_30_DAYS    = 30 * SECONDS_PER_DAY;

  var REMINDER_TIMES = [
    { label: '1h',  offset: SECONDS_PER_HOUR },
    { label: '15m', offset: 15 * SECONDS_PER_MINUTE }
  ];

  var VALID_CATEGORIES = [
    'tournament', 'festival', 'guild_war', 'auction',
    'election', 'raid', 'concert', 'community', 'custom'
  ];

  var VALID_RECURRENCE = ['none', 'daily', 'weekly', 'monthly'];

  var VALID_RSVP_STATUS = ['going', 'maybe', 'not_going'];

  // ---------------------------------------------------------------------------
  // State factory
  // ---------------------------------------------------------------------------

  /**
   * Create a blank calendar state.
   * @returns {Object}
   */
  function createCalendarState() {
    return {
      events: {},            // eventId -> event object
      subscriptions: {},     // playerId -> { categories: {cat: true}, eventIds: {id: true} }
      rsvps: {},             // eventId -> { playerId -> { status, rsvpAt } }
      attendance: {},        // eventId -> { playerId -> { checkedIn, checkInAt } }
      notifications: {},     // playerId -> [ { type, eventId, message, ts, read } ]
      history: {},           // eventId -> { eventId, title, type, startAt, endAt, actualAttendance }
      recurringTemplates: {}, // templateId -> template object
      nextEventId: 1,
      nextTemplateId: 1
    };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function generateEventId(cal) {
    var id = 'ev_' + cal.nextEventId;
    cal.nextEventId += 1;
    return id;
  }

  function generateTemplateId(cal) {
    var id = 'tpl_' + cal.nextTemplateId;
    cal.nextTemplateId += 1;
    return id;
  }

  function isValidCategory(cat) {
    return VALID_CATEGORIES.indexOf(cat) !== -1;
  }

  function isValidRecurrence(rec) {
    return VALID_RECURRENCE.indexOf(rec) !== -1;
  }

  function getCalState(state) {
    return state.calendar || state;
  }

  function ensureSubscription(cal, playerId) {
    if (!cal.subscriptions[playerId]) {
      cal.subscriptions[playerId] = { categories: {}, eventIds: {} };
    }
    return cal.subscriptions[playerId];
  }

  function ensureNotifications(cal, playerId) {
    if (!cal.notifications[playerId]) {
      cal.notifications[playerId] = [];
    }
    return cal.notifications[playerId];
  }

  function ensureRsvp(cal, eventId) {
    if (!cal.rsvps[eventId]) {
      cal.rsvps[eventId] = {};
    }
    return cal.rsvps[eventId];
  }

  function ensureAttendance(cal, eventId) {
    if (!cal.attendance[eventId]) {
      cal.attendance[eventId] = {};
    }
    return cal.attendance[eventId];
  }

  /**
   * Push a notification to a player's notification list.
   */
  function pushNotification(cal, playerId, type, eventId, message, nowTs) {
    var notes = ensureNotifications(cal, playerId);
    notes.push({
      type: type,
      eventId: eventId,
      message: message,
      ts: nowTs,
      read: false
    });
  }

  /**
   * Deliver notifications to all subscribed players for an event.
   * @param {Object} cal
   * @param {Object} ev
   * @param {string} type - notification type string
   * @param {string} message
   * @param {number} nowTs
   */
  function notifySubscribers(cal, ev, type, message, nowTs) {
    for (var playerId in cal.subscriptions) {
      var sub = cal.subscriptions[playerId];
      var catMatch = sub.categories[ev.category] === true;
      var evMatch  = sub.eventIds[ev.id] === true;
      if (catMatch || evMatch) {
        pushNotification(cal, playerId, type, ev.id, message, nowTs);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Event Scheduling
  // ---------------------------------------------------------------------------

  /**
   * Schedule a new calendar event.
   * @param {Object} state
   * @param {Object} opts - { title, category, type, startAt, endAt, location, capacity, host, description, recurrence, tags, isPublic }
   * @returns {{ success: boolean, event: Object, reason: string }}
   */
  function scheduleEvent(state, opts) {
    var cal = getCalState(state);

    if (!opts || typeof opts !== 'object') {
      return { success: false, event: null, reason: 'opts must be an object' };
    }

    var title = opts.title;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return { success: false, event: null, reason: 'title is required' };
    }

    var category = opts.category;
    if (!isValidCategory(category)) {
      return { success: false, event: null, reason: 'Invalid category: ' + category + '. Valid: ' + VALID_CATEGORIES.join(', ') };
    }

    var startAt = opts.startAt;
    var endAt   = opts.endAt;

    if (typeof startAt !== 'number' || startAt < 0) {
      return { success: false, event: null, reason: 'startAt must be a non-negative number (Unix timestamp)' };
    }
    if (typeof endAt !== 'number' || endAt <= startAt) {
      return { success: false, event: null, reason: 'endAt must be a number greater than startAt' };
    }

    var capacity = opts.capacity !== undefined ? opts.capacity : 0;
    if (typeof capacity !== 'number' || capacity < 0) {
      return { success: false, event: null, reason: 'capacity must be a non-negative number' };
    }

    var recurrence = opts.recurrence || 'none';
    if (!isValidRecurrence(recurrence)) {
      return { success: false, event: null, reason: 'Invalid recurrence: ' + recurrence };
    }

    var eventId = generateEventId(cal);

    var ev = {
      id: eventId,
      title: title.trim(),
      category: category,
      type: opts.type || category,
      startAt: startAt,
      endAt: endAt,
      duration: endAt - startAt,
      location: opts.location || '',
      zone: opts.zone || opts.location || '',
      capacity: capacity,
      host: opts.host || '',
      description: opts.description || '',
      recurrence: recurrence,
      templateId: opts.templateId || null,
      tags: Array.isArray(opts.tags) ? opts.tags.slice() : [],
      isPublic: opts.isPublic !== false,  // default true
      status: 'scheduled',               // scheduled | active | completed | cancelled
      rsvpCount: 0,
      attendanceCount: 0,
      createdAt: opts.createdAt || startAt
    };

    cal.events[eventId] = ev;
    cal.rsvps[eventId] = {};
    cal.attendance[eventId] = {};

    return { success: true, event: ev, reason: 'Event scheduled' };
  }

  /**
   * Cancel a scheduled event.
   * @param {Object} state
   * @param {string} eventId
   * @param {number} nowTs - current timestamp for notifications
   * @returns {{ success: boolean, reason: string }}
   */
  function cancelEvent(state, eventId, nowTs) {
    var cal = getCalState(state);
    var ev = cal.events[eventId];

    if (!ev) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (ev.status === 'completed') {
      return { success: false, reason: 'Cannot cancel a completed event' };
    }
    if (ev.status === 'cancelled') {
      return { success: false, reason: 'Event is already cancelled' };
    }

    ev.status = 'cancelled';

    var ts = nowTs || ev.startAt;
    notifySubscribers(cal, ev, 'cancelled',
      'Event "' + ev.title + '" has been cancelled.', ts);

    return { success: true, reason: 'Event cancelled' };
  }

  /**
   * Update an existing event's mutable fields.
   * @param {Object} state
   * @param {string} eventId
   * @param {Object} updates - partial fields to update
   * @returns {{ success: boolean, event: Object, reason: string }}
   */
  function updateEvent(state, eventId, updates) {
    var cal = getCalState(state);
    var ev = cal.events[eventId];

    if (!ev) {
      return { success: false, event: null, reason: 'Event not found: ' + eventId };
    }
    if (ev.status === 'cancelled' || ev.status === 'completed') {
      return { success: false, event: ev, reason: 'Cannot update a ' + ev.status + ' event' };
    }
    if (!updates || typeof updates !== 'object') {
      return { success: false, event: ev, reason: 'updates must be an object' };
    }

    // Validate updates
    if (updates.startAt !== undefined && (typeof updates.startAt !== 'number' || updates.startAt < 0)) {
      return { success: false, event: ev, reason: 'startAt must be a non-negative number' };
    }
    if (updates.endAt !== undefined) {
      var newEnd = updates.endAt;
      var newStart = updates.startAt !== undefined ? updates.startAt : ev.startAt;
      if (typeof newEnd !== 'number' || newEnd <= newStart) {
        return { success: false, event: ev, reason: 'endAt must be greater than startAt' };
      }
    }
    if (updates.category !== undefined && !isValidCategory(updates.category)) {
      return { success: false, event: ev, reason: 'Invalid category: ' + updates.category };
    }

    var mutableFields = ['title', 'description', 'location', 'zone', 'capacity',
                         'host', 'tags', 'isPublic', 'startAt', 'endAt', 'category', 'type'];
    for (var i = 0; i < mutableFields.length; i++) {
      var field = mutableFields[i];
      if (updates[field] !== undefined) {
        ev[field] = updates[field];
      }
    }

    // Recalculate duration if times changed
    if (updates.startAt !== undefined || updates.endAt !== undefined) {
      ev.duration = ev.endAt - ev.startAt;
    }

    return { success: true, event: ev, reason: 'Event updated' };
  }

  /**
   * Get a single event by ID.
   * @param {Object} state
   * @param {string} eventId
   * @returns {Object|null}
   */
  function getEventById(state, eventId) {
    var cal = getCalState(state);
    return cal.events[eventId] || null;
  }

  // ---------------------------------------------------------------------------
  // 30-Day Window Queries
  // ---------------------------------------------------------------------------

  /**
   * Return all events within the rolling 30-day window from nowTs.
   * @param {Object} state
   * @param {number} nowTs - current Unix timestamp
   * @returns {Array}
   */
  function getThirtyDayCalendar(state, nowTs) {
    var cal = getCalState(state);
    var windowEnd = nowTs + SECONDS_30_DAYS;
    var results = [];

    for (var id in cal.events) {
      var ev = cal.events[id];
      if (ev.status === 'cancelled') continue;
      // Include if event starts within window OR is currently active
      if ((ev.startAt >= nowTs && ev.startAt <= windowEnd) ||
          (ev.startAt < nowTs && ev.endAt > nowTs)) {
        results.push(ev);
      }
    }

    results.sort(function(a, b) { return a.startAt - b.startAt; });
    return results;
  }

  /**
   * Return events in a specific date range [fromTs, toTs].
   * @param {Object} state
   * @param {number} fromTs
   * @param {number} toTs
   * @param {Object} [filters] - { category, zone, host, status }
   * @returns {Array}
   */
  function getEventsInRange(state, fromTs, toTs, filters) {
    var cal = getCalState(state);
    var results = [];
    var f = filters || {};

    for (var id in cal.events) {
      var ev = cal.events[id];
      if (ev.startAt < fromTs || ev.startAt > toTs) continue;
      if (f.category && ev.category !== f.category) continue;
      if (f.zone && ev.zone !== f.zone) continue;
      if (f.host && ev.host !== f.host) continue;
      if (f.status && ev.status !== f.status) continue;
      results.push(ev);
    }

    results.sort(function(a, b) { return a.startAt - b.startAt; });
    return results;
  }

  /**
   * Return today's events (within 24h from nowTs).
   * @param {Object} state
   * @param {number} nowTs
   * @returns {Array}
   */
  function getTodaysEvents(state, nowTs) {
    return getEventsInRange(state, nowTs, nowTs + SECONDS_PER_DAY);
  }

  /**
   * Return this week's events (7 days from nowTs).
   * @param {Object} state
   * @param {number} nowTs
   * @returns {Array}
   */
  function getWeeksEvents(state, nowTs) {
    return getEventsInRange(state, nowTs, nowTs + SECONDS_PER_WEEK);
  }

  // ---------------------------------------------------------------------------
  // Player Subscriptions
  // ---------------------------------------------------------------------------

  /**
   * Subscribe a player to a category.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} category
   * @returns {{ success: boolean, reason: string }}
   */
  function subscribeToCategory(state, playerId, category) {
    var cal = getCalState(state);

    if (!isValidCategory(category)) {
      return { success: false, reason: 'Invalid category: ' + category };
    }
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, reason: 'playerId must be a non-empty string' };
    }

    var sub = ensureSubscription(cal, playerId);
    sub.categories[category] = true;
    return { success: true, reason: 'Subscribed to ' + category };
  }

  /**
   * Unsubscribe a player from a category.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} category
   * @returns {{ success: boolean, reason: string }}
   */
  function unsubscribeFromCategory(state, playerId, category) {
    var cal = getCalState(state);
    var sub = cal.subscriptions[playerId];

    if (!sub || !sub.categories[category]) {
      return { success: false, reason: 'Not subscribed to ' + category };
    }

    delete sub.categories[category];
    return { success: true, reason: 'Unsubscribed from ' + category };
  }

  /**
   * Subscribe a player to a specific event by ID.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} eventId
   * @returns {{ success: boolean, reason: string }}
   */
  function subscribeToEvent(state, playerId, eventId) {
    var cal = getCalState(state);

    if (!cal.events[eventId]) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, reason: 'playerId must be a non-empty string' };
    }

    var sub = ensureSubscription(cal, playerId);
    sub.eventIds[eventId] = true;
    return { success: true, reason: 'Subscribed to event ' + eventId };
  }

  /**
   * Unsubscribe a player from a specific event.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} eventId
   * @returns {{ success: boolean, reason: string }}
   */
  function unsubscribeFromEvent(state, playerId, eventId) {
    var cal = getCalState(state);
    var sub = cal.subscriptions[playerId];

    if (!sub || !sub.eventIds[eventId]) {
      return { success: false, reason: 'Not subscribed to event ' + eventId };
    }

    delete sub.eventIds[eventId];
    return { success: true, reason: 'Unsubscribed from event ' + eventId };
  }

  /**
   * Get a player's subscription profile.
   * @param {Object} state
   * @param {string} playerId
   * @returns {{ categories: Array, eventIds: Array }}
   */
  function getSubscriptions(state, playerId) {
    var cal = getCalState(state);
    var sub = cal.subscriptions[playerId];
    if (!sub) {
      return { categories: [], eventIds: [] };
    }
    return {
      categories: Object.keys(sub.categories),
      eventIds: Object.keys(sub.eventIds)
    };
  }

  /**
   * Return the list of players subscribed to a given category.
   * @param {Object} state
   * @param {string} category
   * @returns {Array}
   */
  function getCategorySubscribers(state, category) {
    var cal = getCalState(state);
    var result = [];
    for (var playerId in cal.subscriptions) {
      if (cal.subscriptions[playerId].categories[category]) {
        result.push(playerId);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // RSVP System
  // ---------------------------------------------------------------------------

  /**
   * Player RSVPs to an event.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} eventId
   * @param {string} status - 'going' | 'maybe' | 'not_going'
   * @param {number} nowTs
   * @returns {{ success: boolean, rsvp: Object, reason: string }}
   */
  function rsvp(state, playerId, eventId, status, nowTs) {
    var cal = getCalState(state);
    var ev = cal.events[eventId];

    if (!ev) {
      return { success: false, rsvp: null, reason: 'Event not found: ' + eventId };
    }
    if (ev.status === 'cancelled') {
      return { success: false, rsvp: null, reason: 'Cannot RSVP to a cancelled event' };
    }
    if (ev.status === 'completed') {
      return { success: false, rsvp: null, reason: 'Cannot RSVP to a completed event' };
    }
    if (VALID_RSVP_STATUS.indexOf(status) === -1) {
      return { success: false, rsvp: null, reason: 'Invalid RSVP status. Valid: ' + VALID_RSVP_STATUS.join(', ') };
    }
    if (!playerId || typeof playerId !== 'string') {
      return { success: false, rsvp: null, reason: 'playerId must be a non-empty string' };
    }

    // Check capacity (only enforce for 'going' RSVPs if capacity > 0)
    var rsvpMap = ensureRsvp(cal, eventId);
    if (status === 'going' && ev.capacity > 0) {
      var goingCount = 0;
      for (var pid in rsvpMap) {
        if (rsvpMap[pid].status === 'going') goingCount++;
      }
      // If already going, not adding a new spot
      var alreadyGoing = rsvpMap[playerId] && rsvpMap[playerId].status === 'going';
      if (!alreadyGoing && goingCount >= ev.capacity) {
        return { success: false, rsvp: null, reason: 'Event is at capacity (' + ev.capacity + ')' };
      }
    }

    var ts = nowTs || 0;
    var existing = rsvpMap[playerId];
    var oldStatus = existing ? existing.status : null;

    rsvpMap[playerId] = { status: status, rsvpAt: ts };

    // Update rsvpCount (only count 'going')
    var going = 0;
    for (var p in rsvpMap) {
      if (rsvpMap[p].status === 'going') going++;
    }
    ev.rsvpCount = going;

    return {
      success: true,
      rsvp: { playerId: playerId, eventId: eventId, status: status, rsvpAt: ts, previousStatus: oldStatus },
      reason: 'RSVP recorded as ' + status
    };
  }

  /**
   * Get all RSVPs for an event.
   * @param {Object} state
   * @param {string} eventId
   * @returns {{ going: Array, maybe: Array, not_going: Array, total: number }}
   */
  function getEventRsvps(state, eventId) {
    var cal = getCalState(state);
    var rsvpMap = cal.rsvps[eventId] || {};

    var going = [], maybe = [], not_going = [];
    for (var pid in rsvpMap) {
      var r = rsvpMap[pid];
      if (r.status === 'going') going.push(pid);
      else if (r.status === 'maybe') maybe.push(pid);
      else if (r.status === 'not_going') not_going.push(pid);
    }

    return {
      going: going,
      maybe: maybe,
      not_going: not_going,
      total: Object.keys(rsvpMap).length
    };
  }

  /**
   * Get a player's RSVP for a specific event.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} eventId
   * @returns {Object|null}
   */
  function getPlayerRsvp(state, playerId, eventId) {
    var cal = getCalState(state);
    var rsvpMap = cal.rsvps[eventId];
    if (!rsvpMap) return null;
    return rsvpMap[playerId] || null;
  }

  /**
   * Get all events a player has RSVP'd to.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} [statusFilter] - optional filter by RSVP status
   * @returns {Array}
   */
  function getPlayerRsvps(state, playerId, statusFilter) {
    var cal = getCalState(state);
    var results = [];

    for (var eventId in cal.rsvps) {
      var rsvpMap = cal.rsvps[eventId];
      var r = rsvpMap[playerId];
      if (r) {
        if (!statusFilter || r.status === statusFilter) {
          results.push({
            eventId: eventId,
            status: r.status,
            rsvpAt: r.rsvpAt,
            event: cal.events[eventId] || null
          });
        }
      }
    }

    results.sort(function(a, b) {
      var ea = a.event, eb = b.event;
      if (!ea) return 1;
      if (!eb) return -1;
      return ea.startAt - eb.startAt;
    });

    return results;
  }

  // ---------------------------------------------------------------------------
  // Attendance Tracking
  // ---------------------------------------------------------------------------

  /**
   * Check a player into an active event.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} eventId
   * @param {number} nowTs
   * @returns {{ success: boolean, reason: string }}
   */
  function checkIn(state, playerId, eventId, nowTs) {
    var cal = getCalState(state);
    var ev = cal.events[eventId];

    if (!ev) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (ev.status === 'cancelled') {
      return { success: false, reason: 'Cannot check in to a cancelled event' };
    }
    if (ev.status === 'completed') {
      return { success: false, reason: 'Event is already completed' };
    }

    var ts = nowTs || 0;

    // Allow check-in during or just before event window (within 15 min early)
    if (ev.startAt > ts + 15 * SECONDS_PER_MINUTE) {
      return { success: false, reason: 'Event has not started yet' };
    }
    if (ev.endAt <= ts) {
      return { success: false, reason: 'Event has already ended' };
    }

    var attMap = ensureAttendance(cal, eventId);

    if (attMap[playerId] && attMap[playerId].checkedIn) {
      return { success: false, reason: 'Already checked in' };
    }

    attMap[playerId] = { checkedIn: true, checkInAt: ts };
    ev.attendanceCount = Object.keys(attMap).length;

    return { success: true, reason: 'Checked in to ' + ev.title };
  }

  /**
   * Get attendance for an event.
   * @param {Object} state
   * @param {string} eventId
   * @returns {{ attendees: Array, count: number }}
   */
  function getAttendance(state, eventId) {
    var cal = getCalState(state);
    var attMap = cal.attendance[eventId] || {};
    var attendees = [];

    for (var pid in attMap) {
      if (attMap[pid].checkedIn) {
        attendees.push({ playerId: pid, checkInAt: attMap[pid].checkInAt });
      }
    }

    return { attendees: attendees, count: attendees.length };
  }

  // ---------------------------------------------------------------------------
  // Recurring Events
  // ---------------------------------------------------------------------------

  /**
   * Create a recurring event template.
   * @param {Object} state
   * @param {Object} opts - same as scheduleEvent plus recurrence pattern
   * @returns {{ success: boolean, template: Object, reason: string }}
   */
  function createRecurringTemplate(state, opts) {
    var cal = getCalState(state);

    if (!opts || typeof opts !== 'object') {
      return { success: false, template: null, reason: 'opts must be an object' };
    }
    if (!opts.title || typeof opts.title !== 'string' || !opts.title.trim()) {
      return { success: false, template: null, reason: 'title is required' };
    }
    if (!isValidCategory(opts.category)) {
      return { success: false, template: null, reason: 'Invalid category: ' + opts.category };
    }

    var recurrence = opts.recurrence || 'weekly';
    if (!isValidRecurrence(recurrence) || recurrence === 'none') {
      return { success: false, template: null, reason: 'recurrence must be daily, weekly, or monthly for templates' };
    }

    if (typeof opts.duration !== 'number' || opts.duration <= 0) {
      return { success: false, template: null, reason: 'duration (seconds) must be a positive number' };
    }

    // anchorTime: time-of-day in seconds (offset from midnight) for daily/weekly
    var anchorTime = opts.anchorTime || 0;

    var templateId = generateTemplateId(cal);
    var template = {
      id: templateId,
      title: opts.title.trim(),
      category: opts.category,
      type: opts.type || opts.category,
      duration: opts.duration,
      location: opts.location || '',
      zone: opts.zone || opts.location || '',
      capacity: opts.capacity || 0,
      host: opts.host || '',
      description: opts.description || '',
      recurrence: recurrence,
      anchorTime: anchorTime,
      tags: Array.isArray(opts.tags) ? opts.tags.slice() : [],
      isPublic: opts.isPublic !== false,
      active: true,
      lastSpawnedAt: null,
      spawnedEvents: []
    };

    cal.recurringTemplates[templateId] = template;
    return { success: true, template: template, reason: 'Recurring template created' };
  }

  /**
   * Spawn event instances from active recurring templates up to nowTs + horizon.
   * @param {Object} state
   * @param {number} nowTs - current timestamp
   * @param {number} horizon - seconds ahead to spawn (default 30 days)
   * @returns {{ spawned: Array }}
   */
  function spawnRecurringEvents(state, nowTs, horizon) {
    var cal = getCalState(state);
    var span = horizon !== undefined ? horizon : SECONDS_30_DAYS;
    var until = nowTs + span;
    var spawned = [];

    for (var tid in cal.recurringTemplates) {
      var tpl = cal.recurringTemplates[tid];
      if (!tpl.active) continue;

      var cursor = tpl.lastSpawnedAt !== null ? tpl.lastSpawnedAt : nowTs;

      var interval;
      if (tpl.recurrence === 'daily') {
        interval = SECONDS_PER_DAY;
      } else if (tpl.recurrence === 'weekly') {
        interval = SECONDS_PER_WEEK;
      } else if (tpl.recurrence === 'monthly') {
        interval = 30 * SECONDS_PER_DAY;
      } else {
        continue;
      }

      // Advance cursor to first upcoming slot after lastSpawnedAt
      var nextSlot = cursor + interval;

      while (nextSlot <= until) {
        var evStart = nextSlot;
        var evEnd   = evStart + tpl.duration;

        var result = scheduleEvent(state, {
          title: tpl.title,
          category: tpl.category,
          type: tpl.type,
          startAt: evStart,
          endAt: evEnd,
          location: tpl.location,
          zone: tpl.zone,
          capacity: tpl.capacity,
          host: tpl.host,
          description: tpl.description,
          tags: tpl.tags,
          isPublic: tpl.isPublic,
          recurrence: 'none',
          templateId: tid
        });

        if (result.success) {
          tpl.spawnedEvents.push(result.event.id);
          spawned.push(result.event);
          tpl.lastSpawnedAt = evStart;
        }

        nextSlot += interval;
      }
    }

    return { spawned: spawned };
  }

  /**
   * Deactivate a recurring template (stop future spawns).
   * @param {Object} state
   * @param {string} templateId
   * @returns {{ success: boolean, reason: string }}
   */
  function deactivateTemplate(state, templateId) {
    var cal = getCalState(state);
    var tpl = cal.recurringTemplates[templateId];
    if (!tpl) {
      return { success: false, reason: 'Template not found: ' + templateId };
    }
    tpl.active = false;
    return { success: true, reason: 'Template deactivated' };
  }

  // ---------------------------------------------------------------------------
  // Reminders
  // ---------------------------------------------------------------------------

  /**
   * Process reminders — emit notifications for events starting soon.
   * Call this regularly (e.g. every game tick) with the current timestamp.
   * @param {Object} state
   * @param {number} nowTs
   * @returns {{ reminders: Array }} list of reminder objects emitted
   */
  function processReminders(state, nowTs) {
    var cal = getCalState(state);
    var reminders = [];

    for (var id in cal.events) {
      var ev = cal.events[id];
      if (ev.status !== 'scheduled') continue;

      for (var ri = 0; ri < REMINDER_TIMES.length; ri++) {
        var rem = REMINDER_TIMES[ri];
        var targetTs = ev.startAt - rem.offset;

        // Trigger if nowTs is within 60s of the target reminder time
        if (nowTs >= targetTs && nowTs < targetTs + 60) {
          var msg = 'Event "' + ev.title + '" starts in ' + rem.label + '!';
          notifySubscribers(cal, ev, 'reminder_' + rem.label, msg, nowTs);
          reminders.push({ eventId: id, label: rem.label, message: msg });
        }
      }
    }

    return { reminders: reminders };
  }

  /**
   * Mark an event as active (started).
   * @param {Object} state
   * @param {string} eventId
   * @param {number} nowTs
   * @returns {{ success: boolean, reason: string }}
   */
  function startEvent(state, eventId, nowTs) {
    var cal = getCalState(state);
    var ev = cal.events[eventId];

    if (!ev) {
      return { success: false, reason: 'Event not found: ' + eventId };
    }
    if (ev.status !== 'scheduled') {
      return { success: false, reason: 'Event is not in scheduled state (current: ' + ev.status + ')' };
    }

    ev.status = 'active';
    var ts = nowTs || ev.startAt;
    notifySubscribers(cal, ev, 'started', 'Event "' + ev.title + '" has started!', ts);

    return { success: true, reason: 'Event started' };
  }

  /**
   * Mark an event as completed, archive it to history.
   * @param {Object} state
   * @param {string} eventId
   * @param {number} nowTs
   * @returns {{ success: boolean, historyEntry: Object, reason: string }}
   */
  function completeEvent(state, eventId, nowTs) {
    var cal = getCalState(state);
    var ev = cal.events[eventId];

    if (!ev) {
      return { success: false, historyEntry: null, reason: 'Event not found: ' + eventId };
    }
    if (ev.status === 'cancelled') {
      return { success: false, historyEntry: null, reason: 'Cannot complete a cancelled event' };
    }
    if (ev.status === 'completed') {
      return { success: false, historyEntry: null, reason: 'Event already completed' };
    }

    ev.status = 'completed';

    var attData = getAttendance(state, eventId);
    var rsvpData = getEventRsvps(state, eventId);

    var historyEntry = {
      eventId: eventId,
      title: ev.title,
      category: ev.category,
      type: ev.type,
      startAt: ev.startAt,
      endAt: ev.endAt,
      location: ev.location,
      host: ev.host,
      rsvpGoing: rsvpData.going.length,
      actualAttendance: attData.count,
      completedAt: nowTs || ev.endAt
    };

    cal.history[eventId] = historyEntry;

    var ts = nowTs || ev.endAt;
    notifySubscribers(cal, ev, 'completed', 'Event "' + ev.title + '" has concluded. Thanks for attending!', ts);

    return { success: true, historyEntry: historyEntry, reason: 'Event completed' };
  }

  // ---------------------------------------------------------------------------
  // Calendar Search
  // ---------------------------------------------------------------------------

  /**
   * Search events by multiple criteria.
   * @param {Object} state
   * @param {Object} query - { q, category, zone, host, fromTs, toTs, status, tags }
   * @returns {Array}
   */
  function searchEvents(state, query) {
    var cal = getCalState(state);
    var q = query || {};
    var results = [];

    var searchText = q.q ? q.q.toLowerCase() : null;

    for (var id in cal.events) {
      var ev = cal.events[id];

      // Text search across title and description
      if (searchText) {
        var inTitle = ev.title.toLowerCase().indexOf(searchText) !== -1;
        var inDesc  = ev.description.toLowerCase().indexOf(searchText) !== -1;
        if (!inTitle && !inDesc) continue;
      }

      if (q.category && ev.category !== q.category) continue;
      if (q.zone && ev.zone !== q.zone) continue;
      if (q.host && ev.host !== q.host) continue;
      if (q.status && ev.status !== q.status) continue;

      if (typeof q.fromTs === 'number' && ev.startAt < q.fromTs) continue;
      if (typeof q.toTs === 'number' && ev.startAt > q.toTs) continue;

      // Tag filter
      if (q.tags && q.tags.length > 0) {
        var hasTag = false;
        for (var ti = 0; ti < q.tags.length; ti++) {
          if (ev.tags.indexOf(q.tags[ti]) !== -1) {
            hasTag = true;
            break;
          }
        }
        if (!hasTag) continue;
      }

      results.push(ev);
    }

    results.sort(function(a, b) { return a.startAt - b.startAt; });
    return results;
  }

  /**
   * Filter events by category.
   * @param {Object} state
   * @param {string} category
   * @param {number} [nowTs] - if provided, only return future events
   * @returns {Array}
   */
  function getEventsByCategory(state, category, nowTs) {
    var cal = getCalState(state);
    var results = [];

    for (var id in cal.events) {
      var ev = cal.events[id];
      if (ev.category !== category) continue;
      if (ev.status === 'cancelled') continue;
      if (nowTs !== undefined && ev.startAt < nowTs) continue;
      results.push(ev);
    }

    results.sort(function(a, b) { return a.startAt - b.startAt; });
    return results;
  }

  /**
   * Get upcoming events for a specific zone.
   * @param {Object} state
   * @param {string} zone
   * @param {number} nowTs
   * @returns {Array}
   */
  function getEventsByZone(state, zone, nowTs) {
    var cal = getCalState(state);
    var results = [];

    for (var id in cal.events) {
      var ev = cal.events[id];
      if (ev.zone !== zone) continue;
      if (ev.status === 'cancelled') continue;
      if (ev.endAt <= nowTs) continue;
      results.push(ev);
    }

    results.sort(function(a, b) { return a.startAt - b.startAt; });
    return results;
  }

  /**
   * Get events hosted by a specific player/entity.
   * @param {Object} state
   * @param {string} host
   * @returns {Array}
   */
  function getEventsByHost(state, host) {
    var cal = getCalState(state);
    var results = [];

    for (var id in cal.events) {
      var ev = cal.events[id];
      if (ev.host !== host) continue;
      results.push(ev);
    }

    results.sort(function(a, b) { return a.startAt - b.startAt; });
    return results;
  }

  // ---------------------------------------------------------------------------
  // Event History
  // ---------------------------------------------------------------------------

  /**
   * Get the history of past events.
   * @param {Object} state
   * @param {Object} [opts] - { limit, category }
   * @returns {Array}
   */
  function getEventHistory(state, opts) {
    var cal = getCalState(state);
    var o = opts || {};
    var results = [];

    for (var id in cal.history) {
      var h = cal.history[id];
      if (o.category && h.category !== o.category) continue;
      results.push(h);
    }

    // Sort most-recent first
    results.sort(function(a, b) { return b.completedAt - a.completedAt; });

    if (o.limit && o.limit > 0) {
      results = results.slice(0, o.limit);
    }

    return results;
  }

  /**
   * Get the history entry for a specific event.
   * @param {Object} state
   * @param {string} eventId
   * @returns {Object|null}
   */
  function getEventHistoryEntry(state, eventId) {
    var cal = getCalState(state);
    return cal.history[eventId] || null;
  }

  // ---------------------------------------------------------------------------
  // Conflict Detection
  // ---------------------------------------------------------------------------

  /**
   * Detect scheduling conflicts for a player — events they've RSVP'd 'going'
   * that overlap in time.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} list of conflict objects { event1, event2 }
   */
  function detectConflicts(state, playerId) {
    var cal = getCalState(state);
    var conflicts = [];

    // Collect all events the player is going to
    var attending = [];
    for (var eventId in cal.rsvps) {
      var rsvpMap = cal.rsvps[eventId];
      if (rsvpMap[playerId] && rsvpMap[playerId].status === 'going') {
        var ev = cal.events[eventId];
        if (ev && ev.status !== 'cancelled' && ev.status !== 'completed') {
          attending.push(ev);
        }
      }
    }

    // Check each pair for overlap
    for (var i = 0; i < attending.length; i++) {
      for (var j = i + 1; j < attending.length; j++) {
        var a = attending[i];
        var b = attending[j];
        // Overlap if a starts before b ends AND b starts before a ends
        if (a.startAt < b.endAt && b.startAt < a.endAt) {
          conflicts.push({ event1: a, event2: b });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two events conflict in time.
   * @param {Object} evA
   * @param {Object} evB
   * @returns {boolean}
   */
  function eventsConflict(evA, evB) {
    return evA.startAt < evB.endAt && evB.startAt < evA.endAt;
  }

  // ---------------------------------------------------------------------------
  // Weekly Digest
  // ---------------------------------------------------------------------------

  /**
   * Generate "This Week in ZION" digest using seeded PRNG for determinism.
   * @param {Object} state
   * @param {number} weekStartTs - Unix timestamp of week start
   * @param {number} seed
   * @returns {Object} digest object
   */
  function generateWeeklyDigest(state, weekStartTs, seed) {
    var cal = getCalState(state);
    var weekEndTs = weekStartTs + SECONDS_PER_WEEK;
    var rand = mulberry32(seed || 42);

    var thisWeek = getEventsInRange(state, weekStartTs, weekEndTs);
    var pastWeek = getEventHistory(state, { limit: 20 });

    // Filter past week events (completed in the last 7 days)
    var recentHistory = pastWeek.filter(function(h) {
      return h.completedAt >= weekStartTs - SECONDS_PER_WEEK && h.completedAt < weekStartTs;
    });

    // Count by category
    var categoryCounts = {};
    for (var i = 0; i < thisWeek.length; i++) {
      var cat = thisWeek[i].category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Pick a featured event (seeded random)
    var featuredEvent = null;
    if (thisWeek.length > 0) {
      var featIdx = Math.floor(rand() * thisWeek.length);
      featuredEvent = thisWeek[featIdx];
    }

    // Most-attended past event
    var topPast = null;
    if (recentHistory.length > 0) {
      recentHistory.sort(function(a, b) { return b.actualAttendance - a.actualAttendance; });
      topPast = recentHistory[0];
    }

    // Category highlights (one event per category, seeded pick)
    var highlights = {};
    for (var cat in categoryCounts) {
      var catEvents = thisWeek.filter(function(e) { return e.category === cat; });
      if (catEvents.length > 0) {
        highlights[cat] = catEvents[Math.floor(rand() * catEvents.length)];
      }
    }

    return {
      weekStart: weekStartTs,
      weekEnd: weekEndTs,
      totalEvents: thisWeek.length,
      categoryCounts: categoryCounts,
      featuredEvent: featuredEvent,
      topPastEvent: topPast,
      highlights: highlights,
      upcomingEvents: thisWeek.slice(0, 5),
      recentlyCompleted: recentHistory.slice(0, 3),
      generatedWithSeed: seed || 42
    };
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  /**
   * Get a player's unread notifications.
   * @param {Object} state
   * @param {string} playerId
   * @param {boolean} [unreadOnly]
   * @returns {Array}
   */
  function getNotifications(state, playerId, unreadOnly) {
    var cal = getCalState(state);
    var notes = cal.notifications[playerId] || [];
    if (unreadOnly) {
      return notes.filter(function(n) { return !n.read; });
    }
    return notes.slice();
  }

  /**
   * Mark notifications as read.
   * @param {Object} state
   * @param {string} playerId
   * @param {Array} [notificationIndices] - if omitted, mark all as read
   * @returns {{ markedCount: number }}
   */
  function markNotificationsRead(state, playerId, notificationIndices) {
    var cal = getCalState(state);
    var notes = cal.notifications[playerId];
    if (!notes) return { markedCount: 0 };

    var count = 0;
    if (!notificationIndices) {
      for (var i = 0; i < notes.length; i++) {
        if (!notes[i].read) { notes[i].read = true; count++; }
      }
    } else {
      for (var j = 0; j < notificationIndices.length; j++) {
        var idx = notificationIndices[j];
        if (idx >= 0 && idx < notes.length && !notes[idx].read) {
          notes[idx].read = true;
          count++;
        }
      }
    }

    return { markedCount: count };
  }

  /**
   * Broadcast a custom notification to all subscribers of a category.
   * @param {Object} state
   * @param {string} category
   * @param {string} message
   * @param {number} nowTs
   * @returns {{ sentTo: number }}
   */
  function broadcastToCategory(state, category, message, nowTs) {
    var cal = getCalState(state);
    var sentTo = 0;

    for (var playerId in cal.subscriptions) {
      if (cal.subscriptions[playerId].categories[category]) {
        pushNotification(cal, playerId, 'broadcast', null, message, nowTs);
        sentTo++;
      }
    }

    return { sentTo: sentTo };
  }

  // ---------------------------------------------------------------------------
  // Utility / Stats
  // ---------------------------------------------------------------------------

  /**
   * Get calendar statistics.
   * @param {Object} state
   * @param {number} nowTs
   * @returns {Object}
   */
  function getCalendarStats(state, nowTs) {
    var cal = getCalState(state);
    var stats = {
      totalEvents: 0,
      scheduledEvents: 0,
      activeEvents: 0,
      completedEvents: 0,
      cancelledEvents: 0,
      totalSubscribers: Object.keys(cal.subscriptions).length,
      totalTemplates: Object.keys(cal.recurringTemplates).length,
      activeTemplates: 0,
      historyCount: Object.keys(cal.history).length,
      categoryBreakdown: {}
    };

    for (var id in cal.events) {
      var ev = cal.events[id];
      stats.totalEvents++;
      if (ev.status === 'scheduled') stats.scheduledEvents++;
      else if (ev.status === 'active') stats.activeEvents++;
      else if (ev.status === 'completed') stats.completedEvents++;
      else if (ev.status === 'cancelled') stats.cancelledEvents++;

      stats.categoryBreakdown[ev.category] = (stats.categoryBreakdown[ev.category] || 0) + 1;
    }

    for (var tid in cal.recurringTemplates) {
      if (cal.recurringTemplates[tid].active) stats.activeTemplates++;
    }

    return stats;
  }

  /**
   * Get the next upcoming event (closest in time from nowTs).
   * @param {Object} state
   * @param {number} nowTs
   * @param {string} [category] - optional category filter
   * @returns {Object|null}
   */
  function getNextEvent(state, nowTs, category) {
    var cal = getCalState(state);
    var soonest = null;

    for (var id in cal.events) {
      var ev = cal.events[id];
      if (ev.status === 'cancelled' || ev.status === 'completed') continue;
      if (ev.startAt <= nowTs) continue;
      if (category && ev.category !== category) continue;
      if (!soonest || ev.startAt < soonest.startAt) {
        soonest = ev;
      }
    }

    return soonest;
  }

  /**
   * Tick function — advance calendar state, start/complete events based on time.
   * @param {Object} state
   * @param {number} nowTs
   * @returns {{ started: Array, completed: Array, remindersEmitted: Array }}
   */
  function tick(state, nowTs) {
    var cal = getCalState(state);
    var started = [];
    var completed = [];

    for (var id in cal.events) {
      var ev = cal.events[id];

      if (ev.status === 'scheduled' && ev.startAt <= nowTs) {
        startEvent(state, id, nowTs);
        started.push(id);
      } else if (ev.status === 'active' && ev.endAt <= nowTs) {
        completeEvent(state, id, nowTs);
        completed.push(id);
      }
    }

    var remRes = processReminders(state, nowTs);

    return {
      started: started,
      completed: completed,
      remindersEmitted: remRes.reminders
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  exports.createCalendarState = createCalendarState;

  // Event CRUD
  exports.scheduleEvent = scheduleEvent;
  exports.cancelEvent = cancelEvent;
  exports.updateEvent = updateEvent;
  exports.getEventById = getEventById;
  exports.startEvent = startEvent;
  exports.completeEvent = completeEvent;

  // 30-Day window queries
  exports.getThirtyDayCalendar = getThirtyDayCalendar;
  exports.getEventsInRange = getEventsInRange;
  exports.getTodaysEvents = getTodaysEvents;
  exports.getWeeksEvents = getWeeksEvents;
  exports.getEventsByCategory = getEventsByCategory;
  exports.getEventsByZone = getEventsByZone;
  exports.getEventsByHost = getEventsByHost;
  exports.getNextEvent = getNextEvent;

  // Subscriptions
  exports.subscribeToCategory = subscribeToCategory;
  exports.unsubscribeFromCategory = unsubscribeFromCategory;
  exports.subscribeToEvent = subscribeToEvent;
  exports.unsubscribeFromEvent = unsubscribeFromEvent;
  exports.getSubscriptions = getSubscriptions;
  exports.getCategorySubscribers = getCategorySubscribers;

  // RSVP
  exports.rsvp = rsvp;
  exports.getEventRsvps = getEventRsvps;
  exports.getPlayerRsvp = getPlayerRsvp;
  exports.getPlayerRsvps = getPlayerRsvps;

  // Attendance
  exports.checkIn = checkIn;
  exports.getAttendance = getAttendance;

  // Recurring
  exports.createRecurringTemplate = createRecurringTemplate;
  exports.spawnRecurringEvents = spawnRecurringEvents;
  exports.deactivateTemplate = deactivateTemplate;

  // Reminders & notifications
  exports.processReminders = processReminders;
  exports.getNotifications = getNotifications;
  exports.markNotificationsRead = markNotificationsRead;
  exports.broadcastToCategory = broadcastToCategory;

  // Digest & search
  exports.generateWeeklyDigest = generateWeeklyDigest;
  exports.searchEvents = searchEvents;

  // History
  exports.getEventHistory = getEventHistory;
  exports.getEventHistoryEntry = getEventHistoryEntry;

  // Conflict detection
  exports.detectConflicts = detectConflicts;
  exports.eventsConflict = eventsConflict;

  // Stats & tick
  exports.getCalendarStats = getCalendarStats;
  exports.tick = tick;

  // Constants (exported for tests)
  exports.VALID_CATEGORIES = VALID_CATEGORIES;
  exports.VALID_RECURRENCE = VALID_RECURRENCE;
  exports.VALID_RSVP_STATUS = VALID_RSVP_STATUS;
  exports.SECONDS_PER_DAY = SECONDS_PER_DAY;
  exports.SECONDS_PER_WEEK = SECONDS_PER_WEEK;
  exports.SECONDS_30_DAYS = SECONDS_30_DAYS;

})(typeof module !== 'undefined' ? module.exports : (window.LivingCalendar = {}));
