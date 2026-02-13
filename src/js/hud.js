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
  }

  /**
   * Hide quest log panel
   */
  function hideQuestLog() {
    if (questLogEl && questLogEl.parentNode) {
      questLogEl.parentNode.removeChild(questLogEl);
      questLogEl = null;
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

    document.getElementById('close-inventory').addEventListener('click', function() {
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
    inventoryVisible = true;
  }

  function hideInventoryPanel() {
    if (inventoryPanel) inventoryPanel.style.display = 'none';
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

    document.getElementById('close-crafting').addEventListener('click', function() {
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
    craftingVisible = true;
  }

  function hideCraftingPanel() {
    if (craftingPanel) craftingPanel.style.display = 'none';
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

    document.getElementById('trade-accept-btn').addEventListener('click', function() {
      hideTradeRequest();
      if (onAccept) onAccept(tradeId);
    });

    document.getElementById('trade-decline-btn').addEventListener('click', function() {
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

    // Trade slot clicks (to remove items)
    var tradeSlots = document.querySelectorAll('.trade-slot');
    tradeSlots.forEach(function(slot, idx) {
      slot.addEventListener('click', function() {
        if (localPlayer.items[idx] && callbacks.onRemoveItem) {
          callbacks.onRemoveItem(idx);
        }
      });
    });
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
  exports.initQuestTracker = initQuestTracker;
  exports.updateQuestTracker = updateQuestTracker;
  exports.showQuestLog = showQuestLog;
  exports.hideQuestLog = hideQuestLog;
  exports.showQuestOffer = showQuestOffer;
  exports.hideQuestOffer = hideQuestOffer;
  exports.showQuestComplete = showQuestComplete;
  exports.showQuestProgress = showQuestProgress;
  exports.acceptQuestFromOffer = acceptQuestFromOffer;
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

})(typeof module !== 'undefined' ? module.exports : (window.HUD = {}));
