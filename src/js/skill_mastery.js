// skill_mastery.js
/**
 * ZION Skill Mastery System
 * Independent skill certification: 18 core skills, 3 tiers, synergies, fade decay.
 * No project dependencies — Layer 1.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // MULBERRY32 SEEDED PRNG
  // ============================================================================

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ============================================================================
  // TIER THRESHOLDS
  // ============================================================================

  var TIER_APPRENTICE  = 0;
  var TIER_JOURNEYMAN  = 100;
  var TIER_MASTER      = 500;

  var TIER_NAMES = ['apprentice', 'journeyman', 'master'];

  // ============================================================================
  // SKILL DEFINITIONS — 18 core skills
  // ============================================================================

  var SKILLS = [
    {
      id: 'gardening',
      name: 'Gardening',
      description: 'Cultivating plants, herbs, and crops for food and alchemy.',
      category: 'craft',
      zone: 'gardens'
    },
    {
      id: 'carpentry',
      name: 'Carpentry',
      description: 'Shaping wood into structures, furniture, and tools.',
      category: 'craft',
      zone: 'commons'
    },
    {
      id: 'alchemy',
      name: 'Alchemy',
      description: 'Transmuting raw ingredients into potions and elixirs.',
      category: 'craft',
      zone: 'athenaeum'
    },
    {
      id: 'diplomacy',
      name: 'Diplomacy',
      description: 'Navigating political tensions and forging alliances.',
      category: 'social',
      zone: 'agora'
    },
    {
      id: 'investigation',
      name: 'Investigation',
      description: 'Uncovering hidden truths through observation and deduction.',
      category: 'knowledge',
      zone: 'nexus'
    },
    {
      id: 'forgery',
      name: 'Forgery',
      description: 'Replicating documents, seals, and artifacts with precision.',
      category: 'craft',
      zone: 'studio'
    },
    {
      id: 'sailing',
      name: 'Sailing',
      description: 'Navigating vessels across rivers, lakes, and coastal waters.',
      category: 'combat',
      zone: 'wilds'
    },
    {
      id: 'inscription',
      name: 'Inscription',
      description: 'Etching runes and glyphs to preserve knowledge and power.',
      category: 'knowledge',
      zone: 'athenaeum'
    },
    {
      id: 'cartography',
      name: 'Cartography',
      description: 'Charting terrain, marking landmarks, and creating maps.',
      category: 'knowledge',
      zone: 'wilds'
    },
    {
      id: 'cooking_mastery',
      name: 'Cooking Mastery',
      description: 'Preparing complex dishes that grant lasting buffs.',
      category: 'craft',
      zone: 'commons'
    },
    {
      id: 'spellcasting',
      name: 'Spellcasting',
      description: 'Channeling arcane energies to produce magical effects.',
      category: 'combat',
      zone: 'nexus'
    },
    {
      id: 'deception',
      name: 'Deception',
      description: 'Misleading others through misdirection and false pretenses.',
      category: 'social',
      zone: 'agora'
    },
    {
      id: 'leadership',
      name: 'Leadership',
      description: 'Inspiring and organizing groups toward a common goal.',
      category: 'social',
      zone: 'nexus'
    },
    {
      id: 'lore_keeping',
      name: 'Lore Keeping',
      description: 'Cataloguing and preserving the history and myths of ZION.',
      category: 'knowledge',
      zone: 'athenaeum'
    },
    {
      id: 'mathematics',
      name: 'Mathematics',
      description: 'Applying numerical principles to puzzles, trade, and construction.',
      category: 'knowledge',
      zone: 'athenaeum'
    },
    {
      id: 'music_theory',
      name: 'Music Theory',
      description: 'Understanding harmony, rhythm, and composition.',
      category: 'knowledge',
      zone: 'studio'
    },
    {
      id: 'stealth',
      name: 'Stealth',
      description: 'Moving unseen and unheard through hostile environments.',
      category: 'combat',
      zone: 'wilds'
    },
    {
      id: 'weaving',
      name: 'Weaving',
      description: 'Crafting cloth, tapestries, and enchanted textiles.',
      category: 'craft',
      zone: 'studio'
    }
  ];

  // ============================================================================
  // SYNERGY DEFINITIONS
  // Each synergy: { id, skills: [id1, id2], name, description, bonus }
  // bonus is a multiplier applied to XP gains when both skills reach journeyman+
  // ============================================================================

  var SYNERGIES = [
    {
      id: 'spell_writing',
      skills: ['alchemy', 'inscription'],
      name: 'Spell Writing',
      description: 'Alchemy combined with inscription produces potent inscribed formulae.',
      bonus: 0.15
    },
    {
      id: 'master_brewer',
      skills: ['alchemy', 'cooking_mastery'],
      name: 'Master Brewer',
      description: 'Culinary expertise deepens alchemical preparation techniques.',
      bonus: 0.12
    },
    {
      id: 'arcane_cartographer',
      skills: ['cartography', 'spellcasting'],
      name: 'Arcane Cartographer',
      description: 'Magical attunement reveals hidden pathways on any map.',
      bonus: 0.18
    },
    {
      id: 'rune_smith',
      skills: ['carpentry', 'inscription'],
      name: 'Rune Smith',
      description: 'Carved runes in woodwork grant structural and mystical strength.',
      bonus: 0.14
    },
    {
      id: 'silver_tongue',
      skills: ['diplomacy', 'deception'],
      name: 'Silver Tongue',
      description: 'Blending truth and misdirection creates masterful negotiators.',
      bonus: 0.20
    },
    {
      id: 'shadow_navigator',
      skills: ['stealth', 'cartography'],
      name: 'Shadow Navigator',
      description: 'Intimate map knowledge lets one slip through unseen routes.',
      bonus: 0.16
    },
    {
      id: 'chronicle_keeper',
      skills: ['lore_keeping', 'inscription'],
      name: 'Chronicle Keeper',
      description: 'Meticulous inscription preserves lore with perfect fidelity.',
      bonus: 0.13
    },
    {
      id: 'sea_scholar',
      skills: ['sailing', 'cartography'],
      name: 'Sea Scholar',
      description: 'Navigational charts and sailing intuition combine into mastery.',
      bonus: 0.17
    },
    {
      id: 'commander',
      skills: ['leadership', 'diplomacy'],
      name: 'Commander',
      description: 'Diplomatic finesse amplifies a leader\'s rallying power.',
      bonus: 0.19
    },
    {
      id: 'harmonic_weaver',
      skills: ['music_theory', 'weaving'],
      name: 'Harmonic Weaver',
      description: 'Rhythmic patterns in weaving resonate with musical structures.',
      bonus: 0.11
    },
    {
      id: 'forensic_scholar',
      skills: ['investigation', 'mathematics'],
      name: 'Forensic Scholar',
      description: 'Mathematical analysis sharpens investigative deduction.',
      bonus: 0.15
    },
    {
      id: 'ghost_blade',
      skills: ['stealth', 'forgery'],
      name: 'Ghost Blade',
      description: 'Forged identities and silent movement make the perfect infiltrator.',
      bonus: 0.18
    },
    {
      id: 'green_alchemist',
      skills: ['gardening', 'alchemy'],
      name: 'Green Alchemist',
      description: 'Freshly harvested ingredients yield far more potent distillations.',
      bonus: 0.20
    },
    {
      id: 'storyteller',
      skills: ['lore_keeping', 'leadership'],
      name: 'Storyteller',
      description: 'A leader who knows history can inspire with compelling narratives.',
      bonus: 0.14
    },
    {
      id: 'textile_mathematician',
      skills: ['weaving', 'mathematics'],
      name: 'Textile Mathematician',
      description: 'Geometric precision elevates weave complexity to art.',
      bonus: 0.12
    }
  ];

  // ============================================================================
  // HELPERS
  // ============================================================================

  function getTier(xp) {
    if (xp >= TIER_MASTER) return 'master';
    if (xp >= TIER_JOURNEYMAN) return 'journeyman';
    return 'apprentice';
  }

  function getTierIndex(xp) {
    if (xp >= TIER_MASTER) return 2;
    if (xp >= TIER_JOURNEYMAN) return 1;
    return 0;
  }

  function getSkillById(id) {
    for (var i = 0; i < SKILLS.length; i++) {
      if (SKILLS[i].id === id) return SKILLS[i];
    }
    return null;
  }

  function getSkills() {
    return SKILLS.slice();
  }

  function getCategorySkills(category) {
    var result = [];
    for (var i = 0; i < SKILLS.length; i++) {
      if (SKILLS[i].category === category) result.push(SKILLS[i]);
    }
    return result;
  }

  function getSynergies(skillId) {
    var result = [];
    for (var i = 0; i < SYNERGIES.length; i++) {
      if (SYNERGIES[i].skills[0] === skillId || SYNERGIES[i].skills[1] === skillId) {
        result.push(SYNERGIES[i]);
      }
    }
    return result;
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  function createState() {
    return {
      players: {},
      skillLog: []
    };
  }

  function _ensurePlayer(state, playerId) {
    if (!state.players[playerId]) {
      state.players[playerId] = {
        skills: {},
        badges: [],
        lastTick: 0
      };
    }
  }

  function _ensureSkill(playerData, skillId) {
    if (!playerData.skills[skillId]) {
      playerData.skills[skillId] = {
        xp: 0,
        tier: 'apprentice',
        lastUsedTick: 0,
        history: []
      };
    }
  }

  function initPlayer(state, playerId) {
    _ensurePlayer(state, playerId);
    var playerData = state.players[playerId];
    for (var i = 0; i < SKILLS.length; i++) {
      _ensureSkill(playerData, SKILLS[i].id);
    }
    return playerData;
  }

  // ============================================================================
  // BADGE GENERATION
  // ============================================================================

  function _badgeName(skillId, tier) {
    return skillId + '_' + tier;
  }

  function _hasBadge(playerData, badge) {
    for (var i = 0; i < playerData.badges.length; i++) {
      if (playerData.badges[i].id === badge) return true;
    }
    return false;
  }

  // ============================================================================
  // CORE: gainXP
  // Returns {success, xp, tier, badge, synergy}
  // ============================================================================

  function gainXP(state, playerId, skillId, amount, currentTick) {
    var skill = getSkillById(skillId);
    if (!skill) {
      return { success: false, xp: 0, tier: null, badge: null, synergy: null,
               error: 'unknown_skill' };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, xp: 0, tier: null, badge: null, synergy: null,
               error: 'invalid_amount' };
    }

    _ensurePlayer(state, playerId);
    var playerData = state.players[playerId];
    _ensureSkill(playerData, skillId);

    var skillData = playerData.skills[skillId];
    var oldXp = skillData.xp;
    var oldTier = getTier(oldXp);

    // Synergy bonus — applied before adding XP
    var synergyResult = null;
    var effectiveAmount = amount;

    for (var s = 0; s < SYNERGIES.length; s++) {
      var syn = SYNERGIES[s];
      var other = null;
      if (syn.skills[0] === skillId) other = syn.skills[1];
      else if (syn.skills[1] === skillId) other = syn.skills[0];
      if (!other) continue;

      _ensureSkill(playerData, other);
      var otherXp = playerData.skills[other].xp;
      // Synergy active if both skills are at journeyman+
      if (oldXp >= TIER_JOURNEYMAN && otherXp >= TIER_JOURNEYMAN) {
        var bonusXp = Math.floor(amount * syn.bonus);
        effectiveAmount = amount + bonusXp;
        synergyResult = {
          id: syn.id,
          name: syn.name,
          bonusXp: bonusXp,
          partnerId: other
        };
        break; // apply first active synergy only
      }
    }

    var newXp = oldXp + effectiveAmount;
    skillData.xp = newXp;
    skillData.lastUsedTick = currentTick || 0;

    var newTier = getTier(newXp);
    skillData.tier = newTier;

    // Badge unlock
    var newBadge = null;
    if (newTier !== oldTier) {
      var badgeId = _badgeName(skillId, newTier);
      if (!_hasBadge(playerData, badgeId)) {
        playerData.badges.push({
          id: badgeId,
          skillId: skillId,
          tier: newTier,
          unlockedAt: currentTick || 0
        });
        newBadge = badgeId;
      }
    }

    // Log the XP gain
    var logEntry = {
      playerId: playerId,
      skillId: skillId,
      amount: effectiveAmount,
      baseAmount: amount,
      oldXp: oldXp,
      newXp: newXp,
      tier: newTier,
      tick: currentTick || 0
    };
    state.skillLog.push(logEntry);
    skillData.history.push({
      amount: effectiveAmount,
      baseAmount: amount,
      oldXp: oldXp,
      newXp: newXp,
      tick: currentTick || 0
    });

    return {
      success: true,
      xp: newXp,
      tier: newTier,
      badge: newBadge,
      synergy: synergyResult
    };
  }

  // ============================================================================
  // CORE: applyFade
  // Skills lose 1 XP per 100 ticks of inactivity (min 0)
  // Returns {faded: [{skillId, lost, newXp}]}
  // ============================================================================

  function applyFade(state, playerId, currentTick) {
    _ensurePlayer(state, playerId);
    var playerData = state.players[playerId];
    var faded = [];

    for (var i = 0; i < SKILLS.length; i++) {
      var skillId = SKILLS[i].id;
      _ensureSkill(playerData, skillId);
      var skillData = playerData.skills[skillId];
      if (skillData.xp <= 0) continue;

      var ticksSinceUse = currentTick - skillData.lastUsedTick;
      var fadeLost = Math.floor(ticksSinceUse / 100);
      if (fadeLost <= 0) continue;

      var oldXp = skillData.xp;
      var newXp = Math.max(0, oldXp - fadeLost);
      skillData.xp = newXp;
      skillData.tier = getTier(newXp);

      faded.push({
        skillId: skillId,
        lost: oldXp - newXp,
        newXp: newXp
      });
    }

    return { faded: faded };
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  function getPlayerSkills(state, playerId) {
    _ensurePlayer(state, playerId);
    var playerData = state.players[playerId];
    var result = [];
    for (var i = 0; i < SKILLS.length; i++) {
      var skillId = SKILLS[i].id;
      _ensureSkill(playerData, skillId);
      var skillData = playerData.skills[skillId];
      result.push({
        id: skillId,
        name: SKILLS[i].name,
        category: SKILLS[i].category,
        zone: SKILLS[i].zone,
        xp: skillData.xp,
        tier: skillData.tier,
        lastUsedTick: skillData.lastUsedTick
      });
    }
    return result;
  }

  function getPlayerSkill(state, playerId, skillId) {
    var skill = getSkillById(skillId);
    if (!skill) return null;
    _ensurePlayer(state, playerId);
    var playerData = state.players[playerId];
    _ensureSkill(playerData, skillId);
    var skillData = playerData.skills[skillId];
    return {
      id: skillId,
      name: skill.name,
      category: skill.category,
      zone: skill.zone,
      xp: skillData.xp,
      tier: skillData.tier,
      lastUsedTick: skillData.lastUsedTick
    };
  }

  function checkSynergy(state, playerId, skillId1, skillId2) {
    // Find a synergy that contains both skills
    var syn = null;
    for (var i = 0; i < SYNERGIES.length; i++) {
      var s = SYNERGIES[i];
      if ((s.skills[0] === skillId1 && s.skills[1] === skillId2) ||
          (s.skills[0] === skillId2 && s.skills[1] === skillId1)) {
        syn = s;
        break;
      }
    }
    if (!syn) return { active: false, bonus: 0, name: null };

    _ensurePlayer(state, playerId);
    var playerData = state.players[playerId];
    _ensureSkill(playerData, skillId1);
    _ensureSkill(playerData, skillId2);

    var xp1 = playerData.skills[skillId1].xp;
    var xp2 = playerData.skills[skillId2].xp;
    var active = xp1 >= TIER_JOURNEYMAN && xp2 >= TIER_JOURNEYMAN;

    return {
      active: active,
      bonus: active ? syn.bonus : 0,
      name: syn.name
    };
  }

  function getMasteryBadges(state, playerId) {
    _ensurePlayer(state, playerId);
    return state.players[playerId].badges.slice();
  }

  function getSkillLeaderboard(state, skillId, count) {
    var result = [];
    var playerIds = Object.keys(state.players);

    for (var i = 0; i < playerIds.length; i++) {
      var pid = playerIds[i];
      var playerData = state.players[pid];
      if (!playerData.skills[skillId]) continue;
      result.push({
        playerId: pid,
        xp: playerData.skills[skillId].xp,
        tier: playerData.skills[skillId].tier
      });
    }

    // Sort descending by XP
    result.sort(function(a, b) { return b.xp - a.xp; });

    var limit = count || 10;
    return result.slice(0, limit);
  }

  function getPlayerRank(state, playerId, skillId) {
    var board = getSkillLeaderboard(state, skillId, Object.keys(state.players).length);
    for (var i = 0; i < board.length; i++) {
      if (board[i].playerId === playerId) return i + 1;
    }
    return null;
  }

  function getSkillHistory(state, playerId, skillId) {
    var skill = getSkillById(skillId);
    if (!skill) return [];
    _ensurePlayer(state, playerId);
    var playerData = state.players[playerId];
    if (!playerData.skills[skillId]) return [];
    return playerData.skills[skillId].history.slice();
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.SKILLS            = SKILLS;
  exports.SYNERGIES         = SYNERGIES;
  exports.TIER_APPRENTICE   = TIER_APPRENTICE;
  exports.TIER_JOURNEYMAN   = TIER_JOURNEYMAN;
  exports.TIER_MASTER       = TIER_MASTER;

  exports.mulberry32        = mulberry32;
  exports.getTier           = getTier;
  exports.getSkills         = getSkills;
  exports.getSkillById      = getSkillById;
  exports.getCategorySkills = getCategorySkills;
  exports.getSynergies      = getSynergies;

  exports.createState       = createState;
  exports.initPlayer        = initPlayer;
  exports.gainXP            = gainXP;
  exports.applyFade         = applyFade;

  exports.getPlayerSkills   = getPlayerSkills;
  exports.getPlayerSkill    = getPlayerSkill;
  exports.checkSynergy      = checkSynergy;
  exports.getMasteryBadges  = getMasteryBadges;
  exports.getSkillLeaderboard = getSkillLeaderboard;
  exports.getPlayerRank     = getPlayerRank;
  exports.getSkillHistory   = getSkillHistory;

})(typeof module !== 'undefined' ? module.exports : (window.SkillMastery = {}));
