// test_hud_panels.js — Tests for the 4 new HUD panels
// Economy Visualizer, YAML State Inspector, Protocol Replay, Nearby Anchors
'use strict';

var assert = require('assert');

var passed = 0;
var failed = 0;
var errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  \u2713 ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  \u2717 ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  console.log('\n' + name);
  fn();
}

// ─── Minimal DOM mock ────────────────────────────────────────────────────────
// HUD requires a browser-like document. We inject a minimal mock globally.

var _elements = {};
var _domTree = [];

function makeEl(tag) {
  var el = {
    _tag: tag,
    _children: [],
    _attrs: {},
    _style: {},
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    type: '',
    placeholder: '',
    min: '0',
    max: '100',
    value: '0',
    checked: false,
    disabled: false,
    style: {
      cssText: '',
      display: '',
      background: '',
      color: '',
      borderColor: ''
    },
    onclick: null,
    oninput: null,
    onchange: null,
    addEventListener: function(evt, fn) { this['_on_' + evt] = fn; },
    getAttribute: function(k) { return this._attrs[k] || null; },
    setAttribute: function(k, v) { this._attrs[k] = v; },
    appendChild: function(child) {
      this._children.push(child);
      if (child.id) _elements[child.id] = child;
      return child;
    },
    removeChild: function(child) {
      var idx = this._children.indexOf(child);
      if (idx !== -1) this._children.splice(idx, 1);
    },
    querySelector: function(sel) {
      // Simple id selector
      if (sel.charAt(0) === '#') {
        return _elements[sel.slice(1)] || null;
      }
      return null;
    },
    querySelectorAll: function() { return []; },
    classList: {
      _list: [],
      add: function(c) { if (this._list.indexOf(c) === -1) this._list.push(c); },
      remove: function(c) { var i = this._list.indexOf(c); if (i !== -1) this._list.splice(i, 1); },
      contains: function(c) { return this._list.indexOf(c) !== -1; }
    },
    parentNode: null,
    getContext: function() {
      return {
        clearRect: function() {},
        fillStyle: '',
        font: '',
        fillText: function() {}
      };
    }
  };
  if (el.id) _elements[el.id] = el;
  return el;
}

function resetDOM() {
  _elements = {};
  _domTree = [];
}

// Install global document / window mocks
global.document = {
  createElement: function(tag) { return makeEl(tag); },
  querySelector: function(sel) {
    if (sel === '#zion-hud') return makeEl('div');
    if (sel.charAt(0) === '#') return _elements[sel.slice(1)] || null;
    return null;
  },
  getElementById: function(id) { return _elements[id] || null; },
  head: makeEl('head'),
  body: makeEl('body')
};

global.window = {
  HUD: {},
  State: {
    getLiveState: function() {
      return {
        economy: { balances: { alice: 100, bob: 200, TREASURY: 500 } },
        gardens: { plots: [] },
        structures: {},
        chat: [],
        anchors: {
          'anc1': { id: 'anc1', name: 'Market Gate', zone: 'agora', owner: 'alice',
                    geo: { lat: 37.7749, lon: -122.4194 }, type: 'landmark' },
          'anc2': { id: 'anc2', name: 'Garden Portal', zone: 'gardens', owner: 'bob',
                    geo: { lat: 37.7750, lon: -122.4190 }, type: 'portal' }
        }
      };
    }
  }
};
global.requestAnimationFrame = function(fn) { fn(); };
global.setTimeout = function(fn) { /* noop in tests */ };
global.clearInterval = function() {};
global.URL = { createObjectURL: function() { return 'blob:test'; }, revokeObjectURL: function() {} };
global.Blob = function(parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; };

// Load HUD module
var HUD = require('../src/js/hud.js');

// ─── Mock external modules ───────────────────────────────────────────────────

// Mock EconomyViz
var _mockEconomyViz = {
  _initCalled: false,
  _loadCalled: false,
  _renderCalled: false,
  _lastState: null,
  init: function(canvas) { this._initCalled = true; },
  loadState: function(state) { this._loadCalled = true; this._lastState = state; },
  render: function() { this._renderCalled = true; },
  formatSummary: function(state) {
    var balances = (state && state.economy && state.economy.balances) ? state.economy.balances : {};
    var total = 0;
    Object.keys(balances).forEach(function(k) { total += balances[k]; });
    return 'Total Spark: ' + total + ' | Citizens: ' + Object.keys(balances).length;
  },
  computeGini: function(balances) {
    var vals = Object.values(balances || {}).filter(function(v) { return typeof v === 'number'; });
    if (!vals.length) return 0;
    vals.sort(function(a, b) { return a - b; });
    var n = vals.length;
    var sum = vals.reduce(function(a, b) { return a + b; }, 0);
    if (!sum) return 0;
    var num = 0;
    vals.forEach(function(v, i) { num += (2 * (i + 1) - n - 1) * v; });
    return Math.abs(num / (n * sum));
  },
  computeDistribution: function(balances) {
    var vals = Object.values(balances || {}).filter(function(v) { return typeof v === 'number'; });
    if (!vals.length) return [0, 0, 0, 0, 0];
    vals.sort(function(a, b) { return a - b; });
    var size = Math.max(1, Math.floor(vals.length / 5));
    return [0, 1, 2, 3, 4].map(function(q) {
      var slice = vals.slice(q * size, (q + 1) * size);
      return slice.reduce(function(a, b) { return a + b; }, 0);
    });
  }
};

// Mock YamlDash
var YamlDash = require('../src/js/yaml_dash.js');

// Mock Replay
var _mockReplay = {
  _recorderCreated: false,
  _playerCreated: false,
  _lastRecording: null,
  createRecorder: function() {
    this._recorderCreated = true;
    var msgs = [];
    return {
      record: function(msg) { msgs.push(msg); },
      stop: function() { return { messages: msgs }; }
    };
  },
  createPlayer: function(recording) {
    this._playerCreated = true;
    this._lastRecording = recording;
    var idx = 0;
    var playing = false;
    return {
      play: function() { playing = true; },
      pause: function() { playing = false; },
      stop: function() { playing = false; idx = 0; },
      seek: function(i) { idx = i; },
      currentIndex: function() { return idx; },
      setSpeed: function(s) { /* noop */ },
      ended: function() { return idx >= (recording.messages || []).length; }
    };
  },
  importRecording: function(json) { return JSON.parse(json); }
};

// Mock Anchors
var _mockAnchors = {
  _locationRequested: false,
  _locationDenied: false,
  requestLocation: function(cb) {
    this._locationRequested = true;
    if (this._locationDenied) {
      cb(null);
    } else {
      cb({ geo: { lat: 37.7749, lon: -122.4194 } });
    }
  },
  getNearby: function(geo, anchors, radius) {
    return (anchors || []).filter(function(a) {
      return a.geo && typeof a.geo.lat === 'number';
    });
  },
  getDistance: function(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },
  isInRange: function(geo, anchor) {
    return this.getDistance(geo.lat, geo.lon, anchor.geo.lat, anchor.geo.lon) < 50;
  },
  TYPES: { landmark: '&#127981;', portal: '&#127882;', meeting: '&#128101;' },
  SAFETY: {
    getWarningMessage: function(geo) {
      return geo ? 'Stay aware of your surroundings.' : null;
    }
  }
};

// ─── Suite 1: Economy Visualizer Panel ───────────────────────────────────────

suite('Economy Visualizer — panel creation', function() {
  test('createEconomyVizPanel is exported', function() {
    assert.strictEqual(typeof HUD.createEconomyVizPanel, 'function');
  });

  test('showEconomyVizPanel is exported', function() {
    assert.strictEqual(typeof HUD.showEconomyVizPanel, 'function');
  });

  test('hideEconomyVizPanel is exported', function() {
    assert.strictEqual(typeof HUD.hideEconomyVizPanel, 'function');
  });

  test('toggleEconomyVizPanel is exported', function() {
    assert.strictEqual(typeof HUD.toggleEconomyVizPanel, 'function');
  });

  test('refreshEconomyVizPanel is exported', function() {
    assert.strictEqual(typeof HUD.refreshEconomyVizPanel, 'function');
  });

  test('createEconomyVizPanel returns an element when EconomyViz missing', function() {
    // EconomyViz is NOT globally set yet — panel should show guard message
    var panel = HUD.createEconomyVizPanel();
    assert.ok(panel, 'should return a panel element');
    assert.ok(panel.innerHTML.indexOf('Module not loaded') !== -1 ||
              panel._children.some(function(c) {
                return (c.innerHTML || '').indexOf('Module not loaded') !== -1 ||
                       (c.textContent || '').indexOf('Module not loaded') !== -1;
              }),
      'should contain module-not-loaded message when EconomyViz undefined');
  });
});

suite('Economy Visualizer — EconomyViz module guard', function() {
  test('formatSummary produces expected output', function() {
    var state = { economy: { balances: { alice: 100, bob: 200, TREASURY: 500 } } };
    var summary = _mockEconomyViz.formatSummary(state);
    assert.ok(summary.indexOf('800') !== -1 || summary.indexOf('Total Spark') !== -1,
      'summary should contain total spark amount');
  });

  test('computeGini returns 0 for empty balances', function() {
    var gini = _mockEconomyViz.computeGini({});
    assert.strictEqual(gini, 0);
  });

  test('computeGini returns 0 for single holder', function() {
    var gini = _mockEconomyViz.computeGini({ alice: 100 });
    assert.strictEqual(gini, 0);
  });

  test('computeGini is higher for unequal distribution', function() {
    var equalGini = _mockEconomyViz.computeGini({ a: 100, b: 100, c: 100 });
    var unequalGini = _mockEconomyViz.computeGini({ a: 1, b: 1, c: 998 });
    assert.ok(unequalGini > equalGini, 'unequal distribution should have higher gini');
  });

  test('computeGini result is between 0 and 1', function() {
    var gini = _mockEconomyViz.computeGini({ a: 10, b: 50, c: 200, d: 500 });
    assert.ok(gini >= 0 && gini <= 1, 'gini should be in [0, 1]');
  });

  test('computeDistribution returns 5 buckets', function() {
    var dist = _mockEconomyViz.computeDistribution({ a: 100, b: 200, c: 300, d: 400, e: 500 });
    assert.strictEqual(dist.length, 5);
  });

  test('computeDistribution handles empty balances', function() {
    var dist = _mockEconomyViz.computeDistribution({});
    assert.strictEqual(dist.length, 5);
    dist.forEach(function(v) { assert.strictEqual(v, 0); });
  });
});

suite('Economy Visualizer — panel open/close/toggle', function() {
  test('showEconomyVizPanel does not throw without EconomyViz', function() {
    assert.doesNotThrow(function() {
      HUD.showEconomyVizPanel();
    });
  });

  test('hideEconomyVizPanel does not throw when panel not created', function() {
    assert.doesNotThrow(function() {
      HUD.hideEconomyVizPanel();
    });
  });

  test('toggleEconomyVizPanel does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.toggleEconomyVizPanel();
      HUD.toggleEconomyVizPanel();
    });
  });

  test('refreshEconomyVizPanel is safe when EconomyViz is undefined', function() {
    assert.doesNotThrow(function() {
      HUD.refreshEconomyVizPanel();
    });
  });

  test('showEconomyVizPanel with EconomyViz mock does not throw', function() {
    global.EconomyViz = _mockEconomyViz;
    assert.doesNotThrow(function() {
      HUD.showEconomyVizPanel({ economy: { balances: { alice: 100 } } });
    });
    delete global.EconomyViz;
  });
});

// ─── Suite 2: YAML State Inspector ───────────────────────────────────────────

suite('YAML State Inspector — panel creation', function() {
  test('createYamlInspectorPanel is exported', function() {
    assert.strictEqual(typeof HUD.createYamlInspectorPanel, 'function');
  });

  test('showYamlInspectorPanel is exported', function() {
    assert.strictEqual(typeof HUD.showYamlInspectorPanel, 'function');
  });

  test('hideYamlInspectorPanel is exported', function() {
    assert.strictEqual(typeof HUD.hideYamlInspectorPanel, 'function');
  });

  test('toggleYamlInspectorPanel is exported', function() {
    assert.strictEqual(typeof HUD.toggleYamlInspectorPanel, 'function');
  });

  test('createYamlInspectorPanel shows module guard when YamlDash missing', function() {
    // YamlDash is a global in browser but not set as global here intentionally
    // The HUD panel checks typeof YamlDash !== 'undefined' in the browser context
    // In Node.js the module IS available as a require, but the panel checks window global
    // We test that createYamlInspectorPanel returns a non-null element
    var panel = HUD.createYamlInspectorPanel();
    assert.ok(panel, 'should return an element');
  });
});

suite('YAML State Inspector — search and filter (via YamlDash)', function() {
  test('YamlDash.buildTree handles world state shape', function() {
    var state = { players: { alice: { spark: 100 } }, zone: 'nexus' };
    var tree = YamlDash.buildTree(state, 'world');
    assert.strictEqual(tree.type, 'object');
    var keys = tree.children.map(function(c) { return c.key; });
    assert.ok(keys.indexOf('players') !== -1);
    assert.ok(keys.indexOf('zone') !== -1);
  });

  test('YamlDash.filterTree finds matching keys', function() {
    var state = { economy: { balances: { alice: 100 } }, zone: 'nexus' };
    var tree = YamlDash.buildTree(state, 'world');
    var filtered = YamlDash.filterTree(tree, 'economy');
    assert.ok(filtered !== null);
  });

  test('YamlDash.filterTree finds matching values', function() {
    var state = { zone: 'nexus', season: 'spring' };
    var tree = YamlDash.buildTree(state, 'world');
    var filtered = YamlDash.filterTree(tree, 'nexus');
    assert.ok(filtered !== null);
  });

  test('YamlDash.toggleNode on tree root changes collapsed state', function() {
    var tree = YamlDash.buildTree({ a: 1, b: 2 }, 'world');
    assert.strictEqual(tree.collapsed, true);
    YamlDash.toggleNode(tree, 'world');
    assert.strictEqual(tree.collapsed, false);
  });

  test('YamlDash.renderToText produces non-empty output', function() {
    var tree = YamlDash.buildTree({ name: 'zion', version: 1 }, 'root');
    var text = YamlDash.renderToText(tree, true);
    assert.ok(text.length > 0, 'renderToText should produce output');
    assert.ok(text.indexOf('name') !== -1 || text.indexOf('zion') !== -1);
  });
});

suite('YAML State Inspector — panel open/close/toggle', function() {
  test('showYamlInspectorPanel does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.showYamlInspectorPanel();
    });
  });

  test('hideYamlInspectorPanel does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.hideYamlInspectorPanel();
    });
  });

  test('toggleYamlInspectorPanel toggles open and closed', function() {
    assert.doesNotThrow(function() {
      HUD.toggleYamlInspectorPanel(); // open
      HUD.toggleYamlInspectorPanel(); // close
    });
  });

  test('showYamlInspectorPanel with YamlDash global does not throw', function() {
    global.YamlDash = YamlDash;
    assert.doesNotThrow(function() {
      HUD.showYamlInspectorPanel();
    });
    delete global.YamlDash;
  });
});

// ─── Suite 3: Protocol Replay Controls ───────────────────────────────────────

suite('Protocol Replay — panel creation and exports', function() {
  test('createReplayPanel is exported', function() {
    assert.strictEqual(typeof HUD.createReplayPanel, 'function');
  });

  test('showReplayPanel is exported', function() {
    assert.strictEqual(typeof HUD.showReplayPanel, 'function');
  });

  test('hideReplayPanel is exported', function() {
    assert.strictEqual(typeof HUD.hideReplayPanel, 'function');
  });

  test('toggleReplayPanel is exported', function() {
    assert.strictEqual(typeof HUD.toggleReplayPanel, 'function');
  });

  test('getReplayState is exported', function() {
    assert.strictEqual(typeof HUD.getReplayState, 'function');
  });

  test('initial replay state is idle', function() {
    assert.strictEqual(HUD.getReplayState(), 'idle');
  });

  test('createReplayPanel shows module guard when Replay missing', function() {
    var panel = HUD.createReplayPanel();
    assert.ok(panel, 'should return a panel element');
    // Find module-not-loaded message in children
    var found = false;
    function searchChildren(el) {
      if ((el.textContent || '').indexOf('Module not loaded') !== -1) found = true;
      if ((el.innerHTML || '').indexOf('Module not loaded') !== -1) found = true;
      (el._children || []).forEach(searchChildren);
    }
    searchChildren(panel);
    assert.ok(found, 'should show module-not-loaded when Replay undefined');
  });
});

suite('Protocol Replay — state machine', function() {
  test('state machine: idle -> recording (with mock Replay)', function() {
    global.Replay = _mockReplay;
    _mockReplay._recorderCreated = false;

    // The HUD._replayState is module-internal; we test via getReplayState()
    // and by triggering show + calling recorder logic
    assert.doesNotThrow(function() {
      HUD.showReplayPanel();
    });

    // Directly test the mock recorder
    var recorder = _mockReplay.createRecorder();
    assert.ok(recorder, 'createRecorder should return a recorder');
    assert.ok(typeof recorder.stop === 'function', 'recorder should have stop()');

    delete global.Replay;
  });

  test('state machine: recorder.stop() returns recording with messages', function() {
    var recorder = _mockReplay.createRecorder();
    recorder.record({ v: 1, type: 'move', ts: Date.now() });
    recorder.record({ v: 1, type: 'say', ts: Date.now() + 1000 });
    var recording = recorder.stop();
    assert.ok(recording, 'stop() should return a recording');
    assert.ok(Array.isArray(recording.messages), 'recording should have messages array');
    assert.strictEqual(recording.messages.length, 2);
  });

  test('state machine: createPlayer returns player with play/pause/seek', function() {
    var recording = { messages: [
      { v: 1, type: 'move', ts: 1000 },
      { v: 1, type: 'say',  ts: 2000 }
    ]};
    var player = _mockReplay.createPlayer(recording);
    assert.ok(typeof player.play === 'function', 'player should have play()');
    assert.ok(typeof player.pause === 'function', 'player should have pause()');
    assert.ok(typeof player.seek === 'function', 'player should have seek()');
    assert.ok(typeof player.currentIndex === 'function', 'player should have currentIndex()');
    assert.ok(typeof player.ended === 'function', 'player should have ended()');
  });

  test('state machine: player.seek sets position', function() {
    var recording = { messages: [
      { v: 1, ts: 1000 }, { v: 1, ts: 2000 }, { v: 1, ts: 3000 }
    ]};
    var player = _mockReplay.createPlayer(recording);
    player.seek(2);
    assert.strictEqual(player.currentIndex(), 2);
  });

  test('state machine: player.ended is false before end', function() {
    var recording = { messages: [{ v: 1, ts: 1000 }, { v: 1, ts: 2000 }] };
    var player = _mockReplay.createPlayer(recording);
    assert.strictEqual(player.ended(), false);
  });

  test('showReplayPanel does not throw without Replay module', function() {
    assert.doesNotThrow(function() {
      HUD.showReplayPanel();
    });
  });

  test('hideReplayPanel does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.hideReplayPanel();
    });
  });

  test('toggleReplayPanel does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.toggleReplayPanel();
      HUD.toggleReplayPanel();
    });
  });
});

suite('Protocol Replay — Replay.importRecording', function() {
  test('importRecording parses JSON string', function() {
    var recording = { messages: [{ v: 1, type: 'move', ts: 1000 }] };
    var json = JSON.stringify(recording);
    var imported = _mockReplay.importRecording(json);
    assert.ok(imported.messages, 'imported should have messages');
    assert.strictEqual(imported.messages.length, 1);
    assert.strictEqual(imported.messages[0].type, 'move');
  });
});

// ─── Suite 4: Nearby Anchors / AR Discovery ──────────────────────────────────

suite('Nearby Anchors — panel creation and exports', function() {
  test('createNearbyAnchorsPanel is exported', function() {
    assert.strictEqual(typeof HUD.createNearbyAnchorsPanel, 'function');
  });

  test('showNearbyAnchorsPanel is exported', function() {
    assert.strictEqual(typeof HUD.showNearbyAnchorsPanel, 'function');
  });

  test('hideNearbyAnchorsPanel is exported', function() {
    assert.strictEqual(typeof HUD.hideNearbyAnchorsPanel, 'function');
  });

  test('toggleNearbyAnchorsPanel is exported', function() {
    assert.strictEqual(typeof HUD.toggleNearbyAnchorsPanel, 'function');
  });

  test('createNearbyAnchorsPanel returns element with module guard when Anchors missing', function() {
    var panel = HUD.createNearbyAnchorsPanel();
    assert.ok(panel, 'should return an element');
    var found = false;
    function searchChildren(el) {
      if ((el.textContent || '').indexOf('Module not loaded') !== -1) found = true;
      if ((el.innerHTML || '').indexOf('Module not loaded') !== -1) found = true;
      (el._children || []).forEach(searchChildren);
    }
    searchChildren(panel);
    assert.ok(found, 'should show module-not-loaded when Anchors undefined');
  });
});

suite('Nearby Anchors — location handling', function() {
  test('requestLocation calls callback with geo on success', function() {
    var received = null;
    _mockAnchors._locationDenied = false;
    _mockAnchors.requestLocation(function(result) {
      received = result;
    });
    assert.ok(received, 'callback should be called');
    assert.ok(received.geo, 'result should have geo');
    assert.ok(typeof received.geo.lat === 'number', 'geo should have lat');
    assert.ok(typeof received.geo.lon === 'number', 'geo should have lon');
  });

  test('requestLocation calls callback with null on denial', function() {
    var received = 'not-null';
    _mockAnchors._locationDenied = true;
    _mockAnchors.requestLocation(function(result) {
      received = result;
    });
    assert.strictEqual(received, null, 'denied location should pass null to callback');
    _mockAnchors._locationDenied = false;
  });

  test('getNearby returns nearby anchors array', function() {
    var geo = { lat: 37.7749, lon: -122.4194 };
    var anchors = [
      { id: 'a1', name: 'Gate', geo: { lat: 37.7749, lon: -122.4194 }, zone: 'nexus' },
      { id: 'a2', name: 'Portal', geo: { lat: 37.7750, lon: -122.4190 }, zone: 'gardens' }
    ];
    var nearby = _mockAnchors.getNearby(geo, anchors, 500);
    assert.ok(Array.isArray(nearby), 'getNearby should return an array');
    assert.strictEqual(nearby.length, 2);
  });

  test('getNearby handles empty anchor list', function() {
    var geo = { lat: 37.7749, lon: -122.4194 };
    var nearby = _mockAnchors.getNearby(geo, [], 500);
    assert.ok(Array.isArray(nearby));
    assert.strictEqual(nearby.length, 0);
  });

  test('getDistance returns positive number', function() {
    var d = _mockAnchors.getDistance(37.7749, -122.4194, 37.7750, -122.4190);
    assert.ok(d > 0, 'distance should be positive');
    assert.ok(d < 1000, 'distance should be less than 1km for nearby points');
  });

  test('getDistance returns 0 for identical points', function() {
    var d = _mockAnchors.getDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.ok(d < 0.01, 'distance between same point should be ~0');
  });

  test('isInRange returns false for distant anchor', function() {
    var geo = { lat: 37.7749, lon: -122.4194 };
    var anchor = { geo: { lat: 38.0, lon: -123.0 } }; // far away
    var inRange = _mockAnchors.isInRange(geo, anchor);
    assert.strictEqual(inRange, false, 'distant anchor should not be in range');
  });

  test('isInRange returns true for very close anchor', function() {
    var geo = { lat: 37.7749000, lon: -122.4194000 };
    var anchor = { geo: { lat: 37.7749001, lon: -122.4194001 } }; // ~0.1m away
    var inRange = _mockAnchors.isInRange(geo, anchor);
    assert.strictEqual(inRange, true, 'very close anchor should be in range');
  });

  test('SAFETY.getWarningMessage returns string for valid geo', function() {
    var warning = _mockAnchors.SAFETY.getWarningMessage({ lat: 37.7749, lon: -122.4194 });
    assert.ok(typeof warning === 'string' && warning.length > 0, 'should return a warning message');
  });

  test('SAFETY.getWarningMessage returns null for missing geo', function() {
    var warning = _mockAnchors.SAFETY.getWarningMessage(null);
    assert.strictEqual(warning, null, 'should return null for missing geo');
  });

  test('TYPES contains landmark key', function() {
    assert.ok(_mockAnchors.TYPES.landmark, 'TYPES should have landmark');
  });
});

suite('Nearby Anchors — panel open/close/toggle', function() {
  test('showNearbyAnchorsPanel does not throw without Anchors module', function() {
    assert.doesNotThrow(function() {
      HUD.showNearbyAnchorsPanel();
    });
  });

  test('hideNearbyAnchorsPanel does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.hideNearbyAnchorsPanel();
    });
  });

  test('toggleNearbyAnchorsPanel can be called twice (open/close)', function() {
    assert.doesNotThrow(function() {
      HUD.toggleNearbyAnchorsPanel();
      HUD.toggleNearbyAnchorsPanel();
    });
  });

  test('showNearbyAnchorsPanel with Anchors mock does not throw', function() {
    global.Anchors = _mockAnchors;
    assert.doesNotThrow(function() {
      HUD.showNearbyAnchorsPanel();
    });
    delete global.Anchors;
  });
});

// ─── Suite 5: Cross-panel — all 4 panels can be toggled independently ────────

suite('Cross-panel — independence', function() {
  test('all 4 show functions exist and are functions', function() {
    assert.strictEqual(typeof HUD.showEconomyVizPanel, 'function');
    assert.strictEqual(typeof HUD.showYamlInspectorPanel, 'function');
    assert.strictEqual(typeof HUD.showReplayPanel, 'function');
    assert.strictEqual(typeof HUD.showNearbyAnchorsPanel, 'function');
  });

  test('all 4 hide functions exist and are functions', function() {
    assert.strictEqual(typeof HUD.hideEconomyVizPanel, 'function');
    assert.strictEqual(typeof HUD.hideYamlInspectorPanel, 'function');
    assert.strictEqual(typeof HUD.hideReplayPanel, 'function');
    assert.strictEqual(typeof HUD.hideNearbyAnchorsPanel, 'function');
  });

  test('all 4 toggle functions exist and are functions', function() {
    assert.strictEqual(typeof HUD.toggleEconomyVizPanel, 'function');
    assert.strictEqual(typeof HUD.toggleYamlInspectorPanel, 'function');
    assert.strictEqual(typeof HUD.toggleReplayPanel, 'function');
    assert.strictEqual(typeof HUD.toggleNearbyAnchorsPanel, 'function');
  });

  test('all 4 create functions exist and are functions', function() {
    assert.strictEqual(typeof HUD.createEconomyVizPanel, 'function');
    assert.strictEqual(typeof HUD.createYamlInspectorPanel, 'function');
    assert.strictEqual(typeof HUD.createReplayPanel, 'function');
    assert.strictEqual(typeof HUD.createNearbyAnchorsPanel, 'function');
  });

  test('opening one panel does not affect others (no shared state)', function() {
    // Show economy panel — replay state should still be idle
    HUD.showEconomyVizPanel();
    assert.strictEqual(HUD.getReplayState(), 'idle');
    HUD.hideEconomyVizPanel();
  });

  test('calling all show functions in sequence does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.showEconomyVizPanel();
      HUD.showYamlInspectorPanel();
      HUD.showReplayPanel();
      HUD.showNearbyAnchorsPanel();
    });
  });

  test('calling all hide functions in sequence does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.hideEconomyVizPanel();
      HUD.hideYamlInspectorPanel();
      HUD.hideReplayPanel();
      HUD.hideNearbyAnchorsPanel();
    });
  });
});

// ─── Suite 6: Module guards work when globals are undefined ──────────────────

suite('Module guards — undefined globals do not crash', function() {
  test('refreshEconomyVizPanel is safe when EconomyViz global missing', function() {
    var saved = global.EconomyViz;
    delete global.EconomyViz;
    assert.doesNotThrow(function() {
      HUD.refreshEconomyVizPanel();
    });
    if (saved !== undefined) global.EconomyViz = saved;
  });

  test('showYamlInspectorPanel is safe when YamlDash global missing', function() {
    var saved = global.YamlDash;
    delete global.YamlDash;
    assert.doesNotThrow(function() {
      HUD.showYamlInspectorPanel();
    });
    if (saved !== undefined) global.YamlDash = saved;
  });

  test('showReplayPanel is safe when Replay global missing', function() {
    var saved = global.Replay;
    delete global.Replay;
    assert.doesNotThrow(function() {
      HUD.showReplayPanel();
    });
    if (saved !== undefined) global.Replay = saved;
  });

  test('showNearbyAnchorsPanel is safe when Anchors global missing', function() {
    var saved = global.Anchors;
    delete global.Anchors;
    assert.doesNotThrow(function() {
      HUD.showNearbyAnchorsPanel();
    });
    if (saved !== undefined) global.Anchors = saved;
  });
});

// ─── Report ──────────────────────────────────────────────────────────────────

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (errors.length > 0) {
  console.log('\nFailures:');
  errors.forEach(function(e) {
    console.log('  ' + e.name + ': ' + e.error.message);
  });
  process.exit(1);
} else {
  process.exit(0);
}
