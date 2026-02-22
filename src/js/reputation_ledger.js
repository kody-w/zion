// reputation_ledger.js
/**
 * ZION Reputation Ledger
 * Unified cross-system reputation aggregator — collapses NPC reputation,
 * trust bonds, diplomatic standing, multiverse reputation, guild progression,
 * and zone steward standing into one auditable ledger with composite
 * "Citizen Standing" score, decay, and recovery arcs.
 *
 * Constitution ref: §6.3 (transparency and public history)
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // OPTIONAL DEPENDENCY GUARDS
  // ---------------------------------------------------------------------------

  var NpcReputation = (typeof window !== 'undefined' && window.NpcReputation) || {};
  var TrustBonds = (typeof window !== 'undefined' && window.TrustBonds) || {};
  var DiplomaticSystem = (typeof window !== 'undefined' && window.DiplomaticSystem) || {};
  var Profiles = (typeof window !== 'undefined' && window.Profiles) || {};
  var Economy = (typeof window !== 'undefined' && window.Economy) || {};

  // ---------------------------------------------------------------------------
  // SEEDED PRNG — mulberry32 (deterministic decay calculations)
  // ---------------------------------------------------------------------------

  function mulberry32(seed) {
    var s = (seed >>> 0) + 1;
    return function() {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // CONSTANTS
  // ---------------------------------------------------------------------------

  var STANDING_MIN = 0;
  var STANDING_MAX = 1000;

  var SOURCE_WEIGHTS = {
    npc_reputation:       0.20,
    trust_bonds:          0.20,
    diplomatic_standing:  0.15,
    multiverse_reputation:0.15,
    guild_progression:    0.15,
    zone_steward:         0.15
  };

  var STANDING_TIERS = [
    { min: 0,   max: 99,  name: 'Newcomer',   color: '#888888', badge: 'newcomer',   description: 'Just arrived in ZION. Building a reputation.' },
    { min: 100, max: 299, name: 'Citizen',    color: '#aaddaa', badge: 'citizen',    description: 'Recognized member of the ZION community.' },
    { min: 300, max: 549, name: 'Trusted',    color: '#44aa44', badge: 'trusted',    description: 'A reliable, respected presence in ZION.' },
    { min: 550, max: 799, name: 'Honored',    color: '#ffaa00', badge: 'honored',    description: 'Honored by citizens for exemplary conduct.' },
    { min: 800, max: 1000,name: 'Legendary',  color: '#ff66ff', badge: 'legendary',  description: 'A legendary figure in ZION history.' }
  ];

  var DECAY_CONFIG = {
    ticksPerDecayUnit:  500,   // one decay unit every 500 ticks of inactivity
    decayAmountPerUnit: 2,     // 2 standing points lost per decay unit
    decayThreshold:     50,    // only decay if standing > 50
    recoveryBonus:      0.10   // 10% bonus to gains during active recovery arc
  };

  var RECOVERY_ARCS = [
    {
      id: 'community_service',
      name: 'Community Service',
      description: 'Perform 10 helpful actions for other citizens.',
      requiredScore:     0,
      maxScore:          300,
      stepsRequired:     10,
      standingPerStep:   8,
      totalBonus:        30
    },
    {
      id: 'diplomatic_outreach',
      name: 'Diplomatic Outreach',
      description: 'Establish 3 new positive diplomatic contacts.',
      requiredScore:     0,
      maxScore:          500,
      stepsRequired:     3,
      standingPerStep:   15,
      totalBonus:        50
    },
    {
      id: 'zone_restoration',
      name: 'Zone Restoration',
      description: 'Contribute resources to restore a damaged zone.',
      requiredScore:     0,
      maxScore:          700,
      stepsRequired:     5,
      standingPerStep:   20,
      totalBonus:        80
    },
    {
      id: 'mentor_path',
      name: 'Mentor Path',
      description: 'Mentor 2 newcomers through their first challenges.',
      requiredScore:     100,
      maxScore:          1000,
      stepsRequired:     2,
      standingPerStep:   25,
      totalBonus:        100
    }
  ];

  var FACTION_TYPES = [
    'guild',
    'zone',
    'npc_group',
    'trade_coalition',
    'civic_body'
  ];

  var SNAPSHOT_INTERVAL = 100; // take a snapshot every 100 ticks

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  function clampStanding(val) {
    return Math.max(STANDING_MIN, Math.min(STANDING_MAX, val));
  }

  function getStandingTier(score) {
    var clamped = clampStanding(score);
    for (var i = STANDING_TIERS.length - 1; i >= 0; i--) {
      if (clamped >= STANDING_TIERS[i].min) {
        return STANDING_TIERS[i];
      }
    }
    return STANDING_TIERS[0];
  }

  function normalizeWeights(weights) {
    var total = 0;
    for (var k in weights) {
      if (weights.hasOwnProperty(k)) {
        total += weights[k];
      }
    }
    if (total === 0) return weights;
    var normalized = {};
    for (var k2 in weights) {
      if (weights.hasOwnProperty(k2)) {
        normalized[k2] = weights[k2] / total;
      }
    }
    return normalized;
  }

  function nowTs() {
    return (typeof Date !== 'undefined') ? Date.now() : 0;
  }

  // ---------------------------------------------------------------------------
  // STATE FACTORY
  // ---------------------------------------------------------------------------

  /**
   * Creates a fresh ledger state for a citizen.
   * @param {string} citizenId
   * @returns {Object}
   */
  function createLedger(citizenId) {
    return {
      citizenId: citizenId,
      standing:  0,
      sources: {
        npc_reputation:        0,
        trust_bonds:           0,
        diplomatic_standing:   0,
        multiverse_reputation: 0,
        guild_progression:     0,
        zone_steward:          0
      },
      weights: {
        npc_reputation:        SOURCE_WEIGHTS.npc_reputation,
        trust_bonds:           SOURCE_WEIGHTS.trust_bonds,
        diplomatic_standing:   SOURCE_WEIGHTS.diplomatic_standing,
        multiverse_reputation: SOURCE_WEIGHTS.multiverse_reputation,
        guild_progression:     SOURCE_WEIGHTS.guild_progression,
        zone_steward:          SOURCE_WEIGHTS.zone_steward
      },
      entries:          [],   // individual reputation change log
      snapshots:        [],   // periodic snapshots for trend analysis
      factions:         {},   // factionId -> { standing: number, name, type }
      recoveryArcs:     {},   // arcId -> { active, stepsCompleted, startedAt }
      lastActiveTick:   -1,
      createdAt:        nowTs(),
      snapshotCounter:  0
    };
  }

  /**
   * Creates a global registry for all citizen ledgers.
   * @returns {Object}
   */
  function createRegistry() {
    return {
      ledgers: {},
      globalHistory: [],
      tick: 0
    };
  }

  // ---------------------------------------------------------------------------
  // COMPOSITE STANDING CALCULATION
  // ---------------------------------------------------------------------------

  /**
   * Recomputes the composite Citizen Standing score from weighted sources.
   * Each source is assumed to be in [0, 100] range (will be normalized).
   * The composite maps to [0, 1000].
   *
   * @param {Object} ledger
   * @returns {number} computed standing 0-1000
   */
  function computeStanding(ledger) {
    var weights = normalizeWeights(ledger.weights);
    var composite = 0;
    for (var src in weights) {
      if (weights.hasOwnProperty(src)) {
        var srcVal = ledger.sources[src] || 0;
        // Clamp source value to 0-100 before weighting
        var clamped = Math.max(0, Math.min(100, srcVal));
        composite += clamped * weights[src];
      }
    }
    // composite is now 0..100; scale to 0..1000
    return Math.round(composite * 10);
  }

  /**
   * Recalculates and writes standing back into ledger.
   * @param {Object} ledger
   * @returns {number} new standing
   */
  function recalcStanding(ledger) {
    ledger.standing = clampStanding(computeStanding(ledger));
    return ledger.standing;
  }

  // ---------------------------------------------------------------------------
  // SOURCE UPDATES
  // ---------------------------------------------------------------------------

  /**
   * Updates a single reputation source value and recomputes standing.
   * @param {Object} ledger
   * @param {string} source  - key from SOURCE_WEIGHTS
   * @param {number} value   - new source value (0-100)
   * @param {string} [reason]
   * @param {number} [tick]
   * @returns {Object} { oldStanding, newStanding, delta, tier }
   */
  function setSource(ledger, source, value, reason, tick) {
    if (!ledger.sources.hasOwnProperty(source)) {
      return { success: false, reason: 'unknown_source' };
    }
    var oldStanding = ledger.standing;
    ledger.sources[source] = Math.max(0, Math.min(100, value));
    var newStanding = recalcStanding(ledger);

    var entry = {
      type:    'source_set',
      source:  source,
      value:   value,
      delta:   newStanding - oldStanding,
      reason:  reason || '',
      tick:    tick || 0,
      ts:      nowTs()
    };
    ledger.entries.push(entry);

    return {
      success:     true,
      source:      source,
      oldStanding: oldStanding,
      newStanding: newStanding,
      delta:       newStanding - oldStanding,
      tier:        getStandingTier(newStanding)
    };
  }

  /**
   * Adjusts a single reputation source by delta and recomputes standing.
   * @param {Object} ledger
   * @param {string} source
   * @param {number} delta
   * @param {string} [reason]
   * @param {number} [tick]
   * @returns {Object}
   */
  function adjustSource(ledger, source, delta, reason, tick) {
    if (!ledger.sources.hasOwnProperty(source)) {
      return { success: false, reason: 'unknown_source' };
    }
    var current = ledger.sources[source] || 0;
    return setSource(ledger, source, current + delta, reason, tick);
  }

  // ---------------------------------------------------------------------------
  // REPUTATION ENTRIES (direct standing changes)
  // ---------------------------------------------------------------------------

  /**
   * Logs a direct standing change (not source-based).
   * @param {Object} ledger
   * @param {number} amount   - positive or negative
   * @param {string} source   - descriptive source name
   * @param {string} reason
   * @param {number} [tick]
   * @returns {Object} { oldStanding, newStanding, delta, tier }
   */
  function addReputationEntry(ledger, amount, source, reason, tick) {
    var oldStanding = ledger.standing;
    ledger.standing = clampStanding(ledger.standing + amount);

    var entry = {
      type:        'direct',
      amount:      amount,
      source:      source || 'unknown',
      reason:      reason || '',
      tick:        tick || 0,
      ts:          nowTs(),
      oldStanding: oldStanding,
      newStanding: ledger.standing
    };
    ledger.entries.push(entry);

    return {
      oldStanding: oldStanding,
      newStanding: ledger.standing,
      delta:       ledger.standing - oldStanding,
      tier:        getStandingTier(ledger.standing)
    };
  }

  // ---------------------------------------------------------------------------
  // DECAY MECHANICS
  // ---------------------------------------------------------------------------

  /**
   * Applies inactivity decay to a ledger based on ticks since last activity.
   * Uses mulberry32 PRNG for deterministic jitter.
   * @param {Object} ledger
   * @param {number} currentTick
   * @returns {Object} { decayed, amount, newStanding }
   */
  function applyDecay(ledger, currentTick) {
    if (ledger.lastActiveTick < 0) {
      return { decayed: false, amount: 0, newStanding: ledger.standing };
    }
    if (ledger.standing <= DECAY_CONFIG.decayThreshold) {
      return { decayed: false, amount: 0, newStanding: ledger.standing };
    }

    var ticksSince = currentTick - ledger.lastActiveTick;
    if (ticksSince <= 0) {
      return { decayed: false, amount: 0, newStanding: ledger.standing };
    }

    var decayUnits = Math.floor(ticksSince / DECAY_CONFIG.ticksPerDecayUnit);
    if (decayUnits <= 0) {
      return { decayed: false, amount: 0, newStanding: ledger.standing };
    }

    // Deterministic jitter via mulberry32
    var seed = ((ledger.citizenId.length * 31) + currentTick) >>> 0;
    var rng = mulberry32(seed);
    var jitter = Math.floor(rng() * 2); // 0 or 1

    var decayAmount = (decayUnits * DECAY_CONFIG.decayAmountPerUnit) + jitter;
    var oldStanding = ledger.standing;
    ledger.standing = clampStanding(ledger.standing - decayAmount);

    var entry = {
      type:    'decay',
      amount:  -(oldStanding - ledger.standing),
      source:  'inactivity_decay',
      reason:  'inactivity for ' + ticksSince + ' ticks',
      tick:    currentTick,
      ts:      nowTs(),
      oldStanding: oldStanding,
      newStanding: ledger.standing
    };
    ledger.entries.push(entry);

    return {
      decayed:     true,
      amount:      oldStanding - ledger.standing,
      newStanding: ledger.standing,
      tier:        getStandingTier(ledger.standing)
    };
  }

  /**
   * Applies decay to all ledgers in a registry.
   * @param {Object} registry
   * @param {number} currentTick
   * @returns {Array} decayed entries
   */
  function applyDecayAll(registry, currentTick) {
    var results = [];
    for (var cid in registry.ledgers) {
      if (registry.ledgers.hasOwnProperty(cid)) {
        var result = applyDecay(registry.ledgers[cid], currentTick);
        if (result.decayed) {
          results.push({ citizenId: cid, result: result });
        }
      }
    }
    registry.tick = currentTick;
    return results;
  }

  // ---------------------------------------------------------------------------
  // RECOVERY ARCS
  // ---------------------------------------------------------------------------

  /**
   * Activates a recovery arc for a citizen.
   * @param {Object} ledger
   * @param {string} arcId
   * @param {number} [tick]
   * @returns {Object}
   */
  function activateRecoveryArc(ledger, arcId, tick) {
    var arcDef = null;
    for (var i = 0; i < RECOVERY_ARCS.length; i++) {
      if (RECOVERY_ARCS[i].id === arcId) { arcDef = RECOVERY_ARCS[i]; break; }
    }
    if (!arcDef) {
      return { success: false, reason: 'unknown_arc' };
    }
    if (ledger.standing > arcDef.maxScore) {
      return { success: false, reason: 'standing_too_high', standing: ledger.standing };
    }
    if (ledger.recoveryArcs[arcId] && ledger.recoveryArcs[arcId].active) {
      return { success: false, reason: 'already_active' };
    }

    ledger.recoveryArcs[arcId] = {
      active:          true,
      stepsCompleted:  0,
      startedAt:       tick || 0,
      completedAt:     null
    };

    var entry = {
      type:   'recovery_arc_started',
      arcId:  arcId,
      tick:   tick || 0,
      ts:     nowTs()
    };
    ledger.entries.push(entry);

    return { success: true, arcId: arcId, arc: arcDef };
  }

  /**
   * Advances a recovery arc by one step, granting standing.
   * @param {Object} ledger
   * @param {string} arcId
   * @param {number} [tick]
   * @returns {Object}
   */
  function advanceRecoveryArc(ledger, arcId, tick) {
    var arcDef = null;
    for (var i = 0; i < RECOVERY_ARCS.length; i++) {
      if (RECOVERY_ARCS[i].id === arcId) { arcDef = RECOVERY_ARCS[i]; break; }
    }
    if (!arcDef) {
      return { success: false, reason: 'unknown_arc' };
    }

    var arc = ledger.recoveryArcs[arcId];
    if (!arc || !arc.active) {
      return { success: false, reason: 'arc_not_active' };
    }
    if (arc.stepsCompleted >= arcDef.stepsRequired) {
      return { success: false, reason: 'arc_already_complete' };
    }

    arc.stepsCompleted++;
    var gained = arcDef.standingPerStep;

    // Recovery bonus
    gained = Math.round(gained * (1 + DECAY_CONFIG.recoveryBonus));

    var oldStanding = ledger.standing;
    ledger.standing = clampStanding(ledger.standing + gained);

    var completed = arc.stepsCompleted >= arcDef.stepsRequired;
    var bonusGranted = 0;
    if (completed) {
      bonusGranted = arcDef.totalBonus;
      ledger.standing = clampStanding(ledger.standing + bonusGranted);
      arc.active = false;
      arc.completedAt = tick || 0;
    }

    var entry = {
      type:        'recovery_arc_step',
      arcId:       arcId,
      step:        arc.stepsCompleted,
      gained:      gained + bonusGranted,
      completed:   completed,
      oldStanding: oldStanding,
      newStanding: ledger.standing,
      tick:        tick || 0,
      ts:          nowTs()
    };
    ledger.entries.push(entry);

    return {
      success:      true,
      stepsCompleted: arc.stepsCompleted,
      stepsRequired:  arcDef.stepsRequired,
      gained:       gained,
      bonusGranted: bonusGranted,
      completed:    completed,
      oldStanding:  oldStanding,
      newStanding:  ledger.standing,
      tier:         getStandingTier(ledger.standing)
    };
  }

  /**
   * Returns status of all recovery arcs for a ledger.
   * @param {Object} ledger
   * @returns {Array}
   */
  function getRecoveryArcStatus(ledger) {
    var result = [];
    for (var i = 0; i < RECOVERY_ARCS.length; i++) {
      var arcDef = RECOVERY_ARCS[i];
      var arcState = ledger.recoveryArcs[arcDef.id] || null;
      result.push({
        arcId:          arcDef.id,
        name:           arcDef.name,
        description:    arcDef.description,
        stepsRequired:  arcDef.stepsRequired,
        standingPerStep:arcDef.standingPerStep,
        totalBonus:     arcDef.totalBonus,
        active:         arcState ? arcState.active : false,
        stepsCompleted: arcState ? arcState.stepsCompleted : 0,
        completedAt:    arcState ? arcState.completedAt : null,
        available:      ledger.standing <= arcDef.maxScore
      });
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // FACTION STANDING
  // ---------------------------------------------------------------------------

  /**
   * Sets or updates faction standing for a citizen.
   * @param {Object} ledger
   * @param {string} factionId
   * @param {string} factionName
   * @param {string} factionType  - from FACTION_TYPES
   * @param {number} standing     - 0-100
   * @param {string} [reason]
   * @param {number} [tick]
   * @returns {Object}
   */
  function setFactionStanding(ledger, factionId, factionName, factionType, standing, reason, tick) {
    var clamped = Math.max(0, Math.min(100, standing));
    var existing = ledger.factions[factionId];
    var oldVal = existing ? existing.standing : 0;

    ledger.factions[factionId] = {
      factionId:   factionId,
      name:        factionName,
      type:        factionType,
      standing:    clamped,
      updatedAt:   tick || 0
    };

    var entry = {
      type:       'faction_standing',
      factionId:  factionId,
      oldVal:     oldVal,
      newVal:     clamped,
      delta:      clamped - oldVal,
      reason:     reason || '',
      tick:       tick || 0,
      ts:         nowTs()
    };
    ledger.entries.push(entry);

    return { success: true, factionId: factionId, oldVal: oldVal, newVal: clamped };
  }

  /**
   * Adjusts faction standing by delta.
   * @param {Object} ledger
   * @param {string} factionId
   * @param {number} delta
   * @param {string} [reason]
   * @param {number} [tick]
   * @returns {Object}
   */
  function adjustFactionStanding(ledger, factionId, delta, reason, tick) {
    var existing = ledger.factions[factionId];
    if (!existing) {
      return { success: false, reason: 'faction_not_found' };
    }
    return setFactionStanding(ledger, factionId, existing.name, existing.type,
      existing.standing + delta, reason, tick);
  }

  /**
   * Returns faction standing for a citizen.
   * @param {Object} ledger
   * @param {string} factionId
   * @returns {Object|null}
   */
  function getFactionStanding(ledger, factionId) {
    return ledger.factions[factionId] || null;
  }

  /**
   * Returns all faction standings sorted by standing descending.
   * @param {Object} ledger
   * @returns {Array}
   */
  function getAllFactionStandings(ledger) {
    var result = [];
    for (var fid in ledger.factions) {
      if (ledger.factions.hasOwnProperty(fid)) {
        result.push(ledger.factions[fid]);
      }
    }
    result.sort(function(a, b) { return b.standing - a.standing; });
    return result;
  }

  // ---------------------------------------------------------------------------
  // SNAPSHOTS
  // ---------------------------------------------------------------------------

  /**
   * Takes a reputation snapshot for trend analysis.
   * @param {Object} ledger
   * @param {number} tick
   * @returns {Object} snapshot
   */
  function takeSnapshot(ledger, tick) {
    var snapshot = {
      tick:       tick,
      ts:         nowTs(),
      standing:   ledger.standing,
      tier:       getStandingTier(ledger.standing).name,
      sources:    {},
      factionCount: Object.keys(ledger.factions).length
    };
    for (var src in ledger.sources) {
      if (ledger.sources.hasOwnProperty(src)) {
        snapshot.sources[src] = ledger.sources[src];
      }
    }
    ledger.snapshots.push(snapshot);
    ledger.snapshotCounter = tick;
    return snapshot;
  }

  /**
   * Takes a snapshot if the interval has elapsed.
   * @param {Object} ledger
   * @param {number} currentTick
   * @returns {Object|null} snapshot or null
   */
  function maybeSnapshot(ledger, currentTick) {
    var lastSnap = ledger.snapshotCounter || 0;
    if (currentTick - lastSnap >= SNAPSHOT_INTERVAL) {
      return takeSnapshot(ledger, currentTick);
    }
    return null;
  }

  /**
   * Returns trend: average standing over last N snapshots.
   * @param {Object} ledger
   * @param {number} [n=5]
   * @returns {Object} { average, min, max, trend }
   */
  function getStandingTrend(ledger, n) {
    n = (typeof n === 'number' && n > 0) ? n : 5;
    var snaps = ledger.snapshots;
    if (snaps.length === 0) {
      return { average: ledger.standing, min: ledger.standing, max: ledger.standing, trend: 'stable' };
    }
    var recent = snaps.slice(-n);
    var sum = 0;
    var min = Infinity;
    var max = -Infinity;
    for (var i = 0; i < recent.length; i++) {
      sum += recent[i].standing;
      if (recent[i].standing < min) min = recent[i].standing;
      if (recent[i].standing > max) max = recent[i].standing;
    }
    var avg = Math.round(sum / recent.length);
    var trend = 'stable';
    if (recent.length >= 2) {
      var first = recent[0].standing;
      var last = recent[recent.length - 1].standing;
      var diff = last - first;
      if (diff > 20) trend = 'rising';
      else if (diff < -20) trend = 'falling';
    }
    return { average: avg, min: min, max: max, trend: trend };
  }

  // ---------------------------------------------------------------------------
  // CROSS-SYSTEM SYNC
  // ---------------------------------------------------------------------------

  /**
   * Pulls NPC reputation data from NpcReputation module and updates ledger source.
   * npcScores: array of numbers in [-100, 100]
   * @param {Object} ledger
   * @param {Array} npcScores  - array of NPC reputation scores
   * @param {number} [tick]
   * @returns {Object}
   */
  function syncNpcReputation(ledger, npcScores, tick) {
    if (!Array.isArray(npcScores) || npcScores.length === 0) {
      return { success: false, reason: 'no_scores' };
    }
    var sum = 0;
    for (var i = 0; i < npcScores.length; i++) {
      sum += npcScores[i];
    }
    var avg = sum / npcScores.length;
    // Map from [-100, 100] to [0, 100]
    var normalized = Math.round((avg + 100) / 2);
    return setSource(ledger, 'npc_reputation', normalized, 'sync_npc_reputation', tick);
  }

  /**
   * Pulls trust bond data and updates ledger source.
   * bondPoints: total bond points across all NPCs (0 to ~5000)
   * @param {Object} ledger
   * @param {number} totalBondPoints
   * @param {number} [tick]
   * @returns {Object}
   */
  function syncTrustBonds(ledger, totalBondPoints, tick) {
    // 500 bond points = 100 standing (max)
    var normalized = Math.round(Math.min(100, (totalBondPoints / 500) * 100));
    return setSource(ledger, 'trust_bonds', normalized, 'sync_trust_bonds', tick);
  }

  /**
   * Syncs diplomatic standing from DiplomaticSystem.
   * diplomaticScore: -100 to 100
   * @param {Object} ledger
   * @param {number} diplomaticScore
   * @param {number} [tick]
   * @returns {Object}
   */
  function syncDiplomaticStanding(ledger, diplomaticScore, tick) {
    var normalized = Math.round((diplomaticScore + 100) / 2);
    return setSource(ledger, 'diplomatic_standing', normalized, 'sync_diplomatic', tick);
  }

  /**
   * Syncs multiverse reputation (0-100 scale).
   * @param {Object} ledger
   * @param {number} multiverseScore
   * @param {number} [tick]
   * @returns {Object}
   */
  function syncMultiverseReputation(ledger, multiverseScore, tick) {
    var normalized = Math.round(Math.max(0, Math.min(100, multiverseScore)));
    return setSource(ledger, 'multiverse_reputation', normalized, 'sync_multiverse', tick);
  }

  /**
   * Syncs guild progression level (1-10) to source.
   * @param {Object} ledger
   * @param {number} guildLevel
   * @param {number} [tick]
   * @returns {Object}
   */
  function syncGuildProgression(ledger, guildLevel, tick) {
    var normalized = Math.round(Math.min(100, (guildLevel / 10) * 100));
    return setSource(ledger, 'guild_progression', normalized, 'sync_guild', tick);
  }

  /**
   * Syncs zone steward standing (0-100).
   * @param {Object} ledger
   * @param {number} zoneStewardScore
   * @param {number} [tick]
   * @returns {Object}
   */
  function syncZoneSteward(ledger, zoneStewardScore, tick) {
    var normalized = Math.round(Math.max(0, Math.min(100, zoneStewardScore)));
    return setSource(ledger, 'zone_steward', normalized, 'sync_zone_steward', tick);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC HISTORY (§6.3 transparency)
  // ---------------------------------------------------------------------------

  /**
   * Returns the public reputation history for a citizen (auditable log).
   * @param {Object} ledger
   * @param {number} [limit=50]
   * @returns {Array}
   */
  function getPublicHistory(ledger, limit) {
    limit = (typeof limit === 'number' && limit > 0) ? limit : 50;
    return ledger.entries.slice(-limit);
  }

  /**
   * Returns a summary of standing changes over time.
   * @param {Object} ledger
   * @returns {Object}
   */
  function getStandingSummary(ledger) {
    var tier = getStandingTier(ledger.standing);
    var sourceList = [];
    for (var src in ledger.sources) {
      if (ledger.sources.hasOwnProperty(src)) {
        sourceList.push({ source: src, value: ledger.sources[src], weight: ledger.weights[src] || 0 });
      }
    }
    sourceList.sort(function(a, b) { return b.value - a.value; });

    return {
      citizenId:    ledger.citizenId,
      standing:     ledger.standing,
      tier:         tier,
      sources:      sourceList,
      entryCount:   ledger.entries.length,
      snapshotCount:ledger.snapshots.length,
      factionCount: Object.keys(ledger.factions).length
    };
  }

  // ---------------------------------------------------------------------------
  // REGISTRY OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Gets or creates a ledger for a citizen in the registry.
   * @param {Object} registry
   * @param {string} citizenId
   * @returns {Object} ledger
   */
  function getOrCreateLedger(registry, citizenId) {
    if (!registry.ledgers[citizenId]) {
      registry.ledgers[citizenId] = createLedger(citizenId);
    }
    return registry.ledgers[citizenId];
  }

  /**
   * Returns all ledgers sorted by standing descending.
   * @param {Object} registry
   * @param {number} [limit]
   * @returns {Array}
   */
  function getLeaderboard(registry, limit) {
    var all = [];
    for (var cid in registry.ledgers) {
      if (registry.ledgers.hasOwnProperty(cid)) {
        var ledger = registry.ledgers[cid];
        all.push({
          citizenId: cid,
          standing:  ledger.standing,
          tier:      getStandingTier(ledger.standing).name
        });
      }
    }
    all.sort(function(a, b) { return b.standing - a.standing; });
    if (typeof limit === 'number' && limit > 0) {
      return all.slice(0, limit);
    }
    return all;
  }

  /**
   * Records a global reputation event affecting multiple citizens.
   * @param {Object} registry
   * @param {string} eventType
   * @param {Array} citizenIds
   * @param {number} amount
   * @param {string} reason
   * @param {number} [tick]
   * @returns {Array} results
   */
  function broadcastReputationEvent(registry, eventType, citizenIds, amount, reason, tick) {
    var results = [];
    for (var i = 0; i < citizenIds.length; i++) {
      var cid = citizenIds[i];
      var ledger = getOrCreateLedger(registry, cid);
      var result = addReputationEntry(ledger, amount, eventType, reason, tick);
      results.push({ citizenId: cid, result: result });
      registry.globalHistory.push({
        type:      eventType,
        citizenId: cid,
        amount:    amount,
        reason:    reason,
        tick:      tick || 0,
        ts:        nowTs()
      });
    }
    return results;
  }

  /**
   * Updates lastActiveTick for a citizen ledger.
   * @param {Object} ledger
   * @param {number} tick
   */
  function recordActivity(ledger, tick) {
    ledger.lastActiveTick = tick;
  }

  // ---------------------------------------------------------------------------
  // TIER UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Checks if a citizen has at least the given tier.
   * @param {Object} ledger
   * @param {string} tierName
   * @returns {boolean}
   */
  function hasMinimumTier(ledger, tierName) {
    var tier = getStandingTier(ledger.standing);
    var tierIdx = -1;
    var citizenIdx = -1;
    for (var i = 0; i < STANDING_TIERS.length; i++) {
      if (STANDING_TIERS[i].name === tierName) tierIdx = i;
      if (STANDING_TIERS[i].name === tier.name) citizenIdx = i;
    }
    if (tierIdx < 0) return false;
    return citizenIdx >= tierIdx;
  }

  /**
   * Returns which tier benefits a citizen has access to.
   * @param {Object} ledger
   * @returns {Array<string>}
   */
  function getTierBenefits(ledger) {
    var tier = getStandingTier(ledger.standing);
    var benefits = [];
    for (var i = 0; i < STANDING_TIERS.length; i++) {
      benefits.push(STANDING_TIERS[i].name);
      if (STANDING_TIERS[i].name === tier.name) break;
    }
    return benefits;
  }

  // ---------------------------------------------------------------------------
  // WEIGHT CUSTOMIZATION
  // ---------------------------------------------------------------------------

  /**
   * Sets custom weights for reputation sources.
   * Weights don't need to sum to 1 (will be normalized on compute).
   * @param {Object} ledger
   * @param {Object} newWeights  - partial or full set of source weights
   * @returns {Object} ledger.weights
   */
  function setWeights(ledger, newWeights) {
    for (var src in newWeights) {
      if (newWeights.hasOwnProperty(src) && ledger.weights.hasOwnProperty(src)) {
        ledger.weights[src] = Math.max(0, newWeights[src]);
      }
    }
    recalcStanding(ledger);
    return ledger.weights;
  }

  // ---------------------------------------------------------------------------
  // HISTORY FILTERING
  // ---------------------------------------------------------------------------

  /**
   * Filters reputation entries by type.
   * @param {Object} ledger
   * @param {string} type  - 'direct', 'source_set', 'decay', etc.
   * @returns {Array}
   */
  function getEntriesByType(ledger, type) {
    return ledger.entries.filter(function(e) { return e.type === type; });
  }

  /**
   * Filters entries by source name.
   * @param {Object} ledger
   * @param {string} source
   * @returns {Array}
   */
  function getEntriesBySource(ledger, source) {
    return ledger.entries.filter(function(e) { return e.source === source; });
  }

  /**
   * Returns entries within a tick range.
   * @param {Object} ledger
   * @param {number} fromTick
   * @param {number} toTick
   * @returns {Array}
   */
  function getEntriesByTickRange(ledger, fromTick, toTick) {
    return ledger.entries.filter(function(e) {
      return e.tick >= fromTick && e.tick <= toTick;
    });
  }

  /**
   * Returns net standing change from all entries.
   * @param {Object} ledger
   * @returns {number}
   */
  function getNetStandingChange(ledger) {
    var net = 0;
    for (var i = 0; i < ledger.entries.length; i++) {
      var e = ledger.entries[i];
      if (e.type === 'direct') net += e.amount;
      else if (e.type === 'decay') net += e.amount; // amount is already negative
    }
    return net;
  }

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------

  exports.STANDING_MIN           = STANDING_MIN;
  exports.STANDING_MAX           = STANDING_MAX;
  exports.SOURCE_WEIGHTS         = SOURCE_WEIGHTS;
  exports.STANDING_TIERS         = STANDING_TIERS;
  exports.DECAY_CONFIG           = DECAY_CONFIG;
  exports.RECOVERY_ARCS          = RECOVERY_ARCS;
  exports.FACTION_TYPES          = FACTION_TYPES;
  exports.SNAPSHOT_INTERVAL      = SNAPSHOT_INTERVAL;

  exports.mulberry32             = mulberry32;
  exports.clampStanding          = clampStanding;
  exports.getStandingTier        = getStandingTier;
  exports.normalizeWeights       = normalizeWeights;
  exports.computeStanding        = computeStanding;
  exports.recalcStanding         = recalcStanding;

  exports.createLedger           = createLedger;
  exports.createRegistry         = createRegistry;

  exports.setSource              = setSource;
  exports.adjustSource           = adjustSource;
  exports.addReputationEntry     = addReputationEntry;

  exports.applyDecay             = applyDecay;
  exports.applyDecayAll          = applyDecayAll;

  exports.activateRecoveryArc    = activateRecoveryArc;
  exports.advanceRecoveryArc     = advanceRecoveryArc;
  exports.getRecoveryArcStatus   = getRecoveryArcStatus;

  exports.setFactionStanding     = setFactionStanding;
  exports.adjustFactionStanding  = adjustFactionStanding;
  exports.getFactionStanding     = getFactionStanding;
  exports.getAllFactionStandings  = getAllFactionStandings;

  exports.takeSnapshot           = takeSnapshot;
  exports.maybeSnapshot          = maybeSnapshot;
  exports.getStandingTrend       = getStandingTrend;

  exports.syncNpcReputation      = syncNpcReputation;
  exports.syncTrustBonds         = syncTrustBonds;
  exports.syncDiplomaticStanding = syncDiplomaticStanding;
  exports.syncMultiverseReputation = syncMultiverseReputation;
  exports.syncGuildProgression   = syncGuildProgression;
  exports.syncZoneSteward        = syncZoneSteward;

  exports.getPublicHistory       = getPublicHistory;
  exports.getStandingSummary     = getStandingSummary;

  exports.getOrCreateLedger      = getOrCreateLedger;
  exports.getLeaderboard         = getLeaderboard;
  exports.broadcastReputationEvent = broadcastReputationEvent;
  exports.recordActivity         = recordActivity;

  exports.hasMinimumTier         = hasMinimumTier;
  exports.getTierBenefits        = getTierBenefits;
  exports.setWeights             = setWeights;

  exports.getEntriesByType       = getEntriesByType;
  exports.getEntriesBySource     = getEntriesBySource;
  exports.getEntriesByTickRange  = getEntriesByTickRange;
  exports.getNetStandingChange   = getNetStandingChange;

})(typeof module !== 'undefined' ? module.exports : (window.ReputationLedger = {}));
