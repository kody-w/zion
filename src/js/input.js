(function(exports) {
  // Input handling and protocol message generation
  var callbacks = {};
  var keys = {};
  var chatMode = false;
  var buildMode = false;
  var canvas = null;
  var mouseNDC = { x: 0, y: 0 }; // Normalized device coordinates

  // Camera control variables
  var cameraDistance = 20; // Default camera distance from player
  var cameraOrbitAngle = 0; // Horizontal orbit angle in radians
  var isDraggingCamera = false;
  var lastCameraDragX = 0;
  var lastCameraDragY = 0;

  /**
   * Initialize input handlers
   * @param {object} cbs - Callbacks
   * @param {function} cbs.onMove - Movement callback (delta, position)
   * @param {function} cbs.onAction - Action callback (type, data)
   * @param {function} cbs.onChat - Chat callback (message)
   * @param {function} cbs.onBuild - Build callback (data)
   */
  function initInput(cbs) {
    callbacks = cbs || {};

    if (typeof document === 'undefined') {
      console.warn('Input requires browser environment');
      return;
    }

    // Keyboard handlers
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Mouse handlers
    canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleMouseClick);
      canvas.addEventListener('contextmenu', handleContextMenu);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('wheel', handleMouseWheel, { passive: false });
    }

    // Global mouse up handler for camera drag
    document.addEventListener('mouseup', handleMouseUp);

    // Touch handlers for mobile
    if ('ontouchstart' in window) {
      initTouchControls();
    }

    console.log('Input system initialized');
  }

  /**
   * Handle key down
   */
  function handleKeyDown(e) {
    // Don't process game keys in chat mode (except Escape/Enter)
    if (chatMode && e.key !== 'Escape' && e.key !== 'Enter') {
      return;
    }

    keys[e.key.toLowerCase()] = true;

    // Special keys
    switch (e.key) {
      case 'Enter':
        if (chatMode) {
          chatMode = false;
        } else {
          chatMode = true;
          if (callbacks.onChat) {
            callbacks.onChat({ mode: 'open' });
          }
        }
        e.preventDefault();
        break;

      case 'Escape':
        chatMode = false;
        buildMode = false;
        if (callbacks.onAction) {
          callbacks.onAction('toggleSettings', {});
        }
        e.preventDefault();
        break;

      case 'b':
      case 'B':
        if (!chatMode) {
          buildMode = !buildMode;
          if (callbacks.onBuild) {
            callbacks.onBuild({ mode: buildMode });
          }
          e.preventDefault();
        }
        break;

      case 'e':
      case 'E':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('interact', {});
          }
          e.preventDefault();
        }
        break;

      case 'i':
      case 'I':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleInventory', {});
          }
          e.preventDefault();
        }
        break;

      case 'c':
      case 'C':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleCrafting', {});
          }
          e.preventDefault();
        }
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '0':
        if (!chatMode) {
          if (buildMode && callbacks.onBuild) {
            // In build mode, number keys select build type
            var typeIndex = (e.key === '0' ? 9 : parseInt(e.key) - 1);
            callbacks.onBuild({ action: 'selectType', typeIndex: typeIndex });
          } else if (callbacks.onAction && parseInt(e.key) >= 1 && parseInt(e.key) <= 5) {
            // Outside build mode, 1-5 are quick slots
            callbacks.onAction('useQuickSlot', { slot: parseInt(e.key) - 1 });
          }
          e.preventDefault();
        }
        break;

      case 'j':
      case 'J':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggle_quest_log', {});
          }
          e.preventDefault();
        }
        break;

      case 't':
      case 'T':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('initiate_trade', {});
          }
          e.preventDefault();
        }
        break;

      case 'f':
      case 'F':
        if (!chatMode) {
          // F key toggles emote menu
          if (callbacks.onAction) {
            callbacks.onAction('toggleEmoteMenu', {});
          }
          e.preventDefault();
        }
        break;

      case 'm':
      case 'M':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleMap', {});
          }
          e.preventDefault();
        }
        break;

      case 'p':
      case 'P':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleProfile', {});
          }
          e.preventDefault();
        }
        break;

      case 'k':
      case 'K':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleSkills', {});
          }
          e.preventDefault();
        }
        break;

      case 'n':
      case 'N':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleCompose', {});
          }
          e.preventDefault();
        }
        break;

      case 'g':
      case 'G':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleGuild', {});
          }
          e.preventDefault();
        }
        break;

      case 'l':
      case 'L':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleLoreJournal', {});
          }
          e.preventDefault();
        }
        break;

      case 'v':
      case 'V':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleDiscoveryLog', {});
          }
          e.preventDefault();
        }
        break;

      case 'h':
      case 'H':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleGovernance', {});
          }
          e.preventDefault();
        }
        break;

      case 'u':
      case 'U':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleAuctionHouse', {});
          }
          e.preventDefault();
        }
        break;

      case 'y':
      case 'Y':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleAchievements', {});
          }
          e.preventDefault();
        }
        break;

      case 'r':
      case 'R':
        if (!chatMode && buildMode) {
          // R key rotates build preview
          if (callbacks.onBuild) {
            callbacks.onBuild({ action: 'rotate' });
          }
          e.preventDefault();
        }
        break;

      case 'q':
      case 'Q':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('togglePetPanel', {});
          }
          e.preventDefault();
        }
        break;

      case 'x':
      case 'X':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('startFishing', {});
          }
          e.preventDefault();
        }
        break;

      case 'j':
      case 'J':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleAnchorPanel', {});
          }
          e.preventDefault();
        }
        break;

      case 'n':
      case 'N':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleFederationProposal', {});
          }
          e.preventDefault();
        }
        break;

      case 'z':
      case 'Z':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('toggleHousing', {});
          }
          e.preventDefault();
        }
        break;

      case 'F2':
        if (!chatMode) {
          if (callbacks.onAction) {
            callbacks.onAction('togglePhotoMode', {});
          }
          e.preventDefault();
        }
        break;
    }

    // Emote hotkeys: F+Number
    if (!chatMode && (keys['f'] || keys['F'])) {
      var emoteType = null;
      switch (e.key) {
        case '1': emoteType = 'wave'; break;
        case '2': emoteType = 'dance'; break;
        case '3': emoteType = 'bow'; break;
        case '4': emoteType = 'cheer'; break;
        case '5': emoteType = 'meditate'; break;
        case '6': emoteType = 'point'; break;
      }
      if (emoteType && callbacks.onAction) {
        callbacks.onAction('emote', { type: emoteType });
        e.preventDefault();
      }
    }
  }

  /**
   * Handle key up
   */
  function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }

  /**
   * Handle mouse click
   */
  function handleMouseClick(e) {
    if (!canvas) return;

    var rect = canvas.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    var y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // In build mode, click places structure
    if (buildMode && callbacks.onBuild) {
      callbacks.onBuild({ action: 'place', x: x, y: y });
    } else if (callbacks.onAction) {
      callbacks.onAction('click', { x, y, screenX: e.clientX, screenY: e.clientY });
    }
  }

  /**
   * Handle context menu (right-click)
   */
  function handleContextMenu(e) {
    e.preventDefault();

    if (callbacks.onAction) {
      callbacks.onAction('context', { x: e.clientX, y: e.clientY });
    }
  }

  /**
   * Handle mouse move
   */
  function handleMouseMove(e) {
    if (!canvas) return;

    var rect = canvas.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Handle camera orbit dragging
    if (isDraggingCamera) {
      var deltaX = e.clientX - lastCameraDragX;
      var deltaY = e.clientY - lastCameraDragY;

      // Adjust orbit angle based on horizontal drag
      cameraOrbitAngle -= deltaX * 0.005;

      lastCameraDragX = e.clientX;
      lastCameraDragY = e.clientY;
    }
  }

  /**
   * Handle mouse down for camera drag
   */
  function handleMouseDown(e) {
    // Right-click or middle-click for camera orbit
    if (e.button === 2 || e.button === 1) {
      isDraggingCamera = true;
      lastCameraDragX = e.clientX;
      lastCameraDragY = e.clientY;
      e.preventDefault();
    }
  }

  /**
   * Handle mouse up
   */
  function handleMouseUp(e) {
    if (e.button === 2 || e.button === 1) {
      isDraggingCamera = false;
    }
  }

  /**
   * Handle mouse wheel for camera zoom
   */
  function handleMouseWheel(e) {
    e.preventDefault();

    // Adjust camera distance with constraints
    cameraDistance += e.deltaY * 0.02;
    cameraDistance = Math.max(5, Math.min(50, cameraDistance));
  }

  /**
   * Get current mouse position in NDC
   */
  function getMouseNDC() {
    return mouseNDC;
  }

  /**
   * Get camera distance (for zoom)
   */
  function getCameraDistance() {
    return cameraDistance;
  }

  /**
   * Get camera orbit angle
   */
  function getCameraOrbit() {
    return cameraOrbitAngle;
  }

  /**
   * Initialize touch controls (virtual joystick and action buttons)
   */
  function initTouchControls() {
    if (typeof document === 'undefined') return;

    // Only show on mobile devices
    var platform = getPlatform();
    if (platform !== 'phone') return;

    // Create improved virtual joystick (left side) - larger and more responsive
    var joystick = document.createElement('div');
    joystick.id = 'virtual-joystick';
    joystick.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 30px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(0,0,0,0.4);
      border: 3px solid rgba(218,165,32,0.6);
      touch-action: none;
      z-index: 1000;
    `;

    var stick = document.createElement('div');
    stick.style.cssText = `
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(218,165,32,0.8);
      top: 35px;
      left: 35px;
      touch-action: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    joystick.appendChild(stick);
    document.body.appendChild(joystick);

    // Joystick touch handler
    var touchStartPos = { x: 0, y: 0 };
    var isDragging = false;

    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDragging = true;
      var touch = e.touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };
    });

    joystick.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();

      var touch = e.touches[0];
      var deltaX = touch.clientX - touchStartPos.x;
      var deltaY = touch.clientY - touchStartPos.y;

      // Limit stick movement
      var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      var maxDistance = 35;
      var normalizedDelta = {
        x: deltaX / maxDistance,
        y: deltaY / maxDistance
      };

      if (distance > maxDistance) {
        stick.style.left = (35 + (deltaX / distance) * maxDistance) + 'px';
        stick.style.top = (35 + (deltaY / distance) * maxDistance) + 'px';
      } else {
        stick.style.left = (35 + deltaX) + 'px';
        stick.style.top = (35 + deltaY) + 'px';
      }

      // Send movement
      if (callbacks.onMove) {
        callbacks.onMove({
          x: normalizedDelta.x,
          y: 0,
          z: -normalizedDelta.y // Invert Y for forward/back
        });
      }
    });

    joystick.addEventListener('touchend', (e) => {
      e.preventDefault();
      isDragging = false;
      stick.style.left = '35px';
      stick.style.top = '35px';
    });

    // Create action buttons overlay (bottom-right, circular arc layout)
    var actionButtons = [
      { label: 'E', action: 'interact', size: 50, angle: 0, radius: 0, color: 'rgba(218,165,32,0.7)' },
      { label: 'I', action: 'toggleInventory', size: 45, angle: -45, radius: 70, color: 'rgba(218,165,32,0.7)' },
      { label: 'J', action: 'toggle_quest_log', size: 45, angle: -90, radius: 70, color: 'rgba(218,165,32,0.7)' },
      { label: 'B', action: 'toggleBuild', size: 45, angle: 45, radius: 70, color: 'rgba(218,165,32,0.7)' },
      { label: '💬', action: 'toggleChat', size: 45, angle: 90, radius: 70, color: 'rgba(218,165,32,0.7)' }
    ];

    var baseX = window.innerWidth - 80;
    var baseY = window.innerHeight - 80;

    actionButtons.forEach(function(btn) {
      var button = document.createElement('button');
      button.textContent = btn.label;

      // Calculate position using angle and radius
      var angleRad = (btn.angle * Math.PI) / 180;
      var x = baseX + btn.radius * Math.cos(angleRad);
      var y = baseY + btn.radius * Math.sin(angleRad);

      button.style.cssText = `
        position: fixed;
        bottom: ${window.innerHeight - y - btn.size/2}px;
        right: ${window.innerWidth - x - btn.size/2}px;
        width: ${btn.size}px;
        height: ${btn.size}px;
        border-radius: 50%;
        background: ${btn.color};
        border: 3px solid rgba(218,165,32,0.9);
        color: white;
        font-size: ${btn.size === 50 ? 20 : 16}px;
        font-weight: bold;
        z-index: 1000;
        touch-action: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      button.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (btn.action === 'toggleBuild') {
          buildMode = !buildMode;
          if (callbacks.onBuild) {
            callbacks.onBuild({ mode: buildMode });
          }
        } else if (btn.action === 'toggleChat') {
          chatMode = !chatMode;
          if (callbacks.onChat) {
            callbacks.onChat({ mode: chatMode ? 'open' : 'close' });
          }
        } else if (callbacks.onAction) {
          callbacks.onAction(btn.action, {});
        }
      });

      document.body.appendChild(button);
    });

    // Add pinch-to-zoom support
    var lastPinchDistance = 0;

    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart);
      canvas.addEventListener('touchmove', handleTouchMove);
      canvas.addEventListener('touchend', handleTouchEnd);
    }

    var touchStartTime = 0;
    var touchStartX = 0;
    var touchStartY = 0;
    var lastTouchX = 0;
    var lastTouchY = 0;
    var isTouchDragging = false;
    var wasPinching = false;

    function handleTouchStart(e) {
      if (e.touches.length === 2) {
        // Two-finger pinch for zoom
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
        wasPinching = true;
        isTouchDragging = false;
      } else if (e.touches.length === 1) {
        // Single touch - track for tap detection and camera orbit
        touchStartTime = Date.now();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        isTouchDragging = false;
        wasPinching = false;
      }
    }

    function handleTouchMove(e) {
      if (e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault();
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (lastPinchDistance > 0) {
          var delta = lastPinchDistance - distance;
          cameraDistance += delta * 0.1;
          cameraDistance = Math.max(5, Math.min(50, cameraDistance));
        }

        lastPinchDistance = distance;
        wasPinching = true;
      } else if (e.touches.length === 1 && !wasPinching) {
        // Single-finger drag for camera orbit
        var touchX = e.touches[0].clientX;
        var touchY = e.touches[0].clientY;
        var totalDx = touchX - touchStartX;
        var totalDy = touchY - touchStartY;
        var totalMoved = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

        if (totalMoved > 10) {
          // Past drag threshold — orbit camera
          isTouchDragging = true;
          var deltaX = touchX - lastTouchX;
          cameraOrbitAngle -= deltaX * 0.008;
        }

        lastTouchX = touchX;
        lastTouchY = touchY;
      }
    }

    function handleTouchEnd(e) {
      if (e.touches.length < 2) {
        lastPinchDistance = 0;
      }

      // Tap-to-interact detection (not pinch, not drag)
      if (!wasPinching && !isTouchDragging && e.changedTouches.length === 1 && touchStartTime > 0) {
        var touchEndTime = Date.now();
        var touchEndX = e.changedTouches[0].clientX;
        var touchEndY = e.changedTouches[0].clientY;

        var timeDiff = touchEndTime - touchStartTime;
        var dx = touchEndX - touchStartX;
        var dy = touchEndY - touchStartY;
        var distanceMoved = Math.sqrt(dx * dx + dy * dy);

        // Tap if quick (< 300ms) and minimal movement (< 10px)
        if (timeDiff < 300 && distanceMoved < 10) {
          var rect = canvas.getBoundingClientRect();
          var x = ((touchEndX - rect.left) / rect.width) * 2 - 1;
          var y = -((touchEndY - rect.top) / rect.height) * 2 + 1;

          if (callbacks.onAction) {
            callbacks.onAction('click', { x: x, y: y, screenX: touchEndX, screenY: touchEndY });
          }
        }
      }

      isTouchDragging = false;
      wasPinching = false;
    }
  }

  /**
   * Get movement delta from keyboard state
   * @returns {object} - {x, y, z}
   */
  function getMovementDelta() {
    if (chatMode) return { x: 0, y: 0, z: 0 };

    var delta = { x: 0, y: 0, z: 0 };

    // WASD / Arrow keys
    if (keys['w'] || keys['arrowup']) delta.z -= 1;
    if (keys['s'] || keys['arrowdown']) delta.z += 1;
    if (keys['a'] || keys['arrowleft']) delta.x -= 1;
    if (keys['d'] || keys['arrowright']) delta.x += 1;

    // Normalize diagonal movement
    if (delta.x !== 0 && delta.z !== 0) {
      var length = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
      delta.x /= length;
      delta.z /= length;
    }

    return delta;
  }

  /**
   * Detect platform
   * @returns {string} - 'desktop', 'phone', 'vr', 'ar'
   */
  function getPlatform() {
    if (typeof navigator === 'undefined') return 'desktop';

    var ua = navigator.userAgent.toLowerCase();

    // Check WebXR
    if (navigator.xr) {
      // Note: Actual VR/AR detection requires async check, this is just availability
      return 'desktop'; // Default, can be upgraded to VR/AR when session starts
    }

    // Check mobile
    if (/mobile|android|iphone|ipad|tablet/.test(ua)) {
      return 'phone';
    }

    return 'desktop';
  }

  /**
   * Create move protocol message
   * @param {string} from - Player ID
   * @param {object} delta - Movement delta {x, y, z}
   * @param {object} currentPosition - Current position {x, y, z}
   * @param {string} zone - Current zone
   * @returns {object} - Protocol message
   */
  function createMoveMessage(from, delta, currentPosition, zone) {
    var baseSpeed = 0.3; // Units per frame
    var speed = (keys['shift']) ? baseSpeed * 2.0 : baseSpeed; // Sprint with Shift
    var newPosition = {
      x: currentPosition.x + delta.x * speed,
      y: currentPosition.y + delta.y * speed,
      z: currentPosition.z + delta.z * speed
    };

    return {
      type: 'move',
      from: from,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substr(2, 9),
      payload: {
        position: newPosition,
        zone: zone
      }
    };
  }

  // Export public API
  exports.initInput = initInput;
  exports.getMovementDelta = getMovementDelta;
  exports.getPlatform = getPlatform;
  exports.createMoveMessage = createMoveMessage;
  exports.getMouseNDC = getMouseNDC;
  exports.getCameraDistance = getCameraDistance;
  exports.getCameraOrbit = getCameraOrbit;

})(typeof module !== 'undefined' ? module.exports : (window.Input = {}));
