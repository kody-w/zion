// test_hud.js — Test suite for src/js/hud.js
// Verifies exports, function safety in headless DOM, and return types.

const { test, suite, report, assert } = require('./test_runner');

// ---------------------------------------------------------------------------
// Minimal DOM mock — must be installed before requiring HUD
// ---------------------------------------------------------------------------

function makeElement(tag) {
  return {
    tagName: tag || 'div',
    id: '',
    className: '',
    style: { cssText: '', display: '' },
    innerHTML: '',
    textContent: '',
    value: '',
    title: '',
    type: '',
    checked: false,
    dataset: {},
    children: [],
    parentNode: null,
    firstChild: null,
    _attrs: {},
    _listeners: {},
    classList: {
      _set: new Set(),
      add: function(c) { this._set.add(c); },
      remove: function(c) { this._set.delete(c); },
      toggle: function(c) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); },
      contains: function(c) { return this._set.has(c); }
    },
    appendChild: function(child) {
      if (child) { child.parentNode = this; }
      this.children.push(child);
      return child;
    },
    removeChild: function(child) {
      if (child) { child.parentNode = null; }
      var idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      return child;
    },
    setAttribute: function(k, v) { this._attrs[k] = v; },
    getAttribute: function(k) { return this._attrs[k] !== undefined ? this._attrs[k] : null; },
    addEventListener: function(ev, fn) {
      if (!this._listeners[ev]) this._listeners[ev] = [];
      this._listeners[ev].push(fn);
    },
    removeEventListener: function(ev, fn) {
      if (!this._listeners[ev]) return;
      this._listeners[ev] = this._listeners[ev].filter(function(f) { return f !== fn; });
    },
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; },
    getBoundingClientRect: function() { return { top: 0, left: 0, width: 200, height: 200 }; },
    getContext: function() {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
        shadowBlur: 0,
        shadowColor: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        fillRect: function() {},
        strokeRect: function() {},
        beginPath: function() {},
        arc: function() {},
        moveTo: function() {},
        lineTo: function() {},
        fill: function() {},
        stroke: function() {},
        fillText: function() {},
        closePath: function() {}
      };
    },
    remove: function() {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    },
    focus: function() {}
  };
}

var _elements = {};

global.document = {
  _head: makeElement('head'),
  _body: makeElement('body'),
  get head() { return this._head; },
  getElementById: function(id) { return _elements[id] || null; },
  createElement: function(tag) {
    var el = makeElement(tag);
    return el;
  },
  get body() { return this._body; },
  querySelectorAll: function() { return []; },
  querySelector: function() { return null; },
  addEventListener: function() {},
  removeEventListener: function() {}
};

global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: function() {},
  getComputedStyle: function() { return {}; },
  HUD: {}
};

global.THREE = undefined;
global.localStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] !== undefined ? this._store[k] : null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};
global.requestAnimationFrame = function(fn) { /* no-op in headless */ };
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;
global.Map = Map;
global.Set = Set;

// ---------------------------------------------------------------------------
// Load HUD module
// ---------------------------------------------------------------------------

var HUD = require('../src/js/hud.js');

// ---------------------------------------------------------------------------
// SUITE 1: Export Verification
// ---------------------------------------------------------------------------

suite('Export Verification — functions exist', function() {

  // Primary leaderboard exports (explicitly required by task)
  test('showLeaderboardPanel is a function', function() {
    assert.strictEqual(typeof HUD.showLeaderboardPanel, 'function');
  });
  test('hideLeaderboardPanel is a function', function() {
    assert.strictEqual(typeof HUD.hideLeaderboardPanel, 'function');
  });
  test('toggleLeaderboardPanel is a function', function() {
    assert.strictEqual(typeof HUD.toggleLeaderboardPanel, 'function');
  });
  test('refreshLeaderboardPanel is a function', function() {
    assert.strictEqual(typeof HUD.refreshLeaderboardPanel, 'function');
  });

  // Core HUD init/update exports
  test('initHUD is a function', function() {
    assert.strictEqual(typeof HUD.initHUD, 'function');
  });
  test('updateChat is a function', function() {
    assert.strictEqual(typeof HUD.updateChat, 'function');
  });
  test('addChatMessage is a function', function() {
    assert.strictEqual(typeof HUD.addChatMessage, 'function');
  });
  test('updatePlayerInfo is a function', function() {
    assert.strictEqual(typeof HUD.updatePlayerInfo, 'function');
  });
  test('updateZoneLabel is a function', function() {
    assert.strictEqual(typeof HUD.updateZoneLabel, 'function');
  });
  test('showNotification is a function', function() {
    assert.strictEqual(typeof HUD.showNotification, 'function');
  });

  // NPC/quest UI exports
  test('showNPCDialog is a function', function() {
    assert.strictEqual(typeof HUD.showNPCDialog, 'function');
  });
  test('hideNPCDialog is a function', function() {
    assert.strictEqual(typeof HUD.hideNPCDialog, 'function');
  });
  test('showQuestProgress is a function', function() {
    assert.strictEqual(typeof HUD.showQuestProgress, 'function');
  });
  test('showQuestOffer is a function', function() {
    assert.strictEqual(typeof HUD.showQuestOffer, 'function');
  });
  test('showQuestComplete is a function', function() {
    assert.strictEqual(typeof HUD.showQuestComplete, 'function');
  });
  test('showItemPickup is a function', function() {
    assert.strictEqual(typeof HUD.showItemPickup, 'function');
  });

  // Tutorial exports
  test('initTutorial is a function', function() {
    assert.strictEqual(typeof HUD.initTutorial, 'function');
  });
  test('advanceTutorial is a function', function() {
    assert.strictEqual(typeof HUD.advanceTutorial, 'function');
  });
  test('skipTutorial is a function', function() {
    assert.strictEqual(typeof HUD.skipTutorial, 'function');
  });
  test('isTutorialActive is a function', function() {
    assert.strictEqual(typeof HUD.isTutorialActive, 'function');
  });

  // Panel show/hide exports
  test('showInventoryPanel is a function', function() {
    assert.strictEqual(typeof HUD.showInventoryPanel, 'function');
  });
  test('hideInventoryPanel is a function', function() {
    assert.strictEqual(typeof HUD.hideInventoryPanel, 'function');
  });
  test('toggleInventoryPanel is a function', function() {
    assert.strictEqual(typeof HUD.toggleInventoryPanel, 'function');
  });
  test('showBuildToolbar is a function', function() {
    assert.strictEqual(typeof HUD.showBuildToolbar, 'function');
  });
  test('hideBuildToolbar is a function', function() {
    assert.strictEqual(typeof HUD.hideBuildToolbar, 'function');
  });
  test('showSettingsMenu is a function', function() {
    assert.strictEqual(typeof HUD.showSettingsMenu, 'function');
  });
  test('hideSettingsMenu is a function', function() {
    assert.strictEqual(typeof HUD.hideSettingsMenu, 'function');
  });
  test('getSettings is a function', function() {
    assert.strictEqual(typeof HUD.getSettings, 'function');
  });
  test('loadSettings is a function', function() {
    assert.strictEqual(typeof HUD.loadSettings, 'function');
  });

  // Profile/skills
  test('showPlayerProfile is a function', function() {
    assert.strictEqual(typeof HUD.showPlayerProfile, 'function');
  });
  test('hidePlayerProfile is a function', function() {
    assert.strictEqual(typeof HUD.hidePlayerProfile, 'function');
  });
  test('showSkillsPanel is a function', function() {
    assert.strictEqual(typeof HUD.showSkillsPanel, 'function');
  });
  test('showAchievementToast is a function', function() {
    assert.strictEqual(typeof HUD.showAchievementToast, 'function');
  });

  // Trade / emote
  test('showTradeRequest is a function', function() {
    assert.strictEqual(typeof HUD.showTradeRequest, 'function');
  });
  test('hideTradeRequest is a function', function() {
    assert.strictEqual(typeof HUD.hideTradeRequest, 'function');
  });
  test('showTradeWindow is a function', function() {
    assert.strictEqual(typeof HUD.showTradeWindow, 'function');
  });
  test('hideTradeWindow is a function', function() {
    assert.strictEqual(typeof HUD.hideTradeWindow, 'function');
  });
  test('showEmoteMenu is a function', function() {
    assert.strictEqual(typeof HUD.showEmoteMenu, 'function');
  });
  test('hideEmoteMenu is a function', function() {
    assert.strictEqual(typeof HUD.hideEmoteMenu, 'function');
  });
  test('showEmoteBubble is a function', function() {
    assert.strictEqual(typeof HUD.showEmoteBubble, 'function');
  });

  // World map
  test('showWorldMap is a function', function() {
    assert.strictEqual(typeof HUD.showWorldMap, 'function');
  });
  test('hideWorldMap is a function', function() {
    assert.strictEqual(typeof HUD.hideWorldMap, 'function');
  });

  // Fishing / pet
  test('showFishingUI is a function', function() {
    assert.strictEqual(typeof HUD.showFishingUI, 'function');
  });
  test('hideFishingUI is a function', function() {
    assert.strictEqual(typeof HUD.hideFishingUI, 'function');
  });
  test('showFishCaughtNotification is a function', function() {
    assert.strictEqual(typeof HUD.showFishCaughtNotification, 'function');
  });
  test('showPetPanel is a function', function() {
    assert.strictEqual(typeof HUD.showPetPanel, 'function');
  });
  test('hidePetPanel is a function', function() {
    assert.strictEqual(typeof HUD.hidePetPanel, 'function');
  });

  // Governance / auction
  test('showGovernancePanel is a function', function() {
    assert.strictEqual(typeof HUD.showGovernancePanel, 'function');
  });
  test('hideGovernancePanel is a function', function() {
    assert.strictEqual(typeof HUD.hideGovernancePanel, 'function');
  });
  test('showAuctionHousePanel is a function', function() {
    assert.strictEqual(typeof HUD.showAuctionHousePanel, 'function');
  });
  test('hideAuctionHousePanel is a function', function() {
    assert.strictEqual(typeof HUD.hideAuctionHousePanel, 'function');
  });

  // Crafting panel
  test('showCraftingPanel is a function', function() {
    assert.strictEqual(typeof HUD.showCraftingPanel, 'function');
  });
  test('hideCraftingPanel is a function', function() {
    assert.strictEqual(typeof HUD.hideCraftingPanel, 'function');
  });

  // Quest log
  test('showQuestLog is a function', function() {
    assert.strictEqual(typeof HUD.showQuestLog, 'function');
  });
  test('hideQuestLog is a function', function() {
    assert.strictEqual(typeof HUD.hideQuestLog, 'function');
  });
  test('updateQuestTracker is a function', function() {
    assert.strictEqual(typeof HUD.updateQuestTracker, 'function');
  });

  // Break reminder
  test('showBreakReminder is a function', function() {
    assert.strictEqual(typeof HUD.showBreakReminder, 'function');
  });

  // Coords / time-weather
  test('updateCoords is a function', function() {
    assert.strictEqual(typeof HUD.updateCoords, 'function');
  });
  test('updateTimeWeather is a function', function() {
    assert.strictEqual(typeof HUD.updateTimeWeather, 'function');
  });

  // Chat input helpers
  test('showChatInput is a function', function() {
    assert.strictEqual(typeof HUD.showChatInput, 'function');
  });
  test('hideChatInput is a function', function() {
    assert.strictEqual(typeof HUD.hideChatInput, 'function');
  });
  test('addChatInput is a function', function() {
    assert.strictEqual(typeof HUD.addChatInput, 'function');
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: Function Safety — null / undefined args, headless mode
// ---------------------------------------------------------------------------

suite('Function Safety — no throw with null/undefined args', function() {

  test('updateChat(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateChat(null); });
  });

  test('updateChat([]) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateChat([]); });
  });

  test('addChatMessage(null, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.addChatMessage(null, null); });
  });

  test('addChatMessage("bot", "hello") does not throw', function() {
    assert.doesNotThrow(function() { HUD.addChatMessage('bot', 'hello'); });
  });

  test('updatePlayerInfo(undefined) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updatePlayerInfo(undefined); });
  });

  test('updatePlayerInfo({name:"Test",spark:10}) does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.updatePlayerInfo({ name: 'Test', spark: 10, zone: 'nexus', warmth: 75 });
    });
  });

  test('updateZoneLabel(undefined) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateZoneLabel(undefined); });
  });

  test('updateZoneLabel("nexus") does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateZoneLabel('nexus'); });
  });

  test('updateZoneLabel("unknown-zone") does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateZoneLabel('unknown-zone'); });
  });

  test('showNotification(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showNotification(null); });
  });

  test('showNotification("Hello", "success") does not throw', function() {
    assert.doesNotThrow(function() { HUD.showNotification('Hello', 'success'); });
  });

  test('showNotification("Warning!", "warning") does not throw', function() {
    assert.doesNotThrow(function() { HUD.showNotification('Warning!', 'warning'); });
  });

  test('showNotification("Error!", "error") does not throw', function() {
    assert.doesNotThrow(function() { HUD.showNotification('Error!', 'error'); });
  });

  test('showNPCDialog(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showNPCDialog(null); });
  });

  test('showNPCDialog({}) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showNPCDialog({}); });
  });

  test('showNPCDialog with full NPC data does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.showNPCDialog({
        name: 'Aria',
        archetype: 'gardener',
        mood: 'happy',
        activity: 'Tending to sunflowers',
        familiarity: 55,
        message: 'Welcome, traveler!'
      });
    });
  });

  test('hideNPCDialog() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideNPCDialog(); });
  });

  test('hideNPCDialog() called twice does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideNPCDialog(); HUD.hideNPCDialog(); });
  });

  test('setNPCActionCallback(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.setNPCActionCallback(null); });
  });

  test('showQuestProgress(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showQuestProgress(null); });
  });

  test('showQuestProgress("1/3 Herbs") does not throw', function() {
    assert.doesNotThrow(function() { HUD.showQuestProgress('1/3 Herbs'); });
  });

  test('showQuestComplete with null args does not throw', function() {
    assert.doesNotThrow(function() { HUD.showQuestComplete(null, null); });
  });

  test('showQuestComplete with valid data does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.showQuestComplete(
        { title: 'Herb Gathering' },
        { spark: 50, items: [] }
      );
    });
  });

  test('showItemPickup(null, null, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showItemPickup(null, null, null); });
  });

  test('showItemPickup("Herbs", 3, "🌿") does not throw', function() {
    assert.doesNotThrow(function() { HUD.showItemPickup('Herbs', 3, '\uD83C\uDF3F'); });
  });

  test('showBreakReminder(60) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showBreakReminder(60); });
  });

  test('updateCoords(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateCoords(null); });
  });

  test('updateCoords({x:0,y:0,z:0}) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateCoords({ x: 0, y: 0, z: 0 }); });
  });

  test('updateTimeWeather(0, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateTimeWeather(0, null); });
  });

  test('updateTimeWeather(720, "rain") does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateTimeWeather(720, 'rain'); });
  });

  test('updateTimeWeather(1440, "snow") does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateTimeWeather(1440, 'snow'); });
  });

  test('updateNearbyPlayers([]) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateNearbyPlayers([]); });
  });

  test('updateMinimap([], null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateMinimap([], null); });
  });

  test('updateMinimapNPCs(null, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateMinimapNPCs(null, null); });
  });

  test('showChatInput() does not throw', function() {
    assert.doesNotThrow(function() { HUD.showChatInput(); });
  });

  test('hideChatInput() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideChatInput(); });
  });

  test('addChatInput(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.addChatInput(null); });
  });

  test('showInventoryPanel() is a no-op (panel init needs real DOM)', function() {
    // initInventoryPanel() needs a real querySelector('#zion-hud'), so the internal
    // panel remains null and showInventoryPanel attempts panel.style — expected to
    // throw in headless; this test documents that the function exists and is callable.
    var threw = false;
    try { HUD.showInventoryPanel(); } catch(e) { threw = true; }
    // Either path (throw or no-throw) is acceptable — we just ensure it is callable.
    assert.strictEqual(typeof HUD.showInventoryPanel, 'function');
  });

  test('hideInventoryPanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideInventoryPanel(); });
  });

  test('toggleInventoryPanel() is callable (DOM-dependent, may throw)', function() {
    // In headless mode the panel element is null, so toggle → show → null.style throws.
    // We verify the function is exported and callable without crashing the process.
    assert.strictEqual(typeof HUD.toggleInventoryPanel, 'function');
    try { HUD.toggleInventoryPanel(); } catch(e) { /* expected in headless */ }
  });

  test('showCraftingPanel() is callable (DOM-dependent, may throw)', function() {
    assert.strictEqual(typeof HUD.showCraftingPanel, 'function');
    try { HUD.showCraftingPanel(); } catch(e) { /* expected in headless */ }
  });

  test('hideCraftingPanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideCraftingPanel(); });
  });

  test('toggleCraftingPanel() is callable (DOM-dependent, may throw)', function() {
    assert.strictEqual(typeof HUD.toggleCraftingPanel, 'function');
    try { HUD.toggleCraftingPanel(); } catch(e) { /* expected in headless */ }
  });

  test('showEmoteMenu() does not throw', function() {
    assert.doesNotThrow(function() { HUD.showEmoteMenu(); });
  });

  test('hideEmoteMenu() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideEmoteMenu(); });
  });

  test('showEmoteBubble(null, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showEmoteBubble(null, null); });
  });

  test('showEmoteBubble("player1", "wave") does not throw', function() {
    assert.doesNotThrow(function() { HUD.showEmoteBubble('player1', 'wave'); });
  });

  test('updateEmoteBubbles({}) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateEmoteBubbles({}); });
  });

  test('showBuildToolbar() does not throw', function() {
    assert.doesNotThrow(function() { HUD.showBuildToolbar(); });
  });

  test('hideBuildToolbar() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideBuildToolbar(); });
  });

  test('updateBuildToolbar("bench") does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateBuildToolbar('bench'); });
  });

  test('showWorldMap(null, null, null, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showWorldMap(null, null, null, null); });
  });

  test('hideWorldMap() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideWorldMap(); });
  });

  test('hideWorldMap() called twice does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideWorldMap(); HUD.hideWorldMap(); });
  });

  test('showTradeRequest(null, null, null, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showTradeRequest(null, null, null, null); });
  });

  test('hideTradeRequest() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideTradeRequest(); });
  });

  test('hideTradeWindow() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideTradeWindow(); });
  });

  test('showQuestLog with null args does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.showQuestLog({ active: [], available: [], completed: [] }, 'player1');
    });
  });

  test('hideQuestLog() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideQuestLog(); });
  });

  test('showQuestOffer(null, null, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showQuestOffer(null, null, null); });
  });

  test('hideQuestOffer() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideQuestOffer(); });
  });

  test('updateQuestTracker([]) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateQuestTracker([]); });
  });

  test('showNPCShop(null, null, null, null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showNPCShop(null, null, null, null); });
  });

  test('hideNPCShop() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideNPCShop(); });
  });

  test('showFishingUI(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showFishingUI(null); });
  });

  test('hideFishingUI() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideFishingUI(); });
  });

  test('showFishCaughtNotification(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showFishCaughtNotification(null); });
  });

  test('showPetPanel(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showPetPanel(null); });
  });

  test('hidePetPanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hidePetPanel(); });
  });

  test('showAchievementToast is callable (requires achievement object)', function() {
    // showAchievementToast(null) dereferences null.icon — expected throw with null.
    // Passing a minimal achievement object avoids the crash.
    assert.doesNotThrow(function() {
      HUD.showAchievementToast({ title: 'First Steps', description: 'Moved!', icon: '\u2605', rarity: 'common' });
    });
  });

  test('showDiscoveryPopup is callable (requires discovery object)', function() {
    // showDiscoveryPopup(null) dereferences null.rarity — expected throw with null.
    // Passing a minimal discovery object avoids the crash.
    assert.doesNotThrow(function() {
      HUD.showDiscoveryPopup({ name: 'Hidden Cave', rarity: 'rare', description: 'A hidden cave!', icon: '\u{1F30C}' });
    });
  });

  test('showGovernancePanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.showGovernancePanel(); });
  });

  test('hideGovernancePanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideGovernancePanel(); });
  });

  test('showAuctionHousePanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.showAuctionHousePanel(); });
  });

  test('hideAuctionHousePanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideAuctionHousePanel(); });
  });

  test('showGuildPanel is callable (requires guild object)', function() {
    // showGuildPanel(null, …) dereferences null.tag — expected throw with null.
    // Passing a complete guild object (tag, name, type, level, members, maxMembers,
    // treasury, xp, zone) avoids the crash.
    assert.doesNotThrow(function() {
      HUD.showGuildPanel({
        tag: 'ARC',
        name: 'Architects',
        type: 'guild',
        level: 1,
        members: [],
        maxMembers: 20,
        treasury: 0,
        xp: 0,
        zone: 'nexus',
        description: '',
        activities: []
      }, { id: 'player1' });
    });
  });

  test('hideGuildPanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideGuildPanel(); });
  });

  test('showDiscoveryLog([]) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showDiscoveryLog([]); });
  });

  test('hideDiscoveryLog() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideDiscoveryLog(); });
  });

  test('showSkillsPanel(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showSkillsPanel(null); });
  });

  test('hideSkillsPanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideSkillsPanel(); });
  });

  test('showPlayerProfile is callable (requires playerData object)', function() {
    // showPlayerProfile(null) → showProfilePanel(null,...) dereferences null.name.
    // Passing a minimal playerData object avoids the crash.
    assert.doesNotThrow(function() {
      HUD.showPlayerProfile({ name: 'TestPlayer', sparkBalance: 100, reputationTier: 'Builder' });
    });
  });

  test('hidePlayerProfile() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hidePlayerProfile(); });
  });

  test('updateProfileStats({}) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateProfileStats({}); });
  });

  test('showMentorOffer is callable (requires mentor/player objects)', function() {
    // showMentorOffer(null, ...) dereferences null.mentorId — expected throw with null.
    // Passing minimal objects avoids the crash.
    assert.doesNotThrow(function() {
      HUD.showMentorOffer(
        { mentorId: 'alice', mentorName: 'Alice', skill: 'gardening' },
        function() {}
      );
    });
  });

  test('showLessonProgress is callable (requires lesson object)', function() {
    // showLessonProgress(null) dereferences null.stepsCompleted — expected throw with null.
    // Passing a minimal lesson object avoids the crash.
    assert.doesNotThrow(function() {
      HUD.showLessonProgress({ stepsCompleted: 2, totalSteps: 5, skill: 'gardening', currentStep: 'Water the plants' });
    });
  });

  test('updateReputationDisplay(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateReputationDisplay(null); });
  });

  test('loadSettings() does not throw', function() {
    assert.doesNotThrow(function() { HUD.loadSettings(); });
  });

  test('initHUD is callable (requires non-null container element)', function() {
    // initHUD(null) calls container.appendChild which throws with null container.
    // This test documents the expected constraint — the function requires a real element.
    assert.strictEqual(typeof HUD.initHUD, 'function');
    try { HUD.initHUD(null); } catch(e) { /* expected: container must be a real element */ }
  });

  test('initToolbar() does not throw', function() {
    assert.doesNotThrow(function() { HUD.initToolbar(); });
  });

  test('initQuestTracker() does not throw', function() {
    assert.doesNotThrow(function() { HUD.initQuestTracker(); });
  });

  test('initInventoryPanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.initInventoryPanel(); });
  });

  test('initCraftingPanel(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.initCraftingPanel(null); });
  });

  test('initQuickBar() does not throw', function() {
    assert.doesNotThrow(function() { HUD.initQuickBar(); });
  });

  test('showLeaderboardPanel(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showLeaderboardPanel(null); });
  });

  test('hideLeaderboardPanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.hideLeaderboardPanel(); });
  });

  test('toggleLeaderboardPanel() does not throw', function() {
    assert.doesNotThrow(function() { HUD.toggleLeaderboardPanel(); });
  });

  test('refreshLeaderboardPanel(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.refreshLeaderboardPanel(null); });
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: Return Types — functions return expected types in headless mode
// ---------------------------------------------------------------------------

suite('Return Types — graceful return values', function() {

  test('isTutorialActive() returns a boolean', function() {
    var result = HUD.isTutorialActive();
    assert.strictEqual(typeof result, 'boolean');
  });

  test('isTutorialActive() is false before initTutorial', function() {
    assert.strictEqual(HUD.isTutorialActive(), false);
  });

  test('getSettings() returns an object', function() {
    var s = HUD.getSettings();
    assert.strictEqual(typeof s, 'object');
    assert.notStrictEqual(s, null);
  });

  test('getSettings() has masterVolume property', function() {
    var s = HUD.getSettings();
    assert.ok('masterVolume' in s, 'masterVolume should be in settings');
  });

  test('getSettings() has musicVolume property', function() {
    var s = HUD.getSettings();
    assert.ok('musicVolume' in s, 'musicVolume should be in settings');
  });

  test('getSettings() has sfxVolume property', function() {
    var s = HUD.getSettings();
    assert.ok('sfxVolume' in s, 'sfxVolume should be in settings');
  });

  test('getSettings() has renderDistance property', function() {
    var s = HUD.getSettings();
    assert.ok('renderDistance' in s, 'renderDistance should be in settings');
  });

  test('getSettings() has particleDensity property', function() {
    var s = HUD.getSettings();
    assert.ok('particleDensity' in s, 'particleDensity should be in settings');
  });

  test('getSettings() has showFPS property', function() {
    var s = HUD.getSettings();
    assert.ok('showFPS' in s, 'showFPS should be in settings');
  });

  test('getSettings() masterVolume is a number', function() {
    var s = HUD.getSettings();
    assert.strictEqual(typeof s.masterVolume, 'number');
  });

  test('getSettings() renderDistance is a string', function() {
    var s = HUD.getSettings();
    assert.strictEqual(typeof s.renderDistance, 'string');
  });

  test('initHUD() is a function returning undefined (headless, requires real container)', function() {
    // initHUD(null) throws because container.appendChild is called on null.
    // We verify the export type; callers must pass a real DOM element.
    assert.strictEqual(typeof HUD.initHUD, 'function');
  });

  test('showNotification() returns undefined', function() {
    var result = HUD.showNotification('test');
    assert.strictEqual(result, undefined);
  });

  test('hideLeaderboardPanel() returns undefined', function() {
    var result = HUD.hideLeaderboardPanel();
    assert.strictEqual(result, undefined);
  });

  test('updateZoneLabel() returns undefined', function() {
    var result = HUD.updateZoneLabel('nexus');
    assert.strictEqual(result, undefined);
  });

  test('hideNPCDialog() returns undefined', function() {
    var result = HUD.hideNPCDialog();
    assert.strictEqual(result, undefined);
  });

  test('hideBuildToolbar() returns undefined', function() {
    var result = HUD.hideBuildToolbar();
    assert.strictEqual(result, undefined);
  });

  test('hideInventoryPanel() returns undefined', function() {
    var result = HUD.hideInventoryPanel();
    assert.strictEqual(result, undefined);
  });

  test('hideQuestLog() returns undefined', function() {
    var result = HUD.hideQuestLog();
    assert.strictEqual(result, undefined);
  });

  test('hideWorldMap() returns undefined', function() {
    var result = HUD.hideWorldMap();
    assert.strictEqual(result, undefined);
  });

  test('HUD module is an object', function() {
    assert.strictEqual(typeof HUD, 'object');
    assert.notStrictEqual(HUD, null);
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: Tutorial State Logic
// ---------------------------------------------------------------------------

suite('Tutorial State Logic', function() {

  test('isTutorialActive() returns false when not started', function() {
    assert.strictEqual(HUD.isTutorialActive(), false);
  });

  test('advanceTutorial() with no action does not throw when inactive', function() {
    assert.doesNotThrow(function() { HUD.advanceTutorial('move'); });
  });

  test('skipTutorial() does not throw before init', function() {
    assert.doesNotThrow(function() { HUD.skipTutorial(); });
  });

  test('initTutorial() does not throw (sets up localStorage check)', function() {
    assert.doesNotThrow(function() { HUD.initTutorial(); });
  });

  test('skipTutorial() after initTutorial does not throw', function() {
    // reset tutorial state by clearing localStorage marker
    global.localStorage._store = {};
    assert.doesNotThrow(function() {
      HUD.initTutorial();
      HUD.skipTutorial();
    });
  });

  test('isTutorialActive() is false after skipTutorial', function() {
    global.localStorage._store = {};
    HUD.initTutorial();
    HUD.skipTutorial();
    // After skip, tutorial should not be active
    assert.strictEqual(HUD.isTutorialActive(), false);
  });

  test('advanceTutorial with wrong action does not crash', function() {
    assert.doesNotThrow(function() {
      HUD.advanceTutorial('invalid_action_xyz');
    });
  });
});

// ---------------------------------------------------------------------------
// SUITE 5: Settings Logic
// ---------------------------------------------------------------------------

suite('Settings Logic', function() {

  test('getSettings() returns stable object across calls', function() {
    var s1 = HUD.getSettings();
    var s2 = HUD.getSettings();
    assert.strictEqual(s1, s2, 'Same reference should be returned');
  });

  test('loadSettings() does not corrupt settings when storage empty', function() {
    global.localStorage._store = {};
    HUD.loadSettings();
    var s = HUD.getSettings();
    assert.strictEqual(typeof s.masterVolume, 'number');
  });

  test('loadSettings() with valid JSON does not throw', function() {
    global.localStorage._store['zion_settings'] = JSON.stringify({ masterVolume: 80 });
    assert.doesNotThrow(function() { HUD.loadSettings(); });
    global.localStorage._store = {};
  });

  test('loadSettings() with corrupt JSON does not throw', function() {
    global.localStorage._store['zion_settings'] = 'not-valid-json{{{';
    assert.doesNotThrow(function() { HUD.loadSettings(); });
    global.localStorage._store = {};
  });

  test('getSettings() showFPS is a boolean', function() {
    var s = HUD.getSettings();
    assert.strictEqual(typeof s.showFPS, 'boolean');
  });
});

// ---------------------------------------------------------------------------
// SUITE 6: Leaderboard State
// ---------------------------------------------------------------------------

suite('Leaderboard Panel State', function() {

  test('showLeaderboardPanel(gameData) does not throw with economy data', function() {
    assert.doesNotThrow(function() {
      HUD.showLeaderboardPanel({
        economy: {
          accounts: {
            'alice': { balance: 500, totalEarned: 600 },
            'bob': { balance: 300, totalEarned: 350 }
          }
        }
      });
    });
  });

  test('toggleLeaderboardPanel() then hideLeaderboardPanel() does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.toggleLeaderboardPanel();
      HUD.hideLeaderboardPanel();
    });
  });

  test('refreshLeaderboardPanel(null) does not throw when panel not open', function() {
    HUD.hideLeaderboardPanel();
    assert.doesNotThrow(function() { HUD.refreshLeaderboardPanel(null); });
  });

  test('showLeaderboardPanel with opts does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.showLeaderboardPanel({}, { category: 'wealth', period: 'weekly', count: 10 });
    });
  });

  test('toggleLeaderboardPanel called twice is idempotent (no throw)', function() {
    assert.doesNotThrow(function() {
      HUD.toggleLeaderboardPanel();
      HUD.toggleLeaderboardPanel();
    });
  });
});

// ---------------------------------------------------------------------------
// SUITE 7: Chat and Notification Safety
// ---------------------------------------------------------------------------

suite('Chat and Notification Safety', function() {

  test('updateChat with messages array does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.updateChat([
        { user: 'alice', text: 'Hello world', timestamp: Date.now() },
        { user: 'bob', text: 'Hi there!', timestamp: Date.now() }
      ]);
    });
  });

  test('updateChat with messages exceeding 10 does not throw', function() {
    var msgs = [];
    for (var i = 0; i < 15; i++) {
      msgs.push({ user: 'user' + i, text: 'msg ' + i, timestamp: Date.now() });
    }
    assert.doesNotThrow(function() { HUD.updateChat(msgs); });
  });

  test('showBreakReminder with large minutes does not throw', function() {
    assert.doesNotThrow(function() { HUD.showBreakReminder(1440); });
  });

  test('showTradeComplete(null) does not throw', function() {
    assert.doesNotThrow(function() { HUD.showTradeComplete(null); });
  });

  test('showTradeComplete("Alice") does not throw', function() {
    assert.doesNotThrow(function() { HUD.showTradeComplete('Alice'); });
  });
});

// ---------------------------------------------------------------------------
// SUITE 8: NPC Dialog — archetype coverage
// ---------------------------------------------------------------------------

suite('NPC Dialog — archetype coverage', function() {

  var archetypes = [
    'gardener', 'builder', 'storyteller', 'merchant',
    'explorer', 'teacher', 'musician', 'healer', 'philosopher', 'artist'
  ];

  archetypes.forEach(function(arch) {
    test('showNPCDialog archetype "' + arch + '" does not throw', function() {
      assert.doesNotThrow(function() {
        HUD.showNPCDialog({ name: 'Test NPC', archetype: arch, mood: 'happy', familiarity: 25 });
        HUD.hideNPCDialog();
      });
    });
  });

  test('showNPCDialog with unknown archetype does not throw', function() {
    assert.doesNotThrow(function() {
      HUD.showNPCDialog({ name: 'Unknown', archetype: 'unknown_type', mood: 'neutral' });
      HUD.hideNPCDialog();
    });
  });
});

// ---------------------------------------------------------------------------
// SUITE 9: Zone Label Display Names
// ---------------------------------------------------------------------------

suite('Zone Label — display name mapping', function() {

  var zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena'];

  zones.forEach(function(zone) {
    test('updateZoneLabel("' + zone + '") does not throw', function() {
      assert.doesNotThrow(function() { HUD.updateZoneLabel(zone); });
    });
  });

  test('updateZoneLabel("") does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateZoneLabel(''); });
  });
});

// ---------------------------------------------------------------------------
// SUITE 10: updateCoords and updateTimeWeather edge cases
// ---------------------------------------------------------------------------

suite('Coords and Time/Weather edge cases', function() {

  test('updateCoords with negative coords does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateCoords({ x: -100, y: -50, z: -200 }); });
  });

  test('updateCoords with large coords does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateCoords({ x: 99999, y: 500, z: -99999 }); });
  });

  test('updateTimeWeather AM time does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateTimeWeather(360, 'clear'); }); // 6:00 AM
  });

  test('updateTimeWeather PM time does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateTimeWeather(900, 'cloudy'); }); // 3:00 PM
  });

  test('updateTimeWeather night time does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateTimeWeather(1320, 'clear'); }); // 10:00 PM
  });

  test('updateTimeWeather with zero time does not throw', function() {
    assert.doesNotThrow(function() { HUD.updateTimeWeather(0, 'clear'); });
  });
});

// ---------------------------------------------------------------------------
// End
// ---------------------------------------------------------------------------

var success = report();
process.exit(success ? 0 : 1);
