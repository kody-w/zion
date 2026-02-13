(function(exports) {
  // Input handling and protocol message generation
  let callbacks = {};
  let keys = {};
  let chatMode = false;
  let buildMode = false;
  let canvas = null;
  let mouseNDC = { x: 0, y: 0 }; // Normalized device coordinates

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
    }

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
            callbacks.onAction('toggleLoreBook', {});
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

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

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

    const rect = canvas.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Get current mouse position in NDC
   */
  function getMouseNDC() {
    return mouseNDC;
  }

  /**
   * Initialize touch controls (virtual joystick)
   */
  function initTouchControls() {
    if (typeof document === 'undefined') return;

    // Create virtual joystick (left side)
    const joystick = document.createElement('div');
    joystick.id = 'virtual-joystick';
    joystick.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      border: 2px solid rgba(255,255,255,0.5);
      touch-action: none;
      z-index: 1000;
    `;

    const stick = document.createElement('div');
    stick.style.cssText = `
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255,255,255,0.7);
      top: 35px;
      left: 35px;
      touch-action: none;
    `;
    joystick.appendChild(stick);
    document.body.appendChild(joystick);

    // Joystick touch handler
    let touchStartPos = { x: 0, y: 0 };
    let isDragging = false;

    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDragging = true;
      const touch = e.touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };
    });

    joystick.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartPos.x;
      const deltaY = touch.clientY - touchStartPos.y;

      // Limit stick movement
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 35;
      const normalizedDelta = {
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

    // Create action buttons (right side)
    const actionButton = document.createElement('button');
    actionButton.textContent = 'E';
    actionButton.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(100,200,100,0.7);
      border: 2px solid rgba(255,255,255,0.5);
      color: white;
      font-size: 24px;
      font-weight: bold;
      z-index: 1000;
    `;
    actionButton.addEventListener('click', () => {
      if (callbacks.onAction) {
        callbacks.onAction('interact', {});
      }
    });
    document.body.appendChild(actionButton);

    const buildButton = document.createElement('button');
    buildButton.textContent = 'B';
    buildButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(200,100,100,0.7);
      border: 2px solid rgba(255,255,255,0.5);
      color: white;
      font-size: 24px;
      font-weight: bold;
      z-index: 1000;
    `;
    buildButton.addEventListener('click', () => {
      buildMode = !buildMode;
      if (callbacks.onBuild) {
        callbacks.onBuild({ mode: buildMode });
      }
    });
    document.body.appendChild(buildButton);
  }

  /**
   * Get movement delta from keyboard state
   * @returns {object} - {x, y, z}
   */
  function getMovementDelta() {
    if (chatMode) return { x: 0, y: 0, z: 0 };

    const delta = { x: 0, y: 0, z: 0 };

    // WASD / Arrow keys
    if (keys['w'] || keys['arrowup']) delta.z -= 1;
    if (keys['s'] || keys['arrowdown']) delta.z += 1;
    if (keys['a'] || keys['arrowleft']) delta.x -= 1;
    if (keys['d'] || keys['arrowright']) delta.x += 1;

    // Normalize diagonal movement
    if (delta.x !== 0 && delta.z !== 0) {
      const length = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
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

    const ua = navigator.userAgent.toLowerCase();

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
    const newPosition = {
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

})(typeof module !== 'undefined' ? module.exports : (window.Input = {}));
