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
  let federationPanel = null;

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
    minimapCanvas.width = 200;
    minimapCanvas.height = 200;
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

    // Federation status panel (bottom-right)
    federationPanel = document.createElement('div');
    federationPanel.id = 'federation-panel';
    federationPanel.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      padding: 10px;
      min-width: 200px;
      max-height: 250px;
      overflow-y: auto;
      pointer-events: auto;
      border: 2px solid rgba(100, 100, 255, 0.5);
    `;
    federationPanel.innerHTML = '<div style="font-weight: bold; margin-bottom: 5px; color: #88f;">Federation</div>';
    hudOverlay.appendChild(federationPanel);

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
   * Add a single chat message to the chat panel
   * @param {string} user - Sender name
   * @param {string} text - Message text
   */
  function addChatMessage(user, text) {
    if (!chatPanel || typeof document === 'undefined') return;

    var msgEl = document.createElement('div');
    msgEl.style.cssText = 'margin-bottom:5px;padding:3px;border-radius:3px;';

    var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgEl.innerHTML =
      '<span style="color:#888;font-size:11px;">' + time + '</span> ' +
      '<span style="color:#4af;font-weight:bold;">' + (user || 'Unknown') + ':</span> ' +
      '<span>' + (text || '') + '</span>';

    chatPanel.appendChild(msgEl);
    chatPanel.scrollTop = chatPanel.scrollHeight;

    // Keep last 50 messages max
    while (chatPanel.children.length > 50) {
      chatPanel.removeChild(chatPanel.firstChild);
    }
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
        <span style="color: #ff6347;">Warmth:</span> ${Math.round(player.warmth || 0)}%
      </div>
    `;
  }

  /**
   * Update minimap
   * @param {Array} players - Array of {id, position, isLocal}
   * @param {string} currentZone - Current zone name
   */
  // World zone coordinates for minimap
  var MINIMAP_ZONES = {
    nexus:      { cx: 0,    cz: 0,    radius: 60, color: '#6688cc', label: 'Nexus' },
    gardens:    { cx: 200,  cz: 30,   radius: 80, color: '#44aa44', label: 'Gardens' },
    athenaeum:  { cx: 100,  cz: -220, radius: 60, color: '#8866aa', label: 'Athenaeum' },
    studio:     { cx: -200, cz: -100, radius: 60, color: '#cc6688', label: 'Studio' },
    wilds:      { cx: -30,  cz: 260,  radius: 90, color: '#228844', label: 'Wilds' },
    agora:      { cx: -190, cz: 120,  radius: 55, color: '#cc8844', label: 'Agora' },
    commons:    { cx: 170,  cz: 190,  radius: 55, color: '#88aa44', label: 'Commons' },
    arena:      { cx: 0,    cz: -240, radius: 55, color: '#cc4444', label: 'Arena' }
  };

  function updateMinimap(players, currentZone) {
    if (!minimapCtx) return;

    var w = minimapCanvas.width;
    var h = minimapCanvas.height;

    // Clear with dark background
    minimapCtx.fillStyle = '#0a0e1a';
    minimapCtx.fillRect(0, 0, w, h);

    // World bounds: roughly -300 to 300 on both axes
    var worldMin = -320, worldMax = 320;
    var worldRange = worldMax - worldMin;
    var margin = 8;

    function worldToMap(wx, wz) {
      return {
        x: margin + ((wx - worldMin) / worldRange) * (w - margin * 2),
        y: margin + ((wz - worldMin) / worldRange) * (h - margin * 2)
      };
    }

    // Draw paths between zones (nexus to each)
    minimapCtx.strokeStyle = 'rgba(255,255,255,0.15)';
    minimapCtx.lineWidth = 1;
    var nexusPos = worldToMap(0, 0);
    for (var zId in MINIMAP_ZONES) {
      if (zId === 'nexus') continue;
      var z = MINIMAP_ZONES[zId];
      var zPos = worldToMap(z.cx, z.cz);
      minimapCtx.beginPath();
      minimapCtx.moveTo(nexusPos.x, nexusPos.y);
      minimapCtx.lineTo(zPos.x, zPos.y);
      minimapCtx.stroke();
    }

    // Draw zone circles
    for (var zoneId in MINIMAP_ZONES) {
      var zone = MINIMAP_ZONES[zoneId];
      var pos = worldToMap(zone.cx, zone.cz);
      var r = (zone.radius / worldRange) * (w - margin * 2);

      // Zone circle fill
      minimapCtx.globalAlpha = zoneId === currentZone ? 0.4 : 0.2;
      minimapCtx.fillStyle = zone.color;
      minimapCtx.beginPath();
      minimapCtx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      minimapCtx.fill();

      // Zone circle border
      minimapCtx.globalAlpha = zoneId === currentZone ? 0.9 : 0.4;
      minimapCtx.strokeStyle = zone.color;
      minimapCtx.lineWidth = zoneId === currentZone ? 2 : 1;
      minimapCtx.beginPath();
      minimapCtx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      minimapCtx.stroke();

      // Zone label
      minimapCtx.globalAlpha = zoneId === currentZone ? 1.0 : 0.5;
      minimapCtx.fillStyle = '#fff';
      minimapCtx.font = (zoneId === currentZone ? 'bold ' : '') + '8px Arial';
      minimapCtx.textAlign = 'center';
      minimapCtx.fillText(zone.label, pos.x, pos.y + 3);
    }

    minimapCtx.globalAlpha = 1.0;

    // Draw players
    players.forEach(function(player) {
      var pp = worldToMap(player.position.x, player.position.z);

      if (player.isLocal) {
        // Local player — larger bright gold dot with white border
        minimapCtx.fillStyle = '#FFD700';
        minimapCtx.beginPath();
        minimapCtx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
        minimapCtx.fill();
        // White border
        minimapCtx.strokeStyle = '#fff';
        minimapCtx.lineWidth = 1.5;
        minimapCtx.beginPath();
        minimapCtx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
        minimapCtx.stroke();
        // Add subtle glow
        minimapCtx.shadowBlur = 8;
        minimapCtx.shadowColor = '#FFD700';
        minimapCtx.fillStyle = '#FFD700';
        minimapCtx.beginPath();
        minimapCtx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
        minimapCtx.fill();
        minimapCtx.shadowBlur = 0;
      } else {
        // Other players — smaller green dots
        minimapCtx.fillStyle = '#44ff44';
        minimapCtx.beginPath();
        minimapCtx.arc(pp.x, pp.y, 2, 0, Math.PI * 2);
        minimapCtx.fill();
      }
    });

    // Draw border
    minimapCtx.strokeStyle = 'rgba(255,255,255,0.3)';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(0, 0, w, h);
  }

  /**
   * Update zone label
   * @param {string} zoneName
   */
  var ZONE_DISPLAY_NAMES = {
    nexus: 'The Nexus',
    gardens: 'The Living Gardens',
    athenaeum: 'The Athenaeum',
    studio: 'The Studio',
    wilds: 'The Wilds',
    agora: 'The Agora',
    commons: 'The Commons',
    arena: 'The Arena'
  };

  function updateZoneLabel(zoneName) {
    if (!zoneLabel) return;
    var display = ZONE_DISPLAY_NAMES[zoneName] || zoneName || 'Unknown Zone';
    zoneLabel.innerHTML = '<div style="font-size:18px;font-weight:bold;">' + display + '</div>';
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
    notification.className = 'notification';
    notification.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      border-left: 4px solid ${colors[type] || colors.info};
      border-radius: 4px;
      padding: 12px 15px;
      margin-bottom: 10px;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    notification.textContent = text;

    notificationContainer.appendChild(notification);

    // Add visible class after a frame for animation
    requestAnimationFrame(function() {
      notification.classList.add('visible');
    });

    // Auto-remove after 5 seconds
    setTimeout(function() {
      notification.classList.remove('visible');
      setTimeout(function() {
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

  // ========================================================================
  // ACTION TOOLBAR
  // ========================================================================

  var toolbarEl = null;
  var coordsEl = null;
  var weatherEl = null;
  var timeEl = null;

  function initToolbar() {
    if (typeof document === 'undefined') return;
    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    // Bottom toolbar with action buttons
    toolbarEl = document.createElement('div');
    toolbarEl.id = 'action-toolbar';
    toolbarEl.style.cssText = 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto;';

    var actions = [
      { key: 'E', label: 'Interact', color: '#44aa66' },
      { key: 'B', label: 'Build', color: '#aa6644' },
      { key: 'Enter', label: 'Chat', color: '#4488cc' },
      { key: 'Shift', label: 'Sprint', color: '#cc8844' }
    ];

    actions.forEach(function(action) {
      var btn = document.createElement('div');
      btn.style.cssText = 'background:rgba(0,0,0,0.7);border:1px solid ' + action.color + ';border-radius:6px;padding:6px 12px;text-align:center;font-size:11px;min-width:50px;';
      btn.innerHTML = '<div style="font-weight:bold;color:' + action.color + ';font-size:14px;">' + action.key + '</div><div style="color:#aaa;margin-top:2px;">' + action.label + '</div>';
      toolbarEl.appendChild(btn);
    });
    hud.appendChild(toolbarEl);

    // Coordinates display (bottom-left above chat)
    coordsEl = document.createElement('div');
    coordsEl.id = 'coords-display';
    coordsEl.style.cssText = 'position:absolute;bottom:240px;left:20px;background:rgba(0,0,0,0.5);border-radius:4px;padding:4px 8px;font-size:11px;color:#888;font-family:monospace;pointer-events:none;';
    hud.appendChild(coordsEl);

    // Weather and time display (top-right, below minimap)
    var infoPanel = document.createElement('div');
    infoPanel.style.cssText = 'position:absolute;top:260px;right:20px;background:rgba(0,0,0,0.6);border-radius:8px;padding:10px;min-width:120px;font-size:12px;pointer-events:none;';

    timeEl = document.createElement('div');
    timeEl.style.cssText = 'margin-bottom:4px;';
    infoPanel.appendChild(timeEl);

    weatherEl = document.createElement('div');
    weatherEl.style.cssText = 'color:#aaa;';
    infoPanel.appendChild(weatherEl);

    hud.appendChild(infoPanel);
  }

  function updateCoords(position) {
    if (!coordsEl || !position) return;
    coordsEl.textContent = 'X: ' + Math.round(position.x) + '  Y: ' + Math.round(position.y) + '  Z: ' + Math.round(position.z);
  }

  function updateTimeWeather(worldTime, weather) {
    if (timeEl) {
      var hours = Math.floor(worldTime / 60);
      var mins = Math.floor(worldTime % 60);
      var ampm = hours >= 12 ? 'PM' : 'AM';
      var displayHour = hours % 12 || 12;
      var timeStr = displayHour + ':' + (mins < 10 ? '0' : '') + mins + ' ' + ampm;
      var icon = (hours >= 6 && hours < 18) ? '&#9728;' : '&#9790;'; // sun or moon
      timeEl.innerHTML = icon + ' ' + timeStr;
    }
    if (weatherEl && weather) {
      var weatherIcons = { clear: '&#9728;', cloudy: '&#9729;', rain: '&#127783;', snow: '&#10052;' };
      var icon = weatherIcons[weather] || '';
      weatherEl.innerHTML = icon + ' ' + weather.charAt(0).toUpperCase() + weather.slice(1);
    }
  }

  // ========================================================================
  // NPC INTERACTION DIALOG
  // ========================================================================

  var npcDialogEl = null;
  var npcDialogTimer = null;
  var npcActionCallback = null;
  var npcShopPanel = null;

  // Archetype colors for NPC portraits
  var ARCHETYPE_COLORS_HUD = {
    gardener: '#4CAF50', builder: '#8D6E63', storyteller: '#9C27B0',
    merchant: '#FFD700', explorer: '#00BCD4', teacher: '#2196F3',
    musician: '#FF4081', healer: '#FFFFFF', philosopher: '#3F51B5',
    artist: '#FF9800'
  };

  var ARCHETYPE_ICONS = {
    gardener: '&#127793;', builder: '&#128296;', storyteller: '&#128214;',
    merchant: '&#128176;', explorer: '&#129517;', teacher: '&#127891;',
    musician: '&#127925;', healer: '&#10084;', philosopher: '&#128161;',
    artist: '&#127912;'
  };

  /**
   * Show NPC interaction dialog — a proper panel with portrait, mood, activity, dialogue
   * @param {object} npcData - {name, message, archetype, mood, activity, familiarity, id}
   */
  function showNPCDialog(npcData) {
    if (typeof document === 'undefined') return;
    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    // Remove existing dialog
    hideNPCDialog();

    var color = ARCHETYPE_COLORS_HUD[npcData.archetype] || '#888';
    var icon = ARCHETYPE_ICONS[npcData.archetype] || '';
    var mood = npcData.mood || 'neutral';
    var activity = npcData.activity || '';
    var familiarity = npcData.familiarity || 0;

    // Familiarity label
    var famLabel = 'Stranger';
    if (familiarity > 70) famLabel = 'Good Friend';
    else if (familiarity > 40) famLabel = 'Acquaintance';
    else if (familiarity > 10) famLabel = 'Familiar';

    // Mood emoji
    var moodEmoji = { content: '&#128522;', excited: '&#128516;', contemplative: '&#129300;',
      social: '&#128075;', tired: '&#128564;', happy: '&#128515;', curious: '&#129488;',
      neutral: '&#128528;', focused: '&#128373;', relaxed: '&#128524;' };
    var moodIcon = moodEmoji[mood] || moodEmoji.neutral;

    npcDialogEl = document.createElement('div');
    npcDialogEl.id = 'npc-dialog';
    npcDialogEl.style.cssText = 'position:absolute;bottom:60px;left:50%;transform:translateX(-50%);' +
      'background:rgba(10,14,26,0.92);border:2px solid ' + color + ';border-radius:12px;' +
      'padding:16px 20px;min-width:380px;max-width:480px;pointer-events:auto;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.6);animation:slideIn 0.3s ease-out;';

    // Header row: portrait + name + archetype
    var header = '<div style="display:flex;align-items:center;margin-bottom:10px;">' +
      '<div style="width:48px;height:48px;border-radius:50%;background:' + color + ';' +
      'display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">' + icon + '</div>' +
      '<div style="margin-left:12px;flex:1;">' +
      '<div style="font-size:16px;font-weight:bold;color:#fff;">' + (npcData.name || 'NPC') + '</div>' +
      '<div style="font-size:11px;color:' + color + ';text-transform:capitalize;">' + (npcData.archetype || '') + '</div>' +
      '</div>' +
      '<div style="text-align:right;font-size:11px;color:#888;">' +
      '<div>' + moodIcon + ' ' + mood + '</div>' +
      '<div style="margin-top:2px;">' + famLabel + '</div>' +
      '</div></div>';

    // Activity bar
    var activityBar = '';
    if (activity) {
      activityBar = '<div style="font-size:11px;color:#aaa;margin-bottom:8px;padding:4px 8px;' +
        'background:rgba(255,255,255,0.05);border-radius:4px;font-style:italic;">' +
        '&#128269; ' + activity + '</div>';
    }

    // Dialogue text
    var dialogue = '<div style="font-size:14px;color:#e0e0e0;line-height:1.5;padding:8px 0;' +
      'border-top:1px solid rgba(255,255,255,0.1);">"' + (npcData.message || '...') + '"</div>';

    // Familiarity bar
    var famBar = '<div style="margin-top:8px;display:flex;align-items:center;gap:8px;">' +
      '<span style="font-size:10px;color:#666;">Familiarity</span>' +
      '<div style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">' +
      '<div style="width:' + Math.min(familiarity, 100) + '%;height:100%;background:' + color + ';border-radius:2px;"></div>' +
      '</div>' +
      '<span style="font-size:10px;color:#666;">' + familiarity + '%</span></div>';

    // Action buttons row
    var actionBtns = '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">';
    // Trade button (merchants/traders show prominently)
    var isMerchant = npcData.archetype === 'merchant' || npcData.archetype === 'trader' ||
                     npcData.archetype === 'artisan' || npcData.archetype === 'farmer';
    actionBtns += '<button class="npc-action-btn" data-action="trade" style="flex:1;padding:6px 10px;' +
      'background:rgba(218,165,32,0.15);border:1px solid rgba(218,165,32,0.4);border-radius:6px;' +
      'color:#daa520;font-size:11px;cursor:pointer;transition:background 0.2s;"' +
      (isMerchant ? ' data-primary="true"' : '') + '>&#128176; Trade</button>';
    // Learn button (scholars/sages)
    actionBtns += '<button class="npc-action-btn" data-action="learn" style="flex:1;padding:6px 10px;' +
      'background:rgba(100,149,237,0.15);border:1px solid rgba(100,149,237,0.4);border-radius:6px;' +
      'color:#6495ed;font-size:11px;cursor:pointer;transition:background 0.2s;">&#128218; Learn</button>';
    // Lore button
    actionBtns += '<button class="npc-action-btn" data-action="lore" style="flex:1;padding:6px 10px;' +
      'background:rgba(147,112,219,0.15);border:1px solid rgba(147,112,219,0.4);border-radius:6px;' +
      'color:#9370db;font-size:11px;cursor:pointer;transition:background 0.2s;">&#128220; Lore</button>';
    actionBtns += '</div>';

    // Close hint
    var closeHint = '<div style="text-align:center;font-size:10px;color:#555;margin-top:8px;">Click an action or ESC to close</div>';

    npcDialogEl.innerHTML = header + activityBar + dialogue + famBar + actionBtns + closeHint;

    // Wire up action button clicks
    var buttons = npcDialogEl.querySelectorAll('.npc-action-btn');
    buttons.forEach(function(btn) {
      btn.addEventListener('mouseover', function() { btn.style.background = 'rgba(255,255,255,0.15)'; });
      btn.addEventListener('mouseout', function() { btn.style.background = ''; });
      btn.addEventListener('click', function() {
        var action = btn.getAttribute('data-action');
        if (npcActionCallback) {
          npcActionCallback(action, npcData);
        }
      });
    });

    hud.appendChild(npcDialogEl);

    // Auto-hide after 15 seconds (longer since there are actions now)
    npcDialogTimer = setTimeout(function() { hideNPCDialog(); }, 15000);
  }

  /**
   * Hide NPC interaction dialog
   */
  function hideNPCDialog() {
    if (npcDialogTimer) {
      clearTimeout(npcDialogTimer);
      npcDialogTimer = null;
    }
    if (npcDialogEl && npcDialogEl.parentNode) {
      npcDialogEl.parentNode.removeChild(npcDialogEl);
      npcDialogEl = null;
    }
  }

  /**
   * Set callback for NPC dialog action buttons
   * @param {function} callback - function(action, npcData)
   */
  function setNPCActionCallback(callback) {
    npcActionCallback = callback;
  }

  /**
   * Show NPC shop panel
   * @param {object} npcData - NPC info
   * @param {Array} items - [{id, name, price, description, icon}]
   * @param {number} playerSpark - Player's current Spark balance
   * @param {function} onBuy - callback(itemId)
   */
  function showNPCShop(npcData, items, playerSpark, onBuy) {
    if (typeof document === 'undefined') return;
    hideNPCShop();
    hideNPCDialog();

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    var color = ARCHETYPE_COLORS_HUD[npcData.archetype] || '#888';

    npcShopPanel = document.createElement('div');
    npcShopPanel.id = 'npc-shop-panel';
    npcShopPanel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid ' + color + ';border-radius:12px;' +
      'padding:20px;min-width:400px;max-width:500px;max-height:70vh;pointer-events:auto;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.7);animation:slideIn 0.3s ease-out;overflow-y:auto;';

    var header = '<div style="display:flex;align-items:center;margin-bottom:14px;padding-bottom:10px;' +
      'border-bottom:1px solid rgba(255,255,255,0.1);">' +
      '<div style="font-size:18px;font-weight:bold;color:#fff;flex:1;">&#128176; ' +
      (npcData.name || 'Shop') + '\'s Wares</div>' +
      '<div style="font-size:13px;color:#daa520;">Your Spark: ' + (playerSpark || 0) + '</div></div>';

    var itemList = '';
    if (!items || items.length === 0) {
      itemList = '<div style="text-align:center;color:#888;padding:20px;">No items for sale right now.</div>';
    } else {
      items.forEach(function(item) {
        var canAfford = playerSpark >= item.price;
        itemList += '<div style="display:flex;align-items:center;padding:10px;margin-bottom:6px;' +
          'background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.08);">' +
          '<div style="font-size:24px;margin-right:12px;">' + (item.icon || '&#128230;') + '</div>' +
          '<div style="flex:1;">' +
          '<div style="font-size:13px;color:#fff;">' + item.name + '</div>' +
          '<div style="font-size:11px;color:#888;">' + (item.description || '') + '</div>' +
          '</div>' +
          '<div style="text-align:right;margin-left:12px;">' +
          '<div style="font-size:12px;color:#daa520;margin-bottom:4px;">' + item.price + ' Spark</div>' +
          '<button class="npc-shop-buy-btn" data-item-id="' + item.id + '" style="padding:4px 12px;' +
          'background:' + (canAfford ? 'rgba(218,165,32,0.2)' : 'rgba(100,100,100,0.2)') + ';' +
          'border:1px solid ' + (canAfford ? 'rgba(218,165,32,0.5)' : 'rgba(100,100,100,0.3)') + ';' +
          'border-radius:4px;color:' + (canAfford ? '#daa520' : '#666') + ';font-size:11px;cursor:' +
          (canAfford ? 'pointer' : 'not-allowed') + ';"' +
          (canAfford ? '' : ' disabled') + '>Buy</button>' +
          '</div></div>';
      });
    }

    var closeBtn = '<div style="text-align:center;margin-top:12px;">' +
      '<button id="npc-shop-close" style="padding:6px 24px;background:rgba(255,255,255,0.08);' +
      'border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#aaa;font-size:12px;cursor:pointer;">Close Shop</button></div>';

    npcShopPanel.innerHTML = header + itemList + closeBtn;
    npcShopPanel.className = 'npc-shop-panel';
    hud.appendChild(npcShopPanel);
    requestAnimationFrame(function() {
      npcShopPanel.classList.add('visible');
    });

    // Wire buy buttons
    npcShopPanel.querySelectorAll('.npc-shop-buy-btn').forEach(function(btn) {
      if (!btn.disabled) {
        btn.addEventListener('click', function() {
          var itemId = btn.getAttribute('data-item-id');
          if (onBuy) onBuy(itemId);
        });
      }
    });

    // Wire close button
    var closeEl = npcShopPanel.querySelector('#npc-shop-close');
    if (closeEl) {
      closeEl.addEventListener('click', function() { hideNPCShop(); });
    }
  }

  function hideNPCShop() {
    if (npcShopPanel && npcShopPanel.parentNode) {
      npcShopPanel.classList.remove('visible');
      setTimeout(function() {
        if (npcShopPanel && npcShopPanel.parentNode) {
          npcShopPanel.parentNode.removeChild(npcShopPanel);
          npcShopPanel = null;
        }
      }, 250);
    }
  }

  // ========================================================================
  // NPC DOTS ON MINIMAP
  // ========================================================================

  /**
   * Update minimap with NPC positions
   * @param {Array} npcPositions - [{x, z, archetype}]
   * @param {object} playerPos - {x, z} player position for range check
   */
  function updateMinimapNPCs(npcPositions, playerPos) {
    if (!minimapCtx || !npcPositions) return;

    var w = minimapCanvas.width;
    var h = minimapCanvas.height;
    var worldMin = -320, worldMax = 320;
    var worldRange = worldMax - worldMin;
    var margin = 8;

    function worldToMap(wx, wz) {
      return {
        x: margin + ((wx - worldMin) / worldRange) * (w - margin * 2),
        y: margin + ((wz - worldMin) / worldRange) * (h - margin * 2)
      };
    }

    // Draw NPC dots (small, colored by archetype)
    npcPositions.forEach(function(npc) {
      // Only show NPCs within 250 units of player
      if (playerPos) {
        var dx = npc.x - playerPos.x;
        var dz = npc.z - playerPos.z;
        if (Math.sqrt(dx * dx + dz * dz) > 250) return;
      }
      var pos = worldToMap(npc.x, npc.z);
      var color = ARCHETYPE_COLORS_HUD[npc.archetype] || '#888';
      minimapCtx.fillStyle = color;
      minimapCtx.globalAlpha = 0.7;
      minimapCtx.beginPath();
      minimapCtx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
      minimapCtx.fill();
    });
    minimapCtx.globalAlpha = 1.0;
  }

  // ========================================================================
  // QUEST SYSTEM UI
  // ========================================================================

  var questTrackerEl = null;
  var questLogEl = null;
  var questOfferEl = null;

  /**
   * Initialize quest tracker (top-right, below minimap)
   */
  function initQuestTracker() {
    if (typeof document === 'undefined') return;
    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    questTrackerEl = document.createElement('div');
    questTrackerEl.id = 'quest-tracker';
    questTrackerEl.style.cssText = 'position:absolute;top:470px;right:20px;background:rgba(10,14,26,0.85);' +
      'border-left:3px solid #d4af37;border-radius:8px;padding:12px;min-width:220px;max-width:300px;' +
      'font-size:12px;pointer-events:auto;max-height:250px;overflow-y:auto;';
    questTrackerEl.innerHTML = '<div style="font-weight:bold;color:#d4af37;margin-bottom:6px;font-size:13px;">Active Quests</div>';
    hud.appendChild(questTrackerEl);
  }

  /**
   * Update quest tracker with active quests
   * @param {Array} activeQuests - Array of active quest objects
   */
  function updateQuestTracker(activeQuests) {
    if (!questTrackerEl) return;

    if (activeQuests.length === 0) {
      questTrackerEl.innerHTML = '<div style="font-weight:bold;color:#d4af37;margin-bottom:6px;font-size:13px;">Active Quests</div>' +
        '<div style="color:#888;font-style:italic;font-size:11px;">No active quests</div>';
      return;
    }

    var html = '<div style="font-weight:bold;color:#d4af37;margin-bottom:6px;font-size:13px;">Active Quests</div>';

    activeQuests.forEach(function(quest) {
      var obj = quest.objectives[0]; // Show first objective
      var required = obj.required || obj.count || 1;
      var progress = obj.current + '/' + required;
      var progressPercent = Math.round((obj.current / required) * 100);
      var statusColor = quest.status === 'complete' ? '#4f4' : '#fff';

      html += '<div style="margin-bottom:10px;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px;">' +
        '<div style="font-weight:bold;color:' + statusColor + ';font-size:11px;margin-bottom:3px;">' + quest.title + '</div>' +
        '<div style="color:#aaa;font-size:10px;margin-bottom:4px;">' + progress + '</div>' +
        '<div style="width:100%;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;">' +
        '<div style="width:' + progressPercent + '%;height:100%;background:#d4af37;"></div></div>' +
        '</div>';
    });

    questTrackerEl.innerHTML = html;
  }

  /**
   * Show quest log panel (press J to toggle)
   */
  function showQuestLog(questLog, playerId) {
    if (typeof document === 'undefined') return;
    hideQuestLog(); // Remove existing if any

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    questLogEl = document.createElement('div');
    questLogEl.id = 'quest-log-panel';
    questLogEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #d4af37;border-radius:12px;' +
      'padding:20px;width:600px;max-height:70vh;overflow-y:auto;pointer-events:auto;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.8);z-index:200;';

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<div style="font-size:24px;font-weight:bold;color:#d4af37;">Quest Log</div>' +
      '<div style="cursor:pointer;font-size:20px;color:#888;padding:4px 8px;" onclick="window.HUD.hideQuestLog()">✕</div></div>';

    // Active quests section
    html += '<div style="margin-bottom:20px;">' +
      '<div style="font-size:16px;font-weight:bold;color:#fff;margin-bottom:10px;border-bottom:1px solid #d4af37;padding-bottom:4px;">Active Quests (' + questLog.active.length + '/5)</div>';

    if (questLog.active.length === 0) {
      html += '<div style="color:#888;font-style:italic;font-size:13px;padding:10px;">No active quests. Speak to NPCs to find new quests!</div>';
    } else {
      questLog.active.forEach(function(quest) {
        var obj = quest.objectives[0];
        var required = obj.required || obj.count || 1;
        var progress = obj.current + '/' + required;
        var statusText = quest.status === 'complete' ? '<span style="color:#4f4;">✓ Ready to turn in</span>' : '<span style="color:#fa4;">In Progress</span>';

        html += '<div style="margin-bottom:12px;padding:12px;background:rgba(0,0,0,0.3);border-radius:6px;border-left:3px solid #d4af37;">' +
          '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">' +
          '<div style="font-weight:bold;color:#fff;font-size:14px;">' + quest.title + '</div>' +
          '<div style="font-size:11px;">' + statusText + '</div></div>' +
          '<div style="color:#aaa;font-size:12px;margin-bottom:6px;">' + quest.description + '</div>' +
          '<div style="color:#888;font-size:11px;">Progress: ' + progress + '</div>' +
          '<div style="margin-top:6px;font-size:11px;color:#d4af37;">Reward: ' + quest.rewards.spark + ' Spark' +
          (quest.rewards.items.length > 0 ? ' + items' : '') + '</div>' +
          '<div style="margin-top:8px;text-align:right;">' +
          '<span style="cursor:pointer;font-size:11px;color:#f44;text-decoration:underline;" onclick="window.HUD.abandonQuestFromLog(\'' + playerId + '\',\'' + quest.id + '\')">Abandon</span>' +
          '</div></div>';
      });
    }
    html += '</div>';

    // Available quests section
    html += '<div style="margin-bottom:20px;">' +
      '<div style="font-size:16px;font-weight:bold;color:#fff;margin-bottom:10px;border-bottom:1px solid #d4af37;padding-bottom:4px;">Available Quests (' + questLog.available.length + ')</div>';

    if (questLog.available.length === 0) {
      html += '<div style="color:#888;font-style:italic;font-size:13px;padding:10px;">No new quests available. Complete prerequisites or explore more zones!</div>';
    } else {
      questLog.available.slice(0, 10).forEach(function(quest) {
        html += '<div style="margin-bottom:12px;padding:12px;background:rgba(0,0,0,0.2);border-radius:6px;border-left:3px solid #888;">' +
          '<div style="font-weight:bold;color:#fff;font-size:14px;margin-bottom:6px;">' + quest.title + '</div>' +
          '<div style="color:#aaa;font-size:12px;margin-bottom:6px;">' + quest.description + '</div>' +
          '<div style="font-size:11px;color:#d4af37;">Reward: ' + quest.rewards.spark + ' Spark' +
          (quest.rewards.items.length > 0 ? ' + items' : '') + '</div>' +
          '<div style="margin-top:8px;color:#888;font-size:10px;">Find quest giver to accept</div></div>';
      });
    }
    html += '</div>';

    // Completed quests section
    html += '<div>' +
      '<div style="font-size:16px;font-weight:bold;color:#fff;margin-bottom:10px;border-bottom:1px solid #d4af37;padding-bottom:4px;">Completed (' + questLog.completed.length + ')</div>';

    if (questLog.completed.length === 0) {
      html += '<div style="color:#888;font-style:italic;font-size:13px;padding:10px;">No completed quests yet.</div>';
    } else {
      html += '<div style="color:#4f4;font-size:12px;padding:10px;">You have completed ' + questLog.completed.length + ' quests!</div>';
    }
    html += '</div>';

    html += '<div style="text-align:center;margin-top:16px;font-size:11px;color:#666;">Press J to close</div>';

    questLogEl.innerHTML = html;
    hud.appendChild(questLogEl);
    requestAnimationFrame(function() {
      questLogEl.classList.add('visible');
    });
  }

  /**
   * Hide quest log panel
   */
  function hideQuestLog() {
    if (questLogEl && questLogEl.parentNode) {
      questLogEl.classList.remove('visible');
      setTimeout(function() {
        if (questLogEl && questLogEl.parentNode) {
          questLogEl.parentNode.removeChild(questLogEl);
          questLogEl = null;
        }
      }, 250);
    }
  }

  /**
   * Show quest offer dialog from NPC
   * @param {object} quest - Quest object
   * @param {object} npc - NPC data {name, archetype}
   */
  function showQuestOffer(quest, npc, playerId) {
    if (typeof document === 'undefined') return;
    hideQuestOffer(); // Remove existing

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    questOfferEl = document.createElement('div');
    questOfferEl.id = 'quest-offer-dialog';
    questOfferEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #d4af37;border-radius:12px;' +
      'padding:20px;width:500px;pointer-events:auto;box-shadow:0 8px 32px rgba(0,0,0,0.8);z-index:300;';

    var questDialogue = quest.dialogue && quest.dialogue.offer ? quest.dialogue.offer : quest.description;

    var html = '<div style="font-size:20px;font-weight:bold;color:#d4af37;margin-bottom:12px;">New Quest</div>' +
      '<div style="font-size:16px;font-weight:bold;color:#fff;margin-bottom:8px;">' + quest.title + '</div>' +
      '<div style="color:#aaa;font-size:13px;margin-bottom:12px;font-style:italic;">"' + questDialogue + '"</div>' +
      '<div style="color:#ccc;font-size:12px;margin-bottom:8px;">' + quest.description + '</div>' +
      '<div style="padding:10px;background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:16px;">' +
      '<div style="font-size:12px;color:#d4af37;margin-bottom:4px;">Rewards:</div>' +
      '<div style="font-size:13px;color:#fff;">• ' + quest.rewards.spark + ' Spark</div>';

    if (quest.rewards.items.length > 0) {
      quest.rewards.items.forEach(function(item) {
        html += '<div style="font-size:13px;color:#fff;">• ' + item.count + 'x ' + item.id + '</div>';
      });
    }

    html += '</div>' +
      '<div style="display:flex;gap:12px;justify-content:center;">' +
      '<button onclick="window.HUD.acceptQuestFromOffer(\'' + playerId + '\',\'' + quest.id + '\')" style="' +
      'padding:10px 24px;background:#d4af37;color:#000;border:none;border-radius:6px;' +
      'font-weight:bold;font-size:14px;cursor:pointer;">Accept Quest</button>' +
      '<button onclick="window.HUD.hideQuestOffer()" style="' +
      'padding:10px 24px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid #666;border-radius:6px;' +
      'font-size:14px;cursor:pointer;">Decline</button></div>';

    questOfferEl.innerHTML = html;
    hud.appendChild(questOfferEl);
  }

  /**
   * Hide quest offer dialog
   */
  function hideQuestOffer() {
    if (questOfferEl && questOfferEl.parentNode) {
      questOfferEl.parentNode.removeChild(questOfferEl);
      questOfferEl = null;
    }
  }

  /**
   * Show quest complete notification
   * @param {object} quest - Completed quest
   * @param {object} rewards - Rewards {spark, items}
   */
  function showQuestComplete(quest, rewards) {
    if (!notificationContainer) return;
    if (typeof document === 'undefined') return;

    var notification = document.createElement('div');
    notification.style.cssText = 'background:linear-gradient(135deg,rgba(212,175,55,0.9),rgba(255,215,0,0.9));' +
      'border-left:4px solid #d4af37;border-radius:8px;padding:16px 20px;margin-bottom:10px;' +
      'animation:slideIn 0.3s ease-out;pointer-events:auto;box-shadow:0 4px 12px rgba(212,175,55,0.4);';

    var html = '<div style="font-size:18px;font-weight:bold;color:#000;margin-bottom:6px;">Quest Complete!</div>' +
      '<div style="font-size:14px;color:#111;margin-bottom:8px;">' + quest.title + '</div>' +
      '<div style="font-size:12px;color:#222;">+ ' + rewards.spark + ' Spark';

    if (rewards.items && rewards.items.length > 0) {
      html += ' + ' + rewards.items.length + ' item(s)';
    }

    html += '</div>';
    notification.innerHTML = html;

    notificationContainer.appendChild(notification);

    // Auto-remove after 6 seconds
    setTimeout(function() {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(function() {
        notification.remove();
      }, 300);
    }, 6000);
  }

  /**
   * Show quest objective progress update
   * @param {string} text - Progress text (e.g., "+1/3 Sunflowers")
   */
  function showQuestProgress(text) {
    if (!notificationContainer) return;
    if (typeof document === 'undefined') return;

    var notification = document.createElement('div');
    notification.style.cssText = 'background:rgba(212,175,55,0.3);border-left:3px solid #d4af37;' +
      'border-radius:6px;padding:8px 12px;margin-bottom:8px;animation:slideIn 0.3s ease-out;' +
      'pointer-events:auto;font-size:13px;color:#d4af37;font-weight:bold;';
    notification.textContent = text;

    notificationContainer.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(function() {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(function() {
        notification.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Accept quest from offer dialog (called by inline onclick)
   */
  function acceptQuestFromOffer(playerId, questId) {
    if (window.Quests) {
      var result = window.Quests.acceptQuest(playerId, questId);
      if (result.success) {
        showNotification('Quest accepted: ' + result.quest.title, 'success');
        hideQuestOffer();
      } else {
        showNotification('Cannot accept quest: ' + result.message, 'error');
      }
    }
  }

  /**
   * Abandon quest from log (called by inline onclick)
   */
  function abandonQuestFromLog(playerId, questId) {
    if (window.Quests) {
      var result = window.Quests.abandonQuest(playerId, questId);
      if (result.success) {
        showNotification('Quest abandoned', 'info');
        hideQuestLog();
      }
    }
  }

  // ========================================================================
  // INVENTORY PANEL
  // ========================================================================

  var inventoryPanel = null;
  var inventoryVisible = false;

  function initInventoryPanel() {
    if (typeof document === 'undefined') return;
    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    inventoryPanel = document.createElement('div');
    inventoryPanel.id = 'inventory-panel';
    inventoryPanel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #4af;border-radius:12px;' +
      'padding:20px;min-width:500px;pointer-events:auto;display:none;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.8);z-index:200;';

    var header = '<div style="font-size:20px;font-weight:bold;margin-bottom:15px;text-align:center;color:#4af;">Inventory</div>';
    var slotsGrid = '<div id="inventory-slots" style="display:grid;grid-template-columns:repeat(5,90px);gap:8px;margin-bottom:15px;"></div>';
    var closeBtn = '<div style="text-align:center;"><button id="close-inventory" style="padding:8px 20px;background:#4af;border:none;border-radius:4px;color:#000;font-weight:bold;cursor:pointer;">Close (I)</button></div>';

    inventoryPanel.innerHTML = header + slotsGrid + closeBtn;
    hud.appendChild(inventoryPanel);

    var closeInvBtn = document.getElementById('close-inventory');
    if (closeInvBtn) closeInvBtn.addEventListener('click', function() {
      hideInventoryPanel();
    });
  }

  function toggleInventoryPanel() {
    if (inventoryVisible) {
      hideInventoryPanel();
    } else {
      showInventoryPanel();
    }
  }

  function showInventoryPanel() {
    if (!inventoryPanel) initInventoryPanel();
    inventoryPanel.style.display = 'block';
    requestAnimationFrame(function() {
      inventoryPanel.classList.add('visible');
    });
    inventoryVisible = true;
  }

  function hideInventoryPanel() {
    if (inventoryPanel) {
      inventoryPanel.classList.remove('visible');
      setTimeout(function() {
        inventoryPanel.style.display = 'none';
      }, 250);
    }
    inventoryVisible = false;
  }

  function updateInventoryDisplay(inventory) {
    if (!inventoryPanel || !inventory) return;

    var Inventory = typeof window !== 'undefined' ? window.Inventory : null;
    if (!Inventory) return;

    var slotsDiv = document.getElementById('inventory-slots');
    if (!slotsDiv) return;

    var items = Inventory.getInventory(inventory);
    slotsDiv.innerHTML = '';

    items.forEach(function(item, idx) {
      var slot = document.createElement('div');
      slot.style.cssText = 'background:rgba(255,255,255,0.1);border:2px solid #555;border-radius:6px;' +
        'padding:10px;text-align:center;min-height:70px;position:relative;cursor:pointer;';

      if (item) {
        var rarityColors = { common: '#aaa', uncommon: '#4af', rare: '#f4a', legendary: '#fa4' };
        var borderColor = rarityColors[item.rarity] || '#555';
        slot.style.borderColor = borderColor;

        slot.innerHTML = '<div style="font-size:32px;margin-bottom:4px;">' + item.icon + '</div>' +
          '<div style="font-size:11px;color:#ccc;">' + item.name + '</div>' +
          '<div style="position:absolute;top:4px;right:6px;background:#000;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold;">' + item.count + '</div>';

        slot.title = item.description + '\\n' + item.rarity.toUpperCase();
      } else {
        slot.innerHTML = '<div style="color:#444;padding-top:20px;">Empty</div>';
      }

      slotsDiv.appendChild(slot);
    });
  }

  // ========================================================================
  // CRAFTING PANEL
  // ========================================================================

  var craftingPanel = null;
  var craftingVisible = false;
  var onCraftCallback = null;

  function initCraftingPanel(onCraft) {
    if (typeof document === 'undefined') return;
    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    onCraftCallback = onCraft;

    craftingPanel = document.createElement('div');
    craftingPanel.id = 'crafting-panel';
    craftingPanel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #fa4;border-radius:12px;' +
      'padding:20px;min-width:600px;max-height:70vh;overflow-y:auto;pointer-events:auto;display:none;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.8);z-index:200;';

    var header = '<div style="font-size:20px;font-weight:bold;margin-bottom:15px;text-align:center;color:#fa4;">Crafting</div>';
    var recipeList = '<div id="recipe-list"></div>';
    var closeBtn = '<div style="text-align:center;margin-top:15px;"><button id="close-crafting" style="padding:8px 20px;background:#fa4;border:none;border-radius:4px;color:#000;font-weight:bold;cursor:pointer;">Close (C)</button></div>';

    craftingPanel.innerHTML = header + recipeList + closeBtn;
    hud.appendChild(craftingPanel);

    var closeCraftBtn = document.getElementById('close-crafting');
    if (closeCraftBtn) closeCraftBtn.addEventListener('click', function() {
      hideCraftingPanel();
    });
  }

  function toggleCraftingPanel() {
    if (craftingVisible) {
      hideCraftingPanel();
    } else {
      showCraftingPanel();
    }
  }

  function showCraftingPanel() {
    if (!craftingPanel) initCraftingPanel();
    craftingPanel.style.display = 'block';
    requestAnimationFrame(function() {
      craftingPanel.classList.add('visible');
    });
    craftingVisible = true;
  }

  function hideCraftingPanel() {
    if (craftingPanel) {
      craftingPanel.classList.remove('visible');
      setTimeout(function() {
        craftingPanel.style.display = 'none';
      }, 250);
    }
    craftingVisible = false;
  }

  function updateCraftingDisplay(inventory) {
    if (!craftingPanel || !inventory) return;

    var Inventory = typeof window !== 'undefined' ? window.Inventory : null;
    if (!Inventory) return;

    var listDiv = document.getElementById('recipe-list');
    if (!listDiv) return;

    var allRecipes = Inventory.getAllRecipes();
    listDiv.innerHTML = '';

    allRecipes.forEach(function(recipe) {
      var canCraft = Inventory.canCraft(inventory, recipe);
      var outputItem = Inventory.getItemData(recipe.output.itemId);

      var recipeDiv = document.createElement('div');
      recipeDiv.style.cssText = 'background:rgba(255,255,255,0.05);border:1px solid ' + (canCraft ? '#4f4' : '#555') + ';' +
        'border-radius:6px;padding:12px;margin-bottom:10px;';

      var title = '<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:' + (canCraft ? '#4f4' : '#888') + ';">' +
        (outputItem ? outputItem.icon + ' ' : '') + recipe.name + '</div>';

      var reqs = '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">Requires: ';
      recipe.requirements.forEach(function(req, i) {
        var reqItem = Inventory.getItemData(req.itemId);
        var hasCount = Inventory.getItemCount(inventory, req.itemId);
        var hasEnough = hasCount >= req.count;
        reqs += (i > 0 ? ', ' : '') + '<span style="color:' + (hasEnough ? '#4f4' : '#f44') + ';">' +
          (reqItem ? reqItem.icon + ' ' : '') + req.count + ' ' + (reqItem ? reqItem.name : req.itemId) + '</span>';
      });
      reqs += '</div>';

      var reward = '<div style="font-size:11px;color:#ffa500;margin-bottom:8px;">Spark Reward: ' + recipe.sparkReward + '</div>';

      var craftBtn = '';
      if (canCraft) {
        craftBtn = '<button class="craft-btn" data-recipe="' + recipe.id + '" style="padding:6px 15px;background:#4f4;border:none;border-radius:4px;color:#000;font-weight:bold;cursor:pointer;">Craft</button>';
      } else {
        craftBtn = '<button disabled style="padding:6px 15px;background:#333;border:none;border-radius:4px;color:#666;cursor:not-allowed;">Cannot Craft</button>';
      }

      recipeDiv.innerHTML = title + reqs + reward + craftBtn;
      listDiv.appendChild(recipeDiv);
    });

    var craftBtns = document.querySelectorAll('.craft-btn');
    craftBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var recipeId = this.getAttribute('data-recipe');
        if (onCraftCallback) {
          onCraftCallback(recipeId);
        }
      });
    });
  }

  // ========================================================================
  // QUICK BAR
  // ========================================================================

  var quickBarEl = null;

  function initQuickBar() {
    if (typeof document === 'undefined') return;
    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    quickBarEl = document.createElement('div');
    quickBarEl.id = 'quick-bar';
    quickBarEl.style.cssText = 'position:absolute;bottom:70px;left:50%;transform:translateX(-50%);' +
      'display:flex;gap:8px;pointer-events:none;';

    for (var i = 0; i < 5; i++) {
      var slot = document.createElement('div');
      slot.className = 'quick-slot';
      slot.style.cssText = 'background:rgba(0,0,0,0.7);border:2px solid #555;border-radius:6px;' +
        'padding:8px;width:60px;height:60px;text-align:center;position:relative;';

      var keyLabel = '<div style="position:absolute;top:2px;left:4px;font-size:10px;color:#888;">' + (i + 1) + '</div>';
      slot.innerHTML = keyLabel + '<div class="quick-content" style="font-size:28px;margin-top:8px;">-</div>';

      quickBarEl.appendChild(slot);
    }

    hud.appendChild(quickBarEl);
  }

  function updateQuickBar(inventory) {
    if (!quickBarEl || !inventory) return;

    var Inventory = typeof window !== 'undefined' ? window.Inventory : null;
    if (!Inventory) return;

    var items = Inventory.getInventory(inventory);
    var quickSlots = quickBarEl.querySelectorAll('.quick-slot');

    inventory.quickBar.forEach(function(slotIdx, qbIdx) {
      if (qbIdx >= quickSlots.length) return;

      var item = items[slotIdx];
      var contentDiv = quickSlots[qbIdx].querySelector('.quick-content');

      if (item) {
        contentDiv.innerHTML = item.icon;
        quickSlots[qbIdx].title = item.name + ' (' + item.count + ')';
      } else {
        contentDiv.innerHTML = '-';
        quickSlots[qbIdx].title = 'Empty';
      }
    });
  }

  // ========================================================================
  // ITEM PICKUP NOTIFICATION
  // ========================================================================

  function showItemPickup(itemName, count, icon) {
    if (!notificationContainer) return;
    if (typeof document === 'undefined') return;

    var pickup = document.createElement('div');
    pickup.style.cssText = 'background:rgba(0,200,0,0.8);border-left:4px solid #0f0;border-radius:4px;' +
      'padding:10px 15px;margin-bottom:10px;animation:slideIn 0.3s ease-out;' +
      'pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;';

    pickup.innerHTML = '<span style="font-size:20px;margin-right:8px;">' + (icon || '+') + '</span>' +
      '<span style="font-weight:bold;">+' + count + ' ' + itemName + '</span>';

    notificationContainer.appendChild(pickup);

    setTimeout(function() {
      pickup.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(function() {
        pickup.remove();
      }, 300);
    }, 2000);
  }

  // ========================================================================
  // WORLD MAP OVERLAY
  // ========================================================================

  var worldMapOverlay = null;
  var worldMapCanvas = null;
  var worldMapCtx = null;
  var worldMapVisible = false;

  var WORLD_MAP_ZONES = {
    nexus:      { cx: 0,    cz: 0,    radius: 60, color: '#8888cc', name: 'Nexus', desc: 'The heart of Zion. A safe meeting place for all.' },
    gardens:    { cx: 200,  cz: 30,   radius: 80, color: '#4caf50', name: 'Gardens', desc: 'Fertile grounds for planting, growing, and harvesting.' },
    athenaeum:  { cx: 100,  cz: -220, radius: 60, color: '#795548', name: 'Athenaeum', desc: 'A library of knowledge and arcane study.' },
    studio:     { cx: -200, cz: -100, radius: 60, color: '#ff9800', name: 'Studio', desc: 'Creative workshops for art, music, and crafting.' },
    wilds:      { cx: -30,  cz: 260,  radius: 90, color: '#2e7d32', name: 'Wilds', desc: 'Untamed wilderness full of discoveries.' },
    agora:      { cx: -190, cz: 120,  radius: 55, color: '#ffd700', name: 'Agora', desc: 'The marketplace. Trade goods and Spark.' },
    commons:    { cx: 170,  cz: 190,  radius: 55, color: '#faf0e6', name: 'Commons', desc: 'Community space for building and gathering.' },
    arena:      { cx: 0,    cz: -240, radius: 55, color: '#d2691e', name: 'Arena', desc: 'Honorable competition between consenting players.' }
  };

  var ZONE_CONNECTIONS = [
    ['nexus', 'gardens'],
    ['nexus', 'athenaeum'],
    ['nexus', 'studio'],
    ['nexus', 'wilds'],
    ['nexus', 'agora'],
    ['nexus', 'commons'],
    ['nexus', 'arena'],
    ['gardens', 'commons'],
    ['wilds', 'agora'],
    ['athenaeum', 'arena']
  ];

  function showWorldMap(playerPos, npcs, landmarks) {
    if (typeof document === 'undefined') return;
    if (worldMapVisible) return;

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    worldMapVisible = true;

    worldMapOverlay = document.createElement('div');
    worldMapOverlay.id = 'world-map-overlay';
    worldMapOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(10,10,20,0.92);z-index:500;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;pointer-events:auto;';

    var title = document.createElement('div');
    title.style.cssText = 'font-size:48px;font-weight:bold;letter-spacing:8px;' +
      'color:#d4af37;margin-bottom:20px;text-align:center;' +
      'text-shadow:0 0 10px rgba(212,175,55,0.5);';
    title.textContent = 'WORLD OF ZION';
    worldMapOverlay.appendChild(title);

    var mapContainer = document.createElement('div');
    mapContainer.style.cssText = 'position:relative;width:80vw;height:60vh;max-width:800px;max-height:600px;' +
      'background:rgba(0,0,0,0.3);border:2px solid #d4af37;border-radius:8px;overflow:hidden;';

    worldMapCanvas = document.createElement('canvas');
    worldMapCanvas.style.cssText = 'display:block;width:100%;height:100%;';
    mapContainer.appendChild(worldMapCanvas);

    worldMapCanvas.width = 800;
    worldMapCanvas.height = 600;
    worldMapCtx = worldMapCanvas.getContext('2d');

    worldMapOverlay.appendChild(mapContainer);

    var instructions = document.createElement('div');
    instructions.style.cssText = 'margin-top:20px;font-size:14px;color:#aaa;text-align:center;';
    instructions.textContent = 'Press M or ESC to close';
    worldMapOverlay.appendChild(instructions);

    hud.appendChild(worldMapOverlay);

    drawWorldMap(playerPos, npcs, landmarks);

    worldMapOverlay.addEventListener('click', function(e) {
      if (e.target === worldMapOverlay) {
        hideWorldMap();
      }
    });

    var keyHandler = function(e) {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
        hideWorldMap();
        document.removeEventListener('keydown', keyHandler);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', keyHandler);
    worldMapOverlay._keyHandler = keyHandler;

    worldMapCanvas.addEventListener('mousemove', function(e) {
      handleMapHover(e);
    });
  }

  function hideWorldMap() {
    if (!worldMapOverlay) return;

    if (worldMapOverlay._keyHandler) {
      document.removeEventListener('keydown', worldMapOverlay._keyHandler);
    }

    if (worldMapOverlay.parentNode) {
      worldMapOverlay.parentNode.removeChild(worldMapOverlay);
    }

    worldMapOverlay = null;
    worldMapCanvas = null;
    worldMapCtx = null;
    worldMapVisible = false;
  }

  function updateWorldMap(playerPos) {
    if (!worldMapVisible || !worldMapCtx) return;
    drawWorldMap(playerPos, [], []);
  }

  function drawWorldMap(playerPos, npcs, landmarks) {
    if (!worldMapCtx) return;

    var w = worldMapCanvas.width;
    var h = worldMapCanvas.height;

    worldMapCtx.fillStyle = '#0a0e1a';
    worldMapCtx.fillRect(0, 0, w, h);

    var worldMin = -320, worldMax = 320;
    var worldRange = worldMax - worldMin;
    var padding = 40;

    function worldToCanvas(wx, wz) {
      return {
        x: padding + ((wx - worldMin) / worldRange) * (w - padding * 2),
        y: padding + ((wz - worldMin) / worldRange) * (h - padding * 2)
      };
    }

    worldMapCtx.strokeStyle = 'rgba(255,255,255,0.05)';
    worldMapCtx.lineWidth = 1;
    for (var i = 0; i <= 8; i++) {
      var x = padding + (i / 8) * (w - padding * 2);
      var y = padding + (i / 8) * (h - padding * 2);
      worldMapCtx.beginPath();
      worldMapCtx.moveTo(x, padding);
      worldMapCtx.lineTo(x, h - padding);
      worldMapCtx.stroke();
      worldMapCtx.beginPath();
      worldMapCtx.moveTo(padding, y);
      worldMapCtx.lineTo(w - padding, y);
      worldMapCtx.stroke();
    }

    worldMapCtx.strokeStyle = 'rgba(212,175,55,0.2)';
    worldMapCtx.lineWidth = 2;
    ZONE_CONNECTIONS.forEach(function(conn) {
      var z1 = WORLD_MAP_ZONES[conn[0]];
      var z2 = WORLD_MAP_ZONES[conn[1]];
      if (!z1 || !z2) return;
      var pos1 = worldToCanvas(z1.cx, z1.cz);
      var pos2 = worldToCanvas(z2.cx, z2.cz);
      worldMapCtx.beginPath();
      worldMapCtx.moveTo(pos1.x, pos1.y);
      worldMapCtx.lineTo(pos2.x, pos2.y);
      worldMapCtx.stroke();
    });

    for (var zoneId in WORLD_MAP_ZONES) {
      var zone = WORLD_MAP_ZONES[zoneId];
      var pos = worldToCanvas(zone.cx, zone.cz);
      var r = (zone.radius / worldRange) * (w - padding * 2);

      worldMapCtx.globalAlpha = 0.3;
      worldMapCtx.fillStyle = zone.color;
      worldMapCtx.beginPath();
      worldMapCtx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      worldMapCtx.fill();

      worldMapCtx.globalAlpha = 0.7;
      worldMapCtx.strokeStyle = zone.color;
      worldMapCtx.lineWidth = 2;
      worldMapCtx.beginPath();
      worldMapCtx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      worldMapCtx.stroke();

      worldMapCtx.globalAlpha = 1.0;
      worldMapCtx.fillStyle = '#fff';
      worldMapCtx.font = 'bold 14px Arial';
      worldMapCtx.textAlign = 'center';
      worldMapCtx.textBaseline = 'middle';
      worldMapCtx.fillText(zone.name, pos.x, pos.y);
    }

    worldMapCtx.globalAlpha = 1.0;

    if (npcs && npcs.length > 0) {
      npcs.forEach(function(npc) {
        var pos = worldToCanvas(npc.x, npc.z);
        var color = ARCHETYPE_COLORS_HUD[npc.archetype] || '#888';
        worldMapCtx.fillStyle = color;
        worldMapCtx.beginPath();
        worldMapCtx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        worldMapCtx.fill();
      });
    }

    if (landmarks && landmarks.length > 0) {
      landmarks.forEach(function(landmark) {
        var pos = worldToCanvas(landmark.x, landmark.z);
        drawStar(worldMapCtx, pos.x, pos.y, 5, 8, 4, '#ffd700');
      });
    }

    if (playerPos) {
      var pPos = worldToCanvas(playerPos.x, playerPos.z);
      drawDiamond(worldMapCtx, pPos.x, pPos.y, 12, '#FFD700');

      worldMapCtx.shadowBlur = 15;
      worldMapCtx.shadowColor = '#FFD700';
      drawDiamond(worldMapCtx, pPos.x, pPos.y, 12, '#FFD700');
      worldMapCtx.shadowBlur = 0;
    }

    drawCompassRose(worldMapCtx, w - 60, 60, 30);
  }

  function drawDiamond(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawStar(ctx, x, y, points, outer, inner, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var angle = (i * Math.PI) / points - Math.PI / 2;
      var radius = i % 2 === 0 ? outer : inner;
      var px = x + Math.cos(angle) * radius;
      var py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawCompassRose(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(212,175,55,0.5)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y - size - 10);
    ctx.fillText('S', x, y + size + 10);
    ctx.fillText('E', x + size + 12, y);
    ctx.fillText('W', x - size - 12, y);
  }

  function handleMapHover(e) {
    if (!worldMapCanvas || !worldMapCtx) return;

    var rect = worldMapCanvas.getBoundingClientRect();
    var mx = ((e.clientX - rect.left) / rect.width) * worldMapCanvas.width;
    var my = ((e.clientY - rect.top) / rect.height) * worldMapCanvas.height;

    var worldMin = -320, worldMax = 320;
    var worldRange = worldMax - worldMin;
    var padding = 40;
    var w = worldMapCanvas.width;
    var h = worldMapCanvas.height;

    var hoveredZone = null;
    for (var zoneId in WORLD_MAP_ZONES) {
      var zone = WORLD_MAP_ZONES[zoneId];
      var zx = padding + ((zone.cx - worldMin) / worldRange) * (w - padding * 2);
      var zy = padding + ((zone.cz - worldMin) / worldRange) * (h - padding * 2);
      var zr = (zone.radius / worldRange) * (w - padding * 2);

      var dx = mx - zx;
      var dy = my - zy;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= zr) {
        hoveredZone = zone;
        break;
      }
    }

    if (hoveredZone) {
      worldMapCanvas.style.cursor = 'pointer';
      worldMapCanvas.title = hoveredZone.name + ': ' + hoveredZone.desc;
    } else {
      worldMapCanvas.style.cursor = 'default';
      worldMapCanvas.title = '';
    }
  }

  // ========================================================================
  // EMOTE SYSTEM UI
  // ========================================================================

  var emoteMenuEl = null;
  var emoteMenuVisible = false;
  var emoteBubbles = new Map(); // playerId -> {element, timer}

  var EMOTE_SYMBOLS = {
    wave: '&#128075;',
    dance: '&#128131;',
    bow: '&#129485;',
    cheer: '&#127881;',
    meditate: '&#129496;',
    point: '&#128073;'
  };

  /**
   * Show emote menu (radial picker)
   */
  function showEmoteMenu() {
    if (typeof document === 'undefined') return;
    hideEmoteMenu(); // Remove existing

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    emoteMenuEl = document.createElement('div');
    emoteMenuEl.id = 'emote-menu';
    emoteMenuEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:300px;height:300px;pointer-events:auto;z-index:250;';

    var emotes = [
      { type: 'wave', label: 'Wave', angle: 0 },
      { type: 'dance', label: 'Dance', angle: 60 },
      { type: 'bow', label: 'Bow', angle: 120 },
      { type: 'cheer', label: 'Cheer', angle: 180 },
      { type: 'meditate', label: 'Meditate', angle: 240 },
      { type: 'point', label: 'Point', angle: 300 }
    ];

    var centerX = 150, centerY = 150, radius = 100;

    emotes.forEach(function(emote) {
      var angleRad = (emote.angle - 90) * Math.PI / 180;
      var x = centerX + radius * Math.cos(angleRad) - 35;
      var y = centerY + radius * Math.sin(angleRad) - 35;

      var btn = document.createElement('div');
      btn.className = 'emote-btn';
      btn.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;' +
        'width:70px;height:70px;border-radius:50%;background:rgba(0,0,0,0.8);' +
        'border:2px solid rgba(255,255,255,0.5);display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;cursor:pointer;' +
        'transition:all 0.2s;color:#fff;font-size:11px;';

      btn.innerHTML = '<div style="font-size:28px;margin-bottom:2px;">' + EMOTE_SYMBOLS[emote.type] + '</div>' +
        '<div>' + emote.label + '</div>';

      btn.onmouseover = function() {
        this.style.background = 'rgba(74,170,255,0.9)';
        this.style.borderColor = '#4af';
        this.style.transform = 'scale(1.1)';
      };

      btn.onmouseout = function() {
        this.style.background = 'rgba(0,0,0,0.8)';
        this.style.borderColor = 'rgba(255,255,255,0.5)';
        this.style.transform = 'scale(1)';
      };

      btn.onclick = (function(type) {
        return function() {
          hideEmoteMenu();
          if (window.Main && window.Main.handleLocalAction) {
            window.Main.handleLocalAction('emote', { type: type });
          }
        };
      })(emote.type);

      emoteMenuEl.appendChild(btn);
    });

    // Center label
    var centerLabel = document.createElement('div');
    centerLabel.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'background:rgba(0,0,0,0.9);border:2px solid #4af;border-radius:50%;' +
      'width:80px;height:80px;display:flex;align-items:center;justify-content:center;' +
      'color:#4af;font-weight:bold;font-size:12px;text-align:center;pointer-events:none;';
    centerLabel.textContent = 'Emotes';
    emoteMenuEl.appendChild(centerLabel);

    hud.appendChild(emoteMenuEl);
    emoteMenuVisible = true;
  }

  /**
   * Hide emote menu
   */
  function hideEmoteMenu() {
    if (emoteMenuEl && emoteMenuEl.parentNode) {
      emoteMenuEl.parentNode.removeChild(emoteMenuEl);
      emoteMenuEl = null;
    }
    emoteMenuVisible = false;
  }

  /**
   * Show emote bubble above player
   * @param {string} playerId - Player ID
   * @param {string} emoteType - Type of emote
   */
  function showEmoteBubble(playerId, emoteType) {
    if (typeof document === 'undefined') return;

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    // Remove existing bubble for this player
    var existing = emoteBubbles.get(playerId);
    if (existing && existing.element && existing.element.parentNode) {
      existing.element.parentNode.removeChild(existing.element);
    }

    var bubble = document.createElement('div');
    bubble.className = 'emote-bubble';
    bubble.style.cssText = 'position:absolute;background:rgba(255,255,255,0.95);' +
      'border:2px solid #4af;border-radius:20px;padding:8px 16px;' +
      'font-size:14px;font-weight:bold;color:#000;' +
      'box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;z-index:150;' +
      'animation:emoteFloat 2s ease-out forwards;white-space:nowrap;';

    var label = emoteType.charAt(0).toUpperCase() + emoteType.slice(1);
    bubble.innerHTML = EMOTE_SYMBOLS[emoteType] + ' ' + label;

    hud.appendChild(bubble);

    emoteBubbles.set(playerId, {
      element: bubble,
      timer: 2.0,
      emoteType: emoteType
    });

    // Auto-remove after animation
    setTimeout(function() {
      if (bubble.parentNode) {
        bubble.parentNode.removeChild(bubble);
      }
      emoteBubbles.delete(playerId);
    }, 2000);
  }

  /**
   * Update emote bubble positions (called from main loop)
   * @param {object} playerPositions - Map of playerId to screen position
   */
  function updateEmoteBubbles(playerPositions) {
    emoteBubbles.forEach(function(bubble, playerId) {
      if (!bubble.element || !bubble.element.parentNode) {
        emoteBubbles.delete(playerId);
        return;
      }

      var screenPos = playerPositions[playerId];
      if (screenPos) {
        bubble.element.style.left = screenPos.x + 'px';
        bubble.element.style.top = (screenPos.y - 80) + 'px';
      }
    });
  }

  // Add CSS animation for emote bubbles
  if (typeof document !== 'undefined') {
    var style = document.createElement('style');
    style.textContent += `
      @keyframes emoteFloat {
        0% {
          transform: translateY(0) scale(0.8);
          opacity: 0;
        }
        20% {
          opacity: 1;
          transform: translateY(-10px) scale(1);
        }
        80% {
          opacity: 1;
          transform: translateY(-30px) scale(1);
        }
        100% {
          transform: translateY(-40px) scale(0.9);
          opacity: 0;
        }
      }
    `;
    if (document.head) {
      document.head.appendChild(style);
    }
  }

  // ========================================================================
  // TRADING SYSTEM UI
  // ========================================================================

  var tradeRequestEl = null;
  var tradeWindowEl = null;
  var currentTradeData = null;

  /**
   * Show trade request popup
   * @param {string} fromPlayer - Player name requesting trade
   * @param {string} tradeId - Trade ID
   * @param {Function} onAccept - Callback when Accept clicked
   * @param {Function} onDecline - Callback when Decline clicked
   */
  function showTradeRequest(fromPlayer, tradeId, onAccept, onDecline) {
    if (typeof document === 'undefined') return;
    hideTradeRequest(); // Remove any existing

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    tradeRequestEl = document.createElement('div');
    tradeRequestEl.id = 'trade-request';
    tradeRequestEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #ffa500;border-radius:12px;' +
      'padding:20px;width:400px;pointer-events:auto;box-shadow:0 8px 32px rgba(0,0,0,0.8);z-index:300;';

    var html = '<div style="font-size:20px;font-weight:bold;color:#ffa500;margin-bottom:12px;">Trade Request</div>' +
      '<div style="font-size:16px;color:#fff;margin-bottom:16px;">' +
      '<span style="color:#4af;font-weight:bold;">' + fromPlayer + '</span> wants to trade with you.' +
      '</div>' +
      '<div style="display:flex;gap:12px;justify-content:center;">' +
      '<button id="trade-accept-btn" style="padding:10px 24px;background:#4f4;color:#000;border:none;' +
      'border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;">Accept</button>' +
      '<button id="trade-decline-btn" style="padding:10px 24px;background:rgba(255,255,255,0.1);color:#fff;' +
      'border:1px solid #666;border-radius:6px;font-size:14px;cursor:pointer;">Decline</button></div>';

    tradeRequestEl.innerHTML = html;
    hud.appendChild(tradeRequestEl);

    var acceptBtn = document.getElementById('trade-accept-btn');
    if (acceptBtn) acceptBtn.addEventListener('click', function() {
      hideTradeRequest();
      if (onAccept) onAccept(tradeId);
    });

    var declineBtn = document.getElementById('trade-decline-btn');
    if (declineBtn) declineBtn.addEventListener('click', function() {
      hideTradeRequest();
      if (onDecline) onDecline(tradeId);
    });
  }

  /**
   * Hide trade request popup
   */
  function hideTradeRequest() {
    if (tradeRequestEl && tradeRequestEl.parentNode) {
      tradeRequestEl.parentNode.removeChild(tradeRequestEl);
      tradeRequestEl = null;
    }
  }

  /**
   * Show trade window
   * @param {Object} trade - Trade data object
   * @param {string} localPlayerId - Local player's ID
   * @param {Function} onAddItem - Callback(slotIndex)
   * @param {Function} onRemoveItem - Callback(tradeSlot)
   * @param {Function} onSetSpark - Callback(amount)
   * @param {Function} onReady - Callback()
   * @param {Function} onConfirm - Callback()
   * @param {Function} onCancel - Callback()
   */
  function showTradeWindow(trade, localPlayerId, onAddItem, onRemoveItem, onSetSpark, onReady, onConfirm, onCancel) {
    if (typeof document === 'undefined') return;
    hideTradeWindow(); // Remove any existing

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    currentTradeData = { trade: trade, localPlayerId: localPlayerId };

    tradeWindowEl = document.createElement('div');
    tradeWindowEl.id = 'trade-window';
    tradeWindowEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #ffa500;border-radius:12px;' +
      'padding:20px;width:700px;pointer-events:auto;box-shadow:0 8px 32px rgba(0,0,0,0.8);z-index:300;';

    tradeWindowEl.innerHTML = '<div style="font-size:20px;font-weight:bold;color:#ffa500;margin-bottom:16px;text-align:center;">Trade Window</div>' +
      '<div id="trade-content"></div>';

    hud.appendChild(tradeWindowEl);

    // Store callbacks
    tradeWindowEl._callbacks = { onAddItem, onRemoveItem, onSetSpark, onReady, onConfirm, onCancel };

    // Update content
    updateTradeWindow(trade, localPlayerId);
  }

  /**
   * Update trade window with current trade state
   * @param {Object} trade - Trade data object
   * @param {string} localPlayerId - Local player's ID
   */
  function updateTradeWindow(trade, localPlayerId) {
    if (!tradeWindowEl) return;

    var contentDiv = document.getElementById('trade-content');
    if (!contentDiv) return;

    var isPlayer1 = trade.player1.id === localPlayerId;
    var localPlayer = isPlayer1 ? trade.player1 : trade.player2;
    var otherPlayer = isPlayer1 ? trade.player2 : trade.player1;

    var Inventory = typeof window !== 'undefined' ? window.Inventory : null;

    // Build trade grid
    var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;">';

    // Your offer column
    html += '<div style="border:2px solid #4af;border-radius:8px;padding:12px;">' +
      '<div style="font-size:16px;font-weight:bold;color:#4af;margin-bottom:10px;text-align:center;">Your Offer</div>' +
      '<div id="local-items" style="display:grid;grid-template-columns:repeat(3,80px);gap:6px;margin-bottom:10px;justify-content:center;">';

    // Local player's items (6 slots)
    for (var i = 0; i < 6; i++) {
      var item = localPlayer.items[i];
      var slotHtml = '<div class="trade-slot" data-slot="' + i + '" style="background:rgba(255,255,255,0.1);border:2px solid #555;' +
        'border-radius:6px;padding:8px;text-align:center;min-height:60px;cursor:pointer;position:relative;">';

      if (item && Inventory) {
        var itemData = Inventory.getItemData(item.itemId);
        if (itemData) {
          slotHtml += '<div style="font-size:28px;">' + itemData.icon + '</div>' +
            '<div style="font-size:9px;color:#ccc;">' + itemData.name + '</div>' +
            '<div style="position:absolute;top:2px;right:4px;background:#000;padding:1px 4px;border-radius:2px;font-size:10px;">' + item.count + '</div>';
        }
      } else {
        slotHtml += '<div style="color:#444;padding-top:15px;font-size:11px;">Empty</div>';
      }

      slotHtml += '</div>';
      html += slotHtml;
    }

    html += '</div>';

    // Spark input
    html += '<div style="margin-bottom:10px;">' +
      '<label style="font-size:12px;color:#aaa;display:block;margin-bottom:4px;">Spark Offer:</label>' +
      '<input type="number" id="local-spark-input" min="0" value="' + localPlayer.spark + '" ' +
      'style="width:100%;padding:6px;background:rgba(0,0,0,0.5);border:1px solid #555;border-radius:4px;color:#fff;font-size:14px;" />' +
      '</div>';

    // Status
    var statusText = localPlayer.ready ? '✓ Ready' : 'Not ready';
    var statusColor = localPlayer.ready ? '#4f4' : '#888';
    html += '<div style="text-align:center;color:' + statusColor + ';font-size:13px;margin-bottom:8px;">' + statusText + '</div>';

    html += '</div>';

    // Their offer column
    html += '<div style="border:2px solid #f4a;border-radius:8px;padding:12px;">' +
      '<div style="font-size:16px;font-weight:bold;color:#f4a;margin-bottom:10px;text-align:center;">Their Offer</div>' +
      '<div id="other-items" style="display:grid;grid-template-columns:repeat(3,80px);gap:6px;margin-bottom:10px;justify-content:center;">';

    // Other player's items (6 slots)
    for (var j = 0; j < 6; j++) {
      var otherItem = otherPlayer.items[j];
      var otherSlotHtml = '<div style="background:rgba(255,255,255,0.1);border:2px solid #555;' +
        'border-radius:6px;padding:8px;text-align:center;min-height:60px;position:relative;">';

      if (otherItem && Inventory) {
        var otherItemData = Inventory.getItemData(otherItem.itemId);
        if (otherItemData) {
          otherSlotHtml += '<div style="font-size:28px;">' + otherItemData.icon + '</div>' +
            '<div style="font-size:9px;color:#ccc;">' + otherItemData.name + '</div>' +
            '<div style="position:absolute;top:2px;right:4px;background:#000;padding:1px 4px;border-radius:2px;font-size:10px;">' + otherItem.count + '</div>';
        }
      } else {
        otherSlotHtml += '<div style="color:#444;padding-top:15px;font-size:11px;">Empty</div>';
      }

      otherSlotHtml += '</div>';
      html += otherSlotHtml;
    }

    html += '</div>';

    // Their Spark
    html += '<div style="margin-bottom:10px;">' +
      '<label style="font-size:12px;color:#aaa;display:block;margin-bottom:4px;">Spark Offer:</label>' +
      '<div style="padding:6px;background:rgba(0,0,0,0.5);border:1px solid #555;border-radius:4px;color:#ffa500;font-size:14px;text-align:center;">' +
      otherPlayer.spark + '</div></div>';

    // Their status
    var otherStatusText = otherPlayer.ready ? '✓ Ready' : 'Not ready';
    var otherStatusColor = otherPlayer.ready ? '#4f4' : '#888';
    html += '<div style="text-align:center;color:' + otherStatusColor + ';font-size:13px;margin-bottom:8px;">' + otherStatusText + '</div>';

    html += '</div>';

    html += '</div>';

    // Status message
    var statusMsg = '';
    if (localPlayer.confirmed && otherPlayer.confirmed) {
      statusMsg = '<div style="text-align:center;color:#4f4;font-size:14px;margin-bottom:12px;">✓ Trade completed!</div>';
    } else if (localPlayer.confirmed) {
      statusMsg = '<div style="text-align:center;color:#fa4;font-size:14px;margin-bottom:12px;">Waiting for ' + otherPlayer.id + ' to confirm...</div>';
    } else if (otherPlayer.confirmed) {
      statusMsg = '<div style="text-align:center;color:#fa4;font-size:14px;margin-bottom:12px;">' + otherPlayer.id + ' has confirmed. Ready to confirm?</div>';
    } else if (localPlayer.ready && otherPlayer.ready) {
      statusMsg = '<div style="text-align:center;color:#4f4;font-size:14px;margin-bottom:12px;">Both ready! Click Confirm to complete trade.</div>';
    } else if (localPlayer.ready) {
      statusMsg = '<div style="text-align:center;color:#888;font-size:14px;margin-bottom:12px;">Waiting for ' + otherPlayer.id + ' to ready up...</div>';
    } else {
      statusMsg = '<div style="text-align:center;color:#888;font-size:14px;margin-bottom:12px;">Add items and Spark, then click Ready.</div>';
    }

    html += statusMsg;

    // Action buttons
    html += '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">';

    if (!localPlayer.ready) {
      html += '<button id="trade-ready-btn" style="padding:8px 20px;background:#4f4;color:#000;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Ready</button>';
    }

    if (localPlayer.ready && otherPlayer.ready && !localPlayer.confirmed) {
      html += '<button id="trade-confirm-btn" style="padding:8px 20px;background:#ffa500;color:#000;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Confirm Trade</button>';
    }

    html += '<button id="trade-cancel-btn" style="padding:8px 20px;background:#f44;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Cancel</button>';

    html += '</div>';

    contentDiv.innerHTML = html;

    // Attach event listeners
    var callbacks = tradeWindowEl._callbacks;

    // Spark input
    var sparkInput = document.getElementById('local-spark-input');
    if (sparkInput && callbacks.onSetSpark) {
      sparkInput.addEventListener('change', function() {
        var amount = parseInt(this.value) || 0;
        callbacks.onSetSpark(amount);
      });
    }

    // Ready button
    var readyBtn = document.getElementById('trade-ready-btn');
    if (readyBtn && callbacks.onReady) {
      readyBtn.addEventListener('click', function() {
        callbacks.onReady();
      });
    }

    // Confirm button
    var confirmBtn = document.getElementById('trade-confirm-btn');
    if (confirmBtn && callbacks.onConfirm) {
      confirmBtn.addEventListener('click', function() {
        callbacks.onConfirm();
      });
    }

    // Cancel button
    var cancelBtn = document.getElementById('trade-cancel-btn');
    if (cancelBtn && callbacks.onCancel) {
      cancelBtn.addEventListener('click', function() {
        callbacks.onCancel();
      });
    }

    // Trade slot clicks (add or remove items)
    var tradeSlots = document.querySelectorAll('.trade-slot');
    tradeSlots.forEach(function(slot, idx) {
      slot.addEventListener('click', function() {
        if (localPlayer.items[idx] && callbacks.onRemoveItem) {
          callbacks.onRemoveItem(idx);
        } else if (!localPlayer.items[idx] && callbacks.onAddItem) {
          // Show inventory picker for empty slot
          showTradeItemPicker(idx, callbacks.onAddItem);
        }
      });
    });
  }

  /**
   * Show inventory item picker popup for trade window
   */
  function showTradeItemPicker(slotIndex, onAddItem) {
    // Remove existing picker
    var existing = document.getElementById('trade-item-picker');
    if (existing) existing.parentNode.removeChild(existing);

    var Inventory = typeof window !== 'undefined' ? window.Inventory : null;
    if (!Inventory) return;

    // Get player inventory from global
    var inv = typeof playerInventory !== 'undefined' ? playerInventory : null;
    if (!inv) {
      // Try to get from window
      inv = typeof window !== 'undefined' && window.playerInventory ? window.playerInventory : null;
    }
    if (!inv) return;

    var items = Inventory.getInventory(inv);
    if (!items || items.length === 0) {
      showNotification('No items in inventory to trade');
      return;
    }

    var picker = document.createElement('div');
    picker.id = 'trade-item-picker';
    picker.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.97);border:2px solid #4af;border-radius:12px;' +
      'padding:16px;width:320px;max-height:400px;overflow-y:auto;z-index:400;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.9);pointer-events:auto;';

    var html = '<div style="font-size:16px;font-weight:bold;color:#4af;margin-bottom:12px;text-align:center;">Select Item to Trade</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">';

    items.forEach(function(item, i) {
      var itemData = Inventory.getItemData(item.itemId);
      if (itemData) {
        html += '<div class="trade-pick-item" data-idx="' + i + '" data-itemid="' + item.itemId + '" ' +
          'style="background:rgba(255,255,255,0.08);border:2px solid #444;border-radius:6px;' +
          'padding:8px;text-align:center;cursor:pointer;transition:border-color 0.2s;">' +
          '<div style="font-size:24px;">' + itemData.icon + '</div>' +
          '<div style="font-size:9px;color:#ccc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + itemData.name + '</div>' +
          '<div style="font-size:10px;color:#888;">x' + (item.count || 1) + '</div>' +
          '</div>';
      }
    });

    html += '</div>';
    html += '<div style="text-align:center;margin-top:12px;">' +
      '<button id="trade-pick-cancel" style="padding:6px 16px;background:#555;color:#fff;border:none;border-radius:4px;cursor:pointer;">Cancel</button></div>';

    picker.innerHTML = html;
    document.body.appendChild(picker);

    // Attach click handlers
    var pickItems = picker.querySelectorAll('.trade-pick-item');
    pickItems.forEach(function(el) {
      el.addEventListener('click', function() {
        var itemId = el.getAttribute('data-itemid');
        onAddItem(slotIndex, itemId);
        picker.parentNode.removeChild(picker);
      });
    });

    var cancelBtn = document.getElementById('trade-pick-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        picker.parentNode.removeChild(picker);
      });
    }
  }

  /**
   * Hide trade window
   */
  function hideTradeWindow() {
    if (tradeWindowEl && tradeWindowEl.parentNode) {
      tradeWindowEl.parentNode.removeChild(tradeWindowEl);
      tradeWindowEl = null;
      currentTradeData = null;
    }
  }

  /**
   * Show trade complete notification
   * @param {string} partnerName - Trade partner's name
   */
  function showTradeComplete(partnerName) {
    showNotification('Trade completed with ' + partnerName + '!', 'success');
  }

  // ========================================================================
  // BUILD TOOLBAR
  // ========================================================================

  let buildToolbar = null;
  let selectedBuildType = 'bench';

  var BUILD_TYPES = [
    { id: 'bench', icon: '\u{1F6CB}', label: 'Bench', cost: 50 },
    { id: 'lantern', icon: '\u{1F4A1}', label: 'Lantern', cost: 75 },
    { id: 'signpost', icon: '\u{1F6A9}', label: 'Sign', cost: 40 },
    { id: 'fence', icon: '\u{1F6AA}', label: 'Fence', cost: 30 },
    { id: 'planter', icon: '\u{1F33F}', label: 'Planter', cost: 60 },
    { id: 'campfire', icon: '\u{1F525}', label: 'Fire', cost: 80 },
    { id: 'archway', icon: '\u{26E9}', label: 'Arch', cost: 150 },
    { id: 'table', icon: '\u{1F6CF}', label: 'Table', cost: 70 },
    { id: 'barrel', icon: '\u{1F6E2}', label: 'Barrel', cost: 45 },
    { id: 'crate', icon: '\u{1F4E6}', label: 'Crate', cost: 35 }
  ];

  function showBuildToolbar() {
    if (typeof document === 'undefined') return;

    if (buildToolbar) {
      buildToolbar.style.display = 'block';
      return;
    }

    buildToolbar = document.createElement('div');
    buildToolbar.id = 'build-toolbar';
    buildToolbar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      border-radius: 8px 8px 0 0;
      padding: 10px 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      z-index: 200;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-bottom: none;
      pointer-events: auto;
    `;

    // Title
    var title = document.createElement('div');
    title.style.cssText = `
      color: #fff;
      font-weight: bold;
      margin-right: 10px;
      font-size: 14px;
    `;
    title.textContent = 'BUILD MODE';
    buildToolbar.appendChild(title);

    // Build type buttons
    BUILD_TYPES.forEach(function(type) {
      var btn = document.createElement('div');
      btn.className = 'build-type-btn';
      btn.dataset.type = type.id;
      btn.style.cssText = `
        width: 60px;
        height: 60px;
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      `;

      var icon = document.createElement('div');
      icon.style.cssText = 'font-size: 24px; margin-bottom: 2px;';
      icon.textContent = type.icon;

      var label = document.createElement('div');
      label.style.cssText = 'font-size: 9px; color: #ccc;';
      label.textContent = type.label;

      var cost = document.createElement('div');
      cost.style.cssText = 'font-size: 8px; color: #ffa500;';
      cost.textContent = type.cost + ' Spark';

      btn.appendChild(icon);
      btn.appendChild(label);
      btn.appendChild(cost);

      btn.addEventListener('click', function() {
        selectedBuildType = type.id;
        updateBuildToolbar(selectedBuildType);
        if (typeof World !== 'undefined' && World.setBuildType) {
          World.setBuildType(type.id);
        }
      });

      btn.addEventListener('mouseenter', function() {
        btn.style.background = 'rgba(255, 255, 255, 0.2)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.6)';
      });

      btn.addEventListener('mouseleave', function() {
        if (type.id !== selectedBuildType) {
          btn.style.background = 'rgba(255, 255, 255, 0.1)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }
      });

      buildToolbar.appendChild(btn);
    });

    // Instructions
    var instructions = document.createElement('div');
    instructions.style.cssText = `
      margin-left: 15px;
      color: #ccc;
      font-size: 12px;
      line-height: 1.4;
    `;
    instructions.innerHTML = `
      <div>Click to place</div>
      <div>R to rotate</div>
      <div><strong>B or Esc</strong> to exit</div>
    `;
    buildToolbar.appendChild(instructions);

    document.body.appendChild(buildToolbar);

    updateBuildToolbar(selectedBuildType);
  }

  function hideBuildToolbar() {
    if (buildToolbar) {
      buildToolbar.style.display = 'none';
    }
  }

  function updateBuildToolbar(type) {
    if (!buildToolbar) return;
    selectedBuildType = type;

    var buttons = buildToolbar.querySelectorAll('.build-type-btn');
    buttons.forEach(function(btn) {
      if (btn.dataset.type === type) {
        btn.style.background = 'rgba(255, 215, 0, 0.3)';
        btn.style.borderColor = 'rgba(255, 215, 0, 0.8)';
        btn.style.borderWidth = '3px';
      } else {
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        btn.style.borderWidth = '2px';
      }
    });
  }

  // Settings Menu
  let settingsMenuPanel = null;
  let settingsData = {
    masterVolume: 50,
    musicVolume: 30,
    sfxVolume: 70,
    renderDistance: 'medium',
    particleDensity: 'medium',
    showFPS: false
  };

  function loadSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
      var stored = localStorage.getItem('zion_settings');
      if (stored) {
        var parsed = JSON.parse(stored);
        Object.assign(settingsData, parsed);
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  }

  function saveSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('zion_settings', JSON.stringify(settingsData));
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }
  }

  function getSettings() {
    return settingsData;
  }

  function showSettingsMenu() {
    if (settingsMenuPanel) return;

    var overlay = document.createElement('div');
    overlay.id = 'settings-menu-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    `;

    var panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(26, 26, 26, 0.95);
      border: 2px solid rgba(218, 165, 32, 0.5);
      border-radius: 12px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
    `;

    var title = document.createElement('h2');
    title.textContent = 'Settings';
    title.style.cssText = `
      margin: 0 0 25px 0;
      color: #DAA520;
      font-size: 28px;
      font-family: Georgia, serif;
      text-align: center;
      border-bottom: 2px solid rgba(218, 165, 32, 0.3);
      padding-bottom: 15px;
    `;
    panel.appendChild(title);

    // Volume Section
    var volumeSection = document.createElement('div');
    volumeSection.style.cssText = `
      margin-bottom: 25px;
    `;

    var volumeTitle = document.createElement('h3');
    volumeTitle.textContent = 'Audio';
    volumeTitle.style.cssText = `
      margin: 0 0 15px 0;
      color: #E8E0D8;
      font-size: 20px;
      font-family: Georgia, serif;
    `;
    volumeSection.appendChild(volumeTitle);

    // Master Volume
    volumeSection.appendChild(createSlider('Master Volume', 'masterVolume', settingsData.masterVolume));
    // Music Volume
    volumeSection.appendChild(createSlider('Music Volume', 'musicVolume', settingsData.musicVolume));
    // SFX Volume
    volumeSection.appendChild(createSlider('SFX Volume', 'sfxVolume', settingsData.sfxVolume));

    panel.appendChild(volumeSection);

    // Graphics Section
    var graphicsSection = document.createElement('div');
    graphicsSection.style.cssText = `
      margin-bottom: 25px;
    `;

    var graphicsTitle = document.createElement('h3');
    graphicsTitle.textContent = 'Graphics';
    graphicsTitle.style.cssText = `
      margin: 0 0 15px 0;
      color: #E8E0D8;
      font-size: 20px;
      font-family: Georgia, serif;
    `;
    graphicsSection.appendChild(graphicsTitle);

    // Render Distance
    graphicsSection.appendChild(createOptionButtons('Render Distance', 'renderDistance', ['low', 'medium', 'high'], settingsData.renderDistance));
    // Particle Density
    graphicsSection.appendChild(createOptionButtons('Particle Density', 'particleDensity', ['low', 'medium', 'high'], settingsData.particleDensity));
    // Show FPS Counter
    graphicsSection.appendChild(createCheckbox('Show FPS Counter', 'showFPS', settingsData.showFPS));

    panel.appendChild(graphicsSection);

    // Controls Section
    var controlsSection = document.createElement('div');
    controlsSection.style.cssText = `
      margin-bottom: 25px;
    `;

    var controlsTitle = document.createElement('h3');
    controlsTitle.textContent = 'Controls';
    controlsTitle.style.cssText = `
      margin: 0 0 15px 0;
      color: #E8E0D8;
      font-size: 20px;
      font-family: Georgia, serif;
    `;
    controlsSection.appendChild(controlsTitle);

    var controlsInfo = document.createElement('div');
    controlsInfo.style.cssText = `
      color: #A0978E;
      font-size: 14px;
      line-height: 1.8;
      font-family: system-ui, sans-serif;
    `;
    controlsInfo.innerHTML = `
      <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px;">
        <div><strong>W/A/S/D</strong></div><div>Move</div>
        <div><strong>Mouse</strong></div><div>Look around</div>
        <div><strong>E</strong></div><div>Interact</div>
        <div><strong>I</strong></div><div>Inventory</div>
        <div><strong>C</strong></div><div>Crafting</div>
        <div><strong>J</strong></div><div>Quest Log</div>
        <div><strong>M</strong></div><div>World Map</div>
        <div><strong>B</strong></div><div>Build Mode</div>
        <div><strong>F</strong></div><div>Emote Menu</div>
        <div><strong>T</strong></div><div>Trade</div>
        <div><strong>P</strong></div><div>Player Profile</div>
        <div><strong>Enter</strong></div><div>Chat</div>
        <div><strong>Escape</strong></div><div>Settings / Cancel</div>
      </div>
    `;
    controlsSection.appendChild(controlsInfo);

    panel.appendChild(controlsSection);

    // Resume Button
    var resumeBtn = document.createElement('button');
    resumeBtn.textContent = 'Resume';
    resumeBtn.style.cssText = `
      width: 100%;
      padding: 15px;
      background: rgba(218, 165, 32, 0.2);
      color: #DAA520;
      border: 2px solid #DAA520;
      border-radius: 8px;
      font-size: 18px;
      font-family: Georgia, serif;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 10px;
    `;
    resumeBtn.onmouseover = function() {
      this.style.background = 'rgba(218, 165, 32, 0.3)';
      this.style.borderColor = '#FFD700';
    };
    resumeBtn.onmouseout = function() {
      this.style.background = 'rgba(218, 165, 32, 0.2)';
      this.style.borderColor = '#DAA520';
    };
    resumeBtn.onclick = function() {
      hideSettingsMenu();
    };
    panel.appendChild(resumeBtn);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    settingsMenuPanel = overlay;
  }

  function hideSettingsMenu() {
    if (!settingsMenuPanel) return;
    document.body.removeChild(settingsMenuPanel);
    settingsMenuPanel = null;
  }

  function createSlider(label, key, value) {
    var container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 15px;
    `;

    var labelEl = document.createElement('label');
    labelEl.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      color: #E8E0D8;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    `;

    var labelText = document.createElement('span');
    labelText.textContent = label;

    var valueDisplay = document.createElement('span');
    valueDisplay.textContent = value;
    valueDisplay.style.color = '#DAA520';
    valueDisplay.style.fontWeight = 'bold';

    labelEl.appendChild(labelText);
    labelEl.appendChild(valueDisplay);
    container.appendChild(labelEl);

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = value;
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      outline: none;
      -webkit-appearance: none;
    `;

    slider.oninput = function() {
      valueDisplay.textContent = this.value;
      settingsData[key] = parseInt(this.value);
      saveSettings();
      applySettings();
    };

    container.appendChild(slider);
    return container;
  }

  function createOptionButtons(label, key, options, currentValue) {
    var container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 15px;
    `;

    var labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      margin-bottom: 8px;
      color: #E8E0D8;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    `;
    container.appendChild(labelEl);

    var buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 10px;
    `;

    options.forEach(function(option) {
      var btn = document.createElement('button');
      btn.textContent = option.charAt(0).toUpperCase() + option.slice(1);
      btn.style.cssText = `
        flex: 1;
        padding: 10px;
        background: ${option === currentValue ? 'rgba(218, 165, 32, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
        color: ${option === currentValue ? '#DAA520' : '#E8E0D8'};
        border: 2px solid ${option === currentValue ? '#DAA520' : 'rgba(255, 255, 255, 0.3)'};
        border-radius: 6px;
        font-size: 14px;
        font-family: system-ui, sans-serif;
        cursor: pointer;
        transition: all 0.3s ease;
      `;

      btn.onclick = function() {
        settingsData[key] = option;
        saveSettings();
        applySettings();

        // Update button styles
        Array.from(buttonsContainer.children).forEach(function(child) {
          child.style.background = 'rgba(255, 255, 255, 0.1)';
          child.style.color = '#E8E0D8';
          child.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        });
        btn.style.background = 'rgba(218, 165, 32, 0.3)';
        btn.style.color = '#DAA520';
        btn.style.borderColor = '#DAA520';
      };

      btn.onmouseover = function() {
        if (option !== currentValue) {
          this.style.background = 'rgba(255, 255, 255, 0.15)';
        }
      };

      btn.onmouseout = function() {
        if (option !== currentValue) {
          this.style.background = 'rgba(255, 255, 255, 0.1)';
        }
      };

      buttonsContainer.appendChild(btn);
    });

    container.appendChild(buttonsContainer);
    return container;
  }

  function createCheckbox(label, key, checked) {
    var container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.style.cssText = `
      width: 20px;
      height: 20px;
      cursor: pointer;
    `;

    checkbox.onchange = function() {
      settingsData[key] = this.checked;
      saveSettings();
      applySettings();
    };

    var labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      color: #E8E0D8;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      cursor: pointer;
    `;
    labelEl.onclick = function() {
      checkbox.checked = !checkbox.checked;
      checkbox.onchange();
    };

    container.appendChild(checkbox);
    container.appendChild(labelEl);
    return container;
  }

  function applySettings() {
    // Apply audio settings
    if (typeof Audio !== 'undefined' && Audio.setVolume) {
      Audio.setVolume('master', settingsData.masterVolume / 100);
      Audio.setVolume('music', settingsData.musicVolume / 100);
      Audio.setVolume('sfx', settingsData.sfxVolume / 100);
    }

    // FPS counter will be handled by main.js
    // Render distance and particle density would be applied by renderer/world systems
  }

  // Player Profile Panel
  var playerProfilePanel = null;

  function showProfilePanel(playerData, skillData, achievementData) {
    if (playerProfilePanel) {
      hideProfilePanel();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'player-profile-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(0,0,0,0.9);border:2px solid #d4af37;border-radius:12px;' +
      'padding:0;width:700px;max-height:85vh;overflow-y:auto;pointer-events:auto;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.8);z-index:300;';

    // Header with close button
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
      'padding:20px;background:rgba(212,175,55,0.1);border-bottom:1px solid #d4af37;';

    var title = document.createElement('div');
    title.textContent = 'Player Profile';
    title.style.cssText = 'font-size:24px;font-weight:bold;color:#d4af37;';
    header.appendChild(title);

    var closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'cursor:pointer;font-size:24px;color:#888;padding:0 8px;';
    closeBtn.onmouseover = function() { this.style.color = '#d4af37'; };
    closeBtn.onmouseout = function() { this.style.color = '#888'; };
    closeBtn.onclick = function() { hideProfilePanel(); };
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Content container
    var content = document.createElement('div');
    content.id = 'profile-content';
    content.style.cssText = 'padding:20px;';

    // Player info section with avatar
    var playerInfoSection = document.createElement('div');
    playerInfoSection.style.cssText = 'display:flex;align-items:center;margin-bottom:20px;' +
      'padding-bottom:20px;border-bottom:1px solid rgba(212,175,55,0.3);';

    // Avatar (colored circle with initial)
    var avatar = document.createElement('div');
    var initial = (playerData.name || 'P').charAt(0).toUpperCase();
    avatar.textContent = initial;
    avatar.style.cssText = 'width:80px;height:80px;border-radius:50%;background:#d4af37;' +
      'display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:bold;' +
      'color:#000;margin-right:20px;';
    playerInfoSection.appendChild(avatar);

    // Player details
    var playerDetails = document.createElement('div');
    playerDetails.style.cssText = 'flex:1;';

    var playerName = document.createElement('div');
    playerName.textContent = playerData.name || 'Player';
    playerName.style.cssText = 'font-size:22px;font-weight:bold;color:#fff;margin-bottom:8px;';
    playerDetails.appendChild(playerName);

    var reputationTier = document.createElement('div');
    var tier = playerData.reputationTier || 'Newcomer';
    reputationTier.textContent = 'Reputation: ' + tier;
    reputationTier.style.cssText = 'font-size:14px;color:#d4af37;margin-bottom:6px;';
    playerDetails.appendChild(reputationTier);

    var sparkBalance = document.createElement('div');
    sparkBalance.innerHTML = '<span style="color:#d4af37;">✦</span> ' + (playerData.sparkBalance || 0) + ' Spark';
    sparkBalance.style.cssText = 'font-size:16px;color:#fff;font-weight:bold;';
    playerDetails.appendChild(sparkBalance);

    playerInfoSection.appendChild(playerDetails);
    content.appendChild(playerInfoSection);

    // Skills section
    var skillsSection = document.createElement('div');
    skillsSection.id = 'profile-skills-section';
    skillsSection.style.cssText = 'margin-bottom:20px;';

    var skillsTitle = document.createElement('div');
    skillsTitle.textContent = 'Skills';
    skillsTitle.style.cssText = 'font-size:18px;font-weight:bold;color:#d4af37;margin-bottom:12px;';
    skillsSection.appendChild(skillsTitle);

    var skillNames = ['gardening', 'crafting', 'building', 'exploration', 'trading', 'social', 'combat', 'lore'];
    var skillIcons = {
      gardening: '🌱',
      crafting: '🔨',
      building: '🏗️',
      exploration: '🗺️',
      trading: '💰',
      social: '👥',
      combat: '⚔️',
      lore: '📖'
    };

    skillNames.forEach(function(skillName) {
      var skill = (skillData && skillData[skillName]) || { level: 1, xp: 0, xpToNext: 100 };
      var skillDiv = document.createElement('div');
      skillDiv.className = 'skill-row-' + skillName;
      skillDiv.style.cssText = 'margin-bottom:14px;';

      var skillHeader = document.createElement('div');
      skillHeader.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;';

      var skillLabel = document.createElement('div');
      var icon = skillIcons[skillName] || '⭐';
      skillLabel.innerHTML = icon + ' ' + skillName.charAt(0).toUpperCase() + skillName.slice(1);
      skillLabel.style.cssText = 'font-size:14px;color:#fff;font-weight:600;';
      skillHeader.appendChild(skillLabel);

      var skillLevel = document.createElement('div');
      skillLevel.textContent = 'Level ' + skill.level;
      skillLevel.style.cssText = 'font-size:13px;color:#d4af37;font-weight:bold;';
      skillHeader.appendChild(skillLevel);

      skillDiv.appendChild(skillHeader);

      // Progress bar
      var progressContainer = document.createElement('div');
      progressContainer.style.cssText = 'width:100%;height:10px;background:rgba(255,255,255,0.1);' +
        'border-radius:5px;overflow:hidden;position:relative;';

      var progressFill = document.createElement('div');
      var progressPercent = Math.min(100, (skill.xp / skill.xpToNext) * 100);
      progressFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#d4af37,#f4e4a6);' +
        'border-radius:5px;width:' + progressPercent + '%;transition:width 0.3s ease;';
      progressContainer.appendChild(progressFill);

      var progressText = document.createElement('div');
      progressText.textContent = skill.xp + ' / ' + skill.xpToNext + ' XP';
      progressText.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;' +
        'display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:bold;';
      progressContainer.appendChild(progressText);

      skillDiv.appendChild(progressContainer);
      skillsSection.appendChild(skillDiv);
    });

    content.appendChild(skillsSection);

    // Statistics section
    var statsSection = document.createElement('div');
    statsSection.id = 'profile-stats-section';
    statsSection.style.cssText = 'margin-bottom:20px;padding:15px;background:rgba(212,175,55,0.05);' +
      'border-radius:8px;border:1px solid rgba(212,175,55,0.2);';

    var statsTitle = document.createElement('div');
    statsTitle.textContent = 'Statistics';
    statsTitle.style.cssText = 'font-size:18px;font-weight:bold;color:#d4af37;margin-bottom:12px;';
    statsSection.appendChild(statsTitle);

    var statsGrid = document.createElement('div');
    statsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';

    var stats = [
      { label: 'Quests Completed', value: playerData.questsCompleted || 0 },
      { label: 'Discoveries Found', value: playerData.discoveriesFound || 0 },
      { label: 'Items Crafted', value: playerData.itemsCrafted || 0 },
      { label: 'Trades Completed', value: playerData.tradesCompleted || 0 },
      { label: 'Time Played', value: formatPlayTime(playerData.playTimeSeconds || 0) }
    ];

    stats.forEach(function(stat) {
      var statItem = document.createElement('div');
      statItem.className = 'stat-' + stat.label.toLowerCase().replace(/ /g, '-');
      statItem.style.cssText = 'padding:8px;background:rgba(0,0,0,0.3);border-radius:4px;';

      var statLabel = document.createElement('div');
      statLabel.textContent = stat.label;
      statLabel.style.cssText = 'font-size:11px;color:#888;margin-bottom:4px;';
      statItem.appendChild(statLabel);

      var statValue = document.createElement('div');
      statValue.textContent = stat.value;
      statValue.style.cssText = 'font-size:16px;color:#fff;font-weight:bold;';
      statItem.appendChild(statValue);

      statsGrid.appendChild(statItem);
    });

    statsSection.appendChild(statsGrid);
    content.appendChild(statsSection);

    // Recent Activity section
    var activitySection = document.createElement('div');
    activitySection.id = 'profile-activity-section';
    activitySection.style.cssText = 'margin-bottom:0;';

    var activityTitle = document.createElement('div');
    activityTitle.textContent = 'Recent Activity';
    activityTitle.style.cssText = 'font-size:18px;font-weight:bold;color:#d4af37;margin-bottom:12px;';
    activitySection.appendChild(activityTitle);

    var activities = playerData.recentActivities || ['Started playing ZION'];
    var activityList = document.createElement('div');
    activityList.style.cssText = 'max-height:150px;overflow-y:auto;';

    activities.slice(0, 10).forEach(function(activity) {
      var activityItem = document.createElement('div');
      activityItem.textContent = '• ' + activity;
      activityItem.style.cssText = 'font-size:12px;color:#aaa;padding:4px 0;line-height:1.4;';
      activityList.appendChild(activityItem);
    });

    activitySection.appendChild(activityList);
    content.appendChild(activitySection);

    // Close hint
    var closeHint = document.createElement('div');
    closeHint.textContent = 'Press P to close';
    closeHint.style.cssText = 'text-align:center;margin-top:15px;font-size:11px;color:#666;';
    content.appendChild(closeHint);

    panel.appendChild(content);
    document.body.appendChild(panel);
    playerProfilePanel = panel;
  }

  function hideProfilePanel() {
    if (!playerProfilePanel) return;
    if (playerProfilePanel.parentNode) {
      playerProfilePanel.parentNode.removeChild(playerProfilePanel);
    }
    playerProfilePanel = null;
  }

  function updateProfileStats(stats) {
    if (!playerProfilePanel) return;

    // Update statistics values
    if (stats.questsCompleted !== undefined) {
      var questsStat = playerProfilePanel.querySelector('.stat-quests-completed div:last-child');
      if (questsStat) questsStat.textContent = stats.questsCompleted;
    }
    if (stats.discoveriesFound !== undefined) {
      var discoveriesStat = playerProfilePanel.querySelector('.stat-discoveries-found div:last-child');
      if (discoveriesStat) discoveriesStat.textContent = stats.discoveriesFound;
    }
    if (stats.itemsCrafted !== undefined) {
      var craftedStat = playerProfilePanel.querySelector('.stat-items-crafted div:last-child');
      if (craftedStat) craftedStat.textContent = stats.itemsCrafted;
    }
    if (stats.tradesCompleted !== undefined) {
      var tradesStat = playerProfilePanel.querySelector('.stat-trades-completed div:last-child');
      if (tradesStat) tradesStat.textContent = stats.tradesCompleted;
    }
    if (stats.playTimeSeconds !== undefined) {
      var timeStat = playerProfilePanel.querySelector('.stat-time-played div:last-child');
      if (timeStat) timeStat.textContent = formatPlayTime(stats.playTimeSeconds);
    }
  }

  // Legacy function names for backward compatibility
  function showPlayerProfile(playerData) {
    showProfilePanel(playerData, null, null);
  }

  function hidePlayerProfile() {
    hideProfilePanel();
  }

  function formatPlayTime(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return hours + 'h ' + minutes + 'm';
    }
    return minutes + 'm';
  }

  // Discovery Log Panel
  var discoveryLogPanel = null;

  function showDiscoveryLog(discoveries) {
    if (discoveryLogPanel) return;

    var panel = document.createElement('div');
    panel.id = 'discovery-log-overlay';
    panel.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    var content = document.createElement('div');
    content.style.cssText = `
      width: 80%;
      max-width: 900px;
      height: 80%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      padding: 30px;
      overflow-y: auto;
      box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
      border: 2px solid #3a506b;
    `;

    var header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #3a506b;
    `;

    var title = document.createElement('h2');
    title.textContent = 'Discovery Log';
    title.style.cssText = `
      margin: 0;
      color: #e0e0e0;
      font-size: 28px;
      font-family: system-ui, sans-serif;
      font-weight: 600;
    `;

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = `
      background: #c0392b;
      border: none;
      color: white;
      width: 35px;
      height: 35px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
    `;
    closeBtn.onclick = hideDiscoveryLog;

    header.appendChild(title);
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Group discoveries by zone
    var discoveryByZone = {};
    var totalDiscoveries = 0;
    if (discoveries && discoveries.length > 0) {
      discoveries.forEach(function(disc) {
        var zone = disc.zone || 'Unknown';
        if (!discoveryByZone[zone]) {
          discoveryByZone[zone] = [];
        }
        discoveryByZone[zone].push(disc);
        totalDiscoveries++;
      });
    }

    // Display discoveries by zone
    Object.keys(discoveryByZone).forEach(function(zone) {
      var zoneSection = document.createElement('div');
      zoneSection.style.cssText = `
        margin-bottom: 30px;
      `;

      var zoneHeader = document.createElement('div');
      zoneHeader.textContent = zone + ' (' + discoveryByZone[zone].length + ' discoveries)';
      zoneHeader.style.cssText = `
        color: #5dade2;
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 15px;
        font-family: system-ui, sans-serif;
      `;
      zoneSection.appendChild(zoneHeader);

      discoveryByZone[zone].forEach(function(disc) {
        var rarityColors = {
          common: '#ffffff',
          uncommon: '#1eff00',
          rare: '#0070dd',
          epic: '#a335ee',
          legendary: '#ff8000'
        };
        var color = rarityColors[disc.rarity] || '#ffffff';

        var discItem = document.createElement('div');
        discItem.style.cssText = `
          background: rgba(255, 255, 255, 0.05);
          border-left: 4px solid ` + color + `;
          padding: 12px 15px;
          margin-bottom: 10px;
          border-radius: 6px;
        `;

        var discName = document.createElement('div');
        discName.textContent = disc.name;
        discName.style.cssText = `
          color: ` + color + `;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 5px;
          font-family: system-ui, sans-serif;
        `;

        var discDesc = document.createElement('div');
        discDesc.textContent = disc.description || 'No description available';
        discDesc.style.cssText = `
          color: #b0b0b0;
          font-size: 14px;
          margin-bottom: 5px;
          font-family: system-ui, sans-serif;
        `;

        var discMeta = document.createElement('div');
        discMeta.textContent = 'Discovered: ' + (disc.timestamp ? new Date(disc.timestamp).toLocaleDateString() : 'Unknown');
        discMeta.style.cssText = `
          color: #808080;
          font-size: 12px;
          font-style: italic;
          font-family: system-ui, sans-serif;
        `;

        discItem.appendChild(discName);
        discItem.appendChild(discDesc);
        discItem.appendChild(discMeta);
        zoneSection.appendChild(discItem);
      });

      content.appendChild(zoneSection);
    });

    if (totalDiscoveries === 0) {
      var emptyMsg = document.createElement('div');
      emptyMsg.textContent = 'No discoveries yet. Explore the world to find new locations, creatures, and secrets!';
      emptyMsg.style.cssText = `
        color: #a0a0a0;
        font-size: 16px;
        text-align: center;
        margin-top: 50px;
        font-family: system-ui, sans-serif;
      `;
      content.appendChild(emptyMsg);
    }

    panel.appendChild(content);
    document.body.appendChild(panel);
    discoveryLogPanel = panel;
    panel.className = 'discovery-panel';
    requestAnimationFrame(function() {
      panel.classList.add('visible');
    });

    // Close on Escape
    var escapeHandler = function(e) {
      if (e.key === 'Escape') {
        hideDiscoveryLog();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    panel.escapeHandler = escapeHandler;
  }

  function hideDiscoveryLog() {
    if (!discoveryLogPanel) return;
    if (discoveryLogPanel.escapeHandler) {
      document.removeEventListener('keydown', discoveryLogPanel.escapeHandler);
    }
    discoveryLogPanel.classList.remove('visible');
    setTimeout(function() {
      if (discoveryLogPanel && discoveryLogPanel.parentNode) {
        document.body.removeChild(discoveryLogPanel);
        discoveryLogPanel = null;
      }
    }, 250);
  }

  // Lore Book Panel
  var loreBookPanel = null;

  /**
   * Show the Lore Journal panel
   * @param {string} playerId - The player's ID
   * @param {object} state - Game state object containing discoveries
   */
  function showLoreJournal(playerId, state) {
    if (loreBookPanel) {
      hideLoreJournal();
      return;
    }

    // Get unlocked lore and lore categories from Exploration module
    var unlockedLore = [];
    var loreCategories = {};

    if (typeof window !== 'undefined' && window.Exploration) {
      unlockedLore = window.Exploration.getUnlockedLore(playerId, state);
      loreCategories = window.Exploration.getLoreCategories();
    }

    // Group unlocked lore by category
    var loreByCategory = {};
    unlockedLore.forEach(function(entry) {
      if (!loreByCategory[entry.category]) {
        loreByCategory[entry.category] = [];
      }
      loreByCategory[entry.category].push(entry);
    });

    // Get all lore entries from Exploration module to show locked ones
    var allLoreEntries = window.Exploration ? window.Exploration.LORE_ENTRIES : {};

    // Panel overlay
    var panel = document.createElement('div');
    panel.className = 'lore-journal-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 85%;
      max-width: 950px;
      height: 85vh;
      background: linear-gradient(135deg, #3d2817 0%, #2a1810 100%);
      border: 3px solid #8b6914;
      border-radius: 10px;
      box-shadow: 0 15px 60px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(139, 105, 20, 0.1);
      z-index: 10000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
    `;

    // Header
    var header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(180deg, rgba(61, 40, 23, 0.9) 0%, rgba(42, 24, 16, 0.95) 100%);
      padding: 20px 30px;
      border-bottom: 2px solid #8b6914;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    var titleContainer = document.createElement('div');

    var title = document.createElement('h2');
    title.textContent = 'Lore Journal';
    title.style.cssText = `
      margin: 0 0 5px 0;
      color: #f4e4c1;
      font-size: 30px;
      font-family: Georgia, serif;
      font-weight: 600;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
    `;
    titleContainer.appendChild(title);

    // Overall completion
    var totalLore = Object.keys(allLoreEntries).length;
    var unlockedCount = unlockedLore.length;
    var completionPct = totalLore > 0 ? Math.round((unlockedCount / totalLore) * 100) : 0;

    var completion = document.createElement('div');
    completion.textContent = 'Completion: ' + unlockedCount + '/' + totalLore + ' (' + completionPct + '%)';
    completion.style.cssText = `
      color: #d4af37;
      font-size: 14px;
      font-family: Georgia, serif;
    `;
    titleContainer.appendChild(completion);

    header.appendChild(titleContainer);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '\u00D7';
    closeBtn.style.cssText = `
      background: rgba(139, 69, 19, 0.6);
      border: 2px solid #8b6914;
      color: #f4e4c1;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 28px;
      font-weight: bold;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    `;
    closeBtn.onmouseover = function() {
      this.style.background = 'rgba(218, 165, 32, 0.4)';
      this.style.borderColor = '#d4af37';
    };
    closeBtn.onmouseout = function() {
      this.style.background = 'rgba(139, 69, 19, 0.6)';
      this.style.borderColor = '#8b6914';
    };
    closeBtn.onclick = hideLoreJournal;
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Category tabs
    var tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = `
      display: flex;
      gap: 5px;
      padding: 15px 20px 0 20px;
      background: rgba(42, 24, 16, 0.7);
      overflow-x: auto;
      border-bottom: 2px solid #8b6914;
    `;

    // Content area
    var contentArea = document.createElement('div');
    contentArea.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 25px 30px;
      background: linear-gradient(180deg, rgba(42, 24, 16, 0.8) 0%, rgba(26, 15, 10, 0.9) 100%);
    `;

    // Category tabs array
    var categories = ['origins', 'artifacts', 'landmarks', 'nature', 'mysteries', 'art', 'history'];
    var currentCategory = categories[0];

    // Function to render category content
    function renderCategory(category) {
      contentArea.innerHTML = '';

      // Category header with progress
      var categoryHeader = document.createElement('div');
      categoryHeader.style.cssText = `
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(212, 175, 55, 0.3);
      `;

      var categoryTitle = document.createElement('h3');
      categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      categoryTitle.style.cssText = `
        margin: 0 0 8px 0;
        color: #d4af37;
        font-size: 24px;
        font-family: Georgia, serif;
        font-weight: 600;
      `;
      categoryHeader.appendChild(categoryTitle);

      // Count entries in this category
      var categoryTotal = 0;
      var categoryUnlocked = 0;
      for (var loreId in allLoreEntries) {
        if (allLoreEntries[loreId].category === category) {
          categoryTotal++;
          if (loreByCategory[category] && loreByCategory[category].some(function(e) { return e.id === loreId; })) {
            categoryUnlocked++;
          }
        }
      }

      var categoryProgress = document.createElement('div');
      categoryProgress.className = 'lore-progress';
      categoryProgress.textContent = 'Discovered: ' + categoryUnlocked + '/' + categoryTotal;
      categoryProgress.style.cssText = `
        color: #c8b896;
        font-size: 13px;
        font-family: Georgia, serif;
      `;
      categoryHeader.appendChild(categoryProgress);

      contentArea.appendChild(categoryHeader);

      // Render entries for this category
      var entriesContainer = document.createElement('div');
      entriesContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 15px;
      `;

      // Show all entries (unlocked and locked)
      for (var loreId in allLoreEntries) {
        var loreEntry = allLoreEntries[loreId];
        if (loreEntry.category !== category) continue;

        var isUnlocked = loreByCategory[category] && loreByCategory[category].some(function(e) { return e.id === loreId; });

        var entryDiv = document.createElement('div');
        entryDiv.className = isUnlocked ? 'lore-entry' : 'lore-entry lore-entry-locked';
        entryDiv.style.cssText = `
          background: ${isUnlocked ? 'rgba(212, 175, 55, 0.08)' : 'rgba(100, 80, 60, 0.15)'};
          border-left: 4px solid ${isUnlocked ? '#d4af37' : '#666'};
          padding: 18px 20px;
          border-radius: 6px;
          transition: background 0.2s ease;
          ${!isUnlocked ? 'filter: blur(0.5px); opacity: 0.6;' : ''}
        `;

        if (isUnlocked) {
          entryDiv.onmouseover = function() {
            this.style.background = 'rgba(212, 175, 55, 0.15)';
          };
          entryDiv.onmouseout = function() {
            this.style.background = 'rgba(212, 175, 55, 0.08)';
          };
        }

        var entryTitle = document.createElement('div');
        entryTitle.textContent = isUnlocked ? loreEntry.title : '???';
        entryTitle.style.cssText = `
          color: ${isUnlocked ? '#f4e4c1' : '#888'};
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
          font-family: Georgia, serif;
        `;
        entryDiv.appendChild(entryTitle);

        var entryText = document.createElement('div');
        if (isUnlocked) {
          entryText.textContent = loreEntry.text;
          entryText.style.cssText = `
            color: #c8b896;
            font-size: 14px;
            line-height: 1.7;
            font-family: Georgia, serif;
          `;
        } else {
          // Show hint for locked entries
          entryText.textContent = 'Undiscovered... Explore the world to unlock this lore.';
          entryText.style.cssText = `
            color: #777;
            font-size: 13px;
            font-style: italic;
            line-height: 1.6;
            font-family: Georgia, serif;
          `;
        }
        entryDiv.appendChild(entryText);

        entriesContainer.appendChild(entryDiv);
      }

      contentArea.appendChild(entriesContainer);
    }

    // Create tabs
    categories.forEach(function(category) {
      var tab = document.createElement('button');
      tab.className = 'lore-category-tab';
      tab.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      tab.style.cssText = `
        background: ${category === currentCategory ? 'rgba(212, 175, 55, 0.3)' : 'rgba(100, 80, 60, 0.2)'};
        border: 2px solid ${category === currentCategory ? '#d4af37' : '#666'};
        border-bottom: none;
        border-radius: 6px 6px 0 0;
        color: ${category === currentCategory ? '#f4e4c1' : '#a0978e'};
        padding: 10px 20px;
        font-size: 14px;
        font-family: Georgia, serif;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        font-weight: ${category === currentCategory ? '600' : '400'};
      `;

      tab.onclick = function() {
        currentCategory = category;
        // Update all tabs
        var allTabs = tabsContainer.querySelectorAll('.lore-category-tab');
        allTabs.forEach(function(t) {
          var isActive = t.textContent.toLowerCase() === category;
          t.style.background = isActive ? 'rgba(212, 175, 55, 0.3)' : 'rgba(100, 80, 60, 0.2)';
          t.style.borderColor = isActive ? '#d4af37' : '#666';
          t.style.color = isActive ? '#f4e4c1' : '#a0978e';
          t.style.fontWeight = isActive ? '600' : '400';
        });
        renderCategory(category);
      };

      tab.onmouseover = function() {
        if (this.textContent.toLowerCase() !== currentCategory) {
          this.style.background = 'rgba(139, 105, 20, 0.3)';
          this.style.color = '#d4af37';
        }
      };
      tab.onmouseout = function() {
        if (this.textContent.toLowerCase() !== currentCategory) {
          this.style.background = 'rgba(100, 80, 60, 0.2)';
          this.style.color = '#a0978e';
        }
      };

      tabsContainer.appendChild(tab);
    });

    panel.appendChild(tabsContainer);
    panel.appendChild(contentArea);

    // Render initial category
    renderCategory(currentCategory);

    document.body.appendChild(panel);
    loreBookPanel = panel;
    requestAnimationFrame(function() {
      panel.classList.add('visible');
    });

    // Close on Escape
    var escapeHandler = function(e) {
      if (e.key === 'Escape') {
        hideLoreJournal();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    panel.escapeHandler = escapeHandler;
  }

  function hideLoreJournal() {
    if (!loreBookPanel) return;
    if (loreBookPanel.escapeHandler) {
      document.removeEventListener('keydown', loreBookPanel.escapeHandler);
    }
    loreBookPanel.classList.remove('visible');
    setTimeout(function() {
      if (loreBookPanel && loreBookPanel.parentNode) {
        document.body.removeChild(loreBookPanel);
        loreBookPanel = null;
      }
    }, 250);
  }

  function toggleLoreJournal(playerId, state) {
    if (loreBookPanel) {
      hideLoreJournal();
    } else {
      showLoreJournal(playerId, state);
    }
  }

  // Legacy compatibility - keep old function names
  function showLoreBook(playerId, state) {
    showLoreJournal(playerId, state);
  }

  function hideLoreBook() {
    hideLoreJournal();
  }

  // Achievement Toast
  function showAchievementToast(achievement) {
    if (typeof document === 'undefined') return;

    var toast = document.createElement('div');
    toast.className = 'achievement-toast';

    var icon = document.createElement('div');
    icon.className = 'achievement-toast-icon';
    icon.textContent = achievement.icon || '⭐';

    var textContainer = document.createElement('div');
    textContainer.className = 'achievement-toast-text';

    var label = document.createElement('div');
    label.className = 'achievement-toast-label';
    label.textContent = 'ACHIEVEMENT UNLOCKED';

    var achievementName = document.createElement('div');
    achievementName.className = 'achievement-toast-name';
    achievementName.textContent = achievement.name || 'Unknown Achievement';

    textContainer.appendChild(label);
    textContainer.appendChild(achievementName);

    toast.appendChild(icon);
    toast.appendChild(textContainer);
    document.body.appendChild(toast);

    // Auto-remove after animation completes (4s total: 0.4s slide + 3s stay + 0.5s fade)
    setTimeout(function() {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 4000);
  }

  // Discovery Popup
  function showDiscoveryPopup(discovery) {
    var popup = document.createElement('div');
    popup.className = 'discovery-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 3px solid #5dade2;
      border-radius: 12px;
      padding: 30px;
      min-width: 400px;
      box-shadow: 0 0 50px rgba(93, 173, 226, 0.6);
      z-index: 10001;
    `;

    var header = document.createElement('div');
    header.textContent = 'NEW DISCOVERY';
    header.style.cssText = `
      color: #ffd700;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 15px;
      font-family: system-ui, sans-serif;
      letter-spacing: 2px;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    `;

    var rarityColors = {
      common: '#ffffff',
      uncommon: '#1eff00',
      rare: '#0070dd',
      epic: '#a335ee',
      legendary: '#ff8000'
    };
    var color = rarityColors[discovery.rarity] || '#ffffff';

    var discoveryName = document.createElement('div');
    discoveryName.textContent = discovery.name || 'Unknown Discovery';
    discoveryName.style.cssText = `
      color: ` + color + `;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 10px;
      font-family: system-ui, sans-serif;
      text-shadow: 0 0 10px ` + color + `;
    `;

    var discoveryDesc = document.createElement('div');
    discoveryDesc.textContent = discovery.description || '';
    discoveryDesc.style.cssText = `
      color: #e0e0e0;
      font-size: 16px;
      text-align: center;
      margin-bottom: 15px;
      line-height: 1.5;
      font-family: system-ui, sans-serif;
    `;

    var rewardText = document.createElement('div');
    rewardText.textContent = '+ ' + (discovery.sparkReward || 0) + ' Spark';
    rewardText.style.cssText = `
      color: #ffd700;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      font-family: system-ui, sans-serif;
    `;

    popup.appendChild(header);
    popup.appendChild(discoveryName);
    popup.appendChild(discoveryDesc);
    popup.appendChild(rewardText);
    document.body.appendChild(popup);

    // Animate in
    requestAnimationFrame(function() {
      popup.classList.add('visible');
    });

    // Auto-close after 4 seconds
    setTimeout(function() {
      popup.classList.remove('visible');
      setTimeout(function() {
        if (popup.parentNode) {
          document.body.removeChild(popup);
        }
      }, 300);
    }, 4000);

    // Click to close
    popup.onclick = function() {
      popup.classList.remove('visible');
      setTimeout(function() {
        if (popup.parentNode) {
          document.body.removeChild(popup);
        }
      }, 300);
    };
  }

  // ============================================================================
  // SKILLS PANEL
  // ============================================================================

  var skillsPanel = null;

  function showSkillsPanel(skillsData) {
    if (skillsPanel) return;

    var panel = document.createElement('div');
    panel.id = 'skills-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(20, 25, 35, 0.98), rgba(30, 35, 45, 0.98));
      border: 2px solid rgba(100, 150, 255, 0.3);
      border-radius: 12px;
      padding: 25px;
      width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      font-family: system-ui, sans-serif;
      pointer-events: auto;
    `;

    var header = document.createElement('div');
    header.innerHTML = '<h2 style="margin: 0 0 20px 0; color: #fff; font-size: 24px;">Skills</h2>';
    panel.appendChild(header);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
    `;
    closeBtn.onclick = hideSkillsPanel;
    panel.appendChild(closeBtn);

    for (var skillName in skillsData) {
      var skill = skillsData[skillName];
      var skillDiv = document.createElement('div');
      skillDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 15px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
      `;

      var skillHeader = document.createElement('div');
      skillHeader.innerHTML = `
        <span style="color: #4af; font-weight: bold; font-size: 16px;">${skillName.charAt(0).toUpperCase() + skillName.slice(1)}</span>
        <span style="color: #888; float: right;">${skill.levelName} (Level ${skill.level})</span>
      `;
      skillDiv.appendChild(skillHeader);

      var xpBar = document.createElement('div');
      xpBar.style.cssText = `
        margin-top: 8px;
        width: 100%;
        height: 20px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 10px;
        overflow: hidden;
        position: relative;
      `;

      var nextLevelXP = 1000;
      var currentLevelXP = 0;
      if (typeof window !== 'undefined' && window.Mentoring && window.Mentoring.SKILLS) {
        var skillConfig = window.Mentoring.SKILLS[skillName];
        if (skillConfig && skill.level < skillConfig.xpPerLevel.length - 1) {
          nextLevelXP = skillConfig.xpPerLevel[skill.level + 1];
          currentLevelXP = skillConfig.xpPerLevel[skill.level];
        }
      }

      var xpProgress = skill.xp - currentLevelXP;
      var xpNeeded = nextLevelXP - currentLevelXP;
      var progressPercent = skill.level >= 4 ? 100 : Math.min(100, (xpProgress / xpNeeded) * 100);

      var xpFill = document.createElement('div');
      xpFill.style.cssText = `
        width: ${progressPercent}%;
        height: 100%;
        background: linear-gradient(90deg, #4af, #a8f);
        transition: width 0.3s ease;
      `;
      xpBar.appendChild(xpFill);

      var xpText = document.createElement('div');
      xpText.textContent = skill.level >= 4 ? 'MAX LEVEL' : skill.xp + ' / ' + nextLevelXP + ' XP';
      xpText.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: bold;
      `;
      xpBar.appendChild(xpText);

      skillDiv.appendChild(xpBar);
      panel.appendChild(skillDiv);
    }

    document.body.appendChild(panel);
    skillsPanel = panel;
  }

  function hideSkillsPanel() {
    if (!skillsPanel) return;
    document.body.removeChild(skillsPanel);
    skillsPanel = null;
  }

  // ============================================================================
  // MENTOR OFFER PANEL
  // ============================================================================

  var mentorOfferPanel = null;

  function showMentorOffer(offerData, acceptCallback, declineCallback) {
    if (mentorOfferPanel) return;

    var panel = document.createElement('div');
    panel.id = 'mentor-offer-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(20, 25, 35, 0.98), rgba(30, 35, 45, 0.98));
      border: 2px solid rgba(255, 200, 100, 0.5);
      border-radius: 12px;
      padding: 25px;
      width: 400px;
      z-index: 10001;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      font-family: system-ui, sans-serif;
      text-align: center;
      pointer-events: auto;
    `;

    panel.innerHTML = `
      <h3 style="color: #ffa500; margin: 0 0 15px 0;">Mentorship Offer</h3>
      <p style="color: #fff; margin-bottom: 10px;">
        <strong>${offerData.mentorId}</strong> wants to mentor you in <strong>${offerData.skill}</strong>
      </p>
      <p style="color: #888; font-size: 13px; margin-bottom: 20px;">
        Complete 5 lesson steps to gain XP and unlock advanced techniques.
      </p>
    `;

    var buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: center;';

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.cssText = `
      padding: 10px 24px;
      background: linear-gradient(135deg, #4af, #a8f);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    `;
    acceptBtn.onclick = function() {
      acceptCallback(offerData.id);
      document.body.removeChild(mentorOfferPanel);
      mentorOfferPanel = null;
    };

    var declineBtn = document.createElement('button');
    declineBtn.textContent = 'Decline';
    declineBtn.style.cssText = `
      padding: 10px 24px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
    `;
    declineBtn.onclick = function() {
      declineCallback(offerData.id);
      document.body.removeChild(mentorOfferPanel);
      mentorOfferPanel = null;
    };

    buttonContainer.appendChild(acceptBtn);
    buttonContainer.appendChild(declineBtn);
    panel.appendChild(buttonContainer);

    document.body.appendChild(panel);
    mentorOfferPanel = panel;
  }

  // ============================================================================
  // LESSON PROGRESS PANEL
  // ============================================================================

  var lessonProgressPanel = null;

  function showLessonProgress(mentorshipData) {
    if (lessonProgressPanel) {
      document.body.removeChild(lessonProgressPanel);
      lessonProgressPanel = null;
    }

    var panel = document.createElement('div');
    panel.id = 'lesson-progress-panel';
    panel.style.cssText = `
      position: fixed;
      top: 120px;
      right: 20px;
      background: rgba(20, 25, 35, 0.95);
      border: 2px solid rgba(255, 200, 100, 0.5);
      border-radius: 8px;
      padding: 15px;
      width: 300px;
      z-index: 9999;
      font-family: system-ui, sans-serif;
      pointer-events: auto;
    `;

    var progress = mentorshipData.stepsCompleted / mentorshipData.totalSteps;
    var progressPercent = Math.round(progress * 100);

    panel.innerHTML = `
      <h4 style="color: #ffa500; margin: 0 0 10px 0; font-size: 14px;">Mentorship Progress</h4>
      <p style="color: #fff; font-size: 13px; margin: 5px 0;">
        <strong>${mentorshipData.skill}</strong>
      </p>
      <p style="color: #888; font-size: 12px; margin: 5px 0;">
        Steps: ${mentorshipData.stepsCompleted} / ${mentorshipData.totalSteps}
      </p>
      <div style="width: 100%; height: 16px; background: rgba(0,0,0,0.5); border-radius: 8px; overflow: hidden; margin-top: 8px;">
        <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, #ffa500, #ffcc00);"></div>
      </div>
    `;

    document.body.appendChild(panel);
    lessonProgressPanel = panel;
  }

  // ============================================================================
  // COMPOSE PANEL - Music Composition System
  // ============================================================================

  var composePanel = null;
  var audioContext = null;
  var recordedNotes = [];
  var isRecording = false;
  var recordingStartTime = 0;
  var currentInstrument = 'sine';

  // Note frequency map for C4 to C6 (2 octaves + middle C)
  var noteFrequencies = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50
  };

  var noteOrder = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'];

  function initAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  function playNote(noteName, duration) {
    var ctx = initAudioContext();
    var frequency = noteFrequencies[noteName];
    if (!frequency) return;

    var oscillator = ctx.createOscillator();
    var gainNode = ctx.createGain();

    oscillator.type = currentInstrument;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (duration || 0.5));

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + (duration || 0.5));
  }

  function playComposition(notes) {
    if (!notes || notes.length === 0) {
      showNotification('No notes to play', 'warning');
      return;
    }

    var ctx = initAudioContext();
    var currentTime = ctx.currentTime;

    notes.forEach(function(note) {
      var startTime = currentTime + (note.time / 1000);
      var frequency = noteFrequencies[note.note];
      if (!frequency) return;

      var oscillator = ctx.createOscillator();
      var gainNode = ctx.createGain();

      oscillator.type = note.instrument || 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    });
  }

  function showComposePanel(composeCallback) {
    if (composePanel) return;

    var panel = document.createElement('div');
    panel.id = 'compose-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(20, 25, 35, 0.98), rgba(30, 35, 45, 0.98));
      border: 2px solid rgba(212, 175, 55, 0.7);
      border-radius: 12px;
      padding: 25px;
      width: 800px;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      font-family: system-ui, sans-serif;
      pointer-events: auto;
    `;

    var header = document.createElement('div');
    header.innerHTML = '<h2 style="margin: 0 0 20px 0; color: #d4af37; font-size: 24px;">Compose Music</h2>';
    panel.appendChild(header);

    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 8px 16px;
      background: rgba(212, 175, 55, 0.2);
      color: #d4af37;
      border: 1px solid rgba(212, 175, 55, 0.5);
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    `;
    closeBtn.onclick = hideComposePanel;
    panel.appendChild(closeBtn);

    var form = document.createElement('div');

    // Instrument selector
    var instrumentLabel = document.createElement('label');
    instrumentLabel.textContent = 'Instrument:';
    instrumentLabel.style.cssText = 'display: block; color: #d4af37; margin-bottom: 5px; font-size: 14px; font-weight: bold;';
    form.appendChild(instrumentLabel);

    var instrumentSelect = document.createElement('select');
    instrumentSelect.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-bottom: 20px;
      background: rgba(0, 0, 0, 0.5);
      color: #d4af37;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    `;

    var instruments = [
      { value: 'sine', label: 'Flute (Sine)' },
      { value: 'triangle', label: 'Soft Tone (Triangle)' },
      { value: 'square', label: 'Reed (Square)' },
      { value: 'sawtooth', label: 'Strings (Sawtooth)' }
    ];

    instruments.forEach(function(inst) {
      var option = document.createElement('option');
      option.value = inst.value;
      option.textContent = inst.label;
      instrumentSelect.appendChild(option);
    });

    instrumentSelect.onchange = function() {
      currentInstrument = instrumentSelect.value;
    };
    form.appendChild(instrumentSelect);

    // Piano keyboard
    var keyboardContainer = document.createElement('div');
    keyboardContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 4px;
      margin-bottom: 20px;
      padding: 20px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      flex-wrap: wrap;
    `;

    noteOrder.forEach(function(noteName) {
      var key = document.createElement('button');
      var isBlackKey = noteName.includes('C') || noteName.includes('F');

      key.textContent = noteName;
      key.style.cssText = `
        padding: 40px 12px;
        background: ${isBlackKey ? 'linear-gradient(135deg, #d4af37, #f4d03f)' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(230, 230, 230, 0.9))'};
        color: ${isBlackKey ? '#000' : '#333'};
        border: 2px solid ${isBlackKey ? '#d4af37' : '#999'};
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 12px;
        min-width: 45px;
        transition: all 0.1s;
      `;

      key.onmousedown = function() {
        key.style.transform = 'scale(0.95)';
        key.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.8)';
        playNote(noteName, 0.5);

        if (isRecording) {
          var currentTime = Date.now() - recordingStartTime;
          recordedNotes.push({
            note: noteName,
            time: currentTime,
            instrument: currentInstrument
          });
          updateNoteDisplay();
        }
      };

      key.onmouseup = function() {
        key.style.transform = 'scale(1)';
        key.style.boxShadow = 'none';
      };

      key.onmouseleave = function() {
        key.style.transform = 'scale(1)';
        key.style.boxShadow = 'none';
      };

      keyboardContainer.appendChild(key);
    });

    form.appendChild(keyboardContainer);

    // Control buttons
    var controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    `;

    var recordBtn = document.createElement('button');
    recordBtn.textContent = 'Record';
    recordBtn.id = 'record-btn';
    recordBtn.style.cssText = `
      flex: 1;
      padding: 12px;
      background: linear-gradient(135deg, #ff4444, #cc0000);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
    `;
    recordBtn.onclick = function() {
      if (!isRecording) {
        isRecording = true;
        recordedNotes = [];
        recordingStartTime = Date.now();
        recordBtn.textContent = 'Stop Recording';
        recordBtn.style.background = 'linear-gradient(135deg, #ff8844, #ff4400)';
        showNotification('Recording started...', 'info');
      } else {
        isRecording = false;
        recordBtn.textContent = 'Record';
        recordBtn.style.background = 'linear-gradient(135deg, #ff4444, #cc0000)';
        showNotification('Recording stopped. ' + recordedNotes.length + ' notes captured.', 'success');
      }
    };
    controlsContainer.appendChild(recordBtn);

    var playbackBtn = document.createElement('button');
    playbackBtn.textContent = 'Playback';
    playbackBtn.style.cssText = `
      flex: 1;
      padding: 12px;
      background: linear-gradient(135deg, #44ff44, #00cc00);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
    `;
    playbackBtn.onclick = function() {
      if (recordedNotes.length === 0) {
        showNotification('No notes recorded yet', 'warning');
        return;
      }
      playComposition(recordedNotes);
      showNotification('Playing composition...', 'info');
    };
    controlsContainer.appendChild(playbackBtn);

    var clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = `
      flex: 1;
      padding: 12px;
      background: linear-gradient(135deg, #ff9944, #cc6600);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
    `;
    clearBtn.onclick = function() {
      recordedNotes = [];
      isRecording = false;
      var recordButton = document.getElementById('record-btn');
      if (recordButton) {
        recordButton.textContent = 'Record';
        recordButton.style.background = 'linear-gradient(135deg, #ff4444, #cc0000)';
      }
      updateNoteDisplay();
      showNotification('Composition cleared', 'info');
    };
    controlsContainer.appendChild(clearBtn);

    form.appendChild(controlsContainer);

    // Note display
    var noteDisplayLabel = document.createElement('label');
    noteDisplayLabel.textContent = 'Composition:';
    noteDisplayLabel.style.cssText = 'display: block; color: #d4af37; margin-bottom: 5px; font-size: 14px; font-weight: bold;';
    form.appendChild(noteDisplayLabel);

    var noteDisplay = document.createElement('div');
    noteDisplay.id = 'note-display';
    noteDisplay.style.cssText = `
      width: 100%;
      min-height: 60px;
      padding: 15px;
      margin-bottom: 15px;
      background: rgba(0, 0, 0, 0.5);
      color: #d4af37;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 6px;
      font-size: 14px;
      font-family: monospace;
      overflow-x: auto;
      white-space: nowrap;
    `;
    noteDisplay.textContent = 'No notes recorded yet...';
    form.appendChild(noteDisplay);

    function updateNoteDisplay() {
      var display = document.getElementById('note-display');
      if (!display) return;

      if (recordedNotes.length === 0) {
        display.textContent = 'No notes recorded yet...';
        return;
      }

      var noteSequence = recordedNotes.map(function(n) {
        return n.note;
      }).join(' - ');

      display.textContent = noteSequence + ' (' + recordedNotes.length + ' notes)';
    }

    // Save button
    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Composition';
    saveBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #d4af37, #f4d03f);
      color: #000;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
    `;
    saveBtn.onclick = function() {
      if (recordedNotes.length === 0) {
        showNotification('Please record some notes first', 'warning');
        return;
      }

      if (isRecording) {
        showNotification('Please stop recording first', 'warning');
        return;
      }

      var composition = {
        notes: recordedNotes,
        instrument: currentInstrument,
        timestamp: Date.now()
      };

      if (composeCallback) {
        composeCallback(composition);
      }

      showNotification('Composition saved!', 'success');
      hideComposePanel();
    };
    form.appendChild(saveBtn);

    panel.appendChild(form);
    document.body.appendChild(panel);
    composePanel = panel;

    // Reset state
    recordedNotes = [];
    isRecording = false;
    currentInstrument = 'sine';
  }

  function hideComposePanel() {
    if (!composePanel) return;
    document.body.removeChild(composePanel);
    composePanel = null;
    recordedNotes = [];
    isRecording = false;
  }

  // Guild Panel
  var guildPanel = null;
  var guildCreatePanel = null;
  var guildInvitePanel = null;

  function showGuildPanel(guildData, playerData) {
    if (guildPanel) {
      hideGuildPanel();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'guild-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 700px;
      max-height: 80vh;
      background: rgba(26, 26, 26, 0.95);
      border: 2px solid rgba(218, 165, 32, 0.5);
      border-radius: 8px;
      z-index: 300;
      overflow-y: auto;
      pointer-events: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
      padding: 25px;
    `;

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      width: 35px;
      height: 35px;
      background: rgba(255, 255, 255, 0.1);
      color: #E8E0D8;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;
    closeBtn.onmouseover = function() {
      this.style.background = 'rgba(218, 165, 32, 0.3)';
      this.style.borderColor = '#DAA520';
      this.style.color = '#DAA520';
    };
    closeBtn.onmouseout = function() {
      this.style.background = 'rgba(255, 255, 255, 0.1)';
      this.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      this.style.color = '#E8E0D8';
    };
    closeBtn.onclick = hideGuildPanel;
    panel.appendChild(closeBtn);

    // Header
    var header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 25px;
      border-bottom: 2px solid rgba(218, 165, 32, 0.3);
      padding-bottom: 15px;
    `;

    var title = document.createElement('h2');
    title.textContent = '[' + guildData.tag + '] ' + guildData.name;
    title.style.cssText = `
      color: #DAA520;
      font-size: 28px;
      font-family: system-ui, sans-serif;
      margin: 0 0 8px 0;
      font-weight: bold;
    `;
    header.appendChild(title);

    var subtitle = document.createElement('div');
    subtitle.textContent = guildData.type.charAt(0).toUpperCase() + guildData.type.slice(1) +
                          ' • Level ' + guildData.level + ' • ' + guildData.members.length + '/' +
                          guildData.maxMembers + ' members';
    subtitle.style.cssText = `
      color: #A0978E;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    `;
    header.appendChild(subtitle);

    if (guildData.description) {
      var desc = document.createElement('div');
      desc.textContent = guildData.description;
      desc.style.cssText = `
        color: #D4C5B3;
        font-size: 14px;
        font-family: system-ui, sans-serif;
        margin-top: 12px;
        font-style: italic;
      `;
      header.appendChild(desc);
    }

    panel.appendChild(header);

    // Stats section
    var statsGrid = document.createElement('div');
    statsGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    `;

    var stats = [
      { label: 'Treasury', value: guildData.treasury + ' Spark' },
      { label: 'Guild XP', value: guildData.xp },
      { label: 'Home Zone', value: guildData.zone }
    ];

    stats.forEach(function(stat) {
      var statBox = document.createElement('div');
      statBox.style.cssText = `
        background: rgba(218, 165, 32, 0.1);
        border: 1px solid rgba(218, 165, 32, 0.3);
        border-radius: 6px;
        padding: 12px;
        text-align: center;
      `;

      var statLabel = document.createElement('div');
      statLabel.textContent = stat.label;
      statLabel.style.cssText = `
        color: #A0978E;
        font-size: 12px;
        font-family: system-ui, sans-serif;
        margin-bottom: 5px;
      `;
      statBox.appendChild(statLabel);

      var statValue = document.createElement('div');
      statValue.textContent = stat.value;
      statValue.style.cssText = `
        color: #DAA520;
        font-size: 18px;
        font-family: system-ui, sans-serif;
        font-weight: bold;
      `;
      statBox.appendChild(statValue);

      statsGrid.appendChild(statBox);
    });

    panel.appendChild(statsGrid);

    // Members section
    var membersSection = document.createElement('div');
    membersSection.style.cssText = `
      margin-bottom: 25px;
    `;

    var membersTitle = document.createElement('h3');
    membersTitle.textContent = 'Members';
    membersTitle.style.cssText = `
      color: #DAA520;
      font-size: 18px;
      font-family: system-ui, sans-serif;
      margin: 0 0 12px 0;
      font-weight: bold;
    `;
    membersSection.appendChild(membersTitle);

    var membersList = document.createElement('div');
    membersList.style.cssText = `
      max-height: 200px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      padding: 10px;
    `;

    guildData.members.forEach(function(member) {
      var memberItem = document.createElement('div');
      memberItem.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        margin-bottom: 5px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
      `;

      var memberInfo = document.createElement('div');
      memberInfo.style.cssText = `
        color: #E8E0D8;
        font-size: 14px;
        font-family: system-ui, sans-serif;
      `;
      memberInfo.textContent = member.playerId + (member.playerId === playerData.id ? ' (You)' : '');
      memberItem.appendChild(memberInfo);

      var roleTag = document.createElement('span');
      roleTag.textContent = member.role.toUpperCase();
      roleTag.style.cssText = `
        color: ${member.role === 'leader' ? '#FFD700' : member.role === 'officer' ? '#C0C0C0' : '#8B7355'};
        font-size: 11px;
        font-family: system-ui, sans-serif;
        font-weight: bold;
        padding: 3px 8px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 3px;
      `;
      memberItem.appendChild(roleTag);

      membersList.appendChild(memberItem);
    });

    membersSection.appendChild(membersList);
    panel.appendChild(membersSection);

    // Activities section
    var activitiesSection = document.createElement('div');
    activitiesSection.style.cssText = `
      margin-bottom: 15px;
    `;

    var activitiesTitle = document.createElement('h3');
    activitiesTitle.textContent = 'Recent Activity';
    activitiesTitle.style.cssText = `
      color: #DAA520;
      font-size: 18px;
      font-family: system-ui, sans-serif;
      margin: 0 0 12px 0;
      font-weight: bold;
    `;
    activitiesSection.appendChild(activitiesTitle);

    var activitiesList = document.createElement('div');
    activitiesList.style.cssText = `
      max-height: 150px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      padding: 10px;
    `;

    var activities = guildData.activities.slice(-10).reverse();
    activities.forEach(function(activity) {
      var activityItem = document.createElement('div');
      activityItem.textContent = '• ' + activity.text;
      activityItem.style.cssText = `
        color: #A0978E;
        font-size: 13px;
        font-family: system-ui, sans-serif;
        padding: 4px 0;
        line-height: 1.4;
      `;
      activitiesList.appendChild(activityItem);
    });

    if (activities.length === 0) {
      var noActivity = document.createElement('div');
      noActivity.textContent = 'No recent activity';
      noActivity.style.cssText = `
        color: #6B6B6B;
        font-size: 13px;
        font-family: system-ui, sans-serif;
        font-style: italic;
        text-align: center;
        padding: 20px;
      `;
      activitiesList.appendChild(noActivity);
    }

    activitiesSection.appendChild(activitiesList);
    panel.appendChild(activitiesSection);

    // Action buttons
    var actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = `
      display: flex;
      gap: 10px;
      margin-top: 20px;
    `;

    var leaveBtn = document.createElement('button');
    leaveBtn.textContent = 'Leave Guild';
    leaveBtn.style.cssText = `
      flex: 1;
      padding: 12px;
      background: rgba(139, 0, 0, 0.6);
      color: #E8E0D8;
      border: 2px solid rgba(255, 69, 0, 0.5);
      border-radius: 6px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    leaveBtn.onmouseover = function() {
      this.style.background = 'rgba(139, 0, 0, 0.8)';
      this.style.borderColor = '#FF4500';
    };
    leaveBtn.onmouseout = function() {
      this.style.background = 'rgba(139, 0, 0, 0.6)';
      this.style.borderColor = 'rgba(255, 69, 0, 0.5)';
    };
    leaveBtn.onclick = function() {
      if (confirm('Are you sure you want to leave the guild?')) {
        if (window.handleGuildAction) {
          window.handleGuildAction('leave', guildData.id);
        }
        hideGuildPanel();
      }
    };
    actionsDiv.appendChild(leaveBtn);

    panel.appendChild(actionsDiv);

    document.body.appendChild(panel);
    guildPanel = panel;
    requestAnimationFrame(function() {
      panel.classList.add('visible');
    });
  }

  function hideGuildPanel() {
    if (!guildPanel) return;
    guildPanel.classList.remove('visible');
    setTimeout(function() {
      if (guildPanel && guildPanel.parentNode) {
        document.body.removeChild(guildPanel);
        guildPanel = null;
      }
    }, 250);
  }

  function showGuildCreate(callback) {
    if (guildCreatePanel) {
      hideGuildCreate();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'guild-create-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      background: rgba(26, 26, 26, 0.95);
      border: 2px solid rgba(218, 165, 32, 0.5);
      border-radius: 8px;
      z-index: 300;
      pointer-events: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
      padding: 25px;
    `;

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      width: 35px;
      height: 35px;
      background: rgba(255, 255, 255, 0.1);
      color: #E8E0D8;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;
    closeBtn.onmouseover = function() {
      this.style.background = 'rgba(218, 165, 32, 0.3)';
      this.style.borderColor = '#DAA520';
      this.style.color = '#DAA520';
    };
    closeBtn.onmouseout = function() {
      this.style.background = 'rgba(255, 255, 255, 0.1)';
      this.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      this.style.color = '#E8E0D8';
    };
    closeBtn.onclick = hideGuildCreate;
    panel.appendChild(closeBtn);

    // Title
    var title = document.createElement('h2');
    title.textContent = 'Create Guild';
    title.style.cssText = `
      color: #DAA520;
      font-size: 24px;
      font-family: system-ui, sans-serif;
      margin: 0 0 20px 0;
      font-weight: bold;
    `;
    panel.appendChild(title);

    // Form
    var form = document.createElement('div');
    form.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 15px;
    `;

    // Guild name input
    var nameLabel = document.createElement('label');
    nameLabel.textContent = 'Guild Name';
    nameLabel.style.cssText = `
      color: #D4C5B3;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
    `;
    form.appendChild(nameLabel);

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter guild name';
    nameInput.maxLength = 30;
    nameInput.style.cssText = `
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(218, 165, 32, 0.3);
      border-radius: 6px;
      color: #E8E0D8;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    `;
    form.appendChild(nameInput);

    // Guild tag input
    var tagLabel = document.createElement('label');
    tagLabel.textContent = 'Guild Tag (3-5 characters)';
    tagLabel.style.cssText = `
      color: #D4C5B3;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
    `;
    form.appendChild(tagLabel);

    var tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.placeholder = 'e.g., ZON';
    tagInput.maxLength = 5;
    tagInput.style.cssText = `
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(218, 165, 32, 0.3);
      border-radius: 6px;
      color: #E8E0D8;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      text-transform: uppercase;
    `;
    form.appendChild(tagInput);

    // Guild type select
    var typeLabel = document.createElement('label');
    typeLabel.textContent = 'Type';
    typeLabel.style.cssText = `
      color: #D4C5B3;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
    `;
    form.appendChild(typeLabel);

    var typeSelect = document.createElement('select');
    typeSelect.style.cssText = `
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(218, 165, 32, 0.3);
      border-radius: 6px;
      color: #E8E0D8;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    `;

    ['guild', 'garden', 'studio', 'community'].forEach(function(type) {
      var option = document.createElement('option');
      option.value = type;
      option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      typeSelect.appendChild(option);
    });

    form.appendChild(typeSelect);

    // Description textarea
    var descLabel = document.createElement('label');
    descLabel.textContent = 'Description (optional)';
    descLabel.style.cssText = `
      color: #D4C5B3;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
    `;
    form.appendChild(descLabel);

    var descInput = document.createElement('textarea');
    descInput.placeholder = 'Describe your guild...';
    descInput.maxLength = 200;
    descInput.rows = 3;
    descInput.style.cssText = `
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(218, 165, 32, 0.3);
      border-radius: 6px;
      color: #E8E0D8;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      resize: vertical;
    `;
    form.appendChild(descInput);

    // Cost notice
    var costNotice = document.createElement('div');
    costNotice.textContent = 'Cost: 100 Spark';
    costNotice.style.cssText = `
      color: #DAA520;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      background: rgba(218, 165, 32, 0.1);
      border-radius: 6px;
    `;
    form.appendChild(costNotice);

    // Create button
    var createBtn = document.createElement('button');
    createBtn.textContent = 'Create Guild';
    createBtn.style.cssText = `
      padding: 12px;
      background: rgba(218, 165, 32, 0.3);
      color: #E8E0D8;
      border: 2px solid rgba(218, 165, 32, 0.5);
      border-radius: 6px;
      font-size: 16px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    createBtn.onmouseover = function() {
      this.style.background = 'rgba(218, 165, 32, 0.5)';
      this.style.borderColor = '#DAA520';
    };
    createBtn.onmouseout = function() {
      this.style.background = 'rgba(218, 165, 32, 0.3)';
      this.style.borderColor = 'rgba(218, 165, 32, 0.5)';
    };
    createBtn.onclick = function() {
      var name = nameInput.value.trim();
      var tag = tagInput.value.trim().toUpperCase();
      var type = typeSelect.value;
      var description = descInput.value.trim();

      if (!name || !tag) {
        alert('Please enter guild name and tag');
        return;
      }

      if (tag.length < 3 || tag.length > 5) {
        alert('Tag must be 3-5 characters');
        return;
      }

      if (callback) {
        callback({ name: name, tag: tag, type: type, description: description });
      }

      hideGuildCreate();
    };
    form.appendChild(createBtn);

    panel.appendChild(form);

    document.body.appendChild(panel);
    guildCreatePanel = panel;
  }

  function hideGuildCreate() {
    if (!guildCreatePanel) return;
    document.body.removeChild(guildCreatePanel);
    guildCreatePanel = null;
  }

  function showGuildInvite(inviteData, callback) {
    if (guildInvitePanel) return;

    var panel = document.createElement('div');
    panel.id = 'guild-invite-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: rgba(26, 26, 26, 0.95);
      border: 2px solid rgba(218, 165, 32, 0.5);
      border-radius: 8px;
      z-index: 400;
      pointer-events: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
      padding: 20px;
    `;

    // Title
    var title = document.createElement('h3');
    title.textContent = 'Guild Invitation';
    title.style.cssText = `
      color: #DAA520;
      font-size: 18px;
      font-family: system-ui, sans-serif;
      margin: 0 0 12px 0;
      font-weight: bold;
    `;
    panel.appendChild(title);

    // Message
    var message = document.createElement('div');
    message.textContent = 'You have been invited to join [' + inviteData.guildTag + '] ' + inviteData.guildName;
    message.style.cssText = `
      color: #D4C5B3;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      margin-bottom: 20px;
      line-height: 1.5;
    `;
    panel.appendChild(message);

    // Buttons
    var buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 10px;
    `;

    var acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.cssText = `
      flex: 1;
      padding: 10px;
      background: rgba(34, 139, 34, 0.6);
      color: #E8E0D8;
      border: 2px solid rgba(34, 139, 34, 0.8);
      border-radius: 6px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    acceptBtn.onmouseover = function() {
      this.style.background = 'rgba(34, 139, 34, 0.8)';
    };
    acceptBtn.onmouseout = function() {
      this.style.background = 'rgba(34, 139, 34, 0.6)';
    };
    acceptBtn.onclick = function() {
      if (callback) {
        callback('accept', inviteData);
      }
      document.body.removeChild(panel);
      guildInvitePanel = null;
    };
    buttonsDiv.appendChild(acceptBtn);

    var declineBtn = document.createElement('button');
    declineBtn.textContent = 'Decline';
    declineBtn.style.cssText = `
      flex: 1;
      padding: 10px;
      background: rgba(139, 0, 0, 0.6);
      color: #E8E0D8;
      border: 2px solid rgba(255, 69, 0, 0.5);
      border-radius: 6px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    declineBtn.onmouseover = function() {
      this.style.background = 'rgba(139, 0, 0, 0.8)';
    };
    declineBtn.onmouseout = function() {
      this.style.background = 'rgba(139, 0, 0, 0.6)';
    };
    declineBtn.onclick = function() {
      if (callback) {
        callback('decline', inviteData);
      }
      document.body.removeChild(panel);
      guildInvitePanel = null;
    };
    buttonsDiv.appendChild(declineBtn);

    panel.appendChild(buttonsDiv);

    document.body.appendChild(panel);
    guildInvitePanel = panel;
  }

  function updateGuildTag(tag) {
    var playerNameEl = document.getElementById('player-name');
    if (playerNameEl && tag) {
      var currentName = playerNameEl.textContent;
      // Remove existing tag if present
      currentName = currentName.replace(/\[.*?\]\s*/, '');
      playerNameEl.textContent = '[' + tag + '] ' + currentName;
    }
  }

  // ========================================================================
  // GOVERNANCE PANEL (Zone Stewards & Elections)
  // ========================================================================

  var governancePanel = null;
  var governanceVisible = false;
  var governanceCallback = null;

  function initGovernancePanel(callback) {
    if (typeof document === 'undefined') return;
    governanceCallback = callback;
  }

  function showGovernancePanel(zoneId, playerData) {
    if (typeof document === 'undefined') return;

    var Social = typeof window !== 'undefined' ? window.Social : null;
    var Zones = typeof window !== 'undefined' ? window.Zones : null;
    if (!Social || !Zones) return;

    hideGovernancePanel();

    governancePanel = document.createElement('div');
    governancePanel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #daa520;border-radius:12px;' +
      'padding:20px;width:700px;max-height:80vh;overflow-y:auto;z-index:300;' +
      'box-shadow:0 4px 30px rgba(218,165,32,0.3);pointer-events:auto;';

    var zone = Zones.getZone(zoneId);
    var stewards = Zones.getZoneStewards(zoneId);
    var policies = Zones.getZonePolicies(zoneId);
    var activeElection = Zones.getActiveElection(zoneId);
    var reputation = Social.getReputation(playerData.id);
    var isRegular = Zones.isZoneRegular(zoneId, playerData.id);
    var isSteward = Zones.isZoneSteward(zoneId, playerData.id);

    var html = '<div style="font-size:24px;font-weight:bold;margin-bottom:10px;text-align:center;color:#daa520;">' +
      zone.name + ' Governance</div>';

    html += '<div style="margin-bottom:15px;color:#b0e0e6;text-align:center;font-size:12px;">' +
      'Your Reputation: ' + reputation.tier + ' (' + reputation.score + ' points)</div>';

    // Stewards section
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#4af;border-bottom:1px solid #4af;padding-bottom:4px;">Current Stewards</div>';
    if (stewards.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:8px;">';
      stewards.forEach(function(s) {
        var daysLeft = Math.ceil((s.termEnd - Date.now()) / 86400000);
        html += '<div style="background:rgba(74,170,255,0.1);padding:10px;border-radius:6px;border-left:3px solid #4af;">' +
          '<div style="font-weight:bold;">' + s.playerId + '</div>' +
          '<div style="font-size:11px;color:#aaa;">' + s.votes + ' votes • ' + daysLeft + ' days remaining</div>' +
          '</div>';
      });
      html += '</div>';
    } else {
      html += '<div style="color:#888;font-style:italic;padding:10px;">No active stewards. Start an election!</div>';
    }
    html += '</div>';

    // Zone Policies section
    if (isSteward) {
      html += '<div style="margin-bottom:20px;">';
      html += '<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#fa4;border-bottom:1px solid #fa4;padding-bottom:4px;">Zone Policies (Steward)</div>';
      html += '<div style="background:rgba(255,170,68,0.1);padding:12px;border-radius:6px;">';
      html += '<label style="display:block;margin-bottom:8px;cursor:pointer;">' +
        '<input type="checkbox" id="policy-building" ' + (policies.buildingRequiresApproval ? 'checked' : '') + '> Building requires approval</label>';
      html += '<label style="display:block;margin-bottom:8px;cursor:pointer;">' +
        '<input type="checkbox" id="policy-moderated" ' + (policies.chatModerated ? 'checked' : '') + '> Chat moderated</label>';
      html += '<div style="margin-top:10px;"><input type="text" id="welcome-message" placeholder="Zone welcome message..." ' +
        'value="' + (policies.welcomeMessage || '').replace(/"/g, '&quot;') + '" style="width:100%;padding:8px;background:rgba(0,0,0,0.3);' +
        'border:1px solid #666;border-radius:4px;color:#fff;"></div>';
      html += '<button id="save-policies-btn" style="margin-top:10px;padding:8px 16px;background:#fa4;border:none;' +
        'border-radius:4px;color:#000;font-weight:bold;cursor:pointer;">Save Policies</button>';
      html += '</div>';
      html += '</div>';
    } else if (policies.welcomeMessage) {
      html += '<div style="margin-bottom:20px;padding:12px;background:rgba(218,165,32,0.1);border-radius:6px;border-left:3px solid #daa520;">';
      html += '<div style="font-size:14px;font-weight:bold;color:#daa520;margin-bottom:4px;">Welcome Message</div>';
      html += '<div style="font-size:12px;color:#ccc;">' + policies.welcomeMessage + '</div>';
      html += '</div>';
    }

    // Election section
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#4af;border-bottom:1px solid #4af;padding-bottom:4px;">Elections</div>';
    if (activeElection) {
      var timeLeft = Math.ceil((activeElection.endTime - Date.now()) / 3600000);
      html += '<div style="background:rgba(74,170,255,0.1);padding:12px;border-radius:6px;margin-bottom:10px;">';
      html += '<div style="font-weight:bold;margin-bottom:8px;">Active Election (' + timeLeft + ' hours left)</div>';
      html += '<div style="display:flex;flex-direction:column;gap:6px;">';
      activeElection.candidates.forEach(function(c) {
        var hasVoted = isRegular && c.voters && c.voters.has(playerData.id);
        html += '<div style="background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">' +
          '<span>' + c.playerId + '</span>' +
          '<span style="color:#4af;font-weight:bold;">' + c.votes + ' votes</span>' +
          (isRegular && !hasVoted ? '<button class="vote-btn" data-candidate="' + c.playerId + '" data-election="' + activeElection.id + '" ' +
          'style="padding:4px 12px;background:#4af;border:none;border-radius:4px;color:#000;cursor:pointer;font-size:11px;">Vote</button>' : '') +
          (hasVoted ? '<span style="color:#4a4;font-size:11px;">Voted</span>' : '') +
          '</div>';
      });
      html += '</div></div>';

      if (isRegular) {
        html += '<div style="font-size:11px;color:#aaa;margin-top:8px;">You can vote as a zone regular.</div>';
      } else {
        html += '<div style="font-size:11px;color:#888;margin-top:8px;">Visit this zone 5+ times to vote in elections.</div>';
      }
    } else {
      var canRunForSteward = reputation.tier === 'Respected' || reputation.tier === 'Honored' || reputation.tier === 'Elder';
      html += '<div style="color:#888;font-style:italic;margin-bottom:10px;">No active election.</div>';
      if (canRunForSteward) {
        html += '<button id="start-election-btn" style="padding:8px 16px;background:#4af;border:none;' +
          'border-radius:4px;color:#000;font-weight:bold;cursor:pointer;">Start Election</button>';
      } else {
        html += '<div style="font-size:11px;color:#888;">Reach Respected tier to run for steward.</div>';
      }
    }
    html += '</div>';

    // Governance Log section
    var log = Zones.getGovernanceLog(zoneId, 10);
    if (log.length > 0) {
      html += '<div style="margin-bottom:20px;">';
      html += '<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#888;border-bottom:1px solid #666;padding-bottom:4px;">Recent Actions</div>';
      html += '<div style="display:flex;flex-direction:column;gap:4px;max-height:150px;overflow-y:auto;">';
      log.forEach(function(action) {
        var timeAgo = Math.floor((Date.now() - action.timestamp) / 60000);
        html += '<div style="font-size:11px;color:#aaa;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
          '<span style="color:#4af;">' + action.type + '</span> by ' + (action.stewardId || action.from || 'system') + ' — ' + timeAgo + 'm ago</div>';
      });
      html += '</div></div>';
    }

    // Close button
    html += '<div style="text-align:center;margin-top:20px;">' +
      '<button id="close-governance-btn" style="padding:10px 24px;background:#666;border:none;' +
      'border-radius:6px;color:#fff;font-weight:bold;cursor:pointer;">Close (H)</button></div>';

    governancePanel.innerHTML = html;
    governancePanel.className = 'governance-panel';
    document.body.appendChild(governancePanel);
    governanceVisible = true;
    requestAnimationFrame(function() {
      governancePanel.classList.add('visible');
    });

    // Attach event listeners
    var closeBtn = document.getElementById('close-governance-btn');
    if (closeBtn) {
      closeBtn.onclick = hideGovernancePanel;
    }

    var startElectionBtn = document.getElementById('start-election-btn');
    if (startElectionBtn) {
      startElectionBtn.onclick = function() {
        if (governanceCallback) {
          governanceCallback('startElection', { zoneId: zoneId });
        }
      };
    }

    var savePoliciesBtn = document.getElementById('save-policies-btn');
    if (savePoliciesBtn) {
      savePoliciesBtn.onclick = function() {
        var buildingApproval = document.getElementById('policy-building').checked;
        var chatModerated = document.getElementById('policy-moderated').checked;
        var welcomeMsg = document.getElementById('welcome-message').value;

        if (governanceCallback) {
          governanceCallback('savePolicies', {
            zoneId: zoneId,
            buildingRequiresApproval: buildingApproval,
            chatModerated: chatModerated,
            welcomeMessage: welcomeMsg
          });
        }
      };
    }

    var voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(function(btn) {
      btn.onclick = function() {
        var candidateId = btn.getAttribute('data-candidate');
        var electionId = btn.getAttribute('data-election');
        if (governanceCallback) {
          governanceCallback('vote', {
            electionId: electionId,
            candidateId: candidateId
          });
        }
      };
    });
  }

  function hideGovernancePanel() {
    if (governancePanel) {
      governancePanel.classList.remove('visible');
      setTimeout(function() {
        if (governancePanel && governancePanel.parentNode) {
          document.body.removeChild(governancePanel);
          governancePanel = null;
        }
      }, 250);
    }
    governanceVisible = false;
  }

  function toggleGovernancePanel(zoneId, playerData) {
    if (governanceVisible) {
      hideGovernancePanel();
    } else {
      showGovernancePanel(zoneId, playerData);
    }
  }

  // ========================================================================
  // AUCTION HOUSE PANEL
  // ========================================================================

  var auctionHousePanel = null;
  var auctionHouseVisible = false;
  var auctionHouseCallback = null;
  var currentAuctionTab = 'browse';

  function initAuctionHousePanel(callback) {
    auctionHouseCallback = callback;
  }

  function showAuctionHousePanel(ledger, playerId, inventory) {
    if (typeof document === 'undefined') return;

    var Economy = typeof window !== 'undefined' ? window.Economy : null;
    var Inventory = typeof window !== 'undefined' ? window.Inventory : null;
    if (!Economy || !Inventory) return;

    hideAuctionHousePanel();

    auctionHousePanel = document.createElement('div');
    auctionHousePanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      max-height: 80vh;
      background: rgba(26, 26, 26, 0.95);
      border: 2px solid rgba(218, 165, 32, 0.5);
      border-radius: 8px;
      z-index: 300;
      overflow-y: auto;
      pointer-events: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
      padding: 25px;
    `;

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      width: 35px;
      height: 35px;
      background: rgba(255, 255, 255, 0.1);
      color: #E8E0D8;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;
    closeBtn.onmouseover = function() {
      this.style.background = 'rgba(218, 165, 32, 0.3)';
      this.style.borderColor = '#DAA520';
      this.style.color = '#DAA520';
    };
    closeBtn.onmouseout = function() {
      this.style.background = 'rgba(255, 255, 255, 0.1)';
      this.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      this.style.color = '#E8E0D8';
    };
    closeBtn.onclick = hideAuctionHousePanel;
    auctionHousePanel.appendChild(closeBtn);

    // Header
    var header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 20px;
      border-bottom: 2px solid rgba(218, 165, 32, 0.3);
      padding-bottom: 15px;
    `;

    var title = document.createElement('h2');
    title.textContent = 'Auction House';
    title.style.cssText = `
      color: #DAA520;
      font-size: 28px;
      font-family: system-ui, sans-serif;
      margin: 0 0 8px 0;
      font-weight: bold;
    `;
    header.appendChild(title);

    var subtitle = document.createElement('div');
    var playerBalance = Economy.getBalance(ledger, playerId);
    subtitle.textContent = 'Your Spark: ' + playerBalance;
    subtitle.style.cssText = `
      color: #A0978E;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    `;
    header.appendChild(subtitle);

    auctionHousePanel.appendChild(header);

    // Tab buttons
    var tabsDiv = document.createElement('div');
    tabsDiv.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    `;

    var tabs = ['browse', 'myauctions', 'create'];
    var tabLabels = { browse: 'Browse Auctions', myauctions: 'My Auctions', create: 'Create Auction' };

    tabs.forEach(function(tabName) {
      var tabBtn = document.createElement('button');
      tabBtn.textContent = tabLabels[tabName];
      tabBtn.setAttribute('data-tab', tabName);
      tabBtn.style.cssText = `
        flex: 1;
        padding: 12px;
        background: ${currentAuctionTab === tabName ? 'rgba(218, 165, 32, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
        color: ${currentAuctionTab === tabName ? '#DAA520' : '#A0978E'};
        border: 2px solid ${currentAuctionTab === tabName ? '#DAA520' : 'rgba(255, 255, 255, 0.3)'};
        border-radius: 6px;
        font-size: 14px;
        font-family: system-ui, sans-serif;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      tabBtn.onmouseover = function() {
        if (currentAuctionTab !== tabName) {
          this.style.background = 'rgba(218, 165, 32, 0.2)';
          this.style.borderColor = 'rgba(218, 165, 32, 0.5)';
        }
      };
      tabBtn.onmouseout = function() {
        if (currentAuctionTab !== tabName) {
          this.style.background = 'rgba(255, 255, 255, 0.1)';
          this.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }
      };
      tabBtn.onclick = function() {
        currentAuctionTab = tabName;
        showAuctionHousePanel(ledger, playerId, inventory);
      };
      tabsDiv.appendChild(tabBtn);
    });

    auctionHousePanel.appendChild(tabsDiv);

    // Tab content
    var contentDiv = document.createElement('div');
    contentDiv.id = 'auction-content';
    contentDiv.style.cssText = `
      min-height: 300px;
    `;

    if (currentAuctionTab === 'browse') {
      renderBrowseTab(contentDiv, ledger, playerId);
    } else if (currentAuctionTab === 'myauctions') {
      renderMyAuctionsTab(contentDiv, ledger, playerId);
    } else if (currentAuctionTab === 'create') {
      renderCreateTab(contentDiv, ledger, playerId, inventory);
    }

    auctionHousePanel.appendChild(contentDiv);
    auctionHousePanel.className = 'auction-panel';
    document.body.appendChild(auctionHousePanel);
    auctionHouseVisible = true;
    requestAnimationFrame(function() {
      auctionHousePanel.classList.add('visible');
    });
  }

  function renderBrowseTab(container, ledger, playerId) {
    var Economy = typeof window !== 'undefined' ? window.Economy : null;
    if (!Economy) return;

    var auctions = Economy.getActiveAuctions(ledger);

    if (auctions.length === 0) {
      var noAuctions = document.createElement('div');
      noAuctions.textContent = 'No active auctions at the moment.';
      noAuctions.style.cssText = `
        color: #6B6B6B;
        font-size: 14px;
        font-family: system-ui, sans-serif;
        font-style: italic;
        text-align: center;
        padding: 40px;
      `;
      container.appendChild(noAuctions);
      return;
    }

    auctions.forEach(function(auction) {
      var auctionItem = document.createElement('div');
      auctionItem.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(218, 165, 32, 0.3);
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      var itemInfo = document.createElement('div');
      itemInfo.style.cssText = `
        flex: 1;
      `;

      var itemName = document.createElement('div');
      var itemData = auction.item;
      var itemDisplayName = typeof itemData === 'string' ? itemData : (itemData.name || itemData.id || 'Unknown Item');
      itemName.textContent = itemDisplayName;
      itemName.style.cssText = `
        color: #E8E0D8;
        font-size: 16px;
        font-family: system-ui, sans-serif;
        font-weight: bold;
        margin-bottom: 5px;
      `;
      itemInfo.appendChild(itemName);

      var auctionDetails = document.createElement('div');
      var currentBidText = auction.currentBid > 0 ? auction.currentBid + ' Spark' : 'Starting: ' + auction.startingBid + ' Spark';
      var timeRemaining = Math.ceil((auction.endTime - Date.now()) / 60000);
      var timeText = timeRemaining > 60 ? Math.floor(timeRemaining / 60) + 'h ' + (timeRemaining % 60) + 'm' : timeRemaining + 'm';

      auctionDetails.textContent = 'Current Bid: ' + currentBidText + ' | Time: ' + timeText + ' | Seller: ' + auction.seller;
      auctionDetails.style.cssText = `
        color: #A0978E;
        font-size: 12px;
        font-family: system-ui, sans-serif;
      `;
      itemInfo.appendChild(auctionDetails);

      auctionItem.appendChild(itemInfo);

      // Bid button
      if (auction.seller !== playerId) {
        var bidBtn = document.createElement('button');
        bidBtn.textContent = 'Bid';
        bidBtn.style.cssText = `
          padding: 8px 20px;
          background: rgba(218, 165, 32, 0.6);
          color: #000;
          border: 2px solid #DAA520;
          border-radius: 6px;
          font-size: 14px;
          font-family: system-ui, sans-serif;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        `;
        bidBtn.onmouseover = function() {
          this.style.background = 'rgba(218, 165, 32, 0.8)';
        };
        bidBtn.onmouseout = function() {
          this.style.background = 'rgba(218, 165, 32, 0.6)';
        };
        bidBtn.onclick = function() {
          var minBid = Math.max(auction.startingBid, auction.currentBid + 1);
          var bidAmount = prompt('Enter your bid (minimum ' + minBid + ' Spark):');
          if (bidAmount) {
            var amount = parseInt(bidAmount, 10);
            if (!isNaN(amount) && amount >= minBid) {
              if (auctionHouseCallback) {
                auctionHouseCallback('placeBid', { auctionId: auction.id, amount: amount });
              }
            } else {
              alert('Invalid bid amount. Must be at least ' + minBid + ' Spark.');
            }
          }
        };
        auctionItem.appendChild(bidBtn);
      } else {
        var ownLabel = document.createElement('span');
        ownLabel.textContent = 'Your Auction';
        ownLabel.style.cssText = `
          color: #4a4;
          font-size: 12px;
          font-family: system-ui, sans-serif;
          font-style: italic;
        `;
        auctionItem.appendChild(ownLabel);
      }

      container.appendChild(auctionItem);
    });
  }

  function renderMyAuctionsTab(container, ledger, playerId) {
    var Economy = typeof window !== 'undefined' ? window.Economy : null;
    if (!Economy) return;

    var allAuctions = ledger.auctions || [];
    var myAuctions = allAuctions.filter(function(a) { return a.seller === playerId; });

    if (myAuctions.length === 0) {
      var noAuctions = document.createElement('div');
      noAuctions.textContent = 'You have not created any auctions yet.';
      noAuctions.style.cssText = `
        color: #6B6B6B;
        font-size: 14px;
        font-family: system-ui, sans-serif;
        font-style: italic;
        text-align: center;
        padding: 40px;
      `;
      container.appendChild(noAuctions);
      return;
    }

    myAuctions.forEach(function(auction) {
      var auctionItem = document.createElement('div');
      auctionItem.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(218, 165, 32, 0.3);
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 10px;
      `;

      var itemData = auction.item;
      var itemDisplayName = typeof itemData === 'string' ? itemData : (itemData.name || itemData.id || 'Unknown Item');

      var itemName = document.createElement('div');
      itemName.textContent = itemDisplayName;
      itemName.style.cssText = `
        color: #E8E0D8;
        font-size: 16px;
        font-family: system-ui, sans-serif;
        font-weight: bold;
        margin-bottom: 5px;
      `;
      auctionItem.appendChild(itemName);

      var statusText = 'Status: ' + auction.status.toUpperCase();
      if (auction.status === 'active') {
        var timeRemaining = Math.ceil((auction.endTime - Date.now()) / 60000);
        var timeText = timeRemaining > 60 ? Math.floor(timeRemaining / 60) + 'h ' + (timeRemaining % 60) + 'm' : timeRemaining + 'm';
        statusText += ' | Time Left: ' + timeText;
        statusText += ' | Current Bid: ' + (auction.currentBid > 0 ? auction.currentBid + ' Spark' : 'No bids yet');
      } else if (auction.status === 'sold') {
        statusText += ' | Sold for: ' + auction.currentBid + ' Spark to ' + auction.currentBidder;
      } else if (auction.status === 'expired') {
        statusText += ' | No bids received';
      }

      var statusDiv = document.createElement('div');
      statusDiv.textContent = statusText;
      statusDiv.style.cssText = `
        color: #A0978E;
        font-size: 12px;
        font-family: system-ui, sans-serif;
      `;
      auctionItem.appendChild(statusDiv);

      container.appendChild(auctionItem);
    });
  }

  function renderCreateTab(container, ledger, playerId, inventory) {
    var Economy = typeof window !== 'undefined' ? window.Economy : null;
    var Inventory = typeof window !== 'undefined' ? window.Inventory : null;
    if (!Economy || !Inventory) return;

    var formDiv = document.createElement('div');
    formDiv.style.cssText = `
      background: rgba(0, 0, 0, 0.3);
      border-radius: 6px;
      padding: 20px;
    `;

    // Item selection
    var itemLabel = document.createElement('div');
    itemLabel.textContent = 'Select Item to Auction:';
    itemLabel.style.cssText = `
      color: #DAA520;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      margin-bottom: 10px;
    `;
    formDiv.appendChild(itemLabel);

    var itemSelect = document.createElement('select');
    itemSelect.id = 'auction-item-select';
    itemSelect.style.cssText = `
      width: 100%;
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      color: #E8E0D8;
      border: 1px solid rgba(218, 165, 32, 0.3);
      border-radius: 4px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      margin-bottom: 20px;
    `;

    var items = Inventory.getInventory(inventory);
    var hasItems = false;

    items.forEach(function(item) {
      if (item && item.count > 0) {
        hasItems = true;
        var option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name + ' (x' + item.count + ')';
        itemSelect.appendChild(option);
      }
    });

    if (!hasItems) {
      var noItems = document.createElement('div');
      noItems.textContent = 'You have no items to auction.';
      noItems.style.cssText = `
        color: #6B6B6B;
        font-size: 14px;
        font-family: system-ui, sans-serif;
        font-style: italic;
        text-align: center;
        padding: 40px;
      `;
      container.appendChild(noItems);
      return;
    }

    formDiv.appendChild(itemSelect);

    // Starting bid
    var bidLabel = document.createElement('div');
    bidLabel.textContent = 'Starting Bid (Spark):';
    bidLabel.style.cssText = `
      color: #DAA520;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      margin-bottom: 10px;
    `;
    formDiv.appendChild(bidLabel);

    var bidInput = document.createElement('input');
    bidInput.id = 'auction-starting-bid';
    bidInput.type = 'number';
    bidInput.min = '1';
    bidInput.value = '10';
    bidInput.style.cssText = `
      width: 100%;
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      color: #E8E0D8;
      border: 1px solid rgba(218, 165, 32, 0.3);
      border-radius: 4px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      margin-bottom: 20px;
    `;
    formDiv.appendChild(bidInput);

    // Duration
    var durationLabel = document.createElement('div');
    durationLabel.textContent = 'Auction Duration:';
    durationLabel.style.cssText = `
      color: #DAA520;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      margin-bottom: 10px;
    `;
    formDiv.appendChild(durationLabel);

    var durationSelect = document.createElement('select');
    durationSelect.id = 'auction-duration';
    durationSelect.style.cssText = `
      width: 100%;
      padding: 10px;
      background: rgba(0, 0, 0, 0.5);
      color: #E8E0D8;
      border: 1px solid rgba(218, 165, 32, 0.3);
      border-radius: 4px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      margin-bottom: 20px;
    `;

    var durations = [
      { label: '1 Hour', value: 3600000 },
      { label: '6 Hours', value: 21600000 },
      { label: '24 Hours', value: 86400000 }
    ];

    durations.forEach(function(dur) {
      var option = document.createElement('option');
      option.value = dur.value;
      option.textContent = dur.label;
      durationSelect.appendChild(option);
    });

    formDiv.appendChild(durationSelect);

    // Create button
    var createBtn = document.createElement('button');
    createBtn.textContent = 'Create Auction';
    createBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: rgba(218, 165, 32, 0.6);
      color: #000;
      border: 2px solid #DAA520;
      border-radius: 6px;
      font-size: 16px;
      font-family: system-ui, sans-serif;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    createBtn.onmouseover = function() {
      this.style.background = 'rgba(218, 165, 32, 0.8)';
    };
    createBtn.onmouseout = function() {
      this.style.background = 'rgba(218, 165, 32, 0.6)';
    };
    createBtn.onclick = function() {
      var itemId = itemSelect.value;
      var startingBid = parseInt(bidInput.value, 10);
      var duration = parseInt(durationSelect.value, 10);

      if (!itemId || isNaN(startingBid) || startingBid < 1) {
        alert('Please select an item and set a valid starting bid.');
        return;
      }

      if (auctionHouseCallback) {
        auctionHouseCallback('createAuction', { itemId: itemId, startingBid: startingBid, duration: duration });
      }
    };
    formDiv.appendChild(createBtn);

    container.appendChild(formDiv);
  }

  function hideAuctionHousePanel() {
    if (auctionHousePanel) {
      auctionHousePanel.classList.remove('visible');
      setTimeout(function() {
        if (auctionHousePanel && auctionHousePanel.parentNode) {
          document.body.removeChild(auctionHousePanel);
          auctionHousePanel = null;
        }
      }, 250);
    }
    auctionHouseVisible = false;
  }

  function toggleAuctionHousePanel(ledger, playerId, inventory) {
    if (auctionHouseVisible) {
      hideAuctionHousePanel();
    } else {
      showAuctionHousePanel(ledger, playerId, inventory);
    }
  }

  // ========================================================================
  // REPUTATION DISPLAY
  // ========================================================================

  function updateReputationDisplay(reputation) {
    if (typeof document === 'undefined') return;
    var playerInfo = document.getElementById('player-info');
    if (!playerInfo) return;

    var repEl = document.getElementById('reputation-display');
    if (!repEl) {
      repEl = document.createElement('div');
      repEl.id = 'reputation-display';
      repEl.style.cssText = 'font-size:11px;color:#daa520;margin-top:2px;';
      playerInfo.appendChild(repEl);
    }

    var tierColors = {
      'Newcomer': '#888',
      'Trusted': '#4af',
      'Respected': '#4a4',
      'Honored': '#f4a',
      'Elder': '#daa520'
    };

    var color = tierColors[reputation.tier] || '#888';
    repEl.innerHTML = '<span style="color:' + color + ';">★</span> ' + reputation.tier + ' (' + reputation.score + ')';
  }

  // ========================================================================
  // ACHIEVEMENT PANEL
  // ========================================================================

  var achievementPanel = null;

  function showAchievementPanel(playerId) {
    if (typeof document === 'undefined') return;

    var Quests = typeof window !== 'undefined' ? window.Quests : null;
    if (!Quests) {
      console.warn('Quests module not available');
      return;
    }

    // Toggle if already open
    if (achievementPanel) {
      hideAchievementPanel();
      return;
    }

    var achievements = Quests.getAchievements(playerId);
    var progress = Quests.getAchievementProgress(playerId);

    var panel = document.createElement('div');
    panel.className = 'achievement-panel';

    // Header
    var header = document.createElement('h2');
    header.textContent = 'Achievements';
    panel.appendChild(header);

    // Overall progress
    var progressText = document.createElement('div');
    progressText.style.cssText = 'color:#E8E0D8;font-size:0.9rem;margin-bottom:4px;';
    progressText.textContent = 'Progress: ' + progress.unlocked + ' / ' + progress.total + ' (' + progress.percentage.toFixed(1) + '%)';
    panel.appendChild(progressText);

    // Progress bar
    var progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'achievement-progress-bar';
    var progressBarFill = document.createElement('div');
    progressBarFill.className = 'achievement-progress-fill';
    progressBarFill.style.width = progress.percentage + '%';
    progressBarContainer.appendChild(progressBarFill);
    panel.appendChild(progressBarContainer);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position:absolute;top:15px;right:15px;width:30px;height:30px;' +
      'background:rgba(255,255,255,0.1);color:#E8E0D8;border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:50%;font-size:20px;cursor:pointer;transition:all 0.2s;';
    closeBtn.onmouseover = function() {
      this.style.background = 'rgba(218,165,32,0.3)';
      this.style.borderColor = '#DAA520';
    };
    closeBtn.onmouseout = function() {
      this.style.background = 'rgba(255,255,255,0.1)';
      this.style.borderColor = 'rgba(255,255,255,0.3)';
    };
    closeBtn.onclick = hideAchievementPanel;
    panel.appendChild(closeBtn);

    // Group achievements by category
    var categories = {
      exploration: [],
      social: [],
      crafting: [],
      building: [],
      gardening: [],
      economy: [],
      competition: [],
      quests: [],
      guild: [],
      art: [],
      physical: [],
      mentoring: []
    };

    achievements.forEach(function(ach) {
      if (categories[ach.category]) {
        categories[ach.category].push(ach);
      }
    });

    // Category display names
    var categoryNames = {
      exploration: 'Exploration',
      social: 'Social',
      crafting: 'Crafting',
      building: 'Building',
      gardening: 'Gardening',
      economy: 'Economy',
      competition: 'Competition',
      quests: 'Quests',
      guild: 'Guild',
      art: 'Art & Creativity',
      physical: 'Physical Wellness',
      mentoring: 'Mentoring'
    };

    // Render categories
    Object.keys(categoryNames).forEach(function(catKey) {
      var catAchievements = categories[catKey];
      if (catAchievements.length === 0) return;

      var categorySection = document.createElement('div');
      categorySection.className = 'achievement-category';

      var categoryTitle = document.createElement('div');
      categoryTitle.className = 'achievement-category-title';
      categoryTitle.textContent = categoryNames[catKey];
      categorySection.appendChild(categoryTitle);

      catAchievements.forEach(function(ach) {
        var row = document.createElement('div');
        row.className = 'achievement-row ' + (ach.unlocked ? 'unlocked' : 'locked');
        if (ach.unlocked) {
          row.style.borderLeft = '3px solid #daa520';
          row.style.paddingLeft = '5px';
        }

        var icon = document.createElement('div');
        icon.className = 'achievement-icon';
        icon.textContent = ach.icon || '⭐';
        row.appendChild(icon);

        var info = document.createElement('div');
        info.className = 'achievement-info';

        var name = document.createElement('div');
        name.className = 'achievement-name';
        name.textContent = ach.name;
        info.appendChild(name);

        var desc = document.createElement('div');
        desc.className = 'achievement-desc';
        desc.textContent = ach.description;
        info.appendChild(desc);

        row.appendChild(info);

        var reward = document.createElement('div');
        reward.className = 'achievement-reward';
        reward.textContent = '+' + ach.sparkReward + ' Spark';
        row.appendChild(reward);

        categorySection.appendChild(row);
      });

      panel.appendChild(categorySection);
    });

    document.body.appendChild(panel);
    achievementPanel = panel;
    requestAnimationFrame(function() {
      panel.classList.add('visible');
    });

    // Close on Escape
    var escapeHandler = function(e) {
      if (e.key === 'Escape') {
        hideAchievementPanel();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    panel.escapeHandler = escapeHandler;
  }

  function hideAchievementPanel() {
    if (!achievementPanel) return;
    if (achievementPanel.escapeHandler) {
      document.removeEventListener('keydown', achievementPanel.escapeHandler);
    }
    achievementPanel.classList.remove('visible');
    setTimeout(function() {
      if (achievementPanel && achievementPanel.parentNode) {
        document.body.removeChild(achievementPanel);
        achievementPanel = null;
      }
    }, 250);
  }

  // Export public API
  /**
   * Update federation status panel
   * @param {Array} discoveredWorlds - Array of discovered world info
   * @param {Array} federatedWorlds - Array of federated world info
   */
  function updateFederationStatus(discoveredWorlds, federatedWorlds) {
    if (!federationPanel) return;

    var html = '<div style="font-weight: bold; margin-bottom: 8px; color: #88f;">Federation</div>';

    // Show federated worlds (active portals)
    if (federatedWorlds && federatedWorlds.length > 0) {
      html += '<div style="margin-bottom: 8px;">';
      html += '<div style="font-size: 11px; color: #aaa; margin-bottom: 3px;">Active Portals:</div>';
      federatedWorlds.forEach(function(world) {
        html += '<div style="margin-left: 8px; margin-bottom: 3px;">';
        html += '<span style="color: #4f4;">&#x2713;</span> ';
        html += '<span style="color: #fff;">' + (world.worldInfo?.worldName || world.worldId) + '</span>';
        if (world.worldInfo?.playerCount !== undefined) {
          html += '<span style="color: #888; font-size: 10px;"> (' + world.worldInfo.playerCount + ')</span>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // Show discovered worlds (not yet federated)
    if (discoveredWorlds && discoveredWorlds.length > 0) {
      var unfederated = discoveredWorlds.filter(function(dw) {
        return !federatedWorlds.some(function(fw) {
          return fw.worldId === dw.worldId;
        });
      });

      if (unfederated.length > 0) {
        html += '<div style="margin-bottom: 8px;">';
        html += '<div style="font-size: 11px; color: #aaa; margin-bottom: 3px;">Discovered:</div>';
        unfederated.forEach(function(world) {
          html += '<div style="margin-left: 8px; margin-bottom: 3px;">';
          html += '<span style="color: #88f;">&#x25cf;</span> ';
          html += '<span style="color: #ccc;">' + (world.worldName || world.worldId) + '</span>';
          if (world.playerCount !== undefined) {
            html += '<span style="color: #888; font-size: 10px;"> (' + world.playerCount + ')</span>';
          }
          html += '</div>';
        });
        html += '</div>';
      }
    }

    // Show help text if no worlds
    if ((!federatedWorlds || federatedWorlds.length === 0) &&
        (!discoveredWorlds || discoveredWorlds.length === 0)) {
      html += '<div style="color: #888; font-size: 11px; font-style: italic;">No federated worlds yet</div>';
    }

    federationPanel.innerHTML = html;
  }

  /**
   * Show federation portal UI when near a portal
   * @param {object} portalInfo - Portal information
   */
  function showFederationPortalUI(portalInfo) {
    if (typeof document === 'undefined') return;

    // Create portal interaction UI
    var portalUI = document.getElementById('federation-portal-ui');
    if (!portalUI) {
      portalUI = document.createElement('div');
      portalUI.id = 'federation-portal-ui';
      portalUI.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #88f;
        border-radius: 12px;
        padding: 20px;
        min-width: 300px;
        color: white;
        text-align: center;
        pointer-events: auto;
        z-index: 200;
      `;
      document.body.appendChild(portalUI);
    }

    var html = '<div style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #88f;">Rift Portal</div>';
    html += '<div style="margin-bottom: 15px; color: #ccc;">' + (portalInfo.worldName || 'Unknown World') + '</div>';

    if (portalInfo.playerCount !== undefined) {
      html += '<div style="margin-bottom: 15px; font-size: 12px; color: #aaa;">Players: ' + portalInfo.playerCount + '</div>';
    }

    html += '<button id="portal-warp-btn" style="';
    html += 'background: #4488ff; color: white; border: none; padding: 10px 20px;';
    html += 'border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 10px;">Enter Portal</button>';
    html += '<button id="portal-close-btn" style="';
    html += 'background: #444; color: white; border: none; padding: 10px 20px;';
    html += 'border-radius: 5px; cursor: pointer; font-size: 14px;">Cancel</button>';

    portalUI.innerHTML = html;

    // Add event listeners
    document.getElementById('portal-warp-btn').onclick = function() {
      if (portalInfo.onWarp) {
        portalInfo.onWarp(portalInfo.targetWorld);
      }
      hideFederationPortalUI();
    };

    document.getElementById('portal-close-btn').onclick = function() {
      hideFederationPortalUI();
    };
  }

  /**
   * Hide federation portal UI
   */
  function hideFederationPortalUI() {
    var portalUI = document.getElementById('federation-portal-ui');
    if (portalUI) {
      portalUI.remove();
    }
  }

  // ========================================================================
  // FISHING MINIGAME UI
  // ========================================================================

  let fishingUIActive = false;
  let fishingCallback = null;

  /**
   * Show fishing UI with casting and reeling mechanics
   * @param {string} zoneId - Current zone for fish type determination
   * @param {Function} onResult - Callback with result {success: boolean, fish?: Object}
   */
  function showFishingUI(zoneId, onResult) {
    if (!hudContainer || fishingUIActive) return;
    if (typeof document === 'undefined') return;

    fishingUIActive = true;
    fishingCallback = onResult;

    // Create fishing overlay with ocean theme
    const fishingOverlay = document.createElement('div');
    fishingOverlay.id = 'fishing-ui';
    fishingOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, rgba(0, 50, 100, 0.3) 0%, rgba(0, 100, 150, 0.5) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      pointer-events: auto;
    `;

    // Fishing panel
    const fishingPanel = document.createElement('div');
    fishingPanel.style.cssText = `
      background: linear-gradient(135deg, rgba(0, 80, 140, 0.95) 0%, rgba(0, 120, 180, 0.95) 100%);
      border: 3px solid rgba(100, 200, 255, 0.8);
      border-radius: 15px;
      padding: 40px;
      min-width: 400px;
      text-align: center;
      box-shadow: 0 0 30px rgba(0, 150, 255, 0.5), inset 0 0 50px rgba(0, 100, 200, 0.3);
      animation: wave-effect 3s ease-in-out infinite;
    `;

    // Add wave animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes wave-effect {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
      @keyframes ripple {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // Fishing icon
    const fishingIcon = document.createElement('div');
    fishingIcon.style.cssText = `
      font-size: 64px;
      margin-bottom: 20px;
      animation: ripple 2s ease-out infinite;
    `;
    fishingIcon.textContent = '🎣';
    fishingPanel.appendChild(fishingIcon);

    // Status text
    const statusText = document.createElement('div');
    statusText.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: #fff;
      text-shadow: 0 0 10px rgba(0, 200, 255, 0.8);
      margin-bottom: 20px;
    `;
    statusText.textContent = 'Casting...';
    fishingPanel.appendChild(statusText);

    // Subtext
    const subText = document.createElement('div');
    subText.style.cssText = `
      font-size: 16px;
      color: rgba(200, 240, 255, 0.9);
      margin-top: 10px;
    `;
    subText.textContent = 'Wait for a bite...';
    fishingPanel.appendChild(subText);

    fishingOverlay.appendChild(fishingPanel);
    hudContainer.appendChild(fishingOverlay);

    // Random casting time (2-5 seconds)
    const castTime = 2000 + Math.random() * 3000;

    setTimeout(() => {
      if (!document.getElementById('fishing-ui')) return;

      // Fish on! Show reeling prompt
      statusText.textContent = 'FISH ON!';
      statusText.style.color = '#ffff00';
      statusText.style.fontSize = '32px';
      subText.textContent = 'Press E to reel in!';
      subText.style.color = '#ffff00';
      fishingIcon.textContent = '🐟';

      let caughtFish = false;
      const reelWindow = 1500; // 1.5 second window to press E

      // Listen for E key
      const reelHandler = (e) => {
        if (e.key === 'e' || e.key === 'E') {
          caughtFish = true;
          document.removeEventListener('keydown', reelHandler);

          // Determine caught fish based on zone
          const fishResult = determineCatch(zoneId);

          statusText.textContent = `Caught ${fishResult.name}!`;
          statusText.style.color = '#4f4';
          subText.textContent = `+${fishResult.value} Spark`;
          fishingIcon.textContent = fishResult.icon;

          setTimeout(() => {
            hideFishingUI();
            if (fishingCallback) {
              fishingCallback({ success: true, fish: fishResult });
            }
          }, 2000);
        }
      };

      document.addEventListener('keydown', reelHandler);

      // Miss window timeout
      setTimeout(() => {
        if (!caughtFish) {
          document.removeEventListener('keydown', reelHandler);
          statusText.textContent = 'The fish got away...';
          statusText.style.color = '#f44';
          subText.textContent = 'Try again!';
          fishingIcon.textContent = '💨';

          setTimeout(() => {
            hideFishingUI();
            if (fishingCallback) {
              fishingCallback({ success: false });
            }
          }, 2000);
        }
      }, reelWindow);
    }, castTime);
  }

  /**
   * Determine what fish was caught based on zone
   * @param {string} zoneId - Current zone
   * @returns {Object} Fish data {id, name, icon, value, rarity}
   */
  function determineCatch(zoneId) {
    const zoneFishTables = {
      gardens: {
        common: [
          { id: 'fish_common', name: 'Common Carp', icon: '🐟', value: 5, rarity: 'common' },
          { id: 'fish_sunfish', name: 'Sunfish', icon: '☀️', value: 8, rarity: 'common' }
        ],
        uncommon: [
          { id: 'fish_rare', name: 'Rainbow Trout', icon: '🐠', value: 15, rarity: 'uncommon' },
          { id: 'fish_crystal_trout', name: 'Crystal Trout', icon: '💎', value: 40, rarity: 'rare' }
        ],
        rare: [
          { id: 'fish_golden', name: 'Golden Koi', icon: '🟡', value: 50, rarity: 'rare' }
        ]
      },
      wilds: {
        common: [
          { id: 'fish_common', name: 'Common Carp', icon: '🐟', value: 5, rarity: 'common' }
        ],
        uncommon: [
          { id: 'fish_shadow_bass', name: 'Shadow Bass', icon: '🌑', value: 18, rarity: 'uncommon' },
          { id: 'fish_silver_eel', name: 'Silver Eel', icon: '🐍', value: 20, rarity: 'uncommon' }
        ],
        rare: [
          { id: 'fish_starfish', name: 'Star Cod', icon: '⭐', value: 35, rarity: 'rare' },
          { id: 'fish_dragonfish', name: 'Dragonfish', icon: '🐉', value: 100, rarity: 'legendary' }
        ]
      },
      commons: {
        common: [
          { id: 'fish_common', name: 'Common Carp', icon: '🐟', value: 5, rarity: 'common' }
        ],
        uncommon: [
          { id: 'fish_rare', name: 'Rainbow Trout', icon: '🐠', value: 15, rarity: 'uncommon' },
          { id: 'fish_sunfish', name: 'Sunfish', icon: '☀️', value: 8, rarity: 'common' }
        ],
        rare: [
          { id: 'fish_moonfish', name: 'Moonfish', icon: '🌙', value: 25, rarity: 'uncommon' }
        ]
      },
      agora: {
        common: [
          { id: 'fish_common', name: 'Common Carp', icon: '🐟', value: 5, rarity: 'common' }
        ],
        uncommon: [
          { id: 'fish_rare', name: 'Rainbow Trout', icon: '🐠', value: 15, rarity: 'uncommon' }
        ],
        rare: [
          { id: 'fish_golden', name: 'Golden Koi', icon: '🟡', value: 50, rarity: 'rare' }
        ]
      }
    };

    // Default to commons if zone not found
    const table = zoneFishTables[zoneId] || zoneFishTables.commons;

    // Roll for rarity: 70% common, 25% uncommon, 5% rare
    const roll = Math.random();
    let pool;
    if (roll < 0.05 && table.rare && table.rare.length > 0) {
      pool = table.rare;
    } else if (roll < 0.30 && table.uncommon && table.uncommon.length > 0) {
      pool = table.uncommon;
    } else {
      pool = table.common;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Hide fishing UI
   */
  function hideFishingUI() {
    const fishingUI = document.getElementById('fishing-ui');
    if (fishingUI) {
      fishingUI.remove();
    }
    fishingUIActive = false;
    fishingCallback = null;
  }

  /**
   * Show fish caught notification
   * @param {string} fishName - Name of the fish
   * @param {number} value - Spark value
   */
  function showFishCaughtNotification(fishName, value) {
    if (!notificationContainer) return;
    if (typeof document === 'undefined') return;

    const notification = document.createElement('div');
    notification.style.cssText = `
      background: linear-gradient(135deg, rgba(0, 120, 200, 0.95) 0%, rgba(0, 180, 255, 0.95) 100%);
      border: 2px solid rgba(100, 220, 255, 0.9);
      border-radius: 10px;
      padding: 20px 30px;
      margin-bottom: 10px;
      box-shadow: 0 4px 20px rgba(0, 150, 255, 0.6);
      animation: slideIn 0.3s ease-out, slideOut 0.3s ease-in 2.7s;
      pointer-events: auto;
      text-align: center;
    `;

    const fishIcon = document.createElement('div');
    fishIcon.style.cssText = `
      font-size: 48px;
      margin-bottom: 10px;
    `;
    fishIcon.textContent = '🎣';
    notification.appendChild(fishIcon);

    const fishText = document.createElement('div');
    fishText.style.cssText = `
      font-size: 20px;
      font-weight: bold;
      color: #fff;
      text-shadow: 0 0 10px rgba(0, 200, 255, 0.8);
      margin-bottom: 5px;
    `;
    fishText.textContent = `Caught ${fishName}!`;
    notification.appendChild(fishText);

    const valueText = document.createElement('div');
    valueText.style.cssText = `
      font-size: 16px;
      color: #ffff00;
      text-shadow: 0 0 8px rgba(255, 255, 0, 0.6);
    `;
    valueText.textContent = `+${value} Spark`;
    notification.appendChild(valueText);

    notificationContainer.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // ========================================================================
  // PET PANEL
  // ========================================================================

  var petPanel = null;

  function showPetPanel(playerId, currentZone) {
    if (typeof document === 'undefined') return;

    var Pets = typeof window !== 'undefined' ? window.Pets : null;
    if (!Pets) {
      console.warn('Pets module not available');
      return;
    }

    // Toggle if already open
    if (petPanel) {
      hidePetPanel();
      return;
    }

    var pet = Pets.getPlayerPet(playerId);

    var panel = document.createElement('div');
    panel.className = 'pet-panel';

    // Header
    var header = document.createElement('h2');
    header.textContent = pet ? 'My Pingym' : 'Adopt a Pingym';
    panel.appendChild(header);

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position:absolute;top:15px;right:15px;width:30px;height:30px;' +
      'background:rgba(255,255,255,0.1);color:#E8E0D8;border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:50%;font-size:20px;cursor:pointer;transition:all 0.2s;';
    closeBtn.onmouseover = function() {
      this.style.background = 'rgba(218,165,32,0.3)';
      this.style.borderColor = '#DAA520';
    };
    closeBtn.onmouseout = function() {
      this.style.background = 'rgba(255,255,255,0.1)';
      this.style.borderColor = 'rgba(255,255,255,0.3)';
    };
    closeBtn.onclick = hidePetPanel;
    panel.appendChild(closeBtn);

    if (pet) {
      // Show current pet info
      showCurrentPetInfo(panel, pet, playerId, Pets);
    } else {
      // Show available pets to adopt
      showAdoptionList(panel, playerId, currentZone, Pets);
    }

    document.body.appendChild(panel);
    petPanel = panel;
    requestAnimationFrame(function() {
      panel.classList.add('visible');
    });

    // Close on Escape
    var escapeHandler = function(e) {
      if (e.key === 'Escape') {
        hidePetPanel();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    panel.escapeHandler = escapeHandler;
  }

  function showCurrentPetInfo(panel, pet, playerId, Pets) {
    var petTypeData = Pets.getPetTypeData(pet.type);
    var mood = Pets.getPetMood(pet);
    var moodEmoji = Pets.getMoodEmoji(mood);
    var bonus = Pets.getPetBonus(playerId);

    // Pet display section
    var petDisplay = document.createElement('div');
    petDisplay.style.cssText = 'text-align:center;margin-bottom:20px;padding:20px;' +
      'background:rgba(255,255,255,0.03);border-radius:8px;';

    // Pet icon
    var petIcon = document.createElement('div');
    petIcon.textContent = petTypeData.icon;
    petIcon.style.cssText = 'font-size:64px;margin-bottom:10px;';
    petDisplay.appendChild(petIcon);

    // Pet name
    var petName = document.createElement('div');
    petName.textContent = pet.name;
    petName.style.cssText = 'font-size:1.2rem;color:#DAA520;font-weight:bold;margin-bottom:5px;';
    petDisplay.appendChild(petName);

    // Pet type
    var petType = document.createElement('div');
    petType.textContent = petTypeData.name;
    petType.style.cssText = 'font-size:0.9rem;color:#B8B0A8;margin-bottom:5px;';
    petDisplay.appendChild(petType);

    // Pet mood
    var petMoodDisplay = document.createElement('div');
    petMoodDisplay.textContent = moodEmoji + ' ' + mood.charAt(0).toUpperCase() + mood.slice(1);
    petMoodDisplay.style.cssText = 'font-size:0.9rem;color:#E8E0D8;margin-top:10px;';
    petDisplay.appendChild(petMoodDisplay);

    panel.appendChild(petDisplay);

    // Stats section
    var statsSection = document.createElement('div');
    statsSection.style.cssText = 'margin-bottom:20px;';

    // Mood bar
    var moodLabel = document.createElement('div');
    moodLabel.textContent = 'Mood: ' + Math.round(pet.mood) + '/100';
    moodLabel.style.cssText = 'color:#E8E0D8;font-size:0.85rem;margin-bottom:4px;';
    statsSection.appendChild(moodLabel);

    var moodBar = createProgressBar(pet.mood, '#DAA520');
    statsSection.appendChild(moodBar);

    // Hunger bar
    var hungerLabel = document.createElement('div');
    hungerLabel.textContent = 'Hunger: ' + Math.round(pet.hunger) + '/100';
    hungerLabel.style.cssText = 'color:#E8E0D8;font-size:0.85rem;margin-bottom:4px;margin-top:12px;';
    statsSection.appendChild(hungerLabel);

    var hungerBar = createProgressBar(pet.hunger, pet.hunger > 60 ? '#e74c3c' : '#3498db');
    statsSection.appendChild(hungerBar);

    // Bond bar
    var bondLabel = document.createElement('div');
    bondLabel.textContent = 'Bond: ' + Math.round(pet.bond) + '/100';
    bondLabel.style.cssText = 'color:#E8E0D8;font-size:0.85rem;margin-bottom:4px;margin-top:12px;';
    statsSection.appendChild(bondLabel);

    var bondBar = createProgressBar(pet.bond, '#2ecc71');
    statsSection.appendChild(bondBar);

    panel.appendChild(statsSection);

    // Bonus display
    if (bonus && bonus.value > 0) {
      var bonusDisplay = document.createElement('div');
      bonusDisplay.textContent = 'Bonus: ' + bonus.description;
      bonusDisplay.style.cssText = 'color:#2ecc71;font-size:0.85rem;margin-bottom:20px;' +
        'padding:8px;background:rgba(46,204,113,0.1);border-radius:4px;text-align:center;';
      panel.appendChild(bonusDisplay);
    }

    // Actions section
    var actionsSection = document.createElement('div');
    actionsSection.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';

    // Feed button
    var feedBtn = document.createElement('button');
    feedBtn.textContent = 'Feed';
    feedBtn.className = 'pet-action-btn';
    feedBtn.onclick = function() {
      showFeedMenu(playerId, Pets);
    };
    actionsSection.appendChild(feedBtn);

    // Rename button
    var renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'pet-action-btn';
    renameBtn.onclick = function() {
      var newName = prompt('Enter new name for ' + pet.name + ':');
      if (newName && newName.trim()) {
        if (Pets.renamePet(playerId, newName.trim())) {
          showNotification('Pingym renamed to ' + newName.trim());
          hidePetPanel();
        }
      }
    };
    actionsSection.appendChild(renameBtn);

    panel.appendChild(actionsSection);

    // Release button (dangerous action)
    var releaseBtn = document.createElement('button');
    releaseBtn.textContent = 'Release to Wild';
    releaseBtn.className = 'pet-release-btn';
    releaseBtn.onclick = function() {
      if (confirm('Are you sure you want to release ' + pet.name + '? This cannot be undone.')) {
        if (Pets.releasePet(playerId)) {
          showNotification(pet.name + ' has been released to the wild');
          hidePetPanel();
        }
      }
    };
    panel.appendChild(releaseBtn);
  }

  function showAdoptionList(panel, playerId, currentZone, Pets) {
    var availablePets = Pets.getAvailablePets(currentZone || 'commons');

    // Info text
    var infoText = document.createElement('div');
    infoText.textContent = 'Choose a Pingym to adopt in this zone:';
    infoText.style.cssText = 'color:#B8B0A8;font-size:0.9rem;margin-bottom:16px;';
    panel.appendChild(infoText);

    if (availablePets.length === 0) {
      var noPets = document.createElement('div');
      noPets.textContent = 'No pets available in this zone. Try exploring other areas!';
      noPets.style.cssText = 'color:#E8E0D8;text-align:center;padding:20px;';
      panel.appendChild(noPets);
      return;
    }

    // Pet list
    availablePets.forEach(function(petType) {
      var petRow = document.createElement('div');
      petRow.className = 'pet-adoption-row';
      petRow.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;' +
        'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);' +
        'border-radius:8px;margin-bottom:8px;transition:all 0.2s;cursor:pointer;';

      petRow.onmouseover = function() {
        this.style.borderColor = 'rgba(218,165,32,0.5)';
        this.style.background = 'rgba(218,165,32,0.1)';
      };
      petRow.onmouseout = function() {
        this.style.borderColor = 'rgba(255,255,255,0.1)';
        this.style.background = 'rgba(255,255,255,0.03)';
      };

      // Pet icon
      var icon = document.createElement('div');
      icon.textContent = petType.icon;
      icon.style.cssText = 'font-size:32px;width:40px;text-align:center;';
      petRow.appendChild(icon);

      // Pet info
      var info = document.createElement('div');
      info.style.cssText = 'flex:1;';

      var name = document.createElement('div');
      name.textContent = petType.name;
      name.style.cssText = 'color:#E8E0D8;font-size:0.95rem;font-weight:bold;margin-bottom:2px;';
      info.appendChild(name);

      var desc = document.createElement('div');
      desc.textContent = petType.description;
      desc.style.cssText = 'color:#B8B0A8;font-size:0.75rem;margin-bottom:4px;';
      info.appendChild(desc);

      var rarity = document.createElement('div');
      rarity.textContent = petType.rarity.charAt(0).toUpperCase() + petType.rarity.slice(1);
      var rarityColor = petType.rarity === 'legendary' ? '#f39c12' :
                        petType.rarity === 'rare' ? '#3498db' :
                        petType.rarity === 'uncommon' ? '#2ecc71' : '#95a5a6';
      rarity.style.cssText = 'color:' + rarityColor + ';font-size:0.7rem;';
      info.appendChild(rarity);

      petRow.appendChild(info);

      // Adopt button
      var adoptBtn = document.createElement('button');
      adoptBtn.textContent = 'Adopt';
      adoptBtn.className = 'pet-adopt-btn';
      adoptBtn.onclick = function(e) {
        e.stopPropagation();
        var petName = prompt('Choose a name for your ' + petType.name + ':');
        if (petName && petName.trim()) {
          var adoptedPet = Pets.adoptPet(playerId, petType.id, petName.trim());
          if (adoptedPet) {
            showPetAdoptNotification(petName.trim(), petType);
            hidePetPanel();
          } else {
            alert('Could not adopt. You may already have a Pingym.');
          }
        }
      };
      petRow.appendChild(adoptBtn);

      panel.appendChild(petRow);
    });
  }

  function showFeedMenu(playerId, Pets) {
    if (!petPanel) return;

    // Simple food selection
    var foods = ['berry', 'fish', 'mushroom', 'bread', 'treat'];
    var foodEmojis = {
      'berry': '🫐',
      'fish': '🐟',
      'mushroom': '🍄',
      'bread': '🍞',
      'treat': '🍪'
    };

    var feedMenu = document.createElement('div');
    feedMenu.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(15,12,10,0.98);border:2px solid #DAA520;border-radius:12px;' +
      'padding:20px;z-index:1200;min-width:250px;';

    var title = document.createElement('h3');
    title.textContent = 'Choose Food';
    title.style.cssText = 'color:#DAA520;margin:0 0 16px;text-align:center;';
    feedMenu.appendChild(title);

    foods.forEach(function(food) {
      var foodBtn = document.createElement('button');
      foodBtn.textContent = foodEmojis[food] + ' ' + food.charAt(0).toUpperCase() + food.slice(1);
      foodBtn.className = 'pet-food-btn';
      foodBtn.style.cssText = 'display:block;width:100%;padding:10px;margin-bottom:8px;' +
        'background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);' +
        'border-radius:6px;color:#E8E0D8;cursor:pointer;transition:all 0.2s;';

      foodBtn.onmouseover = function() {
        this.style.background = 'rgba(218,165,32,0.2)';
        this.style.borderColor = '#DAA520';
      };
      foodBtn.onmouseout = function() {
        this.style.background = 'rgba(255,255,255,0.1)';
        this.style.borderColor = 'rgba(255,255,255,0.2)';
      };

      foodBtn.onclick = function() {
        var result = Pets.feedPet(playerId, food);
        if (result.success) {
          showNotification(result.message);
          document.body.removeChild(feedMenu);
          hidePetPanel();
        }
      };
      feedMenu.appendChild(foodBtn);
    });

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'pet-food-btn';
    cancelBtn.style.cssText = 'display:block;width:100%;padding:10px;' +
      'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);' +
      'border-radius:6px;color:#B8B0A8;cursor:pointer;';
    cancelBtn.onclick = function() {
      document.body.removeChild(feedMenu);
    };
    feedMenu.appendChild(cancelBtn);

    document.body.appendChild(feedMenu);
  }

  function createProgressBar(value, color) {
    var container = document.createElement('div');
    container.style.cssText = 'width:100%;height:8px;background:rgba(255,255,255,0.1);' +
      'border-radius:4px;overflow:hidden;';

    var fill = document.createElement('div');
    fill.style.cssText = 'height:100%;background:' + color + ';border-radius:4px;' +
      'transition:width 0.5s ease;width:' + value + '%;';

    container.appendChild(fill);
    return container;
  }

  function hidePetPanel() {
    if (!petPanel) return;
    if (petPanel.escapeHandler) {
      document.removeEventListener('keydown', petPanel.escapeHandler);
    }
    petPanel.classList.remove('visible');
    setTimeout(function() {
      if (petPanel && petPanel.parentNode) {
        document.body.removeChild(petPanel);
        petPanel = null;
      }
    }, 250);
  }

  function showPetAdoptNotification(petName, petType) {
    if (typeof document === 'undefined') return;

    var notification = document.createElement('div');
    notification.className = 'pet-adopt-notification';
    notification.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:linear-gradient(135deg,rgba(25,20,15,0.95),rgba(35,28,18,0.95));' +
      'border:2px solid #DAA520;border-radius:16px;padding:30px 40px;text-align:center;' +
      'z-index:2000;animation:petAdoptReveal 0.5s ease-out,petAdoptFade 4s ease-in-out;' +
      'box-shadow:0 0 40px rgba(218,165,32,0.4);pointer-events:none;';

    // Add keyframes if not already present
    var styleId = 'pet-adopt-animations';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes petAdoptReveal {
          0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0; }
          60% { transform: translate(-50%,-50%) scale(1.05); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes petAdoptFade {
          0%, 80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    var icon = document.createElement('div');
    icon.textContent = petType.icon;
    icon.style.cssText = 'font-size:64px;margin-bottom:16px;';
    notification.appendChild(icon);

    var title = document.createElement('div');
    title.textContent = 'Pingym Adopted!';
    title.style.cssText = 'font-size:0.9rem;color:#DAA520;text-transform:uppercase;' +
      'letter-spacing:0.15em;margin-bottom:8px;';
    notification.appendChild(title);

    var name = document.createElement('div');
    name.textContent = petName;
    name.style.cssText = 'font-size:1.5rem;color:#E8E0D8;font-weight:bold;margin-bottom:4px;';
    notification.appendChild(name);

    var typeName = document.createElement('div');
    typeName.textContent = petType.name;
    typeName.style.cssText = 'font-size:1rem;color:#B8B0A8;';
    notification.appendChild(typeName);

    document.body.appendChild(notification);

    setTimeout(function() {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 4000);
  }

  exports.initHUD = initHUD;
  exports.initToolbar = initToolbar;
  exports.updateChat = updateChat;
  exports.addChatMessage = addChatMessage;
  exports.updatePlayerInfo = updatePlayerInfo;
  exports.updateMinimap = updateMinimap;
  exports.updateZoneLabel = updateZoneLabel;
  exports.updateNearbyPlayers = updateNearbyPlayers;
  exports.showBreakReminder = showBreakReminder;
  exports.addChatInput = addChatInput;
  exports.showChatInput = showChatInput;
  exports.hideChatInput = hideChatInput;
  exports.showNotification = showNotification;
  exports.updateCoords = updateCoords;
  exports.updateTimeWeather = updateTimeWeather;
  exports.showNPCDialog = showNPCDialog;
  exports.hideNPCDialog = hideNPCDialog;
  exports.setNPCActionCallback = setNPCActionCallback;
  exports.showNPCShop = showNPCShop;
  exports.hideNPCShop = hideNPCShop;
  exports.updateMinimapNPCs = updateMinimapNPCs;
  exports.initQuestTracker = initQuestTracker;
  exports.updateQuestTracker = updateQuestTracker;
  exports.showQuestLog = showQuestLog;
  exports.hideQuestLog = hideQuestLog;
  exports.showQuestOffer = showQuestOffer;
  exports.hideQuestOffer = hideQuestOffer;
  exports.showQuestComplete = showQuestComplete;
  exports.showQuestProgress = showQuestProgress;
  exports.acceptQuestFromOffer = acceptQuestFromOffer;
  exports.updateFederationStatus = updateFederationStatus;
  exports.showFederationPortalUI = showFederationPortalUI;
  exports.hideFederationPortalUI = hideFederationPortalUI;
  exports.abandonQuestFromLog = abandonQuestFromLog;
  exports.initInventoryPanel = initInventoryPanel;
  exports.toggleInventoryPanel = toggleInventoryPanel;
  exports.showInventoryPanel = showInventoryPanel;
  exports.hideInventoryPanel = hideInventoryPanel;
  exports.updateInventoryDisplay = updateInventoryDisplay;
  exports.initCraftingPanel = initCraftingPanel;
  exports.toggleCraftingPanel = toggleCraftingPanel;
  exports.showCraftingPanel = showCraftingPanel;
  exports.hideCraftingPanel = hideCraftingPanel;
  exports.updateCraftingDisplay = updateCraftingDisplay;
  exports.initQuickBar = initQuickBar;
  exports.updateQuickBar = updateQuickBar;
  exports.showItemPickup = showItemPickup;
  exports.showTradeRequest = showTradeRequest;
  exports.hideTradeRequest = hideTradeRequest;
  exports.showTradeWindow = showTradeWindow;
  exports.updateTradeWindow = updateTradeWindow;
  exports.hideTradeWindow = hideTradeWindow;
  exports.showTradeComplete = showTradeComplete;
  exports.showEmoteMenu = showEmoteMenu;
  exports.hideEmoteMenu = hideEmoteMenu;
  exports.showEmoteBubble = showEmoteBubble;
  exports.updateEmoteBubbles = updateEmoteBubbles;
  exports.showBuildToolbar = showBuildToolbar;
  exports.hideBuildToolbar = hideBuildToolbar;
  exports.updateBuildToolbar = updateBuildToolbar;
  exports.showWorldMap = showWorldMap;
  exports.hideWorldMap = hideWorldMap;
  exports.updateWorldMap = updateWorldMap;
  exports.showSettingsMenu = showSettingsMenu;
  exports.hideSettingsMenu = hideSettingsMenu;
  exports.loadSettings = loadSettings;
  exports.getSettings = getSettings;
  exports.showPlayerProfile = showPlayerProfile;
  exports.hidePlayerProfile = hidePlayerProfile;
  exports.showProfilePanel = showProfilePanel;
  exports.hideProfilePanel = hideProfilePanel;
  exports.updateProfileStats = updateProfileStats;
  exports.showDiscoveryLog = showDiscoveryLog;
  exports.hideDiscoveryLog = hideDiscoveryLog;
  exports.showLoreBook = showLoreBook;
  exports.hideLoreBook = hideLoreBook;
  exports.showLoreJournal = showLoreJournal;
  exports.hideLoreJournal = hideLoreJournal;
  exports.toggleLoreJournal = toggleLoreJournal;
  exports.showAchievementToast = showAchievementToast;
  exports.showDiscoveryPopup = showDiscoveryPopup;
  exports.showSkillsPanel = showSkillsPanel;
  exports.hideSkillsPanel = hideSkillsPanel;
  exports.showMentorOffer = showMentorOffer;
  exports.showLessonProgress = showLessonProgress;
  exports.showComposePanel = showComposePanel;
  exports.hideComposePanel = hideComposePanel;
  exports.playComposition = playComposition;
  exports.showGuildPanel = showGuildPanel;
  exports.hideGuildPanel = hideGuildPanel;
  exports.showGuildCreate = showGuildCreate;
  exports.hideGuildCreate = hideGuildCreate;
  exports.showGuildInvite = showGuildInvite;
  exports.updateGuildTag = updateGuildTag;
  exports.initGovernancePanel = initGovernancePanel;
  exports.showGovernancePanel = showGovernancePanel;
  exports.hideGovernancePanel = hideGovernancePanel;
  exports.toggleGovernancePanel = toggleGovernancePanel;
  exports.initAuctionHousePanel = initAuctionHousePanel;
  exports.showAuctionHousePanel = showAuctionHousePanel;
  exports.hideAuctionHousePanel = hideAuctionHousePanel;
  exports.toggleAuctionHousePanel = toggleAuctionHousePanel;
  exports.updateReputationDisplay = updateReputationDisplay;
  exports.showAchievementPanel = showAchievementPanel;
  exports.hideAchievementPanel = hideAchievementPanel;
  exports.showFishingUI = showFishingUI;
  exports.hideFishingUI = hideFishingUI;
  exports.showFishCaughtNotification = showFishCaughtNotification;
  exports.showPetPanel = showPetPanel;
  exports.hidePetPanel = hidePetPanel;
  exports.showPetAdoptNotification = showPetAdoptNotification;

  // =============================================================================
  // TUTORIAL/ONBOARDING SYSTEM
  // =============================================================================

  var tutorialState = {
    active: false,
    currentStep: 0,
    completed: false
  };

  var tutorialTooltip = null;
  var tutorialSteps = [
    {
      id: 'move',
      message: 'Welcome to ZION! Use WASD to move around.',
      action: 'move'
    },
    {
      id: 'interact',
      message: 'Press E near an NPC to interact.',
      action: 'interact'
    },
    {
      id: 'inventory',
      message: 'Press I to open your inventory.',
      action: 'openInventory'
    },
    {
      id: 'quests',
      message: 'Press J to check your quests.',
      action: 'openQuests'
    },
    {
      id: 'chat',
      message: 'Press Enter to chat with other players.',
      action: 'openChat'
    },
    {
      id: 'complete',
      message: "You're ready! Explore the world, make friends, and build something beautiful.",
      action: 'complete',
      autoDismiss: true
    }
  ];

  /**
   * Create tutorial tooltip UI
   */
  function createTutorialTooltip() {
    if (typeof document === 'undefined') return null;

    var tooltip = document.createElement('div');
    tooltip.id = 'tutorial-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      bottom: 240px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 12, 10, 0.92);
      border: 1px solid rgba(218, 165, 32, 0.4);
      border-radius: 8px;
      padding: 20px 25px;
      min-width: 400px;
      max-width: 500px;
      pointer-events: auto;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      animation: tutorialPulse 2s infinite;
    `;

    // Add CSS animation for pulsing glow
    var styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes tutorialPulse {
        0%, 100% {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(218, 165, 32, 0.2);
        }
        50% {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 20px rgba(218, 165, 32, 0.5);
        }
      }
    `;
    document.head.appendChild(styleSheet);

    // Step counter
    var stepCounter = document.createElement('div');
    stepCounter.id = 'tutorial-step-counter';
    stepCounter.style.cssText = `
      color: #DAA520;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    tooltip.appendChild(stepCounter);

    // Message content
    var message = document.createElement('div');
    message.id = 'tutorial-message';
    message.style.cssText = `
      color: #ffffff;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 15px;
    `;
    tooltip.appendChild(message);

    // Button container
    var buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
    `;

    // Skip button
    var skipButton = document.createElement('button');
    skipButton.id = 'tutorial-skip-btn';
    skipButton.textContent = 'Skip Tutorial';
    skipButton.style.cssText = `
      background: rgba(100, 100, 100, 0.3);
      border: 1px solid rgba(150, 150, 150, 0.4);
      color: #cccccc;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    skipButton.onmouseover = function() {
      skipButton.style.background = 'rgba(120, 120, 120, 0.4)';
      skipButton.style.borderColor = 'rgba(170, 170, 170, 0.6)';
    };
    skipButton.onmouseout = function() {
      skipButton.style.background = 'rgba(100, 100, 100, 0.3)';
      skipButton.style.borderColor = 'rgba(150, 150, 150, 0.4)';
    };
    skipButton.onclick = function() {
      skipTutorial();
    };
    buttonContainer.appendChild(skipButton);

    tooltip.appendChild(buttonContainer);

    return tooltip;
  }

  /**
   * Update tutorial tooltip content
   */
  function updateTutorialTooltip() {
    if (!tutorialTooltip || !tutorialState.active) return;

    var step = tutorialSteps[tutorialState.currentStep];
    var stepCounter = tutorialTooltip.querySelector('#tutorial-step-counter');
    var message = tutorialTooltip.querySelector('#tutorial-message');

    if (stepCounter) {
      stepCounter.textContent = 'Step ' + (tutorialState.currentStep + 1) + '/' + tutorialSteps.length;
    }

    if (message) {
      message.textContent = step.message;
    }
  }

  /**
   * Show tutorial tooltip
   */
  function showTutorialTooltip() {
    if (!hudContainer || typeof document === 'undefined') return;

    if (!tutorialTooltip) {
      tutorialTooltip = createTutorialTooltip();
      if (!tutorialTooltip) return;
    }

    var hudOverlay = document.getElementById('zion-hud');
    if (hudOverlay && tutorialTooltip.parentNode !== hudOverlay) {
      hudOverlay.appendChild(tutorialTooltip);
    }

    updateTutorialTooltip();
    tutorialTooltip.style.display = 'block';
  }

  /**
   * Hide tutorial tooltip
   */
  function hideTutorialTooltip() {
    if (tutorialTooltip) {
      tutorialTooltip.style.display = 'none';
    }
  }

  /**
   * Remove tutorial tooltip from DOM
   */
  function removeTutorialTooltip() {
    if (tutorialTooltip && tutorialTooltip.parentNode) {
      tutorialTooltip.parentNode.removeChild(tutorialTooltip);
      tutorialTooltip = null;
    }
  }

  /**
   * Initialize tutorial system
   * Called after login to check if player is new
   */
  function initTutorial() {
    if (typeof localStorage === 'undefined') {
      console.warn('Tutorial requires localStorage support');
      return;
    }

    // Check if tutorial is already complete
    var tutorialComplete = localStorage.getItem('zion_tutorial_complete');
    if (tutorialComplete === 'true') {
      tutorialState.completed = true;
      tutorialState.active = false;
      return;
    }

    // Start tutorial for new player
    tutorialState.active = true;
    tutorialState.currentStep = 0;
    tutorialState.completed = false;

    showTutorialTooltip();
  }

  /**
   * Advance tutorial to next step
   * @param {string} completedAction - The action that was completed (move, interact, openInventory, openQuests, openChat)
   */
  function advanceTutorial(completedAction) {
    if (!tutorialState.active || tutorialState.completed) return;

    var currentStep = tutorialSteps[tutorialState.currentStep];

    // Check if completed action matches current step
    if (currentStep.action !== completedAction) return;

    // Handle final step with auto-dismiss
    if (currentStep.autoDismiss) {
      setTimeout(function() {
        completeTutorial();
      }, 5000);
      return;
    }

    // Move to next step
    tutorialState.currentStep++;

    if (tutorialState.currentStep >= tutorialSteps.length) {
      completeTutorial();
      return;
    }

    // Update tooltip for next step
    updateTutorialTooltip();
  }

  /**
   * Complete tutorial and mark as done
   */
  function completeTutorial() {
    tutorialState.active = false;
    tutorialState.completed = true;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('zion_tutorial_complete', 'true');
    }

    hideTutorialTooltip();

    // Remove tooltip after a short delay to allow for fade out
    setTimeout(function() {
      removeTutorialTooltip();
    }, 300);

    // Show completion notification
    if (typeof showNotification === 'function') {
      showNotification('Tutorial Complete! Good luck in ZION!', 'success');
    }
  }

  /**
   * Skip tutorial and mark as complete
   */
  function skipTutorial() {
    completeTutorial();
  }

  /**
   * Check if tutorial is currently active
   * @returns {boolean} True if tutorial is active
   */
  function isTutorialActive() {
    return tutorialState.active;
  }

  // Export tutorial functions
  exports.initTutorial = initTutorial;
  exports.advanceTutorial = advanceTutorial;
  exports.skipTutorial = skipTutorial;
  exports.isTutorialActive = isTutorialActive;

  // =============================================================================
  // XR (VR/AR) BUTTONS
  // =============================================================================
  var xrCaps = null;
  var xrSceneCtx = null;

  function setXRCapabilities(caps, sceneCtx) {
    xrCaps = caps;
    xrSceneCtx = sceneCtx;
    // Add XR buttons to toolbar if supported
    if (typeof document === 'undefined') return;
    var toolbar = document.querySelector('#bottom-toolbar');
    if (!toolbar) return;

    if (caps.vrSupported) {
      var vrBtn = document.createElement('button');
      vrBtn.id = 'vr-btn';
      vrBtn.textContent = 'VR';
      vrBtn.title = 'Enter VR Mode';
      vrBtn.style.cssText = 'padding:6px 12px;background:rgba(68,170,255,0.3);color:#4af;border:1px solid #4af;' +
        'border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;';
      vrBtn.onclick = function() {
        var XR = typeof window !== 'undefined' ? window.XR : null;
        if (XR && xrSceneCtx && xrSceneCtx.renderer) {
          XR.enterVR(xrSceneCtx.renderer, xrSceneCtx.scene, xrSceneCtx.camera).catch(function(err) {
            showNotification('Failed to enter VR: ' + err.message, 'error');
          });
        }
      };
      toolbar.appendChild(vrBtn);
    }

    if (caps.arSupported) {
      var arBtn = document.createElement('button');
      arBtn.id = 'ar-btn';
      arBtn.textContent = 'AR';
      arBtn.title = 'Enter AR Mode';
      arBtn.style.cssText = 'padding:6px 12px;background:rgba(255,165,0,0.3);color:#ffa500;border:1px solid #ffa500;' +
        'border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;';
      arBtn.onclick = function() {
        var XR = typeof window !== 'undefined' ? window.XR : null;
        if (XR && xrSceneCtx && xrSceneCtx.renderer) {
          XR.enterAR(xrSceneCtx.renderer, xrSceneCtx.scene, xrSceneCtx.camera).catch(function(err) {
            showNotification('Failed to enter AR: ' + err.message, 'error');
          });
        }
      };
      toolbar.appendChild(arBtn);
    }
  }
  exports.setXRCapabilities = setXRCapabilities;

  // =============================================================================
  // ANCHOR SYSTEM PANEL
  // =============================================================================
  var anchorPanelEl = null;

  function showAnchorPanel(playerPosition, currentZone) {
    if (typeof document === 'undefined') return;
    hideAnchorPanel();

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    var State = typeof window !== 'undefined' ? window.State : null;
    var anchors = [];
    if (State) {
      var liveState = State.getLiveState();
      if (liveState && liveState.anchors) {
        anchors = Object.values(liveState.anchors);
      }
    }

    anchorPanelEl = document.createElement('div');
    anchorPanelEl.id = 'anchor-panel';
    anchorPanelEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #4af;border-radius:12px;' +
      'padding:20px;width:400px;max-height:500px;overflow-y:auto;pointer-events:auto;z-index:300;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.8);';

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<h2 style="color:#4af;margin:0;font-size:18px;">Anchors</h2>' +
      '<button id="anchor-close" style="background:rgba(255,255,255,0.1);color:#E8E0D8;border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:16px;">×</button></div>';

    if (anchors.length === 0) {
      html += '<p style="color:#888;text-align:center;">No anchors placed yet.</p>';
    } else {
      anchors.forEach(function(anchor) {
        html += '<div style="background:rgba(255,255,255,0.05);border:1px solid #333;border-radius:8px;padding:10px;margin-bottom:8px;">' +
          '<div style="color:#4af;font-weight:bold;">' + (anchor.name || 'Unnamed Anchor') + '</div>' +
          '<div style="color:#888;font-size:12px;">Zone: ' + (anchor.zone || 'unknown') + ' | By: ' + (anchor.owner || 'unknown') + '</div>' +
          '</div>';
      });
    }

    // Place anchor form
    html += '<div style="border-top:1px solid #333;padding-top:12px;margin-top:12px;">' +
      '<div style="color:#aaa;font-size:13px;margin-bottom:8px;">Place New Anchor</div>' +
      '<input id="anchor-name-input" placeholder="Anchor name..." style="width:100%;padding:6px;background:rgba(0,0,0,0.5);' +
      'border:1px solid #555;border-radius:4px;color:#fff;font-size:13px;margin-bottom:8px;box-sizing:border-box;" />' +
      '<button id="anchor-place-btn" style="width:100%;padding:8px;background:#4af;color:#000;border:none;border-radius:6px;' +
      'font-weight:bold;cursor:pointer;">Place Anchor Here</button></div>';

    anchorPanelEl.innerHTML = html;
    hud.appendChild(anchorPanelEl);

    document.getElementById('anchor-close').onclick = hideAnchorPanel;
    document.getElementById('anchor-place-btn').onclick = function() {
      var name = document.getElementById('anchor-name-input').value.trim();
      if (!name) { showNotification('Enter an anchor name', 'warning'); return; }
      // Send anchor_place protocol message via main.js callback
      if (typeof window !== 'undefined' && window._onAnchorPlace) {
        window._onAnchorPlace({ name: name, zone: currentZone, position: playerPosition });
      }
      showNotification('Anchor "' + name + '" placed!', 'success');
      hideAnchorPanel();
    };
  }

  function hideAnchorPanel() {
    if (anchorPanelEl && anchorPanelEl.parentNode) {
      anchorPanelEl.parentNode.removeChild(anchorPanelEl);
      anchorPanelEl = null;
    }
  }

  exports.showAnchorPanel = showAnchorPanel;
  exports.hideAnchorPanel = hideAnchorPanel;

  // =============================================================================
  // STEWARD ELECTION PANEL
  // =============================================================================
  var stewardPanelEl = null;

  function showStewardPanel(currentZone, playerId) {
    if (typeof document === 'undefined') return;
    hideStewardPanel();

    var hud = document.querySelector('#zion-hud');
    if (!hud) return;

    var State = typeof window !== 'undefined' ? window.State : null;
    var liveState = State ? State.getLiveState() : {};
    var stewards = liveState.stewards || {};
    var elections = liveState.elections || {};
    var zoneSteward = stewards[currentZone];

    stewardPanelEl = document.createElement('div');
    stewardPanelEl.id = 'steward-panel';
    stewardPanelEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #DAA520;border-radius:12px;' +
      'padding:20px;width:420px;max-height:500px;overflow-y:auto;pointer-events:auto;z-index:300;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.8);';

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<h2 style="color:#DAA520;margin:0;font-size:18px;">Zone Steward — ' + currentZone + '</h2>' +
      '<button id="steward-close" style="background:rgba(255,255,255,0.1);color:#E8E0D8;border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:16px;">×</button></div>';

    if (zoneSteward) {
      html += '<div style="background:rgba(218,165,32,0.1);border:1px solid #DAA520;border-radius:8px;padding:12px;margin-bottom:12px;">' +
        '<div style="color:#DAA520;font-weight:bold;">Current Steward: ' + zoneSteward.playerId + '</div>' +
        '<div style="color:#888;font-size:12px;">Elected: ' + new Date(zoneSteward.elected_at).toLocaleDateString() + '</div>' +
        '<div style="color:#888;font-size:12px;">Term ends: ' + new Date(zoneSteward.term_ends).toLocaleDateString() + '</div>';
      if (zoneSteward.welcomeMessage) {
        html += '<div style="color:#aaa;font-size:13px;margin-top:8px;font-style:italic;">"' + zoneSteward.welcomeMessage + '"</div>';
      }
      html += '</div>';
    } else {
      html += '<p style="color:#888;text-align:center;">No steward for this zone.</p>';
    }

    // Active elections
    var activeElections = Object.values(elections).filter(function(e) {
      return e.zone === currentZone && e.status === 'active';
    });

    if (activeElections.length > 0) {
      var elec = activeElections[0];
      html += '<div style="background:rgba(68,170,255,0.1);border:1px solid #4af;border-radius:8px;padding:12px;margin-bottom:12px;">' +
        '<div style="color:#4af;font-weight:bold;">Active Election</div>' +
        '<div style="color:#888;font-size:12px;">Candidates: ' + elec.candidates.join(', ') + '</div>' +
        '<div style="color:#888;font-size:12px;">Votes cast: ' + Object.keys(elec.votes).length + '</div>';

      // Vote buttons
      html += '<div style="margin-top:8px;">';
      elec.candidates.forEach(function(c) {
        html += '<button class="steward-vote-btn" data-election="' + elec.id + '" data-candidate="' + c + '" ' +
          'style="margin:2px;padding:4px 12px;background:rgba(68,170,255,0.3);color:#4af;border:1px solid #4af;' +
          'border-radius:4px;cursor:pointer;font-size:12px;">Vote: ' + c + '</button>';
      });
      html += '</div></div>';
    } else {
      // Start election button
      html += '<button id="steward-start-election" style="width:100%;padding:10px;background:#DAA520;color:#000;border:none;' +
        'border-radius:6px;font-weight:bold;cursor:pointer;margin-top:8px;">Start Election for ' + currentZone + '</button>';
    }

    stewardPanelEl.innerHTML = html;
    hud.appendChild(stewardPanelEl);

    document.getElementById('steward-close').onclick = hideStewardPanel;

    var startBtn = document.getElementById('steward-start-election');
    if (startBtn) {
      startBtn.onclick = function() {
        if (typeof window !== 'undefined' && window._onElectionStart) {
          window._onElectionStart({ zone: currentZone });
        }
        showNotification('Election started for ' + currentZone + '!', 'success');
        hideStewardPanel();
      };
    }

    var voteBtns = stewardPanelEl.querySelectorAll('.steward-vote-btn');
    voteBtns.forEach(function(btn) {
      btn.onclick = function() {
        var electionId = btn.getAttribute('data-election');
        var candidate = btn.getAttribute('data-candidate');
        if (typeof window !== 'undefined' && window._onElectionVote) {
          window._onElectionVote({ electionId: electionId, candidate: candidate });
        }
        showNotification('Voted for ' + candidate, 'success');
        hideStewardPanel();
      };
    });
  }

  function hideStewardPanel() {
    if (stewardPanelEl && stewardPanelEl.parentNode) {
      stewardPanelEl.parentNode.removeChild(stewardPanelEl);
      stewardPanelEl = null;
    }
  }

  exports.showStewardPanel = showStewardPanel;
  exports.hideStewardPanel = hideStewardPanel;

  // =============================================================================
  // FEDERATION PORTAL — PROPOSE + VISUAL STATUS
  // =============================================================================

  function showFederationProposal() {
    if (typeof document === 'undefined') return;

    var overlay = document.createElement('div');
    overlay.id = 'federation-proposal';
    overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(10,14,26,0.95);border:2px solid #a855f7;border-radius:12px;' +
      'padding:20px;width:400px;pointer-events:auto;z-index:300;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.8);';

    overlay.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<h2 style="color:#a855f7;margin:0;font-size:18px;">Propose Federation</h2>' +
      '<button id="fed-close" style="background:rgba(255,255,255,0.1);color:#E8E0D8;border:1px solid rgba(255,255,255,0.3);' +
      'border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:16px;">×</button></div>' +
      '<p style="color:#aaa;font-size:13px;margin-bottom:12px;">Link another ZION world instance via the Rift Portal in the Nexus.</p>' +
      '<input id="fed-name" placeholder="Federation name..." style="width:100%;padding:8px;background:rgba(0,0,0,0.5);' +
      'border:1px solid #555;border-radius:4px;color:#fff;font-size:13px;margin-bottom:8px;box-sizing:border-box;" />' +
      '<input id="fed-endpoint" placeholder="Endpoint URL (e.g. https://...)" style="width:100%;padding:8px;background:rgba(0,0,0,0.5);' +
      'border:1px solid #555;border-radius:4px;color:#fff;font-size:13px;margin-bottom:12px;box-sizing:border-box;" />' +
      '<button id="fed-submit" style="width:100%;padding:10px;background:#a855f7;color:#fff;border:none;border-radius:6px;' +
      'font-weight:bold;cursor:pointer;">Propose Federation</button>';

    document.body.appendChild(overlay);

    document.getElementById('fed-close').onclick = function() { overlay.parentNode.removeChild(overlay); };
    document.getElementById('fed-submit').onclick = function() {
      var name = document.getElementById('fed-name').value.trim();
      var endpoint = document.getElementById('fed-endpoint').value.trim();
      if (!name || !endpoint) { showNotification('Fill in all fields', 'warning'); return; }
      if (typeof window !== 'undefined' && window._onFederationPropose) {
        window._onFederationPropose({ name: name, endpoint: endpoint });
      }
      showNotification('Federation "' + name + '" proposed!', 'success');
      overlay.parentNode.removeChild(overlay);
    };
  }

  exports.showFederationProposal = showFederationProposal;

})(typeof module !== 'undefined' ? module.exports : (window.HUD = {}));
