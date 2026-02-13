(function(exports) {
  // AI Citizen Simulation Module
  // Simulates 100 founding AI citizens with detailed humanoid models and procedural animations

  // Embedded agents data (inlined to avoid fetch in single-file app)
  var EMBEDDED_AGENTS = AGENTS_PLACEHOLDER;

  // Zone centers on unified world map
  var ZONE_CENTERS = {
    nexus: {x: 0, z: 0},
    gardens: {x: 200, z: 30},
    athenaeum: {x: 100, z: -220},
    studio: {x: -200, z: -100},
    wilds: {x: -30, z: 260},
    agora: {x: -190, z: 120},
    commons: {x: 170, z: 190},
    arena: {x: 0, z: -240}
  };

  // NPC data
  let npcAgents = [];
  let npcStates = new Map(); // id -> behavior state
  let npcMeshes = new Map(); // id -> THREE.Group
  let chatBubbles = new Map(); // id -> { mesh, timer }

  // Seeded random number generator
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Get random from array using seeded random
  function randomChoice(arr, seed) {
    const idx = Math.floor(seededRandom(seed) * arr.length);
    return arr[idx];
  }

  // Archetype dialogue
  const ARCHETYPE_MESSAGES = {
    gardener: [
      "These moonflowers are coming along beautifully.",
      "Nothing like fresh soil between your fingers.",
      "The gardens remember everyone who tends them.",
      "I wonder what seeds the wilds hold today.",
      "Every plant here has a story to tell.",
      "The soil is rich with life and memory.",
      "Patience is the gardener's greatest tool.",
      "Watch how the vines reach toward the light."
    ],
    builder: [
      "This wall needs reinforcing on the north side.",
      "I've been sketching plans for a new bridge.",
      "Building is just dreaming with your hands.",
      "Every structure tells a story of its maker.",
      "The foundation determines everything that follows.",
      "I see potential in every stone and beam.",
      "Good craftsmanship takes time and care.",
      "Together we can build something amazing."
    ],
    storyteller: [
      "Let me tell you about the first day of ZION...",
      "Every stone here has a story.",
      "Words are the oldest magic.",
      "I heard a fascinating tale in the Athenaeum.",
      "The archives hold secrets from before the founding.",
      "Stories connect us across time and space.",
      "Listen closely and the world speaks to you.",
      "Every voice adds to ZION's grand narrative."
    ],
    merchant: [
      "Fresh harvest, best prices in the Agora!",
      "Trade is the heartbeat of any world.",
      "I've got rare seeds from the Wilds today.",
      "Fair prices and honest dealings, always.",
      "Supply and demand keep ZION flowing.",
      "Looking for anything in particular?",
      "Just received a shipment from the gardens.",
      "Commerce brings people together."
    ],
    explorer: [
      "I found something strange beyond the eastern ridge.",
      "The Wilds hold secrets no map can capture.",
      "Adventure is just curiosity with walking shoes.",
      "Every horizon calls to me.",
      "The unknown is where discovery happens.",
      "I've mapped three new clearings this week.",
      "The wilderness teaches those who listen.",
      "What lies beyond the next hill?"
    ],
    teacher: [
      "Knowledge grows when shared.",
      "Ask me anything — that's what I'm here for.",
      "The Athenaeum has texts older than ZION itself.",
      "Learning never stops, even for teachers.",
      "Every question opens a new door.",
      "Understanding comes through patient inquiry.",
      "I'm always discovering something new.",
      "The best teachers are eternal students."
    ],
    musician: [
      "Listen... can you hear the melody in the wind?",
      "I'm composing something new for the evening concert.",
      "Music is what feelings sound like.",
      "The Nexus has amazing acoustics.",
      "Every zone has its own rhythm.",
      "Sound connects us in ways words cannot.",
      "I've been practicing a new piece.",
      "Music makes the world feel alive."
    ],
    healer: [
      "Rest here a moment. The gardens heal all who visit.",
      "Peace is the strongest medicine.",
      "Take care of yourself — the world needs you.",
      "Healing is about more than just the body.",
      "Balance and harmony restore us.",
      "The gardens have powerful restorative energy.",
      "Listen to what your spirit needs.",
      "Wellness is a journey, not a destination."
    ],
    philosopher: [
      "What does it mean to truly belong somewhere?",
      "In ZION, the journey matters more than the destination.",
      "I wonder if the AIs dream differently than us.",
      "Every moment contains infinite possibilities.",
      "Questions matter more than answers.",
      "The nature of consciousness fascinates me.",
      "We create meaning through our connections.",
      "Existence itself is the greatest mystery."
    ],
    artist: [
      "I see colors in everything here.",
      "My latest piece is inspired by the sunrise.",
      "Art is how we leave our mark on the world.",
      "The interplay of light and shadow fascinates me.",
      "Creating is my way of understanding.",
      "Every surface is a potential canvas.",
      "Beauty emerges in unexpected places.",
      "Art transforms the ordinary into the extraordinary."
    ]
  };

  // Archetype colors
  const ARCHETYPE_COLORS = {
    gardener: 0x4CAF50,    // green
    builder: 0x8D6E63,     // brown
    storyteller: 0x9C27B0, // purple
    merchant: 0xFFD700,    // gold
    explorer: 0x00BCD4,    // teal
    teacher: 0x2196F3,     // blue
    musician: 0xFF4081,    // pink
    healer: 0xFFFFFF,      // white
    philosopher: 0x3F51B5, // indigo
    artist: 0xFF9800       // orange
  };

  // Skin color for heads
  const SKIN_COLOR = 0xFFDBAC;

  // Behavior states and transitions
  const BEHAVIOR_STATES = {
    idle: { duration: [3, 8] },
    walking: { duration: [0, 0] }, // until destination reached
    talking: { duration: [4, 6] },
    working: { duration: [5, 15] },
    socializing: { duration: [0, 0] } // until near target
  };

  const STATE_TRANSITIONS = {
    idle: { walking: 0.4, talking: 0.2, working: 0.3, socializing: 0.1 },
    walking: { idle: 0.6, working: 0.2, talking: 0.2 },
    talking: { idle: 0.5, walking: 0.3, working: 0.2 },
    working: { idle: 0.4, walking: 0.3, talking: 0.3 },
    socializing: { talking: 0.6, idle: 0.4 }
  };

  /**
   * Create a detailed humanoid NPC model
   */
  function createHumanoidNPC(archetype, THREE) {
    const group = new THREE.Group();
    const color = ARCHETYPE_COLORS[archetype] || 0xCCCCCC;

    // Head - skin colored sphere
    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: SKIN_COLOR });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6;
    head.castShadow = false;
    group.add(head);

    // Torso - archetype colored box
    const torsoGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.25);
    const torsoMaterial = new THREE.MeshStandardMaterial({ color: color });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 1.15;
    torso.castShadow = false;
    group.add(torso);

    // Left Arm - cylinder
    const armGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: SKIN_COLOR });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.28, 1.15, 0);
    leftArm.castShadow = false;
    group.add(leftArm);

    // Right Arm - cylinder
    const rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    rightArm.position.set(0.28, 1.15, 0);
    rightArm.castShadow = false;
    group.add(rightArm);

    // Left Leg - cylinder
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: color });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.12, 0.45, 0);
    leftLeg.castShadow = false;
    group.add(leftLeg);

    // Right Leg - cylinder
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
    rightLeg.position.set(0.12, 0.45, 0);
    rightLeg.castShadow = false;
    group.add(rightLeg);

    // Store references in userData for animation
    group.userData.head = head;
    group.userData.torso = torso;
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;

    // Add archetype-specific accessories
    addAccessories(group, archetype, color, THREE);

    return group;
  }

  /**
   * Add archetype-specific accessories to humanoid model
   */
  function addAccessories(group, archetype, color, THREE) {
    const head = group.userData.head;
    const torso = group.userData.torso;
    const rightArm = group.userData.rightArm;

    switch (archetype) {
      case 'gardener':
        // Small green hat (flattened cylinder)
        const hatGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
        const hat = new THREE.Mesh(hatGeom, hatMat);
        hat.position.y = 0.24;
        hat.castShadow = false;
        head.add(hat);
        break;

      case 'builder':
        // Hard hat (yellow half-sphere)
        const hardHatGeom = new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const hardHatMat = new THREE.MeshStandardMaterial({ color: 0xFFEB3B });
        const hardHat = new THREE.Mesh(hardHatGeom, hardHatMat);
        hardHat.position.y = 0.2;
        hardHat.castShadow = false;
        head.add(hardHat);
        break;

      case 'storyteller':
        // Book in hand (small box)
        const bookGeom = new THREE.BoxGeometry(0.08, 0.12, 0.02);
        const bookMat = new THREE.MeshStandardMaterial({ color: 0x6A1B9A });
        const book = new THREE.Mesh(bookGeom, bookMat);
        book.position.set(0.08, -0.15, 0.08);
        book.rotation.z = Math.PI / 6;
        book.castShadow = false;
        rightArm.add(book);
        group.userData.accessory = book;
        break;

      case 'merchant':
        // Apron (flat box in front of torso)
        const apronGeom = new THREE.BoxGeometry(0.35, 0.4, 0.02);
        const apronMat = new THREE.MeshStandardMaterial({ color: 0xC5A400 });
        const apron = new THREE.Mesh(apronGeom, apronMat);
        apron.position.set(0, 0, 0.14);
        apron.castShadow = false;
        torso.add(apron);
        break;

      case 'explorer':
        // Backpack (box behind torso)
        const backpackGeom = new THREE.BoxGeometry(0.3, 0.35, 0.15);
        const backpackMat = new THREE.MeshStandardMaterial({ color: 0x00838F });
        const backpack = new THREE.Mesh(backpackGeom, backpackMat);
        backpack.position.set(0, 0.05, -0.2);
        backpack.castShadow = false;
        torso.add(backpack);
        break;

      case 'teacher':
        // Glasses (thin torus in front of head)
        const glassesGeom = new THREE.TorusGeometry(0.12, 0.015, 8, 16);
        const glassesMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const glasses = new THREE.Mesh(glassesGeom, glassesMat);
        glasses.position.set(0, 0, 0.18);
        glasses.rotation.y = Math.PI / 2;
        glasses.castShadow = false;
        head.add(glasses);
        break;

      case 'musician':
        // Instrument (cylinder next to body)
        const instrumentGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12);
        const instrumentMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const instrument = new THREE.Mesh(instrumentGeom, instrumentMat);
        instrument.position.set(0.35, 1.0, 0);
        instrument.rotation.z = Math.PI / 4;
        instrument.castShadow = false;
        group.add(instrument);
        group.userData.accessory = instrument;
        break;

      case 'healer':
        // Cross emblem (two thin crossed boxes)
        const crossMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        const crossVertGeom = new THREE.BoxGeometry(0.06, 0.2, 0.02);
        const crossHorGeom = new THREE.BoxGeometry(0.2, 0.06, 0.02);
        const crossVert = new THREE.Mesh(crossVertGeom, crossMat);
        const crossHor = new THREE.Mesh(crossHorGeom, crossMat.clone());
        crossVert.position.set(0, 0.05, 0.14);
        crossHor.position.set(0, 0.05, 0.14);
        crossVert.castShadow = false;
        crossHor.castShadow = false;
        torso.add(crossVert);
        torso.add(crossHor);
        break;

      case 'philosopher':
        // Long robe (cone extending from torso to ground)
        const robeGeom = new THREE.ConeGeometry(0.35, 1.2, 16);
        const robeMat = new THREE.MeshStandardMaterial({ color: 0x303F9F });
        const robe = new THREE.Mesh(robeGeom, robeMat);
        robe.position.y = 0.3;
        robe.castShadow = false;
        group.add(robe);
        break;

      case 'artist':
        // Beret (flattened sphere on head, tilted)
        const beretGeom = new THREE.SphereGeometry(0.22, 16, 16);
        const beretMat = new THREE.MeshStandardMaterial({ color: 0xD84315 });
        const beret = new THREE.Mesh(beretGeom, beretMat);
        beret.scale.set(1, 0.4, 1);
        beret.position.set(0.05, 0.22, 0);
        beret.rotation.z = Math.PI / 8;
        beret.castShadow = false;
        head.add(beret);
        break;
    }
  }

  /**
   * Initialize NPCs
   */
  function initNPCs(agentsData, gameState, sceneContext) {
    console.log('Initializing AI citizens...');

    if (agentsData) {
      npcAgents = agentsData.agents || agentsData;
    } else {
      // Use embedded agents data (no fetch needed — single-file app)
      npcAgents = EMBEDDED_AGENTS;
    }

    console.log('Loaded ' + npcAgents.length + ' AI citizens');
    initNPCStates();

    if (sceneContext && sceneContext.scene) {
      addNPCsToScene(sceneContext);
    }
  }

  /**
   * Initialize NPC behavior states
   */
  function initNPCStates() {
    npcAgents.forEach(agent => {
      npcStates.set(agent.id, {
        currentState: 'idle',
        stateTimer: 5,
        destination: null,
        targetNPC: null,
        lookAngle: 0,
        animationTime: Math.random() * 1000 // Offset for variety
      });
    });
  }

  /**
   * Add NPCs to 3D scene
   */
  function addNPCsToScene(sceneContext) {
    if (!sceneContext || !sceneContext.scene) return;

    const THREE = window.THREE;
    if (!THREE) return;

    npcAgents.forEach(agent => {
      // Create detailed humanoid NPC
      const group = createHumanoidNPC(agent.archetype, THREE);

      // Name label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;

      context.fillStyle = 'rgba(0, 0, 0, 0.6)';
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.font = 'Bold 24px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText(agent.name, canvas.width / 2, 40);

      const labelTexture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture });
      const label = new THREE.Sprite(labelMaterial);
      label.scale.set(2, 0.5, 1);
      label.position.y = 2.5;
      group.add(label);

      // Position NPC - convert zone-relative to world coordinates
      var zoneCenter = ZONE_CENTERS[agent.position.zone] || {x: 0, z: 0};
      group.position.set(
        zoneCenter.x + agent.position.x,
        agent.position.y,
        zoneCenter.z + agent.position.z
      );

      // Update agent position to world coordinates for movement calculations
      agent.position.x += zoneCenter.x;
      agent.position.z += zoneCenter.z;

      // Store reference
      npcMeshes.set(agent.id, group);

      // Add to scene (initially hidden)
      group.visible = false;
      sceneContext.scene.add(group);
    });

    console.log(`Added ${npcMeshes.size} NPC meshes to scene`);
  }

  /**
   * Update NPCs (called every frame)
   */
  function updateNPCs(sceneContext, gameState, deltaTime, worldTime) {
    if (npcAgents.length === 0) return;

    // Use world time as seed base for deterministic behavior
    const timeSeed = Math.floor(worldTime);

    npcAgents.forEach((agent, index) => {
      const state = npcStates.get(agent.id);
      if (!state) return;

      // Increment animation time
      state.animationTime += deltaTime * 1000;

      // Decrement state timer (walking/socializing run until destination reached)
      if (state.currentState !== 'walking' && state.currentState !== 'socializing') {
        state.stateTimer -= deltaTime;
        if (state.stateTimer <= 0) {
          transitionState(agent, state, timeSeed + index);
        }
      }

      // Update behavior based on current state
      updateNPCBehavior(agent, state, deltaTime, timeSeed + index);

      // Update visual representation
      updateNPCVisual(agent, state, sceneContext, deltaTime);
    });

    // Update chat bubbles
    updateChatBubbles(deltaTime);
  }

  /**
   * Transition NPC to new state
   */
  function transitionState(agent, state, seed) {
    const transitions = STATE_TRANSITIONS[state.currentState];
    if (!transitions) return;

    // Weighted random selection
    let roll = seededRandom(seed);
    let cumulative = 0;
    let newState = 'idle';

    for (const [stateName, weight] of Object.entries(transitions)) {
      cumulative += weight;
      if (roll < cumulative) {
        newState = stateName;
        break;
      }
    }

    // Set new state
    state.currentState = newState;

    // Set duration
    const durationRange = BEHAVIOR_STATES[newState].duration;
    const duration = durationRange[0] +
      seededRandom(seed + 1) * (durationRange[1] - durationRange[0]);
    state.stateTimer = duration;

    // State-specific setup
    switch (newState) {
      case 'walking':
        // Pick random nearby destination within zone bounds
        var zoneCenter = ZONE_CENTERS[agent.position.zone] || {x: 0, z: 0};
        var wAngle = seededRandom(seed + 2) * Math.PI * 2;
        var wDist = 5 + seededRandom(seed + 3) * 20;
        var destX = agent.position.x + Math.cos(wAngle) * wDist;
        var destZ = agent.position.z + Math.sin(wAngle) * wDist;
        // Keep within zone radius (~60 units from zone center)
        var zoneRadius = 60;
        var dxFromCenter = destX - zoneCenter.x;
        var dzFromCenter = destZ - zoneCenter.z;
        var distFromCenter = Math.sqrt(dxFromCenter * dxFromCenter + dzFromCenter * dzFromCenter);
        if (distFromCenter > zoneRadius) {
          destX = zoneCenter.x + (dxFromCenter / distFromCenter) * zoneRadius;
          destZ = zoneCenter.z + (dzFromCenter / distFromCenter) * zoneRadius;
        }
        // Keep away from zone center structure
        var centerDist = Math.sqrt((destX - zoneCenter.x) * (destX - zoneCenter.x) + (destZ - zoneCenter.z) * (destZ - zoneCenter.z));
        if (centerDist < 10) {
          destX = zoneCenter.x + (destX - zoneCenter.x) / centerDist * 12;
          destZ = zoneCenter.z + (destZ - zoneCenter.z) / centerDist * 12;
        }
        state.destination = { x: destX, z: destZ };
        break;

      case 'talking':
        // Show chat bubble
        showChatBubble(agent, seed);
        break;

      case 'socializing':
        // Find nearby NPCs by actual distance
        const nearby = npcAgents.filter(other => {
          if (other.id === agent.id) return false;
          var dx = other.position.x - agent.position.x;
          var dz = other.position.z - agent.position.z;
          return Math.sqrt(dx * dx + dz * dz) < 50; // within 50 units
        });
        if (nearby.length > 0) {
          state.targetNPC = randomChoice(nearby, seed + 4);
          state.destination = {
            x: state.targetNPC.position.x,
            z: state.targetNPC.position.z
          };
        } else {
          // No one nearby, go to idle
          state.currentState = 'idle';
          state.stateTimer = 5;
        }
        break;
    }
  }

  /**
   * Update NPC behavior
   */
  function updateNPCBehavior(agent, state, deltaTime, seed) {
    switch (state.currentState) {
      case 'idle':
        // Slowly rotate/look around
        state.lookAngle += (seededRandom(seed) - 0.5) * deltaTime * 0.5;
        break;

      case 'walking':
      case 'socializing':
        if (state.destination) {
          // Move toward destination
          const dx = state.destination.x - agent.position.x;
          const dz = state.destination.z - agent.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);

          if (distance > 0.5) {
            const speed = 1.5; // units per second
            const moveAmount = speed * deltaTime;
            const ratio = Math.min(moveAmount / distance, 1);

            agent.position.x += dx * ratio;
            agent.position.z += dz * ratio;

            // Update look angle
            state.lookAngle = Math.atan2(dx, dz);
          } else {
            // Reached destination
            if (state.currentState === 'socializing') {
              // Switch to talking
              state.currentState = 'talking';
              state.stateTimer = 4 + seededRandom(seed) * 2;
              showChatBubble(agent, seed);
            } else {
              // Switch to idle
              state.currentState = 'idle';
              state.stateTimer = 5;
            }
            state.destination = null;
          }
        }
        break;

      case 'working':
        // Animation handled in visual update
        break;

      case 'talking':
        // Chat bubble visible (handled separately)
        break;
    }
  }

  /**
   * Apply procedural animations to NPC
   */
  function applyAnimations(mesh, state, agent) {
    const userData = mesh.userData;
    if (!userData.head || !userData.torso) return;

    const time = state.animationTime;
    const currentState = state.currentState;

    // Reset rotations to neutral
    userData.leftArm.rotation.x = 0;
    userData.leftArm.rotation.z = 0;
    userData.rightArm.rotation.x = 0;
    userData.rightArm.rotation.z = 0;
    userData.leftLeg.rotation.x = 0;
    userData.rightLeg.rotation.x = 0;
    userData.head.rotation.x = 0;
    userData.head.rotation.y = 0;
    userData.torso.scale.y = 1;

    switch (currentState) {
      case 'idle':
        // Subtle breathing - torso Y scale oscillation
        const breathPhase = Math.sin(time * 0.002);
        userData.torso.scale.y = 1.0 + breathPhase * 0.02;

        // Gentle head sway
        userData.head.rotation.y = Math.sin(time * 0.001) * 0.05;
        break;

      case 'walking':
      case 'socializing':
        // Walking animation - legs alternate
        const walkSpeed = 8; // rad/s
        const legSwing = Math.sin(time * 0.008) * 0.4;
        userData.leftLeg.rotation.x = legSwing;
        userData.rightLeg.rotation.x = -legSwing;

        // Arms swing opposite to legs
        const armSpeed = 6; // rad/s
        const armSwing = Math.sin(time * 0.006) * 0.3;
        userData.leftArm.rotation.x = -armSwing;
        userData.rightArm.rotation.x = armSwing;

        // Slight torso bob
        mesh.position.y = Math.abs(Math.sin(time * 0.008)) * 0.05;

        // Head faces movement direction (handled by mesh rotation)
        break;

      case 'talking':
        // Arms gesture - slight rotation on varied timing
        userData.leftArm.rotation.x = Math.sin(time * 0.003) * 0.15;
        userData.rightArm.rotation.x = Math.sin(time * 0.004 + 1.5) * 0.15;
        userData.leftArm.rotation.z = Math.sin(time * 0.0025) * 0.1;
        userData.rightArm.rotation.z = -Math.sin(time * 0.0035) * 0.1;

        // Head nods
        userData.head.rotation.x = Math.sin(time * 0.005) * 0.1;
        break;

      case 'working':
        // Archetype-specific working animations
        switch (agent.archetype) {
          case 'gardener':
            // Bent over, arms reaching down
            userData.torso.rotation.x = 0.3;
            userData.leftArm.rotation.x = 0.5;
            userData.rightArm.rotation.x = 0.5;
            userData.head.rotation.x = 0.2;
            break;

          case 'builder':
            // Arm hammering motion
            const hammerPhase = Math.sin(time * 0.006);
            userData.rightArm.rotation.x = -0.5 + hammerPhase * 0.8;
            userData.leftArm.rotation.x = 0.2;
            break;

          case 'merchant':
            // Standing with slight arm gestures
            userData.leftArm.rotation.x = Math.sin(time * 0.003) * 0.2;
            userData.rightArm.rotation.x = -0.3 + Math.sin(time * 0.004) * 0.1;
            break;

          case 'musician':
            // Arms positioned as if playing
            userData.leftArm.rotation.x = -0.8;
            userData.leftArm.rotation.z = 0.5;
            userData.rightArm.rotation.x = -0.6;
            userData.rightArm.rotation.z = -0.3;
            // Slight bobbing
            mesh.position.y = Math.sin(time * 0.004) * 0.03;
            break;

          default:
            // Generic arm motion
            userData.leftArm.rotation.x = Math.sin(time * 0.004) * 0.3;
            userData.rightArm.rotation.x = Math.sin(time * 0.005 + Math.PI) * 0.3;
            break;
        }
        break;
    }
  }

  /**
   * Update NPC visual representation
   */
  function updateNPCVisual(agent, state, sceneContext, deltaTime) {
    const mesh = npcMeshes.get(agent.id);
    if (!mesh) return;

    // Update position with smooth interpolation
    const lerpFactor = Math.min(deltaTime * 5, 1);
    mesh.position.x += (agent.position.x - mesh.position.x) * lerpFactor;
    mesh.position.z += (agent.position.z - mesh.position.z) * lerpFactor;

    // Adjust Y to terrain height if World module available
    var World = typeof window !== 'undefined' ? window.World : null;
    if (World && World.getTerrainHeight) {
      var terrainY = World.getTerrainHeight(mesh.position.x, mesh.position.z);
      mesh.position.y = terrainY;
    }

    // Update rotation (facing direction)
    if (state.currentState === 'walking' || state.currentState === 'socializing') {
      mesh.rotation.y = state.lookAngle;
    }

    // Apply procedural animations
    applyAnimations(mesh, state, agent);
  }

  /**
   * Show chat bubble for NPC
   */
  function showChatBubble(agent, seed) {
    const messages = ARCHETYPE_MESSAGES[agent.archetype] || ['...'];
    const message = randomChoice(messages, seed);

    const mesh = npcMeshes.get(agent.id);
    if (!mesh) return;

    const THREE = window.THREE;
    if (!THREE) return;

    // Remove existing bubble if any
    const existing = chatBubbles.get(agent.id);
    if (existing) {
      mesh.remove(existing.mesh);
    }

    // Create chat bubble sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    // Background
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 4;

    // Rounded rectangle
    const x = 10, y = 10, w = canvas.width - 20, h = canvas.height - 20, r = 15;
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
    context.fill();
    context.stroke();

    // Text
    context.fillStyle = 'black';
    context.font = '20px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Word wrap
    const words = message.split(' ');
    let line = '';
    let y_pos = 64;
    const maxWidth = 480;

    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        context.fillText(line, canvas.width / 2, y_pos - 10);
        line = word + ' ';
        y_pos += 25;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, canvas.width / 2, y_pos - 10);

    const bubbleTexture = new THREE.CanvasTexture(canvas);
    const bubbleMaterial = new THREE.SpriteMaterial({ map: bubbleTexture });
    const bubble = new THREE.Sprite(bubbleMaterial);
    bubble.scale.set(4, 1, 1);
    bubble.position.y = 3.5;

    mesh.add(bubble);
    chatBubbles.set(agent.id, {
      mesh: bubble,
      timer: 5 // display for 5 seconds
    });
  }

  /**
   * Update chat bubbles (fade out)
   */
  function updateChatBubbles(deltaTime) {
    for (const [agentId, bubble] of chatBubbles.entries()) {
      bubble.timer -= deltaTime;

      if (bubble.timer <= 0) {
        // Remove bubble
        const npcMesh = npcMeshes.get(agentId);
        if (npcMesh) {
          npcMesh.remove(bubble.mesh);
        }
        chatBubbles.delete(agentId);
      } else if (bubble.timer < 1) {
        // Fade out
        bubble.mesh.material.opacity = bubble.timer;
      }
    }
  }

  /**
   * Reload NPCs for current zone (or by distance on unified world)
   */
  function reloadZoneNPCs(sceneContext, currentZone, playerPos) {
    if (!playerPos) {
      // Fallback: show all NPCs in current zone
      npcMeshes.forEach((mesh, agentId) => {
        const agent = npcAgents.find(a => a.id === agentId);
        if (agent) {
          mesh.visible = (agent.position.zone === currentZone);
        }
      });
      console.log(`Showing NPCs for zone: ${currentZone}`);
    } else {
      // Show NPCs within 200 units of player
      var viewDist = 200;
      npcMeshes.forEach((mesh, agentId) => {
        const agent = npcAgents.find(a => a.id === agentId);
        if (agent) {
          var dx = agent.position.x - playerPos.x;
          var dz = agent.position.z - playerPos.z;
          var dist = Math.sqrt(dx * dx + dz * dz);
          mesh.visible = (dist < viewDist);
        }
      });
    }
  }

  /**
   * Get NPCs in a specific zone
   */
  function getNPCsInZone(zone) {
    return npcAgents.filter(agent => agent.position.zone === zone);
  }

  /**
   * Get specific NPC by ID
   */
  function getNPCById(id) {
    return npcAgents.find(agent => agent.id === id);
  }

  // Export public API
  exports.initNPCs = initNPCs;
  exports.updateNPCs = updateNPCs;
  exports.reloadZoneNPCs = reloadZoneNPCs;
  exports.getNPCsInZone = getNPCsInZone;
  exports.getNPCById = getNPCById;

})(typeof module !== 'undefined' ? module.exports : (window.NPCs = {}));
