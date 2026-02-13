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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
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
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Create sun mesh
    sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff8e7 })
    );
    sunMesh.position.copy(directionalLight.position);
    scene.add(sunMesh);

    // Create moon mesh
    moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 16),
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
    // Polished stone plaza with concentric rings
    const baseGround = new THREE.Mesh(
      new THREE.CylinderGeometry(25, 25, 0.3, 32),
      new THREE.MeshStandardMaterial({
        color: 0x8c8c8c,
        metalness: 0.3,
        roughness: 0.7
      })
    );
    baseGround.receiveShadow = true;
    scene.add(baseGround);

    // Concentric ring patterns
    for (let i = 1; i <= 5; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(i * 4 - 0.5, i * 4, 32),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xa0a0a0 : 0x707070,
          metalness: 0.4,
          roughness: 0.6
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.16;
      ring.receiveShadow = true;
      scene.add(ring);
    }

    // Central fountain base
    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3.5, 1.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xb0b0b0 })
    );
    fountainBase.position.set(0, 0.75, 0);
    fountainBase.castShadow = true;
    scene.add(fountainBase);

    // Fountain water pool
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 2.7, 0.3, 16),
      new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.6,
        metalness: 0.8,
        roughness: 0.2
      })
    );
    water.position.set(0, 1.5, 0);
    scene.add(water);

    // Animated water particles rising up
    const waterParticles = createFountainParticles();
    waterParticles.position.set(0, 1.5, 0);
    scene.add(waterParticles);

    // Warm glowing lanterns around perimeter
    const lanternPositions = 8;
    for (let i = 0; i < lanternPositions; i++) {
      const angle = (i / lanternPositions) * Math.PI * 2;
      const x = Math.cos(angle) * 20;
      const z = Math.sin(angle) * 20;

      // Lantern post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
      );
      post.position.set(x, 1.5, z);
      post.castShadow = true;
      scene.add(post);

      // Lantern light
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffa500,
          emissiveIntensity: 1
        })
      );
      lantern.position.set(x, 3.2, z);
      scene.add(lantern);

      // Point light from lantern
      const light = new THREE.PointLight(0xffa500, 0.5, 15);
      light.position.set(x, 3.2, z);
      light.castShadow = true;
      scene.add(light);
    }

    // Stone benches
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * 15;
      const z = Math.sin(angle) * 15;

      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.3, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x909090 })
      );
      bench.position.set(x, 0.4, z);
      bench.rotation.y = -angle;
      bench.castShadow = true;
      scene.add(bench);

      // Bench back
      const backrest = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.8, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x909090 })
      );
      backrest.position.set(x - Math.cos(angle) * 0.4, 0.8, z - Math.sin(angle) * 0.4);
      backrest.rotation.y = -angle;
      backrest.castShadow = true;
      scene.add(backrest);
    }

    // Ambient particles - gentle golden motes
    zoneParticles = createAmbientParticles(300, 0xffd700, 25, 10, 0.02);
    scene.add(zoneParticles);
  }

  function generateGardens(scene) {
    // Lush rolling terrain
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    const positions = groundGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = Math.sin(x * 0.15) * Math.cos(y * 0.15) * 2 +
                     Math.sin(x * 0.3) * 0.5 + Math.cos(y * 0.25) * 0.8;
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

    // Tall pine trees
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      addPineTree(scene, x, z);
    }

    // Round oak trees
    for (let i = 0; i < 12; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      addOakTree(scene, x, z);
    }

    // Flowering cherry trees
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      addCherryTree(scene, x, z);
    }

    // Flower clusters
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      addFlowerCluster(scene, x, z);
    }

    // Garden plots with sprouts
    for (let i = 0; i < 6; i++) {
      const x = -30 + i * 10;
      const z = 20;
      addGardenPlot(scene, x, z);
    }

    // Winding stone path
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const x = Math.sin(t * Math.PI * 4) * 30;
      const z = -40 + t * 80;
      const pathStone = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.1, 2),
        new THREE.MeshStandardMaterial({ color: 0xcccccc })
      );
      pathStone.position.set(x, 0.05, z);
      pathStone.receiveShadow = true;
      scene.add(pathStone);
    }

    // Stream
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const x = Math.cos(t * Math.PI * 3) * 20 + 20;
      const z = -45 + t * 90;
      const streamSegment = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 4),
        new THREE.MeshStandardMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.5,
          metalness: 0.9,
          roughness: 0.1
        })
      );
      streamSegment.rotation.x = -Math.PI / 2;
      streamSegment.position.set(x, 0.01, z);
      scene.add(streamSegment);
    }

    // Ambient particles - butterflies and petals
    zoneParticles = createAmbientParticles(400, 0xffb3d9, 50, 8, 0.03);
    scene.add(zoneParticles);
  }

  function generateAthenaeum(scene) {
    // Grand marble hall floor with pattern
    const floorSize = 60;
    const tileSize = 4;
    for (let x = -floorSize/2; x < floorSize/2; x += tileSize) {
      for (let z = -floorSize/2; z < floorSize/2; z += tileSize) {
        const isEven = (Math.floor(x / tileSize) + Math.floor(z / tileSize)) % 2 === 0;
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(tileSize, 0.2, tileSize),
          new THREE.MeshStandardMaterial({
            color: isEven ? 0xf5f5dc : 0xe8e8d0,
            metalness: 0.3,
            roughness: 0.5
          })
        );
        tile.position.set(x + tileSize/2, 0.1, z + tileSize/2);
        tile.receiveShadow = true;
        scene.add(tile);
      }
    }

    // Tall columns with capitals
    const columnPositions = [
      [-20, 0, -20], [0, 0, -20], [20, 0, -20],
      [-20, 0, 0], [20, 0, 0],
      [-20, 0, 20], [0, 0, 20], [20, 0, 20]
    ];

    columnPositions.forEach(([x, y, z]) => {
      // Column shaft
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 12, 16),
        new THREE.MeshStandardMaterial({
          color: 0xf5f5dc,
          roughness: 0.7
        })
      );
      column.position.set(x, 6, z);
      column.castShadow = true;
      scene.add(column);

      // Column capital (top)
      const capital = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1, 1, 16),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
      );
      capital.position.set(x, 12.5, z);
      capital.castShadow = true;
      scene.add(capital);

      // Column base
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.5, 0.8, 16),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
      );
      base.position.set(x, 0.4, z);
      scene.add(base);
    });

    // Bookshelves along walls
    for (let i = 0; i < 8; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(4, 6, 1),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      shelf.position.set(-28, 3, -25 + i * 7);
      shelf.castShadow = true;
      scene.add(shelf);

      // Books
      for (let j = 0; j < 15; j++) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, Math.random() * 0.8 + 0.5, 0.6),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5)
          })
        );
        book.position.set(
          -28 + 0.4,
          0.5 + Math.random() * 5,
          -25 + i * 7 + (j - 7) * 0.3
        );
        scene.add(book);
      }
    }

    // Grand staircase
    for (let i = 0; i < 12; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.3, 2),
        new THREE.MeshStandardMaterial({ color: 0xdaa520 })
      );
      step.position.set(0, i * 0.3, -15 + i * 0.5);
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
    }

    // Floating light orbs
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 15;
      const z = Math.sin(angle) * 15;

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 1
        })
      );
      orb.position.set(x, 8 + Math.sin(i * 0.5) * 1, z);
      orb.userData.bobPhase = i * 0.5;
      orb.userData.bobbing = true;
      scene.add(orb);

      // Point light from orb
      const light = new THREE.PointLight(0xffaa00, 0.6, 20);
      light.position.set(x, 8, z);
      scene.add(light);
    }

    // Ambient particles - floating sparkles
    zoneParticles = createAmbientParticles(200, 0xffd700, 30, 15, 0.01);
    scene.add(zoneParticles);
  }

  function generateStudio(scene) {
    // Amphitheater ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0xd2b48c })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Central circular stage
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 0.8, 32),
      new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.8
      })
    );
    stage.position.set(0, 0.4, 0);
    stage.castShadow = true;
    stage.receiveShadow = true;
    scene.add(stage);

    // Stage spotlight
    const spotlight = new THREE.SpotLight(0xffffff, 1.5, 40, Math.PI / 6, 0.3);
    spotlight.position.set(0, 20, 0);
    spotlight.target.position.set(0, 0, 0);
    spotlight.castShadow = true;
    scene.add(spotlight);
    scene.add(spotlight.target);

    // Tiered seating
    for (let i = 1; i <= 5; i++) {
      const tier = new THREE.Mesh(
        new THREE.CylinderGeometry(12 + i * 4, 12 + i * 4, 0.6, 32, 1, false, 0, Math.PI * 1.5),
        new THREE.MeshStandardMaterial({ color: 0xa0522d })
      );
      tier.position.set(0, 0.3 - i * 0.6, 0);
      tier.receiveShadow = true;
      scene.add(tier);
    }

    // Easels with canvases
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 25;
      const z = Math.sin(angle) * 25;
      addEasel(scene, x, z);
    }

    // Musical note particles
    const noteParticles = createMusicalNotes();
    noteParticles.position.set(0, 0, 0);
    scene.add(noteParticles);

    // Colorful bunting between poles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * 35;
      const z = Math.sin(angle) * 35;

      // Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      pole.position.set(x, 4, z);
      pole.castShadow = true;
      scene.add(pole);

      // Flags
      for (let j = 0; j < 5; j++) {
        const nextAngle = ((i + 1) / 6) * Math.PI * 2;
        const t = j / 5;
        const flagX = x + (Math.cos(nextAngle) * 35 - x) * t;
        const flagZ = z + (Math.sin(nextAngle) * 35 - z) * t;

        const flag = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1, 3),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(j / 5, 0.8, 0.6)
          })
        );
        flag.position.set(flagX, 7 - Math.sin(t * Math.PI) * 0.5, flagZ);
        flag.rotation.z = Math.PI / 2;
        scene.add(flag);
      }
    }

    // Ambient particles - colorful confetti
    zoneParticles = createAmbientParticles(500, 0xff69b4, 40, 12, 0.04);
    scene.add(zoneParticles);
  }

  function generateWilds(scene) {
    // Dense forest terrain with elevation
    const groundGeometry = new THREE.PlaneGeometry(150, 150, 60, 60);
    const positions = groundGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 5 +
                     Math.sin(x * 0.2) * 2 + Math.cos(y * 0.15) * 3 +
                     Math.random() * 0.5;
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

    // Thick fog
    scene.fog = new THREE.Fog(0x334422, 20, 100);

    // Dense trees of varying sizes
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * 140;
      const z = (Math.random() - 0.5) * 140;
      const treeType = Math.random();

      if (treeType < 0.5) {
        addPineTree(scene, x, z, 0.8 + Math.random() * 0.6);
      } else {
        addOakTree(scene, x, z, 0.6 + Math.random() * 0.8);
      }
    }

    // Mysterious glowing mushrooms
    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * 130;
      const z = (Math.random() - 0.5) * 130;
      addGlowingMushroom(scene, x, z);
    }

    // Ancient ruins - broken columns
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      const height = 2 + Math.random() * 4;

      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.9, height, 8),
        new THREE.MeshStandardMaterial({ color: 0x808080 })
      );
      column.position.set(x, height / 2, z);
      column.rotation.z = (Math.random() - 0.5) * 0.3;
      column.castShadow = true;
      scene.add(column);
    }

    // Scattered stone blocks
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 120;
      const z = (Math.random() - 0.5) * 120;
      const size = 0.5 + Math.random() * 1.5;

      const block = new THREE.Mesh(
        new THREE.BoxGeometry(size, size * 0.8, size),
        new THREE.MeshStandardMaterial({ color: 0x707070 })
      );
      block.position.set(x, size * 0.4, z);
      block.rotation.y = Math.random() * Math.PI;
      block.castShadow = true;
      scene.add(block);
    }

    // Ambient particles - fireflies
    zoneParticles = createFireflies();
    scene.add(zoneParticles);
  }

  function generateAgora(scene) {
    // Cobblestone market square with variation
    const squareSize = 70;
    const cobbleSize = 1;
    for (let x = -squareSize/2; x < squareSize/2; x += cobbleSize) {
      for (let z = -squareSize/2; z < squareSize/2; z += cobbleSize) {
        const cobble = new THREE.Mesh(
          new THREE.BoxGeometry(cobbleSize * 0.95, 0.15, cobbleSize * 0.95),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0, 0, 0.45 + Math.random() * 0.1)
          })
        );
        cobble.position.set(
          x + cobbleSize/2 + (Math.random() - 0.5) * 0.1,
          0.075,
          z + cobbleSize/2 + (Math.random() - 0.5) * 0.1
        );
        cobble.receiveShadow = true;
        scene.add(cobble);
      }
    }

    // Market stalls in a circle
    const stallCount = 12;
    const stallColors = [
      0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24,
      0xf0932b, 0xeb4d4b, 0x6ab04c, 0x7bed9f
    ];

    for (let i = 0; i < stallCount; i++) {
      const angle = (i / stallCount) * Math.PI * 2;
      const x = Math.cos(angle) * 28;
      const z = Math.sin(angle) * 28;

      // Stall structure
      const stall = new THREE.Mesh(
        new THREE.BoxGeometry(4, 2.5, 3),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      stall.position.set(x, 1.25, z);
      stall.rotation.y = -angle;
      stall.castShadow = true;
      scene.add(stall);

      // Colorful canopy
      const canopyColor = stallColors[i % stallColors.length];
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.2, 3.5),
        new THREE.MeshStandardMaterial({ color: canopyColor })
      );
      canopy.position.set(x, 2.8, z);
      canopy.rotation.y = -angle;
      canopy.castShadow = true;
      scene.add(canopy);

      // Hanging lantern
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 0.8
        })
      );
      lantern.position.set(x, 2.6, z);
      scene.add(lantern);

      // Point light
      const light = new THREE.PointLight(0xffaa00, 0.4, 8);
      light.position.set(x, 2.6, z);
      scene.add(light);

      // Crates and barrels
      for (let j = 0; j < 3; j++) {
        const crateX = x + Math.cos(-angle + Math.PI / 2) * (j - 1);
        const crateZ = z + Math.sin(-angle + Math.PI / 2) * (j - 1);

        if (Math.random() > 0.5) {
          // Crate
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.6, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xa0826d })
          );
          crate.position.set(crateX, 0.3, crateZ);
          crate.castShadow = true;
          scene.add(crate);
        } else {
          // Barrel
          const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.7, 12),
            new THREE.MeshStandardMaterial({ color: 0x8b6914 })
          );
          barrel.position.set(crateX, 0.35, crateZ);
          barrel.castShadow = true;
          scene.add(barrel);
        }
      }
    }

    // Central well/fountain
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.5, 2, 16),
      new THREE.MeshStandardMaterial({ color: 0x808080 })
    );
    well.position.set(0, 1, 0);
    well.castShadow = true;
    scene.add(well);

    const wellWater = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.2, 16),
      new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.6
      })
    );
    wellWater.position.set(0, 2, 0);
    scene.add(wellWater);

    // Ambient particles - dust motes
    zoneParticles = createAmbientParticles(250, 0xd4a574, 35, 8, 0.015);
    scene.add(zoneParticles);
  }

  function generateCommons(scene) {
    // Open green parkland with gentle rolling
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 30, 30);
    const positions = groundGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 1.5;
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

    // Community houses
    const housePositions = [
      [-25, 0, -20], [-25, 0, 0], [-25, 0, 20],
      [25, 0, -20], [25, 0, 0], [25, 0, 20]
    ];

    housePositions.forEach(([x, y, z]) => {
      // House base
      const house = new THREE.Mesh(
        new THREE.BoxGeometry(6, 4, 6),
        new THREE.MeshStandardMaterial({ color: 0xdeb887 })
      );
      house.position.set(x, 2, z);
      house.castShadow = true;
      scene.add(house);

      // Pyramid roof
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4.5, 3, 4),
        new THREE.MeshStandardMaterial({ color: 0x8b4513 })
      );
      roof.position.set(x, 5.5, z);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      scene.add(roof);

      // Door
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 2.5, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      door.position.set(x, 1.25, z + 3);
      scene.add(door);
    });

    // Workshop (larger building)
    const workshop = new THREE.Mesh(
      new THREE.BoxGeometry(10, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0xb0826d })
    );
    workshop.position.set(0, 2.5, -30);
    workshop.castShadow = true;
    scene.add(workshop);

    const workshopRoof = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.5, 9),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    workshopRoof.position.set(0, 5.25, -30);
    workshopRoof.castShadow = true;
    scene.add(workshopRoof);

    // Meeting hall
    const meetingHall = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0xf5deb3 })
    );
    meetingHall.position.set(0, 3, 30);
    meetingHall.castShadow = true;
    scene.add(meetingHall);

    const hallRoof = new THREE.Mesh(
      new THREE.ConeGeometry(7, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    hallRoof.position.set(0, 8, 30);
    hallRoof.castShadow = true;
    scene.add(hallRoof);

    // Fenced areas
    for (let i = 0; i < 20; i++) {
      const fence = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.5, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      fence.position.set(-40, 0.75, -30 + i * 3);
      fence.castShadow = true;
      scene.add(fence);
    }

    // Benches
    for (let i = 0; i < 6; i++) {
      const benchX = -15 + i * 6;
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      bench.position.set(benchX, 0.5, 0);
      bench.castShadow = true;
      scene.add(bench);
    }

    // Lampposts
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 35;
      const z = Math.sin(angle) * 35;

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
      );
      post.position.set(x, 2, z);
      post.castShadow = true;
      scene.add(post);

      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffffcc,
          emissive: 0xffff99,
          emissiveIntensity: 0.6
        })
      );
      lamp.position.set(x, 4.2, z);
      scene.add(lamp);

      const light = new THREE.PointLight(0xffff99, 0.3, 15);
      light.position.set(x, 4.2, z);
      scene.add(light);
    }

    // Ambient particles - dandelion seeds
    zoneParticles = createAmbientParticles(200, 0xffffff, 40, 10, 0.01);
    scene.add(zoneParticles);
  }

  function generateArena(scene) {
    // Sandy arena floor with circular marking
    const arenaFloor = new THREE.Mesh(
      new THREE.CircleGeometry(32, 64),
      new THREE.MeshStandardMaterial({
        color: 0xdaa520,
        roughness: 0.95
      })
    );
    arenaFloor.rotation.x = -Math.PI / 2;
    arenaFloor.receiveShadow = true;
    scene.add(arenaFloor);

    // Central circle marking
    const centerCircle = new THREE.Mesh(
      new THREE.RingGeometry(9.5, 10, 32),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.05;
    scene.add(centerCircle);

    // High colosseum walls
    const wallSegments = 32;
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const x = Math.cos(angle) * 38;
      const z = Math.sin(angle) * 38;

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(4, 12, 2),
        new THREE.MeshStandardMaterial({ color: 0xa0826d })
      );
      wall.position.set(x, 6, z);
      wall.rotation.y = angle;
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);

      // Banners on walls
      if (i % 4 === 0) {
        const banner = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 4),
          new THREE.MeshStandardMaterial({
            color: i % 8 === 0 ? 0xff0000 : 0x0000ff,
            side: THREE.DoubleSide
          })
        );
        banner.position.set(
          Math.cos(angle) * 36,
          8,
          Math.sin(angle) * 36
        );
        banner.rotation.y = angle + Math.PI;
        scene.add(banner);
      }
    }

    // Tiered seating
    for (let tier = 0; tier < 4; tier++) {
      const seats = new THREE.Mesh(
        new THREE.CylinderGeometry(
          33 + tier * 3,
          33 + tier * 3,
          1,
          32,
          1,
          false,
          0,
          Math.PI * 2
        ),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      seats.position.set(0, 0.5 + tier * 1.2, 0);
      seats.receiveShadow = true;
      scene.add(seats);
    }

    // Dramatic overhead spotlights
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const spotlight = new THREE.SpotLight(0xffffff, 1, 50, Math.PI / 8, 0.5);
      spotlight.position.set(
        Math.cos(angle) * 20,
        25,
        Math.sin(angle) * 20
      );
      spotlight.target.position.set(0, 0, 0);
      spotlight.castShadow = true;
      scene.add(spotlight);
      scene.add(spotlight.target);
    }

    // Torch lights around perimeter
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const x = Math.cos(angle) * 36;
      const z = Math.sin(angle) * 36;

      // Torch holder
      const holder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a })
      );
      holder.position.set(x, 11, z);
      scene.add(holder);

      // Torch flame
      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xff4500,
          emissive: 0xff4500,
          emissiveIntensity: 1
        })
      );
      flame.position.set(x, 12, z);
      scene.add(flame);

      // Point light
      const light = new THREE.PointLight(0xff4500, 0.8, 15);
      light.position.set(x, 12, z);
      light.castShadow = true;
      scene.add(light);
    }

    // Ambient particles - rising embers
    zoneParticles = createEmberParticles();
    scene.add(zoneParticles);
  }

  // Helper functions for zone elements

  function addPineTree(scene, x, z, scale = 1) {
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 6 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3728 })
    );
    trunk.position.set(x, 3 * scale, z);
    trunk.castShadow = true;
    scene.add(trunk);

    // Cone foliage (three tiers)
    for (let i = 0; i < 3; i++) {
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.5 * scale - i * 0.3 * scale, 3 * scale, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a4d2e })
      );
      foliage.position.set(x, 5 * scale + i * 1.8 * scale, z);
      foliage.castShadow = true;
      scene.add(foliage);
    }
  }

  function addOakTree(scene, x, z, scale = 1) {
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4 * scale, 0.5 * scale, 5 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    trunk.position.set(x, 2.5 * scale, z);
    trunk.castShadow = true;
    scene.add(trunk);

    // Round foliage
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(2.5 * scale, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x228b22 })
    );
    foliage.position.set(x, 6 * scale, z);
    foliage.castShadow = true;
    scene.add(foliage);
  }

  function addCherryTree(scene, x, z) {
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x654321 })
    );
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;
    scene.add(trunk);

    // Pink blossom foliage
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffb7c5 })
    );
    foliage.position.set(x, 5, z);
    foliage.castShadow = true;
    scene.add(foliage);
  }

  function addFlowerCluster(scene, x, z) {
    const colors = [0xff69b4, 0xffa500, 0xffff00, 0xff1493, 0xda70d6];
    for (let i = 0; i < 5; i++) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      );
      flower.position.set(
        x + (Math.random() - 0.5) * 0.8,
        0.15,
        z + (Math.random() - 0.5) * 0.8
      );
      scene.add(flower);
    }
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
    leftLeg.castShadow = true;
    playerGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.4, 0);
    rightLeg.castShadow = true;
    playerGroup.add(rightLeg);

    // Body (box)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x4488ff })
    );
    body.position.set(0, 1.2, 0);
    body.castShadow = true;
    playerGroup.add(body);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xffddaa });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.35, 1.1, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    playerGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.35, 1.1, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    playerGroup.add(rightArm);

    // Head (sphere)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffddaa })
    );
    head.position.set(0, 1.75, 0);
    head.castShadow = true;
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
      new THREE.TorusGeometry(2.5, 0.4, 16, 32),
      new THREE.MeshStandardMaterial({
        color: portalColor,
        emissive: portalColor,
        emissiveIntensity: 0.7,
        metalness: 0.5,
        roughness: 0.3
      })
    );
    portal.rotation.y = Math.PI / 4;
    portal.castShadow = true;
    portalGroup.add(portal);

    // Inner swirling particles
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = [];

    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      const radius = Math.random() * 2;
      particlePositions.push(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 0.5,
        Math.sin(angle) * radius
      );
    }

    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: portalColor,
      size: 0.2,
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.portalParticles = true;
    portalGroup.add(particles);

    // Point light
    const light = new THREE.PointLight(portalColor, 1, 15);
    light.position.set(0, 0, 0);
    portalGroup.add(light);

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
        particles.rotation.z -= 0.02;

        const pulse = Math.sin(portalGroup.userData.pulsePhase) * 0.3 + 1;
        portal.material.emissiveIntensity = pulse;
        light.intensity = pulse;

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
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
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

})(typeof module !== 'undefined' ? module.exports : (window.World = {}));
