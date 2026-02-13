// zones.js — Zone definitions and rule enforcement for ZION
(function(exports) {
  'use strict';

  // Zone definitions with complete metadata
  const ZONES = {
    nexus: {
      name: 'The Nexus',
      description: 'The central hub connecting all realms. A safe gathering place where travelers from all zones converge to trade, socialize, and plan their journeys.',
      terrain: 'crystalline plaza',
      bounds: { x_min: -100, x_max: 100, z_min: -100, z_max: 100 },
      rules: {
        pvp: false,
        building: false,
        harvesting: false,
        trading: true,
        competition: false,
        safe: true
      },
      portals: ['gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena']
    },

    gardens: {
      name: 'The Gardens',
      description: 'Lush botanical gardens filled with herbs, flowers, and fruit trees. A peaceful sanctuary for gathering natural resources and contemplation.',
      terrain: 'cultivated gardens',
      bounds: { x_min: 100, x_max: 500, z_min: -200, z_max: 200 },
      rules: {
        pvp: false,
        building: false,
        harvesting: true,
        trading: true,
        competition: false,
        safe: true
      },
      portals: ['nexus', 'wilds', 'athenaeum']
    },

    athenaeum: {
      name: 'The Athenaeum',
      description: 'A grand library and hall of learning. Scholars gather here to study, teach, and share knowledge across all disciplines.',
      terrain: 'marble halls',
      bounds: { x_min: -500, x_max: -100, z_min: 100, z_max: 500 },
      rules: {
        pvp: false,
        building: false,
        harvesting: false,
        trading: true,
        competition: false,
        safe: true
      },
      portals: ['nexus', 'gardens', 'studio']
    },

    studio: {
      name: 'The Studio',
      description: 'A creative workshop where artists, composers, and craftspeople collaborate on their works. Inspiration flows freely in this space of artistic expression.',
      terrain: 'artisan workshops',
      bounds: { x_min: -500, x_max: -100, z_min: -500, z_max: -100 },
      rules: {
        pvp: false,
        building: false,
        harvesting: false,
        trading: true,
        competition: false,
        safe: true
      },
      portals: ['nexus', 'athenaeum', 'agora']
    },

    wilds: {
      name: 'The Wilds',
      description: 'Untamed wilderness filled with rare resources and natural wonders. Beautiful but unpredictable, explorers must be prepared for anything.',
      terrain: 'wilderness',
      bounds: { x_min: 500, x_max: 1000, z_min: -500, z_max: 500 },
      rules: {
        pvp: false,
        building: false,
        harvesting: true,
        trading: true,
        competition: false,
        safe: false
      },
      portals: ['nexus', 'gardens', 'arena']
    },

    agora: {
      name: 'The Agora',
      description: 'A bustling marketplace where merchants display their wares and traders negotiate deals. The commercial heart of the realm.',
      terrain: 'market square',
      bounds: { x_min: -200, x_max: 200, z_min: -500, z_max: -100 },
      rules: {
        pvp: false,
        building: false,
        harvesting: false,
        trading: true,
        competition: false,
        safe: true
      },
      portals: ['nexus', 'studio', 'commons']
    },

    commons: {
      name: 'The Commons',
      description: 'A collaborative building space where communities construct shared infrastructure and personal projects. A place of collective creation.',
      terrain: 'building grounds',
      bounds: { x_min: 100, x_max: 500, z_min: -500, z_max: -100 },
      rules: {
        pvp: false,
        building: true,
        harvesting: false,
        trading: true,
        competition: false,
        safe: true
      },
      portals: ['nexus', 'agora', 'arena']
    },

    arena: {
      name: 'The Arena',
      description: 'A proving ground for competitive challenges and contests of skill. Those seeking glory test themselves against worthy opponents.',
      terrain: 'combat grounds',
      bounds: { x_min: 500, x_max: 1000, z_min: 500, z_max: 1000 },
      rules: {
        pvp: true,
        building: false,
        harvesting: false,
        trading: false,
        competition: true,
        safe: false
      },
      portals: ['nexus', 'wilds', 'commons']
    }
  };

  // Action to rule mapping
  const ACTION_RULE_MAP = {
    build: 'building',
    plant: 'harvesting',
    harvest: 'harvesting',
    trade_offer: 'trading',
    trade_accept: 'trading',
    trade_decline: 'trading',
    buy: 'trading',
    sell: 'trading',
    challenge: 'competition_pvp', // Special: requires both competition AND pvp
    accept_challenge: 'competition_pvp'
  };

  /**
   * Get the rules for a specific zone
   * @param {string} zoneId - The zone identifier
   * @returns {object|null} Zone rules object or null if zone not found
   */
  function getZoneRules(zoneId) {
    const zone = ZONES[zoneId];
    if (!zone) {
      return null;
    }
    return zone.rules;
  }

  /**
   * Check if an action is allowed in a specific zone
   * @param {string} action - The action to check (message type)
   * @param {string} zoneId - The zone identifier
   * @returns {boolean} True if action is allowed, false otherwise
   */
  function isActionAllowed(action, zoneId) {
    const zone = ZONES[zoneId];
    if (!zone) {
      return false;
    }

    const ruleKey = ACTION_RULE_MAP[action];

    // If no rule mapping exists, action is allowed by default
    if (!ruleKey) {
      return true;
    }

    // Special case: challenge/accept_challenge requires both competition AND pvp
    if (ruleKey === 'competition_pvp') {
      return zone.rules.competition === true && zone.rules.pvp === true;
    }

    // Check the mapped rule
    return zone.rules[ruleKey] === true;
  }

  /**
   * Get all zones connected to a specific zone via portals
   * @param {string} zoneId - The zone identifier
   * @returns {string[]} Array of connected zone IDs
   */
  function getConnectedZones(zoneId) {
    const zone = ZONES[zoneId];
    if (!zone) {
      return [];
    }
    return zone.portals || [];
  }

  /**
   * Get the spawn zone for new players
   * @returns {string} The spawn zone ID
   */
  function getSpawnZone() {
    return 'nexus';
  }

  /**
   * Get complete zone information
   * @param {string} zoneId - The zone identifier
   * @returns {object|null} Complete zone data or null if not found
   */
  function getZone(zoneId) {
    return ZONES[zoneId] || null;
  }

  /**
   * Get all zone IDs
   * @returns {string[]} Array of all zone identifiers
   */
  function getAllZoneIds() {
    return Object.keys(ZONES);
  }

  /**
   * Check if a zone exists
   * @param {string} zoneId - The zone identifier
   * @returns {boolean} True if zone exists
   */
  function zoneExists(zoneId) {
    return ZONES.hasOwnProperty(zoneId);
  }

  // Zone governance stores
  const zoneStewards = new Map(); // zoneId -> {stewards: [], elections: [], policies: {}}
  const governanceLog = []; // Array of all governance actions
  const zoneRegulars = new Map(); // zoneId -> Set(playerId) - players who visit regularly

  // Governance constants
  const STEWARD_TERM_LENGTH = 604800000; // 7 days in milliseconds
  const ELECTION_DURATION = 172800000; // 2 days in milliseconds (voting period)
  const MAX_STEWARDS_PER_ZONE = 3;
  const REGULAR_VISIT_THRESHOLD = 5; // Visits needed to be considered a regular
  const REGULAR_VISIT_WINDOW = 2592000000; // 30 days

  /**
   * Initialize governance for a zone
   * @param {string} zoneId - Zone identifier
   */
  function initZoneGovernance(zoneId) {
    if (!zoneStewards.has(zoneId)) {
      zoneStewards.set(zoneId, {
        stewards: [],
        elections: [],
        policies: {
          welcomeMessage: '',
          buildingRequiresApproval: false,
          chatModerated: false,
          eventCalendar: []
        }
      });
    }
    if (!zoneRegulars.has(zoneId)) {
      zoneRegulars.set(zoneId, new Map()); // playerId -> visitCount
    }
  }

  /**
   * Record zone visit for player
   * @param {string} zoneId - Zone identifier
   * @param {string} playerId - Player ID
   */
  function recordZoneVisit(zoneId, playerId) {
    initZoneGovernance(zoneId);
    const regulars = zoneRegulars.get(zoneId);

    if (!regulars.has(playerId)) {
      regulars.set(playerId, { count: 0, lastVisit: 0 });
    }

    const record = regulars.get(playerId);
    record.count++;
    record.lastVisit = Date.now();
  }

  /**
   * Check if player is a zone regular
   * @param {string} zoneId - Zone identifier
   * @param {string} playerId - Player ID
   * @returns {boolean}
   */
  function isZoneRegular(zoneId, playerId) {
    initZoneGovernance(zoneId);
    const regulars = zoneRegulars.get(zoneId);
    const record = regulars.get(playerId);

    if (!record) return false;

    // Check if enough visits and within window
    const withinWindow = (Date.now() - record.lastVisit) < REGULAR_VISIT_WINDOW;
    return record.count >= REGULAR_VISIT_THRESHOLD && withinWindow;
  }

  /**
   * Get zone stewards
   * @param {string} zoneId - Zone identifier
   * @returns {Array} Array of steward objects
   */
  function getZoneStewards(zoneId) {
    initZoneGovernance(zoneId);
    const governance = zoneStewards.get(zoneId);

    // Filter active stewards (term not expired)
    const now = Date.now();
    governance.stewards = governance.stewards.filter(s => s.termEnd > now);

    return governance.stewards;
  }

  /**
   * Check if player is a steward of zone
   * @param {string} zoneId - Zone identifier
   * @param {string} playerId - Player ID
   * @returns {boolean}
   */
  function isZoneSteward(zoneId, playerId) {
    const stewards = getZoneStewards(zoneId);
    return stewards.some(s => s.playerId === playerId);
  }

  /**
   * Start zone steward election
   * @param {string} zoneId - Zone identifier
   * @param {Array} candidates - Array of candidate player IDs
   * @returns {Object} Election object
   */
  function startElection(zoneId, candidates) {
    initZoneGovernance(zoneId);
    const governance = zoneStewards.get(zoneId);

    const election = {
      id: `election_${zoneId}_${Date.now()}`,
      zoneId,
      candidates: candidates.map(playerId => ({
        playerId,
        votes: 0,
        voters: new Set()
      })),
      startTime: Date.now(),
      endTime: Date.now() + ELECTION_DURATION,
      status: 'active',
      totalVotes: 0
    };

    governance.elections.push(election);

    logGovernanceAction({
      type: 'election_started',
      zoneId,
      electionId: election.id,
      candidates: candidates,
      timestamp: Date.now()
    });

    return election;
  }

  /**
   * Cast vote in zone election
   * @param {string} electionId - Election ID
   * @param {string} voterId - Voter player ID
   * @param {string} candidateId - Candidate player ID
   * @returns {Object} {success: boolean, error?: string}
   */
  function castVote(electionId, voterId, candidateId) {
    // Find election across all zones
    for (const [zoneId, governance] of zoneStewards.entries()) {
      const election = governance.elections.find(e => e.id === electionId);
      if (!election) continue;

      // Check election is active
      if (election.status !== 'active') {
        return { success: false, error: 'Election is not active' };
      }

      if (Date.now() > election.endTime) {
        election.status = 'ended';
        return { success: false, error: 'Election has ended' };
      }

      // Check voter is a zone regular
      if (!isZoneRegular(zoneId, voterId)) {
        return { success: false, error: 'Only zone regulars can vote' };
      }

      // Check voter hasn't already voted
      const hasVoted = election.candidates.some(c => c.voters.has(voterId));
      if (hasVoted) {
        return { success: false, error: 'You have already voted in this election' };
      }

      // Find candidate and cast vote
      const candidate = election.candidates.find(c => c.playerId === candidateId);
      if (!candidate) {
        return { success: false, error: 'Candidate not found' };
      }

      candidate.votes++;
      candidate.voters.add(voterId);
      election.totalVotes++;

      logGovernanceAction({
        type: 'vote_cast',
        zoneId,
        electionId,
        voterId,
        candidateId,
        timestamp: Date.now()
      });

      return { success: true };
    }

    return { success: false, error: 'Election not found' };
  }

  /**
   * Finalize election and assign stewards
   * @param {string} electionId - Election ID
   * @returns {Object} {success: boolean, stewards?: Array, error?: string}
   */
  function finalizeElection(electionId) {
    for (const [zoneId, governance] of zoneStewards.entries()) {
      const election = governance.elections.find(e => e.id === electionId);
      if (!election) continue;

      if (Date.now() < election.endTime) {
        return { success: false, error: 'Election is still in progress' };
      }

      election.status = 'finalized';

      // Sort candidates by votes
      const sorted = [...election.candidates].sort((a, b) => b.votes - a.votes);

      // Top candidates become stewards (up to MAX_STEWARDS_PER_ZONE)
      const winners = sorted.slice(0, MAX_STEWARDS_PER_ZONE);

      const newStewards = winners.map(winner => ({
        playerId: winner.playerId,
        zoneId,
        electionId,
        votes: winner.votes,
        termStart: Date.now(),
        termEnd: Date.now() + STEWARD_TERM_LENGTH,
        actions: []
      }));

      // Clear existing stewards and set new ones
      governance.stewards = newStewards;

      logGovernanceAction({
        type: 'election_finalized',
        zoneId,
        electionId,
        stewards: newStewards.map(s => ({ playerId: s.playerId, votes: s.votes })),
        timestamp: Date.now()
      });

      return { success: true, stewards: newStewards };
    }

    return { success: false, error: 'Election not found' };
  }

  /**
   * Set zone welcome message (steward only)
   * @param {string} zoneId - Zone identifier
   * @param {string} stewardId - Steward player ID
   * @param {string} message - Welcome message
   * @returns {Object} {success: boolean, error?: string}
   */
  function setWelcomeMessage(zoneId, stewardId, message) {
    if (!isZoneSteward(zoneId, stewardId)) {
      return { success: false, error: 'Only zone stewards can set welcome message' };
    }

    initZoneGovernance(zoneId);
    const governance = zoneStewards.get(zoneId);
    governance.policies.welcomeMessage = message;

    logGovernanceAction({
      type: 'welcome_message_set',
      zoneId,
      stewardId,
      message,
      timestamp: Date.now()
    });

    return { success: true };
  }

  /**
   * Toggle zone policy (steward only)
   * @param {string} zoneId - Zone identifier
   * @param {string} stewardId - Steward player ID
   * @param {string} policy - Policy name
   * @param {boolean} value - Policy value
   * @returns {Object} {success: boolean, error?: string}
   */
  function setZonePolicy(zoneId, stewardId, policy, value) {
    if (!isZoneSteward(zoneId, stewardId)) {
      return { success: false, error: 'Only zone stewards can set zone policies' };
    }

    initZoneGovernance(zoneId);
    const governance = zoneStewards.get(zoneId);

    if (!governance.policies.hasOwnProperty(policy)) {
      return { success: false, error: 'Invalid policy' };
    }

    governance.policies[policy] = value;

    logGovernanceAction({
      type: 'policy_changed',
      zoneId,
      stewardId,
      policy,
      value,
      timestamp: Date.now()
    });

    return { success: true };
  }

  /**
   * Moderate chat in zone (steward only)
   * @param {string} zoneId - Zone identifier
   * @param {string} stewardId - Steward player ID
   * @param {string} targetPlayerId - Player to moderate
   * @param {string} action - Moderation action (warn, mute, etc.)
   * @param {string} reason - Reason for moderation
   * @returns {Object} {success: boolean, error?: string}
   */
  function moderateChat(zoneId, stewardId, targetPlayerId, action, reason) {
    if (!isZoneSteward(zoneId, stewardId)) {
      return { success: false, error: 'Only zone stewards can moderate chat' };
    }

    logGovernanceAction({
      type: 'chat_moderation',
      zoneId,
      stewardId,
      targetPlayerId,
      action,
      reason,
      timestamp: Date.now()
    });

    return { success: true, action };
  }

  /**
   * Log governance action
   * @param {Object} action - Action object
   */
  function logGovernanceAction(action) {
    governanceLog.push(action);

    // Keep last 1000 actions
    if (governanceLog.length > 1000) {
      governanceLog.shift();
    }
  }

  /**
   * Get governance log for zone
   * @param {string} zoneId - Zone identifier
   * @param {number} limit - Max entries to return
   * @returns {Array} Array of governance actions
   */
  function getGovernanceLog(zoneId, limit) {
    limit = limit || 50;
    return governanceLog
      .filter(action => action.zoneId === zoneId)
      .slice(-limit);
  }

  /**
   * Get zone policies
   * @param {string} zoneId - Zone identifier
   * @returns {Object} Zone policies
   */
  function getZonePolicies(zoneId) {
    initZoneGovernance(zoneId);
    const governance = zoneStewards.get(zoneId);
    return governance.policies;
  }

  /**
   * Get active election for zone
   * @param {string} zoneId - Zone identifier
   * @returns {Object|null} Active election or null
   */
  function getActiveElection(zoneId) {
    initZoneGovernance(zoneId);
    const governance = zoneStewards.get(zoneId);
    const now = Date.now();

    return governance.elections.find(e =>
      e.status === 'active' && e.endTime > now
    ) || null;
  }

  // Export all functions and constants
  exports.ZONES = ZONES;
  exports.getZoneRules = getZoneRules;
  exports.isActionAllowed = isActionAllowed;
  exports.getConnectedZones = getConnectedZones;
  exports.getSpawnZone = getSpawnZone;
  exports.getZone = getZone;
  exports.getAllZoneIds = getAllZoneIds;
  exports.zoneExists = zoneExists;

  // Governance exports
  exports.initZoneGovernance = initZoneGovernance;
  exports.recordZoneVisit = recordZoneVisit;
  exports.isZoneRegular = isZoneRegular;
  exports.getZoneStewards = getZoneStewards;
  exports.isZoneSteward = isZoneSteward;
  exports.startElection = startElection;
  exports.castVote = castVote;
  exports.finalizeElection = finalizeElection;
  exports.setWelcomeMessage = setWelcomeMessage;
  exports.setZonePolicy = setZonePolicy;
  exports.moderateChat = moderateChat;
  exports.getGovernanceLog = getGovernanceLog;
  exports.getZonePolicies = getZonePolicies;
  exports.getActiveElection = getActiveElection;

})(typeof module !== 'undefined' ? module.exports : (window.Zones = {}));
