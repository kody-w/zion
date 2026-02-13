(function(exports) {
  // Three.js scene & rendering
  const playerMeshes = new Map(); // playerId -> {mesh, label}
  let skyDome = null;
  let sunMesh = null;
  let moonMesh = null;
  let stars = null;
  let zoneParticles = null;

  /**
   * Initialize Three.js scene
   * @param {HTMLElement} container - DOM container for renderer
   * @returns {object|null} - {scene, camera, renderer, ambientLight, directionalLight} or null if THREE not available
   */
  function initScene(container) {
    if (typeof THREE === 'undefined') {
      console.warn('THREE.js not available. 3D rendering disabled.');
      return null;
    }

    // Create scene
    const scene = new THREE.Scene();

    // Create sky dome with gradient
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
      fog: false
    });
    skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyDome);

    // Add fog for depth
    scene.fog = new THREE.Fog(0x87ceeb, 50, 300);

    // Create camera - third-person angle
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 12, 20);
    camera.lookAt(0, 0, 0);

    // Create renderer with shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap; // Basic shadows for better performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Hemisphere light (sky + ground)
    const ambientLight = new THREE.HemisphereLight(
      0x87ceeb, // Sky color (blue)
      0xd2b48c, // Ground color (tan/earthy)
      0.6
    );
    scene.add(ambientLight);

    // Directional sun light with shadows
    const directionalLight = new THREE.DirectionalLight(0xfff8e7, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = false;
    directionalLight.shadow.mapSize.width = 512;
    directionalLight.shadow.mapSize.height = 512;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Create sun mesh
    sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(8, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff8e7 })
    );
    sunMesh.position.copy(directionalLight.position);
    scene.add(sunMesh);

    // Create moon mesh
    moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(6, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xe0e0e0 })
    );
    moonMesh.visible = false;
    scene.add(moonMesh);

    // Create stars for night sky
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 1000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 450;
      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0
    });
    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Handle window resize
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      });
    }

    return { scene, camera, renderer, ambientLight, directionalLight };
  }

  /**
   * Load zone with procedural terrain
   * @param {object} sceneCtx - Scene context from initScene
   * @param {string} zoneId - Zone identifier
   */
  function loadZone(sceneCtx, zoneId) {
    if (!sceneCtx || !sceneCtx.scene) return;

    const { scene } = sceneCtx;

    // Clear existing objects (keep lights, camera, sky)
    const objectsToRemove = [];
    scene.traverse((obj) => {
      if ((obj.isMesh || obj.isGroup || obj.isPoints) &&
          obj !== skyDome && obj !== sunMesh && obj !== moonMesh && obj !== stars) {
        if (!obj.userData.isLight) {
          objectsToRemove.push(obj);
        }
      }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));
    playerMeshes.clear();

    // Remove old zone particles
    if (zoneParticles) {
      scene.remove(zoneParticles);
      zoneParticles = null;
    }

    // Generate zone-specific terrain
    switch (zoneId) {
      case 'nexus':
        generateNexus(scene);
        break;
      case 'gardens':
        generateGardens(scene);
        break;
      case 'athenaeum':
        generateAthenaeum(scene);
        break;
      case 'studio':
        generateStudio(scene);
        break;
      case 'wilds':
        generateWilds(scene);
        break;
      case 'agora':
        generateAgora(scene);
        break;
      case 'commons':
        generateCommons(scene);
        break;
      case 'arena':
        generateArena(scene);
        break;
      default:
        generateCommons(scene); // Default fallback
    }
  }

  // Zone generators

  function generateNexus(scene) {
    // Large polished stone plaza (200x200)
    const baseGround = new THREE.Mesh(
      new THREE.CylinderGeometry(100, 100, 0.5, 64),
      new THREE.MeshStandardMaterial({
        color: 0x8c8c8c,
        metalness: 0.3,
        roughness: 0.7
      })
    );
    baseGround.receiveShadow = true;
    scene.add(baseGround);

    // Multiple concentric rings at different heights (stepped)
    for (let i = 1; i <= 10; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(i * 9 - 1, i * 9, 64),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xa0a0a0 : 0x707070,
          metalness: 0.4,
          roughness: 0.6
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.26 + (i % 3) * 0.2;
      ring.receiveShadow = true;
      scene.add(ring);
    }

    // Grand multi-tier central fountain
    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 9, 2, 24),
      new THREE.MeshStandardMaterial({ color: 0xb0b0b0 })
    );
    fountainBase.position.set(0, 1, 0);
    fountainBase.castShadow = false;
    scene.add(fountainBase);

    // Second tier
    const fountainTier2 = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 6, 1.5, 24),
      new THREE.MeshStandardMaterial({ color: 0xc0c0c0 })
    );
    fountainTier2.position.set(0, 2.75, 0);
    fountainTier2.castShadow = false;
    scene.add(fountainTier2);

    // Top tier
    const fountainTop = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 3, 1, 24),
      new THREE.MeshStandardMaterial({ color: 0xd0d0d0 })
    );
    fountainTop.position.set(0, 4, 0);
    fountainTop.castShadow = false;
    scene.add(fountainTop);

    // Water pools for each tier
    const waterLevels = [{y: 2, r: 7.5}, {y: 3.5, r: 4.5}, {y: 4.5, r: 1.8}];
    waterLevels.forEach(({y, r}) => {
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, 0.3, 24),
        new THREE.MeshStandardMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.6,
          metalness: 0.8,
          roughness: 0.2
        })
      );
      water.position.set(0, y, 0);
      scene.add(water);
    });

    // Animated water particles
    const waterParticles = createFountainParticles();
    waterParticles.position.set(0, 4.5, 0);
    scene.add(waterParticles);

    // 8 distinct portal alcoves around perimeter
    const alcoveCount = 8;
    for (let i = 0; i < alcoveCount; i++) {
      const angle = (i / alcoveCount) * Math.PI * 2;
      const x = Math.cos(angle) * 85;
      const z = Math.sin(angle) * 85;

      // Arched frame
      const leftPillar = new THREE.Mesh(
        new THREE.BoxGeometry(1, 6, 1),
        new THREE.MeshStandardMaterial({ color: 0x707070 })
      );
      leftPillar.position.set(x - Math.cos(angle + Math.PI/2) * 2.5, 3, z - Math.sin(angle + Math.PI/2) * 2.5);
      leftPillar.castShadow = false;
      scene.add(leftPillar);

      const rightPillar = new THREE.Mesh(
        new THREE.BoxGeometry(1, 6, 1),
        new THREE.MeshStandardMaterial({ color: 0x707070 })
      );
      rightPillar.position.set(x + Math.cos(angle + Math.PI/2) * 2.5, 3, z + Math.sin(angle + Math.PI/2) * 2.5);
      rightPillar.castShadow = false;
      scene.add(rightPillar);

      // Arch top
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.5, 0.5, 16, 32, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x707070 })
      );
      arch.position.set(x, 6, z);
      arch.rotation.y = angle;
      arch.castShadow = false;
      scene.add(arch);
    }

    // Decorative obelisks between portals
    for (let i = 0; i < alcoveCount; i++) {
      const angle = (i / alcoveCount) * Math.PI * 2 + Math.PI / alcoveCount;
      const x = Math.cos(angle) * 80;
      const z = Math.sin(angle) * 80;

      const obelisk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.8, 8, 4),
        new THREE.MeshStandardMaterial({ color: 0x606060 })
      );
      obelisk.position.set(x, 4, z);
      obelisk.castShadow = false;
      scene.add(obelisk);

      // Glowing orb on top
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffa500,
          emissiveIntensity: 0.8
        })
      );
      orb.position.set(x, 8.5, z);
      scene.add(orb);
    }

    // Radiating pathways from center to each portal
    for (let i = 0; i < alcoveCount; i++) {
      const angle = (i / alcoveCount) * Math.PI * 2;
      for (let d = 15; d < 85; d += 3) {
        const x = Math.cos(angle) * d;
        const z = Math.sin(angle) * d;
        const pathStone = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 0.15, 2.5),
          new THREE.MeshStandardMaterial({ color: 0xd0d0d0 })
        );
        pathStone.position.set(x, 0.3, z);
        pathStone.receiveShadow = true;
        scene.add(pathStone);
      }
    }

    // Garden patches between rings with small bushes
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Math.PI / 16;
      const radius = 40 + (i % 3) * 10;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      addBush(scene, x, z);
    }

    // Small decorative ponds
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(angle) * 60;
      const z = Math.sin(angle) * 60;

      const pond = new THREE.Mesh(
        new THREE.CircleGeometry(4, 16),
        new THREE.MeshStandardMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.7,
          metalness: 0.9,
          roughness: 0.1
        })
      );
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(x, 0.28, z);
      scene.add(pond);
    }

    // Many lanterns around multiple rings
    for (let ring = 0; ring < 3; ring++) {
      const count = 12 + ring * 4;
      const radius = 50 + ring * 15;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        addLamppost(scene, x, z);
      }
    }

    // Bench clusters
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 35;
      const z = Math.sin(angle) * 35;

      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.4, 1),
        new THREE.MeshStandardMaterial({ color: 0x909090 })
      );
      bench.position.set(x, 0.5, z);
      bench.rotation.y = -angle;
      bench.castShadow = false;
      scene.add(bench);

      const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x909090 })
      );
      backrest.position.set(x - Math.cos(angle) * 0.5, 1, z - Math.sin(angle) * 0.5);
      backrest.rotation.y = -angle;
      backrest.castShadow = false;
      scene.add(backrest);
    }

    // Ambient particles
    zoneParticles = createAmbientParticles(400, 0xffd700, 100, 12, 0.02);
    scene.add(zoneParticles);
  }

  function generateGardens(scene) {
    // Lush rolling terrain (300x300)
    const groundGeometry = new THREE.PlaneGeometry(300, 300, 80, 80);
    const positions = groundGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 5 +
                     Math.sin(x * 0.2) * 1.5 + Math.cos(y * 0.15) * 2 +
                     Math.random() * 0.3;
      positions.setZ(i, height);
    }
    positions.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    const ground = new THREE.Mesh(
      groundGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x3a7d44,
        roughness: 0.9
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 50+ trees of varied types and sizes
    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * 280;
      const z = (Math.random() - 0.5) * 280;
      addPineTree(scene, x, z, 0.8 + Math.random() * 0.8);
    }

    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 280;
      const z = (Math.random() - 0.5) * 280;
      addOakTree(scene, x, z, 0.7 + Math.random() * 0.9);
    }

    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 260;
      const z = (Math.random() - 0.5) * 260;
      addCherryTree(scene, x, z);
    }

    // Multiple garden plots scattered around
    const plotLocations = [
      [-80, -60], [-60, -60], [-40, -60],
      [-80, -40], [-60, -40], [-40, -40],
      [40, 50], [60, 50], [80, 50],
      [40, 70], [60, 70], [80, 70]
    ];
    plotLocations.forEach(([x, z]) => addGardenPlot(scene, x, z));

    // Large flower meadows
    for (let i = 0; i < 8; i++) {
      const centerX = (Math.random() - 0.5) * 200;
      const centerZ = (Math.random() - 0.5) * 200;
      for (let j = 0; j < 40; j++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 8;
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6)
          })
        );
        flower.position.set(x, 0.2, z);
        scene.add(flower);
      }
    }

    // Multiple winding streams
    for (let s = 0; s < 3; s++) {
      const startX = (s - 1) * 80;
      for (let i = 0; i < 50; i++) {
        const t = i / 50;
        const x = startX + Math.sin(t * Math.PI * 5 + s) * 20;
        const z = -140 + t * 280;
        const streamSegment = new THREE.Mesh(
          new THREE.PlaneGeometry(4, 6),
          new THREE.MeshStandardMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.6,
            metalness: 0.9,
            roughness: 0.1
          })
        );
        streamSegment.rotation.x = -Math.PI / 2;
        streamSegment.position.set(x, 0.02, z);
        scene.add(streamSegment);
      }
    }

    // Stone bridges over streams
    const bridgePositions = [
      [-20, -40, 0], [0, 20, Math.PI/4], [60, 80, Math.PI/2]
    ];
    bridgePositions.forEach(([x, z, rot]) => addBridge(scene, x, z, rot));

    // Gazebo structure
    const gazeboX = -100;
    const gazeboZ = 100;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = gazeboX + Math.cos(angle) * 4;
      const z = gazeboZ + Math.sin(angle) * 4;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      post.position.set(x, 2, z);
      post.castShadow = false;
      scene.add(post);
    }
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(6, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    roof.position.set(gazeboX, 5, gazeboZ);
    roof.castShadow = false;
    scene.add(roof);

    // Beehive structures
    for (let i = 0; i < 6; i++) {
      const x = 80 + (i % 3) * 8;
      const z = -80 + Math.floor(i / 3) * 8;
      const hivePost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      hivePost.position.set(x, 0.75, z);
      scene.add(hivePost);

      const hive = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffd700 })
      );
      hive.position.set(x, 1.5, z);
      hive.scale.y = 1.3;
      scene.add(hive);
    }

    // Trellises with climbing plants
    for (let i = 0; i < 8; i++) {
      const x = -120 + i * 15;
      const z = -120;

      // Trellis frame
      for (let h = 0; h < 5; h++) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(3, 0.1, 0.1),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        bar.position.set(x, h * 0.8, z);
        scene.add(bar);
      }

      // Climbing plants
      for (let p = 0; p < 12; p++) {
        const vine = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x2d5016 })
        );
        vine.position.set(
          x + (Math.random() - 0.5) * 2.5,
          Math.random() * 4,
          z + (Math.random() - 0.5) * 0.3
        );
        scene.add(vine);
      }
    }

    // Ambient particles
    zoneParticles = createAmbientParticles(500, 0xffb3d9, 150, 10, 0.03);
    scene.add(zoneParticles);
  }

  function generateAthenaeum(scene) {
    // Grand marble hall floor (250x200)
    const floorSize = 250;
    const tileSize = 5;
    for (let x = -floorSize/2; x < floorSize/2; x += tileSize) {
      for (let z = -100; z < 100; z += tileSize) {
        const isEven = (Math.floor(x / tileSize) + Math.floor(z / tileSize)) % 2 === 0;
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(tileSize, 0.25, tileSize),
          new THREE.MeshStandardMaterial({
            color: isEven ? 0xf5f5dc : 0xe8e8d0,
            metalness: 0.3,
            roughness: 0.5
          })
        );
        tile.position.set(x + tileSize/2, 0.125, z + tileSize/2);
        tile.receiveShadow = true;
        scene.add(tile);
      }
    }

    // Outer marble walls forming rectangular enclosure
    const wallHeight = 18;
    const wallThickness = 1;
    const walls = [
      {x: 0, z: -100, w: 250, d: wallThickness},
      {x: 0, z: 100, w: 250, d: wallThickness},
      {x: -125, z: 0, w: wallThickness, d: 200},
      {x: 125, z: 0, w: wallThickness, d: 200}
    ];
    walls.forEach(({x, z, w, d}) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w, wallHeight, d),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
      );
      wall.position.set(x, wallHeight/2, z);
      wall.castShadow = false;
      wall.receiveShadow = true;
      scene.add(wall);
    });

    // Multiple rows of tall columns (20+)
    const columnLayout = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        columnLayout.push([-80 + col * 40, 0, -60 + row * 30]);
      }
    }

    columnLayout.forEach(([x, y, z]) => {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 16, 20),
        new THREE.MeshStandardMaterial({
          color: 0xf5f5dc,
          roughness: 0.7
        })
      );
      column.position.set(x, 8, z);
      column.castShadow = false;
      scene.add(column);

      const capital = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.2, 1.5, 20),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
      );
      capital.position.set(x, 16.75, z);
      capital.castShadow = false;
      scene.add(capital);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.8, 1, 20),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
      );
      base.position.set(x, 0.5, z);
      scene.add(base);
    });

    // Reading alcoves (small walled areas with benches)
    for (let i = 0; i < 6; i++) {
      const x = -110 + (i % 3) * 40;
      const z = -80 + Math.floor(i / 3) * 60;

      // Three walls forming alcove
      const alcoveWalls = [
        {lx: x - 5, lz: z, w: 0.3, d: 8},
        {lx: x + 5, lz: z, w: 0.3, d: 8},
        {lx: x, lz: z - 4, w: 10, d: 0.3}
      ];
      alcoveWalls.forEach(({lx, lz, w, d}) => {
        const alcoveWall = new THREE.Mesh(
          new THREE.BoxGeometry(w, 3, d),
          new THREE.MeshStandardMaterial({ color: 0xe8e8d0 })
        );
        alcoveWall.position.set(lx, 1.5, lz);
        alcoveWall.castShadow = false;
        scene.add(alcoveWall);
      });

      // Bench in alcove
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.3, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      bench.position.set(x, 0.4, z);
      bench.castShadow = false;
      scene.add(bench);
    }

    // Multiple bookshelves throughout (15+)
    const shelfPositions = [];
    for (let side = 0; side < 2; side++) {
      const baseX = side === 0 ? -120 : 120;
      for (let i = 0; i < 8; i++) {
        shelfPositions.push([baseX, -90 + i * 22]);
      }
    }

    shelfPositions.forEach(([x, z]) => {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(5, 8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      shelf.position.set(x, 4, z);
      shelf.castShadow = false;
      scene.add(shelf);

      // Books on shelf
      for (let j = 0; j < 25; j++) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, Math.random() * 1 + 0.6, 0.7),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
          })
        );
        book.position.set(
          x + (x > 0 ? -0.5 : 0.5),
          0.8 + Math.random() * 6.5,
          z + (j - 12) * 0.35
        );
        scene.add(book);
      }
    });

    // Raised lecture platform with steps
    const platformX = 80;
    const platformZ = -60;
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(25, 1.5, 20),
      new THREE.MeshStandardMaterial({ color: 0xdaa520 })
    );
    platform.position.set(platformX, 0.75, platformZ);
    platform.castShadow = false;
    platform.receiveShadow = true;
    scene.add(platform);

    // Steps up to platform
    for (let i = 0; i < 5; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.3, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xc9a81b })
      );
      step.position.set(platformX, i * 0.3, platformZ + 10 + i * 0.5);
      step.castShadow = false;
      step.receiveShadow = true;
      scene.add(step);
    }

    // Study desks scattered around
    for (let i = 0; i < 10; i++) {
      const deskX = -60 + (i % 5) * 25;
      const deskZ = 40 + Math.floor(i / 5) * 25;

      // Desk top
      const deskTop = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.2, 3),
        new THREE.MeshStandardMaterial({ color: 0x8b6914 })
      );
      deskTop.position.set(deskX, 1.5, deskZ);
      deskTop.castShadow = false;
      scene.add(deskTop);

      // Desk legs
      const legPositions = [[-2.5, -1], [2.5, -1], [-2.5, 1], [2.5, 1]];
      legPositions.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 1.5, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        leg.position.set(deskX + lx, 0.75, deskZ + lz);
        scene.add(leg);
      });
    }

    // Globe/orb displays on pedestals
    for (let i = 0; i < 6; i++) {
      const globeX = -40 + i * 16;
      const globeZ = 75;

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.8, 2, 12),
        new THREE.MeshStandardMaterial({ color: 0xa0826d })
      );
      pedestal.position.set(globeX, 1, globeZ);
      pedestal.castShadow = false;
      scene.add(pedestal);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 16),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(i / 6, 0.6, 0.5),
          metalness: 0.4,
          roughness: 0.6
        })
      );
      globe.position.set(globeX, 2.5, globeZ);
      globe.castShadow = false;
      scene.add(globe);
    }

    // Archways connecting sections
    for (let i = 0; i < 4; i++) {
      const archZ = -70 + i * 50;
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(4, 0.6, 16, 32, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
      );
      arch.position.set(0, 8, archZ);
      arch.rotation.y = Math.PI / 2;
      arch.castShadow = false;
      scene.add(arch);
    }

    // Floating light orbs throughout (emissive only)
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const radius = 50 + (i % 2) * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 1
        })
      );
      orb.position.set(x, 10 + Math.sin(i * 0.5) * 1.5, z);
      orb.userData.bobPhase = i * 0.5;
      orb.userData.bobbing = true;
      scene.add(orb);
    }

    // Ambient particles
    zoneParticles = createAmbientParticles(30, 0xffd700, 125, 18, 0.01);
    scene.add(zoneParticles);
  }

  function generateStudio(scene) {
    // Large amphitheater ground (250x250)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(250, 250),
      new THREE.MeshStandardMaterial({ color: 0xd2b48c })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Main central stage (larger)
    const mainStage = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 1.2, 32),
      new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.8
      })
    );
    mainStage.position.set(0, 0.6, 0);
    mainStage.castShadow = false;
    mainStage.receiveShadow = true;
    scene.add(mainStage);

    // Additional performance stages at different locations
    const additionalStages = [
      {x: 80, z: -80, r: 12},
      {x: -80, z: -80, r: 12},
      {x: 90, z: 90, r: 10}
    ];
    additionalStages.forEach(({x, z, r}) => {
      const stage = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, 1, 24),
        new THREE.MeshStandardMaterial({ color: 0x9b5523 })
      );
      stage.position.set(x, 0.5, z);
      stage.castShadow = false;
      stage.receiveShadow = true;
      scene.add(stage);
    });

    // Tiered seating (7 tiers)
    for (let i = 1; i <= 7; i++) {
      const tier = new THREE.Mesh(
        new THREE.CylinderGeometry(20 + i * 5, 20 + i * 5, 0.8, 32, 1, false, 0, Math.PI * 1.6),
        new THREE.MeshStandardMaterial({ color: 0xa0522d })
      );
      tier.position.set(0, 0.4 - i * 0.8, 0);
      tier.receiveShadow = true;
      scene.add(tier);
    }

    // Art gallery area with display walls
    const galleryX = -90;
    for (let i = 0; i < 6; i++) {
      const wallZ = -60 + i * 20;

      // Display wall
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 5, 15),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      wall.position.set(galleryX, 2.5, wallZ);
      wall.castShadow = false;
      scene.add(wall);

      // Paintings on wall
      for (let p = 0; p < 3; p++) {
        const painting = new THREE.Mesh(
          new THREE.PlaneGeometry(4, 3),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6)
          })
        );
        painting.position.set(galleryX - 0.2, 2.5, wallZ - 5 + p * 5);
        painting.rotation.y = Math.PI / 2;
        scene.add(painting);
      }
    }

    // Sculpture garden with various geometric shapes on pedestals
    const sculpturePositions = [
      {x: 60, z: -40}, {x: 75, z: -40}, {x: 90, z: -40},
      {x: 60, z: -25}, {x: 75, z: -25}, {x: 90, z: -25}
    ];
    sculpturePositions.forEach(({x, z}, i) => {
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.8, 2.5, 12),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
      );
      pedestal.position.set(x, 1.25, z);
      pedestal.castShadow = false;
      scene.add(pedestal);

      // Various sculpture shapes
      const shapes = [
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.ConeGeometry(1, 2.5, 12),
        new THREE.TorusGeometry(1, 0.4, 16, 32),
        new THREE.OctahedronGeometry(1.3),
        new THREE.TetrahedronGeometry(1.5)
      ];
      const sculpture = new THREE.Mesh(
        shapes[i % shapes.length],
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(i / 6, 0.8, 0.5),
          metalness: 0.6,
          roughness: 0.4
        })
      );
      sculpture.position.set(x, 3.5, z);
      sculpture.rotation.set(Math.random(), Math.random(), Math.random());
      sculpture.castShadow = false;
      scene.add(sculpture);
    });

    // Music circle with instrument-shaped objects
    const musicCircleX = -60;
    const musicCircleZ = 60;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = musicCircleX + Math.cos(angle) * 12;
      const z = musicCircleZ + Math.sin(angle) * 12;

      // Drum-like instrument
      if (i % 2 === 0) {
        const drum = new THREE.Mesh(
          new THREE.CylinderGeometry(1, 1.2, 1.5, 16),
          new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        drum.position.set(x, 0.75, z);
        drum.castShadow = false;
        scene.add(drum);
      } else {
        // String instrument stand
        const stand = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 2, 0.8),
          new THREE.MeshStandardMaterial({ color: 0xdaa520 })
        );
        stand.position.set(x, 1, z);
        stand.castShadow = false;
        scene.add(stand);
      }
    }

    // Reflective dance floor
    const danceFloor = new THREE.Mesh(
      new THREE.CircleGeometry(15, 32),
      new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.1
      })
    );
    danceFloor.rotation.x = -Math.PI / 2;
    danceFloor.position.set(40, 0.05, 40);
    danceFloor.receiveShadow = true;
    scene.add(danceFloor);

    // Workshop tables with craft supplies
    for (let i = 0; i < 5; i++) {
      const tableX = -40 + i * 12;
      const tableZ = -100;

      const table = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.3, 4),
        new THREE.MeshStandardMaterial({ color: 0xa0826d })
      );
      table.position.set(tableX, 1.5, tableZ);
      table.castShadow = false;
      scene.add(table);

      // Table legs
      const legPos = [[-3.5, -1.5], [3.5, -1.5], [-3.5, 1.5], [3.5, 1.5]];
      legPos.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        leg.position.set(tableX + lx, 0.75, tableZ + lz);
        scene.add(leg);
      });

      // Craft supplies on table
      for (let s = 0; s < 6; s++) {
        const supply = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.3, 0.5),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6)
          })
        );
        supply.position.set(
          tableX + (Math.random() - 0.5) * 6,
          1.8,
          tableZ + (Math.random() - 0.5) * 3
        );
        scene.add(supply);
      }
    }

    // Paint splash decorations on ground
    for (let i = 0; i < 40; i++) {
      const splash = new THREE.Mesh(
        new THREE.CircleGeometry(Math.random() * 1.5 + 0.5, 12),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6)
        })
      );
      splash.rotation.x = -Math.PI / 2;
      splash.position.set(
        (Math.random() - 0.5) * 180,
        0.06,
        (Math.random() - 0.5) * 180
      );
      scene.add(splash);
    }

    // Easels throughout
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const radius = 70 + Math.random() * 20;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      addEasel(scene, x, z);
    }

    // Stage light markers (emissive only, no actual spotlights for performance)
    const spotPositions = [{x: 0, z: 0}, {x: 80, z: -80}, {x: -80, z: -80}, {x: 90, z: 90}];
    spotPositions.forEach(({x, z}) => {
      const lightOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 1 })
      );
      lightOrb.position.set(x, 25, z);
      scene.add(lightOrb);
    });

    // Colorful bunting throughout
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 100;
      const z = Math.sin(angle) * 100;

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      pole.position.set(x, 5, z);
      pole.castShadow = false;
      scene.add(pole);

      // Flags connecting to next pole
      for (let j = 0; j < 8; j++) {
        const nextAngle = ((i + 1) / 12) * Math.PI * 2;
        const t = j / 8;
        const flagX = x + (Math.cos(nextAngle) * 100 - x) * t;
        const flagZ = z + (Math.sin(nextAngle) * 100 - z) * t;

        const flag = new THREE.Mesh(
          new THREE.ConeGeometry(0.6, 1.2, 3),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(t, 0.9, 0.6)
          })
        );
        flag.position.set(flagX, 9 - Math.sin(t * Math.PI) * 0.8, flagZ);
        flag.rotation.z = Math.PI / 2;
        scene.add(flag);
      }
    }

    // Musical note particles
    const noteParticles = createMusicalNotes();
    noteParticles.position.set(0, 0, 0);
    scene.add(noteParticles);

    // Ambient particles
    zoneParticles = createAmbientParticles(600, 0xff69b4, 125, 15, 0.04);
    scene.add(zoneParticles);
  }

  function generateWilds(scene) {
    // Very dramatic terrain with hills and valleys (400x400)
    const groundGeometry = new THREE.PlaneGeometry(400, 400, 100, 100);
    const positions = groundGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 8 +
                     Math.sin(x * 0.15) * 3 + Math.cos(y * 0.12) * 4 +
                     Math.sin(x * 0.3) * 1.5 + Math.cos(y * 0.25) * 2 +
                     Math.random() * 0.8;
      positions.setZ(i, height);
    }
    positions.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    const ground = new THREE.Mesh(
      groundGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x2d4a1e,
        roughness: 1
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Thick mysterious fog
    scene.fog = new THREE.Fog(0x334422, 30, 200);

    // Dense forest - 100+ trees
    for (let i = 0; i < 70; i++) {
      const x = (Math.random() - 0.5) * 380;
      const z = (Math.random() - 0.5) * 380;
      addPineTree(scene, x, z, 0.7 + Math.random() * 1.2);
    }

    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 380;
      const z = (Math.random() - 0.5) * 380;
      addOakTree(scene, x, z, 0.6 + Math.random() * 1.4);
    }

    // Twisted old trees (thicker trunks, wider canopies)
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 350;
      const z = (Math.random() - 0.5) * 350;

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.5, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a3a2a })
      );
      trunk.position.set(x, 4, z);
      trunk.rotation.z = (Math.random() - 0.5) * 0.4;
      trunk.castShadow = false;
      scene.add(trunk);

      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(4, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x1a3a1a })
      );
      canopy.position.set(x, 8, z);
      canopy.scale.set(1.2, 0.8, 1.2);
      canopy.castShadow = false;
      scene.add(canopy);
    }

    // 30+ rocks of varying sizes
    for (let i = 0; i < 35; i++) {
      const x = (Math.random() - 0.5) * 380;
      const z = (Math.random() - 0.5) * 380;
      const size = 1 + Math.random() * 3;

      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0, 0, 0.3 + Math.random() * 0.2)
        })
      );
      rock.position.set(x, size * 0.5, z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = false;
      scene.add(rock);
    }

    // 20+ glowing mushrooms
    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * 360;
      const z = (Math.random() - 0.5) * 360;
      addGlowingMushroom(scene, x, z);
    }

    // Multiple ancient ruin sites
    const ruinSites = [
      {x: -120, z: -100}, {x: 80, z: -120}, {x: -90, z: 110}, {x: 130, z: 90}
    ];

    ruinSites.forEach(({x, z}) => {
      // Broken columns
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 8 + Math.random() * 4;
        const cx = x + Math.cos(angle) * radius;
        const cz = z + Math.sin(angle) * radius;
        const height = 3 + Math.random() * 5;

        const column = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 1.1, height, 12),
          new THREE.MeshStandardMaterial({ color: 0x707070 })
        );
        column.position.set(cx, height / 2, cz);
        column.rotation.z = (Math.random() - 0.5) * 0.5;
        column.castShadow = false;
        scene.add(column);
      }

      // Fallen columns
      for (let i = 0; i < 3; i++) {
        const fx = x + (Math.random() - 0.5) * 15;
        const fz = z + (Math.random() - 0.5) * 15;

        const fallen = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.9, 6, 12),
          new THREE.MeshStandardMaterial({ color: 0x808080 })
        );
        fallen.position.set(fx, 0.8, fz);
        fallen.rotation.z = Math.PI / 2;
        fallen.rotation.y = Math.random() * Math.PI;
        fallen.castShadow = false;
        scene.add(fallen);
      }

      // Scattered stone blocks
      for (let i = 0; i < 10; i++) {
        const bx = x + (Math.random() - 0.5) * 20;
        const bz = z + (Math.random() - 0.5) * 20;
        const size = 0.8 + Math.random() * 2;

        const block = new THREE.Mesh(
          new THREE.BoxGeometry(size, size * 0.9, size * 1.1),
          new THREE.MeshStandardMaterial({ color: 0x606060 })
        );
        block.position.set(bx, size * 0.45, bz);
        block.rotation.set(
          (Math.random() - 0.5) * 0.5,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.3
        );
        block.castShadow = false;
        scene.add(block);
      }
    });

    // Mysterious cave entrance
    const caveX = 150;
    const caveZ = -150;
    const caveArch = new THREE.Mesh(
      new THREE.TorusGeometry(4, 1.5, 16, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    caveArch.position.set(caveX, 4, caveZ);
    caveArch.rotation.x = Math.PI / 2;
    caveArch.castShadow = false;
    scene.add(caveArch);

    const caveOpening = new THREE.Mesh(
      new THREE.CircleGeometry(3.5, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        emissive: 0x000000
      })
    );
    caveOpening.position.set(caveX, 2, caveZ - 0.1);
    caveOpening.rotation.y = Math.PI;
    scene.add(caveOpening);

    // Hidden forest clearings
    const clearings = [{x: -140, z: -140, r: 12}, {x: 160, z: 150, r: 15}];
    clearings.forEach(({x, z, r}) => {
      const clearing = new THREE.Mesh(
        new THREE.CircleGeometry(r, 32),
        new THREE.MeshStandardMaterial({ color: 0x4a6a2e })
      );
      clearing.rotation.x = -Math.PI / 2;
      clearing.position.set(x, 0.05, z);
      scene.add(clearing);

      // Flowers in clearing
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * r * 0.8;
        const fx = x + Math.cos(angle) * radius;
        const fz = z + Math.sin(angle) * radius;

        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 8, 8),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random() * 0.3 + 0.7, 0.8, 0.6)
          })
        );
        flower.position.set(fx, 0.15, fz);
        scene.add(flower);
      }
    });

    // Animal-like shapes
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;

      // Simple deer-like creature
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      body.position.set(x, 0.8, z);
      body.castShadow = false;
      scene.add(body);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      head.position.set(x + 0.8, 1.2, z);
      head.castShadow = false;
      scene.add(head);
    }

    // Waterfall
    const waterfallX = -160;
    const waterfallZ = 100;
    const waterfall = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 12),
      new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.4,
        metalness: 0.9,
        roughness: 0.1
      })
    );
    waterfall.position.set(waterfallX, 6, waterfallZ);
    scene.add(waterfall);

    // Waterfall pool
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(6, 24),
      new THREE.MeshStandardMaterial({
        color: 0x3377dd,
        transparent: true,
        opacity: 0.7,
        metalness: 0.8,
        roughness: 0.2
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(waterfallX, 0.05, waterfallZ + 4);
    scene.add(pool);

    // Ambient particles - fireflies
    zoneParticles = createFireflies();
    scene.add(zoneParticles);
  }

  function generateAgora(scene) {
    // Large cobblestone market square (250x250)
    const squareSize = 250;
    const cobbleSize = 1.2;
    for (let x = -squareSize/2; x < squareSize/2; x += cobbleSize) {
      for (let z = -squareSize/2; z < squareSize/2; z += cobbleSize) {
        const cobble = new THREE.Mesh(
          new THREE.BoxGeometry(cobbleSize * 0.95, 0.18, cobbleSize * 0.95),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0, 0, 0.4 + Math.random() * 0.15)
          })
        );
        cobble.position.set(
          x + cobbleSize/2 + (Math.random() - 0.5) * 0.15,
          0.09,
          z + cobbleSize/2 + (Math.random() - 0.5) * 0.15
        );
        cobble.receiveShadow = true;
        scene.add(cobble);
      }
    }

    // 20+ market stalls in organized rows forming streets
    const stallColors = [
      0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24,
      0xf0932b, 0xeb4d4b, 0x6ab04c, 0x7bed9f
    ];

    // Main market circle
    const innerStalls = 16;
    for (let i = 0; i < innerStalls; i++) {
      const angle = (i / innerStalls) * Math.PI * 2;
      const x = Math.cos(angle) * 40;
      const z = Math.sin(angle) * 40;
      addStall(scene, x, z, -angle, stallColors[i % stallColors.length]);
    }

    // Outer market streets
    const rows = 2;
    for (let row = 0; row < rows; row++) {
      const y_offset = row === 0 ? -80 : 80;
      for (let i = 0; i < 6; i++) {
        const x = -60 + i * 24;
        addStall(scene, x, y_offset, 0, stallColors[(i + row * 6) % stallColors.length]);
      }
    }

    // Central marketplace with large fountain
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 6, 3, 24),
      new THREE.MeshStandardMaterial({ color: 0x909090 })
    );
    fountain.position.set(0, 1.5, 0);
    fountain.castShadow = false;
    scene.add(fountain);

    const fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.5, 0.4, 24),
      new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.7,
        metalness: 0.8,
        roughness: 0.2
      })
    );
    fountainWater.position.set(0, 3, 0);
    scene.add(fountainWater);

    // Warehouse buildings
    const warehouses = [
      {x: -100, z: -100, w: 20, h: 8, d: 15},
      {x: 100, z: -100, w: 18, h: 7, d: 14},
      {x: -100, z: 100, w: 22, h: 9, d: 16}
    ];

    warehouses.forEach(({x, z, w, h, d}) => {
      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: 0xa0826d })
      );
      building.position.set(x, h/2, z);
      building.castShadow = false;
      building.receiveShadow = true;
      scene.add(building);

      // Roof
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 1, 0.5, d + 1),
        new THREE.MeshStandardMaterial({ color: 0x8b4513 })
      );
      roof.position.set(x, h + 0.25, z);
      roof.castShadow = false;
      scene.add(roof);

      // Door
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(3, 4, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      door.position.set(x, 2, z + d/2 + 0.1);
      scene.add(door);
    });

    // Cart/wagon shapes
    for (let i = 0; i < 8; i++) {
      const x = -80 + i * 20;
      const z = 50;

      // Cart body
      const cartBody = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      cartBody.position.set(x, 1, z);
      cartBody.castShadow = false;
      scene.add(cartBody);

      // Wheels
      const wheelPositions = [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]];
      wheelPositions.forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        wheel.position.set(x + wx, 0.4, z + wz);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = false;
        scene.add(wheel);
      });
    }

    // Crate stacks and barrel clusters everywhere
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;

      if (Math.random() > 0.5) {
        // Crate stack
        const height = Math.floor(Math.random() * 3) + 1;
        for (let h = 0; h < height; h++) {
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xa0826d })
          );
          crate.position.set(x, 0.4 + h * 0.8, z);
          crate.rotation.y = Math.random() * Math.PI;
          crate.castShadow = false;
          scene.add(crate);
        }
      } else {
        // Barrel cluster
        for (let b = 0; b < 3; b++) {
          const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 0.8, 12),
            new THREE.MeshStandardMaterial({ color: 0x8b6914 })
          );
          barrel.position.set(
            x + (Math.random() - 0.5) * 1.5,
            0.4,
            z + (Math.random() - 0.5) * 1.5
          );
          barrel.castShadow = false;
          scene.add(barrel);
        }
      }
    }

    // Raised auction platform
    const auctionPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 9, 1.5, 24),
      new THREE.MeshStandardMaterial({ color: 0xdaa520 })
    );
    auctionPlatform.position.set(80, 0.75, 80);
    auctionPlatform.castShadow = false;
    auctionPlatform.receiveShadow = true;
    scene.add(auctionPlatform);

    // Steps to auction platform
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.4, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xc9a81b })
      );
      step.position.set(80, i * 0.4, 88 + i * 0.5);
      step.castShadow = false;
      scene.add(step);
    }

    // Awning-covered walkways
    const walkwayCount = 8;
    for (let i = 0; i < walkwayCount; i++) {
      const x = -90;
      const z = -80 + i * 20;

      // Posts
      for (let p = 0; p < 3; p++) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        post.position.set(x + p * 3, 2, z);
        post.castShadow = false;
        scene.add(post);
      }

      // Awning roof
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.2, 4),
        new THREE.MeshStandardMaterial({
          color: stallColors[i % stallColors.length]
        })
      );
      awning.position.set(x + 3, 4, z);
      awning.castShadow = false;
      scene.add(awning);
    }

    // Signs and banners
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
      );
      pole.position.set(x, 2.5, z);
      scene.add(pole);

      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1.5),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
          side: THREE.DoubleSide
        })
      );
      sign.position.set(x, 4.5, z);
      sign.rotation.y = Math.random() * Math.PI * 2;
      scene.add(sign);
    }

    // Ambient particles - dust motes
    zoneParticles = createAmbientParticles(350, 0xd4a574, 125, 10, 0.015);
    scene.add(zoneParticles);
  }

  function generateCommons(scene) {
    // Rolling green parkland (300x300)
    const groundGeometry = new THREE.PlaneGeometry(300, 300, 60, 60);
    const positions = groundGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 2.5 +
                     Math.sin(x * 0.2) * 0.8 + Math.cos(y * 0.15) * 1.2;
      positions.setZ(i, height);
    }
    positions.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    const ground = new THREE.Mesh(
      groundGeometry,
      new THREE.MeshStandardMaterial({ color: 0x7cb342 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 15+ houses of varying sizes
    const houseLayout = [
      {x: -100, z: -80, size: 6}, {x: -80, z: -80, size: 5},
      {x: -60, z: -80, size: 7}, {x: -100, z: -50, size: 6},
      {x: -80, z: -50, size: 5}, {x: -60, z: -50, size: 6},
      {x: 60, z: -80, size: 7}, {x: 80, z: -80, size: 5},
      {x: 100, z: -80, size: 6}, {x: 60, z: -50, size: 5},
      {x: 80, z: -50, size: 6}, {x: 100, z: -50, size: 7},
      {x: -90, z: 60, size: 6}, {x: -60, z: 60, size: 5},
      {x: 70, z: 60, size: 6}
    ];

    houseLayout.forEach(({x, z, size}) => {
      addHouse(scene, x, z, size);
    });

    // Larger town hall building with columns
    const townHall = new THREE.Mesh(
      new THREE.BoxGeometry(20, 10, 15),
      new THREE.MeshStandardMaterial({ color: 0xf5deb3 })
    );
    townHall.position.set(0, 5, -110);
    townHall.castShadow = false;
    townHall.receiveShadow = true;
    scene.add(townHall);

    const townHallRoof = new THREE.Mesh(
      new THREE.ConeGeometry(14, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    townHallRoof.position.set(0, 13, -110);
    townHallRoof.rotation.y = Math.PI / 4;
    townHallRoof.castShadow = false;
    scene.add(townHallRoof);

    // Town hall columns
    const columnPos = [[-8, -5], [8, -5], [-8, 5], [8, 5]];
    columnPos.forEach(([cx, cz]) => {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.6, 10, 12),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      column.position.set(cx, 5, -110 + cz);
      column.castShadow = false;
      scene.add(column);
    });

    // Workshop area with anvils and workbenches
    const workshopX = -120;
    const workshopZ = 0;

    const workshop = new THREE.Mesh(
      new THREE.BoxGeometry(15, 7, 12),
      new THREE.MeshStandardMaterial({ color: 0xb0826d })
    );
    workshop.position.set(workshopX, 3.5, workshopZ);
    workshop.castShadow = false;
    scene.add(workshop);

    const workshopRoof = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.6, 13),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    workshopRoof.position.set(workshopX, 7.3, workshopZ);
    workshopRoof.castShadow = false;
    scene.add(workshopRoof);

    // Anvils outside workshop
    for (let i = 0; i < 3; i++) {
      const anvilX = workshopX + 10 + i * 3;
      const anvil = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.8, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x505050 })
      );
      anvil.position.set(anvilX, 0.6, workshopZ);
      anvil.castShadow = false;
      scene.add(anvil);
    }

    // Playground with swings and slides
    const playgroundX = 90;
    const playgroundZ = 90;

    // Swing set
    for (let i = 0; i < 3; i++) {
      const swingX = playgroundX + i * 3;

      // Frame
      const leftPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6b6b })
      );
      leftPost.position.set(swingX - 1, 2, playgroundZ);
      leftPost.castShadow = false;
      scene.add(leftPost);

      const rightPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6b6b })
      );
      rightPost.position.set(swingX + 1, 2, playgroundZ);
      rightPost.castShadow = false;
      scene.add(rightPost);

      const topBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6b6b })
      );
      topBar.position.set(swingX, 4, playgroundZ);
      topBar.rotation.z = Math.PI / 2;
      scene.add(topBar);

      // Swing seat
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.1, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x4ecdc4 })
      );
      seat.position.set(swingX, 1.5, playgroundZ);
      seat.castShadow = false;
      scene.add(seat);
    }

    // Slide
    const slideX = playgroundX + 12;
    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.2, 5),
      new THREE.MeshStandardMaterial({ color: 0xf9ca24 })
    );
    slide.position.set(slideX, 1.5, playgroundZ);
    slide.rotation.x = -Math.PI / 6;
    slide.castShadow = false;
    scene.add(slide);

    // Slide platform
    const slidePlatform = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3, 2),
      new THREE.MeshStandardMaterial({ color: 0xf0932b })
    );
    slidePlatform.position.set(slideX, 1.5, playgroundZ - 3);
    slidePlatform.castShadow = false;
    scene.add(slidePlatform);

    // Fenced garden areas
    const fenceAreas = [
      {x1: -50, z1: 20, x2: -30, z2: 20}, {x1: -30, z1: 20, x2: -30, z2: 40},
      {x1: -30, z1: 40, x2: -50, z2: 40}, {x1: -50, z1: 40, x2: -50, z2: 20},
      {x1: 30, z1: 20, x2: 50, z2: 20}, {x1: 50, z1: 20, x2: 50, z2: 40},
      {x1: 50, z1: 40, x2: 30, z2: 40}, {x1: 30, z1: 40, x2: 30, z2: 20}
    ];

    fenceAreas.forEach(({x1, z1, x2, z2}) => {
      addFence(scene, x1, z1, x2, z2);
    });

    // 15+ lampposts along paths
    const lampLayout = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      lampLayout.push({
        x: Math.cos(angle) * 120,
        z: Math.sin(angle) * 120
      });
    }

    lampLayout.forEach(({x, z}) => {
      addLamppost(scene, x, z);
    });

    // Community well
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.5, 2.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x808080 })
    );
    well.position.set(0, 1.25, 30);
    well.castShadow = false;
    scene.add(well);

    const wellRoof = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 2, 4),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    wellRoof.position.set(0, 3.5, 30);
    wellRoof.rotation.y = Math.PI / 4;
    scene.add(wellRoof);

    // Park benches throughout
    for (let i = 0; i < 12; i++) {
      const benchX = -50 + (i % 4) * 30;
      const benchZ = -30 + Math.floor(i / 4) * 30;

      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.3, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      bench.position.set(benchX, 0.5, benchZ);
      bench.castShadow = false;
      scene.add(bench);

      const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.8, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      backrest.position.set(benchX, 1, benchZ - 0.4);
      backrest.castShadow = false;
      scene.add(backrest);
    }

    // Stone pathways connecting buildings
    const pathSegments = [
      {x: 0, z: -110, w: 8, l: 40}, {x: -80, z: -65, w: 40, l: 8},
      {x: 80, z: -65, w: 40, l: 8}, {x: 0, z: 0, w: 8, l: 80}
    ];

    pathSegments.forEach(({x, z, w, l}) => {
      const path = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.15, l),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
      );
      path.position.set(x, 0.1, z);
      path.receiveShadow = true;
      scene.add(path);
    });

    // Small lake
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(25, 32),
      new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.75,
        metalness: 0.8,
        roughness: 0.2
      })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(-20, 0.05, 110);
    scene.add(lake);

    // Ambient particles
    zoneParticles = createAmbientParticles(300, 0xffffff, 150, 12, 0.01);
    scene.add(zoneParticles);
  }

  function generateArena(scene) {
    // Large sandy arena floor (200x200)
    const arenaFloor = new THREE.Mesh(
      new THREE.CircleGeometry(100, 64),
      new THREE.MeshStandardMaterial({
        color: 0xdaa520,
        roughness: 0.95
      })
    );
    arenaFloor.rotation.x = -Math.PI / 2;
    arenaFloor.receiveShadow = true;
    scene.add(arenaFloor);

    // Multiple concentric ring markings
    const rings = [
      {inner: 19, outer: 20}, {inner: 39, outer: 40},
      {inner: 59, outer: 60}, {inner: 79, outer: 80}
    ];

    rings.forEach(({inner, outer}) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 64),
        new THREE.MeshStandardMaterial({ color: 0x8b4513 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      scene.add(ring);
    });

    // Grand colosseum walls (40+ segments, much taller)
    const wallSegments = 48;
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const x = Math.cos(angle) * 95;
      const z = Math.sin(angle) * 95;

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 15, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xa0826d })
      );
      wall.position.set(x, 7.5, z);
      wall.rotation.y = angle;
      wall.castShadow = false;
      wall.receiveShadow = true;
      scene.add(wall);

      // Decorative top
      const wallTop = new THREE.Mesh(
        new THREE.BoxGeometry(6.5, 1, 3),
        new THREE.MeshStandardMaterial({ color: 0xc9a06d })
      );
      wallTop.position.set(x, 15.5, z);
      wallTop.rotation.y = angle;
      wallTop.castShadow = false;
      scene.add(wallTop);

      // Banners
      if (i % 6 === 0) {
        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(3, 6),
          new THREE.MeshStandardMaterial({
            color: i % 12 === 0 ? 0xff0000 : 0x0000ff,
            side: THREE.DoubleSide
          })
        );
        banner.position.set(
          Math.cos(angle) * 92,
          10,
          Math.sin(angle) * 92
        );
        banner.rotation.y = angle + Math.PI;
        scene.add(banner);
      }
    }

    // 6+ tiers of seating
    for (let tier = 0; tier < 7; tier++) {
      const seats = new THREE.Mesh(
        new THREE.CylinderGeometry(
          85 - tier * 5,
          85 - tier * 5,
          1.2,
          48,
          1,
          false,
          0,
          Math.PI * 2
        ),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      seats.position.set(0, 0.6 + tier * 1.5, 0);
      seats.receiveShadow = true;
      scene.add(seats);
    }

    // Grand entrance arch
    const entranceAngle = 0;
    const entranceX = Math.cos(entranceAngle) * 95;
    const entranceZ = Math.sin(entranceAngle) * 95;

    const entranceArch = new THREE.Mesh(
      new THREE.TorusGeometry(6, 1.2, 16, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xdaa520 })
    );
    entranceArch.position.set(entranceX, 8, entranceZ);
    entranceArch.rotation.y = entranceAngle - Math.PI / 2;
    entranceArch.castShadow = false;
    scene.add(entranceArch);

    // Corner tower structures
    const towerAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    towerAngles.forEach((angle) => {
      const x = Math.cos(angle) * 98;
      const z = Math.sin(angle) * 98;

      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3.5, 20, 12),
        new THREE.MeshStandardMaterial({ color: 0x907050 })
      );
      tower.position.set(x, 10, z);
      tower.castShadow = false;
      scene.add(tower);

      const towerTop = new THREE.Mesh(
        new THREE.ConeGeometry(4, 4, 12),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      towerTop.position.set(x, 22, z);
      towerTop.castShadow = false;
      scene.add(towerTop);
    });

    // Weapon rack displays
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 16;
      const x = Math.cos(angle) * 88;
      const z = Math.sin(angle) * 88;

      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 3, 2),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      rack.position.set(x, 1.5, z);
      rack.rotation.y = angle;
      rack.castShadow = false;
      scene.add(rack);

      // Weapons on rack
      for (let w = 0; w < 3; w++) {
        const weapon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 2, 8),
          new THREE.MeshStandardMaterial({ color: 0xc0c0c0 })
        );
        weapon.position.set(
          x + Math.cos(angle + Math.PI) * 0.3,
          1.5 + (w - 1) * 0.8,
          z + Math.sin(angle + Math.PI) * 0.3
        );
        weapon.rotation.z = Math.PI / 2;
        weapon.rotation.y = angle;
        scene.add(weapon);
      }
    }

    // Champion's podium with 3 levels
    const podiumX = 0;
    const podiumZ = -70;

    const podiumLevels = [
      {h: 1.5, w: 4, color: 0xcd7f32}, // Bronze (3rd)
      {h: 2.5, w: 4, color: 0xc0c0c0}, // Silver (2nd)
      {h: 3.5, w: 4, color: 0xffd700}  // Gold (1st)
    ];

    podiumLevels.forEach(({h, w, color}, i) => {
      const x = podiumX + (i - 1) * 5;
      const level = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, w),
        new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.7,
          roughness: 0.3
        })
      );
      level.position.set(x, h / 2, podiumZ);
      level.castShadow = false;
      scene.add(level);
    });

    // 20+ torches around perimeter
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const x = Math.cos(angle) * 90;
      const z = Math.sin(angle) * 90;

      const holder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a })
      );
      holder.position.set(x, 14, z);
      scene.add(holder);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 10, 10),
        new THREE.MeshStandardMaterial({
          color: 0xff4500,
          emissive: 0xff4500,
          emissiveIntensity: 1.2
        })
      );
      flame.position.set(x, 15.5, z);
      flame.scale.y = 1.3;
      scene.add(flame);

      const light = new THREE.PointLight(0xff4500, 1, 18);
      light.position.set(x, 15.5, z);
      scene.add(light);
    }

    // Ambient particles - rising embers
    zoneParticles = createEmberParticles();
    scene.add(zoneParticles);
  }

  // Helper functions for zone elements

  function addPineTree(scene, x, z, scale = 1) {
    // Trunk with color variation
    const trunkColor = new THREE.Color(0x4a3728).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 6 * scale, 8),
      new THREE.MeshStandardMaterial({ color: trunkColor })
    );
    trunk.position.set(x, 3 * scale, z);
    trunk.castShadow = false;
    scene.add(trunk);

    // Cone foliage (varying tiers)
    const tiers = 3 + Math.floor(Math.random() * 2);
    const foliageColor = new THREE.Color(0x1a4d2e).offsetHSL(0, 0, (Math.random() - 0.5) * 0.15);
    for (let i = 0; i < tiers; i++) {
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry((1.5 - i * 0.3) * scale, 3 * scale, 8),
        new THREE.MeshStandardMaterial({ color: foliageColor })
      );
      foliage.position.set(x, (5 + i * 1.8) * scale, z);
      foliage.castShadow = false;
      scene.add(foliage);
    }
  }

  function addOakTree(scene, x, z, scale = 1) {
    // Trunk with color variation
    const trunkColor = new THREE.Color(0x654321).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4 * scale, 0.5 * scale, 5 * scale, 8),
      new THREE.MeshStandardMaterial({ color: trunkColor })
    );
    trunk.position.set(x, 2.5 * scale, z);
    trunk.castShadow = false;
    scene.add(trunk);

    // Round foliage with size variation
    const foliageSize = (2 + Math.random() * 0.8) * scale;
    const foliageColor = new THREE.Color(0x228b22).offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(foliageSize, 12, 12),
      new THREE.MeshStandardMaterial({ color: foliageColor })
    );
    foliage.position.set(x, 6 * scale, z);
    foliage.castShadow = false;
    scene.add(foliage);
  }

  function addCherryTree(scene, x, z) {
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    trunk.position.set(x, 2, z);
    trunk.castShadow = false;
    scene.add(trunk);

    // Pink blossom foliage with variation
    const blossomColor = new THREE.Color(0xffb7c5).offsetHSL((Math.random() - 0.5) * 0.05, 0, 0);
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(2 + Math.random() * 0.5, 10, 10),
      new THREE.MeshStandardMaterial({ color: blossomColor })
    );
    foliage.position.set(x, 5, z);
    foliage.castShadow = false;
    scene.add(foliage);
  }

  function addGardenPlot(scene, x, z) {
    // Soil plot
    const plot = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x4a3728 })
    );
    plot.position.set(x, 0.1, z);
    scene.add(plot);

    // Sprouts
    for (let i = 0; i < 12; i++) {
      const sprout = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x90ee90 })
      );
      sprout.position.set(
        x + (Math.random() - 0.5) * 3,
        0.4,
        z + (Math.random() - 0.5) * 3
      );
      scene.add(sprout);
    }
  }

  function addGlowingMushroom(scene, x, z) {
    const colors = [0xff00ff, 0x00ffff, 0x00ff00];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0xcccccc })
    );
    stem.position.set(x, 0.3, z);
    scene.add(stem);

    // Cap
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5
      })
    );
    cap.position.set(x, 0.6, z);
    cap.scale.y = 0.5;
    scene.add(cap);

    // Glow light
    const light = new THREE.PointLight(color, 0.3, 5);
    light.position.set(x, 0.6, z);
    scene.add(light);
  }

  function addBush(scene, x, z) {
    // Small green sphere cluster
    const bushColor = new THREE.Color(0x2d5016).offsetHSL(0, 0, (Math.random() - 0.5) * 0.15);
    const bushSize = 0.4 + Math.random() * 0.3;
    for (let i = 0; i < 4; i++) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(bushSize, 10, 10),
        new THREE.MeshStandardMaterial({ color: bushColor })
      );
      sphere.position.set(
        x + (Math.random() - 0.5) * 0.6,
        bushSize * 0.8,
        z + (Math.random() - 0.5) * 0.6
      );
      sphere.castShadow = false;
      scene.add(sphere);
    }
  }

  function addFlowerCluster(scene, x, z, color) {
    const colors = color ? [color] : [0xff69b4, 0xffa500, 0xffff00, 0xff1493, 0xda70d6];
    const count = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 6, 6),
        new THREE.MeshStandardMaterial({
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      );
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2;
      flower.position.set(
        x + Math.cos(angle) * radius,
        0.1,
        z + Math.sin(angle) * radius
      );
      scene.add(flower);
    }
  }

  function addHouse(scene, x, z, size) {
    // House base
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(size, size * 0.7, size),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xdeb887).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1)
      })
    );
    house.position.set(x, size * 0.35, z);
    house.castShadow = false;
    scene.add(house);

    // Pyramid roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(size * 0.8, size * 0.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    roof.position.set(x, size * 0.7 + size * 0.3, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = false;
    scene.add(roof);

    // Door
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.25, size * 0.45, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    door.position.set(x, size * 0.225, z + size * 0.5 + 0.05);
    scene.add(door);

    // Window
    const window = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 0.15, size * 0.15),
      new THREE.MeshStandardMaterial({ color: 0x87ceeb })
    );
    window.position.set(x + size * 0.3, size * 0.4, z + size * 0.5 + 0.05);
    scene.add(window);
  }

  function addFence(scene, x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const posts = Math.ceil(length / 1.5);

    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const x = x1 + dx * t;
      const z = z1 + dz * t;

      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.8, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      post.position.set(x, 0.9, z);
      post.castShadow = false;
      scene.add(post);
    }

    // Horizontal rails
    for (let r = 0; r < 2; r++) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, length),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      rail.position.set((x1 + x2) / 2, 0.6 + r * 0.6, (z1 + z2) / 2);
      rail.rotation.y = Math.atan2(dz, dx) - Math.PI / 2;
      scene.add(rail);
    }
  }

  function addBridge(scene, x, z, rotation) {
    // Bridge planks
    for (let i = 0; i < 8; i++) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.2, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      plank.position.set(x, 0.3, z + (i - 3.5) * 0.9);
      plank.rotation.y = rotation;
      plank.castShadow = false;
      scene.add(plank);
    }

    // Support posts
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1.8 : 1.8;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      post.position.set(
        x + Math.cos(rotation) * side,
        0.25,
        z + Math.sin(rotation) * side
      );
      scene.add(post);
    }
  }

  function addLamppost(scene, x, z) {
    // Post
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 4.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    post.position.set(x, 2.25, z);
    scene.add(post);

    // Lamp (emissive only for glow effect)
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 6, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffa500,
        emissiveIntensity: 0.8
      })
    );
    lamp.position.set(x, 4.6, z);
    scene.add(lamp);
  }

  function addStall(scene, x, z, rotation, canopyColor) {
    // Stall structure
    const stall = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x8b7355 })
    );
    stall.position.set(x, 1.5, z);
    stall.rotation.y = rotation;
    stall.castShadow = false;
    scene.add(stall);

    // Colorful canopy
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.25, 4),
      new THREE.MeshStandardMaterial({ color: canopyColor })
    );
    canopy.position.set(x, 3.25, z);
    canopy.rotation.y = rotation;
    canopy.castShadow = false;
    scene.add(canopy);

    // Hanging lantern (emissive only for glow effect)
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 6, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8
      })
    );
    lantern.position.set(x, 3, z);
    scene.add(lantern);

    // Goods on stall
    for (let i = 0; i < 5; i++) {
      const item = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6)
        })
      );
      item.position.set(
        x + (Math.random() - 0.5) * 4,
        1.2,
        z + (Math.random() - 0.5) * 2.5
      );
      item.rotation.set(Math.random(), Math.random(), Math.random());
      scene.add(item);
    }
  }

  function addEasel(scene, x, z) {
    // Easel legs
    const leg1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    leg1.position.set(x, 1, z);
    leg1.rotation.z = 0.2;
    scene.add(leg1);

    const leg2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    leg2.position.set(x, 1, z);
    leg2.rotation.z = -0.2;
    scene.add(leg2);

    // Canvas
    const canvas = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.5, 0.05),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6)
      })
    );
    canvas.position.set(x, 1.8, z);
    canvas.rotation.x = -0.1;
    scene.add(canvas);
  }

  function createFountainParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    for (let i = 0; i < 100; i++) {
      positions.push(0, 0, 0);
      velocities.push(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 0.5
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.userData.velocities = velocities;
    geometry.userData.time = 0;

    const material = new THREE.PointsMaterial({
      color: 0x6699ff,
      size: 0.15,
      transparent: true,
      opacity: 0.8
    });

    return new THREE.Points(geometry, material);
  }

  function createMusicalNotes() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      positions.push(
        Math.cos(angle) * 8,
        Math.random() * 3,
        Math.sin(angle) * 8
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.userData.time = 0;

    const material = new THREE.PointsMaterial({
      color: 0xff69b4,
      size: 0.3,
      transparent: true,
      opacity: 0.7
    });

    return new THREE.Points(geometry, material);
  }

  function createAmbientParticles(count, baseColor, range, height, speed) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const velocities = [];

    const color = new THREE.Color(baseColor);

    for (let i = 0; i < count; i++) {
      positions.push(
        (Math.random() - 0.5) * range * 2,
        Math.random() * height,
        (Math.random() - 0.5) * range * 2
      );

      // Slight color variation
      const c = color.clone();
      c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.2);
      colors.push(c.r, c.g, c.b);

      velocities.push(
        (Math.random() - 0.5) * speed,
        Math.random() * speed,
        (Math.random() - 0.5) * speed
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.userData.velocities = velocities;
    geometry.userData.range = range;
    geometry.userData.height = height;

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.isAmbientParticles = true;
    return particles;
  }

  function createFireflies() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < 150; i++) {
      positions.push(
        (Math.random() - 0.5) * 120,
        Math.random() * 8 + 1,
        (Math.random() - 0.5) * 120
      );

      const brightness = Math.random();
      colors.push(brightness, brightness * 0.9, 0);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.userData.time = 0;

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const fireflies = new THREE.Points(geometry, material);
    fireflies.userData.isFireflies = true;
    return fireflies;
  }

  function createEmberParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 30;
      positions.push(
        Math.cos(angle) * radius,
        Math.random() * 5,
        Math.sin(angle) * radius
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.userData.time = 0;

    const material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.2,
      transparent: true,
      opacity: 0.7
    });

    const embers = new THREE.Points(geometry, material);
    embers.userData.isEmbers = true;
    return embers;
  }

  /**
   * Add player to scene
   * @param {object} sceneCtx
   * @param {string} playerId
   * @param {object} position - {x, y, z}
   */
  function addPlayer(sceneCtx, playerId, position) {
    if (!sceneCtx || !sceneCtx.scene) return;
    if (typeof THREE === 'undefined') return;

    const { scene } = sceneCtx;

    const playerGroup = new THREE.Group();

    // Legs (two cylinders)
    const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x4488ff });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.4, 0);
    leftLeg.castShadow = false;
    playerGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.4, 0);
    rightLeg.castShadow = false;
    playerGroup.add(rightLeg);

    // Body (box)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x4488ff })
    );
    body.position.set(0, 1.2, 0);
    body.castShadow = false;
    playerGroup.add(body);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xffddaa });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.35, 1.1, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = false;
    playerGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.35, 1.1, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = false;
    playerGroup.add(rightArm);

    // Head (sphere)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffddaa })
    );
    head.position.set(0, 1.75, 0);
    head.castShadow = false;
    playerGroup.add(head);

    // Shadow circle
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    playerGroup.add(shadow);

    playerGroup.position.set(position.x, position.y, position.z);
    playerGroup.userData.bobPhase = Math.random() * Math.PI * 2;

    // Create text label (sprite with canvas texture)
    const label = createTextSprite(playerId);
    label.position.y = 2.5;
    playerGroup.add(label);

    scene.add(playerGroup);
    playerMeshes.set(playerId, { mesh: playerGroup, label });
  }

  /**
   * Move player (with lerp for smooth movement)
   * @param {object} sceneCtx
   * @param {string} playerId
   * @param {object} position - {x, y, z}
   */
  function movePlayer(sceneCtx, playerId, position) {
    const playerData = playerMeshes.get(playerId);
    if (!playerData) return;

    const { mesh } = playerData;
    const target = new THREE.Vector3(position.x, position.y, position.z);

    // Lerp for smooth movement
    mesh.position.lerp(target, 0.1);

    // Rotate to face movement direction
    if (mesh.position.distanceTo(target) > 0.1) {
      const direction = new THREE.Vector3().subVectors(target, mesh.position);
      const angle = Math.atan2(direction.x, direction.z);
      mesh.rotation.y = angle;
    }
  }

  /**
   * Remove player from scene
   * @param {object} sceneCtx
   * @param {string} playerId
   */
  function removePlayer(sceneCtx, playerId) {
    if (!sceneCtx || !sceneCtx.scene) return;

    const playerData = playerMeshes.get(playerId);
    if (!playerData) return;

    sceneCtx.scene.remove(playerData.mesh);
    playerMeshes.delete(playerId);
  }

  /**
   * Create text sprite for player name label
   * @param {string} text
   * @returns {THREE.Sprite}
   */
  function createTextSprite(text) {
    if (typeof document === 'undefined') {
      return new THREE.Sprite(); // Fallback for Node.js
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'Bold 24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 0.5, 1);

    return sprite;
  }

  /**
   * Update day/night cycle
   * @param {object} sceneCtx
   * @param {number} worldTime - 0-1440 (minutes in 24-hour cycle)
   */
  function updateDayNight(sceneCtx, worldTime) {
    if (!sceneCtx || !sceneCtx.scene) return;

    const { scene, ambientLight, directionalLight } = sceneCtx;

    // Calculate phase (0-24 hours)
    const hour = (worldTime / 60) % 24;

    let intensity, lightColor, skyColor, fogColor;
    let sunVisible = false;
    let moonVisible = false;
    let starsOpacity = 0;

    if (hour >= 5 && hour < 7) {
      // Dawn
      const t = (hour - 5) / 2;
      intensity = 0.3 + t * 0.5;
      lightColor = new THREE.Color().setHSL(0.1, 0.6, 0.6 + t * 0.2);
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x1a1a2e),
        new THREE.Color(0xff9966),
        t
      );
      fogColor = skyColor;
      sunVisible = true;
      starsOpacity = 1 - t;
    } else if (hour >= 7 && hour < 17) {
      // Day
      intensity = 0.8;
      lightColor = new THREE.Color(0xfff8e7);
      skyColor = new THREE.Color(0x87ceeb);
      fogColor = skyColor;
      sunVisible = true;
    } else if (hour >= 17 && hour < 19) {
      // Dusk
      const t = (hour - 17) / 2;
      intensity = 0.8 - t * 0.5;
      lightColor = new THREE.Color().setHSL(0.08, 0.8, 0.6 - t * 0.2);
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xff6644),
        new THREE.Color(0x1a1a2e),
        t
      );
      fogColor = skyColor;
      sunVisible = true;
      starsOpacity = t;
    } else {
      // Night
      intensity = 0.3;
      lightColor = new THREE.Color(0x9999cc);
      skyColor = new THREE.Color(0x0a0a1e);
      fogColor = new THREE.Color(0x1a1a2e);
      moonVisible = true;
      starsOpacity = 1;
    }

    // Update lighting
    directionalLight.intensity = intensity;
    directionalLight.color.copy(lightColor);
    ambientLight.intensity = intensity * 0.4;

    // Update sky
    if (skyDome) {
      skyDome.material.color.copy(skyColor);
    }

    // Update fog
    if (scene.fog) {
      scene.fog.color.copy(fogColor);
    }

    // Update sun/moon position (moves across the sky)
    const celestialAngle = ((hour - 6) / 12) * Math.PI;
    const celestialX = Math.cos(celestialAngle) * 200;
    const celestialY = Math.sin(celestialAngle) * 200;

    if (sunMesh) {
      sunMesh.visible = sunVisible;
      if (sunVisible) {
        sunMesh.position.set(celestialX, celestialY, 100);
        directionalLight.position.copy(sunMesh.position);
      }
    }

    if (moonMesh) {
      moonMesh.visible = moonVisible;
      if (moonVisible) {
        const moonAngle = celestialAngle + Math.PI;
        moonMesh.position.set(
          Math.cos(moonAngle) * 200,
          Math.sin(moonAngle) * 200,
          100
        );
        directionalLight.position.copy(moonMesh.position);
      }
    }

    // Update stars
    if (stars) {
      stars.material.opacity = starsOpacity;
    }

    // Animate particles and other objects
    if (typeof window !== 'undefined') {
      scene.traverse((obj) => {
        // Bobbing light orbs
        if (obj.userData.bobbing) {
          obj.userData.bobPhase = (obj.userData.bobPhase || 0) + 0.02;
          obj.position.y = 8 + Math.sin(obj.userData.bobPhase) * 0.5;
        }

        // Fountain particles
        if (obj.isPoints && obj.geometry.userData.velocities) {
          const positions = obj.geometry.attributes.position;
          const velocities = obj.geometry.userData.velocities;

          for (let i = 0; i < positions.count; i++) {
            let y = positions.getY(i) + velocities[i * 3 + 1] * 0.1;

            if (y > 3) {
              positions.setY(i, 0);
            } else {
              positions.setY(i, y);
            }
          }
          positions.needsUpdate = true;
        }

        // Ambient particles
        if (obj.userData.isAmbientParticles) {
          const positions = obj.geometry.attributes.position;
          const velocities = obj.geometry.userData.velocities;
          const range = obj.geometry.userData.range;
          const height = obj.geometry.userData.height;

          for (let i = 0; i < positions.count; i++) {
            let x = positions.getX(i) + velocities[i * 3];
            let y = positions.getY(i) + velocities[i * 3 + 1];
            let z = positions.getZ(i) + velocities[i * 3 + 2];

            if (Math.abs(x) > range) x = -x;
            if (y > height) y = 0;
            if (y < 0) y = height;
            if (Math.abs(z) > range) z = -z;

            positions.setX(i, x);
            positions.setY(i, y);
            positions.setZ(i, z);
          }
          positions.needsUpdate = true;
        }

        // Fireflies
        if (obj.userData.isFireflies) {
          obj.userData.time = (obj.userData.time || 0) + 0.02;
          const positions = obj.geometry.attributes.position;

          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i) + Math.sin(obj.userData.time + i) * 0.05;
            const y = positions.getY(i) + Math.cos(obj.userData.time + i) * 0.02;
            const z = positions.getZ(i) + Math.sin(obj.userData.time + i * 1.5) * 0.05;

            positions.setX(i, x);
            positions.setY(i, y);
            positions.setZ(i, z);
          }
          positions.needsUpdate = true;
        }

        // Embers
        if (obj.userData.isEmbers) {
          const positions = obj.geometry.attributes.position;

          for (let i = 0; i < positions.count; i++) {
            let y = positions.getY(i) + 0.05;

            if (y > 15) {
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * 30;
              positions.setX(i, Math.cos(angle) * radius);
              positions.setY(i, 0);
              positions.setZ(i, Math.sin(angle) * radius);
            } else {
              positions.setY(i, y);
            }
          }
          positions.needsUpdate = true;
        }

        // Player bobbing
        if (obj.isGroup && obj.userData.bobPhase !== undefined) {
          obj.userData.bobPhase += 0.05;
          obj.position.y += Math.sin(obj.userData.bobPhase) * 0.002;
        }
      });
    }
  }

  /**
   * Update weather effects
   * @param {object} sceneCtx
   * @param {string} weatherType - 'clear', 'rain', 'snow'
   */
  function updateWeather(sceneCtx, weatherType) {
    if (!sceneCtx || !sceneCtx.scene) return;
    if (typeof THREE === 'undefined') return;

    const { scene } = sceneCtx;

    // Remove existing weather
    scene.children.forEach(child => {
      if (child.userData && child.userData.weather) {
        scene.remove(child);
      }
    });

    if (weatherType === 'rain') {
      // Rain particles
      const rainGeometry = new THREE.BufferGeometry();
      const rainPositions = [];
      const rainVelocities = [];

      for (let i = 0; i < 2000; i++) {
        rainPositions.push(
          (Math.random() - 0.5) * 150,
          Math.random() * 80,
          (Math.random() - 0.5) * 150
        );
        rainVelocities.push(
          (Math.random() - 0.5) * 0.2,
          -2 - Math.random(),
          (Math.random() - 0.5) * 0.2
        );
      }

      rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));
      rainGeometry.userData.velocities = rainVelocities;

      const rainMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.15,
        transparent: true,
        opacity: 0.6
      });

      const rain = new THREE.Points(rainGeometry, rainMaterial);
      rain.userData.weather = true;
      scene.add(rain);

      // Darken ambient
      if (scene.fog) {
        scene.fog.color.setHex(0x666666);
      }
    } else if (weatherType === 'snow') {
      // Snow particles
      const snowGeometry = new THREE.BufferGeometry();
      const snowPositions = [];
      const snowVelocities = [];

      for (let i = 0; i < 1000; i++) {
        snowPositions.push(
          (Math.random() - 0.5) * 150,
          Math.random() * 80,
          (Math.random() - 0.5) * 150
        );
        snowVelocities.push(
          (Math.random() - 0.5) * 0.1,
          -0.3 - Math.random() * 0.2,
          (Math.random() - 0.5) * 0.1
        );
      }

      snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowPositions, 3));
      snowGeometry.userData.velocities = snowVelocities;

      const snowMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.3,
        transparent: true,
        opacity: 0.8
      });

      const snow = new THREE.Points(snowGeometry, snowMaterial);
      snow.userData.weather = true;
      scene.add(snow);

      // Cool tint
      if (scene.fog) {
        scene.fog.color.setHex(0xccddff);
      }
    } else {
      // Clear weather - restore normal fog
      if (scene.fog) {
        scene.fog.color.setHex(0x87ceeb);
      }
    }
  }

  /**
   * Add portal to scene
   * @param {object} sceneCtx
   * @param {object} position - {x, y, z}
   * @param {string} targetZone
   */
  function addPortal(sceneCtx, position, targetZone) {
    if (!sceneCtx || !sceneCtx.scene) return;
    if (typeof THREE === 'undefined') return;

    const { scene } = sceneCtx;

    // Portal colors based on zone
    const portalColors = {
      nexus: 0xffd700,
      gardens: 0x90ee90,
      athenaeum: 0x9370db,
      studio: 0xff69b4,
      wilds: 0x228b22,
      agora: 0xff8c00,
      commons: 0x87ceeb,
      arena: 0xff4500
    };

    const portalColor = portalColors[targetZone] || 0x00ffff;

    const portalGroup = new THREE.Group();

    // Torus archway
    const portal = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.4, 8, 16),
      new THREE.MeshStandardMaterial({
        color: portalColor,
        emissive: portalColor,
        emissiveIntensity: 0.7,
        metalness: 0.5,
        roughness: 0.3
      })
    );
    portal.rotation.y = Math.PI / 4;
    portalGroup.add(portal);

    // Floating text label
    const label = createTextSprite(targetZone.charAt(0).toUpperCase() + targetZone.slice(1));
    label.position.y = 3.5;
    portalGroup.add(label);

    portalGroup.position.set(position.x, position.y + 2, position.z);
    portalGroup.userData.portal = true;
    portalGroup.userData.targetZone = targetZone;
    portalGroup.userData.pulsePhase = Math.random() * Math.PI * 2;

    scene.add(portalGroup);

    // Animate portal
    if (typeof window !== 'undefined') {
      const animatePortal = () => {
        if (!scene.children.includes(portalGroup)) return;

        portalGroup.userData.pulsePhase += 0.02;
        portal.rotation.z += 0.01;

        const pulse = Math.sin(portalGroup.userData.pulsePhase) * 0.3 + 1;
        portal.material.emissiveIntensity = pulse;

        requestAnimationFrame(animatePortal);
      };
      animatePortal();
    }
  }

  /**
   * Add generic structure to scene
   * @param {object} sceneCtx
   * @param {object} structure - {position: {x,y,z}, size: {w,h,d}, color}
   */
  function addStructure(sceneCtx, structure) {
    if (!sceneCtx || !sceneCtx.scene) return;
    if (typeof THREE === 'undefined') return;

    const { scene } = sceneCtx;
    const { position, size, color } = structure;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(size.w, size.h, size.d),
      new THREE.MeshStandardMaterial({ color: color || 0x8b4513 })
    );
    box.position.set(position.x, position.y + size.h / 2, position.z);
    box.castShadow = false;
    box.receiveShadow = true;
    scene.add(box);
  }

  /**
   * Distance-based light culling — only enable lights near the player.
   * Call this every frame from the game loop.
   * @param {object} sceneCtx
   * @param {object} playerPos - {x, y, z}
   * @param {number} maxDistance - cull distance (default 40)
   * @param {number} maxActive - max simultaneous lights (default 8)
   */
  function cullLights(sceneCtx, playerPos, maxDistance, maxActive) {
    if (!sceneCtx || !sceneCtx.scene || !playerPos) return;
    maxDistance = maxDistance || 40;
    maxActive = maxActive || 8;

    var lights = [];
    sceneCtx.scene.traverse(function(obj) {
      if (obj.isPointLight || obj.isSpotLight) {
        var dx = obj.position.x - playerPos.x;
        var dz = obj.position.z - playerPos.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        lights.push({ light: obj, dist: dist });
      }
    });

    // Sort by distance
    lights.sort(function(a, b) { return a.dist - b.dist; });

    // Enable closest N within range, disable rest
    for (var i = 0; i < lights.length; i++) {
      lights[i].light.visible = (i < maxActive && lights[i].dist < maxDistance);
    }
  }

  // Export public API
  exports.initScene = initScene;
  exports.loadZone = loadZone;
  exports.addPlayer = addPlayer;
  exports.movePlayer = movePlayer;
  exports.removePlayer = removePlayer;
  exports.updateDayNight = updateDayNight;
  exports.updateWeather = updateWeather;
  exports.addPortal = addPortal;
  exports.addStructure = addStructure;
  exports.cullLights = cullLights;

})(typeof module !== 'undefined' ? module.exports : (window.World = {}));
