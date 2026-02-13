(function(exports) {
  // ========================================================================
  // UNIFIED WORLD — Continuous terrain with 8 geographic zones
  // Chunk-based loading, noise heightmap, zone structures, physics
  // ========================================================================

  var playerMeshes = new Map();
  var skyDome = null, sunMesh = null, moonMesh = null, stars = null;
  var clouds = [];
  var animatedObjects = [];
  var loadedChunks = new Map(); // "cx_cz" -> { group, objects[] }
  var activeZone = 'nexus';

  // Texture loader and cache
  var textureLoader = null;
  var textureCache = {};
  var ASSET_BASE = '';

  function getTexture(name) {
    if (!textureLoader) {
      if (typeof THREE === 'undefined') return null;
      textureLoader = new THREE.TextureLoader();
      if (typeof window !== 'undefined') {
        var path = window.location.pathname;
        ASSET_BASE = path.substring(0, path.lastIndexOf('/') + 1);
      }
    }
    if (textureCache[name]) return textureCache[name];
    var tex = textureLoader.load(ASSET_BASE + 'assets/textures/' + name);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    textureCache[name] = tex;
    return tex;
  }

  // ========================================================================
  // CONSTANTS
  // ========================================================================

  var CHUNK_SIZE = 64;
  var LOAD_RADIUS = 3; // chunks in each direction
  var WORLD_HALF = 600; // -600 to +600

  // ========================================================================
  // ZONE DEFINITIONS — Geographic regions on unified map
  // ========================================================================

  var ZONES = {
    nexus:      { cx: 0,    cz: 0,    radius: 60, baseHeight: 2,   color: 0x8888cc, groundColor: 0xb0b0d0, texName: 'stone.png', name: 'The Nexus' },
    gardens:    { cx: 200,  cz: 30,   radius: 80, baseHeight: 0,   color: 0x4caf50, groundColor: 0x3a8f3a, texName: 'grass.png', name: 'The Gardens' },
    athenaeum:  { cx: 100,  cz: -220, radius: 60, baseHeight: 4,   color: 0x795548, groundColor: 0x9e9e9e, texName: 'marble.png', name: 'The Athenaeum' },
    studio:     { cx: -200, cz: -100, radius: 60, baseHeight: 1,   color: 0xff9800, groundColor: 0xd4a76a, texName: 'wood.png', name: 'The Studio' },
    wilds:      { cx: -30,  cz: 260,  radius: 90, baseHeight: -1,  color: 0x2e7d32, groundColor: 0x1b5e20, texName: 'grass_dark.png', name: 'The Wilds' },
    agora:      { cx: -190, cz: 120,  radius: 55, baseHeight: 1.5, color: 0xffd700, groundColor: 0xc8a45a, texName: 'cobblestone.png', name: 'The Agora' },
    commons:    { cx: 170,  cz: 190,  radius: 55, baseHeight: 0.5, color: 0xfaf0e6, groundColor: 0xd2b48c, texName: 'dirt_path.png', name: 'The Commons' },
    arena:      { cx: 0,    cz: -240, radius: 55, baseHeight: 3,   color: 0xd2691e, groundColor: 0xe0c097, texName: 'sand.png', name: 'The Arena' }
  };

  // ========================================================================
  // SEEDED RANDOM — deterministic world generation
  // ========================================================================

  function hash2D(x, y) {
    var n = x * 374761393 + y * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff;
  }

  function smoothstep(t) { return t * t * (3 - 2 * t); }

  function noise2D(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    fx = smoothstep(fx);
    fy = smoothstep(fy);
    var a = hash2D(ix, iy);
    var b = hash2D(ix + 1, iy);
    var c = hash2D(ix, iy + 1);
    var d = hash2D(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  function seededRandom(a, b, c) {
    var n = a * 12345 + b * 67890 + (c || 0) * 11111;
    return hash2D(n, n * 7);
  }

  // ========================================================================
  // TERRAIN HEIGHT — Multi-octave noise with zone flattening
  // ========================================================================

  function rawTerrainHeight(wx, wz) {
    var h = 0;
    // 4 octaves of noise
    h += noise2D(wx * 0.008, wz * 0.008) * 20;    // broad hills
    h += noise2D(wx * 0.02, wz * 0.02) * 8;        // medium detail
    h += noise2D(wx * 0.06, wz * 0.06) * 3;        // fine detail
    h += noise2D(wx * 0.15, wz * 0.15) * 1;        // micro detail
    return h - 10; // shift baseline down
  }

  function terrainHeight(wx, wz) {
    var raw = rawTerrainHeight(wx, wz);

    // Flatten terrain near zone centers with smooth blend
    for (var zoneId in ZONES) {
      var z = ZONES[zoneId];
      var dx = wx - z.cx, dz = wz - z.cz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      var flatRadius = z.radius * 0.5;
      var blendRadius = z.radius * 0.9;

      if (dist < blendRadius) {
        var t;
        if (dist < flatRadius) {
          t = 1.0;
        } else {
          t = 1.0 - (dist - flatRadius) / (blendRadius - flatRadius);
          t = smoothstep(t);
        }
        raw = raw * (1 - t) + z.baseHeight * t;
      }
    }

    // Flatten paths between zones (connecting to nexus)
    for (var zId in ZONES) {
      if (zId === 'nexus') continue;
      var zone = ZONES[zId];
      var nx = ZONES.nexus.cx, nz = ZONES.nexus.cz;
      // Distance from point to line segment (nexus -> zone center)
      var pathDist = pointToSegDist(wx, wz, nx, nz, zone.cx, zone.cz);
      if (pathDist < 8) {
        var pathBlend = smoothstep(1.0 - pathDist / 8);
        // Lerp path height between zone base heights
        var segT = projectOnSeg(wx, wz, nx, nz, zone.cx, zone.cz);
        var pathH = ZONES.nexus.baseHeight * (1 - segT) + zone.baseHeight * segT;
        raw = raw * (1 - pathBlend * 0.8) + pathH * pathBlend * 0.8;
      }
    }

    return raw;
  }

  function pointToSegDist(px, pz, ax, az, bx, bz) {
    var abx = bx - ax, abz = bz - az;
    var apx = px - ax, apz = pz - az;
    var t = (apx * abx + apz * abz) / (abx * abx + abz * abz + 0.001);
    t = Math.max(0, Math.min(1, t));
    var cx = ax + t * abx - px, cz = az + t * abz - pz;
    return Math.sqrt(cx * cx + cz * cz);
  }

  function projectOnSeg(px, pz, ax, az, bx, bz) {
    var abx = bx - ax, abz = bz - az;
    var apx = px - ax, apz = pz - az;
    return Math.max(0, Math.min(1, (apx * abx + apz * abz) / (abx * abx + abz * abz + 0.001)));
  }

  // ========================================================================
  // ZONE DETECTION
  // ========================================================================

  function getZoneAtPosition(wx, wz) {
    var closest = 'nexus', closestDist = Infinity;
    for (var zoneId in ZONES) {
      var z = ZONES[zoneId];
      var dx = wx - z.cx, dz = wz - z.cz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      // Weight by zone radius so smaller zones still "own" their area
      var weighted = dist / z.radius;
      if (weighted < closestDist) {
        closestDist = weighted;
        closest = zoneId;
      }
    }
    return closest;
  }

  function getZoneCenter(zoneId) {
    var z = ZONES[zoneId];
    return z ? { x: z.cx, z: z.cz } : { x: 0, z: 0 };
  }

  function getTerrainHeight(wx, wz) {
    return terrainHeight(wx, wz);
  }

  // ========================================================================
  // CHUNK SYSTEM — dynamic terrain loading/unloading
  // ========================================================================

  function chunkKey(cx, cz) { return cx + '_' + cz; }

  function updateChunks(sceneCtx, playerX, playerZ) {
    if (!sceneCtx || !sceneCtx.scene) return;

    var pcx = Math.floor(playerX / CHUNK_SIZE);
    var pcz = Math.floor(playerZ / CHUNK_SIZE);

    // Determine which chunks should be loaded
    var needed = new Set();
    for (var dx = -LOAD_RADIUS; dx <= LOAD_RADIUS; dx++) {
      for (var dz = -LOAD_RADIUS; dz <= LOAD_RADIUS; dz++) {
        needed.add(chunkKey(pcx + dx, pcz + dz));
      }
    }

    // Unload chunks that are too far
    var toRemove = [];
    loadedChunks.forEach(function(chunkData, key) {
      if (!needed.has(key)) {
        sceneCtx.scene.remove(chunkData.group);
        // Dispose geometry/materials
        chunkData.group.traverse(function(obj) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
            else obj.material.dispose();
          }
        });
        toRemove.push(key);
      }
    });
    toRemove.forEach(function(key) { loadedChunks.delete(key); });

    // Load new chunks
    needed.forEach(function(key) {
      if (!loadedChunks.has(key)) {
        var parts = key.split('_');
        var cx = parseInt(parts[0]), cz = parseInt(parts[1]);
        generateChunk(sceneCtx.scene, cx, cz);
      }
    });
  }

  function generateChunk(scene, cx, cz) {
    var group = new THREE.Group();
    var wx = cx * CHUNK_SIZE, wz = cz * CHUNK_SIZE;

    // Determine dominant zone for this chunk
    var centerX = wx + CHUNK_SIZE / 2, centerZ = wz + CHUNK_SIZE / 2;
    var zone = getZoneAtPosition(centerX, centerZ);
    var zoneData = ZONES[zone];

    // ---- TERRAIN MESH ----
    var res = 16; // vertices per side
    var step = CHUNK_SIZE / res;
    var geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, res, res);
    var positions = geo.attributes.position.array;
    var colors = new Float32Array(positions.length);

    for (var i = 0; i <= res; i++) {
      for (var j = 0; j <= res; j++) {
        var idx = (i * (res + 1) + j);
        var px = wx + j * step;
        var pz = wz + i * step;
        var h = terrainHeight(px, pz);

        // Set vertex position (PlaneGeometry is in XY, we rotate to XZ)
        positions[idx * 3] = j * step;     // local x
        positions[idx * 3 + 1] = i * step; // local z (will become z after rotation)
        positions[idx * 3 + 2] = h;        // height (will become y after rotation)

        // Vertex color based on zone/height
        var localZone = getZoneAtPosition(px, pz);
        var lz = ZONES[localZone];
        var r = ((lz.groundColor >> 16) & 0xff) / 255;
        var g = ((lz.groundColor >> 8) & 0xff) / 255;
        var b = (lz.groundColor & 0xff) / 255;

        // Height-based color variation
        var hFactor = Math.max(0, Math.min(1, (h + 5) / 30));
        r = r * (0.8 + hFactor * 0.4);
        g = g * (0.8 + hFactor * 0.2);
        b = b * (0.7 + hFactor * 0.3);

        // Path darkening
        for (var zId in ZONES) {
          if (zId === 'nexus') continue;
          var pDist = pointToSegDist(px, pz, ZONES.nexus.cx, ZONES.nexus.cz, ZONES[zId].cx, ZONES[zId].cz);
          if (pDist < 6) {
            var pathFade = 1 - pDist / 6;
            r = r * (1 - pathFade * 0.3) + 0.55 * pathFade * 0.3;
            g = g * (1 - pathFade * 0.3) + 0.45 * pathFade * 0.3;
            b = b * (1 - pathFade * 0.3) + 0.35 * pathFade * 0.3;
          }
        }

        colors[idx * 3] = Math.min(1, r);
        colors[idx * 3 + 1] = Math.min(1, g);
        colors[idx * 3 + 2] = Math.min(1, b);
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    var mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });

    // Try to apply zone texture
    var tex = getTexture(zoneData.texName);
    if (tex) {
      tex.repeat.set(4, 4);
      mat.map = tex;
    }

    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(wx, 0, wz);
    mesh.receiveShadow = false;
    group.add(mesh);

    // ---- DETAIL OBJECTS ----
    generateChunkDetails(group, cx, cz, zone, wx, wz);

    scene.add(group);
    loadedChunks.set(chunkKey(cx, cz), { group: group });
  }

  // ========================================================================
  // CHUNK DETAIL GENERATION — trees, rocks, flowers, grass clumps
  // ========================================================================

  function generateChunkDetails(group, cx, cz, zone, wx, wz) {
    var seed = cx * 7919 + cz * 6271;

    // Skip details for chunks far from any zone
    var nearZone = false;
    for (var zId in ZONES) {
      var z = ZONES[zId];
      var dx = (wx + CHUNK_SIZE / 2) - z.cx;
      var dz = (wz + CHUNK_SIZE / 2) - z.cz;
      if (Math.sqrt(dx * dx + dz * dz) < z.radius + CHUNK_SIZE) {
        nearZone = true;
        break;
      }
    }

    // Trees density based on zone
    var treeDensity = 0;
    if (zone === 'gardens') treeDensity = 12;
    else if (zone === 'wilds') treeDensity = 18;
    else if (zone === 'commons') treeDensity = 4;
    else if (zone === 'studio') treeDensity = 3;
    else if (zone === 'agora') treeDensity = 2;
    else treeDensity = nearZone ? 5 : 8; // wilderness between zones

    for (var t = 0; t < treeDensity; t++) {
      var tx = wx + seededRandom(seed, t, 1) * CHUNK_SIZE;
      var tz = wz + seededRandom(seed, t, 2) * CHUNK_SIZE;

      // Don't place trees on paths
      var onPath = false;
      for (var pz in ZONES) {
        if (pz === 'nexus') continue;
        if (pointToSegDist(tx, tz, ZONES.nexus.cx, ZONES.nexus.cz, ZONES[pz].cx, ZONES[pz].cz) < 5) {
          onPath = true;
          break;
        }
      }
      if (onPath) continue;

      // Don't place inside zone center structures
      var inCenter = false;
      for (var zId2 in ZONES) {
        var zd = ZONES[zId2];
        var ddx = tx - zd.cx, ddz = tz - zd.cz;
        if (Math.sqrt(ddx * ddx + ddz * ddz) < zd.radius * 0.35) {
          inCenter = true;
          break;
        }
      }
      if (inCenter) continue;

      var th = terrainHeight(tx, tz);
      createTree(group, tx, th, tz, seed + t, zone);
    }

    // Rocks
    var rockDensity = (zone === 'wilds' || zone === 'arena') ? 8 : (zone === 'nexus' || zone === 'athenaeum') ? 4 : 3;
    for (var r = 0; r < rockDensity; r++) {
      var rx = wx + seededRandom(seed + 100, r, 1) * CHUNK_SIZE;
      var rz = wz + seededRandom(seed + 100, r, 2) * CHUNK_SIZE;
      var rh = terrainHeight(rx, rz);
      createRock(group, rx, rh, rz, seed + 100 + r);
    }

    // Flowers (gardens, commons)
    if (zone === 'gardens' || zone === 'commons' || zone === 'wilds') {
      var flowerDensity = zone === 'gardens' ? 20 : 8;
      for (var f = 0; f < flowerDensity; f++) {
        var fx = wx + seededRandom(seed + 200, f, 1) * CHUNK_SIZE;
        var fz = wz + seededRandom(seed + 200, f, 2) * CHUNK_SIZE;
        var fh = terrainHeight(fx, fz);
        createFlower(group, fx, fh, fz, seed + 200 + f);
      }
    }

    // Grass clumps everywhere
    var grassDensity = (zone === 'gardens' || zone === 'wilds') ? 15 : (zone === 'arena' || zone === 'nexus') ? 3 : 8;
    for (var g = 0; g < grassDensity; g++) {
      var gx = wx + seededRandom(seed + 300, g, 1) * CHUNK_SIZE;
      var gz = wz + seededRandom(seed + 300, g, 2) * CHUNK_SIZE;
      var gh = terrainHeight(gx, gz);
      createGrassClump(group, gx, gh, gz, seed + 300 + g);
    }
  }

  // ========================================================================
  // DETAIL OBJECT CREATORS
  // ========================================================================

  function createTree(parent, x, y, z, seed, zone) {
    var treeGroup = new THREE.Group();
    var scale = 0.7 + seededRandom(seed, 0, 5) * 0.8;
    var treeType = seededRandom(seed, 0, 6);

    // Trunk
    var trunkH = 3 * scale + seededRandom(seed, 0, 7) * 2 * scale;
    var trunkR = 0.2 * scale + seededRandom(seed, 0, 8) * 0.15 * scale;
    var trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6);
    var trunkColor = zone === 'wilds' ? 0x4a3728 : 0x8B4513;
    var trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.95 });
    var trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = false;
    treeGroup.add(trunk);

    // Canopy
    if (treeType < 0.4) {
      // Round tree
      var canopyR = 2 * scale + seededRandom(seed, 0, 9) * 1.5 * scale;
      var canopyGeo = new THREE.SphereGeometry(canopyR, 8, 8);
      var canopyColor = zone === 'wilds' ? 0x1a5e1a : (zone === 'gardens' ? 0x4CAF50 : 0x2d8a2d);
      var canopyMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.85 });
      var canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = trunkH + canopyR * 0.6;
      canopy.castShadow = false;
      treeGroup.add(canopy);
    } else if (treeType < 0.7) {
      // Cone tree (pine)
      var pineH = 4 * scale;
      var pineR = 1.8 * scale;
      var pineGeo = new THREE.ConeGeometry(pineR, pineH, 8);
      var pineColor = zone === 'wilds' ? 0x0d4d0d : 0x1b7a1b;
      var pineMat = new THREE.MeshStandardMaterial({ color: pineColor, roughness: 0.85 });
      var pine = new THREE.Mesh(pineGeo, pineMat);
      pine.position.y = trunkH + pineH / 2 - 0.5;
      pine.castShadow = false;
      treeGroup.add(pine);
    } else {
      // Multi-sphere canopy
      for (var cs = 0; cs < 3; cs++) {
        var msr = 1.2 * scale + seededRandom(seed + cs, 0, 10) * 0.8 * scale;
        var msGeo = new THREE.SphereGeometry(msr, 6, 6);
        var msColor = 0x2d8a2d + Math.floor(seededRandom(seed + cs, 0, 11) * 0x202020);
        var msMat = new THREE.MeshStandardMaterial({ color: msColor, roughness: 0.85 });
        var msMesh = new THREE.Mesh(msGeo, msMat);
        var angle = cs * Math.PI * 2 / 3;
        msMesh.position.set(
          Math.cos(angle) * 0.8 * scale,
          trunkH + msr * 0.4 + cs * 0.5 * scale,
          Math.sin(angle) * 0.8 * scale
        );
        msMesh.castShadow = false;
        treeGroup.add(msMesh);
      }
    }

    treeGroup.position.set(x, y, z);
    treeGroup.rotation.y = seededRandom(seed, 0, 12) * Math.PI * 2;
    parent.add(treeGroup);

    // Register for animation (sway)
    animatedObjects.push({
      mesh: treeGroup,
      type: 'tree',
      params: { speed: 0.3 + seededRandom(seed, 0, 13) * 0.4, seed: seed * 0.01 }
    });
  }

  function createRock(parent, x, y, z, seed) {
    var scale = 0.3 + seededRandom(seed, 1, 1) * 1.2;
    var geo = new THREE.DodecahedronGeometry(scale, 0);
    var grey = 0.4 + seededRandom(seed, 1, 2) * 0.3;
    var col = new THREE.Color(grey, grey, grey * 0.95);
    var mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, flatShading: true });
    var rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, y + scale * 0.3, z);
    rock.rotation.set(
      seededRandom(seed, 1, 3) * Math.PI,
      seededRandom(seed, 1, 4) * Math.PI,
      seededRandom(seed, 1, 5) * Math.PI
    );
    rock.scale.set(
      0.7 + seededRandom(seed, 1, 6) * 0.6,
      0.5 + seededRandom(seed, 1, 7) * 0.5,
      0.7 + seededRandom(seed, 1, 8) * 0.6
    );
    rock.castShadow = false;
    parent.add(rock);
  }

  function createFlower(parent, x, y, z, seed) {
    var flowerGroup = new THREE.Group();
    // Stem
    var stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4);
    var stemMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
    var stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.2;
    stem.castShadow = false;
    flowerGroup.add(stem);
    // Petals
    var petalColors = [0xff4081, 0xffeb3b, 0xe040fb, 0xff5722, 0x29b6f6, 0xffffff];
    var petalColor = petalColors[Math.floor(seededRandom(seed, 2, 1) * petalColors.length)];
    var petalGeo = new THREE.SphereGeometry(0.12, 6, 6);
    var petalMat = new THREE.MeshStandardMaterial({ color: petalColor });
    var petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.y = 0.42;
    petal.castShadow = false;
    flowerGroup.add(petal);

    flowerGroup.position.set(x, y, z);
    parent.add(flowerGroup);
  }

  function createGrassClump(parent, x, y, z, seed) {
    var count = 3 + Math.floor(seededRandom(seed, 3, 1) * 4);
    var grassGroup = new THREE.Group();
    for (var i = 0; i < count; i++) {
      var bladeH = 0.3 + seededRandom(seed, 3, i + 2) * 0.5;
      var bladeGeo = new THREE.ConeGeometry(0.03, bladeH, 3);
      var green = 0.3 + seededRandom(seed, 3, i + 10) * 0.4;
      var bladeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.1, green, 0.05)
      });
      var blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(
        (seededRandom(seed, 3, i + 20) - 0.5) * 0.6,
        bladeH / 2,
        (seededRandom(seed, 3, i + 30) - 0.5) * 0.6
      );
      blade.rotation.set(
        (seededRandom(seed, 3, i + 40) - 0.5) * 0.3,
        seededRandom(seed, 3, i + 50) * Math.PI,
        (seededRandom(seed, 3, i + 60) - 0.5) * 0.3
      );
      blade.castShadow = false;
      grassGroup.add(blade);
    }
    grassGroup.position.set(x, y, z);
    parent.add(grassGroup);
  }

  // ========================================================================
  // ZONE STRUCTURES — Landmark buildings at each zone center
  // ========================================================================

  function createZoneStructures(scene) {
    createNexusStructure(scene);
    createGardensStructure(scene);
    createAtheneumStructure(scene);
    createStudioStructure(scene);
    createWildsStructure(scene);
    createAgoraStructure(scene);
    createCommonsStructure(scene);
    createArenaStructure(scene);
    createPortals(scene);
  }

  function createNexusStructure(scene) {
    var z = ZONES.nexus, y = z.baseHeight;
    // Central platform — large circular stone platform
    var platGeo = new THREE.CylinderGeometry(12, 14, 1.5, 32);
    var platMat = new THREE.MeshStandardMaterial({ color: 0xc0c0d0, roughness: 0.7 });
    var plat = new THREE.Mesh(platGeo, platMat);
    plat.position.set(z.cx, y + 0.75, z.cz);
    plat.castShadow = false;
    scene.add(plat);

    // Central crystal obelisk
    var obGeo = new THREE.CylinderGeometry(0.5, 1.5, 10, 6);
    var obMat = new THREE.MeshStandardMaterial({ color: 0x6666ff, emissive: 0x3333aa, emissiveIntensity: 0.4 });
    var obelisk = new THREE.Mesh(obGeo, obMat);
    obelisk.position.set(z.cx, y + 6.5, z.cz);
    obelisk.castShadow = false;
    scene.add(obelisk);
    animatedObjects.push({ mesh: obelisk, type: 'crystal', params: { speed: 0.3, baseY: y + 6.5 } });

    // 8 pillars in circle
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      var px = z.cx + Math.cos(angle) * 10;
      var pz = z.cz + Math.sin(angle) * 10;
      var pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 6, 8);
      var pillarMat = new THREE.MeshStandardMaterial({ color: 0xd0d0e0 });
      var pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, y + 3, pz);
      pillar.castShadow = false;
      scene.add(pillar);

      // Pillar cap
      var capGeo = new THREE.SphereGeometry(0.6, 8, 8);
      var capMat = new THREE.MeshStandardMaterial({ color: 0xe0e0f0 });
      var cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(px, y + 6.2, pz);
      cap.castShadow = false;
      scene.add(cap);
    }

    // Glowing pool around obelisk
    var poolGeo = new THREE.CylinderGeometry(4, 4, 0.3, 24);
    var poolMat = new THREE.MeshStandardMaterial({
      color: 0x4488ff, emissive: 0x2244aa, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.7
    });
    var pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(z.cx, y + 0.15, z.cz);
    pool.castShadow = false;
    scene.add(pool);
    animatedObjects.push({ mesh: pool, type: 'water', params: { speed: 1 } });
  }

  function createGardensStructure(scene) {
    var z = ZONES.gardens, y = z.baseHeight;
    // Garden beds in concentric circles
    for (var ring = 0; ring < 3; ring++) {
      var radius = 8 + ring * 8;
      var segments = 8 + ring * 4;
      for (var s = 0; s < segments; s++) {
        var angle = (s / segments) * Math.PI * 2;
        var bx = z.cx + Math.cos(angle) * radius;
        var bz = z.cz + Math.sin(angle) * radius;
        // Raised bed
        var bedGeo = new THREE.BoxGeometry(3, 0.6, 3);
        var bedMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        var bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(bx, y + 0.3, bz);
        bed.rotation.y = angle;
        bed.castShadow = false;
        scene.add(bed);
        // Plants on bed
        var plantGeo = new THREE.SphereGeometry(0.8, 6, 6);
        var plantColors = [0x4caf50, 0x66bb6a, 0x81c784, 0xa5d6a7];
        var plantMat = new THREE.MeshStandardMaterial({
          color: plantColors[s % plantColors.length]
        });
        var plant = new THREE.Mesh(plantGeo, plantMat);
        plant.position.set(bx, y + 1.0, bz);
        plant.castShadow = false;
        scene.add(plant);
      }
    }

    // Central fountain
    var fountainGeo = new THREE.CylinderGeometry(3, 3.5, 1.5, 16);
    var fountainMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
    var fountain = new THREE.Mesh(fountainGeo, fountainMat);
    fountain.position.set(z.cx, y + 0.75, z.cz);
    fountain.castShadow = false;
    scene.add(fountain);

    var waterGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.3, 16);
    var waterMat = new THREE.MeshStandardMaterial({
      color: 0x4488cc, transparent: true, opacity: 0.6
    });
    var water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(z.cx, y + 1.5, z.cz);
    water.castShadow = false;
    scene.add(water);
    animatedObjects.push({ mesh: water, type: 'water', params: { speed: 1 } });
  }

  function createAtheneumStructure(scene) {
    var z = ZONES.athenaeum, y = z.baseHeight;
    // Grand library building
    var baseGeo = new THREE.BoxGeometry(20, 6, 14);
    var baseMat = new THREE.MeshStandardMaterial({ color: 0xdbd8d0 });
    var base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(z.cx, y + 3, z.cz);
    base.castShadow = false;
    scene.add(base);

    // Roof
    var roofGeo = new THREE.ConeGeometry(14, 4, 4);
    var roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    var roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(z.cx, y + 8, z.cz);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = false;
    scene.add(roof);

    // Front columns
    for (var c = 0; c < 6; c++) {
      var colX = z.cx - 8 + c * 3.2;
      var colGeo = new THREE.CylinderGeometry(0.4, 0.5, 6, 8);
      var colMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc });
      var col = new THREE.Mesh(colGeo, colMat);
      col.position.set(colX, y + 3, z.cz + 8);
      col.castShadow = false;
      scene.add(col);
    }

    // Steps
    for (var st = 0; st < 4; st++) {
      var stepGeo = new THREE.BoxGeometry(18 + st * 2, 0.4, 2);
      var stepMat = new THREE.MeshStandardMaterial({ color: 0xccc8c0 });
      var step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(z.cx, y + 0.2 + st * 0.4, z.cz + 9 + st * 1.5);
      step.castShadow = false;
      scene.add(step);
    }
  }

  function createStudioStructure(scene) {
    var z = ZONES.studio, y = z.baseHeight;
    // Creative workshop buildings
    for (var i = 0; i < 5; i++) {
      var angle = (i / 5) * Math.PI * 2 + 0.3;
      var bx = z.cx + Math.cos(angle) * 14;
      var bz = z.cz + Math.sin(angle) * 14;

      var buildGeo = new THREE.BoxGeometry(6, 5, 6);
      var buildColors = [0xff9800, 0xffc107, 0xff5722, 0x8bc34a, 0x03a9f4];
      var buildMat = new THREE.MeshStandardMaterial({ color: buildColors[i] });
      var build = new THREE.Mesh(buildGeo, buildMat);
      build.position.set(bx, y + 2.5, bz);
      build.rotation.y = angle + Math.PI;
      build.castShadow = false;
      scene.add(build);

      // Roof
      var sRoofGeo = new THREE.ConeGeometry(4.5, 3, 4);
      var sRoofMat = new THREE.MeshStandardMaterial({ color: 0x795548 });
      var sRoof = new THREE.Mesh(sRoofGeo, sRoofMat);
      sRoof.position.set(bx, y + 6.5, bz);
      sRoof.rotation.y = Math.PI / 4;
      sRoof.castShadow = false;
      scene.add(sRoof);
    }

    // Central sculpture (rotating)
    var sculpGeo = new THREE.OctahedronGeometry(2, 0);
    var sculpMat = new THREE.MeshStandardMaterial({
      color: 0xff6f00, emissive: 0x442200, emissiveIntensity: 0.3
    });
    var sculpture = new THREE.Mesh(sculpGeo, sculpMat);
    sculpture.position.set(z.cx, y + 4, z.cz);
    sculpture.castShadow = false;
    scene.add(sculpture);
    animatedObjects.push({ mesh: sculpture, type: 'crystal', params: { speed: 0.5, baseY: y + 4 } });
  }

  function createWildsStructure(scene) {
    var z = ZONES.wilds, y = z.baseHeight;
    // Ancient stone circle
    for (var i = 0; i < 12; i++) {
      var angle = (i / 12) * Math.PI * 2;
      var sx = z.cx + Math.cos(angle) * 16;
      var sz = z.cz + Math.sin(angle) * 16;
      var stoneH = 3 + seededRandom(i, 5, 1) * 3;
      var stoneGeo = new THREE.BoxGeometry(1.5, stoneH, 0.8);
      var stoneMat = new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.95 });
      var stone = new THREE.Mesh(stoneGeo, stoneMat);
      var sh = terrainHeight(sx, sz);
      stone.position.set(sx, sh + stoneH / 2, sz);
      stone.rotation.y = angle;
      stone.rotation.z = (seededRandom(i, 5, 2) - 0.5) * 0.15;
      stone.castShadow = false;
      scene.add(stone);
    }

    // Moss-covered altar at center
    var altarGeo = new THREE.BoxGeometry(4, 1.5, 4);
    var altarMat = new THREE.MeshStandardMaterial({ color: 0x3e6b3e, roughness: 0.95 });
    var altar = new THREE.Mesh(altarGeo, altarMat);
    altar.position.set(z.cx, y + 0.75, z.cz);
    altar.castShadow = false;
    scene.add(altar);

    // Glowing rune on altar
    var runeGeo = new THREE.RingGeometry(0.5, 1.5, 6);
    var runeMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5,
      side: THREE.DoubleSide
    });
    var rune = new THREE.Mesh(runeGeo, runeMat);
    rune.position.set(z.cx, y + 1.55, z.cz);
    rune.rotation.x = -Math.PI / 2;
    rune.castShadow = false;
    scene.add(rune);
    animatedObjects.push({ mesh: rune, type: 'crystal', params: { speed: 0.2, baseY: y + 1.55 } });
  }

  function createAgoraStructure(scene) {
    var z = ZONES.agora, y = z.baseHeight;
    // Market stalls in rows
    for (var i = 0; i < 8; i++) {
      var sx = z.cx + (i % 4 - 1.5) * 8;
      var sz = z.cz + Math.floor(i / 4) * 14 - 7;
      // Tent top
      var tentGeo = new THREE.ConeGeometry(3, 4, 4);
      var tentColors = [0xdc143c, 0xff8c00, 0x4169e1, 0x2e8b57, 0x9400d3, 0xdaa520, 0x008b8b, 0xcd853f];
      var tentMat = new THREE.MeshStandardMaterial({ color: tentColors[i] });
      var tent = new THREE.Mesh(tentGeo, tentMat);
      tent.position.set(sx, y + 5, sz);
      tent.castShadow = false;
      scene.add(tent);
      // Counter
      var counterGeo = new THREE.BoxGeometry(4, 1, 2);
      var counterMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      var counter = new THREE.Mesh(counterGeo, counterMat);
      counter.position.set(sx, y + 0.5, sz + 2.5);
      counter.castShadow = false;
      scene.add(counter);
      // Support poles
      for (var p = -1; p <= 1; p += 2) {
        var poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 6);
        var poleMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
        var pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(sx + p * 2.5, y + 2.5, sz);
        pole.castShadow = false;
        scene.add(pole);
      }
    }

    // Crates
    for (var c = 0; c < 10; c++) {
      var crx = z.cx + (seededRandom(100, c, 1) - 0.5) * 25;
      var crz = z.cz + (seededRandom(100, c, 2) - 0.5) * 25;
      var crateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      var crateMat = new THREE.MeshStandardMaterial({ color: 0xd2691e });
      var crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(crx, y + 0.6, crz);
      crate.rotation.y = seededRandom(100, c, 3) * Math.PI;
      crate.castShadow = false;
      scene.add(crate);
    }
  }

  function createCommonsStructure(scene) {
    var z = ZONES.commons, y = z.baseHeight;
    // Small houses in circle
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      var hx = z.cx + Math.cos(angle) * 18;
      var hz = z.cz + Math.sin(angle) * 18;
      // House body
      var houseGeo = new THREE.BoxGeometry(5, 4, 5);
      var houseColors = [0xfaf0e6, 0xf5deb3, 0xffefd5, 0xffe4c4, 0xffdab9, 0xeee8aa, 0xfafad2, 0xfff8dc];
      var houseMat = new THREE.MeshStandardMaterial({ color: houseColors[i] });
      var house = new THREE.Mesh(houseGeo, houseMat);
      house.position.set(hx, y + 2, hz);
      house.rotation.y = angle + Math.PI;
      house.castShadow = false;
      scene.add(house);
      // Roof
      var roofGeo = new THREE.ConeGeometry(4, 2.5, 4);
      var roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      var roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.set(hx, y + 5.25, hz);
      roofMesh.rotation.y = Math.PI / 4;
      roofMesh.castShadow = false;
      scene.add(roofMesh);
      // Door
      var doorGeo = new THREE.BoxGeometry(1, 2.5, 0.1);
      var doorMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      var door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(hx + Math.cos(angle + Math.PI) * 2.55, y + 1.25, hz + Math.sin(angle + Math.PI) * 2.55);
      door.rotation.y = angle + Math.PI;
      door.castShadow = false;
      scene.add(door);
    }

    // Central well
    var wellGeo = new THREE.CylinderGeometry(1.5, 1.5, 2, 12);
    var wellMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
    var well = new THREE.Mesh(wellGeo, wellMat);
    well.position.set(z.cx, y + 1, z.cz);
    well.castShadow = false;
    scene.add(well);

    // Well roof
    var wellRoofGeo = new THREE.ConeGeometry(2.2, 2, 6);
    var wellRoofMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
    var wellRoof = new THREE.Mesh(wellRoofGeo, wellRoofMat);
    wellRoof.position.set(z.cx, y + 3.5, z.cz);
    wellRoof.castShadow = false;
    scene.add(wellRoof);

    // Well supports
    for (var ws = 0; ws < 4; ws++) {
      var wa = (ws / 4) * Math.PI * 2;
      var wpGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 4);
      var wpMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      var wp = new THREE.Mesh(wpGeo, wpMat);
      wp.position.set(z.cx + Math.cos(wa) * 1.2, y + 2.25, z.cz + Math.sin(wa) * 1.2);
      wp.castShadow = false;
      scene.add(wp);
    }
  }

  function createArenaStructure(scene) {
    var z = ZONES.arena, y = z.baseHeight;
    // Tiered seating (colosseum-style)
    for (var tier = 0; tier < 4; tier++) {
      var radius = 18 + tier * 6;
      var height = 1.5 + tier * 2;
      var segments = 20 + tier * 4;
      for (var s = 0; s < segments; s++) {
        var a1 = (s / segments) * Math.PI * 2;
        var sx = z.cx + Math.cos(a1) * radius;
        var sz = z.cz + Math.sin(a1) * radius;
        var seatGeo = new THREE.BoxGeometry(3, 1.5, 2.5);
        var seatMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c });
        var seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(sx, y + height, sz);
        seat.rotation.y = a1;
        seat.castShadow = false;
        scene.add(seat);
      }
    }

    // Central arena floor
    var arenaFloorGeo = new THREE.CylinderGeometry(16, 16, 0.5, 32);
    var arenaFloorMat = new THREE.MeshStandardMaterial({ color: 0xe0c097 });
    var arenaFloor = new THREE.Mesh(arenaFloorGeo, arenaFloorMat);
    arenaFloor.position.set(z.cx, y + 0.25, z.cz);
    arenaFloor.castShadow = false;
    scene.add(arenaFloor);

    // Entrance arches
    for (var ea = 0; ea < 4; ea++) {
      var eAngle = (ea / 4) * Math.PI * 2;
      var ex = z.cx + Math.cos(eAngle) * 16;
      var ez = z.cz + Math.sin(eAngle) * 16;
      // Two pillars
      for (var side = -1; side <= 1; side += 2) {
        var epGeo = new THREE.CylinderGeometry(0.6, 0.7, 7, 8);
        var epMat = new THREE.MeshStandardMaterial({ color: 0xc8a882 });
        var ep = new THREE.Mesh(epGeo, epMat);
        var perpAngle = eAngle + Math.PI / 2;
        ep.position.set(ex + Math.cos(perpAngle) * side * 2.5, y + 3.5, ez + Math.sin(perpAngle) * side * 2.5);
        ep.castShadow = false;
        scene.add(ep);
      }
      // Arch top
      var archGeo = new THREE.BoxGeometry(6, 1, 1.5);
      var archMat = new THREE.MeshStandardMaterial({ color: 0xc8a882 });
      var arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(ex, y + 7.5, ez);
      arch.rotation.y = eAngle;
      arch.castShadow = false;
      scene.add(arch);
    }

    // Torches around arena
    for (var ti = 0; ti < 12; ti++) {
      var tAngle = (ti / 12) * Math.PI * 2;
      var tpx = z.cx + Math.cos(tAngle) * 20;
      var tpz = z.cz + Math.sin(tAngle) * 20;
      addTorch(scene, tpx, y, tpz);
    }
  }

  function addTorch(scene, x, baseY, z) {
    var poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.5, 6);
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    var pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, baseY + 1.25, z);
    pole.castShadow = false;
    scene.add(pole);

    var flameGeo = new THREE.SphereGeometry(0.25, 8, 8);
    var flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1
    });
    var flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(x, baseY + 2.7, z);
    flame.castShadow = false;
    scene.add(flame);

    var light = new THREE.PointLight(0xffa500, 0.8, 12);
    light.position.set(x, baseY + 2.7, z);
    scene.add(light);

    animatedObjects.push({
      mesh: flame, type: 'torch',
      params: { seed: x * 100 + z, light: light }
    });
  }

  function createPortals(scene) {
    // Place portals between zones — at zone edges toward nexus
    for (var zId in ZONES) {
      if (zId === 'nexus') continue;
      var zone = ZONES[zId];
      // Portal sits on the edge of the zone facing nexus
      var dx = ZONES.nexus.cx - zone.cx;
      var dz = ZONES.nexus.cz - zone.cz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      var nx = dx / dist, nz = dz / dist;
      var portalX = zone.cx + nx * zone.radius * 0.7;
      var portalZ = zone.cz + nz * zone.radius * 0.7;
      var portalY = terrainHeight(portalX, portalZ);
      addPortalMesh(scene, portalX, portalY, portalZ, zId);
    }
  }

  function addPortalMesh(scene, x, y, z, targetZone) {
    // Portal archway
    var archGeo = new THREE.TorusGeometry(2.5, 0.25, 12, 24);
    var archMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff, emissive: 0x008888, emissiveIntensity: 0.6
    });
    var arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(x, y + 3, z);
    arch.castShadow = false;
    scene.add(arch);

    // Inner glow
    var innerGeo = new THREE.CircleGeometry(2.2, 16);
    var innerMat = new THREE.MeshStandardMaterial({
      color: 0x66ffff, emissive: 0x44cccc, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.4, side: THREE.DoubleSide
    });
    var inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(x, y + 3, z);
    inner.castShadow = false;
    scene.add(inner);

    // Portal light
    var portalLight = new THREE.PointLight(0x00ffff, 0.6, 15);
    portalLight.position.set(x, y + 3, z);
    scene.add(portalLight);

    animatedObjects.push({
      mesh: arch, type: 'portal',
      params: { speed: 0.8, inner: inner }
    });

    arch.userData.targetZone = targetZone;
  }

  // ========================================================================
  // SKY AND ATMOSPHERE
  // ========================================================================

  function createSky(scene) {
    var skyGeo = new THREE.SphereGeometry(800, 32, 32);
    var skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide, fog: false });
    skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Sun
    var sunGeo = new THREE.SphereGeometry(12, 16, 16);
    var sunMat = new THREE.MeshBasicMaterial({ color: 0xfff8e7, fog: false });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);

    // Moon
    var moonGeo = new THREE.SphereGeometry(8, 16, 16);
    var moonMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0, fog: false });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    // Stars
    var starGeo = new THREE.BufferGeometry();
    var starPos = [];
    for (var i = 0; i < 1200; i++) {
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.random() * Math.PI;
      var r = 700;
      starPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, fog: false });
    stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Clouds
    for (var c = 0; c < 30; c++) {
      var cloudGroup = new THREE.Group();
      var numPuffs = 2 + Math.floor(Math.random() * 4);
      for (var p = 0; p < numPuffs; p++) {
        var puffGeo = new THREE.SphereGeometry(8 + Math.random() * 12, 6, 6);
        var puffMat = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.35, fog: false
        });
        var puff = new THREE.Mesh(puffGeo, puffMat);
        puff.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 15);
        puff.scale.y = 0.4;
        cloudGroup.add(puff);
      }
      cloudGroup.position.set(
        (Math.random() - 0.5) * 1200,
        180 + Math.random() * 60,
        (Math.random() - 0.5) * 1200
      );
      cloudGroup.userData.driftSpeed = 0.3 + Math.random() * 0.5;
      cloudGroup.userData.driftAngle = Math.random() * Math.PI * 2;
      clouds.push(cloudGroup);
      scene.add(cloudGroup);
    }

    // Fog
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0012);
  }

  // ========================================================================
  // PLAYER MODELS
  // ========================================================================

  function createHumanoidModel(color) {
    var player = new THREE.Group();

    // Head - SphereGeometry, skin-toned
    var headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    var headMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5;
    head.castShadow = false;
    player.add(head);

    // Torso - BoxGeometry, colored shirt
    var torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
    var torsoMat = new THREE.MeshLambertMaterial({ color: color || 0x4169e1 });
    var torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.9;
    torso.castShadow = false;
    player.add(torso);

    // Arms - CylinderGeometry, attached at shoulders
    var armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    var armMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });

    var leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, 1.05, 0);
    leftArm.castShadow = false;
    player.add(leftArm);

    var rightArm = new THREE.Mesh(armGeo, armMat.clone());
    rightArm.position.set(0.35, 1.05, 0);
    rightArm.castShadow = false;
    player.add(rightArm);

    // Legs - CylinderGeometry, attached at hips
    var legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    var legMat = new THREE.MeshLambertMaterial({ color: 0x2f4f4f });

    var leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.35, 0);
    leftLeg.castShadow = false;
    player.add(leftLeg);

    var rightLeg = new THREE.Mesh(legGeo, legMat.clone());
    rightLeg.position.set(0.15, 0.35, 0);
    rightLeg.castShadow = false;
    player.add(rightLeg);

    // Feet - Small BoxGeometry at bottom of legs
    var footGeo = new THREE.BoxGeometry(0.15, 0.1, 0.25);
    var footMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

    var leftFoot = new THREE.Mesh(footGeo, footMat);
    leftFoot.position.set(-0.15, 0.05, 0.05);
    leftFoot.castShadow = false;
    player.add(leftFoot);

    var rightFoot = new THREE.Mesh(footGeo, footMat.clone());
    rightFoot.position.set(0.15, 0.05, 0.05);
    rightFoot.castShadow = false;
    player.add(rightFoot);

    // Store references to limbs in userData for animation
    player.userData.limbs = {
      head: head,
      torso: torso,
      leftArm: leftArm,
      rightArm: rightArm,
      leftLeg: leftLeg,
      rightLeg: rightLeg,
      leftFoot: leftFoot,
      rightFoot: rightFoot
    };

    // Animation state tracking
    player.userData.animTime = 0;
    player.userData.prevPosition = new THREE.Vector3();
    player.userData.animState = 'idle'; // 'idle', 'walk', 'run'

    return player;
  }

  // ========================================================================
  // ENVIRONMENT POPULATION — Trees, rocks, benches, lanterns
  // ========================================================================

  function populateEnvironment(scene) {
    var Models = typeof window !== 'undefined' ? window.Models : null;
    if (!Models) {
      console.log('Models module not loaded, skipping environment population');
      return;
    }

    // ---- Gardens: trees, flowers, benches along paths ----
    var gz = ZONES.gardens;
    var gardenTreeTypes = ['oak', 'willow', 'cherry', 'cherry'];
    for (var gt = 0; gt < 20; gt++) {
      var ga = hash2D(gt, 100) * Math.PI * 2;
      var gr = 15 + hash2D(gt, 101) * 55;
      var gx = gz.cx + Math.cos(ga) * gr;
      var gzz = gz.cz + Math.sin(ga) * gr;
      var gy = terrainHeight(gx, gzz);
      var treeType = gardenTreeTypes[gt % gardenTreeTypes.length];
      var tree = Models.createTree(treeType, 0.8 + hash2D(gt, 102) * 0.6);
      tree.position.set(gx, gy, gzz);
      tree.rotation.y = hash2D(gt, 103) * Math.PI * 2;
      scene.add(tree);
      animatedObjects.push({ mesh: tree, type: 'tree', params: { speed: 0.3 + hash2D(gt, 104) * 0.3 } });
    }
    // Benches in gardens
    for (var gb = 0; gb < 6; gb++) {
      var ba = (gb / 6) * Math.PI * 2 + 0.5;
      var bx = gz.cx + Math.cos(ba) * 25;
      var bz = gz.cz + Math.sin(ba) * 25;
      var by = terrainHeight(bx, bz);
      var bench = Models.createFurniture('bench');
      bench.position.set(bx, by, bz);
      bench.rotation.y = ba + Math.PI / 2;
      scene.add(bench);
    }
    // Lanterns along garden paths
    for (var gl = 0; gl < 10; gl++) {
      var la = (gl / 10) * Math.PI * 2;
      var lx = gz.cx + Math.cos(la) * 35;
      var lz = gz.cz + Math.sin(la) * 35;
      var ly = terrainHeight(lx, lz);
      var lantern = Models.createFurniture('lantern');
      lantern.position.set(lx, ly, lz);
      scene.add(lantern);
    }

    // ---- Wilds: dense forest, boulders, dead trees ----
    var wz = ZONES.wilds;
    var wildTreeTypes = ['oak', 'pine', 'pine', 'dead', 'oak'];
    for (var wt = 0; wt < 40; wt++) {
      var wa = hash2D(wt, 200) * Math.PI * 2;
      var wr = 10 + hash2D(wt, 201) * 70;
      var wx = wz.cx + Math.cos(wa) * wr;
      var wz2 = wz.cz + Math.sin(wa) * wr;
      var wy = terrainHeight(wx, wz2);
      var wildType = wildTreeTypes[wt % wildTreeTypes.length];
      var wtree = Models.createTree(wildType, 0.7 + hash2D(wt, 202) * 0.8);
      wtree.position.set(wx, wy, wz2);
      wtree.rotation.y = hash2D(wt, 203) * Math.PI * 2;
      scene.add(wtree);
      animatedObjects.push({ mesh: wtree, type: 'tree', params: { speed: 0.2 + hash2D(wt, 204) * 0.4 } });
    }
    // Boulders and crystal rocks in wilds
    for (var wb = 0; wb < 15; wb++) {
      var rba = hash2D(wb, 210) * Math.PI * 2;
      var rbr = 8 + hash2D(wb, 211) * 60;
      var rbx = wz.cx + Math.cos(rba) * rbr;
      var rbz = wz.cz + Math.sin(rba) * rbr;
      var rby = terrainHeight(rbx, rbz);
      var rockType = (wb % 5 === 0) ? 'crystal' : 'boulder';
      var rock = Models.createRock(rockType, 0.5 + hash2D(wb, 212) * 1.5);
      rock.position.set(rbx, rby, rbz);
      rock.rotation.y = hash2D(wb, 213) * Math.PI * 2;
      scene.add(rock);
    }

    // ---- Nexus: ornamental trees, benches, lanterns ----
    var nz = ZONES.nexus;
    for (var nt = 0; nt < 8; nt++) {
      var na = (nt / 8) * Math.PI * 2 + Math.PI / 8;
      var nx = nz.cx + Math.cos(na) * 25;
      var nzz = nz.cz + Math.sin(na) * 25;
      var ny = terrainHeight(nx, nzz);
      var ntree = Models.createTree('cherry', 0.7);
      ntree.position.set(nx, ny, nzz);
      scene.add(ntree);
      animatedObjects.push({ mesh: ntree, type: 'tree', params: { speed: 0.3 } });
    }
    // Stone benches around nexus
    for (var nb = 0; nb < 8; nb++) {
      var nba = (nb / 8) * Math.PI * 2;
      var nbx = nz.cx + Math.cos(nba) * 18;
      var nbz = nz.cz + Math.sin(nba) * 18;
      var nby = terrainHeight(nbx, nbz);
      var nbench = Models.createFurniture('bench');
      nbench.position.set(nbx, nby, nbz);
      nbench.rotation.y = nba + Math.PI / 2;
      scene.add(nbench);
    }

    // ---- Agora: market crates, lanterns along paths ----
    var az = ZONES.agora;
    for (var al = 0; al < 12; al++) {
      var ala = (al / 12) * Math.PI * 2;
      var alx = az.cx + Math.cos(ala) * 22;
      var alz = az.cz + Math.sin(ala) * 22;
      var aly = terrainHeight(alx, alz);
      var alantern = Models.createFurniture('lantern');
      alantern.position.set(alx, aly, alz);
      scene.add(alantern);
    }

    // ---- Commons: trees around village, fences ----
    var cz = ZONES.commons;
    for (var ct = 0; ct < 12; ct++) {
      var ca = hash2D(ct, 300) * Math.PI * 2;
      var cr = 25 + hash2D(ct, 301) * 25;
      var cx = cz.cx + Math.cos(ca) * cr;
      var czz = cz.cz + Math.sin(ca) * cr;
      var cy = terrainHeight(cx, czz);
      var ctree = Models.createTree('oak', 0.6 + hash2D(ct, 302) * 0.5);
      ctree.position.set(cx, cy, czz);
      ctree.rotation.y = hash2D(ct, 303) * Math.PI * 2;
      scene.add(ctree);
      animatedObjects.push({ mesh: ctree, type: 'tree', params: { speed: 0.3 } });
    }

    // ---- Studio: artistic rocks, small trees ----
    var sz = ZONES.studio;
    for (var st = 0; st < 8; st++) {
      var sa = hash2D(st, 400) * Math.PI * 2;
      var sr = 20 + hash2D(st, 401) * 30;
      var sx = sz.cx + Math.cos(sa) * sr;
      var szz = sz.cz + Math.sin(sa) * sr;
      var sy = terrainHeight(sx, szz);
      var srock = Models.createRock('crystal', 0.8 + hash2D(st, 402) * 0.8);
      srock.position.set(sx, sy, szz);
      scene.add(srock);
    }

    // ---- Athenaeum: ordered trees, benches ----
    var atz = ZONES.athenaeum;
    for (var at = 0; at < 10; at++) {
      var ata = hash2D(at, 500) * Math.PI * 2;
      var atr = 20 + hash2D(at, 501) * 35;
      var atx = atz.cx + Math.cos(ata) * atr;
      var atzz = atz.cz + Math.sin(ata) * atr;
      var aty = terrainHeight(atx, atzz);
      var attree = Models.createTree('pine', 0.7 + hash2D(at, 502) * 0.4);
      attree.position.set(atx, aty, atzz);
      scene.add(attree);
      animatedObjects.push({ mesh: attree, type: 'tree', params: { speed: 0.25 } });
    }

    // ---- Arena: sparse vegetation ----
    var arz = ZONES.arena;
    for (var ar = 0; ar < 6; ar++) {
      var ara = hash2D(ar, 600) * Math.PI * 2;
      var arr = 30 + hash2D(ar, 601) * 15;
      var arx = arz.cx + Math.cos(ara) * arr;
      var arzz = arz.cz + Math.sin(ara) * arr;
      var ary = terrainHeight(arx, arzz);
      var arrock = Models.createRock('boulder', 0.6 + hash2D(ar, 602) * 1.0);
      arrock.position.set(arx, ary, arzz);
      arrock.rotation.y = hash2D(ar, 603) * Math.PI;
      scene.add(arrock);
    }

    // ---- Butterflies and birds scattered around gardens and wilds ----
    if (Models.createCreature) {
      for (var bf = 0; bf < 8; bf++) {
        var bfa = hash2D(bf, 700) * Math.PI * 2;
        var bfr = 10 + hash2D(bf, 701) * 50;
        var bfx = gz.cx + Math.cos(bfa) * bfr;
        var bfz = gz.cz + Math.sin(bfa) * bfr;
        var bfy = terrainHeight(bfx, bfz) + 1.5 + hash2D(bf, 702) * 2;
        var butterfly = Models.createCreature('butterfly');
        butterfly.position.set(bfx, bfy, bfz);
        scene.add(butterfly);
        animatedObjects.push({ mesh: butterfly, type: 'creature', params: { speed: 1 + hash2D(bf, 703) } });
      }
      for (var bi = 0; bi < 6; bi++) {
        var bia = hash2D(bi, 710) * Math.PI * 2;
        var bir = 10 + hash2D(bi, 711) * 60;
        var bix = wz.cx + Math.cos(bia) * bir;
        var biz = wz.cz + Math.sin(bia) * bir;
        var biy = terrainHeight(bix, biz) + 5 + hash2D(bi, 712) * 5;
        var bird = Models.createCreature('bird');
        bird.position.set(bix, biy, biz);
        scene.add(bird);
        animatedObjects.push({ mesh: bird, type: 'creature', params: { speed: 0.5 + hash2D(bi, 713) * 0.5 } });
      }
    }

    // ---- LANDMARKS: unique structures per zone ----
    if (Models.createLandmark) {
      // Nexus: fountain (center), 4 obelisks (compass points), 2 signposts
      var fountain = Models.createLandmark('fountain', 1.2);
      fountain.position.set(nz.cx, terrainHeight(nz.cx, nz.cz), nz.cz);
      scene.add(fountain);
      animatedObjects.push({ mesh: fountain, type: 'landmark', params: {} });

      for (var no = 0; no < 4; no++) {
        var noa = (no / 4) * Math.PI * 2;
        var nox = nz.cx + Math.cos(noa) * 35;
        var noz = nz.cz + Math.sin(noa) * 35;
        var obelisk = Models.createLandmark('obelisk', 1.0);
        obelisk.position.set(nox, terrainHeight(nox, noz), noz);
        scene.add(obelisk);
        animatedObjects.push({ mesh: obelisk, type: 'landmark', params: {} });
      }

      for (var ns = 0; ns < 2; ns++) {
        var nsa = (ns / 2) * Math.PI * 2 + Math.PI / 4;
        var nsx = nz.cx + Math.cos(nsa) * 28;
        var nsz = nz.cz + Math.sin(nsa) * 28;
        var signpost = Models.createLandmark('signpost', 1.0);
        signpost.position.set(nsx, terrainHeight(nsx, nsz), nsz);
        signpost.rotation.y = nsa;
        scene.add(signpost);
      }

      // Gardens: gazebo (center-ish), 4 campfires along paths, 6 flower beds, 4 herb patches
      var gazebo = Models.createLandmark('gazebo', 1.0);
      gazebo.position.set(gz.cx + 10, terrainHeight(gz.cx + 10, gz.cz + 10), gz.cz + 10);
      scene.add(gazebo);

      for (var gc = 0; gc < 4; gc++) {
        var gca = (gc / 4) * Math.PI * 2 + Math.PI / 8;
        var gcx = gz.cx + Math.cos(gca) * 40;
        var gcz = gz.cz + Math.sin(gca) * 40;
        var campfire = Models.createLandmark('campfire', 1.0);
        campfire.position.set(gcx, terrainHeight(gcx, gcz), gcz);
        scene.add(campfire);
        animatedObjects.push({ mesh: campfire, type: 'landmark', params: {} });
      }

      for (var gf = 0; gf < 6; gf++) {
        var gfa = hash2D(gf, 720) * Math.PI * 2;
        var gfr = 20 + hash2D(gf, 721) * 35;
        var gfx = gz.cx + Math.cos(gfa) * gfr;
        var gfz = gz.cz + Math.sin(gfa) * gfr;
        var flowerBed = Models.createResourceNode('flower_bed', 1.0);
        flowerBed.position.set(gfx, terrainHeight(gfx, gfz), gfz);
        flowerBed.rotation.y = hash2D(gf, 722) * Math.PI * 2;
        scene.add(flowerBed);
      }

      for (var gh = 0; gh < 4; gh++) {
        var gha = hash2D(gh, 730) * Math.PI * 2;
        var ghr = 25 + hash2D(gh, 731) * 30;
        var ghx = gz.cx + Math.cos(gha) * ghr;
        var ghz = gz.cz + Math.sin(gha) * ghr;
        var herbPatch = Models.createResourceNode('herb_patch', 1.0);
        herbPatch.position.set(ghx, terrainHeight(ghx, ghz), ghz);
        herbPatch.rotation.y = hash2D(gh, 732) * Math.PI * 2;
        scene.add(herbPatch);
      }

      // Wilds: 2 campfires (explorer camps), 3 signposts, 8 ore veins, 4 wood piles
      for (var wc = 0; wc < 2; wc++) {
        var wca = hash2D(wc, 740) * Math.PI * 2;
        var wcr = 30 + hash2D(wc, 741) * 25;
        var wcx = wz.cx + Math.cos(wca) * wcr;
        var wcz = wz.cz + Math.sin(wca) * wcr;
        var wcampfire = Models.createLandmark('campfire', 1.0);
        wcampfire.position.set(wcx, terrainHeight(wcx, wcz), wcz);
        scene.add(wcampfire);
        animatedObjects.push({ mesh: wcampfire, type: 'landmark', params: {} });
      }

      for (var ws = 0; ws < 3; ws++) {
        var wsa = hash2D(ws, 750) * Math.PI * 2;
        var wsr = 35 + hash2D(ws, 751) * 30;
        var wsx = wz.cx + Math.cos(wsa) * wsr;
        var wsz = wz.cz + Math.sin(wsa) * wsr;
        var wsignpost = Models.createLandmark('signpost', 1.0);
        wsignpost.position.set(wsx, terrainHeight(wsx, wsz), wsz);
        wsignpost.rotation.y = wsa;
        scene.add(wsignpost);
      }

      for (var wo = 0; wo < 8; wo++) {
        var woa = hash2D(wo, 760) * Math.PI * 2;
        var wor = 15 + hash2D(wo, 761) * 50;
        var wox = wz.cx + Math.cos(woa) * wor;
        var woz = wz.cz + Math.sin(woa) * wor;
        var oreVein = Models.createResourceNode('ore_vein', 0.8 + hash2D(wo, 762) * 0.5);
        oreVein.position.set(wox, terrainHeight(wox, woz), woz);
        oreVein.rotation.y = hash2D(wo, 763) * Math.PI * 2;
        scene.add(oreVein);
      }

      for (var ww = 0; ww < 4; ww++) {
        var wwa = hash2D(ww, 770) * Math.PI * 2;
        var wwr = 20 + hash2D(ww, 771) * 40;
        var wwx = wz.cx + Math.cos(wwa) * wwr;
        var wwz = wz.cz + Math.sin(wwa) * wwr;
        var woodPile = Models.createResourceNode('wood_pile', 1.0);
        woodPile.position.set(wwx, terrainHeight(wwx, wwz), wwz);
        woodPile.rotation.y = hash2D(ww, 772) * Math.PI * 2;
        scene.add(woodPile);
      }

      // Athenaeum: 2 statues (flanking entrance), 4 obelisks (mystical markers)
      for (var ats = 0; ats < 2; ats++) {
        var atsa = (ats / 2) * Math.PI * 2;
        var atsx = atz.cx + Math.cos(atsa) * 25;
        var atsz = atz.cz + Math.sin(atsa) * 25;
        var statue = Models.createLandmark('statue', 1.1);
        statue.position.set(atsx, terrainHeight(atsx, atsz), atsz);
        statue.rotation.y = atsa + Math.PI;
        scene.add(statue);
      }

      for (var ato = 0; ato < 4; ato++) {
        var atoa = (ato / 4) * Math.PI * 2 + Math.PI / 8;
        var atox = atz.cx + Math.cos(atoa) * 35;
        var atoz = atz.cz + Math.sin(atoa) * 35;
        var atobelisk = Models.createLandmark('obelisk', 0.9);
        atobelisk.position.set(atox, terrainHeight(atox, atoz), atoz);
        scene.add(atobelisk);
        animatedObjects.push({ mesh: atobelisk, type: 'landmark', params: {} });
      }

      // Studio: 3 crystal clusters (inspiration points), 1 gazebo
      for (var sc = 0; sc < 3; sc++) {
        var sca = hash2D(sc, 780) * Math.PI * 2;
        var scr = 25 + hash2D(sc, 781) * 20;
        var scx = sz.cx + Math.cos(sca) * scr;
        var scz = sz.cz + Math.sin(sca) * scr;
        var crystalCluster = Models.createResourceNode('crystal_cluster', 0.9 + hash2D(sc, 782) * 0.4);
        crystalCluster.position.set(scx, terrainHeight(scx, scz), scz);
        crystalCluster.rotation.y = hash2D(sc, 783) * Math.PI * 2;
        scene.add(crystalCluster);
      }

      var sgazebo = Models.createLandmark('gazebo', 0.9);
      sgazebo.position.set(sz.cx + 15, terrainHeight(sz.cx + 15, sz.cz - 15), sz.cz - 15);
      scene.add(sgazebo);

      // Agora: 6 signposts, 2 campfires (merchant gathering), 3 flower beds
      for (var ags = 0; ags < 6; ags++) {
        var agsa = (ags / 6) * Math.PI * 2;
        var agsx = az.cx + Math.cos(agsa) * 30;
        var agsz = az.cz + Math.sin(agsa) * 30;
        var agsignpost = Models.createLandmark('signpost', 1.0);
        agsignpost.position.set(agsx, terrainHeight(agsx, agsz), agsz);
        agsignpost.rotation.y = agsa;
        scene.add(agsignpost);
      }

      for (var agc = 0; agc < 2; agc++) {
        var agca = (agc / 2) * Math.PI * 2 + Math.PI / 4;
        var agcx = az.cx + Math.cos(agca) * 20;
        var agcz = az.cz + Math.sin(agca) * 20;
        var agcampfire = Models.createLandmark('campfire', 1.0);
        agcampfire.position.set(agcx, terrainHeight(agcx, agcz), agcz);
        scene.add(agcampfire);
        animatedObjects.push({ mesh: agcampfire, type: 'landmark', params: {} });
      }

      for (var agf = 0; agf < 3; agf++) {
        var agfa = hash2D(agf, 790) * Math.PI * 2;
        var agfr = 15 + hash2D(agf, 791) * 20;
        var agfx = az.cx + Math.cos(agfa) * agfr;
        var agfz = az.cz + Math.sin(agfa) * agfr;
        var agflowerBed = Models.createResourceNode('flower_bed', 0.9);
        agflowerBed.position.set(agfx, terrainHeight(agfx, agfz), agfz);
        agflowerBed.rotation.y = hash2D(agf, 792) * Math.PI * 2;
        scene.add(agflowerBed);
      }

      // Commons: 2 gazebos (gathering areas), 4 wood piles, 6 ore veins
      for (var cg = 0; cg < 2; cg++) {
        var cga = (cg / 2) * Math.PI * 2 + Math.PI / 3;
        var cgx = cz.cx + Math.cos(cga) * 30;
        var cgz = cz.cz + Math.sin(cga) * 30;
        var cgazebo = Models.createLandmark('gazebo', 0.95);
        cgazebo.position.set(cgx, terrainHeight(cgx, cgz), cgz);
        scene.add(cgazebo);
      }

      for (var cw = 0; cw < 4; cw++) {
        var cwa = hash2D(cw, 800) * Math.PI * 2;
        var cwr = 20 + hash2D(cw, 801) * 25;
        var cwx = cz.cx + Math.cos(cwa) * cwr;
        var cwz = cz.cz + Math.sin(cwa) * cwr;
        var cwoodPile = Models.createResourceNode('wood_pile', 1.0);
        cwoodPile.position.set(cwx, terrainHeight(cwx, cwz), cwz);
        cwoodPile.rotation.y = hash2D(cw, 802) * Math.PI * 2;
        scene.add(cwoodPile);
      }

      for (var co = 0; co < 6; co++) {
        var coa = hash2D(co, 810) * Math.PI * 2;
        var cor = 18 + hash2D(co, 811) * 28;
        var cox = cz.cx + Math.cos(coa) * cor;
        var coz = cz.cz + Math.sin(coa) * cor;
        var coreVein = Models.createResourceNode('ore_vein', 0.9 + hash2D(co, 812) * 0.4);
        coreVein.position.set(cox, terrainHeight(cox, coz), coz);
        coreVein.rotation.y = hash2D(co, 813) * Math.PI * 2;
        scene.add(coreVein);
      }

      // Arena: 2 statues (champion statues), 4 campfires
      for (var ars = 0; ars < 2; ars++) {
        var arsa = (ars / 2) * Math.PI * 2 + Math.PI / 2;
        var arsx = arz.cx + Math.cos(arsa) * 28;
        var arsz = arz.cz + Math.sin(arsa) * 28;
        var arstatue = Models.createLandmark('statue', 1.2);
        arstatue.position.set(arsx, terrainHeight(arsx, arsz), arsz);
        arstatue.rotation.y = arsa + Math.PI;
        scene.add(arstatue);
      }

      for (var arc = 0; arc < 4; arc++) {
        var arca = (arc / 4) * Math.PI * 2;
        var arcx = arz.cx + Math.cos(arca) * 32;
        var arcz = arz.cz + Math.sin(arca) * 32;
        var arcampfire = Models.createLandmark('campfire', 1.0);
        arcampfire.position.set(arcx, terrainHeight(arcx, arcz), arcz);
        scene.add(arcampfire);
        animatedObjects.push({ mesh: arcampfire, type: 'landmark', params: {} });
      }
    }

    // ---- WILDLIFE: creatures scattered by zone ----
    if (Models.createWildlife) {
      // Gardens: 6 rabbits, 10 fireflies
      for (var gr = 0; gr < 6; gr++) {
        var gra = hash2D(gr, 820) * Math.PI * 2;
        var grr = 15 + hash2D(gr, 821) * 40;
        var grx = gz.cx + Math.cos(gra) * grr;
        var grz = gz.cz + Math.sin(gra) * grr;
        var gry = terrainHeight(grx, grz);
        var rabbit = Models.createWildlife('rabbit');
        rabbit.position.set(grx, gry, grz);
        rabbit.rotation.y = hash2D(gr, 822) * Math.PI * 2;
        scene.add(rabbit);
        animatedObjects.push({ mesh: rabbit, type: 'creature', params: { speed: 0.8 + hash2D(gr, 823) * 0.4 } });
      }

      for (var gfl = 0; gfl < 10; gfl++) {
        var gfla = hash2D(gfl, 830) * Math.PI * 2;
        var gflr = 10 + hash2D(gfl, 831) * 50;
        var gflx = gz.cx + Math.cos(gfla) * gflr;
        var gflz = gz.cz + Math.sin(gfla) * gflr;
        var gfly = terrainHeight(gflx, gflz) + 1.5 + hash2D(gfl, 832) * 1.5;
        var firefly = Models.createWildlife('firefly');
        firefly.position.set(gflx, gfly, gflz);
        scene.add(firefly);
        animatedObjects.push({ mesh: firefly, type: 'creature', params: { speed: 1.2 + hash2D(gfl, 833) * 0.6 } });
      }

      // Wilds: 4 deer, 6 rabbits, 15 fireflies, 4 frogs
      for (var wd = 0; wd < 4; wd++) {
        var wda = hash2D(wd, 840) * Math.PI * 2;
        var wdr = 25 + hash2D(wd, 841) * 45;
        var wdx = wz.cx + Math.cos(wda) * wdr;
        var wdz = wz.cz + Math.sin(wda) * wdr;
        var wdy = terrainHeight(wdx, wdz);
        var deer = Models.createWildlife('deer');
        deer.position.set(wdx, wdy, wdz);
        deer.rotation.y = hash2D(wd, 842) * Math.PI * 2;
        scene.add(deer);
        animatedObjects.push({ mesh: deer, type: 'creature', params: { speed: 0.6 + hash2D(wd, 843) * 0.3 } });
      }

      for (var wr = 0; wr < 6; wr++) {
        var wra = hash2D(wr, 850) * Math.PI * 2;
        var wrr = 20 + hash2D(wr, 851) * 50;
        var wrx = wz.cx + Math.cos(wra) * wrr;
        var wrz = wz.cz + Math.sin(wra) * wrr;
        var wry = terrainHeight(wrx, wrz);
        var wrabbit = Models.createWildlife('rabbit');
        wrabbit.position.set(wrx, wry, wrz);
        wrabbit.rotation.y = hash2D(wr, 852) * Math.PI * 2;
        scene.add(wrabbit);
        animatedObjects.push({ mesh: wrabbit, type: 'creature', params: { speed: 0.8 + hash2D(wr, 853) * 0.4 } });
      }

      for (var wfl = 0; wfl < 15; wfl++) {
        var wfla = hash2D(wfl, 860) * Math.PI * 2;
        var wflr = 15 + hash2D(wfl, 861) * 60;
        var wflx = wz.cx + Math.cos(wfla) * wflr;
        var wflz = wz.cz + Math.sin(wfla) * wflr;
        var wfly = terrainHeight(wflx, wflz) + 1.5 + hash2D(wfl, 862) * 1.5;
        var wfirefly = Models.createWildlife('firefly');
        wfirefly.position.set(wflx, wfly, wflz);
        scene.add(wfirefly);
        animatedObjects.push({ mesh: wfirefly, type: 'creature', params: { speed: 1.2 + hash2D(wfl, 863) * 0.6 } });
      }

      for (var wf = 0; wf < 4; wf++) {
        var wfa = hash2D(wf, 870) * Math.PI * 2;
        var wfr = 30 + hash2D(wf, 871) * 35;
        var wfx = wz.cx + Math.cos(wfa) * wfr;
        var wfz = wz.cz + Math.sin(wfa) * wfr;
        var wfy = terrainHeight(wfx, wfz);
        var frog = Models.createWildlife('frog');
        frog.position.set(wfx, wfy, wfz);
        frog.rotation.y = hash2D(wf, 872) * Math.PI * 2;
        scene.add(frog);
        animatedObjects.push({ mesh: frog, type: 'creature', params: { speed: 0.5 + hash2D(wf, 873) * 0.3 } });
      }

      // Commons: 3 rabbits
      for (var cr = 0; cr < 3; cr++) {
        var cra = hash2D(cr, 880) * Math.PI * 2;
        var crr = 20 + hash2D(cr, 881) * 25;
        var crx = cz.cx + Math.cos(cra) * crr;
        var crz = cz.cz + Math.sin(cra) * crr;
        var cry = terrainHeight(crx, crz);
        var crabbit = Models.createWildlife('rabbit');
        crabbit.position.set(crx, cry, crz);
        crabbit.rotation.y = hash2D(cr, 882) * Math.PI * 2;
        scene.add(crabbit);
        animatedObjects.push({ mesh: crabbit, type: 'creature', params: { speed: 0.8 + hash2D(cr, 883) * 0.4 } });
      }

      // Nexus: 4 fireflies
      for (var nfl = 0; nfl < 4; nfl++) {
        var nfla = hash2D(nfl, 890) * Math.PI * 2;
        var nflr = 15 + hash2D(nfl, 891) * 20;
        var nflx = nz.cx + Math.cos(nfla) * nflr;
        var nflz = nz.cz + Math.sin(nfla) * nflr;
        var nfly = terrainHeight(nflx, nflz) + 1.5 + hash2D(nfl, 892) * 1.5;
        var nfirefly = Models.createWildlife('firefly');
        nfirefly.position.set(nflx, nfly, nflz);
        scene.add(nfirefly);
        animatedObjects.push({ mesh: nfirefly, type: 'creature', params: { speed: 1.2 + hash2D(nfl, 893) * 0.6 } });
      }
    }

    // ---- GROUND COVER: grass, bushes, mushrooms, fallen logs ----
    if (Models.createGrassPatch) {
      // Scatter grass patches across all natural zones
      var naturalZones = [gz, wz, cz, nz];
      for (var nzi = 0; nzi < naturalZones.length; nzi++) {
        var nzInfo = naturalZones[nzi];
        var grassCount = nzi === 1 ? 30 : 15; // More in wilds
        for (var gp = 0; gp < grassCount; gp++) {
          var gpa = hash2D(gp + nzi * 100, 900) * Math.PI * 2;
          var gpr = 8 + hash2D(gp + nzi * 100, 901) * 55;
          var gpx = nzInfo.cx + Math.cos(gpa) * gpr;
          var gpz = nzInfo.cz + Math.sin(gpa) * gpr;
          var grassPatch = Models.createGrassPatch(0.8 + hash2D(gp + nzi * 100, 902) * 0.6);
          grassPatch.position.set(gpx, terrainHeight(gpx, gpz), gpz);
          grassPatch.rotation.y = hash2D(gp + nzi * 100, 903) * Math.PI * 2;
          scene.add(grassPatch);
        }
      }
    }

    if (Models.createBush) {
      // Bushes in gardens (flowering), wilds (berry/green), commons (green)
      var bushTypes = ['flowering', 'flowering', 'green'];
      for (var gb = 0; gb < 8; gb++) {
        var gba = hash2D(gb, 910) * Math.PI * 2;
        var gbr = 12 + hash2D(gb, 911) * 40;
        var gbx = gz.cx + Math.cos(gba) * gbr;
        var gbz = gz.cz + Math.sin(gba) * gbr;
        var gardenBush = Models.createBush(bushTypes[gb % 3], 0.8 + hash2D(gb, 912) * 0.4);
        gardenBush.position.set(gbx, terrainHeight(gbx, gbz), gbz);
        scene.add(gardenBush);
      }

      // Berry and green bushes in wilds
      for (var wb = 0; wb < 10; wb++) {
        var wba = hash2D(wb, 920) * Math.PI * 2;
        var wbr = 15 + hash2D(wb, 921) * 50;
        var wbx = wz.cx + Math.cos(wba) * wbr;
        var wbz = wz.cz + Math.sin(wba) * wbr;
        var wildBush = Models.createBush(wb % 3 === 0 ? 'berry' : 'green', 0.7 + hash2D(wb, 922) * 0.5);
        wildBush.position.set(wbx, terrainHeight(wbx, wbz), wbz);
        scene.add(wildBush);
      }
    }

    if (Models.createMushroom) {
      // Mushroom clusters in wilds and gardens
      var mushroomTypes = ['red', 'brown', 'white', 'purple', 'glowing'];
      for (var wm = 0; wm < 8; wm++) {
        var wma = hash2D(wm, 930) * Math.PI * 2;
        var wmr = 20 + hash2D(wm, 931) * 45;
        var wmx = wz.cx + Math.cos(wma) * wmr;
        var wmz = wz.cz + Math.sin(wma) * wmr;
        var mushroom = Models.createMushroom(mushroomTypes[wm % 5], 0.8 + hash2D(wm, 932) * 0.5);
        mushroom.position.set(wmx, terrainHeight(wmx, wmz), wmz);
        mushroom.rotation.y = hash2D(wm, 933) * Math.PI * 2;
        scene.add(mushroom);
      }

      // Glowing mushrooms in athenaeum (mystical)
      for (var am = 0; am < 5; am++) {
        var ama = hash2D(am, 940) * Math.PI * 2;
        var amr = 15 + hash2D(am, 941) * 25;
        var amx = atz.cx + Math.cos(ama) * amr;
        var amz = atz.cz + Math.sin(ama) * amr;
        var glowMush = Models.createMushroom('glowing', 0.6 + hash2D(am, 942) * 0.4);
        glowMush.position.set(amx, terrainHeight(amx, amz), amz);
        scene.add(glowMush);
      }
    }

    if (Models.createFallenLog) {
      // Fallen logs in wilds and commons
      for (var fl = 0; fl < 5; fl++) {
        var fla = hash2D(fl, 950) * Math.PI * 2;
        var flr = 20 + hash2D(fl, 951) * 40;
        var flx = wz.cx + Math.cos(fla) * flr;
        var flz = wz.cz + Math.sin(fla) * flr;
        var fallenLog = Models.createFallenLog(0.8 + hash2D(fl, 952) * 0.4);
        fallenLog.position.set(flx, terrainHeight(flx, flz), flz);
        fallenLog.rotation.y = hash2D(fl, 953) * Math.PI * 2;
        scene.add(fallenLog);
      }

      for (var cl = 0; cl < 3; cl++) {
        var cla = hash2D(cl, 960) * Math.PI * 2;
        var clr = 18 + hash2D(cl, 961) * 25;
        var clx = cz.cx + Math.cos(cla) * clr;
        var clz = cz.cz + Math.sin(cla) * clr;
        var commonLog = Models.createFallenLog(0.7 + hash2D(cl, 962) * 0.3);
        commonLog.position.set(clx, terrainHeight(clx, clz), clz);
        commonLog.rotation.y = hash2D(cl, 963) * Math.PI * 2;
        scene.add(commonLog);
      }
    }

    // ---- ZONE ARCHITECTURE: detailed structures per zone ----

    if (Models.createRuinWall) {
      // Arena: ancient ruins and ruin walls
      var arenaZone = ZONES.arena;
      for (var rw = 0; rw < 4; rw++) {
        var rwa = hash2D(rw, 1000) * Math.PI * 2;
        var rwr = 15 + hash2D(rw, 1001) * 25;
        var rwx = arenaZone.cx + Math.cos(rwa) * rwr;
        var rwz = arenaZone.cz + Math.sin(rwa) * rwr;
        var ruinWall = Models.createRuinWall(0.8 + hash2D(rw, 1002) * 0.4);
        ruinWall.position.set(rwx, terrainHeight(rwx, rwz), rwz);
        ruinWall.rotation.y = rwa + Math.PI / 2;
        scene.add(ruinWall);
      }
    }

    if (Models.createColumnRow) {
      // Athenaeum: classical columns
      var athenZone = ZONES.athenaeum;
      for (var cr = 0; cr < 3; cr++) {
        var cra = hash2D(cr, 1010) * Math.PI * 2;
        var crr = 10 + hash2D(cr, 1011) * 20;
        var crx = athenZone.cx + Math.cos(cra) * crr;
        var crz = athenZone.cz + Math.sin(cra) * crr;
        var columns = Models.createColumnRow(4 + Math.floor(hash2D(cr, 1012) * 3), 3.5, 2, 0.9);
        columns.position.set(crx, terrainHeight(crx, crz), crz);
        columns.rotation.y = cra;
        scene.add(columns);
      }
    }

    if (Models.createAmphitheater) {
      // Arena: amphitheater at center
      var amphitheater = Models.createAmphitheater(1.2);
      amphitheater.position.set(arenaZone.cx, terrainHeight(arenaZone.cx, arenaZone.cz), arenaZone.cz);
      scene.add(amphitheater);
    }

    if (Models.createWishingWell) {
      // Gardens: wishing well
      var gardenZone = ZONES.gardens;
      var well = Models.createWishingWell(1.0);
      well.position.set(gardenZone.cx + 15, terrainHeight(gardenZone.cx + 15, gardenZone.cz - 10), gardenZone.cz - 10);
      scene.add(well);

      // Commons: another wishing well
      var commonsZone = ZONES.commons;
      var well2 = Models.createWishingWell(0.9);
      well2.position.set(commonsZone.cx - 8, terrainHeight(commonsZone.cx - 8, commonsZone.cz + 5), commonsZone.cz + 5);
      scene.add(well2);
    }

    if (Models.createBookshelf) {
      // Athenaeum: bookshelves
      for (var bs = 0; bs < 6; bs++) {
        var bsa = hash2D(bs, 1030) * Math.PI * 2;
        var bsr = 8 + hash2D(bs, 1031) * 12;
        var bsx = athenZone.cx + Math.cos(bsa) * bsr;
        var bsz = athenZone.cz + Math.sin(bsa) * bsr;
        var bookshelf = Models.createBookshelf(1.0);
        bookshelf.position.set(bsx, terrainHeight(bsx, bsz), bsz);
        bookshelf.rotation.y = bsa + Math.PI;
        scene.add(bookshelf);
      }
    }

    if (Models.createTorch) {
      // Place torches near landmarks in several zones
      var torchZones = ['nexus', 'athenaeum', 'arena', 'agora'];
      for (var tz = 0; tz < torchZones.length; tz++) {
        var torchZone = ZONES[torchZones[tz]];
        for (var tc = 0; tc < 4; tc++) {
          var tca = hash2D(tc + tz * 10, 1040) * Math.PI * 2;
          var tcr = 8 + hash2D(tc + tz * 10, 1041) * 15;
          var tcx = torchZone.cx + Math.cos(tca) * tcr;
          var tcz = torchZone.cz + Math.sin(tca) * tcr;
          var torch = Models.createTorch(1.0);
          torch.position.set(tcx, terrainHeight(tcx, tcz), tcz);
          torch.rotation.y = tca;
          scene.add(torch);
          animatedObjects.push(torch);
        }
      }
    }

    if (Models.createBridge) {
      // Bridges between close zones
      // Gardens to Commons bridge
      var bridgeGC = Models.createBridge(10, 0.9);
      var bgcx = (gardenZone.cx + commonsZone.cx) / 2;
      var bgcz = (gardenZone.cz + commonsZone.cz) / 2;
      bridgeGC.position.set(bgcx, terrainHeight(bgcx, bgcz) - 0.5, bgcz);
      bridgeGC.rotation.y = Math.atan2(commonsZone.cz - gardenZone.cz, commonsZone.cx - gardenZone.cx);
      scene.add(bridgeGC);

      // Nexus to Athenaeum bridge
      var bridgeNA = Models.createBridge(12, 0.9);
      var bnax = (ZONES.nexus.cx + athenZone.cx) / 2;
      var bnaz = (ZONES.nexus.cz + athenZone.cz) / 2;
      bridgeNA.position.set(bnax, terrainHeight(bnax, bnaz) - 0.5, bnaz);
      bridgeNA.rotation.y = Math.atan2(athenZone.cz - ZONES.nexus.cz, athenZone.cx - ZONES.nexus.cx);
      scene.add(bridgeNA);
    }

    if (Models.createGardenArch) {
      // Garden arches at garden entrances
      for (var ga = 0; ga < 3; ga++) {
        var gaa = hash2D(ga, 1060) * Math.PI * 2;
        var gar = gardenZone.radius * 0.6;
        var gax = gardenZone.cx + Math.cos(gaa) * gar;
        var gaz = gardenZone.cz + Math.sin(gaa) * gar;
        var gardenArch = Models.createGardenArch(1.1);
        gardenArch.position.set(gax, terrainHeight(gax, gaz), gaz);
        gardenArch.rotation.y = gaa;
        scene.add(gardenArch);
        animatedObjects.push(gardenArch);
      }
    }

    if (Models.createBannerPole) {
      // Banner poles in agora and arena
      var bannerColors = [0xcc0000, 0x0000cc, 0x00cc00, 0xcc9900, 0x9900cc, 0x009999];
      var bannerZones = ['agora', 'arena', 'nexus'];
      for (var bz = 0; bz < bannerZones.length; bz++) {
        var bannerZone = ZONES[bannerZones[bz]];
        var bannerCount = bz === 0 ? 6 : 4;
        for (var bp = 0; bp < bannerCount; bp++) {
          var bpa = hash2D(bp + bz * 20, 1070) * Math.PI * 2;
          var bpr = 10 + hash2D(bp + bz * 20, 1071) * 20;
          var bpx = bannerZone.cx + Math.cos(bpa) * bpr;
          var bpz = bannerZone.cz + Math.sin(bpa) * bpr;
          var bannerColor = bannerColors[(bp + bz * 3) % bannerColors.length];
          var banner = Models.createBannerPole(bannerColor, 0.9);
          banner.position.set(bpx, terrainHeight(bpx, bpz), bpz);
          scene.add(banner);
          animatedObjects.push(banner);
        }
      }
    }

    console.log('Environment populated with trees, rocks, furniture, creatures, ground cover, and architecture');
  }

  // ========================================================================
  // SCENE INITIALIZATION
  // ========================================================================

  function initScene(container) {
    if (typeof THREE === 'undefined') {
      console.warn('THREE.js not available');
      return null;
    }

    var scene = new THREE.Scene();
    createSky(scene);

    // Add distance fog for atmospheric depth
    scene.fog = new THREE.Fog(0x87ceeb, 150, 500);

    var camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Handle resize
    window.addEventListener('resize', function() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    var ambientLight = new THREE.HemisphereLight(0x87ceeb, 0xd2b48c, 0.6);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0xfff8e7, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = false;
    scene.add(directionalLight);

    // Create all zone structures (one-time, persistent)
    createZoneStructures(scene);

    // Populate world with environmental objects (trees, rocks, furniture)
    populateEnvironment(scene);

    // Load initial chunks around nexus
    var ctx = {
      scene: scene,
      camera: camera,
      renderer: renderer,
      ambientLight: ambientLight,
      directionalLight: directionalLight
    };
    updateChunks(ctx, 0, 0);

    return ctx;
  }

  // ========================================================================
  // ZONE LOADING — now just teleports camera
  // ========================================================================

  function loadZone(sceneCtx, zoneId) {
    if (!sceneCtx || !sceneCtx.scene || !sceneCtx.camera) return;
    var zone = ZONES[zoneId];
    if (!zone) return;
    activeZone = zoneId;
    sceneCtx.camera.position.set(zone.cx, zone.baseHeight + 15, zone.cz + 25);
    sceneCtx.camera.lookAt(zone.cx, zone.baseHeight, zone.cz);
    updateChunks(sceneCtx, zone.cx, zone.cz);
  }

  // ========================================================================
  // PLAYER MANAGEMENT — API matches main.js expectations
  // ========================================================================

  function addPlayer(sceneCtx, playerId, position) {
    if (!sceneCtx || !sceneCtx.scene) return;
    var x = position.x || 0, z = position.z || 0;
    var y = terrainHeight(x, z);
    var mesh = createHumanoidModel();
    mesh.position.set(x, y, z);

    // Initialize previous position for animation tracking
    mesh.userData.prevPosition.set(x, y, z);

    sceneCtx.scene.add(mesh);

    // Name label - billboard sprite above head
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, 0, 256, 64);
    context.font = 'Bold 22px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(playerId, 128, 40);
    var texture = new THREE.CanvasTexture(canvas);
    var labelMat = new THREE.SpriteMaterial({ map: texture });
    var label = new THREE.Sprite(labelMat);
    label.scale.set(3, 0.75, 1);
    label.position.y = 2.0; // Above head
    mesh.add(label);

    playerMeshes.set(playerId, { mesh: mesh, label: label });
  }

  function movePlayer(sceneCtx, playerId, position) {
    var data = playerMeshes.get(playerId);
    if (!data) return;
    var mesh = data.mesh;

    // Store previous position before updating
    mesh.userData.prevPosition.copy(mesh.position);

    var x = position.x || 0, z = position.z || 0;
    var y = terrainHeight(x, z);
    mesh.position.set(x, y, z);

    // Calculate movement delta to determine animation state
    var dx = x - mesh.userData.prevPosition.x;
    var dz = z - mesh.userData.prevPosition.z;
    var movementDelta = Math.sqrt(dx * dx + dz * dz);

    // Determine animation state based on movement
    if (movementDelta < 0.001) {
      mesh.userData.animState = 'idle';
    } else if (movementDelta > 0.1) {
      mesh.userData.animState = 'run'; // Fast movement = running
    } else {
      mesh.userData.animState = 'walk';
    }

    // Update rotation to face movement direction
    if (movementDelta > 0.001) {
      var angle = Math.atan2(dx, dz);
      mesh.rotation.y = angle;
    }
  }

  function removePlayer(sceneCtx, playerId) {
    var data = playerMeshes.get(playerId);
    if (!data || !sceneCtx || !sceneCtx.scene) return;
    sceneCtx.scene.remove(data.mesh);
    playerMeshes.delete(playerId);
  }

  // ========================================================================
  // PLAYER ANIMATIONS
  // ========================================================================

  function updatePlayerAnimations(sceneCtx, deltaTime) {
    if (!sceneCtx) return;

    playerMeshes.forEach(function(data) {
      var mesh = data.mesh;
      var limbs = mesh.userData.limbs;
      if (!limbs) return;

      // Increment animation time
      mesh.userData.animTime += deltaTime;
      var t = mesh.userData.animTime;

      var state = mesh.userData.animState || 'idle';

      // Reset rotations to neutral positions
      limbs.leftArm.rotation.x = 0;
      limbs.rightArm.rotation.x = 0;
      limbs.leftLeg.rotation.x = 0;
      limbs.rightLeg.rotation.x = 0;
      limbs.torso.rotation.x = 0;
      limbs.torso.scale.set(1, 1, 1);
      limbs.head.rotation.x = 0;

      if (state === 'idle') {
        // IDLE ANIMATION
        // Subtle breathing - torso scales slightly on Y
        var breathe = Math.sin(t * 2) * 0.02;
        limbs.torso.scale.y = 1.0 + breathe;

        // Slight body sway
        limbs.torso.rotation.z = Math.sin(t * 1.5) * 0.02;

        // Arms hang naturally with subtle sway
        limbs.leftArm.rotation.z = Math.sin(t * 1.3) * 0.05;
        limbs.rightArm.rotation.z = -Math.sin(t * 1.3) * 0.05;

      } else if (state === 'walk') {
        // WALKING ANIMATION
        var walkSpeed = 8;
        var swingAngle = 0.5;

        // Legs swing forward/back alternately
        limbs.leftLeg.rotation.x = Math.sin(t * walkSpeed) * swingAngle;
        limbs.rightLeg.rotation.x = Math.sin(t * walkSpeed + Math.PI) * swingAngle;

        // Arms swing opposite to legs (counter-swing)
        limbs.leftArm.rotation.x = Math.sin(t * walkSpeed + Math.PI) * swingAngle * 0.7;
        limbs.rightArm.rotation.x = Math.sin(t * walkSpeed) * swingAngle * 0.7;

        // Feet rotate with legs
        limbs.leftFoot.rotation.x = Math.sin(t * walkSpeed) * swingAngle * 0.5;
        limbs.rightFoot.rotation.x = Math.sin(t * walkSpeed + Math.PI) * swingAngle * 0.5;

        // Body bobs slightly up/down
        var bob = Math.abs(Math.sin(t * walkSpeed)) * 0.05;
        limbs.torso.position.y = 0.9 + bob;
        limbs.head.position.y = 1.5 + bob;

        // Slight forward lean
        limbs.torso.rotation.x = 0.05;

      } else if (state === 'run') {
        // RUNNING ANIMATION
        var runSpeed = 12;
        var runSwingAngle = 0.8;

        // Legs swing with larger amplitude and faster
        limbs.leftLeg.rotation.x = Math.sin(t * runSpeed) * runSwingAngle;
        limbs.rightLeg.rotation.x = Math.sin(t * runSpeed + Math.PI) * runSwingAngle;

        // More dramatic arm swing
        limbs.leftArm.rotation.x = Math.sin(t * runSpeed + Math.PI) * runSwingAngle;
        limbs.rightArm.rotation.x = Math.sin(t * runSpeed) * runSwingAngle;

        // Feet rotate with legs
        limbs.leftFoot.rotation.x = Math.sin(t * runSpeed) * runSwingAngle * 0.5;
        limbs.rightFoot.rotation.x = Math.sin(t * runSpeed + Math.PI) * runSwingAngle * 0.5;

        // More pronounced body bob
        var runBob = Math.abs(Math.sin(t * runSpeed)) * 0.08;
        limbs.torso.position.y = 0.9 + runBob;
        limbs.head.position.y = 1.5 + runBob;

        // More body lean forward
        limbs.torso.rotation.x = 0.15;
      }
    });
  }

  // ========================================================================
  // DAY/NIGHT CYCLE
  // ========================================================================

  function updateDayNight(sceneCtx, worldTime) {
    if (!sceneCtx) return;

    // worldTime is 0-1440 (minutes in 24h cycle)
    var normalizedTime = worldTime / 1440; // 0-1

    // Sun position
    var sunAngle = normalizedTime * Math.PI * 2 - Math.PI / 2;
    if (sunMesh) {
      sunMesh.position.set(Math.cos(sunAngle) * 400, Math.sin(sunAngle) * 400, 0);
    }
    if (moonMesh) {
      moonMesh.position.set(Math.cos(sunAngle + Math.PI) * 400, Math.sin(sunAngle + Math.PI) * 400, 0);
    }

    // Stars
    if (stars && stars.material) {
      stars.material.opacity = Math.max(0, -Math.sin(sunAngle));
      stars.material.transparent = true;
    }

    // Sky color
    var skyColor, fogColor, sunIntensity;
    var t;
    if (normalizedTime < 0.25) {
      t = normalizedTime / 0.25;
      skyColor = lerpColor(0x0a0a2e, 0xff6b35, t);
      fogColor = skyColor;
      sunIntensity = t * 0.3;
    } else if (normalizedTime < 0.5) {
      t = (normalizedTime - 0.25) / 0.25;
      skyColor = lerpColor(0xff6b35, 0x87ceeb, t);
      fogColor = skyColor;
      sunIntensity = 0.3 + t * 0.7;
    } else if (normalizedTime < 0.75) {
      t = (normalizedTime - 0.5) / 0.25;
      skyColor = lerpColor(0x87ceeb, 0xff4500, t);
      fogColor = skyColor;
      sunIntensity = 1.0 - t * 0.5;
    } else {
      t = (normalizedTime - 0.75) / 0.25;
      skyColor = lerpColor(0xff4500, 0x0a0a2e, t);
      fogColor = skyColor;
      sunIntensity = 0.5 - t * 0.5;
    }

    if (skyDome && skyDome.material) skyDome.material.color.setHex(skyColor);
    if (sceneCtx.scene && sceneCtx.scene.fog) sceneCtx.scene.fog.color.setHex(fogColor);
    if (sceneCtx.directionalLight) {
      sceneCtx.directionalLight.intensity = Math.max(0.05, sunIntensity);
      sceneCtx.directionalLight.position.set(
        Math.cos(sunAngle) * 50,
        Math.max(10, Math.sin(sunAngle) * 100),
        50
      );
    }
    if (sceneCtx.ambientLight) {
      var ambientIntensity = 0.3 + sunIntensity * 0.4;
      sceneCtx.ambientLight.intensity = ambientIntensity;
    }
  }

  function lerpColor(c1, c2, t) {
    var r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    var r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    var r = Math.floor(r1 + (r2 - r1) * t);
    var g = Math.floor(g1 + (g2 - g1) * t);
    var b = Math.floor(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  // ========================================================================
  // LIGHT CULLING — matches main.js: cullLights(ctx, position, maxDist, maxCount)
  // ========================================================================

  function cullLights(sceneCtx, playerPos, maxDistance, maxCount) {
    if (!sceneCtx || !sceneCtx.scene) return;
    var px = playerPos.x || 0, pz = playerPos.z || 0;
    var lights = [];
    sceneCtx.scene.traverse(function(obj) {
      if (obj instanceof THREE.PointLight) {
        var dx = obj.position.x - px, dz = obj.position.z - pz;
        var dist = Math.sqrt(dx * dx + dz * dz);
        lights.push({ light: obj, dist: dist });
      }
    });
    lights.sort(function(a, b) { return a.dist - b.dist; });
    for (var i = 0; i < lights.length; i++) {
      lights[i].light.visible = (i < (maxCount || 8)) && (lights[i].dist < (maxDistance || 50));
    }
  }

  // ========================================================================
  // WEATHER
  // ========================================================================

  function updateWeather(sceneCtx, weatherType) {
    if (!sceneCtx || !sceneCtx.scene) return;
    // Call setWeather to handle visual effects and fog
    setWeather(sceneCtx, weatherType);
  }

  // ========================================================================
  // ANIMATION SYSTEM
  // ========================================================================

  function updateAnimations(sceneCtx, deltaTime, worldTime) {
    // Cloud drift
    for (var i = 0; i < clouds.length; i++) {
      var cloud = clouds[i];
      cloud.position.x += Math.cos(cloud.userData.driftAngle) * cloud.userData.driftSpeed * deltaTime;
      cloud.position.z += Math.sin(cloud.userData.driftAngle) * cloud.userData.driftSpeed * deltaTime;
      if (cloud.position.x > 600) cloud.position.x = -600;
      if (cloud.position.x < -600) cloud.position.x = 600;
      if (cloud.position.z > 600) cloud.position.z = -600;
      if (cloud.position.z < -600) cloud.position.z = 600;
    }

    // Animated objects
    var time = worldTime || 0;
    for (var j = 0; j < animatedObjects.length; j++) {
      var obj = animatedObjects[j];
      if (!obj.mesh || !obj.mesh.parent) continue;

      // Skip animation if object is outside frustum (set by updateFrustumCulling)
      if (obj.mesh.userData.inFrustum === false) continue;

      var p = obj.params;

      switch (obj.type) {
        case 'tree':
          obj.mesh.rotation.z = Math.sin(time * 0.001 * p.speed + p.seed) * 0.04;
          obj.mesh.rotation.x = Math.sin(time * 0.0008 * p.speed + p.seed * 1.5) * 0.02;
          break;
        case 'crystal':
          obj.mesh.rotation.y += deltaTime * (p.speed || 0.3);
          if (p.baseY !== undefined) {
            obj.mesh.position.y = p.baseY + Math.sin(time * 0.002) * 0.3;
          }
          break;
        case 'portal':
          obj.mesh.rotation.z += deltaTime * (p.speed || 0.5);
          if (p.inner) {
            p.inner.material.opacity = 0.25 + Math.sin(time * 0.003) * 0.15;
          }
          break;
        case 'torch':
          var flicker = 0.7 + Math.sin(time * 0.01 + (p.seed || 0)) * 0.15 + Math.sin(time * 0.023 + (p.seed || 0) * 2) * 0.15;
          obj.mesh.scale.set(flicker, 0.8 + flicker * 0.4, flicker);
          if (p.light) {
            p.light.intensity = 0.5 + flicker * 0.5;
          }
          break;
        case 'water':
          obj.mesh.rotation.y += deltaTime * 0.05;
          break;
        case 'creature':
          // Delegate to Models.animateModel if available
          var Models = typeof window !== 'undefined' ? window.Models : null;
          if (Models && Models.animateModel) {
            Models.animateModel(obj.mesh, deltaTime, time);
          } else {
            // Fallback: simple bobbing motion
            obj.mesh.position.y += Math.sin(time * 0.003 * (p.speed || 1)) * 0.01;
            obj.mesh.rotation.y += deltaTime * (p.speed || 0.5);
          }
          break;
        case 'landmark':
          if (Models && Models.animateModel) {
            Models.animateModel(obj.mesh, deltaTime, time);
          }
          break;
      }
    }
  }

  // ========================================================================
  // COLLISION / PHYSICS HELPERS
  // ========================================================================

  // Simple terrain-following: returns height at any world position
  // Used by main.js and npcs.js
  // Also provides basic collision checking for future use
  function checkCollision(x, z, radius) {
    // Check if position is inside any structure's bounding box
    // For now, just check zone center structures
    for (var zId in ZONES) {
      var zone = ZONES[zId];
      var dx = x - zone.cx, dz = z - zone.cz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      // Simple circle collision for central structures
      var structRadius = 5; // approximate central structure radius
      if (dist < structRadius + radius) {
        return true;
      }
    }
    return false;
  }

  // ========================================================================
  // PARTICLE SYSTEM
  // ========================================================================

  var particleSystems = null;
  var MAX_PARTICLES = 500;
  var PARTICLE_CULL_DISTANCE = 100;

  // Particle pool and emitter definitions
  function ParticleSystem() {
    this.particles = [];
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.activeCount = 0;

    // Particle data
    for (var i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        life: 0,
        maxLife: 1,
        color: { r: 1, g: 1, b: 1 },
        size: 1,
        opacity: 1,
        emitterType: null
      });
    }

    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Create material with texture support
    this.material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    // Load particle texture
    var particleTex = textureLoader ? textureLoader.load(ASSET_BASE + 'assets/textures/particle.png') : null;
    if (particleTex) {
      this.material.map = particleTex;
    }

    // Create Points mesh
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;

    // Emitters
    this.emitters = [];
  }

  ParticleSystem.prototype.addEmitter = function(type, position, config) {
    this.emitters.push({
      type: type,
      position: position,
      config: config || {},
      timer: 0,
      active: true
    });
  };

  ParticleSystem.prototype.removeEmitter = function(index) {
    if (index >= 0 && index < this.emitters.length) {
      this.emitters.splice(index, 1);
    }
  };

  ParticleSystem.prototype.emitParticle = function(type, position, count) {
    count = count || 1;
    for (var i = 0; i < count; i++) {
      this._spawnParticle(type, position);
    }
  };

  ParticleSystem.prototype._spawnParticle = function(type, position) {
    // Find dead particle to reuse
    var particle = null;
    for (var i = 0; i < MAX_PARTICLES; i++) {
      if (!this.particles[i].active) {
        particle = this.particles[i];
        break;
      }
    }
    if (!particle) return; // Pool full

    particle.active = true;
    particle.position.x = position.x;
    particle.position.y = position.y;
    particle.position.z = position.z;
    particle.emitterType = type;

    // Configure particle based on type
    switch (type) {
      case 'fire':
        particle.maxLife = 1.0 + Math.random() * 0.5;
        particle.life = particle.maxLife;
        particle.velocity.x = (Math.random() - 0.5) * 0.5;
        particle.velocity.y = 1.5 + Math.random() * 1.0;
        particle.velocity.z = (Math.random() - 0.5) * 0.5;
        particle.color.r = 1.0;
        particle.color.g = 0.4 + Math.random() * 0.3;
        particle.color.b = 0.0;
        particle.size = 0.3 + Math.random() * 0.3;
        particle.opacity = 1.0;
        break;

      case 'sparkle':
        particle.maxLife = 1.5 + Math.random() * 1.0;
        particle.life = particle.maxLife;
        var angle = Math.random() * Math.PI * 2;
        var radius = 2.0;
        particle.velocity.x = Math.cos(angle) * radius;
        particle.velocity.y = (Math.random() - 0.5) * 0.3;
        particle.velocity.z = Math.sin(angle) * radius;
        particle.color.r = 0.0;
        particle.color.g = 0.8 + Math.random() * 0.2;
        particle.color.b = 1.0;
        particle.size = 0.2 + Math.random() * 0.2;
        particle.opacity = 1.0;
        break;

      case 'dust':
        particle.maxLife = 0.5 + Math.random() * 0.5;
        particle.life = particle.maxLife;
        particle.velocity.x = (Math.random() - 0.5) * 1.0;
        particle.velocity.y = 0.3 + Math.random() * 0.5;
        particle.velocity.z = (Math.random() - 0.5) * 1.0;
        particle.color.r = 0.6;
        particle.color.g = 0.5;
        particle.color.b = 0.4;
        particle.size = 0.1 + Math.random() * 0.15;
        particle.opacity = 0.6;
        break;

      case 'leaf':
        particle.maxLife = 3.0 + Math.random() * 2.0;
        particle.life = particle.maxLife;
        particle.velocity.x = (Math.random() - 0.5) * 0.5;
        particle.velocity.y = -0.3 - Math.random() * 0.2;
        particle.velocity.z = (Math.random() - 0.5) * 0.5;
        particle.color.r = 0.2 + Math.random() * 0.3;
        particle.color.g = 0.6 + Math.random() * 0.3;
        particle.color.b = 0.1;
        particle.size = 0.2 + Math.random() * 0.2;
        particle.opacity = 0.8;
        break;

      case 'mist':
        particle.maxLife = 2.0 + Math.random() * 2.0;
        particle.life = particle.maxLife;
        particle.velocity.x = (Math.random() - 0.5) * 0.2;
        particle.velocity.y = 0.05 + Math.random() * 0.1;
        particle.velocity.z = (Math.random() - 0.5) * 0.2;
        particle.color.r = 0.8;
        particle.color.g = 0.85;
        particle.color.b = 0.9;
        particle.size = 0.8 + Math.random() * 0.6;
        particle.opacity = 0.3;
        break;

      case 'fountain':
        particle.maxLife = 1.5 + Math.random() * 0.5;
        particle.life = particle.maxLife;
        var fAngle = Math.random() * Math.PI * 2;
        var fSpeed = 1.0 + Math.random() * 1.5;
        particle.velocity.x = Math.cos(fAngle) * fSpeed * 0.5;
        particle.velocity.y = 3.0 + Math.random() * 1.5;
        particle.velocity.z = Math.sin(fAngle) * fSpeed * 0.5;
        particle.color.r = 0.2;
        particle.color.g = 0.5 + Math.random() * 0.3;
        particle.color.b = 0.8 + Math.random() * 0.2;
        particle.size = 0.15 + Math.random() * 0.15;
        particle.opacity = 0.7;
        break;

      default:
        particle.active = false;
        return;
    }
  };

  ParticleSystem.prototype.update = function(deltaTime, playerPos) {
    var dt = deltaTime * 0.001; // Convert to seconds
    var px = playerPos ? playerPos.x : 0;
    var pz = playerPos ? playerPos.z : 0;

    // Update emitters
    for (var e = 0; e < this.emitters.length; e++) {
      var emitter = this.emitters[e];
      if (!emitter.active) continue;

      emitter.timer += deltaTime;

      // Emit particles based on type
      var emitRate = 50; // ms per particle
      switch (emitter.type) {
        case 'fire': emitRate = 80; break;
        case 'sparkle': emitRate = 100; break;
        case 'dust': emitRate = 150; break;
        case 'leaf': emitRate = 200; break;
        case 'mist': emitRate = 120; break;
        case 'fountain': emitRate = 60; break;
      }

      while (emitter.timer >= emitRate) {
        emitter.timer -= emitRate;
        this._spawnParticle(emitter.type, emitter.position);
      }
    }

    // Update particles
    this.activeCount = 0;
    for (var i = 0; i < MAX_PARTICLES; i++) {
      var p = this.particles[i];
      if (!p.active) continue;

      // Update life
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      // Distance culling
      var dx = p.position.x - px;
      var dz = p.position.z - pz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > PARTICLE_CULL_DISTANCE) {
        p.active = false;
        continue;
      }

      // Update physics
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;

      // Apply gravity (except for sparkle and mist)
      if (p.emitterType !== 'sparkle' && p.emitterType !== 'mist') {
        p.velocity.y -= 2.0 * dt;
      }

      // Type-specific updates
      if (p.emitterType === 'sparkle') {
        // Circular motion around origin
        var angle = Math.atan2(p.velocity.z, p.velocity.x);
        angle += dt * 2.0;
        var speed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);
        p.velocity.x = Math.cos(angle) * speed;
        p.velocity.z = Math.sin(angle) * speed;
      } else if (p.emitterType === 'leaf') {
        // Swaying motion
        p.velocity.x += Math.sin(p.life * 3.0) * dt * 0.5;
        p.velocity.z += Math.cos(p.life * 2.5) * dt * 0.5;
      } else if (p.emitterType === 'mist') {
        // Slow drift
        p.velocity.x *= 0.98;
        p.velocity.z *= 0.98;
      }

      // Friction
      p.velocity.x *= 0.99;
      p.velocity.z *= 0.99;

      // Fade out
      var lifeRatio = p.life / p.maxLife;
      p.opacity = Math.min(1.0, lifeRatio * 2.0);

      // Update buffer
      var idx = this.activeCount * 3;
      this.positions[idx] = p.position.x;
      this.positions[idx + 1] = p.position.y;
      this.positions[idx + 2] = p.position.z;

      this.colors[idx] = p.color.r * p.opacity;
      this.colors[idx + 1] = p.color.g * p.opacity;
      this.colors[idx + 2] = p.color.b * p.opacity;

      this.sizes[this.activeCount] = p.size;

      this.activeCount++;
    }

    // Update geometry
    this.geometry.setDrawRange(0, this.activeCount);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  };

  // Public API functions
  function initParticles(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;

    particleSystems = new ParticleSystem();
    sceneCtx.scene.add(particleSystems.points);

    // Add default emitters at key locations
    // Fire at arena torches (12 torches around arena)
    var arenaZ = ZONES.arena;
    for (var ti = 0; ti < 12; ti++) {
      var tAngle = (ti / 12) * Math.PI * 2;
      var tpx = arenaZ.cx + Math.cos(tAngle) * 20;
      var tpz = arenaZ.cz + Math.sin(tAngle) * 20;
      particleSystems.addEmitter('fire', { x: tpx, y: arenaZ.baseHeight + 2.7, z: tpz });
    }

    // Sparkle at portals
    for (var zId in ZONES) {
      if (zId === 'nexus') continue;
      var zone = ZONES[zId];
      var dx = ZONES.nexus.cx - zone.cx;
      var dz = ZONES.nexus.cz - zone.cz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      var nx = dx / dist, nz = dz / dist;
      var portalX = zone.cx + nx * zone.radius * 0.7;
      var portalZ = zone.cz + nz * zone.radius * 0.7;
      var portalY = terrainHeight(portalX, portalZ);
      particleSystems.addEmitter('sparkle', { x: portalX, y: portalY + 3, z: portalZ });
    }

    // Fountain at gardens
    var gardensZ = ZONES.gardens;
    particleSystems.addEmitter('fountain', { x: gardensZ.cx, y: gardensZ.baseHeight + 1.5, z: gardensZ.cz });

    // Mist in wilds
    var wildsZ = ZONES.wilds;
    for (var mi = 0; mi < 3; mi++) {
      var mAngle = (mi / 3) * Math.PI * 2;
      var mx = wildsZ.cx + Math.cos(mAngle) * 10;
      var mz = wildsZ.cz + Math.sin(mAngle) * 10;
      particleSystems.addEmitter('mist', { x: mx, y: wildsZ.baseHeight + 0.5, z: mz });
    }

    // Leaves in gardens and wilds
    var leafZones = [ZONES.gardens, ZONES.wilds];
    for (var lzi = 0; lzi < leafZones.length; lzi++) {
      var lz = leafZones[lzi];
      for (var li = 0; li < 4; li++) {
        var lAngle = (li / 4) * Math.PI * 2;
        var lx = lz.cx + Math.cos(lAngle) * 15;
        var lzp = lz.cz + Math.sin(lAngle) * 15;
        particleSystems.addEmitter('leaf', { x: lx, y: lz.baseHeight + 8, z: lzp });
      }
    }
  }

  function updateParticles(sceneCtx, deltaTime, playerPos) {
    if (!particleSystems) return;
    particleSystems.update(deltaTime, playerPos);
  }

  function emitParticles(type, position, count) {
    if (!particleSystems) return;
    particleSystems.emitParticle(type, position, count || 1);
  }

  // ========================================================================
  // WEATHER EFFECTS SYSTEM
  // ========================================================================

  var weatherParticles = null; // Current active weather particle system
  var currentWeatherType = 'clear';

  function setWeather(sceneCtx, type) {
    if (!sceneCtx || !sceneCtx.scene) return;

    // Remove existing weather particles
    if (weatherParticles) {
      sceneCtx.scene.remove(weatherParticles);
      if (weatherParticles.geometry) weatherParticles.geometry.dispose();
      if (weatherParticles.material) weatherParticles.material.dispose();
      weatherParticles = null;
    }

    currentWeatherType = type;

    // Update fog based on weather
    if (sceneCtx.scene.fog) {
      switch (type) {
        case 'rain':
          sceneCtx.scene.fog.density = 0.0022;
          break;
        case 'snow':
          sceneCtx.scene.fog.density = 0.0018;
          break;
        case 'cloudy':
          sceneCtx.scene.fog.density = 0.0015;
          break;
        default:
          sceneCtx.scene.fog.density = 0.0012;
      }
    }

    // Create particle system based on type
    if (type === 'rain') {
      var rainCount = 2000;
      var rainGeo = new THREE.BufferGeometry();
      var rainPositions = new Float32Array(rainCount * 3);
      var rainVelocities = new Float32Array(rainCount * 3);

      // Initialize rain particles in a box around origin
      for (var i = 0; i < rainCount; i++) {
        var idx = i * 3;
        rainPositions[idx] = (Math.random() - 0.5) * 100;     // x
        rainPositions[idx + 1] = Math.random() * 80 + 20;      // y
        rainPositions[idx + 2] = (Math.random() - 0.5) * 100; // z

        // Velocities: fast downward with gentle drift
        rainVelocities[idx] = (Math.random() - 0.5) * 0.5;     // x drift
        rainVelocities[idx + 1] = -0.8 - Math.random() * 0.4;  // y fall speed
        rainVelocities[idx + 2] = (Math.random() - 0.5) * 0.5; // z drift
      }

      rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));
      rainGeo.userData.velocities = rainVelocities;

      var rainMat = new THREE.PointsMaterial({
        color: 0xaaccff,
        size: 0.15,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
      });

      weatherParticles = new THREE.Points(rainGeo, rainMat);
      weatherParticles.userData.type = 'rain';
      sceneCtx.scene.add(weatherParticles);

    } else if (type === 'snow') {
      var snowCount = 1000;
      var snowGeo = new THREE.BufferGeometry();
      var snowPositions = new Float32Array(snowCount * 3);
      var snowVelocities = new Float32Array(snowCount * 3);
      var snowPhases = new Float32Array(snowCount); // For sine-wave movement

      // Initialize snow particles
      for (var j = 0; j < snowCount; j++) {
        var jdx = j * 3;
        snowPositions[jdx] = (Math.random() - 0.5) * 120;     // x
        snowPositions[jdx + 1] = Math.random() * 100 + 20;    // y
        snowPositions[jdx + 2] = (Math.random() - 0.5) * 120; // z

        // Velocities: slow downward
        snowVelocities[jdx] = 0;                              // x (handled by sine wave)
        snowVelocities[jdx + 1] = -0.15 - Math.random() * 0.1; // y fall speed
        snowVelocities[jdx + 2] = 0;                          // z (handled by sine wave)

        snowPhases[j] = Math.random() * Math.PI * 2;
      }

      snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPositions, 3));
      snowGeo.userData.velocities = snowVelocities;
      snowGeo.userData.phases = snowPhases;

      var snowMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.25,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
      });

      weatherParticles = new THREE.Points(snowGeo, snowMat);
      weatherParticles.userData.type = 'snow';
      sceneCtx.scene.add(weatherParticles);
    }
  }

  function updateWeatherEffects(sceneCtx, deltaTime, cameraPos) {
    if (!weatherParticles || !weatherParticles.geometry) return;

    var positions = weatherParticles.geometry.attributes.position.array;
    var velocities = weatherParticles.geometry.userData.velocities;
    var type = weatherParticles.userData.type;

    var camX = cameraPos.x || 0;
    var camY = cameraPos.y || 0;
    var camZ = cameraPos.z || 0;

    if (type === 'rain') {
      // Update rain particles
      for (var i = 0; i < positions.length / 3; i++) {
        var idx = i * 3;

        // Update position based on velocity
        positions[idx] += velocities[idx] * deltaTime;
        positions[idx + 1] += velocities[idx + 1] * deltaTime;
        positions[idx + 2] += velocities[idx + 2] * deltaTime;

        // Get ground height at particle position
        var groundHeight = terrainHeight(positions[idx], positions[idx + 2]);

        // Recycle particle if it hits the ground
        if (positions[idx + 1] < groundHeight) {
          // Respawn near camera
          positions[idx] = camX + (Math.random() - 0.5) * 100;
          positions[idx + 1] = camY + Math.random() * 40 + 20;
          positions[idx + 2] = camZ + (Math.random() - 0.5) * 100;

          // Randomize drift slightly
          velocities[idx] = (Math.random() - 0.5) * 0.5;
          velocities[idx + 2] = (Math.random() - 0.5) * 0.5;
        }

        // Keep particles centered around camera
        var dx = positions[idx] - camX;
        var dz = positions[idx + 2] - camZ;
        if (Math.abs(dx) > 60 || Math.abs(dz) > 60) {
          positions[idx] = camX + (Math.random() - 0.5) * 100;
          positions[idx + 1] = camY + Math.random() * 40 + 20;
          positions[idx + 2] = camZ + (Math.random() - 0.5) * 100;
        }
      }

    } else if (type === 'snow') {
      var phases = weatherParticles.geometry.userData.phases;
      var time = Date.now() * 0.001;

      // Update snow particles
      for (var j = 0; j < positions.length / 3; j++) {
        var jdx = j * 3;

        // Sine wave horizontal movement
        var sineX = Math.sin(time * 0.5 + phases[j]) * 0.3;
        var sineZ = Math.cos(time * 0.5 + phases[j] * 1.3) * 0.3;

        positions[jdx] += (velocities[jdx] + sineX) * deltaTime;
        positions[jdx + 1] += velocities[jdx + 1] * deltaTime;
        positions[jdx + 2] += (velocities[jdx + 2] + sineZ) * deltaTime;

        // Get ground height at particle position
        var snowGroundHeight = terrainHeight(positions[jdx], positions[jdx + 2]);

        // Recycle particle if it hits the ground
        if (positions[jdx + 1] < snowGroundHeight) {
          positions[jdx] = camX + (Math.random() - 0.5) * 120;
          positions[jdx + 1] = camY + Math.random() * 50 + 30;
          positions[jdx + 2] = camZ + (Math.random() - 0.5) * 120;
          phases[j] = Math.random() * Math.PI * 2;
        }

        // Keep particles centered around camera
        var sdx = positions[jdx] - camX;
        var sdz = positions[jdx + 2] - camZ;
        if (Math.abs(sdx) > 70 || Math.abs(sdz) > 70) {
          positions[jdx] = camX + (Math.random() - 0.5) * 120;
          positions[jdx + 1] = camY + Math.random() * 50 + 30;
          positions[jdx + 2] = camZ + (Math.random() - 0.5) * 120;
        }
      }
    }

    weatherParticles.geometry.attributes.position.needsUpdate = true;
  }

  // ========================================================================
  // WATER SYSTEM — Animated water bodies for zones
  // ========================================================================

  var waterBodies = [];
  var waterTime = 0;

  function initWater(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;
    var scene = sceneCtx.scene;

    // Clear any existing water bodies
    for (var i = 0; i < waterBodies.length; i++) {
      scene.remove(waterBodies[i].mesh);
      if (waterBodies[i].geometry) waterBodies[i].geometry.dispose();
      if (waterBodies[i].material) waterBodies[i].material.dispose();
    }
    waterBodies = [];

    // Gardens: Central pond/lake (~30 unit radius)
    var gardensPond = createWaterBody({
      type: 'circle',
      centerX: ZONES.gardens.cx,
      centerZ: ZONES.gardens.cz,
      radius: 30,
      height: ZONES.gardens.baseHeight + 0.3,
      segments: 64,
      waveSpeed: 0.8,
      waveHeight: 0.15,
      waveFrequency: 0.3
    });
    scene.add(gardensPond.mesh);
    waterBodies.push(gardensPond);

    // Wilds: Flowing river (~10 unit wide, winding through zone)
    // Create river as a series of connected segments
    var riverSegments = createRiverPath(ZONES.wilds.cx, ZONES.wilds.cz, ZONES.wilds.radius);
    for (var j = 0; j < riverSegments.length; j++) {
      var riverSegment = createWaterBody({
        type: 'river',
        centerX: riverSegments[j].x,
        centerZ: riverSegments[j].z,
        width: 10,
        length: riverSegments[j].length,
        rotation: riverSegments[j].rotation,
        height: ZONES.wilds.baseHeight + 0.2,
        segments: 64,
        waveSpeed: 1.2,
        waveHeight: 0.2,
        waveFrequency: 0.5,
        flowDirection: riverSegments[j].direction
      });
      scene.add(riverSegment.mesh);
      waterBodies.push(riverSegment);
    }

    // Nexus: Decorative fountain pool (~8 unit radius)
    var nexusFountain = createWaterBody({
      type: 'circle',
      centerX: ZONES.nexus.cx,
      centerZ: ZONES.nexus.cz,
      radius: 8,
      height: ZONES.nexus.baseHeight + 0.5,
      segments: 64,
      waveSpeed: 1.5,
      waveHeight: 0.1,
      waveFrequency: 0.8
    });
    scene.add(nexusFountain.mesh);
    waterBodies.push(nexusFountain);
  }

  function createWaterBody(config) {
    var geometry, material, mesh;
    var segments = config.segments || 64;

    // Create geometry based on type
    if (config.type === 'circle') {
      geometry = new THREE.PlaneGeometry(config.radius * 2, config.radius * 2, segments, segments);
    } else if (config.type === 'river') {
      geometry = new THREE.PlaneGeometry(config.length, config.width, segments, segments);
    }

    // Rotate to be horizontal
    geometry.rotateX(-Math.PI / 2);

    // Position the geometry
    geometry.translate(config.centerX, config.height, config.centerZ);

    // Apply rotation for river segments
    if (config.rotation) {
      var tempGeom = new THREE.PlaneGeometry(config.length, config.width, segments, segments);
      tempGeom.rotateX(-Math.PI / 2);
      tempGeom.rotateY(config.rotation);
      tempGeom.translate(config.centerX, config.height, config.centerZ);
      geometry = tempGeom;
    }

    // Store initial vertex positions for animation
    var positions = geometry.attributes.position.array;
    var initialPositions = new Float32Array(positions.length);
    for (var i = 0; i < positions.length; i++) {
      initialPositions[i] = positions[i];
    }

    // Create water material
    material = new THREE.MeshPhongMaterial({
      color: 0x2266aa,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      shininess: 80,
      specular: 0x88aaff
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = false;
    mesh.castShadow = false;

    // Store config and initial positions for animation
    return {
      mesh: mesh,
      geometry: geometry,
      material: material,
      initialPositions: initialPositions,
      config: config
    };
  }

  function createRiverPath(centerX, centerZ, zoneRadius) {
    // Create a winding river path through the Wilds zone
    var segments = [];
    var segmentLength = 25;
    var numSegments = 6;

    // Start from northwest side of zone
    var startX = centerX - zoneRadius * 0.6;
    var startZ = centerZ - zoneRadius * 0.7;

    // Create winding path
    var currentX = startX;
    var currentZ = startZ;
    var currentAngle = Math.PI * 0.3; // Initial direction (southeast)

    for (var i = 0; i < numSegments; i++) {
      // Calculate segment endpoint
      var nextX = currentX + Math.cos(currentAngle) * segmentLength;
      var nextZ = currentZ + Math.sin(currentAngle) * segmentLength;

      // Segment center point
      var segX = (currentX + nextX) / 2;
      var segZ = (currentZ + nextZ) / 2;

      segments.push({
        x: segX,
        z: segZ,
        length: segmentLength,
        rotation: currentAngle,
        direction: { x: Math.cos(currentAngle), z: Math.sin(currentAngle) }
      });

      // Update position and add some curve variation
      currentX = nextX;
      currentZ = nextZ;
      currentAngle += (Math.random() - 0.5) * 0.6; // Random curve
    }

    return segments;
  }

  function updateWater(deltaTime) {
    if (!waterBodies || waterBodies.length === 0) return;

    waterTime += deltaTime;

    for (var i = 0; i < waterBodies.length; i++) {
      var water = waterBodies[i];
      if (!water || !water.geometry || !water.initialPositions) continue;

      var positions = water.geometry.attributes.position.array;
      var initialPos = water.initialPositions;
      var config = water.config;

      var waveSpeed = config.waveSpeed || 1.0;
      var waveHeight = config.waveHeight || 0.2;
      var waveFrequency = config.waveFrequency || 0.5;

      // Animate vertices with sine waves
      for (var j = 0; j < positions.length; j += 3) {
        var x = initialPos[j];
        var y = initialPos[j + 1];
        var z = initialPos[j + 2];

        // Calculate distance from center for circular water bodies
        var distFromCenter = 0;
        if (config.type === 'circle') {
          var dx = x - config.centerX;
          var dz = z - config.centerZ;
          distFromCenter = Math.sqrt(dx * dx + dz * dz);

          // Radial ripples from center
          var ripple = Math.sin(distFromCenter * waveFrequency - waterTime * waveSpeed) * waveHeight;

          // Add secondary wave pattern
          var angle = Math.atan2(dz, dx);
          var secondaryWave = Math.sin(angle * 3 + waterTime * waveSpeed * 0.5) * waveHeight * 0.3;

          positions[j + 1] = y + ripple + secondaryWave;

          // Fade ripples near edge
          if (distFromCenter > config.radius * 0.8) {
            var fadeRatio = 1 - (distFromCenter - config.radius * 0.8) / (config.radius * 0.2);
            positions[j + 1] = y + (ripple + secondaryWave) * Math.max(0, fadeRatio);
          }
        } else if (config.type === 'river') {
          // Flowing river animation
          var flowDir = config.flowDirection || { x: 1, z: 0 };
          var flowComponent = (x - config.centerX) * flowDir.x + (z - config.centerZ) * flowDir.z;

          // Waves flowing in direction of river
          var flowWave = Math.sin(flowComponent * waveFrequency - waterTime * waveSpeed) * waveHeight;

          // Cross-river waves for more natural look
          var crossComponent = -(x - config.centerX) * flowDir.z + (z - config.centerZ) * flowDir.x;
          var crossWave = Math.sin(crossComponent * waveFrequency * 0.8 + waterTime * waveSpeed * 0.6) * waveHeight * 0.4;

          positions[j + 1] = y + flowWave + crossWave;
        }
      }

      water.geometry.attributes.position.needsUpdate = true;
      water.geometry.computeVertexNormals();
    }
  }

  // ========================================================================
  // SKYBOX / SKY DOME SYSTEM
  // ========================================================================

  function initSkybox(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;

    // Create sky dome with gradient colors using vertex colors
    var skyGeo = new THREE.SphereGeometry(800, 32, 32);

    // Add vertex colors for gradient (deep blue at top, orange/pink at horizon)
    var colors = [];
    var posArray = skyGeo.attributes.position.array;
    for (var i = 0; i < posArray.length; i += 3) {
      var y = posArray[i + 1];
      var normalizedY = (y + 800) / 1600; // 0 at bottom, 1 at top

      // Deep blue at top (y > 0.5), orange/pink at horizon (y < 0.5)
      var r, g, b;
      if (normalizedY > 0.5) {
        // Top half: deep blue
        var t = (normalizedY - 0.5) / 0.5;
        r = 0.02 + t * 0.1;
        g = 0.02 + t * 0.3;
        b = 0.2 + t * 0.6;
      } else {
        // Bottom half: gradient from orange/pink to blue
        var t = normalizedY / 0.5;
        r = 1.0 - t * 0.88;
        g = 0.42 - t * 0.1;
        b = 0.21 + t * 0.59;
      }

      colors.push(r, g, b);
    }

    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    var skyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: true,
      fog: false
    });
    skyDome = new THREE.Mesh(skyGeo, skyMat);
    sceneCtx.scene.add(skyDome);

    // Create starfield using THREE.Points
    var starGeo = new THREE.BufferGeometry();
    var starPos = [];
    var starSizes = [];

    for (var i = 0; i < 2000; i++) {
      // Random position on sphere (radius 750)
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.random() * Math.PI;
      var r = 750;

      var x = r * Math.sin(phi) * Math.cos(theta);
      var y = r * Math.cos(phi);
      var z = r * Math.sin(phi) * Math.sin(theta);

      starPos.push(x, y, z);

      // Varying sizes (0.3 - 1.5)
      starSizes.push(0.3 + Math.random() * 1.2);
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

    var starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.0,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.0,
      fog: false
    });

    stars = new THREE.Points(starGeo, starMat);
    sceneCtx.scene.add(stars);

    // Create Sun
    var sunGeo = new THREE.SphereGeometry(5, 16, 16);
    var sunMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      fog: false
    });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sceneCtx.scene.add(sunMesh);

    // Create Moon
    var moonGeo = new THREE.SphereGeometry(3, 16, 16);
    var moonMat = new THREE.MeshBasicMaterial({
      color: 0xccccdd,
      fog: false
    });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    sceneCtx.scene.add(moonMesh);
  }

  function updateSkybox(sceneCtx, worldTime) {
    if (!sceneCtx || !sceneCtx.camera) return;

    // Make sky dome follow camera position
    if (skyDome) {
      skyDome.position.copy(sceneCtx.camera.position);
    }

    // Update sun and moon positions based on worldTime
    // worldTime: 0-1440 (minutes in 24h cycle)
    // Noon (720) = sun overhead, Midnight (0/1440) = sun below horizon
    var normalizedTime = worldTime / 1440; // 0-1
    var sunAngle = normalizedTime * Math.PI * 2 - Math.PI / 2; // -PI/2 at midnight, PI/2 at noon

    if (sunMesh) {
      var sunRadius = 400;
      sunMesh.position.set(
        Math.cos(sunAngle) * sunRadius,
        Math.sin(sunAngle) * sunRadius,
        0
      );
      sunMesh.position.add(sceneCtx.camera.position);
    }

    if (moonMesh) {
      var moonRadius = 400;
      // Moon is opposite to sun
      var moonAngle = sunAngle + Math.PI;
      moonMesh.position.set(
        Math.cos(moonAngle) * moonRadius,
        Math.sin(moonAngle) * moonRadius,
        0
      );
      moonMesh.position.add(sceneCtx.camera.position);
    }

    // Update star visibility based on worldTime
    if (stars && stars.material) {
      // Night: worldTime 1080-1440 (18:00-24:00) and 0-360 (00:00-06:00)
      // Day: worldTime 360-1080 (06:00-18:00)
      var opacity = 0.0;

      if (worldTime >= 1080 && worldTime <= 1440) {
        // Evening to midnight (18:00-24:00)
        var t = (worldTime - 1080) / 360;
        opacity = Math.min(1.0, t * 2); // Fade in
      } else if (worldTime >= 0 && worldTime < 360) {
        // Midnight to dawn (00:00-06:00)
        var t = worldTime / 360;
        opacity = Math.max(0.0, 1.0 - t * 2); // Fade out
      } else if (worldTime >= 300 && worldTime < 420) {
        // Dawn fade out (05:00-07:00)
        var t = (worldTime - 300) / 120;
        opacity = Math.max(0.0, 1.0 - t);
      } else if (worldTime >= 1020 && worldTime < 1140) {
        // Dusk fade in (17:00-19:00)
        var t = (worldTime - 1020) / 120;
        opacity = Math.min(1.0, t);
      }

      stars.material.opacity = opacity;
      stars.material.transparent = true;

      // Make stars follow camera
      stars.position.copy(sceneCtx.camera.position);
    }
  }

  // ========================================================================
  // HARVESTABLE RESOURCE NODES
  // ========================================================================

  var resourceNodes = [];

  function initResourceNodes(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;

    addZoneResources(sceneCtx.scene, 'gardens', [
      { itemId: 'flower_rose', count: 8, radius: 30 },
      { itemId: 'flower_tulip', count: 10, radius: 35 },
      { itemId: 'flower_sunflower', count: 12, radius: 40 },
      { itemId: 'herb_lavender', count: 8, radius: 28 },
      { itemId: 'seed_wildflower', count: 6, radius: 25 }
    ]);

    addZoneResources(sceneCtx.scene, 'wilds', [
      { itemId: 'wood_oak', count: 15, radius: 45 },
      { itemId: 'wood_pine', count: 12, radius: 50 },
      { itemId: 'stone_common', count: 10, radius: 40 },
      { itemId: 'herb_ginseng', count: 5, radius: 35 },
      { itemId: 'crystal_clear', count: 4, radius: 30 },
      { itemId: 'food_mushroom', count: 8, radius: 38 },
      { itemId: 'food_berry', count: 10, radius: 42 }
    ]);

    addZoneResources(sceneCtx.scene, 'nexus', [
      { itemId: 'crystal_clear', count: 6, radius: 25 },
      { itemId: 'crystal_amethyst', count: 4, radius: 20 }
    ]);

    addZoneResources(sceneCtx.scene, 'studio', [
      { itemId: 'wood_mystical', count: 3, radius: 25 },
      { itemId: 'crystal_clear', count: 5, radius: 22 }
    ]);

    addZoneResources(sceneCtx.scene, 'commons', [
      { itemId: 'wood_oak', count: 8, radius: 25 },
      { itemId: 'stone_common', count: 6, radius: 23 }
    ]);

    addZoneResources(sceneCtx.scene, 'athenaeum', [
      { itemId: 'item_scroll', count: 10, radius: 28 }
    ]);

    addZoneResources(sceneCtx.scene, 'arena', [
      { itemId: 'item_trophy', count: 2, radius: 20 }
    ]);
  }

  function addZoneResources(scene, zoneId, resources) {
    var zone = ZONES[zoneId];
    if (!zone) return;

    resources.forEach(function(res) {
      for (var i = 0; i < res.count; i++) {
        var angle = seededRandom(zoneId.charCodeAt(0), i, res.itemId.charCodeAt(0)) * Math.PI * 2;
        var dist = seededRandom(zoneId.charCodeAt(1), i, res.itemId.charCodeAt(1)) * res.radius;
        var x = zone.cx + Math.cos(angle) * dist;
        var z = zone.cz + Math.sin(angle) * dist;

        var onPath = false;
        for (var pz in ZONES) {
          if (pz === 'nexus') continue;
          if (pointToSegDist(x, z, ZONES.nexus.cx, ZONES.nexus.cz, ZONES[pz].cx, ZONES[pz].cz) < 5) {
            onPath = true;
            break;
          }
        }
        if (onPath) continue;

        var distFromCenter = Math.sqrt((x - zone.cx) * (x - zone.cx) + (z - zone.cz) * (z - zone.cz));
        if (distFromCenter < zone.radius * 0.3) continue;

        var y = terrainHeight(x, z);
        createResourceNode(scene, x, y, z, res.itemId, zoneId);
      }
    });
  }

  function createResourceNode(scene, x, y, z, itemId, zone) {
    var Inventory = typeof window !== 'undefined' ? window.Inventory : null;
    if (!Inventory) return;

    var itemData = Inventory.getItemData(itemId);
    if (!itemData) return;

    var nodeGroup = new THREE.Group();
    var nodeMesh;

    if (itemData.type === 'wood') {
      var stumpGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8);
      var stumpMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      nodeMesh = new THREE.Mesh(stumpGeo, stumpMat);
      nodeMesh.position.y = 0.6;
      nodeGroup.add(nodeMesh);

      var leavesGeo = new THREE.SphereGeometry(0.5, 6, 6);
      var leavesMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50, transparent: true, opacity: 0.7 });
      var leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.y = 1.4;
      nodeGroup.add(leaves);

    } else if (itemData.type === 'stone') {
      var rockGeo = new THREE.DodecahedronGeometry(0.6, 0);
      var rockMat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
      nodeMesh = new THREE.Mesh(rockGeo, rockMat);
      nodeMesh.position.y = 0.4;
      nodeMesh.rotation.set(Math.random(), Math.random(), Math.random());
      nodeGroup.add(nodeMesh);

    } else if (itemData.type === 'crystal') {
      var crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
      var crystalColor = itemId === 'crystal_amethyst' ? 0x9C27B0 : (itemId === 'crystal_emerald' ? 0x4CAF50 : 0x00BCD4);
      var crystalMat = new THREE.MeshStandardMaterial({
        color: crystalColor,
        emissive: crystalColor,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8
      });
      nodeMesh = new THREE.Mesh(crystalGeo, crystalMat);
      nodeMesh.position.y = 0.7;
      nodeGroup.add(nodeMesh);

      var glowGeo = new THREE.SphereGeometry(0.3, 8, 8);
      var glowMat = new THREE.MeshBasicMaterial({ color: crystalColor, transparent: true, opacity: 0.3 });
      var glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.7;
      nodeGroup.add(glow);

      animatedObjects.push({ mesh: nodeMesh, type: 'crystal', params: { speed: 0.3, baseY: 0.7 } });

    } else if (itemData.type === 'flowers' || itemData.type === 'herbs') {
      var flowerGeo = new THREE.SphereGeometry(0.3, 6, 6);
      var flowerColors = {
        flower_rose: 0xFF1744, flower_tulip: 0xE91E63, flower_sunflower: 0xFFEB3B,
        flower_lotus: 0xE1BEE7, flower_cherry: 0xF8BBD0,
        herb_mint: 0x4CAF50, herb_sage: 0x66BB6A, herb_ginseng: 0xA1887F, herb_lavender: 0xCE93D8
      };
      var flowerColor = flowerColors[itemId] || 0x4CAF50;
      var flowerMat = new THREE.MeshStandardMaterial({ color: flowerColor });
      nodeMesh = new THREE.Mesh(flowerGeo, flowerMat);
      nodeMesh.position.y = 0.3;
      nodeGroup.add(nodeMesh);

      var stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4);
      var stemMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
      var stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.15;
      nodeGroup.add(stem);

    } else if (itemData.type === 'seeds') {
      var seedGeo = new THREE.SphereGeometry(0.2, 6, 6);
      var seedMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63 });
      nodeMesh = new THREE.Mesh(seedGeo, seedMat);
      nodeMesh.position.y = 0.2;
      nodeGroup.add(nodeMesh);

    } else if (itemData.type === 'food') {
      var foodGeo = new THREE.SphereGeometry(0.25, 6, 6);
      var foodColors = { food_mushroom: 0xD32F2F, food_berry: 0x7B1FA2 };
      var foodColor = foodColors[itemId] || 0x8D6E63;
      var foodMat = new THREE.MeshStandardMaterial({ color: foodColor });
      nodeMesh = new THREE.Mesh(foodGeo, foodMat);
      nodeMesh.position.y = 0.25;
      nodeGroup.add(nodeMesh);

    } else if (itemData.type === 'knowledge') {
      var scrollGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8);
      var scrollMat = new THREE.MeshStandardMaterial({ color: 0xFFF8DC });
      nodeMesh = new THREE.Mesh(scrollGeo, scrollMat);
      nodeMesh.position.y = 0.3;
      nodeMesh.rotation.z = Math.PI / 2;
      nodeGroup.add(nodeMesh);

    } else if (itemData.type === 'trophies') {
      var trophyGeo = new THREE.SphereGeometry(0.3, 8, 8);
      var trophyMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });
      nodeMesh = new THREE.Mesh(trophyGeo, trophyMat);
      nodeMesh.position.y = 0.5;
      nodeGroup.add(nodeMesh);

      var baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8);
      var baseMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      var base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.15;
      nodeGroup.add(base);

    } else {
      var genGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      var genMat = new THREE.MeshStandardMaterial({ color: 0xBDBDBD });
      nodeMesh = new THREE.Mesh(genGeo, genMat);
      nodeMesh.position.y = 0.2;
      nodeGroup.add(nodeMesh);
    }

    nodeGroup.position.set(x, y, z);
    nodeGroup.userData.isResource = true;
    nodeGroup.userData.itemId = itemId;
    nodeGroup.userData.depleted = false;
    nodeGroup.userData.respawnTime = 0;
    nodeGroup.userData.zone = zone;
    nodeGroup.userData.nodeMesh = nodeMesh;

    scene.add(nodeGroup);
    resourceNodes.push(nodeGroup);
  }

  function updateResourceNodes(deltaTime) {
    var currentTime = Date.now();

    resourceNodes.forEach(function(node) {
      if (node.userData.depleted) {
        if (currentTime >= node.userData.respawnTime) {
          node.userData.depleted = false;
          node.visible = true;

          if (node.userData.nodeMesh && node.userData.nodeMesh.material) {
            node.userData.nodeMesh.material.opacity = 1.0;
            node.userData.nodeMesh.material.transparent = false;
          }
        }
      }
    });
  }

  function harvestResource(node) {
    if (!node || !node.userData || !node.userData.isResource) return null;
    if (node.userData.depleted) return null;

    var itemId = node.userData.itemId;

    node.userData.depleted = true;
    node.userData.respawnTime = Date.now() + (30000 + Math.random() * 30000);

    if (node.userData.nodeMesh && node.userData.nodeMesh.material) {
      node.userData.nodeMesh.material.opacity = 0.3;
      node.userData.nodeMesh.material.transparent = true;
    }

    return itemId;
  }

  function getResourceNodeAtMouse(raycaster, camera, mouseX, mouseY) {
    raycaster.setFromCamera({ x: mouseX, y: mouseY }, camera);

    var intersects = raycaster.intersectObjects(resourceNodes, true);
    if (intersects.length > 0) {
      var obj = intersects[0].object;
      while (obj && !obj.userData.isResource) {
        obj = obj.parent;
      }
      return obj && obj.userData.isResource ? obj : null;
    }
    return null;
  }

  // ========================================================================
  // BUILD MODE — Visual building placement system
  // ========================================================================

  var buildMode = false;
  var buildType = 'bench';
  var buildGhost = null;
  var buildRotation = 0;
  var placedBuildings = [];

  // Simple buildable structure models
  function createBuildableModel(type) {
    var group = new THREE.Group();

    switch (type) {
      case 'bench':
        // Seat plank
        var seatGeo = new THREE.BoxGeometry(1.2, 0.1, 0.4);
        var woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
        var seat = new THREE.Mesh(seatGeo, woodMat);
        seat.position.y = 0.4;
        group.add(seat);
        // Legs
        for (var i = 0; i < 4; i++) {
          var legGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
          var leg = new THREE.Mesh(legGeo, woodMat);
          leg.position.x = (i % 2 === 0) ? -0.5 : 0.5;
          leg.position.z = (i < 2) ? -0.15 : 0.15;
          leg.position.y = 0.2;
          group.add(leg);
        }
        break;

      case 'lantern':
        // Post
        var postGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        var metalMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 });
        var post = new THREE.Mesh(postGeo, metalMat);
        post.position.y = 1;
        group.add(post);
        // Light box
        var lightGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);
        var lightMat = new THREE.MeshStandardMaterial({
          color: 0xffdd88,
          emissive: 0xffaa00,
          emissiveIntensity: 0.5,
          roughness: 0.3
        });
        var light = new THREE.Mesh(lightGeo, lightMat);
        light.position.y = 2.2;
        group.add(light);
        break;

      case 'signpost':
        // Post
        var signPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6);
        var signPostMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
        var signPost = new THREE.Mesh(signPostGeo, signPostMat);
        signPost.position.y = 0.75;
        group.add(signPost);
        // Sign board
        var boardGeo = new THREE.BoxGeometry(1, 0.4, 0.1);
        var boardMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.7 });
        var board = new THREE.Mesh(boardGeo, boardMat);
        board.position.y = 1.6;
        group.add(board);
        break;

      case 'fence':
        // Two posts
        var fencePostGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 6);
        var fencePostMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
        var post1 = new THREE.Mesh(fencePostGeo, fencePostMat);
        post1.position.set(-0.4, 0.5, 0);
        group.add(post1);
        var post2 = new THREE.Mesh(fencePostGeo, fencePostMat);
        post2.position.set(0.4, 0.5, 0);
        group.add(post2);
        // Horizontal bar
        var barGeo = new THREE.BoxGeometry(1, 0.08, 0.08);
        var bar = new THREE.Mesh(barGeo, fencePostMat);
        bar.position.y = 0.6;
        group.add(bar);
        break;

      case 'planter':
        // Box
        var planterGeo = new THREE.BoxGeometry(0.8, 0.4, 0.8);
        var planterMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
        var planter = new THREE.Mesh(planterGeo, planterMat);
        planter.position.y = 0.2;
        group.add(planter);
        // Green top (soil/plants)
        var soilGeo = new THREE.BoxGeometry(0.7, 0.1, 0.7);
        var soilMat = new THREE.MeshStandardMaterial({ color: 0x2d5016, roughness: 0.9 });
        var soil = new THREE.Mesh(soilGeo, soilMat);
        soil.position.y = 0.45;
        group.add(soil);
        break;

      case 'campfire':
        // Fire ring (stones)
        for (var j = 0; j < 8; j++) {
          var angle = (j / 8) * Math.PI * 2;
          var stoneGeo = new THREE.BoxGeometry(0.15, 0.1, 0.1);
          var stoneMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.95 });
          var stone = new THREE.Mesh(stoneGeo, stoneMat);
          stone.position.x = Math.cos(angle) * 0.35;
          stone.position.z = Math.sin(angle) * 0.35;
          stone.position.y = 0.05;
          stone.rotation.y = angle;
          group.add(stone);
        }
        // Fire glow
        var fireGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 6);
        var fireMat = new THREE.MeshStandardMaterial({
          color: 0xff6600,
          emissive: 0xff4400,
          emissiveIntensity: 0.8,
          roughness: 0.2
        });
        var fire = new THREE.Mesh(fireGeo, fireMat);
        fire.position.y = 0.2;
        group.add(fire);
        break;

      case 'archway':
        // Two pillars
        var pillarGeo = new THREE.BoxGeometry(0.3, 2.5, 0.3);
        var pillarMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.7 });
        var pillar1 = new THREE.Mesh(pillarGeo, pillarMat);
        pillar1.position.set(-0.8, 1.25, 0);
        group.add(pillar1);
        var pillar2 = new THREE.Mesh(pillarGeo, pillarMat);
        pillar2.position.set(0.8, 1.25, 0);
        group.add(pillar2);
        // Curved top (simplified as box)
        var archGeo = new THREE.BoxGeometry(1.9, 0.3, 0.3);
        var arch = new THREE.Mesh(archGeo, pillarMat);
        arch.position.y = 2.6;
        group.add(arch);
        break;

      case 'table':
        // Flat top
        var topGeo = new THREE.BoxGeometry(1.2, 0.1, 0.8);
        var tableMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
        var top = new THREE.Mesh(topGeo, tableMat);
        top.position.y = 0.7;
        group.add(top);
        // 4 legs
        for (var k = 0; k < 4; k++) {
          var tableLegGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6);
          var tableLeg = new THREE.Mesh(tableLegGeo, tableMat);
          tableLeg.position.x = (k % 2 === 0) ? -0.5 : 0.5;
          tableLeg.position.z = (k < 2) ? -0.3 : 0.3;
          tableLeg.position.y = 0.35;
          group.add(tableLeg);
        }
        break;

      case 'barrel':
        var barrelGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 12);
        var barrelMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 });
        var barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.y = 0.4;
        group.add(barrel);
        // Metal bands
        for (var m = 0; m < 2; m++) {
          var bandGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.05, 12);
          var bandMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.5 });
          var band = new THREE.Mesh(bandGeo, bandMat);
          band.position.y = 0.2 + m * 0.4;
          group.add(band);
        }
        break;

      case 'crate':
        var crateGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        var crateMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.9 });
        var crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.y = 0.3;
        group.add(crate);
        // Cross pattern
        var crossGeo1 = new THREE.BoxGeometry(0.05, 0.05, 0.7);
        var crossMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
        var cross1 = new THREE.Mesh(crossGeo1, crossMat);
        cross1.position.set(0, 0.3, 0);
        cross1.rotation.y = Math.PI / 4;
        group.add(cross1);
        var cross2 = new THREE.Mesh(crossGeo1, crossMat);
        cross2.position.set(0, 0.3, 0);
        cross2.rotation.y = -Math.PI / 4;
        group.add(cross2);
        break;

      default:
        // Fallback: simple cube
        var defaultGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        var defaultMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
        var defaultMesh = new THREE.Mesh(defaultGeo, defaultMat);
        defaultMesh.position.y = 0.25;
        group.add(defaultMesh);
    }

    return group;
  }

  function enterBuildMode(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;
    buildMode = true;
    buildRotation = 0;

    // Create ghost preview
    buildGhost = createBuildableModel(buildType);
    buildGhost.userData.isGhost = true;

    // Make all materials transparent
    buildGhost.traverse(function(child) {
      if (child.material) {
        var mat = child.material.clone();
        mat.transparent = true;
        mat.opacity = 0.5;
        mat.depthWrite = false;
        child.material = mat;
      }
    });

    sceneCtx.scene.add(buildGhost);
  }

  function exitBuildMode(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;
    buildMode = false;

    if (buildGhost) {
      sceneCtx.scene.remove(buildGhost);
      buildGhost.traverse(function(child) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      buildGhost = null;
    }
  }

  function setBuildType(type) {
    buildType = type;
    buildRotation = 0;
  }

  function confirmPlacement(sceneCtx, playerPos, zone) {
    if (!buildMode || !buildGhost || !sceneCtx || !sceneCtx.scene) return null;

    // Check if zone allows building
    var allowsBuild = (zone === 'commons' || zone === 'studio');
    if (!allowsBuild) {
      return { error: 'This zone does not allow building' };
    }

    // Get ghost position
    var pos = {
      x: buildGhost.position.x,
      y: buildGhost.position.y,
      z: buildGhost.position.z
    };

    // Create permanent structure
    var structure = createBuildableModel(buildType);
    structure.position.set(pos.x, pos.y, pos.z);
    structure.rotation.y = buildRotation;
    structure.userData.isBuilding = true;
    structure.userData.buildType = buildType;

    sceneCtx.scene.add(structure);

    // Track placement
    var placement = {
      type: buildType,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      rotation: buildRotation
    };
    placedBuildings.push(placement);
    lastPlacedMesh = structure;

    return placement;
  }

  var lastPlacedMesh = null;

  function removeLastPlaced(sceneCtx) {
    if (lastPlacedMesh && sceneCtx && sceneCtx.scene) {
      sceneCtx.scene.remove(lastPlacedMesh);
      placedBuildings.pop();
      lastPlacedMesh = null;
    }
  }

  function updateBuildPreview(sceneCtx, mouseX, mouseY, camera) {
    if (!buildMode || !buildGhost || !sceneCtx || !camera) return;

    // Create raycaster
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouse, camera);

    // Raycast onto ground plane (y=0 for simplicity, could use terrain height)
    var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var hitPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, hitPoint);

    if (hitPoint) {
      // Snap to 2-unit grid
      var snappedX = Math.round(hitPoint.x / 2) * 2;
      var snappedZ = Math.round(hitPoint.z / 2) * 2;

      // Get terrain height at this position
      var groundY = terrainHeight(snappedX, snappedZ);

      buildGhost.position.set(snappedX, groundY, snappedZ);
      buildGhost.rotation.y = buildRotation;

      // Check if placement is valid (in building zone)
      var buildZone = getZoneAtPosition(snappedX, snappedZ);
      var isValid = (buildZone === 'commons' || buildZone === 'studio');

      // Update ghost color (green if valid, red if invalid)
      buildGhost.traverse(function(child) {
        if (child.material && child.material.color) {
          if (isValid) {
            child.material.color.setHex(0x00ff00);
          } else {
            child.material.color.setHex(0xff0000);
          }
        }
      });
    }
  }

  function rotateBuildPreview(delta) {
    buildRotation += delta;
    if (buildGhost) {
      buildGhost.rotation.y = buildRotation;
    }
  }

  function getBuildMode() {
    return buildMode;
  }

  // ========================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ========================================================================

  // Track LOD state for objects
  var lodStates = new Map(); // objectId -> { level: 0/1/2, hiddenChildren: [] }

  // Object pools for particles
  var objectPools = {
    sphere: [],
    cube: [],
    cone: []
  };

  /**
   * Distance-based LOD for trees and structures
   * - distance > 200: hide completely
   * - distance > 100: simplify (hide small decorative pieces)
   * - distance < 100: full detail
   */
  function updateLOD(sceneCtx, playerPos) {
    if (!sceneCtx || !sceneCtx.scene || !playerPos) return;

    var scene = sceneCtx.scene;

    // Process all groups in scene with model_type userData
    scene.traverse(function(obj) {
      if (!obj.userData || !obj.userData.model_type) return;
      if (!(obj instanceof THREE.Group)) return;

      var objId = obj.uuid;
      var dx = obj.position.x - playerPos.x;
      var dz = obj.position.z - playerPos.z;
      var distance = Math.sqrt(dx * dx + dz * dz);

      var currentState = lodStates.get(objId);
      var newLevel = 0;

      if (distance > 200) {
        newLevel = 2; // hidden
      } else if (distance > 100) {
        newLevel = 1; // simplified
      } else {
        newLevel = 0; // full detail
      }

      // Only update if LOD level changed
      if (!currentState || currentState.level !== newLevel) {
        if (newLevel === 2) {
          // Hide completely
          obj.visible = false;
        } else if (newLevel === 1) {
          // Simplify: hide small meshes (low vertex count decorative pieces)
          obj.visible = true;
          var hiddenChildren = [];
          obj.traverse(function(child) {
            if (child instanceof THREE.Mesh && child !== obj) {
              var vertexCount = 0;
              if (child.geometry && child.geometry.attributes && child.geometry.attributes.position) {
                vertexCount = child.geometry.attributes.position.count;
              }
              // Hide meshes with fewer than 50 vertices (decorative details)
              if (vertexCount < 50 && child.visible) {
                child.visible = false;
                hiddenChildren.push(child);
              }
            }
          });
          lodStates.set(objId, { level: 1, hiddenChildren: hiddenChildren });
        } else {
          // Full detail: restore everything
          obj.visible = true;
          if (currentState && currentState.hiddenChildren) {
            for (var i = 0; i < currentState.hiddenChildren.length; i++) {
              currentState.hiddenChildren[i].visible = true;
            }
          }
          lodStates.set(objId, { level: 0, hiddenChildren: [] });
        }
      }
    });
  }

  /**
   * Frustum culling for animated objects and chunks
   * Sets userData.inFrustum flag to skip animation updates for objects outside view
   */
  function updateFrustumCulling(sceneCtx) {
    if (!sceneCtx || !sceneCtx.camera) return;

    var camera = sceneCtx.camera;
    camera.updateMatrixWorld();

    var frustum = new THREE.Frustum();
    var projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // Cull animated objects
    for (var i = 0; i < animatedObjects.length; i++) {
      var obj = animatedObjects[i];
      if (!obj.mesh) continue;

      var inFrustum = frustum.intersectsObject(obj.mesh);
      obj.mesh.userData.inFrustum = inFrustum;
    }

    // Cull chunks
    loadedChunks.forEach(function(chunkData, key) {
      if (!chunkData.group) return;
      var inFrustum = frustum.intersectsObject(chunkData.group);
      chunkData.group.userData.inFrustum = inFrustum;
    });
  }

  /**
   * Get object from pool (for particle systems)
   */
  function getFromPool(type) {
    var pool = objectPools[type];
    if (!pool) {
      objectPools[type] = [];
      pool = objectPools[type];
    }

    if (pool.length > 0) {
      var obj = pool.pop();
      obj.visible = true;
      return obj;
    }

    // Create new object if pool is empty
    var geometry, material, mesh;
    switch (type) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.1, 8, 8);
        material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geometry, material);
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geometry, material);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.1, 0.2, 8);
        material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geometry, material);
        break;
      default:
        geometry = new THREE.SphereGeometry(0.1, 8, 8);
        material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        mesh = new THREE.Mesh(geometry, material);
    }
    return mesh;
  }

  /**
   * Return object to pool
   */
  function returnToPool(type, object) {
    if (!object) return;

    var pool = objectPools[type];
    if (!pool) {
      objectPools[type] = [];
      pool = objectPools[type];
    }

    // Reset object state
    object.visible = false;
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);

    // Add to pool if not too large
    if (pool.length < 1000) {
      pool.push(object);
    } else {
      // Dispose if pool is full
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          for (var i = 0; i < object.material.length; i++) {
            object.material[i].dispose();
          }
        } else {
          object.material.dispose();
        }
      }
    }
  }

  /**
   * Get performance statistics
   */
  function getPerformanceStats() {
    var stats = {
      totalObjects: 0,
      visibleObjects: 0,
      activeAnimations: 0,
      loadedChunks: loadedChunks.size,
      estimatedTriangles: 0
    };

    // Count scene objects
    if (sceneContext && sceneContext.scene) {
      sceneContext.scene.traverse(function(obj) {
        stats.totalObjects++;
        if (obj.visible) {
          stats.visibleObjects++;
        }
        // Estimate triangles for meshes
        if (obj instanceof THREE.Mesh && obj.geometry) {
          if (obj.geometry.index) {
            stats.estimatedTriangles += obj.geometry.index.count / 3;
          } else if (obj.geometry.attributes && obj.geometry.attributes.position) {
            stats.estimatedTriangles += obj.geometry.attributes.position.count / 3;
          }
        }
      });
    }

    // Count active animations (objects in frustum)
    for (var i = 0; i < animatedObjects.length; i++) {
      if (animatedObjects[i].mesh && animatedObjects[i].mesh.userData.inFrustum !== false) {
        stats.activeAnimations++;
      }
    }

    stats.estimatedTriangles = Math.floor(stats.estimatedTriangles);

    return stats;
  }

  // ========================================================================
  // EXPORTS
  // ========================================================================

  exports.initScene = initScene;
  exports.loadZone = loadZone;
  exports.addPlayer = addPlayer;
  exports.movePlayer = movePlayer;
  exports.removePlayer = removePlayer;
  exports.updatePlayerAnimations = updatePlayerAnimations;
  exports.updateDayNight = updateDayNight;
  exports.updateWeather = updateWeather;
  exports.setWeather = setWeather;
  exports.updateWeatherEffects = updateWeatherEffects;
  exports.cullLights = cullLights;
  exports.updateAnimations = updateAnimations;
  exports.updateChunks = updateChunks;
  exports.getZoneAtPosition = getZoneAtPosition;
  exports.getTerrainHeight = getTerrainHeight;
  exports.getZoneCenter = getZoneCenter;
  exports.checkCollision = checkCollision;
  exports.getTexture = getTexture;
  exports.initParticles = initParticles;
  exports.updateParticles = updateParticles;
  exports.emitParticles = emitParticles;
  exports.initWater = initWater;
  exports.updateWater = updateWater;
  exports.initSkybox = initSkybox;
  exports.updateSkybox = updateSkybox;
  exports.initResourceNodes = initResourceNodes;
  exports.updateResourceNodes = updateResourceNodes;
  exports.harvestResource = harvestResource;
  exports.getResourceNodeAtMouse = getResourceNodeAtMouse;
  exports.ZONES = ZONES;
  exports.enterBuildMode = enterBuildMode;
  exports.exitBuildMode = exitBuildMode;
  exports.setBuildType = setBuildType;
  exports.confirmPlacement = confirmPlacement;
  exports.removeLastPlaced = removeLastPlaced;
  exports.updateBuildPreview = updateBuildPreview;
  exports.rotateBuildPreview = rotateBuildPreview;
  exports.getBuildMode = getBuildMode;
  exports.updateLOD = updateLOD;
  exports.updateFrustumCulling = updateFrustumCulling;
  exports.getFromPool = getFromPool;
  exports.returnToPool = returnToPool;
  exports.getPerformanceStats = getPerformanceStats;

})(typeof module !== 'undefined' ? module.exports : (window.World = {}));
