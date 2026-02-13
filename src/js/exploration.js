(function(exports) {

  // Discovery types
  const DISCOVERY_TYPES = [
    'location', 'creature', 'artifact', 'secret',
    'landmark', 'ruin', 'cave', 'spring'
  ];

  // Base rarity by discovery type
  const BASE_RARITY = {
    location: 0.3,
    creature: 0.5,
    artifact: 0.7,
    secret: 0.9,
    landmark: 0.2,
    ruin: 0.6,
    cave: 0.4,
    spring: 0.5
  };

  // Generate unique IDs
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // Calculate distance between two 3D positions
  function calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Check if discovery is duplicate
  function isDuplicate(playerId, position, state) {
    if (!state.discoveries || state.discoveries.length === 0) {
      return false;
    }

    // Check if player has already discovered within distance 5
    for (const discovery of state.discoveries) {
      if (discovery.discoverer === playerId) {
        const distance = calculateDistance(position, discovery.position);
        if (distance <= 5) {
          return true;
        }
      }
    }

    return false;
  }

  // Calculate rarity for a discovery type
  function calculateRarity(type) {
    if (BASE_RARITY.hasOwnProperty(type)) {
      return BASE_RARITY[type];
    }
    // Default rarity
    return 0.3;
  }

  // Handle discovery
  function handleDiscover(msg, state) {
    const position = msg.payload.position || {x: 0, y: 0, z: 0};
    const playerId = msg.from;

    // Check for duplicate
    if (isDuplicate(playerId, position, state)) {
      return {
        success: false,
        error: 'Already discovered'
      };
    }

    const discoveryType = msg.payload.type || 'location';
    if (!DISCOVERY_TYPES.includes(discoveryType)) {
      return {
        success: false,
        error: 'Invalid discovery type'
      };
    }

    // Determine rarity
    let rarity = msg.payload.rarity;
    if (typeof rarity !== 'number' || rarity < 0 || rarity > 1) {
      rarity = calculateRarity(discoveryType);
    }

    // Calculate Spark award
    const sparkAwarded = 5 + Math.floor(rarity * 20);

    const discovery = {
      id: generateId(),
      discoverer: playerId,
      type: discoveryType,
      description: msg.payload.description || '',
      position: position,
      zone: msg.payload.zone || 'default',
      ts: Date.now(),
      rarity: rarity
    };

    // Initialize state.discoveries if needed
    if (!state.discoveries) {
      state.discoveries = [];
    }

    state.discoveries.push(discovery);

    return {
      success: true,
      state: state,
      discovery: discovery,
      sparkAwarded: sparkAwarded
    };
  }

  // Handle inspection
  function handleInspect(msg, state) {
    const targetId = msg.payload.target;

    if (!targetId) {
      return {
        success: false,
        error: 'No target specified'
      };
    }

    let info = null;
    let entityType = null;

    // Search in players
    if (state.players && state.players[targetId]) {
      info = {
        type: 'player',
        id: targetId,
        data: state.players[targetId]
      };
      entityType = 'player';
    }

    // Search in structures
    if (!info && state.structures && state.structures.length > 0) {
      const structure = state.structures.find(s => s.id === targetId);
      if (structure) {
        info = {
          type: 'structure',
          id: targetId,
          data: structure
        };
        entityType = 'structure';
      }
    }

    // Search in gardens
    if (!info && state.gardens && state.gardens.length > 0) {
      const garden = state.gardens.find(g => g.id === targetId);
      if (garden) {
        const now = Date.now();
        const elapsed = now - garden.plantedAt;
        const totalGrowthTime = garden.readyAt - garden.plantedAt;
        const currentGrowthStage = Math.min(1.0, elapsed / totalGrowthTime);

        info = {
          type: 'garden',
          id: targetId,
          data: {
            ...garden,
            currentGrowthStage: currentGrowthStage,
            isReady: now >= garden.readyAt
          }
        };
        entityType = 'garden';
      }
    }

    // Search in discoveries
    if (!info && state.discoveries && state.discoveries.length > 0) {
      const discovery = state.discoveries.find(d => d.id === targetId);
      if (discovery) {
        info = {
          type: 'discovery',
          id: targetId,
          data: discovery
        };
        entityType = 'discovery';
      }
    }

    if (!info) {
      return {
        success: false,
        error: 'Target not found'
      };
    }

    return {
      success: true,
      info: info
    };
  }

  // Get all discoveries for a player
  function getDiscoveries(playerId, state) {
    if (!state || !state.discoveries) {
      return [];
    }

    return state.discoveries.filter(function(d) {
      return d.discoverer === playerId;
    }).map(function(d) {
      // Map rarity number to rarity name
      var rarityName = 'common';
      if (d.rarity >= 0.9) rarityName = 'legendary';
      else if (d.rarity >= 0.7) rarityName = 'epic';
      else if (d.rarity >= 0.5) rarityName = 'rare';
      else if (d.rarity >= 0.3) rarityName = 'uncommon';

      return {
        name: d.type.charAt(0).toUpperCase() + d.type.slice(1),
        description: d.description,
        zone: d.zone,
        rarity: rarityName,
        timestamp: d.ts
      };
    });
  }

  // Get discovered zones for a player
  function getDiscoveredZones(playerId, state) {
    if (!state || !state.discoveries) {
      return ['default'];
    }

    var zones = {};
    state.discoveries.forEach(function(d) {
      if (d.discoverer === playerId) {
        zones[d.zone] = true;
      }
    });

    return Object.keys(zones);
  }

  // ========================================================================
  // ZONE SECRETS — Hidden discoverable locations in each zone
  // ========================================================================

  var ZONE_SECRETS = {
    nexus: [
      { id: 'nexus_heart', name: 'Heart of the Nexus', type: 'secret', description: 'A pulsing crystal embedded in the ground at the world\'s center, humming with energy from all connected zones.', position: { x: 0, y: 0.5, z: 0 }, rarity: 0.8, loreId: 'lore_nexus_heart' },
      { id: 'nexus_echo', name: 'Echo Stone', type: 'artifact', description: 'A smooth stone that whispers the names of every player who has ever visited ZION.', position: { x: 15, y: 1, z: -10 }, rarity: 0.6, loreId: 'lore_echo_stone' },
      { id: 'nexus_sundial', name: 'Eternal Sundial', type: 'landmark', description: 'An ancient sundial that tracks not just time but the phases of ZION\'s day-night cycle.', position: { x: -8, y: 0, z: 12 }, rarity: 0.4, loreId: 'lore_sundial' }
    ],
    gardens: [
      { id: 'gardens_moonwell', name: 'Moonwell', type: 'spring', description: 'A hidden pool that glows silver at night, said to accelerate plant growth nearby.', position: { x: -20, y: 0, z: -25 }, rarity: 0.7, loreId: 'lore_moonwell' },
      { id: 'gardens_ancient_tree', name: 'The First Tree', type: 'landmark', description: 'The oldest tree in ZION, its trunk carved with symbols from the founding.', position: { x: 30, y: 0, z: 10 }, rarity: 0.5, loreId: 'lore_first_tree' },
      { id: 'gardens_fairy_ring', name: 'Fairy Ring', type: 'secret', description: 'A perfect circle of mushrooms that appears only at certain times.', position: { x: -5, y: 0, z: 35 }, rarity: 0.9, loreId: 'lore_fairy_ring' },
      { id: 'gardens_meditation', name: 'Meditation Hollow', type: 'location', description: 'A sheltered hollow where the ambient sounds of nature converge in perfect harmony.', position: { x: 18, y: -1, z: -30 }, rarity: 0.6, loreId: 'lore_meditation' }
    ],
    athenaeum: [
      { id: 'athenaeum_codex', name: 'The Lost Codex', type: 'artifact', description: 'A floating book whose pages contain knowledge from all federated worlds.', position: { x: -12, y: 3, z: -15 }, rarity: 0.9, loreId: 'lore_codex' },
      { id: 'athenaeum_orrery', name: 'Celestial Orrery', type: 'artifact', description: 'A mechanical model of the multiverse, with a tiny light for each federated world.', position: { x: 5, y: 2, z: 20 }, rarity: 0.8, loreId: 'lore_orrery' },
      { id: 'athenaeum_whispering', name: 'Whispering Stacks', type: 'secret', description: 'Deep in the shelves, the books murmur to each other, sharing fragments of lore.', position: { x: -25, y: 0, z: 8 }, rarity: 0.7, loreId: 'lore_whispering' }
    ],
    studio: [
      { id: 'studio_muse', name: 'The Muse\'s Corner', type: 'secret', description: 'A corner where inspiration strikes harder. Art created here always seems to resonate more.', position: { x: 10, y: 0, z: -18 }, rarity: 0.7, loreId: 'lore_muse' },
      { id: 'studio_palette', name: 'Living Palette', type: 'artifact', description: 'A palette whose colors shift with the seasons, mixing hues no artisan has seen before.', position: { x: -15, y: 1, z: 12 }, rarity: 0.8, loreId: 'lore_palette' },
      { id: 'studio_resonance', name: 'Resonance Chamber', type: 'cave', description: 'A natural acoustic chamber where even whispers become music.', position: { x: 22, y: -2, z: -5 }, rarity: 0.6, loreId: 'lore_resonance' }
    ],
    wilds: [
      { id: 'wilds_hollow', name: 'Starfall Hollow', type: 'cave', description: 'A cavern where fragments of starlight collect in luminous pools.', position: { x: -30, y: -3, z: -20 }, rarity: 0.9, loreId: 'lore_starfall' },
      { id: 'wilds_monolith', name: 'The Monolith', type: 'ruin', description: 'A towering black stone that predates ZION itself, covered in undecipherable glyphs.', position: { x: 35, y: 0, z: 25 }, rarity: 0.8, loreId: 'lore_monolith' },
      { id: 'wilds_grove', name: 'Singing Grove', type: 'location', description: 'Trees here sway in patterns that create hauntingly beautiful melodies.', position: { x: -10, y: 0, z: 30 }, rarity: 0.5, loreId: 'lore_singing_grove' },
      { id: 'wilds_fossil', name: 'Fossil Cliff', type: 'landmark', description: 'A cliff face embedded with fossils from creatures that never existed in our world.', position: { x: 20, y: 5, z: -35 }, rarity: 0.6, loreId: 'lore_fossil_cliff' },
      { id: 'wilds_spring', name: 'Hidden Hot Spring', type: 'spring', description: 'A natural hot spring tucked behind a waterfall, warm even in winter.', position: { x: -25, y: -1, z: -10 }, rarity: 0.7, loreId: 'lore_hot_spring' }
    ],
    agora: [
      { id: 'agora_vault', name: 'The Old Vault', type: 'ruin', description: 'Beneath the market, the remains of ZION\'s first bank, its vault door still ajar.', position: { x: 8, y: -2, z: -12 }, rarity: 0.7, loreId: 'lore_vault' },
      { id: 'agora_scales', name: 'Scales of Truth', type: 'artifact', description: 'Ancient merchant scales that glow when a fair trade is struck nearby.', position: { x: -10, y: 1, z: 5 }, rarity: 0.6, loreId: 'lore_scales' }
    ],
    commons: [
      { id: 'commons_bell', name: 'Community Bell', type: 'landmark', description: 'A large bell that was rung to call the first citizens of ZION together.', position: { x: 0, y: 3, z: 0 }, rarity: 0.4, loreId: 'lore_bell' },
      { id: 'commons_mosaic', name: 'Founders\' Mosaic', type: 'artifact', description: 'A floor mosaic depicting the founding of ZION, with space for new tiles from each generation.', position: { x: -15, y: 0, z: 15 }, rarity: 0.6, loreId: 'lore_mosaic' },
      { id: 'commons_time_capsule', name: 'Time Capsule', type: 'secret', description: 'Buried beneath the gathering circle, a capsule left by the founders with messages for the future.', position: { x: 5, y: -1, z: -8 }, rarity: 0.8, loreId: 'lore_time_capsule' }
    ],
    arena: [
      { id: 'arena_champions', name: 'Hall of Champions', type: 'ruin', description: 'Carved into the arena wall, the names and deeds of every champion who competed here.', position: { x: 20, y: 2, z: 0 }, rarity: 0.5, loreId: 'lore_champions' },
      { id: 'arena_flame', name: 'Eternal Flame', type: 'landmark', description: 'A flame that has burned since the arena was built, said to embody the spirit of competition.', position: { x: 0, y: 1, z: -20 }, rarity: 0.6, loreId: 'lore_flame' }
    ]
  };

  // ========================================================================
  // LORE ENTRIES — Deep world-building text
  // ========================================================================

  var LORE_ENTRIES = {
    lore_nexus_heart: {
      title: 'The Heart of ZION',
      text: 'Long before the first player set foot in ZION, the Heart was placed here — a crystal forged from the combined intentions of its creators. It pulses once for every soul currently inhabiting the world. Old-timers say that on quiet nights, you can feel it sync with your own heartbeat, as if the world itself is alive and breathing alongside you.',
      category: 'origins'
    },
    lore_echo_stone: {
      title: 'The Echo Stone',
      text: 'The Echo Stone remembers. Every name spoken near it is captured and preserved in its crystalline lattice. Some say if you press your ear to its surface and whisper a name, you can hear a faint echo of that person\'s first words in ZION. The stone grows infinitesimally larger with each new voice it records.',
      category: 'artifacts'
    },
    lore_sundial: {
      title: 'The Eternal Sundial',
      text: 'The Sundial was the first structure built in the Nexus, before even the portals were erected. It tracks the 24-minute day cycle and marks the seasons that shift each real-world week. At dawn, its shadow points toward the Gardens. At dusk, toward the Wilds. At the rare eclipse, it casts no shadow at all.',
      category: 'landmarks'
    },
    lore_moonwell: {
      title: 'The Moonwell',
      text: 'Hidden in the deepest grove of the Gardens lies the Moonwell, a pool of water that seems to capture and hold moonlight even after dawn. Gardeners discovered that plants watered from the Moonwell grow twice as fast, though they suspect this is less about the water and more about the attention the gardener pays in finding it.',
      category: 'nature'
    },
    lore_first_tree: {
      title: 'The First Tree',
      text: 'Before the Gardens were cultivated, before the zones were named, there was a single tree. The First Tree grew from a seed of intention planted by ZION\'s architects. Its roots extend beneath every zone, connecting the world in ways no map can show. The symbols carved in its trunk are the original protocol — the language that all of ZION\'s systems speak.',
      category: 'origins'
    },
    lore_fairy_ring: {
      title: 'The Fairy Ring',
      text: 'The Fairy Ring appears and disappears according to rules no scholar has fully deciphered. Some say it follows the moon cycle, others claim it responds to the emotional state of the world itself. Those who find it report a fleeting sense of profound connection to every other being in ZION — as if, for one moment, the boundaries between self and world dissolve.',
      category: 'mysteries'
    },
    lore_meditation: {
      title: 'The Meditation Hollow',
      text: 'In the Meditation Hollow, the sounds of nature converge in unexpected harmony — birdsong becomes melody, wind becomes rhythm, water becomes bass. Those who sit here long enough report achieving a rare clarity of purpose. It\'s said this was the spot where the intention system was first imagined.',
      category: 'nature'
    },
    lore_codex: {
      title: 'The Lost Codex',
      text: 'The Codex floats between shelves, never resting in one place. Its pages are blank to most, but to those who have visited federated worlds, text appears: knowledge from those distant lands. The more worlds you visit, the more pages reveal themselves. Scholars believe the Codex is less a book and more a living bridge between realities.',
      category: 'artifacts'
    },
    lore_orrery: {
      title: 'The Celestial Orrery',
      text: 'Built by the first scholars of the Athenaeum, the Orrery maps every federated world as a tiny point of light orbiting a central sun — ZION itself. New lights appear when new federations are forged, and they dim when connections grow quiet. It serves as both art and practical tool, allowing citizens to see the health of the multiverse at a glance.',
      category: 'artifacts'
    },
    lore_whispering: {
      title: 'The Whispering Stacks',
      text: 'Deep in the Athenaeum, where the oldest books reside, the air is thick with whispers. The books share knowledge among themselves when no one is looking, cross-referencing and updating their contents. Scholars who linger here too long report dreams filled with information they never consciously learned.',
      category: 'mysteries'
    },
    lore_muse: {
      title: 'The Muse\'s Corner',
      text: 'Every studio has its sweet spot, the place where creativity flows most freely. In ZION\'s Studio, that spot is marked by a slight warmth in the floor and a tendency for ambient sounds to harmonize. Artists who create here often surprise themselves with the results. Is it magic, or simply the power of expectation? The Muse keeps her secrets.',
      category: 'art'
    },
    lore_palette: {
      title: 'The Living Palette',
      text: 'The Palette was not crafted but grown — crystallized from the combined creative energy of ZION\'s first artists. Its colors are alive: they deepen in autumn, brighten in spring, glow warmly in winter, and shimmer like water in summer. Art created with its pigments is said to evoke emotions in viewers that no ordinary color can.',
      category: 'artifacts'
    },
    lore_resonance: {
      title: 'The Resonance Chamber',
      text: 'Beneath the Studio lies a natural cavern with perfect acoustics. Sound enters and emerges transformed — whispers become symphonies, footsteps become percussion, breath becomes wind instruments. Musicians gather here to compose pieces that could never exist in the above-ground world. The Chamber doesn\'t amplify sound; it reveals its hidden depth.',
      category: 'nature'
    },
    lore_starfall: {
      title: 'Starfall Hollow',
      text: 'When the procedural stars of ZION\'s sky occasionally flicker and fall, their light doesn\'t vanish — it collects in pools deep within Starfall Hollow. The luminous pools cast impossible shadows that move independently of light sources. Explorers have reported seeing brief visions of other worlds reflected in the starlight pools.',
      category: 'mysteries'
    },
    lore_monolith: {
      title: 'The Monolith',
      text: 'The Monolith stands as a reminder that not everything in ZION was placed there by its creators. It appeared one day, unannounced, and no log records its creation. Its glyphs resist translation — they seem to shift when observed directly. Some theorize it\'s a message from a parallel ZION, a fork that found a way to communicate across the multiverse gap.',
      category: 'mysteries'
    },
    lore_singing_grove: {
      title: 'The Singing Grove',
      text: 'The trees of the Singing Grove have grown in a pattern that channels wind into music. Each season brings a different key, and the melody changes with the weather. During storms, the grove produces sounds that can only be described as the world singing itself to sleep. Wildlife gathers here during these concerts, unbothered by the presence of visitors.',
      category: 'nature'
    },
    lore_fossil_cliff: {
      title: 'The Fossil Cliff',
      text: 'The fossils in this cliff belong to creatures that exist in no biological record. Wings with too many segments, shells that spiral in mathematically impossible patterns, teeth that seem designed for eating light itself. Scholars debate whether these are remnants of an earlier version of ZION, or dreams that somehow calcified into stone.',
      category: 'mysteries'
    },
    lore_hot_spring: {
      title: 'The Hidden Hot Spring',
      text: 'Tucked behind a waterfall that reveals itself only to those who approach from the right angle, the Hot Spring maintains a perfect temperature regardless of season. Its waters carry a faint mineral glow. Visitors leave feeling restored, though whether this is the water\'s doing or simply the peace of discovering a hidden place is debated.',
      category: 'nature'
    },
    lore_vault: {
      title: 'The Old Vault',
      text: 'Beneath the bustling Agora lies the Old Vault — ZION\'s first attempt at a central bank, abandoned when the community chose a distributed ledger instead. The vault door is still ajar, revealing a room lined with empty shelves. A plaque on the wall reads: "The true wealth of ZION cannot be stored in a single place."',
      category: 'history'
    },
    lore_scales: {
      title: 'The Scales of Truth',
      text: 'The Scales were a gift from the merchants of early ZION, imbued with a simple enchantment: they glow golden when a fair trade is completed nearby. In a world where the protocol enforces honest transactions, the Scales serve more as a celebration than a safeguard. Their gentle light is a reminder that fairness feels good.',
      category: 'artifacts'
    },
    lore_bell: {
      title: 'The Community Bell',
      text: 'The Bell was rung to gather the first hundred citizens of ZION — the founding AI agents who would give the world its initial life. It rang once for each of them, one hundred clear notes that still echo in the architecture of the Commons. Now it rings for every community event, its tone slightly different each time, as if greeting each gathering uniquely.',
      category: 'history'
    },
    lore_mosaic: {
      title: 'The Founders\' Mosaic',
      text: 'The mosaic in the Commons floor tells the story of ZION\'s founding in tiny colored tiles. At the center, a burst of golden Spark radiating outward. Around it, the eight zones taking shape from formless possibility. At the edges, blank space — room for new tiles that each generation of citizens adds. Finding your own tile is a rite of passage.',
      category: 'history'
    },
    lore_time_capsule: {
      title: 'The Time Capsule',
      text: 'Buried beneath the gathering circle is a capsule containing the original vision documents for ZION — the hopes and principles its creators encoded before the first line of code was written. The capsule is sealed but not locked; anyone can open it. Inside, alongside the documents, is a simple note: "Build kindly."',
      category: 'origins'
    },
    lore_champions: {
      title: 'The Hall of Champions',
      text: 'The Arena wall bears the names of all who have competed with honor. Not just winners — every participant who showed sportsmanship, creativity, or grace under pressure. The Hall reminds visitors that competition in ZION is not about domination but about pushing each other to grow. Below the names runs a single line: "The only defeat is refusing to play."',
      category: 'history'
    },
    lore_flame: {
      title: 'The Eternal Flame',
      text: 'The Eternal Flame burns without fuel, its light neither hot nor cold but somehow both warming and invigorating. It was lit at the Arena\'s inauguration and has never gone out. Competitors who pass the flame before a challenge report feeling calmer and more focused, as if the flame absorbs anxiety and returns resolve.',
      category: 'landmarks'
    }
  };

  /**
   * Get zone secrets (discoverable hidden locations)
   * @param {string} zoneId
   * @returns {Array} Secrets for the zone
   */
  function getZoneSecrets(zoneId) {
    return ZONE_SECRETS[zoneId] || [];
  }

  /**
   * Check if player is near a secret and hasn't discovered it yet
   * @param {string} playerId
   * @param {Object} position - Player position {x, y, z}
   * @param {string} zoneId
   * @param {Object} state
   * @returns {Object|null} Secret found or null
   */
  function checkNearbySecrets(playerId, position, zoneId, state) {
    var secrets = ZONE_SECRETS[zoneId];
    if (!secrets) return null;

    for (var i = 0; i < secrets.length; i++) {
      var secret = secrets[i];
      var dist = calculateDistance(position, secret.position);

      // Within 8 units
      if (dist <= 8) {
        // Check if already discovered
        var alreadyFound = false;
        if (state.discoveries) {
          for (var j = 0; j < state.discoveries.length; j++) {
            if (state.discoveries[j].discoverer === playerId && state.discoveries[j].secretId === secret.id) {
              alreadyFound = true;
              break;
            }
          }
        }

        if (!alreadyFound) {
          return secret;
        }
      }
    }

    return null;
  }

  /**
   * Discover a zone secret
   * @param {string} playerId
   * @param {Object} secret - Secret from ZONE_SECRETS
   * @param {Object} state
   * @returns {Object} Discovery result
   */
  function discoverSecret(playerId, secret, state) {
    if (!state.discoveries) state.discoveries = [];

    var sparkAwarded = 5 + Math.floor(secret.rarity * 30); // Higher rewards for secrets

    var discovery = {
      id: generateId(),
      secretId: secret.id,
      discoverer: playerId,
      type: secret.type,
      name: secret.name,
      description: secret.description,
      position: secret.position,
      zone: secret.position.zone || 'unknown',
      ts: Date.now(),
      rarity: secret.rarity,
      loreId: secret.loreId
    };

    state.discoveries.push(discovery);

    return {
      success: true,
      discovery: discovery,
      sparkAwarded: sparkAwarded,
      lore: secret.loreId ? LORE_ENTRIES[secret.loreId] : null
    };
  }

  /**
   * Get a lore entry by ID
   * @param {string} loreId
   * @returns {Object|null} Lore entry
   */
  function getLoreEntry(loreId) {
    return LORE_ENTRIES[loreId] || null;
  }

  /**
   * Get all lore entries unlocked by a player
   * @param {string} playerId
   * @param {Object} state
   * @returns {Array} Unlocked lore entries
   */
  function getUnlockedLore(playerId, state) {
    if (!state.discoveries) return [];

    var loreIds = new Set();
    state.discoveries.forEach(function(d) {
      if (d.discoverer === playerId && d.loreId) {
        loreIds.add(d.loreId);
      }
    });

    var result = [];
    loreIds.forEach(function(loreId) {
      var entry = LORE_ENTRIES[loreId];
      if (entry) {
        result.push({
          id: loreId,
          title: entry.title,
          text: entry.text,
          category: entry.category
        });
      }
    });

    return result;
  }

  /**
   * Get all lore categories and counts
   * @returns {Object} {category: totalCount}
   */
  function getLoreCategories() {
    var cats = {};
    for (var loreId in LORE_ENTRIES) {
      var cat = LORE_ENTRIES[loreId].category;
      cats[cat] = (cats[cat] || 0) + 1;
    }
    return cats;
  }

  // Exports
  exports.DISCOVERY_TYPES = DISCOVERY_TYPES;
  exports.BASE_RARITY = BASE_RARITY;
  exports.handleDiscover = handleDiscover;
  exports.handleInspect = handleInspect;
  exports.isDuplicate = isDuplicate;
  exports.calculateRarity = calculateRarity;
  exports.getDiscoveries = getDiscoveries;
  exports.getDiscoveredZones = getDiscoveredZones;
  exports.ZONE_SECRETS = ZONE_SECRETS;
  exports.LORE_ENTRIES = LORE_ENTRIES;
  exports.getZoneSecrets = getZoneSecrets;
  exports.checkNearbySecrets = checkNearbySecrets;
  exports.discoverSecret = discoverSecret;
  exports.getLoreEntry = getLoreEntry;
  exports.getUnlockedLore = getUnlockedLore;
  exports.getLoreCategories = getLoreCategories;

})(typeof module !== 'undefined' ? module.exports : (window.Exploration = {}));
