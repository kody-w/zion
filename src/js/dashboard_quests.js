// dashboard_quests.js
/**
 * dashboard_quests.js - Quest and Achievement panel for ZION dashboard mode
 *
 * Provides the QUEST & ACHIEVEMENT panel: browse available quests,
 * track progress, view achievements, and claim rewards.
 * UI-only mode — no Three.js or PeerJS dependencies.
 *
 * UMD module: window.DashboardQuests (browser) or module.exports (Node.js)
 * ES5 compatible - uses var declarations
 */
(function(exports) {
  'use strict';

  // =========================================================================
  // CONSTANTS & COLOR PALETTE
  // =========================================================================

  var COLORS = {
    bg:            '#0A0E1A',
    bgPanel:       '#111827',
    bgHeader:      '#0D1321',
    bgCard:        '#161F2E',
    bgCardHover:   '#1A2640',
    border:        '#1E3A5F',
    borderAccent:  '#2A5285',
    accent:        '#DAA520',
    text:          '#E8E0D8',
    textMuted:     '#8A9AB0',
    textDim:       '#4A5A70',
    success:       '#2E7D32',
    warning:       '#F57F17',
    danger:        '#C62828',
    easy:          '#4CAF50',
    medium:        '#FFA726',
    hard:          '#EF5350',
    legendary:     '#9b59b6',
    bronze:        '#CD7F32',
    silver:        '#C0C0C0',
    gold:          '#FFD700',
    platinum:      '#E5E4E2'
  };

  var DIFFICULTY_COLORS = {
    easy:      '#4CAF50',
    medium:    '#FFA726',
    hard:      '#EF5350',
    legendary: '#9b59b6'
  };

  var TIER_COLORS = {
    bronze:   '#CD7F32',
    silver:   '#C0C0C0',
    gold:     '#FFD700',
    platinum: '#E5E4E2'
  };

  var CATEGORY_ICONS = {
    exploration: '[EX]',
    social:      '[SO]',
    crafting:    '[CR]',
    economy:     '[EC]',
    minigame:    '[MG]'
  };

  var TIER_ICONS = {
    bronze:   '[B]',
    silver:   '[S]',
    gold:     '[G]',
    platinum: '[P]'
  };

  // =========================================================================
  // QUEST CATALOG (30 quests)
  // =========================================================================

  var QUEST_CATALOG = {

    // ---- Exploration (6) ----
    explore_all_zones: {
      id: 'explore_all_zones',
      title: 'World Walker',
      desc: 'Visit all 8 zones in ZION',
      category: 'exploration',
      difficulty: 'medium',
      reward: { spark: 50, item: 'compass' },
      objectives: [{ type: 'visit_zone', target: 8, desc: 'Zones visited' }]
    },
    discover_landmarks: {
      id: 'discover_landmarks',
      title: 'Landmark Seeker',
      desc: 'Discover 5 hidden landmarks',
      category: 'exploration',
      difficulty: 'hard',
      reward: { spark: 100, item: 'telescope' },
      objectives: [{ type: 'discover', target: 5, desc: 'Landmarks found' }]
    },
    map_the_wilds: {
      id: 'map_the_wilds',
      title: 'Cartographer',
      desc: 'Explore every corner of the Wilds',
      category: 'exploration',
      difficulty: 'medium',
      reward: { spark: 40, item: 'map_fragment' },
      objectives: [{ type: 'explore_area', target: 100, desc: '% explored' }]
    },
    night_walker: {
      id: 'night_walker',
      title: 'Night Walker',
      desc: 'Explore 3 zones during nighttime',
      category: 'exploration',
      difficulty: 'easy',
      reward: { spark: 25 },
      objectives: [{ type: 'night_visit', target: 3, desc: 'Night zones visited' }]
    },
    summit_seeker: {
      id: 'summit_seeker',
      title: 'Summit Seeker',
      desc: 'Reach the highest point in ZION',
      category: 'exploration',
      difficulty: 'hard',
      reward: { spark: 75, item: 'star_fragment' },
      objectives: [{ type: 'reach_height', target: 1, desc: 'Summit reached' }]
    },
    cave_diver: {
      id: 'cave_diver',
      title: 'Cave Diver',
      desc: 'Explore 3 underground caves',
      category: 'exploration',
      difficulty: 'medium',
      reward: { spark: 45, item: 'crystal' },
      objectives: [{ type: 'explore_cave', target: 3, desc: 'Caves explored' }]
    },

    // ---- Social (6) ----
    make_friends: {
      id: 'make_friends',
      title: 'Social Butterfly',
      desc: 'Reach Friend tier with 5 NPCs',
      category: 'social',
      difficulty: 'medium',
      reward: { spark: 60, item: 'gold_ring' },
      objectives: [{ type: 'friendship_tier', target: 5, desc: 'NPC friends made' }]
    },
    join_guild: {
      id: 'join_guild',
      title: 'Strength in Numbers',
      desc: 'Join or create a guild',
      category: 'social',
      difficulty: 'easy',
      reward: { spark: 20 },
      objectives: [{ type: 'guild_action', target: 1, desc: 'Guild joined' }]
    },
    chat_master: {
      id: 'chat_master',
      title: 'Chatterbox',
      desc: 'Send 50 chat messages',
      category: 'social',
      difficulty: 'easy',
      reward: { spark: 15 },
      objectives: [{ type: 'send_message', target: 50, desc: 'Messages sent' }]
    },
    mentor_someone: {
      id: 'mentor_someone',
      title: 'Guiding Light',
      desc: 'Complete 3 mentoring sessions',
      category: 'social',
      difficulty: 'hard',
      reward: { spark: 80 },
      objectives: [{ type: 'mentor', target: 3, desc: 'Sessions completed' }]
    },
    attend_event: {
      id: 'attend_event',
      title: 'Community Spirit',
      desc: 'Participate in 5 world events',
      category: 'social',
      difficulty: 'medium',
      reward: { spark: 50 },
      objectives: [{ type: 'join_event', target: 5, desc: 'Events attended' }]
    },
    trade_partner: {
      id: 'trade_partner',
      title: 'Trade Partner',
      desc: 'Complete trades with 10 different players',
      category: 'social',
      difficulty: 'hard',
      reward: { spark: 70, item: 'trade_permit' },
      objectives: [{ type: 'unique_trades', target: 10, desc: 'Trade partners' }]
    },

    // ---- Crafting (6) ----
    first_craft: {
      id: 'first_craft',
      title: 'Apprentice Crafter',
      desc: 'Craft your first item',
      category: 'crafting',
      difficulty: 'easy',
      reward: { spark: 10 },
      objectives: [{ type: 'craft', target: 1, desc: 'Items crafted' }]
    },
    master_smith: {
      id: 'master_smith',
      title: 'Master Smith',
      desc: 'Craft 10 iron items',
      category: 'crafting',
      difficulty: 'hard',
      reward: { spark: 100, item: 'iron_sword' },
      objectives: [{ type: 'craft_category', target: 10, desc: 'Iron items crafted' }]
    },
    recipe_collector: {
      id: 'recipe_collector',
      title: 'Recipe Collector',
      desc: 'Learn 15 crafting recipes',
      category: 'crafting',
      difficulty: 'medium',
      reward: { spark: 55 },
      objectives: [{ type: 'learn_recipe', target: 15, desc: 'Recipes learned' }]
    },
    resource_gatherer: {
      id: 'resource_gatherer',
      title: 'Gatherer',
      desc: 'Collect 100 resources of any type',
      category: 'crafting',
      difficulty: 'medium',
      reward: { spark: 35 },
      objectives: [{ type: 'gather', target: 100, desc: 'Resources gathered' }]
    },
    alchemist: {
      id: 'alchemist',
      title: 'Alchemist',
      desc: 'Brew 5 potions',
      category: 'crafting',
      difficulty: 'medium',
      reward: { spark: 45, item: 'herb_pouch' },
      objectives: [{ type: 'craft_item', target: 5, targetItem: 'potion', desc: 'Potions brewed' }]
    },
    legendary_craft: {
      id: 'legendary_craft',
      title: 'Legendary Artisan',
      desc: 'Craft a legendary item',
      category: 'crafting',
      difficulty: 'legendary',
      reward: { spark: 200 },
      objectives: [{ type: 'craft_rarity', target: 1, targetRarity: 'legendary', desc: 'Legendary items crafted' }]
    },

    // ---- Economy (6) ----
    first_sale: {
      id: 'first_sale',
      title: 'Open for Business',
      desc: 'Sell an item on the market',
      category: 'economy',
      difficulty: 'easy',
      reward: { spark: 10 },
      objectives: [{ type: 'market_sell', target: 1, desc: 'Items listed' }]
    },
    spark_saver: {
      id: 'spark_saver',
      title: 'Spark Saver',
      desc: 'Accumulate 500 Spark',
      category: 'economy',
      difficulty: 'hard',
      reward: { spark: 50 },
      objectives: [{ type: 'balance_reach', target: 500, desc: 'Spark accumulated' }]
    },
    market_mogul: {
      id: 'market_mogul',
      title: 'Market Mogul',
      desc: 'Complete 25 market transactions',
      category: 'economy',
      difficulty: 'hard',
      reward: { spark: 120 },
      objectives: [{ type: 'market_tx', target: 25, desc: 'Transactions' }]
    },
    generous_soul: {
      id: 'generous_soul',
      title: 'Generous Soul',
      desc: 'Gift 100 Spark to other players',
      category: 'economy',
      difficulty: 'medium',
      reward: { spark: 30, item: 'gold_dust' },
      objectives: [{ type: 'gift_spark', target: 100, desc: 'Spark gifted' }]
    },
    tax_payer: {
      id: 'tax_payer',
      title: 'Good Citizen',
      desc: 'Pay 50 Spark in taxes',
      category: 'economy',
      difficulty: 'medium',
      reward: { spark: 25 },
      objectives: [{ type: 'tax_paid', target: 50, desc: 'Tax paid' }]
    },
    bargain_hunter: {
      id: 'bargain_hunter',
      title: 'Bargain Hunter',
      desc: 'Buy 10 items below market value',
      category: 'economy',
      difficulty: 'hard',
      reward: { spark: 60 },
      objectives: [{ type: 'bargain_buy', target: 10, desc: 'Bargains found' }]
    },

    // ---- Mini-games (6) ----
    first_catch: {
      id: 'first_catch',
      title: 'Gone Fishing',
      desc: 'Catch your first fish',
      category: 'minigame',
      difficulty: 'easy',
      reward: { spark: 10 },
      objectives: [{ type: 'catch_fish', target: 1, desc: 'Fish caught' }]
    },
    card_collector: {
      id: 'card_collector',
      title: 'Card Collector',
      desc: 'Collect 20 unique cards',
      category: 'minigame',
      difficulty: 'medium',
      reward: { spark: 40 },
      objectives: [{ type: 'collect_cards', target: 20, desc: 'Cards collected' }]
    },
    dungeon_clear: {
      id: 'dungeon_clear',
      title: 'Dungeon Delver',
      desc: 'Clear 3 dungeons',
      category: 'minigame',
      difficulty: 'hard',
      reward: { spark: 80, item: 'crystal' },
      objectives: [{ type: 'clear_dungeon', target: 3, desc: 'Dungeons cleared' }]
    },
    stargazer: {
      id: 'stargazer',
      title: 'Stargazer',
      desc: 'Identify 6 constellations',
      category: 'minigame',
      difficulty: 'medium',
      reward: { spark: 35, item: 'star_chart' },
      objectives: [{ type: 'identify_constellation', target: 6, desc: 'Constellations found' }]
    },
    time_capsule_writer: {
      id: 'time_capsule_writer',
      title: 'Message in a Bottle',
      desc: 'Bury 3 time capsules',
      category: 'minigame',
      difficulty: 'easy',
      reward: { spark: 20 },
      objectives: [{ type: 'bury_capsule', target: 3, desc: 'Capsules buried' }]
    },
    housing_decorator: {
      id: 'housing_decorator',
      title: 'Interior Designer',
      desc: 'Place 10 furniture items in your house',
      category: 'minigame',
      difficulty: 'medium',
      reward: { spark: 45 },
      objectives: [{ type: 'place_furniture', target: 10, desc: 'Furniture placed' }]
    }
  };

  // =========================================================================
  // ACHIEVEMENT CATALOG (20 achievements)
  // =========================================================================

  var ACHIEVEMENTS = {
    first_steps: {
      id: 'first_steps',
      title: 'First Steps',
      desc: 'Enter ZION for the first time',
      tier: 'bronze',
      points: 5
    },
    zone_traveler: {
      id: 'zone_traveler',
      title: 'Zone Traveler',
      desc: 'Visit 4 different zones',
      tier: 'bronze',
      points: 10
    },
    world_citizen: {
      id: 'world_citizen',
      title: 'World Citizen',
      desc: 'Visit all 8 zones',
      tier: 'silver',
      points: 25
    },
    spark_earner: {
      id: 'spark_earner',
      title: 'Spark Earner',
      desc: 'Earn 100 Spark total',
      tier: 'bronze',
      points: 10
    },
    wealthy: {
      id: 'wealthy',
      title: 'Wealthy',
      desc: 'Hold 1000 Spark at once',
      tier: 'gold',
      points: 50
    },
    quest_starter: {
      id: 'quest_starter',
      title: 'Quest Starter',
      desc: 'Accept your first quest',
      tier: 'bronze',
      points: 5
    },
    quest_master: {
      id: 'quest_master',
      title: 'Quest Master',
      desc: 'Complete 10 quests',
      tier: 'silver',
      points: 30
    },
    quest_legend: {
      id: 'quest_legend',
      title: 'Quest Legend',
      desc: 'Complete 25 quests',
      tier: 'gold',
      points: 75
    },
    crafter: {
      id: 'crafter',
      title: 'Crafter',
      desc: 'Craft 10 items',
      tier: 'bronze',
      points: 10
    },
    master_crafter: {
      id: 'master_crafter',
      title: 'Master Crafter',
      desc: 'Craft 50 items',
      tier: 'silver',
      points: 30
    },
    social_climber: {
      id: 'social_climber',
      title: 'Social Climber',
      desc: 'Reach Friend tier with any NPC',
      tier: 'bronze',
      points: 10
    },
    beloved: {
      id: 'beloved',
      title: 'Beloved',
      desc: 'Reach Confidant tier with 3 NPCs',
      tier: 'gold',
      points: 50
    },
    angler: {
      id: 'angler',
      title: 'Angler',
      desc: 'Catch 25 fish',
      tier: 'silver',
      points: 20
    },
    card_player: {
      id: 'card_player',
      title: 'Card Player',
      desc: 'Win 5 card game battles',
      tier: 'silver',
      points: 20
    },
    dungeon_hero: {
      id: 'dungeon_hero',
      title: 'Dungeon Hero',
      desc: 'Clear a dungeon on hard difficulty',
      tier: 'gold',
      points: 40
    },
    guild_founder: {
      id: 'guild_founder',
      title: 'Guild Founder',
      desc: 'Create a guild',
      tier: 'silver',
      points: 25
    },
    voter: {
      id: 'voter',
      title: 'Civic Duty',
      desc: 'Vote in a zone election',
      tier: 'bronze',
      points: 10
    },
    homeowner: {
      id: 'homeowner',
      title: 'Homeowner',
      desc: 'Claim a housing plot',
      tier: 'silver',
      points: 20
    },
    composer: {
      id: 'composer',
      title: 'Composer',
      desc: 'Create a music composition',
      tier: 'bronze',
      points: 15
    },
    completionist: {
      id: 'completionist',
      title: 'Completionist',
      desc: 'Earn all other achievements',
      tier: 'platinum',
      points: 200
    }
  };

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  function _escapeHtml(str) {
    if (typeof str !== 'string') { return String(str); }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _pad(n, width) {
    var s = String(n);
    while (s.length < width) { s = '0' + s; }
    return s;
  }

  /**
   * Render a text progress bar: [####------] 4/10
   */
  function _progressBar(current, target, width) {
    width = width || 10;
    var pct = (target > 0) ? Math.min(1, current / target) : 0;
    var filled = Math.round(pct * width);
    var empty = width - filled;
    var bar = '';
    for (var i = 0; i < filled; i++) { bar += '#'; }
    for (var j = 0; j < empty; j++) { bar += '-'; }
    return '[' + bar + '] ' + current + '/' + target;
  }

  function _createElement(tag, attrs, innerHTML) {
    if (typeof document === 'undefined') { return null; }
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          if (k === 'style') {
            el.style.cssText = attrs[k];
          } else if (k === 'className') {
            el.className = attrs[k];
          } else if (k.indexOf('data-') === 0) {
            el.setAttribute(k, attrs[k]);
          } else {
            el[k] = attrs[k];
          }
        }
      }
    }
    if (innerHTML !== undefined) {
      el.innerHTML = innerHTML;
    }
    return el;
  }

  function _appendChildren(parent, children) {
    if (!parent) { return; }
    for (var i = 0; i < children.length; i++) {
      if (children[i]) { parent.appendChild(children[i]); }
    }
  }

  // Card style string
  function _cardStyle() {
    return [
      'background:' + COLORS.bgCard,
      'border:1px solid ' + COLORS.border,
      'border-radius:4px',
      'padding:10px',
      'margin-bottom:8px'
    ].join(';');
  }

  function _labelStyle(color) {
    return [
      'display:inline-block',
      'padding:1px 6px',
      'border-radius:3px',
      'font-size:11px',
      'font-weight:bold',
      'color:#fff',
      'background:' + (color || COLORS.textDim),
      'margin-right:4px'
    ].join(';');
  }

  function _progressBarStyle() {
    return [
      'background:' + COLORS.border,
      'border-radius:2px',
      'height:6px',
      'margin:4px 0',
      'overflow:hidden'
    ].join(';');
  }

  function _progressFillStyle(pct, color) {
    return [
      'height:100%',
      'width:' + Math.min(100, pct) + '%',
      'background:' + (color || COLORS.accent),
      'border-radius:2px',
      'transition:width 0.3s'
    ].join(';');
  }

  // =========================================================================
  // QUEST STATE
  // =========================================================================

  /**
   * createQuestState()
   * Returns fresh quest tracking state.
   * active:       { [questId]: { acceptedAt, progress: [number per objective] } }
   * completed:    { [questId]: { completedAt, rewards } }
   * progress:     { [questId]: [current values per objective] }
   * achievements: { [achievementId]: { unlockedAt, points } }
   */
  function createQuestState() {
    return {
      active:       {},
      completed:    {},
      progress:     {},
      achievements: {}
    };
  }

  // =========================================================================
  // QUEST QUERIES
  // =========================================================================

  /**
   * getAvailableQuests(state, playerData)
   * Returns array of quest objects not yet accepted or completed.
   */
  function getAvailableQuests(state, playerData) {
    var result = [];
    for (var id in QUEST_CATALOG) {
      if (!Object.prototype.hasOwnProperty.call(QUEST_CATALOG, id)) { continue; }
      if (state.active[id] || state.completed[id]) { continue; }
      result.push(QUEST_CATALOG[id]);
    }
    return result;
  }

  /**
   * getQuestsByCategory(category)
   * Returns array of quest objects matching the given category.
   */
  function getQuestsByCategory(category) {
    var result = [];
    for (var id in QUEST_CATALOG) {
      if (!Object.prototype.hasOwnProperty.call(QUEST_CATALOG, id)) { continue; }
      if (QUEST_CATALOG[id].category === category) {
        result.push(QUEST_CATALOG[id]);
      }
    }
    return result;
  }

  /**
   * getQuestReward(questId)
   * Returns the reward object for a quest, or null if not found.
   */
  function getQuestReward(questId) {
    var q = QUEST_CATALOG[questId];
    if (!q) { return null; }
    return q.reward;
  }

  // =========================================================================
  // QUEST LIFECYCLE
  // =========================================================================

  /**
   * acceptQuest(state, questId)
   * Accept a quest — initialise progress tracking.
   * Returns { success, state, quest, error }
   */
  function acceptQuest(state, questId) {
    if (!state) { return { success: false, error: 'No state provided' }; }
    var quest = QUEST_CATALOG[questId];
    if (!quest) { return { success: false, error: 'Quest not found: ' + questId }; }
    if (state.active[questId]) { return { success: false, error: 'Quest already active: ' + questId }; }
    if (state.completed[questId]) { return { success: false, error: 'Quest already completed: ' + questId }; }

    // Init progress array (one slot per objective)
    var progress = [];
    for (var i = 0; i < quest.objectives.length; i++) {
      progress.push(0);
    }

    state.active[questId] = { acceptedAt: Date.now(), progress: progress };
    state.progress[questId] = progress;

    return { success: true, state: state, quest: quest };
  }

  /**
   * updateQuestProgress(state, questId, objectiveIndex, amount)
   * Add `amount` to a quest objective's progress counter.
   * Auto-completes quest when all objectives meet their targets.
   * Returns { success, state, completed, rewards, error }
   */
  function updateQuestProgress(state, questId, objectiveIndex, amount) {
    if (!state) { return { success: false, error: 'No state provided' }; }
    if (!state.active[questId]) { return { success: false, error: 'Quest not active: ' + questId }; }
    var quest = QUEST_CATALOG[questId];
    if (!quest) { return { success: false, error: 'Quest not found: ' + questId }; }
    if (objectiveIndex < 0 || objectiveIndex >= quest.objectives.length) {
      return { success: false, error: 'Invalid objective index: ' + objectiveIndex };
    }

    var active = state.active[questId];
    var obj = quest.objectives[objectiveIndex];
    var prev = active.progress[objectiveIndex];
    var newVal = Math.min(obj.target, prev + (amount !== undefined && amount !== null ? amount : 1));
    active.progress[objectiveIndex] = newVal;
    state.progress[questId] = active.progress;

    // Check all objectives complete
    var allDone = true;
    for (var i = 0; i < quest.objectives.length; i++) {
      if (active.progress[i] < quest.objectives[i].target) {
        allDone = false;
        break;
      }
    }

    if (allDone) {
      var result = completeQuest(state, questId);
      return {
        success: true,
        state: state,
        completed: true,
        rewards: result.rewards
      };
    }

    return { success: true, state: state, completed: false, rewards: null };
  }

  /**
   * completeQuest(state, questId)
   * Mark quest complete and record rewards.
   * Returns { success, state, rewards, error }
   */
  function completeQuest(state, questId) {
    if (!state) { return { success: false, error: 'No state provided' }; }
    var quest = QUEST_CATALOG[questId];
    if (!quest) { return { success: false, error: 'Quest not found: ' + questId }; }

    // Allow completing even without being in active (direct complete call)
    if (state.completed[questId]) {
      return { success: false, error: 'Quest already completed: ' + questId };
    }

    // Check objectives if quest is active
    if (state.active[questId]) {
      var active = state.active[questId];
      var allMet = true;
      for (var i = 0; i < quest.objectives.length; i++) {
        if ((active.progress[i] || 0) < quest.objectives[i].target) {
          allMet = false;
          break;
        }
      }
      if (!allMet) {
        return { success: false, error: 'Objectives not yet complete for: ' + questId };
      }
    }

    var rewards = quest.reward || {};
    state.completed[questId] = {
      completedAt: Date.now(),
      rewards: rewards
    };
    delete state.active[questId];
    delete state.progress[questId];

    return { success: true, state: state, rewards: rewards };
  }

  /**
   * abandonQuest(state, questId)
   * Remove from active quests without completing.
   * Returns { success, state, error }
   */
  function abandonQuest(state, questId) {
    if (!state) { return { success: false, error: 'No state provided' }; }
    if (!state.active[questId]) { return { success: false, error: 'Quest not active: ' + questId }; }
    delete state.active[questId];
    delete state.progress[questId];
    return { success: true, state: state };
  }

  /**
   * getQuestProgress(state, questId)
   * Returns array of { desc, current, target, percent } per objective.
   */
  function getQuestProgress(state, questId) {
    var quest = QUEST_CATALOG[questId];
    if (!quest) { return []; }
    var progressArr = (state.progress && state.progress[questId]) ||
                      (state.active && state.active[questId] && state.active[questId].progress) ||
                      [];
    var result = [];
    for (var i = 0; i < quest.objectives.length; i++) {
      var obj = quest.objectives[i];
      var cur = progressArr[i] || 0;
      var pct = obj.target > 0 ? Math.min(100, Math.round((cur / obj.target) * 100)) : 0;
      result.push({
        desc:    obj.desc,
        current: cur,
        target:  obj.target,
        percent: pct
      });
    }
    return result;
  }

  // =========================================================================
  // ACHIEVEMENTS
  // =========================================================================

  /**
   * checkAchievement(state, achievementId, playerData)
   * Returns { unlocked, progress, target } for the given achievement.
   * playerData may supply counters used for progress checks.
   */
  function checkAchievement(state, achievementId, playerData) {
    var ach = ACHIEVEMENTS[achievementId];
    if (!ach) { return { unlocked: false, progress: 0, target: 1 }; }
    var alreadyUnlocked = !!(state.achievements && state.achievements[achievementId]);
    if (alreadyUnlocked) {
      return { unlocked: true, progress: 1, target: 1 };
    }
    // Without live game data we report progress = 0
    var progress = (playerData && playerData[achievementId + '_progress']) || 0;
    var target = (playerData && playerData[achievementId + '_target']) || 1;
    return { unlocked: false, progress: progress, target: target };
  }

  /**
   * unlockAchievement(state, achievementId)
   * Mark achievement as unlocked.
   * Returns { success, state, achievement, points, error }
   */
  function unlockAchievement(state, achievementId) {
    if (!state) { return { success: false, error: 'No state provided' }; }
    var ach = ACHIEVEMENTS[achievementId];
    if (!ach) { return { success: false, error: 'Achievement not found: ' + achievementId }; }
    if (state.achievements[achievementId]) {
      return { success: false, error: 'Achievement already unlocked: ' + achievementId };
    }
    state.achievements[achievementId] = { unlockedAt: Date.now(), points: ach.points };
    return { success: true, state: state, achievement: ach, points: ach.points };
  }

  /**
   * getAchievementProgress(state)
   * Returns { unlocked, total, points, tier }
   * Tier is highest tier fully represented among unlocked achievements.
   */
  function getAchievementProgress(state) {
    var total = Object.keys(ACHIEVEMENTS).length;
    var unlocked = 0;
    var points = 0;
    var hasBronze = false;
    var hasSilver = false;
    var hasGold = false;
    var hasPlatinum = false;

    for (var id in ACHIEVEMENTS) {
      if (!Object.prototype.hasOwnProperty.call(ACHIEVEMENTS, id)) { continue; }
      var ach = ACHIEVEMENTS[id];
      if (state.achievements && state.achievements[id]) {
        unlocked++;
        points += ach.points;
        if (ach.tier === 'bronze')   { hasBronze = true; }
        if (ach.tier === 'silver')   { hasSilver = true; }
        if (ach.tier === 'gold')     { hasGold = true; }
        if (ach.tier === 'platinum') { hasPlatinum = true; }
      }
    }

    var tier = 'bronze';
    if (hasPlatinum) { tier = 'platinum'; }
    else if (hasGold) { tier = 'gold'; }
    else if (hasSilver) { tier = 'silver'; }
    else if (hasBronze) { tier = 'bronze'; }

    return { unlocked: unlocked, total: total, points: points, tier: tier };
  }

  // =========================================================================
  // COMPLETION SUMMARY
  // =========================================================================

  /**
   * getCompletionSummary(state)
   * Returns { questsCompleted, totalQuests, achievementsUnlocked, totalAchievements, totalPoints }
   */
  function getCompletionSummary(state) {
    var questsCompleted = state.completed ? Object.keys(state.completed).length : 0;
    var totalQuests = Object.keys(QUEST_CATALOG).length;
    var achProg = getAchievementProgress(state);
    return {
      questsCompleted:       questsCompleted,
      totalQuests:           totalQuests,
      achievementsUnlocked:  achProg.unlocked,
      totalAchievements:     achProg.total,
      totalPoints:           achProg.points
    };
  }

  // =========================================================================
  // COLOR HELPERS
  // =========================================================================

  /**
   * getDifficultyColor(difficulty)
   */
  function getDifficultyColor(difficulty) {
    return DIFFICULTY_COLORS[difficulty] || COLORS.textMuted;
  }

  /**
   * getTierColor(tier)
   */
  function getTierColor(tier) {
    return TIER_COLORS[tier] || COLORS.textMuted;
  }

  // =========================================================================
  // FORMATTING
  // =========================================================================

  /**
   * formatQuestCard(quest, progress, status)
   * Returns HTML string for a quest card.
   * progress: array of { desc, current, target, percent } (from getQuestProgress)
   * status: 'available' | 'active' | 'completed'
   */
  function formatQuestCard(quest, progress, status) {
    if (!quest) { return '<div style="color:#666">Quest not found</div>'; }
    progress = progress || [];
    status = status || 'available';

    var diffColor = getDifficultyColor(quest.difficulty);
    var catIcon = CATEGORY_ICONS[quest.category] || '[?]';
    var statusLabel = status === 'available' ? '[Available]' :
                      status === 'active'    ? '[Active]' :
                                              '[Complete]';
    var statusColor = status === 'available' ? COLORS.textMuted :
                      status === 'active'    ? COLORS.accent :
                                              COLORS.success;

    var html = '';
    html += '<div style="' + _cardStyle() + '">';

    // Header row
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
    html += '<span style="font-weight:bold;color:' + COLORS.text + '">' + _escapeHtml(quest.title) + '</span>';
    html += '<span style="font-size:11px;color:' + statusColor + '">' + statusLabel + '</span>';
    html += '</div>';

    // Category + difficulty row
    html += '<div style="margin-bottom:6px">';
    html += '<span style="' + _labelStyle(COLORS.textDim) + '">' + catIcon + ' ' + _escapeHtml(quest.category) + '</span>';
    html += '<span style="' + _labelStyle(diffColor) + '">(' + _escapeHtml(quest.difficulty.charAt(0).toUpperCase() + quest.difficulty.slice(1)) + ')</span>';
    html += '</div>';

    // Description
    html += '<div style="color:' + COLORS.textMuted + ';font-size:12px;margin-bottom:8px">' + _escapeHtml(quest.desc) + '</div>';

    // Objectives with progress bars
    if (quest.objectives && quest.objectives.length > 0) {
      html += '<div style="margin-bottom:8px">';
      for (var i = 0; i < quest.objectives.length; i++) {
        var obj = quest.objectives[i];
        var prog = progress[i] || { current: 0, target: obj.target, percent: 0, desc: obj.desc };
        var bar = _progressBar(prog.current, prog.target);
        html += '<div style="font-size:11px;color:' + COLORS.textMuted + ';margin-bottom:4px">';
        html += _escapeHtml(prog.desc) + ': ' + bar;
        html += '</div>';
        // Visual progress bar
        html += '<div style="' + _progressBarStyle() + '">';
        html += '<div style="' + _progressFillStyle(prog.percent, diffColor) + '"></div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Reward
    if (quest.reward) {
      html += '<div style="font-size:11px;color:' + COLORS.accent + '">';
      html += 'Reward: ';
      if (quest.reward.spark) { html += quest.reward.spark + ' Spark'; }
      if (quest.reward.item) { html += (quest.reward.spark ? ' + ' : '') + _escapeHtml(quest.reward.item); }
      html += '</div>';
    }

    // Action buttons
    html += '<div style="margin-top:8px;display:flex;gap:6px">';
    if (status === 'available') {
      html += '<button style="background:' + COLORS.accent + ';color:#000;border:none;padding:4px 10px;border-radius:3px;cursor:pointer;font-size:11px">Accept</button>';
    } else if (status === 'active') {
      html += '<button style="background:' + COLORS.danger + ';color:#fff;border:none;padding:4px 10px;border-radius:3px;cursor:pointer;font-size:11px">Abandon</button>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  /**
   * formatAchievementBadge(achievement, unlocked)
   * Returns HTML string for an achievement badge.
   */
  function formatAchievementBadge(achievement, unlocked) {
    if (!achievement) { return '<div style="color:#666">Achievement not found</div>'; }
    var tierColor = getTierColor(achievement.tier);
    var tierIcon = TIER_ICONS[achievement.tier] || '[?]';
    var opacity = unlocked ? '1' : '0.4';
    var lockText = unlocked ? '' : ' [Locked]';

    var html = '';
    html += '<div style="' + [
      'display:inline-block',
      'background:' + COLORS.bgCard,
      'border:2px solid ' + (unlocked ? tierColor : COLORS.border),
      'border-radius:6px',
      'padding:8px',
      'margin:4px',
      'min-width:120px',
      'max-width:160px',
      'vertical-align:top',
      'opacity:' + opacity,
      'text-align:center'
    ].join(';') + '">';

    // Tier badge
    html += '<div style="color:' + tierColor + ';font-weight:bold;font-size:16px;margin-bottom:4px">' + tierIcon + '</div>';

    // Title
    html += '<div style="font-weight:bold;color:' + COLORS.text + ';font-size:12px;margin-bottom:2px">' + _escapeHtml(achievement.title) + lockText + '</div>';

    // Description
    html += '<div style="color:' + COLORS.textMuted + ';font-size:11px;margin-bottom:4px">' + _escapeHtml(achievement.desc) + '</div>';

    // Tier label + points
    html += '<div style="' + _labelStyle(tierColor) + '">' + achievement.tier.toUpperCase() + '</div>';
    html += '<div style="font-size:10px;color:' + COLORS.textDim + ';margin-top:4px">' + achievement.points + ' pts</div>';

    html += '</div>';
    return html;
  }

  // =========================================================================
  // QUEST PANEL DOM (browser only)
  // =========================================================================

  /**
   * createQuestPanel()
   * Returns a DOM element for the quest & achievement panel.
   * Tabs: Available, Active, Completed, Achievements
   */
  function createQuestPanel() {
    if (typeof document === 'undefined') { return null; }

    var panelStyle = [
      'background:' + COLORS.bgPanel,
      'border:1px solid ' + COLORS.border,
      'border-radius:4px',
      'overflow:hidden',
      'min-height:300px',
      'font-family:monospace',
      'font-size:13px',
      'color:' + COLORS.text
    ].join(';');

    var panel = _createElement('div', { style: panelStyle });

    // Header
    var header = _createElement('div', {
      style: [
        'background:' + COLORS.bgHeader,
        'border-bottom:1px solid ' + COLORS.border,
        'padding:10px 14px',
        'font-weight:bold',
        'font-size:14px',
        'color:' + COLORS.accent
      ].join(';')
    }, 'QUESTS & ACHIEVEMENTS');
    panel.appendChild(header);

    // Tab bar
    var tabNames = ['Available', 'Active', 'Completed', 'Achievements'];
    var tabIds   = ['available', 'active', 'completed', 'achievements'];
    var tabBar = _createElement('div', {
      style: [
        'display:flex',
        'border-bottom:1px solid ' + COLORS.border,
        'background:' + COLORS.bgHeader
      ].join(';')
    });

    var tabContents = {};
    var tabButtons = {};

    function _activateTab(id) {
      for (var t in tabContents) {
        tabContents[t].style.display = 'none';
        tabButtons[t].style.borderBottom = '2px solid transparent';
        tabButtons[t].style.color = COLORS.textMuted;
      }
      tabContents[id].style.display = 'block';
      tabButtons[id].style.borderBottom = '2px solid ' + COLORS.accent;
      tabButtons[id].style.color = COLORS.accent;
    }

    for (var ti = 0; ti < tabNames.length; ti++) {
      (function(name, id) {
        var btn = _createElement('button', {
          style: [
            'background:transparent',
            'border:none',
            'border-bottom:2px solid transparent',
            'padding:8px 14px',
            'cursor:pointer',
            'font-size:12px',
            'color:' + COLORS.textMuted,
            'font-family:monospace'
          ].join(';')
        }, name);
        btn.addEventListener('click', function() { _activateTab(id); });
        tabBar.appendChild(btn);
        tabButtons[id] = btn;
      })(tabNames[ti], tabIds[ti]);
    }
    panel.appendChild(tabBar);

    // Tab content areas
    var contentWrap = _createElement('div', {
      style: 'padding:12px;overflow-y:auto;max-height:420px'
    });

    for (var ci = 0; ci < tabIds.length; ci++) {
      (function(id, name) {
        var content = _createElement('div', { style: 'display:none' });
        content.innerHTML = _buildTabContent(id);
        tabContents[id] = content;
        contentWrap.appendChild(content);
      })(tabIds[ci], tabNames[ci]);
    }

    panel.appendChild(contentWrap);

    // Activate first tab
    _activateTab('available');
    return panel;
  }

  /**
   * Build static HTML content for a tab (used in createQuestPanel).
   * In a real integration these would be populated from live state.
   */
  function _buildTabContent(tabId) {
    var html = '';
    if (tabId === 'available') {
      var categories = ['exploration', 'social', 'crafting', 'economy', 'minigame'];
      for (var ci = 0; ci < categories.length; ci++) {
        var cat = categories[ci];
        var quests = getQuestsByCategory(cat);
        if (quests.length === 0) { continue; }
        html += '<div style="margin-bottom:8px;font-size:11px;color:' + COLORS.textDim + ';text-transform:uppercase;letter-spacing:1px">';
        html += (CATEGORY_ICONS[cat] || '') + ' ' + cat;
        html += '</div>';
        for (var qi = 0; qi < quests.length; qi++) {
          html += formatQuestCard(quests[qi], [], 'available');
        }
      }
    } else if (tabId === 'active') {
      html += '<div style="color:' + COLORS.textMuted + ';font-size:12px">No active quests. Accept quests from the Available tab.</div>';
    } else if (tabId === 'completed') {
      html += '<div style="color:' + COLORS.textMuted + ';font-size:12px">No completed quests yet.</div>';
    } else if (tabId === 'achievements') {
      html += '<div style="margin-bottom:10px;font-size:12px;color:' + COLORS.textMuted + '">0 / ' + Object.keys(ACHIEVEMENTS).length + ' achievements unlocked</div>';
      for (var id in ACHIEVEMENTS) {
        if (!Object.prototype.hasOwnProperty.call(ACHIEVEMENTS, id)) { continue; }
        html += formatAchievementBadge(ACHIEVEMENTS[id], false);
      }
    }
    return html;
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.QUEST_CATALOG       = QUEST_CATALOG;
  exports.ACHIEVEMENTS        = ACHIEVEMENTS;
  exports.DIFFICULTY_COLORS   = DIFFICULTY_COLORS;
  exports.TIER_COLORS         = TIER_COLORS;

  // State
  exports.createQuestState        = createQuestState;

  // Queries
  exports.getAvailableQuests      = getAvailableQuests;
  exports.getQuestsByCategory     = getQuestsByCategory;
  exports.getQuestReward          = getQuestReward;
  exports.getQuestProgress        = getQuestProgress;
  exports.getAchievementProgress  = getAchievementProgress;
  exports.getCompletionSummary    = getCompletionSummary;

  // Lifecycle
  exports.acceptQuest             = acceptQuest;
  exports.updateQuestProgress     = updateQuestProgress;
  exports.completeQuest           = completeQuest;
  exports.abandonQuest            = abandonQuest;

  // Achievements
  exports.checkAchievement        = checkAchievement;
  exports.unlockAchievement       = unlockAchievement;

  // Formatting
  exports.formatQuestCard         = formatQuestCard;
  exports.formatAchievementBadge  = formatAchievementBadge;

  // Color helpers
  exports.getDifficultyColor      = getDifficultyColor;
  exports.getTierColor            = getTierColor;

  // DOM panel (browser)
  exports.createQuestPanel        = createQuestPanel;

})(typeof module !== 'undefined' ? module.exports : (window.DashboardQuests = {}));
