/**
 * tests/test_profiles.js
 * 60+ tests for src/js/profiles.js
 */
const { test, suite, report, assert } = require('./test_runner');
const Profiles = require('../src/js/profiles');

// ============================================================================
// Helpers
// ============================================================================

function makeQuestData(opts) {
  opts = opts || {};
  return {
    activeQuests:    opts.active    || 0,
    completedQuests: opts.completed || 0,
    totalAvailable:  opts.total     || 25,
    completedChains: opts.chains    || 0,
    totalChains:     opts.totalChains || 6,
    titles:          opts.titles    || []
  };
}

function makeGuildData(playerId, opts) {
  opts = opts || {};
  return {
    id:      opts.id      || 'guild_001',
    name:    opts.name    || 'Test Guild',
    tag:     opts.tag     || 'TST',
    type:    opts.type    || 'guild',
    level:   opts.level   || 1,
    members: opts.members || [
      { playerId: playerId, role: opts.role || 'member', joinedAt: Date.now() }
    ]
  };
}

function makeSkillData(overrides) {
  var base = {
    gardening:   { level: 0, xp: 0,   levelName: 'Seedling' },
    crafting:    { level: 1, xp: 120, levelName: 'Apprentice' },
    building:    { level: 0, xp: 0,   levelName: 'Laborer' },
    exploration: { level: 2, xp: 350, levelName: 'Explorer' },
    trading:     { level: 0, xp: 0,   levelName: 'Haggler' },
    social:      { level: 1, xp: 150, levelName: 'Friendly' },
    combat:      { level: 0, xp: 0,   levelName: 'Brawler' },
    lore:        { level: 3, xp: 650, levelName: 'Sage' }
  };
  if (overrides) {
    for (var k in overrides) base[k] = overrides[k];
  }
  return base;
}

function makePetData(opts) {
  opts = opts || {};
  return {
    id:   opts.id   || 'pet_001',
    type: opts.type || 'fox',
    name: opts.name || 'Sparky',
    icon: opts.icon || '[fox]',
    rarity: opts.rarity || 'uncommon',
    mood: typeof opts.mood === 'number' ? opts.mood : 80,
    bond: typeof opts.bond === 'number' ? opts.bond : 20,
    bonus: opts.bonus || { type: 'discovery_range', value: 2 }
  };
}

function makeDiscoveryData(playerId, count) {
  var list = [];
  var zones = ['nexus', 'gardens', 'wilds', 'commons', 'athenaeum'];
  for (var i = 0; i < count; i++) {
    list.push({
      discoverer: playerId,
      type:  i % 3 === 0 ? 'secret' : (i % 3 === 1 ? 'lore' : 'landmark'),
      zone:  zones[i % zones.length],
      rarity: 0.2,
      description: 'Discovery ' + i
    });
  }
  return list;
}

function makeLedger(playerId, balance) {
  return { balances: { [playerId]: balance || 0 } };
}

function makeReputation(opts) {
  opts = opts || {};
  return { score: opts.score || 0, tier: opts.tier || 'Newcomer' };
}

function makeAchievements(ids) {
  var ach = {};
  ids.forEach(function(id, i) {
    ach[id] = {
      earned: true,
      name: id.replace(/_/g, ' '),
      description: 'Desc for ' + id,
      icon: '[' + id[0] + ']',
      category: 'misc',
      ts: Date.now() - i * 1000
    };
  });
  return ach;
}

// ============================================================================
// Suite 1: LEVEL_THRESHOLDS constant
// ============================================================================
suite('LEVEL_THRESHOLDS', function() {
  test('is an array', function() {
    assert(Array.isArray(Profiles.LEVEL_THRESHOLDS));
  });

  test('has 15 entries', function() {
    assert.strictEqual(Profiles.LEVEL_THRESHOLDS.length, 15);
  });

  test('level 1 has xpRequired 0', function() {
    var lvl1 = Profiles.LEVEL_THRESHOLDS[0];
    assert.strictEqual(lvl1.level, 1);
    assert.strictEqual(lvl1.xpRequired, 0);
  });

  test('level 15 is highest level', function() {
    var last = Profiles.LEVEL_THRESHOLDS[14];
    assert.strictEqual(last.level, 15);
  });

  test('each entry has level, xpRequired, title', function() {
    Profiles.LEVEL_THRESHOLDS.forEach(function(t) {
      assert(typeof t.level === 'number');
      assert(typeof t.xpRequired === 'number');
      assert(typeof t.title === 'string');
    });
  });

  test('thresholds are strictly increasing', function() {
    for (var i = 1; i < Profiles.LEVEL_THRESHOLDS.length; i++) {
      assert(Profiles.LEVEL_THRESHOLDS[i].xpRequired > Profiles.LEVEL_THRESHOLDS[i-1].xpRequired,
        'Level ' + (i+1) + ' xpRequired must exceed level ' + i);
    }
  });
});

// ============================================================================
// Suite 2: TITLE_LIST constant
// ============================================================================
suite('TITLE_LIST', function() {
  test('is an array', function() {
    assert(Array.isArray(Profiles.TITLE_LIST));
  });

  test('has at least 15 entries', function() {
    assert(Profiles.TITLE_LIST.length >= 15);
  });

  test('each entry has id, name, description, condition', function() {
    Profiles.TITLE_LIST.forEach(function(t) {
      assert(t.id, 'title needs id');
      assert(t.name, 'title needs name');
      assert(t.description, 'title needs description');
      assert(t.condition, 'title needs condition');
    });
  });

  test('ids are unique', function() {
    var ids = Profiles.TITLE_LIST.map(function(t) { return t.id; });
    var unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length);
  });
});

// ============================================================================
// Suite 3: formatPlayTime
// ============================================================================
suite('formatPlayTime', function() {
  test('formats 0 seconds', function() {
    assert.strictEqual(Profiles.formatPlayTime(0), '0s');
  });

  test('formats under 60 seconds', function() {
    assert.strictEqual(Profiles.formatPlayTime(45), '45s');
  });

  test('formats minutes', function() {
    assert.strictEqual(Profiles.formatPlayTime(120), '2m');
  });

  test('formats hours and minutes', function() {
    var result = Profiles.formatPlayTime(3661); // 1h 1m
    assert(result.indexOf('1h') !== -1);
    assert(result.indexOf('1m') !== -1);
  });

  test('handles null/undefined gracefully', function() {
    assert.strictEqual(Profiles.formatPlayTime(null), '0s');
    assert.strictEqual(Profiles.formatPlayTime(undefined), '0s');
  });
});

// ============================================================================
// Suite 4: sanitizeText
// ============================================================================
suite('sanitizeText', function() {
  test('plain text unchanged', function() {
    assert.strictEqual(Profiles.sanitizeText('hello world'), 'hello world');
  });

  test('escapes less-than', function() {
    assert(Profiles.sanitizeText('<b>').indexOf('&lt;') !== -1);
  });

  test('escapes greater-than', function() {
    assert(Profiles.sanitizeText('>hi').indexOf('&gt;') !== -1);
  });

  test('escapes ampersand', function() {
    assert(Profiles.sanitizeText('a&b').indexOf('&amp;') !== -1);
  });

  test('escapes double quote', function() {
    assert(Profiles.sanitizeText('"test"').indexOf('&quot;') !== -1);
  });

  test('escapes single quote', function() {
    assert(Profiles.sanitizeText("it's").indexOf('&#39;') !== -1);
  });

  test('handles non-string input', function() {
    var result = Profiles.sanitizeText(42);
    assert.strictEqual(result, '42');
  });

  test('handles null', function() {
    var result = Profiles.sanitizeText(null);
    assert(typeof result === 'string');
  });
});

// ============================================================================
// Suite 5: getLevelTitle
// ============================================================================
suite('getLevelTitle', function() {
  test('level 1 returns Newcomer', function() {
    assert.strictEqual(Profiles.getLevelTitle(1), 'Newcomer');
  });

  test('level 5 returns Adventurer', function() {
    assert.strictEqual(Profiles.getLevelTitle(5), 'Adventurer');
  });

  test('level 15 returns Transcendent', function() {
    assert.strictEqual(Profiles.getLevelTitle(15), 'Transcendent');
  });

  test('unknown level falls back gracefully', function() {
    var result = Profiles.getLevelTitle(99);
    assert(typeof result === 'string');
  });
});

// ============================================================================
// Suite 6: sumSkillLevels
// ============================================================================
suite('sumSkillLevels', function() {
  test('returns 0 for null', function() {
    assert.strictEqual(Profiles.sumSkillLevels(null), 0);
  });

  test('returns 0 for empty object', function() {
    assert.strictEqual(Profiles.sumSkillLevels({}), 0);
  });

  test('sums levels correctly', function() {
    var summary = Profiles.getSkillSummary('p1', makeSkillData());
    var sum = Profiles.sumSkillLevels(summary);
    // crafting:1, exploration:2, social:1, lore:3 = 7
    assert.strictEqual(sum, 7);
  });

  test('handles mixed zero/non-zero', function() {
    var skills = { a: { level: 0 }, b: { level: 3 }, c: { level: 1 } };
    assert.strictEqual(Profiles.sumSkillLevels(skills), 4);
  });
});

// ============================================================================
// Suite 7: getSkillSummary
// ============================================================================
suite('getSkillSummary', function() {
  test('returns 8 skill keys', function() {
    var summary = Profiles.getSkillSummary('p1', makeSkillData());
    assert.strictEqual(Object.keys(summary).length, 8);
  });

  test('null mentoringData returns zero levels', function() {
    var summary = Profiles.getSkillSummary('p1', null);
    for (var k in summary) {
      assert.strictEqual(summary[k].level, 0);
    }
  });

  test('each skill has level, levelName, xp, xpToNext, icon, color', function() {
    var summary = Profiles.getSkillSummary('p1', makeSkillData());
    ['gardening', 'crafting', 'building', 'exploration',
     'trading', 'social', 'combat', 'lore'].forEach(function(skill) {
      var s = summary[skill];
      assert(s !== undefined, skill + ' should exist');
      assert(typeof s.level === 'number');
      assert(typeof s.levelName === 'string');
      assert(typeof s.xp === 'number');
      assert(typeof s.xpToNext === 'number');
      assert(typeof s.icon === 'string');
      assert(typeof s.color === 'string');
    });
  });

  test('correct level propagated', function() {
    var data = makeSkillData();
    var summary = Profiles.getSkillSummary('p1', data);
    assert.strictEqual(summary.lore.level, 3);
    assert.strictEqual(summary.crafting.level, 1);
  });

  test('maxLevel is 4', function() {
    var summary = Profiles.getSkillSummary('p1', null);
    for (var k in summary) {
      assert.strictEqual(summary[k].maxLevel, 4);
    }
  });

  test('xpToNext is 0 when level is maxed', function() {
    var data = makeSkillData({ lore: { level: 4, xp: 1000, levelName: 'Lorekeeper' } });
    var summary = Profiles.getSkillSummary('p1', data);
    assert.strictEqual(summary.lore.xpToNext, 0);
  });
});

// ============================================================================
// Suite 8: getGuildInfo
// ============================================================================
suite('getGuildInfo', function() {
  test('null guildData returns inGuild false', function() {
    var info = Profiles.getGuildInfo('p1', null);
    assert.strictEqual(info.inGuild, false);
    assert.strictEqual(info.guildId, null);
    assert.strictEqual(info.memberCount, 0);
  });

  test('valid guild data returns inGuild true', function() {
    var info = Profiles.getGuildInfo('p1', makeGuildData('p1'));
    assert.strictEqual(info.inGuild, true);
  });

  test('returns correct guild name and tag', function() {
    var info = Profiles.getGuildInfo('p1', makeGuildData('p1', { name: 'Zion Guild', tag: 'ZG' }));
    assert.strictEqual(info.guildName, 'Zion Guild');
    assert.strictEqual(info.guildTag, 'ZG');
  });

  test('returns correct member count', function() {
    var guildData = makeGuildData('p1', {
      members: [
        { playerId: 'p1', role: 'leader' },
        { playerId: 'p2', role: 'member' },
        { playerId: 'p3', role: 'member' }
      ]
    });
    var info = Profiles.getGuildInfo('p1', guildData);
    assert.strictEqual(info.memberCount, 3);
  });

  test('returns correct player role', function() {
    var guildData = makeGuildData('p1', { role: 'officer' });
    var info = Profiles.getGuildInfo('p1', guildData);
    assert.strictEqual(info.role, 'officer');
  });

  test('sanitizes guild name for HTML safety', function() {
    var guildData = makeGuildData('p1', { name: '<script>evil</script>' });
    var info = Profiles.getGuildInfo('p1', guildData);
    assert(info.guildName.indexOf('<script>') === -1);
  });
});

// ============================================================================
// Suite 9: getPetInfo
// ============================================================================
suite('getPetInfo', function() {
  test('null petData returns hasPet false', function() {
    var info = Profiles.getPetInfo('p1', null);
    assert.strictEqual(info.hasPet, false);
    assert.strictEqual(info.name, null);
  });

  test('valid pet data returns hasPet true', function() {
    var info = Profiles.getPetInfo('p1', makePetData());
    assert.strictEqual(info.hasPet, true);
  });

  test('returns correct pet fields', function() {
    var pet = makePetData({ name: 'Fluffy', type: 'cat', rarity: 'common', mood: 90, bond: 50 });
    var info = Profiles.getPetInfo('p1', pet);
    assert.strictEqual(info.name, 'Fluffy');
    assert.strictEqual(info.type, 'cat');
    assert.strictEqual(info.rarity, 'common');
    assert.strictEqual(info.mood, 90);
    assert.strictEqual(info.bond, 50);
  });

  test('returns bonus if present', function() {
    var pet = makePetData({ bonus: { type: 'stamina', value: 3 } });
    var info = Profiles.getPetInfo('p1', pet);
    assert(info.bonus !== null);
    assert.strictEqual(info.bonus.type, 'stamina');
  });

  test('sanitizes pet name', function() {
    var pet = makePetData({ name: '<b>hack</b>' });
    var info = Profiles.getPetInfo('p1', pet);
    assert(info.name.indexOf('<b>') === -1);
  });
});

// ============================================================================
// Suite 10: getExplorationProgress
// ============================================================================
suite('getExplorationProgress', function() {
  test('null discoveryData returns zero counts', function() {
    var prog = Profiles.getExplorationProgress('p1', null);
    assert.strictEqual(prog.totalDiscoveries, 0);
    assert.strictEqual(prog.zonesDiscovered, 0);
    assert.strictEqual(prog.secretsFound, 0);
    assert.strictEqual(prog.loreUnlocked, 0);
  });

  test('counts correct number of player discoveries', function() {
    var list = makeDiscoveryData('p1', 9);
    var prog = Profiles.getExplorationProgress('p1', list);
    assert.strictEqual(prog.totalDiscoveries, 9);
  });

  test('does not count other players discoveries', function() {
    var list = makeDiscoveryData('p2', 5);
    var prog = Profiles.getExplorationProgress('p1', list);
    assert.strictEqual(prog.totalDiscoveries, 0);
  });

  test('counts unique zones', function() {
    var list = makeDiscoveryData('p1', 5); // 5 zones = nexus,gardens,wilds,commons,athenaeum
    var prog = Profiles.getExplorationProgress('p1', list);
    assert(prog.zonesDiscovered >= 1);
    assert(prog.zonesDiscovered <= 5);
  });

  test('counts secrets correctly', function() {
    // makeDiscoveryData: every 3rd (i=0,3,6...) is 'secret'
    var list = makeDiscoveryData('p1', 6);
    var prog = Profiles.getExplorationProgress('p1', list);
    assert.strictEqual(prog.secretsFound, 2);
  });

  test('counts lore correctly', function() {
    // i % 3 === 1 => lore
    var list = makeDiscoveryData('p1', 6);
    var prog = Profiles.getExplorationProgress('p1', list);
    assert.strictEqual(prog.loreUnlocked, 2);
  });

  test('accepts object with list property', function() {
    var list = makeDiscoveryData('p1', 3);
    var prog = Profiles.getExplorationProgress('p1', { list: list });
    assert.strictEqual(prog.totalDiscoveries, 3);
  });

  test('discoveries array returned is correct length', function() {
    var list = makeDiscoveryData('p1', 4);
    var prog = Profiles.getExplorationProgress('p1', list);
    assert.strictEqual(prog.discoveries.length, 4);
  });
});

// ============================================================================
// Suite 11: getProfileBadges
// ============================================================================
suite('getProfileBadges', function() {
  test('null achievements returns empty array', function() {
    var badges = Profiles.getProfileBadges('p1', null);
    assert(Array.isArray(badges));
    assert.strictEqual(badges.length, 0);
  });

  test('returns only earned badges', function() {
    var ach = {
      badge_a: { earned: true,  name: 'A', description: 'a', icon: '[a]', category: 'x', ts: 1000 },
      badge_b: { earned: false, name: 'B', description: 'b', icon: '[b]', category: 'x', ts: 0 }
    };
    var badges = Profiles.getProfileBadges('p1', ach);
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0].id, 'badge_a');
  });

  test('each badge has required fields', function() {
    var ach = makeAchievements(['first_steps', 'zone_hopper']);
    var badges = Profiles.getProfileBadges('p1', ach);
    badges.forEach(function(b) {
      assert(b.id);
      assert(b.name);
      assert(b.icon);
      assert(typeof b.earnedAt === 'number');
    });
  });

  test('sorted by earnedAt descending', function() {
    var now = Date.now();
    var ach = {
      badge_old: { earned: true, name: 'Old', description: '', icon: '[o]', category: 'x', ts: now - 10000 },
      badge_new: { earned: true, name: 'New', description: '', icon: '[n]', category: 'x', ts: now }
    };
    var badges = Profiles.getProfileBadges('p1', ach);
    assert.strictEqual(badges[0].id, 'badge_new');
    assert.strictEqual(badges[1].id, 'badge_old');
  });
});

// ============================================================================
// Suite 12: getProfileTitle
// ============================================================================
suite('getProfileTitle', function() {
  test('returns empty array for null questStats', function() {
    var titles = Profiles.getProfileTitle('p1', null);
    assert(Array.isArray(titles));
  });

  test('adds Questmaster at 10+ quests', function() {
    var qd = makeQuestData({ completed: 10 });
    var titles = Profiles.getProfileTitle('p1', qd);
    assert(titles.indexOf('The Questmaster') !== -1);
  });

  test('no Questmaster below 10 quests', function() {
    var qd = makeQuestData({ completed: 5 });
    var titles = Profiles.getProfileTitle('p1', qd);
    assert(titles.indexOf('The Questmaster') === -1);
  });

  test('adds Completionist at 25+ quests', function() {
    var qd = makeQuestData({ completed: 25 });
    var titles = Profiles.getProfileTitle('p1', qd);
    assert(titles.indexOf('The Completionist') !== -1);
  });

  test('preserves titles from quest chains', function() {
    var qd = makeQuestData({ completed: 0, titles: ['Champion of Gardens'] });
    var titles = Profiles.getProfileTitle('p1', qd);
    assert(titles.indexOf('Champion of Gardens') !== -1);
  });

  test('does not duplicate Questmaster if already present', function() {
    var qd = makeQuestData({ completed: 15, titles: ['The Questmaster'] });
    var titles = Profiles.getProfileTitle('p1', qd);
    var count = titles.filter(function(t) { return t === 'The Questmaster'; }).length;
    assert.strictEqual(count, 1);
  });
});

// ============================================================================
// Suite 13: getProfileStats
// ============================================================================
suite('getProfileStats', function() {
  test('returns all expected keys', function() {
    var stats = Profiles.getProfileStats('p1', {});
    var keys = ['questsCompleted', 'activeQuests', 'chainsCompleted',
                'discoveries', 'zonesDiscovered', 'sparkBalance',
                'reputationScore', 'reputationTier', 'playTimeSeconds', 'playTimeFormatted'];
    keys.forEach(function(k) {
      assert(k in stats, 'Missing key: ' + k);
    });
  });

  test('aggregates quest completions', function() {
    var stats = Profiles.getProfileStats('p1', {
      questData: makeQuestData({ completed: 7, chains: 2 })
    });
    assert.strictEqual(stats.questsCompleted, 7);
    assert.strictEqual(stats.chainsCompleted, 2);
  });

  test('aggregates spark from ledger', function() {
    var stats = Profiles.getProfileStats('p1', {
      ledger: makeLedger('p1', 500)
    });
    assert.strictEqual(stats.sparkBalance, 500);
  });

  test('aggregates spark from sparkBalance field', function() {
    var stats = Profiles.getProfileStats('p1', { sparkBalance: 250 });
    assert.strictEqual(stats.sparkBalance, 250);
  });

  test('aggregates reputation', function() {
    var stats = Profiles.getProfileStats('p1', {
      reputationData: makeReputation({ score: 200, tier: 'Trusted' })
    });
    assert.strictEqual(stats.reputationScore, 200);
    assert.strictEqual(stats.reputationTier, 'Trusted');
  });

  test('defaults reputation tier to Newcomer', function() {
    var stats = Profiles.getProfileStats('p1', {});
    assert.strictEqual(stats.reputationTier, 'Newcomer');
  });

  test('formats play time', function() {
    var stats = Profiles.getProfileStats('p1', { playTimeSeconds: 3600 });
    assert(stats.playTimeFormatted.indexOf('h') !== -1 || stats.playTimeFormatted.indexOf('m') !== -1);
  });

  test('counts discoveries from array discoveryData', function() {
    var list = makeDiscoveryData('p1', 4);
    var stats = Profiles.getProfileStats('p1', { discoveryData: list });
    assert.strictEqual(stats.discoveries, 4);
  });
});

// ============================================================================
// Suite 14: getProfileLevel
// ============================================================================
suite('getProfileLevel', function() {
  test('returns 1 for empty profile', function() {
    assert.strictEqual(Profiles.getProfileLevel({}), 1);
  });

  test('returns 1 for null', function() {
    assert.strictEqual(Profiles.getProfileLevel(null), 1);
  });

  test('increases with more quests', function() {
    var levelA = Profiles.getProfileLevel({ questStats: makeQuestData({ completed: 0 }) });
    var levelB = Profiles.getProfileLevel({ questStats: makeQuestData({ completed: 30 }) });
    assert(levelB >= levelA);
  });

  test('increases with more spark', function() {
    var levelA = Profiles.getProfileLevel({ sparkBalance: 0 });
    var levelB = Profiles.getProfileLevel({ sparkBalance: 5000 });
    assert(levelB >= levelA);
  });

  test('increases with more discoveries', function() {
    var levelA = Profiles.getProfileLevel({ exploration: { totalDiscoveries: 0, zonesDiscovered: 0 } });
    var levelB = Profiles.getProfileLevel({ exploration: { totalDiscoveries: 50, zonesDiscovered: 8 } });
    assert(levelB > levelA);
  });

  test('increases with higher skills', function() {
    var sumNull = Profiles.getProfileLevel({ skillSummary: null });
    var skills = Profiles.getSkillSummary('p1', makeSkillData());
    var sumSkilled = Profiles.getProfileLevel({ skillSummary: skills });
    assert(sumSkilled >= sumNull);
  });

  test('returns value in range 1–15', function() {
    var level = Profiles.getProfileLevel({
      questStats: makeQuestData({ completed: 100, chains: 10 }),
      sparkBalance: 10000,
      exploration: { totalDiscoveries: 200, zonesDiscovered: 8 },
      skillSummary: Profiles.getSkillSummary('p1', makeSkillData())
    });
    assert(level >= 1 && level <= 15);
  });
});

// ============================================================================
// Suite 15: createProfile
// ============================================================================
suite('createProfile', function() {
  test('null playerId returns null', function() {
    var profile = Profiles.createProfile(null, {});
    assert.strictEqual(profile, null);
  });

  test('returns a profile object with required keys', function() {
    var profile = Profiles.createProfile('p1', { name: 'Alice' });
    assert.strictEqual(profile.id, 'p1');
    assert.strictEqual(profile.name, 'Alice');
    assert(typeof profile.level === 'number');
    assert(typeof profile.sparkBalance === 'number');
    assert(profile.questStats);
    assert(profile.skillSummary);
    assert(profile.exploration);
    assert(profile.badges);
    assert(profile.titles);
  });

  test('uses sparkBalance from ledger', function() {
    var profile = Profiles.createProfile('p1', {
      ledger: makeLedger('p1', 333)
    });
    assert.strictEqual(profile.sparkBalance, 333);
  });

  test('uses sparkBalance field as fallback', function() {
    var profile = Profiles.createProfile('p1', { sparkBalance: 77 });
    assert.strictEqual(profile.sparkBalance, 77);
  });

  test('aggregates guildInfo', function() {
    var profile = Profiles.createProfile('p1', {
      guildData: makeGuildData('p1', { name: 'Test', tag: 'T' })
    });
    assert.strictEqual(profile.guildInfo.inGuild, true);
    assert.strictEqual(profile.guildInfo.guildName, 'Test');
  });

  test('aggregates petInfo', function() {
    var profile = Profiles.createProfile('p1', { petData: makePetData({ name: 'Fluffy' }) });
    assert.strictEqual(profile.petInfo.hasPet, true);
    assert.strictEqual(profile.petInfo.name, 'Fluffy');
  });

  test('aggregates exploration', function() {
    var profile = Profiles.createProfile('p1', {
      discoveryData: makeDiscoveryData('p1', 5)
    });
    assert.strictEqual(profile.exploration.totalDiscoveries, 5);
  });

  test('sanitizes player name', function() {
    var profile = Profiles.createProfile('p1', { name: '<script>bad</script>' });
    assert(profile.name.indexOf('<script>') === -1);
  });

  test('createdAt is set', function() {
    var profile = Profiles.createProfile('p1', {});
    assert(typeof profile.createdAt === 'number');
    assert(profile.createdAt > 0);
  });

  test('reputation defaults to Newcomer', function() {
    var profile = Profiles.createProfile('p1', {});
    assert.strictEqual(profile.reputation.tier, 'Newcomer');
  });
});

// ============================================================================
// Suite 16: formatProfileCard
// ============================================================================
suite('formatProfileCard', function() {
  test('null profile returns null', function() {
    assert.strictEqual(Profiles.formatProfileCard(null), null);
  });

  test('returns all expected display keys', function() {
    var profile = Profiles.createProfile('p1', { name: 'Bob', sparkBalance: 100 });
    var card = Profiles.formatProfileCard(profile);
    var keys = ['id', 'name', 'level', 'levelTitle', 'sparkBalance',
                'reputationTier', 'questsCompleted', 'discoveries',
                'zonesDiscovered', 'playTime', 'guildLabel', 'petLabel',
                'badgeLabels', 'skills', 'titles'];
    keys.forEach(function(k) {
      assert(k in card, 'Missing key: ' + k);
    });
  });

  test('guildLabel shows No Guild when not in guild', function() {
    var profile = Profiles.createProfile('p1', {});
    var card = Profiles.formatProfileCard(profile);
    assert.strictEqual(card.guildLabel, 'No Guild');
  });

  test('guildLabel includes tag and name when in guild', function() {
    var profile = Profiles.createProfile('p1', {
      guildData: makeGuildData('p1', { tag: 'ZN', name: 'Zion' })
    });
    var card = Profiles.formatProfileCard(profile);
    assert(card.guildLabel.indexOf('ZN') !== -1);
    assert(card.guildLabel.indexOf('Zion') !== -1);
  });

  test('petLabel shows No Companion when no pet', function() {
    var profile = Profiles.createProfile('p1', {});
    var card = Profiles.formatProfileCard(profile);
    assert.strictEqual(card.petLabel, 'No Companion');
  });

  test('petLabel includes pet name when pet exists', function() {
    var profile = Profiles.createProfile('p1', { petData: makePetData({ name: 'Max' }) });
    var card = Profiles.formatProfileCard(profile);
    assert(card.petLabel.indexOf('Max') !== -1);
  });

  test('badgeLabels is an array', function() {
    var profile = Profiles.createProfile('p1', {
      achievementData: makeAchievements(['first_steps', 'zone_hopper'])
    });
    var card = Profiles.formatProfileCard(profile);
    assert(Array.isArray(card.badgeLabels));
  });

  test('skills array has 8 entries', function() {
    var profile = Profiles.createProfile('p1', { mentoringData: makeSkillData() });
    var card = Profiles.formatProfileCard(profile);
    assert.strictEqual(card.skills.length, 8);
  });

  test('name is HTML-sanitized', function() {
    var profile = Profiles.createProfile('p1', { name: '<b>hax</b>' });
    var card = Profiles.formatProfileCard(profile);
    assert(card.name.indexOf('<b>') === -1);
  });
});

// ============================================================================
// Suite 17: compareProfiles
// ============================================================================
suite('compareProfiles', function() {
  test('returns null if either profile is null', function() {
    var profile = Profiles.createProfile('p1', {});
    assert.strictEqual(Profiles.compareProfiles(null, profile), null);
    assert.strictEqual(Profiles.compareProfiles(profile, null), null);
  });

  test('returns comparison object with players and categories', function() {
    var a = Profiles.createProfile('p1', { name: 'Alice' });
    var b = Profiles.createProfile('p2', { name: 'Bob' });
    var cmp = Profiles.compareProfiles(a, b);
    assert(Array.isArray(cmp.players));
    assert.strictEqual(cmp.players.length, 2);
    assert(typeof cmp.categories === 'object');
  });

  test('has all expected categories', function() {
    var a = Profiles.createProfile('p1', {});
    var b = Profiles.createProfile('p2', {});
    var cmp = Profiles.compareProfiles(a, b);
    ['level', 'spark', 'quests', 'discoveries', 'reputation', 'badges', 'skills'].forEach(function(cat) {
      assert(cat in cmp.categories, 'Missing category: ' + cat);
    });
  });

  test('winner is 0 when profileA wins', function() {
    var a = Profiles.createProfile('p1', { sparkBalance: 1000 });
    var b = Profiles.createProfile('p2', { sparkBalance: 0 });
    var cmp = Profiles.compareProfiles(a, b);
    assert.strictEqual(cmp.categories.spark.winner, 0);
  });

  test('winner is 1 when profileB wins', function() {
    var a = Profiles.createProfile('p1', { sparkBalance: 0 });
    var b = Profiles.createProfile('p2', { sparkBalance: 500 });
    var cmp = Profiles.compareProfiles(a, b);
    assert.strictEqual(cmp.categories.spark.winner, 1);
  });

  test('winner is -1 on tie', function() {
    var a = Profiles.createProfile('p1', { sparkBalance: 100 });
    var b = Profiles.createProfile('p2', { sparkBalance: 100 });
    var cmp = Profiles.compareProfiles(a, b);
    assert.strictEqual(cmp.categories.spark.winner, -1);
  });

  test('each category has values array of length 2', function() {
    var a = Profiles.createProfile('p1', {});
    var b = Profiles.createProfile('p2', {});
    var cmp = Profiles.compareProfiles(a, b);
    for (var cat in cmp.categories) {
      assert.strictEqual(cmp.categories[cat].values.length, 2);
    }
  });

  test('player names are sanitized in output', function() {
    var a = Profiles.createProfile('p1', { name: '<b>Alice</b>' });
    var b = Profiles.createProfile('p2', { name: 'Bob' });
    var cmp = Profiles.compareProfiles(a, b);
    assert(cmp.players[0].indexOf('<b>') === -1);
  });
});

// ============================================================================
// Report
// ============================================================================
if (!report()) process.exit(1);
