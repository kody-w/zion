// pet_evolution.js — Three-Tier Pet Evolution System for ZION MMO
// Bonding stages (young/mature/ascended), feeding mechanics, evolution milestones,
// unique forms per pet type, and upgraded stat bonuses at each tier.

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // DEPENDENCY GUARDS
  // ---------------------------------------------------------------------------

  var Pets = (typeof window !== 'undefined' && window.Pets) || {};
  var Inventory = (typeof window !== 'undefined' && window.Inventory) || {};
  var Progression = (typeof window !== 'undefined' && window.Progression) || {};

  // ---------------------------------------------------------------------------
  // EVOLUTION TIER CONSTANTS
  // ---------------------------------------------------------------------------

  var TIERS = {
    YOUNG:    'young',
    MATURE:   'mature',
    ASCENDED: 'ascended'
  };

  var TIER_XP_THRESHOLDS = {
    young:    0,
    mature:   500,
    ascended: 2000
  };

  var TIER_LABELS = {
    young:    'Young',
    mature:   'Mature',
    ascended: 'Ascended'
  };

  // ---------------------------------------------------------------------------
  // BOND XP GAIN RATES
  // ---------------------------------------------------------------------------

  var BOND_XP_RATES = {
    proximity:    1,    // per minute near pet
    adventure:    25,   // per zone change while pet active
    feeding:      15,   // per feeding action
    favorite_food:30,   // bonus for feeding favorite food
    play:         10,   // per play interaction
    neglect:      -5    // per hour without interaction
  };

  // ---------------------------------------------------------------------------
  // HAPPINESS CONSTANTS
  // ---------------------------------------------------------------------------

  var HAPPINESS = {
    MAX:              100,
    MIN:              0,
    FEEDING_BASE:     10,
    FAVORITE_BONUS:   20,
    PLAY_BONUS:       15,
    NEGLECT_DECAY:    2,    // per hour
    ASCENDED_DECAY:   1,    // ascended forms decay slower
    ECSTATIC_THRESH:  90,
    HAPPY_THRESH:     70,
    CONTENT_THRESH:   50,
    UNHAPPY_THRESH:   30
  };

  // ---------------------------------------------------------------------------
  // FOOD DEFINITIONS (favorite food per pet type)
  // ---------------------------------------------------------------------------

  var FOOD_TYPES = {
    berry:          { bondXp: 10, happiness: 8,  buff: { type: 'speed',     duration: 300, value: 5  } },
    fish:           { bondXp: 12, happiness: 10, buff: { type: 'stamina',   duration: 300, value: 8  } },
    mushroom:       { bondXp: 8,  happiness: 6,  buff: { type: 'luck',      duration: 300, value: 5  } },
    bread:          { bondXp: 10, happiness: 8,  buff: { type: 'crafting',  duration: 300, value: 6  } },
    treat:          { bondXp: 15, happiness: 15, buff: { type: 'bond',      duration: 600, value: 10 } },
    herb:           { bondXp: 12, happiness: 9,  buff: { type: 'healing',   duration: 300, value: 7  } },
    crystal_fruit:  { bondXp: 25, happiness: 20, buff: { type: 'evolution', duration: 900, value: 15 } },
    moonflower:     { bondXp: 20, happiness: 18, buff: { type: 'vision',    duration: 600, value: 12 } },
    spirit_seed:    { bondXp: 30, happiness: 25, buff: { type: 'ascension', duration: 900, value: 20 } }
  };

  var FAVORITE_FOODS = {
    cat:           'fish',
    fox:           'berry',
    owl:           'mushroom',
    butterfly:     'moonflower',
    rabbit:        'herb',
    frog:          'crystal_fruit',
    firefly:       'spirit_seed',
    wolf_pup:      'treat',
    phoenix_chick: 'spirit_seed',
    turtle:        'herb'
  };

  // ---------------------------------------------------------------------------
  // EVOLUTION FORMS — unique visual/stat variant per tier per pet type
  // ---------------------------------------------------------------------------

  var EVOLUTION_FORMS = {
    cat: {
      young:    { name: 'Mystic Kitten',    color: '#aaaacc', scale: 0.7, aura: null,       icon: 'kitten'       },
      mature:   { name: 'Mystic Cat',       color: '#8888bb', scale: 1.0, aura: 'silver',   icon: 'cat'          },
      ascended: { name: 'Celestial Cat',    color: '#ccbbff', scale: 1.2, aura: 'starfield', icon: 'celestial_cat' }
    },
    fox: {
      young:    { name: 'Spirit Kit',       color: '#ffaa44', scale: 0.7, aura: null,       icon: 'fox_kit'      },
      mature:   { name: 'Spirit Fox',       color: '#ff8833', scale: 1.0, aura: 'ember',    icon: 'fox'          },
      ascended: { name: 'Nine-Tail Fox',    color: '#ffdd88', scale: 1.3, aura: 'flame',    icon: 'nine_tail'    }
    },
    owl: {
      young:    { name: 'Fledgling Owl',    color: '#aabb88', scale: 0.7, aura: null,       icon: 'owlet'        },
      mature:   { name: 'Ancient Owl',      color: '#889966', scale: 1.0, aura: 'rune',     icon: 'owl'          },
      ascended: { name: 'Oracle Owl',       color: '#ddee99', scale: 1.2, aura: 'wisdom',   icon: 'oracle_owl'   }
    },
    butterfly: {
      young:    { name: 'Chrysalis',        color: '#ccbbaa', scale: 0.5, aura: null,       icon: 'chrysalis'    },
      mature:   { name: 'Crystal Butterfly',color: '#88ccdd', scale: 1.0, aura: 'sparkle',  icon: 'butterfly'    },
      ascended: { name: 'Prism Butterfly',  color: '#ffffff', scale: 1.2, aura: 'rainbow',  icon: 'prism_butter' }
    },
    rabbit: {
      young:    { name: 'Moon Bunny',       color: '#eeeebb', scale: 0.6, aura: null,       icon: 'bunny'        },
      mature:   { name: 'Moon Rabbit',      color: '#dddd99', scale: 1.0, aura: 'lunar',    icon: 'rabbit'       },
      ascended: { name: 'Jade Hare',        color: '#aaffaa', scale: 1.1, aura: 'jade',     icon: 'jade_hare'    }
    },
    frog: {
      young:    { name: 'Jade Tadpole',     color: '#88bb88', scale: 0.5, aura: null,       icon: 'tadpole'      },
      mature:   { name: 'Jade Frog',        color: '#44aa44', scale: 1.0, aura: 'gem',      icon: 'frog'         },
      ascended: { name: 'Dragon Toad',      color: '#22cc66', scale: 1.4, aura: 'jade_storm', icon: 'dragon_toad'}
    },
    firefly: {
      young:    { name: 'Ember Spark',      color: '#ffcc44', scale: 0.4, aura: null,       icon: 'spark'        },
      mature:   { name: 'Ember Firefly',    color: '#ff9900', scale: 1.0, aura: 'glow',     icon: 'firefly'      },
      ascended: { name: 'Solar Firefly',    color: '#ffee00', scale: 1.3, aura: 'solar',    icon: 'solar_fly'    }
    },
    wolf_pup: {
      young:    { name: 'Shadow Pup',       color: '#333355', scale: 0.6, aura: null,       icon: 'pup'          },
      mature:   { name: 'Shadow Wolf',      color: '#222244', scale: 1.1, aura: 'shadow',   icon: 'wolf'         },
      ascended: { name: 'Void Alpha',       color: '#110022', scale: 1.5, aura: 'void',     icon: 'void_wolf'    }
    },
    phoenix_chick: {
      young:    { name: 'Ember Hatchling',  color: '#ffaa33', scale: 0.5, aura: null,       icon: 'hatchling'    },
      mature:   { name: 'Phoenix',          color: '#ff6600', scale: 1.2, aura: 'fire',     icon: 'phoenix'      },
      ascended: { name: 'Eternal Phoenix',  color: '#ffdd00', scale: 1.6, aura: 'eternal',  icon: 'eternal_bird' }
    },
    turtle: {
      young:    { name: 'Ancient Hatchling',color: '#aabb88', scale: 0.5, aura: null,       icon: 'turtle_baby'  },
      mature:   { name: 'Ancient Turtle',   color: '#889966', scale: 1.0, aura: 'stone',    icon: 'turtle'       },
      ascended: { name: 'World Turtle',     color: '#66aa44', scale: 1.8, aura: 'cosmos',   icon: 'world_turtle' }
    }
  };

  // ---------------------------------------------------------------------------
  // PET ABILITIES — unlocked per tier
  // ---------------------------------------------------------------------------

  var PET_ABILITIES = {
    cat: {
      young:    [{ id: 'curious_nose',    name: 'Curious Nose',    desc: 'Detects nearby resources',             passive: true  }],
      mature:   [{ id: 'trade_whisper',   name: 'Trade Whisper',   desc: 'Improves trade prices by 5%',          passive: true  },
                 { id: 'luck_purr',       name: 'Lucky Purr',      desc: 'Activated: +10% luck for 60s',         passive: false }],
      ascended: [{ id: 'cosmic_sight',    name: 'Cosmic Sight',    desc: 'Reveals hidden items in zone',         passive: false },
                 { id: 'nine_lives_aura', name: 'Nine Lives Aura', desc: 'Once per day: prevents death penalty', passive: true  }]
    },
    fox: {
      young:    [{ id: 'scout_trail',     name: 'Scout Trail',     desc: 'Reveals fog of war faster',            passive: true  }],
      mature:   [{ id: 'spirit_dash',     name: 'Spirit Dash',     desc: 'Activated: +30% movement for 30s',    passive: false },
                 { id: 'sharp_senses',    name: 'Sharp Senses',    desc: 'Increases discovery range by 10%',    passive: true  }],
      ascended: [{ id: 'tail_storm',      name: 'Tail Storm',      desc: 'Activated: reveal all zone secrets',  passive: false },
                 { id: 'spirit_link',     name: 'Spirit Link',     desc: 'Share bonuses with party members',    passive: true  }]
    },
    owl: {
      young:    [{ id: 'night_eyes',      name: 'Night Eyes',      desc: 'See in low-light zones',               passive: true  }],
      mature:   [{ id: 'lore_scan',       name: 'Lore Scan',       desc: 'Increases lore unlock by 8%',          passive: true  },
                 { id: 'wisdom_hoot',     name: 'Wisdom Hoot',     desc: 'Activated: gain 2x XP for 120s',      passive: false }],
      ascended: [{ id: 'oracle_sight',    name: 'Oracle Sight',    desc: 'Predict zone events 30s early',       passive: true  },
                 { id: 'ancient_rune',    name: 'Ancient Rune',    desc: 'Activated: decode any lore fragment',  passive: false }]
    },
    butterfly: {
      young:    [{ id: 'pollen_trail',    name: 'Pollen Trail',    desc: 'Garden plants grow 5% faster',         passive: true  }],
      mature:   [{ id: 'wing_dust',       name: 'Wing Dust',       desc: 'Activated: slow enemies for 20s',     passive: false },
                 { id: 'bloom_aura',      name: 'Bloom Aura',      desc: 'Accelerates garden growth by 12%',    passive: true  }],
      ascended: [{ id: 'prism_wings',     name: 'Prism Wings',     desc: 'Activated: become invisible for 15s', passive: false },
                 { id: 'rainbow_mend',    name: 'Rainbow Mend',    desc: 'Heals 5 HP per minute passively',     passive: true  }]
    },
    rabbit: {
      young:    [{ id: 'quick_hop',       name: 'Quick Hop',       desc: '+5% crafting speed',                   passive: true  }],
      mature:   [{ id: 'moon_blessing',   name: 'Moon Blessing',   desc: '+10% crafting speed, +5% trade luck',  passive: true  },
                 { id: 'burrow_find',     name: 'Burrow Find',     desc: 'Activated: find hidden caches',        passive: false }],
      ascended: [{ id: 'jade_ward',       name: 'Jade Ward',       desc: 'Reflect 10% of incoming damage',      passive: true  },
                 { id: 'lunar_pulse',     name: 'Lunar Pulse',     desc: 'Activated: slow time for 10s',        passive: false }]
    },
    frog: {
      young:    [{ id: 'water_sense',     name: 'Water Sense',     desc: 'Find fishing spots more easily',       passive: true  }],
      mature:   [{ id: 'gem_tongue',      name: 'Gem Tongue',      desc: '+8% rare resource chance',             passive: true  },
                 { id: 'lucky_croak',     name: 'Lucky Croak',     desc: 'Activated: +20% luck for 60s',        passive: false }],
      ascended: [{ id: 'dragon_stomp',    name: 'Dragon Stomp',    desc: 'Activated: stun enemies in range',    passive: false },
                 { id: 'jade_hoard',      name: 'Jade Hoard',      desc: '+15% rare resources passively',       passive: true  }]
    },
    firefly: {
      young:    [{ id: 'glow_trail',      name: 'Glow Trail',      desc: 'Illuminate dark areas passively',      passive: true  }],
      mature:   [{ id: 'path_light',      name: 'Path Light',      desc: '+12% vision range in wilds',           passive: true  },
                 { id: 'flash_blind',     name: 'Flash Blind',     desc: 'Activated: blind enemies for 10s',    passive: false }],
      ascended: [{ id: 'solar_pulse',     name: 'Solar Pulse',     desc: 'Activated: deal AoE light damage',   passive: false },
                 { id: 'eternal_light',   name: 'Eternal Light',   desc: 'Reveal hidden paths permanently',    passive: true  }]
    },
    wolf_pup: {
      young:    [{ id: 'pack_sense',      name: 'Pack Sense',      desc: 'Detect nearby players',                passive: true  }],
      mature:   [{ id: 'endure',          name: 'Endure',          desc: '+12% stamina passively',               passive: true  },
                 { id: 'howl',            name: 'Howl',            desc: 'Activated: buff all nearby allies',   passive: false }],
      ascended: [{ id: 'void_cloak',      name: 'Void Cloak',      desc: 'Become invisible in shadows',         passive: true  },
                 { id: 'alpha_call',      name: 'Alpha Call',      desc: 'Activated: summon shadow wolves',     passive: false }]
    },
    phoenix_chick: {
      young:    [{ id: 'ember_warmth',    name: 'Ember Warmth',    desc: '+5% resilience in cold zones',         passive: true  }],
      mature:   [{ id: 'flame_shield',    name: 'Flame Shield',    desc: 'Activated: absorb next 50 damage',    passive: false },
                 { id: 'rebirth_pulse',   name: 'Rebirth Pulse',   desc: '+10% resilience, faster respawn',     passive: true  }],
      ascended: [{ id: 'eternal_flame',   name: 'Eternal Flame',   desc: 'Auto-revive once with 50% HP',       passive: true  },
                 { id: 'solar_storm',     name: 'Solar Storm',     desc: 'Activated: massive fire AoE burst',  passive: false }]
    },
    turtle: {
      young:    [{ id: 'shell_guard',     name: 'Shell Guard',     desc: '+5% defense passively',                passive: true  }],
      mature:   [{ id: 'stone_aura',      name: 'Stone Aura',      desc: '+10% defense, +8% meditation',        passive: true  },
                 { id: 'withdraw',        name: 'Withdraw',        desc: 'Activated: become immune for 5s',     passive: false }],
      ascended: [{ id: 'world_shell',     name: 'World Shell',     desc: 'Reduce all damage taken by 20%',     passive: true  },
                 { id: 'cosmos_plod',     name: 'Cosmos Plod',     desc: 'Activated: share defense to party',  passive: false }]
    }
  };

  // ---------------------------------------------------------------------------
  // EVOLUTION STAT BONUSES — base value multiplied by tier
  // ---------------------------------------------------------------------------

  var TIER_STAT_MULTIPLIERS = {
    young:    1.0,
    mature:   2.5,
    ascended: 5.0
  };

  // Base bonuses per pet type (young tier baseline)
  var PET_BASE_BONUSES = {
    cat:           { type: 'trade_luck',      value: 2 },
    fox:           { type: 'discovery_range', value: 2 },
    owl:           { type: 'lore_unlock',     value: 2 },
    butterfly:     { type: 'garden_growth',   value: 2 },
    rabbit:        { type: 'craft_speed',     value: 2 },
    frog:          { type: 'rare_resources',  value: 2 },
    firefly:       { type: 'vision_range',    value: 3 },
    wolf_pup:      { type: 'stamina',         value: 3 },
    phoenix_chick: { type: 'resilience',      value: 5 },
    turtle:        { type: 'meditation',      value: 3 }
  };

  // ---------------------------------------------------------------------------
  // EVOLUTION REQUIREMENTS — items/achievements/locations for tier transitions
  // ---------------------------------------------------------------------------

  var EVOLUTION_REQUIREMENTS = {
    young_to_mature: {
      cat:           { bondXp: 500,  item: null,             achievement: null,            zone: null       },
      fox:           { bondXp: 500,  item: null,             achievement: null,            zone: 'wilds'    },
      owl:           { bondXp: 500,  item: 'lore_fragment',  achievement: null,            zone: null       },
      butterfly:     { bondXp: 500,  item: null,             achievement: null,            zone: 'gardens'  },
      rabbit:        { bondXp: 500,  item: null,             achievement: null,            zone: null       },
      frog:          { bondXp: 500,  item: 'jade_stone',     achievement: null,            zone: null       },
      firefly:       { bondXp: 500,  item: null,             achievement: null,            zone: 'wilds'    },
      wolf_pup:      { bondXp: 500,  item: null,             achievement: 'first_steps',   zone: null       },
      phoenix_chick: { bondXp: 500,  item: 'ember_essence',  achievement: null,            zone: 'athenaeum'},
      turtle:        { bondXp: 500,  item: null,             achievement: null,            zone: 'gardens'  }
    },
    mature_to_ascended: {
      cat:           { bondXp: 2000, item: 'celestial_shard', achievement: null,           zone: 'nexus'    },
      fox:           { bondXp: 2000, item: 'spirit_crystal',  achievement: null,           zone: 'wilds'    },
      owl:           { bondXp: 2000, item: 'oracle_tome',     achievement: 'world_traveler',zone: 'athenaeum'},
      butterfly:     { bondXp: 2000, item: 'prism_petal',     achievement: null,           zone: 'gardens'  },
      rabbit:        { bondXp: 2000, item: 'lunar_stone',     achievement: null,           zone: null       },
      frog:          { bondXp: 2000, item: 'dragon_pearl',    achievement: null,           zone: 'wilds'    },
      firefly:       { bondXp: 2000, item: 'solar_core',      achievement: null,           zone: 'nexus'    },
      wolf_pup:      { bondXp: 2000, item: 'void_shard',      achievement: 'zone_hopper',  zone: null       },
      phoenix_chick: { bondXp: 2000, item: 'eternal_ember',   achievement: null,           zone: 'athenaeum'},
      turtle:        { bondXp: 2000, item: 'cosmos_shell',    achievement: null,           zone: null       }
    }
  };

  // ---------------------------------------------------------------------------
  // EVOLUTION STATE STORAGE
  // ---------------------------------------------------------------------------

  var evolutionData = {};

  // ---------------------------------------------------------------------------
  // HELPER UTILITIES
  // ---------------------------------------------------------------------------

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getTierFromXp(bondXp) {
    if (bondXp >= TIER_XP_THRESHOLDS.ascended) return TIERS.ASCENDED;
    if (bondXp >= TIER_XP_THRESHOLDS.mature)   return TIERS.MATURE;
    return TIERS.YOUNG;
  }

  function getNextTier(currentTier) {
    if (currentTier === TIERS.YOUNG)    return TIERS.MATURE;
    if (currentTier === TIERS.MATURE)   return TIERS.ASCENDED;
    return null;
  }

  function getXpToNextTier(bondXp) {
    var tier = getTierFromXp(bondXp);
    if (tier === TIERS.YOUNG)    return TIER_XP_THRESHOLDS.mature - bondXp;
    if (tier === TIERS.MATURE)   return TIER_XP_THRESHOLDS.ascended - bondXp;
    return 0;
  }

  // ---------------------------------------------------------------------------
  // INITIALISE / GET EVOLUTION RECORD
  // ---------------------------------------------------------------------------

  /**
   * Get or create the evolution record for a player's pet.
   * @param {string} playerId
   * @param {string} petType
   * @returns {Object} evolution record
   */
  function getOrCreateRecord(playerId, petType) {
    if (!evolutionData[playerId]) {
      evolutionData[playerId] = {
        playerId:      playerId,
        petType:       petType,
        tier:          TIERS.YOUNG,
        bondXp:        0,
        happiness:     100,
        lastFed:       Date.now(),
        lastInteract:  Date.now(),
        activeBuffs:   [],
        evolutions:    [],       // history of evolution events
        abilities:     getAbilitiesForTier(petType, TIERS.YOUNG)
      };
    }
    return evolutionData[playerId];
  }

  /**
   * Initialise evolution data for a player (call after pet adoption).
   * @param {string} playerId
   * @param {string} petType
   * @returns {Object} new evolution record
   */
  function initEvolution(playerId, petType) {
    if (!playerId || !petType) return null;
    evolutionData[playerId] = {
      playerId:      playerId,
      petType:       petType,
      tier:          TIERS.YOUNG,
      bondXp:        0,
      happiness:     100,
      lastFed:       Date.now(),
      lastInteract:  Date.now(),
      activeBuffs:   [],
      evolutions:    [],
      abilities:     getAbilitiesForTier(petType, TIERS.YOUNG)
    };
    return evolutionData[playerId];
  }

  /**
   * Get evolution record for player.
   * @param {string} playerId
   * @returns {Object|null}
   */
  function getEvolutionRecord(playerId) {
    return evolutionData[playerId] || null;
  }

  // ---------------------------------------------------------------------------
  // BOND XP
  // ---------------------------------------------------------------------------

  /**
   * Add bond XP to a pet from a given source.
   * @param {string} playerId
   * @param {string} source - key from BOND_XP_RATES
   * @param {number} [multiplier=1] - optional multiplier (e.g. for streaks)
   * @returns {Object} { gained, total, tierChanged, newTier }
   */
  function addBondXp(playerId, source, multiplier) {
    var record = evolutionData[playerId];
    if (!record) return { gained: 0, total: 0, tierChanged: false, newTier: null };

    multiplier = multiplier || 1;
    var baseGain = BOND_XP_RATES[source] || 0;
    var gained = Math.round(baseGain * multiplier);

    var oldTier = record.tier;
    record.bondXp = Math.max(0, record.bondXp + gained);
    record.lastInteract = Date.now();

    // Recalculate tier
    var newTier = getTierFromXp(record.bondXp);
    var tierChanged = (newTier !== oldTier);
    if (tierChanged) {
      record.tier = newTier;
      record.abilities = getAbilitiesForTier(record.petType, newTier);
      record.evolutions.push({
        from:      oldTier,
        to:        newTier,
        timestamp: Date.now(),
        bondXp:    record.bondXp
      });
    }

    return { gained: gained, total: record.bondXp, tierChanged: tierChanged, newTier: newTier };
  }

  /**
   * Set bond XP directly (for loading saved state).
   * @param {string} playerId
   * @param {number} xp
   */
  function setBondXp(playerId, xp) {
    var record = evolutionData[playerId];
    if (!record) return false;
    record.bondXp = Math.max(0, xp);
    record.tier = getTierFromXp(record.bondXp);
    record.abilities = getAbilitiesForTier(record.petType, record.tier);
    return true;
  }

  // ---------------------------------------------------------------------------
  // FEEDING SYSTEM
  // ---------------------------------------------------------------------------

  /**
   * Feed the pet a specific food item, grant bond XP and temporary buff.
   * @param {string} playerId
   * @param {string} food - food item id
   * @param {number} [now] - timestamp override for testing
   * @returns {Object} { success, message, bondXpGained, buff, isFavorite, tierChanged }
   */
  function feedPet(playerId, food, now) {
    var record = evolutionData[playerId];
    if (!record) return { success: false, message: 'No evolution record found' };

    var foodData = FOOD_TYPES[food];
    if (!foodData) return { success: false, message: 'Unknown food: ' + food };

    var isFavorite = (FAVORITE_FOODS[record.petType] === food);
    var bondXpGain = foodData.bondXp + (isFavorite ? BOND_XP_RATES.favorite_food : 0);
    var happinessGain = foodData.happiness + (isFavorite ? HAPPINESS.FAVORITE_BONUS : HAPPINESS.FEEDING_BASE);

    // Apply happiness
    record.happiness = clamp(record.happiness + happinessGain, HAPPINESS.MIN, HAPPINESS.MAX);
    record.lastFed = now || Date.now();
    record.lastInteract = now || Date.now();

    // Grant bond XP and check for tier change
    var xpBefore = record.bondXp;
    record.bondXp += bondXpGain;
    var newTier = getTierFromXp(record.bondXp);
    var tierChanged = (newTier !== record.tier);
    if (tierChanged) {
      var oldTier = record.tier;
      record.tier = newTier;
      record.abilities = getAbilitiesForTier(record.petType, newTier);
      record.evolutions.push({
        from:      oldTier,
        to:        newTier,
        timestamp: now || Date.now(),
        bondXp:    record.bondXp
      });
    }

    // Apply buff (with expiry time)
    var buff = {
      type:      foodData.buff.type,
      value:     foodData.buff.value,
      duration:  foodData.buff.duration,
      expiresAt: (now || Date.now()) + (foodData.buff.duration * 1000)
    };
    record.activeBuffs.push(buff);

    var petName = record.petType;
    var msg = isFavorite
      ? petName + ' loves the ' + food + '! Bond deepens!'
      : petName + ' enjoys the ' + food + '.';

    return {
      success:       true,
      message:       msg,
      bondXpGained:  bondXpGain,
      happinessGained: happinessGain,
      buff:          buff,
      isFavorite:    isFavorite,
      tierChanged:   tierChanged,
      newTier:       newTier,
      totalBondXp:   record.bondXp
    };
  }

  // ---------------------------------------------------------------------------
  // HAPPINESS
  // ---------------------------------------------------------------------------

  /**
   * Apply happiness decay based on time elapsed since last interaction.
   * @param {string} playerId
   * @param {number} [now] - timestamp override
   * @returns {Object|null} updated record or null
   */
  function applyHappinessDecay(playerId, now) {
    var record = evolutionData[playerId];
    if (!record) return null;

    var currentTime = now || Date.now();
    var hoursElapsed = (currentTime - record.lastInteract) / 3600000;

    // Ascended forms decay slower
    var decayRate = (record.tier === TIERS.ASCENDED)
      ? HAPPINESS.ASCENDED_DECAY
      : HAPPINESS.NEGLECT_DECAY;

    var decayAmount = decayRate * hoursElapsed;
    record.happiness = clamp(record.happiness - decayAmount, HAPPINESS.MIN, HAPPINESS.MAX);

    return record;
  }

  /**
   * Get happiness label for a given happiness value.
   * @param {number} happiness
   * @returns {string}
   */
  function getHappinessLabel(happiness) {
    if (happiness >= HAPPINESS.ECSTATIC_THRESH) return 'ecstatic';
    if (happiness >= HAPPINESS.HAPPY_THRESH)    return 'happy';
    if (happiness >= HAPPINESS.CONTENT_THRESH)  return 'content';
    if (happiness >= HAPPINESS.UNHAPPY_THRESH)  return 'unhappy';
    return 'miserable';
  }

  /**
   * Play with the pet to increase happiness and bond XP.
   * @param {string} playerId
   * @param {number} [now]
   * @returns {Object} { success, happinessGained, bondXpGained }
   */
  function playWithPet(playerId, now) {
    var record = evolutionData[playerId];
    if (!record) return { success: false, message: 'No evolution record found' };

    record.happiness = clamp(record.happiness + HAPPINESS.PLAY_BONUS, HAPPINESS.MIN, HAPPINESS.MAX);
    record.lastInteract = now || Date.now();
    record.bondXp += BOND_XP_RATES.play;

    var newTier = getTierFromXp(record.bondXp);
    var tierChanged = (newTier !== record.tier);
    if (tierChanged) {
      var oldTier = record.tier;
      record.tier = newTier;
      record.abilities = getAbilitiesForTier(record.petType, newTier);
      record.evolutions.push({
        from:      oldTier,
        to:        newTier,
        timestamp: now || Date.now(),
        bondXp:    record.bondXp
      });
    }

    return {
      success:          true,
      happinessGained:  HAPPINESS.PLAY_BONUS,
      bondXpGained:     BOND_XP_RATES.play,
      tierChanged:      tierChanged,
      newTier:          newTier
    };
  }

  // ---------------------------------------------------------------------------
  // EVOLUTION FORMS & STATS
  // ---------------------------------------------------------------------------

  /**
   * Get the current evolution form for a player's pet.
   * @param {string} playerId
   * @returns {Object|null}
   */
  function getCurrentForm(playerId) {
    var record = evolutionData[playerId];
    if (!record) return null;
    var forms = EVOLUTION_FORMS[record.petType];
    if (!forms) return null;
    return forms[record.tier] || null;
  }

  /**
   * Get all evolution forms for a pet type.
   * @param {string} petType
   * @returns {Object|null}
   */
  function getAllForms(petType) {
    return EVOLUTION_FORMS[petType] || null;
  }

  /**
   * Get stat bonuses for current tier.
   * @param {string} playerId
   * @returns {Object|null} { type, value, tier, multiplier }
   */
  function getEvolutionBonus(playerId) {
    var record = evolutionData[playerId];
    if (!record) return null;

    var base = PET_BASE_BONUSES[record.petType];
    if (!base) return null;

    var multiplier = TIER_STAT_MULTIPLIERS[record.tier] || 1;
    var value = base.value * multiplier;

    return {
      type:       base.type,
      value:      value,
      tier:       record.tier,
      multiplier: multiplier
    };
  }

  /**
   * Get evolution bonus by pet type and tier directly (no record needed).
   * @param {string} petType
   * @param {string} tier
   * @returns {Object|null}
   */
  function getBonusByTypeAndTier(petType, tier) {
    var base = PET_BASE_BONUSES[petType];
    if (!base) return null;
    var multiplier = TIER_STAT_MULTIPLIERS[tier] || 1;
    return {
      type:       base.type,
      value:      base.value * multiplier,
      tier:       tier,
      multiplier: multiplier
    };
  }

  // ---------------------------------------------------------------------------
  // ABILITIES
  // ---------------------------------------------------------------------------

  /**
   * Get unlocked abilities for a pet type at a given tier.
   * @param {string} petType
   * @param {string} tier
   * @returns {Array}
   */
  function getAbilitiesForTier(petType, tier) {
    var allAbilities = PET_ABILITIES[petType];
    if (!allAbilities) return [];

    var unlocked = [];
    // Always include young abilities
    if (allAbilities.young) {
      for (var i = 0; i < allAbilities.young.length; i++) {
        unlocked.push(allAbilities.young[i]);
      }
    }
    if (tier === TIERS.MATURE || tier === TIERS.ASCENDED) {
      if (allAbilities.mature) {
        for (var j = 0; j < allAbilities.mature.length; j++) {
          unlocked.push(allAbilities.mature[j]);
        }
      }
    }
    if (tier === TIERS.ASCENDED) {
      if (allAbilities.ascended) {
        for (var k = 0; k < allAbilities.ascended.length; k++) {
          unlocked.push(allAbilities.ascended[k]);
        }
      }
    }
    return unlocked;
  }

  /**
   * Get all abilities for a player's pet (based on current tier).
   * @param {string} playerId
   * @returns {Array}
   */
  function getPlayerAbilities(playerId) {
    var record = evolutionData[playerId];
    if (!record) return [];
    return getAbilitiesForTier(record.petType, record.tier);
  }

  /**
   * Check if player has a specific ability unlocked.
   * @param {string} playerId
   * @param {string} abilityId
   * @returns {boolean}
   */
  function hasAbility(playerId, abilityId) {
    var abilities = getPlayerAbilities(playerId);
    for (var i = 0; i < abilities.length; i++) {
      if (abilities[i].id === abilityId) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // ACTIVE BUFFS
  // ---------------------------------------------------------------------------

  /**
   * Get currently active buffs for a player's pet (removes expired ones).
   * @param {string} playerId
   * @param {number} [now]
   * @returns {Array}
   */
  function getActiveBuffs(playerId, now) {
    var record = evolutionData[playerId];
    if (!record) return [];

    var currentTime = now || Date.now();
    var active = [];
    for (var i = 0; i < record.activeBuffs.length; i++) {
      if (record.activeBuffs[i].expiresAt > currentTime) {
        active.push(record.activeBuffs[i]);
      }
    }
    // Update stored buffs to only active
    record.activeBuffs = active;
    return active;
  }

  /**
   * Check if a specific buff type is active.
   * @param {string} playerId
   * @param {string} buffType
   * @param {number} [now]
   * @returns {boolean}
   */
  function hasActiveBuff(playerId, buffType, now) {
    var buffs = getActiveBuffs(playerId, now);
    for (var i = 0; i < buffs.length; i++) {
      if (buffs[i].type === buffType) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // EVOLUTION REQUIREMENT CHECKS
  // ---------------------------------------------------------------------------

  /**
   * Check if a pet can evolve to the next tier.
   * @param {string} playerId
   * @param {Object} [options] - { inventory, achievements, currentZone }
   * @returns {Object} { canEvolve, reason, missing }
   */
  function checkEvolutionRequirements(playerId, options) {
    var record = evolutionData[playerId];
    if (!record) return { canEvolve: false, reason: 'No evolution record', missing: [] };

    options = options || {};
    var currentTier = record.tier;
    var nextTier = getNextTier(currentTier);

    if (!nextTier) {
      return { canEvolve: false, reason: 'Already at maximum tier (Ascended)', missing: [] };
    }

    var reqKey = currentTier + '_to_' + nextTier;
    var reqs = EVOLUTION_REQUIREMENTS[reqKey];
    if (!reqs) return { canEvolve: false, reason: 'No requirements found', missing: [] };

    var petReqs = reqs[record.petType];
    if (!petReqs) return { canEvolve: false, reason: 'Pet type requirements not found', missing: [] };

    var missing = [];

    // Check bond XP
    if (record.bondXp < petReqs.bondXp) {
      missing.push({ type: 'bondXp', needed: petReqs.bondXp, have: record.bondXp });
    }

    // Check item requirement
    if (petReqs.item) {
      var hasItem = false;
      if (options.inventory && typeof options.inventory.hasItem === 'function') {
        hasItem = options.inventory.hasItem(petReqs.item);
      } else if (options.inventoryItems && Array.isArray(options.inventoryItems)) {
        hasItem = options.inventoryItems.indexOf(petReqs.item) !== -1;
      }
      if (!hasItem) {
        missing.push({ type: 'item', item: petReqs.item });
      }
    }

    // Check achievement requirement
    if (petReqs.achievement) {
      var hasAchievement = false;
      if (options.achievements && Array.isArray(options.achievements)) {
        hasAchievement = options.achievements.indexOf(petReqs.achievement) !== -1;
      }
      if (!hasAchievement) {
        missing.push({ type: 'achievement', achievement: petReqs.achievement });
      }
    }

    // Check zone requirement
    if (petReqs.zone) {
      var inZone = (options.currentZone === petReqs.zone);
      if (!inZone) {
        missing.push({ type: 'zone', zone: petReqs.zone });
      }
    }

    var canEvolve = (missing.length === 0);
    return {
      canEvolve: canEvolve,
      reason:    canEvolve ? 'Requirements met' : 'Missing requirements',
      missing:   missing,
      nextTier:  nextTier
    };
  }

  /**
   * Perform the evolution (if requirements met).
   * @param {string} playerId
   * @param {Object} [options] - passed to checkEvolutionRequirements
   * @param {number} [now]
   * @returns {Object} { success, from, to, message, form }
   */
  function evolve(playerId, options, now) {
    var check = checkEvolutionRequirements(playerId, options);
    if (!check.canEvolve) {
      return { success: false, message: check.reason, missing: check.missing };
    }

    var record = evolutionData[playerId];
    var oldTier = record.tier;
    var newTier = check.nextTier;

    record.tier = newTier;
    record.abilities = getAbilitiesForTier(record.petType, newTier);
    record.evolutions.push({
      from:      oldTier,
      to:        newTier,
      timestamp: now || Date.now(),
      bondXp:    record.bondXp
    });

    var form = getCurrentForm(playerId);
    return {
      success:  true,
      from:     oldTier,
      to:       newTier,
      message:  'Your pet evolved to ' + TIER_LABELS[newTier] + '! ' + (form ? form.name : ''),
      form:     form,
      abilities: record.abilities
    };
  }

  // ---------------------------------------------------------------------------
  // DETERMINISTIC MECHANICS (seeded PRNG)
  // ---------------------------------------------------------------------------

  /**
   * Generate deterministic evolution seed from playerId + petType + bondXp.
   * @param {string} playerId
   * @returns {number}
   */
  function generateEvolutionSeed(playerId) {
    var record = evolutionData[playerId];
    if (!record) return 0;

    var str = playerId + record.petType + Math.floor(record.bondXp);
    var seed = 0;
    for (var i = 0; i < str.length; i++) {
      seed = (seed * 31 + str.charCodeAt(i)) | 0;
    }
    return seed >>> 0;
  }

  /**
   * Roll for a special event on evolution using seeded PRNG.
   * @param {string} playerId
   * @returns {Object} { hasSpecialEvent, eventType }
   */
  function rollEvolutionEvent(playerId) {
    var seed = generateEvolutionSeed(playerId);
    var rng = mulberry32(seed);
    var roll = rng();

    var record = evolutionData[playerId];
    if (!record) return { hasSpecialEvent: false, eventType: null };

    // Ascended evolutions have higher chance of special events
    var threshold = (record.tier === TIERS.ASCENDED) ? 0.5 : 0.25;
    if (roll < threshold) {
      var events = ['bonus_xp', 'happiness_boost', 'bonus_ability', 'rare_form'];
      var eventIndex = Math.floor(rng() * events.length);
      return { hasSpecialEvent: true, eventType: events[eventIndex] };
    }
    return { hasSpecialEvent: false, eventType: null };
  }

  /**
   * Deterministically determine if a pet's favorite food feeding grants a bonus.
   * @param {string} playerId
   * @param {number} tick - game tick for seeding
   * @returns {boolean}
   */
  function rollFavoriteFoodBonus(playerId, tick) {
    var record = evolutionData[playerId];
    if (!record) return false;
    var seed = generateEvolutionSeed(playerId) ^ (tick | 0);
    var rng = mulberry32(seed);
    return rng() < 0.3; // 30% chance of extra bonus
  }

  // ---------------------------------------------------------------------------
  // EVOLUTION HISTORY
  // ---------------------------------------------------------------------------

  /**
   * Get evolution history for a player's pet.
   * @param {string} playerId
   * @returns {Array}
   */
  function getEvolutionHistory(playerId) {
    var record = evolutionData[playerId];
    if (!record) return [];
    return record.evolutions.slice();
  }

  // ---------------------------------------------------------------------------
  // PROXIMITY BONDING
  // ---------------------------------------------------------------------------

  /**
   * Award proximity bond XP (called per minute in game loop).
   * @param {string} playerId
   * @param {number} minutes
   * @returns {number} XP gained
   */
  function awardProximityXp(playerId, minutes) {
    var record = evolutionData[playerId];
    if (!record) return 0;

    var gained = BOND_XP_RATES.proximity * (minutes || 1);
    var result = addBondXp(playerId, 'proximity', minutes || 1);
    return result.gained;
  }

  // ---------------------------------------------------------------------------
  // STATE PERSISTENCE
  // ---------------------------------------------------------------------------

  /**
   * Serialise evolution state for saving (returns deep copy).
   * @returns {Object}
   */
  function getEvolutionState() {
    return { evolutionData: JSON.parse(JSON.stringify(evolutionData)) };
  }

  /**
   * Load saved evolution state.
   * @param {Object} savedState
   */
  function loadEvolutionState(savedState) {
    if (!savedState || !savedState.evolutionData) return;
    var keys = Object.keys(savedState.evolutionData);
    for (var i = 0; i < keys.length; i++) {
      evolutionData[keys[i]] = savedState.evolutionData[keys[i]];
    }
  }

  /**
   * Clear all evolution data for a player (on pet release).
   * @param {string} playerId
   */
  function clearPlayerEvolution(playerId) {
    if (evolutionData[playerId]) {
      delete evolutionData[playerId];
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // ASCENDED SPECIAL ABILITIES (unique tier 3 features)
  // ---------------------------------------------------------------------------

  /**
   * Check if a pet is at Ascended tier.
   * @param {string} playerId
   * @returns {boolean}
   */
  function isAscended(playerId) {
    var record = evolutionData[playerId];
    return !!(record && record.tier === TIERS.ASCENDED);
  }

  /**
   * Get all ascended-tier abilities for a pet type.
   * @param {string} petType
   * @returns {Array}
   */
  function getAscendedAbilities(petType) {
    var allAbilities = PET_ABILITIES[petType];
    if (!allAbilities || !allAbilities.ascended) return [];
    return allAbilities.ascended.slice();
  }

  /**
   * Get a summary of the pet's evolution status.
   * @param {string} playerId
   * @returns {Object|null}
   */
  function getEvolutionSummary(playerId) {
    var record = evolutionData[playerId];
    if (!record) return null;

    var form = getCurrentForm(playerId);
    var bonus = getEvolutionBonus(playerId);
    var abilities = getPlayerAbilities(playerId);
    var xpToNext = getXpToNextTier(record.bondXp);

    return {
      playerId:      record.playerId,
      petType:       record.petType,
      tier:          record.tier,
      tierLabel:     TIER_LABELS[record.tier],
      bondXp:        record.bondXp,
      xpToNext:      xpToNext,
      happiness:     record.happiness,
      happinessLabel:getHappinessLabel(record.happiness),
      form:          form,
      bonus:         bonus,
      abilities:     abilities,
      abilityCount:  abilities.length,
      evolutions:    record.evolutions.length,
      isAscended:    (record.tier === TIERS.ASCENDED)
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.TIERS                       = TIERS;
  exports.TIER_XP_THRESHOLDS          = TIER_XP_THRESHOLDS;
  exports.TIER_LABELS                 = TIER_LABELS;
  exports.BOND_XP_RATES               = BOND_XP_RATES;
  exports.HAPPINESS                   = HAPPINESS;
  exports.FOOD_TYPES                  = FOOD_TYPES;
  exports.FAVORITE_FOODS              = FAVORITE_FOODS;
  exports.EVOLUTION_FORMS             = EVOLUTION_FORMS;
  exports.PET_ABILITIES               = PET_ABILITIES;
  exports.PET_BASE_BONUSES            = PET_BASE_BONUSES;
  exports.TIER_STAT_MULTIPLIERS       = TIER_STAT_MULTIPLIERS;
  exports.EVOLUTION_REQUIREMENTS      = EVOLUTION_REQUIREMENTS;

  exports.mulberry32                  = mulberry32;
  exports.initEvolution               = initEvolution;
  exports.getEvolutionRecord          = getEvolutionRecord;
  exports.addBondXp                   = addBondXp;
  exports.setBondXp                   = setBondXp;
  exports.feedPet                     = feedPet;
  exports.playWithPet                 = playWithPet;
  exports.applyHappinessDecay         = applyHappinessDecay;
  exports.getHappinessLabel           = getHappinessLabel;
  exports.getCurrentForm              = getCurrentForm;
  exports.getAllForms                  = getAllForms;
  exports.getEvolutionBonus           = getEvolutionBonus;
  exports.getBonusByTypeAndTier       = getBonusByTypeAndTier;
  exports.getAbilitiesForTier         = getAbilitiesForTier;
  exports.getPlayerAbilities          = getPlayerAbilities;
  exports.hasAbility                  = hasAbility;
  exports.getActiveBuffs              = getActiveBuffs;
  exports.hasActiveBuff               = hasActiveBuff;
  exports.checkEvolutionRequirements  = checkEvolutionRequirements;
  exports.evolve                      = evolve;
  exports.rollEvolutionEvent          = rollEvolutionEvent;
  exports.rollFavoriteFoodBonus       = rollFavoriteFoodBonus;
  exports.generateEvolutionSeed       = generateEvolutionSeed;
  exports.getEvolutionHistory         = getEvolutionHistory;
  exports.awardProximityXp            = awardProximityXp;
  exports.getEvolutionSummary         = getEvolutionSummary;
  exports.isAscended                  = isAscended;
  exports.getAscendedAbilities        = getAscendedAbilities;
  exports.getTierFromXp               = getTierFromXp;
  exports.getNextTier                 = getNextTier;
  exports.getXpToNextTier             = getXpToNextTier;
  exports.getEvolutionState           = getEvolutionState;
  exports.loadEvolutionState          = loadEvolutionState;
  exports.clearPlayerEvolution        = clearPlayerEvolution;

})(typeof module !== 'undefined' ? module.exports : (window.PetEvolution = {}));
