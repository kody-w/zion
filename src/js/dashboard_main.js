// dashboard_main.js
/**
 * dashboard_main.js - Integration module for ZION dashboard mode
 *
 * Wires all dashboard panels together and provides the main game loop
 * for UI-only mode. Connects DashboardZones, DashboardNPCs,
 * DashboardInventory, DashboardEconomy, DashboardQuests, DashboardSocial,
 * DashboardGames, DashboardWorld, and DashboardCSS into a cohesive experience.
 *
 * UMD module: window.DashboardMain (browser) or module.exports (Node.js)
 * ES5 compatible - uses var declarations
 */
(function(exports) {
  'use strict';

  // =========================================================================
  // VERSION
  // =========================================================================

  var VERSION = '1.0.0';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  var STORAGE_KEY = 'zion_dashboard_state';
  var AUTO_SAVE_INTERVAL = 30;  // ticks
  var WEATHER_UPDATE_INTERVAL = 60;  // ticks
  var TICK_INTERVAL_MS = 1000;  // milliseconds

  var ZONE_NAMES = {
    nexus:     'The Nexus',
    gardens:   'The Gardens',
    athenaeum: 'The Athenaeum',
    studio:    'The Studio',
    wilds:     'The Wilds',
    agora:     'The Agora',
    commons:   'The Commons',
    arena:     'The Arena'
  };

  var ZONE_DESCRIPTIONS = {
    nexus:     'a crystalline plaza at the heart of ZION, where all paths converge',
    gardens:   'cultivated gardens of extraordinary beauty, tended by devoted citizens',
    athenaeum: 'grand marble halls filled with the accumulated knowledge of civilization',
    studio:    'artisan workshops alive with creative work and the smell of craft',
    wilds:     'untamed wilderness stretching beyond the settled lands',
    agora:     'a bustling market square where commerce and community interweave',
    commons:   'open building grounds where citizens raise the structures of tomorrow',
    arena:     'combat grounds where skill is tested and glory sought'
  };

  var WEATHER_TYPES = [
    'clear', 'cloudy', 'misty', 'rainy', 'stormy', 'windy', 'foggy', 'sunny'
  ];

  var WEATHER_ADJECTIVES = {
    clear:  'clear',
    cloudy: 'overcast',
    misty:  'misty',
    rainy:  'rainy',
    stormy: 'stormy',
    windy:  'windswept',
    foggy:  'fog-laden',
    sunny:  'sun-drenched'
  };

  var DAY_PARTS = [
    { name: 'Dawn',      startTick: 0,    endTick: 100 },
    { name: 'Morning',   startTick: 100,  endTick: 300 },
    { name: 'Afternoon', startTick: 300,  endTick: 700 },
    { name: 'Evening',   startTick: 700,  endTick: 1000 },
    { name: 'Night',     startTick: 1000, endTick: 1200 }
  ];

  // =========================================================================
  // ZONE RESOURCES TABLE
  // =========================================================================

  var ZONE_RESOURCES = {
    nexus: {
      common:   ['stone'],
      uncommon: ['crystal'],
      rare:     []
    },
    gardens: {
      common:   ['herbs', 'feather'],
      uncommon: ['honey', 'silk'],
      rare:     []
    },
    athenaeum: {
      common:   ['feather'],
      uncommon: ['herbs'],
      rare:     ['scroll']
    },
    studio: {
      common:   ['clay'],
      uncommon: ['silk'],
      rare:     ['pigment']
    },
    wilds: {
      common:   ['wood', 'stone'],
      uncommon: ['iron_ore'],
      rare:     ['crystal']
    },
    agora: {
      common:   ['herbs'],
      uncommon: ['gold_dust'],
      rare:     []
    },
    commons: {
      common:   ['wood', 'feather'],
      uncommon: ['herbs'],
      rare:     []
    },
    arena: {
      common:   ['stone'],
      uncommon: ['iron_ore'],
      rare:     ['gold_dust']
    }
  };

  // =========================================================================
  // KEYBOARD SHORTCUTS
  // =========================================================================

  var KEY_SHORTCUTS = {
    'i': { action: 'toggle_panel', panel: 'inventory',  label: 'Inventory' },
    'c': { action: 'toggle_panel', panel: 'crafting',   label: 'Crafting' },
    'j': { action: 'toggle_panel', panel: 'quests',     label: 'Quests' },
    'g': { action: 'toggle_panel', panel: 'guild',      label: 'Guild' },
    'm': { action: 'toggle_panel', panel: 'map',        label: 'Map' },
    's': { action: 'toggle_panel', panel: 'social',     label: 'Social' },
    'e': { action: 'toggle_panel', panel: 'economy',    label: 'Economy' },
    'n': { action: 'toggle_panel', panel: 'npcs',       label: 'NPCs' },
    'w': { action: 'toggle_panel', panel: 'world',      label: 'World Status' },
    'z': { action: 'toggle_panel', panel: 'zones',      label: 'Zones' },
    'f': { action: 'action',       type:  'cast_line',  label: 'Fish' },
    'r': { action: 'action',       type:  'gather_resource', label: 'Gather' },
    'F5': { action: 'save_game',   label: 'Save Game' }
  };

  // =========================================================================
  // WORLD EVENTS CATALOG
  // =========================================================================

  var WORLD_EVENTS = [
    { id: 'market_day',    name: 'Market Day',       zone: 'agora',     tickInterval: 240, duration: 60,  reward: { spark: 20 } },
    { id: 'harvest_feast', name: 'Harvest Feast',    zone: 'gardens',   tickInterval: 360, duration: 90,  reward: { spark: 30, item: 'herbs' } },
    { id: 'tournament',    name: 'Grand Tournament', zone: 'arena',     tickInterval: 480, duration: 120, reward: { spark: 50 } },
    { id: 'lecture',       name: 'Public Lecture',   zone: 'athenaeum', tickInterval: 200, duration: 45,  reward: { xp: 25 } },
    { id: 'art_show',      name: 'Art Exhibition',   zone: 'studio',    tickInterval: 300, duration: 60,  reward: { reputation: 10 } }
  ];

  // =========================================================================
  // MODULE STATE
  // =========================================================================

  var _tickHandle = null;
  var _gameState = null;
  var _tickCount = 0;
  var _initialized = false;

  // =========================================================================
  // SAFE HELPERS
  // =========================================================================

  function _safeLocalStorage(action, key, value) {
    try {
      if (typeof localStorage === 'undefined') { return null; }
      if (action === 'get') { return localStorage.getItem(key); }
      if (action === 'set') { localStorage.setItem(key, value); return true; }
      if (action === 'remove') { localStorage.removeItem(key); return true; }
    } catch (e) {
      return null;
    }
    return null;
  }

  function _randomItem(arr) {
    if (!arr || arr.length === 0) { return null; }
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function _randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function _escapeHtml(str) {
    if (typeof str !== 'string') { return String(str || ''); }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  // =========================================================================
  // OPTIONAL MODULE ACCESSORS (guarded)
  // =========================================================================

  function _getDashboardZones() {
    if (typeof DashboardZones !== 'undefined') { return DashboardZones; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_zones.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboardNPCs() {
    if (typeof DashboardNPCs !== 'undefined') { return DashboardNPCs; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_npcs.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboardInventory() {
    if (typeof DashboardInventory !== 'undefined') { return DashboardInventory; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_inventory.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboardEconomy() {
    if (typeof DashboardEconomy !== 'undefined') { return DashboardEconomy; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_economy.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboardQuests() {
    if (typeof DashboardQuests !== 'undefined') { return DashboardQuests; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_quests.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboardSocial() {
    if (typeof DashboardSocial !== 'undefined') { return DashboardSocial; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_social.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboardGames() {
    if (typeof DashboardGames !== 'undefined') { return DashboardGames; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_games.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboardWorld() {
    if (typeof DashboardWorld !== 'undefined') { return DashboardWorld; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_world.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboardCSS() {
    if (typeof DashboardCSS !== 'undefined') { return DashboardCSS; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard_css.js'); } catch (e) {}
    }
    return null;
  }

  function _getDashboard() {
    if (typeof Dashboard !== 'undefined') { return Dashboard; }
    if (typeof module !== 'undefined' && module.exports) {
      try { return require('./dashboard.js'); } catch (e) {}
    }
    return null;
  }

  // =========================================================================
  // GAME STATE
  // =========================================================================

  /**
   * createGameState(playerName)
   * Creates a complete, fresh game state for dashboard mode.
   */
  function createGameState(playerName) {
    var name = (typeof playerName === 'string' && playerName.trim()) ? playerName.trim() : 'Citizen';
    var id = 'player_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

    return {
      player: {
        id: id,
        name: name,
        zone: 'nexus',
        level: 1,
        xp: 0,
        spark: 100,
        reputation: {
          nexus:     0,
          gardens:   0,
          athenaeum: 0,
          studio:    0,
          wilds:     0,
          agora:     0,
          commons:   0,
          arena:     0
        },
        lastGatherTick: -1
      },
      inventory: {
        items: {},
        equipped: {},
        skills: {}
      },
      economy: {
        balances: {},
        transactions: [],
        listings: []
      },
      quests: {
        active: {},
        completed: {},
        progress: {}
      },
      social: {
        chat: {
          global: [],
          zone:   [],
          guild:  []
        },
        guild: null,
        friends: []
      },
      world: {
        time: {
          tick:      0,
          dayLength: 1200
        },
        weather: {
          current: 'clear',
          nextChange: WEATHER_UPDATE_INTERVAL
        },
        events:  [],
        news:    []
      },
      achievements: {},
      settings: {
        layout:        'full',
        theme:         'dark',
        notifications: true
      },
      _meta: {
        version:   VERSION,
        createdAt: Date.now(),
        savedAt:   null
      }
    };
  }

  // =========================================================================
  // DASHBOARD TICK
  // =========================================================================

  /**
   * dashboardTick(state, deltaTime)
   * Called every second. Advances world time, updates weather, checks events,
   * updates NPCs, auto-saves, generates news.
   * Returns updated state.
   */
  function dashboardTick(state, deltaTime) {
    if (!state || !state.world) { return state; }

    // Advance world time
    var DashboardWorld = _getDashboardWorld();
    if (DashboardWorld && typeof DashboardWorld.advanceTime === 'function') {
      var newTime = DashboardWorld.advanceTime(state.world.time, 1);
      if (newTime) { state.world.time = newTime; }
    } else {
      state.world.time.tick = (state.world.time.tick || 0) + 1;
    }
    var tick = state.world.time.tick;

    // Update weather periodically
    if (tick % WEATHER_UPDATE_INTERVAL === 0) {
      state = _updateWeather(state);
    }

    // Check for event triggers
    state = _checkEventTriggers(state, tick);

    // Update NPC states
    var DashboardNPCs = _getDashboardNPCs();
    if (DashboardNPCs && typeof DashboardNPCs.tickNPCs === 'function') {
      DashboardNPCs.tickNPCs(state);
    }

    // Auto-save every 30 ticks
    if (tick % AUTO_SAVE_INTERVAL === 0) {
      saveState(state);
    }

    // Generate news from state changes
    state = _generateNews(state, tick);

    return state;
  }

  function _updateWeather(state) {
    var weather = state.world.weather;
    var oldWeather = weather.current;
    // Pick a new weather type (different from current when possible)
    var choices = WEATHER_TYPES.filter(function(w) { return w !== oldWeather; });
    weather.current = _randomItem(choices) || oldWeather;
    weather.nextChange = WEATHER_UPDATE_INTERVAL;

    // Add news item about weather change
    if (state.world.news) {
      state.world.news.unshift({
        type:    'weather',
        message: 'The weather has shifted. The skies are now ' + (WEATHER_ADJECTIVES[weather.current] || weather.current) + '.',
        tick:    state.world.time.tick
      });
      // Keep news list manageable
      if (state.world.news.length > 50) {
        state.world.news = state.world.news.slice(0, 50);
      }
    }

    return state;
  }

  function _checkEventTriggers(state, tick) {
    if (!state.world.events) { state.world.events = []; }

    // Start events at their scheduled intervals
    for (var i = 0; i < WORLD_EVENTS.length; i++) {
      var evDef = WORLD_EVENTS[i];
      if (tick > 0 && tick % evDef.tickInterval === 0) {
        // Check if not already active
        var alreadyActive = false;
        for (var j = 0; j < state.world.events.length; j++) {
          if (state.world.events[j].id === evDef.id && state.world.events[j].active) {
            alreadyActive = true;
            break;
          }
        }
        if (!alreadyActive) {
          state.world.events.push({
            id:       evDef.id,
            name:     evDef.name,
            zone:     evDef.zone,
            startTick: tick,
            endTick:  tick + evDef.duration,
            active:   true,
            reward:   evDef.reward
          });
          if (state.world.news) {
            state.world.news.unshift({
              type:    'event',
              message: evDef.name + ' has begun in ' + (ZONE_NAMES[evDef.zone] || evDef.zone) + '!',
              tick:    tick
            });
          }
        }
      }
    }

    // Expire old events
    for (var k = 0; k < state.world.events.length; k++) {
      var ev = state.world.events[k];
      if (ev.active && tick >= ev.endTick) {
        ev.active = false;
      }
    }

    // Prune inactive events older than 200 ticks
    state.world.events = state.world.events.filter(function(ev) {
      return ev.active || (tick - ev.endTick < 200);
    });

    return state;
  }

  function _generateNews(state, tick) {
    if (!state.world.news) { state.world.news = []; }

    // Every 50 ticks, generate a flavor news item
    if (tick > 0 && tick % 50 === 0) {
      var zone = _randomItem(Object.keys(ZONE_NAMES));
      var items = [
        'Citizens gather in ' + ZONE_NAMES[zone] + ' to share stories.',
        'A traveling merchant arrives at ' + ZONE_NAMES[zone] + '.',
        'Rumors circulate of rare resources spotted near ' + ZONE_NAMES[zone] + '.',
        'The Council meets to discuss new policies.',
        'Trade routes between zones grow more active.'
      ];
      var msg = _randomItem(items);
      if (msg) {
        state.world.news.unshift({ type: 'flavor', message: msg, tick: tick });
      }
      if (state.world.news.length > 50) {
        state.world.news = state.world.news.slice(0, 50);
      }
    }

    return state;
  }

  // =========================================================================
  // ACTION HANDLER
  // =========================================================================

  /**
   * handleDashboardAction(state, action)
   * Central action handler. Returns { state, result, notifications }.
   */
  function handleDashboardAction(state, action) {
    if (!state) {
      return { state: state, result: { success: false, error: 'No state' }, notifications: [] };
    }
    if (!action || !action.type) {
      return { state: state, result: { success: false, error: 'No action type' }, notifications: [] };
    }

    var result = { success: false, error: 'Unknown action: ' + action.type };

    switch (action.type) {

      case 'travel':
        result = _actionTravel(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'talk_npc':
        result = _actionTalkNPC(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'buy_item':
        result = _actionBuyItem(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'craft':
        result = _actionCraft(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'equip':
        result = _actionEquip(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'sell_item':
        result = _actionSellItem(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'accept_quest':
        result = _actionAcceptQuest(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'send_chat':
        result = _actionSendChat(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'create_guild':
        result = _actionCreateGuild(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'join_event':
        result = _actionJoinEvent(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'cast_line':
        result = _actionCastLine(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'play_card':
        result = _actionPlayCard(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'enter_dungeon':
        result = _actionEnterDungeon(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'gaze_stars':
        result = _actionGazeStars(state, action);
        if (result.success) { state = result.state || state; }
        break;

      case 'gather_resource':
        result = gatherResource(state, action.resourceType);
        if (result.success) { state = result.state || state; }
        break;

      case 'save_game':
        result = _actionSaveGame(state);
        break;

      case 'load_game':
        result = _actionLoadGame(state);
        if (result.success && result.state) { state = result.state; }
        break;

      default:
        result = { success: false, error: 'Unknown action: ' + action.type };
        break;
    }

    var notifications = processNotifications(state, result);
    return { state: state, result: result, notifications: notifications };
  }

  // ---- Individual Action Implementations ----

  function _actionTravel(state, action) {
    var zone = action.zone;
    if (!zone) { return { success: false, error: 'No zone specified' }; }
    if (!ZONE_NAMES[zone]) { return { success: false, error: 'Unknown zone: ' + zone }; }
    if (!state.player) { return { success: false, error: 'No player in state' }; }

    var prevZone = state.player.zone;
    state.player.zone = zone;

    // Delegate to DashboardZones if available
    var DashboardZones = _getDashboardZones();
    if (DashboardZones && typeof DashboardZones.navigateToZone === 'function') {
      var navResult = DashboardZones.navigateToZone(zone, state);
      if (navResult && navResult.error) {
        state.player.zone = prevZone;
        return { success: false, error: navResult.error };
      }
    }

    // Gain reputation in the destination zone
    if (state.player.reputation && state.player.reputation[zone] !== undefined) {
      state.player.reputation[zone] += 1;
    }

    // Award XP for exploration
    state.player.xp = (state.player.xp || 0) + 5;

    // Zone-change news
    if (state.world && state.world.news) {
      state.world.news.unshift({
        type:    'travel',
        message: state.player.name + ' travels from ' + (ZONE_NAMES[prevZone] || prevZone) + ' to ' + (ZONE_NAMES[zone] || zone) + '.',
        tick:    state.world.time.tick
      });
    }

    return {
      success:  true,
      state:    state,
      fromZone: prevZone,
      toZone:   zone,
      message:  'You arrive at ' + ZONE_NAMES[zone] + '.'
    };
  }

  function _actionTalkNPC(state, action) {
    var npcId = action.npcId;
    if (!npcId) { return { success: false, error: 'No NPC id specified' }; }

    var dialogue = 'Hello, traveler. Welcome to ' + (ZONE_NAMES[state.player.zone] || 'ZION') + '.';

    // Delegate to DashboardNPCs if available
    var DashboardNPCs = _getDashboardNPCs();
    if (DashboardNPCs && typeof DashboardNPCs.talkToNPC === 'function') {
      var npcResult = DashboardNPCs.talkToNPC(npcId, state);
      if (npcResult && npcResult.dialogue) { dialogue = npcResult.dialogue; }
    }

    // Small XP gain for socializing
    state.player.xp = (state.player.xp || 0) + 2;

    return { success: true, state: state, npcId: npcId, dialogue: dialogue };
  }

  function _actionBuyItem(state, action) {
    var npcId  = action.npcId;
    var itemId = action.itemId;
    if (!itemId) { return { success: false, error: 'No item specified' }; }

    var cost = 10; // default cost

    // Use game state directly for economy operations
    if ((state.player.spark || 0) < cost) {
      return { success: false, error: 'Not enough Spark' };
    }
    state.player.spark = (state.player.spark || 0) - cost;

    // Add item to inventory
    state.inventory.items[itemId] = (state.inventory.items[itemId] || 0) + 1;

    return { success: true, state: state, itemId: itemId, cost: cost, message: 'Purchased ' + itemId + '.' };
  }

  function _actionCraft(state, action) {
    var recipeId = action.recipeId;
    if (!recipeId) { return { success: false, error: 'No recipe specified' }; }

    // Craft: award the item directly on game state
    state.inventory.items[recipeId] = (state.inventory.items[recipeId] || 0) + 1;
    state.player.xp = (state.player.xp || 0) + 10;

    return { success: true, state: state, recipeId: recipeId, message: 'Crafted ' + recipeId + '.' };
  }

  function _actionEquip(state, action) {
    var itemId = action.itemId;
    if (!itemId) { return { success: false, error: 'No item specified' }; }
    if (!state.inventory.items[itemId] || state.inventory.items[itemId] < 1) {
      return { success: false, error: 'Item not in inventory: ' + itemId };
    }

    // Equip item directly on game state
    state.inventory.equipped[itemId] = true;
    return { success: true, state: state, itemId: itemId, message: 'Equipped ' + itemId + '.' };
  }

  function _actionSellItem(state, action) {
    var itemId   = action.itemId;
    var quantity = action.quantity || 1;
    if (!itemId) { return { success: false, error: 'No item specified' }; }
    if (!state.inventory.items[itemId] || state.inventory.items[itemId] < quantity) {
      return { success: false, error: 'Not enough ' + itemId + ' in inventory' };
    }

    var salePrice = 8; // stub price per item

    // Credit sale proceeds directly on game state
    state.player.spark = (state.player.spark || 0) + salePrice * quantity;

    state.inventory.items[itemId] -= quantity;
    if (state.inventory.items[itemId] <= 0) {
      delete state.inventory.items[itemId];
    }

    return {
      success:  true,
      state:    state,
      itemId:   itemId,
      quantity: quantity,
      earned:   salePrice * quantity,
      message:  'Sold ' + quantity + 'x ' + itemId + ' for ' + (salePrice * quantity) + ' Spark.'
    };
  }

  function _actionAcceptQuest(state, action) {
    var questId = action.questId;
    if (!questId) { return { success: false, error: 'No quest id specified' }; }

    // Stub quest acceptance (primary path — works with any questId)
    if (state.quests.active[questId]) {
      return { success: false, error: 'Quest already active: ' + questId };
    }
    if (state.quests.completed[questId]) {
      return { success: false, error: 'Quest already completed: ' + questId };
    }

    // Try DashboardQuests if available (only for catalog quests)
    var DashboardQuests = _getDashboardQuests();
    if (DashboardQuests && typeof DashboardQuests.acceptQuest === 'function') {
      try {
        var questState = state.quests;
        var questResult = DashboardQuests.acceptQuest(questState, questId);
        if (questResult && questResult.success) {
          state.quests = questResult.state || state.quests;
          return { success: true, state: state, questId: questId, message: 'Quest accepted: ' + questId };
        }
        // Quest not in catalog or already done — fall through to stub
      } catch (e) { /* fall through to stub */ }
    }

    // Stub: accept any questId
    state.quests.active[questId] = { acceptedAt: Date.now(), progress: [] };

    return { success: true, state: state, questId: questId, message: 'Quest accepted: ' + questId };
  }

  function _actionSendChat(state, action) {
    var channel = action.channel || 'global';
    var text    = action.text;
    if (!text || !text.trim()) { return { success: false, error: 'No message text' }; }

    var message = {
      from:      state.player.name,
      text:      text.trim(),
      channel:   channel,
      timestamp: Date.now(),
      tick:      (state.world && state.world.time) ? state.world.time.tick : 0
    };

    // Store in local state (primary path — always works)
    if (!state.social.chat) { state.social.chat = {}; }
    if (!state.social.chat[channel]) { state.social.chat[channel] = []; }
    state.social.chat[channel].push(message);
    if (state.social.chat[channel].length > 200) {
      state.social.chat[channel] = state.social.chat[channel].slice(-200);
    }

    // Optionally delegate to DashboardSocial if it uses a compatible state format
    var DashboardSocial = _getDashboardSocial();
    if (DashboardSocial && typeof DashboardSocial.addMessage === 'function') {
      try {
        // DashboardSocial.addMessage expects state.channels — attempt only if available
        var chatState = state.social.chat || {};
        if (chatState.channels) {
          DashboardSocial.addMessage(chatState, channel, message);
        }
      } catch (e) { /* ignore module-specific errors */ }
    }

    return { success: true, state: state, message: message };
  }

  function _actionCreateGuild(state, action) {
    var name  = action.name;
    var motto = action.motto || '';
    if (!name || !name.trim()) { return { success: false, error: 'No guild name' }; }
    if (state.social.guild) { return { success: false, error: 'Already in a guild' }; }

    // Stub guild creation (primary path — uses our game state format)
    state.social.guild = {
      name:      name.trim(),
      motto:     motto,
      founder:   state.player.id,
      members:   [state.player.id],
      createdAt: Date.now()
    };

    // Optionally delegate to DashboardSocial if it uses a compatible state format
    var DashboardSocial = _getDashboardSocial();
    if (DashboardSocial && typeof DashboardSocial.createGuild === 'function') {
      try {
        // DashboardSocial.createGuild expects a state with guilds array and playerGuild map
        if (state.social.guilds && state.social.playerGuild) {
          var guildResult = DashboardSocial.createGuild(state.social, name.trim(), state.player.id, motto);
          if (guildResult && guildResult.success) {
            state.social = guildResult.state || state.social;
          }
        }
      } catch (e) { /* ignore module-specific errors */ }
    }

    return { success: true, state: state, guild: state.social.guild, message: 'Guild "' + name + '" created!' };
  }

  function _actionJoinEvent(state, action) {
    var eventId = action.eventId;
    if (!eventId) { return { success: false, error: 'No event id' }; }

    // Find the event in the world
    var worldEvent = null;
    if (state.world && state.world.events) {
      for (var i = 0; i < state.world.events.length; i++) {
        if (state.world.events[i].id === eventId && state.world.events[i].active) {
          worldEvent = state.world.events[i];
          break;
        }
      }
    }

    if (!worldEvent) { return { success: false, error: 'Event not active: ' + eventId }; }

    // Award event reward
    var reward = worldEvent.reward || {};
    if (reward.spark) {
      state.player.spark = (state.player.spark || 0) + reward.spark;
    }
    if (reward.xp) {
      state.player.xp = (state.player.xp || 0) + reward.xp;
    }
    if (reward.item) {
      state.inventory.items[reward.item] = (state.inventory.items[reward.item] || 0) + 1;
    }

    return {
      success:  true,
      state:    state,
      eventId:  eventId,
      reward:   reward,
      message:  'You joined ' + worldEvent.name + '!'
    };
  }

  function _actionCastLine(state, action) {
    // Fishing mini-game stub
    var catchChance = Math.random();
    var fish = null;
    var spark = 0;

    if (catchChance < 0.4) {
      // No catch
      return { success: true, state: state, caught: false, message: 'Nothing bit. Try again.' };
    } else if (catchChance < 0.75) {
      fish = 'common_fish';
      spark = 5;
    } else if (catchChance < 0.95) {
      fish = 'silver_fish';
      spark = 15;
    } else {
      fish = 'golden_fish';
      spark = 50;
    }

    if (fish) {
      state.inventory.items[fish] = (state.inventory.items[fish] || 0) + 1;
      state.player.spark = (state.player.spark || 0) + spark;
      state.player.xp    = (state.player.xp    || 0) + 3;
    }

    // Delegate to DashboardGames if available
    var DashboardGames = _getDashboardGames();
    if (DashboardGames && typeof DashboardGames.resolveFishing === 'function') {
      var fishResult = DashboardGames.resolveFishing(state, catchChance);
      if (fishResult && fishResult.state) { state = fishResult.state; }
    }

    return {
      success: true,
      state:   state,
      caught:  !!fish,
      fish:    fish,
      spark:   spark,
      message: fish ? 'You caught a ' + fish + '! (+' + spark + ' Spark)' : 'Nothing bit.'
    };
  }

  function _actionPlayCard(state, action) {
    var cardIndex = action.cardIndex;
    if (cardIndex === undefined || cardIndex === null) {
      return { success: false, error: 'No card index' };
    }

    // Try to delegate to DashboardGames if compatible result
    var DashboardGames = _getDashboardGames();
    if (DashboardGames && typeof DashboardGames.playCard === 'function') {
      try {
        var cardResult = DashboardGames.playCard(state, cardIndex);
        if (cardResult && cardResult.outcome) {
          if (cardResult.state) { state = cardResult.state; }
          return { success: true, state: state, cardIndex: cardIndex, outcome: cardResult.outcome, result: cardResult };
        }
        // Module returned without outcome — fall through to stub
      } catch (e) { /* fall through to stub */ }
    }

    // Stub card play
    var outcome = Math.random() < 0.5 ? 'win' : 'lose';
    var sparkChange = outcome === 'win' ? 10 : -5;
    state.player.spark = Math.max(0, (state.player.spark || 0) + sparkChange);
    state.player.xp    = (state.player.xp || 0) + 2;

    return {
      success:     true,
      state:       state,
      cardIndex:   cardIndex,
      outcome:     outcome,
      sparkChange: sparkChange,
      message:     'Card played. You ' + outcome + '! (' + (sparkChange > 0 ? '+' : '') + sparkChange + ' Spark)'
    };
  }

  function _actionEnterDungeon(state, action) {
    var difficulty = action.difficulty || 'normal';
    var validDifficulties = ['easy', 'normal', 'hard', 'legendary'];
    if (validDifficulties.indexOf(difficulty) === -1) {
      return { success: false, error: 'Invalid difficulty: ' + difficulty };
    }

    // Delegate to DashboardGames if available
    var DashboardGames = _getDashboardGames();
    if (DashboardGames && typeof DashboardGames.enterDungeon === 'function') {
      var dungeonResult = DashboardGames.enterDungeon(state, difficulty);
      if (dungeonResult && dungeonResult.state) { state = dungeonResult.state; }
      return { success: true, state: state, difficulty: difficulty, result: dungeonResult };
    }

    // Stub dungeon
    var successChance = { easy: 0.9, normal: 0.7, hard: 0.5, legendary: 0.25 }[difficulty];
    var won = Math.random() < successChance;
    var sparkReward = { easy: 20, normal: 40, hard: 80, legendary: 200 }[difficulty];
    var xpReward    = { easy: 15, normal: 30, hard: 60, legendary: 150 }[difficulty];

    if (won) {
      state.player.spark = (state.player.spark || 0) + sparkReward;
      state.player.xp    = (state.player.xp    || 0) + xpReward;
    }

    return {
      success:    true,
      state:      state,
      difficulty: difficulty,
      won:        won,
      reward:     won ? { spark: sparkReward, xp: xpReward } : null,
      message:    won
        ? 'Dungeon cleared! Rewards: +' + sparkReward + ' Spark, +' + xpReward + ' XP.'
        : 'Dungeon failed. Better luck next time.'
    };
  }

  function _actionGazeStars(state, action) {
    // Stargazing gives small XP and occasionally reveals constellation info
    var xpGain = _randomInt(3, 8);
    state.player.xp = (state.player.xp || 0) + xpGain;

    var messages = [
      'You study the constellations above. The stars are clear tonight.',
      'A shooting star crosses the sky. You make a wish.',
      'The heavens wheel overhead, reminding you of the passage of time.',
      'You trace the outline of a familiar constellation, its myth echoing in memory.'
    ];
    var message = _randomItem(messages);

    // Delegate to DashboardGames if available
    var DashboardGames = _getDashboardGames();
    if (DashboardGames && typeof DashboardGames.gazeStars === 'function') {
      var starResult = DashboardGames.gazeStars(state);
      if (starResult && starResult.state) { state = starResult.state; }
    }

    return { success: true, state: state, xpGain: xpGain, message: message };
  }

  function _actionSaveGame(state) {
    var saved = saveState(state);
    return { success: saved, message: saved ? 'Game saved.' : 'Save failed.' };
  }

  function _actionLoadGame(state) {
    var loaded = loadState();
    if (!loaded) { return { success: false, error: 'No saved game found.' }; }
    return { success: true, state: loaded, message: 'Game loaded.' };
  }

  // =========================================================================
  // RESOURCE GATHERING
  // =========================================================================

  /**
   * gatherResource(state, resourceType)
   * Gather a resource based on current zone.
   * Returns { success, item, quantity, message, state }
   */
  function gatherResource(state, resourceType) {
    if (!state || !state.player) {
      return { success: false, error: 'No state', message: 'Cannot gather: no state.' };
    }

    var zone = state.player.zone || 'nexus';
    var currentTick = (state.world && state.world.time && state.world.time.tick) || 0;
    var lastGather  = state.player.lastGatherTick || -1;

    // Cooldown check: must wait at least 1 tick between gathers
    if (lastGather >= 0 && currentTick <= lastGather) {
      return {
        success: false,
        error:   'Gather cooldown active',
        message: 'You need to rest before gathering again.'
      };
    }

    var zoneRes = ZONE_RESOURCES[zone];
    if (!zoneRes) {
      return { success: false, error: 'No resources in zone: ' + zone, message: 'Nothing to gather here.' };
    }

    // Determine rarity tier
    var roll = Math.random();
    var tier, pool;

    if (roll < 0.70) {
      tier = 'common';
      pool = zoneRes.common || [];
    } else if (roll < 0.90) {
      tier = 'uncommon';
      pool = zoneRes.uncommon || [];
    } else {
      tier = 'rare';
      pool = zoneRes.rare || [];
    }

    // Fallback to common if pool is empty
    if (!pool || pool.length === 0) {
      tier = 'common';
      pool = zoneRes.common || [];
    }

    // If resourceType is specified, check if it is available in this zone
    if (resourceType) {
      var allAvailable = (zoneRes.common || []).concat(zoneRes.uncommon || []).concat(zoneRes.rare || []);
      if (allAvailable.indexOf(resourceType) === -1) {
        return {
          success: false,
          error:   resourceType + ' not available in ' + zone,
          message: resourceType + ' cannot be found in ' + (ZONE_NAMES[zone] || zone) + '.'
        };
      }
      pool = [resourceType];
      // Determine tier for the specified resource
      if ((zoneRes.rare || []).indexOf(resourceType) !== -1) { tier = 'rare'; }
      else if ((zoneRes.uncommon || []).indexOf(resourceType) !== -1) { tier = 'uncommon'; }
      else { tier = 'common'; }
    }

    if (!pool || pool.length === 0) {
      return { success: false, error: 'No resources available', message: 'Nothing found.' };
    }

    var item     = _randomItem(pool);
    var quantity = (tier === 'rare') ? 1 : (tier === 'uncommon' ? _randomInt(1, 2) : _randomInt(1, 3));

    // Add to inventory
    state.inventory.items[item] = (state.inventory.items[item] || 0) + quantity;

    // Update cooldown
    state.player.lastGatherTick = currentTick;

    // Small XP gain
    var xpMap = { common: 2, uncommon: 5, rare: 15 };
    state.player.xp = (state.player.xp || 0) + (xpMap[tier] || 2);

    var tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    var message = 'You gather ' + quantity + 'x ' + item + ' [' + tierLabel + '].';

    return {
      success:  true,
      state:    state,
      item:     item,
      quantity: quantity,
      tier:     tier,
      message:  message
    };
  }

  // =========================================================================
  // STATE PERSISTENCE
  // =========================================================================

  /**
   * saveState(state)
   * Save full game state to localStorage.
   * Returns success boolean.
   */
  function saveState(state) {
    if (!state) { return false; }
    try {
      var clone = _deepClone(state);
      clone._meta = clone._meta || {};
      clone._meta.savedAt = Date.now();
      var json = JSON.stringify(clone);
      var result = _safeLocalStorage('set', STORAGE_KEY, json);
      return result === true;
    } catch (e) {
      return false;
    }
  }

  /**
   * loadState()
   * Load game state from localStorage.
   * Returns state or null.
   */
  function loadState() {
    try {
      var raw = _safeLocalStorage('get', STORAGE_KEY);
      if (!raw) { return null; }
      var parsed = JSON.parse(raw);
      // Basic sanity check
      if (!parsed || !parsed.player || !parsed.world) { return null; }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  /**
   * resetState(playerName)
   * Reset to a fresh game state.
   * Returns new state.
   */
  function resetState(playerName) {
    _safeLocalStorage('remove', STORAGE_KEY);
    return createGameState(playerName);
  }

  // =========================================================================
  // AVAILABLE ACTIONS
  // =========================================================================

  /**
   * getAvailableActions(state)
   * Returns list of actions available based on current state.
   */
  function getAvailableActions(state) {
    if (!state || !state.player) { return []; }

    var actions = [];
    var zone = state.player.zone || 'nexus';

    // Travel is always available
    var allZones = Object.keys(ZONE_NAMES);
    for (var i = 0; i < allZones.length; i++) {
      if (allZones[i] !== zone) {
        actions.push({ type: 'travel', zone: allZones[i], label: 'Travel to ' + ZONE_NAMES[allZones[i]] });
      }
    }

    // Talk NPC is always available
    actions.push({ type: 'talk_npc', npcId: 'npc_001', label: 'Talk to a citizen' });

    // Gather resource based on zone resources
    var zoneRes = ZONE_RESOURCES[zone];
    if (zoneRes) {
      var allResources = (zoneRes.common || []).concat(zoneRes.uncommon || []).concat(zoneRes.rare || []);
      // Deduplicate
      var seen = {};
      for (var j = 0; j < allResources.length; j++) {
        if (!seen[allResources[j]]) {
          seen[allResources[j]] = true;
          actions.push({ type: 'gather_resource', resourceType: allResources[j], label: 'Gather ' + allResources[j] });
        }
      }
    }

    // Fishing — in wilds, gardens, commons
    if (zone === 'wilds' || zone === 'gardens' || zone === 'commons') {
      actions.push({ type: 'cast_line', label: 'Go fishing' });
    }

    // Dungeon — in arena
    if (zone === 'arena') {
      actions.push({ type: 'enter_dungeon', difficulty: 'normal', label: 'Enter dungeon (normal)' });
      actions.push({ type: 'enter_dungeon', difficulty: 'hard',   label: 'Enter dungeon (hard)' });
    }

    // Card game — in agora or nexus
    if (zone === 'agora' || zone === 'nexus') {
      actions.push({ type: 'play_card', cardIndex: 0, label: 'Play a card' });
    }

    // Stargazing — everywhere at night
    var tick        = (state.world && state.world.time && state.world.time.tick) || 0;
    var dayLength   = (state.world && state.world.time && state.world.time.dayLength) || 1200;
    var dayProgress = tick % dayLength;
    if (dayProgress >= 700) {
      actions.push({ type: 'gaze_stars', label: 'Gaze at the stars' });
    }

    // Chat — always available
    actions.push({ type: 'send_chat', channel: 'global', text: '', label: 'Send chat message' });

    // Quest acceptance — if no active quests or fewer than 3
    var activeQuestCount = Object.keys(state.quests.active).length;
    if (activeQuestCount < 3) {
      actions.push({ type: 'accept_quest', questId: 'explore_all_zones', label: 'Accept a quest' });
    }

    // Save/Load
    actions.push({ type: 'save_game', label: 'Save game' });
    actions.push({ type: 'load_game', label: 'Load game' });

    return actions;
  }

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================

  /**
   * processNotifications(state, result)
   * Convert action results into notification messages.
   * Returns array of notification objects.
   */
  function processNotifications(state, result) {
    if (!result) { return []; }

    var notifications = [];

    if (!result.success) {
      notifications.push({
        type:    'error',
        message: result.error || 'Action failed.',
        tick:    state && state.world ? state.world.time.tick : 0
      });
      return notifications;
    }

    // Success notification with appropriate type
    if (result.message) {
      var type = 'success';

      // Classify notification type
      if (result.error)                                        { type = 'error'; }
      else if (result.won === false)                           { type = 'warning'; }
      else if (result.caught === false)                        { type = 'info'; }
      else if (result.type === 'weather' || result.flavor)     { type = 'info'; }

      notifications.push({
        type:    type,
        message: result.message,
        tick:    state && state.world ? state.world.time.tick : 0
      });
    }

    // Achievement notifications
    if (result.achievement) {
      notifications.push({
        type:    'achievement',
        message: 'Achievement unlocked: ' + result.achievement,
        tick:    state && state.world ? state.world.time.tick : 0
      });
    }

    // Level-up check
    if (state && state.player) {
      var xpThreshold = state.player.level * 100;
      if (state.player.xp >= xpThreshold) {
        state.player.level += 1;
        state.player.xp -= xpThreshold;
        notifications.push({
          type:    'achievement',
          message: 'Level up! You are now level ' + state.player.level + '.',
          tick:    state && state.world ? state.world.time.tick : 0
        });
      }
    }

    // Reward notifications
    if (result.reward) {
      var reward = result.reward;
      var parts  = [];
      if (reward.spark) { parts.push('+' + reward.spark + ' Spark'); }
      if (reward.xp)    { parts.push('+' + reward.xp + ' XP'); }
      if (reward.item)  { parts.push(reward.item + ' obtained'); }
      if (parts.length > 0) {
        notifications.push({
          type:    'info',
          message: 'Rewards: ' + parts.join(', '),
          tick:    state && state.world ? state.world.time.tick : 0
        });
      }
    }

    return notifications;
  }

  // =========================================================================
  // KEYBOARD SHORTCUTS
  // =========================================================================

  /**
   * handleKeyPress(state, key)
   * Map keyboard shortcuts to dashboard actions.
   * Returns updated state (and may trigger side effects).
   */
  function handleKeyPress(state, key) {
    if (!state || !key) { return state; }

    var shortcut = KEY_SHORTCUTS[key];
    if (!shortcut) { return state; }

    if (shortcut.action === 'toggle_panel') {
      // Delegate to Dashboard if available
      var Dashboard = _getDashboard();
      if (Dashboard && typeof Dashboard.togglePanel === 'function') {
        Dashboard.togglePanel(shortcut.panel + '-panel');
      }
    } else if (shortcut.action === 'action') {
      var actionResult = handleDashboardAction(state, { type: shortcut.type });
      state = actionResult.state || state;
    } else if (shortcut.action === 'save_game') {
      saveState(state);
    }

    return state;
  }

  // =========================================================================
  // PLAYER SUMMARY
  // =========================================================================

  /**
   * getPlayerSummary(state)
   * Returns text summary of player status.
   */
  function getPlayerSummary(state) {
    if (!state || !state.player) { return 'Unknown citizen'; }

    var p    = state.player;
    var zone = ZONE_NAMES[p.zone] || p.zone || 'Unknown';

    var activeQuests = Object.keys(state.quests ? state.quests.active : {}).length;
    var questPart    = activeQuests === 1
      ? '1 active quest'
      : activeQuests + ' active quests';

    var tick      = (state.world && state.world.time && state.world.time.tick) || 0;
    var dayLength = (state.world && state.world.time && state.world.time.dayLength) || 1200;
    var day       = Math.floor(tick / dayLength) + 1;

    // Day part
    var dayProgress = tick % dayLength;
    var dayPartName = 'Night';
    for (var i = 0; i < DAY_PARTS.length; i++) {
      var dp = DAY_PARTS[i];
      if (dayProgress >= dp.startTick && dayProgress < dp.endTick) {
        dayPartName = dp.name;
        break;
      }
    }

    return 'Level ' + (p.level || 1) + ' Citizen | ' +
           zone + ' | ' +
           (p.spark || 0) + ' Spark | ' +
           questPart + ' | ' +
           'Day ' + day + ', ' + dayPartName;
  }

  // =========================================================================
  // WELCOME MESSAGE
  // =========================================================================

  /**
   * formatWelcomeMessage(playerName, zone)
   * Returns welcome HTML for first visit or zone change.
   */
  function formatWelcomeMessage(playerName, zone) {
    var name     = _escapeHtml(playerName || 'Citizen');
    var zoneKey  = zone || 'nexus';
    var zoneName = ZONE_NAMES[zoneKey] || zoneKey;
    var zoneDesc = ZONE_DESCRIPTIONS[zoneKey] || 'a part of ZION';

    // Fake a weather type for the welcome
    var weather     = _randomItem(WEATHER_TYPES) || 'clear';
    var weatherAdj  = WEATHER_ADJECTIVES[weather] || weather;

    return '<div class="zion-welcome">' +
      '<p>Welcome to ZION, <strong>' + name + '</strong>.</p>' +
      '<p>You stand in <em>' + zoneName + '</em>, ' + zoneDesc + '.</p>' +
      '<p>The ' + weatherAdj + ' sky stretches above you.</p>' +
      '</div>';
  }

  // =========================================================================
  // DASHBOARD SHELL LAYOUT
  // =========================================================================

  function _createShellLayout(container) {
    if (typeof document === 'undefined') { return null; }

    // Header
    var header = document.createElement('div');
    header.id = 'zion-dashboard-header';
    header.style.cssText = [
      'background:#0D1321',
      'border-bottom:1px solid #1E3A5F',
      'padding:8px 16px',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'flex-shrink:0'
    ].join(';');
    header.innerHTML = '<span style="color:#DAA520;font-weight:bold;font-family:monospace">ZION</span>' +
      '<span id="zion-player-summary" style="color:#8A9AB0;font-size:12px;font-family:monospace"></span>';

    // Main grid
    var main = document.createElement('div');
    main.id = 'zion-dashboard-main';
    main.style.cssText = [
      'flex:1',
      'overflow-y:auto',
      'padding:12px',
      'display:grid',
      'grid-template-columns:repeat(auto-fill, minmax(340px, 1fr))',
      'gap:12px',
      'align-content:start'
    ].join(';');

    // Footer tabs
    var footer = document.createElement('div');
    footer.id = 'zion-dashboard-footer';
    footer.style.cssText = [
      'background:#161F2E',
      'border-top:1px solid #1E3A5F',
      'padding:6px 12px',
      'display:flex',
      'gap:8px',
      'flex-shrink:0',
      'overflow-x:auto'
    ].join(';');

    var shortcuts = [
      '[I] Inventory', '[C] Craft', '[J] Quests',
      '[G] Guild', '[M] Map', '[S] Social', '[E] Economy', '[F5] Save'
    ];
    footer.innerHTML = shortcuts.map(function(s) {
      return '<span style="color:#4A5A70;font-size:11px;font-family:monospace">' + s + '</span>';
    }).join('');

    // Wrapper
    var wrapper = document.createElement('div');
    wrapper.id = 'zion-dashboard-wrapper';
    wrapper.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'height:100%',
      'background:#0A0E1A',
      'color:#E8E0D8',
      'font-family:monospace',
      'overflow:hidden'
    ].join(';');

    wrapper.appendChild(header);
    wrapper.appendChild(main);
    wrapper.appendChild(footer);

    container.innerHTML = '';
    container.appendChild(wrapper);

    return { header: header, main: main, footer: footer, wrapper: wrapper };
  }

  // =========================================================================
  // INIT DASHBOARD MODE
  // =========================================================================

  /**
   * initDashboardMode(container)
   * Master initialization for dashboard mode.
   * Returns the dashboard state object.
   */
  function initDashboardMode(container) {
    if (_initialized) {
      return _gameState;
    }

    // 1. Inject dashboard CSS
    var DashboardCSS = _getDashboardCSS();
    if (DashboardCSS && typeof DashboardCSS.inject === 'function') {
      DashboardCSS.inject();
    }

    // 2. Create dashboard shell layout (only in browser)
    var shell = null;
    if (container && typeof document !== 'undefined') {
      shell = _createShellLayout(container);
    }

    // 3. Load or create game state
    var savedState = loadState();
    _gameState = savedState || createGameState('Citizen');

    // 4. Initialize all panel modules
    var panelContainer = (shell && shell.main) ? shell.main : container;

    var DashboardZones     = _getDashboardZones();
    var DashboardNPCs      = _getDashboardNPCs();
    var DashboardInventory = _getDashboardInventory();
    var DashboardEconomy   = _getDashboardEconomy();
    var DashboardQuests    = _getDashboardQuests();
    var DashboardSocial    = _getDashboardSocial();
    var DashboardGames     = _getDashboardGames();
    var DashboardWorld     = _getDashboardWorld();

    if (panelContainer && typeof document !== 'undefined') {
      if (DashboardZones && typeof DashboardZones.createZonePanel === 'function') {
        var zonePanel = DashboardZones.createZonePanel(_gameState.player.zone);
        if (zonePanel && zonePanel.nodeType) { panelContainer.appendChild(zonePanel); }
      }
      if (DashboardNPCs && typeof DashboardNPCs.createNPCPanel === 'function') {
        var npcPanel = DashboardNPCs.createNPCPanel(_gameState.player.zone);
        if (npcPanel && npcPanel.nodeType) { panelContainer.appendChild(npcPanel); }
      }
      if (DashboardInventory && typeof DashboardInventory.createInventoryPanel === 'function') {
        var invPanel = DashboardInventory.createInventoryPanel(_gameState);
        if (invPanel && invPanel.nodeType) { panelContainer.appendChild(invPanel); }
      }
      if (DashboardEconomy && typeof DashboardEconomy.createEconomyPanel === 'function') {
        var ecoPanel = DashboardEconomy.createEconomyPanel(_gameState);
        if (ecoPanel && ecoPanel.nodeType) { panelContainer.appendChild(ecoPanel); }
      }
      if (DashboardQuests && typeof DashboardQuests.createQuestPanel === 'function') {
        var questPanel = DashboardQuests.createQuestPanel(_gameState.quests);
        if (questPanel && questPanel.nodeType) { panelContainer.appendChild(questPanel); }
      }
      if (DashboardSocial && typeof DashboardSocial.createSocialPanel === 'function') {
        var socialPanel = DashboardSocial.createSocialPanel(_gameState.social);
        if (socialPanel && socialPanel.nodeType) { panelContainer.appendChild(socialPanel); }
      }
      if (DashboardGames && typeof DashboardGames.createGamesPanel === 'function') {
        var gamesPanel = DashboardGames.createGamesPanel(_gameState);
        if (gamesPanel && gamesPanel.nodeType) { panelContainer.appendChild(gamesPanel); }
      }
      if (DashboardWorld && typeof DashboardWorld.createWorldPanel === 'function') {
        var worldPanel = DashboardWorld.createWorldPanel(_gameState.world);
        if (worldPanel && worldPanel.nodeType) { panelContainer.appendChild(worldPanel); }
      }
    }

    // 5. Set up keyboard shortcuts (browser only)
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', function(e) {
        var key = e.key || e.keyCode;
        _gameState = handleKeyPress(_gameState, key);
        _updatePlayerSummary(shell);
      });
    }

    // 6. Start dashboard game loop
    _startGameLoop(shell);

    // 7. Show welcome message / zone info
    if (typeof document !== 'undefined' && panelContainer) {
      var welcome = document.createElement('div');
      welcome.style.cssText = 'padding:12px;grid-column:1/-1';
      welcome.innerHTML = formatWelcomeMessage(_gameState.player.name, _gameState.player.zone);
      panelContainer.insertBefore(welcome, panelContainer.firstChild);
    }

    // 8. Update player summary
    _updatePlayerSummary(shell);

    _initialized = true;
    return _gameState;
  }

  function _updatePlayerSummary(shell) {
    if (!shell || !_gameState) { return; }
    if (typeof document === 'undefined') { return; }
    var el = document.getElementById('zion-player-summary');
    if (el) { el.textContent = getPlayerSummary(_gameState); }
  }

  function _startGameLoop(shell) {
    if (_tickHandle) { clearInterval(_tickHandle); }
    _tickHandle = setInterval(function() {
      if (!_gameState) { return; }
      _gameState = dashboardTick(_gameState, 1);
      _tickCount += 1;
      _updatePlayerSummary(shell);
    }, TICK_INTERVAL_MS);
  }

  // =========================================================================
  // VERSION
  // =========================================================================

  /**
   * getDashboardVersion()
   * Returns the module version string.
   */
  function getDashboardVersion() {
    return VERSION;
  }

  // =========================================================================
  // INTERNAL RESET (for testing)
  // =========================================================================

  function _reset() {
    if (_tickHandle) {
      clearInterval(_tickHandle);
      _tickHandle = null;
    }
    _gameState   = null;
    _tickCount   = 0;
    _initialized = false;
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.VERSION              = VERSION;
  exports.ZONE_RESOURCES       = ZONE_RESOURCES;
  exports.ZONE_NAMES           = ZONE_NAMES;
  exports.ZONE_DESCRIPTIONS    = ZONE_DESCRIPTIONS;
  exports.WEATHER_TYPES        = WEATHER_TYPES;
  exports.KEY_SHORTCUTS        = KEY_SHORTCUTS;
  exports.WORLD_EVENTS         = WORLD_EVENTS;

  // Core init
  exports.initDashboardMode    = initDashboardMode;
  exports.getDashboardVersion  = getDashboardVersion;

  // Game state
  exports.createGameState      = createGameState;
  exports.dashboardTick        = dashboardTick;

  // Actions
  exports.handleDashboardAction = handleDashboardAction;
  exports.gatherResource        = gatherResource;

  // Persistence
  exports.saveState             = saveState;
  exports.loadState             = loadState;
  exports.resetState            = resetState;

  // Queries
  exports.getAvailableActions   = getAvailableActions;
  exports.processNotifications  = processNotifications;
  exports.handleKeyPress        = handleKeyPress;
  exports.getPlayerSummary      = getPlayerSummary;
  exports.formatWelcomeMessage  = formatWelcomeMessage;

  // Testing helpers
  exports._reset                = _reset;
  exports._updateWeather        = _updateWeather;
  exports._checkEventTriggers   = _checkEventTriggers;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardMain = {}));
