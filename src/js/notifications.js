/**
 * ZION Notification / Toast System
 * Manages in-game alerts, toasts, and notification history.
 * Pure logic — no DOM dependency so it is fully testable in Node.js.
 */

(function(exports) {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  var NOTIFICATION_TYPES = {
    economy:     'economy',
    achievement: 'achievement',
    social:      'social',
    system:      'system',
    quest:       'quest',
    combat:      'combat'
  };

  var PRIORITY_LEVELS = {
    low:      0,
    normal:   1,
    high:     2,
    critical: 3
  };

  // Default durations (ms) per priority
  var DEFAULT_DURATIONS = {
    low:      3000,
    normal:   4500,
    high:     7000,
    critical: 0     // 0 = persist until manually dismissed
  };

  // Icons and accent colours for each type
  var TYPE_META = {
    economy:     { icon: '💰', color: '#f1c40f', label: 'Economy' },
    achievement: { icon: '🏆', color: '#e67e22', label: 'Achievement' },
    social:      { icon: '💬', color: '#3498db', label: 'Social' },
    system:      { icon: '⚙️',  color: '#95a5a6', label: 'System' },
    quest:       { icon: '📜', color: '#9b59b6', label: 'Quest' },
    combat:      { icon: '⚔️',  color: '#e74c3c', label: 'Combat' }
  };

  // Sound hints — returned so the audio module can react without coupling
  var TYPE_SOUNDS = {
    economy:     'chime_coin',
    achievement: 'fanfare_achievement',
    social:      'ping_social',
    system:      'blip_system',
    quest:       'fanfare_quest',
    combat:      'alert_combat'
  };

  var MAX_HISTORY = 200;
  var DEFAULT_MAX_VISIBLE = 5;
  var DEFAULT_GROUPING_WINDOW = 2000; // ms — collapse repeated messages within this window

  // ─── Internal state ───────────────────────────────────────────────────────

  var _idCounter = 0;
  var _toastQueue = [];       // Active toasts (visible)
  var _pendingQueue = [];     // Overflow toasts waiting for a slot
  var _history = [];          // All notifications ever created

  var _prefs = {
    mutedTypes:     {},       // { economy: true, ... }
    durations:      {},       // override durations per type
    maxVisible:     DEFAULT_MAX_VISIBLE,
    groupingWindow: DEFAULT_GROUPING_WINDOW,
    enabled:        true
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _now() {
    return (typeof Date !== 'undefined') ? Date.now() : 0;
  }

  function _nextId() {
    _idCounter += 1;
    return 'notif_' + _idCounter;
  }

  function _isValidType(type) {
    return Object.prototype.hasOwnProperty.call(NOTIFICATION_TYPES, type);
  }

  function _isValidPriority(priority) {
    return Object.prototype.hasOwnProperty.call(PRIORITY_LEVELS, priority);
  }

  function _resolveDuration(type, priority, options) {
    // Explicit override in options wins
    if (options && typeof options.duration === 'number') {
      return options.duration;
    }
    // Per-type preference override
    if (_prefs.durations && typeof _prefs.durations[type] === 'number') {
      return _prefs.durations[type];
    }
    // Default by priority
    return DEFAULT_DURATIONS[priority];
  }

  /**
   * Find a toast in _toastQueue already matching type + message within
   * the grouping window. Returns the found toast or null.
   */
  function _findGroupable(type, message) {
    var now = _now();
    var window = _prefs.groupingWindow;
    for (var i = 0; i < _toastQueue.length; i++) {
      var t = _toastQueue[i];
      if (t.type === type && t.message === message) {
        if (now - t.createdAt <= window) {
          return t;
        }
      }
    }
    return null;
  }

  function _findGroupableInPending(type, message) {
    var now = _now();
    var window = _prefs.groupingWindow;
    for (var i = 0; i < _pendingQueue.length; i++) {
      var t = _pendingQueue[i];
      if (t.type === type && t.message === message) {
        if (now - t.createdAt <= window) {
          return t;
        }
      }
    }
    return null;
  }

  // ─── Core API ─────────────────────────────────────────────────────────────

  /**
   * Create a notification object (does NOT add it to any queue).
   * @param {string} type     - One of NOTIFICATION_TYPES keys
   * @param {string} message  - Human-readable message
   * @param {Object} options  - Optional overrides: priority, duration, groupable, data
   * @returns {Object} Notification object
   */
  function createNotification(type, message, options) {
    if (!_isValidType(type)) {
      throw new Error('Unknown notification type: ' + type);
    }

    options = options || {};

    var priority = options.priority || 'normal';
    if (!_isValidPriority(priority)) {
      throw new Error('Unknown priority level: ' + priority);
    }

    var duration = _resolveDuration(type, priority, options);

    var notification = {
      id:         _nextId(),
      type:       type,
      message:    String(message),
      priority:   priority,
      duration:   duration,
      groupable:  options.groupable !== false, // default true
      groupCount: 1,
      data:       options.data || null,
      createdAt:  _now(),
      dismissedAt: null,
      expired:    false
    };

    return notification;
  }

  /**
   * Add a notification to the queue, applying grouping and preferences.
   * Returns the notification (possibly a grouped existing one) or null if suppressed.
   * @param {string} type
   * @param {string} message
   * @param {Object} options
   * @returns {Object|null}
   */
  function addNotification(type, message, options) {
    if (!_prefs.enabled) return null;
    if (_prefs.mutedTypes && _prefs.mutedTypes[type]) return null;

    if (!_isValidType(type)) return null;

    options = options || {};

    // Grouping: check if an identical active toast exists
    if (options.groupable !== false) {
      var existing = _findGroupable(type, message);
      if (!existing) {
        existing = _findGroupableInPending(type, message);
      }
      if (existing) {
        existing.groupCount += 1;
        existing.createdAt = _now(); // bump timestamp so it refreshes
        return existing;
      }
    }

    var notif = createNotification(type, message, options);

    // Add to history
    _history.unshift(notif);
    if (_history.length > MAX_HISTORY) {
      _history.length = MAX_HISTORY;
    }

    // Slot available?
    var maxVisible = (_prefs.maxVisible > 0) ? _prefs.maxVisible : DEFAULT_MAX_VISIBLE;
    if (_toastQueue.length < maxVisible) {
      _toastQueue.push(notif);
    } else {
      _pendingQueue.push(notif);
    }

    return notif;
  }

  /**
   * Remove expired toasts from the active queue, promote from pending.
   * Should be called periodically (e.g., from the game loop).
   */
  function tick() {
    var now = _now();
    var maxVisible = (_prefs.maxVisible > 0) ? _prefs.maxVisible : DEFAULT_MAX_VISIBLE;

    // Mark expired
    for (var i = _toastQueue.length - 1; i >= 0; i--) {
      var t = _toastQueue[i];
      if (t.duration > 0 && (now - t.createdAt) >= t.duration) {
        t.expired = true;
        _toastQueue.splice(i, 1);
      }
    }

    // Promote from pending
    while (_toastQueue.length < maxVisible && _pendingQueue.length > 0) {
      var next = _pendingQueue.shift();
      // Reset creation time so the full duration applies from when it becomes visible
      next.createdAt = _now();
      _toastQueue.push(next);
    }
  }

  /**
   * Get currently active (visible) toasts, sorted by priority desc then age asc.
   * @returns {Array}
   */
  function getActiveToasts() {
    // Return a shallow copy sorted by priority descending, then creation time ascending
    var sorted = _toastQueue.slice().sort(function(a, b) {
      var pDiff = PRIORITY_LEVELS[b.priority] - PRIORITY_LEVELS[a.priority];
      if (pDiff !== 0) return pDiff;
      return a.createdAt - b.createdAt;
    });
    return sorted;
  }

  /**
   * Get notification history.
   * @param {number} limit - Maximum entries (default 50)
   * @returns {Array}
   */
  function getNotificationHistory(limit) {
    limit = (typeof limit === 'number' && limit > 0) ? limit : 50;
    return _history.slice(0, limit);
  }

  /**
   * Dismiss a single toast by id.
   * @param {string} id
   * @returns {boolean} true if found and dismissed
   */
  function dismissToast(id) {
    var now = _now();

    for (var i = 0; i < _toastQueue.length; i++) {
      if (_toastQueue[i].id === id) {
        _toastQueue[i].dismissedAt = now;
        _toastQueue[i].expired = true;
        _toastQueue.splice(i, 1);
        // Promote from pending
        tick();
        return true;
      }
    }

    for (var j = 0; j < _pendingQueue.length; j++) {
      if (_pendingQueue[j].id === id) {
        _pendingQueue[j].dismissedAt = now;
        _pendingQueue[j].expired = true;
        _pendingQueue.splice(j, 1);
        return true;
      }
    }

    return false;
  }

  /**
   * Dismiss all active and pending toasts.
   */
  function dismissAll() {
    var now = _now();
    var i;
    for (i = 0; i < _toastQueue.length; i++) {
      _toastQueue[i].dismissedAt = now;
      _toastQueue[i].expired = true;
    }
    for (i = 0; i < _pendingQueue.length; i++) {
      _pendingQueue[i].dismissedAt = now;
      _pendingQueue[i].expired = true;
    }
    _toastQueue = [];
    _pendingQueue = [];
  }

  /**
   * Update user preferences.
   * @param {Object} prefs - Partial prefs object
   *   mutedTypes    {Object}  e.g. { economy: true }
   *   durations     {Object}  e.g. { quest: 8000 }
   *   maxVisible    {number}
   *   groupingWindow {number}
   *   enabled       {boolean}
   */
  function setPreferences(prefs) {
    if (!prefs || typeof prefs !== 'object') return;

    if (typeof prefs.enabled === 'boolean') {
      _prefs.enabled = prefs.enabled;
    }
    if (typeof prefs.maxVisible === 'number' && prefs.maxVisible > 0) {
      _prefs.maxVisible = prefs.maxVisible;
    }
    if (typeof prefs.groupingWindow === 'number' && prefs.groupingWindow >= 0) {
      _prefs.groupingWindow = prefs.groupingWindow;
    }
    if (prefs.mutedTypes && typeof prefs.mutedTypes === 'object') {
      // Merge — allow caller to un-mute by passing false
      var mt = prefs.mutedTypes;
      for (var k in mt) {
        if (Object.prototype.hasOwnProperty.call(mt, k)) {
          if (mt[k]) {
            _prefs.mutedTypes[k] = true;
          } else {
            delete _prefs.mutedTypes[k];
          }
        }
      }
    }
    if (prefs.durations && typeof prefs.durations === 'object') {
      var d = prefs.durations;
      for (var key in d) {
        if (Object.prototype.hasOwnProperty.call(d, key)) {
          if (typeof d[key] === 'number') {
            _prefs.durations[key] = d[key];
          }
        }
      }
    }
  }

  /**
   * Format a notification for display.
   * Returns an object with icon, color, label, formattedMessage, soundHint, badgeText.
   * @param {Object} notification - Notification object from createNotification/addNotification
   * @returns {Object}
   */
  function formatNotification(notification) {
    if (!notification) return null;

    var meta = TYPE_META[notification.type] || { icon: '🔔', color: '#ffffff', label: 'Notice' };
    var sound = TYPE_SOUNDS[notification.type] || 'blip_system';

    var badgeText = null;
    if (notification.groupCount && notification.groupCount > 1) {
      badgeText = 'x' + notification.groupCount;
    }

    var formattedMessage = notification.message;

    return {
      id:               notification.id,
      type:             notification.type,
      priority:         notification.priority,
      icon:             meta.icon,
      color:            meta.color,
      label:            meta.label,
      formattedMessage: formattedMessage,
      soundHint:        sound,
      badgeText:        badgeText,
      groupCount:       notification.groupCount || 1,
      duration:         notification.duration,
      createdAt:        notification.createdAt
    };
  }

  /**
   * Get the sound hint for a notification type without formatting the whole object.
   * Useful for the audio module to play a sound immediately on addNotification.
   * @param {string} type
   * @returns {string}
   */
  function getSoundHint(type) {
    return TYPE_SOUNDS[type] || 'blip_system';
  }

  /**
   * Get a copy of current preferences.
   * @returns {Object}
   */
  function getPreferences() {
    return {
      mutedTypes:      JSON.parse(JSON.stringify(_prefs.mutedTypes)),
      durations:       JSON.parse(JSON.stringify(_prefs.durations)),
      maxVisible:      _prefs.maxVisible,
      groupingWindow:  _prefs.groupingWindow,
      enabled:         _prefs.enabled
    };
  }

  /**
   * Get count of pending (overflow) toasts.
   * @returns {number}
   */
  function getPendingCount() {
    return _pendingQueue.length;
  }

  /**
   * Reset all internal state. Useful for testing / new session.
   */
  function reset() {
    _idCounter = 0;
    _toastQueue = [];
    _pendingQueue = [];
    _history = [];
    _prefs = {
      mutedTypes:     {},
      durations:      {},
      maxVisible:     DEFAULT_MAX_VISIBLE,
      groupingWindow: DEFAULT_GROUPING_WINDOW,
      enabled:        true
    };
  }

  // ─── Exports ──────────────────────────────────────────────────────────────

  exports.NOTIFICATION_TYPES  = NOTIFICATION_TYPES;
  exports.PRIORITY_LEVELS     = PRIORITY_LEVELS;
  exports.DEFAULT_DURATIONS   = DEFAULT_DURATIONS;
  exports.TYPE_META           = TYPE_META;
  exports.TYPE_SOUNDS         = TYPE_SOUNDS;

  exports.createNotification      = createNotification;
  exports.addNotification         = addNotification;
  exports.tick                    = tick;
  exports.getActiveToasts         = getActiveToasts;
  exports.getNotificationHistory  = getNotificationHistory;
  exports.dismissToast            = dismissToast;
  exports.dismissAll              = dismissAll;
  exports.setPreferences          = setPreferences;
  exports.getPreferences          = getPreferences;
  exports.formatNotification      = formatNotification;
  exports.getSoundHint            = getSoundHint;
  exports.getPendingCount         = getPendingCount;
  exports.reset                   = reset;

})(typeof module !== 'undefined' ? module.exports : (window.Notifications = {}));
