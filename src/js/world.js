(function(exports) {
  // Three.js scene & rendering
  const playerMeshes = new Map(); // playerId -> {mesh, label}

  /**
   * Initialize Three.js scene
   * @param {HTMLElement} container - DOM container for renderer
   * @returns {object|null} - {scene, camera, renderer} or null if THREE not available
   */
  function initScene(container) {
    if (typeof THREE === 'undefined') {
      console.warn('THREE.js not available. 3D rendering disabled.');
      return null;
    }

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

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

    // Clear existing objects (keep lights and camera)
    const objectsToRemove = [];
    scene.traverse((obj) => {
      if (obj.isMesh || obj.isGroup) {
        objectsToRemove.push(obj);
      }
    });
    objectsToRemove.forEach(obj => scene.remove(obj));
    playerMeshes.clear();

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
    // Flat stone plaza
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x808080 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Central fountain
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 1, 16),
      new THREE.MeshStandardMaterial({ color: 0x4488ff })
    );
    fountain.position.set(0, 0.5, 0);
    fountain.castShadow = true;
    scene.add(fountain);

    // Fountain water
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x2266dd, transparent: true, opacity: 0.7 })
    );
    water.position.set(0, 1, 0);
    scene.add(water);
  }

  function generateGardens(scene) {
    // Rolling green hills
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x228b22 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;

    // Add some height variation
    const positions = ground.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 2;
      positions.setZ(i, height);
    }
    positions.needsUpdate = true;
    ground.geometry.computeVertexNormals();

    scene.add(ground);

    // Add some trees
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      addTree(scene, x, z);
    }
  }

  function generateAthenaeum(scene) {
    // Large hall floor
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 40),
      new THREE.MeshStandardMaterial({ color: 0xdaa520 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Columns
    const columnPositions = [
      [-20, 0, -15], [20, 0, -15],
      [-20, 0, 0], [20, 0, 0],
      [-20, 0, 15], [20, 0, 15]
    ];

    columnPositions.forEach(([x, y, z]) => {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
      );
      column.position.set(x, 5, z);
      column.castShadow = true;
      scene.add(column);
    });
  }

  function generateStudio(scene) {
    // Amphitheater ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0xd2b48c })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Circular stage
    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 10, 0.5, 32),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    stage.position.set(0, 0.25, 0);
    stage.castShadow = true;
    scene.add(stage);

    // Seating tiers
    for (let i = 1; i <= 3; i++) {
      const tier = new THREE.Mesh(
        new THREE.CylinderGeometry(15 + i * 5, 15 + i * 5, 0.5, 32),
        new THREE.MeshStandardMaterial({ color: 0xa0522d })
      );
      tier.position.set(0, 0.25 - i * 0.5, 0);
      tier.receiveShadow = true;
      scene.add(tier);
    }
  }

  function generateWilds(scene) {
    // Forest floor
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshStandardMaterial({ color: 0x2d5016 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Random trees
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 140;
      const z = (Math.random() - 0.5) * 140;
      addTree(scene, x, z);
    }

    // Random rocks
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 140;
      const z = (Math.random() - 0.5) * 140;
      addRock(scene, x, z);
    }
  }

  function generateAgora(scene) {
    // Market square
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshStandardMaterial({ color: 0xbc8f8f })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Market stalls
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * 25;
      const z = Math.sin(angle) * 25;
      addStall(scene, x, z);
    }
  }

  function generateCommons(scene) {
    // Flat open ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x90ee90 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  function generateArena(scene) {
    // Arena floor
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(30, 32),
      new THREE.MeshStandardMaterial({ color: 0xdaa520 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Colosseum walls
    const wallSegments = 24;
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const x = Math.cos(angle) * 35;
      const z = Math.sin(angle) * 35;

      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(3, 8, 2),
        new THREE.MeshStandardMaterial({ color: 0xd2691e })
      );
      wall.position.set(x, 4, z);
      wall.rotation.y = angle;
      wall.castShadow = true;
      scene.add(wall);
    }
  }

  // Helper: Add tree
  function addTree(scene, x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x228b22 })
    );
    foliage.position.set(x, 5, z);
    foliage.castShadow = true;
    scene.add(foliage);
  }

  // Helper: Add rock
  function addRock(scene, x, z) {
    const rock = new THREE.Mesh(
      new THREE.SphereGeometry(Math.random() * 1 + 0.5, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x696969 })
    );
    rock.position.set(x, rock.geometry.parameters.radius * 0.5, z);
    rock.scale.y = 0.7;
    rock.castShadow = true;
    scene.add(rock);
  }

  // Helper: Add market stall
  function addStall(scene, x, z) {
    const stall = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2, 2),
      new THREE.MeshStandardMaterial({ color: 0xcd853f })
    );
    stall.position.set(x, 1, z);
    stall.castShadow = true;
    scene.add(stall);

    // Canopy
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.1, 2.5),
      new THREE.MeshStandardMaterial({ color: 0xff6347 })
    );
    canopy.position.set(x, 2.5, z);
    scene.add(canopy);
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

    // Create capsule (cylinder + sphere)
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const body = new THREE.Mesh(geometry, material);
    body.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffddaa })
    );
    head.position.y = 1;

    const playerGroup = new THREE.Group();
    playerGroup.add(body);
    playerGroup.add(head);
    playerGroup.position.set(position.x, position.y + 0.75, position.z);

    // Create text label (sprite with canvas texture)
    const label = createTextSprite(playerId);
    label.position.y = 2;
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
    const target = new THREE.Vector3(position.x, position.y + 0.75, position.z);

    // Lerp for smooth movement
    mesh.position.lerp(target, 0.1);
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

    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
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

    let intensity, color, skyColor;

    if (hour >= 6 && hour < 8) {
      // Dawn
      intensity = 0.3 + (hour - 6) / 2 * 0.3;
      color = 0xffaa66;
      skyColor = 0xff6633;
    } else if (hour >= 8 && hour < 18) {
      // Day
      intensity = 0.6;
      color = 0xffffff;
      skyColor = 0x87ceeb;
    } else if (hour >= 18 && hour < 20) {
      // Dusk
      intensity = 0.6 - (hour - 18) / 2 * 0.4;
      color = 0xff8844;
      skyColor = 0xff4422;
    } else {
      // Night
      intensity = 0.2;
      color = 0x6666aa;
      skyColor = 0x001144;
    }

    directionalLight.intensity = intensity;
    directionalLight.color.setHex(color);
    ambientLight.intensity = intensity * 0.5;
    scene.background.setHex(skyColor);
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
      // Simple rain particles
      const rainGeometry = new THREE.BufferGeometry();
      const rainPositions = [];

      for (let i = 0; i < 1000; i++) {
        rainPositions.push(
          (Math.random() - 0.5) * 100,
          Math.random() * 50,
          (Math.random() - 0.5) * 100
        );
      }

      rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));
      const rainMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1 });
      const rain = new THREE.Points(rainGeometry, rainMaterial);
      rain.userData.weather = true;
      scene.add(rain);
    } else if (weatherType === 'snow') {
      // Simple snow particles
      const snowGeometry = new THREE.BufferGeometry();
      const snowPositions = [];

      for (let i = 0; i < 500; i++) {
        snowPositions.push(
          (Math.random() - 0.5) * 100,
          Math.random() * 50,
          (Math.random() - 0.5) * 100
        );
      }

      snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowPositions, 3));
      const snowMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 });
      const snow = new THREE.Points(snowGeometry, snowMaterial);
      snow.userData.weather = true;
      scene.add(snow);
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

    const portal = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.3, 16, 32),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00aaaa,
        emissiveIntensity: 0.5
      })
    );
    portal.position.set(position.x, position.y + 2, position.z);
    portal.rotation.y = Math.PI / 4;
    portal.userData.portal = true;
    portal.userData.targetZone = targetZone;
    scene.add(portal);
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
