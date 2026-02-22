// xr.js
(function(exports) {
  // WebXR integration for VR/AR
  let xrSession = null;
  let xrReferenceSpace = null;
  let lastPosition = { x: 0, y: 0, z: 0 };
  let lastCheckTime = 0;

  /**
   * Initialize XR and check capabilities
   * @returns {Promise<object>} - {vrSupported, arSupported}
   */
  async function initXR() {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      console.warn('WebXR not available');
      return { vrSupported: false, arSupported: false };
    }

    try {
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar');

      console.log('XR capabilities:', { vrSupported, arSupported });

      return { vrSupported, arSupported };
    } catch (err) {
      console.error('Error checking XR support:', err);
      return { vrSupported: false, arSupported: false };
    }
  }

  /**
   * Enter VR mode
   * @param {THREE.WebGLRenderer} renderer - Three.js renderer
   * @param {THREE.Scene} scene - Three.js scene
   * @param {THREE.Camera} camera - Three.js camera
   * @returns {Promise<void>}
   */
  async function enterVR(renderer, scene, camera) {
    if (!navigator.xr) {
      throw new Error('WebXR not available');
    }

    if (!renderer || !scene || !camera) {
      throw new Error('Renderer, scene, and camera required');
    }

    try {
      // Request VR session
      xrSession = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor']
      });

      // Enable XR on renderer
      await renderer.xr.setSession(xrSession);
      renderer.xr.enabled = true;

      xrSession.addEventListener('end', () => {
        xrSession = null;
        renderer.xr.enabled = false;
        console.log('VR session ended');
      });

      console.log('Entered VR mode');

      // Set up reference space
      xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');

      // Start render loop
      renderer.setAnimationLoop((timestamp, frame) => {
        if (frame) {
          renderer.render(scene, camera);
        }
      });

    } catch (err) {
      console.error('Failed to enter VR:', err);
      throw err;
    }
  }

  /**
   * Enter AR mode
   * @param {THREE.WebGLRenderer} renderer - Three.js renderer
   * @param {THREE.Scene} scene - Three.js scene
   * @param {THREE.Camera} camera - Three.js camera
   * @returns {Promise<void>}
   */
  async function enterAR(renderer, scene, camera) {
    if (!navigator.xr) {
      throw new Error('WebXR not available');
    }

    if (!renderer || !scene || !camera) {
      throw new Error('Renderer, scene, and camera required');
    }

    // Show safety warning first
    const proceed = await showSafetyWarning();
    if (!proceed) {
      console.log('AR session cancelled by user');
      return;
    }

    try {
      // Request AR session
      xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });

      // Enable XR on renderer
      await renderer.xr.setSession(xrSession);
      renderer.xr.enabled = true;

      xrSession.addEventListener('end', () => {
        xrSession = null;
        renderer.xr.enabled = false;
        console.log('AR session ended');
      });

      console.log('Entered AR mode');

      // Set up reference space
      xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');

      // Make scene background transparent for AR
      scene.background = null;

      // Start render loop with speed checking
      renderer.setAnimationLoop((timestamp, frame) => {
        if (frame) {
          // Check speed periodically
          if (timestamp - lastCheckTime > 1000) { // Every second
            const pose = frame.getViewerPose(xrReferenceSpace);
            if (pose) {
              const position = pose.transform.position;
              const deltaTime = (timestamp - lastCheckTime) / 1000;
              const speedCheck = checkSpeed(position, lastPosition, deltaTime);

              if (!speedCheck.safe) {
                console.warn(`Speed too high: ${speedCheck.speed.toFixed(1)} km/h. Pausing AR.`);
                // Pause rendering or show warning
                showSpeedWarning(speedCheck.speed);
                return; // Skip rendering this frame
              }

              lastPosition = { x: position.x, y: position.y, z: position.z };
              lastCheckTime = timestamp;
            }
          }

          renderer.render(scene, camera);
        }
      });

    } catch (err) {
      console.error('Failed to enter AR:', err);
      throw err;
    }
  }

  /**
   * Exit XR mode
   */
  async function exitXR() {
    if (xrSession) {
      await xrSession.end();
      xrSession = null;
      xrReferenceSpace = null;
      console.log('Exited XR mode');
    }
  }

  /**
   * Check movement speed (safety feature for AR)
   * @param {object} position - Current position {x, y, z}
   * @param {object} lastPosition - Previous position {x, y, z}
   * @param {number} deltaTime - Time elapsed in seconds
   * @returns {object} - {safe: boolean, speed: number (km/h)}
   */
  function checkSpeed(position, lastPosition, deltaTime) {
    if (!position || !lastPosition || deltaTime === 0) {
      return { safe: true, speed: 0 };
    }

    const dx = position.x - lastPosition.x;
    const dy = position.y - lastPosition.y;
    const dz = position.z - lastPosition.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const speedMetersPerSecond = distance / deltaTime;
    const speedKmPerHour = speedMetersPerSecond * 3.6;

    const MAX_SAFE_SPEED = 25; // km/h (walking/jogging speed)

    return {
      safe: speedKmPerHour <= MAX_SAFE_SPEED,
      speed: speedKmPerHour
    };
  }

  /**
   * Show safety warning for AR (required per 8.6)
   * @returns {Promise<boolean>} - User accepted or not
   */
  function showSafetyWarning() {
    if (typeof document === 'undefined') {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        max-width: 500px;
        padding: 30px;
        background: rgba(20, 20, 20, 0.95);
        border-radius: 12px;
        border: 2px solid #ff6347;
        text-align: center;
      `;

      content.innerHTML = `
        <h2 style="color: #ff6347; margin-bottom: 20px;">AR Safety Warning</h2>
        <p style="margin-bottom: 15px; line-height: 1.6;">
          Please be aware of your surroundings while using AR mode.
        </p>
        <ul style="text-align: left; margin-bottom: 20px; line-height: 1.8;">
          <li>Do not use AR while driving or operating vehicles</li>
          <li>Stay aware of obstacles, traffic, and other hazards</li>
          <li>AR will pause automatically if moving faster than 25 km/h</li>
          <li>Use in safe, well-lit areas</li>
          <li>Take breaks if you feel disoriented</li>
        </ul>
        <p style="margin-bottom: 25px; font-weight: bold; color: #ffa500;">
          By continuing, you acknowledge these safety guidelines.
        </p>
        <div>
          <button id="ar-accept" style="
            padding: 12px 30px;
            margin: 0 10px;
            font-size: 16px;
            border: none;
            border-radius: 6px;
            background: #4af;
            color: white;
            cursor: pointer;
            font-weight: bold;
          ">I Understand</button>
          <button id="ar-cancel" style="
            padding: 12px 30px;
            margin: 0 10px;
            font-size: 16px;
            border: none;
            border-radius: 6px;
            background: #666;
            color: white;
            cursor: pointer;
          ">Cancel</button>
        </div>
      `;

      overlay.appendChild(content);
      document.body.appendChild(overlay);

      document.getElementById('ar-accept').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });

      document.getElementById('ar-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
    });
  }

  /**
   * Show speed warning overlay
   * @param {number} speed - Current speed in km/h
   */
  function showSpeedWarning(speed) {
    if (typeof document === 'undefined') return;

    let warningEl = document.getElementById('ar-speed-warning');
    if (!warningEl) {
      warningEl = document.createElement('div');
      warningEl.id = 'ar-speed-warning';
      warningEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 30px;
        border-radius: 12px;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        z-index: 10001;
        border: 4px solid white;
      `;
      document.body.appendChild(warningEl);
    }

    warningEl.innerHTML = `
      <div style="margin-bottom: 15px;">SPEED TOO HIGH</div>
      <div style="font-size: 48px; margin-bottom: 15px;">${speed.toFixed(0)} km/h</div>
      <div style="font-size: 18px;">AR paused for safety</div>
      <div style="font-size: 14px; margin-top: 10px;">Slow down to resume</div>
    `;

    warningEl.style.display = 'block';

    // Hide after a few seconds if speed normalized
    setTimeout(() => {
      if (warningEl) {
        warningEl.style.display = 'none';
      }
    }, 3000);
  }

  // Export public API
  exports.initXR = initXR;
  exports.enterVR = enterVR;
  exports.enterAR = enterAR;
  exports.exitXR = exitXR;
  exports.checkSpeed = checkSpeed;
  exports.showSafetyWarning = showSafetyWarning;

})(typeof module !== 'undefined' ? module.exports : (window.XR = {}));
