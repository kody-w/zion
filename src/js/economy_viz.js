// economy_viz.js
/**
 * ZION Economy Visualizer — EconomyViz
 * 2D canvas Sankey-style flow diagram + analytics for the Spark economy.
 *
 * UMD pattern — works in both Node.js (for data functions) and browser (canvas).
 * Data-processing functions have zero DOM dependency and are fully testable.
 */
(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var TREASURY_ID = 'TREASURY';

  // Flow type colour map (CSS colour strings used by canvas)
  var FLOW_COLORS = {
    earn:  '#22c55e',  // green
    tax:   '#ef4444',  // red
    ubi:   '#3b82f6',  // blue
    trade: '#eab308',  // yellow
    gift:  '#a855f7'   // purple
  };

  // Spark bracket ranges for distribution histogram
  var BRACKETS = [
    { min: 0,    max: 9    },
    { min: 10,   max: 24   },
    { min: 25,   max: 49   },
    { min: 50,   max: 99   },
    { min: 100,  max: 249  },
    { min: 250,  max: 499  },
    { min: 500,  max: 999  },
    { min: 1000, max: 4999 },
    { min: 5000, max: Infinity }
  ];

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  var _canvas = null;     // HTMLCanvasElement (browser only)
  var _ctx    = null;     // CanvasRenderingContext2D (browser only)
  var _state  = null;     // Last loaded economy state
  var _particles = [];   // Animated transaction particles
  var _time   = 0;        // Accumulated time (ms) for animation

  // ---------------------------------------------------------------------------
  // Pure data functions (Node.js safe, no DOM)
  // ---------------------------------------------------------------------------

  /**
   * Compute the Gini coefficient for a balances map.
   * Negative balances are treated as 0.
   *
   * @param {Object} balances — map of id→number
   * @returns {number} Gini coefficient in [0, 1]
   */
  function computeGini(balances) {
    var values = [];
    var keys = Object.keys(balances);

    for (var i = 0; i < keys.length; i++) {
      var v = balances[keys[i]];
      values.push(v < 0 ? 0 : v);
    }

    if (values.length === 0) return 0;
    if (values.length === 1) return 0;

    // Sort ascending
    values.sort(function(a, b) { return a - b; });

    var n = values.length;
    var sumOfAbsDiffs = 0;
    var sumOfValues = 0;

    for (var j = 0; j < n; j++) {
      sumOfValues += values[j];
      for (var k = 0; k < n; k++) {
        sumOfAbsDiffs += Math.abs(values[j] - values[k]);
      }
    }

    if (sumOfValues === 0) return 0;

    return sumOfAbsDiffs / (2 * n * sumOfValues);
  }

  /**
   * Compute the balance distribution across predefined Spark brackets.
   * TREASURY is excluded from the distribution.
   *
   * @param {Object} balances — map of id→number
   * @returns {{ brackets: Array<{range: string, count: number, totalSpark: number}> }}
   */
  function computeDistribution(balances) {
    var brackets = [];
    for (var b = 0; b < BRACKETS.length; b++) {
      var br = BRACKETS[b];
      var label = br.max === Infinity
        ? br.min + '+'
        : br.min + '-' + br.max;
      brackets.push({ range: label, count: 0, totalSpark: 0 });
    }

    var keys = Object.keys(balances);
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      if (id === TREASURY_ID) continue;

      var val = balances[id];
      var clamped = val < 0 ? 0 : val;

      // Find the bracket
      for (var j = 0; j < BRACKETS.length; j++) {
        if (clamped >= BRACKETS[j].min && clamped <= BRACKETS[j].max) {
          brackets[j].count++;
          // Use original (possibly negative) value for totalSpark
          // but clamp to 0 for "less than 0" cases so sums make sense
          brackets[j].totalSpark += clamped;
          break;
        }
      }
    }

    return { brackets: brackets };
  }

  /**
   * Extract structured flow data from an economy state.
   *
   * @param {Object} economyState — { balances: {}, transactions: [] }
   * @returns {{ nodes, flows, summary }}
   */
  function getFlowData(economyState) {
    var balances = economyState.balances || {};
    var transactions = economyState.transactions || [];

    // --- Build nodes ---
    var nodes = [];
    var keys = Object.keys(balances);

    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var balance = balances[id];
      var type = id === TREASURY_ID ? 'treasury' : 'citizen';
      nodes.push({
        id: id,
        label: id,
        balance: balance,
        type: type
      });
    }

    // --- Build flows ---
    var flows = [];
    for (var t = 0; t < transactions.length; t++) {
      var tx = transactions[t];
      var flowType = _categorizeFlow(tx);
      if (flowType === null) continue;  // skip unknown/uncategorized

      flows.push({
        from:   tx.from || 'SYSTEM',
        to:     tx.to   || 'SYSTEM',
        amount: tx.amount || 0,
        type:   flowType
      });
    }

    // --- Build summary ---
    var citizenBalances = {};
    var totalSupply = 0;
    var treasuryBalance = 0;
    var citizenCount = 0;
    var citizenSum = 0;

    for (var k = 0; k < keys.length; k++) {
      var sid = keys[k];
      var sbal = balances[sid];
      totalSupply += sbal;

      if (sid === TREASURY_ID) {
        treasuryBalance = sbal;
      } else {
        citizenBalances[sid] = sbal;
        citizenCount++;
        citizenSum += sbal;
      }
    }

    var avgBalance = citizenCount > 0 ? citizenSum / citizenCount : 0;
    var gini = computeGini(citizenBalances);

    // Top earners: sorted desc by balance
    var citizenNodes = nodes.filter(function(n) { return n.type === 'citizen'; });
    var topEarners = citizenNodes.slice().sort(function(a, b) {
      return b.balance - a.balance;
    });

    return {
      nodes: nodes,
      flows: flows,
      summary: {
        totalSupply:      totalSupply,
        treasuryBalance:  treasuryBalance,
        giniCoefficient:  gini,
        topEarners:       topEarners,
        avgBalance:       avgBalance,
        citizenCount:     citizenCount
      }
    };
  }

  /**
   * Categorize a raw transaction record into a flow type.
   * Returns null if the transaction should be skipped.
   *
   * @param {Object} tx
   * @returns {string|null}
   */
  function _categorizeFlow(tx) {
    var type = tx.type || '';

    // Explicit typed transactions from economy.js ledger
    if (type === 'earn')     return 'earn';
    if (type === 'tax')      return 'tax';
    if (type === 'ubi')      return 'ubi';
    if (type === 'trade')    return 'trade';
    if (type === 'gift')     return 'gift';
    if (type === 'trade_offer') return 'trade';

    // Infer from from/to fields for legacy transaction shapes
    var from = tx.from || '';
    var to   = tx.to   || '';

    if (to === TREASURY_ID)   return 'tax';
    if (from === TREASURY_ID) return 'ubi';
    if (from === 'SYSTEM')    return 'earn';

    // Protocol activity types that map to earn
    var EARN_ACTIVITIES = ['craft', 'build', 'harvest', 'plant', 'discover',
                           'perform', 'teach', 'mentor', 'anchor_visit',
                           'daily_login', 'puzzle', 'competition_win'];
    for (var i = 0; i < EARN_ACTIVITIES.length; i++) {
      if (type === EARN_ACTIVITIES[i]) return 'earn';
    }

    // Gift transactions
    if (type === 'gift') return 'gift';

    return null;
  }

  /**
   * Format a human-readable summary of the economy state.
   *
   * @param {Object} economyState
   * @returns {string}
   */
  function formatSummary(economyState) {
    var flow = getFlowData(economyState);
    var s    = flow.summary;

    var lines = [
      'ZION Economy Summary',
      '--------------------',
      'Citizens:       ' + s.citizenCount,
      'Total Supply:   ' + s.totalSupply + ' Spark',
      'Treasury:       ' + s.treasuryBalance + ' Spark',
      'Avg Balance:    ' + s.avgBalance.toFixed(1) + ' Spark',
      'Gini Index:     ' + s.giniCoefficient.toFixed(3) + ' (0=equal, 1=unequal)'
    ];

    if (s.topEarners.length > 0) {
      lines.push('Top Earner:     ' + s.topEarners[0].id +
                 ' (' + s.topEarners[0].balance + ' Spark)');
    }

    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Canvas / browser rendering
  // ---------------------------------------------------------------------------

  /**
   * Initialise the visualizer with a canvas element (browser only).
   *
   * @param {HTMLCanvasElement} canvasElement
   */
  function init(canvasElement) {
    if (typeof canvasElement === 'undefined' || canvasElement === null) return;
    _canvas = canvasElement;
    if (_canvas.getContext) {
      _ctx = _canvas.getContext('2d');
    }
    _particles = [];
    _time = 0;
  }

  /**
   * Load economy state — stores internally and seeds particle system.
   *
   * @param {Object} economyState
   */
  function loadState(economyState) {
    _state = economyState;
    _particles = [];
    _time = 0;

    // Seed particles from recent transactions
    if (_state && _state.transactions) {
      var txs = _state.transactions;
      var limit = Math.min(txs.length, 30);
      for (var i = 0; i < limit; i++) {
        var tx = txs[i];
        var flowType = _categorizeFlow(tx);
        if (flowType) {
          _particles.push(_makeParticle(flowType, i / limit));
        }
      }
    }
  }

  /**
   * Advance animation state by dt seconds.
   *
   * @param {number} dt — seconds since last frame
   */
  function update(dt) {
    _time += dt;

    // Advance each particle along its path (0→1)
    for (var i = _particles.length - 1; i >= 0; i--) {
      _particles[i].t += dt * _particles[i].speed;
      if (_particles[i].t > 1) {
        // Wrap or remove
        _particles[i].t -= 1;
      }
    }
  }

  /**
   * Render the current frame onto the canvas.
   * Safe to call in Node.js (no-op when _ctx is null).
   */
  function render() {
    if (!_ctx || !_canvas) return;
    if (!_state) return;

    var w = _canvas.width;
    var h = _canvas.height;

    _ctx.clearRect(0, 0, w, h);

    // Background
    _ctx.fillStyle = '#0f172a';
    _ctx.fillRect(0, 0, w, h);

    var flow = getFlowData(_state);

    _renderSankeyFlow(flow, w, h);
    _renderDistributionChart(flow, w, h);
    _renderTreasuryMeter(flow.summary, w, h);
    _renderGiniDisplay(flow.summary, w, h);
    _renderParticles(w, h);
  }

  // ---------------------------------------------------------------------------
  // Rendering helpers (browser only — all guarded by _ctx checks)
  // ---------------------------------------------------------------------------

  /** Sankey-style flow diagram in the upper-left quadrant */
  function _renderSankeyFlow(flow, w, h) {
    if (!_ctx) return;

    var areaW = w * 0.55;
    var areaH = h * 0.55;

    // Column x-positions: SYSTEM → Citizens → TREASURY → Citizens (UBI)
    var col0 = 40;              // SYSTEM (earnings source)
    var col1 = areaW * 0.35;   // Citizens
    var col2 = areaW * 0.65;   // TREASURY
    var col3 = areaW * 0.95;   // Citizens (after UBI)

    // Title
    _ctx.fillStyle = '#94a3b8';
    _ctx.font = '11px monospace';
    _ctx.fillText('Spark Flow', col0, 20);

    // Draw flow type labels
    var labels = [
      { x: col0, y: 40, text: 'EARN', color: FLOW_COLORS.earn },
      { x: col1, y: 40, text: 'TAX',  color: FLOW_COLORS.tax  },
      { x: col2, y: 40, text: 'UBI',  color: FLOW_COLORS.ubi  },
      { x: col1, y: 60, text: 'TRADE',color: FLOW_COLORS.trade},
      { x: col1, y: 75, text: 'GIFT', color: FLOW_COLORS.gift }
    ];

    for (var l = 0; l < labels.length; l++) {
      _ctx.fillStyle = labels[l].color;
      _ctx.font = '10px monospace';
      _ctx.fillText(labels[l].text, labels[l].x, labels[l].y);
    }

    // Aggregate flow amounts by type for line thickness
    var aggr = { earn: 0, tax: 0, ubi: 0, trade: 0, gift: 0 };
    for (var f = 0; f < flow.flows.length; f++) {
      var fl = flow.flows[f];
      if (aggr[fl.type] !== undefined) aggr[fl.type] += fl.amount;
    }

    var maxFlow = Math.max(1, aggr.earn, aggr.tax, aggr.ubi, aggr.trade, aggr.gift);

    // Draw Bezier arcs for each flow type
    var flowLines = [
      { type: 'earn',  x1: col0, y1: areaH*0.3, x2: col1, y2: areaH*0.3 },
      { type: 'tax',   x1: col1, y1: areaH*0.35, x2: col2, y2: areaH*0.35 },
      { type: 'ubi',   x1: col2, y1: areaH*0.45, x2: col3, y2: areaH*0.45 },
      { type: 'trade', x1: col1, y1: areaH*0.55, x2: col1+50, y2: areaH*0.55 },
      { type: 'gift',  x1: col1, y1: areaH*0.65, x2: col1+50, y2: areaH*0.65 }
    ];

    for (var fl2 = 0; fl2 < flowLines.length; fl2++) {
      var line = flowLines[fl2];
      var amount = aggr[line.type];
      if (amount === 0) continue;
      var thickness = Math.max(1, (amount / maxFlow) * 12);

      _ctx.beginPath();
      _ctx.moveTo(line.x1, line.y1);
      var cpx = (line.x1 + line.x2) / 2;
      _ctx.bezierCurveTo(cpx, line.y1, cpx, line.y2, line.x2, line.y2);
      _ctx.strokeStyle = FLOW_COLORS[line.type];
      _ctx.lineWidth = thickness;
      _ctx.globalAlpha = 0.7;
      _ctx.stroke();
      _ctx.globalAlpha = 1.0;
      _ctx.lineWidth = 1;

      // Amount label
      _ctx.fillStyle = FLOW_COLORS[line.type];
      _ctx.font = '9px monospace';
      _ctx.fillText(amount + ' ◆', (line.x1 + line.x2) / 2 - 10, line.y1 - 4);
    }
  }

  /** Bar chart of citizen balances (sorted ascending) in lower-left area */
  function _renderDistributionChart(flow, w, h) {
    if (!_ctx) return;

    var dist = computeDistribution(
      (flow.nodes.reduce(function(acc, n) {
        acc[n.id] = n.balance;
        return acc;
      }, {}))
    );

    var chartX = 0;
    var chartY = h * 0.58;
    var chartW = w * 0.55;
    var chartH = h * 0.38;

    _ctx.fillStyle = '#1e293b';
    _ctx.fillRect(chartX, chartY, chartW, chartH);

    // Title
    _ctx.fillStyle = '#94a3b8';
    _ctx.font = '11px monospace';
    _ctx.fillText('Balance Distribution', chartX + 8, chartY + 16);

    var brackets = dist.brackets;
    var maxCount = 1;
    for (var b = 0; b < brackets.length; b++) {
      if (brackets[b].count > maxCount) maxCount = brackets[b].count;
    }

    var barAreaX = chartX + 8;
    var barAreaY = chartY + 24;
    var barAreaW = chartW - 16;
    var barAreaH = chartH - 40;
    var barW = barAreaW / brackets.length - 2;

    for (var i = 0; i < brackets.length; i++) {
      var bk = brackets[i];
      var barH = bk.count > 0 ? (bk.count / maxCount) * barAreaH : 0;
      var bx = barAreaX + i * (barW + 2);
      var by = barAreaY + barAreaH - barH;

      // Bar
      _ctx.fillStyle = '#3b82f6';
      _ctx.globalAlpha = 0.8;
      _ctx.fillRect(bx, by, barW, barH);
      _ctx.globalAlpha = 1.0;

      // Range label
      _ctx.fillStyle = '#64748b';
      _ctx.font = '7px monospace';
      _ctx.save();
      _ctx.translate(bx + barW / 2, barAreaY + barAreaH + 4);
      _ctx.rotate(-Math.PI / 4);
      _ctx.fillText(bk.range, 0, 0);
      _ctx.restore();

      // Count
      if (bk.count > 0) {
        _ctx.fillStyle = '#e2e8f0';
        _ctx.font = '9px monospace';
        _ctx.fillText(bk.count, bx + 2, by - 2);
      }
    }
  }

  /** Treasury fullness gauge in upper-right */
  function _renderTreasuryMeter(summary, w, h) {
    if (!_ctx) return;

    var x = w * 0.62;
    var y = 20;
    var meterW = w * 0.35;
    var meterH = 30;

    // Background
    _ctx.fillStyle = '#1e293b';
    _ctx.fillRect(x, y, meterW, meterH + 40);

    // Label
    _ctx.fillStyle = '#94a3b8';
    _ctx.font = '11px monospace';
    _ctx.fillText('TREASURY', x + 6, y + 14);

    // Determine "full" reference: use totalSupply or 1000, whichever is bigger
    var maxTreasury = Math.max(summary.totalSupply, 1000);
    var fraction = summary.treasuryBalance / maxTreasury;
    fraction = Math.max(0, Math.min(1, fraction));

    // Meter track
    _ctx.fillStyle = '#334155';
    _ctx.fillRect(x + 6, y + 18, meterW - 12, 14);

    // Meter fill
    var fillColor = fraction < 0.2 ? '#ef4444' :
                    fraction < 0.5 ? '#eab308' : '#22c55e';
    _ctx.fillStyle = fillColor;
    _ctx.fillRect(x + 6, y + 18, (meterW - 12) * fraction, 14);

    // Value text
    _ctx.fillStyle = '#e2e8f0';
    _ctx.font = '10px monospace';
    _ctx.fillText(summary.treasuryBalance + ' Spark', x + 6, y + 46);
  }

  /** Gini coefficient display below treasury meter */
  function _renderGiniDisplay(summary, w, h) {
    if (!_ctx) return;

    var x = w * 0.62;
    var y = 90;
    var meterW = w * 0.35;

    _ctx.fillStyle = '#1e293b';
    _ctx.fillRect(x, y, meterW, 60);

    _ctx.fillStyle = '#94a3b8';
    _ctx.font = '11px monospace';
    _ctx.fillText('INEQUALITY (Gini)', x + 6, y + 14);

    // Gini bar
    var gini = summary.giniCoefficient;
    var giniColor = gini < 0.3 ? '#22c55e' :
                    gini < 0.5 ? '#eab308' : '#ef4444';

    _ctx.fillStyle = '#334155';
    _ctx.fillRect(x + 6, y + 18, meterW - 12, 12);

    _ctx.fillStyle = giniColor;
    _ctx.fillRect(x + 6, y + 18, (meterW - 12) * gini, 12);

    _ctx.fillStyle = '#e2e8f0';
    _ctx.font = '10px monospace';
    _ctx.fillText(gini.toFixed(3), x + 6, y + 46);

    // Citizen count
    _ctx.fillStyle = '#64748b';
    _ctx.font = '9px monospace';
    _ctx.fillText(summary.citizenCount + ' citizens | avg ' +
                  summary.avgBalance.toFixed(1) + ' Spark', x + 6, y + 56);
  }

  /** Animated transaction particles along flow paths */
  function _renderParticles(w, h) {
    if (!_ctx) return;

    for (var i = 0; i < _particles.length; i++) {
      var p = _particles[i];
      var x = p.x0 + (p.x1 - p.x0) * p.t;
      var y = p.y0 + (p.y1 - p.y0) * p.t;

      _ctx.beginPath();
      _ctx.arc(x, y, 3, 0, Math.PI * 2);
      _ctx.fillStyle = p.color;
      _ctx.globalAlpha = 0.9 - p.t * 0.4;
      _ctx.fill();
      _ctx.globalAlpha = 1.0;
    }
  }

  // ---------------------------------------------------------------------------
  // Particle helpers
  // ---------------------------------------------------------------------------

  var _FLOW_PATHS = {
    earn:  { x0: 40,  y0: 120, x1: 180, y1: 120 },
    tax:   { x0: 180, y0: 140, x1: 300, y1: 140 },
    ubi:   { x0: 300, y0: 165, x1: 430, y1: 165 },
    trade: { x0: 180, y0: 200, x1: 260, y1: 200 },
    gift:  { x0: 180, y0: 240, x1: 260, y1: 240 }
  };

  function _makeParticle(flowType, offset) {
    var path = _FLOW_PATHS[flowType] || _FLOW_PATHS.earn;
    return {
      x0: path.x0,
      y0: path.y0,
      x1: path.x1,
      y1: path.y1,
      t: offset % 1,
      speed: 0.15 + Math.random() * 0.1,
      color: FLOW_COLORS[flowType] || '#ffffff'
    };
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------

  exports.init                = init;
  exports.loadState           = loadState;
  exports.update              = update;
  exports.render              = render;
  exports.getFlowData         = getFlowData;
  exports.computeGini         = computeGini;
  exports.computeDistribution = computeDistribution;
  exports.formatSummary       = formatSummary;

})(typeof module !== 'undefined' ? module.exports : (window.EconomyViz = {}));
