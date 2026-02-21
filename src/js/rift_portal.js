// rift_portal.js — Federation Rift Portal 3D Rendering for ZION
// Constitution §10.5: Rift Portals are shimmering, otherworldly, clearly marked
// with destination world's name and player count.
//
// Standalone module — does NOT modify world.js.
// Requires THREE.js r128 in browser context.
// Uses only: MeshBasicMaterial, MeshPhongMaterial (no ShaderMaterial, no CapsuleGeometry)

(function(exports) {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  // Nexus center coordinates (world.js ZONES.nexus: cx=0, cz=0)
  var NEXUS_X = 0;
  var NEXUS_Z = 0;

  // Portal geometry dimensions
  var RING_RADIUS = 1.5;          // Outer torus radius (diameter 3)
  var RING_TUBE = 0.2;            // Torus tube thickness
  var DISC_RADIUS = 1.3;          // Inner disc radius
  var PARTICLE_SIZE = 0.12;       // Orbiting sphere radius
  var PARTICLE_COUNT = 10;        // Number of orbiting particles
  var PARTICLE_ORBIT_RADIUS = 1.8;// Orbit radius around portal centre

  // Semicircle layout near Nexus
  var SEMICIRCLE_RADIUS = 20;     // Distance from Nexus centre
  var SEMICIRCLE_START_ANGLE = Math.PI * 0.1;
  var SEMICIRCLE_END_ANGLE   = Math.PI * 0.9;

  // Interaction
  var DEFAULT_PROXIMITY_RANGE = 5;

  // Colors
  var COLOR_RING_HEALTHY   = 0x7c3aed;  // Purple
  var COLOR_RING_UNHEALTHY = 0xdc2626;  // Red
  var COLOR_DISC_A         = 0x4f46e5;  // Deep indigo
  var COLOR_DISC_B         = 0x818cf8;  // Light indigo
  var COLOR_PARTICLE_BASE  = 0x6ee7f7;  // Cyan
  var COLOR_GLOW_HEALTHY   = 0xa78bfa;  // Soft violet
  var COLOR_GLOW_UNHEALTHY = 0xf87171;  // Soft red
  var COLOR_STATUS_HEALTHY   = 0x22c55e;  // Green
  var COLOR_STATUS_UNHEALTHY = 0xef4444;  // Red

  // Animation
  var RING_ROTATION_SPEED    = 0.8;   // rad/s around Y
  var DISC_PULSE_SPEED       = 1.2;   // Hz
  var PARTICLE_ORBIT_SPEEDS  = [1.0, -0.7, 1.3, -0.9, 0.6, -1.1, 0.8, -0.5, 1.5, -1.2];
  var FLICKER_SPEED          = 8.0;   // Hz, for unhealthy portals

  // ─── Internal Helpers ────────────────────────────────────────────────────

  // Interpolate between two hex colors by t ∈ [0,1]
  function lerpColor(a, b, t) {
    var ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    var br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    var r = Math.round(ar + (br - ar) * t);
    var g = Math.round(ag + (bg - ag) * t);
    var bl2 = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl2;
  }

  // Generate a label string from connection data
  function buildLabelText(connection) {
    var name = (connection && connection.worldName) ? connection.worldName : 'Unknown World';
    var count = (connection && typeof connection.playerCount === 'number') ? connection.playerCount : 0;
    var unit = count === 1 ? 'player' : 'players';
    return name + '\n(' + count + ' ' + unit + ')';
  }

  // Create a sprite-based text label that works in Three.js r128
  // Uses a canvas texture painted onto a Sprite (billboard, always faces camera)
  function createTextSprite(text, THREE) {
    var canvas = (typeof document !== 'undefined')
      ? document.createElement('canvas')
      : { width: 256, height: 128,
          getContext: function() {
            return {
              clearRect:         function() {},
              fillRect:          function() {},
              fillText:          function() {},
              measureText:       function(t) { return { width: t.length * 8 }; },
              beginPath:         function() {},
              moveTo:            function() {},
              lineTo:            function() {},
              quadraticCurveTo:  function() {},
              closePath:         function() {},
              fill:              function() {},
              roundRect:         function() {},
              font:              '',
              fillStyle:         '',
              textAlign:         '',
              textBaseline:      ''
            };
          }
        };

    canvas.width  = 256;
    canvas.height = 128;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);

    // Background pill
    ctx.fillStyle = 'rgba(20, 10, 40, 0.82)';
    _roundRect(ctx, 8, 8, 240, 112, 16);

    // World name (line 1)
    var lines = text.split('\n');
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillStyle = '#e0d7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lines[0] || '', 128, 44);

    // Player count (line 2)
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(lines[1] || '', 128, 84);

    var texture = new THREE.CanvasTexture
      ? new THREE.CanvasTexture(canvas)
      : new THREE.Texture(canvas);

    if (texture.needsUpdate !== undefined) {
      texture.needsUpdate = true;
    }

    var material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    var sprite = new THREE.Sprite(material);
    sprite.scale.set(4.0, 2.0, 1.0);
    return sprite;
  }

  // Fallback for environments without CanvasRenderingContext2D.roundRect
  function _roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ─── Portal Positions ────────────────────────────────────────────────────

  /**
   * Arrange portals in a semicircle near Nexus centre.
   * Portals face inward (toward NEXUS_X, NEXUS_Z).
   *
   * @param {number} count - Number of portals
   * @param {function} [terrainHeightFn] - Optional fn(x, z) → y
   * @returns {Array<{x, y, z, angle}>}
   */
  function getPortalPositions(count, terrainHeightFn) {
    if (!count || count <= 0) return [];

    var positions = [];
    for (var i = 0; i < count; i++) {
      var t = count === 1 ? 0.5 : i / (count - 1);
      var angle = SEMICIRCLE_START_ANGLE + t * (SEMICIRCLE_END_ANGLE - SEMICIRCLE_START_ANGLE);

      var x = NEXUS_X + Math.cos(angle) * SEMICIRCLE_RADIUS;
      var z = NEXUS_Z + Math.sin(angle) * SEMICIRCLE_RADIUS;
      var terrainY = (typeof terrainHeightFn === 'function') ? terrainHeightFn(x, z) : 0;
      var y = terrainY + 1;

      // The portal should face inward (toward Nexus centre)
      var facingAngle = Math.atan2(NEXUS_X - x, NEXUS_Z - z);

      positions.push({ x: x, y: y, z: z, angle: facingAngle });
    }
    return positions;
  }

  // ─── Portal Creation ─────────────────────────────────────────────────────

  /**
   * Create a Three.js Group representing a Rift Portal.
   *
   * @param {Object} connection - {worldId, worldName, playerCount, latency, status, healthy?}
   * @param {Object} scene - THREE.Scene (portal is NOT added here; caller adds it)
   * @param {Object} THREE - THREE namespace (injected for testability)
   * @returns {Object} THREE.Group with userData.portalData attached
   */
  function createPortal(connection, scene, THREE) {
    if (!THREE) {
      if (typeof window !== 'undefined' && window.THREE) {
        THREE = window.THREE;
      } else {
        throw new Error('RiftPortal.createPortal: THREE is required');
      }
    }

    var healthy = _isHealthy(connection);
    var group = new THREE.Group();

    // ── Outer ring (Torus) ───────────────────────────────────────────────
    var ringGeo = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 16, 48);
    var ringMat = new THREE.MeshPhongMaterial({
      color: healthy ? COLOR_RING_HEALTHY : COLOR_RING_UNHEALTHY,
      emissive: healthy ? COLOR_GLOW_HEALTHY : COLOR_GLOW_UNHEALTHY,
      emissiveIntensity: 0.6,
      shininess: 80,
      transparent: true,
      opacity: 0.95
    });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2; // Stand upright
    ring.name = 'riftRing';
    group.add(ring);

    // ── Inner disc (Circle) ──────────────────────────────────────────────
    var discGeo = new THREE.CircleGeometry(DISC_RADIUS, 32);
    var discMat = new THREE.MeshBasicMaterial({
      color: COLOR_DISC_A,
      transparent: true,
      opacity: 0.75,
      side: 2 // THREE.DoubleSide = 2
    });
    var disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2; // Stand upright (same plane as ring)
    disc.name = 'riftDisc';
    group.add(disc);

    // ── Orbiting particles ───────────────────────────────────────────────
    var particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var pGeo = new THREE.SphereGeometry(PARTICLE_SIZE, 6, 6);
      var pColor = lerpColor(COLOR_PARTICLE_BASE, healthy ? COLOR_GLOW_HEALTHY : COLOR_GLOW_UNHEALTHY, i / PARTICLE_COUNT);
      var pMat = new THREE.MeshBasicMaterial({
        color: pColor,
        transparent: true,
        opacity: 0.9
      });
      var particle = new THREE.Mesh(pGeo, pMat);
      // Initial angle spread evenly around the ring
      var initAngle = (i / PARTICLE_COUNT) * Math.PI * 2;
      particle.position.x = Math.cos(initAngle) * PARTICLE_ORBIT_RADIUS;
      particle.position.y = Math.sin(initAngle) * PARTICLE_ORBIT_RADIUS;
      particle.position.z = 0;
      particle.name = 'riftParticle_' + i;
      particle.userData.orbitAngle = initAngle;
      particle.userData.orbitSpeed = PARTICLE_ORBIT_SPEEDS[i % PARTICLE_ORBIT_SPEEDS.length];
      group.add(particle);
      particles.push(particle);
    }

    // ── Status indicator dot ─────────────────────────────────────────────
    var dotGeo = new THREE.SphereGeometry(0.15, 8, 8);
    var dotMat = new THREE.MeshBasicMaterial({
      color: healthy ? COLOR_STATUS_HEALTHY : COLOR_STATUS_UNHEALTHY
    });
    var statusDot = new THREE.Mesh(dotGeo, dotMat);
    statusDot.position.set(RING_RADIUS + 0.3, 0, 0);
    statusDot.name = 'riftStatusDot';
    group.add(statusDot);

    // ── Text label (billboard sprite) ────────────────────────────────────
    var labelSprite = createTextSprite(buildLabelText(connection), THREE);
    labelSprite.position.set(0, RING_RADIUS + 1.2, 0);
    labelSprite.name = 'riftLabel';
    group.add(labelSprite);

    // ── Internal state attached to the group ─────────────────────────────
    group.name = 'riftPortal_' + (connection.worldId || 'unknown');
    group.userData.portalData = {
      worldId:     connection.worldId || '',
      worldName:   connection.worldName || '',
      playerCount: connection.playerCount || 0,
      latency:     connection.latency || 0,
      healthy:     healthy,
      time:        0,          // accumulated time for animation
      particles:   particles,
      ring:        ring,
      disc:        disc,
      statusDot:   statusDot,
      label:       labelSprite,
      connection:  connection
    };

    return group;
  }

  // ─── Portal Update ───────────────────────────────────────────────────────

  /**
   * Update a portal's appearance from fresh connection data.
   * Also re-creates the label text if player count changed.
   *
   * @param {Object} portalObject - THREE.Group returned by createPortal
   * @param {Object} connection - Updated connection data
   */
  function updatePortal(portalObject, connection) {
    if (!portalObject || !portalObject.userData || !portalObject.userData.portalData) {
      return;
    }

    var pd = portalObject.userData.portalData;
    var healthy = _isHealthy(connection);
    var playerCountChanged = pd.playerCount !== (connection.playerCount || 0);

    // Update stored state
    pd.worldName   = connection.worldName || pd.worldName;
    pd.playerCount = connection.playerCount || 0;
    pd.latency     = connection.latency || 0;
    pd.healthy     = healthy;
    pd.connection  = connection;

    // Update ring color
    if (pd.ring && pd.ring.material) {
      pd.ring.material.color.setHex(healthy ? COLOR_RING_HEALTHY : COLOR_RING_UNHEALTHY);
      pd.ring.material.emissive.setHex(healthy ? COLOR_GLOW_HEALTHY : COLOR_GLOW_UNHEALTHY);
    }

    // Update status dot color
    if (pd.statusDot && pd.statusDot.material) {
      pd.statusDot.material.color.setHex(healthy ? COLOR_STATUS_HEALTHY : COLOR_STATUS_UNHEALTHY);
    }

    // Update particle colors
    if (pd.particles) {
      for (var i = 0; i < pd.particles.length; i++) {
        var p = pd.particles[i];
        if (p && p.material) {
          var pColor = lerpColor(COLOR_PARTICLE_BASE, healthy ? COLOR_GLOW_HEALTHY : COLOR_GLOW_UNHEALTHY, i / pd.particles.length);
          p.material.color.setHex(pColor);
        }
      }
    }

    // Rebuild label if player count changed
    if (playerCountChanged && pd.label) {
      var newText = buildLabelText(connection);
      // Update the canvas texture if possible
      _updateLabelText(pd.label, newText);
    }
  }

  // Update sprite label text by re-painting the canvas texture
  function _updateLabelText(sprite, text) {
    if (!sprite || !sprite.material || !sprite.material.map) return;
    var map = sprite.material.map;
    if (!map.image || typeof map.image.getContext !== 'function') return;
    var canvas = map.image;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(20, 10, 40, 0.82)';
    _roundRect(ctx, 8, 8, 240, 112, 16);

    var lines = text.split('\n');
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillStyle = '#e0d7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lines[0] || '', 128, 44);

    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(lines[1] || '', 128, 84);

    map.needsUpdate = true;
  }

  // ─── Portal Removal ──────────────────────────────────────────────────────

  /**
   * Remove a portal from the scene and dispose its geometry/materials.
   *
   * @param {Object} portalObject - THREE.Group to remove
   * @param {Object} scene - THREE.Scene
   */
  function removePortal(portalObject, scene) {
    if (!portalObject) return;

    // Dispose children geometry and materials
    _disposeGroup(portalObject);

    // Remove from scene
    if (scene && typeof scene.remove === 'function') {
      scene.remove(portalObject);
    }
  }

  function _disposeGroup(group) {
    if (!group || !group.children) return;
    for (var i = group.children.length - 1; i >= 0; i--) {
      var child = group.children[i];
      if (child.geometry && typeof child.geometry.dispose === 'function') {
        child.geometry.dispose();
      }
      if (child.material) {
        if (child.material.map && typeof child.material.map.dispose === 'function') {
          child.material.map.dispose();
        }
        if (typeof child.material.dispose === 'function') {
          child.material.dispose();
        }
      }
    }
  }

  // ─── Animation ───────────────────────────────────────────────────────────

  /**
   * Animate a single portal's visual effects each frame.
   * Call this from your game loop for every active portal.
   *
   * @param {Object} portalObject - THREE.Group from createPortal
   * @param {number} deltaTime - Seconds since last frame
   */
  function animatePortal(portalObject, deltaTime) {
    if (!portalObject || !portalObject.userData || !portalObject.userData.portalData) return;

    var pd = portalObject.userData.portalData;
    pd.time += deltaTime;

    var t = pd.time;
    var healthy = pd.healthy;

    // Rotate the ring slowly around Y
    if (pd.ring) {
      pd.ring.rotation.z += RING_ROTATION_SPEED * deltaTime;
    }

    // Pulse the disc color between two hues
    if (pd.disc && pd.disc.material) {
      var pulse = (Math.sin(t * DISC_PULSE_SPEED * Math.PI * 2) + 1) * 0.5;
      var discColor = lerpColor(COLOR_DISC_A, COLOR_DISC_B, pulse);
      pd.disc.material.color.setHex(discColor);
      pd.disc.material.opacity = 0.55 + pulse * 0.3;
    }

    // Flicker effect for unhealthy portals
    if (!healthy && pd.ring && pd.ring.material) {
      var flicker = (Math.sin(t * FLICKER_SPEED * Math.PI * 2) + 1) * 0.5;
      pd.ring.material.opacity = 0.5 + flicker * 0.45;
    }

    // Orbit particles
    if (pd.particles) {
      for (var i = 0; i < pd.particles.length; i++) {
        var particle = pd.particles[i];
        if (!particle) continue;
        var speed = particle.userData.orbitSpeed || 1.0;
        particle.userData.orbitAngle += speed * deltaTime;
        var angle = particle.userData.orbitAngle;
        particle.position.x = Math.cos(angle) * PARTICLE_ORBIT_RADIUS;
        particle.position.y = Math.sin(angle) * PARTICLE_ORBIT_RADIUS;
        // Small vertical float
        particle.position.z = Math.sin(angle * 2.3 + t) * 0.25;
      }
    }

    // Gentle hover of the whole portal group
    portalObject.position.y = (portalObject.userData.baseY || 0) +
      Math.sin(t * 0.8 + (portalObject.userData.hoverOffset || 0)) * 0.15;
  }

  // ─── Batch Management ────────────────────────────────────────────────────

  /**
   * Synchronise the live portals map against the current connections list.
   * Adds portals for new connections, removes portals for dissolved ones,
   * updates and animates existing ones.
   *
   * @param {Object} portals - Mutable map of { worldId → portalObject }
   * @param {Array} connections - Array from Federation.getConnections()
   * @param {Object} scene - THREE.Scene
   * @param {number} deltaTime - Seconds since last frame
   * @param {Object} [THREE] - THREE namespace (optional, falls back to window.THREE)
   * @param {function} [terrainHeightFn] - Optional fn(x, z) → y
   */
  function updateAll(portals, connections, scene, deltaTime, THREE, terrainHeightFn) {
    if (!portals || !connections || !scene) return;

    var threeLib = THREE || (typeof window !== 'undefined' && window.THREE) || null;
    if (!threeLib) return;

    // Build set of worldIds present in current connections
    var activeIds = {};
    for (var ci = 0; ci < connections.length; ci++) {
      var conn = connections[ci];
      if (conn && conn.worldId) {
        activeIds[conn.worldId] = conn;
      }
    }

    // Remove portals for connections that no longer exist
    var existingIds = Object.keys(portals);
    for (var ri = 0; ri < existingIds.length; ri++) {
      var id = existingIds[ri];
      if (!activeIds[id]) {
        removePortal(portals[id], scene);
        delete portals[id];
      }
    }

    // Compute positions for current connections
    var connList = connections.filter(function(c) { return c && c.worldId; });
    var positions = getPortalPositions(connList.length, terrainHeightFn);

    // Add portals for new connections; update existing ones
    for (var ai = 0; ai < connList.length; ai++) {
      var connection = connList[ai];
      var worldId = connection.worldId;
      var pos = positions[ai] || { x: 0, y: 1, z: -20, angle: 0 };

      if (!portals[worldId]) {
        // Create new portal
        var portal = createPortal(connection, scene, threeLib);
        portal.position.set(pos.x, pos.y, pos.z);
        portal.rotation.y = pos.angle;
        portal.userData.baseY = pos.y;
        portal.userData.hoverOffset = ai * 1.1; // stagger hover phase
        scene.add(portal);
        portals[worldId] = portal;
      } else {
        // Update existing portal's connection data
        updatePortal(portals[worldId], connection);
      }

      // Animate
      animatePortal(portals[worldId], deltaTime);
    }
  }

  // ─── Proximity Check ─────────────────────────────────────────────────────

  /**
   * Check if the player is near any portal.
   *
   * @param {{x, y, z}} playerPos - Player world position
   * @param {Object} portals - Map of { worldId → portalObject }
   * @param {number} [range] - Proximity radius in world units (default 5)
   * @returns {{near: boolean, portal: Object|null, worldId: string|null, distance: number}}
   */
  function isPlayerNearPortal(playerPos, portals, range) {
    if (!playerPos || !portals) {
      return { near: false, portal: null, worldId: null, distance: Infinity };
    }

    var checkRange = (typeof range === 'number' && range > 0) ? range : DEFAULT_PROXIMITY_RANGE;
    var rangeSq = checkRange * checkRange;

    var ids = Object.keys(portals);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var portalObj = portals[id];
      if (!portalObj || !portalObj.position) continue;

      var dx = playerPos.x - portalObj.position.x;
      var dy = playerPos.y - portalObj.position.y;
      var dz = playerPos.z - portalObj.position.z;
      var distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= rangeSq) {
        return {
          near: true,
          portal: portalObj,
          worldId: id,
          distance: Math.sqrt(distSq)
        };
      }
    }

    return { near: false, portal: null, worldId: null, distance: Infinity };
  }

  // ─── Internal Utility ────────────────────────────────────────────────────

  function _isHealthy(connection) {
    if (!connection) return false;
    var hasGoodLatency = (connection.latency === undefined || connection.latency < 200);
    var isActive = (connection.status === 'active' || connection.status === undefined);
    // If connection provides an explicit 'healthy' flag, honour it
    if (typeof connection.healthy === 'boolean') return connection.healthy;
    return hasGoodLatency && isActive;
  }

  // ─── Exports ─────────────────────────────────────────────────────────────

  exports.createPortal       = createPortal;
  exports.updatePortal       = updatePortal;
  exports.removePortal       = removePortal;
  exports.animatePortal      = animatePortal;
  exports.updateAll          = updateAll;
  exports.getPortalPositions = getPortalPositions;
  exports.isPlayerNearPortal = isPlayerNearPortal;

  // Expose internal helpers for testing
  exports._isHealthy         = _isHealthy;
  exports._buildLabelText    = buildLabelText;
  exports._lerpColor         = lerpColor;

  // Constants exposed for tests / external configuration
  exports.RING_RADIUS            = RING_RADIUS;
  exports.DISC_RADIUS            = DISC_RADIUS;
  exports.PARTICLE_COUNT         = PARTICLE_COUNT;
  exports.SEMICIRCLE_RADIUS      = SEMICIRCLE_RADIUS;
  exports.DEFAULT_PROXIMITY_RANGE = DEFAULT_PROXIMITY_RANGE;

})(typeof module !== 'undefined' ? module.exports : (window.RiftPortal = {}));
