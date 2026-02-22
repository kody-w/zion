// dashboard.js
/**
 * dashboard.js - UI-only dashboard mode for ZION
 *
 * Text/panel-based interface for interacting with ALL ZION game systems
 * without the 3D world. Replaces the Three.js canvas with a responsive
 * panel grid when enabled.
 *
 * UMD module: window.Dashboard (browser) or module.exports (Node.js)
 * ES5 compatible - uses var declarations
 */
(function(exports) {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  var STORAGE_KEY_MODE = 'zion_dashboard_mode';
  var STORAGE_KEY_LAYOUT = 'zion_dashboard_layout';
  var STORAGE_KEY_PANELS = 'zion_dashboard_panels';
  var STORAGE_KEY_POSITIONS = 'zion_dashboard_positions';

  var LAYOUTS = ['compact', 'full', 'minimal'];

  var CATEGORIES = ['all', 'navigation', 'social', 'economy', 'gameplay', 'info', 'minigames'];

  var COLORS = {
    bg: '#0A0E1A',
    bgPanel: '#111827',
    bgHeader: '#0D1321',
    bgTab: '#161F2E',
    bgTabActive: '#1E2D44',
    border: '#1E3A5F',
    borderHighlight: '#2A5285',
    accent: '#DAA520',
    accentHover: '#F0B830',
    text: '#E8E0D8',
    textMuted: '#8A9AB0',
    textDim: '#4A5A70',
    success: '#2E7D32',
    warning: '#F57F17',
    danger: '#C62828',
    info: '#1565C0'
  };

  var BREAKPOINTS = {
    mobile: 768,
    tablet: 1200
  };

  var PANEL_CATEGORIES = {
    'zone-navigator': 'navigation',
    'npc-panel': 'social',
    'inventory-panel': 'gameplay',
    'economy-panel': 'economy',
    'quest-panel': 'gameplay',
    'social-panel': 'social',
    'minigames-panel': 'minigames',
    'world-status-panel': 'info',
    'player-stats-panel': 'info',
    'governance-panel': 'info'
  };

  // ─── Module State ─────────────────────────────────────────────────────────

  var _container = null;
  var _headerEl = null;
  var _mainEl = null;
  var _footerEl = null;
  var _panelGrid = null;
  var _currentLayout = 'full';
  var _currentCategory = 'all';
  var _currentZone = 'nexus';
  var _gameState = null;
  var _focusedPanelIndex = 0;
  var _keyHandlers = {};
  var _resizeTimer = null;
  var _initialized = false;
  var _notifications = [];
  var _panelElements = {};

  // Panel registry: id -> panel definition
  var _panelRegistry = {};

  // Panel open/closed state
  var _panelStates = {};

  // Panel positions (for dragging)
  var _panelPositions = {};

  // ─── Zone Definitions ─────────────────────────────────────────────────────

  var ZONES = {
    nexus: { name: 'The Nexus', terrain: 'crystalline plaza', safe: true },
    gardens: { name: 'The Gardens', terrain: 'cultivated gardens', safe: true },
    athenaeum: { name: 'The Athenaeum', terrain: 'marble halls', safe: true },
    studio: { name: 'The Studio', terrain: 'artisan workshops', safe: true },
    wilds: { name: 'The Wilds', terrain: 'wilderness', safe: false },
    agora: { name: 'The Agora', terrain: 'market square', safe: true },
    commons: { name: 'The Commons', terrain: 'building grounds', safe: true },
    arena: { name: 'The Arena', terrain: 'combat grounds', safe: false }
  };

  // ─── Utility Helpers ──────────────────────────────────────────────────────

  function _safeLocalStorage(action, key, value) {
    try {
      if (typeof localStorage === 'undefined') { return null; }
      if (action === 'get') { return localStorage.getItem(key); }
      if (action === 'set') { localStorage.setItem(key, value); return true; }
      if (action === 'remove') { localStorage.removeItem(key); return true; }
    } catch (e) {
      return null;
    }
    return null;
  }

  function _getScreenWidth() {
    if (typeof window !== 'undefined' && window.innerWidth) {
      return window.innerWidth;
    }
    return 1280; // default to desktop
  }

  function _getColumnCount() {
    var width = _getScreenWidth();
    if (width < BREAKPOINTS.mobile) { return 1; }
    if (width < BREAKPOINTS.tablet) { return 2; }
    return 3;
  }

  function _escapeHtml(str) {
    if (typeof str !== 'string') { return String(str); }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _formatTime(timeOfDay) {
    if (!timeOfDay && timeOfDay !== 0) { return '--:--'; }
    var hour = Math.floor(timeOfDay);
    var min = Math.floor((timeOfDay - hour) * 60);
    var h = String(hour).padStart ? String(hour).padStart(2, '0') : (hour < 10 ? '0' + hour : String(hour));
    var m = String(min).padStart ? String(min).padStart(2, '0') : (min < 10 ? '0' + min : String(min));
    return h + ':' + m;
  }

  function _getElementById(id) {
    if (typeof document === 'undefined') { return null; }
    return document.getElementById(id);
  }

  function _createElement(tag, attrs, children) {
    if (typeof document === 'undefined') { return null; }
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          if (k === 'style') {
            el.style.cssText = attrs[k];
          } else if (k === 'className') {
            el.className = attrs[k];
          } else if (k.indexOf('data-') === 0) {
            el.setAttribute(k, attrs[k]);
          } else {
            el[k] = attrs[k];
          }
        }
      }
    }
    if (children) {
      if (typeof children === 'string') {
        el.innerHTML = children;
      } else if (Array.isArray(children)) {
        for (var i = 0; i < children.length; i++) {
          if (children[i]) { el.appendChild(children[i]); }
        }
      } else {
        el.appendChild(children);
      }
    }
    return el;
  }

  // ─── isDashboardMode ──────────────────────────────────────────────────────

  /**
   * Returns true if dashboard mode should be active.
   * Checks: URL param, URL hash, localStorage, or absence of THREE.
   */
  function isDashboardMode() {
    // Check if THREE is not available (no WebGL fallback)
    if (typeof window !== 'undefined' && typeof window.THREE === 'undefined') {
      // Only auto-activate if we're in a browser environment without THREE
      // but not in a Node.js test environment
      if (typeof document !== 'undefined') {
        // In browser without THREE - but only activate if explicitly set or no THREE
        // Don't auto-activate in test environments
      }
    }

    // Check URL parameter
    if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
      var search = window.location.search || '';
      var hash = window.location.hash || '';
      if (search.indexOf('mode=dashboard') !== -1) { return true; }
      if (hash === '#dashboard' || hash.indexOf('#dashboard') === 0) { return true; }
    }

    // Check localStorage
    var stored = _safeLocalStorage('get', STORAGE_KEY_MODE);
    if (stored === 'true') { return true; }

    // Check if THREE is absent (in browser only, not Node test environment)
    if (typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        typeof window.THREE === 'undefined' &&
        typeof process === 'undefined') {
      return true;
    }

    return false;
  }

  // ─── Panel Styles ─────────────────────────────────────────────────────────

  function _getPanelStyle() {
    return [
      'background:' + COLORS.bgPanel,
      'border:1px solid ' + COLORS.border,
      'border-radius:4px',
      'display:flex',
      'flex-direction:column',
      'overflow:hidden',
      'min-height:200px',
      'max-height:500px',
      'position:relative'
    ].join(';');
  }

  function _getPanelHeaderStyle() {
    return [
      'background:' + COLORS.bgHeader,
      'border-bottom:1px solid ' + COLORS.border,
      'padding:8px 12px',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'cursor:default',
      'user-select:none',
      'flex-shrink:0'
    ].join(';');
  }

  function _getPanelBodyStyle(collapsed) {
    return [
      'padding:12px',
      'overflow-y:auto',
      'flex:1',
      collapsed ? 'display:none' : 'display:block',
      'color:' + COLORS.text,
      'font-size:13px',
      'line-height:1.5'
    ].join(';');
  }

  function _getButtonStyle(variant) {
    var base = [
      'background:transparent',
      'border:none',
      'cursor:pointer',
      'padding:2px 6px',
      'border-radius:3px',
      'font-size:11px',
      'line-height:1.4'
    ].join(';');

    if (variant === 'accent') {
      return base + ';color:' + COLORS.accent + ';font-weight:bold';
    }
    return base + ';color:' + COLORS.textMuted;
  }

  // ─── createPanel ──────────────────────────────────────────────────────────

  /**
   * Factory for creating dashboard panels.
   * @param {string} id - Panel identifier
   * @param {string} title - Panel display title
   * @param {string} icon - Text symbol icon (e.g. '[>]', '[*]')
   * @param {string|Element} content - Initial panel body content
   * @returns {Element} The panel DOM element
   */
  function createPanel(id, title, icon, content) {
    if (typeof document === 'undefined') {
      // Return a mock object for Node.js testing
      return {
        id: id,
        _panelId: id,
        _collapsed: false,
        getAttribute: function(attr) {
          if (attr === 'data-panel-id') { return id; }
          return null;
        },
        querySelector: function(sel) { return null; },
        style: {},
        classList: { add: function() {}, remove: function() {}, contains: function() { return false; } }
      };
    }

    var panelEl = _createElement('div', {
      id: 'panel-' + id,
      'data-panel-id': id,
      style: _getPanelStyle()
    });

    // Header
    var titleEl = _createElement('span', {
      style: 'color:' + COLORS.accent + ';font-weight:bold;font-size:13px;font-family:monospace'
    }, _escapeHtml(icon) + ' ' + _escapeHtml(title));

    var btnMinimize = _createElement('button', {
      style: _getButtonStyle('muted'),
      title: 'Minimize'
    }, '[-]');

    var btnMaximize = _createElement('button', {
      style: _getButtonStyle('muted'),
      title: 'Maximize'
    }, '[+]');

    var btnClose = _createElement('button', {
      style: _getButtonStyle('accent'),
      title: 'Close'
    }, '[x]');

    var controlsEl = _createElement('div', {
      style: 'display:flex;gap:4px;align-items:center'
    }, [btnMinimize, btnMaximize, btnClose]);

    var headerEl = _createElement('div', {
      style: _getPanelHeaderStyle()
    }, [titleEl, controlsEl]);

    // Body
    var bodyEl = _createElement('div', {
      'data-panel-body': id,
      style: _getPanelBodyStyle(false)
    });

    if (content) {
      if (typeof content === 'string') {
        bodyEl.innerHTML = content;
      } else {
        bodyEl.appendChild(content);
      }
    }

    panelEl.appendChild(headerEl);
    panelEl.appendChild(bodyEl);

    // Wire up panel controls
    var collapsed = false;
    btnMinimize.addEventListener('click', function() {
      collapsed = !collapsed;
      bodyEl.style.display = collapsed ? 'none' : 'block';
      btnMinimize.innerHTML = collapsed ? '[+]' : '[-]';
    });

    btnMaximize.addEventListener('click', function() {
      if (panelEl.style.maxHeight === 'none' || panelEl.style.maxHeight === '') {
        panelEl.style.maxHeight = '500px';
        btnMaximize.innerHTML = '[+]';
      } else {
        panelEl.style.maxHeight = 'none';
        btnMaximize.innerHTML = '[-]';
      }
    });

    btnClose.addEventListener('click', function() {
      hidePanel(id);
    });

    // Store reference
    _panelElements[id] = panelEl;

    return panelEl;
  }

  // ─── Panel Registry ───────────────────────────────────────────────────────

  /**
   * Register a panel definition in the registry.
   * @param {Object} def Panel definition object
   */
  function registerPanel(def) {
    if (!def || !def.id) { return false; }
    _panelRegistry[def.id] = {
      id: def.id,
      title: def.title || def.id,
      icon: def.icon || '[#]',
      category: def.category || 'info',
      create: def.create || function() { return createPanel(def.id, def.title || def.id, def.icon || '[#]', ''); },
      update: def.update || function() {},
      destroy: def.destroy || function() {}
    };
    // Initialize open state from saved state or default to open
    if (_panelStates[def.id] === undefined) {
      var savedStates = _loadPanelStates();
      _panelStates[def.id] = savedStates[def.id] !== undefined ? savedStates[def.id] : true;
    }
    return true;
  }

  /**
   * Get a panel definition from the registry.
   */
  function getPanel(id) {
    return _panelRegistry[id] || null;
  }

  /**
   * Get all registered panels.
   */
  function getAllPanels() {
    var result = [];
    for (var id in _panelRegistry) {
      if (Object.prototype.hasOwnProperty.call(_panelRegistry, id)) {
        result.push(_panelRegistry[id]);
      }
    }
    return result;
  }

  /**
   * Get panels by category.
   */
  function getPanelsByCategory(category) {
    var result = [];
    for (var id in _panelRegistry) {
      if (Object.prototype.hasOwnProperty.call(_panelRegistry, id)) {
        var panel = _panelRegistry[id];
        if (category === 'all' || panel.category === category) {
          result.push(panel);
        }
      }
    }
    return result;
  }

  // ─── Default Panel Stubs ──────────────────────────────────────────────────

  function _registerDefaultPanels() {
    var defaultPanels = [
      {
        id: 'zone-navigator',
        title: 'Zone Navigator',
        icon: '[>]',
        category: 'navigation',
        create: function() {
          return createPanel('zone-navigator', 'Zone Navigator', '[>]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="margin-bottom:8px;color:' + COLORS.accent + '">Current Zone: ' +
            _escapeHtml(ZONES[_currentZone] ? ZONES[_currentZone].name : _currentZone) +
            '</div>' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">Select a zone to travel:</div>' +
            _renderZoneList() +
            '</div>');
        },
        update: function(state) {
          var el = _getElementById('panel-zone-navigator');
          if (!el) { return; }
          var body = el.querySelector('[data-panel-body]');
          if (!body) { return; }
          body.innerHTML = '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="margin-bottom:8px;color:' + COLORS.accent + '">Current Zone: ' +
            _escapeHtml(ZONES[_currentZone] ? ZONES[_currentZone].name : _currentZone) +
            '</div>' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">Select a zone to travel:</div>' +
            _renderZoneList() +
            '</div>';
        }
      },
      {
        id: 'npc-panel',
        title: 'Citizens',
        icon: '[&]',
        category: 'social',
        create: function() {
          return createPanel('npc-panel', 'Citizens', '[&]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[NPC interaction system — loading...]</div>' +
            '</div>');
        },
        update: function(state) {}
      },
      {
        id: 'inventory-panel',
        title: 'Inventory',
        icon: '[=]',
        category: 'gameplay',
        create: function() {
          return createPanel('inventory-panel', 'Inventory', '[=]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[Inventory — loading...]</div>' +
            '</div>');
        },
        update: function(state) {}
      },
      {
        id: 'economy-panel',
        title: 'Economy',
        icon: '[$]',
        category: 'economy',
        create: function() {
          return createPanel('economy-panel', 'Economy', '[$]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[Market and trading — loading...]</div>' +
            '</div>');
        },
        update: function(state) {}
      },
      {
        id: 'quest-panel',
        title: 'Quests',
        icon: '[!]',
        category: 'gameplay',
        create: function() {
          return createPanel('quest-panel', 'Quests', '[!]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[Quests and achievements — loading...]</div>' +
            '</div>');
        },
        update: function(state) {}
      },
      {
        id: 'social-panel',
        title: 'Social',
        icon: '[~]',
        category: 'social',
        create: function() {
          return createPanel('social-panel', 'Social', '[~]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[Chat, guild, profiles — loading...]</div>' +
            '</div>');
        },
        update: function(state) {}
      },
      {
        id: 'minigames-panel',
        title: 'Minigames',
        icon: '[*]',
        category: 'minigames',
        create: function() {
          return createPanel('minigames-panel', 'Minigames', '[*]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[Card game, fishing, dungeons — loading...]</div>' +
            '</div>');
        },
        update: function(state) {}
      },
      {
        id: 'world-status-panel',
        title: 'World Status',
        icon: '[o]',
        category: 'info',
        create: function() {
          return createPanel('world-status-panel', 'World Status', '[o]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[Time, weather, events — loading...]</div>' +
            '</div>');
        },
        update: function(state) {
          if (!state) { return; }
          var el = _getElementById('panel-world-status-panel');
          if (!el) { return; }
          var body = el.querySelector('[data-panel-body]');
          if (!body) { return; }
          var time = state.timeOfDay !== undefined ? _formatTime(state.timeOfDay) : '--:--';
          var weather = state.weather || 'clear';
          var season = state.season || 'spring';
          body.innerHTML = '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div>Time: <span style="color:' + COLORS.accent + '">' + _escapeHtml(time) + '</span></div>' +
            '<div>Weather: <span style="color:' + COLORS.text + '">' + _escapeHtml(weather) + '</span></div>' +
            '<div>Season: <span style="color:' + COLORS.text + '">' + _escapeHtml(season) + '</span></div>' +
            '</div>';
        }
      },
      {
        id: 'player-stats-panel',
        title: 'Player Stats',
        icon: '[@]',
        category: 'info',
        create: function() {
          return createPanel('player-stats-panel', 'Player Stats', '[@]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[Player profile, skills, reputation — loading...]</div>' +
            '</div>');
        },
        update: function(state) {
          if (!state || !state.player) { return; }
          var el = _getElementById('panel-player-stats-panel');
          if (!el) { return; }
          var body = el.querySelector('[data-panel-body]');
          if (!body) { return; }
          var p = state.player;
          body.innerHTML = '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div>Name: <span style="color:' + COLORS.accent + '">' + _escapeHtml(p.name || 'Unknown') + '</span></div>' +
            '<div>Level: <span style="color:' + COLORS.text + '">' + _escapeHtml(String(p.level || 1)) + '</span></div>' +
            '<div>Reputation: <span style="color:' + COLORS.text + '">' + _escapeHtml(String(p.reputation || 0)) + '</span></div>' +
            '</div>';
        }
      },
      {
        id: 'governance-panel',
        title: 'Governance',
        icon: '[^]',
        category: 'info',
        create: function() {
          return createPanel('governance-panel', 'Governance', '[^]',
            '<div style="color:' + COLORS.textMuted + ';font-family:monospace">' +
            '<div style="color:' + COLORS.textDim + ';font-size:11px">[Elections, amendments, stewards — loading...]</div>' +
            '</div>');
        },
        update: function(state) {}
      }
    ];

    for (var i = 0; i < defaultPanels.length; i++) {
      registerPanel(defaultPanels[i]);
    }
  }

  // ─── Zone Render Helper ───────────────────────────────────────────────────

  function _renderZoneList() {
    var html = '<ul style="list-style:none;padding:0;margin:4px 0">';
    for (var zoneId in ZONES) {
      if (Object.prototype.hasOwnProperty.call(ZONES, zoneId)) {
        var zone = ZONES[zoneId];
        var isCurrent = zoneId === _currentZone;
        var color = isCurrent ? COLORS.accent : COLORS.text;
        var prefix = isCurrent ? '[>] ' : '    ';
        html += '<li style="padding:3px 0;color:' + color + ';cursor:pointer;font-family:monospace"' +
          ' data-zone-id="' + _escapeHtml(zoneId) + '">' +
          _escapeHtml(prefix + zone.name) +
          (zone.safe ? '' : ' <span style="color:' + COLORS.warning + '">[!]</span>') +
          '</li>';
      }
    }
    html += '</ul>';
    return html;
  }

  // ─── Layout Styles ────────────────────────────────────────────────────────

  function _getGridStyle(layout, cols) {
    if (layout === 'minimal') {
      return 'display:grid;grid-template-columns:1fr;gap:8px;padding:8px';
    }
    if (layout === 'compact') {
      return 'display:grid;grid-template-columns:repeat(' + Math.min(cols, 2) + ',1fr);gap:8px;padding:8px';
    }
    // full
    return 'display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:12px;padding:12px';
  }

  // ─── Header Builder ───────────────────────────────────────────────────────

  function _buildHeader() {
    if (typeof document === 'undefined') { return null; }

    var logoEl = _createElement('div', {
      style: 'font-family:monospace;font-size:18px;font-weight:bold;color:' + COLORS.accent + ';letter-spacing:3px'
    }, 'ZION');

    var playerName = (_gameState && _gameState.player && _gameState.player.name) ? _gameState.player.name : 'Traveler';
    var sparkBalance = (_gameState && _gameState.player && _gameState.player.spark !== undefined) ?
      _gameState.player.spark : 0;
    var zoneName = ZONES[_currentZone] ? ZONES[_currentZone].name : _currentZone;
    var timeStr = (_gameState && _gameState.timeOfDay !== undefined) ? _formatTime(_gameState.timeOfDay) : '12:00';

    var infoEl = _createElement('div', {
      id: 'dashboard-header-info',
      style: 'display:flex;gap:16px;align-items:center;font-family:monospace;font-size:12px'
    }, [
      _createElement('span', {style: 'color:' + COLORS.textMuted}, '[@] ' + _escapeHtml(playerName)),
      _createElement('span', {style: 'color:' + COLORS.accent}, '[$] ' + _escapeHtml(String(sparkBalance))),
      _createElement('span', {style: 'color:' + COLORS.text, id: 'dashboard-zone-display'}, '[>] ' + _escapeHtml(zoneName)),
      _createElement('span', {style: 'color:' + COLORS.textMuted, id: 'dashboard-time-display'}, '[o] ' + _escapeHtml(timeStr))
    ]);

    var headerEl = _createElement('div', {
      id: 'dashboard-header',
      style: [
        'background:' + COLORS.bgHeader,
        'border-bottom:2px solid ' + COLORS.accent,
        'padding:10px 16px',
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'flex-shrink:0',
        'z-index:10'
      ].join(';')
    }, [logoEl, infoEl]);

    _headerEl = headerEl;
    return headerEl;
  }

  // ─── Footer / Nav Tabs ────────────────────────────────────────────────────

  function _buildFooter() {
    if (typeof document === 'undefined') { return null; }

    var tabDefs = [
      { id: 'all', label: 'All', icon: '[#]' },
      { id: 'navigation', label: 'Navigate', icon: '[>]' },
      { id: 'social', label: 'Social', icon: '[~]' },
      { id: 'economy', label: 'Economy', icon: '[$]' },
      { id: 'gameplay', label: 'Play', icon: '[*]' },
      { id: 'info', label: 'Info', icon: '[o]' },
      { id: 'minigames', label: 'Games', icon: '[G]' }
    ];

    var tabsEl = _createElement('div', {
      style: 'display:flex;gap:4px;flex-wrap:wrap'
    });

    for (var i = 0; i < tabDefs.length; i++) {
      (function(tabDef) {
        var isActive = tabDef.id === _currentCategory;
        var tabEl = _createElement('button', {
          'data-tab-id': tabDef.id,
          style: [
            'background:' + (isActive ? COLORS.bgTabActive : COLORS.bgTab),
            'border:1px solid ' + (isActive ? COLORS.accent : COLORS.border),
            'color:' + (isActive ? COLORS.accent : COLORS.textMuted),
            'padding:6px 12px',
            'cursor:pointer',
            'font-family:monospace',
            'font-size:12px',
            'border-radius:3px',
            'transition:all 0.15s'
          ].join(';')
        }, _escapeHtml(tabDef.icon + ' ' + tabDef.label));

        tabEl.addEventListener('click', function() {
          _setActiveTab(tabDef.id);
        });

        tabsEl.appendChild(tabEl);
      })(tabDefs[i]);
    }

    var footerEl = _createElement('div', {
      id: 'dashboard-footer',
      style: [
        'background:' + COLORS.bgHeader,
        'border-top:1px solid ' + COLORS.border,
        'padding:8px 12px',
        'flex-shrink:0'
      ].join(';')
    }, tabsEl);

    _footerEl = footerEl;
    return footerEl;
  }

  function _setActiveTab(categoryId) {
    if (CATEGORIES.indexOf(categoryId) === -1) { return; }
    _currentCategory = categoryId;

    // Update tab styles
    if (_footerEl) {
      var tabs = _footerEl.querySelectorAll('[data-tab-id]');
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var isActive = tab.getAttribute('data-tab-id') === categoryId;
        tab.style.background = isActive ? COLORS.bgTabActive : COLORS.bgTab;
        tab.style.borderColor = isActive ? COLORS.accent : COLORS.border;
        tab.style.color = isActive ? COLORS.accent : COLORS.textMuted;
      }
    }

    // Show/hide panels by category
    _refreshPanelVisibility();
  }

  function _refreshPanelVisibility() {
    if (!_panelGrid) { return; }
    var panelIds = Object.keys(_panelElements);
    for (var i = 0; i < panelIds.length; i++) {
      var id = panelIds[i];
      var panelEl = _panelElements[id];
      if (!panelEl) { continue; }
      var def = _panelRegistry[id];
      var cat = def ? def.category : 'info';
      var inCategory = _currentCategory === 'all' || cat === _currentCategory;
      var isOpen = _panelStates[id] !== false;
      panelEl.style.display = (inCategory && isOpen) ? 'flex' : 'none';
    }
  }

  // ─── initDashboard ────────────────────────────────────────────────────────

  /**
   * Initialize the dashboard inside a container element.
   * Called instead of World.initScene when dashboard mode is active.
   * @param {Element} container - DOM element to render the dashboard into
   */
  function initDashboard(container) {
    if (typeof document === 'undefined') {
      // Node.js: just mark as initialized
      _initialized = true;
      if (!container) { container = {}; }
      _container = container;
      _loadSavedState();
      _registerDefaultPanels();
      return true;
    }

    _container = container;

    // Clear any existing content
    container.innerHTML = '';

    // Set container styles
    container.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'height:100%',
      'min-height:100vh',
      'background:' + COLORS.bg,
      'color:' + COLORS.text,
      'font-family:monospace,monospace',
      'overflow:hidden'
    ].join(';');

    // Load saved state
    _loadSavedState();

    // Register default panels
    _registerDefaultPanels();

    // Build structure
    var headerEl = _buildHeader();
    var footerEl = _buildFooter();

    // Main scrollable area
    _mainEl = _createElement('div', {
      id: 'dashboard-main',
      style: 'flex:1;overflow-y:auto;overflow-x:hidden'
    });

    // Panel grid
    var cols = _getColumnCount();
    _panelGrid = _createElement('div', {
      id: 'dashboard-grid',
      style: _getGridStyle(_currentLayout, cols)
    });

    _mainEl.appendChild(_panelGrid);

    container.appendChild(headerEl);
    container.appendChild(_mainEl);
    container.appendChild(footerEl);

    // Render panels
    _renderPanels();

    // Setup keyboard handling
    _setupKeyboardHandlers();

    // Setup resize handler
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', _onResize);
    }

    _initialized = true;
    return true;
  }

  function _renderPanels() {
    if (!_panelGrid) { return; }
    _panelGrid.innerHTML = '';
    _panelElements = {};

    var panels = getPanelsByCategory('all');
    for (var i = 0; i < panels.length; i++) {
      var def = panels[i];
      var el = def.create();
      if (!el) { continue; }
      _panelElements[def.id] = el;
      _panelGrid.appendChild(el);
    }

    _refreshPanelVisibility();
  }

  function _onResize() {
    if (_resizeTimer) { clearTimeout(_resizeTimer); }
    _resizeTimer = setTimeout(function() {
      if (_panelGrid) {
        var cols = _getColumnCount();
        _panelGrid.style.cssText = _getGridStyle(_currentLayout, cols);
      }
    }, 150);
  }

  // ─── updateDashboard ──────────────────────────────────────────────────────

  /**
   * Called each tick to update all visible panels with current game state.
   * @param {Object} gameState - Current game state
   * @param {number} deltaTime - Time since last tick (ms)
   */
  function updateDashboard(gameState, deltaTime) {
    _gameState = gameState;

    // Update header info
    _updateHeader(gameState);

    // Update each open panel
    for (var id in _panelRegistry) {
      if (!Object.prototype.hasOwnProperty.call(_panelRegistry, id)) { continue; }
      if (_panelStates[id] === false) { continue; }
      var def = _panelRegistry[id];
      if (def && def.update) {
        try {
          def.update(gameState);
        } catch (e) {
          // Silently skip failed panel updates
        }
      }
    }

    // Process notifications
    _processNotifications();
  }

  function _updateHeader(state) {
    if (!state || typeof document === 'undefined') { return; }

    var infoEl = _getElementById('dashboard-header-info');
    if (!infoEl) { return; }

    var playerName = (state.player && state.player.name) ? state.player.name : 'Traveler';
    var sparkBalance = (state.player && state.player.spark !== undefined) ? state.player.spark : 0;
    var zoneName = ZONES[_currentZone] ? ZONES[_currentZone].name : _currentZone;
    var timeStr = state.timeOfDay !== undefined ? _formatTime(state.timeOfDay) : '12:00';

    infoEl.innerHTML = '';
    infoEl.appendChild(_createElement('span', {style: 'color:' + COLORS.textMuted}, '[@] ' + _escapeHtml(playerName)));
    infoEl.appendChild(_createElement('span', {style: 'color:' + COLORS.accent}, '[$] ' + _escapeHtml(String(sparkBalance))));
    infoEl.appendChild(_createElement('span', {style: 'color:' + COLORS.text, id: 'dashboard-zone-display'}, '[>] ' + _escapeHtml(zoneName)));
    infoEl.appendChild(_createElement('span', {style: 'color:' + COLORS.textMuted, id: 'dashboard-time-display'}, '[o] ' + _escapeHtml(timeStr)));
  }

  function _processNotifications() {
    // Trim notifications older than 5 seconds (at 60fps, ~300 ticks)
    var now = Date.now();
    _notifications = _notifications.filter(function(n) {
      return now - n.ts < 5000;
    });
  }

  // ─── navigateToZone ───────────────────────────────────────────────────────

  /**
   * Changes the player's current zone in dashboard mode.
   * @param {string} zoneId - Zone to travel to
   */
  function navigateToZone(zoneId) {
    if (!ZONES[zoneId]) { return false; }
    var prevZone = _currentZone;
    _currentZone = zoneId;

    // Add transition notification
    var zoneName = ZONES[zoneId].name;
    _notifications.push({
      ts: Date.now(),
      type: 'zone_change',
      message: 'Traveling to ' + zoneName + '...',
      from: prevZone,
      to: zoneId
    });

    // Update zone-navigator panel
    var def = _panelRegistry['zone-navigator'];
    if (def && def.update) {
      def.update(_gameState);
    }

    // Update header zone display
    var zoneEl = _getElementById('dashboard-zone-display');
    if (zoneEl) {
      zoneEl.textContent = '[>] ' + zoneName;
    }

    return true;
  }

  // ─── getDashboardState ────────────────────────────────────────────────────

  /**
   * Returns current dashboard state.
   */
  function getDashboardState() {
    return {
      initialized: _initialized,
      layout: _currentLayout,
      category: _currentCategory,
      zone: _currentZone,
      panelStates: _copyObj(_panelStates),
      panelPositions: _copyObj(_panelPositions),
      openPanels: _getOpenPanelIds(),
      registeredPanels: Object.keys(_panelRegistry)
    };
  }

  function _copyObj(obj) {
    var result = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        result[k] = obj[k];
      }
    }
    return result;
  }

  function _getOpenPanelIds() {
    var result = [];
    for (var id in _panelStates) {
      if (Object.prototype.hasOwnProperty.call(_panelStates, id) && _panelStates[id] !== false) {
        result.push(id);
      }
    }
    return result;
  }

  // ─── setDashboardLayout ───────────────────────────────────────────────────

  /**
   * Set the dashboard layout.
   * @param {string} layout - 'compact', 'full', or 'minimal'
   */
  function setDashboardLayout(layout) {
    if (LAYOUTS.indexOf(layout) === -1) { return false; }
    _currentLayout = layout;

    if (_panelGrid) {
      var cols = _getColumnCount();
      _panelGrid.style.cssText = _getGridStyle(layout, cols);
    }

    _safeLocalStorage('set', STORAGE_KEY_LAYOUT, layout);
    return true;
  }

  // ─── showPanel / hidePanel / togglePanel ──────────────────────────────────

  /**
   * Show a panel by id.
   */
  function showPanel(panelId) {
    _panelStates[panelId] = true;

    var el = _panelElements[panelId];
    if (el) {
      var def = _panelRegistry[panelId];
      var cat = def ? def.category : 'info';
      var inCategory = _currentCategory === 'all' || cat === _currentCategory;
      el.style.display = inCategory ? 'flex' : 'none';
    } else if (_panelRegistry[panelId] && _panelGrid) {
      // Panel not yet rendered — create and add it
      var regDef = _panelRegistry[panelId];
      var newEl = regDef.create();
      if (newEl) {
        _panelElements[panelId] = newEl;
        _panelGrid.appendChild(newEl);
        _refreshPanelVisibility();
      }
    }

    _savePanelStates();
    return true;
  }

  /**
   * Hide a panel by id.
   */
  function hidePanel(panelId) {
    _panelStates[panelId] = false;

    var el = _panelElements[panelId];
    if (el) {
      el.style.display = 'none';
    }

    _savePanelStates();
    return true;
  }

  /**
   * Toggle a panel's visibility.
   */
  function togglePanel(panelId) {
    if (_panelStates[panelId] === false) {
      return showPanel(panelId);
    } else {
      return hidePanel(panelId);
    }
  }

  // ─── Keyboard Handling ────────────────────────────────────────────────────

  function _setupKeyboardHandlers() {
    if (typeof document === 'undefined') { return; }
    document.addEventListener('keydown', _handleKeyDown);
  }

  function _handleKeyDown(e) {
    var key = e.key;

    // Check registered handlers first
    if (_keyHandlers[key]) {
      _keyHandlers[key](e);
      return;
    }

    // Default dashboard keyboard shortcuts
    switch (key) {
      case 'Tab':
        e.preventDefault();
        _cycleFocusedPanel(e.shiftKey ? -1 : 1);
        break;
      case 'Escape':
        _closeFocusedPanel();
        break;
      case 'i':
      case 'I':
        togglePanel('inventory-panel');
        break;
      case 'c':
      case 'C':
        togglePanel('social-panel');
        break;
      case 'j':
      case 'J':
        togglePanel('quest-panel');
        break;
      case 'm':
      case 'M':
        togglePanel('world-status-panel');
        break;
      case 'p':
      case 'P':
        togglePanel('player-stats-panel');
        break;
      case 'e':
      case 'E':
        togglePanel('economy-panel');
        break;
      case 'g':
      case 'G':
        togglePanel('governance-panel');
        break;
      default:
        break;
    }
  }

  function _cycleFocusedPanel(direction) {
    var openPanels = _getOpenPanelIds();
    if (openPanels.length === 0) { return; }
    _focusedPanelIndex = (_focusedPanelIndex + direction + openPanels.length) % openPanels.length;
    // Visual focus indicator could be added here
  }

  function _closeFocusedPanel() {
    var openPanels = _getOpenPanelIds();
    if (openPanels.length === 0) { return; }
    var idx = Math.min(_focusedPanelIndex, openPanels.length - 1);
    hidePanel(openPanels[idx]);
  }

  /**
   * Register a custom keyboard handler.
   * @param {string} key - Key string (e.g. 'Enter', 'ArrowUp')
   * @param {Function} handler - Handler function
   */
  function registerKeyHandler(key, handler) {
    _keyHandlers[key] = handler;
  }

  /**
   * Get the current keyboard shortcut map.
   */
  function getKeyboardShortcuts() {
    return {
      'Tab': 'cycle panels forward',
      'Shift+Tab': 'cycle panels backward',
      'Escape': 'close focused panel',
      'i/I': 'toggle inventory',
      'c/C': 'toggle social/chat',
      'j/J': 'toggle quests',
      'm/M': 'toggle world status / map',
      'p/P': 'toggle player stats',
      'e/E': 'toggle economy',
      'g/G': 'toggle governance'
    };
  }

  // ─── Responsive Breakpoints ───────────────────────────────────────────────

  /**
   * Get the current responsive breakpoint name.
   */
  function getBreakpoint() {
    var width = _getScreenWidth();
    if (width < BREAKPOINTS.mobile) { return 'mobile'; }
    if (width < BREAKPOINTS.tablet) { return 'tablet'; }
    return 'desktop';
  }

  // ─── localStorage Persistence ─────────────────────────────────────────────

  function _savePanelStates() {
    _safeLocalStorage('set', STORAGE_KEY_PANELS, JSON.stringify(_panelStates));
  }

  function _loadPanelStates() {
    var raw = _safeLocalStorage('get', STORAGE_KEY_PANELS);
    if (!raw) { return {}; }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  function _savePanelPositions() {
    _safeLocalStorage('set', STORAGE_KEY_POSITIONS, JSON.stringify(_panelPositions));
  }

  function _loadSavedState() {
    // Load layout
    var savedLayout = _safeLocalStorage('get', STORAGE_KEY_LAYOUT);
    if (savedLayout && LAYOUTS.indexOf(savedLayout) !== -1) {
      _currentLayout = savedLayout;
    }

    // Load panel states
    var savedPanelStates = _loadPanelStates();
    for (var id in savedPanelStates) {
      if (Object.prototype.hasOwnProperty.call(savedPanelStates, id)) {
        _panelStates[id] = savedPanelStates[id];
      }
    }

    // Load panel positions
    var rawPositions = _safeLocalStorage('get', STORAGE_KEY_POSITIONS);
    if (rawPositions) {
      try {
        var positions = JSON.parse(rawPositions);
        for (var pid in positions) {
          if (Object.prototype.hasOwnProperty.call(positions, pid)) {
            _panelPositions[pid] = positions[pid];
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Save panel position (for draggable panels).
   */
  function savePanelPosition(panelId, x, y) {
    _panelPositions[panelId] = { x: x, y: y };
    _savePanelPositions();
  }

  /**
   * Clear all saved dashboard state from localStorage.
   */
  function clearSavedState() {
    _safeLocalStorage('remove', STORAGE_KEY_LAYOUT);
    _safeLocalStorage('remove', STORAGE_KEY_PANELS);
    _safeLocalStorage('remove', STORAGE_KEY_POSITIONS);
  }

  // ─── addNotification ──────────────────────────────────────────────────────

  /**
   * Add a notification to the dashboard queue.
   */
  function addNotification(message, type) {
    _notifications.push({
      ts: Date.now(),
      type: type || 'info',
      message: message
    });
  }

  /**
   * Get pending notifications.
   */
  function getNotifications() {
    return _notifications.slice();
  }

  // ─── Reset (for testing) ──────────────────────────────────────────────────

  /**
   * Reset internal state. Used for testing.
   */
  function _reset() {
    _container = null;
    _headerEl = null;
    _mainEl = null;
    _footerEl = null;
    _panelGrid = null;
    _currentLayout = 'full';
    _currentCategory = 'all';
    _currentZone = 'nexus';
    _gameState = null;
    _focusedPanelIndex = 0;
    _keyHandlers = {};
    _initialized = false;
    _notifications = [];
    _panelElements = {};
    _panelRegistry = {};
    _panelStates = {};
    _panelPositions = {};
  }

  // ─── Exports ──────────────────────────────────────────────────────────────

  exports.isDashboardMode = isDashboardMode;
  exports.initDashboard = initDashboard;
  exports.createPanel = createPanel;
  exports.updateDashboard = updateDashboard;
  exports.navigateToZone = navigateToZone;
  exports.getDashboardState = getDashboardState;
  exports.setDashboardLayout = setDashboardLayout;
  exports.showPanel = showPanel;
  exports.hidePanel = hidePanel;
  exports.togglePanel = togglePanel;
  exports.registerPanel = registerPanel;
  exports.getPanel = getPanel;
  exports.getAllPanels = getAllPanels;
  exports.getPanelsByCategory = getPanelsByCategory;
  exports.registerKeyHandler = registerKeyHandler;
  exports.getKeyboardShortcuts = getKeyboardShortcuts;
  exports.getBreakpoint = getBreakpoint;
  exports.savePanelPosition = savePanelPosition;
  exports.clearSavedState = clearSavedState;
  exports.addNotification = addNotification;
  exports.getNotifications = getNotifications;
  exports.LAYOUTS = LAYOUTS;
  exports.CATEGORIES = CATEGORIES;
  exports.COLORS = COLORS;
  exports.BREAKPOINTS = BREAKPOINTS;
  exports.ZONES = ZONES;
  // Internal helpers exposed for testing
  exports._reset = _reset;
  exports._formatTime = _formatTime;
  exports._getColumnCount = _getColumnCount;
  exports._escapeHtml = _escapeHtml;
  exports._getScreenWidth = _getScreenWidth;

})(typeof module !== 'undefined' ? module.exports : (window.Dashboard = {}));
