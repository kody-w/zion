// profiles.js
/**
 * ZION Player Profile Cards
 * Aggregates data from quests, guilds, mentoring, pets, exploration, economy,
 * and social systems into rich profile cards for self-view and other-player view.
 */

(function(exports) {
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  /**
   * XP thresholds for overall player level.
   * Each entry: { level, xpRequired, title }
   */
  var LEVEL_THRESHOLDS = [
    { level: 1,  xpRequired: 0,     title: 'Newcomer' },
    { level: 2,  xpRequired: 100,   title: 'Wanderer' },
    { level: 3,  xpRequired: 300,   title: 'Settler' },
    { level: 4,  xpRequired: 600,   title: 'Explorer' },
    { level: 5,  xpRequired: 1000,  title: 'Adventurer' },
    { level: 6,  xpRequired: 1500,  title: 'Pathfinder' },
    { level: 7,  xpRequired: 2200,  title: 'Veteran' },
    { level: 8,  xpRequired: 3000,  title: 'Champion' },
    { level: 9,  xpRequired: 4000,  title: 'Legend' },
    { level: 10, xpRequired: 5500,  title: 'Elder' },
    { level: 11, xpRequired: 7500,  title: 'Sage' },
    { level: 12, xpRequired: 10000, title: 'Archon' },
    { level: 13, xpRequired: 13000, title: 'Mythic' },
    { level: 14, xpRequired: 17000, title: 'Eternal' },
    { level: 15, xpRequired: 22000, title: 'Transcendent' }
  ];

  /**
   * Titles earned at various milestones.
   * { id, name, description, condition }
   */
  var TITLE_LIST = [
    { id: 'the_curious',       name: 'The Curious',       description: 'Asked a question in ZION',            condition: 'first_login' },
    { id: 'the_friendly',      name: 'The Friendly',      description: 'Spoke to 10 citizens',                 condition: 'talk_npcs_10' },
    { id: 'the_explorer',      name: 'The Explorer',      description: 'Visited all 8 zones',                  condition: 'zones_8' },
    { id: 'the_questmaster',   name: 'The Questmaster',   description: 'Completed 10 quests',                  condition: 'quests_10' },
    { id: 'the_completionist', name: 'The Completionist', description: 'Completed 25 quests',                  condition: 'quests_25' },
    { id: 'the_merchant',      name: 'The Merchant',      description: 'Completed 25 trades',                  condition: 'trades_25' },
    { id: 'the_magnate',       name: 'The Magnate',       description: 'Accumulated 2000 Spark',               condition: 'spark_2000' },
    { id: 'the_artisan',       name: 'The Artisan',       description: 'Crafted 50 items',                     condition: 'craft_50' },
    { id: 'the_builder',       name: 'The Builder',       description: 'Placed 50 structures',                 condition: 'build_50' },
    { id: 'the_cartographer',  name: 'The Cartographer',  description: 'Made 25 discoveries',                  condition: 'discoveries_25' },
    { id: 'the_scholar',       name: 'The Scholar',       description: 'Reached lore skill level 4',           condition: 'lore_level_4' },
    { id: 'the_champion',      name: 'The Champion',      description: 'Won 5 competitions',                   condition: 'wins_5' },
    { id: 'the_guild_founder', name: 'The Guild Founder', description: 'Founded a guild',                      condition: 'guild_founder' },
    { id: 'the_mentor',        name: 'The Mentor',        description: 'Taught another player a skill',        condition: 'taught_player' },
    { id: 'the_naturalist',    name: 'The Naturalist',    description: 'Adopted a pet companion',              condition: 'has_pet' },
    { id: 'the_elder',         name: 'The Elder',         description: 'Reached player level 10',              condition: 'level_10' },
    { id: 'the_transcendent',  name: 'The Transcendent',  description: 'Reached maximum player level',         condition: 'level_15' },
    { id: 'the_sunwalker',     name: 'The Sunwalker',     description: 'Achieved Sunwalker warmth tier',       condition: 'sunwalker' },
    { id: 'the_lorekeeper',    name: 'The Lorekeeper',    description: 'Unlocked 10 lore entries',             condition: 'lore_10' },
    { id: 'the_gardener',      name: 'The Gardener',      description: 'Harvested 100 plants',                 condition: 'harvest_100' }
  ];

  // Skill display metadata
  var SKILL_META = {
    gardening:   { icon: '[G]', color: '#4caf50' },
    crafting:    { icon: '[C]', color: '#ff9800' },
    building:    { icon: '[B]', color: '#2196f3' },
    exploration: { icon: '[E]', color: '#9c27b0' },
    trading:     { icon: '[T]', color: '#ffc107' },
    social:      { icon: '[S]', color: '#e91e63' },
    combat:      { icon: '[W]', color: '#f44336' },
    lore:        { icon: '[L]', color: '#00bcd4' }
  };

  // Maximum skill level (from Mentoring.SKILLS config)
  var MAX_SKILL_LEVEL = 4;

  // ============================================================================
  // PROFILE CREATION
  // ============================================================================

  /**
   * Build a profile object from raw game data.
   * @param {string} playerId
   * @param {object} data - { name, questData, guildData, mentoringData, petData,
   *                           discoveryData, ledger, reputationData, joinTime,
   *                           achievementData }
   * @returns {object} Fully populated profile
   */
  function createProfile(playerId, data) {
    if (!playerId) return null;
    data = data || {};

    var questStats  = getProfileStats_quests(data.questData);
    var guildInfo   = getGuildInfo(playerId, data.guildData);
    var skillSummary = getSkillSummary(playerId, data.mentoringData);
    var petInfo     = getPetInfo(playerId, data.petData);
    var exploration = getExplorationProgress(playerId, data.discoveryData);
    var sparkBalance = (data.ledger && data.ledger.balances)
      ? (data.ledger.balances[playerId] || 0)
      : (data.sparkBalance || 0);
    var reputation  = data.reputationData || { score: 0, tier: 'Newcomer' };
    var joinTime    = data.joinTime || 0;
    var playtime    = data.playTimeSeconds || 0;
    var achievements = data.achievementData || {};

    var badges  = getProfileBadges(playerId, achievements);
    var titles  = getProfileTitle(playerId, questStats);
    var level   = getProfileLevel({
      questStats: questStats,
      sparkBalance: sparkBalance,
      exploration: exploration,
      skillSummary: skillSummary
    });

    return {
      id: playerId,
      name: sanitizeText(data.name || playerId),
      level: level,
      levelTitle: getLevelTitle(level),
      sparkBalance: sparkBalance,
      reputation: {
        score: reputation.score || 0,
        tier: reputation.tier || 'Newcomer'
      },
      questStats: questStats,
      guildInfo: guildInfo,
      skillSummary: skillSummary,
      petInfo: petInfo,
      exploration: exploration,
      badges: badges,
      titles: titles,
      joinTime: joinTime,
      playTimeSeconds: playtime,
      createdAt: Date.now()
    };
  }

  // ============================================================================
  // STAT AGGREGATION
  // ============================================================================

  /**
   * Aggregate quest stats from quest data snapshot.
   * @param {object|null} questData - Result of Quests.getPlayerQuestStats()
   * @returns {object}
   */
  function getProfileStats_quests(questData) {
    if (!questData) {
      return {
        activeQuests: 0,
        completedQuests: 0,
        totalAvailable: 0,
        completedChains: 0,
        totalChains: 0,
        titles: []
      };
    }
    return {
      activeQuests:    questData.activeQuests    || 0,
      completedQuests: questData.completedQuests || 0,
      totalAvailable:  questData.totalAvailable  || 0,
      completedChains: questData.completedChains || 0,
      totalChains:     questData.totalChains     || 0,
      titles:          questData.titles          || []
    };
  }

  /**
   * Aggregate profile stats including quests, discoveries, spark, reputation,
   * and playtime.
   * @param {string} playerId
   * @param {object} gameData - { questData, discoveryData, ledger, reputationData,
   *                              playTimeSeconds, sparkBalance }
   * @returns {object}
   */
  function getProfileStats(playerId, gameData) {
    gameData = gameData || {};

    var questStats = getProfileStats_quests(gameData.questData);
    var discoveriesCount = 0;
    var zonesDiscovered = 0;
    if (gameData.discoveryData) {
      var discoveries = gameData.discoveryData.list || gameData.discoveryData || [];
      if (Array.isArray(discoveries)) {
        discoveriesCount = discoveries.filter(function(d) {
          return d.discoverer === playerId || d.player === playerId;
        }).length;
      }
      var zoneMap = {};
      if (Array.isArray(discoveries)) {
        discoveries.forEach(function(d) {
          if ((d.discoverer === playerId || d.player === playerId) && d.zone) {
            zoneMap[d.zone] = true;
          }
        });
      }
      zonesDiscovered = Object.keys(zoneMap).length;
    }

    var sparkBalance = 0;
    if (gameData.ledger && gameData.ledger.balances) {
      sparkBalance = gameData.ledger.balances[playerId] || 0;
    } else if (typeof gameData.sparkBalance === 'number') {
      sparkBalance = gameData.sparkBalance;
    }

    var reputationScore = 0;
    var reputationTier = 'Newcomer';
    if (gameData.reputationData) {
      reputationScore = gameData.reputationData.score || 0;
      reputationTier  = gameData.reputationData.tier  || 'Newcomer';
    }

    return {
      questsCompleted:  questStats.completedQuests,
      activeQuests:     questStats.activeQuests,
      chainsCompleted:  questStats.completedChains,
      discoveries:      discoveriesCount,
      zonesDiscovered:  zonesDiscovered,
      sparkBalance:     sparkBalance,
      reputationScore:  reputationScore,
      reputationTier:   reputationTier,
      playTimeSeconds:  gameData.playTimeSeconds || 0,
      playTimeFormatted: formatPlayTime(gameData.playTimeSeconds || 0)
    };
  }

  // ============================================================================
  // BADGES
  // ============================================================================

  /**
   * Get earned achievement badges with icon info.
   * @param {string} playerId
   * @param {object} achievements - Map of achievementId -> { earned, ts }
   * @returns {Array} Array of { id, name, description, icon, category, earnedAt }
   */
  function getProfileBadges(playerId, achievements) {
    if (!achievements) return [];

    var earned = [];
    for (var id in achievements) {
      var ach = achievements[id];
      if (ach && ach.earned) {
        earned.push({
          id: id,
          name:        ach.name        || id,
          description: ach.description || '',
          icon:        ach.icon        || '[*]',
          category:    ach.category    || 'misc',
          earnedAt:    ach.ts          || ach.earnedAt || 0
        });
      }
    }

    // Sort by earnedAt descending (most recent first)
    earned.sort(function(a, b) { return b.earnedAt - a.earnedAt; });
    return earned;
  }

  // ============================================================================
  // TITLES
  // ============================================================================

  /**
   * Determine earned titles for a player based on quest stats.
   * @param {string} playerId
   * @param {object} questStats - Result of getProfileStats_quests()
   * @returns {Array} Array of title strings
   */
  function getProfileTitle(playerId, questStats) {
    questStats = questStats || {};
    var titles = questStats.titles || [];

    // Built-in milestone titles from TITLE_LIST
    var completedQuests = questStats.completedQuests || 0;
    if (completedQuests >= 10 && titles.indexOf('The Questmaster') === -1) {
      titles = titles.concat(['The Questmaster']);
    }
    if (completedQuests >= 25 && titles.indexOf('The Completionist') === -1) {
      titles = titles.concat(['The Completionist']);
    }

    return titles;
  }

  // ============================================================================
  // SKILLS
  // ============================================================================

  /**
   * Summarise skill levels for display.
   * @param {string} playerId
   * @param {object|null} mentoringData - Result of Mentoring.getPlayerSkills(playerId)
   * @returns {object} Map of skillName -> { level, levelName, xp, xpToNext, icon }
   */
  function getSkillSummary(playerId, mentoringData) {
    var skillNames = ['gardening', 'crafting', 'building', 'exploration',
                      'trading', 'social', 'combat', 'lore'];
    var summary = {};

    skillNames.forEach(function(skill) {
      var raw = mentoringData && mentoringData[skill];
      var level     = raw ? (raw.level     || 0) : 0;
      var xp        = raw ? (raw.xp        || 0) : 0;
      var levelName = raw ? (raw.levelName || 'Novice') : 'Novice';

      // XP to next level — approximate from SKILLS config pattern
      var xpThresholds = [0, 100, 300, 600, 1000];
      var xpToNext = 0;
      if (level < xpThresholds.length - 1) {
        xpToNext = xpThresholds[level + 1] - xp;
        if (xpToNext < 0) xpToNext = 0;
      }

      var meta = SKILL_META[skill] || { icon: '[?]', color: '#888' };
      summary[skill] = {
        level:     level,
        levelName: levelName,
        xp:        xp,
        xpToNext:  xpToNext,
        maxLevel:  MAX_SKILL_LEVEL,
        icon:      meta.icon,
        color:     meta.color
      };
    });

    return summary;
  }

  // ============================================================================
  // GUILD INFO
  // ============================================================================

  /**
   * Get guild membership details for a player.
   * @param {string} playerId
   * @param {object|null} guildData - Result of Guilds.getPlayerGuild(playerId)
   * @returns {object} { inGuild, guildId, guildName, guildTag, role, memberCount, level }
   */
  function getGuildInfo(playerId, guildData) {
    if (!guildData) {
      return { inGuild: false, guildId: null, guildName: null, guildTag: null,
               role: null, memberCount: 0, level: 0 };
    }

    var member = null;
    if (Array.isArray(guildData.members)) {
      guildData.members.forEach(function(m) {
        if (m.playerId === playerId) member = m;
      });
    }

    return {
      inGuild:     true,
      guildId:     guildData.id     || null,
      guildName:   sanitizeText(guildData.name   || ''),
      guildTag:    sanitizeText(guildData.tag    || ''),
      guildType:   guildData.type   || 'guild',
      role:        member ? (member.role || 'member') : 'member',
      memberCount: Array.isArray(guildData.members) ? guildData.members.length : 0,
      level:       guildData.level  || 1
    };
  }

  // ============================================================================
  // PET INFO
  // ============================================================================

  /**
   * Get active pet companion details.
   * @param {string} playerId
   * @param {object|null} petData - Result of Pets.getPlayerPet(playerId)
   * @returns {object} { hasPet, name, type, icon, rarity, mood, bond }
   */
  function getPetInfo(playerId, petData) {
    if (!petData) {
      return { hasPet: false, name: null, type: null, icon: null,
               rarity: null, mood: 0, bond: 0 };
    }

    return {
      hasPet: true,
      petId:  petData.id   || null,
      name:   sanitizeText(petData.name || 'Unknown'),
      type:   petData.type || 'unknown',
      icon:   petData.icon || '[pet]',
      rarity: petData.rarity || 'common',
      mood:   typeof petData.mood === 'number' ? petData.mood : 100,
      bond:   typeof petData.bond === 'number' ? petData.bond : 0,
      bonus:  petData.bonus || null
    };
  }

  // ============================================================================
  // EXPLORATION PROGRESS
  // ============================================================================

  /**
   * Get exploration stats for a player.
   * @param {string} playerId
   * @param {object|null} discoveryData - { list: Array<discovery>, zonesDiscovered }
   *        OR a plain array of discovery objects
   * @returns {object} { zonesDiscovered, totalDiscoveries, secretsFound, loreUnlocked }
   */
  function getExplorationProgress(playerId, discoveryData) {
    var result = {
      zonesDiscovered: 0,
      totalDiscoveries: 0,
      secretsFound: 0,
      loreUnlocked: 0,
      discoveries: []
    };

    if (!discoveryData) return result;

    var list = Array.isArray(discoveryData) ? discoveryData
             : (discoveryData.list || discoveryData.discoveries || []);

    var zoneMap = {};
    var secretCount = 0;
    var loreCount = 0;

    list.forEach(function(d) {
      var isOwner = d.discoverer === playerId || d.player === playerId;
      if (!isOwner) return;

      result.totalDiscoveries++;
      if (d.zone) zoneMap[d.zone] = true;
      if (d.type === 'secret') secretCount++;
      if (d.type === 'lore')   loreCount++;
      result.discoveries.push({
        name:  d.name  || (d.type ? d.type.charAt(0).toUpperCase() + d.type.slice(1) : 'Discovery'),
        zone:  d.zone  || 'unknown',
        rarity: d.rarity || 'common',
        type:  d.type  || 'landmark'
      });
    });

    result.zonesDiscovered = Object.keys(zoneMap).length;
    result.secretsFound    = secretCount;
    result.loreUnlocked    = loreCount;

    return result;
  }

  // ============================================================================
  // PROFILE CARD FORMATTING
  // ============================================================================

  /**
   * Format a profile for HTML-safe text display.
   * Returns a plain-object suitable for template rendering.
   * @param {object} profile - Result of createProfile()
   * @returns {object}
   */
  function formatProfileCard(profile) {
    if (!profile) return null;

    var guildLabel = profile.guildInfo && profile.guildInfo.inGuild
      ? '[' + sanitizeText(profile.guildInfo.guildTag) + '] ' + sanitizeText(profile.guildInfo.guildName)
      : 'No Guild';

    var petLabel = profile.petInfo && profile.petInfo.hasPet
      ? profile.petInfo.icon + ' ' + sanitizeText(profile.petInfo.name)
        + ' (' + profile.petInfo.type + ')'
      : 'No Companion';

    var topBadges = (profile.badges || []).slice(0, 6);
    var badgeLabels = topBadges.map(function(b) {
      return b.icon + ' ' + sanitizeText(b.name);
    });

    var topSkills = [];
    if (profile.skillSummary) {
      for (var skillName in profile.skillSummary) {
        var s = profile.skillSummary[skillName];
        topSkills.push({
          name:      skillName.charAt(0).toUpperCase() + skillName.slice(1),
          level:     s.level,
          levelName: s.levelName,
          xp:        s.xp,
          xpToNext:  s.xpToNext,
          icon:      s.icon,
          color:     s.color
        });
      }
    }

    return {
      id:              sanitizeText(profile.id),
      name:            sanitizeText(profile.name),
      level:           profile.level,
      levelTitle:      sanitizeText(profile.levelTitle),
      sparkBalance:    profile.sparkBalance,
      reputationTier:  sanitizeText(profile.reputation ? profile.reputation.tier : 'Newcomer'),
      reputationScore: profile.reputation ? profile.reputation.score : 0,
      questsCompleted: profile.questStats ? profile.questStats.completedQuests : 0,
      chainsCompleted: profile.questStats ? profile.questStats.completedChains : 0,
      discoveries:     profile.exploration ? profile.exploration.totalDiscoveries : 0,
      zonesDiscovered: profile.exploration ? profile.exploration.zonesDiscovered : 0,
      secretsFound:    profile.exploration ? profile.exploration.secretsFound : 0,
      playTime:        formatPlayTime(profile.playTimeSeconds || 0),
      guildLabel:      guildLabel,
      petLabel:        petLabel,
      badgeLabels:     badgeLabels,
      skills:          topSkills,
      titles:          (profile.titles || []).map(sanitizeText)
    };
  }

  // ============================================================================
  // PROFILE COMPARISON
  // ============================================================================

  /**
   * Compare two profiles side-by-side.
   * @param {object} profileA - Result of createProfile()
   * @param {object} profileB - Result of createProfile()
   * @returns {object} Comparison data with winner per category
   */
  function compareProfiles(profileA, profileB) {
    if (!profileA || !profileB) return null;

    var sparkA = profileA.sparkBalance || 0;
    var sparkB = profileB.sparkBalance || 0;
    var questsA = (profileA.questStats || {}).completedQuests || 0;
    var questsB = (profileB.questStats || {}).completedQuests || 0;
    var discA = (profileA.exploration || {}).totalDiscoveries || 0;
    var discB = (profileB.exploration || {}).totalDiscoveries || 0;
    var repA = (profileA.reputation || {}).score || 0;
    var repB = (profileB.reputation || {}).score || 0;
    var levelA = profileA.level || 1;
    var levelB = profileB.level || 1;
    var badgesA = (profileA.badges || []).length;
    var badgesB = (profileB.badges || []).length;

    // Skill total level comparison
    var skillTotalA = sumSkillLevels(profileA.skillSummary);
    var skillTotalB = sumSkillLevels(profileB.skillSummary);

    return {
      players: [sanitizeText(profileA.name), sanitizeText(profileB.name)],
      categories: {
        level:      { values: [levelA,   levelB],  winner: levelA  > levelB  ? 0 : levelB  > levelA  ? 1 : -1 },
        spark:      { values: [sparkA,   sparkB],  winner: sparkA  > sparkB  ? 0 : sparkB  > sparkA  ? 1 : -1 },
        quests:     { values: [questsA,  questsB], winner: questsA > questsB ? 0 : questsB > questsA ? 1 : -1 },
        discoveries:{ values: [discA,    discB],   winner: discA   > discB   ? 0 : discB   > discA   ? 1 : -1 },
        reputation: { values: [repA,     repB],    winner: repA    > repB    ? 0 : repB    > repA    ? 1 : -1 },
        badges:     { values: [badgesA,  badgesB], winner: badgesA > badgesB ? 0 : badgesB > badgesA ? 1 : -1 },
        skills:     { values: [skillTotalA, skillTotalB], winner: skillTotalA > skillTotalB ? 0 : skillTotalB > skillTotalA ? 1 : -1 }
      }
    };
  }

  // ============================================================================
  // PLAYER LEVEL
  // ============================================================================

  /**
   * Calculate overall player level from combined stats.
   * @param {object} profile - Partial profile with questStats, sparkBalance,
   *                            exploration, skillSummary
   * @returns {number} Level 1–15
   */
  function getProfileLevel(profile) {
    profile = profile || {};

    var xp = 0;

    // Quests: 20 XP per completion, 50 XP per chain
    var questStats = profile.questStats || {};
    xp += (questStats.completedQuests || 0) * 20;
    xp += (questStats.completedChains || 0) * 50;

    // Spark: 1 XP per 10 spark (logarithmic cap)
    var spark = profile.sparkBalance || 0;
    xp += Math.floor(Math.min(spark, 5000) / 10);

    // Exploration: 10 XP per discovery, 30 per zone
    var exploration = profile.exploration || {};
    xp += (exploration.totalDiscoveries || 0) * 10;
    xp += (exploration.zonesDiscovered  || 0) * 30;

    // Skills: 15 XP per skill level above 0
    var skillSum = sumSkillLevels(profile.skillSummary);
    xp += skillSum * 15;

    // Find level from thresholds
    var level = 1;
    for (var i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i].xpRequired) {
        level = LEVEL_THRESHOLDS[i].level;
        break;
      }
    }
    return level;
  }

  // ============================================================================
  // HUD PANEL INTEGRATION
  // ============================================================================

  /**
   * Show the enhanced player profile panel for the local player.
   * Designed to be called from hud.js or main.js.
   * @param {object} profile - Result of createProfile()
   * @param {HTMLElement|null} container - DOM container, defaults to document.body
   * @returns {HTMLElement} The panel element
   */
  function showPlayerProfilePanel(profile, container) {
    // Remove any existing panel
    var existing = document.getElementById('profiles-panel');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
      return null; // toggle off
    }

    var formatted = formatProfileCard(profile);
    if (!formatted) return null;

    var panel = document.createElement('div');
    panel.id = 'profiles-panel';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:rgba(0,0,0,0.92);border:2px solid #d4af37;border-radius:12px;' +
      'padding:0;width:720px;max-height:88vh;overflow-y:auto;pointer-events:auto;' +
      'box-shadow:0 8px 40px rgba(0,0,0,0.9);z-index:350;font-family:monospace;color:#fff;';

    // ---- Header ----
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
      'padding:18px 22px;background:rgba(212,175,55,0.12);border-bottom:1px solid #d4af37;';

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:20px;font-weight:bold;color:#d4af37;';
    titleEl.textContent = 'Player Profile';
    header.appendChild(titleEl);

    var closeBtn = document.createElement('div');
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = 'cursor:pointer;font-size:20px;color:#888;padding:2px 10px;' +
      'border-radius:4px;';
    closeBtn.onmouseover = function() { this.style.color = '#d4af37'; };
    closeBtn.onmouseout  = function() { this.style.color = '#888'; };
    closeBtn.onclick = function() {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
    };
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var body = document.createElement('div');
    body.style.cssText = 'padding:22px;';

    // ---- Avatar + Identity ----
    var identity = _buildIdentitySection(formatted);
    body.appendChild(identity);

    // ---- Stats Grid ----
    var statsSection = _buildStatsSection(formatted);
    body.appendChild(statsSection);

    // ---- Guild ----
    var guildSection = _buildGuildSection(formatted);
    body.appendChild(guildSection);

    // ---- Pet ----
    var petSection = _buildPetSection(formatted);
    body.appendChild(petSection);

    // ---- Achievement Badges ----
    if (profile.badges && profile.badges.length > 0) {
      var badgeSection = _buildBadgeSection(profile.badges);
      body.appendChild(badgeSection);
    }

    // ---- Skills ----
    var skillSection = _buildSkillSection(formatted.skills, profile.skillSummary);
    body.appendChild(skillSection);

    // ---- Titles ----
    if (formatted.titles && formatted.titles.length > 0) {
      var titleSection = _buildTitleSection(formatted.titles);
      body.appendChild(titleSection);
    }

    panel.appendChild(body);
    var root = container || document.body;
    root.appendChild(panel);
    return panel;
  }

  // ============================================================================
  // INTERNAL PANEL BUILDERS
  // ============================================================================

  function _buildIdentitySection(fmt) {
    var section = document.createElement('div');
    section.style.cssText = 'display:flex;align-items:center;gap:20px;margin-bottom:22px;' +
      'padding-bottom:18px;border-bottom:1px solid rgba(212,175,55,0.3);';

    // Avatar circle
    var avatar = document.createElement('div');
    var initial = (fmt.name || 'P').charAt(0).toUpperCase();
    avatar.textContent = initial;
    avatar.style.cssText = 'width:76px;height:76px;border-radius:50%;background:#d4af37;' +
      'display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:bold;' +
      'color:#000;flex-shrink:0;border:2px solid rgba(212,175,55,0.6);';

    var details = document.createElement('div');
    details.style.cssText = 'flex:1;';

    var nameEl = document.createElement('div');
    nameEl.textContent = fmt.name;
    nameEl.style.cssText = 'font-size:22px;font-weight:bold;color:#fff;margin-bottom:4px;';

    var levelEl = document.createElement('div');
    levelEl.textContent = 'Level ' + fmt.level + ' — ' + fmt.levelTitle;
    levelEl.style.cssText = 'font-size:13px;color:#d4af37;margin-bottom:4px;';

    var repEl = document.createElement('div');
    repEl.textContent = fmt.reputationTier + ' (rep: ' + fmt.reputationScore + ')';
    repEl.style.cssText = 'font-size:12px;color:#aaa;margin-bottom:6px;';

    var sparkEl = document.createElement('div');
    sparkEl.innerHTML = '<span style="color:#d4af37;">[S]</span> ' + fmt.sparkBalance + ' Spark';
    sparkEl.style.cssText = 'font-size:15px;color:#fff;font-weight:bold;';

    details.appendChild(nameEl);
    details.appendChild(levelEl);
    details.appendChild(repEl);
    details.appendChild(sparkEl);

    section.appendChild(avatar);
    section.appendChild(details);
    return section;
  }

  function _buildStatsSection(fmt) {
    var section = document.createElement('div');
    section.style.cssText = 'margin-bottom:20px;';

    var title = document.createElement('div');
    title.textContent = 'Stats';
    title.style.cssText = 'font-size:16px;font-weight:bold;color:#d4af37;margin-bottom:10px;';
    section.appendChild(title);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;';

    var statItems = [
      { label: 'Quests Done',    value: fmt.questsCompleted },
      { label: 'Chains Done',    value: fmt.chainsCompleted },
      { label: 'Discoveries',    value: fmt.discoveries },
      { label: 'Zones Explored', value: fmt.zonesDiscovered },
      { label: 'Secrets Found',  value: fmt.secretsFound },
      { label: 'Time Played',    value: fmt.playTime }
    ];

    statItems.forEach(function(s) {
      var item = document.createElement('div');
      item.style.cssText = 'background:rgba(255,255,255,0.05);border-radius:6px;padding:10px 12px;' +
        'border:1px solid rgba(212,175,55,0.15);';

      var lbl = document.createElement('div');
      lbl.textContent = s.label;
      lbl.style.cssText = 'font-size:10px;color:#888;margin-bottom:4px;text-transform:uppercase;';

      var val = document.createElement('div');
      val.textContent = s.value;
      val.style.cssText = 'font-size:17px;color:#fff;font-weight:bold;';

      item.appendChild(lbl);
      item.appendChild(val);
      grid.appendChild(item);
    });

    section.appendChild(grid);
    return section;
  }

  function _buildGuildSection(fmt) {
    var section = document.createElement('div');
    section.style.cssText = 'margin-bottom:18px;padding:12px 14px;background:rgba(212,175,55,0.05);' +
      'border-radius:8px;border:1px solid rgba(212,175,55,0.2);display:flex;align-items:center;gap:12px;';

    var icon = document.createElement('div');
    icon.textContent = '[H]';
    icon.style.cssText = 'font-size:22px;flex-shrink:0;color:#d4af37;';

    var info = document.createElement('div');
    var nameEl = document.createElement('div');
    nameEl.textContent = 'Guild: ' + fmt.guildLabel;
    nameEl.style.cssText = 'font-size:14px;color:#fff;font-weight:bold;';
    info.appendChild(nameEl);

    section.appendChild(icon);
    section.appendChild(info);
    return section;
  }

  function _buildPetSection(fmt) {
    var section = document.createElement('div');
    section.style.cssText = 'margin-bottom:18px;padding:12px 14px;background:rgba(100,200,100,0.05);' +
      'border-radius:8px;border:1px solid rgba(100,200,100,0.2);display:flex;align-items:center;gap:12px;';

    var icon = document.createElement('div');
    icon.textContent = '[P]';
    icon.style.cssText = 'font-size:22px;flex-shrink:0;color:#4caf50;';

    var info = document.createElement('div');
    var nameEl = document.createElement('div');
    nameEl.textContent = 'Companion: ' + fmt.petLabel;
    nameEl.style.cssText = 'font-size:14px;color:#fff;font-weight:bold;';
    info.appendChild(nameEl);

    section.appendChild(icon);
    section.appendChild(info);
    return section;
  }

  function _buildBadgeSection(badges) {
    var section = document.createElement('div');
    section.style.cssText = 'margin-bottom:18px;';

    var title = document.createElement('div');
    title.textContent = 'Achievements';
    title.style.cssText = 'font-size:16px;font-weight:bold;color:#d4af37;margin-bottom:10px;';
    section.appendChild(title);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

    badges.slice(0, 12).forEach(function(badge) {
      var chip = document.createElement('div');
      chip.title = badge.description;
      chip.style.cssText = 'padding:5px 10px;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.4);' +
        'border-radius:20px;font-size:12px;color:#d4af37;cursor:default;';
      chip.textContent = badge.icon + ' ' + badge.name;
      row.appendChild(chip);
    });

    section.appendChild(row);
    return section;
  }

  function _buildSkillSection(skills, skillSummary) {
    var section = document.createElement('div');
    section.style.cssText = 'margin-bottom:18px;';

    var title = document.createElement('div');
    title.textContent = 'Skills';
    title.style.cssText = 'font-size:16px;font-weight:bold;color:#d4af37;margin-bottom:10px;';
    section.appendChild(title);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';

    skills.forEach(function(skill) {
      var row = document.createElement('div');
      row.style.cssText = 'padding:8px;';

      var header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;';

      var lbl = document.createElement('div');
      lbl.textContent = skill.icon + ' ' + skill.name;
      lbl.style.cssText = 'font-size:13px;color:#fff;font-weight:600;';

      var lvl = document.createElement('div');
      lvl.textContent = skill.levelName + ' (Lv.' + skill.level + ')';
      lvl.style.cssText = 'font-size:11px;color:#d4af37;';

      header.appendChild(lbl);
      header.appendChild(lvl);
      row.appendChild(header);

      // Progress bar
      var barWrap = document.createElement('div');
      barWrap.style.cssText = 'height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;';

      var xpTotal = skill.xp + skill.xpToNext;
      var pct = xpTotal > 0 ? Math.min(100, (skill.xp / xpTotal) * 100) : 0;
      if (skill.level >= (skill.maxLevel || 4)) pct = 100;

      var fill = document.createElement('div');
      fill.style.cssText = 'height:100%;background:' + (skill.color || '#d4af37') + ';' +
        'border-radius:4px;width:' + pct.toFixed(1) + '%;';
      barWrap.appendChild(fill);
      row.appendChild(barWrap);

      grid.appendChild(row);
    });

    section.appendChild(grid);
    return section;
  }

  function _buildTitleSection(titles) {
    var section = document.createElement('div');
    section.style.cssText = 'margin-bottom:10px;';

    var titleEl = document.createElement('div');
    titleEl.textContent = 'Titles';
    titleEl.style.cssText = 'font-size:16px;font-weight:bold;color:#d4af37;margin-bottom:8px;';
    section.appendChild(titleEl);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

    titles.forEach(function(t) {
      var chip = document.createElement('div');
      chip.style.cssText = 'padding:4px 10px;background:rgba(255,255,255,0.08);' +
        'border:1px solid rgba(255,255,255,0.2);border-radius:4px;font-size:12px;color:#eee;';
      chip.textContent = t;
      row.appendChild(chip);
    });

    section.appendChild(row);
    return section;
  }

  // ============================================================================
  // UTILITY HELPERS
  // ============================================================================

  /**
   * Sum all skill levels for a skillSummary object.
   * @param {object|null} skillSummary
   * @returns {number}
   */
  function sumSkillLevels(skillSummary) {
    if (!skillSummary) return 0;
    var total = 0;
    for (var k in skillSummary) {
      total += (skillSummary[k].level || 0);
    }
    return total;
  }

  /**
   * Get title string for a given level number.
   * @param {number} level
   * @returns {string}
   */
  function getLevelTitle(level) {
    for (var i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (LEVEL_THRESHOLDS[i].level === level) {
        return LEVEL_THRESHOLDS[i].title;
      }
    }
    return 'Newcomer';
  }

  /**
   * Format seconds into human-readable string.
   * @param {number} seconds
   * @returns {string}
   */
  function formatPlayTime(seconds) {
    seconds = Math.floor(seconds || 0);
    if (seconds < 60) return seconds + 's';
    var m = Math.floor(seconds / 60);
    if (m < 60) return m + 'm';
    var h = Math.floor(m / 60);
    var rem = m % 60;
    return h + 'h ' + rem + 'm';
  }

  /**
   * Sanitize text for HTML-safe display (strips HTML tags).
   * @param {string} text
   * @returns {string}
   */
  function sanitizeText(text) {
    if (typeof text !== 'string') return String(text || '');
    return text.replace(/[<>&"']/g, function(c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  exports.LEVEL_THRESHOLDS      = LEVEL_THRESHOLDS;
  exports.TITLE_LIST            = TITLE_LIST;
  exports.SKILL_META            = SKILL_META;
  exports.createProfile         = createProfile;
  exports.getProfileStats       = getProfileStats;
  exports.getProfileBadges      = getProfileBadges;
  exports.getProfileTitle       = getProfileTitle;
  exports.getSkillSummary       = getSkillSummary;
  exports.getGuildInfo          = getGuildInfo;
  exports.getPetInfo            = getPetInfo;
  exports.getExplorationProgress = getExplorationProgress;
  exports.formatProfileCard     = formatProfileCard;
  exports.compareProfiles       = compareProfiles;
  exports.getProfileLevel       = getProfileLevel;
  exports.showPlayerProfilePanel = showPlayerProfilePanel;
  exports.formatPlayTime        = formatPlayTime;
  exports.sanitizeText          = sanitizeText;
  exports.sumSkillLevels        = sumSkillLevels;
  exports.getLevelTitle         = getLevelTitle;

})(typeof module !== 'undefined' ? module.exports : (window.Profiles = {}));
