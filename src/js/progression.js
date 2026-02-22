// progression.js
/**
 * ZION Player Progression & Skill Tree System
 * XP tracking, leveling, and six-tree skill advancement
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // XP SOURCES
  // ============================================================================

  var XP_SOURCES = {
    crafting:       10,
    trading:        15,
    fishing:         8,
    dungeon_clear:  50,
    card_win:       20,
    quest_complete: 25,
    gathering:       5,
    social:         10,
    exploring:      12,
    teaching:       30
  };

  // ============================================================================
  // SKILL TREES
  // ============================================================================

  var SKILL_TREES = {
    crafting: {
      name: 'Artisan',
      tiers: [
        'Novice Crafter',
        'Journeyman',
        'Artisan',
        'Master Artisan',
        'Grand Artisan'
      ],
      perks: [
        'craft_speed_10',
        'craft_speed_25',
        'rare_recipe_unlock',
        'craft_crit_chance',
        'masterwork_chance'
      ]
    },
    combat: {
      name: 'Warrior',
      tiers: [
        'Recruit',
        'Fighter',
        'Warrior',
        'Champion',
        'Legend'
      ],
      perks: [
        'damage_10',
        'defense_10',
        'dungeon_loot_bonus',
        'boss_damage_25',
        'double_loot'
      ]
    },
    gathering: {
      name: 'Harvester',
      tiers: [
        'Forager',
        'Gatherer',
        'Harvester',
        'Expert Harvester',
        "Nature's Hand"
      ],
      perks: [
        'gather_speed_10',
        'rare_resource_5',
        'double_gather_10',
        'auto_replant',
        'legendary_resource'
      ]
    },
    social: {
      name: 'Diplomat',
      tiers: [
        'Newcomer',
        'Socialite',
        'Diplomat',
        'Ambassador',
        'Elder'
      ],
      perks: [
        'trade_discount_5',
        'npc_friendship_bonus',
        'guild_bonus',
        'reputation_gain_25',
        'zone_influence'
      ]
    },
    exploration: {
      name: 'Pathfinder',
      tiers: [
        'Wanderer',
        'Scout',
        'Pathfinder',
        'Trailblazer',
        'World Walker'
      ],
      perks: [
        'travel_cost_10',
        'map_reveal',
        'fast_travel_unlock',
        'hidden_area_access',
        'teleport_anywhere'
      ]
    },
    knowledge: {
      name: 'Scholar',
      tiers: [
        'Student',
        'Apprentice',
        'Scholar',
        'Sage',
        'Archmage'
      ],
      perks: [
        'xp_gain_10',
        'lesson_bonus',
        'research_unlock',
        'teach_mastery',
        'enlightenment'
      ]
    }
  };

  // Tier costs: tier index 0→1pt, 1→2pt, 2→3pt, 3→4pt, 4→5pt
  var TIER_COSTS = [1, 2, 3, 4, 5];

  // ============================================================================
  // LEVEL TITLES
  // ============================================================================

  var LEVEL_TITLES = [
    { min: 1,  max: 5,  title: 'Newcomer'    },
    { min: 6,  max: 10, title: 'Initiate'    },
    { min: 11, max: 15, title: 'Adventurer'  },
    { min: 16, max: 20, title: 'Journeyman'  },
    { min: 21, max: 25, title: 'Veteran'     },
    { min: 26, max: 30, title: 'Expert'      },
    { min: 31, max: 35, title: 'Master'      },
    { min: 36, max: 40, title: 'Grand Master' },
    { min: 41, max: 45, title: 'Champion'    },
    { min: 46, max: 50, title: 'Legend'      }
  ];

  var MAX_LEVEL = 50;

  // ============================================================================
  // PERK DESCRIPTIONS
  // ============================================================================

  var PERK_DESCRIPTIONS = {
    craft_speed_10:       '+10% crafting speed',
    craft_speed_25:       '+25% crafting speed',
    rare_recipe_unlock:   'Unlock rare crafting recipes',
    craft_crit_chance:    '15% chance to craft double items',
    masterwork_chance:    '10% chance to craft masterwork quality',
    damage_10:            '+10% damage output',
    defense_10:           '+10% defense',
    dungeon_loot_bonus:   '+20% dungeon loot',
    boss_damage_25:       '+25% damage to bosses',
    double_loot:          '10% chance to double all loot',
    gather_speed_10:      '+10% gathering speed',
    rare_resource_5:      '+5% chance to find rare resources',
    double_gather_10:     '10% chance to gather double resources',
    auto_replant:         'Automatically replant harvested crops',
    legendary_resource:   '1% chance to find legendary resources',
    trade_discount_5:     '-5% trading fees',
    npc_friendship_bonus: '+25% NPC friendship gain',
    guild_bonus:          '+15% guild activity rewards',
    reputation_gain_25:   '+25% reputation gain',
    zone_influence:       'Gain influence over a zone',
    travel_cost_10:       '-10% fast travel cost',
    map_reveal:           'Reveal nearby map areas automatically',
    fast_travel_unlock:   'Unlock additional fast travel points',
    hidden_area_access:   'Access hidden exploration areas',
    teleport_anywhere:    'Teleport to any visited location',
    xp_gain_10:           '+10% XP from all sources',
    lesson_bonus:         '+20% XP when learning from NPCs',
    research_unlock:      'Unlock research projects',
    teach_mastery:        'Double XP awarded when teaching others',
    enlightenment:        '+50% XP from all sources for 1 hour daily'
  };

  // ============================================================================
  // CORE LEVEL MATH
  // ============================================================================

  /**
   * Calculate level from total XP.
   * level = floor(sqrt(totalXP / 100)) + 1, capped at MAX_LEVEL
   * @param {number} totalXP
   * @returns {number} level 1..50
   */
  function getLevel(totalXP) {
    if (totalXP < 0) totalXP = 0;
    var raw = Math.floor(Math.sqrt(totalXP / 100)) + 1;
    return Math.min(raw, MAX_LEVEL);
  }

  /**
   * Calculate XP required to reach a specific level.
   * xp = (level - 1)^2 * 100
   * @param {number} level
   * @returns {number} XP threshold
   */
  function getXPForLevel(level) {
    if (level < 1) level = 1;
    if (level > MAX_LEVEL) level = MAX_LEVEL;
    return (level - 1) * (level - 1) * 100;
  }

  /**
   * XP needed to reach the next level from current state.
   * @param {Object} state player progression state
   * @returns {number} XP remaining to next level (0 if at max level)
   */
  function getXPToNextLevel(state) {
    var currentLevel = getLevel(state.totalXP);
    if (currentLevel >= MAX_LEVEL) return 0;
    var nextLevelXP = getXPForLevel(currentLevel + 1);
    return nextLevelXP - state.totalXP;
  }

  // ============================================================================
  // PLAYER STATE
  // ============================================================================

  /**
   * Create a fresh player progression object.
   * @param {string} playerId
   * @returns {Object}
   */
  function createPlayerProgression(playerId) {
    return {
      playerId:     playerId,
      totalXP:      0,
      level:        1,
      skillPoints:  0,
      skills: {
        crafting:    0,
        combat:      0,
        gathering:   0,
        social:      0,
        exploration: 0,
        knowledge:   0
      },
      xpHistory: [],
      perks:     []
    };
  }

  // ============================================================================
  // XP & LEVELING
  // ============================================================================

  /**
   * Award XP to a player, handling level-ups and skill point grants.
   * @param {Object} state  player progression state (not mutated — returns new state)
   * @param {string} source XP source key from XP_SOURCES or custom
   * @param {number} amount  XP amount (defaults to XP_SOURCES[source] if omitted)
   * @returns {{ state, leveled, newLevel, skillPointsGained, message }}
   */
  function awardXP(state, source, amount) {
    // Determine XP amount
    var xpAmount = (typeof amount === 'number') ? amount : (XP_SOURCES[source] || 0);

    // Apply knowledge perk: xp_gain_10 gives +10%
    if (hasPerks(state, 'xp_gain_10')) {
      xpAmount = Math.floor(xpAmount * 1.10);
    }
    // enlightenment: +50% (stacks additively on top of xp_gain_10 if both present)
    if (hasPerks(state, 'enlightenment')) {
      xpAmount = Math.floor(xpAmount * 1.50);
    }
    // lesson_bonus: +20% when source is social/teaching
    if (hasPerks(state, 'lesson_bonus') && (source === 'social' || source === 'teaching')) {
      xpAmount = Math.floor(xpAmount * 1.20);
    }
    // teach_mastery: double XP from teaching
    if (hasPerks(state, 'teach_mastery') && source === 'teaching') {
      xpAmount = Math.floor(xpAmount * 2);
    }

    var oldLevel   = getLevel(state.totalXP);
    var newTotalXP = state.totalXP + xpAmount;

    // Cap at max-level XP ceiling so we never exceed getXPForLevel(MAX_LEVEL+1) in a meaningful way
    var newLevel = getLevel(newTotalXP);
    var leveled  = newLevel > oldLevel;
    var skillPointsGained = leveled ? (newLevel - oldLevel) : 0;

    // Build updated history entry
    var historyEntry = {
      source:    source,
      amount:    xpAmount,
      timestamp: Date.now(),
      totalAfter: newTotalXP
    };

    // Build new state (immutable-style copy)
    var newState = _cloneState(state);
    newState.totalXP     = newTotalXP;
    newState.level       = newLevel;
    newState.skillPoints = (newState.skillPoints || 0) + skillPointsGained;
    newState.xpHistory   = (newState.xpHistory || []).concat([historyEntry]);

    var message;
    if (leveled) {
      message = 'Level up! You are now level ' + newLevel + '. Gained ' + skillPointsGained + ' skill point(s).';
    } else {
      message = 'Gained ' + xpAmount + ' XP from ' + source + '.';
    }

    return {
      state:             newState,
      leveled:           leveled,
      newLevel:          newLevel,
      skillPointsGained: skillPointsGained,
      message:           message
    };
  }

  // ============================================================================
  // SKILL POINTS & TREES
  // ============================================================================

  /**
   * Get the current tier (0–5) for a skill tree.
   * 0 = no tier unlocked, 5 = all tiers unlocked.
   * @param {Object} state
   * @param {string} tree  tree key
   * @returns {number} 0..5
   */
  function getSkillTier(state, tree) {
    if (!state.skills || typeof state.skills[tree] === 'undefined') return 0;
    return state.skills[tree];
  }

  /**
   * Spend a skill point to unlock the next tier in a tree.
   * @param {Object} state
   * @param {string} tree
   * @returns {{ state, success, perk, tierName, message }}
   */
  function spendSkillPoint(state, tree) {
    var treeData = SKILL_TREES[tree];
    if (!treeData) {
      return {
        state:    state,
        success:  false,
        perk:     null,
        tierName: null,
        message:  'Unknown skill tree: ' + tree
      };
    }

    var currentTier = getSkillTier(state, tree);
    var maxTiers    = treeData.tiers.length; // 5

    if (currentTier >= maxTiers) {
      return {
        state:    state,
        success:  false,
        perk:     null,
        tierName: null,
        message:  'Tree "' + treeData.name + '" is already fully unlocked.'
      };
    }

    var cost = TIER_COSTS[currentTier]; // index 0 costs 1pt, etc.
    if ((state.skillPoints || 0) < cost) {
      return {
        state:    state,
        success:  false,
        perk:     null,
        tierName: null,
        message:  'Not enough skill points. Need ' + cost + ', have ' + (state.skillPoints || 0) + '.'
      };
    }

    var newTier    = currentTier + 1;
    var perkId     = treeData.perks[currentTier];
    var tierName   = treeData.tiers[currentTier];

    var newState = _cloneState(state);
    newState.skills       = _cloneSkills(state.skills);
    newState.skills[tree] = newTier;
    newState.skillPoints  = (state.skillPoints || 0) - cost;
    newState.perks        = (state.perks || []).concat([perkId]);

    return {
      state:    newState,
      success:  true,
      perk:     perkId,
      tierName: tierName,
      message:  'Unlocked ' + tierName + ' in ' + treeData.name + '. Perk: ' + (PERK_DESCRIPTIONS[perkId] || perkId)
    };
  }

  // ============================================================================
  // PERK SYSTEM
  // ============================================================================

  /**
   * Check if a player has a specific perk active.
   * @param {Object} state
   * @param {string} perkId
   * @returns {boolean}
   */
  function hasPerks(state, perkId) {
    if (!state || !state.perks) return false;
    return state.perks.indexOf(perkId) !== -1;
  }

  /**
   * Get all active perks with descriptions.
   * @param {Object} state
   * @returns {Array<{ perkId, description, tree, tier }>}
   */
  function getActivePerks(state) {
    if (!state || !state.perks || state.perks.length === 0) return [];

    return state.perks.map(function(perkId) {
      // Find which tree + tier this perk belongs to
      var treeName = null;
      var tierIdx  = -1;
      var treeKey  = null;
      var keys = Object.keys(SKILL_TREES);
      for (var i = 0; i < keys.length; i++) {
        var k    = keys[i];
        var idx  = SKILL_TREES[k].perks.indexOf(perkId);
        if (idx !== -1) {
          treeName = SKILL_TREES[k].name;
          tierIdx  = idx + 1; // 1-based tier number
          treeKey  = k;
          break;
        }
      }
      return {
        perkId:      perkId,
        description: PERK_DESCRIPTIONS[perkId] || perkId,
        tree:        treeName,
        tier:        tierIdx
      };
    });
  }

  /**
   * Apply perk modifications to a base action value.
   * Handles numeric scaling perks based on action type.
   * @param {Object} state
   * @param {string} action  action keyword (e.g. 'craft', 'gather', 'trade', 'dungeon', 'xp')
   * @param {number} baseValue
   * @returns {number} modified value
   */
  function applyPerkBonus(state, action, baseValue) {
    var value = baseValue;

    switch (action) {
      case 'craft':
      case 'crafting':
        if (hasPerks(state, 'craft_speed_10')) value = value * 1.10;
        if (hasPerks(state, 'craft_speed_25')) value = value * 1.25;
        break;

      case 'gather':
      case 'gathering':
        if (hasPerks(state, 'gather_speed_10')) value = value * 1.10;
        if (hasPerks(state, 'double_gather_10')) {
          // probabilistic bonus — represented as expected value +10%
          value = value * 1.10;
        }
        break;

      case 'trade':
      case 'trading':
        if (hasPerks(state, 'trade_discount_5')) value = value * 0.95;
        break;

      case 'dungeon':
      case 'dungeon_loot':
        if (hasPerks(state, 'dungeon_loot_bonus')) value = value * 1.20;
        if (hasPerks(state, 'double_loot'))         value = value * 1.10;
        break;

      case 'damage':
        if (hasPerks(state, 'damage_10'))     value = value * 1.10;
        if (hasPerks(state, 'boss_damage_25')) value = value * 1.25;
        break;

      case 'defense':
        if (hasPerks(state, 'defense_10')) value = value * 1.10;
        break;

      case 'xp':
        if (hasPerks(state, 'xp_gain_10'))   value = value * 1.10;
        if (hasPerks(state, 'enlightenment')) value = value * 1.50;
        break;

      case 'reputation':
        if (hasPerks(state, 'reputation_gain_25')) value = value * 1.25;
        break;

      case 'travel':
        if (hasPerks(state, 'travel_cost_10')) value = value * 0.90;
        break;

      case 'lesson':
      case 'teaching':
        if (hasPerks(state, 'lesson_bonus'))  value = value * 1.20;
        if (hasPerks(state, 'teach_mastery')) value = value * 2.00;
        break;

      case 'npc_friendship':
        if (hasPerks(state, 'npc_friendship_bonus')) value = value * 1.25;
        break;

      case 'guild':
        if (hasPerks(state, 'guild_bonus')) value = value * 1.15;
        break;

      default:
        break;
    }

    return value;
  }

  // ============================================================================
  // PROGRESSION SUMMARY
  // ============================================================================

  /**
   * Returns a formatted summary of all skill trees and player progress.
   * @param {Object} state
   * @returns {Object} summary object
   */
  function getProgressionSummary(state) {
    var level     = getLevel(state.totalXP);
    var xpToNext  = getXPToNextLevel(state);
    var xpCurrent = state.totalXP - getXPForLevel(level);
    var xpNeeded  = (level < MAX_LEVEL) ? (getXPForLevel(level + 1) - getXPForLevel(level)) : 0;

    var treesSummary = [];
    var treeKeys = Object.keys(SKILL_TREES);
    for (var i = 0; i < treeKeys.length; i++) {
      var key      = treeKeys[i];
      var tree     = SKILL_TREES[key];
      var tier     = getSkillTier(state, key);
      var perksArr = [];
      for (var t = 0; t < tier; t++) {
        perksArr.push(tree.perks[t]);
      }
      treesSummary.push({
        key:          key,
        name:         tree.name,
        currentTier:  tier,
        maxTiers:     tree.tiers.length,
        tierName:     tier > 0 ? tree.tiers[tier - 1] : 'Unlocked',
        nextTierName: tier < tree.tiers.length ? tree.tiers[tier] : null,
        perksUnlocked: perksArr,
        nextTierCost: tier < TIER_COSTS.length ? TIER_COSTS[tier] : null
      });
    }

    return {
      playerId:        state.playerId,
      level:           level,
      title:           getTitle(level),
      totalXP:         state.totalXP,
      xpCurrentLevel:  xpCurrent,
      xpNeededForNext: xpNeeded,
      xpToNextLevel:   xpToNext,
      progressBar:     formatProgressBar(xpCurrent, xpNeeded),
      skillPoints:     state.skillPoints || 0,
      trees:           treesSummary,
      totalPerks:      (state.perks || []).length,
      perks:           getActivePerks(state)
    };
  }

  // ============================================================================
  // FORMATTING HELPERS
  // ============================================================================

  /**
   * Get the title for a given level.
   * @param {number} level
   * @returns {string}
   */
  function getTitle(level) {
    for (var i = 0; i < LEVEL_TITLES.length; i++) {
      var bracket = LEVEL_TITLES[i];
      if (level >= bracket.min && level <= bracket.max) {
        return bracket.title;
      }
    }
    return 'Legend';
  }

  /**
   * Render an ASCII progress bar.
   * Example: [####------] 40%
   * @param {number} current  current value
   * @param {number} max      maximum value
   * @param {number} [width]  total bar width (default 10)
   * @returns {string}
   */
  function formatProgressBar(current, max, width) {
    width = width || 10;
    if (max <= 0) return '[' + new Array(width + 1).join('#') + '] 100%';
    var ratio   = Math.min(current / max, 1);
    var filled  = Math.floor(ratio * width);
    var empty   = width - filled;
    var pct     = Math.floor(ratio * 100);
    var bar     = '[' + new Array(filled + 1).join('#') + new Array(empty + 1).join('-') + '] ' + pct + '%';
    return bar;
  }

  /**
   * Render an HTML string for a skill tree panel.
   * @param {string} tree       tree key (e.g. 'crafting')
   * @param {number} currentTier current tier (0-5)
   * @returns {string} HTML
   */
  function formatSkillTree(tree, currentTier) {
    var treeData = SKILL_TREES[tree];
    if (!treeData) return '<div class="skill-tree-error">Unknown tree: ' + tree + '</div>';

    currentTier = currentTier || 0;
    var html = '<div class="skill-tree" data-tree="' + tree + '">';
    html += '<h3 class="skill-tree-name">' + treeData.name + '</h3>';
    html += '<div class="skill-tree-tiers">';

    for (var i = 0; i < treeData.tiers.length; i++) {
      var tierName   = treeData.tiers[i];
      var perkId     = treeData.perks[i];
      var isUnlocked = (i < currentTier);
      var isCurrent  = (i === currentTier - 1);
      var isNext     = (i === currentTier);
      var cost       = TIER_COSTS[i];

      var cls = 'skill-tier';
      if (isUnlocked) cls += ' skill-tier--unlocked';
      if (isCurrent)  cls += ' skill-tier--current';
      if (isNext)     cls += ' skill-tier--next';

      html += '<div class="' + cls + '" data-tier="' + (i + 1) + '">';
      html += '<span class="skill-tier-name">' + tierName + '</span>';
      html += '<span class="skill-tier-perk">' + (PERK_DESCRIPTIONS[perkId] || perkId) + '</span>';
      if (!isUnlocked) {
        html += '<span class="skill-tier-cost">' + cost + ' pt' + (cost > 1 ? 's' : '') + '</span>';
      } else {
        html += '<span class="skill-tier-status">Unlocked</span>';
      }
      html += '</div>';
    }

    html += '</div></div>';
    return html;
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  function _cloneState(state) {
    return {
      playerId:    state.playerId,
      totalXP:     state.totalXP,
      level:       state.level,
      skillPoints: state.skillPoints,
      skills:      _cloneSkills(state.skills),
      xpHistory:   (state.xpHistory || []).slice(),
      perks:       (state.perks || []).slice()
    };
  }

  function _cloneSkills(skills) {
    return {
      crafting:    skills.crafting    || 0,
      combat:      skills.combat      || 0,
      gathering:   skills.gathering   || 0,
      social:      skills.social      || 0,
      exploration: skills.exploration || 0,
      knowledge:   skills.knowledge   || 0
    };
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.XP_SOURCES             = XP_SOURCES;
  exports.SKILL_TREES            = SKILL_TREES;
  exports.MAX_LEVEL              = MAX_LEVEL;
  exports.TIER_COSTS             = TIER_COSTS;
  exports.PERK_DESCRIPTIONS      = PERK_DESCRIPTIONS;

  exports.createPlayerProgression = createPlayerProgression;
  exports.awardXP                 = awardXP;
  exports.getLevel                = getLevel;
  exports.getXPForLevel           = getXPForLevel;
  exports.getXPToNextLevel        = getXPToNextLevel;
  exports.spendSkillPoint         = spendSkillPoint;
  exports.getSkillTier            = getSkillTier;
  exports.hasPerks                = hasPerks;
  exports.getActivePerks          = getActivePerks;
  exports.applyPerkBonus          = applyPerkBonus;
  exports.getProgressionSummary   = getProgressionSummary;
  exports.getTitle                = getTitle;
  exports.formatProgressBar       = formatProgressBar;
  exports.formatSkillTree         = formatSkillTree;

})(typeof module !== 'undefined' ? module.exports : (window.Progression = {}));
