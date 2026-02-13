(function(exports) {
  // Main entry point and game loop orchestrator

  // Import references (browser globals or require)
  const Protocol = typeof require !== 'undefined' ? require('./protocol') : window.Protocol;
  const State = typeof require !== 'undefined' ? require('./state') : window.State;
  const Zones = typeof require !== 'undefined' ? require('./zones') : window.Zones;
  const Economy = typeof require !== 'undefined' ? require('./economy') : window.Economy;
  const Intentions = typeof require !== 'undefined' ? require('./intentions') : window.Intentions;
  const Social = typeof require !== 'undefined' ? require('./social') : window.Social;
  const Creation = typeof require !== 'undefined' ? require('./creation') : window.Creation;
  const Competition = typeof require !== 'undefined' ? require('./competition') : window.Competition;
  const Exploration = typeof require !== 'undefined' ? require('./exploration') : window.Exploration;
  const Physical = typeof require !== 'undefined' ? require('./physical') : window.Physical;
  const Auth = typeof require !== 'undefined' ? require('./auth') : window.Auth;
  const Network = typeof require !== 'undefined' ? require('./network') : window.Network;
  const World = typeof require !== 'undefined' ? require('./world') : window.World;
  const Input = typeof require !== 'undefined' ? require('./input') : window.Input;
  const HUD = typeof require !== 'undefined' ? require('./hud') : window.HUD;
  const XR = typeof require !== 'undefined' ? require('./xr') : window.XR;
  const Audio = typeof require !== 'undefined' ? require('./audio') : window.Audio;
  const NPCs = typeof require !== 'undefined' ? require('./npcs') : window.NPCs;

  // Game state
  let gameState = null;
  let sceneContext = null;
  let messageQueue = [];
  let isRunning = false;
  let lastTimestamp = 0;
  let worldTime = 0; // Minutes in 24-hour cycle (0-1440)
  let currentZone = 'nexus';
  let currentWeather = 'clear';
  let localPlayer = null;
  let playStartTime = 0;
  let lastBreakReminder = 0;

  // Platform detection
  let platform = 'desktop';

  /**
   * Initialize the game
   */
  async function init() {
    console.log('Initializing ZION MMO...');

    // Detect platform
    if (Input) {
      platform = Input.getPlatform();
      console.log('Platform:', platform);
    }

    // Check authentication
    if (!Auth) {
      console.error('Auth module not available');
      return;
    }

    // Handle OAuth callback (exchanges ?code= for token if present)
    await Auth.handleCallback();

    // Check if authenticated
    if (!Auth.isAuthenticated()) {
      showLoginScreen();
      return;
    }

    // Hide login screen
    if (typeof document !== 'undefined') {
      var loginEl = document.getElementById('login-screen');
      if (loginEl) loginEl.style.display = 'none';
    }

    // Get username
    const username = Auth.getUsername();
    console.log('Authenticated as:', username);

    // Initialize game systems
    await initGameSystems(username);

    // Start game loop
    startGameLoop();
  }

  /**
   * Initialize game systems
   */
  async function initGameSystems(username) {
    // Initialize audio
    if (Audio) {
      Audio.initAudio();
    }

    // Initialize state
    if (State) {
      gameState = State.initState();
      localPlayer = {
        id: username,
        name: username,
        position: { x: 0, y: 0, z: 0 },
        zone: 'nexus',
        spark: 1000,
        warmth: 100
      };
      State.addPlayer(gameState, localPlayer);
    }

    // Initialize network
    if (Network) {
      const peerId = `zion-${username}-${Date.now()}`;
      Network.initMesh(peerId, {
        onMessage: handleIncomingMessage,
        onPeerConnect: (peerId) => {
          console.log('Peer connected:', peerId);
          HUD && HUD.showNotification(`Player connected: ${peerId}`, 'info');
        },
        onPeerDisconnect: (peerId) => {
          console.log('Peer disconnected:', peerId);
          HUD && HUD.showNotification(`Player disconnected: ${peerId}`, 'info');
          if (gameState && State) {
            State.removePlayer(gameState, peerId);
          }
        }
      });

      // Connect to lobby peer
      const lobbyPeer = Network.getLobbyPeerId('main');
      Network.connectToPeer(lobbyPeer);
    }

    // Initialize 3D scene
    if (typeof document !== 'undefined' && World) {
      const container = document.getElementById('game-container') || document.body;
      sceneContext = World.initScene(container);

      if (sceneContext) {
        World.loadZone(sceneContext, currentZone);
        World.addPlayer(sceneContext, username, localPlayer.position);
      }
    }

    // Initialize HUD
    if (typeof document !== 'undefined' && HUD) {
      const container = document.getElementById('game-container') || document.body;
      HUD.initHUD(container);
      HUD.updateZoneLabel(currentZone);
      HUD.updatePlayerInfo(localPlayer);

      // Add chat input
      HUD.addChatInput((text) => {
        handleLocalAction('chat', { message: text });
        HUD.hideChatInput();
      });
    }

    // Initialize input
    if (Input) {
      Input.initInput({
        onMove: (delta) => {
          // Movement handled in game loop
        },
        onAction: (type, data) => {
          handleLocalAction(type, data);
        },
        onChat: (data) => {
          if (data.mode === 'open') {
            HUD && HUD.showChatInput();
          }
        },
        onBuild: (data) => {
          console.log('Build mode:', data.mode);
          HUD && HUD.showNotification(
            data.mode ? 'Build mode activated' : 'Build mode deactivated',
            'info'
          );
        }
      });
    }

    // Play ambient audio
    if (Audio) {
      Audio.playAmbient(currentZone);
    }

    // Initialize AI citizens
    if (NPCs) {
      NPCs.initNPCs(null, gameState, sceneContext);
      NPCs.reloadZoneNPCs(sceneContext, currentZone);
    }

    // Send join message
    joinWorld();

    // Record play start time
    playStartTime = Date.now();

    console.log('Game systems initialized');
  }

  /**
   * Show login screen
   */
  function showLoginScreen() {
    if (typeof document === 'undefined') {
      console.log('Not authenticated. Please authenticate.');
      return;
    }

    const loginScreen = document.createElement('div');
    loginScreen.id = 'login-screen';
    loginScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      text-align: center;
      color: white;
    `;

    content.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px;">ZION MMO</h1>
      <p style="font-size: 18px; margin-bottom: 30px;">A peer-to-peer social metaverse</p>
      <button id="github-login" style="
        padding: 15px 40px;
        font-size: 18px;
        background: #24292e;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
      ">Login with GitHub</button>
      <p style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
        Or append ?token=YOUR_GITHUB_PAT to the URL for testing
      </p>
    `;

    loginScreen.appendChild(content);
    document.body.appendChild(loginScreen);

    document.getElementById('github-login').addEventListener('click', () => {
      if (Auth) {
        Auth.initiateOAuth();
      }
    });
  }

  /**
   * Start game loop
   */
  function startGameLoop() {
    isRunning = true;
    lastTimestamp = performance.now();

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(gameLoop);
    } else {
      console.warn('requestAnimationFrame not available');
    }
  }

  /**
   * Main game loop
   */
  function gameLoop(timestamp) {
    if (!isRunning) return;

    const deltaTime = (timestamp - lastTimestamp) / 1000; // seconds
    lastTimestamp = timestamp;

    // Process queued messages
    processMessageQueue();

    // Process local player movement
    if (Input && localPlayer && gameState) {
      const delta = Input.getMovementDelta();
      if (delta.x !== 0 || delta.z !== 0) {
        const moveMsg = Input.createMoveMessage(
          localPlayer.id,
          delta,
          localPlayer.position,
          currentZone
        );

        // Apply locally
        handleLocalAction('move', moveMsg.payload);

        // Broadcast to network
        if (Network) {
          Network.broadcastMessage(moveMsg);
        }
      }
    }

    // Evaluate intentions for local player
    if (Intentions && localPlayer && gameState) {
      const intentions = Intentions.getIntentions(gameState, localPlayer.id);
      // Intentions are passive - they inform AI/automation, not direct control
    }

    // Update world time (24-min day/night cycle = 1440 minutes in 24 real minutes)
    worldTime += deltaTime * 60; // 60x speed
    if (worldTime >= 1440) worldTime -= 1440;

    // Update AI citizens
    if (NPCs) {
      NPCs.updateNPCs(sceneContext, gameState, deltaTime, worldTime);
    }

    // Update rendering
    if (sceneContext && World) {
      // Update player positions
      if (gameState && State) {
        const players = State.getPlayers(gameState);
        players.forEach(player => {
          if (player.id !== localPlayer.id) {
            World.movePlayer(sceneContext, player.id, player.position);
          } else {
            World.movePlayer(sceneContext, player.id, localPlayer.position);
          }
        });
      }

      // Camera follows player (third-person)
      if (sceneContext.camera && localPlayer) {
        var camOffsetX = localPlayer.position.x;
        var camOffsetY = localPlayer.position.y + 12;
        var camOffsetZ = localPlayer.position.z + 18;
        sceneContext.camera.position.lerp(
          new THREE.Vector3(camOffsetX, camOffsetY, camOffsetZ), 0.05
        );
        sceneContext.camera.lookAt(
          localPlayer.position.x,
          localPlayer.position.y + 1,
          localPlayer.position.z
        );
      }

      // Update day/night cycle
      World.updateDayNight(sceneContext, worldTime);

      // Cull distant lights for performance (max 8 nearest within 40 units)
      if (World.cullLights) {
        World.cullLights(sceneContext, localPlayer.position, 40, 8);
      }

      // Render scene
      if (sceneContext.renderer && sceneContext.scene && sceneContext.camera) {
        sceneContext.renderer.render(sceneContext.scene, sceneContext.camera);
      }
    }

    // Update HUD
    if (HUD && gameState && State) {
      // Update player info
      HUD.updatePlayerInfo(localPlayer);

      // Update minimap
      const players = State.getPlayers(gameState);
      const mapPlayers = players.map(p => ({
        id: p.id,
        position: p.position,
        isLocal: p.id === localPlayer.id
      }));
      HUD.updateMinimap(mapPlayers, currentZone);

      // Update nearby players
      const nearby = players
        .filter(p => p.id !== localPlayer.id && p.zone === currentZone)
        .map(p => {
          const dx = p.position.x - localPlayer.position.x;
          const dz = p.position.z - localPlayer.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          return { id: p.id, name: p.name, distance };
        })
        .sort((a, b) => a.distance - b.distance);

      HUD.updateNearbyPlayers(nearby);

      // Update chat
      const messages = Social ? Social.getRecentMessages(gameState) : [];
      HUD.updateChat(messages);
    }

    // Check for break reminder (every 30 minutes)
    const minutesPlayed = (Date.now() - playStartTime) / 60000;
    if (minutesPlayed > 30 && minutesPlayed - lastBreakReminder > 30) {
      if (HUD) {
        HUD.showBreakReminder(Math.floor(minutesPlayed));
      }
      lastBreakReminder = minutesPlayed;
    }

    // Request next frame
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(gameLoop);
    }
  }

  /**
   * Process queued incoming messages
   */
  function processMessageQueue() {
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift();
      applyMessage(msg);
    }
  }

  /**
   * Handle incoming network message
   */
  function handleIncomingMessage(msg) {
    // Validate message
    if (!Protocol || !Protocol.validate(msg)) {
      console.warn('Invalid message received:', msg);
      return;
    }

    // Add to queue for processing
    messageQueue.push(msg);
  }

  /**
   * Apply message to game state
   */
  function applyMessage(msg) {
    if (!gameState || !State) return;

    switch (msg.type) {
      case 'join':
        handleJoinMessage(msg);
        break;
      case 'leave':
        handleLeaveMessage(msg);
        break;
      case 'move':
        handleMoveMessage(msg);
        break;
      case 'chat':
        handleChatMessage(msg);
        break;
      case 'warp':
        handleWarpMessage(msg);
        break;
      case 'harvest':
        handleHarvestMessage(msg);
        break;
      case 'build':
        handleBuildMessage(msg);
        break;
      case 'trade':
        handleTradeMessage(msg);
        break;
      default:
        console.log('Unknown message type:', msg.type);
    }
  }

  /**
   * Handle join message
   */
  function handleJoinMessage(msg) {
    const player = {
      id: msg.from,
      name: msg.from,
      position: msg.payload.position || { x: 0, y: 0, z: 0 },
      zone: msg.payload.zone || 'nexus',
      spark: 1000,
      warmth: 100
    };

    State.addPlayer(gameState, player);

    if (World && sceneContext) {
      World.addPlayer(sceneContext, player.id, player.position);
    }

    if (HUD) {
      HUD.showNotification(`${player.name} joined the world`, 'success');
    }

    if (Audio) {
      Audio.playSound('warp');
    }
  }

  /**
   * Handle leave message
   */
  function handleLeaveMessage(msg) {
    State.removePlayer(gameState, msg.from);

    if (World && sceneContext) {
      World.removePlayer(sceneContext, msg.from);
    }

    if (HUD) {
      HUD.showNotification(`${msg.from} left the world`, 'info');
    }
  }

  /**
   * Handle move message
   */
  function handleMoveMessage(msg) {
    const player = State.getPlayer(gameState, msg.from);
    if (!player) return;

    player.position = msg.payload.position;
    player.zone = msg.payload.zone;

    // Update in world if not local player
    if (msg.from !== localPlayer.id && World && sceneContext) {
      World.movePlayer(sceneContext, msg.from, player.position);
    }
  }

  /**
   * Handle chat message
   */
  function handleChatMessage(msg) {
    if (Social) {
      Social.addMessage(gameState, {
        user: msg.from,
        text: msg.payload.message,
        timestamp: msg.timestamp
      });
    }

    if (Audio) {
      Audio.playSound('chat');
    }
  }

  /**
   * Handle warp message
   */
  function handleWarpMessage(msg) {
    const player = State.getPlayer(gameState, msg.from);
    if (!player) return;

    player.zone = msg.payload.zone;
    player.position = msg.payload.position;

    if (msg.from === localPlayer.id) {
      // Local player warped
      currentZone = msg.payload.zone;

      if (World && sceneContext) {
        World.loadZone(sceneContext, currentZone);
        World.addPlayer(sceneContext, localPlayer.id, localPlayer.position);
      }

      if (HUD) {
        HUD.updateZoneLabel(currentZone);
      }

      if (Audio) {
        Audio.playAmbient(currentZone);
      }

      if (NPCs) {
        NPCs.reloadZoneNPCs(sceneContext, currentZone);
      }
    }

    if (Audio) {
      Audio.playSound('warp');
    }
  }

  /**
   * Handle harvest message
   */
  function handleHarvestMessage(msg) {
    if (Economy) {
      Economy.earnSpark(gameState, msg.from, msg.payload.amount || 10);
    }

    if (Audio) {
      Audio.playSound('harvest');
    }

    if (msg.from === localPlayer.id && HUD) {
      HUD.showNotification(`Harvested ${msg.payload.amount || 10} Spark`, 'success');
    }
  }

  /**
   * Handle build message
   */
  function handleBuildMessage(msg) {
    if (Creation && World && sceneContext) {
      const structure = msg.payload.structure;
      World.addStructure(sceneContext, structure);
    }

    if (Audio) {
      Audio.playSound('build');
    }
  }

  /**
   * Handle trade message
   */
  function handleTradeMessage(msg) {
    if (Economy) {
      Economy.transferSpark(
        gameState,
        msg.payload.from,
        msg.payload.to,
        msg.payload.amount
      );
    }

    if (Audio) {
      Audio.playSound('trade');
    }

    if (HUD && (msg.payload.from === localPlayer.id || msg.payload.to === localPlayer.id)) {
      HUD.showNotification(
        `Trade: ${msg.payload.amount} Spark`,
        'success'
      );
    }
  }

  /**
   * Handle local action (created by this client)
   */
  function handleLocalAction(type, payload) {
    let msg = null;

    switch (type) {
      case 'move':
        localPlayer.position = payload.position;
        localPlayer.zone = payload.zone;
        // Move message already created by Input module
        break;

      case 'chat':
        msg = Protocol.create.chat(localPlayer.id, payload.message);
        break;

      case 'interact':
        // Check for nearby objects/players
        msg = Protocol.create.harvest(localPlayer.id, 10);
        break;

      case 'click':
        // Raycasting for object selection would go here
        console.log('Click at:', payload);
        break;

      default:
        console.log('Unknown local action:', type);
    }

    if (msg) {
      // Apply locally first
      applyMessage(msg);

      // Broadcast to network
      if (Network) {
        Network.broadcastMessage(msg);
      }
    }
  }

  /**
   * Join world
   */
  function joinWorld() {
    if (!Protocol || !Network) return;

    const msg = Protocol.create.join(localPlayer.id, {
      position: localPlayer.position,
      zone: currentZone
    });

    // Broadcast join message
    Network.broadcastMessage(msg);

    console.log('Joined world');
  }

  /**
   * Leave world
   */
  function leaveWorld() {
    if (!Protocol || !Network) return;

    const msg = Protocol.create.leave(localPlayer.id);

    // Broadcast leave message
    Network.broadcastMessage(msg);

    // Disconnect from network
    Network.disconnect();

    // Stop audio
    if (Audio) {
      Audio.stopAll();
    }

    // Stop game loop
    isRunning = false;

    console.log('Left world');
  }

  // Auto-start on DOM ready
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', init);

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      leaveWorld();
    });
  }

  // Export public API
  exports.init = init;
  exports.joinWorld = joinWorld;
  exports.leaveWorld = leaveWorld;
  exports.handleLocalAction = handleLocalAction;

})(typeof module !== 'undefined' ? module.exports : (window.Main = {}));
