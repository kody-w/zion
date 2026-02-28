(function(exports) {
  'use strict';

  // §5.4 — Genesis Zones from the Constitution
  var ZONES = {
    nexus: {
      id: 'nexus',
      name: 'The Nexus',
      description: 'Central hub. Social gathering place. Every new player spawns here.',
      terrain: 'urban',
      bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
      rules: { pvp: false, building: false, harvesting: false, trading: true, competition: false, safe: true },
      portals: ['gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena']
    },
    gardens: {
      id: 'gardens',
      name: 'The Gardens',
      description: 'Rolling fields, orchards, greenhouses, flower meadows.',
      terrain: 'pastoral',
      bounds: { minX: 100, maxX: 300, minZ: -100, maxZ: 100 },
      rules: { pvp: false, building: false, harvesting: true, trading: true, competition: false, safe: true },
      portals: ['nexus']
    },
    athenaeum: {
      id: 'athenaeum',
      name: 'The Athenaeum',
      description: 'Library, classroom, observatory, puzzle halls.',
      terrain: 'academic',
      bounds: { minX: -300, maxX: -100, minZ: -100, maxZ: 100 },
      rules: { pvp: false, building: false, harvesting: false, trading: true, competition: false, safe: true },
      portals: ['nexus']
    },
    studio: {
      id: 'studio',
      name: 'The Studio',
      description: 'Art galleries, music halls, performance stages.',
      terrain: 'creative',
      bounds: { minX: -100, maxX: 100, minZ: 100, maxZ: 300 },
      rules: { pvp: false, building: true, harvesting: false, trading: true, competition: false, safe: true },
      portals: ['nexus']
    },
    wilds: {
      id: 'wilds',
      name: 'The Wilds',
      description: 'Vast open terrain. Forests, mountains, rivers, caves.',
      terrain: 'wilderness',
      bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: -100 },
      rules: { pvp: false, building: false, harvesting: true, trading: true, competition: false, safe: true },
      portals: ['nexus']
    },
    agora: {
      id: 'agora',
      name: 'The Agora',
      description: 'Marketplace, auction house, trading floor.',
      terrain: 'market',
      bounds: { minX: 100, maxX: 300, minZ: 100, maxZ: 300 },
      rules: { pvp: false, building: false, harvesting: false, trading: true, competition: false, safe: true },
      portals: ['nexus']
    },
    commons: {
      id: 'commons',
      name: 'The Commons',
      description: 'Empty at genesis. Players build whatever they want.',
      terrain: 'open',
      bounds: { minX: -300, maxX: -100, minZ: 100, maxZ: 300 },
      rules: { pvp: false, building: true, harvesting: true, trading: true, competition: false, safe: true },
      portals: ['nexus']
    },
    arena: {
      id: 'arena',
      name: 'The Arena',
      description: 'Opt-in friendly competition. Always consensual.',
      terrain: 'colosseum',
      bounds: { minX: -100, maxX: 100, minZ: -300, maxZ: -100 },
      rules: { pvp: true, building: false, harvesting: false, trading: false, competition: true, safe: false },
      portals: ['nexus']
    }
  };

  // Map action types to zone rule fields
  var ACTION_RULE_MAP = {
    'build': 'building',
    'plant': 'harvesting',
    'harvest': 'harvesting',
    'trade_offer': 'trading',
    'trade_accept': 'trading',
    'trade_decline': 'trading',
    'buy': 'trading',
    'sell': 'trading',
    'challenge': 'competition',
    'accept_challenge': 'competition',
    'score': 'competition',
    'forfeit': 'competition'
  };

  function getAllZoneIds() {
    return Object.keys(ZONES);
  }

  function getZone(zoneId) {
    return ZONES[zoneId] || null;
  }

  function getZoneRules(zoneId) {
    var zone = ZONES[zoneId];
    return zone ? zone.rules : null;
  }

  function getConnectedZones(zoneId) {
    var zone = ZONES[zoneId];
    return zone ? zone.portals : [];
  }

  function getSpawnZone() {
    return 'nexus';
  }

  function zoneExists(zoneId) {
    return !!zoneId && ZONES.hasOwnProperty(zoneId);
  }

  // §5.5 — Check zone rules before allowing actions
  function isActionAllowed(actionType, zoneId) {
    if (!zoneExists(zoneId)) return false;
    var ruleKey = ACTION_RULE_MAP[actionType];
    if (!ruleKey) return true; // Unmapped actions are allowed by default
    return !!ZONES[zoneId].rules[ruleKey];
  }

  exports.Zones = {
    ZONES: ZONES,
    getAllZoneIds: getAllZoneIds,
    getZone: getZone,
    getZoneRules: getZoneRules,
    getConnectedZones: getConnectedZones,
    getSpawnZone: getSpawnZone,
    zoneExists: zoneExists,
    isActionAllowed: isActionAllowed
  };

  if (typeof module !== 'undefined') {
    module.exports = exports.Zones;
  }
})(typeof module !== 'undefined' ? module.exports : (window.ZION = window.ZION || {}));
