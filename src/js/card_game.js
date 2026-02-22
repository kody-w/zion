/**
 * ZION Trading Card Game System
 * Collectible cards, deck building, PvP battle mechanics
 * Layer: standalone (no project dependencies)
 */

(function(exports) {
  'use strict';

  // =========================================================================
  // CONSTANTS
  // =========================================================================

  var ELEMENTS = ['fire', 'water', 'earth', 'air', 'spirit'];
  var CARD_TYPES = ['creature', 'spell', 'trap', 'equipment', 'legendary'];
  var RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  var DECK_MIN = 20;
  var DECK_MAX = 40;
  var MAX_COPIES_PER_CARD = 3;
  var MAX_COPIES_LEGENDARY = 1;
  var HAND_MAX = 7;
  var STARTING_HAND = 5;
  var STARTING_MANA = 1;
  var MAX_MANA = 10;
  var FIELD_MAX = 5;
  var STARTING_HP = 30;

  // =========================================================================
  // CARD CATALOG — 60+ cards
  // =========================================================================

  var CARD_CATALOG = {

    // -----------------------------------------------------------------------
    // CREATURE CARDS (20+)
    // -----------------------------------------------------------------------

    'c_ember_sprite': {
      id: 'c_ember_sprite',
      name: 'Ember Sprite',
      type: 'creature',
      rarity: 'common',
      cost: 1,
      element: 'fire',
      attack: 1,
      defense: 1,
      hp: 1,
      ability: 'ignite',
      ability_text: 'When this enters play, deal 1 damage to any target.',
      art_description: 'A tiny flame-spirit dancing in the air, leaving scorch marks on the ground.'
    },

    'c_fire_wolf': {
      id: 'c_fire_wolf',
      name: 'Fire Wolf',
      type: 'creature',
      rarity: 'common',
      cost: 2,
      element: 'fire',
      attack: 3,
      defense: 1,
      hp: 2,
      ability: 'swift',
      ability_text: 'Can attack the turn it enters play.',
      art_description: 'A sleek wolf wreathed in crimson flames, muscles rippling beneath burning fur.'
    },

    'c_lava_titan': {
      id: 'c_lava_titan',
      name: 'Lava Titan',
      type: 'creature',
      rarity: 'rare',
      cost: 5,
      element: 'fire',
      attack: 5,
      defense: 3,
      hp: 6,
      ability: 'molten_armor',
      ability_text: 'When attacked, deal 1 damage back to the attacker.',
      art_description: 'A colossal humanoid formed from cooling lava, cracks glowing orange with inner fire.'
    },

    'c_salamander_knight': {
      id: 'c_salamander_knight',
      name: 'Salamander Knight',
      type: 'creature',
      rarity: 'uncommon',
      cost: 3,
      element: 'fire',
      attack: 3,
      defense: 2,
      hp: 3,
      ability: 'fire_shield',
      ability_text: 'Allied fire creatures gain +1 defense.',
      art_description: 'An armored salamander wielding a blazing lance, scales shimmering in the heat.'
    },

    'c_phoenix_fledgling': {
      id: 'c_phoenix_fledgling',
      name: 'Phoenix Fledgling',
      type: 'creature',
      rarity: 'rare',
      cost: 4,
      element: 'fire',
      attack: 3,
      defense: 2,
      hp: 4,
      ability: 'rebirth',
      ability_text: 'When destroyed, return to hand with 1 HP at end of turn.',
      art_description: 'A young phoenix trailing golden embers, feathers not yet fully formed.'
    },

    'c_tide_caller': {
      id: 'c_tide_caller',
      name: 'Tide Caller',
      type: 'creature',
      rarity: 'common',
      cost: 2,
      element: 'water',
      attack: 1,
      defense: 2,
      hp: 3,
      ability: 'heal_wave',
      ability_text: 'At end of your turn, restore 1 HP to any allied creature.',
      art_description: 'A slender figure draped in kelp, commanding the tides with outstretched arms.'
    },

    'c_coral_guardian': {
      id: 'c_coral_guardian',
      name: 'Coral Guardian',
      type: 'creature',
      rarity: 'uncommon',
      cost: 3,
      element: 'water',
      attack: 2,
      defense: 4,
      hp: 5,
      ability: 'barrier',
      ability_text: 'Absorbs first damage each turn. Resets at start of your turn.',
      art_description: 'A towering construct of living coral, moving with the grace of the ocean.'
    },

    'c_sea_serpent': {
      id: 'c_sea_serpent',
      name: 'Sea Serpent',
      type: 'creature',
      rarity: 'rare',
      cost: 5,
      element: 'water',
      attack: 4,
      defense: 3,
      hp: 7,
      ability: 'whirlpool',
      ability_text: 'On attack, enemy creatures cannot retaliate this turn.',
      art_description: 'A massive serpent coiled in an endless spiral beneath the ocean surface.'
    },

    'c_frost_wisp': {
      id: 'c_frost_wisp',
      name: 'Frost Wisp',
      type: 'creature',
      rarity: 'common',
      cost: 1,
      element: 'water',
      attack: 1,
      defense: 1,
      hp: 2,
      ability: 'chill',
      ability_text: 'Target creature loses 1 attack until end of turn.',
      art_description: 'A small orb of swirling ice crystals that drifts silently through frozen air.'
    },

    'c_stone_golem': {
      id: 'c_stone_golem',
      name: 'Stone Golem',
      type: 'creature',
      rarity: 'common',
      cost: 3,
      element: 'earth',
      attack: 2,
      defense: 5,
      hp: 5,
      ability: 'taunt',
      ability_text: 'Enemies must attack this creature if able.',
      art_description: 'A hulking golem carved from ancient granite, mosses growing in its cracks.'
    },

    'c_thornback_boar': {
      id: 'c_thornback_boar',
      name: 'Thornback Boar',
      type: 'creature',
      rarity: 'common',
      cost: 2,
      element: 'earth',
      attack: 3,
      defense: 1,
      hp: 3,
      ability: 'trample',
      ability_text: 'Excess damage carries over to the enemy player.',
      art_description: 'A massive boar with stone-hard hide and thorn-sharp tusks, charging wildly.'
    },

    'c_earth_colossus': {
      id: 'c_earth_colossus',
      name: 'Earth Colossus',
      type: 'creature',
      rarity: 'epic',
      cost: 7,
      element: 'earth',
      attack: 6,
      defense: 6,
      hp: 10,
      ability: 'earthquake',
      ability_text: 'On attack, deal 2 damage to all enemy creatures.',
      art_description: 'A walking mountain of living stone, each step shaking the ground for miles.'
    },

    'c_vine_shaman': {
      id: 'c_vine_shaman',
      name: 'Vine Shaman',
      type: 'creature',
      rarity: 'uncommon',
      cost: 3,
      element: 'earth',
      attack: 2,
      defense: 2,
      hp: 4,
      ability: 'entangle',
      ability_text: 'Target enemy creature cannot attack next turn.',
      art_description: 'An elder draped in living vines, commanding the roots to rise and bind foes.'
    },

    'c_wind_dancer': {
      id: 'c_wind_dancer',
      name: 'Wind Dancer',
      type: 'creature',
      rarity: 'common',
      cost: 2,
      element: 'air',
      attack: 2,
      defense: 1,
      hp: 2,
      ability: 'evasion',
      ability_text: '50% chance to dodge single-target attacks.',
      art_description: 'A graceful figure that seems to dissolve into swirling air currents mid-movement.'
    },

    'c_storm_hawk': {
      id: 'c_storm_hawk',
      name: 'Storm Hawk',
      type: 'creature',
      rarity: 'uncommon',
      cost: 3,
      element: 'air',
      attack: 4,
      defense: 2,
      hp: 3,
      ability: 'dive_strike',
      ability_text: 'First attack deals double damage.',
      art_description: 'A massive hawk riding on storm clouds, lightning crackling between its feathers.'
    },

    'c_cyclone_elemental': {
      id: 'c_cyclone_elemental',
      name: 'Cyclone Elemental',
      type: 'creature',
      rarity: 'rare',
      cost: 5,
      element: 'air',
      attack: 4,
      defense: 3,
      hp: 5,
      ability: 'vortex',
      ability_text: 'At start of turn, deal 1 damage to all enemies.',
      art_description: 'A howling tornado given form, debris orbiting its spinning core.'
    },

    'c_spirit_guide': {
      id: 'c_spirit_guide',
      name: 'Spirit Guide',
      type: 'creature',
      rarity: 'uncommon',
      cost: 2,
      element: 'spirit',
      attack: 1,
      defense: 2,
      hp: 3,
      ability: 'mana_surge',
      ability_text: 'Gain 1 extra mana this turn when played.',
      art_description: 'A translucent entity of pure light, drifting between the planes of existence.'
    },

    'c_soul_reaver': {
      id: 'c_soul_reaver',
      name: 'Soul Reaver',
      type: 'creature',
      rarity: 'rare',
      cost: 4,
      element: 'spirit',
      attack: 4,
      defense: 2,
      hp: 4,
      ability: 'life_drain',
      ability_text: 'Heals your HP by half the damage dealt.',
      art_description: 'A dark wraith with clawed hands that pull the life-force from living beings.'
    },

    'c_void_stalker': {
      id: 'c_void_stalker',
      name: 'Void Stalker',
      type: 'creature',
      rarity: 'epic',
      cost: 6,
      element: 'spirit',
      attack: 5,
      defense: 3,
      hp: 6,
      ability: 'phase_shift',
      ability_text: 'Cannot be targeted by spells or traps.',
      art_description: 'A creature that slips between dimensions, appearing only to strike.'
    },

    'c_ghost_wisp': {
      id: 'c_ghost_wisp',
      name: 'Ghost Wisp',
      type: 'creature',
      rarity: 'common',
      cost: 1,
      element: 'spirit',
      attack: 1,
      defense: 1,
      hp: 1,
      ability: 'haunt',
      ability_text: 'When destroyed, give opponent a curse card.',
      art_description: 'A flickering pale light that drifts aimlessly, passing through solid walls.'
    },

    'c_magma_wyrm': {
      id: 'c_magma_wyrm',
      name: 'Magma Wyrm',
      type: 'creature',
      rarity: 'epic',
      cost: 6,
      element: 'fire',
      attack: 6,
      defense: 4,
      hp: 7,
      ability: 'flame_breath',
      ability_text: 'On attack, also deals 2 damage to all other enemy creatures.',
      art_description: 'A dragon-like creature of pure magma, melting the ground beneath its claws.'
    },

    'c_crystal_golem': {
      id: 'c_crystal_golem',
      name: 'Crystal Golem',
      type: 'creature',
      rarity: 'rare',
      cost: 4,
      element: 'earth',
      attack: 3,
      defense: 5,
      hp: 6,
      ability: 'reflect',
      ability_text: 'Reflects spell damage back at caster.',
      art_description: 'A humanoid of giant crystals that refracts light into deadly beams.'
    },

    'c_tempest_rider': {
      id: 'c_tempest_rider',
      name: 'Tempest Rider',
      type: 'creature',
      rarity: 'uncommon',
      cost: 4,
      element: 'air',
      attack: 3,
      defense: 2,
      hp: 4,
      ability: 'tailwind',
      ability_text: 'Allied air creatures gain +2 attack this turn.',
      art_description: 'A warrior mounted on a living storm cloud, lance crackling with electricity.'
    },

    // -----------------------------------------------------------------------
    // SPELL CARDS (15+)
    // -----------------------------------------------------------------------

    's_fireball': {
      id: 's_fireball',
      name: 'Fireball',
      type: 'spell',
      rarity: 'common',
      cost: 3,
      element: 'fire',
      effect: 'damage',
      effect_value: 4,
      target: 'any',
      ability_text: 'Deal 4 damage to any target.',
      art_description: 'A swirling orb of concentrated fire launched from an outstretched palm.'
    },

    's_inferno': {
      id: 's_inferno',
      name: 'Inferno',
      type: 'spell',
      rarity: 'rare',
      cost: 6,
      element: 'fire',
      effect: 'aoe_damage',
      effect_value: 3,
      target: 'all_enemies',
      ability_text: 'Deal 3 damage to all enemy creatures.',
      art_description: 'Pillars of fire erupt across the entire battlefield in sequence.'
    },

    's_ember_step': {
      id: 's_ember_step',
      name: 'Ember Step',
      type: 'spell',
      rarity: 'common',
      cost: 1,
      element: 'fire',
      effect: 'buff_attack',
      effect_value: 2,
      target: 'allied_creature',
      ability_text: 'Give target allied creature +2 attack until end of turn.',
      art_description: 'Flames swirl around a warrior\'s feet, propelling them forward with explosive force.'
    },

    's_tidal_wave': {
      id: 's_tidal_wave',
      name: 'Tidal Wave',
      type: 'spell',
      rarity: 'rare',
      cost: 5,
      element: 'water',
      effect: 'push_back',
      effect_value: 2,
      target: 'all_enemies',
      ability_text: 'Deal 2 damage to all enemies. Enemy creatures skip next attack.',
      art_description: 'A massive wall of water that crashes across the field, scattering everything.'
    },

    's_frost_nova': {
      id: 's_frost_nova',
      name: 'Frost Nova',
      type: 'spell',
      rarity: 'uncommon',
      cost: 3,
      element: 'water',
      effect: 'freeze',
      effect_value: 1,
      target: 'all_enemy_creatures',
      ability_text: 'Freeze all enemy creatures. They cannot attack next turn.',
      art_description: 'Crystals of ice burst outward from a central point, encasing everything in frost.'
    },

    's_mending_waters': {
      id: 's_mending_waters',
      name: 'Mending Waters',
      type: 'spell',
      rarity: 'common',
      cost: 2,
      element: 'water',
      effect: 'heal',
      effect_value: 4,
      target: 'player_or_creature',
      ability_text: 'Restore 4 HP to yourself or a target allied creature.',
      art_description: 'Gentle streams flow upward, weaving through wounds and sealing them shut.'
    },

    's_stone_skin': {
      id: 's_stone_skin',
      name: 'Stone Skin',
      type: 'spell',
      rarity: 'common',
      cost: 2,
      element: 'earth',
      effect: 'buff_defense',
      effect_value: 3,
      target: 'allied_creature',
      ability_text: 'Give target allied creature +3 defense until end of turn.',
      art_description: 'Rock and earth crawl up the target\'s body, hardening into natural armor.'
    },

    's_earthquake_strike': {
      id: 's_earthquake_strike',
      name: 'Earthquake Strike',
      type: 'spell',
      rarity: 'uncommon',
      cost: 4,
      element: 'earth',
      effect: 'stun',
      effect_value: 2,
      target: 'enemy_creature',
      ability_text: 'Stun target enemy creature and deal 2 damage.',
      art_description: 'The ground ruptures beneath a foe, throwing them into the air.'
    },

    's_gale_force': {
      id: 's_gale_force',
      name: 'Gale Force',
      type: 'spell',
      rarity: 'uncommon',
      cost: 3,
      element: 'air',
      effect: 'draw',
      effect_value: 2,
      target: 'self',
      ability_text: 'Draw 2 cards.',
      art_description: 'A rush of wind whips through the air, scattering cards into the caster\'s hands.'
    },

    's_lightning_bolt': {
      id: 's_lightning_bolt',
      name: 'Lightning Bolt',
      type: 'spell',
      rarity: 'common',
      cost: 2,
      element: 'air',
      effect: 'damage',
      effect_value: 3,
      target: 'any',
      ability_text: 'Deal 3 damage to any target.',
      art_description: 'A jagged bolt of pure lightning leaps from fingertip to target.'
    },

    's_spirit_link': {
      id: 's_spirit_link',
      name: 'Spirit Link',
      type: 'spell',
      rarity: 'uncommon',
      cost: 3,
      element: 'spirit',
      effect: 'copy_ability',
      effect_value: 1,
      target: 'allied_creature',
      ability_text: 'Copy target allied creature\'s ability onto another creature.',
      art_description: 'Ethereal threads connect two creatures, pulsing with shared energy.'
    },

    's_soul_harvest': {
      id: 's_soul_harvest',
      name: 'Soul Harvest',
      type: 'spell',
      rarity: 'rare',
      cost: 4,
      element: 'spirit',
      effect: 'drain',
      effect_value: 3,
      target: 'enemy_creature',
      ability_text: 'Destroy target enemy creature with 3 or less HP, gain 3 HP.',
      art_description: 'Dark tendrils wrap around a foe, extracting their life force.'
    },

    's_mana_crystal': {
      id: 's_mana_crystal',
      name: 'Mana Crystal',
      type: 'spell',
      rarity: 'rare',
      cost: 0,
      element: 'spirit',
      effect: 'gain_mana',
      effect_value: 3,
      target: 'self',
      ability_text: 'Gain 3 mana this turn.',
      art_description: 'A perfect crystal that shatters, releasing pure arcane energy.'
    },

    's_counter_spell': {
      id: 's_counter_spell',
      name: 'Counter Spell',
      type: 'spell',
      rarity: 'uncommon',
      cost: 2,
      element: 'spirit',
      effect: 'negate',
      effect_value: 0,
      target: 'opponent_spell',
      ability_text: 'Cancel target spell. Your opponent loses the mana spent.',
      art_description: 'Two magical forces collide and annihilate each other in a flash of light.'
    },

    's_wildfire': {
      id: 's_wildfire',
      name: 'Wildfire',
      type: 'spell',
      rarity: 'epic',
      cost: 8,
      element: 'fire',
      effect: 'aoe_damage',
      effect_value: 5,
      target: 'all_enemies',
      ability_text: 'Deal 5 damage to all enemies and their player.',
      art_description: 'An uncontrollable blaze that sweeps across the entire arena.'
    },

    's_revival': {
      id: 's_revival',
      name: 'Revival',
      type: 'spell',
      rarity: 'epic',
      cost: 6,
      element: 'spirit',
      effect: 'resurrect',
      effect_value: 1,
      target: 'destroyed_creature',
      ability_text: 'Return any destroyed creature to play with half HP.',
      art_description: 'Shining light pours into the battlefield, calling a fallen warrior back.'
    },

    // -----------------------------------------------------------------------
    // TRAP CARDS (10+)
    // -----------------------------------------------------------------------

    'tr_ambush': {
      id: 'tr_ambush',
      name: 'Ambush',
      type: 'trap',
      rarity: 'common',
      cost: 2,
      element: 'earth',
      trigger: 'enemy_attack',
      effect: 'counter_damage',
      effect_value: 3,
      ability_text: 'Trigger: When enemy attacks. Effect: Deal 3 damage to attacker.',
      art_description: 'Hidden figures leap from concealment to strike the attacking foe.'
    },

    'tr_mirror_shield': {
      id: 'tr_mirror_shield',
      name: 'Mirror Shield',
      type: 'trap',
      rarity: 'uncommon',
      cost: 3,
      element: 'spirit',
      trigger: 'enemy_spell',
      effect: 'reflect_spell',
      effect_value: 0,
      ability_text: 'Trigger: When enemy casts a spell. Effect: Redirect spell back at caster.',
      art_description: 'A shield of pure light that materializes to deflect magic attacks.'
    },

    'tr_pit_trap': {
      id: 'tr_pit_trap',
      name: 'Pit Trap',
      type: 'trap',
      rarity: 'common',
      cost: 1,
      element: 'earth',
      trigger: 'creature_enter',
      effect: 'stun',
      effect_value: 1,
      ability_text: 'Trigger: When enemy plays a creature. Effect: Stun it for 1 turn.',
      art_description: 'The ground gives way beneath a newly-summoned creature\'s feet.'
    },

    'tr_mana_drain': {
      id: 'tr_mana_drain',
      name: 'Mana Drain',
      type: 'trap',
      rarity: 'rare',
      cost: 3,
      element: 'spirit',
      trigger: 'spell_cast',
      effect: 'steal_mana',
      effect_value: 2,
      ability_text: 'Trigger: When enemy casts spell costing 3+. Effect: Steal 2 mana.',
      art_description: 'Siphoning tendrils intercept magical energy mid-cast.'
    },

    'tr_chain_lightning': {
      id: 'tr_chain_lightning',
      name: 'Chain Lightning',
      type: 'trap',
      rarity: 'uncommon',
      cost: 3,
      element: 'air',
      trigger: 'enemy_attack',
      effect: 'aoe_damage',
      effect_value: 2,
      ability_text: 'Trigger: When enemy creature attacks. Effect: Deal 2 damage to all enemy creatures.',
      art_description: 'A trap wire triggers an explosive burst of lightning across the field.'
    },

    'tr_quicksand': {
      id: 'tr_quicksand',
      name: 'Quicksand',
      type: 'trap',
      rarity: 'uncommon',
      cost: 2,
      element: 'earth',
      trigger: 'creature_enter',
      effect: 'reduce_attack',
      effect_value: 2,
      ability_text: 'Trigger: When enemy plays creature. Effect: That creature gets -2 attack permanently.',
      art_description: 'The ground liquefies and drags the creature down, hampering its movement.'
    },

    'tr_ice_barrage': {
      id: 'tr_ice_barrage',
      name: 'Ice Barrage',
      type: 'trap',
      rarity: 'common',
      cost: 2,
      element: 'water',
      trigger: 'turn_end',
      effect: 'freeze',
      effect_value: 1,
      ability_text: 'Trigger: End of enemy turn. Effect: Freeze one random enemy creature.',
      art_description: 'A volley of ice shards launches at the end of the enemy\'s turn.'
    },

    'tr_soul_cage': {
      id: 'tr_soul_cage',
      name: 'Soul Cage',
      type: 'trap',
      rarity: 'rare',
      cost: 4,
      element: 'spirit',
      trigger: 'creature_death',
      effect: 'steal_creature',
      effect_value: 0,
      ability_text: 'Trigger: When any creature is destroyed. Effect: Add a copy to your hand.',
      art_description: 'A spectral cage captures the departing spirit of a defeated creature.'
    },

    'tr_explosive_rune': {
      id: 'tr_explosive_rune',
      name: 'Explosive Rune',
      type: 'trap',
      rarity: 'uncommon',
      cost: 3,
      element: 'fire',
      trigger: 'step_on',
      effect: 'damage',
      effect_value: 4,
      ability_text: 'Trigger: When enemy creature enters play. Effect: Deal 4 damage to that creature.',
      art_description: 'A glowing rune inscribed on the ground detonates when stepped upon.'
    },

    'tr_time_warp': {
      id: 'tr_time_warp',
      name: 'Time Warp',
      type: 'trap',
      rarity: 'epic',
      cost: 5,
      element: 'spirit',
      trigger: 'low_hp',
      effect: 'extra_turn',
      effect_value: 1,
      ability_text: 'Trigger: When your HP drops below 10. Effect: Take an extra turn.',
      art_description: 'The flow of time freezes, giving the caster precious moments to act.'
    },

    'tr_decoy': {
      id: 'tr_decoy',
      name: 'Decoy',
      type: 'trap',
      rarity: 'common',
      cost: 1,
      element: 'air',
      trigger: 'enemy_attack',
      effect: 'redirect',
      effect_value: 0,
      ability_text: 'Trigger: When enemy attacks a creature. Effect: Redirect attack to another creature.',
      art_description: 'A mirror-image phantom appears to confuse the attacking enemy.'
    },

    // -----------------------------------------------------------------------
    // EQUIPMENT CARDS (10+)
    // -----------------------------------------------------------------------

    'e_flame_sword': {
      id: 'e_flame_sword',
      name: 'Flame Sword',
      type: 'equipment',
      rarity: 'uncommon',
      cost: 2,
      element: 'fire',
      stat_boost: { attack: 2 },
      duration: -1,
      ability_text: 'Equipped creature gains +2 attack. Permanent.',
      art_description: 'A steel sword with a blade permanently engulfed in white-hot flames.'
    },

    'e_frost_shield': {
      id: 'e_frost_shield',
      name: 'Frost Shield',
      type: 'equipment',
      rarity: 'uncommon',
      cost: 2,
      element: 'water',
      stat_boost: { defense: 3 },
      duration: -1,
      ability_text: 'Equipped creature gains +3 defense. Permanent.',
      art_description: 'A shield carved from everlasting ice that never melts.'
    },

    'e_earth_boots': {
      id: 'e_earth_boots',
      name: 'Earth Boots',
      type: 'equipment',
      rarity: 'common',
      cost: 1,
      element: 'earth',
      stat_boost: { hp: 3 },
      duration: -1,
      ability_text: 'Equipped creature gains +3 max HP (restored immediately). Permanent.',
      art_description: 'Heavy boots forged from compressed earth that root the wearer firmly.'
    },

    'e_wind_cloak': {
      id: 'e_wind_cloak',
      name: 'Wind Cloak',
      type: 'equipment',
      rarity: 'uncommon',
      cost: 2,
      element: 'air',
      stat_boost: { attack: 1, defense: 1 },
      duration: 3,
      ability_text: 'Equipped creature gains +1 attack and +1 defense for 3 turns.',
      art_description: 'A shimmering cloak woven from compressed wind currents.'
    },

    'e_spirit_amulet': {
      id: 'e_spirit_amulet',
      name: 'Spirit Amulet',
      type: 'equipment',
      rarity: 'rare',
      cost: 3,
      element: 'spirit',
      stat_boost: { attack: 2, hp: 2 },
      duration: -1,
      ability_text: 'Equipped creature gains +2 attack and +2 HP. Permanent.',
      art_description: 'A glowing amulet that channels spectral energy into the wearer.'
    },

    'e_lava_gauntlets': {
      id: 'e_lava_gauntlets',
      name: 'Lava Gauntlets',
      type: 'equipment',
      rarity: 'rare',
      cost: 3,
      element: 'fire',
      stat_boost: { attack: 4 },
      duration: 2,
      ability_text: 'Equipped creature gains +4 attack for 2 turns then takes 2 damage.',
      art_description: 'Gauntlets formed from cooling lava that supercharge strikes at cost.'
    },

    'e_coral_armor': {
      id: 'e_coral_armor',
      name: 'Coral Armor',
      type: 'equipment',
      rarity: 'common',
      cost: 2,
      element: 'water',
      stat_boost: { defense: 2, hp: 2 },
      duration: -1,
      ability_text: 'Equipped creature gains +2 defense and +2 HP. Permanent.',
      art_description: 'Armor grown from living coral that hardens further when struck.'
    },

    'e_thunder_spear': {
      id: 'e_thunder_spear',
      name: 'Thunder Spear',
      type: 'equipment',
      rarity: 'uncommon',
      cost: 3,
      element: 'air',
      stat_boost: { attack: 3 },
      duration: -1,
      ability_text: 'Equipped creature gains +3 attack. First strike.',
      art_description: 'A spear crackling with stored lightning that strikes before the enemy can react.'
    },

    'e_ancient_tome': {
      id: 'e_ancient_tome',
      name: 'Ancient Tome',
      type: 'equipment',
      rarity: 'rare',
      cost: 3,
      element: 'spirit',
      stat_boost: { attack: 1 },
      duration: -1,
      ability_text: 'Equipped creature gains +1 attack. Spells you cast cost 1 less mana. Permanent.',
      art_description: 'A weathered tome that enhances magical ability through forbidden knowledge.'
    },

    'e_crystal_crown': {
      id: 'e_crystal_crown',
      name: 'Crystal Crown',
      type: 'equipment',
      rarity: 'epic',
      cost: 4,
      element: 'earth',
      stat_boost: { attack: 2, defense: 2, hp: 4 },
      duration: -1,
      ability_text: 'Equipped creature gains +2 attack, +2 defense, +4 HP. Permanent.',
      art_description: 'A crown of perfect crystals that amplifies the bearer\'s innate power.'
    },

    // -----------------------------------------------------------------------
    // LEGENDARY CARDS (5+)
    // -----------------------------------------------------------------------

    'l_zion_avatar': {
      id: 'l_zion_avatar',
      name: 'Zion Avatar',
      type: 'legendary',
      rarity: 'legendary',
      cost: 9,
      element: 'spirit',
      attack: 8,
      defense: 8,
      hp: 12,
      ability: 'world_will',
      ability_text: 'Cannot be targeted. At end of every turn, heal 2 HP. When destroyed, draw 3 cards.',
      art_description: 'A radiant being of pure collective will, formed from the dreams of all citizens.'
    },

    'l_the_architect': {
      id: 'l_the_architect',
      name: 'The Architect',
      type: 'legendary',
      rarity: 'legendary',
      cost: 8,
      element: 'earth',
      attack: 5,
      defense: 7,
      hp: 10,
      ability: 'master_builder',
      ability_text: 'All equipment costs 0. Allied creatures gain +2 defense.',
      art_description: 'The original designer of the world, surrounded by floating blueprints.'
    },

    'l_storm_sovereign': {
      id: 'l_storm_sovereign',
      name: 'Storm Sovereign',
      type: 'legendary',
      rarity: 'legendary',
      cost: 8,
      element: 'air',
      attack: 7,
      defense: 5,
      hp: 9,
      ability: 'sovereign_storm',
      ability_text: 'At start of each turn, deal 1 damage to all enemies. Air creatures cost 2 less.',
      art_description: 'A monarch riding a perpetual hurricane, command absolute over weather.'
    },

    'l_deep_leviathan': {
      id: 'l_deep_leviathan',
      name: 'Deep Leviathan',
      type: 'legendary',
      rarity: 'legendary',
      cost: 10,
      element: 'water',
      attack: 9,
      defense: 6,
      hp: 14,
      ability: 'abyss_call',
      ability_text: 'When played, destroy all creatures with 5 or less HP. Taunt.',
      art_description: 'An ancient sea-beast that predates the world itself, vast beyond imagination.'
    },

    'l_infernal_dragon': {
      id: 'l_infernal_dragon',
      name: 'Infernal Dragon',
      type: 'legendary',
      rarity: 'legendary',
      cost: 9,
      element: 'fire',
      attack: 8,
      defense: 5,
      hp: 11,
      ability: 'dragon_fury',
      ability_text: 'Attacks twice each turn. First attack hits creature, second hits player directly.',
      art_description: 'The primordial fire dragon whose breath ignited the first sun.'
    }

  };

  // =========================================================================
  // COLLECTION MANAGEMENT
  // =========================================================================

  // In-memory collections: playerId -> { cardId: count }
  var _collections = {};

  /**
   * Get all cards a player owns.
   * @param {string} playerId
   * @returns {Object} map of cardId -> count
   */
  function getPlayerCollection(playerId) {
    if (!_collections[playerId]) {
      _collections[playerId] = {};
    }
    return JSON.parse(JSON.stringify(_collections[playerId]));
  }

  /**
   * Add a card to a player's collection.
   * @param {string} playerId
   * @param {string} cardId
   * @returns {Object} { success, cardId, count }
   */
  function addCardToCollection(playerId, cardId) {
    if (!CARD_CATALOG[cardId]) {
      return { success: false, error: 'Card not found: ' + cardId };
    }
    if (!_collections[playerId]) {
      _collections[playerId] = {};
    }
    var current = _collections[playerId][cardId] || 0;
    _collections[playerId][cardId] = current + 1;
    return {
      success: true,
      cardId: cardId,
      count: _collections[playerId][cardId],
      card: CARD_CATALOG[cardId]
    };
  }

  /**
   * Generate a card reward for a given achievement.
   * @param {string} achievementId
   * @returns {Object} card definition
   */
  function generateCardFromAchievement(achievementId) {
    var achievementCardMap = {
      'first_battle': 'c_ember_sprite',
      'first_win': 'c_fire_wolf',
      'zone_hopper': 'c_wind_dancer',
      'world_traveler': 'c_cyclone_elemental',
      'builder': 'e_earth_boots',
      'merchant': 's_mana_crystal',
      'teacher': 's_spirit_link',
      'healer': 's_mending_waters',
      'explorer': 'c_storm_hawk',
      'social': 'c_spirit_guide',
      'legendary_win': 'l_zion_avatar',
      'perfect_game': 'l_infernal_dragon',
      'collector': 'l_the_architect'
    };
    var cardId = achievementCardMap[achievementId];
    if (!cardId) {
      // Default: give a common card based on achievement hash
      var keys = Object.keys(CARD_CATALOG).filter(function(k) {
        return CARD_CATALOG[k].rarity === 'common';
      });
      var idx = Math.abs(hashString(achievementId)) % keys.length;
      cardId = keys[idx];
    }
    return CARD_CATALOG[cardId] || null;
  }

  // Simple string hash
  function hashString(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // =========================================================================
  // DECK MANAGEMENT
  // =========================================================================

  /**
   * Create a new deck.
   * @param {string} playerId
   * @param {string} name
   * @param {string[]} cardIds - array of card IDs (duplicates allowed)
   * @returns {Object} deck object
   */
  function createDeck(playerId, name, cardIds) {
    var deck = {
      id: 'deck_' + playerId + '_' + Date.now(),
      playerId: playerId,
      name: name || 'My Deck',
      cards: cardIds ? cardIds.slice() : [],
      createdAt: Date.now()
    };
    return deck;
  }

  /**
   * Validate a deck for legality.
   * @param {Object} deck - deck object
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  function validateDeck(deck) {
    var errors = [];

    if (!deck || !Array.isArray(deck.cards)) {
      return { valid: false, errors: ['Invalid deck structure'] };
    }

    var count = deck.cards.length;
    if (count < DECK_MIN) {
      errors.push('Deck has ' + count + ' cards; minimum is ' + DECK_MIN);
    }
    if (count > DECK_MAX) {
      errors.push('Deck has ' + count + ' cards; maximum is ' + DECK_MAX);
    }

    // Count copies per card
    var copies = {};
    for (var i = 0; i < deck.cards.length; i++) {
      var cid = deck.cards[i];
      if (!CARD_CATALOG[cid]) {
        errors.push('Unknown card: ' + cid);
        continue;
      }
      copies[cid] = (copies[cid] || 0) + 1;
    }

    // Check copy limits
    for (var cardId in copies) {
      var card = CARD_CATALOG[cardId];
      if (!card) continue;
      var limit = (card.rarity === 'legendary' || card.type === 'legendary') ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD;
      if (copies[cardId] > limit) {
        errors.push('Too many copies of "' + card.name + '": ' + copies[cardId] + ' (max ' + limit + ')');
      }
    }

    // Element balance check: no single element should exceed 80% of creature cards
    var elementCount = {};
    var totalCreatures = 0;
    for (var j = 0; j < deck.cards.length; j++) {
      var c = CARD_CATALOG[deck.cards[j]];
      if (c && c.type === 'creature') {
        totalCreatures++;
        elementCount[c.element] = (elementCount[c.element] || 0) + 1;
      }
    }
    if (totalCreatures > 0) {
      for (var el in elementCount) {
        var pct = elementCount[el] / totalCreatures;
        if (pct > 0.8) {
          errors.push('Element imbalance: ' + el + ' makes up ' + Math.round(pct * 100) + '% of creatures (max 80%)');
        }
      }
    }

    return { valid: errors.length === 0, errors: errors };
  }

  // =========================================================================
  // BATTLE STATE
  // =========================================================================

  /**
   * Start a battle between two decks.
   * @param {Object} player1Deck - deck object { playerId, cards }
   * @param {Object} player2Deck - deck object { playerId, cards }
   * @returns {Object} battleState
   */
  function startBattle(player1Deck, player2Deck) {
    var p1 = _createPlayerBattleState(player1Deck);
    var p2 = _createPlayerBattleState(player2Deck);

    // Draw starting hands
    for (var i = 0; i < STARTING_HAND; i++) {
      _drawFromDeck(p1);
      _drawFromDeck(p2);
    }

    var state = {
      id: 'battle_' + Date.now(),
      turn: 1,
      activePlayer: player1Deck.playerId,
      phase: 'main',  // 'draw', 'main', 'battle', 'end'
      players: {},
      graveyard: { [player1Deck.playerId]: [], [player2Deck.playerId]: [] },
      trapZone: { [player1Deck.playerId]: [], [player2Deck.playerId]: [] },
      log: [],
      winner: null,
      started: Date.now()
    };
    state.players[player1Deck.playerId] = p1;
    state.players[player2Deck.playerId] = p2;

    _logEvent(state, 'Battle started between ' + player1Deck.playerId + ' and ' + player2Deck.playerId);
    return state;
  }

  function _createPlayerBattleState(deck) {
    // Shuffle a copy of the deck
    var cards = deck.cards.slice();
    _shuffleArray(cards);
    return {
      playerId: deck.playerId,
      hp: STARTING_HP,
      maxHp: STARTING_HP,
      mana: STARTING_MANA,
      maxMana: STARTING_MANA,
      deck: cards,
      hand: [],
      field: [],      // active creatures on field, each is a battle-card instance
      equipment: {},  // creatureInstanceId -> [equipment cards]
      hasSummoned: false,
      hasAttacked: {}
    };
  }

  function _shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  function _drawFromDeck(playerState) {
    if (playerState.deck.length === 0) {
      // Fatigue: take 1 damage for empty deck draw
      playerState.hp = Math.max(0, playerState.hp - 1);
      return null;
    }
    if (playerState.hand.length >= HAND_MAX) {
      // Overdraw: discard
      var discarded = playerState.deck.shift();
      return null;
    }
    var cardId = playerState.deck.shift();
    playerState.hand.push(cardId);
    return cardId;
  }

  /**
   * Draw a card for a player during battle.
   * @param {Object} battleState
   * @param {string} playerId
   * @returns {Object} { success, cardId, card }
   */
  function drawCard(battleState, playerId) {
    var pState = battleState.players[playerId];
    if (!pState) return { success: false, error: 'Player not found' };
    var cardId = _drawFromDeck(pState);
    if (cardId === null) {
      return { success: false, error: 'No cards to draw or hand full' };
    }
    _logEvent(battleState, playerId + ' drew a card');
    return { success: true, cardId: cardId, card: CARD_CATALOG[cardId] };
  }

  /**
   * Play a card from hand.
   * @param {Object} battleState
   * @param {string} playerId
   * @param {string} cardId
   * @param {string|null} target - target ID (player ID, creature instance ID, or null)
   * @returns {Object} result
   */
  function playCard(battleState, playerId, cardId, target) {
    if (battleState.winner) return { success: false, error: 'Battle is over' };
    if (battleState.activePlayer !== playerId) return { success: false, error: 'Not your turn' };

    var pState = battleState.players[playerId];
    if (!pState) return { success: false, error: 'Player not found' };

    // Check hand
    var handIdx = pState.hand.indexOf(cardId);
    if (handIdx === -1) return { success: false, error: 'Card not in hand' };

    var card = CARD_CATALOG[cardId];
    if (!card) return { success: false, error: 'Unknown card' };

    // Check mana
    var cost = card.cost;
    // Ancient Tome equipment bonus
    var tomeBonus = _hasEquipmentBonus(pState, 'e_ancient_tome');
    if (tomeBonus && (card.type === 'spell')) cost = Math.max(0, cost - 1);

    if (pState.mana < cost) {
      return { success: false, error: 'Not enough mana (need ' + cost + ', have ' + pState.mana + ')' };
    }

    // Pay mana
    pState.mana -= cost;

    // Remove from hand
    pState.hand.splice(handIdx, 1);

    var result = { success: true, card: card };

    if (card.type === 'creature' || card.type === 'legendary') {
      result = _playCreature(battleState, playerId, card, result);
    } else if (card.type === 'spell') {
      result = _playSpell(battleState, playerId, card, target, result);
    } else if (card.type === 'trap') {
      result = _playTrap(battleState, playerId, card, result);
    } else if (card.type === 'equipment') {
      result = _playEquipment(battleState, playerId, card, target, result);
    }

    // Check mana_surge ability
    if (card.ability === 'mana_surge') {
      pState.mana = Math.min(pState.maxMana, pState.mana + 1);
    }

    _logEvent(battleState, playerId + ' played ' + card.name);
    checkWinCondition(battleState);
    return result;
  }

  function _playCreature(battleState, playerId, card, result) {
    var pState = battleState.players[playerId];
    if (pState.field.length >= FIELD_MAX) {
      // Refund mana and put card back — field full
      pState.mana += card.cost;
      result.success = false;
      result.error = 'Field is full (max ' + FIELD_MAX + ' creatures)';
      return result;
    }
    var instance = _createCreatureInstance(card, playerId);
    pState.field.push(instance);
    pState.hasSummoned = true;
    result.instanceId = instance.id;
    result.creature = instance;

    // On-enter abilities
    if (card.ability === 'ignite') {
      // Deal 1 to any target — default to opponent
      var oppId = _getOpponent(battleState, playerId);
      if (oppId) battleState.players[oppId].hp -= 1;
    } else if (card.ability === 'abyss_call') {
      // Destroy all creatures with HP <= 5
      var oppId2 = _getOpponent(battleState, playerId);
      if (oppId2) {
        var toDestroy = [];
        var oppField = battleState.players[oppId2].field;
        for (var i = oppField.length - 1; i >= 0; i--) {
          if (oppField[i].currentHp <= 5) toDestroy.push(i);
        }
        for (var d = toDestroy.length - 1; d >= 0; d--) {
          var destroyed = oppField.splice(toDestroy[d], 1)[0];
          battleState.graveyard[oppId2].push(destroyed.cardId);
        }
      }
    }
    return result;
  }

  function _createCreatureInstance(card, ownerId) {
    var inst = {
      id: 'ci_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      cardId: card.id,
      name: card.name,
      ownerId: ownerId,
      attack: card.attack || 0,
      defense: card.defense || 0,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
      ability: card.ability || null,
      element: card.element,
      rarity: card.rarity,
      type: card.type,
      canAttack: card.ability === 'swift',  // swift creatures attack immediately
      isFrozen: false,
      isStunned: false,
      isTaunting: card.ability === 'taunt',
      hasBarrier: card.ability === 'barrier',
      hasEvasion: card.ability === 'evasion',
      attackUsed: false
    };
    return inst;
  }

  function _playSpell(battleState, playerId, card, target, result) {
    var pState = battleState.players[playerId];
    var oppId = _getOpponent(battleState, playerId);
    var oState = battleState.players[oppId];

    // Check traps that react to spells
    _checkSpellTraps(battleState, oppId, playerId, card);

    switch (card.effect) {
      case 'damage':
        var dmgTarget = _resolveTarget(battleState, target, playerId);
        if (dmgTarget && dmgTarget.isPlayer) {
          var tpState = battleState.players[dmgTarget.id];
          if (tpState) tpState.hp -= card.effect_value;
        } else if (dmgTarget && dmgTarget.creature) {
          _damageCreature(battleState, dmgTarget.creature, card.effect_value, playerId);
        }
        break;

      case 'aoe_damage':
        if (oState) {
          for (var i = oState.field.length - 1; i >= 0; i--) {
            _damageCreature(battleState, oState.field[i], card.effect_value, playerId);
          }
          if (card.id === 's_wildfire') {
            oState.hp -= card.effect_value;
          }
        }
        break;

      case 'heal':
        var healTarget = _resolveTarget(battleState, target, playerId);
        if (healTarget && healTarget.isPlayer) {
          pState.hp = Math.min(pState.maxHp, pState.hp + card.effect_value);
        } else if (healTarget && healTarget.creature) {
          healTarget.creature.currentHp = Math.min(healTarget.creature.maxHp, healTarget.creature.currentHp + card.effect_value);
        } else {
          // Default: heal self
          pState.hp = Math.min(pState.maxHp, pState.hp + card.effect_value);
        }
        break;

      case 'buff_attack':
        var buffTarget = _resolveTarget(battleState, target, playerId);
        if (buffTarget && buffTarget.creature && buffTarget.creature.ownerId === playerId) {
          buffTarget.creature.attack += card.effect_value;
        }
        break;

      case 'buff_defense':
        var buffDefTarget = _resolveTarget(battleState, target, playerId);
        if (buffDefTarget && buffDefTarget.creature && buffDefTarget.creature.ownerId === playerId) {
          buffDefTarget.creature.defense += card.effect_value;
        }
        break;

      case 'freeze':
        if (oState) {
          for (var fi = 0; fi < oState.field.length; fi++) {
            oState.field[fi].isFrozen = true;
            oState.field[fi].canAttack = false;
          }
        }
        break;

      case 'push_back':
        if (oState) {
          for (var pi = oState.field.length - 1; pi >= 0; pi--) {
            _damageCreature(battleState, oState.field[pi], card.effect_value, playerId);
          }
          // Mark all enemy creatures as unable to attack
          for (var ai = 0; ai < oState.field.length; ai++) {
            oState.field[ai].canAttack = false;
          }
        }
        break;

      case 'stun':
        var stunTarget = _resolveTarget(battleState, target, playerId);
        if (stunTarget && stunTarget.creature) {
          stunTarget.creature.isStunned = true;
          stunTarget.creature.canAttack = false;
          _damageCreature(battleState, stunTarget.creature, card.effect_value, playerId);
        }
        break;

      case 'draw':
        for (var di = 0; di < card.effect_value; di++) {
          _drawFromDeck(pState);
        }
        break;

      case 'drain':
        var drainTarget = _resolveTarget(battleState, target, playerId);
        if (drainTarget && drainTarget.creature && drainTarget.creature.currentHp <= card.effect_value) {
          // Destroy and gain HP
          _removeCreatureFromField(battleState, drainTarget.creature, oppId);
          battleState.graveyard[oppId].push(drainTarget.creature.cardId);
          pState.hp = Math.min(pState.maxHp, pState.hp + card.effect_value);
        }
        break;

      case 'gain_mana':
        pState.mana = Math.min(MAX_MANA, pState.mana + card.effect_value);
        break;

      case 'negate':
        // Counter spell — handled externally or is passive
        break;

      case 'resurrect':
        // Bring back a destroyed creature
        if (battleState.graveyard[playerId] && battleState.graveyard[playerId].length > 0) {
          var lastDeadId = target || battleState.graveyard[playerId][battleState.graveyard[playerId].length - 1];
          var deadCard = CARD_CATALOG[lastDeadId];
          if (deadCard && pState.field.length < FIELD_MAX) {
            var revivedInst = _createCreatureInstance(deadCard, playerId);
            revivedInst.currentHp = Math.ceil(deadCard.hp / 2);
            pState.field.push(revivedInst);
            var gIdx = battleState.graveyard[playerId].lastIndexOf(lastDeadId);
            if (gIdx !== -1) battleState.graveyard[playerId].splice(gIdx, 1);
          }
        }
        break;

      case 'copy_ability':
        // Spirit Link — complex, skip detailed impl
        break;
    }

    result.effect = card.effect;
    return result;
  }

  function _playTrap(battleState, playerId, card, result) {
    var trapInstance = {
      id: 'trap_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      cardId: card.id,
      name: card.name,
      ownerId: playerId,
      trigger: card.trigger,
      effect: card.effect,
      effect_value: card.effect_value,
      active: true
    };
    battleState.trapZone[playerId].push(trapInstance);
    result.trapId = trapInstance.id;
    return result;
  }

  function _playEquipment(battleState, playerId, card, target, result) {
    var pState = battleState.players[playerId];
    var creature = _findCreatureInstance(pState.field, target);
    if (!creature) {
      // Equip to first creature on field
      creature = pState.field.length > 0 ? pState.field[0] : null;
    }
    if (!creature) {
      result.success = false;
      result.error = 'No creature to equip';
      return result;
    }
    // Apply stat boosts
    if (card.stat_boost) {
      if (card.stat_boost.attack) creature.attack += card.stat_boost.attack;
      if (card.stat_boost.defense) creature.defense += card.stat_boost.defense;
      if (card.stat_boost.hp) {
        creature.maxHp += card.stat_boost.hp;
        creature.currentHp += card.stat_boost.hp;
      }
    }
    if (!pState.equipment[creature.id]) pState.equipment[creature.id] = [];
    pState.equipment[creature.id].push({ cardId: card.id, duration: card.duration, turnsLeft: card.duration });
    result.equippedTo = creature.id;
    result.creature = creature;
    return result;
  }

  // =========================================================================
  // COMBAT
  // =========================================================================

  /**
   * Attack with a creature.
   * @param {Object} battleState
   * @param {string} attackerInstanceId
   * @param {string} targetId - creature instance ID or opponent player ID
   * @returns {Object} result
   */
  function attackWithCreature(battleState, attackerInstanceId, targetId) {
    if (battleState.winner) return { success: false, error: 'Battle is over' };

    var attackerInfo = _findCreatureAnywhere(battleState, attackerInstanceId);
    if (!attackerInfo) return { success: false, error: 'Attacker not found' };

    var attacker = attackerInfo.creature;
    var attackerOwner = attackerInfo.ownerId;

    if (battleState.activePlayer !== attackerOwner) {
      return { success: false, error: 'Not your turn' };
    }

    if (!attacker.canAttack || attacker.attackUsed) {
      return { success: false, error: 'Creature cannot attack' };
    }
    if (attacker.isFrozen || attacker.isStunned) {
      return { success: false, error: 'Creature is frozen/stunned' };
    }

    var oppId = _getOpponent(battleState, attackerOwner);
    var oState = battleState.players[oppId];

    // Check for taunt creatures
    var hasTaunt = oState.field.some(function(c) { return c.isTaunting; });
    var targetCreature = _findCreatureInstance(oState.field, targetId);

    // If taunt exists and target isn't a taunt creature and target isn't the opponent player
    if (hasTaunt && !targetCreature) {
      return { success: false, error: 'Must attack taunt creature first' };
    }
    if (hasTaunt && targetCreature && !targetCreature.isTaunting) {
      return { success: false, error: 'Must attack taunt creature first' };
    }

    // Check traps that react to attacks
    var trapResult = _checkAttackTraps(battleState, oppId, attacker, targetCreature);

    attacker.attackUsed = true;

    var result = { success: true, attacker: attacker };

    if (targetCreature) {
      // Creature vs Creature
      result = _resolveCreatureCombat(battleState, attacker, attackerOwner, targetCreature, oppId, result);
    } else {
      // Attacking player directly
      var dmg = attacker.attack;
      oState.hp -= dmg;
      result.playerDamage = dmg;
      result.targetPlayer = oppId;
      _logEvent(battleState, attacker.name + ' attacks ' + oppId + ' for ' + dmg + ' damage');
    }

    // Infernal Dragon: second attack hits player
    if (attacker.ability === 'dragon_fury' && targetCreature) {
      var bonusDmg = attacker.attack;
      oState.hp -= bonusDmg;
      result.dragonBonus = bonusDmg;
    }

    checkWinCondition(battleState);
    return result;
  }

  function _resolveCreatureCombat(battleState, attacker, attackerOwner, defender, defenderOwner, result) {
    var oppState = battleState.players[defenderOwner];
    var atkState = battleState.players[attackerOwner];

    // Evasion check
    if (defender.hasEvasion && Math.random() < 0.5) {
      result.dodged = true;
      _logEvent(battleState, defender.name + ' dodged the attack!');
      return result;
    }

    var attackDmg = attacker.attack;

    // Dive strike: double on first attack
    if (attacker.ability === 'dive_strike' && !attacker._diveUsed) {
      attackDmg *= 2;
      attacker._diveUsed = true;
    }

    // Barrier check
    if (defender.hasBarrier) {
      defender.hasBarrier = false;
      result.barrierAbsorbed = true;
      _logEvent(battleState, defender.name + ' barrier absorbed attack');
      return result;
    }

    // Apply defense reduction
    var netDmg = Math.max(1, attackDmg - defender.defense);
    defender.currentHp -= netDmg;

    // Molten armor: reflect damage
    if (defender.ability === 'molten_armor') {
      var reflectDmg = 1;
      attacker.currentHp -= reflectDmg;
    }

    // Life drain
    if (attacker.ability === 'life_drain') {
      atkState.hp = Math.min(atkState.maxHp, atkState.hp + Math.floor(netDmg / 2));
    }

    // Trample: excess damage to player
    if (attacker.ability === 'trample' && netDmg > defender.currentHp + netDmg) {
      var excess = -(defender.currentHp); // how much overshot
      if (excess > 0) oppState.hp -= excess;
    }

    result.damage = netDmg;
    result.defenderHp = defender.currentHp;

    _logEvent(battleState, attacker.name + ' attacks ' + defender.name + ' for ' + netDmg + ' damage');

    // Check if defender dies
    if (defender.currentHp <= 0) {
      _creatureDied(battleState, defender, defenderOwner, attacker);
      result.defenderDestroyed = true;
    }

    // Check if attacker dies from retaliation (only when not using abilities like whirlpool)
    if (attacker.ability !== 'whirlpool') {
      var retDmg = Math.max(1, defender.attack - attacker.defense);
      if (!defender.isFrozen && !defender.isStunned && defender.currentHp > 0) {
        attacker.currentHp -= retDmg;
        result.retaliation = retDmg;
        if (attacker.currentHp <= 0) {
          _creatureDied(battleState, attacker, attackerOwner, defender);
          result.attackerDestroyed = true;
        }
      }
    }

    return result;
  }

  function _creatureDied(battleState, creature, ownerId, killer) {
    _removeCreatureFromField(battleState, creature, ownerId);
    battleState.graveyard[ownerId].push(creature.cardId);

    // Rebirth ability
    if (creature.ability === 'rebirth') {
      var pState = battleState.players[ownerId];
      var card = CARD_CATALOG[creature.cardId];
      if (card) {
        var reborn = JSON.parse(JSON.stringify(creature));
        reborn.currentHp = 1;
        reborn.id = 'ci_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
        pState.hand.push(creature.cardId);  // Return to hand
        battleState.graveyard[ownerId].pop();  // Remove from graveyard
      }
    }

    // Ghost wisp: give opponent curse
    if (creature.ability === 'haunt') {
      var oppId = _getOpponent(battleState, ownerId);
      // Add a "curse" card to opponent hand (use a trap card)
      if (battleState.players[oppId]) {
        battleState.players[oppId].hand.push('tr_pit_trap');
      }
    }

    // Soul Cage trap
    _checkCreatureDeathTraps(battleState, creature, ownerId, killer);

    _logEvent(battleState, creature.name + ' was destroyed');
  }

  function _removeCreatureFromField(battleState, creature, ownerId) {
    var field = battleState.players[ownerId] && battleState.players[ownerId].field;
    if (!field) return;
    var idx = field.findIndex(function(c) { return c.id === creature.id; });
    if (idx !== -1) field.splice(idx, 1);
  }

  function _damageCreature(battleState, creature, amount, attackerId) {
    // Check reflect (crystal golem)
    if (creature.ability === 'reflect') {
      // Reflect spell back — damage attacker instead
      var atkOwner = _getOpponent(battleState, creature.ownerId);
      if (atkOwner && battleState.players[atkOwner]) {
        battleState.players[atkOwner].hp -= amount;
      }
      return;
    }

    creature.currentHp -= amount;
    if (creature.currentHp <= 0) {
      _creatureDied(battleState, creature, creature.ownerId, null);
    }
  }

  // =========================================================================
  // TRAP ACTIVATION
  // =========================================================================

  /**
   * Manually activate a trap.
   * @param {Object} battleState
   * @param {string} trapInstanceId
   * @returns {Object} result
   */
  function activateTrap(battleState, trapInstanceId) {
    if (battleState.winner) return { success: false, error: 'Battle is over' };

    var trapInfo = null;
    var trapOwner = null;
    for (var pid in battleState.trapZone) {
      var zone = battleState.trapZone[pid];
      for (var i = 0; i < zone.length; i++) {
        if (zone[i].id === trapInstanceId) {
          trapInfo = zone[i];
          trapOwner = pid;
          break;
        }
      }
      if (trapInfo) break;
    }

    if (!trapInfo) return { success: false, error: 'Trap not found' };
    if (!trapInfo.active) return { success: false, error: 'Trap already used' };

    trapInfo.active = false;
    var result = _executeTrapEffect(battleState, trapInfo, trapOwner);
    // Remove from trap zone
    var zone = battleState.trapZone[trapOwner];
    var idx = zone.findIndex(function(t) { return t.id === trapInstanceId; });
    if (idx !== -1) zone.splice(idx, 1);

    _logEvent(battleState, trapOwner + ' activated trap: ' + trapInfo.name);
    checkWinCondition(battleState);
    return result;
  }

  function _executeTrapEffect(battleState, trap, trapOwner) {
    var oppId = _getOpponent(battleState, trapOwner);
    var oState = battleState.players[oppId];
    var tState = battleState.players[trapOwner];
    var result = { success: true, trap: trap };

    switch (trap.effect) {
      case 'counter_damage':
        if (oState) oState.hp -= trap.effect_value;
        break;
      case 'reflect_spell':
        // Handled in spell resolution
        break;
      case 'stun':
        if (oState && oState.field.length > 0) {
          oState.field[0].isStunned = true;
          oState.field[0].canAttack = false;
        }
        break;
      case 'steal_mana':
        if (oState && tState) {
          var stolen = Math.min(oState.mana, trap.effect_value);
          oState.mana -= stolen;
          tState.mana = Math.min(MAX_MANA, tState.mana + stolen);
        }
        break;
      case 'aoe_damage':
        if (oState) {
          for (var i = oState.field.length - 1; i >= 0; i--) {
            _damageCreature(battleState, oState.field[i], trap.effect_value, trapOwner);
          }
        }
        break;
      case 'reduce_attack':
        if (oState && oState.field.length > 0) {
          oState.field[0].attack = Math.max(0, oState.field[0].attack - trap.effect_value);
        }
        break;
      case 'freeze':
        if (oState && oState.field.length > 0) {
          var target = oState.field[Math.floor(Math.random() * oState.field.length)];
          target.isFrozen = true;
          target.canAttack = false;
        }
        break;
      case 'steal_creature':
        if (battleState.graveyard[oppId] && battleState.graveyard[oppId].length > 0) {
          var lastId = battleState.graveyard[oppId][battleState.graveyard[oppId].length - 1];
          if (tState && tState.hand.length < HAND_MAX) {
            tState.hand.push(lastId);
          }
        }
        break;
      case 'damage':
        if (oState && oState.field.length > 0) {
          _damageCreature(battleState, oState.field[0], trap.effect_value, trapOwner);
        }
        break;
      case 'extra_turn':
        battleState.activePlayer = trapOwner;
        break;
      case 'redirect':
        // Complex — mark as handled
        break;
    }
    return result;
  }

  function _checkAttackTraps(battleState, defenderId, attacker, targetCreature) {
    var zone = battleState.trapZone[defenderId];
    if (!zone) return;
    for (var i = zone.length - 1; i >= 0; i--) {
      var trap = zone[i];
      if (!trap.active) continue;
      if (trap.trigger === 'enemy_attack') {
        trap.active = false;
        _executeTrapEffect(battleState, trap, defenderId);
        zone.splice(i, 1);
      }
    }
  }

  function _checkSpellTraps(battleState, defenderId, attackerId, card) {
    var zone = battleState.trapZone[defenderId];
    if (!zone) return;
    for (var i = zone.length - 1; i >= 0; i--) {
      var trap = zone[i];
      if (!trap.active) continue;
      if (trap.trigger === 'enemy_spell' || (trap.trigger === 'spell_cast' && card.cost >= 3)) {
        trap.active = false;
        _executeTrapEffect(battleState, trap, defenderId);
        zone.splice(i, 1);
      }
    }
  }

  function _checkCreatureDeathTraps(battleState, creature, ownerId, killer) {
    // Check all trap zones for creature_death triggers
    for (var pid in battleState.trapZone) {
      var zone = battleState.trapZone[pid];
      for (var i = zone.length - 1; i >= 0; i--) {
        var trap = zone[i];
        if (trap.active && trap.trigger === 'creature_death') {
          trap.active = false;
          _executeTrapEffect(battleState, trap, pid);
          zone.splice(i, 1);
        }
      }
    }
  }

  // =========================================================================
  // SPELL CASTING
  // =========================================================================

  /**
   * Cast a spell directly (already played from hand; this re-resolves it).
   * @param {Object} battleState
   * @param {string} spellCardId - must be in hand
   * @param {string|null} target
   * @returns {Object} result
   */
  function castSpell(battleState, playerId, spellCardId, target) {
    return playCard(battleState, playerId, spellCardId, target);
  }

  // =========================================================================
  // TURN PROCESSING
  // =========================================================================

  /**
   * Process a full turn worth of actions.
   * @param {Object} battleState
   * @param {Object[]} actions - array of { type, cardId, target, attackerId, targetId }
   * @returns {Object} result
   */
  function processTurn(battleState, actions) {
    if (battleState.winner) return { success: false, error: 'Battle is over' };

    var activeId = battleState.activePlayer;
    var pState = battleState.players[activeId];
    var results = [];

    // Draw phase
    _drawFromDeck(pState);

    // Increase max mana
    pState.maxMana = Math.min(MAX_MANA, pState.turn_maxMana || pState.maxMana);
    pState.maxMana = Math.min(MAX_MANA, battleState.turn + 1);
    pState.mana = pState.maxMana;

    // Reset attack flags
    for (var i = 0; i < pState.field.length; i++) {
      pState.field[i].attackUsed = false;
      pState.field[i].canAttack = true;
      if (pState.field[i].isFrozen) {
        pState.field[i].isFrozen = false;
      }
      if (pState.field[i].isStunned) {
        pState.field[i].isStunned = false;
      }
    }

    // Vortex ability: deal 1 damage to all enemies at start of turn
    for (var vi = 0; vi < pState.field.length; vi++) {
      if (pState.field[vi].ability === 'vortex') {
        var oppId = _getOpponent(battleState, activeId);
        if (oppId && battleState.players[oppId]) {
          battleState.players[oppId].hp -= 1;
        }
      }
    }

    // Zion Avatar: heal 2 HP at end of turn (we'll handle at end)

    // Process actions
    actions = actions || [];
    for (var a = 0; a < actions.length; a++) {
      var action = actions[a];
      var res = null;
      if (action.type === 'play_card') {
        res = playCard(battleState, activeId, action.cardId, action.target || null);
      } else if (action.type === 'attack') {
        res = attackWithCreature(battleState, action.attackerId, action.targetId);
      } else if (action.type === 'activate_trap') {
        res = activateTrap(battleState, action.trapId);
      } else if (action.type === 'draw') {
        res = drawCard(battleState, activeId);
      }
      results.push({ action: action, result: res });
      if (battleState.winner) break;
    }

    // End of turn: Zion Avatar heal
    for (var zi = 0; zi < pState.field.length; zi++) {
      if (pState.field[zi].ability === 'world_will') {
        pState.hp = Math.min(pState.maxHp, pState.hp + 2);
      }
    }

    // Storm Sovereign: deal 1 to all enemies at start of NEXT turn (applied here at end for simplicity)
    for (var si = 0; si < pState.field.length; si++) {
      if (pState.field[si].ability === 'sovereign_storm') {
        var ssOppId = _getOpponent(battleState, activeId);
        if (ssOppId && battleState.players[ssOppId]) {
          battleState.players[ssOppId].hp -= 1;
        }
      }
    }

    // Check win before switching turns
    checkWinCondition(battleState);

    if (!battleState.winner) {
      // Switch active player
      var oppIdForSwitch = _getOpponent(battleState, activeId);
      battleState.activePlayer = oppIdForSwitch;
      battleState.turn++;
    }

    _logEvent(battleState, 'Turn ' + battleState.turn + ' ended for ' + activeId);
    return { success: true, results: results };
  }

  // =========================================================================
  // WIN CONDITION
  // =========================================================================

  /**
   * Check if the battle is over.
   * @param {Object} battleState
   * @returns {Object} { gameOver, winner, reason }
   */
  function checkWinCondition(battleState) {
    if (battleState.winner) {
      return { gameOver: true, winner: battleState.winner, reason: battleState.winReason };
    }

    var playerIds = Object.keys(battleState.players);
    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      var pState = battleState.players[pid];
      if (pState.hp <= 0) {
        var oppId = _getOpponent(battleState, pid);
        battleState.winner = oppId;
        battleState.winReason = pid + ' HP reached 0';
        _logEvent(battleState, oppId + ' wins! ' + pid + ' was defeated.');
        return { gameOver: true, winner: oppId, reason: battleState.winReason };
      }
      if (pState.deck.length === 0 && pState.hand.length === 0) {
        // Out of cards — lose via deck out
        var oppId2 = _getOpponent(battleState, pid);
        battleState.winner = oppId2;
        battleState.winReason = pid + ' decked out';
        _logEvent(battleState, oppId2 + ' wins by deck out!');
        return { gameOver: true, winner: oppId2, reason: battleState.winReason };
      }
    }

    return { gameOver: false, winner: null, reason: null };
  }

  // =========================================================================
  // VISIBLE STATE
  // =========================================================================

  /**
   * Get the visible battle state for a player (hides opponent hand).
   * @param {Object} battleState
   * @param {string} playerId
   * @returns {Object} visible state
   */
  function getBattleState(battleState, playerId) {
    var visible = {
      id: battleState.id,
      turn: battleState.turn,
      activePlayer: battleState.activePlayer,
      phase: battleState.phase,
      winner: battleState.winner,
      winReason: battleState.winReason,
      log: battleState.log.slice(-20),  // last 20 events
      players: {}
    };

    for (var pid in battleState.players) {
      var pState = battleState.players[pid];
      if (pid === playerId) {
        // Full info for this player
        visible.players[pid] = {
          playerId: pid,
          hp: pState.hp,
          maxHp: pState.maxHp,
          mana: pState.mana,
          maxMana: pState.maxMana,
          hand: pState.hand.slice(),
          handCards: pState.hand.map(function(cid) { return CARD_CATALOG[cid]; }),
          field: pState.field.slice(),
          deckSize: pState.deck.length,
          equipment: pState.equipment
        };
      } else {
        // Hidden hand for opponent
        visible.players[pid] = {
          playerId: pid,
          hp: pState.hp,
          maxHp: pState.maxHp,
          mana: pState.mana,
          maxMana: pState.maxMana,
          handSize: pState.hand.length,
          hand: null,  // hidden
          field: pState.field.slice(),
          deckSize: pState.deck.length
        };
      }
    }

    // Trap zones (hidden — only show count)
    visible.trapZones = {};
    for (var tid in battleState.trapZone) {
      if (tid === playerId) {
        visible.trapZones[tid] = battleState.trapZone[tid].slice();
      } else {
        visible.trapZones[tid] = { count: battleState.trapZone[tid].length };
      }
    }

    visible.graveyard = {};
    for (var gid in battleState.graveyard) {
      visible.graveyard[gid] = battleState.graveyard[gid].slice();
    }

    return visible;
  }

  // =========================================================================
  // CATALOG FILTERS
  // =========================================================================

  /**
   * Get all cards of a specific element.
   * @param {string} element
   * @returns {Object[]} array of card definitions
   */
  function getCardsByElement(element) {
    var result = [];
    for (var id in CARD_CATALOG) {
      if (CARD_CATALOG[id].element === element) {
        result.push(CARD_CATALOG[id]);
      }
    }
    return result;
  }

  /**
   * Get all cards of a specific type.
   * @param {string} type
   * @returns {Object[]} array of card definitions
   */
  function getCardsByType(type) {
    var result = [];
    for (var id in CARD_CATALOG) {
      if (CARD_CATALOG[id].type === type) {
        result.push(CARD_CATALOG[id]);
      }
    }
    return result;
  }

  /**
   * Get all cards of a specific rarity.
   * @param {string} rarity
   * @returns {Object[]} array of card definitions
   */
  function getCardsByRarity(rarity) {
    var result = [];
    for (var id in CARD_CATALOG) {
      if (CARD_CATALOG[id].rarity === rarity) {
        result.push(CARD_CATALOG[id]);
      }
    }
    return result;
  }

  // =========================================================================
  // DECK STRENGTH
  // =========================================================================

  /**
   * Calculate estimated power level of a deck.
   * @param {Object} deck - deck object
   * @returns {Object} { score, breakdown }
   */
  function calculateDeckStrength(deck) {
    if (!deck || !Array.isArray(deck.cards)) return { score: 0, breakdown: {} };

    var rarityScores = { common: 1, uncommon: 2, rare: 4, epic: 7, legendary: 12 };
    var totalScore = 0;
    var breakdown = { byRarity: {}, byType: {}, byElement: {}, cardCount: deck.cards.length };
    var avgCost = 0;
    var validCards = 0;

    for (var i = 0; i < deck.cards.length; i++) {
      var card = CARD_CATALOG[deck.cards[i]];
      if (!card) continue;
      validCards++;
      var rScore = rarityScores[card.rarity] || 1;
      totalScore += rScore;
      avgCost += card.cost;
      breakdown.byRarity[card.rarity] = (breakdown.byRarity[card.rarity] || 0) + 1;
      breakdown.byType[card.type] = (breakdown.byType[card.type] || 0) + 1;
      breakdown.byElement[card.element] = (breakdown.byElement[card.element] || 0) + 1;
    }

    breakdown.avgCost = validCards > 0 ? Math.round((avgCost / validCards) * 10) / 10 : 0;

    // Bonus for synergy (more than 3 cards of same element)
    var synergyBonus = 0;
    for (var el in breakdown.byElement) {
      if (breakdown.byElement[el] >= 5) synergyBonus += 5;
      if (breakdown.byElement[el] >= 10) synergyBonus += 10;
    }
    totalScore += synergyBonus;

    // Curve bonus: balanced mana curve is rewarded
    if (breakdown.avgCost >= 2.5 && breakdown.avgCost <= 4.5) {
      totalScore += 10;
    }

    breakdown.synergyBonus = synergyBonus;
    return { score: totalScore, breakdown: breakdown };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  function _getOpponent(battleState, playerId) {
    var ids = Object.keys(battleState.players);
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] !== playerId) return ids[i];
    }
    return null;
  }

  function _resolveTarget(battleState, targetId, playerId) {
    if (!targetId) return null;
    // Check if it's a player
    if (battleState.players[targetId]) {
      return { isPlayer: true, id: targetId };
    }
    // Check all fields
    for (var pid in battleState.players) {
      var field = battleState.players[pid].field;
      var creature = _findCreatureInstance(field, targetId);
      if (creature) return { isPlayer: false, creature: creature, ownerId: pid };
    }
    return null;
  }

  function _findCreatureInstance(field, instanceId) {
    if (!field || !instanceId) return null;
    for (var i = 0; i < field.length; i++) {
      if (field[i].id === instanceId) return field[i];
    }
    return null;
  }

  function _findCreatureAnywhere(battleState, instanceId) {
    for (var pid in battleState.players) {
      var field = battleState.players[pid].field;
      for (var i = 0; i < field.length; i++) {
        if (field[i].id === instanceId) {
          return { creature: field[i], ownerId: pid };
        }
      }
    }
    return null;
  }

  function _hasEquipmentBonus(pState, equipCardId) {
    for (var cid in pState.equipment) {
      var eqList = pState.equipment[cid];
      for (var i = 0; i < eqList.length; i++) {
        if (eqList[i].cardId === equipCardId) return true;
      }
    }
    return false;
  }

  function _logEvent(battleState, message) {
    battleState.log.push({ ts: Date.now(), msg: message });
  }

  // =========================================================================
  // EXPORTS
  // =========================================================================

  exports.CARD_CATALOG = CARD_CATALOG;
  exports.ELEMENTS = ELEMENTS;
  exports.CARD_TYPES = CARD_TYPES;
  exports.RARITIES = RARITIES;
  exports.DECK_MIN = DECK_MIN;
  exports.DECK_MAX = DECK_MAX;
  exports.MAX_COPIES_PER_CARD = MAX_COPIES_PER_CARD;
  exports.MAX_COPIES_LEGENDARY = MAX_COPIES_LEGENDARY;
  exports.STARTING_HP = STARTING_HP;
  exports.STARTING_HAND = STARTING_HAND;
  exports.HAND_MAX = HAND_MAX;
  exports.FIELD_MAX = FIELD_MAX;

  exports.createDeck = createDeck;
  exports.validateDeck = validateDeck;
  exports.drawCard = drawCard;
  exports.playCard = playCard;
  exports.attackWithCreature = attackWithCreature;
  exports.activateTrap = activateTrap;
  exports.castSpell = castSpell;
  exports.startBattle = startBattle;
  exports.processTurn = processTurn;
  exports.checkWinCondition = checkWinCondition;
  exports.getBattleState = getBattleState;
  exports.getPlayerCollection = getPlayerCollection;
  exports.addCardToCollection = addCardToCollection;
  exports.generateCardFromAchievement = generateCardFromAchievement;
  exports.getCardsByElement = getCardsByElement;
  exports.getCardsByType = getCardsByType;
  exports.getCardsByRarity = getCardsByRarity;
  exports.calculateDeckStrength = calculateDeckStrength;

})(typeof module !== 'undefined' ? module.exports : (window.CardGame = {}));
