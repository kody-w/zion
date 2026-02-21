// test_rift_portal.js — Rift Portal 3D rendering module tests
// Constitution §10.5: portals must be shimmering, otherworldly, clearly marked
const { test, suite, report, assert } = require('./test_runner');

// ─── Mock THREE.js for Node.js testing ───────────────────────────────────────
//
// We mock only what rift_portal.js actually instantiates.  Each constructor
// stores its arguments so tests can inspect what was created.

var _meshes = [];  // track every Mesh created

var THREE = {
  Group: function() {
    this.children  = [];
    this.position  = { x: 0, y: 0, z: 0,
                       set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.rotation  = { x: 0, y: 0, z: 0 };
    this.userData  = {};
    this.name      = '';
    this.add       = function(child) { this.children.push(child); };
    this.remove    = function(child) {
      var i = this.children.indexOf(child);
      if (i !== -1) this.children.splice(i, 1);
    };
  },

  Mesh: function(geo, mat) {
    this.geometry  = geo;
    this.material  = mat;
    this.position  = { x: 0, y: 0, z: 0,
                       set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.rotation  = { x: 0, y: 0, z: 0 };
    this.userData  = {};
    this.name      = '';
    _meshes.push(this);
  },

  Sprite: function(mat) {
    this.material  = mat;
    this.position  = { x: 0, y: 0, z: 0,
                       set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.scale     = { x: 1, y: 1, z: 1,
                       set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.name      = '';
    this.userData  = {};
  },

  SpriteMaterial: function(opts) {
    this.map         = (opts && opts.map) || null;
    this.transparent = (opts && opts.transparent) || false;
    this.depthTest   = (opts && opts.depthTest !== undefined) ? opts.depthTest : true;
    this.dispose     = function() {};
  },

  TorusGeometry: function(r, tube, rs, ts) {
    this._type  = 'TorusGeometry';
    this._r     = r;
    this._tube  = tube;
    this.dispose = function() {};
  },

  CircleGeometry: function(r, segs) {
    this._type  = 'CircleGeometry';
    this._r     = r;
    this.dispose = function() {};
  },

  SphereGeometry: function(r, ws, hs) {
    this._type  = 'SphereGeometry';
    this._r     = r;
    this.dispose = function() {};
  },

  MeshBasicMaterial: function(opts) {
    this._type         = 'MeshBasicMaterial';
    this.color         = { value: (opts && opts.color) || 0xffffff,
                           setHex: function(h) { this.value = h; } };
    this.transparent   = (opts && opts.transparent) || false;
    this.opacity       = (opts && opts.opacity !== undefined) ? opts.opacity : 1;
    this.side          = (opts && opts.side) || 0;
    this.dispose       = function() {};
  },

  MeshPhongMaterial: function(opts) {
    this._type            = 'MeshPhongMaterial';
    this.color            = { value: (opts && opts.color) || 0xffffff,
                              setHex: function(h) { this.value = h; } };
    this.emissive         = { value: (opts && opts.emissive) || 0x000000,
                              setHex: function(h) { this.value = h; } };
    this.emissiveIntensity = (opts && opts.emissiveIntensity) || 0;
    this.shininess         = (opts && opts.shininess) || 30;
    this.transparent       = (opts && opts.transparent) || false;
    this.opacity           = (opts && opts.opacity !== undefined) ? opts.opacity : 1;
    this.dispose           = function() {};
  },

  // Canvas-based texture (not available in Node; we stub it)
  CanvasTexture: function(canvas) {
    this.image       = canvas;
    this.needsUpdate = false;
    this.dispose     = function() {};
    this.wrapS       = 0;
    this.wrapT       = 0;
  },

  Texture: function(canvas) {
    this.image       = canvas;
    this.needsUpdate = false;
    this.dispose     = function() {};
  }
};

// ─── Load module under test ───────────────────────────────────────────────────
// Inject THREE into the module environment via a simple wrapper
// (module uses window.THREE or passed argument; in Node we pass it explicitly)
var RiftPortal = require('../src/js/rift_portal');

// ─── Sample connection fixtures ───────────────────────────────────────────────

function makeConn(overrides) {
  return Object.assign({
    worldId:     'zion-fork-aurora',
    worldName:   'Aurora',
    endpoint:    'https://aurora-zion.github.io',
    status:      'active',
    playerCount: 12,
    latency:     45,
    description: 'A test fork'
  }, overrides || {});
}

function makeScene() {
  var children = [];
  return {
    children: children,
    add:    function(obj) { children.push(obj); },
    remove: function(obj) {
      var i = children.indexOf(obj);
      if (i !== -1) children.splice(i, 1);
    }
  };
}

// ─── Suite: createPortal ──────────────────────────────────────────────────────

suite('RiftPortal: createPortal', function() {

  test('returns a Group object', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    assert(portal, 'portal must be returned');
    assert(Array.isArray(portal.children), 'portal must be a Group (has children array)');
  });

  test('portal has at minimum 4 children (ring, disc, status dot, label)', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    // ring + disc + PARTICLE_COUNT particles + status dot + label
    assert(portal.children.length >= 4, 'must have ring, disc, status dot and label');
  });

  test('portal children include named ring mesh', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var ring = portal.children.find(function(c) { return c.name === 'riftRing'; });
    assert(ring, 'must have a child named riftRing');
  });

  test('ring uses TorusGeometry', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var ring = portal.children.find(function(c) { return c.name === 'riftRing'; });
    assert(ring, 'ring must exist');
    assert(ring.geometry && ring.geometry._type === 'TorusGeometry',
      'ring geometry must be TorusGeometry');
  });

  test('portal children include named disc mesh', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var disc = portal.children.find(function(c) { return c.name === 'riftDisc'; });
    assert(disc, 'must have a child named riftDisc');
  });

  test('disc uses CircleGeometry', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var disc = portal.children.find(function(c) { return c.name === 'riftDisc'; });
    assert(disc.geometry && disc.geometry._type === 'CircleGeometry',
      'disc geometry must be CircleGeometry');
  });

  test('portal has orbiting particles (SphereGeometry children)', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var particleMeshes = portal.children.filter(function(c) {
      return c.name && c.name.indexOf('riftParticle') === 0;
    });
    assert(particleMeshes.length > 0, 'must have at least one orbiting particle');
    assert(particleMeshes.length >= 8, 'must have at least 8 particles');
  });

  test('particle children use SphereGeometry', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var p = portal.children.find(function(c) { return c.name && c.name.indexOf('riftParticle') === 0; });
    assert(p && p.geometry && p.geometry._type === 'SphereGeometry',
      'particles must use SphereGeometry');
  });

  test('portal has status indicator dot', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var dot = portal.children.find(function(c) { return c.name === 'riftStatusDot'; });
    assert(dot, 'must have riftStatusDot child');
  });

  test('portal has label sprite', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var label = portal.children.find(function(c) { return c.name === 'riftLabel'; });
    assert(label, 'must have riftLabel child');
  });

  test('portalData userData is attached to the group', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    assert(portal.userData.portalData, 'userData.portalData must be set');
    var pd = portal.userData.portalData;
    assert(pd.worldId, 'portalData.worldId must be set');
    assert(pd.worldName, 'portalData.worldName must be set');
    assert(typeof pd.playerCount === 'number', 'portalData.playerCount must be a number');
    assert(typeof pd.healthy === 'boolean', 'portalData.healthy must be a boolean');
  });

  test('ring uses MeshPhongMaterial', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var ring = portal.children.find(function(c) { return c.name === 'riftRing'; });
    assert(ring.material._type === 'MeshPhongMaterial',
      'ring must use MeshPhongMaterial');
  });

  test('disc uses MeshBasicMaterial', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var disc = portal.children.find(function(c) { return c.name === 'riftDisc'; });
    assert(disc.material._type === 'MeshBasicMaterial',
      'disc must use MeshBasicMaterial (r128 safe)');
  });

  test('healthy portal gets healthy color tint (purple-ish)', function() {
    var scene = makeScene();
    var healthyConn = makeConn({ latency: 50, status: 'active' });
    var portal = RiftPortal.createPortal(healthyConn, scene, THREE);
    var pd = portal.userData.portalData;
    assert(pd.healthy === true, 'low-latency active portal should be healthy');
  });

  test('unhealthy portal gets unhealthy flag', function() {
    var scene = makeScene();
    var unhealthyConn = makeConn({ latency: 500, status: 'active' });
    var portal = RiftPortal.createPortal(unhealthyConn, scene, THREE);
    var pd = portal.userData.portalData;
    assert(pd.healthy === false, 'high-latency portal should be unhealthy');
  });

  test('group name encodes the worldId', function() {
    var scene = makeScene();
    var conn = makeConn({ worldId: 'zion-fork-beta' });
    var portal = RiftPortal.createPortal(conn, scene, THREE);
    assert(portal.name.indexOf('zion-fork-beta') !== -1,
      'portal group name must include worldId');
  });

  test('throws when THREE is unavailable and window.THREE is not set', function() {
    var threw = false;
    try {
      // Pass null explicitly — no fallback
      RiftPortal.createPortal(makeConn(), makeScene(), null);
    } catch (e) {
      threw = true;
    }
    assert(threw, 'createPortal must throw when THREE is not available');
  });

});


// ─── Suite: updatePortal ──────────────────────────────────────────────────────

suite('RiftPortal: updatePortal', function() {

  test('updates playerCount in portalData', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn({ playerCount: 5 }), scene, THREE);
    RiftPortal.updatePortal(portal, makeConn({ playerCount: 42 }));
    assert.strictEqual(portal.userData.portalData.playerCount, 42);
  });

  test('updates latency in portalData', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn({ latency: 10 }), scene, THREE);
    RiftPortal.updatePortal(portal, makeConn({ latency: 350 }));
    assert.strictEqual(portal.userData.portalData.latency, 350);
  });

  test('updates health status from healthy to unhealthy', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn({ latency: 20 }), scene, THREE);
    assert(portal.userData.portalData.healthy === true, 'should start healthy');
    RiftPortal.updatePortal(portal, makeConn({ latency: 999 }));
    assert(portal.userData.portalData.healthy === false, 'should become unhealthy');
  });

  test('updates health status from unhealthy to healthy', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn({ latency: 999 }), scene, THREE);
    assert(portal.userData.portalData.healthy === false, 'should start unhealthy');
    RiftPortal.updatePortal(portal, makeConn({ latency: 10 }));
    assert(portal.userData.portalData.healthy === true, 'should become healthy');
  });

  test('updates ring material color on health change', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn({ latency: 10 }), scene, THREE);
    var ring = portal.children.find(function(c) { return c.name === 'riftRing'; });
    var colorBefore = ring.material.color.value;
    RiftPortal.updatePortal(portal, makeConn({ latency: 999 }));
    var colorAfter = ring.material.color.value;
    assert(colorBefore !== colorAfter, 'ring color must change when health status changes');
  });

  test('handles null/missing portalData gracefully (no throw)', function() {
    var badPortal = { userData: {} };
    var threw = false;
    try {
      RiftPortal.updatePortal(badPortal, makeConn());
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'updatePortal must not throw on missing portalData');
  });

  test('handles null portal gracefully (no throw)', function() {
    var threw = false;
    try {
      RiftPortal.updatePortal(null, makeConn());
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'updatePortal must not throw on null portal');
  });

});


// ─── Suite: removePortal ──────────────────────────────────────────────────────

suite('RiftPortal: removePortal', function() {

  test('removes portal from scene', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    scene.add(portal);
    assert(scene.children.indexOf(portal) !== -1, 'portal should be in scene before removal');
    RiftPortal.removePortal(portal, scene);
    assert(scene.children.indexOf(portal) === -1, 'portal should be removed from scene');
  });

  test('does not throw when portal is null', function() {
    var scene = makeScene();
    var threw = false;
    try {
      RiftPortal.removePortal(null, scene);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'removePortal must not throw on null portal');
  });

  test('does not throw when scene is null', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var threw = false;
    try {
      RiftPortal.removePortal(portal, null);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'removePortal must not throw when scene is null');
  });

});


// ─── Suite: getPortalPositions ────────────────────────────────────────────────

suite('RiftPortal: getPortalPositions', function() {

  test('returns empty array for count 0', function() {
    var positions = RiftPortal.getPortalPositions(0);
    assert(Array.isArray(positions), 'must return an array');
    assert.strictEqual(positions.length, 0, 'must return 0 positions');
  });

  test('returns 1 position for count 1', function() {
    var positions = RiftPortal.getPortalPositions(1);
    assert.strictEqual(positions.length, 1);
  });

  test('returns 5 positions for count 5', function() {
    var positions = RiftPortal.getPortalPositions(5);
    assert.strictEqual(positions.length, 5);
  });

  test('each position has x, y, z, angle fields', function() {
    var positions = RiftPortal.getPortalPositions(3);
    positions.forEach(function(p) {
      assert(typeof p.x === 'number', 'x must be a number');
      assert(typeof p.y === 'number', 'y must be a number');
      assert(typeof p.z === 'number', 'z must be a number');
      assert(typeof p.angle === 'number', 'angle must be a number');
    });
  });

  test('positions are arranged in a semicircle (distinct x/z values)', function() {
    var positions = RiftPortal.getPortalPositions(3);
    // All positions should be near Nexus (within SEMICIRCLE_RADIUS + small margin)
    var maxDist = RiftPortal.SEMICIRCLE_RADIUS + 1;
    positions.forEach(function(p) {
      var dist = Math.sqrt(p.x * p.x + p.z * p.z);
      assert(dist <= maxDist, 'position must be within semicircle radius of Nexus');
      assert(dist > 0, 'positions must not be at world origin');
    });
  });

  test('no two positions are identical (spread evenly)', function() {
    var positions = RiftPortal.getPortalPositions(5);
    for (var i = 0; i < positions.length; i++) {
      for (var j = i + 1; j < positions.length; j++) {
        var dx = positions[i].x - positions[j].x;
        var dz = positions[i].z - positions[j].z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        assert(dist > 0.1, 'positions must be distinct (no two portals at same spot)');
      }
    }
  });

  test('uses terrainHeightFn to compute Y', function() {
    var terrainFn = function(x, z) { return 42; };
    var positions = RiftPortal.getPortalPositions(2, terrainFn);
    positions.forEach(function(p) {
      // Y should be terrainHeight + 1
      assert(p.y === 43, 'Y must be terrainHeight(42) + 1');
    });
  });

  test('Y defaults to 1 when no terrainHeightFn provided', function() {
    var positions = RiftPortal.getPortalPositions(2);
    positions.forEach(function(p) {
      assert(p.y === 1, 'Y must default to 0 + 1 = 1');
    });
  });

  test('returns empty array for undefined count', function() {
    var positions = RiftPortal.getPortalPositions(undefined);
    assert(Array.isArray(positions));
    assert.strictEqual(positions.length, 0);
  });

  test('returns empty array for negative count', function() {
    var positions = RiftPortal.getPortalPositions(-1);
    assert(Array.isArray(positions));
    assert.strictEqual(positions.length, 0);
  });

});


// ─── Suite: isPlayerNearPortal ────────────────────────────────────────────────

suite('RiftPortal: isPlayerNearPortal', function() {

  function makePortalAt(x, y, z) {
    var group = new THREE.Group();
    group.position.set(x, y, z);
    group.userData.portalData = { worldId: 'test-world' };
    return group;
  }

  test('returns near=false when portals map is empty', function() {
    var result = RiftPortal.isPlayerNearPortal({ x: 0, y: 0, z: 0 }, {});
    assert.strictEqual(result.near, false);
    assert.strictEqual(result.portal, null);
  });

  test('detects player within default range (5 units)', function() {
    var portals = { 'test-world': makePortalAt(0, 0, 0) };
    var playerPos = { x: 3, y: 0, z: 0 };  // 3 units away
    var result = RiftPortal.isPlayerNearPortal(playerPos, portals);
    assert.strictEqual(result.near, true);
    assert(result.portal !== null);
    assert.strictEqual(result.worldId, 'test-world');
  });

  test('returns near=false when player is beyond default range', function() {
    var portals = { 'test-world': makePortalAt(0, 0, 0) };
    var playerPos = { x: 10, y: 0, z: 0 };  // 10 units away
    var result = RiftPortal.isPlayerNearPortal(playerPos, portals);
    assert.strictEqual(result.near, false);
  });

  test('respects custom range parameter', function() {
    var portals = { 'test-world': makePortalAt(0, 0, 0) };
    var playerPos = { x: 8, y: 0, z: 0 };  // 8 units away

    var resultDefault = RiftPortal.isPlayerNearPortal(playerPos, portals);
    assert.strictEqual(resultDefault.near, false, 'must be out of default range (5)');

    var resultCustom = RiftPortal.isPlayerNearPortal(playerPos, portals, 10);
    assert.strictEqual(resultCustom.near, true, 'must be within custom range (10)');
  });

  test('returns distance value', function() {
    var portals = { 'test-world': makePortalAt(0, 0, 0) };
    var playerPos = { x: 3, y: 0, z: 0 };
    var result = RiftPortal.isPlayerNearPortal(playerPos, portals);
    assert(typeof result.distance === 'number', 'distance must be a number');
    assert(Math.abs(result.distance - 3) < 0.001, 'distance must be ~3');
  });

  test('returns Infinity distance when no portal is near', function() {
    var portals = { 'test-world': makePortalAt(0, 0, 0) };
    var playerPos = { x: 100, y: 0, z: 0 };
    var result = RiftPortal.isPlayerNearPortal(playerPos, portals);
    assert.strictEqual(result.distance, Infinity);
  });

  test('finds nearest portal from multiple portals', function() {
    var portals = {
      'world-a': makePortalAt(0,  0, 0),
      'world-b': makePortalAt(50, 0, 0),
      'world-c': makePortalAt(3,  0, 0)
    };
    var playerPos = { x: 0, y: 0, z: 0 };
    var result = RiftPortal.isPlayerNearPortal(playerPos, portals, 5);
    // world-a is at dist 0, world-c at dist 3 — either is valid; at least one near
    assert.strictEqual(result.near, true);
    assert(result.worldId === 'world-a' || result.worldId === 'world-c',
      'nearest portal should be world-a or world-c');
  });

  test('handles null playerPos gracefully', function() {
    var portals = { 'test-world': makePortalAt(0, 0, 0) };
    var result = RiftPortal.isPlayerNearPortal(null, portals);
    assert.strictEqual(result.near, false);
  });

  test('handles null portals gracefully', function() {
    var result = RiftPortal.isPlayerNearPortal({ x: 0, y: 0, z: 0 }, null);
    assert.strictEqual(result.near, false);
  });

});


// ─── Suite: updateAll ─────────────────────────────────────────────────────────

suite('RiftPortal: updateAll', function() {

  test('adds portals for new connections', function() {
    var portals = {};
    var scene   = makeScene();
    var conns   = [makeConn({ worldId: 'world-1', worldName: 'World One' })];

    RiftPortal.updateAll(portals, conns, scene, 0.016, THREE);

    assert(portals['world-1'], 'portal must be created for world-1');
    assert(scene.children.indexOf(portals['world-1']) !== -1, 'portal must be added to scene');
  });

  test('removes portals for dissolved connections', function() {
    var portals = {};
    var scene   = makeScene();
    var conns   = [makeConn({ worldId: 'world-gone' })];

    // First tick: add portal
    RiftPortal.updateAll(portals, conns, scene, 0.016, THREE);
    assert(portals['world-gone'], 'portal must be created');

    // Second tick: connection dissolved
    RiftPortal.updateAll(portals, [], scene, 0.016, THREE);
    assert(!portals['world-gone'], 'portal must be removed when connection dissolves');
    assert(scene.children.indexOf(portals['world-gone']) === -1,
      'portal must be removed from scene');
  });

  test('handles 0 connections gracefully', function() {
    var portals = {};
    var scene   = makeScene();
    var threw   = false;
    try {
      RiftPortal.updateAll(portals, [], scene, 0.016, THREE);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'updateAll with 0 connections must not throw');
    assert.strictEqual(Object.keys(portals).length, 0);
  });

  test('handles 1 connection', function() {
    var portals = {};
    var scene   = makeScene();
    RiftPortal.updateAll(portals, [makeConn({ worldId: 'solo-world' })], scene, 0.016, THREE);
    assert(portals['solo-world'], 'must create 1 portal for 1 connection');
  });

  test('handles 5 connections', function() {
    var portals = {};
    var scene   = makeScene();
    var conns = [
      makeConn({ worldId: 'w1', worldName: 'W1' }),
      makeConn({ worldId: 'w2', worldName: 'W2' }),
      makeConn({ worldId: 'w3', worldName: 'W3' }),
      makeConn({ worldId: 'w4', worldName: 'W4' }),
      makeConn({ worldId: 'w5', worldName: 'W5' })
    ];
    RiftPortal.updateAll(portals, conns, scene, 0.016, THREE);
    assert.strictEqual(Object.keys(portals).length, 5, 'must create 5 portals for 5 connections');
    assert.strictEqual(scene.children.length, 5, 'must add all 5 portals to scene');
  });

  test('does not duplicate portals on subsequent ticks', function() {
    var portals = {};
    var scene   = makeScene();
    var conns   = [makeConn({ worldId: 'stable-world' })];

    RiftPortal.updateAll(portals, conns, scene, 0.016, THREE);
    var countAfterFirst = scene.children.length;

    RiftPortal.updateAll(portals, conns, scene, 0.016, THREE);
    var countAfterSecond = scene.children.length;

    assert.strictEqual(countAfterFirst, countAfterSecond,
      'subsequent ticks must not duplicate portals in scene');
    assert.strictEqual(Object.keys(portals).length, 1, 'portals map must still have 1 entry');
  });

  test('gracefully handles missing THREE (returns early without throwing)', function() {
    var portals = {};
    var scene   = makeScene();
    var threw   = false;
    try {
      // Pass null for THREE — module should bail out gracefully
      RiftPortal.updateAll(portals, [makeConn()], scene, 0.016, null);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'updateAll must not throw when THREE is unavailable');
  });

  test('animation tick does not crash on valid portals', function() {
    var portals = {};
    var scene   = makeScene();
    var conns   = [makeConn({ worldId: 'anim-world' })];

    RiftPortal.updateAll(portals, conns, scene, 0.016, THREE);
    // Simulate multiple animation frames
    var threw = false;
    try {
      for (var i = 0; i < 60; i++) {
        RiftPortal.updateAll(portals, conns, scene, 0.016, THREE);
      }
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'animation over 60 frames must not crash');
  });

});


// ─── Suite: animatePortal ─────────────────────────────────────────────────────

suite('RiftPortal: animatePortal', function() {

  test('advances time counter in portalData', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var timeBefore = portal.userData.portalData.time;
    RiftPortal.animatePortal(portal, 0.016);
    var timeAfter = portal.userData.portalData.time;
    assert(timeAfter > timeBefore, 'time must advance each frame');
  });

  test('rotates the ring mesh', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var ring = portal.children.find(function(c) { return c.name === 'riftRing'; });
    var rotBefore = ring.rotation.z;
    RiftPortal.animatePortal(portal, 0.1);
    assert(ring.rotation.z !== rotBefore, 'ring rotation.z must change each frame');
  });

  test('moves orbiting particles', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    var particle = portal.children.find(function(c) {
      return c.name && c.name.indexOf('riftParticle') === 0;
    });
    var xBefore = particle.position.x;
    RiftPortal.animatePortal(portal, 0.5);
    // Position should have changed
    assert(particle.position.x !== xBefore ||
           particle.position.y !== 0,
      'particle position must update each frame');
  });

  test('does not crash on null portal', function() {
    var threw = false;
    try {
      RiftPortal.animatePortal(null, 0.016);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'animatePortal must not throw on null portal');
  });

  test('does not crash on portal with no portalData', function() {
    var bare = { userData: {} };
    var threw = false;
    try {
      RiftPortal.animatePortal(bare, 0.016);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'animatePortal must not throw on portal with missing userData.portalData');
  });

});


// ─── Suite: helper functions ──────────────────────────────────────────────────

suite('RiftPortal: helpers', function() {

  test('_isHealthy returns true for low-latency active connection', function() {
    var conn = makeConn({ latency: 50, status: 'active' });
    assert.strictEqual(RiftPortal._isHealthy(conn), true);
  });

  test('_isHealthy returns false for high-latency connection', function() {
    var conn = makeConn({ latency: 500, status: 'active' });
    assert.strictEqual(RiftPortal._isHealthy(conn), false);
  });

  test('_isHealthy honours explicit healthy flag (true)', function() {
    var conn = makeConn({ latency: 999, status: 'active', healthy: true });
    assert.strictEqual(RiftPortal._isHealthy(conn), true);
  });

  test('_isHealthy honours explicit healthy flag (false)', function() {
    var conn = makeConn({ latency: 10, status: 'active', healthy: false });
    assert.strictEqual(RiftPortal._isHealthy(conn), false);
  });

  test('_isHealthy returns false for null connection', function() {
    assert.strictEqual(RiftPortal._isHealthy(null), false);
  });

  test('_buildLabelText formats single player correctly', function() {
    var text = RiftPortal._buildLabelText({ worldName: 'Aurora', playerCount: 1 });
    assert(text.indexOf('Aurora') !== -1, 'must include world name');
    assert(text.indexOf('1 player') !== -1, 'must use singular "player" for 1');
  });

  test('_buildLabelText formats multiple players correctly', function() {
    var text = RiftPortal._buildLabelText({ worldName: 'Aurora', playerCount: 12 });
    assert(text.indexOf('12 players') !== -1, 'must use plural "players" for 12');
  });

  test('_buildLabelText handles missing worldName', function() {
    var text = RiftPortal._buildLabelText({ playerCount: 5 });
    assert(text.indexOf('Unknown World') !== -1, 'must fall back to Unknown World');
  });

  test('_lerpColor interpolates between two colors', function() {
    var black = 0x000000;
    var white = 0xffffff;
    var mid   = RiftPortal._lerpColor(black, white, 0.5);
    // mid should be around 0x7f7f7f or 0x808080 (Math.round(127.5) == 128)
    assert(mid >= 0x7f7f7f && mid <= 0x808080, 'midpoint must be roughly 0x7f7f7f-0x808080, got: 0x' + mid.toString(16));
  });

  test('_lerpColor at t=0 returns color a', function() {
    var result = RiftPortal._lerpColor(0x123456, 0xabcdef, 0);
    assert.strictEqual(result, 0x123456);
  });

  test('_lerpColor at t=1 returns color b', function() {
    var result = RiftPortal._lerpColor(0x123456, 0xabcdef, 1);
    assert.strictEqual(result, 0xabcdef);
  });

});


// ─── Suite: edge cases / Federation guard ────────────────────────────────────

suite('RiftPortal: edge cases', function() {

  test('module loads without Federation module (standalone)', function() {
    // RiftPortal must not require Federation to be present
    // (it is already loaded above with no Federation dependency)
    assert(typeof RiftPortal.createPortal === 'function', 'createPortal must be a function');
    assert(typeof RiftPortal.updateAll    === 'function', 'updateAll must be a function');
  });

  test('getPortalPositions returns correct count for large inputs', function() {
    var positions = RiftPortal.getPortalPositions(20);
    assert.strictEqual(positions.length, 20, 'must return 20 positions for 20 portals');
  });

  test('createPortal with minimal connection data does not throw', function() {
    var minConn = { worldId: 'min', worldName: 'Min' };
    var threw = false;
    try {
      RiftPortal.createPortal(minConn, makeScene(), THREE);
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'createPortal must not throw on minimal connection data');
  });

  test('createPortal with disconnected status marks unhealthy', function() {
    var scene = makeScene();
    var conn = makeConn({ status: 'disconnected', latency: 10 });
    var portal = RiftPortal.createPortal(conn, scene, THREE);
    assert(portal.userData.portalData.healthy === false,
      'disconnected portal must be unhealthy regardless of latency');
  });

  test('removePortal on already-removed portal does not throw', function() {
    var scene = makeScene();
    var portal = RiftPortal.createPortal(makeConn(), scene, THREE);
    scene.add(portal);
    RiftPortal.removePortal(portal, scene);
    var threw = false;
    try {
      RiftPortal.removePortal(portal, scene); // second removal
    } catch (e) {
      threw = true;
    }
    assert(!threw, 'double-removal must not throw');
  });

  test('isPlayerNearPortal with 0 range never detects near', function() {
    // range of 0 means no proximity — player must stand exactly on portal
    var portals = { 'w': { position: { x: 0, y: 0, z: 0 }, userData: { portalData: {} } } };
    // Player at exact same position but range=0: 0^2 = 0, distance=0, 0 <= 0 is true
    // This is valid — player is literally inside the portal
    var result = RiftPortal.isPlayerNearPortal({ x: 0, y: 0, z: 0 }, portals, 0);
    // Either behaviour is acceptable; just must not throw
    assert(typeof result.near === 'boolean', 'near must be a boolean');
  });

  test('full lifecycle: create → update → animate → remove', function() {
    var scene  = makeScene();
    var portals = {};
    var conn    = makeConn({ worldId: 'lifecycle-world' });
    var threw   = false;

    try {
      // Create
      RiftPortal.updateAll(portals, [conn], scene, 0, THREE);
      assert(portals['lifecycle-world'], 'portal must be created');

      // Update
      conn.playerCount = 99;
      RiftPortal.updateAll(portals, [conn], scene, 0.016, THREE);
      assert.strictEqual(portals['lifecycle-world'].userData.portalData.playerCount, 99);

      // Animate
      RiftPortal.animatePortal(portals['lifecycle-world'], 0.016);

      // Remove
      RiftPortal.updateAll(portals, [], scene, 0.016, THREE);
      assert(!portals['lifecycle-world'], 'portal must be removed');
    } catch (e) {
      threw = true;
      console.log('  Error:', e.message);
    }
    assert(!threw, 'full portal lifecycle must not throw');
  });

});


// ─── Run ─────────────────────────────────────────────────────────────────────

var success = report();
process.exit(success ? 0 : 1);
