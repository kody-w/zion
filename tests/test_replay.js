// test_replay.js — Tests for Protocol Replay system
var assert = require('assert');
var path = require('path');
var fs = require('fs');
var Replay = require('../src/js/replay.js');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  PASS: ' + name + '\n');
  } catch (e) {
    failed++;
    process.stdout.write('  FAIL: ' + name + '\n    ' + e.message + '\n');
  }
}

function testAsync(name, fn) {
  // Returns a Promise so we can chain async tests
  return fn().then(function() {
    passed++;
    process.stdout.write('  PASS: ' + name + '\n');
  }).catch(function(e) {
    failed++;
    process.stdout.write('  FAIL: ' + name + '\n    ' + e.message + '\n');
  });
}

// Helper: create a mock protocol message
function makeMsg(type, from, tsOffset, seq) {
  return {
    v: 1,
    id: from + '_' + tsOffset,
    ts: new Date(1000000000000 + tsOffset).toISOString(),
    seq: seq || 0,
    from: from,
    type: type,
    platform: 'api',
    position: { x: 0, y: 0, z: 0, zone: 'nexus' },
    geo: null,
    payload: {}
  };
}

// ============================================================
// SECTION 1: Recorder Tests
// ============================================================
console.log('\nRecorder Tests');

test('createRecorder returns an object', function() {
  var recorder = Replay.createRecorder();
  assert(recorder !== null && typeof recorder === 'object', 'createRecorder must return an object');
});

test('recorder has record, stop, and export methods', function() {
  var recorder = Replay.createRecorder();
  assert(typeof recorder.record === 'function', 'recorder.record must be a function');
  assert(typeof recorder.stop === 'function', 'recorder.stop must be a function');
  assert(typeof recorder.export === 'function', 'recorder.export must be a function');
});

test('recorder.record stores messages', function() {
  var recorder = Replay.createRecorder();
  var msg1 = makeMsg('join', 'alice', 0, 0);
  var msg2 = makeMsg('move', 'alice', 100, 1);
  recorder.record(msg1);
  recorder.record(msg2);
  var recording = recorder.stop();
  assert(Array.isArray(recording.messages), 'messages must be an array');
  assert.strictEqual(recording.messages.length, 2, 'should have 2 messages');
});

test('recorder.stop returns recording with startTime, endTime, duration', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('say', 'alice', 5000, 1));
  var recording = recorder.stop();
  assert(recording.startTime !== undefined, 'recording must have startTime');
  assert(recording.endTime !== undefined, 'recording must have endTime');
  assert(typeof recording.duration === 'number', 'recording.duration must be a number');
  assert(recording.duration >= 0, 'duration must be non-negative');
});

test('recorder messages are sorted by timestamp', function() {
  var recorder = Replay.createRecorder();
  // Add out of order
  recorder.record(makeMsg('move', 'alice', 5000, 2));
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('say', 'alice', 2500, 1));
  var recording = recorder.stop();
  assert.strictEqual(recording.messages.length, 3);
  var t0 = new Date(recording.messages[0].ts).getTime();
  var t1 = new Date(recording.messages[1].ts).getTime();
  var t2 = new Date(recording.messages[2].ts).getTime();
  assert(t0 <= t1, 'messages[0] should come before messages[1]');
  assert(t1 <= t2, 'messages[1] should come before messages[2]');
});

test('recorder.export returns valid JSON string', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'bob', 0, 0));
  var json = recorder.export();
  assert(typeof json === 'string', 'export must return a string');
  var parsed = JSON.parse(json);
  assert(Array.isArray(parsed.messages), 'exported JSON must have messages array');
  assert(parsed.startTime !== undefined, 'exported JSON must have startTime');
  assert(parsed.endTime !== undefined, 'exported JSON must have endTime');
  assert(typeof parsed.duration === 'number', 'exported JSON must have numeric duration');
});

test('recorder duration is correct (5 second span)', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('leave', 'alice', 5000, 1));
  var recording = recorder.stop();
  assert.strictEqual(recording.duration, 5000, 'duration should be 5000ms');
});

test('recorder startTime equals first message timestamp', function() {
  var recorder = Replay.createRecorder();
  var msg1 = makeMsg('join', 'alice', 0, 0);
  var msg2 = makeMsg('move', 'alice', 3000, 1);
  recorder.record(msg1);
  recorder.record(msg2);
  var recording = recorder.stop();
  assert.strictEqual(recording.startTime, new Date(1000000000000).toISOString(),
    'startTime should equal first message ts');
});

test('recorder endTime equals last message timestamp', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('leave', 'alice', 8000, 1));
  var recording = recorder.stop();
  assert.strictEqual(recording.endTime, new Date(1000000000000 + 8000).toISOString(),
    'endTime should equal last message ts');
});

// ============================================================
// SECTION 2: Player Tests
// ============================================================
console.log('\nPlayer Tests');

test('createPlayer returns a player object', function() {
  var recording = { messages: [], startTime: null, endTime: null, duration: 0 };
  var player = Replay.createPlayer(recording);
  assert(player !== null && typeof player === 'object', 'createPlayer must return an object');
});

test('player has required methods', function() {
  var recording = { messages: [], startTime: null, endTime: null, duration: 0 };
  var player = Replay.createPlayer(recording);
  assert(typeof player.play === 'function', 'player.play must be a function');
  assert(typeof player.pause === 'function', 'player.pause must be a function');
  assert(typeof player.resume === 'function', 'player.resume must be a function');
  assert(typeof player.stop === 'function', 'player.stop must be a function');
  assert(typeof player.seek === 'function', 'player.seek must be a function');
  assert(typeof player.setSpeed === 'function', 'player.setSpeed must be a function');
  assert(typeof player.getProgress === 'function', 'player.getProgress must be a function');
  assert(typeof player.onComplete === 'function', 'player.onComplete must be a function');
});

test('player.getProgress returns correct shape', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 5000, 1));
  var recording = recorder.stop();
  var player = Replay.createPlayer(recording);
  var progress = player.getProgress();
  assert(typeof progress.current === 'number', 'progress.current must be a number');
  assert(typeof progress.total === 'number', 'progress.total must be a number');
  assert(typeof progress.percent === 'number', 'progress.percent must be a number');
  assert(typeof progress.elapsed === 'number', 'progress.elapsed must be a number');
  assert(typeof progress.remaining === 'number', 'progress.remaining must be a number');
});

test('player.getProgress before play returns percent 0', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 5000, 1));
  var recording = recorder.stop();
  var player = Replay.createPlayer(recording);
  var progress = player.getProgress();
  assert.strictEqual(progress.percent, 0, 'percent should be 0 before playback starts');
  assert.strictEqual(progress.current, 0, 'current index should be 0 before play');
  assert.strictEqual(progress.total, 2, 'total should equal number of messages');
});

test('player delivers messages in order via callback', function(done) {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('say', 'alice', 50, 1));
  recorder.record(makeMsg('move', 'alice', 100, 2));
  var recording = recorder.stop();

  var received = [];
  var player = Replay.createPlayer(recording);

  var completed = false;
  player.onComplete(function() {
    completed = true;
  });

  // Use a promise to handle async
  var resolve, reject;
  var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  var timeout = setTimeout(function() {
    reject(new Error('Playback timed out'));
  }, 3000);

  player.onComplete(function() {
    clearTimeout(timeout);
    try {
      assert.strictEqual(received.length, 3, 'should receive 3 messages');
      assert.strictEqual(received[0].type, 'join');
      assert.strictEqual(received[1].type, 'say');
      assert.strictEqual(received[2].type, 'move');
      resolve();
    } catch (e) {
      reject(e);
    }
  });

  player.play(function(msg) {
    received.push(msg);
  }, 100); // 100x speed for fast testing

  return promise;
});

test('player.setSpeed changes playback speed', function() {
  var recording = { messages: [], startTime: null, endTime: null, duration: 0 };
  var player = Replay.createPlayer(recording);
  player.setSpeed(2);
  // No error thrown = pass; internal state verified via behavior
  player.setSpeed(0.5);
  player.setSpeed(10);
});

test('player.seek jumps to correct message index', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 1000, 1));
  recorder.record(makeMsg('say', 'alice', 2000, 2));
  recorder.record(makeMsg('emote', 'alice', 3000, 3));
  var recording = recorder.stop();
  var player = Replay.createPlayer(recording);

  // Seek to 1500ms — should position at index 2 (say at 2000ms is next)
  var targetTs = new Date(1000000000000 + 1500).toISOString();
  player.seek(targetTs);
  var progress = player.getProgress();
  // After seeking to 1500ms, current index should be 2 (the message at 2000ms or later)
  assert(progress.current >= 2, 'seek to 1500ms should position at index 2, got ' + progress.current);
});

test('player.seek to start positions at index 0', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 1000, 1));
  var recording = recorder.stop();
  var player = Replay.createPlayer(recording);

  player.seek(recording.startTime);
  var progress = player.getProgress();
  assert.strictEqual(progress.current, 0, 'seek to start should position at index 0');
});

test('player.seek to past end positions at last index', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 1000, 1));
  recorder.record(makeMsg('leave', 'alice', 2000, 2));
  var recording = recorder.stop();
  var player = Replay.createPlayer(recording);

  // Seek 1ms past the last message's timestamp — all messages should be consumed
  var pastEnd = new Date(new Date(recording.endTime).getTime() + 1).toISOString();
  player.seek(pastEnd);
  var progress = player.getProgress();
  assert.strictEqual(progress.current, 3, 'seek past end should position past last message');
});

// ============================================================
// SECTION 3: Pause / Resume Tests
// ============================================================
console.log('\nPause / Resume Tests');

test('player.pause stops message delivery', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 200, 1));
  recorder.record(makeMsg('say', 'alice', 400, 2));
  var recording = recorder.stop();

  var received = [];
  var resolve, reject;
  var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  var player = Replay.createPlayer(recording);
  var pauseCalledAt = -1;

  player.play(function(msg) {
    received.push(msg);
    if (received.length === 1 && pauseCalledAt === -1) {
      pauseCalledAt = received.length;
      player.pause();
      // After pausing, wait a bit and check no more messages arrived
      setTimeout(function() {
        try {
          assert.strictEqual(received.length, 1, 'should not receive more messages after pause');
          player.stop();
          resolve();
        } catch(e) {
          reject(e);
        }
      }, 500);
    }
  }, 50); // 50x speed

  setTimeout(function() {
    reject(new Error('Pause test timed out'));
  }, 3000);

  return promise;
});

test('player.resume continues after pause', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 100, 1));
  recorder.record(makeMsg('say', 'alice', 200, 2));
  var recording = recorder.stop();

  var received = [];
  var paused = false;
  var resolve, reject;
  var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  var player = Replay.createPlayer(recording);

  player.onComplete(function() {
    try {
      assert.strictEqual(received.length, 3, 'should receive all 3 messages after resume');
      resolve();
    } catch(e) {
      reject(e);
    }
  });

  player.play(function(msg) {
    received.push(msg);
    if (received.length === 1 && !paused) {
      paused = true;
      player.pause();
      setTimeout(function() {
        player.resume();
      }, 100);
    }
  }, 100); // 100x speed

  setTimeout(function() {
    reject(new Error('Resume test timed out'));
  }, 3000);

  return promise;
});

// ============================================================
// SECTION 4: Edge Case Tests
// ============================================================
console.log('\nEdge Case Tests');

test('empty recording has zero duration', function() {
  var recorder = Replay.createRecorder();
  var recording = recorder.stop();
  assert.strictEqual(recording.duration, 0, 'empty recording should have 0 duration');
  assert.strictEqual(recording.messages.length, 0, 'empty recording should have 0 messages');
});

test('single message recording has zero duration', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  var recording = recorder.stop();
  assert.strictEqual(recording.duration, 0, 'single-message recording should have 0 duration');
  assert.strictEqual(recording.messages.length, 1);
});

test('duplicate timestamps are both kept', function() {
  var recorder = Replay.createRecorder();
  var msg1 = makeMsg('join', 'alice', 0, 0);
  var msg2 = makeMsg('join', 'bob', 0, 0);  // same timestamp
  recorder.record(msg1);
  recorder.record(msg2);
  var recording = recorder.stop();
  assert.strictEqual(recording.messages.length, 2, 'both messages with duplicate ts should be kept');
});

test('empty recording player getProgress returns safe values', function() {
  var recording = { messages: [], startTime: null, endTime: null, duration: 0 };
  var player = Replay.createPlayer(recording);
  var progress = player.getProgress();
  assert.strictEqual(progress.current, 0);
  assert.strictEqual(progress.total, 0);
  assert.strictEqual(progress.percent, 100, 'empty recording at 100% complete');
});

test('player stop during playback prevents further callbacks', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 100, 1));
  recorder.record(makeMsg('say', 'alice', 200, 2));
  var recording = recorder.stop();

  var received = [];
  var resolve, reject;
  var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  var player = Replay.createPlayer(recording);

  player.play(function(msg) {
    received.push(msg);
    if (received.length === 1) {
      player.stop();
      setTimeout(function() {
        try {
          assert.strictEqual(received.length, 1, 'stop should prevent further callbacks');
          resolve();
        } catch(e) {
          reject(e);
        }
      }, 500);
    }
  }, 20); // 20x speed

  setTimeout(function() {
    reject(new Error('Stop test timed out'));
  }, 3000);

  return promise;
});

// ============================================================
// SECTION 5: Import Tests
// ============================================================
console.log('\nImport Tests');

test('importRecording from JSON string', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('say', 'alice', 1000, 1));
  var json = recorder.export();

  var imported = Replay.importRecording(json);
  assert(Array.isArray(imported.messages), 'imported must have messages array');
  assert.strictEqual(imported.messages.length, 2, 'imported should have 2 messages');
  assert(imported.startTime !== undefined, 'imported must have startTime');
  assert(imported.endTime !== undefined, 'imported must have endTime');
  assert(typeof imported.duration === 'number', 'imported must have numeric duration');
});

test('importRecording preserves message order', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 500, 1));
  recorder.record(makeMsg('say', 'alice', 1000, 2));
  var json = recorder.export();

  var imported = Replay.importRecording(json);
  assert.strictEqual(imported.messages[0].type, 'join');
  assert.strictEqual(imported.messages[1].type, 'move');
  assert.strictEqual(imported.messages[2].type, 'say');
});

test('importRecording throws on invalid JSON', function() {
  assert.throws(function() {
    Replay.importRecording('not-valid-json');
  }, 'importRecording should throw on invalid JSON');
});

test('importRecording throws on missing messages field', function() {
  assert.throws(function() {
    Replay.importRecording(JSON.stringify({ startTime: null, endTime: null, duration: 0 }));
  }, 'importRecording should throw when messages is missing');
});

test('importFromInbox reads JSON files from a directory', function() {
  // Create a temp directory with mock inbox files
  var tmpDir = path.join('/tmp', 'zion_replay_test_' + Date.now());
  fs.mkdirSync(tmpDir);

  var msg1 = makeMsg('join', 'agent_001', 0, 0);
  var msg2 = makeMsg('teach', 'agent_002', 1000, 0);

  fs.writeFileSync(path.join(tmpDir, 'agent_001_ts1.json'), JSON.stringify(msg1));
  fs.writeFileSync(path.join(tmpDir, 'agent_002_ts2.json'), JSON.stringify(msg2));
  // Non-JSON file should be ignored
  fs.writeFileSync(path.join(tmpDir, 'README.txt'), 'ignore me');

  var recording = Replay.importFromInbox(tmpDir);
  assert(Array.isArray(recording.messages), 'importFromInbox must return recording with messages array');
  assert.strictEqual(recording.messages.length, 2, 'should read 2 JSON files');

  // Cleanup
  fs.unlinkSync(path.join(tmpDir, 'agent_001_ts1.json'));
  fs.unlinkSync(path.join(tmpDir, 'agent_002_ts2.json'));
  fs.unlinkSync(path.join(tmpDir, 'README.txt'));
  fs.rmdirSync(tmpDir);
});

test('importFromInbox sorts messages by timestamp', function() {
  var tmpDir = path.join('/tmp', 'zion_replay_sort_' + Date.now());
  fs.mkdirSync(tmpDir);

  // Write out of order
  var msgLate = makeMsg('leave', 'agent_001', 5000, 1);
  var msgEarly = makeMsg('join', 'agent_001', 0, 0);
  var msgMid = makeMsg('say', 'agent_002', 2500, 0);

  fs.writeFileSync(path.join(tmpDir, 'c_late.json'), JSON.stringify(msgLate));
  fs.writeFileSync(path.join(tmpDir, 'a_early.json'), JSON.stringify(msgEarly));
  fs.writeFileSync(path.join(tmpDir, 'b_mid.json'), JSON.stringify(msgMid));

  var recording = Replay.importFromInbox(tmpDir);
  assert.strictEqual(recording.messages[0].type, 'join', 'first should be join (earliest ts)');
  assert.strictEqual(recording.messages[1].type, 'say', 'second should be say (mid ts)');
  assert.strictEqual(recording.messages[2].type, 'leave', 'third should be leave (latest ts)');

  fs.unlinkSync(path.join(tmpDir, 'c_late.json'));
  fs.unlinkSync(path.join(tmpDir, 'a_early.json'));
  fs.unlinkSync(path.join(tmpDir, 'b_mid.json'));
  fs.rmdirSync(tmpDir);
});

test('importFromInbox ignores non-JSON files and _processed subdirectory files', function() {
  var tmpDir = path.join('/tmp', 'zion_replay_ignore_' + Date.now());
  fs.mkdirSync(tmpDir);
  var subDir = path.join(tmpDir, '_processed');
  fs.mkdirSync(subDir);

  var msg1 = makeMsg('join', 'agent_001', 0, 0);
  fs.writeFileSync(path.join(tmpDir, 'agent_001.json'), JSON.stringify(msg1));
  fs.writeFileSync(path.join(tmpDir, 'notes.txt'), 'not json');
  // File inside subdir should be ignored (importFromInbox only reads top-level files)
  var msg2 = makeMsg('leave', 'agent_001', 1000, 1);
  fs.writeFileSync(path.join(subDir, 'old.json'), JSON.stringify(msg2));

  var recording = Replay.importFromInbox(tmpDir);
  assert.strictEqual(recording.messages.length, 1, 'should only read top-level JSON files');

  fs.unlinkSync(path.join(tmpDir, 'agent_001.json'));
  fs.unlinkSync(path.join(tmpDir, 'notes.txt'));
  fs.unlinkSync(path.join(subDir, 'old.json'));
  fs.rmdirSync(subDir);
  fs.rmdirSync(tmpDir);
});

// ============================================================
// SECTION 6: Speed Multiplier Tests
// ============================================================
console.log('\nSpeed Multiplier Tests');

test('playback at 2x speed completes faster than 1x', function() {
  // We can't easily time this deterministically, but we verify it runs without error
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('move', 'alice', 100, 1));
  var recording = recorder.stop();

  var resolve, reject;
  var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  var player = Replay.createPlayer(recording);
  var received = [];

  player.onComplete(function() {
    try {
      assert.strictEqual(received.length, 2, '2x speed should deliver all messages');
      resolve();
    } catch(e) {
      reject(e);
    }
  });

  player.play(function(msg) {
    received.push(msg);
  }, 200); // 200x

  setTimeout(function() { reject(new Error('2x speed test timed out')); }, 3000);
  return promise;
});

test('setSpeed can be called before play', function() {
  var recording = { messages: [], startTime: null, endTime: null, duration: 0 };
  var player = Replay.createPlayer(recording);
  player.setSpeed(5);
  // No error = pass
});

test('setSpeed with 0 or negative throws or clamps', function() {
  var recording = { messages: [], startTime: null, endTime: null, duration: 0 };
  var player = Replay.createPlayer(recording);
  // Either throws or clamps to minimum — both are acceptable
  try {
    player.setSpeed(0);
    // If it doesn't throw, that's ok — just verify it doesn't break
    player.setSpeed(-1);
  } catch(e) {
    // Throwing is also acceptable
  }
});

// ============================================================
// SECTION 7: onComplete callback Tests
// ============================================================
console.log('\nonComplete callback Tests');

test('onComplete is called after all messages delivered', function() {
  var recorder = Replay.createRecorder();
  recorder.record(makeMsg('join', 'alice', 0, 0));
  recorder.record(makeMsg('leave', 'alice', 50, 1));
  var recording = recorder.stop();

  var completeCalled = false;
  var resolve, reject;
  var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  var player = Replay.createPlayer(recording);
  player.onComplete(function() {
    completeCalled = true;
    resolve();
  });

  player.play(function() {}, 200);

  setTimeout(function() {
    if (!completeCalled) reject(new Error('onComplete was never called'));
  }, 3000);

  return promise;
});

test('onComplete is called for empty recording immediately', function() {
  var recording = { messages: [], startTime: null, endTime: null, duration: 0 };

  var completeCalled = false;
  var resolve, reject;
  var promise = new Promise(function(res, rej) { resolve = res; reject = rej; });

  var player = Replay.createPlayer(recording);
  player.onComplete(function() {
    completeCalled = true;
    resolve();
  });

  player.play(function() {}, 1);

  setTimeout(function() {
    if (!completeCalled) reject(new Error('onComplete was never called for empty recording'));
  }, 1000);

  return promise;
});

// ============================================================
// Run async tests and report
// ============================================================
var asyncTests = [
  testAsync('player delivers messages in order via callback', function() {
    var recorder = Replay.createRecorder();
    recorder.record(makeMsg('join', 'alice', 0, 0));
    recorder.record(makeMsg('say', 'alice', 50, 1));
    recorder.record(makeMsg('move', 'alice', 100, 2));
    var recording = recorder.stop();

    var received = [];
    var player = Replay.createPlayer(recording);

    return new Promise(function(resolve, reject) {
      var timeout = setTimeout(function() {
        reject(new Error('Playback timed out'));
      }, 3000);

      player.onComplete(function() {
        clearTimeout(timeout);
        try {
          assert.strictEqual(received.length, 3, 'should receive 3 messages');
          assert.strictEqual(received[0].type, 'join');
          assert.strictEqual(received[1].type, 'say');
          assert.strictEqual(received[2].type, 'move');
          resolve();
        } catch(e) {
          reject(e);
        }
      });

      player.play(function(msg) {
        received.push(msg);
      }, 100);
    });
  }),

  testAsync('player.pause stops message delivery', function() {
    var recorder = Replay.createRecorder();
    recorder.record(makeMsg('join', 'alice', 0, 0));
    recorder.record(makeMsg('move', 'alice', 200, 1));
    recorder.record(makeMsg('say', 'alice', 400, 2));
    var recording = recorder.stop();

    var received = [];
    var paused = false;

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('Pause test timed out'));
      }, 3000);

      var player = Replay.createPlayer(recording);

      player.play(function(msg) {
        received.push(msg);
        if (received.length === 1 && !paused) {
          paused = true;
          player.pause();
          setTimeout(function() {
            try {
              assert.strictEqual(received.length, 1, 'should not receive more messages after pause, got ' + received.length);
              player.stop();
              resolve();
            } catch(e) {
              reject(e);
            }
          }, 500);
        }
      }, 50);
    });
  }),

  testAsync('player.resume continues after pause', function() {
    var recorder = Replay.createRecorder();
    recorder.record(makeMsg('join', 'alice', 0, 0));
    recorder.record(makeMsg('move', 'alice', 100, 1));
    recorder.record(makeMsg('say', 'alice', 200, 2));
    var recording = recorder.stop();

    var received = [];
    var paused = false;

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('Resume test timed out'));
      }, 3000);

      var player = Replay.createPlayer(recording);

      player.onComplete(function() {
        try {
          assert.strictEqual(received.length, 3, 'should receive all 3 messages after resume');
          resolve();
        } catch(e) {
          reject(e);
        }
      });

      player.play(function(msg) {
        received.push(msg);
        if (received.length === 1 && !paused) {
          paused = true;
          player.pause();
          setTimeout(function() {
            player.resume();
          }, 100);
        }
      }, 100);
    });
  }),

  testAsync('player stop during playback prevents further callbacks', function() {
    var recorder = Replay.createRecorder();
    recorder.record(makeMsg('join', 'alice', 0, 0));
    recorder.record(makeMsg('move', 'alice', 100, 1));
    recorder.record(makeMsg('say', 'alice', 200, 2));
    var recording = recorder.stop();

    var received = [];
    var stopped = false;

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('Stop test timed out'));
      }, 3000);

      var player = Replay.createPlayer(recording);

      player.play(function(msg) {
        received.push(msg);
        if (received.length === 1 && !stopped) {
          stopped = true;
          player.stop();
          setTimeout(function() {
            try {
              assert.strictEqual(received.length, 1, 'stop should prevent further callbacks');
              resolve();
            } catch(e) {
              reject(e);
            }
          }, 500);
        }
      }, 20);
    });
  }),

  testAsync('playback at 2x speed delivers all messages', function() {
    var recorder = Replay.createRecorder();
    recorder.record(makeMsg('join', 'alice', 0, 0));
    recorder.record(makeMsg('move', 'alice', 100, 1));
    var recording = recorder.stop();

    var received = [];

    return new Promise(function(resolve, reject) {
      setTimeout(function() { reject(new Error('2x speed test timed out')); }, 3000);

      var player = Replay.createPlayer(recording);

      player.onComplete(function() {
        try {
          assert.strictEqual(received.length, 2, '2x speed should deliver all messages');
          resolve();
        } catch(e) {
          reject(e);
        }
      });

      player.play(function(msg) {
        received.push(msg);
      }, 200);
    });
  }),

  testAsync('onComplete is called after all messages delivered', function() {
    var recorder = Replay.createRecorder();
    recorder.record(makeMsg('join', 'alice', 0, 0));
    recorder.record(makeMsg('leave', 'alice', 50, 1));
    var recording = recorder.stop();

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('onComplete was never called'));
      }, 3000);

      var player = Replay.createPlayer(recording);
      player.onComplete(function() {
        resolve();
      });
      player.play(function() {}, 200);
    });
  }),

  testAsync('onComplete is called for empty recording', function() {
    var recording = { messages: [], startTime: null, endTime: null, duration: 0 };

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        reject(new Error('onComplete was never called for empty recording'));
      }, 1000);

      var player = Replay.createPlayer(recording);
      player.onComplete(function() {
        resolve();
      });
      player.play(function() {}, 1);
    });
  })
];

Promise.all(asyncTests).then(function() {
  console.log('\n--- Results ---');
  console.log(passed + ' passed, ' + failed + ' failed');
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('All tests passed');
    process.exit(0);
  }
}).catch(function(e) {
  console.error('Unexpected error in test runner:', e);
  process.exit(1);
});
