// yaml_dash.js
/**
 * yaml_dash.js — Live YAML Dashboard for ZION
 *
 * Provides JSON-to-YAML conversion (ported from scripts/json2yml.py),
 * an interactive collapsible tree data structure, and a browser panel.
 *
 * UMD module: window.YamlDash (browser) or module.exports (Node.js)
 * ES5 compatible — uses var, no const/let inside module body.
 */
(function(exports) {
  'use strict';

  // ─── YAML conversion constants ─────────────────────────────────────────────

  // Words YAML parsers interpret as booleans or null (checked case-insensitively)
  var YAML_BOOL_NULL = {
    'true': true, 'false': true, 'yes': true, 'no': true,
    'on': true, 'off': true, 'null': true, '~': true
  };

  // Matches numeric strings: int/float, optionally negative, optionally scientific
  var LOOKS_NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

  // Matches date/timestamp strings starting with YYYY-MM-DD
  var LOOKS_DATE = /^\d{4}-\d{2}-\d{2}/;

  // Characters that require quoting when they start a string
  var SPECIAL_START_CHARS = { '#': true, '@': true, '&': true, '*': true,
                               '|': true, '>': true, '!': true, '%': true,
                               '[': true, '{': true };

  // ─── Internal YAML helpers ─────────────────────────────────────────────────

  function _needsQuoting(s) {
    if (s === '') return true;
    if (YAML_BOOL_NULL[s.toLowerCase()]) return true;
    if (LOOKS_NUMERIC.test(s)) return true;
    if (LOOKS_DATE.test(s)) return true;
    if (SPECIAL_START_CHARS[s[0]]) return true;
    if (s.indexOf(': ') !== -1 || s[s.length - 1] === ':') return true;
    if (s[0] === '"' || s[0] === "'" || s[0] === ' ' || s[0] === ',') return true;
    if (s[s.length - 1] === ' ') return true;
    if (s.indexOf("'") !== -1) return true;
    return false;
  }

  function _quote(s) {
    // Single-quote a string, escaping internal single quotes by doubling
    return "'" + s.replace(/'/g, "''") + "'";
  }

  function _needsKeyQuoting(key) {
    if (key === '') return true;
    if (YAML_BOOL_NULL[key.toLowerCase()]) return true;
    if (LOOKS_NUMERIC.test(key)) return true;
    if (LOOKS_DATE.test(key)) return true;
    if (SPECIAL_START_CHARS[key[0]]) return true;
    if (key.indexOf(': ') !== -1 || key[key.length - 1] === ':') return true;
    if (key[0] === '"' || key[0] === "'" || key[0] === ' ' || key[0] === ',') return true;
    if (key[key.length - 1] === ' ') return true;
    return false;
  }

  function _formatKey(key) {
    if (_needsKeyQuoting(key)) return _quote(key);
    return key;
  }

  function _formatScalar(value) {
    if (value === null) return 'null';
    if (value === true) return 'true';
    if (value === false) return 'false';
    if (typeof value === 'number') return String(value);
    // String
    if (typeof value === 'string') {
      if (value.indexOf('\n') !== -1) return null; // signal: use block scalar
      if (_needsQuoting(value)) return _quote(value);
      return value;
    }
    return String(value);
  }

  function _renderBlockScalar(s, indent) {
    var prefix = _repeat(' ', indent);
    var header, body;
    if (s[s.length - 1] === '\n') {
      header = '|';
      body = s.slice(0, s.length - 1);
    } else {
      header = '|-';
      body = s;
    }
    var lines = body.split('\n');
    var result = header + '\n';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line) {
        result += prefix + line + '\n';
      } else {
        result += '\n';
      }
    }
    return result;
  }

  function _repeat(str, n) {
    var out = '';
    for (var i = 0; i < n; i++) out += str;
    return out;
  }

  function _isObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function _isArray(v) {
    return Array.isArray(v);
  }

  function _render(value, indent, inlineFirst) {
    var prefix = _repeat(' ', indent);
    indent = indent || 0;
    inlineFirst = inlineFirst || false;

    // Dict / Object
    if (_isObject(value)) {
      var keys = Object.keys(value);
      if (keys.length === 0) {
        return inlineFirst ? '{}\n' : prefix + '{}\n';
      }
      var lines = [];
      var first = true;
      for (var ki = 0; ki < keys.length; ki++) {
        var key = keys[ki];
        var val = value[key];
        var fk = _formatKey(String(key));
        var linePrefix = (first && inlineFirst) ? '' : prefix;

        if (_isObject(val)) {
          if (Object.keys(val).length === 0) {
            lines.push(linePrefix + fk + ': {}\n');
          } else {
            lines.push(linePrefix + fk + ':\n');
            lines.push(_render(val, indent + 2, false));
          }
        } else if (_isArray(val)) {
          if (val.length === 0) {
            lines.push(linePrefix + fk + ': []\n');
          } else {
            lines.push(linePrefix + fk + ':\n');
            lines.push(_render(val, indent + 2, false));
          }
        } else if (typeof val === 'string' && val.indexOf('\n') !== -1) {
          lines.push(linePrefix + fk + ': ' + _renderBlockScalar(val, indent + 2));
        } else {
          var scalar = _formatScalar(val);
          lines.push(linePrefix + fk + ': ' + scalar + '\n');
        }
        first = false;
      }
      return lines.join('');
    }

    // Array
    if (_isArray(value)) {
      if (value.length === 0) {
        return inlineFirst ? '[]\n' : prefix + '[]\n';
      }
      var arrLines = [];
      var arrFirst = true;
      for (var ai = 0; ai < value.length; ai++) {
        var item = value[ai];
        var arrPrefix = (arrFirst && inlineFirst) ? '' : prefix;

        if (_isObject(item)) {
          if (Object.keys(item).length === 0) {
            arrLines.push(arrPrefix + '- {}\n');
          } else {
            arrLines.push(arrPrefix + '- ' + _render(item, indent + 2, true));
          }
        } else if (_isArray(item)) {
          if (item.length === 0) {
            arrLines.push(arrPrefix + '- []\n');
          } else {
            arrLines.push(arrPrefix + '- ' + _render(item, indent + 2, true));
          }
        } else if (typeof item === 'string' && item.indexOf('\n') !== -1) {
          arrLines.push(arrPrefix + '- ' + _renderBlockScalar(item, indent + 2));
        } else {
          var sc = _formatScalar(item);
          arrLines.push(arrPrefix + '- ' + sc + '\n');
        }
        arrFirst = false;
      }
      return arrLines.join('');
    }

    // Scalar (top-level)
    if (typeof value === 'string' && value.indexOf('\n') !== -1) {
      return _renderBlockScalar(value, indent);
    }
    var topScalar = _formatScalar(value);
    if (inlineFirst) return topScalar + '\n';
    return prefix + topScalar + '\n';
  }

  // ─── Public: jsonToYaml ───────────────────────────────────────────────────

  /**
   * Convert a JSON-compatible JS value to a YAML string.
   * @param {*} data
   * @returns {string} YAML string
   */
  function jsonToYaml(data) {
    return _render(data, 0, false);
  }

  // ─── Tree data structure ──────────────────────────────────────────────────

  /**
   * Determine the type string for a value.
   */
  function _typeOf(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  }

  /**
   * Build a tree node from a JSON value.
   * @param {*} data — any JSON-compatible value
   * @param {string} [path] — dot-path for this node
   * @param {number} [depth] — current depth (0 = root)
   * @param {string} [key] — key name for this node
   * @returns {Object} tree node
   */
  function buildTree(data, path, depth, key) {
    path = (path === undefined || path === null) ? '' : path;
    depth = depth || 0;
    key = (key === undefined || key === null) ? '' : String(key);

    var type = _typeOf(data);
    var node = {
      key: key,
      value: (type === 'object' || type === 'array') ? null : data,
      type: type,
      children: [],
      path: path,
      collapsed: true,
      depth: depth
    };

    if (type === 'object') {
      var objKeys = Object.keys(data);
      for (var i = 0; i < objKeys.length; i++) {
        var k = objKeys[i];
        var childPath = path ? (path + '.' + k) : k;
        node.children.push(buildTree(data[k], childPath, depth + 1, k));
      }
    } else if (type === 'array') {
      for (var ai = 0; ai < data.length; ai++) {
        var arrPath = path ? (path + '[' + ai + ']') : ('[' + ai + ']');
        node.children.push(buildTree(data[ai], arrPath, depth + 1, String(ai)));
      }
    }

    return node;
  }

  /**
   * Find a node by path in the tree (depth-first).
   * @param {Object} node
   * @param {string} path
   * @returns {Object|null}
   */
  function _findNode(node, path) {
    if (node.path === path) return node;
    for (var i = 0; i < node.children.length; i++) {
      var found = _findNode(node.children[i], path);
      if (found) return found;
    }
    return null;
  }

  /**
   * Toggle expand/collapse on a node at the given path.
   * @param {Object} tree — root node
   * @param {string} path — dot-path to toggle
   */
  function toggleNode(tree, path) {
    var node = _findNode(tree, path);
    if (node && node.children.length > 0) {
      node.collapsed = !node.collapsed;
    }
  }

  /**
   * Get all visible nodes (collapsed children are hidden) in traversal order.
   * @param {Object} node — root node
   * @returns {Array} flat array of visible nodes
   */
  function getVisibleNodes(node) {
    var result = [];
    _collectVisible(node, result);
    return result;
  }

  function _collectVisible(node, result) {
    result.push(node);
    if (!node.collapsed) {
      for (var i = 0; i < node.children.length; i++) {
        _collectVisible(node.children[i], result);
      }
    }
  }

  /**
   * Filter a tree to only show nodes matching query (by key or value).
   * Returns a new tree with matching nodes visible, parents expanded.
   * Returns null if nothing matches (and query is non-empty).
   * @param {Object} tree — root node (from buildTree)
   * @param {string} query — search string
   * @returns {Object|null} filtered tree
   */
  function filterTree(tree, query) {
    if (!query || query === '') {
      // Return a clone with everything collapsed (unchanged)
      return _cloneTree(tree);
    }
    var q = query.toLowerCase();
    var cloned = _cloneTree(tree);
    var matched = _markMatches(cloned, q);
    return cloned;
  }

  function _cloneTree(node) {
    var clone = {
      key: node.key,
      value: node.value,
      type: node.type,
      children: [],
      path: node.path,
      collapsed: node.collapsed,
      depth: node.depth
    };
    for (var i = 0; i < node.children.length; i++) {
      clone.children.push(_cloneTree(node.children[i]));
    }
    return clone;
  }

  /**
   * Mark matching nodes and expand their parents.
   * Returns true if this subtree has any match.
   */
  function _markMatches(node, query) {
    var selfMatch = false;

    // Check key
    if (node.key && node.key.toLowerCase().indexOf(query) !== -1) {
      selfMatch = true;
    }

    // Check value
    if (!selfMatch && node.value !== null && node.value !== undefined) {
      var valStr = String(node.value).toLowerCase();
      if (valStr.indexOf(query) !== -1) {
        selfMatch = true;
      }
    }

    // Check children recursively
    var childMatch = false;
    for (var i = 0; i < node.children.length; i++) {
      if (_markMatches(node.children[i], query)) {
        childMatch = true;
      }
    }

    // If any child matches, expand this node so children are visible
    if (childMatch) {
      node.collapsed = false;
    }

    return selfMatch || childMatch;
  }

  /**
   * Render a tree to text (YAML-like) with collapse indicators.
   * @param {Object} tree — root node
   * @param {boolean} [expanded] — if true, treat all nodes as expanded
   * @returns {string}
   */
  function renderToText(tree, expanded) {
    var lines = [];
    _renderNode(tree, lines, expanded || false);
    return lines.join('\n') + (lines.length > 0 ? '\n' : '');
  }

  function _renderNode(node, lines, forceExpanded) {
    var indent = _repeat('  ', node.depth);
    var isContainer = node.children.length > 0;
    var isCollapsed = forceExpanded ? false : node.collapsed;

    var line = indent;

    // Key prefix
    if (node.key !== '') {
      line += node.key + ': ';
    }

    if (isContainer) {
      if (isCollapsed) {
        // Collapsed: show ▶ and child count badge
        var typeHint = node.type === 'array' ? '[' + node.children.length + ' items]'
                                              : '{' + node.children.length + ' keys}';
        line += '▶ ' + typeHint;
      } else {
        // Expanded: show ▼ and type hint
        var openHint = node.type === 'array' ? '▼ [' : '▼ {';
        line += openHint;
      }
    } else {
      // Leaf node: render value
      var valStr = _formatScalar(node.value);
      if (valStr === null) {
        // Multi-line string
        valStr = _quote(String(node.value));
      }
      line += valStr;
    }

    lines.push(line);

    // Recurse into children if not collapsed
    if (isContainer && !isCollapsed) {
      for (var i = 0; i < node.children.length; i++) {
        _renderNode(node.children[i], lines, forceExpanded);
      }
      // Close bracket
      var closeHint = node.type === 'array' ? _repeat('  ', node.depth) + ']'
                                            : _repeat('  ', node.depth) + '}';
      lines.push(closeHint);
    }
  }

  // ─── Browser Panel (browser only) ─────────────────────────────────────────

  var _panelState = {
    data: null,
    title: 'YAML Dashboard',
    tree: null,
    container: null,
    panel: null,
    searchQuery: ''
  };

  /**
   * Create a YAML dashboard panel inside the given container element.
   * @param {string} containerId — DOM element id
   * @returns {Element|null} panel element (or null in Node.js)
   */
  function createPanel(containerId) {
    if (typeof document === 'undefined') return null;

    var container = document.getElementById(containerId);
    if (!container) return null;

    var panel = document.createElement('div');
    panel.className = 'yaml-dash-panel';
    panel.innerHTML = [
      '<div class="yaml-dash-header">',
      '  <span class="yaml-dash-title">YAML Dashboard</span>',
      '  <input class="yaml-dash-search" type="text" placeholder="Search keys/values..." />',
      '</div>',
      '<div class="yaml-dash-body">',
      '  <pre class="yaml-dash-content">No data loaded.</pre>',
      '</div>'
    ].join('');

    _panelState.panel = panel;
    _panelState.container = container;

    // Bind search
    var searchInput = panel.querySelector('.yaml-dash-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        _panelState.searchQuery = searchInput.value;
        _refreshPanel();
      });
    }

    container.appendChild(panel);
    return panel;
  }

  /**
   * Load JSON data into the panel and render it.
   * @param {*} data — JSON-compatible value
   * @param {string} [title] — optional panel title
   */
  function loadData(data, title) {
    _panelState.data = data;
    if (title) {
      _panelState.title = title;
      if (_panelState.panel) {
        var titleEl = _panelState.panel.querySelector('.yaml-dash-title');
        if (titleEl) titleEl.textContent = title;
      }
    }
    _panelState.tree = buildTree(data, 'root');
    _refreshPanel();
  }

  /**
   * Re-render current data into the panel.
   */
  function refresh() {
    _refreshPanel();
  }

  function _refreshPanel() {
    if (!_panelState.panel || !_panelState.tree) return;

    var displayTree = _panelState.searchQuery
      ? filterTree(_panelState.tree, _panelState.searchQuery)
      : _panelState.tree;

    var content = _panelState.panel.querySelector('.yaml-dash-content');
    if (!content) return;

    if (!displayTree) {
      content.textContent = '(no results for "' + _panelState.searchQuery + '")';
      return;
    }

    content.textContent = renderToText(displayTree);

    // Re-bind click handlers for collapse/expand
    content.onclick = function(e) {
      var target = e.target;
      var path = target.getAttribute('data-path');
      if (path) {
        toggleNode(_panelState.tree, path);
        _refreshPanel();
      }
    };
  }

  // ─── Exports ───────────────────────────────────────────────────────────────

  exports.jsonToYaml = jsonToYaml;
  exports.buildTree = buildTree;
  exports.toggleNode = toggleNode;
  exports.getVisibleNodes = getVisibleNodes;
  exports.filterTree = filterTree;
  exports.renderToText = renderToText;
  exports.createPanel = createPanel;
  exports.loadData = loadData;
  exports.refresh = refresh;

})(typeof module !== 'undefined' ? module.exports : (window.YamlDash = {}));
