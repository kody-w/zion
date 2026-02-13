(function(exports) {
  // HUD overlay management
  let hudContainer = null;
  let chatPanel = null;
  let playerInfoPanel = null;
  let minimapCanvas = null;
  let minimapCtx = null;
  let zoneLabel = null;
  let nearbyPlayersList = null;
  let chatInput = null;
  let notificationContainer = null;

  /**
   * Initialize HUD
   * @param {HTMLElement} container - Parent container for HUD
   */
  function initHUD(container) {
    if (typeof document === 'undefined') {
      console.warn('HUD requires browser environment');
      return;
    }

    hudContainer = container;

    // Create main HUD overlay
    const hudOverlay = document.createElement('div');
    hudOverlay.id = 'zion-hud';
    hudOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: Arial, sans-serif;
      color: white;
      z-index: 100;
    `;

    // Chat panel (bottom-left)
    chatPanel = document.createElement('div');
    chatPanel.id = 'chat-panel';
    chatPanel.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      width: 350px;
      height: 200px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      padding: 10px;
      overflow-y: auto;
      pointer-events: auto;
      font-size: 14px;
    `;
    hudOverlay.appendChild(chatPanel);

    // Player info panel (top-left)
    playerInfoPanel = document.createElement('div');
    playerInfoPanel.id = 'player-info';
    playerInfoPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      padding: 15px;
      min-width: 200px;
      pointer-events: auto;
    `;
    hudOverlay.appendChild(playerInfoPanel);

    // Zone label (top-center)
    zoneLabel = document.createElement('div');
    zoneLabel.id = 'zone-label';
    zoneLabel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
    `;
    hudOverlay.appendChild(zoneLabel);

    // Minimap (top-right)
    const minimapContainer = document.createElement('div');
    minimapContainer.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      padding: 10px;
      pointer-events: auto;
    `;

    minimapCanvas = document.createElement('canvas');
    minimapCanvas.width = 150;
    minimapCanvas.height = 150;
    minimapCanvas.style.cssText = `
      display: block;
      border-radius: 4px;
    `;
    minimapCtx = minimapCanvas.getContext('2d');
    minimapContainer.appendChild(minimapCanvas);
    hudOverlay.appendChild(minimapContainer);

    // Nearby players list (right side)
    nearbyPlayersList = document.createElement('div');
    nearbyPlayersList.id = 'nearby-players';
    nearbyPlayersList.style.cssText = `
      position: absolute;
      top: 200px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      padding: 10px;
      min-width: 150px;
      max-height: 300px;
      overflow-y: auto;
      pointer-events: auto;
    `;
    nearbyPlayersList.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px;">Nearby Players</div>';
    hudOverlay.appendChild(nearbyPlayersList);

    // Notification container (top-center, below zone label)
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notifications';
    notificationContainer.style.cssText = `
      position: absolute;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: 400px;
      pointer-events: none;
    `;
    hudOverlay.appendChild(notificationContainer);

    container.appendChild(hudOverlay);

    console.log('HUD initialized');
  }

  /**
   * Update chat panel
   * @param {Array} messages - Array of {user, text, timestamp}
   */
  function updateChat(messages) {
    if (!chatPanel) return;

    chatPanel.innerHTML = '';

    messages.slice(-10).forEach(msg => {
      const msgEl = document.createElement('div');
      msgEl.style.cssText = `
        margin-bottom: 5px;
        padding: 3px;
        border-radius: 3px;
      `;

      const time = new Date(msg.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      msgEl.innerHTML = `
        <span style="color: #888; font-size: 11px;">${time}</span>
        <span style="color: #4af; font-weight: bold;">${msg.user}:</span>
        <span>${msg.text}</span>
      `;

      chatPanel.appendChild(msgEl);
    });

    // Auto-scroll to bottom
    chatPanel.scrollTop = chatPanel.scrollHeight;
  }

  /**
   * Update player info panel
   * @param {object} player - {name, spark, zone, warmth}
   */
  function updatePlayerInfo(player) {
    if (!playerInfoPanel) return;

    playerInfoPanel.innerHTML = `
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${player.name || 'Unknown'}</div>
      <div style="margin-bottom: 3px;">
        <span style="color: #ffa500;">Spark:</span> ${player.spark || 0}
      </div>
      <div style="margin-bottom: 3px;">
        <span style="color: #4af;">Zone:</span> ${player.zone || 'Unknown'}
      </div>
      <div style="margin-bottom: 3px;">
        <span style="color: #ff6347;">Warmth:</span> ${player.warmth || 100}%
      </div>
    `;
  }

  /**
   * Update minimap
   * @param {Array} players - Array of {id, position, isLocal}
   * @param {string} currentZone - Current zone name
   */
  function updateMinimap(players, currentZone) {
    if (!minimapCtx) return;

    const width = minimapCanvas.width;
    const height = minimapCanvas.height;

    // Clear canvas
    minimapCtx.fillStyle = '#1a1a2e';
    minimapCtx.fillRect(0, 0, width, height);

    // Draw zone boundary
    minimapCtx.strokeStyle = '#444';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(10, 10, width - 20, height - 20);

    // Draw zone name
    minimapCtx.fillStyle = '#888';
    minimapCtx.font = 'bold 10px Arial';
    minimapCtx.textAlign = 'center';
    minimapCtx.fillText(currentZone || '', width / 2, 20);

    // Draw players
    const mapScale = (width - 40) / 100; // Assume 100 unit zone
    const centerX = width / 2;
    const centerY = height / 2;

    players.forEach(player => {
      const x = centerX + (player.position.x * mapScale);
      const y = centerY + (player.position.z * mapScale);

      // Draw player dot
      minimapCtx.beginPath();
      minimapCtx.arc(x, y, player.isLocal ? 5 : 3, 0, Math.PI * 2);
      minimapCtx.fillStyle = player.isLocal ? '#4af' : '#4f4';
      minimapCtx.fill();
    });
  }

  /**
   * Update zone label
   * @param {string} zoneName
   */
  function updateZoneLabel(zoneName) {
    if (!zoneLabel) return;
    zoneLabel.textContent = zoneName || 'Unknown Zone';
  }

  /**
   * Update nearby players list
   * @param {Array} players - Array of {id, name, distance}
   */
  function updateNearbyPlayers(players) {
    if (!nearbyPlayersList) return;

    // Keep header, remove old entries
    nearbyPlayersList.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px;">Nearby Players</div>';

    if (players.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'color: #888; font-size: 12px; font-style: italic;';
      emptyMsg.textContent = 'No players nearby';
      nearbyPlayersList.appendChild(emptyMsg);
      return;
    }

    players.slice(0, 10).forEach(player => {
      const playerEl = document.createElement('div');
      playerEl.style.cssText = `
        padding: 5px;
        margin-bottom: 3px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        font-size: 13px;
      `;

      const distanceStr = player.distance ? `(${player.distance.toFixed(1)}m)` : '';
      playerEl.innerHTML = `
        <span style="color: #4f4;">${player.name || player.id}</span>
        <span style="color: #888; font-size: 11px; margin-left: 5px;">${distanceStr}</span>
      `;

      nearbyPlayersList.appendChild(playerEl);
    });
  }

  /**
   * Show break reminder
   * @param {number} minutes - Minutes played
   */
  function showBreakReminder(minutes) {
    showNotification(
      `You've been playing for ${minutes} minutes. Consider taking a break!`,
      'info'
    );
  }

  /**
   * Add chat input field
   * @param {function} onSubmit - Callback when message is submitted
   */
  function addChatInput(onSubmit) {
    if (!hudContainer || chatInput) return;
    if (typeof document === 'undefined') return;

    chatInput = document.createElement('input');
    chatInput.type = 'text';
    chatInput.placeholder = 'Press Enter to chat...';
    chatInput.style.cssText = `
      position: absolute;
      bottom: 230px;
      left: 20px;
      width: 330px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #4af;
      border-radius: 4px;
      color: white;
      font-size: 14px;
      pointer-events: auto;
      display: none;
    `;

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = chatInput.value.trim();
        if (text && onSubmit) {
          onSubmit(text);
        }
        chatInput.value = '';
        chatInput.style.display = 'none';
        e.preventDefault();
      } else if (e.key === 'Escape') {
        chatInput.value = '';
        chatInput.style.display = 'none';
        e.preventDefault();
      }
    });

    document.querySelector('#zion-hud').appendChild(chatInput);
  }

  /**
   * Show chat input (called when chat mode activated)
   */
  function showChatInput() {
    if (chatInput) {
      chatInput.style.display = 'block';
      chatInput.focus();
    }
  }

  /**
   * Hide chat input
   */
  function hideChatInput() {
    if (chatInput) {
      chatInput.style.display = 'none';
      chatInput.value = '';
    }
  }

  /**
   * Show notification
   * @param {string} text - Notification text
   * @param {string} type - 'info', 'success', 'warning', 'error'
   */
  function showNotification(text, type = 'info') {
    if (!notificationContainer) return;
    if (typeof document === 'undefined') return;

    const colors = {
      info: '#4af',
      success: '#4f4',
      warning: '#fa4',
      error: '#f44'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      border-left: 4px solid ${colors[type] || colors.info};
      border-radius: 4px;
      padding: 12px 15px;
      margin-bottom: 10px;
      animation: slideIn 0.3s ease-out;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    notification.textContent = text;

    notificationContainer.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }

  // Add CSS animations
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-20px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Export public API
  exports.initHUD = initHUD;
  exports.updateChat = updateChat;
  exports.updatePlayerInfo = updatePlayerInfo;
  exports.updateMinimap = updateMinimap;
  exports.updateZoneLabel = updateZoneLabel;
  exports.updateNearbyPlayers = updateNearbyPlayers;
  exports.showBreakReminder = showBreakReminder;
  exports.addChatInput = addChatInput;
  exports.showChatInput = showChatInput;
  exports.hideChatInput = hideChatInput;
  exports.showNotification = showNotification;

})(typeof module !== 'undefined' ? module.exports : (window.HUD = {}));
