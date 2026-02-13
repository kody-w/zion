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
    var headGeo = new THREE.SphereGeometry(0.35, 10, 10);
    var headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    head.castShadow = false;
    player.add(head);

    var torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    var torsoMat = new THREE.MeshStandardMaterial({ color: color || 0x4169e1 });
    var torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.95;
    torso.castShadow = false;
    player.add(torso);

    var armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
    var armMat = new THREE.MeshStandardMaterial({ color: color || 0x4169e1 });
    var leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5, 0.95, 0);
    leftArm.castShadow = false;
    player.add(leftArm);
    var rightArm = new THREE.Mesh(armGeo, armMat.clone());
    rightArm.position.set(0.5, 0.95, 0);
    rightArm.castShadow = false;
    player.add(rightArm);

    var legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    var legMat = new THREE.MeshStandardMaterial({ color: 0x2f4f4f });
    var leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.2, 0.1, 0);
    leftLeg.castShadow = false;
    player.add(leftLeg);
    var rightLeg = new THREE.Mesh(legGeo, legMat.clone());
    rightLeg.position.set(0.2, 0.1, 0);
    rightLeg.castShadow = false;
    player.add(rightLeg);

    return player;
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
    sceneCtx.scene.add(mesh);

    // Name label
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
    label.position.y = 2.5;
    mesh.add(label);

    playerMeshes.set(playerId, { mesh: mesh, label: label });
  }

  function movePlayer(sceneCtx, playerId, position) {
    var data = playerMeshes.get(playerId);
    if (!data) return;
    var x = position.x || 0, z = position.z || 0;
    var y = terrainHeight(x, z);
    data.mesh.position.set(x, y, z);
  }

  function removePlayer(sceneCtx, playerId) {
    var data = playerMeshes.get(playerId);
    if (!data || !sceneCtx || !sceneCtx.scene) return;
    sceneCtx.scene.remove(data.mesh);
    playerMeshes.delete(playerId);
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
    if (sceneCtx.scene.fog) {
      sceneCtx.scene.fog.density = weatherType === 'rain' ? 0.0018 : 0.0012;
    }
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
  // EXPORTS
  // ========================================================================

  exports.initScene = initScene;
  exports.loadZone = loadZone;
  exports.addPlayer = addPlayer;
  exports.movePlayer = movePlayer;
  exports.removePlayer = removePlayer;
  exports.updateDayNight = updateDayNight;
  exports.updateWeather = updateWeather;
  exports.cullLights = cullLights;
  exports.updateAnimations = updateAnimations;
  exports.updateChunks = updateChunks;
  exports.getZoneAtPosition = getZoneAtPosition;
  exports.getTerrainHeight = getTerrainHeight;
  exports.getZoneCenter = getZoneCenter;
  exports.checkCollision = checkCollision;
  exports.getTexture = getTexture;
  exports.ZONES = ZONES;

})(typeof module !== 'undefined' ? module.exports : (window.World = {}));
