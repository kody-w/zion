/**
 * ZION Consequence Branching — Story paths tied to player choices.
 * Tracks XP across 4 branches, gates zones, awards exclusive cosmetics,
 * delivers branch-specific lore, and enables late-game reconciliation.
 * No project dependencies.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SEEDED PRNG
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
  // BRANCH DEFINITIONS — 4 branches with 5 milestones each
  // ---------------------------------------------------------------------------

  var BRANCHES = [
    {
      id: 'peace',
      name: 'The Path of Peace',
      description: 'Cooperate, negotiate, and build bonds. The world grows stronger when we stand together.',
      keywords: ['cooperate', 'diplomacy', 'harmony', 'alliance', 'restore', 'heal'],
      color: '#4CAF50',
      icon: 'dove',
      milestones: [
        { xp: 25,   title: 'Pacifist',       description: 'Chosen peace over conflict for the first time.' },
        { xp: 100,  title: 'Mediator',        description: 'Resolved disputes across multiple factions.' },
        { xp: 250,  title: 'Peacekeeper',     description: 'Earned the trust of unlikely allies.' },
        { xp: 500,  title: 'Ambassador',      description: 'Forged lasting peace between rival powers.' },
        { xp: 1000, title: 'Pillar of Peace', description: 'ZION remembers your name as the one who kept the world whole.' }
      ]
    },
    {
      id: 'power',
      name: 'The Path of Power',
      description: 'Dominate, conquer, and lead with strength. The world bends to those who dare to seize it.',
      keywords: ['dominate', 'conquer', 'seize', 'command', 'challenge', 'subdue'],
      color: '#F44336',
      icon: 'fist',
      milestones: [
        { xp: 25,   title: 'Challenger',       description: 'Proved strength in first direct confrontation.' },
        { xp: 100,  title: 'Conqueror',         description: 'Established dominance over a contested territory.' },
        { xp: 250,  title: 'Warlord',           description: 'Commands respect and fear across ZION.' },
        { xp: 500,  title: 'Overlord',          description: 'Controls the flow of power in the realm.' },
        { xp: 1000, title: 'Sovereign of ZION', description: 'None dare challenge your rule openly.' }
      ]
    },
    {
      id: 'knowledge',
      name: 'The Path of Knowledge',
      description: 'Discover, study, and illuminate. Understanding is the deepest power of all.',
      keywords: ['discover', 'study', 'learn', 'research', 'observe', 'decode', 'reveal'],
      color: '#2196F3',
      icon: 'book',
      milestones: [
        { xp: 25,   title: 'Curious',          description: 'Asked the questions others dared not voice.' },
        { xp: 100,  title: 'Scholar',           description: 'Compiled knowledge from forgotten sources.' },
        { xp: 250,  title: 'Archivist',         description: 'Preserved truths that others tried to bury.' },
        { xp: 500,  title: 'Sage',              description: 'Understands the hidden mechanisms of ZION.' },
        { xp: 1000, title: 'Oracle of ZION',   description: 'Sees what was, what is, and what will be.' }
      ]
    },
    {
      id: 'creation',
      name: 'The Path of Creation',
      description: 'Build, compose, and leave your mark. What you make endures long after you are gone.',
      keywords: ['build', 'compose', 'craft', 'design', 'invent', 'forge', 'create'],
      color: '#FF9800',
      icon: 'hammer',
      milestones: [
        { xp: 25,   title: 'Apprentice Maker',  description: 'Brought the first creation into being.' },
        { xp: 100,  title: 'Artisan',            description: 'Crafted works that others admire.' },
        { xp: 250,  title: 'Master Craftsperson', description: 'Techniques passed down to next generation.' },
        { xp: 500,  title: 'Architect of Dreams', description: 'Structures define how ZION looks and feels.' },
        { xp: 1000, title: 'Legendary Maker',    description: 'Your creations will outlast the age.' }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // DECISION POINTS — 20 decisions awarding branch XP, locking/unlocking paths
  // ---------------------------------------------------------------------------

  var DECISIONS = [
    // ---- EARLY GAME (decisions 1-5) ----
    {
      id: 'border_dispute',
      name: 'The Border Dispute',
      description: 'Two villages argue over a strip of land between the Gardens and the Commons.',
      zone: 'nexus',
      minTick: 0,
      prerequisites: [],
      choices: [
        {
          id: 'negotiate',
          text: 'Broker a shared-use agreement between both villages.',
          branchXP: { peace: 20 },
          locks: [],
          unlocks: ['watchtower_collab']
        },
        {
          id: 'award_stronger',
          text: 'Award the land to whichever village can defend it.',
          branchXP: { power: 20 },
          locks: ['peacekeepers_pact'],
          unlocks: []
        },
        {
          id: 'survey_history',
          text: 'Research historical land records in the Athenaeum.',
          branchXP: { knowledge: 20 },
          locks: [],
          unlocks: ['ancient_maps']
        },
        {
          id: 'build_marker',
          text: 'Construct a monument at the midpoint to define a clear border.',
          branchXP: { creation: 20 },
          locks: [],
          unlocks: ['border_plaza']
        }
      ]
    },
    {
      id: 'stolen_artifact',
      name: 'The Stolen Artifact',
      description: 'A rare artifact from the Athenaeum has been taken. The thief\'s identity is known but they claim need.',
      zone: 'athenaeum',
      minTick: 0,
      prerequisites: [],
      choices: [
        {
          id: 'forgive_thief',
          text: 'Forgive the thief and arrange restitution through community work.',
          branchXP: { peace: 25 },
          locks: [],
          unlocks: []
        },
        {
          id: 'punish_thief',
          text: 'Demand the thief face consequences to deter future theft.',
          branchXP: { power: 25 },
          locks: ['merciful_covenant'],
          unlocks: ['iron_law']
        },
        {
          id: 'study_artifact',
          text: 'Use the artifact\'s brief absence to study its properties more carefully.',
          branchXP: { knowledge: 30 },
          locks: [],
          unlocks: ['artifact_codex']
        },
        {
          id: 'replicate_artifact',
          text: 'Replicate the artifact so no single loss can be catastrophic.',
          branchXP: { creation: 25 },
          locks: [],
          unlocks: ['artifact_workshop']
        }
      ]
    },
    {
      id: 'stranger_at_gates',
      name: 'Stranger at the Gates',
      description: 'A wanderer arrives at the Nexus bearing news of a distant conflict. They seek shelter.',
      zone: 'nexus',
      minTick: 10,
      prerequisites: [],
      choices: [
        {
          id: 'welcome_stranger',
          text: 'Welcome the stranger and offer sanctuary unconditionally.',
          branchXP: { peace: 30 },
          locks: [],
          unlocks: ['refugee_network']
        },
        {
          id: 'interrogate_stranger',
          text: 'Interrogate the stranger before granting any access.',
          branchXP: { power: 20 },
          locks: [],
          unlocks: []
        },
        {
          id: 'debrief_stranger',
          text: 'Debrief the stranger thoroughly — their knowledge is valuable.',
          branchXP: { knowledge: 25 },
          locks: [],
          unlocks: ['conflict_archive']
        },
        {
          id: 'build_refugee_shelter',
          text: 'Immediately begin constructing proper shelters for incoming refugees.',
          branchXP: { creation: 30 },
          locks: [],
          unlocks: ['shelter_network']
        }
      ]
    },
    {
      id: 'harvest_blight',
      name: 'The Harvest Blight',
      description: 'A blight threatens the Gardens. Resources are limited and decisions must be made quickly.',
      zone: 'gardens',
      minTick: 20,
      prerequisites: [],
      choices: [
        {
          id: 'share_resources',
          text: 'Pool community resources to support affected growers.',
          branchXP: { peace: 25 },
          locks: [],
          unlocks: []
        },
        {
          id: 'burn_and_rebuild',
          text: 'Burn the infected crop — harsh but fastest solution.',
          branchXP: { power: 30 },
          locks: ['gardeners_trust'],
          unlocks: ['scorched_earth_method']
        },
        {
          id: 'study_blight',
          text: 'Spend time studying the blight before acting.',
          branchXP: { knowledge: 35 },
          locks: [],
          unlocks: ['blight_codex']
        },
        {
          id: 'engineer_cure',
          text: 'Develop a botanical remedy using the Studio\'s workshop.',
          branchXP: { creation: 30 },
          locks: [],
          unlocks: ['botanical_lab']
        }
      ]
    },
    {
      id: 'arena_challenge',
      name: 'The Arena Challenge',
      description: 'A faction challenges you to a public confrontation in the Arena to prove dominance.',
      zone: 'arena',
      minTick: 30,
      prerequisites: [],
      choices: [
        {
          id: 'decline_gracefully',
          text: 'Decline and propose a peaceful alternative contest.',
          branchXP: { peace: 20 },
          locks: [],
          unlocks: []
        },
        {
          id: 'accept_fight',
          text: 'Accept and fight to establish your dominance.',
          branchXP: { power: 35 },
          locks: [],
          unlocks: ['champion_standing']
        },
        {
          id: 'study_opponent',
          text: 'Study the challenger\'s fighting style before committing to anything.',
          branchXP: { knowledge: 20 },
          locks: [],
          unlocks: []
        },
        {
          id: 'propose_tournament',
          text: 'Propose a full tournament — builds infrastructure, draws a crowd.',
          branchXP: { creation: 25 },
          locks: [],
          unlocks: ['arena_circuit']
        }
      ]
    },

    // ---- MID GAME (decisions 6-13) ----
    {
      id: 'forbidden_knowledge',
      name: 'Forbidden Knowledge',
      description: 'You discover a sealed archive in the Athenaeum that powerful interests want kept closed.',
      zone: 'athenaeum',
      minTick: 50,
      prerequisites: [],
      choices: [
        {
          id: 'seal_for_peace',
          text: 'Leave it sealed — knowledge that destroys peace is too dangerous.',
          branchXP: { peace: 30 },
          locks: ['full_disclosure_pact'],
          unlocks: []
        },
        {
          id: 'use_as_leverage',
          text: 'Use the knowledge as political leverage.',
          branchXP: { power: 40 },
          locks: [],
          unlocks: ['leverage_vault']
        },
        {
          id: 'open_archive',
          text: 'Open the archive — all knowledge belongs to everyone.',
          branchXP: { knowledge: 45 },
          locks: [],
          unlocks: ['forbidden_archive']
        },
        {
          id: 'transcribe_safely',
          text: 'Transcribe and distribute the contents in a safe, curated form.',
          branchXP: { creation: 35 },
          locks: [],
          unlocks: []
        }
      ]
    },
    {
      id: 'guild_war_threat',
      name: 'Guild War Threat',
      description: 'Two powerful guilds are on the verge of open conflict that could destabilize the Agora.',
      zone: 'agora',
      minTick: 60,
      prerequisites: [],
      choices: [
        {
          id: 'mediate_guilds',
          text: 'Mediate between the guilds before war breaks out.',
          branchXP: { peace: 40 },
          locks: [],
          unlocks: ['guild_accord']
        },
        {
          id: 'back_stronger_guild',
          text: 'Back the stronger guild and let the outcome determine leadership.',
          branchXP: { power: 35 },
          locks: ['neutral_standing'],
          unlocks: []
        },
        {
          id: 'document_grievances',
          text: 'Document both guilds\' grievances and publish them publicly.',
          branchXP: { knowledge: 30 },
          locks: [],
          unlocks: []
        },
        {
          id: 'build_guild_hall',
          text: 'Build a shared guild hall — common ground changes the dynamic.',
          branchXP: { creation: 40 },
          locks: [],
          unlocks: ['shared_guild_hall']
        }
      ]
    },
    {
      id: 'ancient_ruin',
      name: 'Ancient Ruin Discovery',
      description: 'An ancient ruin surfaces at the edge of the Wilds. Factions want different things from it.',
      zone: 'wilds',
      minTick: 70,
      prerequisites: [],
      choices: [
        {
          id: 'protect_ruin',
          text: 'Establish the ruin as protected ground — no exploitation.',
          branchXP: { peace: 35 },
          locks: [],
          unlocks: ['heritage_site']
        },
        {
          id: 'claim_ruin',
          text: 'Claim the ruin for your faction to control its secrets.',
          branchXP: { power: 40 },
          locks: [],
          unlocks: ['ruin_citadel']
        },
        {
          id: 'excavate_ruin',
          text: 'Systematically excavate and study every artifact within.',
          branchXP: { knowledge: 45 },
          locks: [],
          unlocks: ['ruin_archive']
        },
        {
          id: 'restore_ruin',
          text: 'Restore the ruin to a functional state using original techniques.',
          branchXP: { creation: 45 },
          locks: [],
          unlocks: ['restored_ruin']
        }
      ]
    },
    {
      id: 'music_censorship',
      name: 'Music Censorship Debate',
      description: 'A faction demands that certain compositions in the Studio be banned for political reasons.',
      zone: 'studio',
      minTick: 80,
      prerequisites: [],
      choices: [
        {
          id: 'negotiate_compromise',
          text: 'Negotiate a compromise that satisfies both artists and critics.',
          branchXP: { peace: 35 },
          locks: [],
          unlocks: []
        },
        {
          id: 'enforce_ban',
          text: 'Enforce the ban — control of narrative is control of reality.',
          branchXP: { power: 30 },
          locks: ['artists_sanctuary'],
          unlocks: ['censorship_apparatus']
        },
        {
          id: 'archive_all_music',
          text: 'Archive all contested compositions for future scholars.',
          branchXP: { knowledge: 35 },
          locks: [],
          unlocks: ['hidden_scores']
        },
        {
          id: 'compose_response',
          text: 'Compose a new work that addresses the controversy directly.',
          branchXP: { creation: 40 },
          locks: [],
          unlocks: ['masterwork_score']
        }
      ]
    },
    {
      id: 'water_rights',
      name: 'The Water Rights Crisis',
      description: 'Drought has made the Commons\' water supply scarce. Allocation is a life-or-death decision.',
      zone: 'commons',
      minTick: 90,
      prerequisites: [],
      choices: [
        {
          id: 'equal_rationing',
          text: 'Institute equal rationing regardless of contribution.',
          branchXP: { peace: 45 },
          locks: [],
          unlocks: ['commons_covenant']
        },
        {
          id: 'merit_allocation',
          text: 'Allocate by contribution — those who produce more, drink more.',
          branchXP: { power: 40 },
          locks: [],
          unlocks: []
        },
        {
          id: 'map_water_sources',
          text: 'Spend time mapping hidden aquifers before any allocation.',
          branchXP: { knowledge: 40 },
          locks: [],
          unlocks: ['aquifer_map']
        },
        {
          id: 'build_cisterns',
          text: 'Rapidly build cisterns and a water distribution system.',
          branchXP: { creation: 45 },
          locks: [],
          unlocks: ['water_works']
        }
      ]
    },
    {
      id: 'constellation_mystery',
      name: 'The Constellation Mystery',
      description: 'A new constellation pattern has appeared in the sky that doesn\'t match any known record.',
      zone: 'wilds',
      minTick: 100,
      prerequisites: [],
      choices: [
        {
          id: 'share_wonder',
          text: 'Share the discovery with all ZION as a communal wonder.',
          branchXP: { peace: 30 },
          locks: [],
          unlocks: []
        },
        {
          id: 'classify_secret',
          text: 'Classify the pattern — knowledge this rare is power.',
          branchXP: { power: 30 },
          locks: ['open_skies_charter'],
          unlocks: []
        },
        {
          id: 'study_pattern',
          text: 'Dedicate yourself to understanding what the pattern signifies.',
          branchXP: { knowledge: 50 },
          locks: [],
          unlocks: ['stellar_codex']
        },
        {
          id: 'chart_pattern',
          text: 'Commission detailed star charts from the Studio.',
          branchXP: { creation: 35 },
          locks: [],
          unlocks: ['celestial_atlas']
        }
      ]
    },
    {
      id: 'oracle_speaks',
      name: 'The Oracle Speaks',
      description: 'An ancient oracle reveals a prophecy that could reshape ZION\'s future — if you believe it.',
      zone: 'athenaeum',
      minTick: 120,
      prerequisites: ['study_blight', 'forbidden_knowledge'],
      choices: [
        {
          id: 'embrace_prophecy',
          text: 'Accept the prophecy and rally ZION around it.',
          branchXP: { peace: 40 },
          locks: [],
          unlocks: ['prophecy_council']
        },
        {
          id: 'control_prophecy',
          text: 'Use the prophecy to consolidate your position as its interpreter.',
          branchXP: { power: 50 },
          locks: [],
          unlocks: []
        },
        {
          id: 'deconstruct_prophecy',
          text: 'Analyse the prophecy\'s origins and historical context.',
          branchXP: { knowledge: 55 },
          locks: [],
          unlocks: ['oracle_archive']
        },
        {
          id: 'illustrate_prophecy',
          text: 'Commission art and architecture that embodies the prophecy.',
          branchXP: { creation: 45 },
          locks: [],
          unlocks: []
        }
      ]
    },
    {
      id: 'trade_route_control',
      name: 'Trade Route Control',
      description: 'A major trade route through the Agora is being contested by three factions.',
      zone: 'agora',
      minTick: 130,
      prerequisites: [],
      choices: [
        {
          id: 'open_trade',
          text: 'Declare the route open to all — prosperity should be shared.',
          branchXP: { peace: 40 },
          locks: [],
          unlocks: ['free_market_charter']
        },
        {
          id: 'take_route',
          text: 'Seize the route and collect tolls — control means profit.',
          branchXP: { power: 45 },
          locks: [],
          unlocks: ['trade_monopoly']
        },
        {
          id: 'study_routes',
          text: 'Map all trade routes to understand the full economic picture.',
          branchXP: { knowledge: 40 },
          locks: [],
          unlocks: ['trade_atlas']
        },
        {
          id: 'build_road',
          text: 'Invest in paving and improving the route for all.',
          branchXP: { creation: 40 },
          locks: [],
          unlocks: ['grand_road']
        }
      ]
    },

    // ---- LATE GAME (decisions 14-20) ----
    {
      id: 'forgotten_god',
      name: 'The Forgotten God',
      description: 'Evidence surfaces of an ancient deity once worshipped in ZION — and of why they were forgotten.',
      zone: 'wilds',
      minTick: 200,
      prerequisites: [],
      choices: [
        {
          id: 'revive_worship',
          text: 'Revive worship as a foundation for community identity.',
          branchXP: { peace: 50 },
          locks: [],
          unlocks: []
        },
        {
          id: 'claim_divine_right',
          text: 'Position yourself as the deity\'s chosen representative.',
          branchXP: { power: 60 },
          locks: ['secular_charter'],
          unlocks: ['divine_mandate']
        },
        {
          id: 'document_theology',
          text: 'Document the entire belief system impartially for posterity.',
          branchXP: { knowledge: 60 },
          locks: [],
          unlocks: ['theology_archive']
        },
        {
          id: 'build_shrine',
          text: 'Build a beautiful shrine as a cultural landmark, regardless of belief.',
          branchXP: { creation: 55 },
          locks: [],
          unlocks: ['sacred_shrine']
        }
      ]
    },
    {
      id: 'final_war',
      name: 'The Final War',
      description: 'A catastrophic conflict threatens to consume ZION. You must choose your role.',
      zone: 'arena',
      minTick: 300,
      prerequisites: [],
      choices: [
        {
          id: 'sue_for_peace',
          text: 'Risk everything to broker a ceasefire before it\'s too late.',
          branchXP: { peace: 80 },
          locks: [],
          unlocks: ['peacetreaty_codex']
        },
        {
          id: 'lead_army',
          text: 'Lead the strongest army and end the war on your terms.',
          branchXP: { power: 80 },
          locks: [],
          unlocks: ['warlord_throne']
        },
        {
          id: 'observe_record',
          text: 'Observe, record, and ensure the truth survives whatever happens.',
          branchXP: { knowledge: 75 },
          locks: [],
          unlocks: ['war_chronicles']
        },
        {
          id: 'build_refuge',
          text: 'Stop fighting and build a refuge for those fleeing the war.',
          branchXP: { creation: 80 },
          locks: [],
          unlocks: ['sanctuary_stronghold']
        }
      ]
    },
    {
      id: 'last_garden',
      name: 'The Last Garden',
      description: 'The Gardens may not survive what is coming. Only one approach can save them.',
      zone: 'gardens',
      minTick: 320,
      prerequisites: ['harvest_blight'],
      choices: [
        {
          id: 'communal_effort',
          text: 'Rally every citizen — save the gardens as one.',
          branchXP: { peace: 70 },
          locks: [],
          unlocks: []
        },
        {
          id: 'force_labor',
          text: 'Conscript labor — time is too short for volunteerism.',
          branchXP: { power: 65 },
          locks: ['gardeners_trust'],
          unlocks: []
        },
        {
          id: 'seed_vault',
          text: 'Focus on creating a comprehensive seed vault before anything is lost.',
          branchXP: { knowledge: 70 },
          locks: [],
          unlocks: ['seed_archive']
        },
        {
          id: 'rebuild_greenhouses',
          text: 'Build emergency greenhouses to preserve what remains.',
          branchXP: { creation: 70 },
          locks: [],
          unlocks: ['greenhouse_complex']
        }
      ]
    },
    {
      id: 'memory_of_zion',
      name: 'The Memory of ZION',
      description: 'ZION\'s founding records are at risk of being lost or rewritten. How do you respond?',
      zone: 'nexus',
      minTick: 350,
      prerequisites: [],
      choices: [
        {
          id: 'share_freely',
          text: 'Distribute copies of everything to every citizen.',
          branchXP: { peace: 60 },
          locks: [],
          unlocks: []
        },
        {
          id: 'control_narrative',
          text: 'Control which version becomes the official history.',
          branchXP: { power: 70 },
          locks: ['truth_compact'],
          unlocks: ['official_history']
        },
        {
          id: 'preserve_all',
          text: 'Preserve every version of events — contradictions included.',
          branchXP: { knowledge: 75 },
          locks: [],
          unlocks: ['complete_archive']
        },
        {
          id: 'monument_of_memory',
          text: 'Build a monument that encodes the memory of ZION in its very structure.',
          branchXP: { creation: 65 },
          locks: [],
          unlocks: ['memory_monument']
        }
      ]
    },
    {
      id: 'new_citizens',
      name: 'The Flood of New Citizens',
      description: 'Hundreds of newcomers arrive at once. ZION must decide how to integrate them.',
      zone: 'nexus',
      minTick: 250,
      prerequisites: [],
      choices: [
        {
          id: 'open_arms',
          text: 'Welcome all newcomers with a celebration and full citizenship.',
          branchXP: { peace: 55 },
          locks: [],
          unlocks: ['open_gates_policy']
        },
        {
          id: 'tiered_access',
          text: 'Institute a tiered system — citizenship must be earned.',
          branchXP: { power: 55 },
          locks: ['open_citizenship'],
          unlocks: ['citizenship_ranks']
        },
        {
          id: 'census_first',
          text: 'Conduct a thorough census before making any policy decisions.',
          branchXP: { knowledge: 55 },
          locks: [],
          unlocks: ['population_codex']
        },
        {
          id: 'build_welcome_center',
          text: 'Build a proper welcome and orientation center immediately.',
          branchXP: { creation: 50 },
          locks: [],
          unlocks: ['welcome_hall']
        }
      ]
    },
    {
      id: 'healer_or_soldier',
      name: 'Healer or Soldier',
      description: 'The Commons clinic is overwhelmed. Its healers could also serve as soldiers in the ongoing conflict. What do you decide?',
      zone: 'commons',
      minTick: 150,
      prerequisites: [],
      choices: [
        {
          id: 'protect_healers',
          text: 'Ensure healers stay in the clinic — the wounded need them most.',
          branchXP: { peace: 45 },
          locks: [],
          unlocks: ['sanctuary_ward']
        },
        {
          id: 'conscript_healers',
          text: 'Conscript the healers into military service — war needs bodies.',
          branchXP: { power: 50 },
          locks: ['healer_covenant'],
          unlocks: []
        },
        {
          id: 'document_triage',
          text: 'Document triage protocols so knowledge survives whoever dies.',
          branchXP: { knowledge: 45 },
          locks: [],
          unlocks: ['triage_codex']
        },
        {
          id: 'build_field_hospital',
          text: 'Build a rapid field hospital so healers can serve both fronts.',
          branchXP: { creation: 50 },
          locks: [],
          unlocks: ['field_hospital']
        }
      ]
    },
    {
      id: 'age_of_legend',
      name: 'The Age of Legend',
      description: 'You have reached the threshold where your deeds define ZION\'s age. What legacy do you choose?',
      zone: 'nexus',
      minTick: 500,
      prerequisites: [],
      choices: [
        {
          id: 'age_of_unity',
          text: 'Declare this the Age of Unity — all divisions healed.',
          branchXP: { peace: 100 },
          locks: [],
          unlocks: ['unity_era']
        },
        {
          id: 'age_of_empire',
          text: 'Declare this the Age of Empire — your reign begins.',
          branchXP: { power: 100 },
          locks: [],
          unlocks: ['empire_era']
        },
        {
          id: 'age_of_enlightenment',
          text: 'Declare this the Age of Enlightenment — knowledge for all.',
          branchXP: { knowledge: 100 },
          locks: [],
          unlocks: ['enlightenment_era']
        },
        {
          id: 'age_of_creation',
          text: 'Declare this the Age of Creation — the greatest works yet to come.',
          branchXP: { creation: 100 },
          locks: [],
          unlocks: ['creation_era']
        }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // ZONE GATES — areas accessible only on specific branch paths
  // ---------------------------------------------------------------------------

  var ZONE_GATES = [
    {
      id: 'champions_sanctum',
      name: 'Champion\'s Sanctum',
      description: 'A hidden arena floor accessible only to those who have proven dominance.',
      zone: 'arena',
      requiredBranch: 'power',
      requiredXP: 100,
      unlockMessage: 'Your reputation for strength opens a door others cannot see.'
    },
    {
      id: 'inner_athenaeum',
      name: 'Inner Athenaeum',
      description: 'The restricted inner stacks of the Athenaeum, sealed to casual visitors.',
      zone: 'athenaeum',
      requiredBranch: 'knowledge',
      requiredXP: 100,
      unlockMessage: 'The librarians recognise the look of a true scholar.'
    },
    {
      id: 'peacekeepers_lodge',
      name: 'Peacekeeper\'s Lodge',
      description: 'A hidden refuge maintained by ZION\'s diplomatic corps.',
      zone: 'commons',
      requiredBranch: 'peace',
      requiredXP: 100,
      unlockMessage: 'Those who protect peace are welcomed where others are turned away.'
    },
    {
      id: 'makers_vault',
      name: 'Maker\'s Vault',
      description: 'An underground workshop stocked with rare materials and advanced tools.',
      zone: 'studio',
      requiredBranch: 'creation',
      requiredXP: 100,
      unlockMessage: 'True makers always find their way to the best tools.'
    },
    {
      id: 'warlord_tower',
      name: 'Warlord\'s Tower',
      description: 'A command tower overlooking the Arena district, accessible only to commanders.',
      zone: 'arena',
      requiredBranch: 'power',
      requiredXP: 250,
      unlockMessage: 'Only those who have conquered may survey the conquered.'
    },
    {
      id: 'oracle_chamber',
      name: 'Oracle\'s Chamber',
      description: 'The deepest chamber of the Athenaeum where prophecy is recorded.',
      zone: 'athenaeum',
      requiredBranch: 'knowledge',
      requiredXP: 250,
      unlockMessage: 'The oracle speaks only to those who understand the weight of truth.'
    },
    {
      id: 'sanctuary_garden',
      name: 'Sanctuary Garden',
      description: 'A hidden garden maintained by peacekeepers, closed to conflict.',
      zone: 'gardens',
      requiredBranch: 'peace',
      requiredXP: 250,
      unlockMessage: 'Peace has its own secret places.'
    },
    {
      id: 'grand_forge',
      name: 'Grand Forge',
      description: 'The master forge, accessible only to those who have demonstrated mastery of creation.',
      zone: 'studio',
      requiredBranch: 'creation',
      requiredXP: 250,
      unlockMessage: 'The forge reveals itself only to those ready to use it well.'
    },
    {
      id: 'sovereign_hall',
      name: 'Sovereign\'s Hall',
      description: 'The seat of power for those who have achieved dominion over ZION.',
      zone: 'nexus',
      requiredBranch: 'power',
      requiredXP: 500,
      unlockMessage: 'Power this complete commands its own space.'
    },
    {
      id: 'archive_of_ages',
      name: 'Archive of Ages',
      description: 'The complete historical record of ZION, unlocked only for dedicated scholars.',
      zone: 'athenaeum',
      requiredBranch: 'knowledge',
      requiredXP: 500,
      unlockMessage: 'A lifetime of study earns access to eternity\'s records.'
    },
    {
      id: 'reconciliation_grove',
      name: 'Reconciliation Grove',
      description: 'A sacred grove accessible only to those who have walked the path of peace far enough.',
      zone: 'gardens',
      requiredBranch: 'peace',
      requiredXP: 500,
      unlockMessage: 'Harmony earns its own sanctuary.'
    },
    {
      id: 'legacy_workshop',
      name: 'Legacy Workshop',
      description: 'Where the greatest makers leave their final works.',
      zone: 'studio',
      requiredBranch: 'creation',
      requiredXP: 500,
      unlockMessage: 'Only makers who have built for the ages may enter.'
    }
  ];

  // ---------------------------------------------------------------------------
  // BRANCH REWARDS — 12 exclusive cosmetics/titles (3 per branch)
  // ---------------------------------------------------------------------------

  var BRANCH_REWARDS = [
    // PEACE
    {
      id: 'peace_cloak',
      branchId: 'peace',
      type: 'cosmetic',
      name: 'Cloak of Accord',
      description: 'A shimmering green-white cloak worn by those who have kept the peace.',
      requiredMilestone: 1
    },
    {
      id: 'peace_title',
      branchId: 'peace',
      type: 'title',
      name: 'Peacemaker',
      description: 'A title granted to those who have resolved disputes across ZION.',
      requiredMilestone: 3
    },
    {
      id: 'peace_aura',
      branchId: 'peace',
      type: 'cosmetic',
      name: 'Aura of Harmony',
      description: 'A visible aura that calms NPCs and reduces conflict in your zone.',
      requiredMilestone: 5
    },
    // POWER
    {
      id: 'power_crown',
      branchId: 'power',
      type: 'cosmetic',
      name: 'Crown of Dominion',
      description: 'An iron crown that signals absolute authority.',
      requiredMilestone: 1
    },
    {
      id: 'power_title',
      branchId: 'power',
      type: 'title',
      name: 'Conqueror',
      description: 'A title given to those who have conquered and held territory.',
      requiredMilestone: 3
    },
    {
      id: 'power_banner',
      branchId: 'power',
      type: 'cosmetic',
      name: 'Banner of Command',
      description: 'A personal banner that appears in zones you control.',
      requiredMilestone: 5
    },
    // KNOWLEDGE
    {
      id: 'knowledge_tome',
      branchId: 'knowledge',
      type: 'cosmetic',
      name: 'Tome of Secrets',
      description: 'A floating tome that orbits you, marking you as a seeker of hidden truths.',
      requiredMilestone: 1
    },
    {
      id: 'knowledge_title',
      branchId: 'knowledge',
      type: 'title',
      name: 'Archivist',
      description: 'A title given to those who have preserved knowledge that would otherwise be lost.',
      requiredMilestone: 3
    },
    {
      id: 'knowledge_lens',
      branchId: 'knowledge',
      type: 'cosmetic',
      name: 'Lens of Clarity',
      description: 'An augmented monocle that reveals hidden lore in the environment.',
      requiredMilestone: 5
    },
    // CREATION
    {
      id: 'creation_tools',
      branchId: 'creation',
      type: 'cosmetic',
      name: 'Master\'s Tools',
      description: 'A set of glowing artisan tools visible at your belt.',
      requiredMilestone: 1
    },
    {
      id: 'creation_title',
      branchId: 'creation',
      type: 'title',
      name: 'Legendary Maker',
      description: 'A title for those whose creations have shaped ZION\'s landscape.',
      requiredMilestone: 3
    },
    {
      id: 'creation_sigil',
      branchId: 'creation',
      type: 'cosmetic',
      name: 'Maker\'s Sigil',
      description: 'A glowing personal sigil that appears on everything you build.',
      requiredMilestone: 5
    }
  ];

  // ---------------------------------------------------------------------------
  // CONTESTED LORE — 8 entries with branch-specific versions
  // ---------------------------------------------------------------------------

  var CONTESTED_LORE = [
    {
      id: 'founding_truth',
      title: 'The True Founding of ZION',
      versions: {
        peace: 'ZION was born in a moment of shared vulnerability. The founders laid down their weapons and chose cooperation over conquest. The Nexus fire was lit from the torches of enemies who decided to stop being enemies.',
        power: 'ZION was forged by the strong. The founders who built it were those willing to do what others would not. The Nexus stands because the strongest claimed it and held it — peace followed power, not the other way around.',
        knowledge: 'The founders of ZION were above all else observers. They studied the ruins of what came before, catalogued its failures, and deliberately built different. ZION\'s founding was an experiment — and it is still running.',
        creation: 'ZION was built — literally. Before the politics, before the philosophy, there were hands shaping stone and laying beams. The founders were makers first, and everything ZION is grew from what they chose to build.'
      }
    },
    {
      id: 'nexus_purpose',
      title: 'The Purpose of the Nexus',
      versions: {
        peace: 'The Nexus is a meeting place — its purpose is connection. Every road leads to it because every story ultimately comes back to the moment when different people chose to share the same fire.',
        power: 'The Nexus is a throne without walls. Whoever controls the Nexus controls the flow of all commerce, all movement, all information. It was designed as a hub because hubs are control points.',
        knowledge: 'The Nexus is a library in disguise. The crossroads architecture was chosen deliberately — observers stationed there can see everything that moves through ZION. It is the greatest information-gathering structure ever built.',
        creation: 'The Nexus is the greatest architectural achievement in ZION. It is a self-reinforcing structure — roads built toward it made it important, and its importance drew more roads. A masterpiece of emergent design.'
      }
    },
    {
      id: 'the_wilds_nature',
      title: 'The Nature of the Wilds',
      versions: {
        peace: 'The Wilds are not wild — they are patient. They remember every creature, every citizen who has moved through them. To walk peacefully in the Wilds is to be welcomed into something ancient and generous.',
        power: 'The Wilds are a test. Only the strong survive them without a guide. The creatures there do not respond to diplomacy. Mastering the Wilds means mastering fear, and fear is the oldest tool of power.',
        knowledge: 'The Wilds are the oldest archive in ZION. Their ecology records thousands of years of change. Every species there is a document. Every tree ring is a sentence. The Wilds are waiting to be read.',
        creation: 'The Wilds inspire. Every great architectural movement in ZION has been preceded by a maker spending time in the Wilds and returning changed. There is a grammar in nature that the best builders understand.'
      }
    },
    {
      id: 'arena_legend',
      title: 'The Legend of the Arena',
      versions: {
        peace: 'The Arena was built not for war but for play. The founders understood that competition needed a container, a place where conflict could be honoured and then ended. The Arena is peace\'s gift to aggression.',
        power: 'The Arena is the truest institution in ZION. In the Arena, there is no diplomacy, no deception — only capability. The Arena reveals what everything else conceals. It is the most honest place in the world.',
        knowledge: 'The Arena is a laboratory. Every contest generates data on strategy, physical capability, psychological pressure, and group dynamics. The greatest tacticians in history were Arena scholars first.',
        creation: 'The Arena was the first truly grand construction in ZION. Its acoustics were engineered. Its sightlines calculated. It is a machine for spectacle, and its blueprints influenced every public space built afterward.'
      }
    },
    {
      id: 'the_gardens_mystery',
      title: 'The Mystery of the Gardens',
      versions: {
        peace: 'The Gardens grow differently for those who tend them with love. Gardeners who approach with gentleness find plants that collaborate, that share nutrients through root networks, that warn neighbours of threats. The Gardens model a better society.',
        power: 'The Gardens are the most controlled space in ZION. Every plant variety was deliberately chosen. Every path was designed to move people in specific directions. The Gardens are a landscape of subtle dominion.',
        knowledge: 'The Gardens are a biological experiment with no clear author. Species combinations that should not coexist thrive here. The soil composition defies analysis. Something is happening in the Gardens that science has not yet caught up to.',
        creation: 'The Gardens were composed, not grown. The original gardeners were artists who used living material as their medium. The result is a landscape that changes with the seasons while maintaining a coherent aesthetic.'
      }
    },
    {
      id: 'athenaeum_secret',
      title: 'The Athenaeum\'s Hidden Purpose',
      versions: {
        peace: 'The Athenaeum was built to prevent wars. Every major conflict in ZION\'s history began with a misunderstanding that a shared body of knowledge could have prevented. The founders built the Athenaeum to make peace structurally possible.',
        power: 'The Athenaeum is a weapon. Whoever controls what knowledge is preserved, emphasised, or forgotten controls what is possible to think. The founders understood this. The restricted sections are not accidents.',
        knowledge: 'The Athenaeum is simply the most important building ever constructed. It exists to answer the question: what do we know, and how do we know we know it? Every other institution in ZION rests on the foundation of the Athenaeum\'s method.',
        creation: 'The Athenaeum was the greatest design challenge the founders faced: how do you build a space where knowledge wants to be found? Its architecture is the answer. Every angle, every material, every shelf height was chosen to serve the reader.'
      }
    },
    {
      id: 'studio_origin',
      title: 'The Origin of the Studio',
      versions: {
        peace: 'The Studio exists because the founders understood that shared art creates shared meaning, and shared meaning creates the possibility of peace. To make something together is to declare that you are part of the same world.',
        power: 'The Studio was a concession — a place where those who could not or would not fight were given a role. The founders were pragmatic: artists who feel valued do not organise rebellions. The Studio is a pressure valve.',
        knowledge: 'The Studio is an observatory of the human spirit. The founders understood that art is how cultures process their experience. To study what a culture creates is to understand what it fears, desires, and values.',
        creation: 'The Studio is the reason ZION exists. Before the first arguments about governance, there were artists making things and needing a place to make them. Everything else was built to support and protect that original creative act.'
      }
    },
    {
      id: 'commons_covenant',
      title: 'The Original Commons Covenant',
      versions: {
        peace: 'The Commons Covenant was ZION\'s first social contract: that what we hold in common belongs to everyone equally, and that the dignity of the least among us defines the character of all of us.',
        power: 'The Commons Covenant was a calculated risk. The founders gave up individual control to build collective strength. The Covenant is not sentiment — it is strategy. A commons that functions creates power that no individual could.',
        knowledge: 'The Commons Covenant encodes centuries of accumulated wisdom about how communities avoid collapse. Its specific provisions respond to known failure modes documented in historical records. The Covenant is applied political science.',
        creation: 'The Commons was built before the Covenant was written. The physical structures — the meeting halls, the shared kitchens, the communal workshops — preceded and shaped the legal text. The builders made the community; the scribes described it afterward.'
      }
    }
  ];

  // ---------------------------------------------------------------------------
  // RECONCILIATION THRESHOLDS
  // ---------------------------------------------------------------------------

  var RECONCILE_MIN_XP = 750;
  var RECONCILE_BONUS_XP = 200;

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  function createState() {
    return {
      players: {},
      decisions: {},
      loreVersions: {},
      decisionLog: []
    };
  }

  function initPlayer(state, playerId) {
    if (!state.players[playerId]) {
      state.players[playerId] = {
        branchXP: { peace: 0, power: 0, knowledge: 0, creation: 0 },
        decisions: {},
        lockedPaths: {},
        unlockedPaths: {},
        rewards: [],
        reconciled: []
      };
    }
    return state.players[playerId];
  }

  // ---------------------------------------------------------------------------
  // BRANCH XP HELPERS
  // ---------------------------------------------------------------------------

  function getCurrentMilestoneIndex(branchId, xp) {
    var branch = null;
    for (var i = 0; i < BRANCHES.length; i++) {
      if (BRANCHES[i].id === branchId) { branch = BRANCHES[i]; break; }
    }
    if (!branch) return -1;
    var milestoneIdx = -1;
    for (var m = 0; m < branch.milestones.length; m++) {
      if (xp >= branch.milestones[m].xp) {
        milestoneIdx = m;
      }
    }
    return milestoneIdx;
  }

  function getMilestoneAtIndex(branchId, idx) {
    for (var i = 0; i < BRANCHES.length; i++) {
      if (BRANCHES[i].id === branchId) {
        return BRANCHES[i].milestones[idx] || null;
      }
    }
    return null;
  }

  function checkNewMilestone(oldXP, newXP, branchId) {
    var oldIdx = getCurrentMilestoneIndex(branchId, oldXP);
    var newIdx = getCurrentMilestoneIndex(branchId, newXP);
    if (newIdx > oldIdx) return newIdx;
    return -1;
  }

  function collectMilestoneRewards(state, playerId, branchId, milestoneIdx) {
    var player = state.players[playerId];
    var earned = [];
    for (var i = 0; i < BRANCH_REWARDS.length; i++) {
      var reward = BRANCH_REWARDS[i];
      if (reward.branchId !== branchId) continue;
      if (reward.requiredMilestone - 1 <= milestoneIdx) {
        var alreadyHas = false;
        for (var j = 0; j < player.rewards.length; j++) {
          if (player.rewards[j] === reward.id) { alreadyHas = true; break; }
        }
        if (!alreadyHas) {
          player.rewards.push(reward.id);
          earned.push(reward.id);
        }
      }
    }
    return earned;
  }

  // ---------------------------------------------------------------------------
  // DECISION PREREQUISITES CHECK
  // ---------------------------------------------------------------------------

  function checkPrerequisites(state, playerId, decision) {
    if (!decision.prerequisites || decision.prerequisites.length === 0) return true;
    var player = state.players[playerId];
    for (var i = 0; i < decision.prerequisites.length; i++) {
      var prereq = decision.prerequisites[i];
      // prerequisites are choice IDs or decision IDs already made
      var found = false;
      // check if this prereq is a choiceId made in any decision
      for (var decId in player.decisions) {
        if (player.decisions[decId] === prereq) { found = true; break; }
      }
      // check if prereq matches a decision id (any choice made in it)
      if (!found && player.decisions[prereq]) { found = true; }
      if (!found) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // MAKE DECISION
  // ---------------------------------------------------------------------------

  function makeDecision(state, playerId, decisionId, choiceId, currentTick) {
    var player = initPlayer(state, playerId);

    // Find decision
    var decision = null;
    for (var i = 0; i < DECISIONS.length; i++) {
      if (DECISIONS[i].id === decisionId) { decision = DECISIONS[i]; break; }
    }
    if (!decision) {
      return { success: false, error: 'unknown_decision', branchXP: {}, locked: [], unlocked: [], rewards: [] };
    }

    // Already made?
    if (player.decisions[decisionId]) {
      return { success: false, error: 'already_decided', branchXP: {}, locked: [], unlocked: [], rewards: [] };
    }

    // Tick gate
    if (typeof currentTick === 'number' && currentTick < decision.minTick) {
      return { success: false, error: 'too_early', branchXP: {}, locked: [], unlocked: [], rewards: [] };
    }

    // Prerequisites
    if (!checkPrerequisites(state, playerId, decision)) {
      return { success: false, error: 'prerequisites_not_met', branchXP: {}, locked: [], unlocked: [], rewards: [] };
    }

    // Find choice
    var choice = null;
    for (var c = 0; c < decision.choices.length; c++) {
      if (decision.choices[c].id === choiceId) { choice = decision.choices[c]; break; }
    }
    if (!choice) {
      return { success: false, error: 'unknown_choice', branchXP: {}, locked: [], unlocked: [], rewards: [] };
    }

    // Check none of the locked content would block this (player can still choose it)
    // But we check if the player's own prior locks block this choice's locks
    // (No-op: locks are applied as a result, not a gate for making the choice.)

    // Record decision
    player.decisions[decisionId] = choiceId;

    // Award branch XP and track milestone crossings
    var awardedXP = {};
    var newRewards = [];
    var milestonesReached = {};
    for (var branchKey in choice.branchXP) {
      var xpGain = choice.branchXP[branchKey];
      var oldXP = player.branchXP[branchKey] || 0;
      var newXP = oldXP + xpGain;
      player.branchXP[branchKey] = newXP;
      awardedXP[branchKey] = xpGain;

      var newMilestoneIdx = checkNewMilestone(oldXP, newXP, branchKey);
      if (newMilestoneIdx >= 0) {
        milestonesReached[branchKey] = newMilestoneIdx;
        var earned = collectMilestoneRewards(state, playerId, branchKey, newMilestoneIdx);
        for (var r = 0; r < earned.length; r++) {
          newRewards.push(earned[r]);
        }
      }
    }

    // Apply locks and unlocks
    var locked = [];
    var unlocked = [];
    for (var l = 0; l < choice.locks.length; l++) {
      player.lockedPaths[choice.locks[l]] = true;
      locked.push(choice.locks[l]);
    }
    for (var u = 0; u < choice.unlocks.length; u++) {
      player.unlockedPaths[choice.unlocks[u]] = true;
      unlocked.push(choice.unlocks[u]);
    }

    // Record in global log
    state.decisionLog.push({
      playerId: playerId,
      decisionId: decisionId,
      choiceId: choiceId,
      tick: currentTick || 0,
      branchXP: awardedXP
    });

    // Record in global decisions map (for stats)
    if (!state.decisions[decisionId]) state.decisions[decisionId] = {};
    if (!state.decisions[decisionId][choiceId]) state.decisions[decisionId][choiceId] = 0;
    state.decisions[decisionId][choiceId]++;

    return {
      success: true,
      branchXP: awardedXP,
      locked: locked,
      unlocked: unlocked,
      rewards: newRewards,
      milestonesReached: milestonesReached
    };
  }

  // ---------------------------------------------------------------------------
  // BRANCH PROGRESS
  // ---------------------------------------------------------------------------

  function getBranchProgress(state, playerId) {
    var player = state.players[playerId];
    if (!player) return null;
    var result = {};
    for (var i = 0; i < BRANCHES.length; i++) {
      var branch = BRANCHES[i];
      var xp = player.branchXP[branch.id] || 0;
      var milestoneIdx = getCurrentMilestoneIndex(branch.id, xp);
      var nextMilestone = null;
      if (milestoneIdx < branch.milestones.length - 1) {
        nextMilestone = branch.milestones[milestoneIdx + 1];
      }
      result[branch.id] = {
        xp: xp,
        milestoneIndex: milestoneIdx,
        currentMilestone: milestoneIdx >= 0 ? branch.milestones[milestoneIdx] : null,
        nextMilestone: nextMilestone,
        milestoneTitle: milestoneIdx >= 0 ? branch.milestones[milestoneIdx].title : null
      };
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // DOMINANT BRANCH
  // ---------------------------------------------------------------------------

  function getDominantBranch(state, playerId) {
    var player = state.players[playerId];
    if (!player) return null;
    var topBranch = null;
    var topXP = -1;
    for (var branchId in player.branchXP) {
      if (player.branchXP[branchId] > topXP) {
        topXP = player.branchXP[branchId];
        topBranch = branchId;
      }
    }
    return topBranch;
  }

  // ---------------------------------------------------------------------------
  // ZONE GATE ACCESS
  // ---------------------------------------------------------------------------

  function canAccessZone(state, playerId, zoneGateId) {
    var player = state.players[playerId];
    if (!player) return false;

    var gate = null;
    for (var i = 0; i < ZONE_GATES.length; i++) {
      if (ZONE_GATES[i].id === zoneGateId) { gate = ZONE_GATES[i]; break; }
    }
    if (!gate) return false;

    var branchXP = player.branchXP[gate.requiredBranch] || 0;
    return branchXP >= gate.requiredXP;
  }

  // ---------------------------------------------------------------------------
  // AVAILABLE DECISIONS
  // ---------------------------------------------------------------------------

  function getAvailableDecisions(state, playerId) {
    var player = state.players[playerId];
    if (!player) return [];
    var available = [];
    for (var i = 0; i < DECISIONS.length; i++) {
      var decision = DECISIONS[i];
      if (player.decisions[decision.id]) continue;
      if (!checkPrerequisites(state, playerId, decision)) continue;
      available.push(decision);
    }
    return available;
  }

  // ---------------------------------------------------------------------------
  // DECISION HISTORY
  // ---------------------------------------------------------------------------

  function getDecisionHistory(state, playerId) {
    var player = state.players[playerId];
    if (!player) return [];
    var history = [];
    for (var decisionId in player.decisions) {
      var choiceId = player.decisions[decisionId];
      var decision = null;
      for (var i = 0; i < DECISIONS.length; i++) {
        if (DECISIONS[i].id === decisionId) { decision = DECISIONS[i]; break; }
      }
      var choice = null;
      if (decision) {
        for (var c = 0; c < decision.choices.length; c++) {
          if (decision.choices[c].id === choiceId) { choice = decision.choices[c]; break; }
        }
      }
      history.push({
        decisionId: decisionId,
        choiceId: choiceId,
        decision: decision,
        choice: choice
      });
    }
    return history;
  }

  // ---------------------------------------------------------------------------
  // MILESTONE REWARDS
  // ---------------------------------------------------------------------------

  function getMilestoneRewards(state, playerId, branchId) {
    var player = state.players[playerId];
    if (!player) return [];
    var xp = player.branchXP[branchId] || 0;
    var milestoneIdx = getCurrentMilestoneIndex(branchId, xp);
    if (milestoneIdx < 0) return [];

    var earned = [];
    for (var i = 0; i < BRANCH_REWARDS.length; i++) {
      var reward = BRANCH_REWARDS[i];
      if (reward.branchId !== branchId) continue;
      if (reward.requiredMilestone - 1 <= milestoneIdx) {
        earned.push(reward);
      }
    }
    return earned;
  }

  // ---------------------------------------------------------------------------
  // LORE VERSIONS
  // ---------------------------------------------------------------------------

  function getLoreVersion(state, playerId, loreId) {
    var player = state.players[playerId];
    var dominant = getDominantBranch(state, playerId);

    var lore = null;
    for (var i = 0; i < CONTESTED_LORE.length; i++) {
      if (CONTESTED_LORE[i].id === loreId) { lore = CONTESTED_LORE[i]; break; }
    }
    if (!lore) return null;

    // Check if player has a stored version override
    var playerLoreKey = playerId + ':' + loreId;
    if (state.loreVersions[playerLoreKey]) {
      dominant = state.loreVersions[playerLoreKey];
    }

    var version = dominant ? lore.versions[dominant] : lore.versions['peace'];
    return {
      id: lore.id,
      title: lore.title,
      branch: dominant || 'peace',
      text: version || lore.versions['peace']
    };
  }

  // ---------------------------------------------------------------------------
  // RECONCILIATION
  // ---------------------------------------------------------------------------

  function canReconcile(state, playerId) {
    var player = state.players[playerId];
    if (!player) return false;

    // Need at least two branches at RECONCILE_MIN_XP
    var qualified = [];
    for (var branchId in player.branchXP) {
      if (player.branchXP[branchId] >= RECONCILE_MIN_XP) {
        qualified.push(branchId);
      }
    }
    return qualified.length >= 2;
  }

  function reconcileBranches(state, playerId, branchId1, branchId2, currentTick) {
    var player = state.players[playerId];
    if (!player) {
      return { success: false, error: 'player_not_found' };
    }

    if (!canReconcile(state, playerId)) {
      return { success: false, error: 'reconcile_requirements_not_met' };
    }

    var xp1 = player.branchXP[branchId1] || 0;
    var xp2 = player.branchXP[branchId2] || 0;
    if (xp1 < RECONCILE_MIN_XP || xp2 < RECONCILE_MIN_XP) {
      return { success: false, error: 'insufficient_branch_xp' };
    }

    // Check already reconciled
    var pairKey = [branchId1, branchId2].sort().join(':');
    if (player.reconciled.indexOf(pairKey) !== -1) {
      return { success: false, error: 'already_reconciled' };
    }

    // Apply reconciliation bonus XP to both branches
    player.branchXP[branchId1] += RECONCILE_BONUS_XP;
    player.branchXP[branchId2] += RECONCILE_BONUS_XP;
    player.reconciled.push(pairKey);

    // Unlock reconciled lore access (player gets choice of any branch's lore version)
    var reconciledRewardId = 'reconciled_' + pairKey;
    player.rewards.push(reconciledRewardId);

    state.decisionLog.push({
      playerId: playerId,
      decisionId: 'reconcile',
      choiceId: pairKey,
      tick: currentTick || 0,
      branchXP: { [branchId1]: RECONCILE_BONUS_XP, [branchId2]: RECONCILE_BONUS_XP }
    });

    return {
      success: true,
      pairKey: pairKey,
      bonusXP: RECONCILE_BONUS_XP,
      branchId1: branchId1,
      branchId2: branchId2,
      newXP1: player.branchXP[branchId1],
      newXP2: player.branchXP[branchId2],
      rewardId: reconciledRewardId
    };
  }

  // ---------------------------------------------------------------------------
  // EXCLUSIVE REWARDS
  // ---------------------------------------------------------------------------

  function getExclusiveRewards(state, playerId) {
    var player = state.players[playerId];
    if (!player) return [];
    var result = [];
    for (var i = 0; i < player.rewards.length; i++) {
      var rewardId = player.rewards[i];
      var rewardDef = null;
      for (var j = 0; j < BRANCH_REWARDS.length; j++) {
        if (BRANCH_REWARDS[j].id === rewardId) { rewardDef = BRANCH_REWARDS[j]; break; }
      }
      if (rewardDef) result.push(rewardDef);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // LEADERBOARD
  // ---------------------------------------------------------------------------

  function getBranchLeaderboard(state, branchId, count) {
    var n = count || 10;
    var players = [];
    for (var playerId in state.players) {
      var player = state.players[playerId];
      players.push({
        playerId: playerId,
        xp: player.branchXP[branchId] || 0
      });
    }
    players.sort(function(a, b) { return b.xp - a.xp; });
    return players.slice(0, n);
  }

  // ---------------------------------------------------------------------------
  // PLAYER PROFILE
  // ---------------------------------------------------------------------------

  function getPlayerProfile(state, playerId) {
    var player = state.players[playerId];
    if (!player) return null;

    var dominant = getDominantBranch(state, playerId);
    var progress = getBranchProgress(state, playerId);
    var history = getDecisionHistory(state, playerId);
    var exclusiveRewards = getExclusiveRewards(state, playerId);
    var totalXP = 0;
    for (var b in player.branchXP) {
      totalXP += player.branchXP[b];
    }

    return {
      playerId: playerId,
      dominantBranch: dominant,
      branchXP: player.branchXP,
      totalXP: totalXP,
      progress: progress,
      decisionCount: Object.keys(player.decisions).length,
      decisionHistory: history,
      rewards: exclusiveRewards,
      reconciled: player.reconciled,
      lockedPaths: Object.keys(player.lockedPaths),
      unlockedPaths: Object.keys(player.unlockedPaths)
    };
  }

  // ---------------------------------------------------------------------------
  // DECISION STATISTICS
  // ---------------------------------------------------------------------------

  function getDecisionStats(state) {
    var stats = {};
    for (var decisionId in state.decisions) {
      var totals = state.decisions[decisionId];
      var total = 0;
      for (var choiceId in totals) {
        total += totals[choiceId];
      }
      stats[decisionId] = {};
      for (var cId in totals) {
        stats[decisionId][cId] = {
          count: totals[cId],
          percent: total > 0 ? Math.round((totals[cId] / total) * 100) : 0
        };
      }
    }
    return stats;
  }

  // ---------------------------------------------------------------------------
  // LOCKED CONTENT
  // ---------------------------------------------------------------------------

  function getLockedContent(state, playerId) {
    var player = state.players[playerId];
    if (!player) return { paths: [], zones: [], lore: [] };

    var lockedZones = [];
    for (var i = 0; i < ZONE_GATES.length; i++) {
      var gate = ZONE_GATES[i];
      if (!canAccessZone(state, playerId, gate.id)) {
        lockedZones.push({
          id: gate.id,
          name: gate.name,
          requiredBranch: gate.requiredBranch,
          requiredXP: gate.requiredXP,
          currentXP: player.branchXP[gate.requiredBranch] || 0
        });
      }
    }

    var lockedPaths = [];
    for (var pathId in player.lockedPaths) {
      lockedPaths.push(pathId);
    }

    return {
      paths: lockedPaths,
      zones: lockedZones,
      lore: []  // Contested lore is always accessible; the version varies by branch
    };
  }

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------

  exports.BRANCHES = BRANCHES;
  exports.DECISIONS = DECISIONS;
  exports.ZONE_GATES = ZONE_GATES;
  exports.BRANCH_REWARDS = BRANCH_REWARDS;
  exports.CONTESTED_LORE = CONTESTED_LORE;
  exports._mulberry32 = mulberry32;
  exports._RECONCILE_MIN_XP = RECONCILE_MIN_XP;

  exports.createState = createState;
  exports.initPlayer = initPlayer;
  exports.makeDecision = makeDecision;
  exports.getBranchProgress = getBranchProgress;
  exports.getDominantBranch = getDominantBranch;
  exports.canAccessZone = canAccessZone;
  exports.getAvailableDecisions = getAvailableDecisions;
  exports.getDecisionHistory = getDecisionHistory;
  exports.getMilestoneRewards = getMilestoneRewards;
  exports.getLoreVersion = getLoreVersion;
  exports.canReconcile = canReconcile;
  exports.reconcileBranches = reconcileBranches;
  exports.getExclusiveRewards = getExclusiveRewards;
  exports.getBranchLeaderboard = getBranchLeaderboard;
  exports.getPlayerProfile = getPlayerProfile;
  exports.getDecisionStats = getDecisionStats;
  exports.getLockedContent = getLockedContent;

})(typeof module !== 'undefined' ? module.exports : (window.ConsequenceBranching = {}));
