// replay.js — Protocol Replay system for ZION
// Records and replays protocol message sequences
(function(exports) {
  'use strict';

  // ============================================================
  // Internal helpers
  // ============================================================

  function sortByTimestamp(messages) {
    return messages.slice().sort(function(a, b) {
      var ta = new Date(a.ts).getTime();
      var tb = new Date(b.ts).getTime();
      return ta - tb;
    });
  }

  function buildRecording(messages) {
    var sorted = sortByTimestamp(messages);
    var startTime = sorted.length > 0 ? sorted[0].ts : null;
    var endTime = sorted.length > 0 ? sorted[sorted.length - 1].ts : null;
    var duration = 0;
    if (startTime && endTime) {
      duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    }
    return {
      messages: sorted,
      startTime: startTime,
      endTime: endTime,
      duration: duration
    };
  }

  // ============================================================
  // Recorder
  // ============================================================

  /**
   * createRecorder() — Returns a recorder object.
   * recorder.record(message) — add a protocol message
   * recorder.stop() → recording object {messages, startTime, endTime, duration}
   * recorder.export() → JSON string of the recording
   */
  function createRecorder() {
    var _messages = [];

    function record(message) {
      _messages.push(message);
    }

    function stop() {
      return buildRecording(_messages);
    }

    function exportRecording() {
      var recording = buildRecording(_messages);
      return JSON.stringify(recording);
    }

    return {
      record: record,
      stop: stop,
      export: exportRecording
    };
  }

  // ============================================================
  // Player
  // ============================================================

  /**
   * createPlayer(recording) — Returns a player object.
   *
   * player.play(callback, speed?) — start playback
   *   callback(message) is called for each message at the correct relative time
   *   speed is a multiplier (default 1); higher = faster
   * player.pause()
   * player.resume()
   * player.stop()
   * player.seek(timestamp) — jump to specific ISO timestamp
   * player.setSpeed(multiplier)
   * player.getProgress() → {current, total, percent, elapsed, remaining}
   * player.onComplete(callback)
   */
  function createPlayer(recording) {
    var _messages = recording.messages || [];
    var _speed = 1;
    var _currentIndex = 0;
    var _playing = false;
    var _paused = false;
    var _stopped = false;
    var _callback = null;
    var _completeCallback = null;
    var _timeoutId = null;

    // When we resume after a pause we need to know:
    // - which message comes next
    // - how much real time remains until that next message should fire
    var _resumeDelay = 0;

    // Elapsed virtual (recording) time consumed so far (ms)
    var _elapsedMs = 0;

    function onComplete(cb) {
      _completeCallback = cb;
    }

    function setSpeed(multiplier) {
      // Clamp to a minimum of 0.01 to prevent infinite loops
      _speed = Math.max(0.01, multiplier);
    }

    function getProgress() {
      var total = _messages.length;
      var current = Math.min(_currentIndex, total);
      var percent = total === 0 ? 100 : Math.round((current / total) * 100);
      var startMs = recording.startTime ? new Date(recording.startTime).getTime() : 0;
      var totalDuration = recording.duration || 0;
      // elapsed is how far into the recording we are in virtual time
      var elapsed = _elapsedMs;
      var remaining = Math.max(0, totalDuration - elapsed);
      return {
        current: current,
        total: total,
        percent: percent,
        elapsed: elapsed,
        remaining: remaining
      };
    }

    function seek(timestamp) {
      // Cancel any pending timeout
      if (_timeoutId !== null) {
        clearTimeout(_timeoutId);
        _timeoutId = null;
      }

      var seekMs = new Date(timestamp).getTime();
      var startMs = recording.startTime ? new Date(recording.startTime).getTime() : 0;

      // Find the first message whose timestamp is at or after seekMs.
      // Seeking to a timestamp positions playback to deliver messages
      // from that point forward (inclusive of exact matches).
      var idx = 0;
      for (var i = 0; i < _messages.length; i++) {
        var msgMs = new Date(_messages[i].ts).getTime();
        if (msgMs >= seekMs) {
          break;
        }
        idx = i + 1;
      }
      _currentIndex = idx;
      _elapsedMs = Math.max(0, seekMs - startMs);
    }

    function _scheduleNext() {
      if (_stopped || _paused) return;
      if (_currentIndex >= _messages.length) {
        // All done
        _playing = false;
        _elapsedMs = recording.duration || 0;
        if (_completeCallback) _completeCallback();
        return;
      }

      var startMs = recording.startTime ? new Date(recording.startTime).getTime() : 0;
      var nowMs = startMs + _elapsedMs;
      var nextMsg = _messages[_currentIndex];
      var nextMsgMs = new Date(nextMsg.ts).getTime();

      // How many virtual ms until the next message?
      var virtualDelay = Math.max(0, nextMsgMs - nowMs);
      // Convert to real ms
      var realDelay = virtualDelay / _speed;

      _timeoutId = setTimeout(function() {
        if (_stopped || _paused) return;
        _timeoutId = null;

        // Deliver the message
        var msg = _messages[_currentIndex];
        _elapsedMs = new Date(msg.ts).getTime() - startMs;
        _currentIndex++;

        if (_callback) _callback(msg);

        _scheduleNext();
      }, realDelay);
    }

    function play(callback, speed) {
      if (speed !== undefined) {
        setSpeed(speed);
      }
      _callback = callback;
      _playing = true;
      _paused = false;
      _stopped = false;

      if (_messages.length === 0) {
        // Nothing to play — immediately complete
        _playing = false;
        setTimeout(function() {
          if (_completeCallback) _completeCallback();
        }, 0);
        return;
      }

      // Reset to beginning (or wherever seek placed us)
      _scheduleNext();
    }

    function pause() {
      if (!_playing || _paused) return;
      _paused = true;

      // Cancel pending timeout and remember the remaining delay
      if (_timeoutId !== null) {
        clearTimeout(_timeoutId);
        _timeoutId = null;
      }

      // Calculate how much real-time is remaining until the next message
      // We track this via _resumeDelay for resume to use
      if (_currentIndex < _messages.length) {
        var startMs = recording.startTime ? new Date(recording.startTime).getTime() : 0;
        var nowMs = startMs + _elapsedMs;
        var nextMsgMs = new Date(_messages[_currentIndex].ts).getTime();
        var virtualRemaining = Math.max(0, nextMsgMs - nowMs);
        _resumeDelay = virtualRemaining / _speed;
      } else {
        _resumeDelay = 0;
      }
    }

    function resume() {
      if (!_paused) return;
      _paused = false;

      if (_currentIndex >= _messages.length) {
        _playing = false;
        if (_completeCallback) _completeCallback();
        return;
      }

      // Schedule using the remaining delay we saved at pause time
      var delay = _resumeDelay;
      var startMs = recording.startTime ? new Date(recording.startTime).getTime() : 0;

      _timeoutId = setTimeout(function() {
        if (_stopped || _paused) return;
        _timeoutId = null;

        var msg = _messages[_currentIndex];
        _elapsedMs = new Date(msg.ts).getTime() - startMs;
        _currentIndex++;

        if (_callback) _callback(msg);

        _scheduleNext();
      }, delay);
    }

    function stop() {
      _stopped = true;
      _playing = false;
      _paused = false;
      if (_timeoutId !== null) {
        clearTimeout(_timeoutId);
        _timeoutId = null;
      }
    }

    return {
      play: play,
      pause: pause,
      resume: resume,
      stop: stop,
      seek: seek,
      setSpeed: setSpeed,
      getProgress: getProgress,
      onComplete: onComplete
    };
  }

  // ============================================================
  // Import
  // ============================================================

  /**
   * importRecording(jsonString) — Parse a JSON string into a recording object.
   * Throws if the JSON is invalid or missing required fields.
   */
  function importRecording(jsonString) {
    var data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('importRecording: invalid JSON — ' + e.message);
    }
    if (!data || !Array.isArray(data.messages)) {
      throw new Error('importRecording: missing messages array');
    }
    // Re-sort and recompute to be safe
    return buildRecording(data.messages);
  }

  /**
   * importFromInbox(inboxDir) — Read all top-level *.json files from a
   * directory (Node.js only) and build a recording from them.
   * Each file should contain a single protocol message object.
   * Non-JSON files and subdirectories are ignored.
   */
  function importFromInbox(inboxDir) {
    var fs = require('fs');
    var path = require('path');

    var files;
    try {
      files = fs.readdirSync(inboxDir);
    } catch (e) {
      throw new Error('importFromInbox: cannot read directory — ' + e.message);
    }

    var messages = [];

    for (var i = 0; i < files.length; i++) {
      var filename = files[i];
      // Only process top-level .json files
      if (!filename.endsWith('.json')) continue;

      var filepath = path.join(inboxDir, filename);

      // Skip subdirectories
      var stat;
      try {
        stat = fs.statSync(filepath);
      } catch (e) {
        continue;
      }
      if (!stat.isFile()) continue;

      var content;
      try {
        content = fs.readFileSync(filepath, 'utf8');
      } catch (e) {
        continue; // Skip unreadable files
      }

      var msg;
      try {
        msg = JSON.parse(content);
      } catch (e) {
        continue; // Skip malformed JSON
      }

      // Must have a timestamp to be sortable
      if (!msg.ts) continue;

      messages.push(msg);
    }

    return buildRecording(messages);
  }

  // ============================================================
  // Exports
  // ============================================================

  exports.createRecorder = createRecorder;
  exports.createPlayer = createPlayer;
  exports.importRecording = importRecording;
  exports.importFromInbox = importFromInbox;

})(typeof module !== 'undefined' ? module.exports : (window.Replay = {}));
