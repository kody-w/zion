(function(exports) {
  // Main entry point and game loop orchestrator

  // Import references (browser globals or require)
  const Protocol = typeof require !== 'undefined' ? require('./protocol') : window.Protocol;
  const State = typeof require !== 'undefined' ? require('./state') : window.State;
  const Zones = typeof require !== 'undefined' ? require('./zones') : window.Zones;
  const Economy = typeof require !== 'undefined' ? require('./economy') : window.Economy;
  const Inventory = typeof require !== 'undefined' ? require('./inventory') : window.Inventory;
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
        var sparkEarned = Economy.earnSpark(economyLedger, localPlayer.id, 'harvest', { complexity: 0.5 });
        if (localPlayer) {
          localPlayer.spark = Economy.getBalance(economyLedger, localPlayer.id);
          if (HUD) HUD.updatePlayerInfo(localPlayer);
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

      if (Quests) {
        Quests.updateQuestProgress(localPlayer.id, 'craft', { item: result.output.itemId, amount: result.output.count });
      }

      if (Audio) Audio.playSound('build');
    } else {
      if (HUD) HUD.showNotification(result.message, 'error');
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
        // Broadcast player chat to NPCs for reaction
        if (NPCs && NPCs.broadcastEvent) {
          NPCs.broadcastEvent({ type: 'player_action', data: {
            playerId: localPlayer.id, action: 'chat',
            position: localPlayer.position, message: payload.message
          }});
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
                }
              }

              // Update quest progress for NPC interaction
              Quests.updateQuestProgress(localPlayer.id, 'talk_npc', { npcId: npcResponse.id });
            }

            if (Audio) Audio.playSound('chat');
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
