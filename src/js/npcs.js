(function(exports) {
  // AI Citizen Simulation Module
  // Simulates 100 founding AI citizens with lifelike behavior

  // Embedded agents data (inlined to avoid fetch in single-file app)
  var EMBEDDED_AGENTS = AGENTS_PLACEHOLDER;

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
        lookAngle: 0
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
      // Create NPC mesh (similar to player but with archetype color)
      const group = new THREE.Group();

      // Body
      const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: ARCHETYPE_COLORS[agent.archetype] || 0xCCCCCC
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.75;
      body.castShadow = true;
      group.add(body);

      // Head
      const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
      const headMaterial = new THREE.MeshPhongMaterial({
        color: ARCHETYPE_COLORS[agent.archetype] || 0xCCCCCC
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.75;
      head.castShadow = true;
      group.add(head);

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

      // Position NPC
      group.position.set(
        agent.position.x,
        agent.position.y,
        agent.position.z
      );

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

      // Decrement state timer
      state.stateTimer -= deltaTime;

      // Check if state should transition
      if (state.stateTimer <= 0) {
        transitionState(agent, state, timeSeed + index);
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
        const angle = seededRandom(seed + 2) * Math.PI * 2;
        const distance = 5 + seededRandom(seed + 3) * 10;
        state.destination = {
          x: Math.max(-30, Math.min(30, agent.position.x + Math.cos(angle) * distance)),
          z: Math.max(-30, Math.min(30, agent.position.z + Math.sin(angle) * distance))
        };
        break;

      case 'talking':
        // Show chat bubble
        showChatBubble(agent, seed);
        break;

      case 'socializing':
        // Find nearby NPC in same zone
        const nearby = npcAgents.filter(other =>
          other.id !== agent.id &&
          other.position.zone === agent.position.zone
        );
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
        // Subtle bobbing animation (handled in visual update)
        break;

      case 'talking':
        // Chat bubble visible (handled separately)
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

    // Update rotation
    if (state.currentState === 'walking' || state.currentState === 'socializing') {
      mesh.rotation.y = state.lookAngle;
    }

    // Working animation (bobbing)
    if (state.currentState === 'working') {
      const bobAmount = Math.sin(Date.now() * 0.003) * 0.1;
      mesh.position.y = bobAmount;
    } else {
      mesh.position.y = 0;
    }

    // Update visibility based on zone (only show NPCs in current zone)
    // This should be called from reloadZoneNPCs when zone changes
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
   * Reload NPCs for current zone
   */
  function reloadZoneNPCs(sceneContext, currentZone) {
    npcMeshes.forEach((mesh, agentId) => {
      const agent = npcAgents.find(a => a.id === agentId);
      if (agent) {
        mesh.visible = (agent.position.zone === currentZone);
      }
    });

    console.log(`Showing NPCs for zone: ${currentZone}`);
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
