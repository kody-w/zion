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
  const Seasons = typeof require !== 'undefined' ? require('./seasons') : window.Seasons;
  const Pets = typeof require !== 'undefined' ? require('./pets') : window.Pets;

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

  // Auto-save tracking
  let lastAutoSave = 0;
  let AUTO_SAVE_INTERVAL = 60000; // 60 seconds

  // Secret discovery tracking
  let lastSecretCheck = 0;
  let SECRET_CHECK_INTERVAL = 2000; // Check every 2 seconds

  // Economic event tracking
  let currentEconomicEvent = null;
  let lastEventCheck = 0;

  // Seasonal event tracking
  let currentSeason = null;
  let lastSeasonCheck = 0;
  let SEASON_CHECK_INTERVAL = 60000; // Check season every 60s

  // Pet tracking
  let lastPetUpdate = 0;
  let PET_UPDATE_INTERVAL = 30000; // Update pet every 30s

  // Fishing state
  let isFishing = false;

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

      // Initialize federation
      const worldId = Network.deriveWorldId();
      const worldName = 'ZION'; // Could be customized per fork
      const endpoint = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      Network.initFederation(worldId, worldName, endpoint);

      // Register federation event handler
      Network.onFederationEvent((event) => {
        handleFederationEvent(event);
      });

      // Announce to federation network periodically
      setInterval(() => {
        if (Network.announceFederation) {
          Network.announceFederation();
        }
      }, 60000); // Every 60 seconds

      // Initial announce
      setTimeout(() => {
        if (Network.announceFederation) {
          Network.announceFederation();
        }
      }, 5000); // After 5 seconds to let connections establish
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

        // Spawn interactive objects for current zone (benches, campfires, etc.)
        if (World.spawnZoneInteractives) {
          World.spawnZoneInteractives(sceneContext, currentZone);
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

      // Initialize reputation system
      if (Social && Social.initReputation) {
        Social.initReputation(localPlayer.id);
        if (HUD.updateReputationDisplay) {
          HUD.updateReputationDisplay(Social.getReputation(localPlayer.id));
        }
      }

      // Initialize governance panel callback
      if (HUD.initGovernancePanel) {
        HUD.initGovernancePanel(handleGovernanceAction);
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
      if (Quests.initPlayerAchievements) {
        Quests.initPlayerAchievements(username);
      }
      console.log('Quest system initialized for player:', username);
    }

    // Restore saved player data (position, inventory, spark, etc.)
    var wasRestored = restorePlayerData();
    if (wasRestored) {
      console.log('Restored saved player data');
      var timeSince = Auth.getTimeSinceLastSave ? Auth.getTimeSinceLastSave() : Infinity;
      if (timeSince < 86400000 && HUD) { // Less than 24 hours
        var minsAgo = Math.floor(timeSince / 60000);
        var timeStr = minsAgo < 60 ? minsAgo + ' minutes' : Math.floor(minsAgo / 60) + ' hours';
        setTimeout(function() {
          HUD.showNotification('Welcome back! Last seen ' + timeStr + ' ago', 'info');
        }, 2000);
      }
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

    // Initialize economic event display
    updateEconomicEvent();

    // Initialize seasonal event display
    initSeasonalEvent();

    // Initialize pet system - restore saved pet
    initPetSystem(username);

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

            // Reload interactive objects for new zone
            if (World && World.clearInteractiveObjects && World.spawnZoneInteractives) {
              World.clearInteractiveObjects(sceneContext);
              World.spawnZoneInteractives(sceneContext, currentZone);
            }

            // Record zone visit for governance
            if (Zones && Zones.recordZoneVisit) {
              Zones.recordZoneVisit(currentZone, localPlayer.id);
            }

            // Show welcome message if zone has one
            if (Zones && HUD) {
              var policies = Zones.getZonePolicies(currentZone);
              if (policies && policies.welcomeMessage) {
                HUD.showNotification(policies.welcomeMessage, 'info');
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

            // Track zone visit achievement
            trackAchievement('zone_visit', { zone: currentZone });
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

      // Weather cycling — changes every 4 in-game hours (every 4 real minutes)
      var weatherCycleMinute = Math.floor(worldTime / 240); // 0-5
      var weatherTypes = ['clear', 'cloudy', 'rain', 'clear', 'storm', 'snow'];
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

      // Update interactive objects (highlights, campfire flicker, etc.)
      if (World.updateInteractiveAnimations) {
        World.updateInteractiveAnimations(deltaTime);
      }
      if (World.updateInteractiveHighlights && localPlayer) {
        World.updateInteractiveHighlights(localPlayer.position.x, localPlayer.position.z, 4);
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

    // Auto-save player data periodically
    var nowMs = Date.now();
    if (nowMs - lastAutoSave > AUTO_SAVE_INTERVAL) {
      lastAutoSave = nowMs;
      autoSavePlayerData();
    }

    // Check for nearby secrets periodically
    if (nowMs - lastSecretCheck > SECRET_CHECK_INTERVAL) {
      lastSecretCheck = nowMs;
      checkSecrets();
    }

    // Update economic event display periodically (every 30 seconds)
    if (nowMs - lastEventCheck > 30000) {
      lastEventCheck = nowMs;
      updateEconomicEvent();
    }

    // Update seasonal event periodically
    if (nowMs - lastSeasonCheck > SEASON_CHECK_INTERVAL) {
      lastSeasonCheck = nowMs;
      updateSeasonalEvent();
    }

    // Update pet status periodically
    if (nowMs - lastPetUpdate > PET_UPDATE_INTERVAL) {
      lastPetUpdate = nowMs;
      updatePetStatus();
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
   * Handle federation events from Network module
   */
  function handleFederationEvent(event) {
    if (!event || !event.type) return;

    switch (event.type) {
      case 'world_discovered':
        console.log('Discovered federated world:', event.worldInfo.worldName);
        if (HUD && HUD.showNotification) {
          HUD.showNotification('Discovered world: ' + event.worldInfo.worldName, 'info');
        }
        if (HUD && HUD.updateFederationStatus) {
          HUD.updateFederationStatus(Network.getDiscoveredWorlds(), Network.getFederatedWorlds());
        }
        break;

      case 'federation_established':
        console.log('Federation established with:', event.worldInfo.worldName);
        if (HUD && HUD.showNotification) {
          HUD.showNotification('Portal opened to: ' + event.worldInfo.worldName, 'success');
        }
        if (HUD && HUD.updateFederationStatus) {
          HUD.updateFederationStatus(Network.getDiscoveredWorlds(), Network.getFederatedWorlds());
        }
        // Create portal in 3D world if in Nexus
        if (World && sceneContext && currentZone === 'nexus') {
          createFederationPortal(event.worldInfo);
        }
        break;

      case 'cross_world_warp':
        console.log('Player warping to world:', event.targetWorld);
        break;

      case 'player_returned':
        console.log('Player returned:', event.playerId);
        break;

      default:
        console.log('Unknown federation event:', event.type);
    }
  }

  /**
   * Create a federation portal in the 3D world
   */
  function createFederationPortal(worldInfo) {
    if (!World || !sceneContext || !World.createPortal) return;

    // Position portals around the nexus
    var portalCount = Network.getFederatedWorlds().length;
    var angle = (portalCount * Math.PI * 2) / 8; // Spread around circle
    var radius = 30;
    var x = Math.cos(angle) * radius;
    var z = Math.sin(angle) * radius;

    var portalData = {
      id: 'portal-fed-' + worldInfo.worldId,
      position: { x: x, y: 0, z: z },
      targetWorld: worldInfo.worldId,
      worldName: worldInfo.worldName,
      type: 'federation'
    };

    World.createPortal(sceneContext, portalData);
    console.log('Created federation portal to:', worldInfo.worldName);
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
      case 'federation_announce':
        handleFederationAnnounce(msg);
        break;
      case 'federation_handshake':
        handleFederationHandshake(msg);
        break;
      case 'warp_fork':
        handleWarpFork(msg);
        break;
      case 'return_home':
        handleReturnHome(msg);
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

        // Track discovery achievement
        trackAchievement('discover', { type: result.discovery.type, rarity: result.discovery.rarity });

        if (Audio) Audio.playSound('warp');
      }
    }
  }

  /**
   * Handle federation announce message
   */
  function handleFederationAnnounce(msg) {
    if (!Network) return;

    // Let Network module handle the discovery
    Network.handleFederationMessage(msg);

    // Update HUD if available
    if (HUD && HUD.updateFederationStatus) {
      HUD.updateFederationStatus(Network.getDiscoveredWorlds(), Network.getFederatedWorlds());
    }
  }

  /**
   * Handle federation handshake message
   */
  function handleFederationHandshake(msg) {
    if (!Network) return;

    // Let Network module handle the handshake
    Network.handleFederationMessage(msg);

    // Update HUD
    if (HUD && HUD.updateFederationStatus) {
      HUD.updateFederationStatus(Network.getDiscoveredWorlds(), Network.getFederatedWorlds());
    }

    // Show notification
    var worldName = msg.worldName || msg.payload?.worldName || 'Unknown World';
    if (HUD && HUD.showNotification) {
      HUD.showNotification('Federation established with ' + worldName, 'success');
    }
  }

  /**
   * Handle cross-world warp message
   */
  function handleWarpFork(msg) {
    if (!msg.payload || !msg.payload.target_world) return;

    var targetWorld = msg.payload.target_world;
    var playerId = msg.from;

    // If this is the local player, handle the warp
    if (playerId === localPlayer.id) {
      // Store home world if not already set
      if (!localPlayer.home_world) {
        localPlayer.home_world = Network.deriveWorldId();
      }

      // Update current world
      localPlayer.current_world = targetWorld;

      if (HUD && HUD.showNotification) {
        HUD.showNotification('Warping to federated world: ' + targetWorld, 'info');
      }

      // In a real implementation, this would navigate to the other world's URL
      // For now, we just track the state
      console.log('Player warped to federated world:', targetWorld);
    } else {
      // Another player warped out
      if (gameState && State) {
        State.removePlayer(gameState, playerId);
      }

      if (World && sceneContext) {
        World.removePlayer(sceneContext, playerId);
      }

      if (HUD && HUD.showNotification) {
        HUD.showNotification(playerId + ' traveled to another world', 'info');
      }
    }
  }

  /**
   * Handle return home message
   */
  function handleReturnHome(msg) {
    var playerId = msg.from;

    // If this is the local player returning
    if (playerId === localPlayer.id) {
      var homeWorld = localPlayer.home_world || Network.deriveWorldId();
      localPlayer.current_world = homeWorld;

      if (HUD && HUD.showNotification) {
        HUD.showNotification('Returned to home world', 'success');
      }

      console.log('Player returned to home world:', homeWorld);
    } else {
      // Another player returned from traveling
      if (HUD && HUD.showNotification) {
        HUD.showNotification(playerId + ' returned from traveling', 'info');
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
          // Award combat XP for winning
          if (Mentoring) {
            var combatXP = Mentoring.addSkillXP(localPlayer.id, 'combat', 25);
            if (combatXP.leveledUp && HUD) {
              HUD.showNotification('Combat skill increased to ' + combatXP.newLevelName + '!', 'success');
            }
          }
        } else {
          // Participation XP even for losing
          if (Mentoring) {
            Mentoring.addSkillXP(localPlayer.id, 'combat', 8);
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

              // Record decline for harassment detection
              if (Social && result.data.from) {
                var harassment = Social.recordDecline(result.data.from, localPlayer.id, 'trade_offer');
                if (harassment && HUD) {
                  HUD.showNotification('Repeated unwanted interactions detected - reputation penalty applied', 'warning');
                }
              }
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

        // Track trade achievement
        trackAchievement('trade', { with: msg.from });

        if (Mentoring) {
          var xpResult = Mentoring.addSkillXP(localPlayer.id, 'trading', 15);
          if (xpResult.leveledUp && HUD) {
            HUD.showNotification('Trading skill increased to ' + xpResult.newLevelName, 'success');
          }
        }

        // Award reputation for trading
        if (Social) {
          var repResult = Social.adjustReputation(localPlayer.id, 'trading', { with: msg.from });
          if (repResult.tierChanged && HUD) {
            HUD.showNotification('Reputation increased to ' + repResult.tier + '!', 'success');
          }
          if (HUD && HUD.updateReputationDisplay) {
            HUD.updateReputationDisplay(Social.getReputation(localPlayer.id));
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
      { id: 'potion_energy', name: 'Energy Potion', price: 25, description: 'Restores energy', icon: '&#129514;' },
      { id: 'spyglass', name: 'Spyglass', price: 35, description: 'See far-off landmarks', icon: '&#128269;' },
      { id: 'lantern_oil', name: 'Lantern Oil', price: 6, description: 'Fuel for lanterns', icon: '&#128167;' }
    ],
    trader: [
      { id: 'rare_seed', name: 'Rare Seed', price: 30, description: 'Grows into a rare plant', icon: '&#127793;' },
      { id: 'crystal_shard', name: 'Crystal Shard', price: 40, description: 'A glowing fragment', icon: '&#128142;' },
      { id: 'ancient_coin', name: 'Ancient Coin', price: 50, description: 'A relic from the founding', icon: '&#129689;' },
      { id: 'silk_thread', name: 'Silk Thread', price: 22, description: 'Fine textile material', icon: '&#129525;' },
      { id: 'copper_ingot', name: 'Copper Ingot', price: 18, description: 'Refined copper metal', icon: '&#129704;' }
    ],
    farmer: [
      { id: 'wheat_seed', name: 'Wheat Seeds', price: 5, description: 'Basic crop seeds', icon: '&#127806;' },
      { id: 'flower_seed', name: 'Flower Seeds', price: 8, description: 'Decorative flowers', icon: '&#127804;' },
      { id: 'herb_seed', name: 'Herb Seeds', price: 10, description: 'Medicinal herbs', icon: '&#127807;' },
      { id: 'fertilizer', name: 'Fertilizer', price: 15, description: 'Speeds up growth', icon: '&#128169;' },
      { id: 'seed_wildflower', name: 'Wildflower Seeds', price: 4, description: 'Beautiful wildflowers', icon: '&#127803;' }
    ],
    artisan: [
      { id: 'pigment', name: 'Pigment', price: 12, description: 'Natural color pigment', icon: '&#127912;' },
      { id: 'canvas', name: 'Canvas', price: 15, description: 'For painting masterworks', icon: '&#128444;' },
      { id: 'clay', name: 'Clay', price: 8, description: 'Moldable material', icon: '&#129520;' },
      { id: 'ink_bottle', name: 'Ink Bottle', price: 10, description: 'For writing and drawing', icon: '&#128395;' },
      { id: 'golden_frame', name: 'Golden Frame', price: 35, description: 'Display art beautifully', icon: '&#128444;' }
    ],
    gardener: [
      { id: 'seed_wildflower', name: 'Wildflower Seeds', price: 4, description: 'Beautiful wildflowers', icon: '&#127803;' },
      { id: 'herb_seed', name: 'Herb Seeds', price: 10, description: 'Medicinal herbs', icon: '&#127807;' },
      { id: 'rare_seed', name: 'Rare Seed', price: 30, description: 'Unusual plant variety', icon: '&#127793;' },
      { id: 'fertilizer', name: 'Fertilizer', price: 15, description: 'Speeds up growth', icon: '&#128169;' },
      { id: 'garden_shears', name: 'Garden Shears', price: 18, description: 'For pruning and shaping', icon: '&#9986;' }
    ],
    scholar: [
      { id: 'scroll_blank', name: 'Blank Scroll', price: 8, description: 'For recording knowledge', icon: '&#128220;' },
      { id: 'ink_bottle', name: 'Ink Bottle', price: 10, description: 'For writing', icon: '&#128395;' },
      { id: 'map_fragment', name: 'Map Fragment', price: 15, description: 'Reveals hidden areas', icon: '&#128506;' },
      { id: 'lens', name: 'Magnifying Lens', price: 25, description: 'For studying fine details', icon: '&#128270;' },
      { id: 'ancient_tome', name: 'Ancient Tome', price: 45, description: 'Contains forgotten wisdom', icon: '&#128214;' }
    ],
    warrior: [
      { id: 'potion_energy', name: 'Energy Potion', price: 25, description: 'Restores energy', icon: '&#129514;' },
      { id: 'training_weight', name: 'Training Weight', price: 15, description: 'For strength training', icon: '&#127947;' },
      { id: 'bandage', name: 'Bandage', price: 8, description: 'First aid supply', icon: '&#129657;' },
      { id: 'arena_token', name: 'Arena Token', price: 20, description: 'Entry to special events', icon: '&#127941;' }
    ],
    musician: [
      { id: 'flute', name: 'Flute', price: 28, description: 'A simple wooden flute', icon: '&#127925;' },
      { id: 'drum', name: 'Drum', price: 22, description: 'A hand drum', icon: '&#129345;' },
      { id: 'bell', name: 'Bell', price: 15, description: 'A clear-toned bell', icon: '&#128276;' },
      { id: 'sheet_music', name: 'Sheet Music', price: 12, description: 'Musical compositions', icon: '&#127926;' }
    ],
    explorer: [
      { id: 'compass', name: 'Compass', price: 20, description: 'Never lose your way', icon: '&#129517;' },
      { id: 'rope', name: 'Rope', price: 12, description: 'For difficult terrain', icon: '&#129526;' },
      { id: 'spyglass', name: 'Spyglass', price: 35, description: 'See far-off landmarks', icon: '&#128269;' },
      { id: 'trail_ration', name: 'Trail Ration', price: 8, description: 'Sustenance for the road', icon: '&#127838;' },
      { id: 'map_fragment', name: 'Map Fragment', price: 15, description: 'Reveals hidden areas', icon: '&#128506;' }
    ],
    healer: [
      { id: 'healing_herb', name: 'Healing Herb', price: 10, description: 'Soothing medicinal plant', icon: '&#127807;' },
      { id: 'bandage', name: 'Bandage', price: 8, description: 'First aid supply', icon: '&#129657;' },
      { id: 'potion_energy', name: 'Energy Potion', price: 25, description: 'Restores energy', icon: '&#129514;' },
      { id: 'herbal_tea', name: 'Herbal Tea', price: 6, description: 'Calming warm drink', icon: '&#127861;' }
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

      // Roll for bonus zone loot drop
      if (Inventory.rollHarvestDrop) {
        var luck = Physical && localPlayer.warmth > 0 ? Physical.getWarmthBonus(localPlayer.warmth) : 1.0;
        var bonusDrop = Inventory.rollHarvestDrop(currentZone, luck);
        if (bonusDrop) {
          var bonusResult = Inventory.addItem(playerInventory, bonusDrop.id, 1);
          if (bonusResult.success) {
            var bonusData = Inventory.getItemData(bonusDrop.id);
            if (bonusData && HUD) {
              setTimeout(function() {
                HUD.showItemPickup(bonusData.name, 1, bonusData.icon);
              }, 500);
            }
          }
        }
      }

      // Apply economic event modifier to harvest spark
      if (Economy && Economy.applyEventModifier && economyLedger) {
        var eventBonus = Economy.applyEventModifier(0, 'harvest');
        if (eventBonus > 0) {
          Economy.earnSpark(economyLedger, localPlayer.id, 'harvest', { complexity: 0.2 });
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
        }
      }

      // Apply seasonal bonus to harvest
      var harvestSeasonBonus = getSeasonalBonus('garden');
      if (harvestSeasonBonus > 1.0 && Economy && economyLedger) {
        var bonusSpark = Math.round((harvestSeasonBonus - 1.0) * 5);
        if (bonusSpark > 0) {
          Economy.earnSpark(economyLedger, localPlayer.id, 'harvest', { complexity: 0.1 });
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
        }
      }

      // Track harvest achievement
      trackAchievement('harvest', { item: itemId, zone: currentZone });

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

      // Track craft achievement
      trackAchievement('craft', { item: result.output.itemId, recipe: recipeId });

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

    // Handle music composition (from new compose panel with notes/instrument)
    if (composeData.notes && composeData.instrument) {
      var noteNames = composeData.notes.map(function(n) { return n.note; }).join('-');
      var msg = {
        type: 'compose',
        from: localPlayer.id,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substr(2, 9),
        payload: {
          composeType: 'music',
          title: 'Melody (' + composeData.notes.length + ' notes)',
          content: JSON.stringify({ notes: composeData.notes, instrument: composeData.instrument }),
          zone: currentZone,
          position: localPlayer.position
        }
      };

      var result = Creation.handleCompose(msg, gameState);
      if (result.success) {
        if (HUD) HUD.showNotification('Composed a melody with ' + composeData.notes.length + ' notes!', 'success');
        // Play the composition for nearby players
        if (HUD.playComposition) HUD.playComposition(composeData.notes);

        if (economyLedger && Economy) {
          var sparkAmount = Math.min(50, 5 + composeData.notes.length * 2);
          Economy.earnSpark(economyLedger, localPlayer.id, 'compose', { complexity: sparkAmount / 50 });
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          if (HUD) HUD.updatePlayerInfo(localPlayer);
        }

        if (Mentoring) {
          var xpResult = Mentoring.addSkillXP(localPlayer.id, 'social', 20);
          if (xpResult.leveledUp && HUD) {
            HUD.showNotification('Social skill increased to ' + xpResult.newLevelName, 'success');
          }
        }

        if (Audio) Audio.playSound('chat');
        addRecentActivity('Composed a melody with ' + composeData.notes.length + ' notes');
      }
      return;
    }

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
   * Handle governance actions (elections, steward policies, etc.)
   */
  function handleGovernanceAction(action, data) {
    if (!Social || !Zones || !localPlayer) return;

    switch (action) {
      case 'startElection':
        // Start election in current zone
        var zoneId = data.zoneId || currentZone;
        var reputation = Social.getReputation(localPlayer.id);

        // Check if player meets requirements
        if (reputation.tier !== 'Respected' && reputation.tier !== 'Honored' && reputation.tier !== 'Elder') {
          if (HUD) HUD.showNotification('Must be Respected tier or higher to start an election', 'error');
          return;
        }

        // For now, create a simple election with the local player as a candidate
        // In a full implementation, this would open a dialog to add candidates
        var candidates = [localPlayer.id];
        var election = Zones.startElection(zoneId, candidates);

        if (HUD) {
          HUD.showNotification('Election started! Voting ends in 48 hours.', 'success');
          HUD.hideGovernancePanel();
          HUD.showGovernancePanel(zoneId, localPlayer);
        }

        // Broadcast election start to network
        if (Network && Protocol) {
          var msg = Protocol.create.election_start(localPlayer.id, {
            zoneId: zoneId,
            electionId: election.id,
            candidates: candidates
          });
          Network.broadcast(msg);
        }
        break;

      case 'vote':
        var electionId = data.electionId;
        var candidateId = data.candidateId;

        var voteResult = Zones.castVote(electionId, localPlayer.id, candidateId);
        if (voteResult.success) {
          if (HUD) {
            HUD.showNotification('Vote cast for ' + candidateId, 'success');
            HUD.hideGovernancePanel();
            HUD.showGovernancePanel(currentZone, localPlayer);
          }

          // Broadcast vote to network
          if (Network && Protocol) {
            var msg = Protocol.create.election_vote(localPlayer.id, {
              electionId: electionId,
              candidateId: candidateId
            });
            Network.broadcast(msg);
          }
        } else {
          if (HUD) HUD.showNotification(voteResult.error, 'error');
        }
        break;

      case 'savePolicies':
        var zoneId = data.zoneId || currentZone;

        // Set welcome message
        if (data.welcomeMessage !== undefined) {
          var msgResult = Zones.setWelcomeMessage(zoneId, localPlayer.id, data.welcomeMessage);
          if (!msgResult.success) {
            if (HUD) HUD.showNotification(msgResult.error, 'error');
            return;
          }
        }

        // Set policies
        if (data.buildingRequiresApproval !== undefined) {
          Zones.setZonePolicy(zoneId, localPlayer.id, 'buildingRequiresApproval', data.buildingRequiresApproval);
        }
        if (data.chatModerated !== undefined) {
          Zones.setZonePolicy(zoneId, localPlayer.id, 'chatModerated', data.chatModerated);
        }

        if (HUD) {
          HUD.showNotification('Zone policies updated', 'success');
          HUD.hideGovernancePanel();
          HUD.showGovernancePanel(zoneId, localPlayer);
        }

        // Award reputation for steward action
        Social.adjustReputation(localPlayer.id, 'zone_steward_action', { zoneId: zoneId });

        // Broadcast policy changes to network
        if (Network && Protocol) {
          var msg = Protocol.create.steward_set_policy(localPlayer.id, {
            zoneId: zoneId,
            policies: {
              welcomeMessage: data.welcomeMessage,
              buildingRequiresApproval: data.buildingRequiresApproval,
              chatModerated: data.chatModerated
            }
          });
          Network.broadcast(msg);
        }
        break;
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

          // Track build achievement
          trackAchievement('build', { type: result.type, zone: currentZone });

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
            // Track NPC interaction achievement
            trackAchievement('npc_talk', { npcId: npcResponse.id, npcName: npcResponse.name });
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
        // No NPC nearby — try interactive objects (benches, campfires, etc.)
        if (World && World.getInteractiveAtPosition && localPlayer) {
          var nearbyObj = World.getInteractiveAtPosition(localPlayer.position.x, localPlayer.position.z, 4);
          if (nearbyObj) {
            var objResult = World.interactWithObject(nearbyObj.id);
            if (objResult) {
              if (HUD) HUD.showNotification(objResult.message, 'info');
              if (Audio) Audio.playSound('chat');

              // Special actions for certain object types
              if (objResult.action === 'rest' || objResult.action === 'sit' || objResult.action === 'socialize') {
                // Resting recovers mood/energy
                addRecentActivity('Resting at ' + objResult.type.replace(/_/g, ' '));
              } else if (objResult.action === 'study' || objResult.action === 'access_lore') {
                if (Mentoring) {
                  var loreXP = Mentoring.addSkillXP(localPlayer.id, 'lore', 5);
                  if (loreXP.leveledUp && HUD) {
                    HUD.showNotification('Lore skill increased to ' + loreXP.newLevelName, 'success');
                  }
                }
                addRecentActivity('Studied at ' + objResult.type.replace(/_/g, ' '));
              } else if (objResult.action === 'practice_combat') {
                if (Mentoring) {
                  var combatXP = Mentoring.addSkillXP(localPlayer.id, 'combat', 5);
                  if (combatXP.leveledUp && HUD) {
                    HUD.showNotification('Combat skill increased to ' + combatXP.newLevelName, 'success');
                  }
                }
                addRecentActivity('Trained at combat dummy');
              } else if (objResult.action === 'create_art' || objResult.action === 'play_music') {
                if (Mentoring) {
                  var craftXP = Mentoring.addSkillXP(localPlayer.id, 'crafting', 5);
                  if (craftXP.leveledUp && HUD) {
                    HUD.showNotification('Crafting skill increased to ' + craftXP.newLevelName, 'success');
                  }
                }
                addRecentActivity('Created at ' + objResult.type.replace(/_/g, ' '));
              }

              trackAchievement('use_object', { type: objResult.type });
              break;
            }
          }
        }
        // No NPC or object nearby — try harvesting
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

      case 'toggleGovernance':
        if (HUD && localPlayer && Social && Zones) {
          // Initialize governance panel with callback
          if (!HUD.initGovernancePanel) {
            HUD.initGovernancePanel(handleGovernanceAction);
          }
          HUD.toggleGovernancePanel(currentZone, localPlayer);
        }
        break;

      case 'toggleAchievements':
        if (HUD && Quests && localPlayer) {
          var achievementPanelEl = document.getElementById('achievement-panel');
          if (achievementPanelEl) {
            if (HUD.hideAchievementPanel) HUD.hideAchievementPanel();
          } else {
            if (HUD.showAchievementPanel) HUD.showAchievementPanel(localPlayer.id);
          }
        }
        break;

      case 'toggleAuctions':
      case 'toggleAuctionHouse':
        if (HUD && Economy && localPlayer) {
          if (HUD.toggleAuctionHousePanel) {
            HUD.toggleAuctionHousePanel(economyLedger, localPlayer.id, playerInventory);
          } else if (HUD.showAuctionHousePanel) {
            HUD.showAuctionHousePanel(economyLedger, localPlayer.id, playerInventory);
          }
        }
        break;

      case 'toggleLoreJournal':
        if (HUD && Exploration && localPlayer) {
          var lorePanelEl = document.getElementById('lore-journal-panel');
          if (lorePanelEl) {
            if (HUD.hideLoreJournal) HUD.hideLoreJournal();
          } else {
            if (HUD.showLoreJournal) HUD.showLoreJournal(localPlayer.id, gameState);
          }
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

      case 'startFishing':
        startFishing();
        break;

      case 'togglePetPanel':
        if (HUD && HUD.showPetPanel) {
          HUD.showPetPanel(localPlayer.id, currentZone);
        }
        break;

      case 'toggleHousing':
        showHousingPanel();
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

    // Handle page unload — save and leave
    window.addEventListener('beforeunload', () => {
      autoSavePlayerData();
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

  /**
   * Track an achievement event and show toast if earned
   */
  function trackAchievement(eventType, eventData) {
    if (!Quests || !Quests.trackAchievementEvent || !localPlayer) return;
    var earned = Quests.trackAchievementEvent(localPlayer.id, eventType, eventData);
    if (earned && earned.length > 0) {
      earned.forEach(function(achievement) {
        // Show toast notification
        if (HUD && HUD.showAchievementToast) {
          HUD.showAchievementToast(achievement);
        } else if (HUD) {
          HUD.showNotification('Achievement unlocked: ' + achievement.name, 'success');
        }
        // Award bonus spark for achievements
        if (economyLedger && Economy) {
          var bonus = achievement.tier === 'gold' ? 50 : achievement.tier === 'silver' ? 25 : 10;
          Economy.earnSpark(economyLedger, localPlayer.id, 'discovery', { complexity: bonus / 25 });
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          if (HUD) HUD.updatePlayerInfo(localPlayer);
        }
        if (Audio) Audio.playSound('warp');
      });
    }
  }

  /**
   * Save full player state for session persistence
   */
  function autoSavePlayerData() {
    if (!Auth || !Auth.savePlayerData || !localPlayer) return;
    var saveData = {
      inventory: playerInventory,
      spark: localPlayer.spark || 0,
      position: localPlayer.position,
      zone: currentZone,
      skills: Mentoring ? Mentoring.getPlayerSkills(localPlayer.id) : null,
      questState: Quests ? { active: Quests.getActiveQuests(localPlayer.id), completed: Quests.getCompletedQuests(localPlayer.id) } : null,
      achievements: Quests && Quests.getAchievements ? Quests.getAchievements(localPlayer.id) : null,
      guild: Guilds ? Guilds.getPlayerGuild(localPlayer.id) : null,
      discoveredSecrets: [],
      warmth: localPlayer.warmth || 0,
      playTime: playTimeSeconds
    };
    Auth.savePlayerData(saveData);
  }

  /**
   * Restore player state from saved data
   */
  function restorePlayerData() {
    if (!Auth || !Auth.loadPlayerData || !localPlayer) return false;
    var data = Auth.loadPlayerData();
    if (!data) return false;

    // Restore position
    if (data.position) {
      localPlayer.position = data.position;
    }
    if (data.zone) {
      currentZone = data.zone;
    }
    // Restore spark
    if (data.spark && economyLedger && Economy) {
      economyLedger.balances[localPlayer.id] = data.spark;
      localPlayer.spark = data.spark;
    }
    // Restore inventory
    if (data.inventory && Inventory) {
      playerInventory = data.inventory;
    }
    // Restore play time
    if (data.playTime) {
      playTimeSeconds = data.playTime;
    }
    // Restore warmth
    if (data.warmth) {
      localPlayer.warmth = data.warmth;
    }

    console.log('Player data restored from save');
    return true;
  }

  /**
   * Check nearby secrets and trigger discovery
   */
  function checkSecrets() {
    if (!Exploration || !Exploration.checkNearbySecrets || !localPlayer || !gameState) return;
    var nearbySecrets = Exploration.checkNearbySecrets(localPlayer.id, localPlayer.position, currentZone, gameState);
    if (nearbySecrets && nearbySecrets.length > 0) {
      nearbySecrets.forEach(function(secret) {
        var result = Exploration.discoverSecret(localPlayer.id, secret, gameState);
        if (result && result.success) {
          // Show discovery notification with lore
          if (HUD) {
            HUD.showNotification('Secret discovered: ' + secret.name, 'success');
            if (HUD.showDiscoveryPopup) {
              HUD.showDiscoveryPopup({
                name: secret.name,
                description: secret.description,
                rarity: getRarityName(secret.rarity),
                sparkReward: result.sparkAwarded || 0
              });
            }
          }
          // Award spark
          if (economyLedger && Economy && result.sparkAwarded) {
            Economy.earnSpark(economyLedger, localPlayer.id, 'discovery', { complexity: secret.rarity });
            localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
            if (HUD) HUD.updatePlayerInfo(localPlayer);
          }
          // Get and show lore if available
          if (secret.loreId && Exploration.getLoreEntry) {
            var lore = Exploration.getLoreEntry(secret.loreId);
            if (lore && HUD) {
              setTimeout(function() {
                HUD.showNotification('Lore unlocked: ' + lore.title, 'info');
              }, 3000);
            }
            // Award lore XP for discovering lore entries
            if (Mentoring) {
              var loreXP = Mentoring.addSkillXP(localPlayer.id, 'lore', 15);
              if (loreXP.leveledUp && HUD) {
                HUD.showNotification('Lore skill increased to ' + loreXP.newLevelName + '!', 'success');
              }
            }
          }
          // Award exploration XP for discovering secrets
          if (Mentoring) {
            var exploreXP = Mentoring.addSkillXP(localPlayer.id, 'exploration', 10);
            if (exploreXP.leveledUp && HUD) {
              HUD.showNotification('Exploration skill increased to ' + exploreXP.newLevelName + '!', 'success');
            }
          }
          // Track achievement
          trackAchievement('discover', { type: 'secret', rarity: secret.rarity });
          if (Audio) Audio.playSound('warp');
          addRecentActivity('Discovered: ' + secret.name);
        }
      });
    }
  }

  /**
   * Update economic event display and check for changes
   */
  function updateEconomicEvent() {
    if (!Economy || !Economy.getCurrentEvent) return;
    var event = Economy.getCurrentEvent();
    if (event && (!currentEconomicEvent || currentEconomicEvent.id !== event.id)) {
      currentEconomicEvent = event;
      if (HUD) {
        // Show event banner
        var bannerEl = document.getElementById('economic-event-banner');
        if (!bannerEl && typeof document !== 'undefined') {
          bannerEl = document.createElement('div');
          bannerEl.id = 'economic-event-banner';
          bannerEl.className = 'economic-event-banner';
          document.body.appendChild(bannerEl);
        }
        if (bannerEl) {
          bannerEl.innerHTML = '<strong>' + event.name + '</strong> — ' + event.description;
          bannerEl.style.display = 'block';
        }
        HUD.showNotification('Economic Event: ' + event.name + ' is active!', 'success');
      }
    } else if (!event && currentEconomicEvent) {
      currentEconomicEvent = null;
      var bannerEl = document.getElementById('economic-event-banner');
      if (bannerEl) bannerEl.style.display = 'none';
    }
  }

  /**
   * Initialize seasonal event display
   */
  function initSeasonalEvent() {
    if (!Seasons) return;
    currentSeason = Seasons.getCurrentSeason();
    if (!currentSeason) return;

    var colors = Seasons.getSeasonalColors();
    var daysLeft = Seasons.getDaysUntilSeasonEnd();

    // Create seasonal banner
    if (typeof document !== 'undefined') {
      var banner = document.getElementById('seasonal-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'seasonal-banner';
        banner.className = 'seasonal-banner season-' + currentSeason.id;
        document.body.appendChild(banner);
      }
      banner.innerHTML = '<div class="seasonal-banner-title">' + currentSeason.festival + '</div>' +
        '<div class="seasonal-banner-desc">' + currentSeason.description + '</div>' +
        '<div class="seasonal-banner-countdown">' + daysLeft + ' days remaining</div>';
      banner.style.display = 'block';

      // Auto-hide after 8 seconds
      setTimeout(function() {
        if (banner) banner.style.display = 'none';
      }, 8000);
    }

    // Apply seasonal NPC greetings
    if (NPCs && Seasons.getSeasonalGreeting) {
      console.log('Season: ' + currentSeason.name + ' — ' + Seasons.getSeasonalGreeting());
    }
  }

  /**
   * Update seasonal event (check for season change)
   */
  function updateSeasonalEvent() {
    if (!Seasons) return;
    var newSeason = Seasons.getCurrentSeason();
    if (newSeason && (!currentSeason || currentSeason.id !== newSeason.id)) {
      currentSeason = newSeason;
      if (HUD) {
        HUD.showNotification('A new season has arrived: ' + newSeason.name + '!', 'success');
      }
      initSeasonalEvent(); // Refresh banner
    }
  }

  /**
   * Get seasonal bonus for an activity
   */
  function getSeasonalBonus(activity) {
    if (!Seasons || !Seasons.getSeasonBonus) return 1.0;
    return Seasons.getSeasonBonus(activity);
  }

  /**
   * Initialize pet system
   */
  function initPetSystem(playerId) {
    if (!Pets) return;

    // Check if player has a saved pet
    var savedData = Auth && Auth.loadPlayerData ? Auth.loadPlayerData() : null;
    if (savedData && savedData.pet) {
      // Restore pet from saved data - pets module stores internally
      console.log('Pet system initialized');
    }
  }

  /**
   * Update pet status (hunger, mood decay)
   */
  function updatePetStatus() {
    if (!Pets || !localPlayer) return;
    var pet = Pets.getPlayerPet(localPlayer.id);
    if (!pet) return;

    // Update pet simulation
    Pets.updatePet(localPlayer.id, PET_UPDATE_INTERVAL / 1000);

    // Get pet bonus and apply
    var bonus = Pets.getPetBonus(localPlayer.id);
    if (bonus && bonus.value > 0) {
      localPlayer.petBonus = bonus;
    }

    // Check pet mood for notifications
    var mood = Pets.getPetMood(pet);
    if (mood === 'sad' && pet.hunger > 70) {
      if (HUD) {
        HUD.showNotification(pet.name + ' is hungry! Feed your companion.', 'warning');
      }
    }
  }

  /**
   * Start fishing minigame
   */
  function startFishing() {
    if (isFishing || !HUD || !HUD.showFishingUI) return;

    // Check if current zone allows fishing
    var fishableZones = ['gardens', 'commons', 'wilds', 'nexus', 'agora'];
    if (fishableZones.indexOf(currentZone) === -1) {
      if (HUD) HUD.showNotification('You cannot fish here.', 'warning');
      return;
    }

    isFishing = true;
    if (Audio) Audio.playSound('harvest');

    HUD.showFishingUI(currentZone, function(result) {
      isFishing = false;
      if (result && result.success && result.fish) {
        // Add fish to inventory
        if (Inventory && playerInventory) {
          Inventory.addItem(playerInventory, result.fish.id, 1);
          if (HUD && HUD.updateInventoryDisplay) {
            HUD.updateInventoryDisplay(playerInventory);
          }
        }
        // Award Spark
        var sparkAmount = result.fish.value || 5;
        var seasonBonus = getSeasonalBonus('harvest');
        sparkAmount = Math.round(sparkAmount * seasonBonus);
        if (economyLedger && Economy) {
          Economy.earnSpark(economyLedger, localPlayer.id, sparkAmount, 'fishing');
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
        }
        if (HUD && HUD.showFishCaughtNotification) {
          HUD.showFishCaughtNotification(result.fish.name, sparkAmount);
        }
        trackAchievement('harvest', { type: 'fishing', fish: result.fish.id });
        // Award gardening XP for fishing (falls under nature skills)
        if (Mentoring) {
          var fishXP = Mentoring.addSkillXP(localPlayer.id, 'gardening', 8);
          if (fishXP.leveledUp && HUD) {
            HUD.showNotification('Gardening skill increased to ' + fishXP.newLevelName + '!', 'success');
          }
        }
        addRecentActivity('Caught: ' + result.fish.name);
      }
    });
  }

  /**
   * Show housing panel for player
   */
  function showHousingPanel() {
    if (!Creation || !HUD || typeof document === 'undefined') return;

    var existingPanel = document.getElementById('housing-panel');
    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'housing-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(15,12,10,0.95);border:1px solid rgba(218,165,32,0.3);border-radius:12px;' +
      'padding:24px;min-width:400px;max-width:550px;max-height:70vh;overflow-y:auto;z-index:1100;' +
      'backdrop-filter:blur(10px);color:#E8E0D8;font-family:Georgia,serif;';

    var playerPlot = Creation.getPlayerPlot ? Creation.getPlayerPlot(localPlayer.id) : null;

    // Header
    var header = document.createElement('h2');
    header.textContent = playerPlot ? 'My Home — ' + playerPlot.name : 'Housing — Claim a Plot';
    header.style.cssText = 'color:#DAA520;margin:0 0 16px;font-size:1.2rem;';
    panel.appendChild(header);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u00d7';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;width:30px;height:30px;' +
      'background:rgba(255,255,255,0.1);color:#E8E0D8;border:1px solid rgba(255,255,255,0.2);' +
      'border-radius:50%;font-size:18px;cursor:pointer;';
    closeBtn.onclick = function() { panel.remove(); };
    panel.appendChild(closeBtn);

    if (playerPlot) {
      // Show owned plot info
      var plotInfo = document.createElement('div');
      plotInfo.style.cssText = 'margin-bottom:16px;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;';
      plotInfo.innerHTML = '<div style="color:#B8B0A8;font-size:0.85rem;">Plot ' + playerPlot.id +
        ' (' + playerPlot.bounds.x1 + ',' + playerPlot.bounds.z1 + ')</div>' +
        '<div style="color:#E8E0D8;font-size:0.9rem;margin-top:4px;">Furniture: ' +
        playerPlot.furniture.length + '/' + 20 + '</div>';
      panel.appendChild(plotInfo);

      // Furniture list
      var furnitureTypes = Creation.FURNITURE_TYPES || {};
      var furnitureHeader = document.createElement('div');
      furnitureHeader.textContent = 'Add Furniture';
      furnitureHeader.style.cssText = 'color:#DAA520;font-size:0.9rem;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em;';
      panel.appendChild(furnitureHeader);

      Object.keys(furnitureTypes).forEach(function(fType) {
        var ft = furnitureTypes[fType];
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;' +
          'background:rgba(255,255,255,0.02);border-radius:6px;margin-bottom:4px;' +
          'border:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:all 0.2s;';
        row.onmouseover = function() { this.style.borderColor = 'rgba(218,165,32,0.3)'; };
        row.onmouseout = function() { this.style.borderColor = 'rgba(255,255,255,0.05)'; };
        row.innerHTML = '<span style="font-size:1.3rem;">' + ft.icon + '</span>' +
          '<span style="flex:1;color:#E8E0D8;font-size:0.85rem;">' + ft.name + '</span>' +
          '<span style="color:#DAA520;font-size:0.8rem;">' + ft.cost + ' Spark</span>';
        row.onclick = function() {
          var result = Creation.placeFurniture(localPlayer.id, fType, 5, 5);
          if (result && result.success) {
            HUD.showNotification('Placed ' + ft.name + ' in your home!', 'success');
            panel.remove();
          } else {
            HUD.showNotification(result ? result.error : 'Cannot place furniture', 'warning');
          }
        };
        panel.appendChild(row);
      });
    } else {
      // Show available plots
      var plots = Creation.getAvailablePlots ? Creation.getAvailablePlots() : [];
      if (plots.length === 0) {
        var noPlots = document.createElement('div');
        noPlots.textContent = 'No plots available. Visit The Commons zone to find housing.';
        noPlots.style.cssText = 'color:#B8B0A8;text-align:center;padding:20px;';
        panel.appendChild(noPlots);
      } else {
        var infoText = document.createElement('div');
        infoText.textContent = 'Available plots in The Commons (' + plots.length + ' open):';
        infoText.style.cssText = 'color:#B8B0A8;font-size:0.85rem;margin-bottom:12px;';
        panel.appendChild(infoText);

        plots.slice(0, 8).forEach(function(plot) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;' +
            'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);' +
            'border-radius:8px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;';
          row.onmouseover = function() { this.style.borderColor = 'rgba(218,165,32,0.4)'; };
          row.onmouseout = function() { this.style.borderColor = 'rgba(255,255,255,0.08)'; };
          row.innerHTML = '<span style="font-size:1.3rem;">🏠</span>' +
            '<span style="flex:1;color:#E8E0D8;font-size:0.9rem;">Plot ' + plot.id + '</span>' +
            '<span style="color:#B8B0A8;font-size:0.75rem;">(' + plot.bounds.x1 + ', ' + plot.bounds.z1 + ')</span>';
          row.onclick = function() {
            var plotName = prompt('Name your home:');
            if (plotName && plotName.trim()) {
              var result = Creation.claimPlot(localPlayer.id, plot.id, plotName.trim());
              if (result && result.success) {
                HUD.showNotification('You claimed a plot: ' + plotName.trim() + '!', 'success');
                trackAchievement('build', { type: 'housing' });
                panel.remove();
              } else {
                HUD.showNotification(result ? result.error : 'Cannot claim plot', 'warning');
              }
            }
          };
          panel.appendChild(row);
        });
      }
    }

    document.body.appendChild(panel);

    // Close on Escape
    var escHandler = function(e) {
      if (e.key === 'Escape') {
        panel.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Export public API
  exports.init = init;
  exports.joinWorld = joinWorld;
  exports.leaveWorld = leaveWorld;
  exports.handleLocalAction = handleLocalAction;

})(typeof module !== 'undefined' ? module.exports : (window.Main = {}));
