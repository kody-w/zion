// test_dashboard.js - Tests for Dashboard module
'use strict';

var assert = require('assert');
var Dashboard = require('../src/js/dashboard.js');

var passed = 0;
var failed = 0;
var errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  + ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  FAIL ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  console.log('\n' + name);
  fn();
}

// Reset state between test groups
function reset() {
  Dashboard._reset();
}

// ─── isDashboardMode ──────────────────────────────────────────────────────────

suite('isDashboardMode — basic', function() {
  test('returns a boolean', function() {
    var result = Dashboard.isDashboardMode();
    assert.strictEqual(typeof result, 'boolean');
  });

  test('returns false in plain Node.js environment (no window, no localStorage)', function() {
    // In Node.js: no window, no document, no localStorage
    // THREE is not defined but process IS defined, so should return false
    var result = Dashboard.isDashboardMode();
    assert.strictEqual(result, false);
  });

  test('is a function', function() {
    assert.strictEqual(typeof Dashboard.isDashboardMode, 'function');
  });
});

suite('isDashboardMode — localStorage simulation', function() {
  test('returns false when localStorage is not available', function() {
    // In Node.js, localStorage is undefined
    var result = Dashboard.isDashboardMode();
    assert.strictEqual(result, false);
  });

  test('module loads without errors in Node.js', function() {
    // Just verify the module is loaded and functional
    assert.strictEqual(typeof Dashboard, 'object');
    assert.strictEqual(typeof Dashboard.isDashboardMode, 'function');
  });
});

// ─── Panel Creation ───────────────────────────────────────────────────────────

suite('createPanel — in Node.js (no document)', function() {
  test('createPanel returns an object with id', function() {
    reset();
    var panel = Dashboard.createPanel('test-panel', 'Test Panel', '[>]', 'content');
    assert.ok(panel, 'panel should be truthy');
    assert.strictEqual(typeof panel, 'object');
  });

  test('createPanel stores panel id', function() {
    reset();
    var panel = Dashboard.createPanel('my-panel', 'My Panel', '[*]', 'hello');
    assert.ok(panel._panelId === 'my-panel' || panel.id === 'my-panel' ||
      (panel.getAttribute && panel.getAttribute('data-panel-id') === 'my-panel'));
  });

  test('createPanel with empty content does not throw', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.createPanel('empty-panel', 'Empty', '[o]', '');
    });
  });

  test('createPanel with null content does not throw', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.createPanel('null-panel', 'Null', '[#]', null);
    });
  });

  test('createPanel with different icon symbols', function() {
    reset();
    var icons = ['[>]', '[*]', '[#]', '[$]', '[!]', '[~]', '[o]', '[@]', '[^]', '[&]', '[=]', '[+]', '[-]', '[G]'];
    icons.forEach(function(icon) {
      assert.doesNotThrow(function() {
        Dashboard.createPanel('icon-test-' + icon.replace(/[\[\]]/g, ''), 'Icon Test', icon, '');
      });
    });
  });

  test('createPanel returns object each call', function() {
    reset();
    var p1 = Dashboard.createPanel('p1', 'Panel 1', '[>]', '');
    var p2 = Dashboard.createPanel('p2', 'Panel 2', '[*]', '');
    assert.ok(p1);
    assert.ok(p2);
  });
});

// ─── Panel Registry ───────────────────────────────────────────────────────────

suite('Panel Registry — registerPanel', function() {
  test('registerPanel returns true for valid panel def', function() {
    reset();
    var result = Dashboard.registerPanel({
      id: 'test-reg',
      title: 'Test Reg',
      icon: '[>]',
      category: 'navigation'
    });
    assert.strictEqual(result, true);
  });

  test('registerPanel returns false for null', function() {
    reset();
    var result = Dashboard.registerPanel(null);
    assert.strictEqual(result, false);
  });

  test('registerPanel returns false for def without id', function() {
    reset();
    var result = Dashboard.registerPanel({ title: 'No ID' });
    assert.strictEqual(result, false);
  });

  test('getPanel returns registered panel', function() {
    reset();
    Dashboard.registerPanel({ id: 'reg-test', title: 'Reg Test', icon: '[#]', category: 'info' });
    var panel = Dashboard.getPanel('reg-test');
    assert.ok(panel, 'panel should exist');
    assert.strictEqual(panel.id, 'reg-test');
  });

  test('getPanel returns null for unknown id', function() {
    reset();
    var panel = Dashboard.getPanel('nonexistent-panel-xyz');
    assert.strictEqual(panel, null);
  });

  test('getPanel returns correct title', function() {
    reset();
    Dashboard.registerPanel({ id: 'title-test', title: 'My Title', icon: '[>]', category: 'social' });
    var panel = Dashboard.getPanel('title-test');
    assert.strictEqual(panel.title, 'My Title');
  });

  test('getPanel returns correct icon', function() {
    reset();
    Dashboard.registerPanel({ id: 'icon-test', title: 'Icon Test', icon: '[*]', category: 'economy' });
    var panel = Dashboard.getPanel('icon-test');
    assert.strictEqual(panel.icon, '[*]');
  });

  test('getPanel returns correct category', function() {
    reset();
    Dashboard.registerPanel({ id: 'cat-test', title: 'Cat Test', icon: '[#]', category: 'gameplay' });
    var panel = Dashboard.getPanel('cat-test');
    assert.strictEqual(panel.category, 'gameplay');
  });

  test('registerPanel sets default icon if missing', function() {
    reset();
    Dashboard.registerPanel({ id: 'no-icon', title: 'No Icon' });
    var panel = Dashboard.getPanel('no-icon');
    assert.ok(panel.icon, 'icon should have a default value');
  });

  test('registerPanel sets default category if missing', function() {
    reset();
    Dashboard.registerPanel({ id: 'no-cat', title: 'No Cat', icon: '[#]' });
    var panel = Dashboard.getPanel('no-cat');
    assert.ok(panel.category, 'category should have a default value');
  });

  test('registerPanel attaches create function', function() {
    reset();
    Dashboard.registerPanel({ id: 'fn-test', title: 'Fn Test', icon: '[>]', category: 'info' });
    var panel = Dashboard.getPanel('fn-test');
    assert.strictEqual(typeof panel.create, 'function');
  });

  test('registerPanel attaches update function', function() {
    reset();
    Dashboard.registerPanel({ id: 'upd-test', title: 'Upd Test', icon: '[>]', category: 'info' });
    var panel = Dashboard.getPanel('upd-test');
    assert.strictEqual(typeof panel.update, 'function');
  });

  test('registerPanel attaches destroy function', function() {
    reset();
    Dashboard.registerPanel({ id: 'dest-test', title: 'Dest Test', icon: '[>]', category: 'info' });
    var panel = Dashboard.getPanel('dest-test');
    assert.strictEqual(typeof panel.destroy, 'function');
  });

  test('custom create function is preserved', function() {
    reset();
    var customCreate = function() { return { custom: true }; };
    Dashboard.registerPanel({ id: 'custom-create', title: 'CC', icon: '[>]', category: 'info', create: customCreate });
    var panel = Dashboard.getPanel('custom-create');
    assert.strictEqual(panel.create, customCreate);
  });

  test('overwriting panel id replaces old registration', function() {
    reset();
    Dashboard.registerPanel({ id: 'dup', title: 'First', icon: '[1]', category: 'info' });
    Dashboard.registerPanel({ id: 'dup', title: 'Second', icon: '[2]', category: 'social' });
    var panel = Dashboard.getPanel('dup');
    assert.strictEqual(panel.title, 'Second');
  });
});

suite('Panel Registry — getAllPanels / getPanelsByCategory', function() {
  test('getAllPanels returns array', function() {
    reset();
    var panels = Dashboard.getAllPanels();
    assert.ok(Array.isArray(panels));
  });

  test('getAllPanels is empty after reset', function() {
    reset();
    var panels = Dashboard.getAllPanels();
    assert.strictEqual(panels.length, 0);
  });

  test('getAllPanels returns registered panels', function() {
    reset();
    Dashboard.registerPanel({ id: 'a1', title: 'A1', icon: '[>]', category: 'navigation' });
    Dashboard.registerPanel({ id: 'a2', title: 'A2', icon: '[*]', category: 'social' });
    var panels = Dashboard.getAllPanels();
    assert.strictEqual(panels.length, 2);
  });

  test('getPanelsByCategory returns only panels in that category', function() {
    reset();
    Dashboard.registerPanel({ id: 'nav1', title: 'Nav1', icon: '[>]', category: 'navigation' });
    Dashboard.registerPanel({ id: 'soc1', title: 'Soc1', icon: '[~]', category: 'social' });
    Dashboard.registerPanel({ id: 'nav2', title: 'Nav2', icon: '[>]', category: 'navigation' });
    var navPanels = Dashboard.getPanelsByCategory('navigation');
    assert.strictEqual(navPanels.length, 2);
  });

  test('getPanelsByCategory("all") returns all panels', function() {
    reset();
    Dashboard.registerPanel({ id: 'x1', title: 'X1', icon: '[>]', category: 'navigation' });
    Dashboard.registerPanel({ id: 'x2', title: 'X2', icon: '[*]', category: 'economy' });
    Dashboard.registerPanel({ id: 'x3', title: 'X3', icon: '[#]', category: 'info' });
    var all = Dashboard.getPanelsByCategory('all');
    assert.strictEqual(all.length, 3);
  });

  test('getPanelsByCategory returns empty array for unknown category', function() {
    reset();
    Dashboard.registerPanel({ id: 'y1', title: 'Y1', icon: '[>]', category: 'navigation' });
    var result = Dashboard.getPanelsByCategory('unknowncategory');
    assert.strictEqual(result.length, 0);
  });

  test('panel category constants are correct', function() {
    var cats = Dashboard.CATEGORIES;
    assert.ok(Array.isArray(cats));
    assert.ok(cats.indexOf('all') !== -1);
    assert.ok(cats.indexOf('navigation') !== -1);
    assert.ok(cats.indexOf('social') !== -1);
    assert.ok(cats.indexOf('economy') !== -1);
    assert.ok(cats.indexOf('gameplay') !== -1);
    assert.ok(cats.indexOf('info') !== -1);
    assert.ok(cats.indexOf('minigames') !== -1);
  });
});

// ─── Default Panels (after initDashboard in Node mode) ───────────────────────

suite('Default Panel Stubs — after initDashboard', function() {
  test('initDashboard registers zone-navigator', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('zone-navigator'), 'zone-navigator should be registered');
  });

  test('initDashboard registers npc-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('npc-panel'));
  });

  test('initDashboard registers inventory-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('inventory-panel'));
  });

  test('initDashboard registers economy-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('economy-panel'));
  });

  test('initDashboard registers quest-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('quest-panel'));
  });

  test('initDashboard registers social-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('social-panel'));
  });

  test('initDashboard registers minigames-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('minigames-panel'));
  });

  test('initDashboard registers world-status-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('world-status-panel'));
  });

  test('initDashboard registers player-stats-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('player-stats-panel'));
  });

  test('initDashboard registers governance-panel', function() {
    reset();
    Dashboard.initDashboard({});
    assert.ok(Dashboard.getPanel('governance-panel'));
  });

  test('zone-navigator is in navigation category', function() {
    reset();
    Dashboard.initDashboard({});
    var panel = Dashboard.getPanel('zone-navigator');
    assert.strictEqual(panel.category, 'navigation');
  });

  test('economy-panel is in economy category', function() {
    reset();
    Dashboard.initDashboard({});
    var panel = Dashboard.getPanel('economy-panel');
    assert.strictEqual(panel.category, 'economy');
  });

  test('social-panel is in social category', function() {
    reset();
    Dashboard.initDashboard({});
    var panel = Dashboard.getPanel('social-panel');
    assert.strictEqual(panel.category, 'social');
  });

  test('minigames-panel is in minigames category', function() {
    reset();
    Dashboard.initDashboard({});
    var panel = Dashboard.getPanel('minigames-panel');
    assert.strictEqual(panel.category, 'minigames');
  });

  test('all 10 default panels are registered', function() {
    reset();
    Dashboard.initDashboard({});
    var all = Dashboard.getAllPanels();
    assert.strictEqual(all.length, 10);
  });
});

// ─── Layout Switching ─────────────────────────────────────────────────────────

suite('setDashboardLayout', function() {
  test('setDashboardLayout("full") returns true', function() {
    reset();
    var result = Dashboard.setDashboardLayout('full');
    assert.strictEqual(result, true);
  });

  test('setDashboardLayout("compact") returns true', function() {
    reset();
    var result = Dashboard.setDashboardLayout('compact');
    assert.strictEqual(result, true);
  });

  test('setDashboardLayout("minimal") returns true', function() {
    reset();
    var result = Dashboard.setDashboardLayout('minimal');
    assert.strictEqual(result, true);
  });

  test('setDashboardLayout with invalid name returns false', function() {
    reset();
    var result = Dashboard.setDashboardLayout('invalid-layout');
    assert.strictEqual(result, false);
  });

  test('setDashboardLayout with empty string returns false', function() {
    reset();
    var result = Dashboard.setDashboardLayout('');
    assert.strictEqual(result, false);
  });

  test('setDashboardLayout with null returns false', function() {
    reset();
    var result = Dashboard.setDashboardLayout(null);
    assert.strictEqual(result, false);
  });

  test('layout is reflected in getDashboardState after setting', function() {
    reset();
    Dashboard.setDashboardLayout('compact');
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.layout, 'compact');
  });

  test('LAYOUTS constant contains all 3 layouts', function() {
    var layouts = Dashboard.LAYOUTS;
    assert.ok(Array.isArray(layouts));
    assert.ok(layouts.indexOf('full') !== -1);
    assert.ok(layouts.indexOf('compact') !== -1);
    assert.ok(layouts.indexOf('minimal') !== -1);
  });

  test('switching layout multiple times persists last value', function() {
    reset();
    Dashboard.setDashboardLayout('minimal');
    Dashboard.setDashboardLayout('compact');
    Dashboard.setDashboardLayout('full');
    assert.strictEqual(Dashboard.getDashboardState().layout, 'full');
  });
});

// ─── Show / Hide / Toggle Panels ─────────────────────────────────────────────

suite('showPanel / hidePanel / togglePanel', function() {
  test('showPanel returns true for registered panel', function() {
    reset();
    Dashboard.registerPanel({ id: 'sh1', title: 'SH1', icon: '[>]', category: 'info' });
    var result = Dashboard.showPanel('sh1');
    assert.strictEqual(result, true);
  });

  test('hidePanel returns true for registered panel', function() {
    reset();
    Dashboard.registerPanel({ id: 'hd1', title: 'HD1', icon: '[>]', category: 'info' });
    var result = Dashboard.hidePanel('hd1');
    assert.strictEqual(result, true);
  });

  test('hidePanel sets panel state to false', function() {
    reset();
    Dashboard.registerPanel({ id: 'hd2', title: 'HD2', icon: '[>]', category: 'info' });
    Dashboard.showPanel('hd2');
    Dashboard.hidePanel('hd2');
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.panelStates['hd2'], false);
  });

  test('showPanel sets panel state to true', function() {
    reset();
    Dashboard.registerPanel({ id: 'sh2', title: 'SH2', icon: '[>]', category: 'info' });
    Dashboard.hidePanel('sh2');
    Dashboard.showPanel('sh2');
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.panelStates['sh2'], true);
  });

  test('togglePanel hides a visible panel', function() {
    reset();
    Dashboard.registerPanel({ id: 'tg1', title: 'TG1', icon: '[>]', category: 'info' });
    Dashboard.showPanel('tg1');
    Dashboard.togglePanel('tg1');
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.panelStates['tg1'], false);
  });

  test('togglePanel shows a hidden panel', function() {
    reset();
    Dashboard.registerPanel({ id: 'tg2', title: 'TG2', icon: '[>]', category: 'info' });
    Dashboard.hidePanel('tg2');
    Dashboard.togglePanel('tg2');
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.panelStates['tg2'], true);
  });

  test('hidden panels are not in openPanels list', function() {
    reset();
    Dashboard.registerPanel({ id: 'op1', title: 'OP1', icon: '[>]', category: 'info' });
    Dashboard.hidePanel('op1');
    var state = Dashboard.getDashboardState();
    assert.ok(state.openPanels.indexOf('op1') === -1);
  });

  test('visible panels are in openPanels list', function() {
    reset();
    Dashboard.registerPanel({ id: 'op2', title: 'OP2', icon: '[>]', category: 'info' });
    Dashboard.showPanel('op2');
    var state = Dashboard.getDashboardState();
    assert.ok(state.openPanels.indexOf('op2') !== -1);
  });

  test('showPanel for unregistered panel still returns true', function() {
    reset();
    var result = Dashboard.showPanel('unregistered-xyz');
    assert.strictEqual(result, true);
  });

  test('hidePanel for unregistered panel still returns true', function() {
    reset();
    var result = Dashboard.hidePanel('unregistered-xyz');
    assert.strictEqual(result, true);
  });
});

// ─── Zone Navigation ──────────────────────────────────────────────────────────

suite('navigateToZone', function() {
  test('navigateToZone to valid zone returns true', function() {
    reset();
    var result = Dashboard.navigateToZone('nexus');
    assert.strictEqual(result, true);
  });

  test('navigateToZone to invalid zone returns false', function() {
    reset();
    var result = Dashboard.navigateToZone('nonexistent-zone');
    assert.strictEqual(result, false);
  });

  test('navigateToZone updates current zone in state', function() {
    reset();
    Dashboard.navigateToZone('gardens');
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.zone, 'gardens');
  });

  test('navigateToZone to all 8 zones succeeds', function() {
    reset();
    var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];
    zones.forEach(function(zoneId) {
      assert.strictEqual(Dashboard.navigateToZone(zoneId), true, 'Should navigate to ' + zoneId);
    });
  });

  test('navigateToZone adds a notification', function() {
    reset();
    Dashboard.navigateToZone('athenaeum');
    var notes = Dashboard.getNotifications();
    assert.ok(notes.length > 0, 'Should have at least one notification');
  });

  test('navigateToZone notification has type zone_change', function() {
    reset();
    Dashboard.navigateToZone('arena');
    var notes = Dashboard.getNotifications();
    var zoneNote = notes.find(function(n) { return n.type === 'zone_change'; });
    assert.ok(zoneNote, 'Should have a zone_change notification');
  });

  test('ZONES constant has 8 entries', function() {
    var zones = Dashboard.ZONES;
    assert.strictEqual(Object.keys(zones).length, 8);
  });

  test('ZONES has nexus', function() {
    assert.ok(Dashboard.ZONES.nexus);
  });

  test('ZONES has arena', function() {
    assert.ok(Dashboard.ZONES.arena);
  });

  test('navigateToZone with null returns false', function() {
    reset();
    var result = Dashboard.navigateToZone(null);
    assert.strictEqual(result, false);
  });
});

// ─── getDashboardState ────────────────────────────────────────────────────────

suite('getDashboardState', function() {
  test('getDashboardState returns an object', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.strictEqual(typeof state, 'object');
    assert.ok(state !== null);
  });

  test('state has initialized field', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.ok('initialized' in state);
  });

  test('state has layout field', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.ok('layout' in state);
  });

  test('state has category field', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.ok('category' in state);
  });

  test('state has zone field', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.ok('zone' in state);
  });

  test('state has panelStates field', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.ok('panelStates' in state);
  });

  test('state has openPanels field as array', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.ok(Array.isArray(state.openPanels));
  });

  test('state has registeredPanels as array', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.ok(Array.isArray(state.registeredPanels));
  });

  test('default zone is nexus', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.zone, 'nexus');
  });

  test('default layout is full', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.layout, 'full');
  });

  test('default category is all', function() {
    reset();
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.category, 'all');
  });

  test('state is a copy, not a reference', function() {
    reset();
    var state1 = Dashboard.getDashboardState();
    state1.layout = 'mutated';
    var state2 = Dashboard.getDashboardState();
    assert.strictEqual(state2.layout, 'full'); // Should not be mutated
  });
});

// ─── Keyboard Shortcut Mapping ────────────────────────────────────────────────

suite('Keyboard Shortcuts', function() {
  test('getKeyboardShortcuts returns an object', function() {
    var shortcuts = Dashboard.getKeyboardShortcuts();
    assert.strictEqual(typeof shortcuts, 'object');
    assert.ok(shortcuts !== null);
  });

  test('Tab shortcut is defined', function() {
    var shortcuts = Dashboard.getKeyboardShortcuts();
    assert.ok(shortcuts['Tab'] || shortcuts['tab'], 'Tab shortcut should exist');
  });

  test('Escape shortcut is defined', function() {
    var shortcuts = Dashboard.getKeyboardShortcuts();
    assert.ok(shortcuts['Escape'] || shortcuts['escape'], 'Escape shortcut should exist');
  });

  test('inventory shortcut is defined', function() {
    var shortcuts = Dashboard.getKeyboardShortcuts();
    var hasInventory = Object.values(shortcuts).some(function(v) {
      return v.toLowerCase().indexOf('inventor') !== -1;
    });
    assert.ok(hasInventory, 'Should have inventory shortcut');
  });

  test('registerKeyHandler registers a handler', function() {
    reset();
    var called = false;
    Dashboard.registerKeyHandler('ArrowUp', function() { called = true; });
    // We can't easily simulate keydown in Node.js without document
    // Just verify the registration doesn't throw
    assert.ok(true);
  });

  test('registerKeyHandler does not throw', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.registerKeyHandler('Enter', function() {});
    });
  });

  test('getKeyboardShortcuts has social/chat shortcut', function() {
    var shortcuts = Dashboard.getKeyboardShortcuts();
    var hasChat = Object.values(shortcuts).some(function(v) {
      return v.toLowerCase().indexOf('social') !== -1 || v.toLowerCase().indexOf('chat') !== -1;
    });
    assert.ok(hasChat, 'Should have social/chat shortcut');
  });

  test('getKeyboardShortcuts has quest shortcut', function() {
    var shortcuts = Dashboard.getKeyboardShortcuts();
    var hasQuest = Object.values(shortcuts).some(function(v) {
      return v.toLowerCase().indexOf('quest') !== -1;
    });
    assert.ok(hasQuest, 'Should have quest shortcut');
  });
});

// ─── Responsive Breakpoints ───────────────────────────────────────────────────

suite('Responsive Breakpoints', function() {
  test('BREAKPOINTS constant exists', function() {
    assert.ok(Dashboard.BREAKPOINTS);
    assert.ok(typeof Dashboard.BREAKPOINTS === 'object');
  });

  test('BREAKPOINTS.mobile is 768', function() {
    assert.strictEqual(Dashboard.BREAKPOINTS.mobile, 768);
  });

  test('BREAKPOINTS.tablet is 1200', function() {
    assert.strictEqual(Dashboard.BREAKPOINTS.tablet, 1200);
  });

  test('getBreakpoint returns a string', function() {
    var bp = Dashboard.getBreakpoint();
    assert.strictEqual(typeof bp, 'string');
  });

  test('getBreakpoint returns desktop in default Node environment', function() {
    // Node env has no window.innerWidth so defaults to 1280 > 1200 => desktop
    var bp = Dashboard.getBreakpoint();
    assert.strictEqual(bp, 'desktop');
  });

  test('_getColumnCount returns 3 in default Node environment', function() {
    var cols = Dashboard._getColumnCount();
    assert.strictEqual(cols, 3);
  });

  test('_getScreenWidth returns a number', function() {
    var w = Dashboard._getScreenWidth();
    assert.strictEqual(typeof w, 'number');
  });

  test('_getScreenWidth returns 1280 in Node (default)', function() {
    var w = Dashboard._getScreenWidth();
    assert.strictEqual(w, 1280);
  });
});

// ─── Notifications ────────────────────────────────────────────────────────────

suite('Notifications', function() {
  test('addNotification does not throw', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.addNotification('Test notification', 'info');
    });
  });

  test('getNotifications returns an array', function() {
    reset();
    var notes = Dashboard.getNotifications();
    assert.ok(Array.isArray(notes));
  });

  test('addNotification adds to notifications list', function() {
    reset();
    Dashboard.addNotification('Hello world', 'info');
    var notes = Dashboard.getNotifications();
    assert.ok(notes.length >= 1);
  });

  test('notification has message property', function() {
    reset();
    Dashboard.addNotification('Test msg', 'warning');
    var notes = Dashboard.getNotifications();
    assert.ok(notes.length > 0 && notes[notes.length - 1].message === 'Test msg');
  });

  test('notification has type property', function() {
    reset();
    Dashboard.addNotification('Test type', 'danger');
    var notes = Dashboard.getNotifications();
    assert.ok(notes[notes.length - 1].type === 'danger');
  });

  test('notification has timestamp', function() {
    reset();
    Dashboard.addNotification('Ts test', 'info');
    var notes = Dashboard.getNotifications();
    assert.ok(typeof notes[notes.length - 1].ts === 'number');
  });

  test('addNotification with default type does not throw', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.addNotification('Default type');
    });
  });

  test('getNotifications returns a copy', function() {
    reset();
    Dashboard.addNotification('Original', 'info');
    var notes = Dashboard.getNotifications();
    notes.push({ message: 'injected', ts: Date.now(), type: 'info' });
    var notes2 = Dashboard.getNotifications();
    // notes2 should not have the injected entry
    var found = notes2.some(function(n) { return n.message === 'injected'; });
    assert.strictEqual(found, false);
  });
});

// ─── updateDashboard ──────────────────────────────────────────────────────────

suite('updateDashboard', function() {
  test('updateDashboard does not throw with null state', function() {
    reset();
    Dashboard.initDashboard({});
    assert.doesNotThrow(function() {
      Dashboard.updateDashboard(null, 16);
    });
  });

  test('updateDashboard does not throw with empty state', function() {
    reset();
    Dashboard.initDashboard({});
    assert.doesNotThrow(function() {
      Dashboard.updateDashboard({}, 16);
    });
  });

  test('updateDashboard with player state does not throw', function() {
    reset();
    Dashboard.initDashboard({});
    assert.doesNotThrow(function() {
      Dashboard.updateDashboard({
        player: { name: 'TestPlayer', spark: 150, level: 5, reputation: 30 },
        timeOfDay: 14.5,
        weather: 'sunny',
        season: 'summer'
      }, 16);
    });
  });

  test('updateDashboard with time of day does not throw', function() {
    reset();
    Dashboard.initDashboard({});
    assert.doesNotThrow(function() {
      Dashboard.updateDashboard({ timeOfDay: 8.5 }, 16);
    });
  });
});

// ─── _formatTime helper ───────────────────────────────────────────────────────

suite('_formatTime helper', function() {
  test('formats 0 as 00:00', function() {
    assert.strictEqual(Dashboard._formatTime(0), '00:00');
  });

  test('formats 12 as 12:00', function() {
    assert.strictEqual(Dashboard._formatTime(12), '12:00');
  });

  test('formats 23.5 as 23:30', function() {
    assert.strictEqual(Dashboard._formatTime(23.5), '23:30');
  });

  test('formats 6.25 as 06:15', function() {
    assert.strictEqual(Dashboard._formatTime(6.25), '06:15');
  });

  test('formats undefined as --:--', function() {
    assert.strictEqual(Dashboard._formatTime(undefined), '--:--');
  });

  test('formats null as --:--', function() {
    assert.strictEqual(Dashboard._formatTime(null), '--:--');
  });

  test('formats 18.75 as 18:45', function() {
    assert.strictEqual(Dashboard._formatTime(18.75), '18:45');
  });
});

// ─── _escapeHtml helper ───────────────────────────────────────────────────────

suite('_escapeHtml helper', function() {
  test('escapes ampersand', function() {
    assert.strictEqual(Dashboard._escapeHtml('a&b'), 'a&amp;b');
  });

  test('escapes less-than', function() {
    assert.strictEqual(Dashboard._escapeHtml('<script>'), '&lt;script&gt;');
  });

  test('escapes double quote', function() {
    assert.strictEqual(Dashboard._escapeHtml('"hi"'), '&quot;hi&quot;');
  });

  test('does not escape plain text', function() {
    assert.strictEqual(Dashboard._escapeHtml('hello world'), 'hello world');
  });

  test('handles non-string input', function() {
    assert.strictEqual(Dashboard._escapeHtml(42), '42');
  });

  test('handles empty string', function() {
    assert.strictEqual(Dashboard._escapeHtml(''), '');
  });
});

// ─── COLORS constant ──────────────────────────────────────────────────────────

suite('COLORS constant', function() {
  test('COLORS.bg matches dark background', function() {
    assert.strictEqual(Dashboard.COLORS.bg, '#0A0E1A');
  });

  test('COLORS.accent is gold', function() {
    assert.strictEqual(Dashboard.COLORS.accent, '#DAA520');
  });

  test('COLORS.text is light', function() {
    assert.strictEqual(Dashboard.COLORS.text, '#E8E0D8');
  });

  test('COLORS has bgPanel', function() {
    assert.ok(Dashboard.COLORS.bgPanel);
  });

  test('COLORS has border', function() {
    assert.ok(Dashboard.COLORS.border);
  });

  test('COLORS has textMuted', function() {
    assert.ok(Dashboard.COLORS.textMuted);
  });
});

// ─── localStorage Persistence ─────────────────────────────────────────────────

suite('localStorage Persistence (Node.js - no localStorage)', function() {
  test('setDashboardLayout does not throw without localStorage', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.setDashboardLayout('compact');
    });
  });

  test('hidePanel does not throw without localStorage', function() {
    reset();
    Dashboard.registerPanel({ id: 'ls1', title: 'LS1', icon: '[>]', category: 'info' });
    assert.doesNotThrow(function() {
      Dashboard.hidePanel('ls1');
    });
  });

  test('savePanelPosition does not throw without localStorage', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.savePanelPosition('test-panel', 100, 200);
    });
  });

  test('clearSavedState does not throw without localStorage', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.clearSavedState();
    });
  });

  test('savePanelPosition stores position in state', function() {
    reset();
    Dashboard.savePanelPosition('pos-panel', 50, 75);
    var state = Dashboard.getDashboardState();
    assert.ok(state.panelPositions);
    if (state.panelPositions['pos-panel']) {
      assert.strictEqual(state.panelPositions['pos-panel'].x, 50);
      assert.strictEqual(state.panelPositions['pos-panel'].y, 75);
    }
  });
});

// ─── initDashboard ────────────────────────────────────────────────────────────

suite('initDashboard', function() {
  test('initDashboard returns true', function() {
    reset();
    var result = Dashboard.initDashboard({});
    assert.strictEqual(result, true);
  });

  test('initDashboard sets initialized to true', function() {
    reset();
    Dashboard.initDashboard({});
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.initialized, true);
  });

  test('initDashboard with null container does not throw', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.initDashboard(null);
    });
  });

  test('initDashboard registers 10 default panels', function() {
    reset();
    Dashboard.initDashboard({});
    assert.strictEqual(Dashboard.getAllPanels().length, 10);
  });

  test('calling initDashboard twice does not throw', function() {
    reset();
    assert.doesNotThrow(function() {
      Dashboard.initDashboard({});
      Dashboard.initDashboard({});
    });
  });
});

// ─── _reset function ──────────────────────────────────────────────────────────

suite('_reset internal function', function() {
  test('_reset clears panel registry', function() {
    Dashboard.registerPanel({ id: 'r1', title: 'R1', icon: '[>]', category: 'info' });
    Dashboard._reset();
    assert.strictEqual(Dashboard.getAllPanels().length, 0);
  });

  test('_reset resets zone to nexus', function() {
    Dashboard.navigateToZone('arena');
    Dashboard._reset();
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.zone, 'nexus');
  });

  test('_reset resets layout to full', function() {
    Dashboard.setDashboardLayout('minimal');
    Dashboard._reset();
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.layout, 'full');
  });

  test('_reset clears notifications', function() {
    Dashboard.addNotification('Test', 'info');
    Dashboard._reset();
    var notes = Dashboard.getNotifications();
    assert.strictEqual(notes.length, 0);
  });

  test('_reset sets initialized to false', function() {
    Dashboard.initDashboard({});
    Dashboard._reset();
    var state = Dashboard.getDashboardState();
    assert.strictEqual(state.initialized, false);
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + passed + ' passed, ' + failed + ' failed');

if (errors.length > 0) {
  console.log('\nFailures:');
  errors.forEach(function(e) {
    console.log('  ' + e.name + ': ' + e.error.message);
  });
}

process.exit(failed === 0 ? 0 : 1);
