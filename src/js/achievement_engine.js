/**
 * ZION Achievement Engine
 * Connects trackAchievement() events to badge unlocking, XP rewards,
 * prestige checks, and notifications. Evaluates criteria against
 * multi-session stat counters.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // STAT DEFINITIONS — 31 trackable statistics
  // ============================================================================

  var STAT_DEFINITIONS = {
    zones_visited:           { label: 'Zones Visited',            min: 0 },
    fish_caught:             { label: 'Fish Caught',              min: 0 },
    epic_fish_caught:        { label: 'Epic Fish Caught',         min: 0 },
    dungeons_cleared:        { label: 'Dungeons Cleared',         min: 0 },
    npcs_befriended:         { label: 'NPCs Befriended',          min: 0 },
    items_crafted:           { label: 'Items Crafted',            min: 0 },
    masterwork_items_crafted:{ label: 'Masterwork Items Crafted', min: 0 },
    trades_completed:        { label: 'Trades Completed',         min: 0 },
    quests_completed:        { label: 'Quests Completed',         min: 0 },
    buildings_placed:        { label: 'Buildings Placed',         min: 0 },
    constellations_found:    { label: 'Constellations Found',     min: 0 },
    time_capsules_buried:    { label: 'Time Capsules Buried',     min: 0 },
    time_capsules_found:     { label: 'Time Capsules Found',      min: 0 },
    cards_won:               { label: 'Card Games Won',           min: 0 },
    meals_cooked:            { label: 'Meals Cooked',             min: 0 },
    sparks_earned:           { label: 'Sparks Earned',            min: 0 },
    sparks_spent:            { label: 'Sparks Spent',             min: 0 },
    mentor_sessions:         { label: 'Mentor Sessions',          min: 0 },
    votes_cast:              { label: 'Votes Cast',               min: 0 },
    houses_visited:          { label: 'Houses Visited',           min: 0 },
    guild_contributions:     { label: 'Guild Contributions',      min: 0 },
    prestige_level:          { label: 'Prestige Level',           min: 0 },
    harvests:                { label: 'Harvests',                 min: 0 },
    zone_nexus_visits:       { label: 'Nexus Visits',             min: 0 },
    zone_wilds_visits:       { label: 'Wilds Visits',             min: 0 },
    zone_gardens_visits:     { label: 'Gardens Visits',           min: 0 },
    zone_studio_visits:      { label: 'Studio Visits',            min: 0 },
    zone_athenaeum_visits:   { label: 'Athenaeum Visits',         min: 0 },
    zone_agora_visits:       { label: 'Agora Visits',             min: 0 },
    zone_commons_visits:     { label: 'Commons Visits',           min: 0 },
    zone_arena_visits:       { label: 'Arena Visits',             min: 0 }
  };

  // ============================================================================
  // ACHIEVEMENTS — 55 achievements across 10 categories
  // ============================================================================

  var ACHIEVEMENTS = [

    // ---- EXPLORATION (6 achievements) ----
    {
      id: 'first_steps',
      name: 'First Steps',
      description: 'Visit 3 different zones',
      category: 'exploration',
      criteria: { type: 'counter', stat: 'zones_visited', target: 3 },
      reward: { spark: 50, xp: 100, xpCategory: 'exploration', badge: 'explorer_novice' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'zone_hopper',
      name: 'Zone Hopper',
      description: 'Visit 5 different zones',
      category: 'exploration',
      criteria: { type: 'counter', stat: 'zones_visited', target: 5 },
      reward: { spark: 75, xp: 150, xpCategory: 'exploration', badge: 'zone_hopper' },
      tier: 2,
      hidden: false,
      prerequisite: 'first_steps'
    },
    {
      id: 'world_traveler',
      name: 'World Traveler',
      description: 'Visit all 8 zones of ZION',
      category: 'exploration',
      criteria: { type: 'counter', stat: 'zones_visited', target: 8 },
      reward: { spark: 150, xp: 300, xpCategory: 'exploration', badge: 'world_traveler' },
      tier: 2,
      hidden: false,
      prerequisite: 'zone_hopper'
    },
    {
      id: 'pathfinder',
      name: 'Pathfinder',
      description: 'Discover 10 landmarks across ZION',
      category: 'exploration',
      criteria: { type: 'counter', stat: 'constellations_found', target: 3 },
      reward: { spark: 200, xp: 400, xpCategory: 'exploration', badge: 'pathfinder' },
      tier: 3,
      hidden: false,
      prerequisite: 'world_traveler'
    },
    {
      id: 'stargazer',
      name: 'Stargazer',
      description: 'Find 5 constellations in the night sky',
      category: 'exploration',
      criteria: { type: 'counter', stat: 'constellations_found', target: 5 },
      reward: { spark: 300, xp: 600, xpCategory: 'exploration', badge: 'stargazer' },
      tier: 4,
      hidden: false,
      prerequisite: 'pathfinder'
    },
    {
      id: 'true_explorer',
      name: 'True Explorer',
      description: 'Explore every corner of ZION — visit all zones and find 5 constellations',
      category: 'exploration',
      criteria: {
        type: 'compound',
        conditions: [
          { stat: 'zones_visited', target: 8 },
          { stat: 'constellations_found', target: 5 }
        ],
        logic: 'all'
      },
      reward: { spark: 500, xp: 1000, xpCategory: 'exploration', badge: 'true_explorer' },
      tier: 5,
      hidden: false,
      prerequisite: 'stargazer'
    },

    // ---- COMBAT (5 achievements) ----
    {
      id: 'first_dungeon',
      name: 'Into the Dark',
      description: 'Clear your first dungeon',
      category: 'combat',
      criteria: { type: 'counter', stat: 'dungeons_cleared', target: 1 },
      reward: { spark: 75, xp: 150, xpCategory: 'combat', badge: 'dungeon_delver' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'dungeon_runner',
      name: 'Dungeon Runner',
      description: 'Clear 5 dungeons',
      category: 'combat',
      criteria: { type: 'counter', stat: 'dungeons_cleared', target: 5 },
      reward: { spark: 150, xp: 300, xpCategory: 'combat', badge: 'dungeon_runner' },
      tier: 2,
      hidden: false,
      prerequisite: 'first_dungeon'
    },
    {
      id: 'dungeon_master',
      name: 'Dungeon Master',
      description: 'Clear 20 dungeons',
      category: 'combat',
      criteria: { type: 'counter', stat: 'dungeons_cleared', target: 20 },
      reward: { spark: 400, xp: 800, xpCategory: 'combat', badge: 'dungeon_master' },
      tier: 3,
      hidden: false,
      prerequisite: 'dungeon_runner'
    },
    {
      id: 'card_shark',
      name: 'Card Shark',
      description: 'Win 10 card games',
      category: 'combat',
      criteria: { type: 'counter', stat: 'cards_won', target: 10 },
      reward: { spark: 200, xp: 400, xpCategory: 'combat', badge: 'card_shark' },
      tier: 2,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'arena_champion',
      name: 'Arena Champion',
      description: 'Win 25 card games and clear 10 dungeons',
      category: 'combat',
      criteria: {
        type: 'compound',
        conditions: [
          { stat: 'cards_won', target: 25 },
          { stat: 'dungeons_cleared', target: 10 }
        ],
        logic: 'all'
      },
      reward: { spark: 600, xp: 1200, xpCategory: 'combat', badge: 'arena_champion' },
      tier: 4,
      hidden: false,
      prerequisite: 'dungeon_master'
    },

    // ---- SOCIAL (7 achievements) ----
    {
      id: 'first_contact',
      name: 'First Contact',
      description: 'Talk to your first NPC citizen',
      category: 'social',
      criteria: { type: 'counter', stat: 'npcs_befriended', target: 1 },
      reward: { spark: 25, xp: 50, xpCategory: 'social', badge: 'friendly_face' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'friendly_face',
      name: 'Friendly Face',
      description: 'Befriend 10 citizens of ZION',
      category: 'social',
      criteria: { type: 'counter', stat: 'npcs_befriended', target: 10 },
      reward: { spark: 100, xp: 200, xpCategory: 'social', badge: 'social_novice' },
      tier: 2,
      hidden: false,
      prerequisite: 'first_contact'
    },
    {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Befriend 50 citizens — a beloved community member',
      category: 'social',
      criteria: { type: 'counter', stat: 'npcs_befriended', target: 50 },
      reward: { spark: 300, xp: 600, xpCategory: 'social', badge: 'social_butterfly' },
      tier: 3,
      hidden: false,
      prerequisite: 'friendly_face'
    },
    {
      id: 'first_trade',
      name: 'First Trade',
      description: 'Complete a trade with another citizen',
      category: 'social',
      criteria: { type: 'counter', stat: 'trades_completed', target: 1 },
      reward: { spark: 50, xp: 100, xpCategory: 'social', badge: 'first_trade' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'merchant_prince',
      name: 'Merchant Prince',
      description: 'Complete 25 trades — a pillar of commerce',
      category: 'social',
      criteria: { type: 'counter', stat: 'trades_completed', target: 25 },
      reward: { spark: 400, xp: 800, xpCategory: 'social', badge: 'merchant_prince' },
      tier: 3,
      hidden: false,
      prerequisite: 'first_trade'
    },
    {
      id: 'mentor_guide',
      name: 'Guide and Mentor',
      description: 'Complete 5 mentor sessions',
      category: 'social',
      criteria: { type: 'counter', stat: 'mentor_sessions', target: 5 },
      reward: { spark: 200, xp: 400, xpCategory: 'social', badge: 'mentor' },
      tier: 3,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'civic_voice',
      name: 'Civic Voice',
      description: 'Cast 10 votes in ZION governance',
      category: 'social',
      criteria: { type: 'counter', stat: 'votes_cast', target: 10 },
      reward: { spark: 150, xp: 300, xpCategory: 'social', badge: 'civic_voice' },
      tier: 2,
      hidden: false,
      prerequisite: null
    },

    // ---- CRAFTING (6 achievements) ----
    {
      id: 'first_craft',
      name: 'First Craft',
      description: 'Craft your first item',
      category: 'crafting',
      criteria: { type: 'counter', stat: 'items_crafted', target: 1 },
      reward: { spark: 30, xp: 60, xpCategory: 'crafting', badge: 'apprentice_crafter' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'journeyman_crafter',
      name: 'Journeyman Crafter',
      description: 'Craft 10 items',
      category: 'crafting',
      criteria: { type: 'counter', stat: 'items_crafted', target: 10 },
      reward: { spark: 100, xp: 200, xpCategory: 'crafting', badge: 'journeyman_crafter' },
      tier: 2,
      hidden: false,
      prerequisite: 'first_craft'
    },
    {
      id: 'master_crafter',
      name: 'Master Crafter',
      description: 'Craft 50 items — the forge is your home',
      category: 'crafting',
      criteria: { type: 'counter', stat: 'items_crafted', target: 50 },
      reward: { spark: 300, xp: 600, xpCategory: 'crafting', badge: 'master_crafter' },
      tier: 3,
      hidden: false,
      prerequisite: 'journeyman_crafter'
    },
    {
      id: 'grand_artisan',
      name: 'Grand Artisan',
      description: 'Craft 100 items',
      category: 'crafting',
      criteria: { type: 'counter', stat: 'items_crafted', target: 100 },
      reward: { spark: 500, xp: 1000, xpCategory: 'crafting', badge: 'grand_artisan' },
      tier: 4,
      hidden: false,
      prerequisite: 'master_crafter'
    },
    {
      id: 'masterwork_creator',
      name: 'Masterwork Creator',
      description: 'Create your first masterwork item',
      category: 'crafting',
      criteria: { type: 'counter', stat: 'masterwork_items_crafted', target: 1 },
      reward: { spark: 250, xp: 500, xpCategory: 'crafting', badge: 'masterwork_creator' },
      tier: 3,
      hidden: true,
      prerequisite: 'journeyman_crafter'
    },
    {
      id: 'legendary_smith',
      name: 'Legendary Smith',
      description: 'Create 5 masterwork items',
      category: 'crafting',
      criteria: { type: 'counter', stat: 'masterwork_items_crafted', target: 5 },
      reward: { spark: 700, xp: 1400, xpCategory: 'crafting', badge: 'legendary_smith' },
      tier: 5,
      hidden: true,
      prerequisite: 'masterwork_creator'
    },

    // ---- FISHING (5 achievements) ----
    {
      id: 'first_catch',
      name: 'First Catch',
      description: 'Catch your first fish',
      category: 'fishing',
      criteria: { type: 'counter', stat: 'fish_caught', target: 1 },
      reward: { spark: 25, xp: 50, xpCategory: 'fishing', badge: 'fisher_novice' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'angler',
      name: 'Angler',
      description: 'Catch 10 fish',
      category: 'fishing',
      criteria: { type: 'counter', stat: 'fish_caught', target: 10 },
      reward: { spark: 80, xp: 160, xpCategory: 'fishing', badge: 'angler' },
      tier: 2,
      hidden: false,
      prerequisite: 'first_catch'
    },
    {
      id: 'master_angler',
      name: 'Master Angler',
      description: 'Catch 50 fish',
      category: 'fishing',
      criteria: { type: 'counter', stat: 'fish_caught', target: 50 },
      reward: { spark: 250, xp: 500, xpCategory: 'fishing', badge: 'master_angler' },
      tier: 3,
      hidden: false,
      prerequisite: 'angler'
    },
    {
      id: 'epic_fisher',
      name: 'Epic Fisher',
      description: 'Catch your first epic fish',
      category: 'fishing',
      criteria: { type: 'counter', stat: 'epic_fish_caught', target: 1 },
      reward: { spark: 150, xp: 300, xpCategory: 'fishing', badge: 'epic_fisher' },
      tier: 3,
      hidden: true,
      prerequisite: 'angler'
    },
    {
      id: 'legendary_angler',
      name: 'Legendary Angler',
      description: 'Catch 3 epic fish — a true fishing legend',
      category: 'fishing',
      criteria: { type: 'counter', stat: 'epic_fish_caught', target: 3 },
      reward: { spark: 400, xp: 800, xpCategory: 'fishing', badge: 'legendary_angler' },
      tier: 4,
      hidden: true,
      prerequisite: 'epic_fisher'
    },

    // ---- GATHERING (4 achievements) ----
    {
      id: 'first_harvest',
      name: 'First Harvest',
      description: 'Gather your first resource',
      category: 'gathering',
      criteria: { type: 'counter', stat: 'harvests', target: 1 },
      reward: { spark: 20, xp: 40, xpCategory: 'gathering', badge: 'forager' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'gatherer',
      name: 'Gatherer',
      description: 'Gather 25 resources',
      category: 'gathering',
      criteria: { type: 'counter', stat: 'harvests', target: 25 },
      reward: { spark: 100, xp: 200, xpCategory: 'gathering', badge: 'gatherer' },
      tier: 2,
      hidden: false,
      prerequisite: 'first_harvest'
    },
    {
      id: 'expert_gatherer',
      name: 'Expert Gatherer',
      description: 'Gather 100 resources',
      category: 'gathering',
      criteria: { type: 'counter', stat: 'harvests', target: 100 },
      reward: { spark: 300, xp: 600, xpCategory: 'gathering', badge: 'expert_gatherer' },
      tier: 3,
      hidden: false,
      prerequisite: 'gatherer'
    },
    {
      id: 'natures_hand',
      name: "Nature's Hand",
      description: 'Gather 500 resources — one with the natural world',
      category: 'gathering',
      criteria: { type: 'counter', stat: 'harvests', target: 500 },
      reward: { spark: 600, xp: 1200, xpCategory: 'gathering', badge: 'natures_hand' },
      tier: 5,
      hidden: false,
      prerequisite: 'expert_gatherer'
    },

    // ---- TRADING (4 achievements) ----
    {
      id: 'market_newcomer',
      name: 'Market Newcomer',
      description: 'Earn your first 100 Spark',
      category: 'trading',
      criteria: { type: 'counter', stat: 'sparks_earned', target: 100 },
      reward: { spark: 50, xp: 100, xpCategory: 'trading', badge: 'spark_saver' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'spark_hoarder',
      name: 'Spark Hoarder',
      description: 'Earn 500 Spark — a prosperous citizen',
      category: 'trading',
      criteria: { type: 'counter', stat: 'sparks_earned', target: 500 },
      reward: { spark: 100, xp: 200, xpCategory: 'trading', badge: 'spark_hoarder' },
      tier: 2,
      hidden: false,
      prerequisite: 'market_newcomer'
    },
    {
      id: 'spark_magnate',
      name: 'Spark Magnate',
      description: 'Earn 2000 Spark — an economic powerhouse',
      category: 'trading',
      criteria: { type: 'counter', stat: 'sparks_earned', target: 2000 },
      reward: { spark: 300, xp: 600, xpCategory: 'trading', badge: 'spark_magnate' },
      tier: 3,
      hidden: false,
      prerequisite: 'spark_hoarder'
    },
    {
      id: 'big_spender',
      name: 'Big Spender',
      description: 'Spend 1000 Spark in the economy',
      category: 'trading',
      criteria: { type: 'counter', stat: 'sparks_spent', target: 1000 },
      reward: { spark: 200, xp: 400, xpCategory: 'trading', badge: 'big_spender' },
      tier: 3,
      hidden: false,
      prerequisite: null
    },

    // ---- BUILDING (5 achievements) ----
    {
      id: 'first_build',
      name: 'First Build',
      description: 'Place your first structure in ZION',
      category: 'building',
      criteria: { type: 'counter', stat: 'buildings_placed', target: 1 },
      reward: { spark: 40, xp: 80, xpCategory: 'building', badge: 'first_build' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'builder',
      name: 'Builder',
      description: 'Place 10 structures',
      category: 'building',
      criteria: { type: 'counter', stat: 'buildings_placed', target: 10 },
      reward: { spark: 150, xp: 300, xpCategory: 'building', badge: 'architect' },
      tier: 2,
      hidden: false,
      prerequisite: 'first_build'
    },
    {
      id: 'architect',
      name: 'Architect',
      description: 'Place 25 structures — shaping the world',
      category: 'building',
      criteria: { type: 'counter', stat: 'buildings_placed', target: 25 },
      reward: { spark: 300, xp: 600, xpCategory: 'building', badge: 'master_builder' },
      tier: 3,
      hidden: false,
      prerequisite: 'builder'
    },
    {
      id: 'city_planner',
      name: 'City Planner',
      description: 'Place 50 structures — an urban visionary',
      category: 'building',
      criteria: { type: 'counter', stat: 'buildings_placed', target: 50 },
      reward: { spark: 500, xp: 1000, xpCategory: 'building', badge: 'city_planner' },
      tier: 4,
      hidden: false,
      prerequisite: 'architect'
    },
    {
      id: 'home_opener',
      name: 'Home Opener',
      description: 'Visit 5 player houses',
      category: 'building',
      criteria: { type: 'counter', stat: 'houses_visited', target: 5 },
      reward: { spark: 100, xp: 200, xpCategory: 'building', badge: 'home_opener' },
      tier: 2,
      hidden: false,
      prerequisite: null
    },

    // ---- QUESTING (5 achievements) ----
    {
      id: 'quest_beginner',
      name: 'Quest Beginner',
      description: 'Complete your first quest',
      category: 'questing',
      criteria: { type: 'counter', stat: 'quests_completed', target: 1 },
      reward: { spark: 50, xp: 100, xpCategory: 'questing', badge: 'quester' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'quest_adventurer',
      name: 'Quest Adventurer',
      description: 'Complete 10 quests',
      category: 'questing',
      criteria: { type: 'counter', stat: 'quests_completed', target: 10 },
      reward: { spark: 200, xp: 400, xpCategory: 'questing', badge: 'adventurer' },
      tier: 2,
      hidden: false,
      prerequisite: 'quest_beginner'
    },
    {
      id: 'quest_hero',
      name: 'Quest Hero',
      description: 'Complete 25 quests',
      category: 'questing',
      criteria: { type: 'counter', stat: 'quests_completed', target: 25 },
      reward: { spark: 400, xp: 800, xpCategory: 'questing', badge: 'quest_hero' },
      tier: 3,
      hidden: false,
      prerequisite: 'quest_adventurer'
    },
    {
      id: 'quest_legend',
      name: 'Quest Legend',
      description: 'Complete 50 quests — a living legend',
      category: 'questing',
      criteria: { type: 'counter', stat: 'quests_completed', target: 50 },
      reward: { spark: 700, xp: 1400, xpCategory: 'questing', badge: 'quest_legend' },
      tier: 4,
      hidden: false,
      prerequisite: 'quest_hero'
    },
    {
      id: 'time_keeper',
      name: 'Time Keeper',
      description: 'Bury and find a time capsule',
      category: 'questing',
      criteria: {
        type: 'compound',
        conditions: [
          { stat: 'time_capsules_buried', target: 1 },
          { stat: 'time_capsules_found', target: 1 }
        ],
        logic: 'all'
      },
      reward: { spark: 200, xp: 400, xpCategory: 'questing', badge: 'time_keeper' },
      tier: 3,
      hidden: false,
      prerequisite: null
    },

    // ---- MASTERY (6 achievements) ----
    {
      id: 'cook_novice',
      name: 'Cook Novice',
      description: 'Cook your first meal',
      category: 'mastery',
      criteria: { type: 'counter', stat: 'meals_cooked', target: 1 },
      reward: { spark: 30, xp: 60, xpCategory: 'mastery', badge: 'cook_novice' },
      tier: 1,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'chef',
      name: 'Chef',
      description: 'Cook 20 meals',
      category: 'mastery',
      criteria: { type: 'counter', stat: 'meals_cooked', target: 20 },
      reward: { spark: 150, xp: 300, xpCategory: 'mastery', badge: 'chef' },
      tier: 2,
      hidden: false,
      prerequisite: 'cook_novice'
    },
    {
      id: 'guild_contributor',
      name: 'Guild Contributor',
      description: 'Make 10 contributions to your guild',
      category: 'mastery',
      criteria: { type: 'counter', stat: 'guild_contributions', target: 10 },
      reward: { spark: 200, xp: 400, xpCategory: 'mastery', badge: 'guild_contributor' },
      tier: 2,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'prestige_seeker',
      name: 'Prestige Seeker',
      description: 'Reach Prestige Level 1',
      category: 'mastery',
      criteria: { type: 'milestone', stat: 'prestige_level', value: 1 },
      reward: { spark: 500, xp: 1000, xpCategory: 'mastery', badge: 'prestige_one' },
      tier: 4,
      hidden: false,
      prerequisite: null
    },
    {
      id: 'true_master',
      name: 'True Master',
      description: 'Reach Prestige Level 3',
      category: 'mastery',
      criteria: { type: 'milestone', stat: 'prestige_level', value: 3 },
      reward: { spark: 1000, xp: 2000, xpCategory: 'mastery', badge: 'true_master' },
      tier: 5,
      hidden: false,
      prerequisite: 'prestige_seeker'
    },
    {
      id: 'citizen_of_zion',
      name: 'Citizen of ZION',
      description: 'Complete quests, make friends, craft, build, and explore',
      category: 'mastery',
      criteria: {
        type: 'compound',
        conditions: [
          { stat: 'quests_completed', target: 5 },
          { stat: 'npcs_befriended', target: 5 },
          { stat: 'items_crafted', target: 5 },
          { stat: 'buildings_placed', target: 1 },
          { stat: 'zones_visited', target: 5 }
        ],
        logic: 'all'
      },
      reward: { spark: 1000, xp: 2000, xpCategory: 'mastery', badge: 'citizen_of_zion' },
      tier: 5,
      hidden: false,
      prerequisite: null
    },

    // ---- SECRET / HIDDEN (2 achievements) ----
    {
      id: 'capsule_historian',
      name: 'Capsule Historian',
      description: 'Find 5 time capsules left by others',
      category: 'questing',
      criteria: { type: 'counter', stat: 'time_capsules_found', target: 5 },
      reward: { spark: 300, xp: 600, xpCategory: 'questing', badge: 'capsule_historian' },
      tier: 4,
      hidden: true,
      prerequisite: 'time_keeper'
    },
    {
      id: 'all_zones_master',
      name: 'All Zones Master',
      description: 'Visit every zone at least 10 times each',
      category: 'exploration',
      criteria: {
        type: 'compound',
        conditions: [
          { stat: 'zone_nexus_visits', target: 10 },
          { stat: 'zone_wilds_visits', target: 10 },
          { stat: 'zone_gardens_visits', target: 10 },
          { stat: 'zone_studio_visits', target: 10 },
          { stat: 'zone_athenaeum_visits', target: 10 },
          { stat: 'zone_agora_visits', target: 10 },
          { stat: 'zone_commons_visits', target: 10 },
          { stat: 'zone_arena_visits', target: 10 }
        ],
        logic: 'all'
      },
      reward: { spark: 800, xp: 1600, xpCategory: 'exploration', badge: 'all_zones_master' },
      tier: 5,
      hidden: true,
      prerequisite: 'world_traveler'
    },

    // ---- THRESHOLD ACHIEVEMENTS (5 achievements) ----
    {
      id: 'wealth_threshold',
      name: 'Wealthy Citizen',
      description: 'Earn at least 1000 total Spark',
      category: 'trading',
      criteria: { type: 'threshold', stat: 'sparks_earned', min: 1000 },
      reward: { spark: 200, xp: 400, xpCategory: 'trading', badge: 'wealthy_citizen' },
      tier: 3,
      hidden: false,
      prerequisite: 'spark_hoarder'
    },
    {
      id: 'dungeon_threshold',
      name: 'Seasoned Delver',
      description: 'Clear at least 10 dungeons',
      category: 'combat',
      criteria: { type: 'threshold', stat: 'dungeons_cleared', min: 10 },
      reward: { spark: 300, xp: 600, xpCategory: 'combat', badge: 'seasoned_delver' },
      tier: 3,
      hidden: false,
      prerequisite: 'dungeon_runner'
    },
    {
      id: 'social_threshold',
      name: 'Well Connected',
      description: 'Befriend at least 25 citizens',
      category: 'social',
      criteria: { type: 'threshold', stat: 'npcs_befriended', min: 25 },
      reward: { spark: 200, xp: 400, xpCategory: 'social', badge: 'well_connected' },
      tier: 3,
      hidden: false,
      prerequisite: 'friendly_face'
    },
    {
      id: 'harvest_threshold',
      name: 'Prolific Harvester',
      description: 'Gather at least 50 resources',
      category: 'gathering',
      criteria: { type: 'threshold', stat: 'harvests', min: 50 },
      reward: { spark: 150, xp: 300, xpCategory: 'gathering', badge: 'prolific_harvester' },
      tier: 2,
      hidden: false,
      prerequisite: 'first_harvest'
    },
    {
      id: 'craft_threshold',
      name: 'Productive Crafter',
      description: 'Craft at least 20 items',
      category: 'crafting',
      criteria: { type: 'threshold', stat: 'items_crafted', min: 20 },
      reward: { spark: 150, xp: 300, xpCategory: 'crafting', badge: 'productive_crafter' },
      tier: 2,
      hidden: false,
      prerequisite: 'journeyman_crafter'
    }
  ];

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  /** Build lookup map by achievement ID */
  var _achievementMap = (function() {
    var map = {};
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      map[ACHIEVEMENTS[i].id] = ACHIEVEMENTS[i];
    }
    return map;
  })();

  /** Ensure player stat object exists in state */
  function _ensurePlayer(state, playerId) {
    if (!state.players) state.players = {};
    if (!state.players[playerId]) {
      state.players[playerId] = { stats: {}, unlocked: [] };
    }
    if (!state.players[playerId].stats) state.players[playerId].stats = {};
    if (!state.players[playerId].unlocked) state.players[playerId].unlocked = [];
  }

  /** Get a single stat value safely */
  function _getStat(state, playerId, statName) {
    _ensurePlayer(state, playerId);
    var val = state.players[playerId].stats[statName];
    return (typeof val === 'number') ? val : 0;
  }

  /** Evaluate a single criteria object against player stats */
  function _evalCriteria(criteria, state, playerId) {
    if (criteria.type === 'counter') {
      var val = _getStat(state, playerId, criteria.stat);
      return val >= criteria.target;
    }
    if (criteria.type === 'milestone') {
      var mval = _getStat(state, playerId, criteria.stat);
      return mval >= criteria.value;
    }
    if (criteria.type === 'threshold') {
      var tval = _getStat(state, playerId, criteria.stat);
      return tval >= criteria.min;
    }
    if (criteria.type === 'compound') {
      var conditions = criteria.conditions;
      var logic = criteria.logic || 'all';
      if (logic === 'all') {
        for (var i = 0; i < conditions.length; i++) {
          var cond = conditions[i];
          var cval = _getStat(state, playerId, cond.stat);
          if (cval < cond.target) return false;
        }
        return true;
      }
      if (logic === 'any') {
        for (var j = 0; j < conditions.length; j++) {
          var condj = conditions[j];
          var cvalj = _getStat(state, playerId, condj.stat);
          if (cvalj >= condj.target) return true;
        }
        return false;
      }
    }
    return false;
  }

  /** Check if prerequisite is satisfied */
  function _prereqMet(achievement, state, playerId) {
    if (!achievement.prerequisite) return true;
    _ensurePlayer(state, playerId);
    var unlocked = state.players[playerId].unlocked;
    for (var i = 0; i < unlocked.length; i++) {
      if (unlocked[i] === achievement.prerequisite) return true;
    }
    return false;
  }

  /** Check if achievement already unlocked */
  function _isUnlocked(state, playerId, achievementId) {
    _ensurePlayer(state, playerId);
    var unlocked = state.players[playerId].unlocked;
    for (var i = 0; i < unlocked.length; i++) {
      if (unlocked[i] === achievementId) return true;
    }
    return false;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Increment a player stat counter.
   * @param {Object} state - World/player state
   * @param {string} playerId - Player identifier
   * @param {string} statName - Stat key from STAT_DEFINITIONS
   * @param {number} [increment=1] - Amount to add (clamped to >= 0)
   * @returns {Object} Updated state (mutated in place and returned)
   */
  function trackStat(state, playerId, statName, increment) {
    if (!state || !playerId) return state;
    _ensurePlayer(state, playerId);
    var delta = (typeof increment === 'number') ? increment : 1;
    if (delta < 0) delta = 0; // no negative increments
    var current = _getStat(state, playerId, statName);
    state.players[playerId].stats[statName] = current + delta;
    return state;
  }

  /**
   * Evaluate ALL achievement criteria against player stats.
   * Returns newly unlocked achievements (does not double-unlock).
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} Newly unlocked achievements [{achievementId, name, reward}, ...]
   */
  function checkAchievements(state, playerId) {
    if (!state || !playerId) return [];
    _ensurePlayer(state, playerId);
    var newlyUnlocked = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];
      if (_isUnlocked(state, playerId, ach.id)) continue;
      if (!_prereqMet(ach, state, playerId)) continue;
      if (_evalCriteria(ach.criteria, state, playerId)) {
        state.players[playerId].unlocked.push(ach.id);
        newlyUnlocked.push({
          achievementId: ach.id,
          name: ach.name,
          reward: ach.reward
        });
      }
    }
    return newlyUnlocked;
  }

  /**
   * Combined trackStat + checkAchievements. Main entry point.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} statName
   * @param {number} [increment=1]
   * @returns {{state: Object, newAchievements: Array, statsUpdated: Object}}
   */
  function trackAndCheck(state, playerId, statName, increment) {
    if (!state || !playerId) {
      return { state: state, newAchievements: [], statsUpdated: {} };
    }
    state = trackStat(state, playerId, statName, increment);
    var newAchievements = checkAchievements(state, playerId);
    var statsUpdated = {};
    statsUpdated[statName] = _getStat(state, playerId, statName);
    return {
      state: state,
      newAchievements: newAchievements,
      statsUpdated: statsUpdated
    };
  }

  /**
   * Return all stats for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} Stats map {statName: value, ...}
   */
  function getPlayerStats(state, playerId) {
    if (!state || !playerId) return {};
    _ensurePlayer(state, playerId);
    return state.players[playerId].stats;
  }

  /**
   * Return all achievements, optionally filtered by category.
   * @param {string} [category] - Optional category filter
   * @returns {Array} Achievement definitions
   */
  function getAchievements(category) {
    if (!category) return ACHIEVEMENTS.slice();
    var result = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].category === category) result.push(ACHIEVEMENTS[i]);
    }
    return result;
  }

  /**
   * Return player's unlocked achievement IDs.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} Unlocked achievement IDs
   */
  function getUnlockedAchievements(state, playerId) {
    if (!state || !playerId) return [];
    _ensurePlayer(state, playerId);
    return state.players[playerId].unlocked.slice();
  }

  /**
   * Return progress for a specific achievement.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} achievementId
   * @returns {{current: number, target: number, percent: number, unlocked: boolean}}
   */
  function getProgress(state, playerId, achievementId) {
    var ach = _achievementMap[achievementId];
    if (!ach) return { current: 0, target: 1, percent: 0, unlocked: false };

    var unlocked = _isUnlocked(state, playerId, achievementId);
    var criteria = ach.criteria;

    if (criteria.type === 'counter') {
      var val = _getStat(state, playerId, criteria.stat);
      var pct = Math.min(100, Math.floor((val / criteria.target) * 100));
      return { current: val, target: criteria.target, percent: pct, unlocked: unlocked };
    }
    if (criteria.type === 'milestone') {
      var mval = _getStat(state, playerId, criteria.stat);
      var mpct = mval >= criteria.value ? 100 : Math.floor((mval / criteria.value) * 100);
      return { current: mval, target: criteria.value, percent: mpct, unlocked: unlocked };
    }
    if (criteria.type === 'threshold') {
      var tval = _getStat(state, playerId, criteria.stat);
      var tpct = Math.min(100, Math.floor((tval / criteria.min) * 100));
      return { current: tval, target: criteria.min, percent: tpct, unlocked: unlocked };
    }
    if (criteria.type === 'compound') {
      var conds = criteria.conditions;
      var totalPct = 0;
      for (var i = 0; i < conds.length; i++) {
        var cv = _getStat(state, playerId, conds[i].stat);
        totalPct += Math.min(1, cv / conds[i].target);
      }
      var avgPct = Math.floor((totalPct / conds.length) * 100);
      return {
        current: avgPct,
        target: 100,
        percent: Math.min(100, avgPct),
        unlocked: unlocked
      };
    }
    return { current: 0, target: 1, percent: 0, unlocked: unlocked };
  }

  /**
   * Return progress for all achievements.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} {achievementId: progressObj, ...}
   */
  function getAllProgress(state, playerId) {
    var result = {};
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];
      result[ach.id] = getProgress(state, playerId, ach.id);
    }
    return result;
  }

  /**
   * Return single achievement definition by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  function getAchievementById(id) {
    return _achievementMap[id] || null;
  }

  /**
   * Return list of achievement categories.
   * @returns {Array} Category strings
   */
  function getCategories() {
    var seen = {};
    var cats = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var cat = ACHIEVEMENTS[i].category;
      if (!seen[cat]) {
        seen[cat] = true;
        cats.push(cat);
      }
    }
    return cats;
  }

  /**
   * Calculate total achievement points for a player (tier * 10 per unlocked).
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getTotalPoints(state, playerId) {
    var unlocked = getUnlockedAchievements(state, playerId);
    var total = 0;
    for (var i = 0; i < unlocked.length; i++) {
      var ach = _achievementMap[unlocked[i]];
      if (ach) total += ach.tier * 10;
    }
    return total;
  }

  /**
   * Return percent of achievements unlocked (0-100).
   * @param {Object} state
   * @param {string} playerId
   * @returns {number}
   */
  function getCompletionPercent(state, playerId) {
    var unlocked = getUnlockedAchievements(state, playerId);
    return Math.floor((unlocked.length / ACHIEVEMENTS.length) * 100);
  }

  /**
   * Return next N closest-to-completion achievements (not yet unlocked).
   * Sorted by percent desc, then tier asc.
   * @param {Object} state
   * @param {string} playerId
   * @param {number} [count=5]
   * @returns {Array} [{achievement, progress}, ...]
   */
  function getNextAchievements(state, playerId, count) {
    var n = (typeof count === 'number' && count > 0) ? count : 5;
    var candidates = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var ach = ACHIEVEMENTS[i];
      if (_isUnlocked(state, playerId, ach.id)) continue;
      var prog = getProgress(state, playerId, ach.id);
      candidates.push({ achievement: ach, progress: prog });
    }
    candidates.sort(function(a, b) {
      if (b.progress.percent !== a.progress.percent) {
        return b.progress.percent - a.progress.percent;
      }
      return a.achievement.tier - b.achievement.tier;
    });
    return candidates.slice(0, n);
  }

  /**
   * Return all hidden achievements (for UI display as ???).
   * @returns {Array} Hidden achievement definitions
   */
  function getHiddenAchievements() {
    var result = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ACHIEVEMENTS[i].hidden) result.push(ACHIEVEMENTS[i]);
    }
    return result;
  }

  /**
   * Reset all stats for a player (prestige/ascension system).
   * Does NOT clear unlocked achievements.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Object} Updated state
   */
  function resetStats(state, playerId) {
    if (!state || !playerId) return state;
    _ensurePlayer(state, playerId);
    state.players[playerId].stats = {};
    return state;
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.ACHIEVEMENTS = ACHIEVEMENTS;
  exports.STAT_DEFINITIONS = STAT_DEFINITIONS;
  exports.trackStat = trackStat;
  exports.checkAchievements = checkAchievements;
  exports.trackAndCheck = trackAndCheck;
  exports.getPlayerStats = getPlayerStats;
  exports.getAchievements = getAchievements;
  exports.getUnlockedAchievements = getUnlockedAchievements;
  exports.getProgress = getProgress;
  exports.getAllProgress = getAllProgress;
  exports.getAchievementById = getAchievementById;
  exports.getCategories = getCategories;
  exports.getTotalPoints = getTotalPoints;
  exports.getCompletionPercent = getCompletionPercent;
  exports.getNextAchievements = getNextAchievements;
  exports.getHiddenAchievements = getHiddenAchievements;
  exports.resetStats = resetStats;

})(typeof module !== 'undefined' ? module.exports : (window.AchievementEngine = {}));
