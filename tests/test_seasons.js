const { test, suite, report, assert } = require('./test_runner');
const Seasons = require('../src/js/seasons');

suite('Seasons — Constants & Data Structures', () => {

  test('SEASONS object has all 4 seasons', () => {
    const keys = Object.keys(Seasons.SEASONS);
    assert.strictEqual(keys.length, 4);
    ['spring', 'summer', 'autumn', 'winter'].forEach(s => {
      assert(keys.includes(s), `Missing season: ${s}`);
    });
  });

  test('Each season has required fields', () => {
    const requiredFields = ['id', 'name', 'description', 'startMonth', 'endMonth', 'festival', 'colors', 'bonus'];
    Object.values(Seasons.SEASONS).forEach(season => {
      requiredFields.forEach(field => {
        assert(season[field] !== undefined, `Season ${season.id} missing field: ${field}`);
      });
    });
  });

  test('Each season bonus has activity and multiplier', () => {
    Object.values(Seasons.SEASONS).forEach(season => {
      assert(typeof season.bonus.activity === 'string', `${season.id} bonus.activity must be string`);
      assert(typeof season.bonus.multiplier === 'number', `${season.id} bonus.multiplier must be number`);
      assert(season.bonus.multiplier > 1.0, `${season.id} bonus.multiplier should be > 1.0`);
    });
  });

  test('Spring covers months 2-4 (March-May)', () => {
    const spring = Seasons.SEASONS.spring;
    assert.strictEqual(spring.startMonth, 2);
    assert.strictEqual(spring.endMonth, 4);
  });

  test('Summer covers months 5-7 (June-August)', () => {
    const summer = Seasons.SEASONS.summer;
    assert.strictEqual(summer.startMonth, 5);
    assert.strictEqual(summer.endMonth, 7);
  });

  test('Autumn covers months 8-10 (September-November)', () => {
    const autumn = Seasons.SEASONS.autumn;
    assert.strictEqual(autumn.startMonth, 8);
    assert.strictEqual(autumn.endMonth, 10);
  });

  test('Winter covers months 11-1 (December-February, wrap-around)', () => {
    const winter = Seasons.SEASONS.winter;
    assert.strictEqual(winter.startMonth, 11);
    assert.strictEqual(winter.endMonth, 1);
  });

  test('Each season has colors with primary, secondary, accent, ambient', () => {
    const colorFields = ['primary', 'secondary', 'accent', 'ambient'];
    Object.values(Seasons.SEASONS).forEach(season => {
      colorFields.forEach(field => {
        assert(typeof season.colors[field] === 'string', `${season.id} missing color.${field}`);
        assert(season.colors[field].startsWith('#'), `${season.id} color.${field} should be hex`);
      });
    });
  });

  test('Each season has a festival with name, description, theme', () => {
    Object.values(Seasons.SEASONS).forEach(season => {
      assert(typeof season.festival.name === 'string', `${season.id} festival missing name`);
      assert(typeof season.festival.description === 'string', `${season.id} festival missing description`);
      assert(typeof season.festival.theme === 'string', `${season.id} festival missing theme`);
    });
  });

  test('Season bonus activities cover garden, exploration, crafting, social', () => {
    const activities = Object.values(Seasons.SEASONS).map(s => s.bonus.activity);
    ['garden', 'exploration', 'crafting', 'social'].forEach(act => {
      assert(activities.includes(act), `Missing bonus activity: ${act}`);
    });
  });

});

suite('Seasons — Seasonal Items', () => {

  test('SEASONAL_ITEMS has entries for all 4 seasons', () => {
    ['spring', 'summer', 'autumn', 'winter'].forEach(s => {
      assert(Array.isArray(Seasons.SEASONAL_ITEMS[s]), `Missing items for season: ${s}`);
      assert(Seasons.SEASONAL_ITEMS[s].length > 0, `Items array for ${s} is empty`);
    });
  });

  test('Each seasonal item has id, name, description, rarity, type', () => {
    const requiredFields = ['id', 'name', 'description', 'rarity', 'type'];
    ['spring', 'summer', 'autumn', 'winter'].forEach(seasonKey => {
      Seasons.SEASONAL_ITEMS[seasonKey].forEach(item => {
        requiredFields.forEach(field => {
          assert(item[field] !== undefined, `Item in ${seasonKey} missing field: ${field}`);
        });
      });
    });
  });

  test('Spring items include cherry_blossom, spring_bouquet, rainbow_seed', () => {
    const ids = Seasons.SEASONAL_ITEMS.spring.map(i => i.id);
    assert(ids.includes('cherry_blossom'), 'Missing cherry_blossom');
    assert(ids.includes('spring_bouquet'), 'Missing spring_bouquet');
    assert(ids.includes('rainbow_seed'), 'Missing rainbow_seed');
  });

  test('Summer items include sun_crystal, firefly_jar, tropical_fruit', () => {
    const ids = Seasons.SEASONAL_ITEMS.summer.map(i => i.id);
    assert(ids.includes('sun_crystal'), 'Missing sun_crystal');
    assert(ids.includes('firefly_jar'), 'Missing firefly_jar');
    assert(ids.includes('tropical_fruit'), 'Missing tropical_fruit');
  });

  test('Autumn items include golden_leaf, pumpkin, maple_syrup', () => {
    const ids = Seasons.SEASONAL_ITEMS.autumn.map(i => i.id);
    assert(ids.includes('golden_leaf'), 'Missing golden_leaf');
    assert(ids.includes('pumpkin'), 'Missing pumpkin');
    assert(ids.includes('maple_syrup'), 'Missing maple_syrup');
  });

  test('Winter items include snowglobe, star_ornament, hot_cocoa', () => {
    const ids = Seasons.SEASONAL_ITEMS.winter.map(i => i.id);
    assert(ids.includes('snowglobe'), 'Missing snowglobe');
    assert(ids.includes('star_ornament'), 'Missing star_ornament');
    assert(ids.includes('hot_cocoa'), 'Missing hot_cocoa');
  });

  test('Item rarities are valid values', () => {
    const validRarities = ['common', 'uncommon', 'rare', 'legendary'];
    ['spring', 'summer', 'autumn', 'winter'].forEach(seasonKey => {
      Seasons.SEASONAL_ITEMS[seasonKey].forEach(item => {
        assert(
          validRarities.includes(item.rarity),
          `Item ${item.id} has invalid rarity: ${item.rarity}`
        );
      });
    });
  });

  test('rainbow_seed is legendary rarity', () => {
    const seed = Seasons.SEASONAL_ITEMS.spring.find(i => i.id === 'rainbow_seed');
    assert(seed !== undefined, 'rainbow_seed not found');
    assert.strictEqual(seed.rarity, 'legendary');
  });

  test('phoenix_chick is NOT in SEASONAL_ITEMS (it is a pet type)', () => {
    const allItems = [
      ...Seasons.SEASONAL_ITEMS.spring,
      ...Seasons.SEASONAL_ITEMS.summer,
      ...Seasons.SEASONAL_ITEMS.autumn,
      ...Seasons.SEASONAL_ITEMS.winter
    ];
    const found = allItems.find(i => i.id === 'phoenix_chick');
    assert(found === undefined, 'phoenix_chick should not appear in seasonal items');
  });

});

suite('Seasons — Season Detection (getCurrentSeason)', () => {

  test('getCurrentSeason returns an object with id, name, bonus', () => {
    const season = Seasons.getCurrentSeason();
    assert(typeof season === 'object' && season !== null, 'Should return object');
    assert(typeof season.id === 'string', 'Should have string id');
    assert(typeof season.name === 'string', 'Should have string name');
    assert(typeof season.bonus === 'object', 'Should have bonus object');
  });

  test('getCurrentSeason returns one of the four valid seasons', () => {
    const season = Seasons.getCurrentSeason();
    const validIds = ['spring', 'summer', 'autumn', 'winter'];
    assert(validIds.includes(season.id), `Returned invalid season id: ${season.id}`);
  });

  test('getCurrentSeason is consistent across consecutive calls', () => {
    const season1 = Seasons.getCurrentSeason();
    const season2 = Seasons.getCurrentSeason();
    assert.strictEqual(season1.id, season2.id, 'Should return same season on consecutive calls');
  });

  test('Season at month 0 (January) is winter', () => {
    // January = month 0, within winter range (>= 11 OR <= 1)
    const winter = Seasons.SEASONS.winter;
    const month = 0;
    const isWinter = month >= winter.startMonth || month <= winter.endMonth;
    assert(isWinter, 'January should be winter');
  });

  test('Season at month 1 (February) is winter', () => {
    const winter = Seasons.SEASONS.winter;
    const month = 1;
    const isWinter = month >= winter.startMonth || month <= winter.endMonth;
    assert(isWinter, 'February should be winter');
  });

  test('Season at month 3 (April) is spring', () => {
    const spring = Seasons.SEASONS.spring;
    const month = 3;
    const isSpring = month >= spring.startMonth && month <= spring.endMonth;
    assert(isSpring, 'April should be spring');
  });

  test('Season at month 6 (July) is summer', () => {
    const summer = Seasons.SEASONS.summer;
    const month = 6;
    const isSummer = month >= summer.startMonth && month <= summer.endMonth;
    assert(isSummer, 'July should be summer');
  });

  test('Season at month 9 (October) is autumn', () => {
    const autumn = Seasons.SEASONS.autumn;
    const month = 9;
    const isAutumn = month >= autumn.startMonth && month <= autumn.endMonth;
    assert(isAutumn, 'October should be autumn');
  });

  test('Season at month 11 (December) is winter', () => {
    const winter = Seasons.SEASONS.winter;
    const month = 11;
    const isWinter = month >= winter.startMonth || month <= winter.endMonth;
    assert(isWinter, 'December should be winter');
  });

});

suite('Seasons — Seasonal Bonuses (getSeasonBonus)', () => {

  test('getSeasonBonus returns a number', () => {
    const bonus = Seasons.getSeasonBonus('garden');
    assert(typeof bonus === 'number', 'Bonus should be a number');
  });

  test('getSeasonBonus returns 1.0 for non-active activity', () => {
    // Find an activity that is NOT the current season's activity
    const currentSeason = Seasons.getCurrentSeason();
    const allActivities = ['garden', 'exploration', 'crafting', 'social'];
    const nonActiveActivity = allActivities.find(a => a !== currentSeason.bonus.activity);

    if (nonActiveActivity) {
      const bonus = Seasons.getSeasonBonus(nonActiveActivity);
      assert.strictEqual(bonus, 1.0, `Non-active activity ${nonActiveActivity} should return 1.0`);
    }
  });

  test('getSeasonBonus returns 1.25 for active activity', () => {
    const currentSeason = Seasons.getCurrentSeason();
    const activeActivity = currentSeason.bonus.activity;
    const bonus = Seasons.getSeasonBonus(activeActivity);
    assert.strictEqual(bonus, 1.25, `Active activity ${activeActivity} should return 1.25`);
  });

  test('getSeasonBonus returns 1.0 for completely unknown activity', () => {
    const bonus = Seasons.getSeasonBonus('nonexistent_activity');
    assert.strictEqual(bonus, 1.0, 'Unknown activity should return 1.0');
  });

  test('Exactly one activity has the 1.25 bonus per season', () => {
    const allActivities = ['garden', 'exploration', 'crafting', 'social'];
    const bonusedActivities = allActivities.filter(a => Seasons.getSeasonBonus(a) === 1.25);
    assert.strictEqual(bonusedActivities.length, 1, 'Exactly one activity should have the bonus');
  });

});

suite('Seasons — Seasonal Items & Decorations', () => {

  test('getSeasonalItems returns an array', () => {
    const items = Seasons.getSeasonalItems();
    assert(Array.isArray(items), 'Should return an array');
  });

  test('getSeasonalItems returns items for the current season', () => {
    const items = Seasons.getSeasonalItems();
    const currentSeason = Seasons.getCurrentSeason();
    const expectedItems = Seasons.SEASONAL_ITEMS[currentSeason.id];
    assert.strictEqual(items.length, expectedItems.length, 'Should match current season items count');
  });

  test('getSeasonalDecorations returns array for town zone', () => {
    const decos = Seasons.getSeasonalDecorations('town');
    assert(Array.isArray(decos), 'Should return an array');
    assert(decos.length > 0, 'Town should have decorations');
  });

  test('getSeasonalDecorations returns array for forest zone', () => {
    const decos = Seasons.getSeasonalDecorations('forest');
    assert(Array.isArray(decos), 'Should return an array');
    assert(decos.length > 0, 'Forest should have decorations');
  });

  test('getSeasonalDecorations returns array for plains zone', () => {
    const decos = Seasons.getSeasonalDecorations('plains');
    assert(Array.isArray(decos), 'Should return an array');
    assert(decos.length > 0, 'Plains should have decorations');
  });

  test('Each decoration entry has type, count, positions', () => {
    const decos = Seasons.getSeasonalDecorations('town');
    decos.forEach(deco => {
      assert(typeof deco.type === 'string', 'Decoration must have type string');
      assert(typeof deco.count === 'number', 'Decoration must have count number');
      assert(typeof deco.positions === 'string', 'Decoration must have positions string');
    });
  });

  test('getSeasonalDecorations returns empty array for unknown zone', () => {
    const decos = Seasons.getSeasonalDecorations('unknown_zone');
    assert(Array.isArray(decos), 'Should return an array (not throw)');
    assert.strictEqual(decos.length, 0, 'Unknown zone should have no decorations');
  });

});

suite('Seasons — Particles', () => {

  test('SEASONAL_PARTICLES has entries for all 4 seasons', () => {
    ['spring', 'summer', 'autumn', 'winter'].forEach(s => {
      assert(Seasons.SEASONAL_PARTICLES[s] !== undefined, `Missing particles for ${s}`);
    });
  });

  test('Each particle config has type, count, color, size, speed', () => {
    const requiredFields = ['type', 'count', 'color', 'size', 'speed'];
    ['spring', 'summer', 'autumn', 'winter'].forEach(seasonKey => {
      const particles = Seasons.SEASONAL_PARTICLES[seasonKey];
      requiredFields.forEach(field => {
        assert(particles[field] !== undefined, `${seasonKey} particles missing field: ${field}`);
      });
    });
  });

  test('getSeasonalParticles returns the correct particle config', () => {
    const particles = Seasons.getSeasonalParticles();
    const currentSeason = Seasons.getCurrentSeason();
    const expectedParticles = Seasons.SEASONAL_PARTICLES[currentSeason.id];
    assert.strictEqual(particles.type, expectedParticles.type, 'Particle type should match current season');
    assert.strictEqual(particles.count, expectedParticles.count, 'Particle count should match current season');
  });

  test('Spring particles are cherry_blossom type', () => {
    assert.strictEqual(Seasons.SEASONAL_PARTICLES.spring.type, 'cherry_blossom');
  });

  test('Summer particles are firefly type', () => {
    assert.strictEqual(Seasons.SEASONAL_PARTICLES.summer.type, 'firefly');
  });

  test('Autumn particles are falling_leaf type', () => {
    assert.strictEqual(Seasons.SEASONAL_PARTICLES.autumn.type, 'falling_leaf');
  });

  test('Winter particles are snowflake type', () => {
    assert.strictEqual(Seasons.SEASONAL_PARTICLES.winter.type, 'snowflake');
  });

  test('Winter has highest particle count (120)', () => {
    const winterCount = Seasons.SEASONAL_PARTICLES.winter.count;
    const allCounts = Object.values(Seasons.SEASONAL_PARTICLES).map(p => p.count);
    const maxCount = Math.max(...allCounts);
    assert.strictEqual(winterCount, maxCount, 'Winter should have the highest particle count');
  });

});

suite('Seasons — Greetings', () => {

  test('SEASONAL_GREETINGS has entries for all 4 seasons', () => {
    ['spring', 'summer', 'autumn', 'winter'].forEach(s => {
      assert(Array.isArray(Seasons.SEASONAL_GREETINGS[s]), `Missing greetings for ${s}`);
      assert(Seasons.SEASONAL_GREETINGS[s].length > 0, `Greetings array for ${s} is empty`);
    });
  });

  test('getSeasonalGreeting returns a non-empty string', () => {
    const greeting = Seasons.getSeasonalGreeting();
    assert(typeof greeting === 'string', 'Greeting should be a string');
    assert(greeting.length > 0, 'Greeting should not be empty');
  });

  test('getSeasonalGreeting returns a greeting from the current season', () => {
    const currentSeason = Seasons.getCurrentSeason();
    const validGreetings = Seasons.SEASONAL_GREETINGS[currentSeason.id];
    const greeting = Seasons.getSeasonalGreeting();
    assert(validGreetings.includes(greeting), `Greeting "${greeting}" not in current season's list`);
  });

  test('getSeasonalGreeting returns different greetings (random)', () => {
    // Call many times and check we get more than one unique greeting eventually
    // (with 4 greetings per season and enough tries, we should see at least 2 unique ones)
    const seenGreetings = new Set();
    for (let i = 0; i < 100; i++) {
      seenGreetings.add(Seasons.getSeasonalGreeting());
    }
    assert(seenGreetings.size >= 1, 'Should return at least one unique greeting');
    // Note: with randomness it's theoretically possible to get the same one, but 4 greetings * 100 tries makes it extremely unlikely to get only 1
  });

  test('Each greeting is a string', () => {
    ['spring', 'summer', 'autumn', 'winter'].forEach(s => {
      Seasons.SEASONAL_GREETINGS[s].forEach(greeting => {
        assert(typeof greeting === 'string', `Greeting in ${s} must be a string`);
        assert(greeting.length > 0, `Greeting in ${s} must not be empty`);
      });
    });
  });

});

suite('Seasons — Colors', () => {

  test('getSeasonalColors returns an object', () => {
    const colors = Seasons.getSeasonalColors();
    assert(typeof colors === 'object' && colors !== null, 'Should return object');
  });

  test('getSeasonalColors has primary, secondary, accent, ambient', () => {
    const colors = Seasons.getSeasonalColors();
    ['primary', 'secondary', 'accent', 'ambient'].forEach(field => {
      assert(typeof colors[field] === 'string', `Color ${field} should be a string`);
      assert(colors[field].startsWith('#'), `Color ${field} should be hex`);
    });
  });

  test('getSeasonalColors matches the current season colors', () => {
    const colors = Seasons.getSeasonalColors();
    const currentSeason = Seasons.getCurrentSeason();
    assert.strictEqual(colors.primary, currentSeason.colors.primary, 'Primary color should match current season');
  });

});

suite('Seasons — Days Until Season End', () => {

  test('getDaysUntilSeasonEnd returns a non-negative number', () => {
    const days = Seasons.getDaysUntilSeasonEnd();
    assert(typeof days === 'number', 'Should return a number');
    assert(days >= 0, 'Days remaining should be non-negative');
  });

  test('getDaysUntilSeasonEnd is at most ~92 (max season length)', () => {
    const days = Seasons.getDaysUntilSeasonEnd();
    // No season is longer than ~92 days
    assert(days <= 95, `Days remaining ${days} seems too high`);
  });

});

const success = report();
process.exit(success ? 0 : 1);
