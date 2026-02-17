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

        // Set vertex position directly in XZ plane (y-up)
        positions[idx * 3] = j * step;     // local x
        positions[idx * 3 + 1] = h;        // height (y-up)
        positions[idx * 3 + 2] = i * step; // local z

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

    // ENHANCED DECORATIONS: Glowing central monument
    var monumentGeo = new THREE.CylinderGeometry(0.8, 1.2, 3, 8);
    var monumentMat = new THREE.MeshStandardMaterial({
      color: 0xb0b0d0,
      emissive: 0x5555aa,
      emissiveIntensity: 0.2,
      roughness: 0.5
    });
    var monument = new THREE.Mesh(monumentGeo, monumentMat);
    monument.position.set(z.cx + 6, y + 2.5, z.cz + 6);
    monument.castShadow = false;
    scene.add(monument);

    // Fountain particle effects (4 water jets)
    for (var j = 0; j < 4; j++) {
      var jAngle = (j / 4) * Math.PI * 2;
      var jx = z.cx + Math.cos(jAngle) * 2;
      var jz = z.cz + Math.sin(jAngle) * 2;
      var jetGeo = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8);
      var jetMat = new THREE.MeshStandardMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.6
      });
      var jet = new THREE.Mesh(jetGeo, jetMat);
      jet.position.set(jx, y + 2.5, jz);
      jet.castShadow = false;
      scene.add(jet);
      animatedObjects.push({ mesh: jet, type: 'water', params: { speed: 2 } });
    }

    // Decorative benches around perimeter
    for (var b = 0; b < 4; b++) {
      var bAngle = (b / 4) * Math.PI * 2 + Math.PI / 8;
      var bx = z.cx + Math.cos(bAngle) * 16;
      var bz = z.cz + Math.sin(bAngle) * 16;

      var benchGeo = new THREE.BoxGeometry(2.5, 0.3, 0.8);
      var benchMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
      var bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(bx, y + 0.4, bz);
      bench.rotation.y = bAngle + Math.PI / 2;
      bench.castShadow = false;
      scene.add(bench);

      // Bench legs
      for (var leg = -1; leg <= 1; leg += 2) {
        var legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6);
        var legMesh = new THREE.Mesh(legGeo, benchMat);
        legMesh.position.set(
          bx + Math.cos(bAngle + Math.PI / 2) * leg * 0.9,
          y + 0.2,
          bz + Math.sin(bAngle + Math.PI / 2) * leg * 0.9
        );
        legMesh.castShadow = false;
        scene.add(legMesh);
      }
    }

    // Knowledge orbs floating around
    for (var k = 0; k < 3; k++) {
      var kAngle = (k / 3) * Math.PI * 2;
      var kx = z.cx + Math.cos(kAngle) * 7;
      var kz = z.cz + Math.sin(kAngle) * 7;
      var orbGeo = new THREE.SphereGeometry(0.3, 12, 12);
      var orbMat = new THREE.MeshStandardMaterial({
        color: 0x8888ff,
        emissive: 0x6666cc,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
      });
      var orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(kx, y + 4 + k * 0.5, kz);
      orb.castShadow = false;
      scene.add(orb);
      animatedObjects.push({ mesh: orb, type: 'crystal', params: { speed: 0.4, baseY: y + 4 + k * 0.5 } });
    }
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

    // ENHANCED DECORATIONS: Seasonal growing plants (varied heights and colors)
    for (var sp = 0; sp < 12; sp++) {
      var spAngle = (sp / 12) * Math.PI * 2 + 0.2;
      var spRadius = 12 + (sp % 3) * 6;
      var spx = z.cx + Math.cos(spAngle) * spRadius;
      var spz = z.cz + Math.sin(spAngle) * spRadius;

      var plantHeight = 0.5 + seededRandom(sp, 10, 1) * 1.5;
      var plantGeo = new THREE.ConeGeometry(0.3, plantHeight, 6);
      var plantColors = [0x66bb6a, 0x81c784, 0xa5d6a7, 0x4caf50, 0x8bc34a];
      var plantMat = new THREE.MeshStandardMaterial({
        color: plantColors[sp % plantColors.length]
      });
      var plant = new THREE.Mesh(plantGeo, plantMat);
      plant.position.set(spx, y + plantHeight / 2, spz);
      plant.castShadow = false;
      scene.add(plant);
    }

    // Butterfly particle effects (small glowing spheres that float around)
    for (var bf = 0; bf < 8; bf++) {
      var bfAngle = (bf / 8) * Math.PI * 2;
      var bfx = z.cx + Math.cos(bfAngle) * (15 + bf % 3 * 5);
      var bfz = z.cz + Math.sin(bfAngle) * (15 + bf % 3 * 5);
      var butterflyGeo = new THREE.SphereGeometry(0.15, 6, 6);
      var butterflyMat = new THREE.MeshStandardMaterial({
        color: bf % 2 === 0 ? 0xffeb3b : 0xff69b4,
        emissive: bf % 2 === 0 ? 0xffeb3b : 0xff69b4,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7
      });
      var butterfly = new THREE.Mesh(butterflyGeo, butterflyMat);
      butterfly.position.set(bfx, y + 1.5 + bf * 0.2, bfz);
      butterfly.castShadow = false;
      scene.add(butterfly);
      animatedObjects.push({
        mesh: butterfly,
        type: 'crystal',
        params: { speed: 0.5 + bf * 0.1, baseY: y + 1.5 + bf * 0.2 }
      });
    }

    // Garden archways (decorative trellises)
    for (var ga = 0; ga < 4; ga++) {
      var gaAngle = (ga / 4) * Math.PI * 2;
      var gax = z.cx + Math.cos(gaAngle) * 25;
      var gaz = z.cz + Math.sin(gaAngle) * 25;

      // Two posts
      for (var side = -1; side <= 1; side += 2) {
        var postGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 8);
        var postMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        var post = new THREE.Mesh(postGeo, postMat);
        var perpAngle = gaAngle + Math.PI / 2;
        post.position.set(
          gax + Math.cos(perpAngle) * side * 1.5,
          y + 1.5,
          gaz + Math.sin(perpAngle) * side * 1.5
        );
        post.castShadow = false;
        scene.add(post);
      }

      // Top beam
      var beamGeo = new THREE.BoxGeometry(3.5, 0.2, 0.2);
      var beamMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      var beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(gax, y + 3.2, gaz);
      beam.rotation.y = gaAngle + Math.PI / 2;
      beam.castShadow = false;
      scene.add(beam);

      // Vines on archway
      var vineGeo = new THREE.TorusGeometry(0.8, 0.08, 6, 12);
      var vineMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
      var vine = new THREE.Mesh(vineGeo, vineMat);
      vine.position.set(gax, y + 2.8, gaz);
      vine.rotation.x = Math.PI / 2;
      vine.castShadow = false;
      scene.add(vine);
    }

    // Stone pathways markers
    for (var pm = 0; pm < 6; pm++) {
      var pmAngle = (pm / 6) * Math.PI * 2;
      var pmx = z.cx + Math.cos(pmAngle) * 18;
      var pmz = z.cz + Math.sin(pmAngle) * 18;
      var markerGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8);
      var markerMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e });
      var marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(pmx, y + 0.15, pmz);
      marker.castShadow = false;
      scene.add(marker);
    }
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

    // ENHANCED DECORATIONS: Floating book particles
    for (var fb = 0; fb < 10; fb++) {
      var fbAngle = (fb / 10) * Math.PI * 2;
      var fbRadius = 8 + (fb % 3) * 3;
      var fbx = z.cx + Math.cos(fbAngle) * fbRadius;
      var fbz = z.cz + Math.sin(fbAngle) * fbRadius;
      var bookGeo = new THREE.BoxGeometry(0.2, 0.3, 0.05);
      var bookMat = new THREE.MeshStandardMaterial({
        color: [0x8b4513, 0x5d4037, 0x3e2723][fb % 3],
        emissive: 0x4a2511,
        emissiveIntensity: 0.1
      });
      var book = new THREE.Mesh(bookGeo, bookMat);
      book.position.set(fbx, y + 5 + fb * 0.3, fbz);
      book.rotation.y = fbAngle;
      book.rotation.x = Math.PI / 6;
      book.castShadow = false;
      scene.add(book);
      animatedObjects.push({
        mesh: book,
        type: 'crystal',
        params: { speed: 0.2, baseY: y + 5 + fb * 0.3 }
      });
    }

    // Glowing knowledge orbs
    for (var ko = 0; ko < 6; ko++) {
      var koAngle = (ko / 6) * Math.PI * 2;
      var kox = z.cx + Math.cos(koAngle) * 6;
      var koz = z.cz + Math.sin(koAngle) * 6;
      var orbGeo = new THREE.SphereGeometry(0.25, 12, 12);
      var orbMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.7
      });
      var orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(kox, y + 6 + ko * 0.4, koz);
      orb.castShadow = false;
      scene.add(orb);
      animatedObjects.push({
        mesh: orb,
        type: 'crystal',
        params: { speed: 0.3, baseY: y + 6 + ko * 0.4 }
      });
    }

    // Reading desks
    for (var rd = 0; rd < 4; rd++) {
      var rdAngle = (rd / 4) * Math.PI * 2 + Math.PI / 4;
      var rdx = z.cx + Math.cos(rdAngle) * 12;
      var rdz = z.cz + Math.sin(rdAngle) * 12;
      var deskGeo = new THREE.BoxGeometry(2, 0.15, 1.2);
      var deskMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
      var desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.set(rdx, y + 0.8, rdz);
      desk.rotation.y = rdAngle;
      desk.castShadow = false;
      scene.add(desk);

      // Desk legs
      for (var dl = 0; dl < 4; dl++) {
        var dlx = rdx + Math.cos(rdAngle) * (dl < 2 ? -0.9 : 0.9) + Math.cos(rdAngle + Math.PI / 2) * (dl % 2 === 0 ? -0.5 : 0.5);
        var dlz = rdz + Math.sin(rdAngle) * (dl < 2 ? -0.9 : 0.9) + Math.sin(rdAngle + Math.PI / 2) * (dl % 2 === 0 ? -0.5 : 0.5);
        var legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6);
        var legMesh = new THREE.Mesh(legGeo, deskMat);
        legMesh.position.set(dlx, y + 0.4, dlz);
        legMesh.castShadow = false;
        scene.add(legMesh);
      }
    }

    // Decorative scrolls on pillars
    for (var sc = 0; sc < 6; sc++) {
      var scrollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
      var scrollMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3 });
      var scroll = new THREE.Mesh(scrollGeo, scrollMat);
      var scx = z.cx - 8 + sc * 3.2;
      scroll.position.set(scx, y + 6, z.cz + 8);
      scroll.rotation.z = Math.PI / 2;
      scroll.castShadow = false;
      scene.add(scroll);
    }

    // Ancient tome pedestals
    for (var tp = 0; tp < 3; tp++) {
      var tpx = z.cx + (tp - 1) * 5;
      var pedestalGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.2, 8);
      var pedestalMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e });
      var pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.set(tpx, y + 0.6, z.cz - 3);
      pedestal.castShadow = false;
      scene.add(pedestal);

      // Tome on pedestal
      var tomeGeo = new THREE.BoxGeometry(0.6, 0.15, 0.8);
      var tomeMat = new THREE.MeshStandardMaterial({
        color: 0x4a148c,
        emissive: 0x2a0a4c,
        emissiveIntensity: 0.2
      });
      var tome = new THREE.Mesh(tomeGeo, tomeMat);
      tome.position.set(tpx, y + 1.3, z.cz - 3);
      tome.rotation.y = Math.PI / 8;
      tome.castShadow = false;
      scene.add(tome);
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

    // ENHANCED DECORATIONS: Paint splatter decorations (colorful spheres on ground)
    for (var ps = 0; ps < 15; ps++) {
      var psAngle = (ps / 15) * Math.PI * 2;
      var psRadius = 5 + seededRandom(ps, 20, 1) * 10;
      var psx = z.cx + Math.cos(psAngle) * psRadius;
      var psz = z.cz + Math.sin(psAngle) * psRadius;
      var splatGeo = new THREE.SphereGeometry(0.2, 8, 8);
      var splatColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800, 0x8800ff];
      var splatMat = new THREE.MeshStandardMaterial({
        color: splatColors[ps % splatColors.length],
        emissive: splatColors[ps % splatColors.length],
        emissiveIntensity: 0.3
      });
      var splat = new THREE.Mesh(splatGeo, splatMat);
      splat.position.set(psx, y + 0.15, psz);
      splat.scale.y = 0.3;
      splat.castShadow = false;
      scene.add(splat);
    }

    // Easels around the zone
    for (var ea = 0; ea < 5; ea++) {
      var eaAngle = (ea / 5) * Math.PI * 2 + 0.2;
      var eax = z.cx + Math.cos(eaAngle) * 10;
      var eaz = z.cz + Math.sin(eaAngle) * 10;

      // Easel legs (tripod)
      for (var el = 0; el < 3; el++) {
        var elAngle = eaAngle + (el / 3) * Math.PI * 2;
        var legGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 6);
        var legMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        var leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(
          eax + Math.cos(elAngle) * 0.3,
          y + 1,
          eaz + Math.sin(elAngle) * 0.3
        );
        leg.rotation.z = (el === 1 ? -0.2 : (el === 2 ? 0.2 : 0));
        leg.castShadow = false;
        scene.add(leg);
      }

      // Canvas
      var canvasGeo = new THREE.PlaneGeometry(1.2, 1.5);
      var canvasMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
      });
      var canvas = new THREE.Mesh(canvasGeo, canvasMat);
      canvas.position.set(eax, y + 1.8, eaz);
      canvas.rotation.y = eaAngle;
      canvas.castShadow = false;
      scene.add(canvas);
    }

    // Musical note particles (for musician artists)
    for (var mn = 0; mn < 6; mn++) {
      var mnAngle = (mn / 6) * Math.PI * 2;
      var mnx = z.cx + Math.cos(mnAngle) * 8;
      var mnz = z.cz + Math.sin(mnAngle) * 8;
      var noteGeo = new THREE.SphereGeometry(0.2, 8, 8);
      var noteMat = new THREE.MeshStandardMaterial({
        color: 0xff69b4,
        emissive: 0xff1493,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7
      });
      var note = new THREE.Mesh(noteGeo, noteMat);
      note.position.set(mnx, y + 3 + mn * 0.4, mnz);
      note.castShadow = false;
      scene.add(note);
      animatedObjects.push({
        mesh: note,
        type: 'crystal',
        params: { speed: 0.4 + mn * 0.1, baseY: y + 3 + mn * 0.4 }
      });
    }

    // Sculpture pedestals
    for (var sp = 0; sp < 3; sp++) {
      var spAngle = (sp / 3) * Math.PI * 2;
      var spx = z.cx + Math.cos(spAngle) * 18;
      var spz = z.cz + Math.sin(spAngle) * 18;
      var pedGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.5, 8);
      var pedMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e });
      var ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.set(spx, y + 0.75, spz);
      ped.castShadow = false;
      scene.add(ped);

      // Small sculpture on pedestal
      var miniSculpGeo = new THREE.TorusGeometry(0.4, 0.15, 8, 12);
      var miniSculpMat = new THREE.MeshStandardMaterial({
        color: [0xff9800, 0x9c27b0, 0x00bcd4][sp],
        emissive: [0xff9800, 0x9c27b0, 0x00bcd4][sp],
        emissiveIntensity: 0.2
      });
      var miniSculp = new THREE.Mesh(miniSculpGeo, miniSculpMat);
      miniSculp.position.set(spx, y + 1.8, spz);
      miniSculp.rotation.x = Math.PI / 4;
      miniSculp.castShadow = false;
      scene.add(miniSculp);
    }

    // Paint palettes on ground
    for (var pp = 0; pp < 4; pp++) {
      var ppx = z.cx + (pp % 2 === 0 ? -6 : 6);
      var ppz = z.cz + (pp < 2 ? -6 : 6);
      var paletteGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 8);
      var paletteMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
      var palette = new THREE.Mesh(paletteGeo, paletteMat);
      palette.position.set(ppx, y + 0.05, ppz);
      palette.castShadow = false;
      scene.add(palette);
    }
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

    // ENHANCED DECORATIONS: More varied trees (different sizes)
    for (var vt = 0; vt < 10; vt++) {
      var vtAngle = (vt / 10) * Math.PI * 2;
      var vtRadius = 20 + seededRandom(vt, 15, 1) * 15;
      var vtx = z.cx + Math.cos(vtAngle) * vtRadius;
      var vtz = z.cz + Math.sin(vtAngle) * vtRadius;
      var treeHeight = 3 + seededRandom(vt, 15, 2) * 4;

      // Trunk
      var trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, treeHeight, 8);
      var trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      var trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(vtx, y + treeHeight / 2, vtz);
      trunk.castShadow = false;
      scene.add(trunk);

      // Canopy
      var canopyGeo = new THREE.SphereGeometry(treeHeight * 0.5, 8, 8);
      var canopyMat = new THREE.MeshStandardMaterial({ color: 0x1a5e1a });
      var canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(vtx, y + treeHeight + treeHeight * 0.3, vtz);
      canopy.castShadow = false;
      scene.add(canopy);
    }

    // Animal tracks (small spheres in dirt)
    for (var at = 0; at < 20; at++) {
      var atAngle = (at / 20) * Math.PI * 2;
      var atRadius = 8 + (at % 5) * 3;
      var atx = z.cx + Math.cos(atAngle) * atRadius;
      var atz = z.cz + Math.sin(atAngle) * atRadius;
      var trackGeo = new THREE.SphereGeometry(0.12, 6, 6);
      var trackMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
      var track = new THREE.Mesh(trackGeo, trackMat);
      track.position.set(atx, y + 0.08, atz);
      track.scale.y = 0.3;
      track.castShadow = false;
      scene.add(track);
    }

    // Fog patches (semi-transparent spheres)
    for (var fg = 0; fg < 6; fg++) {
      var fgAngle = (fg / 6) * Math.PI * 2 + 0.3;
      var fgx = z.cx + Math.cos(fgAngle) * 12;
      var fgz = z.cz + Math.sin(fgAngle) * 12;
      var fogGeo = new THREE.SphereGeometry(2, 8, 8);
      var fogMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.2,
        emissive: 0xaaaaaa,
        emissiveIntensity: 0.1
      });
      var fog = new THREE.Mesh(fogGeo, fogMat);
      fog.position.set(fgx, y + 1, fgz);
      fog.scale.y = 0.4;
      fog.castShadow = false;
      scene.add(fog);
      animatedObjects.push({
        mesh: fog,
        type: 'water',
        params: { speed: 0.3 }
      });
    }

    // Wild mushroom clusters
    for (var wm = 0; wm < 12; wm++) {
      var wmAngle = (wm / 12) * Math.PI * 2;
      var wmRadius = 10 + (wm % 4) * 4;
      var wmx = z.cx + Math.cos(wmAngle) * wmRadius;
      var wmz = z.cz + Math.sin(wmAngle) * wmRadius;

      for (var mc = 0; mc < 3; mc++) {
        var mushroomCapGeo = new THREE.SphereGeometry(0.3, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        var mushroomMat = new THREE.MeshStandardMaterial({
          color: wm % 3 === 0 ? 0xff6b6b : (wm % 3 === 1 ? 0x4ecdc4 : 0xf7b731)
        });
        var mushroomCap = new THREE.Mesh(mushroomCapGeo, mushroomMat);
        mushroomCap.position.set(
          wmx + (mc - 1) * 0.4,
          y + 0.25 + mc * 0.05,
          wmz
        );
        mushroomCap.castShadow = false;
        scene.add(mushroomCap);

        var stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6);
        var stemMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
        var stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(
          wmx + (mc - 1) * 0.4,
          y + 0.1 + mc * 0.05,
          wmz
        );
        stem.castShadow = false;
        scene.add(stem);
      }
    }

    // Ancient vine-covered rocks
    for (var vr = 0; vr < 8; vr++) {
      var vrAngle = (vr / 8) * Math.PI * 2;
      var vrx = z.cx + Math.cos(vrAngle) * 18;
      var vrz = z.cz + Math.sin(vrAngle) * 18;
      var rockSize = 0.8 + seededRandom(vr, 25, 1) * 1.2;
      var vineRockGeo = new THREE.SphereGeometry(rockSize, 8, 8);
      var vineRockMat = new THREE.MeshStandardMaterial({ color: 0x3e6b3e });
      var vineRock = new THREE.Mesh(vineRockGeo, vineRockMat);
      vineRock.position.set(vrx, y + rockSize * 0.6, vrz);
      vineRock.scale.y = 0.7;
      vineRock.castShadow = false;
      scene.add(vineRock);
    }
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

    // ENHANCED DECORATIONS: Market stall awnings (already have tents, add rope decorations)
    for (var aw = 0; aw < 8; aw++) {
      var awx = z.cx + (aw % 4 - 1.5) * 8;
      var awz = z.cz + Math.floor(aw / 4) * 14 - 7;

      // Hanging lanterns
      for (var hl = -1; hl <= 1; hl += 2) {
        var lanternGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 6);
        var lanternMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 0.4
        });
        var lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(awx + hl * 2, y + 3.5, awz);
        lantern.castShadow = false;
        scene.add(lantern);

        // Rope
        var ropeGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6);
        var ropeMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        var rope = new THREE.Mesh(ropeGeo, ropeMat);
        rope.position.set(awx + hl * 2, y + 4.2, awz);
        rope.castShadow = false;
        scene.add(rope);
      }
    }

    // Trading goods displays (colorful items on counters)
    for (var tg = 0; tg < 8; tg++) {
      var tgx = z.cx + (tg % 4 - 1.5) * 8;
      var tgz = z.cz + Math.floor(tg / 4) * 14 - 7 + 2.5;

      // Display items (spheres and boxes)
      for (var di = 0; di < 3; di++) {
        var displayGeo = di % 2 === 0 ? new THREE.SphereGeometry(0.15, 8, 8) : new THREE.BoxGeometry(0.25, 0.25, 0.25);
        var displayColors = [0xff6b6b, 0x4ecdc4, 0xf7b731, 0x5f27cd, 0x00d2d3, 0xff9ff3];
        var displayMat = new THREE.MeshStandardMaterial({
          color: displayColors[(tg + di) % displayColors.length],
          emissive: displayColors[(tg + di) % displayColors.length],
          emissiveIntensity: 0.1
        });
        var display = new THREE.Mesh(displayGeo, displayMat);
        display.position.set(tgx + (di - 1) * 0.5, y + 1.15, tgz);
        display.castShadow = false;
        scene.add(display);
      }
    }

    // Barrels for storage
    for (var br = 0; br < 6; br++) {
      var brAngle = (br / 6) * Math.PI * 2;
      var brx = z.cx + Math.cos(brAngle) * 12;
      var brz = z.cz + Math.sin(brAngle) * 12;
      var barrelGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.2, 12);
      var barrelMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      var barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(brx, y + 0.6, brz);
      barrel.castShadow = false;
      scene.add(barrel);

      // Barrel bands
      for (var bb = 0; bb < 3; bb++) {
        var bandGeo = new THREE.TorusGeometry(0.55, 0.03, 6, 12);
        var bandMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        var band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(brx, y + 0.3 + bb * 0.4, brz);
        band.rotation.x = Math.PI / 2;
        band.castShadow = false;
        scene.add(band);
      }
    }

    // Decorative rugs under stalls
    for (var rg = 0; rg < 4; rg++) {
      var rgx = z.cx + (rg % 2 - 0.5) * 12;
      var rgz = z.cz + (rg < 2 ? -10 : 10);
      var rugGeo = new THREE.PlaneGeometry(5, 3);
      var rugColors = [0x8b0000, 0x006400, 0x00008b, 0x8b008b];
      var rugMat = new THREE.MeshStandardMaterial({
        color: rugColors[rg],
        side: THREE.DoubleSide
      });
      var rug = new THREE.Mesh(rugGeo, rugMat);
      rug.position.set(rgx, y + 0.02, rgz);
      rug.rotation.x = -Math.PI / 2;
      rug.castShadow = false;
      scene.add(rug);
    }

    // Signposts
    for (var sgn = 0; sgn < 4; sgn++) {
      var sgnAngle = (sgn / 4) * Math.PI * 2;
      var sgnx = z.cx + Math.cos(sgnAngle) * 20;
      var sgnz = z.cz + Math.sin(sgnAngle) * 20;

      // Post
      var postGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
      var postMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
      var post = new THREE.Mesh(postGeo, postMat);
      post.position.set(sgnx, y + 1.5, sgnz);
      post.castShadow = false;
      scene.add(post);

      // Sign
      var signGeo = new THREE.BoxGeometry(1.5, 0.5, 0.1);
      var signMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3 });
      var sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(sgnx, y + 3.2, sgnz);
      sign.rotation.y = sgnAngle;
      sign.castShadow = false;
      scene.add(sign);
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

    // ENHANCED DECORATIONS: Benches in gathering circles
    for (var bc = 0; bc < 6; bc++) {
      var bcAngle = (bc / 6) * Math.PI * 2;
      var bcx = z.cx + Math.cos(bcAngle) * 8;
      var bcz = z.cz + Math.sin(bcAngle) * 8;

      var benchGeo = new THREE.BoxGeometry(2, 0.3, 0.6);
      var benchMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
      var bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(bcx, y + 0.4, bcz);
      bench.rotation.y = bcAngle + Math.PI / 2;
      bench.castShadow = false;
      scene.add(bench);

      // Bench back
      var backGeo = new THREE.BoxGeometry(2, 0.8, 0.1);
      var back = new THREE.Mesh(backGeo, benchMat);
      back.position.set(
        bcx + Math.cos(bcAngle) * 0.35,
        y + 0.9,
        bcz + Math.sin(bcAngle) * 0.35
      );
      back.rotation.y = bcAngle + Math.PI / 2;
      back.castShadow = false;
      scene.add(back);

      // Bench legs
      for (var bl = -1; bl <= 1; bl += 2) {
        var legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6);
        var legMesh = new THREE.Mesh(legGeo, benchMat);
        legMesh.position.set(
          bcx + Math.cos(bcAngle + Math.PI / 2) * bl * 0.8,
          y + 0.2,
          bcz + Math.sin(bcAngle + Math.PI / 2) * bl * 0.8
        );
        legMesh.castShadow = false;
        scene.add(legMesh);
      }
    }

    // Gathering circles (stone rings)
    for (var gc = 0; gc < 2; gc++) {
      var gcx = z.cx + (gc === 0 ? -10 : 10);
      var gcz = z.cz;

      for (var gs = 0; gs < 10; gs++) {
        var gsAngle = (gs / 10) * Math.PI * 2;
        var stoneGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
        var stoneMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e });
        var stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(
          gcx + Math.cos(gsAngle) * 4,
          y + 0.15,
          gcz + Math.sin(gsAngle) * 4
        );
        stone.rotation.y = gsAngle;
        stone.castShadow = false;
        scene.add(stone);
      }
    }

    // Lantern strings connecting houses
    for (var ls = 0; ls < 8; ls++) {
      var lsAngle = (ls / 8) * Math.PI * 2;
      var lsx = z.cx + Math.cos(lsAngle) * 18;
      var lsz = z.cz + Math.sin(lsAngle) * 18;

      // Lanterns hanging from house eaves
      var hangLanternGeo = new THREE.SphereGeometry(0.2, 8, 8);
      var hangLanternMat = new THREE.MeshStandardMaterial({
        color: 0xffeb3b,
        emissive: 0xffc107,
        emissiveIntensity: 0.5
      });
      var hangLantern = new THREE.Mesh(hangLanternGeo, hangLanternMat);
      hangLantern.position.set(lsx, y + 4.5, lsz);
      hangLantern.castShadow = false;
      scene.add(hangLantern);
      animatedObjects.push({
        mesh: hangLantern,
        type: 'torch',
        params: { seed: ls * 100 }
      });

      // String to next house
      var nextAngle = ((ls + 1) / 8) * Math.PI * 2;
      var nextX = z.cx + Math.cos(nextAngle) * 18;
      var nextZ = z.cz + Math.sin(nextAngle) * 18;
      var stringLength = Math.sqrt(Math.pow(nextX - lsx, 2) + Math.pow(nextZ - lsz, 2));
      var stringGeo = new THREE.CylinderGeometry(0.02, 0.02, stringLength, 6);
      var stringMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
      var string = new THREE.Mesh(stringGeo, stringMat);
      string.position.set((lsx + nextX) / 2, y + 4.5, (lsz + nextZ) / 2);
      string.rotation.y = Math.atan2(nextZ - lsz, nextX - lsx);
      string.rotation.z = Math.PI / 2;
      string.castShadow = false;
      scene.add(string);
    }

    // Flower pots near houses
    for (var fp = 0; fp < 8; fp++) {
      var fpAngle = (fp / 8) * Math.PI * 2;
      var fpx = z.cx + Math.cos(fpAngle) * 16;
      var fpz = z.cz + Math.sin(fpAngle) * 16;

      var potGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8);
      var potMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      var pot = new THREE.Mesh(potGeo, potMat);
      pot.position.set(fpx, y + 0.25, fpz);
      pot.castShadow = false;
      scene.add(pot);

      // Flowers in pot
      var flowerGeo = new THREE.SphereGeometry(0.25, 6, 6);
      var flowerMat = new THREE.MeshStandardMaterial({
        color: [0xff6b9d, 0x4ecdc4, 0xf7b731][fp % 3]
      });
      var flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set(fpx, y + 0.6, fpz);
      flower.castShadow = false;
      scene.add(flower);
    }

    // Community notice board
    var boardPostGeo = new THREE.CylinderGeometry(0.12, 0.12, 3, 8);
    var boardPostMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
    var boardPost = new THREE.Mesh(boardPostGeo, boardPostMat);
    boardPost.position.set(z.cx + 5, y + 1.5, z.cz + 5);
    boardPost.castShadow = false;
    scene.add(boardPost);

    var boardGeo = new THREE.BoxGeometry(2.5, 2, 0.1);
    var boardMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
    var board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(z.cx + 5, y + 2.5, z.cz + 5);
    board.castShadow = false;
    scene.add(board);

    // Tool racks
    for (var tr = 0; tr < 2; tr++) {
      var trx = z.cx + (tr === 0 ? -12 : 12);
      var trz = z.cz + 8;

      var rackGeo = new THREE.BoxGeometry(1.5, 0.1, 0.3);
      var rackMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      var rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(trx, y + 1.5, trz);
      rack.castShadow = false;
      scene.add(rack);

      // Tools on rack (simplified as small boxes)
      for (var tl = 0; tl < 3; tl++) {
        var toolGeo = new THREE.BoxGeometry(0.1, 0.8, 0.05);
        var toolMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        var tool = new THREE.Mesh(toolGeo, toolMat);
        tool.position.set(trx + (tl - 1) * 0.4, y + 1.1, trz);
        tool.rotation.z = Math.PI / 6;
        tool.castShadow = false;
        scene.add(tool);
      }
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

    // ENHANCED DECORATIONS: Spectator banners
    for (var bn = 0; bn < 8; bn++) {
      var bnAngle = (bn / 8) * Math.PI * 2;
      var bnRadius = 28;
      var bnx = z.cx + Math.cos(bnAngle) * bnRadius;
      var bnz = z.cz + Math.sin(bnAngle) * bnRadius;

      // Banner pole
      var poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 8);
      var poleMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
      var pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(bnx, y + 2, bnz);
      pole.castShadow = false;
      scene.add(pole);

      // Banner cloth
      var bannerGeo = new THREE.PlaneGeometry(1.5, 2.5);
      var bannerColors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00];
      var bannerMat = new THREE.MeshStandardMaterial({
        color: bannerColors[bn % bannerColors.length],
        side: THREE.DoubleSide
      });
      var banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(bnx, y + 3, bnz);
      banner.rotation.y = bnAngle + Math.PI / 2;
      banner.castShadow = false;
      scene.add(banner);
    }

    // Torch brackets on seating tiers
    for (var tb = 0; tb < 16; tb++) {
      var tbAngle = (tb / 16) * Math.PI * 2;
      var tbRadius = 24;
      var tbx = z.cx + Math.cos(tbAngle) * tbRadius;
      var tbz = z.cz + Math.sin(tbAngle) * tbRadius;

      var bracketGeo = new THREE.BoxGeometry(0.3, 0.15, 0.3);
      var bracketMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
      var bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(tbx, y + 4, tbz);
      bracket.castShadow = false;
      scene.add(bracket);

      // Torch on bracket
      var torchGeo = new THREE.SphereGeometry(0.12, 6, 6);
      var torchMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff4400,
        emissiveIntensity: 0.8
      });
      var torch = new THREE.Mesh(torchGeo, torchMat);
      torch.position.set(tbx, y + 4.3, tbz);
      torch.castShadow = false;
      scene.add(torch);
      animatedObjects.push({
        mesh: torch,
        type: 'torch',
        params: { seed: tb * 200 }
      });
    }

    // Scoring boards (tall posts with platforms)
    for (var sb = 0; sb < 4; sb++) {
      var sbAngle = (sb / 4) * Math.PI * 2;
      var sbx = z.cx + Math.cos(sbAngle) * 30;
      var sbz = z.cz + Math.sin(sbAngle) * 30;

      // Post
      var scorePostGeo = new THREE.CylinderGeometry(0.2, 0.25, 6, 8);
      var scorePostMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
      var scorePost = new THREE.Mesh(scorePostGeo, scorePostMat);
      scorePost.position.set(sbx, y + 3, sbz);
      scorePost.castShadow = false;
      scene.add(scorePost);

      // Scoreboard
      var scoreBoardGeo = new THREE.BoxGeometry(2, 1.5, 0.2);
      var scoreBoardMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
      var scoreBoard = new THREE.Mesh(scoreBoardGeo, scoreBoardMat);
      scoreBoard.position.set(sbx, y + 6.5, sbz);
      scoreBoard.rotation.y = sbAngle + Math.PI;
      scoreBoard.castShadow = false;
      scene.add(scoreBoard);
    }

    // Training equipment (dummy posts)
    for (var te = 0; te < 4; te++) {
      var teAngle = (te / 4) * Math.PI * 2 + Math.PI / 8;
      var tex = z.cx + Math.cos(teAngle) * 10;
      var tez = z.cz + Math.sin(teAngle) * 10;

      // Post
      var dummyPostGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8);
      var dummyPostMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      var dummyPost = new THREE.Mesh(dummyPostGeo, dummyPostMat);
      dummyPost.position.set(tex, y + 1.25, tez);
      dummyPost.castShadow = false;
      scene.add(dummyPost);

      // Dummy head
      var dummyHeadGeo = new THREE.SphereGeometry(0.3, 8, 8);
      var dummyHeadMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      var dummyHead = new THREE.Mesh(dummyHeadGeo, dummyHeadMat);
      dummyHead.position.set(tex, y + 2.8, tez);
      dummyHead.castShadow = false;
      scene.add(dummyHead);

      // Crossbar arms
      for (var ca = -1; ca <= 1; ca += 2) {
        var armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
        var arm = new THREE.Mesh(armGeo, dummyPostMat);
        arm.position.set(tex + ca * 0.4, y + 2.2, tez);
        arm.rotation.z = Math.PI / 2;
        arm.castShadow = false;
        scene.add(arm);
      }
    }

    // Weapon racks
    for (var wr = 0; wr < 2; wr++) {
      var wrx = z.cx + (wr === 0 ? -14 : 14);
      var wrz = z.cz;

      var weaponRackGeo = new THREE.BoxGeometry(3, 0.15, 0.3);
      var weaponRackMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      var weaponRack = new THREE.Mesh(weaponRackGeo, weaponRackMat);
      weaponRack.position.set(wrx, y + 1.5, wrz);
      weaponRack.castShadow = false;
      scene.add(weaponRack);

      // Support posts
      for (var wp = -1; wp <= 1; wp += 2) {
        var wpGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6);
        var wpMesh = new THREE.Mesh(wpGeo, weaponRackMat);
        wpMesh.position.set(wrx + wp * 1.2, y + 0.75, wrz);
        wpMesh.castShadow = false;
        scene.add(wpMesh);
      }

      // Weapons on rack (simplified as sticks)
      for (var wn = 0; wn < 4; wn++) {
        var weaponGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6);
        var weaponMat = new THREE.MeshStandardMaterial({ color: 0x8b8b8b });
        var weapon = new THREE.Mesh(weaponGeo, weaponMat);
        weapon.position.set(wrx + (wn - 1.5) * 0.6, y + 0.9, wrz);
        weapon.rotation.z = Math.PI / 6;
        weapon.castShadow = false;
        scene.add(weapon);
      }
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

    // Spinning particle rings around portal
    var particleRings = [];
    var ringCount = 2;
    var particlesPerRing = 12;

    for (var r = 0; r < ringCount; r++) {
      var ringRadius = 2.8 + r * 0.4;
      var ringParticles = [];

      for (var p = 0; p < particlesPerRing; p++) {
        var particleGeo = new THREE.SphereGeometry(0.08, 6, 6);
        var particleMat = new THREE.MeshStandardMaterial({
          color: 0x88ffff,
          emissive: 0x44aaaa,
          emissiveIntensity: 0.8
        });
        var particle = new THREE.Mesh(particleGeo, particleMat);
        particle.castShadow = false;
        scene.add(particle);

        ringParticles.push({
          mesh: particle,
          angle: (p / particlesPerRing) * Math.PI * 2,
          radius: ringRadius
        });
      }

      particleRings.push({
        particles: ringParticles,
        speed: 0.001 + r * 0.0005,
        direction: r % 2 === 0 ? 1 : -1
      });
    }

    animatedObjects.push({
      mesh: arch, type: 'portal',
      params: {
        speed: 0.8,
        inner: inner,
        particleRings: particleRings,
        centerX: x,
        centerY: y + 3,
        centerZ: z
      }
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

    // Add exponential fog for atmospheric depth (matches weather system)
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0012);

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
    // Sync renderer background with fog to prevent visible horizon seam
    if (sceneCtx.renderer) sceneCtx.renderer.setClearColor(fogColor);
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
      // Tint ambient light by time of day
      var ambientColor;
      if (normalizedTime < 0.2) {
        // Night: cool blue tint
        ambientColor = 0x334466;
      } else if (normalizedTime < 0.3) {
        // Dawn: warm amber
        var dt = (normalizedTime - 0.2) / 0.1;
        ambientColor = lerpColor(0x334466, 0xffcc88, dt);
      } else if (normalizedTime < 0.7) {
        // Day: warm white
        var dt = (normalizedTime - 0.3) / 0.4;
        ambientColor = lerpColor(0xffcc88, 0xeeeedd, Math.min(dt * 2, 1.0));
      } else if (normalizedTime < 0.8) {
        // Dusk: warm orange
        var dt = (normalizedTime - 0.7) / 0.1;
        ambientColor = lerpColor(0xeeeedd, 0xff9966, dt);
      } else {
        // Evening to night: fade to blue
        var dt = (normalizedTime - 0.8) / 0.2;
        ambientColor = lerpColor(0xff9966, 0x334466, dt);
      }
      sceneCtx.ambientLight.color.setHex(ambientColor);
    }

    // Tint directional light (sunlight) color by time of day
    if (sceneCtx.directionalLight) {
      var sunColor;
      if (normalizedTime < 0.25) {
        sunColor = lerpColor(0x443355, 0xff8844, normalizedTime / 0.25);
      } else if (normalizedTime < 0.45) {
        sunColor = lerpColor(0xff8844, 0xffffff, (normalizedTime - 0.25) / 0.2);
      } else if (normalizedTime < 0.55) {
        sunColor = 0xffffff; // Bright noon
      } else if (normalizedTime < 0.75) {
        sunColor = lerpColor(0xffffff, 0xff6633, (normalizedTime - 0.55) / 0.2);
      } else {
        sunColor = lerpColor(0xff6633, 0x443355, (normalizedTime - 0.75) / 0.25);
      }
      sceneCtx.directionalLight.color.setHex(sunColor);
    }

    // Dynamic fog density by time of day
    if (sceneCtx.scene && sceneCtx.scene.fog && sceneCtx.scene.fog.density !== undefined) {
      var baseDensity = 0.0012; // Clear daytime default
      var timeFogMult = 1.0;

      if (normalizedTime < 0.2) {
        // Night: thicker fog, limited visibility
        timeFogMult = 1.8;
      } else if (normalizedTime < 0.28) {
        // Dawn: misty transition (thickest — morning mist)
        var dawnT = (normalizedTime - 0.2) / 0.08;
        timeFogMult = 1.8 + dawnT * 0.5; // peaks at 2.3 during dawn
      } else if (normalizedTime < 0.35) {
        // Morning: mist burning off
        var burnT = (normalizedTime - 0.28) / 0.07;
        timeFogMult = 2.3 - burnT * 1.3; // fades from 2.3 to 1.0
      } else if (normalizedTime < 0.7) {
        // Daytime: clearest visibility
        timeFogMult = 1.0;
      } else if (normalizedTime < 0.8) {
        // Dusk: golden haze
        var duskT = (normalizedTime - 0.7) / 0.1;
        timeFogMult = 1.0 + duskT * 0.5;
      } else {
        // Evening into night: fog thickens
        var nightT = (normalizedTime - 0.8) / 0.2;
        timeFogMult = 1.5 + nightT * 0.3;
      }

      // Only adjust fog if weather isn't overriding it
      if (currentWeatherType === 'clear' || !currentWeatherType) {
        sceneCtx.scene.fog.density = baseDensity * timeFogMult;
      }
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
          // Animate particle rings
          if (p.particleRings) {
            for (var ri = 0; ri < p.particleRings.length; ri++) {
              var ring = p.particleRings[ri];
              for (var pi = 0; pi < ring.particles.length; pi++) {
                var pData = ring.particles[pi];
                pData.angle += ring.speed * ring.direction * deltaTime;
                var px = p.centerX + Math.cos(pData.angle) * pData.radius;
                var pz = p.centerZ + Math.sin(pData.angle) * pData.radius;
                pData.mesh.position.set(px, p.centerY, pz);
              }
            }
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
    // Check against placed structures only (not zone centers, which are walkable)
    if (placedStructures) {
      for (var i = 0; i < placedStructures.length; i++) {
        var s = placedStructures[i];
        if (!s || !s.position) continue;
        var dx = x - s.position.x, dz = z - s.position.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        var structRadius = s.collisionRadius || 1.5;
        if (dist < structRadius + radius) {
          return true;
        }
      }
    }
    return false;
  }

  // ========================================================================
  // PLACED STRUCTURES (for collision)
  // ========================================================================

  var placedStructures = [];

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

    // Generate procedural particle texture (soft circle)
    var particleCanvas = document.createElement('canvas');
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    var pctx = particleCanvas.getContext('2d');
    var gradient = pctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = gradient;
    pctx.fillRect(0, 0, 32, 32);
    var particleTex = new THREE.CanvasTexture(particleCanvas);
    this.material.map = particleTex;

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
  var lightningTimer = 0;
  var lightningActive = false;
  var lightningLight = null;

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
    if (sceneCtx.scene.fog && sceneCtx.scene.fog.density !== undefined) {
      switch (type) {
        case 'storm':
          sceneCtx.scene.fog.density = 0.0030;
          break;
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

    } else if (type === 'storm') {
      // Storm: heavy rain + darker + lightning
      var stormCount = 3500;
      var stormGeo = new THREE.BufferGeometry();
      var stormPositions = new Float32Array(stormCount * 3);
      var stormVelocities = new Float32Array(stormCount * 3);

      for (var s = 0; s < stormCount; s++) {
        var sidx = s * 3;
        stormPositions[sidx] = (Math.random() - 0.5) * 120;
        stormPositions[sidx + 1] = Math.random() * 80 + 20;
        stormPositions[sidx + 2] = (Math.random() - 0.5) * 120;

        stormVelocities[sidx] = (Math.random() - 0.5) * 1.5;       // stronger wind
        stormVelocities[sidx + 1] = -1.2 - Math.random() * 0.6;    // faster rain
        stormVelocities[sidx + 2] = (Math.random() - 0.5) * 1.5;
      }

      stormGeo.setAttribute('position', new THREE.Float32BufferAttribute(stormPositions, 3));
      stormGeo.userData.velocities = stormVelocities;

      var stormMat = new THREE.PointsMaterial({
        color: 0x8899bb,
        size: 0.18,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      });

      weatherParticles = new THREE.Points(stormGeo, stormMat);
      weatherParticles.userData.type = 'rain'; // reuse rain update logic
      sceneCtx.scene.add(weatherParticles);

      // Create lightning light (initially off)
      if (!lightningLight) {
        lightningLight = new THREE.PointLight(0xeeeeff, 0, 200);
        lightningLight.position.set(0, 50, 0);
        sceneCtx.scene.add(lightningLight);
      }
      lightningTimer = 0;
      lightningActive = false;

      // Darken ambient for storm
      if (sceneCtx.ambientLight) {
        sceneCtx.ambientLight.intensity = Math.max(0.15, sceneCtx.ambientLight.intensity * 0.6);
      }

    } else if (type === 'cloudy') {
      // Cloudy: dim the lights slightly
      if (sceneCtx.ambientLight) {
        sceneCtx.ambientLight.intensity = Math.max(0.25, sceneCtx.ambientLight.intensity * 0.8);
      }
      if (sceneCtx.directionalLight) {
        sceneCtx.directionalLight.intensity = Math.max(0.2, sceneCtx.directionalLight.intensity * 0.7);
      }
    } else {
      // Clear: remove lightning light if it exists
      if (lightningLight && sceneCtx.scene) {
        sceneCtx.scene.remove(lightningLight);
        lightningLight = null;
      }
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

    // Lightning flash logic for storms
    if (lightningLight && weatherParticles.userData.type === 'rain') {
      lightningTimer += deltaTime;

      if (lightningActive) {
        // Flash is happening — fade out over 150ms
        lightningLight.intensity *= 0.85;
        if (lightningLight.intensity < 0.05) {
          lightningLight.intensity = 0;
          lightningActive = false;
          lightningTimer = 0;
        }
      } else {
        // Wait for next flash (random interval 3-8 seconds)
        var flashInterval = 3000 + Math.random() * 5000;
        if (lightningTimer > flashInterval) {
          // Trigger lightning flash
          lightningActive = true;
          lightningLight.intensity = 2.5 + Math.random() * 1.5;
          lightningLight.position.set(
            (cameraPos.x || 0) + (Math.random() - 0.5) * 80,
            45 + Math.random() * 15,
            (cameraPos.z || 0) + (Math.random() - 0.5) * 80
          );
          lightningTimer = 0;
        }
      }
    }
  }

  function getCurrentWeather() {
    return currentWeatherType;
  }

  // ========================================================================
  // WATER SYSTEM — Animated water bodies for zones
  // ========================================================================

  var waterBodies = [];
  var waterTime = 0;
  var waterWeatherMultiplier = 1.0; // Modified by weather conditions

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

    // Gardens: Central pond/lake (~30 unit radius) - peaceful, clear water
    var gardensPond = createWaterBody({
      type: 'circle',
      centerX: ZONES.gardens.cx,
      centerZ: ZONES.gardens.cz,
      radius: 30,
      height: ZONES.gardens.baseHeight + 0.3,
      segments: 64,
      waveSpeed: 0.8,
      waveHeight: 0.2,
      waveFrequency: 0.3,
      color: 0x3388cc,
      emissive: 0x113355
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
        waveHeight: 0.25,
        waveFrequency: 0.5,
        flowDirection: riverSegments[j].direction,
        color: 0x2277bb,
        emissive: 0x0f2844
      });
      scene.add(riverSegment.mesh);
      waterBodies.push(riverSegment);
    }

    // Nexus: Decorative fountain pool (~8 unit radius) - magical, glowing water
    var nexusFountain = createWaterBody({
      type: 'circle',
      centerX: ZONES.nexus.cx,
      centerZ: ZONES.nexus.cz,
      radius: 8,
      height: ZONES.nexus.baseHeight + 0.5,
      segments: 64,
      waveSpeed: 1.5,
      waveHeight: 0.15,
      waveFrequency: 0.8,
      color: 0x4499dd,
      emissive: 0x225588
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

    // Create water material with enhanced visual properties
    var waterColor = config.color || 0x2266aa;
    var emissiveColor = config.emissive || 0x112244;

    material = new THREE.MeshPhongMaterial({
      color: waterColor,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      shininess: 100,
      specular: 0xaaddff,
      emissive: emissiveColor,
      emissiveIntensity: 0.15,
      reflectivity: 0.8
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

  function updateWater(deltaTime, weatherType) {
    if (!waterBodies || waterBodies.length === 0) return;

    waterTime += deltaTime;

    // Adjust water animation based on weather conditions
    var targetMultiplier = 1.0;
    if (weatherType === 'storm') {
      targetMultiplier = 2.5; // Much choppier waves during storms
    } else if (weatherType === 'rain') {
      targetMultiplier = 1.6; // Moderately rough during rain
    } else if (weatherType === 'snow') {
      targetMultiplier = 0.5; // Calmer, colder water
    }

    // Smoothly interpolate to target multiplier
    waterWeatherMultiplier += (targetMultiplier - waterWeatherMultiplier) * deltaTime * 0.5;

    for (var i = 0; i < waterBodies.length; i++) {
      var water = waterBodies[i];
      if (!water || !water.geometry || !water.initialPositions) continue;

      var positions = water.geometry.attributes.position.array;
      var initialPos = water.initialPositions;
      var config = water.config;

      var baseWaveSpeed = config.waveSpeed || 1.0;
      var baseWaveHeight = config.waveHeight || 0.2;
      var waveFrequency = config.waveFrequency || 0.5;

      // Apply weather multiplier to wave parameters
      var waveSpeed = baseWaveSpeed * waterWeatherMultiplier;
      var waveHeight = baseWaveHeight * waterWeatherMultiplier;

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

          // Multi-layered wave system for more realistic water
          // Primary radial ripples from center
          var ripple = Math.sin(distFromCenter * waveFrequency - waterTime * waveSpeed) * waveHeight;

          // Secondary angular wave pattern
          var angle = Math.atan2(dz, dx);
          var secondaryWave = Math.sin(angle * 3 + waterTime * waveSpeed * 0.5) * waveHeight * 0.3;

          // Tertiary detail waves for visual complexity
          var detailWave = Math.sin(x * 0.4 + waterTime * waveSpeed * 1.2) * waveHeight * 0.2 +
                           Math.sin(z * 0.3 + waterTime * waveSpeed * 0.9) * waveHeight * 0.2;

          // Random chop for storms
          var chopWave = 0;
          if (waterWeatherMultiplier > 1.5) {
            chopWave = Math.sin(x * 0.8 + z * 0.7 + waterTime * waveSpeed * 2.0) * waveHeight * 0.25;
          }

          positions[j + 1] = y + ripple + secondaryWave + detailWave + chopWave;

          // Fade ripples near edge for natural boundary
          if (distFromCenter > config.radius * 0.8) {
            var fadeRatio = 1 - (distFromCenter - config.radius * 0.8) / (config.radius * 0.2);
            positions[j + 1] = y + (ripple + secondaryWave + detailWave + chopWave) * Math.max(0, fadeRatio);
          }
        } else if (config.type === 'river') {
          // Flowing river animation with directional waves
          var flowDir = config.flowDirection || { x: 1, z: 0 };
          var flowComponent = (x - config.centerX) * flowDir.x + (z - config.centerZ) * flowDir.z;

          // Primary waves flowing in direction of river
          var flowWave = Math.sin(flowComponent * waveFrequency - waterTime * waveSpeed) * waveHeight;

          // Secondary flow wave at different frequency
          var flowWave2 = Math.sin(flowComponent * waveFrequency * 1.3 - waterTime * waveSpeed * 1.4) * waveHeight * 0.5;

          // Cross-river waves for more natural look
          var crossComponent = -(x - config.centerX) * flowDir.z + (z - config.centerZ) * flowDir.x;
          var crossWave = Math.sin(crossComponent * waveFrequency * 0.8 + waterTime * waveSpeed * 0.6) * waveHeight * 0.4;

          // Detail turbulence
          var turbulence = Math.sin(x * 0.5 + waterTime * waveSpeed * 1.8) * waveHeight * 0.15 +
                           Math.sin(z * 0.4 + waterTime * waveSpeed * 1.5) * waveHeight * 0.15;

          // Rapids effect during storms
          var rapids = 0;
          if (waterWeatherMultiplier > 1.5) {
            rapids = Math.sin(flowComponent * 1.2 - waterTime * waveSpeed * 3.0) * waveHeight * 0.3;
          }

          positions[j + 1] = y + flowWave + flowWave2 + crossWave + turbulence + rapids;
        }
      }

      water.geometry.attributes.position.needsUpdate = true;
      water.geometry.computeVertexNormals();

      // Update water material properties based on weather
      if (water.material) {
        // Adjust opacity based on weather (rougher water is more opaque)
        var targetOpacity = 0.65;
        if (weatherType === 'storm') {
          targetOpacity = 0.75; // Darker, choppier water
        } else if (weatherType === 'rain') {
          targetOpacity = 0.7;
        }
        water.material.opacity += (targetOpacity - water.material.opacity) * deltaTime * 0.5;

        // Adjust emissive intensity (calmer water glows more)
        var targetEmissive = 0.15;
        if (weatherType === 'storm') {
          targetEmissive = 0.08; // Less glow during storm
        } else if (weatherType === 'snow') {
          targetEmissive = 0.1; // Reduced glow in cold
        }
        if (water.material.emissiveIntensity !== undefined) {
          water.material.emissiveIntensity += (targetEmissive - water.material.emissiveIntensity) * deltaTime * 0.5;
        }
      }
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
      try {
        var inFrustum = frustum.intersectsObject(obj.mesh);
        obj.mesh.userData.inFrustum = inFrustum;
      } catch (e) {
        obj.mesh.userData.inFrustum = true; // default visible if check fails
      }
    }

    // Cull chunks
    loadedChunks.forEach(function(chunkData, key) {
      if (!chunkData.group) return;
      try {
        var inFrustum = frustum.intersectsObject(chunkData.group);
        chunkData.group.userData.inFrustum = inFrustum;
      } catch (e) {
        chunkData.group.userData.inFrustum = true;
      }
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

  // ========================================================================
  // INTERACTIVE OBJECTS SYSTEM
  // ========================================================================

  var interactiveObjects = [];
  var nextInteractiveId = 1;

  /**
   * Interactive objects definitions per zone
   */
  var INTERACTIVE_OBJECTS = {
    nexus: [
      { type: 'fountain', position: { x: 0, z: 0 }, action: 'water_source', message: 'The fountain sparkles with pure energy. You feel restored.' },
      { type: 'bulletin_board', position: { x: 15, z: 15 }, action: 'read_announcements', message: 'The bulletin board displays community announcements and events.' }
    ],
    gardens: [
      { type: 'garden_bench', position: { x: 200, z: 40 }, action: 'rest', message: 'You sit on the garden bench, surrounded by fragrant flowers. Your mood improves.' },
      { type: 'watering_well', position: { x: 210, z: 25 }, action: 'gather_water', message: 'The well provides fresh water for the gardens.' }
    ],
    athenaeum: [
      { type: 'reading_desk', position: { x: 100, z: -215 }, action: 'study', message: 'You settle in at the reading desk. Knowledge flows more easily here.' },
      { type: 'bookshelf', position: { x: 105, z: -225 }, action: 'access_lore', message: 'The bookshelf contains ancient tomes and scrolls of wisdom.' }
    ],
    wilds: [
      { type: 'campfire', position: { x: -30, z: 265 }, action: 'warmth_cooking', message: 'The campfire crackles warmly. A perfect spot for cooking and gathering.' },
      { type: 'fallen_log', position: { x: -25, z: 255 }, action: 'sit', message: 'You sit on the weathered log, taking in the wild surroundings.' }
    ],
    agora: [
      { type: 'market_stall', position: { x: -185, z: 120 }, action: 'browse_goods', message: 'The market stall displays various wares and goods for trade.' },
      { type: 'town_bell', position: { x: -190, z: 125 }, action: 'ring_bell', message: 'CLANG! The town bell rings out across the agora.' }
    ],
    commons: [
      { type: 'park_bench', position: { x: 170, z: 195 }, action: 'socialize', message: 'A comfortable bench, perfect for meeting with friends.' },
      { type: 'street_lamp', position: { x: 175, z: 185 }, action: 'light', message: 'The street lamp provides warm light in the evening hours.' }
    ],
    arena: [
      { type: 'training_dummy', position: { x: 5, z: -240 }, action: 'practice_combat', message: 'The training dummy stands ready. Time to practice your skills.' },
      { type: 'spectator_bench', position: { x: -5, z: -235 }, action: 'watch_fights', message: 'From here, you have a great view of the arena floor.' }
    ],
    studio: [
      { type: 'easel', position: { x: -200, z: -95 }, action: 'create_art', message: 'The easel stands ready. Your creativity flows here.' },
      { type: 'piano', position: { x: -205, z: -105 }, action: 'play_music', message: 'The piano is perfectly tuned. Music fills the studio.' }
    ]
  };

  /**
   * Create a 3D mesh for an interactive object
   */
  function createInteractiveObject(type, position) {
    var group = new THREE.Group();
    var baseY = getTerrainHeight(position.x, position.z) || 0;

    // Create different objects based on type
    if (type === 'garden_bench' || type === 'park_bench' || type === 'spectator_bench') {
      // Bench seat
      var seatGeo = new THREE.BoxGeometry(2.5, 0.3, 0.8);
      var benchMat = new THREE.MeshPhongMaterial({ color: 0x8d6e63 });
      var seat = new THREE.Mesh(seatGeo, benchMat);
      seat.position.set(0, 0.4, 0);
      seat.castShadow = true;
      group.add(seat);

      // Bench legs
      for (var i = -1; i <= 1; i += 2) {
        for (var j = -1; j <= 1; j += 2) {
          var legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
          var leg = new THREE.Mesh(legGeo, benchMat);
          leg.position.set(i * 1.0, 0.2, j * 0.3);
          leg.castShadow = true;
          group.add(leg);
        }
      }

      // Backrest
      var backGeo = new THREE.BoxGeometry(2.5, 0.8, 0.15);
      var back = new THREE.Mesh(backGeo, benchMat);
      back.position.set(0, 0.9, -0.4);
      back.castShadow = true;
      group.add(back);

    } else if (type === 'campfire') {
      // Fire pit stones
      var pitGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.3, 12);
      var stoneMat = new THREE.MeshPhongMaterial({ color: 0x808080 });
      var pit = new THREE.Mesh(pitGeo, stoneMat);
      pit.position.set(0, 0.15, 0);
      pit.castShadow = true;
      group.add(pit);

      // Logs arranged in cone
      var logMat = new THREE.MeshPhongMaterial({ color: 0x4a2511 });
      for (var l = 0; l < 4; l++) {
        var angle = (l / 4) * Math.PI * 2;
        var logGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
        var log = new THREE.Mesh(logGeo, logMat);
        log.position.set(Math.cos(angle) * 0.2, 0.5, Math.sin(angle) * 0.2);
        log.rotation.z = Math.PI / 6;
        log.rotation.y = angle;
        log.castShadow = true;
        group.add(log);
      }

      // Fire light
      var fireLight = new THREE.PointLight(0xff6600, 1.5, 10);
      fireLight.position.set(0, 1, 0);
      fireLight.castShadow = false;
      group.add(fireLight);

      // Store light reference for animation
      group.userData.fireLight = fireLight;

    } else if (type === 'fountain') {
      // Fountain base
      var baseGeo = new THREE.CylinderGeometry(2, 2.5, 0.8, 16);
      var stoneMat = new THREE.MeshPhongMaterial({ color: 0xc0c0d0 });
      var base = new THREE.Mesh(baseGeo, stoneMat);
      base.position.set(0, 0.4, 0);
      base.castShadow = true;
      group.add(base);

      // Middle tier
      var midGeo = new THREE.CylinderGeometry(1.2, 1.5, 0.5, 16);
      var mid = new THREE.Mesh(midGeo, stoneMat);
      mid.position.set(0, 1.2, 0);
      mid.castShadow = true;
      group.add(mid);

      // Top bowl
      var topGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.3, 16);
      var top = new THREE.Mesh(topGeo, stoneMat);
      top.position.set(0, 1.8, 0);
      top.castShadow = true;
      group.add(top);

      // Water pool
      var waterGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.2, 24);
      var waterMat = new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        emissive: 0x2244aa,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.7
      });
      var water = new THREE.Mesh(waterGeo, waterMat);
      water.position.set(0, 0.8, 0);
      water.castShadow = false;
      group.add(water);

    } else if (type === 'training_dummy') {
      // Base
      var baseGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 12);
      var woodMat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
      var base = new THREE.Mesh(baseGeo, woodMat);
      base.position.set(0, 0.15, 0);
      base.castShadow = true;
      group.add(base);

      // Post
      var postGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8);
      var post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(0, 1.4, 0);
      post.castShadow = true;
      group.add(post);

      // Body (burlap-wrapped)
      var bodyGeo = new THREE.CylinderGeometry(0.4, 0.45, 1.2, 12);
      var burlapMat = new THREE.MeshPhongMaterial({ color: 0xc4a574 });
      var body = new THREE.Mesh(bodyGeo, burlapMat);
      body.position.set(0, 1.8, 0);
      body.castShadow = true;
      group.add(body);

      // Head
      var headGeo = new THREE.SphereGeometry(0.3, 12, 12);
      var head = new THREE.Mesh(headGeo, burlapMat);
      head.position.set(0, 2.6, 0);
      head.castShadow = true;
      group.add(head);

    } else if (type === 'fallen_log') {
      // Large log lying horizontally
      var logGeo = new THREE.CylinderGeometry(0.4, 0.45, 3, 12);
      var barkMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      var log = new THREE.Mesh(logGeo, barkMat);
      log.position.set(0, 0.4, 0);
      log.rotation.z = Math.PI / 2;
      log.castShadow = true;
      group.add(log);

    } else if (type === 'bulletin_board') {
      // Posts
      var postMat = new THREE.MeshPhongMaterial({ color: 0x6d4c41 });
      for (var p = -1; p <= 1; p += 2) {
        var postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8);
        var post = new THREE.Mesh(postGeo, postMat);
        post.position.set(p * 0.8, 1.25, 0);
        post.castShadow = true;
        group.add(post);
      }

      // Board
      var boardGeo = new THREE.BoxGeometry(2, 1.5, 0.1);
      var boardMat = new THREE.MeshPhongMaterial({ color: 0x8d6e63 });
      var board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(0, 1.5, 0);
      board.castShadow = true;
      group.add(board);

    } else if (type === 'watering_well') {
      // Well base (stone cylinder)
      var wellGeo = new THREE.CylinderGeometry(1, 1.2, 1.5, 16);
      var stoneMat = new THREE.MeshPhongMaterial({ color: 0x808080 });
      var well = new THREE.Mesh(wellGeo, stoneMat);
      well.position.set(0, 0.75, 0);
      well.castShadow = true;
      group.add(well);

      // Well posts
      var postMat = new THREE.MeshPhongMaterial({ color: 0x6d4c41 });
      for (var w = -1; w <= 1; w += 2) {
        var postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        var post = new THREE.Mesh(postGeo, postMat);
        post.position.set(w * 0.8, 1.75, 0);
        post.castShadow = true;
        group.add(post);
      }

      // Roof
      var roofGeo = new THREE.ConeGeometry(1.2, 0.8, 4);
      var roofMat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
      var roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, 3.2, 0);
      roof.castShadow = true;
      group.add(roof);

    } else if (type === 'reading_desk') {
      // Desk surface
      var topGeo = new THREE.BoxGeometry(1.5, 0.1, 1);
      var woodMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      var top = new THREE.Mesh(topGeo, woodMat);
      top.position.set(0, 0.8, 0);
      top.castShadow = true;
      group.add(top);

      // Legs
      for (var dx = -1; dx <= 1; dx += 2) {
        for (var dz = -1; dz <= 1; dz += 2) {
          var legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
          var leg = new THREE.Mesh(legGeo, woodMat);
          leg.position.set(dx * 0.6, 0.4, dz * 0.4);
          leg.castShadow = true;
          group.add(leg);
        }
      }

      // Book on desk
      var bookGeo = new THREE.BoxGeometry(0.3, 0.05, 0.4);
      var bookMat = new THREE.MeshPhongMaterial({ color: 0x8b0000 });
      var book = new THREE.Mesh(bookGeo, bookMat);
      book.position.set(0, 0.88, 0);
      book.rotation.y = Math.PI / 6;
      book.castShadow = true;
      group.add(book);

    } else if (type === 'bookshelf') {
      // Frame
      var frameMat = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
      var shelfGeo = new THREE.BoxGeometry(2, 2.5, 0.4);
      var shelf = new THREE.Mesh(shelfGeo, frameMat);
      shelf.position.set(0, 1.25, 0);
      shelf.castShadow = true;
      group.add(shelf);

      // Books
      var bookColors = [0x8b0000, 0x006400, 0x00008b, 0x8b4513, 0x4b0082];
      for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 5; col++) {
          var bookGeo = new THREE.BoxGeometry(0.3, 0.6, 0.15);
          var bookMat = new THREE.MeshPhongMaterial({ color: bookColors[(row + col) % bookColors.length] });
          var book = new THREE.Mesh(bookGeo, bookMat);
          book.position.set(-0.7 + col * 0.35, 0.3 + row * 0.7, 0.1);
          book.castShadow = true;
          group.add(book);
        }
      }

    } else if (type === 'market_stall') {
      // Posts
      var postMat = new THREE.MeshPhongMaterial({ color: 0x6d4c41 });
      for (var mx = -1; mx <= 1; mx += 2) {
        for (var mz = -1; mz <= 1; mz += 2) {
          var postGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8);
          var post = new THREE.Mesh(postGeo, postMat);
          post.position.set(mx * 1, 1.25, mz * 1);
          post.castShadow = true;
          group.add(post);
        }
      }

      // Canopy
      var canopyGeo = new THREE.BoxGeometry(2.5, 0.1, 2.5);
      var canopyMat = new THREE.MeshPhongMaterial({ color: 0xd2691e });
      var canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 2.5, 0);
      canopy.castShadow = true;
      group.add(canopy);

      // Counter
      var counterGeo = new THREE.BoxGeometry(2, 0.8, 1);
      var counterMat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
      var counter = new THREE.Mesh(counterGeo, counterMat);
      counter.position.set(0, 0.4, 0);
      counter.castShadow = true;
      group.add(counter);

    } else if (type === 'town_bell') {
      // Bell post
      var postGeo = new THREE.CylinderGeometry(0.15, 0.2, 3, 8);
      var woodMat = new THREE.MeshPhongMaterial({ color: 0x6d4c41 });
      var post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(0, 1.5, 0);
      post.castShadow = true;
      group.add(post);

      // Cross beam
      var beamGeo = new THREE.BoxGeometry(1.5, 0.15, 0.15);
      var beam = new THREE.Mesh(beamGeo, woodMat);
      beam.position.set(0, 2.8, 0);
      beam.castShadow = true;
      group.add(beam);

      // Bell
      var bellGeo = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      var bellMat = new THREE.MeshPhongMaterial({ color: 0xb8860b });
      var bell = new THREE.Mesh(bellGeo, bellMat);
      bell.position.set(0, 2.5, 0);
      bell.rotation.x = Math.PI;
      bell.castShadow = true;
      group.add(bell);

    } else if (type === 'street_lamp') {
      // Lamp post
      var postGeo = new THREE.CylinderGeometry(0.08, 0.1, 3, 8);
      var metalMat = new THREE.MeshPhongMaterial({ color: 0x2f2f2f });
      var post = new THREE.Mesh(postGeo, metalMat);
      post.position.set(0, 1.5, 0);
      post.castShadow = true;
      group.add(post);

      // Lamp housing
      var housingGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 6);
      var housingMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
      var housing = new THREE.Mesh(housingGeo, housingMat);
      housing.position.set(0, 3.2, 0);
      housing.castShadow = true;
      group.add(housing);

      // Light
      var lampLight = new THREE.PointLight(0xffdd88, 1.0, 12);
      lampLight.position.set(0, 3, 0);
      lampLight.castShadow = false;
      group.add(lampLight);

      group.userData.lampLight = lampLight;

    } else if (type === 'easel') {
      // Easel legs
      var legMat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
      var leg1Geo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8);
      var leg1 = new THREE.Mesh(leg1Geo, legMat);
      leg1.position.set(0, 0.9, 0.3);
      leg1.rotation.x = -0.2;
      leg1.castShadow = true;
      group.add(leg1);

      var leg2 = new THREE.Mesh(leg1Geo, legMat);
      leg2.position.set(-0.3, 0.9, -0.2);
      leg2.rotation.z = 0.2;
      leg2.rotation.x = 0.2;
      leg2.castShadow = true;
      group.add(leg2);

      var leg3 = new THREE.Mesh(leg1Geo, legMat);
      leg3.position.set(0.3, 0.9, -0.2);
      leg3.rotation.z = -0.2;
      leg3.rotation.x = 0.2;
      leg3.castShadow = true;
      group.add(leg3);

      // Canvas
      var canvasGeo = new THREE.BoxGeometry(1, 1.2, 0.05);
      var canvasMat = new THREE.MeshPhongMaterial({ color: 0xf5f5dc });
      var canvas = new THREE.Mesh(canvasGeo, canvasMat);
      canvas.position.set(0, 1.4, 0.2);
      canvas.rotation.x = -0.1;
      canvas.castShadow = true;
      group.add(canvas);

    } else if (type === 'piano') {
      // Piano body
      var bodyGeo = new THREE.BoxGeometry(1.5, 0.8, 1);
      var pianoMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
      var body = new THREE.Mesh(bodyGeo, pianoMat);
      body.position.set(0, 0.4, 0);
      body.castShadow = true;
      group.add(body);

      // Keyboard
      var keyboardGeo = new THREE.BoxGeometry(1.3, 0.05, 0.3);
      var keyboardMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
      var keyboard = new THREE.Mesh(keyboardGeo, keyboardMat);
      keyboard.position.set(0, 0.85, 0.4);
      keyboard.castShadow = true;
      group.add(keyboard);

      // Legs
      for (var px = -1; px <= 1; px += 2) {
        for (var pz = -1; pz <= 1; pz += 2) {
          var legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
          var leg = new THREE.Mesh(legGeo, pianoMat);
          leg.position.set(px * 0.6, 0.2, pz * 0.4);
          leg.castShadow = true;
          group.add(leg);
        }
      }
    }

    // Position the group
    group.position.set(position.x, baseY, position.z);

    // Store interactive metadata
    group.userData.isInteractive = true;
    group.userData.interactiveType = type;
    group.userData.originalEmissive = 0x000000;
    group.userData.highlighted = false;

    return group;
  }

  /**
   * Spawn all interactive objects for a specific zone
   */
  function spawnZoneInteractives(sceneCtx, zoneId) {
    if (!sceneCtx || !sceneCtx.scene) return;
    if (!INTERACTIVE_OBJECTS[zoneId]) return;

    var zoneObjects = INTERACTIVE_OBJECTS[zoneId];
    for (var i = 0; i < zoneObjects.length; i++) {
      var objDef = zoneObjects[i];
      var mesh = createInteractiveObject(objDef.type, objDef.position);

      if (mesh) {
        sceneCtx.scene.add(mesh);

        // Store interactive object data
        var interactiveData = {
          id: nextInteractiveId++,
          type: objDef.type,
          position: objDef.position,
          action: objDef.action,
          message: objDef.message,
          mesh: mesh,
          zone: zoneId
        };

        interactiveObjects.push(interactiveData);
        mesh.userData.interactiveId = interactiveData.id;
      }
    }
  }

  /**
   * Get the nearest interactive object within range
   */
  function getInteractiveAtPosition(x, z, range) {
    var nearestObj = null;
    var minDist = range;

    for (var i = 0; i < interactiveObjects.length; i++) {
      var obj = interactiveObjects[i];
      var dx = obj.position.x - x;
      var dz = obj.position.z - z;
      var dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist) {
        minDist = dist;
        nearestObj = obj;
      }
    }

    return nearestObj;
  }

  /**
   * Interact with an object by ID
   */
  function interactWithObject(objectId) {
    for (var i = 0; i < interactiveObjects.length; i++) {
      var obj = interactiveObjects[i];
      if (obj.id === objectId) {
        return {
          type: obj.type,
          action: obj.action,
          message: obj.message,
          zone: obj.zone
        };
      }
    }
    return null;
  }

  /**
   * Highlight interactive objects near the player
   */
  function updateInteractiveHighlights(playerX, playerZ, highlightRange) {
    if (!highlightRange) highlightRange = 3;

    for (var i = 0; i < interactiveObjects.length; i++) {
      var obj = interactiveObjects[i];
      if (!obj.mesh) continue;

      var dx = obj.position.x - playerX;
      var dz = obj.position.z - playerZ;
      var dist = Math.sqrt(dx * dx + dz * dz);

      var shouldHighlight = dist < highlightRange;

      if (shouldHighlight && !obj.mesh.userData.highlighted) {
        // Turn on highlight
        obj.mesh.traverse(function(child) {
          if (child instanceof THREE.Mesh && child.material) {
            if (child.material.emissive) {
              child.userData.originalEmissive = child.material.emissive.getHex();
              child.material.emissive.setHex(0x444400);
              child.material.emissiveIntensity = 0.3;
            }
          }
        });
        obj.mesh.userData.highlighted = true;
      } else if (!shouldHighlight && obj.mesh.userData.highlighted) {
        // Turn off highlight
        obj.mesh.traverse(function(child) {
          if (child instanceof THREE.Mesh && child.material) {
            if (child.material.emissive && child.userData.originalEmissive !== undefined) {
              child.material.emissive.setHex(child.userData.originalEmissive);
              child.material.emissiveIntensity = 0;
            }
          }
        });
        obj.mesh.userData.highlighted = false;
      }
    }
  }

  /**
   * Animate interactive objects (fire flicker, etc.)
   */
  function updateInteractiveAnimations(deltaTime) {
    var time = Date.now() * 0.001;

    for (var i = 0; i < interactiveObjects.length; i++) {
      var obj = interactiveObjects[i];
      if (!obj.mesh) continue;

      // Campfire light flicker
      if (obj.type === 'campfire' && obj.mesh.userData.fireLight) {
        var flicker = Math.sin(time * 5) * 0.3 + Math.sin(time * 13) * 0.2;
        obj.mesh.userData.fireLight.intensity = 1.5 + flicker;
      }

      // Street lamp gentle sway
      if (obj.type === 'street_lamp' && obj.mesh.userData.lampLight) {
        var sway = Math.sin(time * 0.5) * 0.05;
        obj.mesh.userData.lampLight.intensity = 1.0 + sway;
      }
    }
  }

  /**
   * Remove all interactive objects (for cleanup)
   */
  function clearInteractiveObjects(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;

    for (var i = 0; i < interactiveObjects.length; i++) {
      var obj = interactiveObjects[i];
      if (obj.mesh) {
        sceneCtx.scene.remove(obj.mesh);

        // Dispose geometries and materials
        obj.mesh.traverse(function(child) {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                for (var m = 0; m < child.material.length; m++) {
                  child.material[m].dispose();
                }
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    }

    interactiveObjects = [];
    nextInteractiveId = 1;
  }

  /**
   * Get all interactive objects for a zone
   */
  function getZoneInteractives(zoneId) {
    var result = [];
    for (var i = 0; i < interactiveObjects.length; i++) {
      if (interactiveObjects[i].zone === zoneId) {
        result.push(interactiveObjects[i]);
      }
    }
    return result;
  }

  /**
   * Hover highlight state for interaction system
   */
  var highlightedObject = null;
  var originalMaterials = new Map();

  /**
   * Highlight a specific object for hover/interaction (golden glow)
   */
  function highlightObject(mesh) {
    if (!mesh) return;
    if (highlightedObject === mesh) return;

    // Unhighlight previous object first
    unhighlightObject();

    highlightedObject = mesh;

    // Store original emissive values and apply golden glow
    mesh.traverse(function(child) {
      if (child.isMesh && child.material) {
        originalMaterials.set(child, {
          emissive: child.material.emissive ? child.material.emissive.clone() : null,
          emissiveIntensity: child.material.emissiveIntensity || 0
        });

        // Apply golden highlight glow
        if (child.material.emissive) {
          child.material.emissive.set(0xDAA520); // Golden color
          child.material.emissiveIntensity = 0.4;
        }
      }
    });
  }

  /**
   * Remove highlight from currently highlighted object
   */
  function unhighlightObject() {
    if (!highlightedObject) return;

    // Restore original materials
    highlightedObject.traverse(function(child) {
      if (child.isMesh && originalMaterials.has(child)) {
        var orig = originalMaterials.get(child);
        if (orig.emissive && child.material.emissive) {
          child.material.emissive.copy(orig.emissive);
        }
        child.material.emissiveIntensity = orig.emissiveIntensity;
      }
    });

    originalMaterials.clear();
    highlightedObject = null;
  }

  // ========================================================================
  // END INTERACTIVE OBJECTS SYSTEM
  // ========================================================================

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
  // ZONE TRANSITION EFFECTS
  // ========================================================================

  var zoneBoundaryParticles = [];
  var fadeOverlay = null;

  /**
   * Screen fade transition effect
   * @param {Function} callback - Function to call when screen is fully faded
   */
  function fadeTransition(callback) {
    if (typeof document === 'undefined') {
      if (callback) callback();
      return;
    }

    // Create overlay if it doesn't exist
    if (!fadeOverlay) {
      fadeOverlay = document.createElement('div');
      fadeOverlay.style.position = 'fixed';
      fadeOverlay.style.top = '0';
      fadeOverlay.style.left = '0';
      fadeOverlay.style.width = '100%';
      fadeOverlay.style.height = '100%';
      fadeOverlay.style.backgroundColor = 'black';
      fadeOverlay.style.opacity = '0';
      fadeOverlay.style.pointerEvents = 'none';
      fadeOverlay.style.zIndex = '9999';
      fadeOverlay.style.transition = 'opacity 0.5s ease-in-out';
      document.body.appendChild(fadeOverlay);
    }

    // Fade to black
    fadeOverlay.style.opacity = '1';

    // Call callback at peak fade
    setTimeout(function() {
      if (callback) callback();

      // Fade back in
      setTimeout(function() {
        fadeOverlay.style.opacity = '0';
      }, 50);
    }, 500);
  }

  /**
   * Create zone boundary particles
   * @param {THREE.Scene} scene - The scene to add particles to
   */
  function createZoneBoundaryParticles(scene) {
    if (!scene) return;

    // Clear existing boundary particles
    for (var i = 0; i < zoneBoundaryParticles.length; i++) {
      scene.remove(zoneBoundaryParticles[i].mesh);
    }
    zoneBoundaryParticles = [];

    // Create particles along zone boundaries
    for (var zId in ZONES) {
      var zone = ZONES[zId];
      var particleCount = Math.floor(zone.radius / 3);

      for (var i = 0; i < particleCount; i++) {
        var angle = (i / particleCount) * Math.PI * 2;
        var radius = zone.radius * 0.95;
        var px = zone.cx + Math.cos(angle) * radius;
        var pz = zone.cz + Math.sin(angle) * radius;
        var py = terrainHeight(px, pz) + 2 + Math.random() * 3;

        var particleGeo = new THREE.SphereGeometry(0.1, 6, 6);
        var particleMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.4
        });
        var particle = new THREE.Mesh(particleGeo, particleMat);
        particle.position.set(px, py, pz);
        particle.castShadow = false;
        scene.add(particle);

        zoneBoundaryParticles.push({
          mesh: particle,
          baseY: py,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0005 + Math.random() * 0.0003
        });
      }
    }
  }

  /**
   * Update zone boundary particle animations
   * @param {Number} time - World time in milliseconds
   */
  function updateZoneBoundaryParticles(time) {
    for (var i = 0; i < zoneBoundaryParticles.length; i++) {
      var p = zoneBoundaryParticles[i];
      p.mesh.position.y = p.baseY + Math.sin(time * p.speed + p.phase) * 0.5;
      p.mesh.material.opacity = 0.3 + Math.sin(time * p.speed * 2 + p.phase) * 0.15;
    }
  }

  // ========================================================================
  // WILDLIFE AND NATURE EFFECTS SYSTEM
  // ========================================================================

  var wildlifeData = {
    butterflies: [],
    fireflies: [],
    birds: [],
    fishJumpers: [],
    initialized: false
  };

  /**
   * Initialize wildlife systems
   */
  function initWildlife(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;
    var scene = sceneCtx.scene;

    clearWildlife(scene);

    // Butterflies in gardens zone
    var gardensZ = ZONES.gardens;
    var butterflyColors = [0xffff00, 0xffa500, 0x4169e1, 0xffffff, 0xff69b4];

    for (var i = 0; i < 7; i++) {
      var bfGeo = new THREE.BufferGeometry();
      var bfVerts = new Float32Array([0,0,0, 0.3,0,0.2, 0,0,0.4]);
      bfGeo.setAttribute('position', new THREE.BufferAttribute(bfVerts, 3));
      var bfMat = new THREE.MeshBasicMaterial({
        color: butterflyColors[i % butterflyColors.length],
        side: THREE.DoubleSide
      });
      var bf = new THREE.Mesh(bfGeo, bfMat);
      var angle = Math.random() * Math.PI * 2;
      var radius = Math.random() * gardensZ.radius * 0.6;
      bf.position.set(
        gardensZ.cx + Math.cos(angle) * radius,
        gardensZ.baseHeight + 1 + Math.random() * 2,
        gardensZ.cz + Math.sin(angle) * radius
      );
      scene.add(bf);
      wildlifeData.butterflies.push({
        mesh: bf, time: Math.random() * 100,
        speed: 0.5 + Math.random() * 0.5,
        pathAngle: Math.random() * Math.PI * 2,
        pathRadius: 10 + Math.random() * 15,
        baseY: bf.position.y,
        centerX: gardensZ.cx, centerZ: gardensZ.cz
      });
    }

    // Fireflies across multiple zones
    var ffZones = [
      { zone: ZONES.gardens, count: 8 },
      { zone: ZONES.wilds, count: 10 },
      { zone: ZONES.commons, count: 4 },
      { zone: ZONES.nexus, count: 3 }
    ];
    for (var zi = 0; zi < ffZones.length; zi++) {
      var zInfo = ffZones[zi];
      for (var fi = 0; fi < zInfo.count; fi++) {
        var ffGeo = new THREE.SphereGeometry(0.15, 8, 8);
        var ffMat = new THREE.MeshBasicMaterial({
          color: 0xffff99, transparent: true, opacity: 0
        });
        var ff = new THREE.Mesh(ffGeo, ffMat);
        var ffA = Math.random() * Math.PI * 2;
        var ffR = Math.random() * zInfo.zone.radius * 0.7;
        ff.position.set(
          zInfo.zone.cx + Math.cos(ffA) * ffR,
          zInfo.zone.baseHeight + 0.5 + Math.random() * 3,
          zInfo.zone.cz + Math.sin(ffA) * ffR
        );
        scene.add(ff);
        wildlifeData.fireflies.push({
          mesh: ff, time: Math.random() * 100,
          speed: 0.3 + Math.random() * 0.3,
          pulseSpeed: 2 + Math.random() * 2,
          baseY: ff.position.y,
          driftAngle: Math.random() * Math.PI * 2
        });
      }
    }

    // Bird flocks (V-formations orbiting world)
    for (var fli = 0; fli < 3; fli++) {
      var flock = {
        birds: [], centerAngle: (fli / 3) * Math.PI * 2,
        orbitRadius: 200, speed: 0.1 + Math.random() * 0.05,
        height: 40 + Math.random() * 20
      };
      var birdOffsets = [
        {x:0,z:0}, {x:-2,z:-3}, {x:-4,z:-6}, {x:2,z:-3}, {x:4,z:-6}
      ];
      for (var bi = 0; bi < birdOffsets.length; bi++) {
        var bGeo = new THREE.BufferGeometry();
        var bVerts = new Float32Array([0,0,0, -0.4,0,0.3, 0.4,0,0.3]);
        bGeo.setAttribute('position', new THREE.BufferAttribute(bVerts, 3));
        var bMat = new THREE.MeshBasicMaterial({
          color: 0x2c2c2c, side: THREE.DoubleSide
        });
        var bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.y = flock.height;
        scene.add(bMesh);
        flock.birds.push({
          mesh: bMesh, offsetX: birdOffsets[bi].x,
          offsetZ: birdOffsets[bi].z, flapTime: Math.random() * 10
        });
      }
      wildlifeData.birds.push(flock);
    }

    // Fish jumpers near water
    for (var fsi = 0; fsi < 3; fsi++) {
      var fGeo = new THREE.SphereGeometry(0.3, 8, 8);
      var fMat = new THREE.MeshBasicMaterial({
        color: 0x888888, transparent: true, opacity: 0
      });
      var fMesh = new THREE.Mesh(fGeo, fMat);
      scene.add(fMesh);
      wildlifeData.fishJumpers.push({
        mesh: fMesh, jumping: false, jumpTime: 0, jumpDuration: 0,
        startX: 0, startZ: 0, endX: 0, endZ: 0, waterHeight: 0,
        nextJumpDelay: Math.random() * 5 + 3
      });
    }

    wildlifeData.initialized = true;
  }

  /**
   * Update wildlife animations
   */
  function updateWildlife(sceneCtx, deltaTime, worldTime) {
    if (!wildlifeData.initialized || !sceneCtx) return;

    var isNight = worldTime > 1080 || worldTime < 360;
    var isDay = worldTime >= 360 && worldTime <= 1080;

    // Butterflies (daytime, gardens)
    for (var i = 0; i < wildlifeData.butterflies.length; i++) {
      var bf = wildlifeData.butterflies[i];
      bf.time += deltaTime * bf.speed;
      bf.mesh.visible = isDay;
      if (isDay) {
        bf.pathAngle += deltaTime * 0.3;
        var tx = bf.centerX + Math.cos(bf.pathAngle) * bf.pathRadius;
        var tz = bf.centerZ + Math.sin(bf.pathAngle) * bf.pathRadius;
        bf.mesh.position.x += (tx - bf.mesh.position.x) * 0.02;
        bf.mesh.position.z += (tz - bf.mesh.position.z) * 0.02;
        bf.mesh.position.y = bf.baseY + Math.sin(bf.time * 5) * 0.3;
        bf.mesh.rotation.y = Math.sin(bf.time * 8) * 0.3;
        bf.mesh.rotation.z = Math.sin(bf.time * 6) * 0.2;
      }
    }

    // Fireflies (nighttime)
    for (var fi = 0; fi < wildlifeData.fireflies.length; fi++) {
      var ff = wildlifeData.fireflies[fi];
      ff.time += deltaTime;
      if (isNight) {
        var pulse = 0.5 + Math.sin(ff.time * ff.pulseSpeed) * 0.5;
        ff.mesh.material.opacity = pulse * 0.8;
        ff.mesh.visible = true;
        ff.driftAngle += deltaTime * 0.2;
        ff.mesh.position.x += Math.cos(ff.driftAngle) * deltaTime * ff.speed;
        ff.mesh.position.z += Math.sin(ff.driftAngle) * deltaTime * ff.speed;
        ff.mesh.position.y = ff.baseY + Math.sin(ff.time * 0.5) * 0.5;
      } else {
        ff.mesh.material.opacity = 0;
        ff.mesh.visible = false;
      }
    }

    // Bird flocks (daytime)
    for (var fli = 0; fli < wildlifeData.birds.length; fli++) {
      var flock = wildlifeData.birds[fli];
      flock.centerAngle += deltaTime * flock.speed;
      var fcx = Math.cos(flock.centerAngle) * flock.orbitRadius;
      var fcz = 150 + Math.sin(flock.centerAngle) * flock.orbitRadius;
      for (var bi = 0; bi < flock.birds.length; bi++) {
        var bd = flock.birds[bi];
        bd.flapTime += deltaTime * 5;
        bd.mesh.visible = isDay;
        if (isDay) {
          var fa = flock.centerAngle;
          var rox = Math.cos(fa) * bd.offsetX - Math.sin(fa) * bd.offsetZ;
          var roz = Math.sin(fa) * bd.offsetX + Math.cos(fa) * bd.offsetZ;
          bd.mesh.position.set(fcx + rox, flock.height + Math.sin(bd.flapTime) * 0.5, fcz + roz);
          bd.mesh.rotation.y = fa + Math.PI / 2;
          bd.mesh.rotation.z = Math.sin(bd.flapTime * 2) * 0.1;
        }
      }
    }

    // Fish jumpers
    if (waterBodies && waterBodies.length > 0) {
      for (var fsi = 0; fsi < wildlifeData.fishJumpers.length; fsi++) {
        var fish = wildlifeData.fishJumpers[fsi];
        if (fish.jumping) {
          fish.jumpTime += deltaTime;
          var prog = fish.jumpTime / fish.jumpDuration;
          if (prog >= 1) {
            fish.jumping = false;
            fish.mesh.material.opacity = 0;
            fish.mesh.visible = false;
            fish.nextJumpDelay = Math.random() * 8 + 5;
          } else {
            fish.mesh.position.x = fish.startX + (fish.endX - fish.startX) * prog;
            fish.mesh.position.z = fish.startZ + (fish.endZ - fish.startZ) * prog;
            fish.mesh.position.y = fish.waterHeight + Math.sin(prog * Math.PI) * 2;
            fish.mesh.material.opacity = 1;
            fish.mesh.visible = true;
          }
        } else {
          fish.nextJumpDelay -= deltaTime;
          if (fish.nextJumpDelay <= 0) {
            var wb = waterBodies[Math.floor(Math.random() * waterBodies.length)];
            var ja = Math.random() * Math.PI * 2;
            var jr = Math.random() * 10;
            fish.startX = wb.centerX + Math.cos(ja) * jr;
            fish.startZ = wb.centerZ + Math.sin(ja) * jr;
            fish.waterHeight = wb.height;
            var jd = Math.random() * Math.PI * 2;
            var jDist = 1 + Math.random() * 2;
            fish.endX = fish.startX + Math.cos(jd) * jDist;
            fish.endZ = fish.startZ + Math.sin(jd) * jDist;
            fish.jumping = true;
            fish.jumpTime = 0;
            fish.jumpDuration = 0.8 + Math.random() * 0.4;
          }
        }
      }
    }
  }

  /**
   * Clear all wildlife from scene
   */
  function clearWildlife(scene) {
    if (!scene) return;
    var groups = ['butterflies', 'fireflies', 'fishJumpers'];
    for (var g = 0; g < groups.length; g++) {
      var arr = wildlifeData[groups[g]];
      for (var i = 0; i < arr.length; i++) {
        scene.remove(arr[i].mesh);
        if (arr[i].mesh.geometry) arr[i].mesh.geometry.dispose();
        if (arr[i].mesh.material) arr[i].mesh.material.dispose();
      }
    }
    for (var fli = 0; fli < wildlifeData.birds.length; fli++) {
      var flock = wildlifeData.birds[fli];
      for (var bi = 0; bi < flock.birds.length; bi++) {
        scene.remove(flock.birds[bi].mesh);
        if (flock.birds[bi].mesh.geometry) flock.birds[bi].mesh.geometry.dispose();
        if (flock.birds[bi].mesh.material) flock.birds[bi].mesh.material.dispose();
      }
    }
    wildlifeData.butterflies = [];
    wildlifeData.fireflies = [];
    wildlifeData.birds = [];
    wildlifeData.fishJumpers = [];
    wildlifeData.initialized = false;
  }

  // ========================================================================
  // ZONE AMBIENCE — Unique atmospheric particles per zone
  // ========================================================================

  var zoneAmbienceData = {
    initialized: false,
    particles: {} // zone name -> { points, velocities, offsets }
  };

  /**
   * Initialize zone ambience particles
   */
  function initZoneAmbience(sceneCtx) {
    if (!sceneCtx || !sceneCtx.scene) return;

    var scene = sceneCtx.scene;
    zoneAmbienceData.particles = {};

    // Define particle configs for each zone
    var configs = {
      nexus: {
        count: 40,
        color: 0xffd700, // golden
        size: 0.3,
        rangeX: 50, rangeY: 30, rangeZ: 50,
        velocityY: 0.5, // slow upward drift
        velocityX: 0.1, velocityZ: 0.1
      },
      gardens: {
        count: 50,
        color: 0x90ee90, // light green
        size: 0.25,
        rangeX: 70, rangeY: 25, rangeZ: 70,
        velocityY: 0.2,
        velocityX: 0.3, velocityZ: 0.2 // wind drift
      },
      athenaeum: {
        count: 35,
        color: 0x87ceeb, // sky blue
        size: 0.2,
        rangeX: 50, rangeY: 35, rangeZ: 50,
        velocityY: 0.15,
        velocityX: 0.05, velocityZ: 0.05
      },
      studio: {
        count: 45,
        color: null, // multi-color, set per particle
        size: 0.3,
        rangeX: 50, rangeY: 30, rangeZ: 50,
        velocityY: 0.25,
        velocityX: 0.15, velocityZ: 0.15
      },
      wilds: {
        count: 40,
        color: 0xffffff, // white mist
        size: 0.4,
        rangeX: 80, rangeY: 8, rangeZ: 80, // ground-level
        velocityY: 0.05,
        velocityX: 0.4, velocityZ: 0.1 // horizontal drift
      },
      agora: {
        count: 35,
        color: 0xffa500, // orange lantern glow
        size: 0.25,
        rangeX: 45, rangeY: 30, rangeZ: 45,
        velocityY: 0.3,
        velocityX: 0.1, velocityZ: 0.1
      },
      commons: {
        count: 40,
        color: 0xf5f5f5, // soft white smoke
        size: 0.35,
        rangeX: 45, rangeY: 35, rangeZ: 45,
        velocityY: 0.6, // rising
        velocityX: 0.15, velocityZ: 0.15
      },
      arena: {
        count: 35,
        color: 0xff4500, // red embers
        size: 0.2,
        rangeX: 45, rangeY: 40, rangeZ: 45,
        velocityY: 0.7, // embers rising
        velocityX: 0.2, velocityZ: 0.2
      }
    };

    // Create particle system for each zone
    for (var zoneName in configs) {
      if (!configs.hasOwnProperty(zoneName)) continue;
      var cfg = configs[zoneName];
      var zone = ZONES[zoneName];
      if (!zone) continue;

      var count = cfg.count;
      var positions = new Float32Array(count * 3);
      var colors = new Float32Array(count * 3);
      var sizes = new Float32Array(count);
      var velocities = [];
      var offsets = [];

      // Initialize particle attributes
      for (var i = 0; i < count; i++) {
        var i3 = i * 3;

        // Random position within zone range
        var rx = (Math.random() - 0.5) * cfg.rangeX;
        var ry = Math.random() * cfg.rangeY;
        var rz = (Math.random() - 0.5) * cfg.rangeZ;

        positions[i3] = zone.cx + rx;
        positions[i3 + 1] = zone.baseHeight + ry;
        positions[i3 + 2] = zone.cz + rz;

        // Store offsets for reset
        offsets.push({ x: rx, y: ry, z: rz });

        // Random velocity variation
        var vx = (Math.random() - 0.5) * cfg.velocityX;
        var vy = cfg.velocityY * (0.8 + Math.random() * 0.4);
        var vz = (Math.random() - 0.5) * cfg.velocityZ;
        velocities.push({ x: vx, y: vy, z: vz });

        // Color
        var particleColor;
        if (zoneName === 'studio') {
          // Random colors for studio
          var hue = Math.random();
          var rgb = hslToRgb(hue, 0.7, 0.6);
          colors[i3] = rgb.r;
          colors[i3 + 1] = rgb.g;
          colors[i3 + 2] = rgb.b;
        } else {
          var c = new THREE.Color(cfg.color);
          colors[i3] = c.r;
          colors[i3 + 1] = c.g;
          colors[i3 + 2] = c.b;
        }

        sizes[i] = cfg.size * (0.8 + Math.random() * 0.4);
      }

      // Create geometry and material
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      var material = new THREE.PointsMaterial({
        size: cfg.size,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      var points = new THREE.Points(geometry, material);
      points.visible = false; // Start hidden
      scene.add(points);

      zoneAmbienceData.particles[zoneName] = {
        points: points,
        velocities: velocities,
        offsets: offsets,
        config: cfg,
        zone: zone
      };
    }

    zoneAmbienceData.initialized = true;
  }

  /**
   * Update zone ambience particles
   */
  function updateZoneAmbience(sceneCtx, playerZone, deltaTime) {
    if (!zoneAmbienceData.initialized) return;

    var dt = deltaTime / 1000; // convert to seconds

    for (var zoneName in zoneAmbienceData.particles) {
      if (!zoneAmbienceData.particles.hasOwnProperty(zoneName)) continue;
      var data = zoneAmbienceData.particles[zoneName];

      // Toggle visibility based on player zone
      var isCurrentZone = zoneName === playerZone;
      data.points.visible = isCurrentZone;

      if (!isCurrentZone) continue;

      // Update particle positions
      var positions = data.points.geometry.attributes.position.array;
      var zone = data.zone;
      var cfg = data.config;

      for (var i = 0; i < data.velocities.length; i++) {
        var i3 = i * 3;
        var vel = data.velocities[i];
        var offset = data.offsets[i];

        // Apply velocity
        positions[i3] += vel.x * dt;
        positions[i3 + 1] += vel.y * dt;
        positions[i3 + 2] += vel.z * dt;

        // Wrap particles within zone bounds
        var localX = positions[i3] - zone.cx;
        var localY = positions[i3 + 1] - zone.baseHeight;
        var localZ = positions[i3 + 2] - zone.cz;

        // Reset particles that drift too far
        if (Math.abs(localX) > cfg.rangeX * 0.6 ||
            localY > cfg.rangeY || localY < 0 ||
            Math.abs(localZ) > cfg.rangeZ * 0.6) {
          // Reset to random position
          positions[i3] = zone.cx + (Math.random() - 0.5) * cfg.rangeX;
          positions[i3 + 1] = zone.baseHeight + Math.random() * cfg.rangeY * 0.3;
          positions[i3 + 2] = zone.cz + (Math.random() - 0.5) * cfg.rangeZ;
        }
      }

      data.points.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Helper function for HSL to RGB conversion (for studio particles)
  function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var hue2rgb = function(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r, g: g, b: b };
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
  exports.getCurrentWeather = getCurrentWeather;
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
  exports.spawnZoneInteractives = spawnZoneInteractives;
  exports.createInteractiveObject = createInteractiveObject;
  exports.getInteractiveAtPosition = getInteractiveAtPosition;
  exports.interactWithObject = interactWithObject;
  exports.updateInteractiveHighlights = updateInteractiveHighlights;
  exports.updateInteractiveAnimations = updateInteractiveAnimations;
  exports.clearInteractiveObjects = clearInteractiveObjects;
  exports.getZoneInteractives = getZoneInteractives;
  exports.highlightObject = highlightObject;
  exports.unhighlightObject = unhighlightObject;
  exports.fadeTransition = fadeTransition;
  exports.createZoneBoundaryParticles = createZoneBoundaryParticles;
  exports.updateZoneBoundaryParticles = updateZoneBoundaryParticles;
  exports.initWildlife = initWildlife;
  exports.updateWildlife = updateWildlife;
  exports.clearWildlife = clearWildlife;
  exports.initZoneAmbience = initZoneAmbience;
  exports.updateZoneAmbience = updateZoneAmbience;

})(typeof module !== 'undefined' ? module.exports : (window.World = {}));
