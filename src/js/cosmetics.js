// cosmetics.js
/**
 * ZION Cosmetics System — Unified Avatar Appearance Customization
 * Purely aesthetic with zero gameplay impact.
 * Earned from achievements, badges, prestige, festivals, daily challenges.
 */
(function(exports) {
  'use strict';

  // ── Slot registry ──────────────────────────────────────────────────────────
  var COSMETIC_SLOTS = [
    'skin_tone',
    'hair_style',
    'hair_color',
    'outfit',
    'accessory',
    'emote_set',
    'title',
    'name_color',
    'aura',
    'pet_skin'
  ];

  // ── Rarity tiers ──────────────────────────────────────────────────────────
  var RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  // ── Default equipped values per slot ──────────────────────────────────────
  // IDs that share a display name across slots are given slot-scoped IDs
  // to avoid collisions in the lookup map.
  var SLOT_DEFAULTS = {
    skin_tone:  'tan',
    hair_style: 'short',
    hair_color: 'black',
    outfit:     'peasant',
    accessory:  'accessory_none',
    emote_set:  'emote_default',
    title:      'Citizen',
    name_color: 'white',
    aura:       'aura_none',
    pet_skin:   'pet_default'
  };

  // ── Master cosmetics catalogue ────────────────────────────────────────────
  var COSMETICS = [
    // ── skin_tone (8) ────────────────────────────────────────────────────────
    { id: 'light',     name: 'Light',     slot: 'skin_tone', rarity: 'common',   source: 'default',     sourceId: null,              description: 'A light skin tone.',              season: null,           tradeable: false },
    { id: 'tan',       name: 'Tan',       slot: 'skin_tone', rarity: 'common',   source: 'default',     sourceId: null,              description: 'A warm tan skin tone.',           season: null,           tradeable: false },
    { id: 'brown',     name: 'Brown',     slot: 'skin_tone', rarity: 'common',   source: 'default',     sourceId: null,              description: 'A rich brown skin tone.',         season: null,           tradeable: false },
    { id: 'dark',      name: 'Dark',      slot: 'skin_tone', rarity: 'common',   source: 'default',     sourceId: null,              description: 'A deep dark skin tone.',          season: null,           tradeable: false },
    { id: 'olive',     name: 'Olive',     slot: 'skin_tone', rarity: 'common',   source: 'default',     sourceId: null,              description: 'An olive skin tone.',             season: null,           tradeable: false },
    { id: 'pale',      name: 'Pale',      slot: 'skin_tone', rarity: 'common',   source: 'default',     sourceId: null,              description: 'A pale porcelain skin tone.',     season: null,           tradeable: false },
    { id: 'copper',    name: 'Copper',    slot: 'skin_tone', rarity: 'uncommon', source: 'quest',       sourceId: 'the_forge_trial', description: 'Copper-kissed by the forge.',     season: null,           tradeable: false },
    { id: 'ebony',     name: 'Ebony',     slot: 'skin_tone', rarity: 'uncommon', source: 'quest',       sourceId: 'wilds_trial',     description: 'Deep ebony, beloved of night.',  season: null,           tradeable: false },

    // ── hair_style (10) ──────────────────────────────────────────────────────
    { id: 'short',     name: 'Short',     slot: 'hair_style', rarity: 'common',   source: 'default',     sourceId: null,                description: 'A neat short cut.',               season: null,           tradeable: false },
    { id: 'long',      name: 'Long',      slot: 'hair_style', rarity: 'common',   source: 'default',     sourceId: null,                description: 'Flowing long hair.',              season: null,           tradeable: false },
    { id: 'braided',   name: 'Braided',   slot: 'hair_style', rarity: 'common',   source: 'default',     sourceId: null,                description: 'Neat intricate braids.',          season: null,           tradeable: false },
    { id: 'mohawk',    name: 'Mohawk',    slot: 'hair_style', rarity: 'uncommon', source: 'achievement', sourceId: 'daring_soul',       description: 'A bold mohawk.',                  season: null,           tradeable: false },
    { id: 'bun',       name: 'Bun',       slot: 'hair_style', rarity: 'common',   source: 'default',     sourceId: null,                description: 'A tidy upward bun.',             season: null,           tradeable: false },
    { id: 'ponytail',  name: 'Ponytail',  slot: 'hair_style', rarity: 'common',   source: 'default',     sourceId: null,                description: 'A classic ponytail.',             season: null,           tradeable: false },
    { id: 'curly',     name: 'Curly',     slot: 'hair_style', rarity: 'common',   source: 'default',     sourceId: null,                description: 'Natural curly coils.',            season: null,           tradeable: false },
    { id: 'shaved',    name: 'Shaved',    slot: 'hair_style', rarity: 'uncommon', source: 'badge',       sourceId: 'warrior_badge',     description: 'Closely shaved head.',            season: null,           tradeable: false },
    { id: 'flowing',   name: 'Flowing',   slot: 'hair_style', rarity: 'rare',     source: 'prestige',    sourceId: 'prestige_3',        description: 'Ethereally flowing strands.',     season: null,           tradeable: false },
    { id: 'spiked',    name: 'Spiked',    slot: 'hair_style', rarity: 'uncommon', source: 'challenge',   sourceId: 'lightning_challenge',description: 'Gravity-defying spikes.',        season: null,           tradeable: false },

    // ── hair_color (8) ───────────────────────────────────────────────────────
    { id: 'black',     name: 'Black',     slot: 'hair_color', rarity: 'common',   source: 'default',     sourceId: null,              description: 'Classic jet black hair.',         season: null,           tradeable: false },
    { id: 'hair_brown',name: 'Brown',     slot: 'hair_color', rarity: 'common',   source: 'default',     sourceId: null,              description: 'Rich chestnut brown hair.',        season: null,           tradeable: false },
    { id: 'blonde',    name: 'Blonde',    slot: 'hair_color', rarity: 'common',   source: 'default',     sourceId: null,              description: 'Sunny blonde hair.',              season: null,           tradeable: false },
    { id: 'red',       name: 'Red',       slot: 'hair_color', rarity: 'common',   source: 'default',     sourceId: null,              description: 'Fiery red hair.',                 season: null,           tradeable: false },
    { id: 'hair_white',name: 'White',     slot: 'hair_color', rarity: 'uncommon', source: 'achievement', sourceId: 'elder_sage',       description: 'Wise silvery-white hair.',        season: null,           tradeable: false },
    { id: 'blue',      name: 'Blue',      slot: 'hair_color', rarity: 'rare',     source: 'festival',    sourceId: 'water_festival',   description: 'Ocean-blue hair dye.',            season: 'water_2025',   tradeable: false },
    { id: 'green',     name: 'Green',     slot: 'hair_color', rarity: 'rare',     source: 'festival',    sourceId: 'harvest_festival', description: 'Verdant green hair dye.',         season: 'harvest_2025', tradeable: false },
    { id: 'purple',    name: 'Purple',    slot: 'hair_color', rarity: 'rare',     source: 'prestige',    sourceId: 'prestige_5',       description: 'Royal purple hair dye.',          season: null,           tradeable: false },

    // ── outfit (12) ──────────────────────────────────────────────────────────
    { id: 'peasant',   name: 'Peasant',   slot: 'outfit', rarity: 'common',   source: 'default',     sourceId: null,                  description: 'Simple humble peasant clothes.',  season: null,           tradeable: false },
    { id: 'noble',     name: 'Noble',     slot: 'outfit', rarity: 'rare',     source: 'achievement', sourceId: 'noble_lineage',        description: 'Refined noble garb.',             season: null,           tradeable: false },
    { id: 'explorer',  name: 'Explorer',  slot: 'outfit', rarity: 'uncommon', source: 'achievement', sourceId: 'first_expedition',     description: 'Rugged explorer gear.',           season: null,           tradeable: false },
    { id: 'warrior',   name: 'Warrior',   slot: 'outfit', rarity: 'uncommon', source: 'badge',       sourceId: 'arena_bronze',         description: 'Battle-hardened armor.',          season: null,           tradeable: false },
    { id: 'mage',      name: 'Mage',      slot: 'outfit', rarity: 'rare',     source: 'achievement', sourceId: 'arcane_student',       description: 'Flowing mage robes.',             season: null,           tradeable: false },
    { id: 'artisan',   name: 'Artisan',   slot: 'outfit', rarity: 'uncommon', source: 'achievement', sourceId: 'master_crafter',       description: 'Stout workshop attire.',          season: null,           tradeable: false },
    { id: 'merchant',  name: 'Merchant',  slot: 'outfit', rarity: 'uncommon', source: 'achievement', sourceId: 'market_regular',       description: 'Prosperous merchant clothes.',    season: null,           tradeable: false },
    { id: 'scholar',   name: 'Scholar',   slot: 'outfit', rarity: 'uncommon', source: 'achievement', sourceId: 'bookworm',             description: 'Ink-stained scholar robes.',      season: null,           tradeable: false },
    { id: 'ranger',    name: 'Ranger',    slot: 'outfit', rarity: 'uncommon', source: 'achievement', sourceId: 'trail_blazer',         description: 'Swift woodland ranger suit.',     season: null,           tradeable: false },
    { id: 'bard',      name: 'Bard',      slot: 'outfit', rarity: 'rare',     source: 'achievement', sourceId: 'crowd_pleaser',        description: 'Colorful performer costume.',     season: null,           tradeable: false },
    { id: 'gardener',  name: 'Gardener',  slot: 'outfit', rarity: 'common',   source: 'quest',       sourceId: 'green_thumb',          description: 'Earthy gardener overalls.',       season: null,           tradeable: false },
    { id: 'fisher',    name: 'Fisher',    slot: 'outfit', rarity: 'common',   source: 'quest',       sourceId: 'first_catch',          description: 'Waterproof fishing waders.',      season: null,           tradeable: false },

    // ── accessory (10) ───────────────────────────────────────────────────────
    { id: 'accessory_none', name: 'None',           slot: 'accessory', rarity: 'common',    source: 'default',     sourceId: null,                 description: 'No accessory.',                   season: null,            tradeable: false },
    { id: 'golden_crown',   name: 'Golden Crown',   slot: 'accessory', rarity: 'legendary', source: 'achievement', sourceId: 'master_crafter',     description: 'A crown forged in the fires of mastery.', season: null, tradeable: false },
    { id: 'silver_tiara',   name: 'Silver Tiara',   slot: 'accessory', rarity: 'epic',      source: 'achievement', sourceId: 'noble_lineage',      description: 'Elegant noble silverwork.',        season: null,            tradeable: false },
    { id: 'eye_patch',      name: 'Eye Patch',      slot: 'accessory', rarity: 'uncommon',  source: 'badge',       sourceId: 'pirate_badge',       description: 'A roguish eye patch.',            season: null,            tradeable: false },
    { id: 'monocle',        name: 'Monocle',        slot: 'accessory', rarity: 'uncommon',  source: 'achievement', sourceId: 'scholar_badge',      description: 'A distinguished monocle.',        season: null,            tradeable: false },
    { id: 'scarf',          name: 'Scarf',           slot: 'accessory', rarity: 'common',    source: 'craft',       sourceId: 'tailoring_1',        description: 'A warm knitted scarf.',           season: null,            tradeable: true  },
    { id: 'cape',           name: 'Cape',            slot: 'accessory', rarity: 'rare',      source: 'prestige',    sourceId: 'prestige_2',         description: 'A flowing prestige cape.',        season: null,            tradeable: false },
    { id: 'flower_wreath',  name: 'Flower Wreath',  slot: 'accessory', rarity: 'uncommon',  source: 'festival',    sourceId: 'spring_festival',    description: 'A wreath of spring blossoms.',    season: 'spring_2025',   tradeable: false },
    { id: 'bandana',        name: 'Bandana',         slot: 'accessory', rarity: 'common',    source: 'craft',       sourceId: 'tailoring_1',        description: 'A trusty adventurer bandana.',   season: null,            tradeable: true  },
    { id: 'mask',           name: 'Mask',            slot: 'accessory', rarity: 'epic',      source: 'festival',    sourceId: 'shadow_festival',    description: 'An enigmatic festival mask.',     season: 'shadow_2025',   tradeable: false },

    // ── emote_set (6) ────────────────────────────────────────────────────────
    { id: 'emote_default', name: 'Default',    slot: 'emote_set', rarity: 'common',   source: 'default',     sourceId: null,               description: 'Standard emote pack.',            season: null,           tradeable: false },
    { id: 'cheerful',   name: 'Cheerful',   slot: 'emote_set', rarity: 'uncommon', source: 'achievement', sourceId: 'social_butterfly',  description: 'Sunny upbeat emotes.',            season: null,           tradeable: false },
    { id: 'dramatic',   name: 'Dramatic',   slot: 'emote_set', rarity: 'rare',     source: 'achievement', sourceId: 'crowd_pleaser',     description: 'Over-the-top theatrical emotes.', season: null,           tradeable: false },
    { id: 'mysterious', name: 'Mysterious', slot: 'emote_set', rarity: 'rare',     source: 'prestige',    sourceId: 'prestige_4',       description: 'Subtle cryptic emotes.',          season: null,           tradeable: false },
    { id: 'playful',    name: 'Playful',    slot: 'emote_set', rarity: 'uncommon', source: 'challenge',   sourceId: 'fun_challenge',    description: 'Lighthearted playful emotes.',    season: null,           tradeable: false },
    { id: 'stoic',      name: 'Stoic',      slot: 'emote_set', rarity: 'uncommon', source: 'badge',       sourceId: 'veteran_badge',    description: 'Calm measured emotes.',           season: null,           tradeable: false },

    // ── title (10) ───────────────────────────────────────────────────────────
    { id: 'Citizen',   name: 'Citizen',   slot: 'title', rarity: 'common',    source: 'default',     sourceId: null,                  description: 'A proud citizen of ZION.',        season: null,           tradeable: false },
    { id: 'Explorer',  name: 'Explorer',  slot: 'title', rarity: 'common',    source: 'achievement', sourceId: 'first_expedition',    description: 'A bold explorer of new lands.',   season: null,           tradeable: false },
    { id: 'Artisan',   name: 'Artisan',   slot: 'title', rarity: 'uncommon',  source: 'achievement', sourceId: 'master_crafter',      description: 'A skilled maker of things.',      season: null,           tradeable: false },
    { id: 'Scholar',   name: 'Scholar',   slot: 'title', rarity: 'uncommon',  source: 'achievement', sourceId: 'bookworm',             description: 'A seeker of knowledge.',          season: null,           tradeable: false },
    { id: 'Champion',  name: 'Champion',  slot: 'title', rarity: 'rare',      source: 'badge',       sourceId: 'arena_gold',          description: 'A proven arena champion.',        season: null,           tradeable: false },
    { id: 'Veteran',   name: 'Veteran',   slot: 'title', rarity: 'rare',      source: 'badge',       sourceId: 'veteran_badge',       description: 'A seasoned veteran of ZION.',     season: null,           tradeable: false },
    { id: 'Legend',    name: 'Legend',    slot: 'title', rarity: 'epic',      source: 'prestige',    sourceId: 'prestige_5',          description: 'A living legend.',               season: null,           tradeable: false },
    { id: 'Pioneer',   name: 'Pioneer',   slot: 'title', rarity: 'epic',      source: 'achievement', sourceId: 'first_settler',       description: 'One of the founding pioneers.',   season: null,           tradeable: false },
    { id: 'Sage',      name: 'Sage',      slot: 'title', rarity: 'epic',      source: 'achievement', sourceId: 'elder_sage',           description: 'A wellspring of ancient wisdom.', season: null,           tradeable: false },
    { id: 'Eternal',   name: 'Eternal',   slot: 'title', rarity: 'legendary', source: 'prestige',    sourceId: 'prestige_10',         description: 'Transcendent — beyond time.',     season: null,           tradeable: false },

    // ── name_color (8) ───────────────────────────────────────────────────────
    { id: 'white',    name: 'White',    slot: 'name_color', rarity: 'common',    source: 'default',     sourceId: null,              description: 'Standard white name.',            season: null,           tradeable: false },
    { id: 'gold',     name: 'Gold',     slot: 'name_color', rarity: 'epic',      source: 'prestige',    sourceId: 'prestige_5',      description: 'Gleaming golden name.',           season: null,           tradeable: false },
    { id: 'silver',   name: 'Silver',   slot: 'name_color', rarity: 'rare',      source: 'badge',       sourceId: 'veteran_badge',   description: 'Cool silver name.',               season: null,           tradeable: false },
    { id: 'cyan',     name: 'Cyan',     slot: 'name_color', rarity: 'rare',      source: 'festival',    sourceId: 'water_festival',  description: 'Aquatic cyan name.',              season: 'water_2025',   tradeable: false },
    { id: 'magenta',  name: 'Magenta',  slot: 'name_color', rarity: 'rare',      source: 'achievement', sourceId: 'crowd_pleaser',   description: 'Vivid magenta name.',             season: null,           tradeable: false },
    { id: 'emerald',  name: 'Emerald',  slot: 'name_color', rarity: 'rare',      source: 'achievement', sourceId: 'trail_blazer',    description: 'Rich emerald name.',              season: null,           tradeable: false },
    { id: 'crimson',  name: 'Crimson',  slot: 'name_color', rarity: 'rare',      source: 'achievement', sourceId: 'arena_bronze',    description: 'Bold crimson name.',              season: null,           tradeable: false },
    { id: 'rainbow',  name: 'Rainbow',  slot: 'name_color', rarity: 'legendary', source: 'achievement', sourceId: 'true_legend',     description: 'A shimmering rainbow name.',      season: null,           tradeable: false },

    // ── aura (6) ─────────────────────────────────────────────────────────────
    { id: 'aura_none',    name: 'None',         slot: 'aura', rarity: 'common',    source: 'default',     sourceId: null,               description: 'No aura.',                        season: null,           tradeable: false },
    { id: 'gentle_glow',  name: 'Gentle Glow',  slot: 'aura', rarity: 'uncommon',  source: 'achievement', sourceId: 'first_mentor',     description: 'A soft warm glow.',               season: null,           tradeable: false },
    { id: 'starlight',    name: 'Starlight',    slot: 'aura', rarity: 'rare',      source: 'achievement', sourceId: 'stargazer',        description: 'Twinkling starlight drifts near.', season: null,           tradeable: false },
    { id: 'flame',        name: 'Flame',        slot: 'aura', rarity: 'epic',      source: 'badge',       sourceId: 'arena_gold',       description: 'Dancing flames surround you.',    season: null,           tradeable: false },
    { id: 'frost',        name: 'Frost',        slot: 'aura', rarity: 'epic',      source: 'festival',    sourceId: 'winter_festival',  description: 'Crystalline frost swirls.',        season: 'winter_2025',  tradeable: false },
    { id: 'shadow',       name: 'Shadow',       slot: 'aura', rarity: 'legendary', source: 'prestige',    sourceId: 'prestige_10',      description: 'Darkness bends to your will.',    season: null,           tradeable: false },

    // ── pet_skin (6) ─────────────────────────────────────────────────────────
    { id: 'pet_default', name: 'Default',     slot: 'pet_skin', rarity: 'common',    source: 'default',     sourceId: null,               description: 'Standard pet appearance.',        season: null,           tradeable: false },
    { id: 'golden',      name: 'Golden',      slot: 'pet_skin', rarity: 'rare',      source: 'achievement', sourceId: 'master_crafter',   description: 'Your pet shimmers with gold.',    season: null,           tradeable: false },
    { id: 'crystalline', name: 'Crystalline', slot: 'pet_skin', rarity: 'epic',      source: 'achievement', sourceId: 'stargazer',        description: 'Your pet is made of crystal.',    season: null,           tradeable: false },
    { id: 'pet_shadow',  name: 'Shadow',      slot: 'pet_skin', rarity: 'epic',      source: 'prestige',    sourceId: 'prestige_8',       description: 'Your pet cloaked in shadow.',     season: null,           tradeable: false },
    { id: 'celestial',   name: 'Celestial',   slot: 'pet_skin', rarity: 'legendary', source: 'prestige',    sourceId: 'prestige_10',      description: 'Your pet radiates cosmic light.',  season: null,           tradeable: false },
    { id: 'autumn',      name: 'Autumn',      slot: 'pet_skin', rarity: 'uncommon',  source: 'festival',    sourceId: 'harvest_festival', description: 'Autumn leaves adorn your pet.',   season: 'harvest_2025', tradeable: false }
  ];

  // Build fast lookup map: id → cosmetic
  var _cosmeticMap = {};
  for (var _ci = 0; _ci < COSMETICS.length; _ci++) {
    _cosmeticMap[COSMETICS[_ci].id] = COSMETICS[_ci];
  }

  // ── Helper: deep clone a plain object / array ─────────────────────────────
  function _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ── Helper: get a player's appearance record (mutable ref) ─────────────────
  function _getRecord(state, playerId) {
    if (!state.appearances) return null;
    return state.appearances[playerId] || null;
  }

  // ── Core functions ─────────────────────────────────────────────────────────

  /**
   * initAppearance(state, playerId)
   * Initialises a player's appearance with all slot defaults unlocked.
   * Idempotent — returns unchanged state if player is already initialised.
   */
  function initAppearance(state, playerId) {
    if (!state.appearances) state.appearances = {};
    if (state.appearances[playerId]) return state;

    var equipped = {};
    var unlocked = [];
    for (var i = 0; i < COSMETIC_SLOTS.length; i++) {
      var slot = COSMETIC_SLOTS[i];
      equipped[slot] = SLOT_DEFAULTS[slot];
      var defaultId = SLOT_DEFAULTS[slot];
      if (unlocked.indexOf(defaultId) === -1) {
        unlocked.push(defaultId);
      }
    }

    state.appearances[playerId] = {
      playerId: playerId,
      equipped: equipped,
      unlocked: unlocked,
      favorites: [],
      outfits: {}
    };

    return state;
  }

  /**
   * unlockCosmetic(state, playerId, cosmeticId)
   * Adds a cosmetic to a player's unlocked list.
   * Returns {success, cosmetic, alreadyUnlocked}
   */
  function unlockCosmetic(state, playerId, cosmeticId) {
    var cosmetic = _cosmeticMap[cosmeticId];
    if (!cosmetic) {
      return { success: false, cosmetic: null, alreadyUnlocked: false, reason: 'Cosmetic not found: ' + cosmeticId };
    }

    initAppearance(state, playerId);
    var record = _getRecord(state, playerId);

    if (record.unlocked.indexOf(cosmeticId) !== -1) {
      return { success: true, cosmetic: cosmetic, alreadyUnlocked: true };
    }

    record.unlocked.push(cosmeticId);
    return { success: true, cosmetic: cosmetic, alreadyUnlocked: false };
  }

  /**
   * equipCosmetic(state, playerId, cosmeticId)
   * Equips a cosmetic (must be unlocked first).
   * Returns {success, slot, previousItem, reason}
   */
  function equipCosmetic(state, playerId, cosmeticId) {
    var cosmetic = _cosmeticMap[cosmeticId];
    if (!cosmetic) {
      return { success: false, slot: null, previousItem: null, reason: 'Cosmetic not found: ' + cosmeticId };
    }

    initAppearance(state, playerId);
    var record = _getRecord(state, playerId);

    if (record.unlocked.indexOf(cosmeticId) === -1) {
      return { success: false, slot: null, previousItem: null, reason: 'Cosmetic not unlocked: ' + cosmeticId };
    }

    var slot = cosmetic.slot;
    var previousItem = record.equipped[slot];
    record.equipped[slot] = cosmeticId;

    return { success: true, slot: slot, previousItem: previousItem, reason: null };
  }

  /**
   * unequipCosmetic(state, playerId, slot)
   * Resets a slot back to its default cosmetic.
   * Returns {success, slot, reason}
   */
  function unequipCosmetic(state, playerId, slot) {
    if (COSMETIC_SLOTS.indexOf(slot) === -1) {
      return { success: false, slot: slot, reason: 'Unknown slot: ' + slot };
    }

    initAppearance(state, playerId);
    var record = _getRecord(state, playerId);
    record.equipped[slot] = SLOT_DEFAULTS[slot];

    return { success: true, slot: slot, reason: null };
  }

  /**
   * getAppearance(state, playerId)
   * Returns player's full current appearance record, or null if not initialised.
   */
  function getAppearance(state, playerId) {
    if (!state.appearances) return null;
    var record = state.appearances[playerId];
    if (!record) return null;
    return _clone(record);
  }

  /**
   * getUnlockedCosmetics(state, playerId, slot)
   * Returns all cosmetics unlocked by the player, optionally filtered by slot.
   */
  function getUnlockedCosmetics(state, playerId, slot) {
    if (!state.appearances || !state.appearances[playerId]) return [];
    var record = state.appearances[playerId];
    var result = [];
    for (var i = 0; i < record.unlocked.length; i++) {
      var c = _cosmeticMap[record.unlocked[i]];
      if (!c) continue;
      if (slot && c.slot !== slot) continue;
      result.push(_clone(c));
    }
    return result;
  }

  /**
   * getLockedCosmetics(state, playerId, slot)
   * Returns cosmetics the player hasn't unlocked, optionally filtered by slot.
   */
  function getLockedCosmetics(state, playerId, slot) {
    if (!state.appearances || !state.appearances[playerId]) {
      // If not initialised, all cosmetics are locked
      var all = slot ? getCosmeticsBySlot(slot) : COSMETICS.slice();
      return all;
    }
    var record = state.appearances[playerId];
    var result = [];
    for (var i = 0; i < COSMETICS.length; i++) {
      var c = COSMETICS[i];
      if (slot && c.slot !== slot) continue;
      if (record.unlocked.indexOf(c.id) === -1) {
        result.push(_clone(c));
      }
    }
    return result;
  }

  /**
   * getCosmeticById(cosmeticId)
   * Returns the cosmetic definition, or null if not found.
   */
  function getCosmeticById(cosmeticId) {
    var c = _cosmeticMap[cosmeticId];
    return c ? _clone(c) : null;
  }

  /**
   * getCosmeticsBySlot(slot)
   * Returns all cosmetics for the given slot.
   */
  function getCosmeticsBySlot(slot) {
    var result = [];
    for (var i = 0; i < COSMETICS.length; i++) {
      if (COSMETICS[i].slot === slot) result.push(_clone(COSMETICS[i]));
    }
    return result;
  }

  /**
   * getCosmeticsByRarity(rarity)
   * Returns all cosmetics of a given rarity.
   */
  function getCosmeticsByRarity(rarity) {
    var result = [];
    for (var i = 0; i < COSMETICS.length; i++) {
      if (COSMETICS[i].rarity === rarity) result.push(_clone(COSMETICS[i]));
    }
    return result;
  }

  /**
   * getCosmeticsBySource(source)
   * Returns all cosmetics from a given source (achievement, prestige, etc).
   */
  function getCosmeticsBySource(source) {
    var result = [];
    for (var i = 0; i < COSMETICS.length; i++) {
      if (COSMETICS[i].source === source) result.push(_clone(COSMETICS[i]));
    }
    return result;
  }

  /**
   * getSeasonalCosmetics(season)
   * Returns cosmetics exclusive to the given season (non-null season field).
   * Pass null/undefined to get all seasonal cosmetics regardless of season.
   */
  function getSeasonalCosmetics(season) {
    var result = [];
    for (var i = 0; i < COSMETICS.length; i++) {
      var c = COSMETICS[i];
      if (season !== undefined && season !== null) {
        if (c.season === season) result.push(_clone(c));
      } else {
        if (c.season !== null) result.push(_clone(c));
      }
    }
    return result;
  }

  /**
   * saveOutfit(state, playerId, outfitName)
   * Saves the player's current equipped appearance as a named preset.
   * Returns {success, outfit, reason}
   */
  function saveOutfit(state, playerId, outfitName) {
    if (!outfitName || typeof outfitName !== 'string' || outfitName.trim() === '') {
      return { success: false, outfit: null, reason: 'Invalid outfit name' };
    }

    initAppearance(state, playerId);
    var record = _getRecord(state, playerId);
    if (!record.outfits) record.outfits = {};

    var outfit = {
      name: outfitName,
      equipped: _clone(record.equipped),
      savedAt: Date.now()
    };

    record.outfits[outfitName] = outfit;
    return { success: true, outfit: _clone(outfit), reason: null };
  }

  /**
   * loadOutfit(state, playerId, outfitName)
   * Applies a saved outfit preset to the player's current appearance.
   * Only slots whose cosemtics are still unlocked get applied.
   * Returns {success, reason, applied, skipped}
   */
  function loadOutfit(state, playerId, outfitName) {
    initAppearance(state, playerId);
    var record = _getRecord(state, playerId);
    if (!record.outfits || !record.outfits[outfitName]) {
      return { success: false, reason: 'Outfit not found: ' + outfitName, applied: [], skipped: [] };
    }

    var outfit = record.outfits[outfitName];
    var applied = [];
    var skipped = [];

    for (var slot in outfit.equipped) {
      if (!outfit.equipped.hasOwnProperty(slot)) continue;
      var cosmeticId = outfit.equipped[slot];
      if (record.unlocked.indexOf(cosmeticId) !== -1) {
        record.equipped[slot] = cosmeticId;
        applied.push(slot);
      } else {
        skipped.push(slot);
      }
    }

    return { success: true, reason: null, applied: applied, skipped: skipped };
  }

  /**
   * getOutfits(state, playerId)
   * Returns all saved outfit presets for a player.
   */
  function getOutfits(state, playerId) {
    if (!state.appearances || !state.appearances[playerId]) return {};
    var record = state.appearances[playerId];
    return _clone(record.outfits || {});
  }

  /**
   * deleteOutfit(state, playerId, outfitName)
   * Deletes a saved outfit preset.
   * Returns {success, reason}
   */
  function deleteOutfit(state, playerId, outfitName) {
    if (!state.appearances || !state.appearances[playerId]) {
      return { success: false, reason: 'Player not found' };
    }
    var record = state.appearances[playerId];
    if (!record.outfits || !record.outfits[outfitName]) {
      return { success: false, reason: 'Outfit not found: ' + outfitName };
    }
    delete record.outfits[outfitName];
    return { success: true, reason: null };
  }

  /**
   * getCompletionStats(state, playerId)
   * Returns collection completion statistics.
   * {totalCosmetics, unlocked, percent, bySlot: {...}, byRarity: {...}}
   */
  function getCompletionStats(state, playerId) {
    var unlockedSet = {};
    if (state.appearances && state.appearances[playerId]) {
      var rec = state.appearances[playerId];
      for (var u = 0; u < rec.unlocked.length; u++) {
        unlockedSet[rec.unlocked[u]] = true;
      }
    }

    var total = COSMETICS.length;
    var unlockedCount = 0;
    var bySlot = {};
    var byRarity = {};

    for (var i = 0; i < COSMETIC_SLOTS.length; i++) {
      bySlot[COSMETIC_SLOTS[i]] = { total: 0, unlocked: 0 };
    }
    for (var r = 0; r < RARITIES.length; r++) {
      byRarity[RARITIES[r]] = { total: 0, unlocked: 0 };
    }

    for (var j = 0; j < COSMETICS.length; j++) {
      var c = COSMETICS[j];
      bySlot[c.slot].total++;
      byRarity[c.rarity].total++;
      if (unlockedSet[c.id]) {
        unlockedCount++;
        bySlot[c.slot].unlocked++;
        byRarity[c.rarity].unlocked++;
      }
    }

    return {
      totalCosmetics: total,
      unlocked: unlockedCount,
      percent: total > 0 ? Math.round((unlockedCount / total) * 100) : 0,
      bySlot: bySlot,
      byRarity: byRarity
    };
  }

  /**
   * getSlots()
   * Returns a copy of all cosmetic slot names.
   */
  function getSlots() {
    return COSMETIC_SLOTS.slice();
  }

  /**
   * getRarities()
   * Returns a copy of all rarity tier names.
   */
  function getRarities() {
    return RARITIES.slice();
  }

  /**
   * previewAppearance(state, playerId, changes)
   * Returns what the appearance would look like with changes applied, without saving.
   * changes: {slot: cosmeticId, ...}
   * Returns {equipped, valid, invalid} — does not mutate state.
   */
  function previewAppearance(state, playerId, changes) {
    initAppearance(state, playerId);
    var record = _getRecord(state, playerId);
    var equipped = _clone(record.equipped);
    var valid = [];
    var invalid = [];

    for (var slot in changes) {
      if (!changes.hasOwnProperty(slot)) continue;
      var cosmeticId = changes[slot];
      var cosmetic = _cosmeticMap[cosmeticId];

      if (!cosmetic) {
        invalid.push({ slot: slot, cosmeticId: cosmeticId, reason: 'Cosmetic not found' });
        continue;
      }
      if (cosmetic.slot !== slot) {
        invalid.push({ slot: slot, cosmeticId: cosmeticId, reason: 'Cosmetic belongs to slot ' + cosmetic.slot });
        continue;
      }
      if (record.unlocked.indexOf(cosmeticId) === -1) {
        invalid.push({ slot: slot, cosmeticId: cosmeticId, reason: 'Not unlocked' });
        continue;
      }

      equipped[slot] = cosmeticId;
      valid.push(slot);
    }

    return { equipped: equipped, valid: valid, invalid: invalid };
  }

  // ── Exports ────────────────────────────────────────────────────────────────
  exports.COSMETIC_SLOTS   = COSMETIC_SLOTS;
  exports.COSMETICS        = COSMETICS;
  exports.RARITIES         = RARITIES;
  exports.SLOT_DEFAULTS    = SLOT_DEFAULTS;

  exports.initAppearance       = initAppearance;
  exports.unlockCosmetic       = unlockCosmetic;
  exports.equipCosmetic        = equipCosmetic;
  exports.unequipCosmetic      = unequipCosmetic;
  exports.getAppearance        = getAppearance;
  exports.getUnlockedCosmetics = getUnlockedCosmetics;
  exports.getLockedCosmetics   = getLockedCosmetics;
  exports.getCosmeticById      = getCosmeticById;
  exports.getCosmeticsBySlot   = getCosmeticsBySlot;
  exports.getCosmeticsByRarity = getCosmeticsByRarity;
  exports.getCosmeticsBySource = getCosmeticsBySource;
  exports.getSeasonalCosmetics = getSeasonalCosmetics;
  exports.saveOutfit           = saveOutfit;
  exports.loadOutfit           = loadOutfit;
  exports.getOutfits           = getOutfits;
  exports.deleteOutfit         = deleteOutfit;
  exports.getCompletionStats   = getCompletionStats;
  exports.getSlots             = getSlots;
  exports.getRarities          = getRarities;
  exports.previewAppearance    = previewAppearance;

})(typeof module !== 'undefined' ? module.exports : (window.Cosmetics = {}));
