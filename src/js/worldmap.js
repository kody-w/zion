// worldmap.js — World Map HUD Panel for ZION
// Provides canvas-based map rendering, coordinate transforms,
// zone detection, and a full-screen map panel overlay.
// No Three.js dependency — pure canvas 2D rendering.

(function(exports) {
  'use strict';

  // ─── World Coordinate System ────────────────────────────────────────────────
  // World extends roughly -600 to +600 on both X and Z axes.
  var WORLD_MIN = -600;
  var WORLD_MAX = 600;
  var WORLD_RANGE = WORLD_MAX - WORLD_MIN; // 1200

  // ─── Zone Data ──────────────────────────────────────────────────────────────
  // Derived from hud.js MINIMAP_ZONES and zones.js bounds.
  // cx/cz = center in world coords, radius = visual radius for rendering.
  var ZONE_DATA = {
    nexus:     { cx: 0,    cz: 0,    radius: 60,  name: 'The Nexus',      color: '#6688cc', bgColor: 'rgba(102,136,204,0.15)' },
    gardens:   { cx: 200,  cz: 30,   radius: 80,  name: 'The Gardens',    color: '#44aa44', bgColor: 'rgba(68,170,68,0.15)'   },
    athenaeum: { cx: 100,  cz: -220, radius: 60,  name: 'The Athenaeum',  color: '#8866aa', bgColor: 'rgba(136,102,170,0.15)' },
    studio:    { cx: -200, cz: -100, radius: 60,  name: 'The Studio',     color: '#cc6688', bgColor: 'rgba(204,102,136,0.15)' },
    wilds:     { cx: -30,  cz: 260,  radius: 90,  name: 'The Wilds',      color: '#228844', bgColor: 'rgba(34,136,68,0.15)'   },
    agora:     { cx: -190, cz: 120,  radius: 55,  name: 'The Agora',      color: '#cc8844', bgColor: 'rgba(204,136,68,0.15)'  },
    commons:   { cx: 170,  cz: 190,  radius: 55,  name: 'The Commons',    color: '#88aa44', bgColor: 'rgba(136,170,68,0.15)'  },
    arena:     { cx: 0,    cz: -240, radius: 55,  name: 'The Arena',      color: '#cc4444', bgColor: 'rgba(204,68,68,0.15)'   }
  };

  // Zone colors exported for external use
  var ZONE_COLORS = {};
  for (var _zk in ZONE_DATA) {
    ZONE_COLORS[_zk] = ZONE_DATA[_zk].color;
  }

  // Zone connection graph for path rendering
  var ZONE_CONNECTIONS = [
    ['nexus', 'gardens'],
    ['nexus', 'athenaeum'],
    ['nexus', 'studio'],
    ['nexus', 'wilds'],
    ['nexus', 'agora'],
    ['nexus', 'commons'],
    ['nexus', 'arena'],
    ['gardens', 'wilds'],
    ['gardens', 'athenaeum'],
    ['athenaeum', 'studio'],
    ['studio', 'agora'],
    ['agora', 'commons'],
    ['commons', 'arena'],
    ['wilds', 'arena']
  ];

  // ─── Coordinate Transforms ──────────────────────────────────────────────────

  /**
   * Convert world coordinates (X, Z) to map canvas pixel coordinates.
   * World Y is ignored (map is top-down).
   * @param {number} worldX - World X coordinate
   * @param {number} worldZ - World Z coordinate
   * @param {number} canvasW - Canvas pixel width
   * @param {number} canvasH - Canvas pixel height
   * @param {number} [margin=12] - Pixel margin around map edges
   * @returns {{ x: number, y: number }} Canvas pixel position
   */
  function worldToMap(worldX, worldZ, canvasW, canvasH, margin) {
    if (margin === undefined || margin === null) margin = 12;
    var drawW = canvasW - margin * 2;
    var drawH = canvasH - margin * 2;
    var px = margin + ((worldX - WORLD_MIN) / WORLD_RANGE) * drawW;
    var py = margin + ((worldZ - WORLD_MIN) / WORLD_RANGE) * drawH;
    return { x: px, y: py };
  }

  /**
   * Convert map canvas pixel coordinates back to world coordinates.
   * @param {number} mapX - Canvas pixel X
   * @param {number} mapY - Canvas pixel Y
   * @param {number} canvasW - Canvas pixel width
   * @param {number} canvasH - Canvas pixel height
   * @param {number} [margin=12] - Pixel margin used when rendering
   * @returns {{ x: number, z: number }} World position (X, Z)
   */
  function mapToWorld(mapX, mapY, canvasW, canvasH, margin) {
    if (margin === undefined || margin === null) margin = 12;
    var drawW = canvasW - margin * 2;
    var drawH = canvasH - margin * 2;
    var worldX = WORLD_MIN + ((mapX - margin) / drawW) * WORLD_RANGE;
    var worldZ = WORLD_MIN + ((mapY - margin) / drawH) * WORLD_RANGE;
    return { x: worldX, z: worldZ };
  }

  /**
   * Get all zone bounds data (center + radius) for external use.
   * @returns {Object} Zone data keyed by zone ID
   */
  function getZoneBounds() {
    var result = {};
    for (var zid in ZONE_DATA) {
      var z = ZONE_DATA[zid];
      result[zid] = {
        cx: z.cx,
        cz: z.cz,
        radius: z.radius,
        name: z.name,
        color: z.color
      };
    }
    return result;
  }

  // ─── Zone Detection ─────────────────────────────────────────────────────────

  /**
   * Determine which zone contains the given world position.
   * Returns the zone whose center is closest if the point is inside
   * the zone's radius. Returns null if outside all zones.
   * @param {number} x - World X
   * @param {number} z - World Z
   * @returns {string|null} Zone ID or null
   */
  function getZoneAtPosition(x, z) {
    var best = null;
    var bestDist = Infinity;
    for (var zid in ZONE_DATA) {
      var zone = ZONE_DATA[zid];
      var dx = x - zone.cx;
      var dz = z - zone.cz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= zone.radius && dist < bestDist) {
        bestDist = dist;
        best = zid;
      }
    }
    return best;
  }

  /**
   * Calculate Euclidean distance from a world point to a zone center.
   * @param {number} x - World X
   * @param {number} z - World Z
   * @param {string} zoneName - Zone ID
   * @returns {number} Distance in world units, or Infinity if zone not found
   */
  function getDistanceToZone(x, z, zoneName) {
    var zone = ZONE_DATA[zoneName];
    if (!zone) return Infinity;
    var dx = x - zone.cx;
    var dz = z - zone.cz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Find the nearest zone to a world position.
   * @param {number} x - World X
   * @param {number} z - World Z
   * @returns {{ zoneId: string, distance: number, zone: Object }} Nearest zone info
   */
  function getNearestZone(x, z) {
    var nearest = null;
    var nearestDist = Infinity;
    for (var zid in ZONE_DATA) {
      var dist = getDistanceToZone(x, z, zid);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = zid;
      }
    }
    return {
      zoneId: nearest,
      distance: nearestDist,
      zone: nearest ? ZONE_DATA[nearest] : null
    };
  }

  /**
   * Calculate a simple waypoint path from one world point to another.
   * Uses straight-line if within same zone; routes via Nexus otherwise.
   * Returns array of {x, z} waypoints including start and end.
   * @param {number} fromX - Start world X
   * @param {number} fromZ - Start world Z
   * @param {number} toX - End world X
   * @param {number} toZ - End world Z
   * @returns {Array<{x: number, z: number}>} Path waypoints
   */
  function calculatePath(fromX, fromZ, toX, toZ) {
    var fromZone = getZoneAtPosition(fromX, fromZ);
    var toZone = getZoneAtPosition(toX, toZ);

    // Same zone or no zone — straight line
    if (!fromZone || !toZone || fromZone === toZone) {
      return [{ x: fromX, z: fromZ }, { x: toX, z: toZ }];
    }

    // Check if zones are directly connected
    var directlyConnected = false;
    for (var i = 0; i < ZONE_CONNECTIONS.length; i++) {
      var conn = ZONE_CONNECTIONS[i];
      if ((conn[0] === fromZone && conn[1] === toZone) ||
          (conn[1] === fromZone && conn[0] === toZone)) {
        directlyConnected = true;
        break;
      }
    }

    if (directlyConnected) {
      return [
        { x: fromX, z: fromZ },
        { x: ZONE_DATA[toZone].cx, z: ZONE_DATA[toZone].cz },
        { x: toX, z: toZ }
      ];
    }

    // Route via Nexus as hub
    var nexus = ZONE_DATA.nexus;
    return [
      { x: fromX, z: fromZ },
      { x: nexus.cx, z: nexus.cz },
      { x: ZONE_DATA[toZone].cx, z: ZONE_DATA[toZone].cz },
      { x: toX, z: toZ }
    ];
  }

  // ─── Canvas Rendering ───────────────────────────────────────────────────────

  /**
   * Render the full world map onto a canvas context.
   * Draws zone regions, connection paths, zone labels, and grid.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {number} width - Canvas width in pixels
   * @param {number} height - Canvas height in pixels
   * @param {Object} [options] - Rendering options
   * @param {string} [options.currentZone] - Highlighted zone ID
   * @param {number} [options.margin=12] - Map margin
   * @param {boolean} [options.showGrid=false] - Draw grid lines
   * @param {boolean} [options.showConnections=true] - Draw zone connection paths
   * @param {boolean} [options.showLabels=true] - Draw zone name labels
   */
  function renderMap(ctx, width, height, options) {
    options = options || {};
    var margin = (options.margin !== undefined) ? options.margin : 12;
    var currentZone = options.currentZone || null;
    var showGrid = options.showGrid || false;
    var showConnections = (options.showConnections !== false);
    var showLabels = (options.showLabels !== false);

    // Background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Optional grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      var gridStep = 100; // every 100 world units
      var gridLines = [
        WORLD_MIN, -400, -200, 0, 200, 400, WORLD_MAX
      ];
      for (var gi = 0; gi < gridLines.length; gi++) {
        var gv = gridLines[gi];
        // Vertical line
        var gLeft = worldToMap(gv, WORLD_MIN, width, height, margin);
        var gRight = worldToMap(gv, WORLD_MAX, width, height, margin);
        ctx.beginPath();
        ctx.moveTo(gLeft.x, gLeft.y);
        ctx.lineTo(gRight.x, gRight.y);
        ctx.stroke();
        // Horizontal line
        var gTop = worldToMap(WORLD_MIN, gv, width, height, margin);
        var gBot = worldToMap(WORLD_MAX, gv, width, height, margin);
        ctx.beginPath();
        ctx.moveTo(gTop.x, gTop.y);
        ctx.lineTo(gBot.x, gBot.y);
        ctx.stroke();
      }
    }

    // Zone connection lines
    if (showConnections) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (var ci = 0; ci < ZONE_CONNECTIONS.length; ci++) {
        var conn = ZONE_CONNECTIONS[ci];
        var zA = ZONE_DATA[conn[0]];
        var zB = ZONE_DATA[conn[1]];
        if (!zA || !zB) continue;
        var pA = worldToMap(zA.cx, zA.cz, width, height, margin);
        var pB = worldToMap(zB.cx, zB.cz, width, height, margin);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Zone regions
    for (var zid in ZONE_DATA) {
      var zone = ZONE_DATA[zid];
      var pos = worldToMap(zone.cx, zone.cz, width, height, margin);
      var isActive = (zid === currentZone);
      // Scale radius to canvas units
      var pxRadius = (zone.radius / WORLD_RANGE) * (width - margin * 2);

      // Fill
      ctx.globalAlpha = isActive ? 0.45 : 0.2;
      ctx.fillStyle = zone.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pxRadius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.globalAlpha = isActive ? 1.0 : 0.45;
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = isActive ? 2.5 : 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pxRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1.0;

      // Zone label
      if (showLabels) {
        ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.65)';
        ctx.font = isActive ? 'bold 11px Arial' : '9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(zone.name, pos.x, pos.y);
      }
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  }

  /**
   * Render the player's position marker on the map.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {number} x - Player world X
   * @param {number} z - Player world Z
   * @param {Object} [options] - Options
   * @param {number} [options.canvasW=400] - Canvas width
   * @param {number} [options.canvasH=400] - Canvas height
   * @param {number} [options.margin=12] - Map margin
   * @param {number} [options.pulse=0] - Pulse phase 0-1 for animation
   * @param {string} [options.color='#FFD700'] - Marker color
   * @param {number} [options.radius=5] - Base radius
   */
  function renderPlayerMarker(ctx, x, z, options) {
    options = options || {};
    var canvasW = options.canvasW || 400;
    var canvasH = options.canvasH || 400;
    var margin = (options.margin !== undefined) ? options.margin : 12;
    var pulse = options.pulse || 0;
    var color = options.color || '#FFD700';
    var baseRadius = options.radius || 5;

    var pos = worldToMap(x, z, canvasW, canvasH, margin);

    // Pulsing outer ring
    var pulseRadius = baseRadius + 3 + Math.sin(pulse * Math.PI * 2) * 2;
    ctx.globalAlpha = 0.35 + Math.sin(pulse * Math.PI * 2) * 0.15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // White border
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, baseRadius + 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Inner gold dot with glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /**
   * Render NPC position markers on the map.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
   * @param {Array} npcs - Array of {position: {x, z}, archetype?, name?}
   * @param {Object} [options]
   * @param {number} [options.canvasW=400] - Canvas width
   * @param {number} [options.canvasH=400] - Canvas height
   * @param {number} [options.margin=12] - Map margin
   * @param {number} [options.maxCount=50] - Maximum NPCs to render
   */
  function renderNPCMarkers(ctx, npcs, options) {
    options = options || {};
    var canvasW = options.canvasW || 400;
    var canvasH = options.canvasH || 400;
    var margin = (options.margin !== undefined) ? options.margin : 12;
    var maxCount = options.maxCount || 50;

    if (!npcs || !npcs.length) return;

    var count = Math.min(npcs.length, maxCount);
    for (var i = 0; i < count; i++) {
      var npc = npcs[i];
      if (!npc || !npc.position) continue;
      var pos = worldToMap(npc.position.x, npc.position.z, canvasW, canvasH, margin);

      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#44ff88';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Render rift portal markers on the map.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} portals - Array of {position: {x, z}, name?, healthy?}
   * @param {Object} [options]
   * @param {number} [options.canvasW=400]
   * @param {number} [options.canvasH=400]
   * @param {number} [options.margin=12]
   */
  function renderPortals(ctx, portals, options) {
    options = options || {};
    var canvasW = options.canvasW || 400;
    var canvasH = options.canvasH || 400;
    var margin = (options.margin !== undefined) ? options.margin : 12;

    if (!portals || !portals.length) return;

    for (var i = 0; i < portals.length; i++) {
      var portal = portals[i];
      if (!portal || !portal.position) continue;
      var pos = worldToMap(portal.position.x, portal.position.z, canvasW, canvasH, margin);
      var healthy = (portal.healthy !== false);
      var color = healthy ? '#a78bfa' : '#f87171';

      // Diamond shape
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.fillStyle = healthy ? 'rgba(167,139,250,0.35)' : 'rgba(248,113,113,0.35)';
      ctx.lineWidth = 1.5;
      var s = 5;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - s);
      ctx.lineTo(pos.x + s, pos.y);
      ctx.lineTo(pos.x, pos.y + s);
      ctx.lineTo(pos.x - s, pos.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Render anchor POI markers on the map.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} anchors - Array of {zone?, position?: {x, z}, type?}
   * @param {Object} [options]
   * @param {number} [options.canvasW=400]
   * @param {number} [options.canvasH=400]
   * @param {number} [options.margin=12]
   */
  function renderAnchors(ctx, anchors, options) {
    options = options || {};
    var canvasW = options.canvasW || 400;
    var canvasH = options.canvasH || 400;
    var margin = (options.margin !== undefined) ? options.margin : 12;

    if (!anchors || !anchors.length) return;

    // Anchor type colors
    var typeColors = {
      zone_portal:     '#4af',
      resource_node:   '#4fa',
      discovery_point: '#fa4',
      gathering_spot:  '#f4a',
      garden_plot:     '#af4'
    };

    for (var i = 0; i < anchors.length; i++) {
      var anchor = anchors[i];
      if (!anchor) continue;

      // Position: use explicit position if available, fall back to zone center
      var wx, wz;
      if (anchor.position && typeof anchor.position.x === 'number') {
        wx = anchor.position.x;
        wz = anchor.position.z;
      } else if (anchor.zone && ZONE_DATA[anchor.zone]) {
        wx = ZONE_DATA[anchor.zone].cx;
        wz = ZONE_DATA[anchor.zone].cz;
      } else {
        continue;
      }

      var pos = worldToMap(wx, wz, canvasW, canvasH, margin);
      var color = typeColors[anchor.type] || '#88aaff';

      // Square marker
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.75;
      var s = 3.5;
      ctx.fillRect(pos.x - s, pos.y - s, s * 2, s * 2);
      ctx.strokeRect(pos.x - s, pos.y - s, s * 2, s * 2);
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Render the map legend in the bottom-right corner.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} [options]
   * @param {number} [options.canvasW=400]
   * @param {number} [options.canvasH=400]
   * @param {boolean} [options.showNPCs=false]
   * @param {boolean} [options.showPortals=false]
   * @param {boolean} [options.showAnchors=false]
   */
  function renderLegend(ctx, options) {
    options = options || {};
    var canvasW = options.canvasW || 400;
    var canvasH = options.canvasH || 400;
    var showNPCs = options.showNPCs || false;
    var showPortals = options.showPortals || false;
    var showAnchors = options.showAnchors || false;

    var items = [
      { color: '#FFD700', label: 'You', shape: 'circle' }
    ];
    if (showNPCs)    items.push({ color: '#44ff88', label: 'NPC', shape: 'circle' });
    if (showPortals) items.push({ color: '#a78bfa', label: 'Portal', shape: 'diamond' });
    if (showAnchors) items.push({ color: '#4af',    label: 'Anchor', shape: 'square' });

    var lineH = 16;
    var boxW = 80;
    var boxH = items.length * lineH + 10;
    var bx = canvasW - boxW - 6;
    var by = canvasH - boxH - 6;

    ctx.globalAlpha = 0.75;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.rect(bx, by, boxW, boxH);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var iy = by + 8 + i * lineH;
      var ix = bx + 8;

      ctx.fillStyle = item.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.5;

      if (item.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(ix + 5, iy - 3);
        ctx.lineTo(ix + 8, iy + 1);
        ctx.lineTo(ix + 5, iy + 5);
        ctx.lineTo(ix + 2, iy + 1);
        ctx.closePath();
        ctx.fill();
      } else if (item.shape === 'square') {
        ctx.fillRect(ix + 2, iy - 2, 6, 6);
      } else {
        // circle
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(ix + 5, iy + 1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      ctx.fillStyle = '#ddd';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, ix + 14, iy + 1);
    }
  }

  // ─── Map Panel State ─────────────────────────────────────────────────────────
  var mapPanelEl = null;
  var mapCanvas = null;
  var mapCtx = null;
  var mapVisible = false;
  var mapPulsePhase = 0;
  var mapAnimFrame = null;
  var mapZoom = 1.0;
  var mapZoomMin = 0.5;
  var mapZoomMax = 4.0;

  // Layer toggles
  var layerNPCs = false;
  var layerPortals = true;
  var layerAnchors = false;

  // Current state references (updated via updateMapData)
  var _playerX = 0;
  var _playerZ = 0;
  var _currentZone = null;
  var _npcs = [];
  var _portals = [];
  var _anchors = [];
  var _onWarpCallback = null;

  /**
   * Provide updated data for map rendering.
   * @param {Object} data
   * @param {number} [data.playerX=0] - Player world X
   * @param {number} [data.playerZ=0] - Player world Z
   * @param {string} [data.currentZone] - Zone ID
   * @param {Array}  [data.npcs=[]] - NPC array
   * @param {Array}  [data.portals=[]] - Portal array
   * @param {Array}  [data.anchors=[]] - Anchor array
   */
  function updateMapData(data) {
    data = data || {};
    if (typeof data.playerX === 'number') _playerX = data.playerX;
    if (typeof data.playerZ === 'number') _playerZ = data.playerZ;
    if (data.currentZone !== undefined) _currentZone = data.currentZone;
    if (Array.isArray(data.npcs)) _npcs = data.npcs;
    if (Array.isArray(data.portals)) _portals = data.portals;
    if (Array.isArray(data.anchors)) _anchors = data.anchors;
  }

  /**
   * Rebuild and return the map panel DOM element.
   * @returns {HTMLElement}
   */
  function _createMapPanel() {
    if (typeof document === 'undefined') return null;

    var panel = document.createElement('div');
    panel.id = 'world-map-panel';
    panel.style.cssText = [
      'position:absolute',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'width:520px',
      'height:560px',
      'background:rgba(5,8,20,0.96)',
      'border:1px solid rgba(100,136,200,0.45)',
      'border-radius:10px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.7)',
      'display:flex',
      'flex-direction:column',
      'z-index:500',
      'pointer-events:auto',
      'user-select:none'
    ].join(';');

    // ── Header ──────────────────────────────────────────────────────
    var header = document.createElement('div');
    header.style.cssText = [
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'padding:10px 14px 8px',
      'border-bottom:1px solid rgba(100,136,200,0.25)',
      'flex-shrink:0'
    ].join(';');

    var title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:bold;color:#aac4ff;letter-spacing:0.05em;';
    title.textContent = 'WORLD MAP';

    var closeBtn = document.createElement('button');
    closeBtn.id = 'world-map-close';
    closeBtn.style.cssText = [
      'background:none',
      'border:1px solid rgba(255,255,255,0.2)',
      'border-radius:4px',
      'color:#aaa',
      'cursor:pointer',
      'padding:2px 8px',
      'font-size:13px'
    ].join(';');
    closeBtn.textContent = 'x';
    closeBtn.addEventListener('click', hideMapPanel);

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // ── Toolbar (layers + zoom) ──────────────────────────────────────
    var toolbar = document.createElement('div');
    toolbar.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px',
      'padding:6px 14px',
      'border-bottom:1px solid rgba(100,136,200,0.15)',
      'flex-shrink:0',
      'font-size:11px',
      'color:#aaa'
    ].join(';');

    function makeToggle(id, label, checked, onChange) {
      var wrap = document.createElement('label');
      wrap.style.cssText = 'display:flex;align-items:center;gap:3px;cursor:pointer;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.checked = checked;
      cb.style.cssText = 'cursor:pointer;';
      cb.addEventListener('change', function() { onChange(cb.checked); });
      var lbl = document.createElement('span');
      lbl.textContent = label;
      wrap.appendChild(cb);
      wrap.appendChild(lbl);
      return wrap;
    }

    toolbar.appendChild(makeToggle('map-layer-npcs', 'NPCs', layerNPCs, function(v) {
      layerNPCs = v;
    }));
    toolbar.appendChild(makeToggle('map-layer-portals', 'Portals', layerPortals, function(v) {
      layerPortals = v;
    }));
    toolbar.appendChild(makeToggle('map-layer-anchors', 'Anchors', layerAnchors, function(v) {
      layerAnchors = v;
    }));

    // Spacer
    var spacer = document.createElement('div');
    spacer.style.cssText = 'flex:1;';
    toolbar.appendChild(spacer);

    // Zoom controls
    var zoomOut = document.createElement('button');
    zoomOut.textContent = '-';
    zoomOut.title = 'Zoom out';
    zoomOut.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#ccc;cursor:pointer;padding:1px 7px;font-size:14px;';
    zoomOut.addEventListener('click', function() {
      mapZoom = Math.max(mapZoomMin, mapZoom - 0.25);
    });

    var zoomLbl = document.createElement('span');
    zoomLbl.id = 'map-zoom-label';
    zoomLbl.style.cssText = 'min-width:36px;text-align:center;';
    zoomLbl.textContent = '1.0x';

    var zoomIn = document.createElement('button');
    zoomIn.textContent = '+';
    zoomIn.title = 'Zoom in';
    zoomIn.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#ccc;cursor:pointer;padding:1px 7px;font-size:14px;';
    zoomIn.addEventListener('click', function() {
      mapZoom = Math.min(mapZoomMax, mapZoom + 0.25);
    });

    toolbar.appendChild(zoomOut);
    toolbar.appendChild(zoomLbl);
    toolbar.appendChild(zoomIn);

    panel.appendChild(toolbar);

    // ── Canvas ───────────────────────────────────────────────────────
    var canvasWrap = document.createElement('div');
    canvasWrap.style.cssText = [
      'flex:1',
      'position:relative',
      'overflow:hidden',
      'margin:8px'
    ].join(';');

    mapCanvas = document.createElement('canvas');
    mapCanvas.id = 'world-map-canvas';
    mapCanvas.width = 496;
    mapCanvas.height = 440;
    mapCanvas.style.cssText = 'display:block;border-radius:5px;cursor:crosshair;';
    mapCtx = mapCanvas.getContext('2d');

    // Click-to-warp
    mapCanvas.addEventListener('click', function(e) {
      var rect = mapCanvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (mapCanvas.width / rect.width);
      var my = (e.clientY - rect.top) * (mapCanvas.height / rect.height);
      var world = mapToWorld(mx, my, mapCanvas.width, mapCanvas.height, 12);
      if (_onWarpCallback) {
        _onWarpCallback(world.x, world.z);
      }
    });

    // Hover tooltip
    var tooltip = document.createElement('div');
    tooltip.id = 'map-tooltip';
    tooltip.style.cssText = [
      'position:absolute',
      'background:rgba(0,0,0,0.8)',
      'color:#ddd',
      'font-size:10px',
      'padding:3px 7px',
      'border-radius:4px',
      'pointer-events:none',
      'display:none',
      'white-space:nowrap',
      'z-index:10'
    ].join(';');

    mapCanvas.addEventListener('mousemove', function(e) {
      var rect = mapCanvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (mapCanvas.width / rect.width);
      var my = (e.clientY - rect.top) * (mapCanvas.height / rect.height);
      var world = mapToWorld(mx, my, mapCanvas.width, mapCanvas.height, 12);
      var zoneHit = getZoneAtPosition(world.x, world.z);
      var zoneName = zoneHit ? ZONE_DATA[zoneHit].name : 'Wilderness';
      tooltip.style.display = 'block';
      tooltip.style.left = (e.offsetX + 14) + 'px';
      tooltip.style.top = (e.offsetY - 4) + 'px';
      tooltip.textContent = zoneName + '  (' + Math.round(world.x) + ', ' + Math.round(world.z) + ')';
    });
    mapCanvas.addEventListener('mouseleave', function() {
      tooltip.style.display = 'none';
    });

    canvasWrap.appendChild(mapCanvas);
    canvasWrap.appendChild(tooltip);
    panel.appendChild(canvasWrap);

    // ── Footer: coordinate display ───────────────────────────────────
    var footer = document.createElement('div');
    footer.id = 'map-footer';
    footer.style.cssText = [
      'padding:5px 14px 8px',
      'font-size:10px',
      'color:#667',
      'border-top:1px solid rgba(100,136,200,0.1)',
      'flex-shrink:0',
      'text-align:center'
    ].join(';');
    footer.textContent = 'Click map to warp. M to close.';
    panel.appendChild(footer);

    return panel;
  }

  /**
   * Render one frame of the map canvas.
   */
  function _renderFrame() {
    if (!mapCtx || !mapCanvas) return;
    var w = mapCanvas.width;
    var h = mapCanvas.height;
    var margin = 12;

    // Increment pulse phase
    mapPulsePhase = (mapPulsePhase + 0.02) % 1.0;

    renderMap(mapCtx, w, h, {
      currentZone: _currentZone,
      margin: margin,
      showGrid: true,
      showConnections: true,
      showLabels: true
    });

    if (layerAnchors) {
      renderAnchors(mapCtx, _anchors, { canvasW: w, canvasH: h, margin: margin });
    }
    if (layerPortals) {
      renderPortals(mapCtx, _portals, { canvasW: w, canvasH: h, margin: margin });
    }
    if (layerNPCs) {
      renderNPCMarkers(mapCtx, _npcs, { canvasW: w, canvasH: h, margin: margin });
    }

    renderPlayerMarker(mapCtx, _playerX, _playerZ, {
      canvasW: w,
      canvasH: h,
      margin: margin,
      pulse: mapPulsePhase
    });

    renderLegend(mapCtx, {
      canvasW: w,
      canvasH: h,
      showNPCs: layerNPCs,
      showPortals: layerPortals,
      showAnchors: layerAnchors
    });

    // Update zoom label
    if (typeof document !== 'undefined') {
      var zl = document.getElementById('map-zoom-label');
      if (zl) zl.textContent = mapZoom.toFixed(2) + 'x';
    }
  }

  /**
   * Animation loop for the map panel.
   */
  function _animateMap() {
    if (!mapVisible) return;
    _renderFrame();
    if (typeof requestAnimationFrame !== 'undefined') {
      mapAnimFrame = requestAnimationFrame(_animateMap);
    }
  }

  /**
   * Show the world map panel.
   * @param {Object} [options]
   * @param {Function} [options.onWarp] - Called with (worldX, worldZ) on map click
   */
  function showMapPanel(options) {
    options = options || {};
    if (typeof document === 'undefined') return;

    if (options.onWarp) _onWarpCallback = options.onWarp;

    if (!mapPanelEl) {
      mapPanelEl = _createMapPanel();
      var hud = document.querySelector('#zion-hud');
      if (hud && mapPanelEl) {
        hud.appendChild(mapPanelEl);
      } else if (mapPanelEl) {
        document.body.appendChild(mapPanelEl);
      }
    }

    if (!mapPanelEl) return;

    mapPanelEl.style.display = 'flex';
    mapVisible = true;
    _animateMap();
  }

  /**
   * Hide the world map panel.
   */
  function hideMapPanel() {
    if (mapPanelEl) {
      mapPanelEl.style.display = 'none';
    }
    mapVisible = false;
    if (mapAnimFrame && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(mapAnimFrame);
      mapAnimFrame = null;
    }
  }

  /**
   * Toggle the world map panel.
   * @param {Object} [options] - Passed to showMapPanel if showing
   */
  function toggleMapPanel(options) {
    if (mapVisible) {
      hideMapPanel();
    } else {
      showMapPanel(options);
    }
  }

  /**
   * Check whether the map panel is currently visible.
   * @returns {boolean}
   */
  function isMapVisible() {
    return mapVisible;
  }

  // ─── Exports ─────────────────────────────────────────────────────────────────
  exports.ZONE_COLORS = ZONE_COLORS;
  exports.ZONE_DATA = ZONE_DATA;
  exports.ZONE_CONNECTIONS = ZONE_CONNECTIONS;
  exports.WORLD_MIN = WORLD_MIN;
  exports.WORLD_MAX = WORLD_MAX;
  exports.WORLD_RANGE = WORLD_RANGE;

  // Coordinate transforms
  exports.worldToMap = worldToMap;
  exports.mapToWorld = mapToWorld;
  exports.getZoneBounds = getZoneBounds;

  // Zone logic
  exports.getZoneAtPosition = getZoneAtPosition;
  exports.getDistanceToZone = getDistanceToZone;
  exports.getNearestZone = getNearestZone;
  exports.calculatePath = calculatePath;

  // Canvas renderers
  exports.renderMap = renderMap;
  exports.renderPlayerMarker = renderPlayerMarker;
  exports.renderNPCMarkers = renderNPCMarkers;
  exports.renderPortals = renderPortals;
  exports.renderAnchors = renderAnchors;
  exports.renderLegend = renderLegend;

  // Panel API
  exports.showMapPanel = showMapPanel;
  exports.hideMapPanel = hideMapPanel;
  exports.toggleMapPanel = toggleMapPanel;
  exports.isMapVisible = isMapVisible;
  exports.updateMapData = updateMapData;

})(typeof module !== 'undefined' ? module.exports : (window.WorldMap = {}));
