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
    hud.appendChild(npcShopPanel);

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
      npcShopPanel.parentNode.removeChild(npcShopPanel);
      npcShopPanel = null;
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
  let playerProfilePanel = null;

  function showPlayerProfile(playerData) {
    if (playerProfilePanel) {
      hidePlayerProfile();
      return;
    }

    var panel = document.createElement('div');
    panel.id = 'player-profile-panel';
    panel.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 350px;
      height: 100%;
      background: rgba(26, 26, 26, 0.95);
      border-left: 2px solid rgba(218, 165, 32, 0.5);
      z-index: 200;
      overflow-y: auto;
      pointer-events: auto;
      box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);
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
    closeBtn.onclick = function() {
      hidePlayerProfile();
    };
    panel.appendChild(closeBtn);

    // Content container
    var content = document.createElement('div');
    content.style.cssText = `
      padding: 30px 25px;
    `;

    // Player header
    var header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 2px solid rgba(218, 165, 32, 0.3);
    `;

    var playerName = document.createElement('h2');
    playerName.textContent = playerData.name || 'Player';
    playerName.style.cssText = `
      margin: 0 0 10px 0;
      color: #DAA520;
      font-size: 24px;
      font-family: Georgia, serif;
    `;
    header.appendChild(playerName);

    var currentZone = document.createElement('div');
    currentZone.textContent = 'Current Zone: ' + (playerData.zone || 'Unknown');
    currentZone.style.cssText = `
      color: #A0978E;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    `;
    header.appendChild(currentZone);

    content.appendChild(header);

    // Stats section
    var statsSection = document.createElement('div');
    statsSection.style.cssText = `
      margin-bottom: 25px;
    `;

    var statsTitle = document.createElement('h3');
    statsTitle.textContent = 'Statistics';
    statsTitle.style.cssText = `
      margin: 0 0 15px 0;
      color: #E8E0D8;
      font-size: 18px;
      font-family: Georgia, serif;
    `;
    statsSection.appendChild(statsTitle);

    var stats = [
      { label: 'Spark Balance', value: (playerData.sparkBalance || 0) + ' ✦', color: '#DAA520' },
      { label: 'Time Played', value: formatPlayTime(playerData.playTimeSeconds || 0), color: '#E8E0D8' },
      { label: 'Items Collected', value: playerData.itemsCollected || 0, color: '#E8E0D8' },
      { label: 'Quests Completed', value: playerData.questsCompleted || 0, color: '#E8E0D8' },
      { label: 'Quests Active', value: playerData.questsActive || 0, color: '#E8E0D8' },
      { label: 'NPCs Met', value: playerData.npcsMet || 0, color: '#E8E0D8' },
      { label: 'Zones Discovered', value: playerData.zonesDiscovered || 0, color: '#E8E0D8' },
      { label: 'Structures Built', value: playerData.structuresBuilt || 0, color: '#E8E0D8' }
    ];

    stats.forEach(function(stat) {
      var statRow = document.createElement('div');
      statRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 14px;
        font-family: system-ui, sans-serif;
      `;

      var statLabel = document.createElement('span');
      statLabel.textContent = stat.label;
      statLabel.style.color = '#A0978E';

      var statValue = document.createElement('span');
      statValue.textContent = stat.value;
      statValue.style.cssText = `
        color: ${stat.color};
        font-weight: bold;
      `;

      statRow.appendChild(statLabel);
      statRow.appendChild(statValue);
      statsSection.appendChild(statRow);
    });

    content.appendChild(statsSection);

    // Recent Activity section
    var activitySection = document.createElement('div');
    activitySection.style.cssText = `
      margin-bottom: 25px;
    `;

    var activityTitle = document.createElement('h3');
    activityTitle.textContent = 'Recent Activity';
    activityTitle.style.cssText = `
      margin: 0 0 15px 0;
      color: #E8E0D8;
      font-size: 18px;
      font-family: Georgia, serif;
    `;
    activitySection.appendChild(activityTitle);

    var activities = playerData.recentActivities || [
      'Started playing ZION'
    ];

    activities.slice(0, 5).forEach(function(activity) {
      var activityItem = document.createElement('div');
      activityItem.textContent = '• ' + activity;
      activityItem.style.cssText = `
        color: #A0978E;
        font-size: 13px;
        font-family: system-ui, sans-serif;
        padding: 6px 0;
        line-height: 1.5;
      `;
      activitySection.appendChild(activityItem);
    });

    content.appendChild(activitySection);

    panel.appendChild(content);
    document.body.appendChild(panel);
    playerProfilePanel = panel;
  }

  function hidePlayerProfile() {
    if (!playerProfilePanel) return;
    document.body.removeChild(playerProfilePanel);
    playerProfilePanel = null;
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
    document.body.removeChild(discoveryLogPanel);
    discoveryLogPanel = null;
  }

  // Lore Book Panel
  var loreBookPanel = null;

  function showLoreBook(loreEntries) {
    if (loreBookPanel) return;

    var panel = document.createElement('div');
    panel.id = 'lore-book-overlay';
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
      background: linear-gradient(135deg, #2c1810 0%, #1a0f08 100%);
      border-radius: 12px;
      padding: 30px;
      overflow-y: auto;
      box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
      border: 2px solid #8b4513;
    `;

    var header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #8b4513;
    `;

    var title = document.createElement('h2');
    title.textContent = 'Lore Book';
    title.style.cssText = `
      margin: 0;
      color: #f4e4c1;
      font-size: 28px;
      font-family: Georgia, serif;
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
    closeBtn.onclick = hideLoreBook;

    header.appendChild(title);
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Organize lore by chapter
    var chapters = {
      'The Founding': [],
      'The Zones': [],
      'The People': [],
      'The Economy': [],
      'The Federation': []
    };

    if (loreEntries && loreEntries.length > 0) {
      loreEntries.forEach(function(entry) {
        var chapter = entry.chapter || 'The Founding';
        if (chapters[chapter]) {
          chapters[chapter].push(entry);
        }
      });
    }

    // Display lore by chapter
    Object.keys(chapters).forEach(function(chapterName) {
      if (chapters[chapterName].length === 0) return;

      var chapterSection = document.createElement('div');
      chapterSection.style.cssText = `
        margin-bottom: 30px;
      `;

      var chapterHeader = document.createElement('div');
      chapterHeader.textContent = chapterName;
      chapterHeader.style.cssText = `
        color: #d4af37;
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 15px;
        font-family: Georgia, serif;
      `;
      chapterSection.appendChild(chapterHeader);

      chapters[chapterName].forEach(function(entry) {
        var entryItem = document.createElement('div');
        entryItem.style.cssText = `
          background: rgba(244, 228, 193, 0.05);
          border-left: 4px solid #d4af37;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 6px;
          position: relative;
        `;

        if (entry.unread) {
          var unreadIndicator = document.createElement('div');
          unreadIndicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #d4af37;
            box-shadow: 0 0 10px #d4af37;
          `;
          entryItem.appendChild(unreadIndicator);
        }

        var entryTitle = document.createElement('div');
        entryTitle.textContent = entry.title;
        entryTitle.style.cssText = `
          color: #f4e4c1;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
          font-family: Georgia, serif;
        `;

        var entryText = document.createElement('div');
        entryText.textContent = entry.text || 'No content available';
        entryText.style.cssText = `
          color: #c8b896;
          font-size: 14px;
          line-height: 1.6;
          font-family: Georgia, serif;
        `;

        entryItem.appendChild(entryTitle);
        entryItem.appendChild(entryText);
        chapterSection.appendChild(entryItem);
      });

      content.appendChild(chapterSection);
    });

    panel.appendChild(content);
    document.body.appendChild(panel);
    loreBookPanel = panel;

    // Close on Escape
    var escapeHandler = function(e) {
      if (e.key === 'Escape') {
        hideLoreBook();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    panel.escapeHandler = escapeHandler;
  }

  function hideLoreBook() {
    if (!loreBookPanel) return;
    if (loreBookPanel.escapeHandler) {
      document.removeEventListener('keydown', loreBookPanel.escapeHandler);
    }
    document.body.removeChild(loreBookPanel);
    loreBookPanel = null;
  }

  // Achievement Toast
  function showAchievementToast(achievement) {
    var toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #d4af37 0%, #c5a028 100%);
      border: 3px solid #ffd700;
      border-radius: 10px;
      padding: 20px 30px;
      min-width: 350px;
      box-shadow: 0 0 30px rgba(212, 175, 55, 0.6);
      z-index: 10001;
      transition: top 0.5s ease;
    `;

    var header = document.createElement('div');
    header.textContent = 'ACHIEVEMENT UNLOCKED';
    header.style.cssText = `
      color: #1a1a1a;
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 8px;
      font-family: system-ui, sans-serif;
      letter-spacing: 1px;
    `;

    var achievementName = document.createElement('div');
    achievementName.textContent = achievement.name || 'Unknown Achievement';
    achievementName.style.cssText = `
      color: #ffffff;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 5px;
      font-family: system-ui, sans-serif;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    `;

    var achievementDesc = document.createElement('div');
    achievementDesc.textContent = achievement.description || '';
    achievementDesc.style.cssText = `
      color: #f5f5f5;
      font-size: 14px;
      text-align: center;
      font-family: system-ui, sans-serif;
    `;

    toast.appendChild(header);
    toast.appendChild(achievementName);
    toast.appendChild(achievementDesc);
    document.body.appendChild(toast);

    // Animate in
    setTimeout(function() {
      toast.style.top = '20px';
    }, 10);

    // Fade out and remove after 5 seconds
    setTimeout(function() {
      toast.style.transition = 'top 0.5s ease, opacity 0.5s ease';
      toast.style.opacity = '0';
      toast.style.top = '-100px';
      setTimeout(function() {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 500);
    }, 5000);
  }

  // Discovery Popup
  function showDiscoveryPopup(discovery) {
    var popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 3px solid #5dade2;
      border-radius: 12px;
      padding: 30px;
      min-width: 400px;
      box-shadow: 0 0 50px rgba(93, 173, 226, 0.6);
      z-index: 10001;
      transition: transform 0.3s ease, opacity 0.3s ease;
      opacity: 0;
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
    setTimeout(function() {
      popup.style.transform = 'translate(-50%, -50%) scale(1)';
      popup.style.opacity = '1';
    }, 10);

    // Auto-close after 4 seconds
    setTimeout(function() {
      popup.style.transform = 'translate(-50%, -50%) scale(0)';
      popup.style.opacity = '0';
      setTimeout(function() {
        if (popup.parentNode) {
          document.body.removeChild(popup);
        }
      }, 300);
    }, 4000);

    // Click to close
    popup.onclick = function() {
      popup.style.transform = 'translate(-50%, -50%) scale(0)';
      popup.style.opacity = '0';
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
  // COMPOSE PANEL
  // ============================================================================

  var composePanel = null;

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
      border: 2px solid rgba(150, 100, 255, 0.5);
      border-radius: 12px;
      padding: 25px;
      width: 500px;
      z-index: 10000;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      font-family: system-ui, sans-serif;
      pointer-events: auto;
    `;

    var header = document.createElement('div');
    header.innerHTML = '<h2 style="margin: 0 0 20px 0; color: #a8f; font-size: 24px;">Create Artwork</h2>';
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
    closeBtn.onclick = hideComposePanel;
    panel.appendChild(closeBtn);

    var form = document.createElement('div');

    var typeLabel = document.createElement('label');
    typeLabel.textContent = 'Type:';
    typeLabel.style.cssText = 'display: block; color: #fff; margin-bottom: 5px; font-size: 14px;';
    form.appendChild(typeLabel);

    var typeSelect = document.createElement('select');
    typeSelect.id = 'compose-type-select';
    typeSelect.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      font-size: 14px;
    `;

    var composeTypes = ['poem', 'song', 'story', 'painting', 'sculpture', 'mural'];
    composeTypes.forEach(function(type) {
      var option = document.createElement('option');
      option.value = type;
      option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      typeSelect.appendChild(option);
    });
    form.appendChild(typeSelect);

    var titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title:';
    titleLabel.style.cssText = 'display: block; color: #fff; margin-bottom: 5px; font-size: 14px;';
    form.appendChild(titleLabel);

    var titleInput = document.createElement('input');
    titleInput.id = 'compose-title-input';
    titleInput.type = 'text';
    titleInput.placeholder = 'Enter title...';
    titleInput.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      font-size: 14px;
    `;
    form.appendChild(titleInput);

    var contentLabel = document.createElement('label');
    contentLabel.textContent = 'Content:';
    contentLabel.style.cssText = 'display: block; color: #fff; margin-bottom: 5px; font-size: 14px;';
    form.appendChild(contentLabel);

    var contentTextarea = document.createElement('textarea');
    contentTextarea.id = 'compose-content-textarea';
    contentTextarea.placeholder = 'Write your masterpiece...';
    contentTextarea.rows = 8;
    contentTextarea.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
      font-family: inherit;
    `;
    form.appendChild(contentTextarea);

    var submitBtn = document.createElement('button');
    submitBtn.textContent = 'Create';
    submitBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #a8f, #4af);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
    `;
    submitBtn.onclick = function() {
      var type = typeSelect.value;
      var title = titleInput.value.trim();
      var content = contentTextarea.value.trim();

      if (!title) {
        showNotification('Please enter a title', 'warning');
        return;
      }

      if (!content) {
        showNotification('Please enter content', 'warning');
        return;
      }

      composeCallback({ type: type, title: title, content: content });
      hideComposePanel();
    };
    form.appendChild(submitBtn);

    panel.appendChild(form);
    document.body.appendChild(panel);
    composePanel = panel;
  }

  function hideComposePanel() {
    if (!composePanel) return;
    document.body.removeChild(composePanel);
    composePanel = null;
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
  }

  function hideGuildPanel() {
    if (!guildPanel) return;
    document.body.removeChild(guildPanel);
    guildPanel = null;
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
  exports.showDiscoveryLog = showDiscoveryLog;
  exports.hideDiscoveryLog = hideDiscoveryLog;
  exports.showLoreBook = showLoreBook;
  exports.hideLoreBook = hideLoreBook;
  exports.showAchievementToast = showAchievementToast;
  exports.showDiscoveryPopup = showDiscoveryPopup;
  exports.showSkillsPanel = showSkillsPanel;
  exports.hideSkillsPanel = hideSkillsPanel;
  exports.showMentorOffer = showMentorOffer;
  exports.showLessonProgress = showLessonProgress;
  exports.showComposePanel = showComposePanel;
  exports.hideComposePanel = hideComposePanel;
  exports.showGuildPanel = showGuildPanel;
  exports.hideGuildPanel = hideGuildPanel;
  exports.showGuildCreate = showGuildCreate;
  exports.hideGuildCreate = hideGuildCreate;
  exports.showGuildInvite = showGuildInvite;
  exports.updateGuildTag = updateGuildTag;

})(typeof module !== 'undefined' ? module.exports : (window.HUD = {}));
