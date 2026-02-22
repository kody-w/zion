/**
 * dashboard_zones.js — Zone Navigator panel for ZION dashboard (UI-only) mode
 * Provides zone browsing, details, and simulated travel without 3D rendering.
 * Layer: UI-only, no 3D dependency
 */
(function(exports) {
  'use strict';

  // ─── Zone Data ─────────────────────────────────────────────────────────────

  var ZONE_INFO = {
    nexus: {
      id: 'nexus',
      name: 'The Nexus',
      desc: 'Central hub where all paths converge. A place of meeting and new beginnings.',
      cx: 0,
      cz: 0,
      radius: 60,
      terrain: 'Stone plaza with glowing runes',
      npcs: ['Herald', 'Guide', 'Merchant']
    },
    gardens: {
      id: 'gardens',
      name: 'The Gardens',
      desc: 'Lush terraced gardens where communities grow food and tend the earth together.',
      cx: 200,
      cz: 30,
      radius: 80,
      terrain: 'Rolling green hills, flower beds, orchards',
      npcs: ['Gardener', 'Herbalist', 'Beekeeper']
    },
    athenaeum: {
      id: 'athenaeum',
      name: 'The Athenaeum',
      desc: 'A vast open-air library and school. Knowledge is freely shared here.',
      cx: 100,
      cz: -220,
      radius: 60,
      terrain: 'Sandstone shelves, reading alcoves, fountains',
      npcs: ['Librarian', 'Scholar', 'Teacher']
    },
    studio: {
      id: 'studio',
      name: 'The Studio',
      desc: 'Creative workshops where art, music, and craft flourish.',
      cx: -200,
      cz: -100,
      radius: 60,
      terrain: 'Colorful workshops, kilns, stages',
      npcs: ['Artist', 'Musician', 'Sculptor']
    },
    wilds: {
      id: 'wilds',
      name: 'The Wilds',
      desc: 'Untamed wilderness stretching beyond the settled zones. Adventure awaits.',
      cx: -30,
      cz: 260,
      radius: 90,
      terrain: 'Dense forest, rivers, caves, cliffs',
      npcs: ['Ranger', 'Explorer', 'Hermit']
    },
    agora: {
      id: 'agora',
      name: 'The Agora',
      desc: 'The marketplace and civic center. Trade, debate, and governance happen here.',
      cx: -190,
      cz: 120,
      radius: 55,
      terrain: 'Market stalls, amphitheater, council hall',
      npcs: ['Merchant', 'Politician', 'Auctioneer']
    },
    commons: {
      id: 'commons',
      name: 'The Commons',
      desc: 'Open gathering grounds for festivals, games, and community events.',
      cx: 170,
      cz: 190,
      radius: 55,
      terrain: 'Open fields, pavilions, campfire circles',
      npcs: ['Storyteller', 'Cook', 'Musician']
    },
    arena: {
      id: 'arena',
      name: 'The Arena',
      desc: 'Competitive grounds where citizens test their skills in fair contest.',
      cx: 0,
      cz: -240,
      radius: 55,
      terrain: 'Sand pit, spectator stands, trophy hall',
      npcs: ['Champion', 'Trainer', 'Referee']
    }
  };

  // Order used for grid layout
  var ZONE_IDS = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  // ─── Distance & Cost ────────────────────────────────────────────────────────

  /**
   * Calculate Euclidean distance between two zone centers.
   * @param {string} fromZone  - zone id
   * @param {string} toZone    - zone id
   * @returns {number}
   */
  function getZoneDistance(fromZone, toZone) {
    var a = ZONE_INFO[fromZone];
    var b = ZONE_INFO[toZone];
    if (!a || !b) return 0;
    var dx = a.cx - b.cx;
    var dz = a.cz - b.cz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Calculate Spark travel cost between two zones.
   * Cost = Math.ceil(distance / 100), minimum 1.
   * Same-zone cost is 0.
   * @param {string} fromZone
   * @param {string} toZone
   * @returns {number}
   */
  function getTravelCost(fromZone, toZone) {
    if (fromZone === toZone) return 0;
    var dist = getZoneDistance(fromZone, toZone);
    return Math.max(1, Math.ceil(dist / 100));
  }

  // ─── Zone Data Accessors ────────────────────────────────────────────────────

  /**
   * Returns full zone info object, or null if not found.
   * @param {string} zoneId
   * @returns {Object|null}
   */
  function getZoneDetails(zoneId) {
    return ZONE_INFO[zoneId] || null;
  }

  /**
   * Returns list of NPC types in a zone.
   * @param {string} zoneId
   * @returns {Array}
   */
  function getZoneNPCs(zoneId) {
    var z = ZONE_INFO[zoneId];
    if (!z) return [];
    return z.npcs.slice();
  }

  /**
   * Returns a text summary for a zone.
   * Example: "The Gardens — 3 NPCs, Sunny, 2 active events, 145 units away"
   * @param {string} zoneId
   * @param {Object} gameState  - optional; may have currentZone, weather, events
   * @returns {string}
   */
  function getZoneSummary(zoneId, gameState) {
    var z = ZONE_INFO[zoneId];
    if (!z) return 'Unknown zone';

    var parts = [z.name];
    var npcCount = z.npcs.length;
    parts.push(npcCount + ' NPCs');

    var weather = 'Clear';
    var eventCount = 0;
    var distStr = '';

    if (gameState) {
      if (gameState.weather && gameState.weather[zoneId]) {
        weather = gameState.weather[zoneId];
      } else if (gameState.weather && typeof gameState.weather === 'string') {
        weather = gameState.weather;
      }

      if (gameState.events && Array.isArray(gameState.events)) {
        for (var i = 0; i < gameState.events.length; i++) {
          if (gameState.events[i].zone === zoneId) eventCount++;
        }
      }

      if (gameState.currentZone && gameState.currentZone !== zoneId) {
        var dist = Math.round(getZoneDistance(gameState.currentZone, zoneId));
        distStr = dist + ' units away';
      } else if (gameState.currentZone === zoneId) {
        distStr = 'current location';
      }
    }

    parts.push(weather);
    parts.push(eventCount + ' active events');
    if (distStr) parts.push(distStr);

    return parts.join(', ');
  }

  /**
   * Returns all zones sorted by the given criterion.
   * sortBy: 'distance' (default, nearest first), 'name', 'alphabetical'
   * @param {string} currentZone
   * @param {string} sortBy
   * @returns {Array} array of zone info objects with added distance/cost
   */
  function getAllZonesSorted(currentZone, sortBy) {
    var sorted = ZONE_IDS.map(function(id) {
      var z = ZONE_INFO[id];
      var dist = getZoneDistance(currentZone, id);
      return {
        id: id,
        name: z.name,
        desc: z.desc,
        cx: z.cx,
        cz: z.cz,
        radius: z.radius,
        terrain: z.terrain,
        npcs: z.npcs.slice(),
        distance: Math.round(dist),
        cost: getTravelCost(currentZone, id)
      };
    });

    var criterion = sortBy || 'distance';

    if (criterion === 'distance') {
      sorted.sort(function(a, b) { return a.distance - b.distance; });
    } else if (criterion === 'name' || criterion === 'alphabetical') {
      sorted.sort(function(a, b) {
        return a.name.localeCompare(b.name);
      });
    }

    return sorted;
  }

  // ─── ASCII Map ──────────────────────────────────────────────────────────────

  /**
   * Renders a text-based ASCII map of all zones.
   * Positions are derived from the zone cx/cz coordinates mapped to a fixed grid.
   * @param {string} currentZone  - zone id to highlight
   * @returns {string}  multi-line string
   */
  function renderAsciiMap(currentZone) {
    // Grid dimensions
    var COLS = 56;
    var ROWS = 14;

    // Initialise a blank grid
    var grid = [];
    var r, c;
    for (r = 0; r < ROWS; r++) {
      var row = [];
      for (c = 0; c < COLS; c++) {
        row.push(' ');
      }
      grid.push(row);
    }

    // World extents used for mapping (cx: -250..250, cz: -290..300)
    var CX_MIN = -260;
    var CX_MAX = 260;
    var CZ_MIN = -290;
    var CZ_MAX = 310;

    // Abbreviations for the map (6 chars wide + brackets = 8 chars)
    var ABBREV = {
      nexus:     'NEXUS ',
      gardens:   'GARDNS',
      athenaeum: 'ATHNM ',
      studio:    'STUDIO',
      wilds:     'WILDS ',
      agora:     'AGORA ',
      commons:   'COMONS',
      arena:     'ARENA '
    };

    function worldToGrid(cx, cz) {
      // Map cx -> col, cz -> row (note: higher cz = further "down" in world but up on screen)
      var col = Math.round(((cx - CX_MIN) / (CX_MAX - CX_MIN)) * (COLS - 10));
      var row = Math.round(((CZ_MAX - cz) / (CZ_MAX - CZ_MIN)) * (ROWS - 2));
      // Clamp
      col = Math.max(0, Math.min(COLS - 9, col));
      row = Math.max(0, Math.min(ROWS - 2, row));
      return { col: col, row: row };
    }

    // Place zone labels
    for (var zid in ZONE_INFO) {
      var z = ZONE_INFO[zid];
      var pos = worldToGrid(z.cx, z.cz);
      var abbr = ABBREV[zid] || zid.toUpperCase().substring(0, 6);
      var isCurrent = (zid === currentZone);
      var label = isCurrent ? ('[' + abbr + ']') : (' ' + abbr + ' ');
      // label is 8 chars
      for (var ch = 0; ch < label.length && (pos.col + ch) < COLS; ch++) {
        grid[pos.row][pos.col + ch] = label[ch];
      }
    }

    // Build header/footer border
    var border = '+' + repeat('-', COLS) + '+';
    var lines = [border];
    for (r = 0; r < ROWS; r++) {
      lines.push('|' + grid[r].join('') + '|');
    }
    lines.push(border);

    // Legend
    lines.push('');
    lines.push('  [ZONE] = current zone   ZONE  = other zone');

    return lines.join('\n');
  }

  function repeat(ch, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += ch;
    return s;
  }

  // ─── HTML Formatting ────────────────────────────────────────────────────────

  /**
   * Returns HTML string for a zone card.
   * @param {string} zoneId
   * @param {string} currentZone
   * @param {Object} gameState  - optional
   * @returns {string}
   */
  function formatZoneCard(zoneId, currentZone, gameState) {
    var z = ZONE_INFO[zoneId];
    if (!z) return '';

    var isCurrent = (zoneId === currentZone);
    var dist = Math.round(getZoneDistance(currentZone, zoneId));
    var cost = getTravelCost(currentZone, zoneId);

    var weather = 'Clear';
    var eventCount = 0;

    if (gameState) {
      if (gameState.weather && gameState.weather[zoneId]) {
        weather = gameState.weather[zoneId];
      } else if (gameState.weather && typeof gameState.weather === 'string') {
        weather = gameState.weather;
      }
      if (gameState.events && Array.isArray(gameState.events)) {
        for (var i = 0; i < gameState.events.length; i++) {
          if (gameState.events[i].zone === zoneId) eventCount++;
        }
      }
    }

    var cardClass = 'dz-zone-card' + (isCurrent ? ' dz-zone-card--current' : '');
    var npcList = z.npcs.join(', ');
    var travelBtn = isCurrent
      ? '<span class="dz-btn dz-btn--disabled">[*] Here</span>'
      : '<button class="dz-btn dz-btn--travel" data-zone="' + zoneId + '">[>] Travel (' + cost + ' Spark)</button>';

    var distLabel = isCurrent
      ? '<span class="dz-current-label">[*] Current Location</span>'
      : '<span class="dz-distance">' + dist + ' units away</span>';

    var eventsStr = eventCount > 0
      ? '<span class="dz-events">[+] ' + eventCount + ' active event' + (eventCount !== 1 ? 's' : '') + '</span>'
      : '<span class="dz-events dz-events--none">[-] No active events</span>';

    return (
      '<div class="' + cardClass + '" data-zone-id="' + zoneId + '">' +
        '<div class="dz-zone-header">' +
          '<span class="dz-zone-name">' + escapeHtml(z.name) + '</span>' +
          distLabel +
        '</div>' +
        '<p class="dz-zone-desc">' + escapeHtml(z.desc) + '</p>' +
        '<div class="dz-zone-meta">' +
          '<span class="dz-terrain">[~] ' + escapeHtml(z.terrain) + '</span>' +
          '<span class="dz-npcs">[&] NPCs: ' + escapeHtml(npcList) + '</span>' +
          '<span class="dz-weather">[W] ' + escapeHtml(weather) + '</span>' +
          eventsStr +
        '</div>' +
        '<div class="dz-zone-actions">' +
          travelBtn +
        '</div>' +
      '</div>'
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── DOM Panel Construction ─────────────────────────────────────────────────

  /**
   * Creates and returns the Zone Navigator DOM element.
   * Works in both browser (document available) and test (document mock) contexts.
   * @returns {Element}
   */
  function createZoneNavigator() {
    var container = _createElement('div');
    container.className = 'dz-zone-navigator';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Zone Navigator');

    // ── Header ──
    var header = _createElement('div');
    header.className = 'dz-nav-header';
    header.innerHTML = '<h2 class="dz-nav-title">Zone Navigator</h2>' +
      '<span class="dz-nav-subtitle">Browse and travel between zones</span>';
    container.appendChild(header);

    // ── ASCII Map ──
    var mapSection = _createElement('div');
    mapSection.className = 'dz-map-section';

    var mapLabel = _createElement('div');
    mapLabel.className = 'dz-map-label';
    mapLabel.textContent = 'World Map';
    mapSection.appendChild(mapLabel);

    var mapPre = _createElement('pre');
    mapPre.className = 'dz-ascii-map';
    mapPre.textContent = renderAsciiMap('nexus');
    mapSection.appendChild(mapPre);
    container.appendChild(mapSection);

    // ── Sort Controls ──
    var controls = _createElement('div');
    controls.className = 'dz-controls';

    var sortLabel = _createElement('span');
    sortLabel.className = 'dz-sort-label';
    sortLabel.textContent = 'Sort: ';
    controls.appendChild(sortLabel);

    var sortOptions = [
      { value: 'distance', label: 'By Distance' },
      { value: 'name',     label: 'By Name'     }
    ];
    for (var si = 0; si < sortOptions.length; si++) {
      var btn = _createElement('button');
      btn.className = 'dz-sort-btn' + (si === 0 ? ' dz-sort-btn--active' : '');
      btn.setAttribute('data-sort', sortOptions[si].value);
      btn.textContent = sortOptions[si].label;
      controls.appendChild(btn);
    }
    container.appendChild(controls);

    // ── Zone Cards List ──
    var cardList = _createElement('div');
    cardList.className = 'dz-zone-list';
    cardList.setAttribute('data-current-zone', 'nexus');

    var defaultZones = getAllZonesSorted('nexus', 'distance');
    for (var zi = 0; zi < defaultZones.length; zi++) {
      var cardHtml = formatZoneCard(defaultZones[zi].id, 'nexus', null);
      var wrapper = _createElement('div');
      wrapper.innerHTML = cardHtml;
      if (wrapper.firstChild) {
        cardList.appendChild(wrapper.firstChild);
      }
    }
    container.appendChild(cardList);

    // ── Inject Styles ──
    _injectStyles();

    return container;
  }

  /**
   * Updates the Zone Navigator panel with current game state.
   * @param {Element} panel      - the element returned by createZoneNavigator()
   * @param {Object}  state      - game state: { currentZone, weather, events, ... }
   */
  function updateZoneNavigator(panel, state) {
    if (!panel || !state) return;

    var currentZone = (state.currentZone && ZONE_INFO[state.currentZone])
      ? state.currentZone
      : 'nexus';

    // Update ASCII map
    var mapEl = panel.querySelector ? panel.querySelector('.dz-ascii-map') : null;
    if (mapEl) {
      mapEl.textContent = renderAsciiMap(currentZone);
    }

    // Update card list
    var cardList = panel.querySelector ? panel.querySelector('.dz-zone-list') : null;
    if (cardList) {
      cardList.setAttribute('data-current-zone', currentZone);

      // Determine current sort
      var activeSortBtn = panel.querySelector ? panel.querySelector('.dz-sort-btn--active') : null;
      var sortBy = activeSortBtn ? (activeSortBtn.getAttribute('data-sort') || 'distance') : 'distance';

      var zones = getAllZonesSorted(currentZone, sortBy);
      // Clear existing cards
      while (cardList.firstChild) {
        cardList.removeChild(cardList.firstChild);
      }
      // Re-render
      for (var zi = 0; zi < zones.length; zi++) {
        var cardHtml = formatZoneCard(zones[zi].id, currentZone, state);
        var wrapper = _createElement('div');
        wrapper.innerHTML = cardHtml;
        if (wrapper.firstChild) {
          cardList.appendChild(wrapper.firstChild);
        }
      }
    }
  }

  // ─── DOM helpers (work in Node.js without jsdom) ──────────────────────────

  function _createElement(tag) {
    // Browser
    if (typeof document !== 'undefined') {
      return document.createElement(tag);
    }
    // Minimal Node.js mock element
    return _mockElement(tag);
  }

  function _mockElement(tag) {
    var el = {
      _tag: tag,
      _children: [],
      _attrs: {},
      className: '',
      textContent: '',
      firstChild: null,
      style: {},
      querySelector: function(sel) {
        return _mockQuerySelector(el, sel);
      },
      querySelectorAll: function(sel) {
        return _mockQuerySelectorAll(el, sel);
      },
      getAttribute: function(name) {
        return el._attrs[name] !== undefined ? el._attrs[name] : null;
      },
      setAttribute: function(name, value) {
        el._attrs[name] = String(value);
      },
      appendChild: function(child) {
        el._children.push(child);
        el.firstChild = el._children[0] || null;
        return child;
      },
      removeChild: function(child) {
        var idx = el._children.indexOf(child);
        if (idx !== -1) el._children.splice(idx, 1);
        el.firstChild = el._children[0] || null;
      }
    };

    // innerHTML setter: parse the HTML string and populate _children with mock elements
    // so that firstChild works in Node.js test environment.
    Object.defineProperty(el, 'innerHTML', {
      get: function() {
        return el._innerHTMLValue || '';
      },
      set: function(html) {
        el._innerHTMLValue = html;
        // Clear existing children
        el._children = [];
        el.firstChild = null;
        if (!html || html.trim() === '') return;
        // Parse top-level elements from HTML string
        var parsed = _parseHTMLChildren(html);
        for (var pi = 0; pi < parsed.length; pi++) {
          el._children.push(parsed[pi]);
        }
        el.firstChild = el._children[0] || null;
      },
      enumerable: true,
      configurable: true
    });

    return el;
  }

  /**
   * Very lightweight HTML parser for mock elements.
   * Extracts top-level elements and their class/data attributes.
   * Supports: class="...", data-*="...", and recursively handles children.
   */
  function _parseHTMLChildren(html) {
    var elements = [];
    var pos = 0;
    var len = html.length;

    while (pos < len) {
      // Skip whitespace and text nodes
      var tagStart = html.indexOf('<', pos);
      if (tagStart === -1) break;

      // Skip closing tags at this level
      if (html[tagStart + 1] === '/') {
        break;
      }

      // Find end of opening tag
      var tagEnd = html.indexOf('>', tagStart);
      if (tagEnd === -1) break;

      var isSelfClosing = html[tagEnd - 1] === '/';
      var openTag = html.substring(tagStart + 1, isSelfClosing ? tagEnd - 1 : tagEnd);

      // Extract tag name
      var spaceIdx = openTag.search(/[\s\/]/);
      var tagName = spaceIdx === -1 ? openTag : openTag.substring(0, spaceIdx);
      if (!tagName) { pos = tagEnd + 1; continue; }

      // Create element
      var child = _mockElement(tagName.toLowerCase());

      // Extract class attribute
      var classMatch = openTag.match(/class="([^"]*)"/);
      if (classMatch) child.className = classMatch[1];

      // Extract data-* and other attributes
      var attrRegex = /(\w[\w\-]*)="([^"]*)"/g;
      var attrMatch;
      while ((attrMatch = attrRegex.exec(openTag)) !== null) {
        if (attrMatch[1] !== 'class') {
          child.setAttribute(attrMatch[1], attrMatch[2]);
        }
      }

      if (isSelfClosing) {
        elements.push(child);
        pos = tagEnd + 1;
      } else {
        // Find matching closing tag (handles nesting)
        var closeTag = '</' + tagName;
        var depth = 1;
        var searchPos = tagEnd + 1;
        while (depth > 0 && searchPos < len) {
          var nextOpen = html.indexOf('<' + tagName, searchPos);
          var nextClose = html.indexOf(closeTag, searchPos);
          if (nextClose === -1) break;
          if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            searchPos = nextOpen + 1;
          } else {
            depth--;
            if (depth === 0) {
              // Content between opening and closing tags
              var innerHtml = html.substring(tagEnd + 1, nextClose);
              child.textContent = innerHtml.replace(/<[^>]*>/g, '');
              // Recursively parse inner children
              if (innerHtml.indexOf('<') !== -1) {
                child.innerHTML = innerHtml;
              }
              pos = nextClose + closeTag.length + 1;
              elements.push(child);
              break;
            }
            searchPos = nextClose + 1;
          }
        }
        if (depth !== 0) {
          // Unclosed tag, skip
          pos = tagEnd + 1;
        }
      }
    }

    return elements;
  }

  function _mockQuerySelector(el, sel) {
    // Very simple selector: only class selectors (.foo) supported
    if (!sel || sel[0] !== '.') return null;
    var cls = sel.substring(1);
    return _findByClass(el, cls);
  }

  function _mockQuerySelectorAll(el, sel) {
    if (!sel || sel[0] !== '.') return [];
    var cls = sel.substring(1);
    var results = [];
    _collectByClass(el, cls, results);
    return results;
  }

  function _findByClass(el, cls) {
    if (_hasClass(el, cls)) return el;
    for (var i = 0; i < el._children.length; i++) {
      var found = _findByClass(el._children[i], cls);
      if (found) return found;
    }
    return null;
  }

  function _collectByClass(el, cls, results) {
    if (_hasClass(el, cls)) results.push(el);
    for (var i = 0; i < el._children.length; i++) {
      _collectByClass(el._children[i], cls, results);
    }
  }

  function _hasClass(el, cls) {
    if (!el || !el.className) return false;
    return (' ' + el.className + ' ').indexOf(' ' + cls + ' ') !== -1;
  }

  function _injectStyles() {
    // Only inject in browser context
    if (typeof document === 'undefined') return;
    if (document.getElementById('dz-styles')) return;

    var style = document.createElement('style');
    style.id = 'dz-styles';
    style.textContent = [
      '.dz-zone-navigator {',
      '  font-family: "Courier New", Courier, monospace;',
      '  background: #1a1814;',
      '  color: #C8BCA8;',
      '  padding: 16px;',
      '  border-radius: 4px;',
      '  max-width: 800px;',
      '  box-sizing: border-box;',
      '}',
      '.dz-nav-header { margin-bottom: 12px; }',
      '.dz-nav-title {',
      '  color: #DAA520;',
      '  font-size: 1.2em;',
      '  margin: 0 0 4px 0;',
      '}',
      '.dz-nav-subtitle {',
      '  color: #A0978E;',
      '  font-size: 0.85em;',
      '}',
      '.dz-map-section { margin-bottom: 16px; }',
      '.dz-map-label {',
      '  color: #DAA520;',
      '  font-size: 0.8em;',
      '  text-transform: uppercase;',
      '  letter-spacing: 2px;',
      '  margin-bottom: 4px;',
      '}',
      '.dz-ascii-map {',
      '  background: #120F0D;',
      '  border: 1px solid #3A3530;',
      '  padding: 8px;',
      '  font-size: 0.75em;',
      '  line-height: 1.4;',
      '  color: #8A8078;',
      '  overflow-x: auto;',
      '  white-space: pre;',
      '}',
      '.dz-controls {',
      '  margin-bottom: 12px;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '}',
      '.dz-sort-label { color: #A0978E; font-size: 0.85em; }',
      '.dz-sort-btn {',
      '  background: #2A2520;',
      '  border: 1px solid #3A3530;',
      '  color: #C8BCA8;',
      '  padding: 4px 10px;',
      '  cursor: pointer;',
      '  font-family: inherit;',
      '  font-size: 0.82em;',
      '}',
      '.dz-sort-btn--active {',
      '  background: #3A2E10;',
      '  border-color: #DAA520;',
      '  color: #DAA520;',
      '}',
      '.dz-zone-list {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 10px;',
      '  max-height: 480px;',
      '  overflow-y: auto;',
      '}',
      '.dz-zone-card {',
      '  background: #201D19;',
      '  border: 1px solid #3A3530;',
      '  padding: 12px;',
      '  border-radius: 3px;',
      '}',
      '.dz-zone-card--current {',
      '  border-color: #DAA520;',
      '  background: #221E0E;',
      '}',
      '.dz-zone-header {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: center;',
      '  margin-bottom: 6px;',
      '}',
      '.dz-zone-name {',
      '  color: #E8D8A0;',
      '  font-size: 1em;',
      '  font-weight: bold;',
      '}',
      '.dz-zone-card--current .dz-zone-name { color: #DAA520; }',
      '.dz-current-label { color: #DAA520; font-size: 0.82em; }',
      '.dz-distance { color: #A0978E; font-size: 0.82em; }',
      '.dz-zone-desc {',
      '  color: #A0978E;',
      '  font-size: 0.85em;',
      '  margin: 0 0 8px 0;',
      '  line-height: 1.5;',
      '}',
      '.dz-zone-meta {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 6px;',
      '  margin-bottom: 10px;',
      '}',
      '.dz-zone-meta span {',
      '  font-size: 0.78em;',
      '  color: #7A7268;',
      '  background: #151210;',
      '  padding: 2px 6px;',
      '  border-radius: 2px;',
      '}',
      '.dz-events { color: #8A9A6A !important; }',
      '.dz-events--none { color: #5A5248 !important; }',
      '.dz-zone-actions { display: flex; gap: 8px; }',
      '.dz-btn {',
      '  font-family: inherit;',
      '  font-size: 0.82em;',
      '  padding: 5px 12px;',
      '  cursor: pointer;',
      '  border-radius: 2px;',
      '}',
      '.dz-btn--travel {',
      '  background: #2A2010;',
      '  border: 1px solid #DAA520;',
      '  color: #DAA520;',
      '}',
      '.dz-btn--travel:hover {',
      '  background: #3A2E10;',
      '}',
      '.dz-btn--disabled {',
      '  background: #1A1814;',
      '  border: 1px solid #3A3530;',
      '  color: #5A5248;',
      '  cursor: default;',
      '}'
    ].join('\n');

    document.head.appendChild(style);
  }

  // ─── Exports ────────────────────────────────────────────────────────────────

  exports.ZONE_INFO         = ZONE_INFO;
  exports.ZONE_IDS          = ZONE_IDS;
  exports.createZoneNavigator  = createZoneNavigator;
  exports.updateZoneNavigator  = updateZoneNavigator;
  exports.renderAsciiMap    = renderAsciiMap;
  exports.getZoneDistance   = getZoneDistance;
  exports.getTravelCost     = getTravelCost;
  exports.getZoneDetails    = getZoneDetails;
  exports.getZoneNPCs       = getZoneNPCs;
  exports.getZoneSummary    = getZoneSummary;
  exports.formatZoneCard    = formatZoneCard;
  exports.getAllZonesSorted  = getAllZonesSorted;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardZones = {}));
