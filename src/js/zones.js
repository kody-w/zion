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

  // Export all functions and constants
  exports.ZONES = ZONES;
  exports.getZoneRules = getZoneRules;
  exports.isActionAllowed = isActionAllowed;
  exports.getConnectedZones = getConnectedZones;
  exports.getSpawnZone = getSpawnZone;
  exports.getZone = getZone;
  exports.getAllZoneIds = getAllZoneIds;
  exports.zoneExists = zoneExists;

})(typeof module !== 'undefined' ? module.exports : (window.Zones = {}));
