// specializations.js
/**
 * ZION Deep Skill Specialization System
 * 18 unique character builds across 6 skill trees.
 * Each tree unlocks 3 specializations at level 5, adding mastery levels,
 * exclusive recipes, exclusive perks, and stat bonuses.
 * Constitution §2.3 — players have the right to Learn and Create.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var TREES = ['crafting', 'combat', 'exploration', 'social', 'gathering', 'fishing'];

  var LEVEL_REQUIRED = 5;        // skill tree level required to specialise
  var MAX_MASTERY    = 10;       // mastery levels within a specialisation
  var BASE_RESPEC    = 50;       // Spark cost for first respec (×respecCount+1)

  // ============================================================================
  // SPECIALIZATIONS DATA
  // ============================================================================

  var SPECIALIZATIONS = {

    // ---- CRAFTING (3) -------------------------------------------------------
    armorer: {
      id: 'armorer',
      name: 'Armorer',
      tree: 'crafting',
      description: 'Master of protective equipment and shields',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'craft_quality',          category: 'armor', value: 0.20 },
        { type: 'material_efficiency',    value: 0.10 },
        { type: 'repair_cost_reduction',  value: 0.15 }
      ],
      exclusiveRecipes: ['diamond_shield', 'crystal_armor', 'phoenix_plate'],
      exclusivePerks:   ['master_temper', 'alloy_fusion', 'unbreakable'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Armorer' },
        5:  { title: 'Journeyman Armorer', cosmetic: 'armorer_glow' },
        7:  { title: 'Master Armorer',     cosmetic: 'armorer_aura' },
        10: { title: 'Grand Master Armorer', cosmetic: 'legendary_armorer' }
      }
    },

    jeweler: {
      id: 'jeweler',
      name: 'Jeweler',
      tree: 'crafting',
      description: 'Expert in gemstones, rings, and enchanted accessories',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'gem_yield',           value: 0.25 },
        { type: 'enchant_potency',     value: 0.15 },
        { type: 'accessory_quality',   value: 0.20 }
      ],
      exclusiveRecipes: ['starfire_ring', 'void_pendant', 'prismatic_crown'],
      exclusivePerks:   ['gem_sight', 'flawless_cut', 'enchant_weave'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Jeweler' },
        5:  { title: 'Journeyman Jeweler', cosmetic: 'jeweler_sparkle' },
        7:  { title: 'Master Jeweler',     cosmetic: 'jeweler_shimmer' },
        10: { title: 'Grand Master Jeweler', cosmetic: 'legendary_jeweler' }
      }
    },

    alchemist: {
      id: 'alchemist',
      name: 'Alchemist',
      tree: 'crafting',
      description: 'Transmutes raw materials and brews powerful potions',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'potion_potency',       value: 0.30 },
        { type: 'transmute_chance',     value: 0.20 },
        { type: 'ingredient_reduction', value: 0.15 }
      ],
      exclusiveRecipes: ['philosophers_draught', 'transmutation_elixir', 'volatile_catalyst'],
      exclusivePerks:   ['rapid_brew', 'material_transmute', 'potion_cascade'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Alchemist' },
        5:  { title: 'Journeyman Alchemist', cosmetic: 'alchemist_fumes' },
        7:  { title: 'Master Alchemist',     cosmetic: 'alchemist_aura' },
        10: { title: 'Grand Master Alchemist', cosmetic: 'legendary_alchemist' }
      }
    },

    // ---- COMBAT (3) ---------------------------------------------------------
    berserker: {
      id: 'berserker',
      name: 'Berserker',
      tree: 'combat',
      description: 'Unleashes raw fury, trading defence for devastating attacks',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'damage_bonus',      value: 0.35 },
        { type: 'attack_speed',      value: 0.20 },
        { type: 'crit_chance',       value: 0.15 }
      ],
      exclusiveRecipes: ['berserk_tonic', 'rage_rune', 'fury_sigil'],
      exclusivePerks:   ['blood_frenzy', 'unstoppable', 'final_stand'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Berserker' },
        5:  { title: 'Journeyman Berserker', cosmetic: 'berserker_flames' },
        7:  { title: 'Master Berserker',     cosmetic: 'berserker_aura' },
        10: { title: 'Grand Master Berserker', cosmetic: 'legendary_berserker' }
      }
    },

    guardian: {
      id: 'guardian',
      name: 'Guardian',
      tree: 'combat',
      description: 'Immovable protector who shields allies and outlasts foes',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'defense_bonus',       value: 0.30 },
        { type: 'hp_bonus',            value: 0.25 },
        { type: 'block_chance',        value: 0.20 }
      ],
      exclusiveRecipes: ['titan_shield', 'guardian_plate', 'sentinel_rune'],
      exclusivePerks:   ['ironwall', 'shield_bash', 'last_bastion'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Guardian' },
        5:  { title: 'Journeyman Guardian', cosmetic: 'guardian_shield_glow' },
        7:  { title: 'Master Guardian',     cosmetic: 'guardian_aura' },
        10: { title: 'Grand Master Guardian', cosmetic: 'legendary_guardian' }
      }
    },

    tactician: {
      id: 'tactician',
      name: 'Tactician',
      tree: 'combat',
      description: 'Cunning strategist who turns battlefield conditions to advantage',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'combo_damage',      value: 0.25 },
        { type: 'debuff_duration',   value: 0.30 },
        { type: 'evasion_chance',    value: 0.15 }
      ],
      exclusiveRecipes: ['tacticians_manual', 'smoke_grenade', 'field_kit'],
      exclusivePerks:   ['exploit_weakness', 'counter_stance', 'warmaster'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Tactician' },
        5:  { title: 'Journeyman Tactician', cosmetic: 'tactician_mark' },
        7:  { title: 'Master Tactician',     cosmetic: 'tactician_aura' },
        10: { title: 'Grand Master Tactician', cosmetic: 'legendary_tactician' }
      }
    },

    // ---- EXPLORATION (3) ----------------------------------------------------
    pathfinder: {
      id: 'pathfinder',
      name: 'Pathfinder',
      tree: 'exploration',
      description: 'Blazes new trails and moves faster through any terrain',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'movement_speed',     value: 0.20 },
        { type: 'stamina_regen',      value: 0.25 },
        { type: 'terrain_discount',   value: 0.15 }
      ],
      exclusiveRecipes: ['trailblazers_boots', 'wind_compass', 'pathfinder_cloak'],
      exclusivePerks:   ['fleet_foot', 'trailblazer', 'terrain_mastery'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Pathfinder' },
        5:  { title: 'Journeyman Pathfinder', cosmetic: 'pathfinder_trail' },
        7:  { title: 'Master Pathfinder',     cosmetic: 'pathfinder_aura' },
        10: { title: 'Grand Master Pathfinder', cosmetic: 'legendary_pathfinder' }
      }
    },

    cartographer: {
      id: 'cartographer',
      name: 'Cartographer',
      tree: 'exploration',
      description: 'Maps the world in precise detail and reveals hidden areas',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'map_reveal_radius',    value: 0.50 },
        { type: 'discovery_xp_bonus',   value: 0.25 },
        { type: 'hidden_area_chance',   value: 0.20 }
      ],
      exclusiveRecipes: ['master_chart', 'lodestone_compass', 'cartographers_lens'],
      exclusivePerks:   ['eagle_eye', 'secret_passages', 'world_memory'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Cartographer' },
        5:  { title: 'Journeyman Cartographer', cosmetic: 'cartographer_glow' },
        7:  { title: 'Master Cartographer',     cosmetic: 'cartographer_aura' },
        10: { title: 'Grand Master Cartographer', cosmetic: 'legendary_cartographer' }
      }
    },

    archaeologist: {
      id: 'archaeologist',
      name: 'Archaeologist',
      tree: 'exploration',
      description: 'Uncovers ancient relics, lore fragments, and buried treasure',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'relic_find_chance',   value: 0.30 },
        { type: 'lore_xp_bonus',       value: 0.25 },
        { type: 'dig_speed',           value: 0.20 }
      ],
      exclusiveRecipes: ['ancient_trowel', 'relic_scanner', 'preservation_kit'],
      exclusivePerks:   ['dust_reader', 'relic_sense', 'ancient_knowledge'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Archaeologist' },
        5:  { title: 'Journeyman Archaeologist', cosmetic: 'archaeologist_dust' },
        7:  { title: 'Master Archaeologist',     cosmetic: 'archaeologist_aura' },
        10: { title: 'Grand Master Archaeologist', cosmetic: 'legendary_archaeologist' }
      }
    },

    // ---- SOCIAL (3) ---------------------------------------------------------
    diplomat: {
      id: 'diplomat',
      name: 'Diplomat',
      tree: 'social',
      description: 'Resolves conflicts, earns trust, and negotiates superior terms',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'reputation_gain',    value: 0.30 },
        { type: 'trade_discount',     value: 0.15 },
        { type: 'conflict_reduction', value: 0.25 }
      ],
      exclusiveRecipes: ['peace_accord', 'diplomats_signet', 'treaty_scroll'],
      exclusivePerks:   ['smooth_talker', 'silver_tongue', 'world_renown'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Diplomat' },
        5:  { title: 'Journeyman Diplomat', cosmetic: 'diplomat_seal' },
        7:  { title: 'Master Diplomat',     cosmetic: 'diplomat_aura' },
        10: { title: 'Grand Master Diplomat', cosmetic: 'legendary_diplomat' }
      }
    },

    entertainer: {
      id: 'entertainer',
      name: 'Entertainer',
      tree: 'social',
      description: 'Captivates audiences, boosts morale, and earns Spark through performance',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'performance_spark',  value: 0.40 },
        { type: 'audience_cap_bonus', value: 0.30 },
        { type: 'morale_boost',       value: 0.20 }
      ],
      exclusiveRecipes: ['masterwork_instrument', 'sparkle_costume', 'encore_potion'],
      exclusivePerks:   ['showstopper', 'crowd_control', 'standing_ovation'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Entertainer' },
        5:  { title: 'Journeyman Entertainer', cosmetic: 'entertainer_spotlight' },
        7:  { title: 'Master Entertainer',     cosmetic: 'entertainer_aura' },
        10: { title: 'Grand Master Entertainer', cosmetic: 'legendary_entertainer' }
      }
    },

    merchant_prince: {
      id: 'merchant_prince',
      name: 'Merchant Prince',
      tree: 'social',
      description: 'Commands the market, sets prices, and builds trade empires',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'sell_price_bonus',   value: 0.20 },
        { type: 'market_fee_discount',value: 0.30 },
        { type: 'trade_route_bonus',  value: 0.25 }
      ],
      exclusiveRecipes: ['merchant_charter', 'golden_ledger', 'trade_caravan'],
      exclusivePerks:   ['market_monopoly', 'bulk_discount', 'economic_empire'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Merchant' },
        5:  { title: 'Journeyman Merchant', cosmetic: 'merchant_gold_glow' },
        7:  { title: 'Master Merchant',     cosmetic: 'merchant_aura' },
        10: { title: 'Merchant Prince',     cosmetic: 'legendary_merchant' }
      }
    },

    // ---- GATHERING (3) ------------------------------------------------------
    herbalist: {
      id: 'herbalist',
      name: 'Herbalist',
      tree: 'gathering',
      description: 'Expert in plants, herbs, and natural remedies',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'herb_yield',        value: 0.35 },
        { type: 'rare_herb_chance',  value: 0.20 },
        { type: 'plant_regrow_rate', value: 0.25 }
      ],
      exclusiveRecipes: ['moonpetal_salve', 'sunfire_herb_bundle', 'ancient_root_extract'],
      exclusivePerks:   ['green_thumb', 'herb_sense', 'natures_bounty'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Herbalist' },
        5:  { title: 'Journeyman Herbalist', cosmetic: 'herbalist_bloom' },
        7:  { title: 'Master Herbalist',     cosmetic: 'herbalist_aura' },
        10: { title: 'Grand Master Herbalist', cosmetic: 'legendary_herbalist' }
      }
    },

    miner: {
      id: 'miner',
      name: 'Miner',
      tree: 'gathering',
      description: 'Extracts ore, gems, and minerals with unmatched efficiency',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'ore_yield',          value: 0.30 },
        { type: 'gem_find_chance',    value: 0.20 },
        { type: 'mining_speed',       value: 0.25 }
      ],
      exclusiveRecipes: ['mithril_pickaxe', 'deep_core_drill', 'miners_lamp'],
      exclusivePerks:   ['ore_sense', 'vein_mastery', 'deep_earth'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Miner' },
        5:  { title: 'Journeyman Miner', cosmetic: 'miner_dust_trail' },
        7:  { title: 'Master Miner',     cosmetic: 'miner_aura' },
        10: { title: 'Grand Master Miner', cosmetic: 'legendary_miner' }
      }
    },

    lumberjack: {
      id: 'lumberjack',
      name: 'Lumberjack',
      tree: 'gathering',
      description: 'Fells trees at speed and cultivates rare wood species',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'wood_yield',         value: 0.35 },
        { type: 'rare_wood_chance',   value: 0.20 },
        { type: 'chop_speed',         value: 0.25 }
      ],
      exclusiveRecipes: ['enchanted_axe', 'ancient_timber_kit', 'bark_armor'],
      exclusivePerks:   ['timber_sense', 'cleave_master', 'forest_heart'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Lumberjack' },
        5:  { title: 'Journeyman Lumberjack', cosmetic: 'lumberjack_splinters' },
        7:  { title: 'Master Lumberjack',     cosmetic: 'lumberjack_aura' },
        10: { title: 'Grand Master Lumberjack', cosmetic: 'legendary_lumberjack' }
      }
    },

    // ---- FISHING (3) --------------------------------------------------------
    angler: {
      id: 'angler',
      name: 'Angler',
      tree: 'fishing',
      description: 'Patient fisherman who lands big catches in all conditions',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'fish_quality',      value: 0.25 },
        { type: 'bite_rate',         value: 0.20 },
        { type: 'catch_bonus',       value: 0.15 }
      ],
      exclusiveRecipes: ['masterwork_rod', 'enchanted_lure', 'anglers_creel'],
      exclusivePerks:   ['patient_angler', 'lucky_cast', 'trophy_hunter'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Angler' },
        5:  { title: 'Journeyman Angler', cosmetic: 'angler_shimmer' },
        7:  { title: 'Master Angler',     cosmetic: 'angler_aura' },
        10: { title: 'Grand Master Angler', cosmetic: 'legendary_angler' }
      }
    },

    deep_sea: {
      id: 'deep_sea',
      name: 'Deep Sea Fisher',
      tree: 'fishing',
      description: 'Hunts massive creatures in the deepest waters',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'deep_fish_chance',   value: 0.35 },
        { type: 'large_catch_bonus',  value: 0.30 },
        { type: 'storm_resistance',   value: 0.20 }
      ],
      exclusiveRecipes: ['abyssal_harpoon', 'leviathan_hook', 'deep_sea_kit'],
      exclusivePerks:   ['sea_legs', 'kraken_bait', 'abyss_caller'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Deep Sea Fisher' },
        5:  { title: 'Journeyman Deep Sea Fisher', cosmetic: 'deep_sea_glow' },
        7:  { title: 'Master Deep Sea Fisher',     cosmetic: 'deep_sea_aura' },
        10: { title: 'Grand Master Deep Sea Fisher', cosmetic: 'legendary_deep_sea' }
      }
    },

    aquaculturist: {
      id: 'aquaculturist',
      name: 'Aquaculturist',
      tree: 'fishing',
      description: 'Breeds rare fish and cultivates aquatic farms for steady yields',
      levelRequired: LEVEL_REQUIRED,
      bonuses: [
        { type: 'breeding_speed',     value: 0.30 },
        { type: 'aqua_farm_yield',    value: 0.35 },
        { type: 'rare_spawn_chance',  value: 0.20 }
      ],
      exclusiveRecipes: ['aqua_farm_kit', 'breeding_tank', 'rare_fish_feed'],
      exclusivePerks:   ['fish_whisperer', 'rapid_breed', 'aquatic_empire'],
      masteryLevels: MAX_MASTERY,
      xpPerMastery: 500,
      masteryRewards: {
        3:  { title: 'Apprentice Aquaculturist' },
        5:  { title: 'Journeyman Aquaculturist', cosmetic: 'aqua_bubble_trail' },
        7:  { title: 'Master Aquaculturist',     cosmetic: 'aquaculturist_aura' },
        10: { title: 'Grand Master Aquaculturist', cosmetic: 'legendary_aquaculturist' }
      }
    }
  };

  // ============================================================================
  // TREE → SPEC MAPPING (quick lookup)
  // ============================================================================

  var TREE_SPECS = {
    crafting:    ['armorer',     'jeweler',       'alchemist'      ],
    combat:      ['berserker',   'guardian',      'tactician'      ],
    exploration: ['pathfinder',  'cartographer',  'archaeologist'  ],
    social:      ['diplomat',    'entertainer',   'merchant_prince'],
    gathering:   ['herbalist',   'miner',         'lumberjack'     ],
    fishing:     ['angler',      'deep_sea',      'aquaculturist'  ]
  };

  // ============================================================================
  // STATE HELPERS
  // ============================================================================

  /**
   * Create a fresh SPEC_STATE for a player.
   * @param {string} playerId
   * @returns {Object}
   */
  function createSpecState(playerId) {
    return {
      playerId:           playerId,
      specializations:    {},   // tree → {specId, masteryLevel, masteryXP} | null
      respecCount:        0,
      totalMasteryPoints: 0
    };
  }

  function _getPlayerState(state, playerId) {
    if (!state || !state[playerId]) return null;
    return state[playerId];
  }

  function _setPlayerState(state, playerId, playerState) {
    state[playerId] = playerState;
  }

  function _clonePlayerState(ps) {
    var specs = {};
    var keys  = Object.keys(ps.specializations);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      specs[k] = ps.specializations[k]
        ? {
            specId:       ps.specializations[k].specId,
            masteryLevel: ps.specializations[k].masteryLevel,
            masteryXP:    ps.specializations[k].masteryXP
          }
        : null;
    }
    return {
      playerId:           ps.playerId,
      specializations:    specs,
      respecCount:        ps.respecCount,
      totalMasteryPoints: ps.totalMasteryPoints
    };
  }

  /**
   * Ensure the player exists in state, creating a fresh entry if needed.
   * @param {Object} state  shared state map { playerId: SPEC_STATE }
   * @param {string} playerId
   * @returns {Object} player state
   */
  function _ensurePlayer(state, playerId) {
    if (!state[playerId]) {
      state[playerId] = createSpecState(playerId);
    }
    return state[playerId];
  }

  // ============================================================================
  // CORE FUNCTIONS
  // ============================================================================

  /**
   * Choose a specialization for a skill tree.
   * @param {Object} state     shared state map
   * @param {string} playerId
   * @param {string} tree      one of the 6 tree names
   * @param {string} specId    specialization id
   * @param {number} treeLevel the player's current level in the tree (external)
   * @returns {{ success, specialization, reason }}
   */
  function chooseSpecialization(state, playerId, tree, specId, treeLevel) {
    var ps = _ensurePlayer(state, playerId);

    // Validate tree
    if (TREES.indexOf(tree) === -1) {
      return { success: false, specialization: null, reason: 'Unknown tree: ' + tree };
    }

    // Validate specId belongs to tree
    var validSpecs = TREE_SPECS[tree];
    if (!validSpecs || validSpecs.indexOf(specId) === -1) {
      return { success: false, specialization: null, reason: 'Specialization "' + specId + '" does not belong to tree "' + tree + '"' };
    }

    var spec = SPECIALIZATIONS[specId];
    if (!spec) {
      return { success: false, specialization: null, reason: 'Unknown specialization: ' + specId };
    }

    // Level requirement
    var level = (typeof treeLevel === 'number') ? treeLevel : 0;
    if (level < spec.levelRequired) {
      return { success: false, specialization: null, reason: 'Tree level ' + level + ' is below required level ' + spec.levelRequired };
    }

    // Already specialised in this tree?
    if (ps.specializations[tree]) {
      return { success: false, specialization: null, reason: 'Already specialised in "' + tree + '". Respec first.' };
    }

    // Assign
    ps.specializations[tree] = {
      specId:       specId,
      masteryLevel: 0,
      masteryXP:    0
    };

    return { success: true, specialization: spec, reason: null };
  }

  /**
   * Remove current specialization. Costs Spark (external system deducts).
   * Cost = 50 * (respecCount + 1).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} tree
   * @returns {{ success, cost, reason, removedSpecId }}
   */
  function respec(state, playerId, tree) {
    var ps = _ensurePlayer(state, playerId);

    if (TREES.indexOf(tree) === -1) {
      return { success: false, cost: 0, reason: 'Unknown tree: ' + tree, removedSpecId: null };
    }

    if (!ps.specializations[tree]) {
      return { success: false, cost: 0, reason: 'No specialization active in tree "' + tree + '"', removedSpecId: null };
    }

    var cost = BASE_RESPEC * (ps.respecCount + 1);
    var removedSpecId = ps.specializations[tree].specId;

    // Subtract mastery points from totalMasteryPoints
    var removedLevel = ps.specializations[tree].masteryLevel || 0;
    ps.totalMasteryPoints = Math.max(0, (ps.totalMasteryPoints || 0) - removedLevel);

    // Clear spec
    ps.specializations[tree] = null;
    ps.respecCount = (ps.respecCount || 0) + 1;

    return { success: true, cost: cost, reason: null, removedSpecId: removedSpecId };
  }

  /**
   * Add mastery XP to active specialization. Handles level-ups.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} tree
   * @param {number} xp
   * @returns {{ xpAdded, levelUp, newLevel, reward }}
   */
  function awardMasteryXP(state, playerId, tree, xp) {
    var ps = _ensurePlayer(state, playerId);

    if (!ps.specializations[tree]) {
      return { xpAdded: 0, levelUp: false, newLevel: 0, reward: null };
    }

    var entry   = ps.specializations[tree];
    var spec    = SPECIALIZATIONS[entry.specId];
    if (!spec) {
      return { xpAdded: 0, levelUp: false, newLevel: 0, reward: null };
    }

    var xpAdded  = (typeof xp === 'number' && xp > 0) ? xp : 0;
    var oldLevel = entry.masteryLevel || 0;

    // Don't add beyond max mastery
    if (oldLevel >= MAX_MASTERY) {
      return { xpAdded: 0, levelUp: false, newLevel: oldLevel, reward: null };
    }

    entry.masteryXP = (entry.masteryXP || 0) + xpAdded;

    // Level up loop
    var levelUp = false;
    var reward  = null;

    while (entry.masteryLevel < MAX_MASTERY) {
      var needed = spec.xpPerMastery;
      if (entry.masteryXP >= needed) {
        entry.masteryXP  -= needed;
        entry.masteryLevel++;
        levelUp = true;

        // Update total mastery points
        ps.totalMasteryPoints = (ps.totalMasteryPoints || 0) + 1;

        // Mastery reward?
        var rewardData = spec.masteryRewards[entry.masteryLevel];
        if (rewardData) {
          reward = rewardData;
        }
      } else {
        break;
      }
    }

    return {
      xpAdded:  xpAdded,
      levelUp:  levelUp,
      newLevel: entry.masteryLevel,
      reward:   reward
    };
  }

  /**
   * Return current mastery level for tree's active specialization (0 if none).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} tree
   * @returns {number}
   */
  function getMasteryLevel(state, playerId, tree) {
    var ps = _ensurePlayer(state, playerId);
    if (!ps.specializations[tree]) return 0;
    return ps.specializations[tree].masteryLevel || 0;
  }

  /**
   * Return mastery progress details.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} tree
   * @returns {{ level, xp, xpToNext, percent }}
   */
  function getMasteryProgress(state, playerId, tree) {
    var ps = _ensurePlayer(state, playerId);
    if (!ps.specializations[tree]) {
      return { level: 0, xp: 0, xpToNext: 0, percent: 0 };
    }

    var entry   = ps.specializations[tree];
    var spec    = SPECIALIZATIONS[entry.specId];
    var level   = entry.masteryLevel || 0;
    var xp      = entry.masteryXP    || 0;
    var xpToNext = (level < MAX_MASTERY) ? (spec ? spec.xpPerMastery : 500) : 0;
    var percent  = (xpToNext > 0) ? Math.floor((xp / xpToNext) * 100) : 100;

    return { level: level, xp: xp, xpToNext: xpToNext, percent: percent };
  }

  /**
   * Return player's chosen specialization for a tree, or null.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} tree
   * @returns {Object|null} SPECIALIZATIONS entry or null
   */
  function getSpecialization(state, playerId, tree) {
    var ps = _ensurePlayer(state, playerId);
    if (!ps.specializations[tree]) return null;
    return SPECIALIZATIONS[ps.specializations[tree].specId] || null;
  }

  /**
   * Return all chosen specializations for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} { tree: spec|null }
   */
  function getAllSpecializations(state, playerId) {
    var ps     = _ensurePlayer(state, playerId);
    var result = {};
    for (var i = 0; i < TREES.length; i++) {
      var tree = TREES[i];
      var entry = ps.specializations[tree];
      result[tree] = entry ? (SPECIALIZATIONS[entry.specId] || null) : null;
    }
    return result;
  }

  /**
   * Return the 3 specialization options for a tree.
   * @param {string} tree
   * @returns {Array}
   */
  function getAvailableSpecializations(tree) {
    var ids = TREE_SPECS[tree];
    if (!ids) return [];
    var result = [];
    for (var i = 0; i < ids.length; i++) {
      if (SPECIALIZATIONS[ids[i]]) {
        result.push(SPECIALIZATIONS[ids[i]]);
      }
    }
    return result;
  }

  /**
   * Return specialization definition by id.
   * @param {string} specId
   * @returns {Object|null}
   */
  function getSpecById(specId) {
    return SPECIALIZATIONS[specId] || null;
  }

  /**
   * Return total bonus value for a bonus type across all active specializations.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} bonusType
   * @returns {number}
   */
  function getBonuses(state, playerId, bonusType) {
    var ps    = _ensurePlayer(state, playerId);
    var total = 0;
    var treeKeys = Object.keys(ps.specializations);
    for (var i = 0; i < treeKeys.length; i++) {
      var entry = ps.specializations[treeKeys[i]];
      if (!entry) continue;
      var spec = SPECIALIZATIONS[entry.specId];
      if (!spec) continue;
      for (var j = 0; j < spec.bonuses.length; j++) {
        if (spec.bonuses[j].type === bonusType) {
          total += spec.bonuses[j].value;
        }
      }
    }
    return total;
  }

  /**
   * Check if player has access to an exclusive recipe.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} recipeId
   * @returns {boolean}
   */
  function hasExclusiveRecipe(state, playerId, recipeId) {
    var recipes = getExclusiveRecipes(state, playerId);
    return recipes.indexOf(recipeId) !== -1;
  }

  /**
   * Return all exclusive recipes unlocked by player's active specializations.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array<string>}
   */
  function getExclusiveRecipes(state, playerId) {
    var ps     = _ensurePlayer(state, playerId);
    var result = [];
    var treeKeys = Object.keys(ps.specializations);
    for (var i = 0; i < treeKeys.length; i++) {
      var entry = ps.specializations[treeKeys[i]];
      if (!entry) continue;
      var spec = SPECIALIZATIONS[entry.specId];
      if (!spec) continue;
      for (var j = 0; j < spec.exclusiveRecipes.length; j++) {
        result.push(spec.exclusiveRecipes[j]);
      }
    }
    return result;
  }

  /**
   * Check if player has access to an exclusive perk.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} perkId
   * @returns {boolean}
   */
  function hasExclusivePerk(state, playerId, perkId) {
    var ps = _ensurePlayer(state, playerId);
    var treeKeys = Object.keys(ps.specializations);
    for (var i = 0; i < treeKeys.length; i++) {
      var entry = ps.specializations[treeKeys[i]];
      if (!entry) continue;
      var spec = SPECIALIZATIONS[entry.specId];
      if (!spec) continue;
      if (spec.exclusivePerks.indexOf(perkId) !== -1) return true;
    }
    return false;
  }

  /**
   * Return current mastery title for tree's active specialization.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} tree
   * @returns {string|null}
   */
  function getTitle(state, playerId, tree) {
    var ps = _ensurePlayer(state, playerId);
    if (!ps.specializations[tree]) return null;

    var entry = ps.specializations[tree];
    var spec  = SPECIALIZATIONS[entry.specId];
    if (!spec) return null;

    var level   = entry.masteryLevel || 0;
    var rewards = spec.masteryRewards;
    var title   = null;

    // Walk down from current level to find highest awarded title
    var milestones = Object.keys(rewards).map(Number).sort(function(a, b) { return a - b; });
    for (var i = 0; i < milestones.length; i++) {
      if (level >= milestones[i]) {
        title = rewards[milestones[i]].title;
      }
    }
    return title;
  }

  /**
   * Return sum of all mastery levels across all trees.
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getTotalMasteryPoints(state, playerId) {
    var ps = _ensurePlayer(state, playerId);
    return ps.totalMasteryPoints || 0;
  }

  /**
   * Return current respec cost for a player.
   * Cost = 50 * (respecCount + 1).
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getRespecCost(state, playerId) {
    var ps = _ensurePlayer(state, playerId);
    return BASE_RESPEC * ((ps.respecCount || 0) + 1);
  }

  /**
   * Return all 6 tree names.
   * @returns {Array<string>}
   */
  function getSpecializationTrees() {
    return TREES.slice();
  }

  /**
   * Return top mastery players for a specialization.
   * @param {Object} state  shared state map
   * @param {string} specId
   * @param {number} count  max entries to return
   * @returns {Array<{playerId, specId, masteryLevel, masteryXP}>}
   */
  function getLeaderboard(state, specId, count) {
    var limit   = (typeof count === 'number' && count > 0) ? count : 10;
    var entries = [];

    var playerIds = Object.keys(state);
    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      var ps  = state[pid];
      if (!ps || !ps.specializations) continue;

      var treeKeys = Object.keys(ps.specializations);
      for (var j = 0; j < treeKeys.length; j++) {
        var entry = ps.specializations[treeKeys[j]];
        if (!entry || entry.specId !== specId) continue;
        entries.push({
          playerId:     pid,
          specId:       specId,
          masteryLevel: entry.masteryLevel || 0,
          masteryXP:    entry.masteryXP    || 0
        });
      }
    }

    // Sort by masteryLevel desc, then masteryXP desc
    entries.sort(function(a, b) {
      if (b.masteryLevel !== a.masteryLevel) return b.masteryLevel - a.masteryLevel;
      return b.masteryXP - a.masteryXP;
    });

    return entries.slice(0, limit);
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.SPECIALIZATIONS           = SPECIALIZATIONS;
  exports.TREE_SPECS                = TREE_SPECS;
  exports.TREES                     = TREES;
  exports.LEVEL_REQUIRED            = LEVEL_REQUIRED;
  exports.MAX_MASTERY               = MAX_MASTERY;
  exports.BASE_RESPEC               = BASE_RESPEC;

  exports.createSpecState           = createSpecState;
  exports.chooseSpecialization      = chooseSpecialization;
  exports.respec                    = respec;
  exports.awardMasteryXP            = awardMasteryXP;
  exports.getMasteryLevel           = getMasteryLevel;
  exports.getMasteryProgress        = getMasteryProgress;
  exports.getSpecialization         = getSpecialization;
  exports.getAllSpecializations     = getAllSpecializations;
  exports.getAvailableSpecializations = getAvailableSpecializations;
  exports.getSpecById               = getSpecById;
  exports.getBonuses                = getBonuses;
  exports.hasExclusiveRecipe        = hasExclusiveRecipe;
  exports.getExclusiveRecipes       = getExclusiveRecipes;
  exports.hasExclusivePerk          = hasExclusivePerk;
  exports.getTitle                  = getTitle;
  exports.getTotalMasteryPoints     = getTotalMasteryPoints;
  exports.getRespecCost             = getRespecCost;
  exports.getSpecializationTrees    = getSpecializationTrees;
  exports.getLeaderboard            = getLeaderboard;

})(typeof module !== 'undefined' ? module.exports : (window.Specializations = {}));
