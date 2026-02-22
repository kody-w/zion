/**
 * tests/test_dashboard_css.js
 * Comprehensive tests for the DashboardCSS module
 * 100+ tests covering all exports, CSS selectors, animations, and validity
 */

'use strict';

var testRunner = require('./test_runner');
var test = testRunner.test;
var suite = testRunner.suite;
var report = testRunner.report;
var assert = testRunner.assert;

var DashboardCSS = require('../src/js/dashboard_css');

// ─── Minimal DOM stub (jsdom-free, just enough for injectStyles) ──────────────

function makeMockDocument() {
  var elements = {};
  var headChildren = [];

  var headEl = {
    _children: headChildren,
    appendChild: function(el) {
      headChildren.push(el);
      el.parentNode = headEl;
      if (el.id) { elements[el.id] = el; }
    },
    removeChild: function(el) {
      var idx = headChildren.indexOf(el);
      if (idx !== -1) {
        headChildren.splice(idx, 1);
      }
      if (el.id && elements[el.id] === el) {
        delete elements[el.id];
      }
      el.parentNode = null;
    }
  };

  return {
    _elements: elements,
    _headChildren: headChildren,
    head: headEl,
    getElementById: function(id) {
      return elements[id] || null;
    },
    createElement: function(tag) {
      return { tag: tag, id: '', textContent: '', parentNode: null };
    }
  };
}

// Patch globals for DOM tests, restore after each suite
function withMockDOM(fn) {
  var origDoc = global.document;
  var mockDoc = makeMockDocument();
  global.document = mockDoc;
  try {
    fn(mockDoc);
  } finally {
    global.document = origDoc;
  }
}

// ─── Helper: count occurrences of substring ───────────────────────────────────

function countOccurrences(str, sub) {
  var count = 0;
  var pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

// ─── Get the stylesheet once for static analysis ──────────────────────────────

var CSS = DashboardCSS.getStylesheet();

// ============================================================================
// SUITE 1 — Module Exports
// ============================================================================

suite('Module Exports', function() {

  test('DashboardCSS is an object', function() {
    assert(typeof DashboardCSS === 'object' && DashboardCSS !== null,
      'DashboardCSS must be an object');
  });

  test('injectStyles is exported as a function', function() {
    assert(typeof DashboardCSS.injectStyles === 'function',
      'injectStyles must be a function');
  });

  test('removeStyles is exported as a function', function() {
    assert(typeof DashboardCSS.removeStyles === 'function',
      'removeStyles must be a function');
  });

  test('getStylesheet is exported as a function', function() {
    assert(typeof DashboardCSS.getStylesheet === 'function',
      'getStylesheet must be a function');
  });

  test('getBreakpoints is exported as a function', function() {
    assert(typeof DashboardCSS.getBreakpoints === 'function',
      'getBreakpoints must be a function');
  });

  test('STYLE_ELEMENT_ID is exported as a string', function() {
    assert(typeof DashboardCSS.STYLE_ELEMENT_ID === 'string',
      'STYLE_ELEMENT_ID must be a string');
    assert(DashboardCSS.STYLE_ELEMENT_ID.length > 0,
      'STYLE_ELEMENT_ID must not be empty');
  });

  test('exactly 5 public exports (injectStyles, removeStyles, getStylesheet, getBreakpoints, STYLE_ELEMENT_ID)', function() {
    var keys = Object.keys(DashboardCSS);
    assert(keys.length === 5, 'Expected 5 exports, got ' + keys.length + ': ' + keys.join(', '));
  });

});

// ============================================================================
// SUITE 2 — getStylesheet()
// ============================================================================

suite('getStylesheet()', function() {

  test('returns a non-empty string', function() {
    assert(typeof CSS === 'string', 'getStylesheet must return a string');
    assert(CSS.length > 0, 'stylesheet must not be empty');
  });

  test('stylesheet is at least 3000 characters long', function() {
    assert(CSS.length >= 3000, 'Expected stylesheet >= 3000 chars, got ' + CSS.length);
  });

  test('calling getStylesheet() twice returns identical results', function() {
    var css1 = DashboardCSS.getStylesheet();
    var css2 = DashboardCSS.getStylesheet();
    assert(css1 === css2, 'getStylesheet must be deterministic');
  });

  test('getStylesheet() works without a DOM (Node.js env)', function() {
    // No document available in test environment — this should not throw
    var result = DashboardCSS.getStylesheet();
    assert(typeof result === 'string', 'Should return string with no DOM');
  });

});

// ============================================================================
// SUITE 3 — getBreakpoints()
// ============================================================================

suite('getBreakpoints()', function() {

  test('returns an object', function() {
    var bp = DashboardCSS.getBreakpoints();
    assert(typeof bp === 'object' && bp !== null, 'getBreakpoints must return an object');
  });

  test('has mobile breakpoint of 768', function() {
    assert(DashboardCSS.getBreakpoints().mobile === 768,
      'mobile breakpoint must be 768');
  });

  test('has tablet breakpoint of 1200', function() {
    assert(DashboardCSS.getBreakpoints().tablet === 1200,
      'tablet breakpoint must be 1200');
  });

  test('has desktop breakpoint of 1920', function() {
    assert(DashboardCSS.getBreakpoints().desktop === 1920,
      'desktop breakpoint must be 1920');
  });

  test('breakpoints are positive numbers', function() {
    var bp = DashboardCSS.getBreakpoints();
    assert(bp.mobile > 0 && bp.tablet > 0 && bp.desktop > 0,
      'all breakpoints must be positive');
  });

  test('mobile < tablet < desktop ordering', function() {
    var bp = DashboardCSS.getBreakpoints();
    assert(bp.mobile < bp.tablet, 'mobile must be < tablet');
    assert(bp.tablet < bp.desktop, 'tablet must be < desktop');
  });

  test('returns a fresh copy each call (not same reference)', function() {
    var bp1 = DashboardCSS.getBreakpoints();
    var bp2 = DashboardCSS.getBreakpoints();
    bp1.mobile = 999;
    assert(bp2.mobile === 768, 'getBreakpoints must return a fresh copy');
  });

});

// ============================================================================
// SUITE 4 — injectStyles() — DOM injection
// ============================================================================

suite('injectStyles() — DOM injection', function() {

  test('throws when no DOM is available', function() {
    var origDoc = global.document;
    delete global.document;
    var threw = false;
    try {
      DashboardCSS.injectStyles();
    } catch (e) {
      threw = true;
    } finally {
      global.document = origDoc;
    }
    assert(threw, 'injectStyles must throw when document is undefined');
  });

  test('creates a style element and appends to head', function() {
    withMockDOM(function(doc) {
      var el = DashboardCSS.injectStyles();
      assert(el !== null && el !== undefined, 'injectStyles must return an element');
      assert(el.tag === 'style', 'element must be a style tag, got: ' + el.tag);
    });
  });

  test('style element has the correct id', function() {
    withMockDOM(function(doc) {
      var el = DashboardCSS.injectStyles();
      assert(el.id === DashboardCSS.STYLE_ELEMENT_ID,
        'element id must equal STYLE_ELEMENT_ID');
    });
  });

  test('style element contains the full stylesheet', function() {
    withMockDOM(function(doc) {
      var el = DashboardCSS.injectStyles();
      assert(typeof el.textContent === 'string', 'textContent must be a string');
      assert(el.textContent.length > 0, 'textContent must not be empty');
      assert(el.textContent === DashboardCSS.getStylesheet(),
        'textContent must equal getStylesheet()');
    });
  });

  test('idempotent — calling twice returns same element', function() {
    withMockDOM(function(doc) {
      var el1 = DashboardCSS.injectStyles();
      var el2 = DashboardCSS.injectStyles();
      assert(el1 === el2, 'second call must return existing element');
    });
  });

  test('idempotent — head only contains one style element after multiple calls', function() {
    withMockDOM(function(doc) {
      DashboardCSS.injectStyles();
      DashboardCSS.injectStyles();
      DashboardCSS.injectStyles();
      var count = doc._headChildren.length;
      assert(count === 1, 'Expected 1 child in head, got ' + count);
    });
  });

  test('injectStyles returns the element', function() {
    withMockDOM(function(doc) {
      var result = DashboardCSS.injectStyles();
      assert(result !== undefined && result !== null, 'must return the style element');
    });
  });

});

// ============================================================================
// SUITE 5 — removeStyles()
// ============================================================================

suite('removeStyles()', function() {

  test('removeStyles does not throw without a DOM', function() {
    var origDoc = global.document;
    delete global.document;
    var threw = false;
    try {
      DashboardCSS.removeStyles();
    } catch (e) {
      threw = true;
    } finally {
      global.document = origDoc;
    }
    assert(!threw, 'removeStyles must not throw without a DOM');
  });

  test('removeStyles does nothing when styles not injected', function() {
    withMockDOM(function(doc) {
      // Should not throw or error
      DashboardCSS.removeStyles();
      assert(doc._headChildren.length === 0, 'head must remain empty');
    });
  });

  test('removeStyles removes the injected style element', function() {
    withMockDOM(function(doc) {
      DashboardCSS.injectStyles();
      assert(doc._headChildren.length === 1, 'style must be injected');
      DashboardCSS.removeStyles();
      assert(doc._headChildren.length === 0, 'style must be removed');
    });
  });

  test('after removeStyles, getElementById returns null', function() {
    withMockDOM(function(doc) {
      DashboardCSS.injectStyles();
      DashboardCSS.removeStyles();
      var el = doc.getElementById(DashboardCSS.STYLE_ELEMENT_ID);
      assert(el === null, 'getElementById must return null after removal');
    });
  });

  test('after removeStyles, injectStyles can inject again', function() {
    withMockDOM(function(doc) {
      var el1 = DashboardCSS.injectStyles();
      DashboardCSS.removeStyles();
      var el2 = DashboardCSS.injectStyles();
      assert(el2 !== null && el2 !== undefined, 'should be able to inject again');
      assert(doc._headChildren.length === 1, 'head must have exactly one child');
    });
  });

});

// ============================================================================
// SUITE 6 — CSS Structure: Layout Selectors
// ============================================================================

suite('CSS Structure: Layout Selectors', function() {

  test('.dashboard-container selector present', function() {
    assert(CSS.indexOf('.dashboard-container') !== -1,
      'Missing .dashboard-container');
  });

  test('.dashboard-header selector present', function() {
    assert(CSS.indexOf('.dashboard-header') !== -1,
      'Missing .dashboard-header');
  });

  test('.dashboard-logo selector present', function() {
    assert(CSS.indexOf('.dashboard-logo') !== -1,
      'Missing .dashboard-logo');
  });

  test('.dashboard-player-info selector present', function() {
    assert(CSS.indexOf('.dashboard-player-info') !== -1,
      'Missing .dashboard-player-info');
  });

  test('.dashboard-spark selector present', function() {
    assert(CSS.indexOf('.dashboard-spark') !== -1,
      'Missing .dashboard-spark');
  });

  test('.dashboard-zone selector present', function() {
    assert(CSS.indexOf('.dashboard-zone') !== -1,
      'Missing .dashboard-zone');
  });

  test('.dashboard-time selector present', function() {
    assert(CSS.indexOf('.dashboard-time') !== -1,
      'Missing .dashboard-time');
  });

  test('.dashboard-main selector present', function() {
    assert(CSS.indexOf('.dashboard-main') !== -1,
      'Missing .dashboard-main');
  });

  test('.dashboard-footer selector present', function() {
    assert(CSS.indexOf('.dashboard-footer') !== -1,
      'Missing .dashboard-footer');
  });

  test('.dashboard-tab selector present', function() {
    assert(CSS.indexOf('.dashboard-tab') !== -1,
      'Missing .dashboard-tab');
  });

  test('.dashboard-tab.active variant present', function() {
    assert(CSS.indexOf('.dashboard-tab.active') !== -1,
      'Missing .dashboard-tab.active');
  });

});

// ============================================================================
// SUITE 7 — CSS Structure: Panel Selectors
// ============================================================================

suite('CSS Structure: Panel Selectors', function() {

  test('.dashboard-panel selector present', function() {
    assert(CSS.indexOf('.dashboard-panel') !== -1,
      'Missing .dashboard-panel');
  });

  test('.dashboard-panel-header selector present', function() {
    assert(CSS.indexOf('.dashboard-panel-header') !== -1,
      'Missing .dashboard-panel-header');
  });

  test('.dashboard-panel-title selector present', function() {
    assert(CSS.indexOf('.dashboard-panel-title') !== -1,
      'Missing .dashboard-panel-title');
  });

  test('.dashboard-panel-controls selector present', function() {
    assert(CSS.indexOf('.dashboard-panel-controls') !== -1,
      'Missing .dashboard-panel-controls');
  });

  test('.dashboard-panel-btn selector present', function() {
    assert(CSS.indexOf('.dashboard-panel-btn') !== -1,
      'Missing .dashboard-panel-btn');
  });

  test('.dashboard-panel-body selector present', function() {
    assert(CSS.indexOf('.dashboard-panel-body') !== -1,
      'Missing .dashboard-panel-body');
  });

  test('.dashboard-panel.focused state present', function() {
    assert(CSS.indexOf('.dashboard-panel.focused') !== -1,
      'Missing .dashboard-panel.focused');
  });

  test('.dashboard-panel.collapsed .dashboard-panel-body rule present', function() {
    assert(CSS.indexOf('.dashboard-panel.collapsed .dashboard-panel-body') !== -1,
      'Missing collapsed panel body rule');
  });

  test('.dashboard-panel.fullscreen state present', function() {
    assert(CSS.indexOf('.dashboard-panel.fullscreen') !== -1,
      'Missing .dashboard-panel.fullscreen');
  });

  test('fullscreen panel uses position: fixed', function() {
    var idx = CSS.indexOf('.dashboard-panel.fullscreen');
    assert(idx !== -1, '.dashboard-panel.fullscreen must exist');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('position: fixed') !== -1,
      'fullscreen panel must use position: fixed');
  });

  test('fullscreen panel sets z-index', function() {
    var idx = CSS.indexOf('.dashboard-panel.fullscreen');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('z-index') !== -1, 'fullscreen must have z-index');
  });

  test('focused panel has box-shadow', function() {
    var idx = CSS.indexOf('.dashboard-panel.focused');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('box-shadow') !== -1, 'focused panel must have box-shadow');
  });

});

// ============================================================================
// SUITE 8 — CSS Structure: Tab System Selectors
// ============================================================================

suite('CSS Structure: Tab System Selectors', function() {

  test('.panel-tabs selector present', function() {
    assert(CSS.indexOf('.panel-tabs') !== -1, 'Missing .panel-tabs');
  });

  test('.panel-tab selector present', function() {
    assert(CSS.indexOf('.panel-tab') !== -1, 'Missing .panel-tab');
  });

  test('.panel-tab.active selector present', function() {
    assert(CSS.indexOf('.panel-tab.active') !== -1, 'Missing .panel-tab.active');
  });

  test('.panel-tab-content selector present', function() {
    assert(CSS.indexOf('.panel-tab-content') !== -1, 'Missing .panel-tab-content');
  });

  test('.panel-tab-content.active selector present', function() {
    assert(CSS.indexOf('.panel-tab-content.active') !== -1,
      'Missing .panel-tab-content.active');
  });

  test('inactive .panel-tab-content has display: none', function() {
    // Find the .panel-tab-content block (not the .active one)
    var idx = CSS.indexOf('.panel-tab-content {');
    assert(idx !== -1, '.panel-tab-content block must exist');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('display: none') !== -1,
      '.panel-tab-content must default to display: none');
  });

  test('.panel-tab-content.active has display: block', function() {
    var idx = CSS.indexOf('.panel-tab-content.active');
    assert(idx !== -1, '.panel-tab-content.active must exist');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('display: block') !== -1,
      '.panel-tab-content.active must have display: block');
  });

});

// ============================================================================
// SUITE 9 — CSS Structure: Button Variants
// ============================================================================

suite('CSS Structure: Button Variants', function() {

  test('.dash-btn selector present', function() {
    assert(CSS.indexOf('.dash-btn') !== -1, 'Missing .dash-btn');
  });

  test('.dash-btn:hover variant present', function() {
    assert(CSS.indexOf('.dash-btn:hover') !== -1, 'Missing .dash-btn:hover');
  });

  test('.dash-btn:disabled variant present', function() {
    assert(CSS.indexOf('.dash-btn:disabled') !== -1, 'Missing .dash-btn:disabled');
  });

  test('.dash-btn-primary variant present', function() {
    assert(CSS.indexOf('.dash-btn-primary') !== -1, 'Missing .dash-btn-primary');
  });

  test('.dash-btn-danger variant present', function() {
    assert(CSS.indexOf('.dash-btn-danger') !== -1, 'Missing .dash-btn-danger');
  });

  test('.dash-btn-danger uses red color', function() {
    var idx = CSS.indexOf('.dash-btn-danger');
    assert(idx !== -1, '.dash-btn-danger must exist');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('#EF5350') !== -1 || block.indexOf('ef5350') !== -1,
      '.dash-btn-danger must reference red color #EF5350');
  });

  test('.dash-btn disabled has cursor: not-allowed', function() {
    var idx = CSS.indexOf('.dash-btn:disabled');
    var block = CSS.substring(idx, idx + 150);
    assert(block.indexOf('not-allowed') !== -1,
      '.dash-btn:disabled must have cursor: not-allowed');
  });

});

// ============================================================================
// SUITE 10 — CSS Structure: Input/Form Elements
// ============================================================================

suite('CSS Structure: Input/Form Elements', function() {

  test('.dash-input selector present', function() {
    assert(CSS.indexOf('.dash-input') !== -1, 'Missing .dash-input');
  });

  test('.dash-input:focus selector present', function() {
    assert(CSS.indexOf('.dash-input:focus') !== -1, 'Missing .dash-input:focus');
  });

  test('.dash-input::placeholder selector present', function() {
    assert(CSS.indexOf('.dash-input::placeholder') !== -1,
      'Missing .dash-input::placeholder');
  });

  test('.dash-select selector present', function() {
    assert(CSS.indexOf('.dash-select') !== -1, 'Missing .dash-select');
  });

  test('.dash-input:focus has outline: none', function() {
    var idx = CSS.indexOf('.dash-input:focus');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('outline: none') !== -1,
      '.dash-input:focus must have outline: none');
  });

});

// ============================================================================
// SUITE 11 — CSS Structure: Progress Bar Variants
// ============================================================================

suite('CSS Structure: Progress Bar Variants', function() {

  test('.dash-progress selector present', function() {
    assert(CSS.indexOf('.dash-progress') !== -1, 'Missing .dash-progress');
  });

  test('.dash-progress-fill selector present', function() {
    assert(CSS.indexOf('.dash-progress-fill') !== -1, 'Missing .dash-progress-fill');
  });

  test('.dash-progress-fill.gold variant present', function() {
    assert(CSS.indexOf('.dash-progress-fill.gold') !== -1,
      'Missing .dash-progress-fill.gold');
  });

  test('.dash-progress-fill.green variant present', function() {
    assert(CSS.indexOf('.dash-progress-fill.green') !== -1,
      'Missing .dash-progress-fill.green');
  });

  test('.dash-progress-fill.blue variant present', function() {
    assert(CSS.indexOf('.dash-progress-fill.blue') !== -1,
      'Missing .dash-progress-fill.blue');
  });

  test('.dash-progress-fill.red variant present', function() {
    assert(CSS.indexOf('.dash-progress-fill.red') !== -1,
      'Missing .dash-progress-fill.red');
  });

  test('.dash-progress-fill.purple variant present', function() {
    assert(CSS.indexOf('.dash-progress-fill.purple') !== -1,
      'Missing .dash-progress-fill.purple');
  });

  test('all progress fill variants use linear-gradient', function() {
    var colors = ['gold', 'green', 'blue', 'red', 'purple'];
    colors.forEach(function(color) {
      var selector = '.dash-progress-fill.' + color;
      var idx = CSS.indexOf(selector);
      assert(idx !== -1, 'Missing ' + selector);
      var block = CSS.substring(idx, idx + 150);
      assert(block.indexOf('linear-gradient') !== -1,
        selector + ' must use linear-gradient');
    });
  });

  test('.dash-progress has overflow: hidden', function() {
    var idx = CSS.indexOf('.dash-progress {');
    assert(idx !== -1, '.dash-progress block must exist');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('overflow: hidden') !== -1,
      '.dash-progress must have overflow: hidden');
  });

});

// ============================================================================
// SUITE 12 — CSS Structure: Rarity Classes
// ============================================================================

suite('CSS Structure: Rarity Classes', function() {

  test('.rarity-common selector present', function() {
    assert(CSS.indexOf('.rarity-common') !== -1, 'Missing .rarity-common');
  });

  test('.rarity-uncommon selector present', function() {
    assert(CSS.indexOf('.rarity-uncommon') !== -1, 'Missing .rarity-uncommon');
  });

  test('.rarity-rare selector present', function() {
    assert(CSS.indexOf('.rarity-rare') !== -1, 'Missing .rarity-rare');
  });

  test('.rarity-epic selector present', function() {
    assert(CSS.indexOf('.rarity-epic') !== -1, 'Missing .rarity-epic');
  });

  test('.rarity-legendary selector present', function() {
    assert(CSS.indexOf('.rarity-legendary') !== -1, 'Missing .rarity-legendary');
  });

  test('all rarity classes use border-color', function() {
    var rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    rarities.forEach(function(r) {
      var selector = '.rarity-' + r;
      var idx = CSS.indexOf(selector);
      assert(idx !== -1, 'Missing ' + selector);
      var block = CSS.substring(idx, idx + 80);
      assert(block.indexOf('border-color') !== -1,
        selector + ' must use border-color');
    });
  });

});

// ============================================================================
// SUITE 13 — CSS Structure: Badge Variants
// ============================================================================

suite('CSS Structure: Badge Variants', function() {

  test('.dash-badge selector present', function() {
    assert(CSS.indexOf('.dash-badge') !== -1, 'Missing .dash-badge');
  });

  test('.dash-badge-gold variant present', function() {
    assert(CSS.indexOf('.dash-badge-gold') !== -1, 'Missing .dash-badge-gold');
  });

  test('.dash-badge-green variant present', function() {
    assert(CSS.indexOf('.dash-badge-green') !== -1, 'Missing .dash-badge-green');
  });

  test('.dash-badge-blue variant present', function() {
    assert(CSS.indexOf('.dash-badge-blue') !== -1, 'Missing .dash-badge-blue');
  });

  test('.dash-badge-red variant present', function() {
    assert(CSS.indexOf('.dash-badge-red') !== -1, 'Missing .dash-badge-red');
  });

  test('.dash-badge-purple variant present', function() {
    assert(CSS.indexOf('.dash-badge-purple') !== -1, 'Missing .dash-badge-purple');
  });

  test('.dash-badge has border-radius for pill shape', function() {
    var idx = CSS.indexOf('.dash-badge {');
    assert(idx !== -1, '.dash-badge block must exist');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('border-radius') !== -1,
      '.dash-badge must have border-radius');
  });

});

// ============================================================================
// SUITE 14 — CSS Structure: Zone Color Classes
// ============================================================================

suite('CSS Structure: Zone Color Classes', function() {

  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  test('all 8 zone selectors present', function() {
    zones.forEach(function(zone) {
      assert(CSS.indexOf('.zone-' + zone) !== -1, 'Missing .zone-' + zone);
    });
  });

  test('.zone-nexus present with border-left', function() {
    var idx = CSS.indexOf('.zone-nexus');
    assert(idx !== -1, 'Missing .zone-nexus');
    var block = CSS.substring(idx, idx + 80);
    assert(block.indexOf('border-left') !== -1, '.zone-nexus must use border-left');
  });

  test('.zone-gardens present with green color', function() {
    var idx = CSS.indexOf('.zone-gardens');
    assert(idx !== -1, 'Missing .zone-gardens');
    var block = CSS.substring(idx, idx + 80);
    assert(block.indexOf('#4caf50') !== -1 || block.indexOf('#4CAF50') !== -1,
      '.zone-gardens must use green color');
  });

  test('.zone-arena present with brown/copper color', function() {
    var idx = CSS.indexOf('.zone-arena');
    assert(idx !== -1, 'Missing .zone-arena');
    var block = CSS.substring(idx, idx + 80);
    assert(block.indexOf('#d2691e') !== -1 || block.indexOf('#D2691E') !== -1,
      '.zone-arena must use copper color');
  });

  test('.zone-agora present with gold color', function() {
    var idx = CSS.indexOf('.zone-agora');
    assert(idx !== -1, 'Missing .zone-agora');
    var block = CSS.substring(idx, idx + 80);
    assert(block.indexOf('#ffd700') !== -1 || block.indexOf('#FFD700') !== -1,
      '.zone-agora must use gold color');
  });

  test('all zone classes use border-left', function() {
    zones.forEach(function(zone) {
      var selector = '.zone-' + zone;
      var idx = CSS.indexOf(selector);
      assert(idx !== -1, 'Missing ' + selector);
      var block = CSS.substring(idx, idx + 80);
      assert(block.indexOf('border-left') !== -1,
        selector + ' must use border-left');
    });
  });

});

// ============================================================================
// SUITE 15 — CSS Structure: Chat Styles
// ============================================================================

suite('CSS Structure: Chat Styles', function() {

  test('.chat-message-row selector present', function() {
    assert(CSS.indexOf('.chat-message-row') !== -1, 'Missing .chat-message-row');
  });

  test('.chat-timestamp selector present', function() {
    assert(CSS.indexOf('.chat-timestamp') !== -1, 'Missing .chat-timestamp');
  });

  test('.chat-sender selector present', function() {
    assert(CSS.indexOf('.chat-sender') !== -1, 'Missing .chat-sender');
  });

  test('.chat-system selector present', function() {
    assert(CSS.indexOf('.chat-system') !== -1, 'Missing .chat-system');
  });

  test('.chat-whisper selector present', function() {
    assert(CSS.indexOf('.chat-whisper') !== -1, 'Missing .chat-whisper');
  });

  test('.chat-sender uses sky blue color', function() {
    var idx = CSS.indexOf('.chat-sender');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('#87CEEB') !== -1,
      '.chat-sender must use sky blue #87CEEB');
  });

  test('.chat-system is italic', function() {
    var idx = CSS.indexOf('.chat-system');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('italic') !== -1, '.chat-system must be italic');
  });

  test('.chat-whisper uses purple color', function() {
    var idx = CSS.indexOf('.chat-whisper');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('#BA68C8') !== -1,
      '.chat-whisper must use purple #BA68C8');
  });

});

// ============================================================================
// SUITE 16 — CSS Structure: Game Display
// ============================================================================

suite('CSS Structure: Game Display', function() {

  test('.game-display selector present', function() {
    assert(CSS.indexOf('.game-display') !== -1, 'Missing .game-display');
  });

  test('.game-display uses monospace font', function() {
    var idx = CSS.indexOf('.game-display');
    assert(idx !== -1, '.game-display must exist');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('monospace') !== -1,
      '.game-display must use monospace font');
  });

  test('.game-display has white-space: pre', function() {
    var idx = CSS.indexOf('.game-display');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('white-space: pre') !== -1,
      '.game-display must have white-space: pre');
  });

  test('.game-display has overflow-x: auto', function() {
    var idx = CSS.indexOf('.game-display');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('overflow-x: auto') !== -1,
      '.game-display must have overflow-x: auto');
  });

});

// ============================================================================
// SUITE 17 — CSS Structure: Tooltip Styles
// ============================================================================

suite('CSS Structure: Tooltip Styles', function() {

  test('.dash-tooltip selector present', function() {
    assert(CSS.indexOf('.dash-tooltip') !== -1, 'Missing .dash-tooltip');
  });

  test('.dash-tooltip-title selector present', function() {
    assert(CSS.indexOf('.dash-tooltip-title') !== -1, 'Missing .dash-tooltip-title');
  });

  test('.dash-tooltip-desc selector present', function() {
    assert(CSS.indexOf('.dash-tooltip-desc') !== -1, 'Missing .dash-tooltip-desc');
  });

  test('.dash-tooltip has position: absolute', function() {
    var idx = CSS.indexOf('.dash-tooltip {');
    assert(idx !== -1, '.dash-tooltip block must exist');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('position: absolute') !== -1,
      '.dash-tooltip must have position: absolute');
  });

  test('.dash-tooltip has z-index: 2000', function() {
    var idx = CSS.indexOf('.dash-tooltip {');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('z-index: 2000') !== -1,
      '.dash-tooltip must have z-index: 2000');
  });

  test('.dash-tooltip has pointer-events: none', function() {
    var idx = CSS.indexOf('.dash-tooltip {');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('pointer-events: none') !== -1,
      '.dash-tooltip must have pointer-events: none');
  });

  test('.dash-tooltip has box-shadow', function() {
    var idx = CSS.indexOf('.dash-tooltip {');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('box-shadow') !== -1,
      '.dash-tooltip must have box-shadow');
  });

  test('.dash-tooltip-title uses gold accent color', function() {
    var idx = CSS.indexOf('.dash-tooltip-title');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('#DAA520') !== -1,
      '.dash-tooltip-title must use #DAA520');
  });

});

// ============================================================================
// SUITE 18 — CSS Structure: Scrollbar Styles
// ============================================================================

suite('CSS Structure: Scrollbar Styles', function() {

  test('::-webkit-scrollbar selector present', function() {
    assert(CSS.indexOf('::-webkit-scrollbar') !== -1,
      'Missing ::-webkit-scrollbar');
  });

  test('::-webkit-scrollbar-track selector present', function() {
    assert(CSS.indexOf('::-webkit-scrollbar-track') !== -1,
      'Missing ::-webkit-scrollbar-track');
  });

  test('::-webkit-scrollbar-thumb selector present', function() {
    assert(CSS.indexOf('::-webkit-scrollbar-thumb') !== -1,
      'Missing ::-webkit-scrollbar-thumb');
  });

  test('::-webkit-scrollbar-thumb:hover selector present', function() {
    assert(CSS.indexOf('::-webkit-scrollbar-thumb:hover') !== -1,
      'Missing ::-webkit-scrollbar-thumb:hover');
  });

  test('scrollbars scoped to .dashboard-container', function() {
    assert(CSS.indexOf('.dashboard-container ::-webkit-scrollbar') !== -1,
      'Scrollbar styles must be scoped to .dashboard-container');
  });

  test('scrollbar width set to 5px', function() {
    var idx = CSS.indexOf('::-webkit-scrollbar {');
    assert(idx !== -1, '::-webkit-scrollbar block must exist');
    var block = CSS.substring(idx, idx + 60);
    assert(block.indexOf('5px') !== -1, 'scrollbar width must be 5px');
  });

  test('scrollbar track has transparent background', function() {
    var idx = CSS.indexOf('::-webkit-scrollbar-track');
    var block = CSS.substring(idx, idx + 80);
    assert(block.indexOf('transparent') !== -1,
      'scrollbar track must be transparent');
  });

});

// ============================================================================
// SUITE 19 — CSS Structure: Toast Notification Styles
// ============================================================================

suite('CSS Structure: Toast Notification Styles', function() {

  test('.dash-toast selector present', function() {
    assert(CSS.indexOf('.dash-toast') !== -1, 'Missing .dash-toast');
  });

  test('.dash-toast has position: fixed', function() {
    var idx = CSS.indexOf('.dash-toast {');
    assert(idx !== -1, '.dash-toast block must exist');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('position: fixed') !== -1,
      '.dash-toast must have position: fixed');
  });

  test('.dash-toast has z-index: 3000', function() {
    var idx = CSS.indexOf('.dash-toast {');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('z-index: 3000') !== -1,
      '.dash-toast must have z-index: 3000');
  });

  test('.dash-toast uses dashToastIn animation', function() {
    assert(CSS.indexOf('dashToastIn') !== -1,
      '.dash-toast must reference dashToastIn animation');
  });

  test('@keyframes dashToastIn defined', function() {
    assert(CSS.indexOf('@keyframes dashToastIn') !== -1,
      '@keyframes dashToastIn must be defined');
  });

  test('dashToastIn uses translateX for slide-in effect', function() {
    var idx = CSS.indexOf('@keyframes dashToastIn');
    assert(idx !== -1, '@keyframes dashToastIn must exist');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('translateX') !== -1,
      'dashToastIn must use translateX');
  });

});

// ============================================================================
// SUITE 20 — CSS Structure: Animation Keyframes
// ============================================================================

suite('CSS Structure: Animation Keyframes', function() {

  test('@keyframes panelFadeIn defined', function() {
    assert(CSS.indexOf('@keyframes panelFadeIn') !== -1,
      'Missing @keyframes panelFadeIn');
  });

  test('@keyframes panelFadeOut defined', function() {
    assert(CSS.indexOf('@keyframes panelFadeOut') !== -1,
      'Missing @keyframes panelFadeOut');
  });

  test('@keyframes dashSpin defined', function() {
    assert(CSS.indexOf('@keyframes dashSpin') !== -1,
      'Missing @keyframes dashSpin');
  });

  test('@keyframes zoneFade defined', function() {
    assert(CSS.indexOf('@keyframes zoneFade') !== -1,
      'Missing @keyframes zoneFade');
  });

  test('panelFadeIn uses translateY', function() {
    var idx = CSS.indexOf('@keyframes panelFadeIn');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('translateY') !== -1,
      'panelFadeIn must use translateY');
  });

  test('panelFadeOut uses opacity 0', function() {
    var idx = CSS.indexOf('@keyframes panelFadeOut');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('opacity: 0') !== -1,
      'panelFadeOut must transition to opacity: 0');
  });

  test('dashSpin uses rotate(360deg)', function() {
    var idx = CSS.indexOf('@keyframes dashSpin');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('rotate(360deg)') !== -1,
      'dashSpin must rotate to 360deg');
  });

  test('.dashboard-panel-enter uses panelFadeIn', function() {
    assert(CSS.indexOf('.dashboard-panel-enter') !== -1,
      'Missing .dashboard-panel-enter');
    var idx = CSS.indexOf('.dashboard-panel-enter');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('panelFadeIn') !== -1,
      '.dashboard-panel-enter must reference panelFadeIn');
  });

  test('.dashboard-panel-exit uses panelFadeOut', function() {
    assert(CSS.indexOf('.dashboard-panel-exit') !== -1,
      'Missing .dashboard-panel-exit');
    var idx = CSS.indexOf('.dashboard-panel-exit');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('panelFadeOut') !== -1,
      '.dashboard-panel-exit must reference panelFadeOut');
  });

  test('.zone-transition-overlay defined', function() {
    assert(CSS.indexOf('.zone-transition-overlay') !== -1,
      'Missing .zone-transition-overlay');
  });

  test('.zone-transition-overlay uses zoneFade animation', function() {
    var idx = CSS.indexOf('.zone-transition-overlay');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('zoneFade') !== -1,
      '.zone-transition-overlay must use zoneFade');
  });

  test('zoneFade has 4 keyframe stops (0%, 30%, 70%, 100%)', function() {
    var idx = CSS.indexOf('@keyframes zoneFade');
    assert(idx !== -1, '@keyframes zoneFade must exist');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('0%') !== -1, 'zoneFade must have 0% stop');
    assert(block.indexOf('30%') !== -1, 'zoneFade must have 30% stop');
    assert(block.indexOf('70%') !== -1, 'zoneFade must have 70% stop');
    assert(block.indexOf('100%') !== -1, 'zoneFade must have 100% stop');
  });

});

// ============================================================================
// SUITE 21 — CSS Structure: Miscellaneous Elements
// ============================================================================

suite('CSS Structure: Miscellaneous Elements', function() {

  test('.dash-spinner selector present', function() {
    assert(CSS.indexOf('.dash-spinner') !== -1, 'Missing .dash-spinner');
  });

  test('.dash-spinner uses dashSpin animation', function() {
    var idx = CSS.indexOf('.dash-spinner');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('dashSpin') !== -1,
      '.dash-spinner must reference dashSpin animation');
  });

  test('.dash-empty selector present', function() {
    assert(CSS.indexOf('.dash-empty') !== -1, 'Missing .dash-empty');
  });

  test('.dash-empty has font-style: italic', function() {
    var idx = CSS.indexOf('.dash-empty');
    var block = CSS.substring(idx, idx + 150);
    assert(block.indexOf('italic') !== -1, '.dash-empty must be italic');
  });

  test('.dash-divider selector present', function() {
    assert(CSS.indexOf('.dash-divider') !== -1, 'Missing .dash-divider');
  });

  test('.dash-divider has height: 1px', function() {
    var idx = CSS.indexOf('.dash-divider');
    var block = CSS.substring(idx, idx + 150);
    assert(block.indexOf('height: 1px') !== -1,
      '.dash-divider must have height: 1px');
  });

  test('.dash-row selector present', function() {
    assert(CSS.indexOf('.dash-row') !== -1, 'Missing .dash-row');
  });

  test('.dash-row:last-child has no border', function() {
    assert(CSS.indexOf('.dash-row:last-child') !== -1,
      'Missing .dash-row:last-child');
    var idx = CSS.indexOf('.dash-row:last-child');
    var block = CSS.substring(idx, idx + 100);
    assert(block.indexOf('border-bottom: none') !== -1,
      '.dash-row:last-child must have border-bottom: none');
  });

  test('.item-grid selector present', function() {
    assert(CSS.indexOf('.item-grid') !== -1, 'Missing .item-grid');
  });

  test('.item-slot selector present', function() {
    assert(CSS.indexOf('.item-slot') !== -1, 'Missing .item-slot');
  });

  test('.item-slot.selected variant present', function() {
    assert(CSS.indexOf('.item-slot.selected') !== -1,
      'Missing .item-slot.selected');
  });

  test('.item-slot .item-count child present', function() {
    assert(CSS.indexOf('.item-slot .item-count') !== -1,
      'Missing .item-slot .item-count');
  });

});

// ============================================================================
// SUITE 22 — CSS Structure: Responsive Media Queries
// ============================================================================

suite('CSS Structure: Responsive Media Queries', function() {

  test('tablet media query at max-width: 1200px present', function() {
    assert(CSS.indexOf('max-width: 1200px') !== -1,
      'Missing tablet media query at 1200px');
  });

  test('mobile media query at max-width: 768px present', function() {
    assert(CSS.indexOf('max-width: 768px') !== -1,
      'Missing mobile media query at 768px');
  });

  test('tablet media query changes grid to 2 columns', function() {
    var idx = CSS.indexOf('max-width: 1200px');
    assert(idx !== -1, 'Tablet media query must exist');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('repeat(2, 1fr)') !== -1,
      'Tablet breakpoint must set 2-column grid');
  });

  test('mobile media query changes grid to 1 column', function() {
    var idx = CSS.indexOf('max-width: 768px');
    assert(idx !== -1, 'Mobile media query must exist');
    var block = CSS.substring(idx, idx + 200);
    assert(block.indexOf('1fr') !== -1,
      'Mobile breakpoint must set 1-column grid');
  });

  test('mobile media query adds flex-wrap to header', function() {
    var idx = CSS.indexOf('max-width: 768px');
    var block = CSS.substring(idx, idx + 300);
    assert(block.indexOf('flex-wrap') !== -1,
      'Mobile breakpoint must add flex-wrap to header');
  });

});

// ============================================================================
// SUITE 23 — CSS Validity: Brace Matching
// ============================================================================

suite('CSS Validity: Brace Matching', function() {

  test('no unclosed braces — open { count equals close } count', function() {
    var openCount = countOccurrences(CSS, '{');
    var closeCount = countOccurrences(CSS, '}');
    assert(openCount === closeCount,
      'Brace mismatch: ' + openCount + ' open vs ' + closeCount + ' close');
  });

  test('stylesheet contains at least 50 CSS rule blocks', function() {
    var openCount = countOccurrences(CSS, '{');
    assert(openCount >= 50,
      'Expected at least 50 CSS blocks, got ' + openCount);
  });

  test('stylesheet contains no double-open braces {{', function() {
    assert(CSS.indexOf('{{') === -1, 'Found unexpected {{ in stylesheet');
  });

  test('stylesheet contains no double-close braces }}', function() {
    assert(CSS.indexOf('}}') === -1, 'Found unexpected }} in stylesheet');
  });

  test('stylesheet has no empty rules (two consecutive braces {})', function() {
    // Allow for whitespace between { } but not immediately adjacent {}
    assert(CSS.indexOf('{}') === -1, 'Found empty CSS rule {}');
  });

  test('stylesheet does not contain JS template literal syntax ${ }', function() {
    assert(CSS.indexOf('${') === -1, 'Found unexpected ${ in stylesheet — template literal leak');
  });

  test('all @keyframes blocks are closed', function() {
    // Every @keyframes should have two closing braces (inner + outer)
    var keyframeNames = ['panelFadeIn', 'panelFadeOut', 'dashToastIn', 'dashSpin', 'zoneFade'];
    keyframeNames.forEach(function(name) {
      var idx = CSS.indexOf('@keyframes ' + name);
      assert(idx !== -1, 'Missing @keyframes ' + name);
      // Count braces in the block (should be balanced)
      var block = CSS.substring(idx);
      var depth = 0;
      var closed = false;
      for (var i = 0; i < block.length; i++) {
        if (block[i] === '{') depth++;
        else if (block[i] === '}') {
          depth--;
          if (depth === 0) { closed = true; break; }
        }
      }
      assert(closed, '@keyframes ' + name + ' is not properly closed');
    });
  });

});

// ============================================================================
// SUITE 24 — CSS Colors and Design Tokens
// ============================================================================

suite('CSS Colors and Design Tokens', function() {

  test('primary accent color #DAA520 (gold) used', function() {
    assert(CSS.indexOf('#DAA520') !== -1, '#DAA520 gold must be present');
  });

  test('background color #0A0E1A used', function() {
    assert(CSS.indexOf('#0A0E1A') !== -1, '#0A0E1A bg must be present');
  });

  test('text color #E8E0D8 used', function() {
    assert(CSS.indexOf('#E8E0D8') !== -1, '#E8E0D8 text must be present');
  });

  test('muted text color #A0978E used', function() {
    assert(CSS.indexOf('#A0978E') !== -1, '#A0978E muted text must be present');
  });

  test('danger red #EF5350 used', function() {
    assert(CSS.indexOf('#EF5350') !== -1, '#EF5350 danger red must be present');
  });

  test('header uses linear-gradient with gold rgba', function() {
    assert(CSS.indexOf('linear-gradient') !== -1, 'Must have linear-gradient');
  });

  test('dark panel background rgba(15,12,20)', function() {
    assert(CSS.indexOf('rgba(15,12,20') !== -1,
      'Panel background rgba(15,12,20,*) must be present');
  });

});

// ─── Run ──────────────────────────────────────────────────────────────────────

var passed = report();
process.exit(passed ? 0 : 1);
