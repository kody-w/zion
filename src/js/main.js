(function(exports) {
  // Main entry point and game loop orchestrator

  // Import references (browser globals or require)
  const Protocol = typeof require !== 'undefined' ? require('./protocol') : window.Protocol;
  const State = typeof require !== 'undefined' ? require('./state') : window.State;
  const Zones = typeof require !== 'undefined' ? require('./zones') : window.Zones;
  const Economy = typeof require !== 'undefined' ? require('./economy') : window.Economy;
  const Inventory = typeof require !== 'undefined' ? require('./inventory') : window.Inventory;
  const Trading = typeof require !== 'undefined' ? require('./trading') : window.Trading;
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
  const Quests = typeof require !== 'undefined' ? require('./quests') : window.Quests;
  const Mentoring = typeof require !== 'undefined' ? require('./mentoring') : window.Mentoring;
  const Guilds = typeof require !== 'undefined' ? require('./guilds') : window.Guilds;

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
  let footstepTimer = 0;
  let currentTimePeriod = 'morning';  // tracks dawn/morning/midday/afternoon/evening/night
  let cameraYaw = 0;       // horizontal camera orbit angle (radians)
  let cameraPitch = 0.35;  // vertical tilt (0 = flat, higher = more top-down)
  let cameraDistance = 18;  // distance from player
  let isDragging = false;
  let lastMouseX = 0, lastMouseY = 0;
  let playerInventory = null;
  let economyLedger = null;
  let raycaster = null;
  let npcUpdateFrame = 0;

  // Performance tracking
  let frameCount = 0;
  let fpsFrameTimes = [];
  let currentFPS = 60;
  let showDebug = false; // Set to true to show FPS counter

  // Play time tracking
  let playTimeSeconds = 0;
  let recentActivities = [];

  // Warmth tracking (GPS-based outdoor play bonus)
  let gpsHistory = [];
  let gpsWatchId = null;
  let lastWarmthUpdate = 0;

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

    // Initialize economy ledger
    if (Economy) {
      economyLedger = Economy.createLedger();
      economyLedger.balances[username] = 1000;
    }

    // Initialize inventory
    if (Inventory) {
      playerInventory = Inventory.createInventory();
      Inventory.addItem(playerInventory, 'wood_oak', 5);
      Inventory.addItem(playerInventory, 'stone_common', 5);
      Inventory.addItem(playerInventory, 'seed_wildflower', 3);
    }

    // Initialize raycaster for clicking
    if (typeof THREE !== 'undefined') {
      raycaster = new THREE.Raycaster();
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
        // Load initial zone - positions player at nexus center
        World.loadZone(sceneContext, currentZone);
        // Load initial chunks around player
        if (World.updateChunks) {
          World.updateChunks(sceneContext, localPlayer.position.x, localPlayer.position.z);
        }
        World.addPlayer(sceneContext, username, localPlayer.position);

        // Initialize particle effects (fire, sparkle, mist, fountain, etc.)
        if (World.initParticles) {
          World.initParticles(sceneContext);
        }

        // Initialize water bodies (ponds, rivers, fountains)
        if (World.initWater) {
          World.initWater(sceneContext);
        }

        // Initialize skybox (sky dome, stars, sun, moon)
        if (World.initSkybox) {
          World.initSkybox(sceneContext);
        }

        // Initialize resource nodes for harvesting
        if (World.initResourceNodes) {
          World.initResourceNodes(sceneContext);
        }
      }
    }

    // Initialize HUD
    if (typeof document !== 'undefined' && HUD) {
      const container = document.getElementById('game-container') || document.body;
      HUD.initHUD(container);
      HUD.updateZoneLabel(currentZone);
      HUD.updatePlayerInfo(localPlayer);

      // Initialize toolbar (action buttons, coords, time/weather)
      if (HUD.initToolbar) {
        HUD.initToolbar();
      }

      // Initialize quest tracker
      if (HUD.initQuestTracker) {
        HUD.initQuestTracker();
      }

      // Initialize inventory panel
      if (HUD.initInventoryPanel) {
        HUD.initInventoryPanel();
      }

      // Initialize crafting panel with craft callback
      if (HUD.initCraftingPanel) {
        HUD.initCraftingPanel(function(recipeId) {
          handleCraft(recipeId);
        });
      }

      // Initialize quick bar
      if (HUD.initQuickBar) {
        HUD.initQuickBar();
      }

      // Load settings and apply them
      if (HUD.loadSettings) {
        HUD.loadSettings();
        var settings = HUD.getSettings();
        if (settings && Audio) {
          if (Audio.setVolume) {
            Audio.setVolume('master', settings.masterVolume / 100);
            Audio.setVolume('music', settings.musicVolume / 100);
            Audio.setVolume('sfx', settings.sfxVolume / 100);
          }
        }
        // Set FPS counter visibility
        if (settings) {
          showDebug = settings.showFPS;
        }
      }

      // Initialize play time tracking
      getPlayTimeSeconds();

      // Add chat input
      HUD.addChatInput((text) => {
        handleLocalAction('chat', { message: text });
        HUD.hideChatInput();
      });
    }

    // Initialize quest system for local player
    if (Quests) {
      Quests.initPlayerQuests(username);
      console.log('Quest system initialized for player:', username);
    }

    // Initialize trading system
    if (Trading && Network) {
      Trading.initTrading(function(msg) {
        Network.broadcastMessage(msg);
      });
      console.log('Trading system initialized');
    }

    // Set up NPC dialog action handler
    if (HUD && HUD.setNPCActionCallback) {
      HUD.setNPCActionCallback(function(action, npcData) {
        handleNPCAction(action, npcData);
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
          handleBuildAction(data);
        }
      });
    }

    // Mouse-look camera control (right-click drag to orbit)
    if (typeof document !== 'undefined') {
      var gameCanvas = document.querySelector('canvas');
      if (gameCanvas) {
        gameCanvas.addEventListener('mousedown', function(e) {
          if (e.button === 2 || e.button === 0) { // right or left click
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
          }
        });
        document.addEventListener('mousemove', function(e) {
          if (!isDragging) return;
          var dx = e.clientX - lastMouseX;
          var dy = e.clientY - lastMouseY;
          cameraYaw -= dx * 0.005;
          cameraPitch = Math.max(0.1, Math.min(1.2, cameraPitch + dy * 0.005));
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        });
        document.addEventListener('mouseup', function() {
          isDragging = false;
        });
        // Scroll to zoom
        gameCanvas.addEventListener('wheel', function(e) {
          cameraDistance = Math.max(5, Math.min(40, cameraDistance + e.deltaY * 0.02));
          e.preventDefault();
        }, { passive: false });
      }
    }

    // Play ambient audio
    if (Audio) {
      Audio.playAmbient(currentZone);
    }

    // Initialize AI citizens
    if (NPCs) {
      NPCs.initNPCs(null, gameState, sceneContext);
      NPCs.reloadZoneNPCs(sceneContext, currentZone, localPlayer.position);
    }

    // Send join message
    joinWorld();

    // Record play start time
    playStartTime = Date.now();

    // Start GPS tracking for Warmth (only if geolocation available)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        gpsWatchId = navigator.geolocation.watchPosition(function(pos) {
          gpsHistory.push({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            ts: Date.now()
          });
          // Keep only last 100 points
          if (gpsHistory.length > 100) {
            gpsHistory = gpsHistory.slice(-100);
          }
        }, function() {
          // Geolocation denied or unavailable - game works fine without it
          console.log('Geolocation not available - Warmth bonus disabled');
        }, { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 });
      } catch (e) {
        // Silently ignore - warmth is optional
      }
    }

    console.log('Game systems initialized');
  }

  /**
   * Convert 3D position to screen coordinates
   */
  function getScreenPosition(position, camera, renderer) {
    if (!window.THREE || !camera || !renderer) return null;

    var vector = new window.THREE.Vector3(position.x, position.y + 2, position.z);
    vector.project(camera);

    var widthHalf = renderer.domElement.width / 2;
    var heightHalf = renderer.domElement.height / 2;

    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    };
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
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, #0a0e1a 0%, #1a1040 40%, #0d2137 70%, #0a0e1a 100%);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; font-family: 'Segoe UI', Arial, sans-serif;
      overflow: hidden;
    `;

    // Animated star background
    var starCanvas = document.createElement('canvas');
    starCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    starCanvas.width = window.innerWidth;
    starCanvas.height = window.innerHeight;
    loginScreen.appendChild(starCanvas);
    var starCtx = starCanvas.getContext('2d');
    var loginStars = [];
    for (var si = 0; si < 150; si++) {
      loginStars.push({
        x: Math.random() * starCanvas.width,
        y: Math.random() * starCanvas.height,
        r: 0.5 + Math.random() * 1.5,
        speed: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }
    function animateLoginStars() {
      if (!document.getElementById('login-screen')) return;
      starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
      var time = Date.now() * 0.001;
      loginStars.forEach(function(s) {
        var alpha = 0.3 + Math.sin(time * s.speed + s.phase) * 0.4;
        starCtx.fillStyle = 'rgba(180, 200, 255, ' + Math.max(0, alpha) + ')';
        starCtx.beginPath();
        starCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        starCtx.fill();
      });
      requestAnimationFrame(animateLoginStars);
    }
    animateLoginStars();

    const content = document.createElement('div');
    content.style.cssText = 'text-align:center;color:white;position:relative;z-index:1;';

    content.innerHTML = `
      <div style="font-size:72px;font-weight:100;letter-spacing:16px;margin-bottom:8px;
        background:linear-gradient(135deg,#4af,#a8f,#4af);-webkit-background-clip:text;
        -webkit-text-fill-color:transparent;background-clip:text;">ZION</div>
      <p style="font-size:16px;margin-bottom:40px;opacity:0.6;letter-spacing:4px;text-transform:uppercase;">
        A peer-to-peer social metaverse</p>
      <button id="github-login" style="
        padding:16px 48px;font-size:16px;background:rgba(255,255,255,0.1);
        color:white;border:1px solid rgba(255,255,255,0.3);border-radius:30px;
        cursor:pointer;font-weight:500;letter-spacing:1px;
        backdrop-filter:blur(10px);transition:all 0.3s;
      " onmouseover="this.style.background='rgba(255,255,255,0.2)';this.style.borderColor='rgba(255,255,255,0.6)'"
         onmouseout="this.style.background='rgba(255,255,255,0.1)';this.style.borderColor='rgba(255,255,255,0.3)'"
      >Login with GitHub</button>
      <p style="margin-top:24px;font-size:12px;opacity:0.4;">
        Or append ?token=YOUR_GITHUB_PAT to the URL</p>
      <div style="margin-top:60px;font-size:11px;opacity:0.3;">
        100 AI citizens await in 8 zones</div>
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

    // Increment frame counter for periodic updates
    npcUpdateFrame++;
    frameCount++;

    // Track FPS
    fpsFrameTimes.push(deltaTime);
    if (fpsFrameTimes.length > 60) {
      fpsFrameTimes.shift();
    }
    if (fpsFrameTimes.length > 10) {
      var avgFrameTime = fpsFrameTimes.reduce(function(a, b) { return a + b; }, 0) / fpsFrameTimes.length;
      currentFPS = avgFrameTime > 0 ? Math.round(1 / avgFrameTime) : 60;
    }

    // Track play time
    playTimeSeconds += deltaTime;
    // Save every 30 seconds
    if (frameCount % 1800 === 0) {
      savePlayTime();
    }

    // Update FPS counter visibility from settings
    if (HUD && HUD.getSettings) {
      var settings = HUD.getSettings();
      if (settings) {
        showDebug = settings.showFPS;
      }
    }

    // Process queued messages
    processMessageQueue();

    // Process local player movement
    if (Input && localPlayer && gameState) {
      const delta = Input.getMovementDelta();
      if (delta.x !== 0 || delta.z !== 0) {
        // Rotate movement delta by camera yaw so WASD is camera-relative
        var sinYaw = Math.sin(cameraYaw);
        var cosYaw = Math.cos(cameraYaw);
        var rotatedDelta = {
          x: delta.x * cosYaw - delta.z * sinYaw,
          y: delta.y,
          z: delta.x * sinYaw + delta.z * cosYaw
        };

        const moveMsg = Input.createMoveMessage(
          localPlayer.id,
          rotatedDelta,
          localPlayer.position,
          currentZone
        );

        // Collision check — reject move if it would clip into a structure
        var newPos = moveMsg.payload.position;
        if (World && World.checkCollision && World.checkCollision(newPos.x, newPos.z, 0.5)) {
          // Blocked — try sliding along X or Z axis only
          var slideX = { x: newPos.x, y: localPlayer.position.y, z: localPlayer.position.z };
          var slideZ = { x: localPlayer.position.x, y: localPlayer.position.y, z: newPos.z };
          if (!World.checkCollision(slideX.x, slideX.z, 0.5)) {
            moveMsg.payload.position = slideX;
          } else if (!World.checkCollision(slideZ.x, slideZ.z, 0.5)) {
            moveMsg.payload.position = slideZ;
          } else {
            // Fully blocked, don't move
            moveMsg.payload.position = { x: localPlayer.position.x, y: localPlayer.position.y, z: localPlayer.position.z };
          }
        }

        // Apply locally
        handleLocalAction('move', moveMsg.payload);

        // Broadcast to network
        if (Network) {
          Network.broadcastMessage(moveMsg);
        }

        // Update world chunks around player position
        if (World && World.updateChunks && sceneContext) {
          World.updateChunks(sceneContext, localPlayer.position.x, localPlayer.position.z);
        }

        // Detect zone from player position
        if (World && World.getZoneAtPosition) {
          var detectedZone = World.getZoneAtPosition(localPlayer.position.x, localPlayer.position.z);
          if (detectedZone !== currentZone) {
            var oldZone = currentZone;
            currentZone = detectedZone;
            console.log('Entered zone:', currentZone);
            // Track activity
            addRecentActivity('Entered ' + currentZone);

            if (Mentoring) {
              var xpResult = Mentoring.addSkillXP(localPlayer.id, 'exploration', 8);
              if (xpResult.leveledUp && HUD) {
                HUD.showNotification('Exploration skill increased to ' + xpResult.newLevelName, 'success');
              }
            }

            if (HUD) {
              HUD.updateZoneLabel(currentZone);
              HUD.showNotification('Entered ' + currentZone.charAt(0).toUpperCase() + currentZone.slice(1), 'info');
            }

            if (Audio) {
              Audio.playAmbient(currentZone);
              if (Audio.setZoneAmbient) Audio.setZoneAmbient(currentZone);
            }

            if (NPCs) {
              NPCs.reloadZoneNPCs(sceneContext, currentZone, localPlayer.position);
              // Broadcast zone change to NPCs
              if (NPCs.broadcastEvent) {
                NPCs.broadcastEvent({ type: 'player_zone_change', data: {
                  playerId: localPlayer.id, fromZone: oldZone, toZone: currentZone,
                  position: localPlayer.position
                }});
              }
            }

            // Update quest progress for zone visits
            if (Quests) {
              var updated = Quests.updateQuestProgress(localPlayer.id, 'visit_zone', { zone: currentZone });
              if (updated.length > 0 && HUD) {
                updated.forEach(function(quest) {
                  HUD.showQuestProgress('Quest progress: ' + quest.title);
                });
              }
            }
          }
        }

        // Update NPC visibility by distance every ~30 frames
        if (NPCs && Math.random() < 0.03) {
          NPCs.reloadZoneNPCs(sceneContext, currentZone, localPlayer.position);
        }

        // Footstep sounds
        footstepTimer += deltaTime;
        if (footstepTimer >= 0.4) {
          // Determine footstep sound based on zone
          var footstepTerrain = 'grass'; // default
          if (currentZone === 'nexus' || currentZone === 'athenaeum') footstepTerrain = 'stone';
          else if (currentZone === 'arena') footstepTerrain = 'sand';
          else if (currentZone === 'agora' || currentZone === 'commons') footstepTerrain = 'wood';
          else if (currentZone === 'gardens') footstepTerrain = 'grass';
          else if (currentZone === 'wilds') footstepTerrain = 'grass';

          if (Audio && Audio.playFootstep) {
            Audio.playFootstep(footstepTerrain);
          }
          footstepTimer = 0;
        }
      } else {
        // Reset footstep timer when not moving
        footstepTimer = 0;
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

    // Detect time period from worldTime (minutes 0-1440)
    var worldHour = worldTime / 60;
    var newTimePeriod = 'night';
    if (worldHour >= 5 && worldHour < 7) newTimePeriod = 'dawn';
    else if (worldHour >= 7 && worldHour < 12) newTimePeriod = 'morning';
    else if (worldHour >= 12 && worldHour < 14) newTimePeriod = 'midday';
    else if (worldHour >= 14 && worldHour < 18) newTimePeriod = 'afternoon';
    else if (worldHour >= 18 && worldHour < 21) newTimePeriod = 'evening';
    else newTimePeriod = 'night';

    // Broadcast time period changes to NPCs and audio
    if (newTimePeriod !== currentTimePeriod) {
      currentTimePeriod = newTimePeriod;
      if (NPCs && NPCs.broadcastEvent) {
        NPCs.broadcastEvent({ type: 'time_change', data: { period: currentTimePeriod, hour: worldHour } });
      }
      // Update ambient audio for time of day
      if (Audio && Audio.updateAmbientTime) {
        Audio.updateAmbientTime(currentTimePeriod);
      }
    }

    // Update AI citizens — pass player position and weather for perception
    if (NPCs) {
      var npcWorldState = {
        weather: currentWeather,
        worldTime: worldTime,
        timePeriod: currentTimePeriod,
        playerPosition: localPlayer ? localPlayer.position : null,
        playerId: localPlayer ? localPlayer.id : null
      };
      NPCs.updateNPCs(sceneContext, gameState, deltaTime, worldTime, npcWorldState);
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

      // Camera follows player (orbiting third-person with spring physics)
      if (sceneContext.camera && localPlayer) {
        var terrainY = 0;
        if (World && World.getTerrainHeight) {
          terrainY = World.getTerrainHeight(localPlayer.position.x, localPlayer.position.z);
        }
        localPlayer.position.y = terrainY;

        // Calculate orbiting camera position from yaw/pitch/distance
        var camOffX = Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;
        var camOffY = Math.sin(cameraPitch) * cameraDistance;
        var camOffZ = Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;

        var camTargetX = localPlayer.position.x + camOffX;
        var camTargetY = terrainY + camOffY + 2;
        var camTargetZ = localPlayer.position.z + camOffZ;

        // Ensure camera doesn't go below terrain
        var camTerrainY = World && World.getTerrainHeight ? World.getTerrainHeight(camTargetX, camTargetZ) : 0;
        if (camTargetY < camTerrainY + 2) camTargetY = camTerrainY + 2;

        // Smooth spring follow
        var lerpSpeed = Math.min(deltaTime * 4.0, 1.0);
        sceneContext.camera.position.x += (camTargetX - sceneContext.camera.position.x) * lerpSpeed;
        sceneContext.camera.position.y += (camTargetY - sceneContext.camera.position.y) * lerpSpeed;
        sceneContext.camera.position.z += (camTargetZ - sceneContext.camera.position.z) * lerpSpeed;

        sceneContext.camera.lookAt(
          localPlayer.position.x,
          terrainY + 1.5,
          localPlayer.position.z
        );
      }

      // Update day/night cycle
      World.updateDayNight(sceneContext, worldTime);

      // Weather cycling — changes every 6 in-game hours (every 6 real minutes)
      var weatherCycleMinute = Math.floor(worldTime / 360); // 0-3
      var weatherTypes = ['clear', 'cloudy', 'rain', 'clear'];
      var nextWeather = weatherTypes[weatherCycleMinute % weatherTypes.length];
      if (nextWeather !== currentWeather) {
        var prevWeather = currentWeather;
        currentWeather = nextWeather;
        if (World.setWeather) {
          World.setWeather(sceneContext, currentWeather);
        }
        // Broadcast weather change to NPCs
        if (NPCs && NPCs.broadcastEvent) {
          NPCs.broadcastEvent({ type: 'weather_change', data: { weather: currentWeather, previous: prevWeather } });
        }
        // Update ambient audio for weather
        if (Audio && Audio.updateAmbientWeather) {
          Audio.updateAmbientWeather(currentWeather);
        }
      }

      // Cull distant lights for performance (max 8 nearest within 40 units)
      if (World.cullLights) {
        World.cullLights(sceneContext, localPlayer.position, 40, 8);
      }

      // Performance optimizations
      // Update frustum culling every 10 frames
      if (frameCount % 10 === 0 && World.updateFrustumCulling) {
        World.updateFrustumCulling(sceneContext);
      }

      // Update LOD every 30 frames
      if (frameCount % 30 === 0 && World.updateLOD) {
        World.updateLOD(sceneContext, localPlayer.position);
      }

      // Update environmental animations
      if (World.updateAnimations) {
        World.updateAnimations(sceneContext, deltaTime, worldTime);
      }

      // Update resource nodes (respawning)
      if (World.updateResourceNodes) {
        World.updateResourceNodes(deltaTime);
      }

      // Update player animations (walk/run/idle)
      if (World.updatePlayerAnimations) {
        World.updatePlayerAnimations(sceneContext, deltaTime);
      }

      // Update particle effects (fire, sparkle, mist, fountain, leaves)
      if (World.updateParticles) {
        World.updateParticles(sceneContext, deltaTime * 1000, localPlayer ? localPlayer.position : null);
      }

      // Update weather effects (rain, snow)
      if (World.updateWeatherEffects) {
        World.updateWeatherEffects(sceneContext, deltaTime * 1000, localPlayer ? localPlayer.position : null);
      }

      // Update water bodies (animated waves)
      if (World.updateWater) {
        World.updateWater(deltaTime);
      }

      // Update skybox (sun/moon orbit, star visibility)
      if (World.updateSkybox) {
        World.updateSkybox(sceneContext, worldTime);
      }

      // Update build preview if in build mode
      if (buildModeActive && World && World.updateBuildPreview && Input && Input.getMouseNDC) {
        var mousePos = Input.getMouseNDC();
        World.updateBuildPreview(sceneContext, mousePos.x, mousePos.y, sceneContext.camera);
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

      // Update minimap and emote bubbles
      const players = State.getPlayers(gameState);

      // Update emote bubble positions
      if (HUD.updateEmoteBubbles && sceneContext && sceneContext.camera) {
        var playerPositions = {};
        players.forEach(function(player) {
          if (World && World.getPlayerMesh) {
            var mesh = World.getPlayerMesh(sceneContext, player.id);
            if (mesh) {
              var screenPos = getScreenPosition(mesh.position, sceneContext.camera, sceneContext.renderer);
              if (screenPos) {
                playerPositions[player.id] = screenPos;
              }
            }
          }
        });
        HUD.updateEmoteBubbles(playerPositions);
      }
      const mapPlayers = players.map(p => ({
        id: p.id,
        position: p.position,
        isLocal: p.id === localPlayer.id
      }));
      HUD.updateMinimap(mapPlayers, currentZone);

      // Update NPC dots on minimap
      if (HUD.updateMinimapNPCs && NPCs && NPCs.getNPCPositions) {
        HUD.updateMinimapNPCs(NPCs.getNPCPositions(), localPlayer.position);
      }

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

      // Update coordinates display
      if (HUD.updateCoords && localPlayer) {
        HUD.updateCoords(localPlayer.position);
      }

      // Update time and weather display
      if (HUD.updateTimeWeather) {
        HUD.updateTimeWeather(worldTime, currentWeather);
      }

      // Update chat
      const messages = Social ? Social.getRecentMessages(gameState) : [];
      HUD.updateChat(messages);

      // Update quest tracker (every few frames)
      if (Quests && HUD.updateQuestTracker && npcUpdateFrame % 30 === 0) {
        var activeQuests = Quests.getActiveQuests(localPlayer.id);
        HUD.updateQuestTracker(activeQuests);
      }

      // Update quest indicators on NPCs (every few frames)
      if (Quests && NPCs && NPCs.updateQuestIndicators && npcUpdateFrame % 60 === 0) {
        NPCs.updateQuestIndicators(localPlayer.id, localPlayer.position);
      }

      // Update Warmth from GPS movement (every 5 seconds)
      var now = Date.now();
      if (now - lastWarmthUpdate > 5000 && Physical && gpsHistory.length >= 2) {
        lastWarmthUpdate = now;
        var newWarmth = Physical.calculateWarmth(gpsHistory);
        if (localPlayer && newWarmth !== localPlayer.warmth) {
          localPlayer.warmth = newWarmth;
          // Warmth bonus applies to harvest yields and discovery rates
          // This is cosmetic-adjacent per constitution - minor 1-10% bonus
        }
      }

      // Update FPS display if debug mode is enabled
      if (showDebug && typeof document !== 'undefined') {
        var fpsElement = document.getElementById('fps-counter');
        if (!fpsElement) {
          fpsElement = document.createElement('div');
          fpsElement.id = 'fps-counter';
          fpsElement.style.position = 'fixed';
          fpsElement.style.top = '10px';
          fpsElement.style.right = '10px';
          fpsElement.style.padding = '8px 12px';
          fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          fpsElement.style.color = '#00ff00';
          fpsElement.style.fontFamily = 'monospace';
          fpsElement.style.fontSize = '12px';
          fpsElement.style.borderRadius = '4px';
          fpsElement.style.zIndex = '10000';
          document.body.appendChild(fpsElement);
        }

        // Get performance stats from World
        var perfStats = World && World.getPerformanceStats ? World.getPerformanceStats() : null;
        var statsText = 'FPS: ' + currentFPS;
        if (perfStats) {
          statsText += '\nObjects: ' + perfStats.visibleObjects + '/' + perfStats.totalObjects;
          statsText += '\nAnimations: ' + perfStats.activeAnimations;
          statsText += '\nChunks: ' + perfStats.loadedChunks;
          statsText += '\nTriangles: ' + perfStats.estimatedTriangles;
        }
        fpsElement.innerText = statsText;
      }
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
      case 'trade_offer':
      case 'trade_accept':
      case 'trade_decline':
        handleTradeProtocolMessage(msg);
        break;
      case 'emote':
        handleEmoteMessage(msg);
        break;
      case 'discover':
        handleDiscoverMessage(msg);
        break;
      case 'score':
        handleScoreMessage(msg);
        break;
      default:
        console.log('Unknown message type:', msg.type);
    }
  }

  /**
   * Handle emote message
   */
  function handleEmoteMessage(msg) {
    if (!msg.payload || !msg.payload.emoteType) return;

    // Play animation on remote player mesh
    if (World && sceneContext && NPCs && NPCs.playEmoteAnimation) {
      var playerMesh = World.getPlayerMesh ? World.getPlayerMesh(sceneContext, msg.from) : null;
      if (playerMesh) {
        NPCs.playEmoteAnimation(playerMesh, msg.payload.emoteType);
      }
    }

    // Show emote bubble
    if (HUD && HUD.showEmoteBubble) {
      HUD.showEmoteBubble(msg.from, msg.payload.emoteType);
    }
  }

  /**
   * Handle discover message
   */
  function handleDiscoverMessage(msg) {
    if (!Exploration || !gameState) return;

    var result = Exploration.handleDiscover(msg, gameState);
    if (result.success) {
      // Update game state
      gameState = result.state;

      // If this is the local player, show discovery popup and update spark
      if (msg.from === localPlayer.id) {
        if (HUD && HUD.showDiscoveryPopup) {
          var discoveryData = {
            name: result.discovery.type.charAt(0).toUpperCase() + result.discovery.type.slice(1),
            description: result.discovery.description,
            rarity: getRarityName(result.discovery.rarity),
            sparkReward: result.sparkAwarded
          };
          HUD.showDiscoveryPopup(discoveryData);
        }

        // Award spark
        if (economyLedger && Economy && result.sparkAwarded) {
          Economy.earnSpark(economyLedger, localPlayer.id, 'discovery', { complexity: result.discovery.rarity });
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          if (HUD) HUD.updatePlayerInfo(localPlayer);
        }

        // Track activity
        addRecentActivity('Discovered a ' + result.discovery.type);

        if (Audio) Audio.playSound('warp');
      }
    }
  }

  /**
   * Handle score message for competitions
   */
  function handleScoreMessage(msg) {
    if (!Competition || !gameState) return;

    var result = Competition.handleScore(msg, gameState);
    if (result.success) {
      gameState = result.state;

      // Broadcast to spectators if any
      if (Competition.getSpectators) {
        var spectators = Competition.getSpectators(result.competition.id);
        if (spectators.length > 0 && Competition.broadcastToSpectators) {
          Competition.broadcastToSpectators(
            result.competition.id,
            'score_update',
            {
              playerId: msg.from,
              score: msg.payload.score,
              competition: result.competition
            }
          );
        }
      }

      // If competition ended, award spark to winner
      if (result.winner && result.sparkAward) {
        if (result.winner === localPlayer.id) {
          if (HUD) {
            HUD.showNotification('You won the competition! +' + result.sparkAward + ' Spark', 'success');
          }
          if (economyLedger && Economy) {
            Economy.earnSpark(economyLedger, localPlayer.id, 'competition', { complexity: 1.0 });
            localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
            if (HUD) HUD.updatePlayerInfo(localPlayer);
          }
        }
      }
    }
  }

  /**
   * Convert rarity number to name
   */
  function getRarityName(rarity) {
    if (rarity >= 0.9) return 'legendary';
    if (rarity >= 0.7) return 'epic';
    if (rarity >= 0.5) return 'rare';
    if (rarity >= 0.3) return 'uncommon';
    return 'common';
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
      currentZone = msg.payload.zone;

      // Get zone center position from World
      var zonePos = World.getZoneCenter ? World.getZoneCenter(currentZone) : {x: 0, z: 0};
      localPlayer.position.x = zonePos.x;
      localPlayer.position.z = zonePos.z;
      localPlayer.position.y = 0;

      // Update chunks for new position
      if (World.updateChunks) {
        World.updateChunks(sceneContext, localPlayer.position.x, localPlayer.position.z);
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

    if (msg.from === localPlayer.id) {
      var structureName = msg.payload.structure.type || 'structure';
      addRecentActivity('Built a ' + structureName);
    }
  }

  /**
   * Handle trade message (legacy)
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
   * Handle trade protocol messages
   */
  function handleTradeProtocolMessage(msg) {
    if (!Trading || !HUD) return;

    var result = Trading.handleTradeMessage(msg);
    if (!result) return;

    switch (result.type) {
      case 'trade_request':
        // Only show to target player
        if (result.data.to === localPlayer.id) {
          HUD.showTradeRequest(
            result.data.from,
            result.data.tradeId,
            function(tradeId) {
              // Accept trade
              var acceptResult = Trading.acceptTrade(tradeId, localPlayer.id, localPlayer.position);
              if (acceptResult.success) {
                showTradeWindowForActive(acceptResult.trade);
              } else {
                HUD.showNotification(acceptResult.message, 'error');
              }
            },
            function(tradeId) {
              // Decline trade
              Trading.declineTrade(tradeId, localPlayer.id, localPlayer.position);
            }
          );
        }
        break;

      case 'trade_accepted':
        // Trade was accepted, show window
        var activeTrade = Trading.getActiveTrade(localPlayer.id);
        if (activeTrade) {
          showTradeWindowForActive(activeTrade);
          HUD.showNotification('Trade started!', 'success');
        }
        break;

      case 'trade_update':
        // Update trade window if open
        var currentTrade = Trading.getActiveTrade(localPlayer.id);
        if (currentTrade && HUD.updateTradeWindow) {
          HUD.updateTradeWindow(currentTrade, localPlayer.id);
        }
        break;

      case 'trade_confirm':
        // Other player confirmed
        var confirmTrade = Trading.getActiveTrade(localPlayer.id);
        if (confirmTrade && HUD.updateTradeWindow) {
          HUD.updateTradeWindow(confirmTrade, localPlayer.id);
        }
        break;

      case 'trade_complete':
        // Trade completed
        HUD.hideTradeWindow();
        HUD.showTradeComplete(msg.from);
        if (Audio) Audio.playSound('trade');

        if (Mentoring) {
          var xpResult = Mentoring.addSkillXP(localPlayer.id, 'trading', 15);
          if (xpResult.leveledUp && HUD) {
            HUD.showNotification('Trading skill increased to ' + xpResult.newLevelName, 'success');
          }
        }

        // Update inventory display
        if (HUD.updateInventoryDisplay && playerInventory) {
          HUD.updateInventoryDisplay(playerInventory);
          HUD.updateQuickBar(playerInventory);
        }
        // Update player info with new Spark balance
        if (localPlayer && economyLedger) {
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          HUD.updatePlayerInfo(localPlayer);
        }
        break;

      case 'trade_cancelled':
        // Trade cancelled
        HUD.hideTradeWindow();
        HUD.hideTradeRequest();
        HUD.showNotification('Trade cancelled', 'info');
        break;
    }
  }

  /**
   * Show trade window for active trade
   */
  function showTradeWindowForActive(trade) {
    if (!HUD || !Trading) return;

    HUD.showTradeWindow(
      trade,
      localPlayer.id,
      // onAddItem - not implemented yet (would need inventory selector UI)
      null,
      // onRemoveItem
      function(tradeSlot) {
        var result = Trading.removeItemFromTrade(trade.id, localPlayer.id, tradeSlot, localPlayer.position);
        if (!result.success) {
          HUD.showNotification(result.message, 'error');
        }
      },
      // onSetSpark
      function(amount) {
        var result = Trading.setSparkOffer(trade.id, localPlayer.id, amount, economyLedger, localPlayer.position);
        if (!result.success) {
          HUD.showNotification(result.message, 'error');
        }
      },
      // onReady
      function() {
        var result = Trading.setReady(trade.id, localPlayer.id, localPlayer.position);
        if (!result.success) {
          HUD.showNotification(result.message, 'error');
        }
      },
      // onConfirm
      function() {
        // Get both player inventories (in real multiplayer, you'd only have your own)
        // For demo purposes, we're using local inventories
        var player1Inv = trade.player1.id === localPlayer.id ? playerInventory : playerInventory;
        var player2Inv = trade.player2.id === localPlayer.id ? playerInventory : playerInventory;

        var result = Trading.confirmTrade(trade.id, localPlayer.id, player1Inv, player2Inv, economyLedger, localPlayer.position);
        if (result.success && result.executed) {
          HUD.hideTradeWindow();
          HUD.showTradeComplete(trade.player1.id === localPlayer.id ? trade.player2.id : trade.player1.id);
          if (Audio) Audio.playSound('trade');
          // Update displays
          if (HUD.updateInventoryDisplay && playerInventory) {
            HUD.updateInventoryDisplay(playerInventory);
            HUD.updateQuickBar(playerInventory);
          }
          if (localPlayer && economyLedger) {
            localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
            HUD.updatePlayerInfo(localPlayer);
          }
        } else if (!result.success) {
          HUD.showNotification(result.message, 'error');
        }
      },
      // onCancel
      function() {
        Trading.cancelTrade(trade.id, localPlayer.id, localPlayer.position);
        HUD.hideTradeWindow();
      }
    );
  }

  // NPC shop inventories by archetype
  var NPC_SHOP_ITEMS = {
    merchant: [
      { id: 'torch', name: 'Torch', price: 8, description: 'Lights the way', icon: '&#128294;' },
      { id: 'rope', name: 'Rope', price: 12, description: 'Useful for climbing and building', icon: '&#129526;' },
      { id: 'compass', name: 'Compass', price: 20, description: 'Helps with navigation', icon: '&#129517;' },
      { id: 'map_fragment', name: 'Map Fragment', price: 15, description: 'Reveals hidden areas', icon: '&#128506;' },
      { id: 'potion_energy', name: 'Energy Potion', price: 25, description: 'Restores energy', icon: '&#129514;' }
    ],
    trader: [
      { id: 'rare_seed', name: 'Rare Seed', price: 30, description: 'Grows into a rare plant', icon: '&#127793;' },
      { id: 'crystal_shard', name: 'Crystal Shard', price: 40, description: 'A glowing fragment', icon: '&#128142;' },
      { id: 'ancient_coin', name: 'Ancient Coin', price: 50, description: 'A relic from the founding', icon: '&#129689;' }
    ],
    farmer: [
      { id: 'wheat_seed', name: 'Wheat Seeds', price: 5, description: 'Basic crop seeds', icon: '&#127806;' },
      { id: 'flower_seed', name: 'Flower Seeds', price: 8, description: 'Decorative flowers', icon: '&#127804;' },
      { id: 'herb_seed', name: 'Herb Seeds', price: 10, description: 'Medicinal herbs', icon: '&#127807;' },
      { id: 'fertilizer', name: 'Fertilizer', price: 15, description: 'Speeds up growth', icon: '&#128169;' }
    ],
    artisan: [
      { id: 'paint_set', name: 'Paint Set', price: 20, description: 'For creating art', icon: '&#127912;' },
      { id: 'chisel', name: 'Chisel', price: 15, description: 'For sculpting stone', icon: '&#128296;' },
      { id: 'loom_thread', name: 'Loom Thread', price: 12, description: 'For weaving', icon: '&#129525;' },
      { id: 'golden_frame', name: 'Golden Frame', price: 35, description: 'Display art beautifully', icon: '&#128444;' }
    ]
  };

  /**
   * Handle NPC dialog action button clicks
   */
  function handleNPCAction(action, npcData) {
    if (!npcData || !localPlayer) return;

    switch (action) {
      case 'trade':
        var shopItems = NPC_SHOP_ITEMS[npcData.archetype] || NPC_SHOP_ITEMS.merchant;
        if (HUD && HUD.showNPCShop) {
          HUD.showNPCShop(npcData, shopItems, localPlayer.spark, function onBuyItem(itemId) {
            var item = shopItems.find(function(i) { return i.id === itemId; });
            if (!item) return;
            if (localPlayer.spark < item.price) {
              if (HUD) HUD.showNotification('Not enough Spark!', 'error');
              return;
            }
            if (economyLedger && Economy) {
              var result = Economy.spendSpark(economyLedger, localPlayer.id, item.price);
              if (!result.success) {
                if (HUD) HUD.showNotification('Transaction failed', 'error');
                return;
              }
              localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
            } else {
              localPlayer.spark -= item.price;
            }
            if (Inventory && playerInventory) {
              Inventory.addItem(playerInventory, item.id, 1);
              if (HUD) {
                HUD.showItemPickup(item.name, 1, item.icon);
                HUD.updateInventoryDisplay(playerInventory);
              }
            }
            if (HUD) {
              HUD.updatePlayerInfo(localPlayer);
              HUD.showNotification('Bought ' + item.name + ' for ' + item.price + ' Spark', 'success');
            }
            if (Audio) Audio.playSound('trade');
            // Refresh shop with updated balance
            HUD.showNPCShop(npcData, shopItems, localPlayer.spark, onBuyItem);
            addRecentActivity('Bought ' + item.name + ' from ' + npcData.name);
          });
        }
        break;

      case 'learn':
        if (HUD) {
          var teachingMsg = '';
          if (typeof NPC_AI !== 'undefined' && NPC_AI.getTeaching) {
            var teaching = NPC_AI.getTeaching(npcData.archetype, {});
            if (teaching) {
              teachingMsg = npcData.name + ' teaches you about ' + teaching.topic + ': "' + teaching.description + '"';
              if (Economy && economyLedger) {
                Economy.earnSpark(economyLedger, localPlayer.id, 'teach', { complexity: 0.5 });
                localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
                HUD.updatePlayerInfo(localPlayer);
              }
            } else {
              teachingMsg = npcData.name + ' has nothing more to teach you right now.';
            }
          } else {
            teachingMsg = npcData.name + ' shares some wisdom with you.';
            if (Economy && economyLedger) {
              Economy.earnSpark(economyLedger, localPlayer.id, 'teach', { complexity: 0.3 });
              localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
              HUD.updatePlayerInfo(localPlayer);
            }
          }
          HUD.showNotification(teachingMsg, 'info');
          addRecentActivity('Learned from ' + npcData.name);
        }
        break;

      case 'lore':
        if (HUD) {
          var loreMsg = '';
          if (typeof NPC_AI !== 'undefined' && NPC_AI.getLore) {
            var lore = NPC_AI.getLore(npcData.archetype, {});
            if (lore) {
              loreMsg = npcData.name + ' tells you: "' + lore + '"';
            } else {
              loreMsg = npcData.name + ' has shared all their stories with you.';
            }
          } else {
            loreMsg = npcData.name + ' tells you a tale of the founding of ZION.';
          }
          HUD.showNotification(loreMsg, 'info');
          addRecentActivity('Heard lore from ' + npcData.name);
        }
        break;
    }
  }

  /**
   * Handle resource node harvesting
   */
  function handleResourceHarvest(node) {
    if (!World || !Inventory || !playerInventory) return;

    var itemId = World.harvestResource(node);
    if (!itemId) {
      if (HUD) HUD.showNotification('Resource already depleted', 'warning');
      return;
    }

    var itemData = Inventory.getItemData(itemId);
    if (!itemData) return;

    var result = Inventory.addItem(playerInventory, itemId, 1);
    if (result.success) {
      if (HUD) {
        HUD.showItemPickup(itemData.name, 1, itemData.icon);
        HUD.updateInventoryDisplay(playerInventory);
        HUD.updateQuickBar(playerInventory);
      }

      if (economyLedger && Economy) {
        // Apply Warmth bonus to harvest yields (minor, cosmetic-adjacent per §5.3)
        var harvestComplexity = 0.5;
        if (Physical && localPlayer.warmth > 0) {
          var warmthBonus = Physical.getWarmthBonus(localPlayer.warmth);
          harvestComplexity = Math.min(1.0, harvestComplexity * warmthBonus);
        }
        var sparkEarned = Economy.earnSpark(economyLedger, localPlayer.id, 'harvest', { complexity: harvestComplexity });
        if (localPlayer) {
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          if (HUD) HUD.updatePlayerInfo(localPlayer);
        }
      }

      if (Mentoring) {
        var xpResult = Mentoring.addSkillXP(localPlayer.id, 'gardening', 5);
        if (xpResult.leveledUp && HUD) {
          HUD.showNotification('Gardening skill increased to ' + xpResult.newLevelName, 'success');
        }
      }

      if (Quests) {
        var updated = Quests.updateQuestProgress(localPlayer.id, 'collect', { item: itemId, amount: 1 });
        if (updated.length > 0 && HUD) {
          updated.forEach(function(quest) {
            HUD.showQuestProgress('Quest progress: ' + quest.title);
          });
        }
      }

      if (Audio) Audio.playSound('harvest');

      // Track activity
      addRecentActivity('Collected ' + itemData.name);
    } else {
      if (HUD) HUD.showNotification(result.message, 'warning');
    }
  }

  /**
   * Handle crafting
   */
  function handleCraft(recipeId) {
    if (!Inventory || !playerInventory) return;

    var result = Inventory.craftItem(playerInventory, recipeId);
    if (result.success) {
      if (HUD) {
        HUD.showNotification(result.message, 'success');
        HUD.updateInventoryDisplay(playerInventory);
        HUD.updateCraftingDisplay(playerInventory);
        HUD.updateQuickBar(playerInventory);
      }

      if (economyLedger && Economy && result.sparkEarned) {
        Economy.earnSpark(economyLedger, localPlayer.id, 'craft', { complexity: result.sparkEarned / 50 });
        if (localPlayer) {
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          if (HUD) HUD.updatePlayerInfo(localPlayer);
        }
      }

      if (Mentoring) {
        var xpResult = Mentoring.addSkillXP(localPlayer.id, 'crafting', 10);
        if (xpResult.leveledUp && HUD) {
          HUD.showNotification('Crafting skill increased to ' + xpResult.newLevelName, 'success');
        }
      }

      if (Quests) {
        Quests.updateQuestProgress(localPlayer.id, 'craft', { item: result.output.itemId, amount: result.output.count });
      }

      if (Audio) Audio.playSound('build');
    } else {
      if (HUD) HUD.showNotification(result.message, 'error');
    }
  }

  /**
   * Handle compose (artwork creation)
   */
  function handleGuildCreate(guildData) {
    if (!Guilds || !localPlayer || !Economy || !economyLedger) return;

    // Check if player has enough Spark
    var balance = Economy.getBalance(economyLedger, localPlayer.id);
    if (balance < 100) {
      if (HUD) {
        HUD.showNotification('Not enough Spark to create guild (need 100)', 'error');
      }
      return;
    }

    var result = Guilds.createGuild(
      localPlayer.id,
      guildData.name,
      guildData.tag,
      guildData.type,
      guildData.description
    );

    if (result.success) {
      // Deduct cost
      Economy.debit(economyLedger, localPlayer.id, result.cost, 'Guild creation');

      if (HUD) {
        HUD.showNotification('Guild created: [' + guildData.tag + '] ' + guildData.name, 'success');
        HUD.updateGuildTag(guildData.tag);

        // Update player info to show new balance
        localPlayer.spark = balance - result.cost;
        HUD.updatePlayerInfo(localPlayer);

        // Show guild panel
        HUD.showGuildPanel(result.guild, { id: localPlayer.id });
      }

      addRecentActivity('Founded [' + guildData.tag + '] ' + guildData.name);
    } else {
      if (HUD) {
        HUD.showNotification('Failed to create guild: ' + result.error, 'error');
      }
    }
  }

  // Global guild action handler for panel buttons
  if (typeof window !== 'undefined') {
    window.handleGuildAction = function(action, data) {
      if (!Guilds || !localPlayer) return;

      switch (action) {
        case 'leave':
          var result = Guilds.leaveGuild(data, localPlayer.id);
          if (result.success) {
            if (HUD) {
              HUD.showNotification('You left the guild', 'info');
              HUD.updateGuildTag('');
            }
            addRecentActivity('Left guild');
          } else {
            if (HUD) {
              HUD.showNotification('Failed to leave guild: ' + result.error, 'error');
            }
          }
          break;
      }
    };
  }

  function handleComposeAction(composeData) {
    if (!Creation || !localPlayer) return;

    var msg = {
      type: 'compose',
      from: localPlayer.id,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substr(2, 9),
      payload: {
        composeType: composeData.type,
        title: composeData.title,
        content: composeData.content,
        zone: currentZone,
        position: localPlayer.position
      }
    };

    var result = Creation.handleCompose(msg, gameState);
    if (result.success) {
      if (HUD) {
        HUD.showNotification('Created ' + composeData.type + ': ' + composeData.title, 'success');
      }

      if (economyLedger && Economy && result.sparkReward) {
        Economy.earnSpark(economyLedger, localPlayer.id, 'compose', { complexity: result.sparkReward / 50 });
        if (localPlayer) {
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          if (HUD) HUD.updatePlayerInfo(localPlayer);
        }
      }

      if (Mentoring) {
        var xpResult = Mentoring.addSkillXP(localPlayer.id, 'social', 15);
        if (xpResult.leveledUp && HUD) {
          HUD.showNotification('Social skill increased to ' + xpResult.newLevelName, 'success');
        }
      }

      if (Audio) Audio.playSound('chat');

      addRecentActivity('Created ' + composeData.type + ': ' + composeData.title);
    } else {
      if (HUD) HUD.showNotification(result.error, 'error');
    }
  }

  /**
   * Handle build mode actions
   */
  var buildModeActive = false;
  var BUILD_TYPES = [
    'bench', 'lantern', 'signpost', 'fence', 'planter',
    'campfire', 'archway', 'table', 'barrel', 'crate'
  ];
  var BUILD_COSTS = {
    bench: 15, lantern: 10, signpost: 5, fence: 8, planter: 12,
    campfire: 20, archway: 30, table: 15, barrel: 10, crate: 8
  };

  function handleBuildAction(data) {
    if (data.mode !== undefined) {
      // Toggle build mode
      buildModeActive = data.mode;

      if (buildModeActive) {
        if (World && World.enterBuildMode && sceneContext) {
          World.enterBuildMode(sceneContext);
        }
        if (HUD && HUD.showBuildToolbar) {
          HUD.showBuildToolbar();
        }
        if (HUD && HUD.showNotification) {
          HUD.showNotification('Build mode activated - Click to place structures', 'info');
        }
      } else {
        if (World && World.exitBuildMode && sceneContext) {
          World.exitBuildMode(sceneContext);
        }
        if (HUD && HUD.hideBuildToolbar) {
          HUD.hideBuildToolbar();
        }
        if (HUD && HUD.showNotification) {
          HUD.showNotification('Build mode deactivated', 'info');
        }
      }
    } else if (data.action === 'place') {
      // Place structure
      if (World && World.confirmPlacement && sceneContext && localPlayer) {
        var result = World.confirmPlacement(sceneContext, localPlayer.position, currentZone);
        if (result && result.error) {
          if (HUD && HUD.showNotification) {
            HUD.showNotification(result.error, 'error');
          }
        } else if (result) {
          // Deduct Spark cost for building
          var buildCost = BUILD_COSTS[result.type] || 10;
          if (economyLedger && Economy) {
            var spendResult = Economy.spendSpark(economyLedger, localPlayer.id, buildCost);
            if (!spendResult.success) {
              if (HUD && HUD.showNotification) {
                HUD.showNotification('Not enough Spark! Need ' + buildCost + ' Spark to build ' + result.type, 'error');
              }
              // Remove the placed structure since we can't afford it
              if (World && World.removeLastPlaced) {
                World.removeLastPlaced(sceneContext);
              }
              return;
            }
            localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
            if (HUD) HUD.updatePlayerInfo(localPlayer);
          }

          if (HUD && HUD.showNotification) {
            HUD.showNotification('Built ' + result.type + ' (-' + buildCost + ' Spark)', 'success');
          }

          // Award building XP
          if (Economy) {
            Economy.earnSpark(economyLedger, localPlayer.id, 'build', { complexity: 0.3 });
            localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          }

          if (Mentoring) {
            var xpResult = Mentoring.addSkillXP(localPlayer.id, 'building', 12);
            if (xpResult.leveledUp && HUD) {
              HUD.showNotification('Building skill increased to ' + xpResult.newLevelName, 'success');
            }
          }

          // Broadcast to network
          if (Network && Protocol) {
            var buildMsg = Protocol.create.build(localPlayer.id, {
              structureType: result.type,
              position: result.position,
              rotation: result.rotation || 0,
              zone: currentZone
            });
            Network.broadcastMessage(buildMsg);
          }

          // Save structure to state
          if (gameState) {
            if (!gameState.structures) gameState.structures = [];
            gameState.structures.push({
              id: 'struct_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              type: result.type,
              position: result.position,
              rotation: result.rotation || 0,
              zone: currentZone,
              builder: localPlayer.id,
              ts: Date.now()
            });
          }
        }
      }
    } else if (data.action === 'rotate') {
      // Rotate build preview
      if (World && World.rotateBuildPreview) {
        World.rotateBuildPreview(Math.PI / 4); // 45 degrees
      }
    } else if (data.action === 'selectType') {
      // Select build type by number key
      var typeIndex = data.typeIndex;
      if (typeIndex >= 0 && typeIndex < BUILD_TYPES.length) {
        var buildType = BUILD_TYPES[typeIndex];
        if (World && World.setBuildType) {
          World.setBuildType(buildType);
        }
        if (HUD && HUD.updateBuildToolbar) {
          HUD.updateBuildToolbar(buildType);
        }
      }
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
        // Check for emote chat commands
        var message = payload.message;
        var emoteMatch = message.match(/^\/(wave|dance|bow|cheer|meditate|point)$/);
        if (emoteMatch) {
          // Trigger emote instead of chat
          handleLocalAction('emote', { type: emoteMatch[1] });
          return;
        }

        msg = Protocol.create.chat(localPlayer.id, message);

        if (Mentoring) {
          var xpResult = Mentoring.addSkillXP(localPlayer.id, 'social', 3);
          if (xpResult.leveledUp && HUD) {
            HUD.showNotification('Social skill increased to ' + xpResult.newLevelName, 'success');
          }
        }

        // Broadcast player chat to NPCs for reaction
        if (NPCs && NPCs.broadcastEvent) {
          NPCs.broadcastEvent({ type: 'player_action', data: {
            playerId: localPlayer.id, action: 'chat',
            position: localPlayer.position, message: message
          }});
        }
        break;

      case 'emote':
        // Handle emote action
        if (World && sceneContext && localPlayer) {
          var playerMesh = World.getPlayerMesh ? World.getPlayerMesh(sceneContext, localPlayer.id) : null;
          if (playerMesh && NPCs && NPCs.playEmoteAnimation) {
            NPCs.playEmoteAnimation(playerMesh, payload.type);
          }
          if (HUD && HUD.showEmoteBubble) {
            HUD.showEmoteBubble(localPlayer.id, payload.type);
          }
          if (Audio) {
            Audio.playSound('chat');
          }
        }
        // Create and broadcast emote message
        msg = {
          type: 'emote',
          from: localPlayer.id,
          timestamp: Date.now(),
          nonce: Math.random().toString(36).substr(2, 9),
          payload: { emoteType: payload.type }
        };
        break;

      case 'toggleEmoteMenu':
        if (HUD) {
          var emoteMenuEl = document.getElementById('emote-menu');
          if (emoteMenuEl) {
            HUD.hideEmoteMenu();
          } else {
            HUD.showEmoteMenu();
          }
        }
        break;

      case 'toggleMap':
        if (HUD && localPlayer) {
          var mapEl = document.getElementById('world-map-overlay');
          if (mapEl) {
            HUD.hideWorldMap();
          } else {
            var npcPositions = NPCs && NPCs.getNPCPositions ? NPCs.getNPCPositions() : [];
            var landmarks = [];
            HUD.showWorldMap(localPlayer.position, npcPositions, landmarks);
          }
        }
        break;

      case 'toggleSettings':
        if (HUD) {
          var settingsEl = document.getElementById('settings-menu-overlay');
          if (settingsEl) {
            HUD.hideSettingsMenu();
          } else {
            HUD.showSettingsMenu();
          }
        }
        break;

      case 'toggleProfile':
        if (HUD && localPlayer) {
          var profileEl = document.getElementById('player-profile-panel');
          if (profileEl) {
            HUD.hidePlayerProfile();
          } else {
            // Gather player stats
            var playerData = {
              name: localPlayer.name || 'Player',
              zone: currentZone,
              sparkBalance: economyLedger ? Economy.getBalance(economyLedger, localPlayer.id) : 0,
              playTimeSeconds: getPlayTimeSeconds(),
              itemsCollected: playerInventory ? playerInventory.items.length : 0,
              questsCompleted: Quests ? Quests.getCompletedQuests(localPlayer.id).length : 0,
              questsActive: Quests ? Quests.getActiveQuests(localPlayer.id).length : 0,
              npcsMet: NPCs && NPCs.getMetNPCs ? NPCs.getMetNPCs(localPlayer.id).length : 0,
              zonesDiscovered: Exploration ? Exploration.getDiscoveredZones(localPlayer.id, gameState).length : 1,
              structuresBuilt: Creation ? Creation.getPlayerStructures(localPlayer.id).length : 0,
              recentActivities: getRecentActivities()
            };
            HUD.showPlayerProfile(playerData);
          }
        }
        break;

      case 'toggleGuild':
        if (HUD && Guilds && localPlayer) {
          var guildPanelEl = document.getElementById('guild-panel');
          if (guildPanelEl) {
            HUD.hideGuildPanel();
          } else {
            var playerGuild = Guilds.getPlayerGuild(localPlayer.id);
            if (playerGuild) {
              HUD.showGuildPanel(playerGuild, { id: localPlayer.id });
              // Update guild tag in HUD
              HUD.updateGuildTag(playerGuild.tag);
            } else {
              // Show guild creation form if not in a guild
              HUD.showGuildCreate(function(guildData) {
                handleGuildCreate(guildData);
              });
            }
          }
        }
        break;

      case 'toggleSkills':
        if (HUD && Mentoring && localPlayer) {
          var skillsPanelEl = document.getElementById('skills-panel');
          if (skillsPanelEl) {
            HUD.hideSkillsPanel();
          } else {
            var skillsData = Mentoring.getPlayerSkills(localPlayer.id);
            HUD.showSkillsPanel(skillsData);
          }
        }
        break;

      case 'toggleCompose':
        if (HUD && Creation && localPlayer) {
          var composePanelEl = document.getElementById('compose-panel');
          if (composePanelEl) {
            HUD.hideComposePanel();
          } else {
            HUD.showComposePanel(function(composeData) {
              handleComposeAction(composeData);
            });
          }
        }
        break;

      case 'interact':
        // Check for nearby NPCs first
        if (NPCs && NPCs.interactWithNPC && localPlayer) {
          var npcResponse = NPCs.interactWithNPC(localPlayer.position.x, localPlayer.position.z, localPlayer.id);
          if (npcResponse) {
            // Show rich NPC interaction dialog
            if (HUD && HUD.showNPCDialog) {
              HUD.showNPCDialog(npcResponse);
            } else if (HUD) {
              HUD.showNotification(npcResponse.name + ': "' + npcResponse.message + '"', 'info');
            }

            // Handle quest interactions
            if (Quests && npcResponse.questInfo) {
              var questInfo = npcResponse.questInfo;

              if (questInfo.state === 'available') {
                // Show quest offer dialog
                if (HUD && HUD.showQuestOffer) {
                  HUD.showQuestOffer(questInfo.quest, { name: npcResponse.name, archetype: npcResponse.archetype }, localPlayer.id);
                }
              } else if (questInfo.state === 'complete') {
                // Turn in quest
                var result = Quests.completeQuest(localPlayer.id, questInfo.quest.id, gameState);
                if (result.success && HUD) {
                  HUD.showQuestComplete(result.quest, result.rewards);
                  // Update player spark display
                  localPlayer.spark += result.rewards.spark;
                  HUD.updatePlayerInfo(localPlayer);
                  // Track activity
                  addRecentActivity('Completed quest: ' + result.quest.title);
                }
              }

              // Update quest progress for NPC interaction
              Quests.updateQuestProgress(localPlayer.id, 'talk_npc', { npcId: npcResponse.id });
            }

            if (Audio) Audio.playSound('chat');
            // Track activity
            addRecentActivity('Talked to ' + npcResponse.name);
            // Broadcast player interaction to other NPCs
            if (NPCs.broadcastEvent) {
              NPCs.broadcastEvent({ type: 'player_action', data: {
                playerId: localPlayer.id, action: 'interact_npc',
                position: localPlayer.position, targetNPC: npcResponse.id
              }});
            }
            break;
          }
        }
        // No NPC nearby — try harvesting
        msg = Protocol.create.harvest(localPlayer.id, 10);
        // Update quest progress for harvest
        if (Quests) {
          var updated = Quests.updateQuestProgress(localPlayer.id, 'collect', { item: 'resource', amount: 1 });
          if (updated.length > 0 && HUD) {
            updated.forEach(function(quest) {
              HUD.showQuestProgress('Quest progress: ' + quest.title);
            });
          }
        }
        // Broadcast harvest action to NPCs
        if (NPCs && NPCs.broadcastEvent) {
          NPCs.broadcastEvent({ type: 'player_action', data: {
            playerId: localPlayer.id, action: 'harvest',
            position: localPlayer.position
          }});
        }
        break;

      case 'toggle_quest_log':
        // Toggle quest log panel
        if (HUD && Quests && localPlayer) {
          var questLogEl = document.getElementById('quest-log-panel');
          if (questLogEl) {
            HUD.hideQuestLog();
          } else {
            var questLog = Quests.getQuestLog(localPlayer.id, { level: 0 });
            HUD.showQuestLog(questLog, localPlayer.id);
          }
        }
        break;

      case 'toggleInventory':
        if (HUD && playerInventory) {
          HUD.toggleInventoryPanel();
          HUD.updateInventoryDisplay(playerInventory);
        }
        break;

      case 'toggleCrafting':
        if (HUD && playerInventory) {
          HUD.toggleCraftingPanel();
          HUD.updateCraftingDisplay(playerInventory);
        }
        break;

      case 'toggleDiscoveryLog':
        if (HUD && Exploration && localPlayer) {
          var discoveryLogEl = document.getElementById('discovery-log-overlay');
          if (discoveryLogEl) {
            HUD.hideDiscoveryLog();
          } else {
            var discoveries = Exploration.getDiscoveries ? Exploration.getDiscoveries(localPlayer.id, gameState) : [];
            HUD.showDiscoveryLog(discoveries);
          }
        }
        break;

      case 'toggleLoreBook':
        if (HUD && localPlayer) {
          var loreBookEl = document.getElementById('lore-book-overlay');
          if (loreBookEl) {
            HUD.hideLoreBook();
          } else {
            var loreEntries = [];
            HUD.showLoreBook(loreEntries);
          }
        }
        break;

      case 'useQuickSlot':
        console.log('Use quick slot:', payload.slot);
        break;

      case 'click':
        // Raycasting for resource node harvesting
        if (raycaster && sceneContext && sceneContext.camera && World) {
          var node = World.getResourceNodeAtMouse(raycaster, sceneContext.camera, payload.x, payload.y);
          if (node) {
            handleResourceHarvest(node);
          }
        }
        break;

      case 'initiate_trade':
        // Initiate trade with nearest player
        if (Trading && gameState && State && HUD) {
          var players = State.getPlayers(gameState);
          var nearbyPlayers = players
            .filter(function(p) {
              return p.id !== localPlayer.id && p.zone === currentZone;
            })
            .map(function(p) {
              var dx = p.position.x - localPlayer.position.x;
              var dz = p.position.z - localPlayer.position.z;
              var distance = Math.sqrt(dx * dx + dz * dz);
              return { player: p, distance: distance };
            })
            .sort(function(a, b) { return a.distance - b.distance; });

          if (nearbyPlayers.length > 0 && nearbyPlayers[0].distance < 10) {
            var targetPlayer = nearbyPlayers[0].player;
            var result = Trading.requestTrade(localPlayer.id, targetPlayer.id, localPlayer.position);
            if (result.success) {
              HUD.showNotification('Trade request sent to ' + targetPlayer.name, 'info');
            } else {
              HUD.showNotification(result.message, 'warning');
            }
          } else {
            HUD.showNotification('No players nearby to trade with', 'warning');
          }
        }
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

  /**
   * Get play time in seconds
   */
  function getPlayTimeSeconds() {
    // Load from localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        var stored = localStorage.getItem('zion_playTime');
        if (stored) {
          playTimeSeconds = parseInt(stored) || 0;
        }
      } catch (err) {
        console.warn('Failed to load play time:', err);
      }
    }
    return playTimeSeconds;
  }

  /**
   * Save play time to localStorage
   */
  function savePlayTime() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('zion_playTime', playTimeSeconds.toString());
      } catch (err) {
        console.warn('Failed to save play time:', err);
      }
    }
  }

  /**
   * Add recent activity
   */
  function addRecentActivity(activity) {
    recentActivities.unshift(activity);
    if (recentActivities.length > 10) {
      recentActivities = recentActivities.slice(0, 10);
    }
    // Save to localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('zion_recentActivities', JSON.stringify(recentActivities));
      } catch (err) {
        console.warn('Failed to save activities:', err);
      }
    }
  }

  /**
   * Get recent activities
   */
  function getRecentActivities() {
    // Load from localStorage
    if (typeof localStorage !== 'undefined' && recentActivities.length === 0) {
      try {
        var stored = localStorage.getItem('zion_recentActivities');
        if (stored) {
          recentActivities = JSON.parse(stored) || [];
        }
      } catch (err) {
        console.warn('Failed to load activities:', err);
      }
    }
    return recentActivities.length > 0 ? recentActivities : ['Started playing ZION'];
  }

  // Export public API
  exports.init = init;
  exports.joinWorld = joinWorld;
  exports.leaveWorld = leaveWorld;
  exports.handleLocalAction = handleLocalAction;

})(typeof module !== 'undefined' ? module.exports : (window.Main = {}));
