/**
 * ZION Crafting Chains System
 * Multi-stage industrial crafting: chain workstations (smelter→forge→engraver)
 * for tiered goods across 4 production stages, advanced blueprints requiring
 * intermediate products, creating inter-player supply chain dependencies.
 * Constitution reference: Article III — crafting is a core protocol activity.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Dependency guards
  // ---------------------------------------------------------------------------
  var Crafting       = (typeof window !== 'undefined' && window.Crafting)       || {};
  var Inventory      = (typeof window !== 'undefined' && window.Inventory)      || {};
  var SkillMastery   = (typeof window !== 'undefined' && window.SkillMastery)   || {};
  var Specializations = (typeof window !== 'undefined' && window.Specializations) || {};
  var Economy        = (typeof window !== 'undefined' && window.Economy)        || {};

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32 (identical to crafting.js, deterministic quality)
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
  // CONSTANTS
  // ---------------------------------------------------------------------------

  /** The four production stages, in order. */
  var STAGES = ['raw', 'refined', 'component', 'finished'];

  /** Workstation types and their base properties. */
  var WORKSTATION_TYPES = {
    smelter:   { id: 'smelter',   name: 'Smelter',   stage: 'raw',       baseTime: 8000,  durabilityMax: 200, specialization: 'metallurgy' },
    forge:     { id: 'forge',     name: 'Forge',      stage: 'refined',   baseTime: 12000, durabilityMax: 180, specialization: 'metallurgy' },
    loom:      { id: 'loom',      name: 'Loom',       stage: 'refined',   baseTime: 10000, durabilityMax: 150, specialization: 'textiles'   },
    engraver:  { id: 'engraver',  name: 'Engraver',   stage: 'component', baseTime: 14000, durabilityMax: 120, specialization: 'artisan'    },
    assembler: { id: 'assembler', name: 'Assembler',  stage: 'component', baseTime: 16000, durabilityMax: 160, specialization: 'engineering'},
    refinery:  { id: 'refinery',  name: 'Refinery',   stage: 'raw',       baseTime: 9000,  durabilityMax: 190, specialization: 'alchemy'    }
  };

  /** Quality tier boundaries (matches crafting.js). */
  var QUALITY_TIERS = {
    poor:       { min: 0.0,  max: 0.3,  label: 'Poor',       color: '#9e9e9e' },
    common:     { min: 0.3,  max: 0.6,  label: 'Common',     color: '#ffffff' },
    fine:       { min: 0.6,  max: 0.8,  label: 'Fine',       color: '#4caf50' },
    superior:   { min: 0.8,  max: 0.95, label: 'Superior',   color: '#2196f3' },
    masterwork: { min: 0.95, max: 1.0,  label: 'Masterwork', color: '#9c27b0' }
  };

  var QUALITY_TIER_ORDER = ['poor', 'common', 'fine', 'superior', 'masterwork'];

  /** Chain efficiency bonus when all 4 stages are used in sequence. */
  var CHAIN_EFFICIENCY_BONUS = 0.15;

  /** Specialization bonus to quality per relevant specialization level. */
  var SPEC_QUALITY_BONUS_PER_LEVEL = 0.03;

  /** Durability cost per production run at a workstation. */
  var DURABILITY_COST_PER_RUN = 5;

  /** Supply chain order expiry time in ms (24 hours). */
  var ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000;

  // ---------------------------------------------------------------------------
  // INTERMEDIATE PRODUCTS — produced by workstations, consumed by later stages
  // ---------------------------------------------------------------------------

  var INTERMEDIATE_PRODUCTS = {
    // Smelter outputs (raw → refined feed)
    iron_ingot:       { id: 'iron_ingot',       name: 'Iron Ingot',       stage: 'refined',   from: 'smelter'  },
    copper_ingot:     { id: 'copper_ingot',     name: 'Copper Ingot',     stage: 'refined',   from: 'smelter'  },
    gold_ingot:       { id: 'gold_ingot',       name: 'Gold Ingot',       stage: 'refined',   from: 'smelter'  },
    steel_billet:     { id: 'steel_billet',     name: 'Steel Billet',     stage: 'refined',   from: 'smelter'  },
    alloyed_bar:      { id: 'alloyed_bar',      name: 'Alloyed Bar',      stage: 'refined',   from: 'smelter'  },
    refined_crystal:  { id: 'refined_crystal',  name: 'Refined Crystal',  stage: 'refined',   from: 'refinery' },
    purified_essence: { id: 'purified_essence', name: 'Purified Essence', stage: 'refined',   from: 'refinery' },
    spun_fiber:       { id: 'spun_fiber',       name: 'Spun Fiber',       stage: 'refined',   from: 'loom'     },
    woven_cloth:      { id: 'woven_cloth',      name: 'Woven Cloth',      stage: 'refined',   from: 'loom'     },
    // Component outputs (refined → finished feed)
    gear_assembly:    { id: 'gear_assembly',    name: 'Gear Assembly',    stage: 'component', from: 'assembler'},
    circuit_plate:    { id: 'circuit_plate',    name: 'Circuit Plate',    stage: 'component', from: 'assembler'},
    engraved_plate:   { id: 'engraved_plate',   name: 'Engraved Plate',   stage: 'component', from: 'engraver' },
    etched_gem:       { id: 'etched_gem',       name: 'Etched Gem',       stage: 'component', from: 'engraver' },
    tempered_blade:   { id: 'tempered_blade',   name: 'Tempered Blade',   stage: 'component', from: 'forge'    },
    forged_frame:     { id: 'forged_frame',     name: 'Forged Frame',     stage: 'component', from: 'forge'    }
  };

  // ---------------------------------------------------------------------------
  // CHAIN BLUEPRINTS — multi-stage recipes
  // Each stage lists: workstation, inputs (itemIds + quantities), output, time
  // ---------------------------------------------------------------------------

  var CHAIN_BLUEPRINTS = [

    // ── METAL CHAIN 1: Iron Sword Chain ──────────────────────────────────────
    {
      id: 'chain_iron_sword',
      name: 'Masterwork Iron Sword',
      category: 'weapons',
      levelRequired: 3,
      stages: [
        {
          stage: 'raw',
          workstation: 'smelter',
          inputs: [{ itemId: 'iron_ore', qty: 4 }, { itemId: 'coal', qty: 2 }],
          output: { itemId: 'iron_ingot', qty: 2 },
          time: 8000
        },
        {
          stage: 'refined',
          workstation: 'forge',
          inputs: [{ itemId: 'iron_ingot', qty: 2 }, { itemId: 'coal', qty: 1 }],
          output: { itemId: 'tempered_blade', qty: 1 },
          time: 12000
        },
        {
          stage: 'component',
          workstation: 'engraver',
          inputs: [{ itemId: 'tempered_blade', qty: 1 }, { itemId: 'gold_ore', qty: 1 }],
          output: { itemId: 'engraved_plate', qty: 1 },
          time: 14000
        },
        {
          stage: 'finished',
          workstation: 'assembler',
          inputs: [{ itemId: 'engraved_plate', qty: 1 }, { itemId: 'leather', qty: 2 }],
          output: { itemId: 'masterwork_iron_sword', qty: 1 },
          time: 10000
        }
      ],
      xpReward: 120,
      description: 'A full 4-stage smelter→forge→engraver→assembler chain producing a masterwork sword.'
    },

    // ── TEXTILE CHAIN: Enchanted Robe ────────────────────────────────────────
    {
      id: 'chain_enchanted_robe',
      name: 'Enchanted Robe',
      category: 'armor',
      levelRequired: 4,
      stages: [
        {
          stage: 'raw',
          workstation: 'refinery',
          inputs: [{ itemId: 'crystal', qty: 2 }, { itemId: 'herbs', qty: 3 }],
          output: { itemId: 'purified_essence', qty: 1 },
          time: 9000
        },
        {
          stage: 'refined',
          workstation: 'loom',
          inputs: [{ itemId: 'fiber', qty: 5 }, { itemId: 'purified_essence', qty: 1 }],
          output: { itemId: 'woven_cloth', qty: 2 },
          time: 10000
        },
        {
          stage: 'component',
          workstation: 'engraver',
          inputs: [{ itemId: 'woven_cloth', qty: 2 }, { itemId: 'gem_sapphire', qty: 1 }],
          output: { itemId: 'etched_gem', qty: 1 },
          time: 14000
        },
        {
          stage: 'finished',
          workstation: 'assembler',
          inputs: [{ itemId: 'etched_gem', qty: 1 }, { itemId: 'woven_cloth', qty: 1 }, { itemId: 'gold_ingot', qty: 1 }],
          output: { itemId: 'enchanted_robe', qty: 1 },
          time: 16000
        }
      ],
      xpReward: 150,
      description: 'Textile chain using refinery for essence extraction, loom weaving, engraver gem-work, then assembly.'
    },

    // ── MECHANICAL CHAIN: Clockwork Automaton ────────────────────────────────
    {
      id: 'chain_clockwork_automaton',
      name: 'Clockwork Automaton',
      category: 'gadgets',
      levelRequired: 6,
      stages: [
        {
          stage: 'raw',
          workstation: 'smelter',
          inputs: [{ itemId: 'copper_ore', qty: 5 }, { itemId: 'iron_ore', qty: 3 }, { itemId: 'coal', qty: 3 }],
          output: { itemId: 'alloyed_bar', qty: 3 },
          time: 10000
        },
        {
          stage: 'refined',
          workstation: 'forge',
          inputs: [{ itemId: 'alloyed_bar', qty: 3 }, { itemId: 'coal', qty: 2 }],
          output: { itemId: 'forged_frame', qty: 1 },
          time: 14000
        },
        {
          stage: 'component',
          workstation: 'assembler',
          inputs: [{ itemId: 'forged_frame', qty: 1 }, { itemId: 'copper_ingot', qty: 2 }, { itemId: 'crystal', qty: 1 }],
          output: { itemId: 'gear_assembly', qty: 1 },
          time: 18000
        },
        {
          stage: 'finished',
          workstation: 'engraver',
          inputs: [{ itemId: 'gear_assembly', qty: 1 }, { itemId: 'refined_crystal', qty: 1 }, { itemId: 'gold_ingot', qty: 1 }],
          output: { itemId: 'clockwork_automaton', qty: 1 },
          time: 20000
        }
      ],
      xpReward: 200,
      description: 'Complex mechanical chain: smelter alloy→forge frame→assembler gears→engraver final etching.'
    },

    // ── 2-STAGE CHAIN: Steel Ingot (simplified) ───────────────────────────────
    {
      id: 'chain_steel_ingot',
      name: 'Steel Ingot',
      category: 'materials',
      levelRequired: 2,
      stages: [
        {
          stage: 'raw',
          workstation: 'smelter',
          inputs: [{ itemId: 'iron_ore', qty: 3 }, { itemId: 'coal', qty: 2 }],
          output: { itemId: 'iron_ingot', qty: 2 },
          time: 8000
        },
        {
          stage: 'refined',
          workstation: 'forge',
          inputs: [{ itemId: 'iron_ingot', qty: 2 }, { itemId: 'coal', qty: 1 }, { itemId: 'copper_ore', qty: 1 }],
          output: { itemId: 'steel_billet', qty: 1 },
          time: 13000
        }
      ],
      xpReward: 60,
      description: '2-stage chain producing steel billet from ore via smelter then forge.'
    },

    // ── 3-STAGE CHAIN: Copper Circuit ─────────────────────────────────────────
    {
      id: 'chain_copper_circuit',
      name: 'Copper Circuit',
      category: 'components',
      levelRequired: 4,
      stages: [
        {
          stage: 'raw',
          workstation: 'smelter',
          inputs: [{ itemId: 'copper_ore', qty: 4 }, { itemId: 'coal', qty: 2 }],
          output: { itemId: 'copper_ingot', qty: 3 },
          time: 8000
        },
        {
          stage: 'refined',
          workstation: 'loom',
          inputs: [{ itemId: 'copper_ingot', qty: 2 }, { itemId: 'fiber', qty: 3 }],
          output: { itemId: 'spun_fiber', qty: 2 },
          time: 10000
        },
        {
          stage: 'component',
          workstation: 'assembler',
          inputs: [{ itemId: 'spun_fiber', qty: 2 }, { itemId: 'copper_ingot', qty: 1 }],
          output: { itemId: 'circuit_plate', qty: 1 },
          time: 15000
        }
      ],
      xpReward: 90,
      description: '3-stage copper circuit: smelt→spin fiber→assemble plate.'
    },

    // ── 4-STAGE CHAIN: Gold Artefact ──────────────────────────────────────────
    {
      id: 'chain_gold_artefact',
      name: 'Gold Artefact',
      category: 'treasure',
      levelRequired: 7,
      stages: [
        {
          stage: 'raw',
          workstation: 'smelter',
          inputs: [{ itemId: 'gold_ore', qty: 4 }, { itemId: 'coal', qty: 2 }],
          output: { itemId: 'gold_ingot', qty: 2 },
          time: 9000
        },
        {
          stage: 'refined',
          workstation: 'refinery',
          inputs: [{ itemId: 'gold_ingot', qty: 1 }, { itemId: 'crystal', qty: 2 }, { itemId: 'herbs', qty: 2 }],
          output: { itemId: 'refined_crystal', qty: 2 },
          time: 10000
        },
        {
          stage: 'component',
          workstation: 'engraver',
          inputs: [{ itemId: 'refined_crystal', qty: 2 }, { itemId: 'gold_ingot', qty: 1 }],
          output: { itemId: 'etched_gem', qty: 1 },
          time: 16000
        },
        {
          stage: 'finished',
          workstation: 'assembler',
          inputs: [{ itemId: 'etched_gem', qty: 1 }, { itemId: 'gold_ingot', qty: 1 }, { itemId: 'gem_ruby', qty: 1 }],
          output: { itemId: 'gold_artefact', qty: 1 },
          time: 18000
        }
      ],
      xpReward: 250,
      description: 'Luxury 4-stage gold artefact: smelt→refine essence→engrave gems→assemble treasure.'
    }
  ];

  // ---------------------------------------------------------------------------
  // BLUEPRINT MAP (id → blueprint)
  // ---------------------------------------------------------------------------

  var _BLUEPRINT_MAP = (function() {
    var m = {};
    for (var i = 0; i < CHAIN_BLUEPRINTS.length; i++) {
      m[CHAIN_BLUEPRINTS[i].id] = CHAIN_BLUEPRINTS[i];
    }
    return m;
  })();

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Get a quality tier name from a numeric value.
   * @param {number} v
   * @returns {string}
   */
  function _qualityTier(v) {
    for (var i = QUALITY_TIER_ORDER.length - 1; i >= 0; i--) {
      var k = QUALITY_TIER_ORDER[i];
      if (v >= QUALITY_TIERS[k].min) return k;
    }
    return 'poor';
  }

  /**
   * Clamp a number between min and max.
   */
  function _clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /**
   * Get item quantity from a player's inventory (object map format: {itemId: qty}).
   */
  function _getQty(state, playerId, itemId) {
    if (!state || !state.players || !state.players[playerId]) return 0;
    var inv = state.players[playerId].inventory;
    if (!inv) return 0;
    if (Array.isArray(inv)) {
      var total = 0;
      for (var i = 0; i < inv.length; i++) {
        if (inv[i] && inv[i].itemId === itemId) {
          total += (inv[i].qty !== undefined ? inv[i].qty : 1);
        }
      }
      return total;
    }
    return inv[itemId] || 0;
  }

  /**
   * Remove qty of itemId from player inventory. Mutates state.
   */
  function _removeQty(state, playerId, itemId, qty) {
    var inv = state.players[playerId].inventory;
    if (Array.isArray(inv)) {
      var remaining = qty;
      for (var i = 0; i < inv.length && remaining > 0; i++) {
        if (inv[i] && inv[i].itemId === itemId) {
          var slotQty = inv[i].qty !== undefined ? inv[i].qty : 1;
          if (slotQty <= remaining) {
            remaining -= slotQty;
            inv[i] = null;
          } else {
            inv[i].qty = slotQty - remaining;
            remaining = 0;
          }
        }
      }
      state.players[playerId].inventory = inv.filter(function(s) { return s !== null; });
    } else {
      inv[itemId] = (inv[itemId] || 0) - qty;
      if (inv[itemId] <= 0) delete inv[itemId];
    }
  }

  /**
   * Add qty of itemId to player inventory. Mutates state.
   * meta: { quality, qualityTier, stageIdx, chainId }
   */
  function _addQty(state, playerId, itemId, qty, meta) {
    var inv = state.players[playerId].inventory;
    if (Array.isArray(inv)) {
      var slot = { itemId: itemId, qty: qty };
      if (meta) {
        if (meta.quality !== undefined) slot.quality = meta.quality;
        if (meta.qualityTier !== undefined) slot.qualityTier = meta.qualityTier;
        if (meta.stageIdx !== undefined) slot.stageIdx = meta.stageIdx;
        if (meta.chainId !== undefined) slot.chainId = meta.chainId;
      }
      inv.push(slot);
    } else {
      inv[itemId] = (inv[itemId] || 0) + qty;
    }
  }

  /**
   * Get the player's level from state.
   */
  function _getPlayerLevel(state, playerId) {
    if (!state.players || !state.players[playerId]) return 1;
    return state.players[playerId].level || 1;
  }

  /**
   * Get specialization bonus for a workstation type.
   * Reads from state.players[playerId].specializations (object map).
   */
  function _getSpecBonus(state, playerId, workstationType) {
    var ws = WORKSTATION_TYPES[workstationType];
    if (!ws) return 0;
    var specId = ws.specialization;
    if (!state.players || !state.players[playerId]) return 0;
    var specs = state.players[playerId].specializations;
    if (!specs) return 0;
    var lvl = specs[specId] || 0;
    return lvl * SPEC_QUALITY_BONUS_PER_LEVEL;
  }

  /**
   * Award XP to a player. Mutates state.
   */
  function _awardXP(state, playerId, amount) {
    if (!state.players || !state.players[playerId]) return 0;
    state.players[playerId].xp = (state.players[playerId].xp || 0) + amount;
    return amount;
  }

  /**
   * Ensure the crafting_chains sub-state exists on state.
   */
  function _ensureChainState(state) {
    if (!state.craftingChains) state.craftingChains = {};
    return state.craftingChains;
  }

  /**
   * Get or create a workstation record on state.
   */
  function _getWorkstation(state, workstationId) {
    _ensureChainState(state);
    return state.craftingChains.workstations &&
           state.craftingChains.workstations[workstationId] || null;
  }

  /**
   * Get all workstations on state.
   */
  function _allWorkstations(state) {
    _ensureChainState(state);
    return state.craftingChains.workstations || {};
  }

  /**
   * Propagate quality through stages: each subsequent stage quality is weighted
   * average of its own roll and the previous stage's output quality.
   * @param {number} stageRoll   0–1
   * @param {number} prevQuality 0–1 (0 if first stage)
   * @param {number} stageIdx    0-based
   * @returns {number}
   */
  function _propagateQuality(stageRoll, prevQuality, stageIdx) {
    if (stageIdx === 0) return stageRoll;
    var weight = 0.4; // previous stage contributes 40%
    return stageRoll * (1 - weight) + prevQuality * weight;
  }

  // ---------------------------------------------------------------------------
  // WORKSTATION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Build (place) a workstation for a player.
   * @param {Object} state
   * @param {string} ownerId
   * @param {string} workstationType   one of WORKSTATION_TYPES keys
   * @param {string} workstationId     unique id for this instance
   * @returns {{ success: boolean, workstation?: Object, reason?: string }}
   */
  function buildWorkstation(state, ownerId, workstationType, workstationId) {
    if (!WORKSTATION_TYPES[workstationType]) {
      return { success: false, reason: 'Unknown workstation type: ' + workstationType };
    }
    if (!state.players || !state.players[ownerId]) {
      return { success: false, reason: 'Player not found: ' + ownerId };
    }
    _ensureChainState(state);
    if (!state.craftingChains.workstations) state.craftingChains.workstations = {};
    if (state.craftingChains.workstations[workstationId]) {
      return { success: false, reason: 'Workstation already exists: ' + workstationId };
    }
    var wsType = WORKSTATION_TYPES[workstationType];
    var ws = {
      id:          workstationId,
      type:        workstationType,
      name:        wsType.name,
      ownerId:     ownerId,
      durability:  wsType.durabilityMax,
      durabilityMax: wsType.durabilityMax,
      upgradeLevel: 0,
      accessList:  [ownerId],
      builtAt:     Date.now(),
      activeJobs:  []
    };
    state.craftingChains.workstations[workstationId] = ws;
    return { success: true, workstation: ws };
  }

  /**
   * Upgrade a workstation (reduces production time by 10% per level, max 3).
   * @param {Object} state
   * @param {string} playerId
   * @param {string} workstationId
   * @returns {{ success: boolean, workstation?: Object, reason?: string }}
   */
  function upgradeWorkstation(state, playerId, workstationId) {
    var ws = _getWorkstation(state, workstationId);
    if (!ws) return { success: false, reason: 'Workstation not found: ' + workstationId };
    if (ws.ownerId !== playerId) return { success: false, reason: 'Only the owner can upgrade workstations' };
    if (ws.upgradeLevel >= 3) return { success: false, reason: 'Workstation already at maximum upgrade level' };
    ws.upgradeLevel += 1;
    return { success: true, workstation: ws };
  }

  /**
   * Add a player to the access list of a workstation.
   * @param {Object} state
   * @param {string} ownerId
   * @param {string} workstationId
   * @param {string} guestId
   * @returns {{ success: boolean, reason?: string }}
   */
  function grantAccess(state, ownerId, workstationId, guestId) {
    var ws = _getWorkstation(state, workstationId);
    if (!ws) return { success: false, reason: 'Workstation not found: ' + workstationId };
    if (ws.ownerId !== ownerId) return { success: false, reason: 'Only the owner can grant access' };
    if (ws.accessList.indexOf(guestId) === -1) ws.accessList.push(guestId);
    return { success: true };
  }

  /**
   * Remove a player from the access list of a workstation.
   * @param {Object} state
   * @param {string} ownerId
   * @param {string} workstationId
   * @param {string} guestId
   * @returns {{ success: boolean, reason?: string }}
   */
  function revokeAccess(state, ownerId, workstationId, guestId) {
    var ws = _getWorkstation(state, workstationId);
    if (!ws) return { success: false, reason: 'Workstation not found: ' + workstationId };
    if (ws.ownerId !== ownerId) return { success: false, reason: 'Only the owner can revoke access' };
    if (guestId === ownerId) return { success: false, reason: 'Cannot revoke owner access' };
    ws.accessList = ws.accessList.filter(function(id) { return id !== guestId; });
    return { success: true };
  }

  /**
   * Repair a workstation to full durability.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} workstationId
   * @returns {{ success: boolean, workstation?: Object, reason?: string }}
   */
  function repairWorkstation(state, playerId, workstationId) {
    var ws = _getWorkstation(state, workstationId);
    if (!ws) return { success: false, reason: 'Workstation not found: ' + workstationId };
    var allowed = ws.accessList.indexOf(playerId) !== -1;
    if (!allowed) return { success: false, reason: 'Player does not have access to this workstation' };
    ws.durability = ws.durabilityMax;
    return { success: true, workstation: ws };
  }

  /**
   * Get the effective production time for a workstation stage.
   * Each upgrade level reduces time by 10%.
   * @param {number} baseTime
   * @param {number} upgradeLevel
   * @returns {number}
   */
  function getProductionTime(baseTime, upgradeLevel) {
    return Math.round(baseTime * Math.pow(0.9, upgradeLevel));
  }

  /**
   * Get all workstations owned by a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getPlayerWorkstations(state, playerId) {
    var all = _allWorkstations(state);
    var result = [];
    var keys = Object.keys(all);
    for (var i = 0; i < keys.length; i++) {
      if (all[keys[i]].ownerId === playerId) result.push(all[keys[i]]);
    }
    return result;
  }

  /**
   * Get all workstations a player has access to.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array}
   */
  function getAccessibleWorkstations(state, playerId) {
    var all = _allWorkstations(state);
    var result = [];
    var keys = Object.keys(all);
    for (var i = 0; i < keys.length; i++) {
      if (all[keys[i]].accessList.indexOf(playerId) !== -1) result.push(all[keys[i]]);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // BLUEPRINT SYSTEM
  // ---------------------------------------------------------------------------

  /**
   * Get all chain blueprints, optionally filtered by category.
   * @param {string} [category]
   * @returns {Array}
   */
  function getBlueprints(category) {
    if (!category) return CHAIN_BLUEPRINTS.slice();
    var result = [];
    for (var i = 0; i < CHAIN_BLUEPRINTS.length; i++) {
      if (CHAIN_BLUEPRINTS[i].category === category) result.push(CHAIN_BLUEPRINTS[i]);
    }
    return result;
  }

  /**
   * Get a single blueprint by id.
   * @param {string} blueprintId
   * @returns {Object|null}
   */
  function getBlueprintById(blueprintId) {
    return _BLUEPRINT_MAP[blueprintId] || null;
  }

  /**
   * Check whether a player has discovered a blueprint.
   * Blueprints are stored in state.players[playerId].discoveredBlueprints array.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} blueprintId
   * @returns {boolean}
   */
  function hasDiscoveredBlueprint(state, playerId, blueprintId) {
    if (!state.players || !state.players[playerId]) return false;
    var discovered = state.players[playerId].discoveredBlueprints;
    if (!discovered) return false;
    return discovered.indexOf(blueprintId) !== -1;
  }

  /**
   * Unlock (discover) a blueprint for a player.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} blueprintId
   * @returns {{ success: boolean, reason?: string }}
   */
  function discoverBlueprint(state, playerId, blueprintId) {
    if (!_BLUEPRINT_MAP[blueprintId]) {
      return { success: false, reason: 'Unknown blueprint: ' + blueprintId };
    }
    if (!state.players || !state.players[playerId]) {
      return { success: false, reason: 'Player not found: ' + playerId };
    }
    if (!state.players[playerId].discoveredBlueprints) {
      state.players[playerId].discoveredBlueprints = [];
    }
    if (hasDiscoveredBlueprint(state, playerId, blueprintId)) {
      return { success: false, reason: 'Blueprint already discovered' };
    }
    state.players[playerId].discoveredBlueprints.push(blueprintId);
    return { success: true };
  }

  /**
   * Attempt blueprint discovery through experimentation.
   * Uses a seeded PRNG. Base discovery chance: 15%, boosted by crafting level.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} blueprintId
   * @param {number} [seed]
   * @returns {{ success: boolean, discovered?: boolean, blueprintId?: string, reason?: string }}
   */
  function experimentBlueprint(state, playerId, blueprintId, seed) {
    if (!_BLUEPRINT_MAP[blueprintId]) {
      return { success: false, reason: 'Unknown blueprint: ' + blueprintId };
    }
    if (!state.players || !state.players[playerId]) {
      return { success: false, reason: 'Player not found: ' + playerId };
    }
    if (hasDiscoveredBlueprint(state, playerId, blueprintId)) {
      return { success: true, discovered: false, reason: 'Already known' };
    }
    var craftingLvl = state.players[playerId].craftingLevel || 0;
    var chance = 0.15 + craftingLvl * 0.05;
    var prng = mulberry32(seed !== undefined ? seed : Date.now());
    if (prng() < chance) {
      discoverBlueprint(state, playerId, blueprintId);
      return { success: true, discovered: true, blueprintId: blueprintId };
    }
    return { success: true, discovered: false };
  }

  /**
   * Get all discovered blueprints for a player.
   * @param {Object} state
   * @param {string} playerId
   * @returns {Array} of blueprint objects
   */
  function getDiscoveredBlueprints(state, playerId) {
    if (!state.players || !state.players[playerId]) return [];
    var ids = state.players[playerId].discoveredBlueprints || [];
    var result = [];
    for (var i = 0; i < ids.length; i++) {
      var bp = _BLUEPRINT_MAP[ids[i]];
      if (bp) result.push(bp);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // PRODUCTION STAGE EXECUTION
  // ---------------------------------------------------------------------------

  /**
   * Check if a player can run a specific stage of a chain blueprint.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} blueprintId
   * @param {number} stageIdx        0-based index into blueprint.stages
   * @param {string} workstationId
   * @returns {{ canRun: boolean, reason: string }}
   */
  function canRunStage(state, playerId, blueprintId, stageIdx, workstationId) {
    var bp = _BLUEPRINT_MAP[blueprintId];
    if (!bp) return { canRun: false, reason: 'Blueprint not found: ' + blueprintId };
    if (stageIdx < 0 || stageIdx >= bp.stages.length) {
      return { canRun: false, reason: 'Invalid stage index: ' + stageIdx };
    }

    // Player level requirement (check against overall blueprint level)
    var playerLevel = _getPlayerLevel(state, playerId);
    if (playerLevel < bp.levelRequired) {
      return { canRun: false, reason: 'Level ' + bp.levelRequired + ' required' };
    }

    var stageDef = bp.stages[stageIdx];

    // Workstation check
    var ws = _getWorkstation(state, workstationId);
    if (!ws) return { canRun: false, reason: 'Workstation not found: ' + workstationId };
    if (ws.type !== stageDef.workstation) {
      return { canRun: false, reason: 'Wrong workstation type: need ' + stageDef.workstation + ', got ' + ws.type };
    }
    if (ws.accessList.indexOf(playerId) === -1) {
      return { canRun: false, reason: 'Player does not have access to workstation: ' + workstationId };
    }
    if (ws.durability <= 0) {
      return { canRun: false, reason: 'Workstation is broken (durability 0). Repair it first.' };
    }

    // Input material check
    for (var i = 0; i < stageDef.inputs.length; i++) {
      var inp = stageDef.inputs[i];
      var have = _getQty(state, playerId, inp.itemId);
      if (have < inp.qty) {
        return { canRun: false, reason: 'Missing input: ' + inp.itemId + ' (need ' + inp.qty + ', have ' + have + ')' };
      }
    }

    return { canRun: true, reason: 'OK' };
  }

  /**
   * Execute a single production stage for a chain blueprint.
   * Consumes inputs, produces the stage output with quality roll.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} blueprintId
   * @param {number} stageIdx
   * @param {string} workstationId
   * @param {number} [seed]
   * @param {number} [prevQuality]  quality carried from previous stage (0–1)
   * @returns {{ success: boolean, output?: Object, quality?: number, qualityTier?: string, reason?: string }}
   */
  function runStage(state, playerId, blueprintId, stageIdx, workstationId, seed, prevQuality) {
    var check = canRunStage(state, playerId, blueprintId, stageIdx, workstationId);
    if (!check.canRun) return { success: false, reason: check.reason };

    var bp = _BLUEPRINT_MAP[blueprintId];
    var stageDef = bp.stages[stageIdx];
    var ws = _getWorkstation(state, workstationId);

    // Consume inputs
    for (var i = 0; i < stageDef.inputs.length; i++) {
      var inp = stageDef.inputs[i];
      _removeQty(state, playerId, inp.itemId, inp.qty);
    }

    // Quality roll
    var prng = mulberry32(seed !== undefined ? seed : Date.now());
    var roll = prng();
    var specBonus = _getSpecBonus(state, playerId, stageDef.workstation);
    roll = _clamp(roll + specBonus, 0, 1);
    var pq = (prevQuality !== undefined && prevQuality !== null) ? prevQuality : 0;
    var quality = _propagateQuality(roll, pq, stageIdx);
    quality = _clamp(quality, 0, 1);
    var tier = _qualityTier(quality);

    // Produce output
    var out = stageDef.output;
    _addQty(state, playerId, out.itemId, out.qty, {
      quality: quality,
      qualityTier: tier,
      stageIdx: stageIdx,
      chainId: blueprintId
    });

    // Reduce workstation durability
    ws.durability = Math.max(0, ws.durability - DURABILITY_COST_PER_RUN);

    // Record production
    if (!state.players[playerId].chainHistory) state.players[playerId].chainHistory = [];
    state.players[playerId].chainHistory.push({
      blueprintId: blueprintId,
      stageIdx:    stageIdx,
      workstation: workstationId,
      output:      out.itemId,
      quality:     quality,
      qualityTier: tier,
      timestamp:   Date.now()
    });

    return {
      success:     true,
      output:      { itemId: out.itemId, qty: out.qty },
      quality:     quality,
      qualityTier: tier,
      durabilityLeft: ws.durability
    };
  }

  /**
   * Execute ALL stages of a chain blueprint in sequence.
   * Each stage result feeds quality into the next.
   * Awards full chain XP plus chain-efficiency bonus if all 4 stages are used.
   * @param {Object} state
   * @param {string} playerId
   * @param {string} blueprintId
   * @param {Object} workstationMap  { workstationType: workstationId }  OR  { stageIdx: workstationId }
   * @param {number} [seed]
   * @returns {{ success: boolean, stageResults?: Array, finalQuality?: number, finalQualityTier?: string, xpAwarded?: number, chainBonus?: boolean, reason?: string }}
   */
  function runChain(state, playerId, blueprintId, workstationMap, seed) {
    var bp = _BLUEPRINT_MAP[blueprintId];
    if (!bp) return { success: false, reason: 'Blueprint not found: ' + blueprintId };

    if (!state.players || !state.players[playerId]) {
      return { success: false, reason: 'Player not found: ' + playerId };
    }

    var prng = mulberry32(seed !== undefined ? seed : Date.now());
    var stageResults = [];
    var prevQuality = 0;

    for (var s = 0; s < bp.stages.length; s++) {
      var stageDef = bp.stages[s];

      // Resolve workstation id: accept either type-keyed or index-keyed map
      var wsId = workstationMap[stageDef.workstation] ||
                 workstationMap[s] ||
                 workstationMap[String(s)];

      if (!wsId) {
        return {
          success: false,
          reason: 'No workstation provided for stage ' + s + ' (' + stageDef.workstation + ')'
        };
      }

      var stageSeed = Math.floor(prng() * 0x7fffffff);
      var result = runStage(state, playerId, blueprintId, s, wsId, stageSeed, prevQuality);
      if (!result.success) {
        return { success: false, reason: 'Stage ' + s + ' failed: ' + result.reason };
      }
      stageResults.push(result);
      prevQuality = result.quality;
    }

    // Chain efficiency bonus for using all 4 canonical stages
    var allStages = STAGES.slice();
    var usedStageNames = bp.stages.map(function(st) { return st.stage; });
    var chainBonus = false;
    var allFour = true;
    for (var ss = 0; ss < allStages.length; ss++) {
      if (usedStageNames.indexOf(allStages[ss]) === -1) { allFour = false; break; }
    }
    if (allFour) {
      chainBonus = true;
      // Boost final quality by bonus
      var lastResult = stageResults[stageResults.length - 1];
      lastResult.quality = _clamp(lastResult.quality + CHAIN_EFFICIENCY_BONUS, 0, 1);
      lastResult.qualityTier = _qualityTier(lastResult.quality);
    }

    // Award XP
    var xpAwarded = _awardXP(state, playerId, bp.xpReward);

    var lastStageResult = stageResults[stageResults.length - 1];
    return {
      success:        true,
      stageResults:   stageResults,
      finalQuality:   lastStageResult.quality,
      finalQualityTier: lastStageResult.qualityTier,
      xpAwarded:      xpAwarded,
      chainBonus:     chainBonus
    };
  }

  // ---------------------------------------------------------------------------
  // SUPPLY CHAIN ORDERS
  // ---------------------------------------------------------------------------

  /**
   * Place a supply chain order requesting an intermediate product from another player.
   * @param {Object} state
   * @param {string} requesterId
   * @param {string} itemId        intermediate product id
   * @param {number} qty
   * @param {number} offerPrice    price in economy tokens per unit
   * @param {number} [seed]
   * @returns {{ success: boolean, orderId?: string, order?: Object, reason?: string }}
   */
  function placeSupplyOrder(state, requesterId, itemId, qty, offerPrice, seed) {
    if (!state.players || !state.players[requesterId]) {
      return { success: false, reason: 'Player not found: ' + requesterId };
    }
    if (!INTERMEDIATE_PRODUCTS[itemId]) {
      return { success: false, reason: 'Unknown intermediate product: ' + itemId };
    }
    if (qty <= 0) return { success: false, reason: 'Quantity must be > 0' };
    if (offerPrice < 0) return { success: false, reason: 'Price must be >= 0' };

    _ensureChainState(state);
    if (!state.craftingChains.supplyOrders) state.craftingChains.supplyOrders = {};

    var prng = mulberry32(seed !== undefined ? seed : Date.now());
    var orderId = 'order_' + requesterId + '_' + Math.floor(prng() * 0xffffff).toString(16);

    var order = {
      id:          orderId,
      requesterId: requesterId,
      itemId:      itemId,
      qty:         qty,
      filled:      0,
      offerPrice:  offerPrice,
      status:      'open',
      createdAt:   Date.now(),
      expiresAt:   Date.now() + ORDER_EXPIRY_MS,
      fulfillments: []
    };

    state.craftingChains.supplyOrders[orderId] = order;
    return { success: true, orderId: orderId, order: order };
  }

  /**
   * Fulfill (partially or fully) a supply chain order.
   * Transfers items from supplier to requester and records fulfillment.
   * @param {Object} state
   * @param {string} supplierId
   * @param {string} orderId
   * @param {number} qty
   * @returns {{ success: boolean, filled?: number, remaining?: number, reason?: string }}
   */
  function fulfillSupplyOrder(state, supplierId, orderId, qty) {
    if (!state.players || !state.players[supplierId]) {
      return { success: false, reason: 'Player not found: ' + supplierId };
    }
    _ensureChainState(state);
    var orders = state.craftingChains.supplyOrders || {};
    var order = orders[orderId];
    if (!order) return { success: false, reason: 'Order not found: ' + orderId };
    if (order.status !== 'open') return { success: false, reason: 'Order is not open (status: ' + order.status + ')' };
    if (Date.now() > order.expiresAt) {
      order.status = 'expired';
      return { success: false, reason: 'Order has expired' };
    }
    if (order.requesterId === supplierId) {
      return { success: false, reason: 'Cannot fulfill your own order' };
    }

    var needed = order.qty - order.filled;
    var toFill = Math.min(qty, needed);
    var have = _getQty(state, supplierId, order.itemId);
    if (have < toFill) {
      return { success: false, reason: 'Insufficient items: need ' + toFill + ', have ' + have };
    }

    // Ensure requester player exists
    if (!state.players[order.requesterId]) {
      return { success: false, reason: 'Requester not found in state: ' + order.requesterId };
    }

    // Transfer items
    _removeQty(state, supplierId, order.itemId, toFill);
    _addQty(state, order.requesterId, order.itemId, toFill);

    order.filled += toFill;
    order.fulfillments.push({
      supplierId: supplierId,
      qty:        toFill,
      timestamp:  Date.now()
    });

    if (order.filled >= order.qty) order.status = 'filled';

    return {
      success:   true,
      filled:    order.filled,
      remaining: order.qty - order.filled
    };
  }

  /**
   * Cancel a supply order (requester only).
   * @param {Object} state
   * @param {string} requesterId
   * @param {string} orderId
   * @returns {{ success: boolean, reason?: string }}
   */
  function cancelSupplyOrder(state, requesterId, orderId) {
    _ensureChainState(state);
    var orders = state.craftingChains.supplyOrders || {};
    var order = orders[orderId];
    if (!order) return { success: false, reason: 'Order not found: ' + orderId };
    if (order.requesterId !== requesterId) return { success: false, reason: 'Only the requester can cancel this order' };
    if (order.status !== 'open') return { success: false, reason: 'Order is not open' };
    order.status = 'cancelled';
    return { success: true };
  }

  /**
   * Get all open supply orders for a given intermediate product.
   * @param {Object} state
   * @param {string} itemId
   * @returns {Array}
   */
  function getSupplyOrders(state, itemId) {
    _ensureChainState(state);
    var orders = state.craftingChains.supplyOrders || {};
    var result = [];
    var keys = Object.keys(orders);
    var now = Date.now();
    for (var i = 0; i < keys.length; i++) {
      var o = orders[keys[i]];
      if (o.status === 'open' && (!itemId || o.itemId === itemId)) {
        if (now > o.expiresAt) {
          o.status = 'expired';
        } else {
          result.push(o);
        }
      }
    }
    return result;
  }

  /**
   * Get all orders placed by a requester.
   * @param {Object} state
   * @param {string} requesterId
   * @returns {Array}
   */
  function getPlayerOrders(state, requesterId) {
    _ensureChainState(state);
    var orders = state.craftingChains.supplyOrders || {};
    var result = [];
    var keys = Object.keys(orders);
    for (var i = 0; i < keys.length; i++) {
      if (orders[keys[i]].requesterId === requesterId) result.push(orders[keys[i]]);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // QUALITY PROPAGATION UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Get the quality tier for a numeric quality value.
   * @param {number} v
   * @returns {string}
   */
  function getQualityTier(v) {
    return _qualityTier(v);
  }

  /**
   * Calculate quality propagation given a stage roll, previous quality and index.
   * Exposed for testing.
   * @param {number} stageRoll
   * @param {number} prevQuality
   * @param {number} stageIdx
   * @returns {number}
   */
  function calcPropagatedQuality(stageRoll, prevQuality, stageIdx) {
    return _propagateQuality(stageRoll, prevQuality, stageIdx);
  }

  // ---------------------------------------------------------------------------
  // EFFICIENCY & ANALYTICS
  // ---------------------------------------------------------------------------

  /**
   * Calculate chain efficiency rating for a completed chain result.
   * Efficiency = finalQuality, bonus for chain bonus and short stage count.
   * @param {{ finalQuality: number, chainBonus: boolean, stageResults: Array }} chainResult
   * @returns {{ efficiency: number, rating: string }}
   */
  function calcChainEfficiency(chainResult) {
    if (!chainResult || !chainResult.stageResults) return { efficiency: 0, rating: 'failed' };
    var eff = chainResult.finalQuality || 0;
    if (chainResult.chainBonus) eff = Math.min(eff + 0.05, 1);
    var rating;
    if (eff >= 0.95) rating = 'masterwork';
    else if (eff >= 0.8) rating = 'superior';
    else if (eff >= 0.6) rating = 'fine';
    else if (eff >= 0.3) rating = 'common';
    else rating = 'poor';
    return { efficiency: eff, rating: rating };
  }

  /**
   * Get a summary of a player's chain production history.
   * @param {Object} state
   * @param {string} playerId
   * @returns {{ totalRuns: number, byBlueprint: Object, avgQuality: number }}
   */
  function getChainHistory(state, playerId) {
    if (!state.players || !state.players[playerId]) {
      return { totalRuns: 0, byBlueprint: {}, avgQuality: 0 };
    }
    var hist = state.players[playerId].chainHistory || [];
    var byBp = {};
    var qualSum = 0;
    for (var i = 0; i < hist.length; i++) {
      var h = hist[i];
      if (!byBp[h.blueprintId]) byBp[h.blueprintId] = { runs: 0, qualitySum: 0 };
      byBp[h.blueprintId].runs += 1;
      byBp[h.blueprintId].qualitySum += h.quality;
      qualSum += h.quality;
    }
    var avgQ = hist.length > 0 ? qualSum / hist.length : 0;
    return { totalRuns: hist.length, byBlueprint: byBp, avgQuality: avgQ };
  }

  /**
   * Get workstation utilisation stats.
   * @param {Object} state
   * @param {string} workstationId
   * @returns {{ runs: number, avgQuality: number, durabilityPct: number }}
   */
  function getWorkstationStats(state, workstationId) {
    var ws = _getWorkstation(state, workstationId);
    if (!ws) return { runs: 0, avgQuality: 0, durabilityPct: 0 };
    // Count history across all players
    var total = 0, qSum = 0;
    if (state.players) {
      var pids = Object.keys(state.players);
      for (var i = 0; i < pids.length; i++) {
        var hist = state.players[pids[i]].chainHistory || [];
        for (var j = 0; j < hist.length; j++) {
          if (hist[j].workstation === workstationId) {
            total += 1;
            qSum += hist[j].quality;
          }
        }
      }
    }
    return {
      runs:         total,
      avgQuality:   total > 0 ? qSum / total : 0,
      durabilityPct: ws.durability / ws.durabilityMax
    };
  }

  // ---------------------------------------------------------------------------
  // PROTOCOL MESSAGE HANDLER
  // ---------------------------------------------------------------------------

  /**
   * Process a `chain_craft` protocol message.
   * Payload: { action, blueprintId, workstationMap, seed, ... }
   * Actions: 'run_chain', 'run_stage', 'build_workstation', 'upgrade_workstation',
   *          'place_order', 'fulfill_order', 'cancel_order', 'discover_blueprint'
   * @param {Object} state
   * @param {Object} message   { from, type, payload }
   * @returns {Object}
   */
  function applyMessage(state, message) {
    if (!message || message.type !== 'chain_craft') {
      return { success: false, reason: 'Not a chain_craft message' };
    }
    var p = message.payload || {};
    var from = message.from;

    switch (p.action) {
      case 'run_chain':
        return runChain(state, from, p.blueprintId, p.workstationMap || {}, p.seed);

      case 'run_stage':
        return runStage(state, from, p.blueprintId, p.stageIdx, p.workstationId, p.seed, p.prevQuality);

      case 'build_workstation':
        return buildWorkstation(state, from, p.workstationType, p.workstationId);

      case 'upgrade_workstation':
        return upgradeWorkstation(state, from, p.workstationId);

      case 'grant_access':
        return grantAccess(state, from, p.workstationId, p.guestId);

      case 'revoke_access':
        return revokeAccess(state, from, p.workstationId, p.guestId);

      case 'repair_workstation':
        return repairWorkstation(state, from, p.workstationId);

      case 'place_order':
        return placeSupplyOrder(state, from, p.itemId, p.qty, p.offerPrice, p.seed);

      case 'fulfill_order':
        return fulfillSupplyOrder(state, from, p.orderId, p.qty);

      case 'cancel_order':
        return cancelSupplyOrder(state, from, p.orderId);

      case 'discover_blueprint':
        return discoverBlueprint(state, from, p.blueprintId);

      case 'experiment_blueprint':
        return experimentBlueprint(state, from, p.blueprintId, p.seed);

      default:
        return { success: false, reason: 'Unknown action: ' + p.action };
    }
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.STAGES                  = STAGES;
  exports.WORKSTATION_TYPES       = WORKSTATION_TYPES;
  exports.QUALITY_TIERS           = QUALITY_TIERS;
  exports.QUALITY_TIER_ORDER      = QUALITY_TIER_ORDER;
  exports.INTERMEDIATE_PRODUCTS   = INTERMEDIATE_PRODUCTS;
  exports.CHAIN_BLUEPRINTS        = CHAIN_BLUEPRINTS;
  exports.CHAIN_EFFICIENCY_BONUS  = CHAIN_EFFICIENCY_BONUS;
  exports.DURABILITY_COST_PER_RUN = DURABILITY_COST_PER_RUN;
  exports.ORDER_EXPIRY_MS         = ORDER_EXPIRY_MS;

  exports.mulberry32              = mulberry32;
  exports.getQualityTier          = getQualityTier;
  exports.calcPropagatedQuality   = calcPropagatedQuality;

  // Workstation management
  exports.buildWorkstation        = buildWorkstation;
  exports.upgradeWorkstation      = upgradeWorkstation;
  exports.grantAccess             = grantAccess;
  exports.revokeAccess            = revokeAccess;
  exports.repairWorkstation       = repairWorkstation;
  exports.getProductionTime       = getProductionTime;
  exports.getPlayerWorkstations   = getPlayerWorkstations;
  exports.getAccessibleWorkstations = getAccessibleWorkstations;

  // Blueprint system
  exports.getBlueprints           = getBlueprints;
  exports.getBlueprintById        = getBlueprintById;
  exports.hasDiscoveredBlueprint  = hasDiscoveredBlueprint;
  exports.discoverBlueprint       = discoverBlueprint;
  exports.experimentBlueprint     = experimentBlueprint;
  exports.getDiscoveredBlueprints = getDiscoveredBlueprints;

  // Production
  exports.canRunStage             = canRunStage;
  exports.runStage                = runStage;
  exports.runChain                = runChain;

  // Supply chain orders
  exports.placeSupplyOrder        = placeSupplyOrder;
  exports.fulfillSupplyOrder      = fulfillSupplyOrder;
  exports.cancelSupplyOrder       = cancelSupplyOrder;
  exports.getSupplyOrders         = getSupplyOrders;
  exports.getPlayerOrders         = getPlayerOrders;

  // Analytics
  exports.calcChainEfficiency     = calcChainEfficiency;
  exports.getChainHistory         = getChainHistory;
  exports.getWorkstationStats     = getWorkstationStats;

  // Protocol
  exports.applyMessage            = applyMessage;

})(typeof module !== 'undefined' ? module.exports : (window.CraftingChains = {}));
