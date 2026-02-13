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
        // Local player — larger bright dot with direction indicator
        minimapCtx.fillStyle = '#00ccff';
        minimapCtx.beginPath();
        minimapCtx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
        minimapCtx.fill();
        // White border
        minimapCtx.strokeStyle = '#fff';
        minimapCtx.lineWidth = 1;
        minimapCtx.beginPath();
        minimapCtx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
        minimapCtx.stroke();
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

    // Close hint
    var closeHint = '<div style="text-align:center;font-size:10px;color:#555;margin-top:8px;">Press E to interact again | ESC to close</div>';

    npcDialogEl.innerHTML = header + activityBar + dialogue + famBar + closeHint;
    hud.appendChild(npcDialogEl);

    // Auto-hide after 8 seconds
    npcDialogTimer = setTimeout(function() { hideNPCDialog(); }, 8000);
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

  // Export public API
  exports.initHUD = initHUD;
  exports.initToolbar = initToolbar;
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
  exports.updateCoords = updateCoords;
  exports.updateTimeWeather = updateTimeWeather;
  exports.showNPCDialog = showNPCDialog;
  exports.hideNPCDialog = hideNPCDialog;
  exports.updateMinimapNPCs = updateMinimapNPCs;

})(typeof module !== 'undefined' ? module.exports : (window.HUD = {}));
