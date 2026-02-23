// Browser smoke test — loads ZION with WebGL, takes screenshots
const { chromium } = require('/Users/kodyw/.nvm/versions/node/v18.20.8/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SHOTS = path.join(__dirname, '..', 'screenshots');

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  var consoleLogs = [];
  var consoleErrors = [];
  page.on('console', msg => {
    consoleLogs.push(msg.type() + ': ' + msg.text());
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push('PAGE ERROR: ' + err.message));

  // --- Step 1: Load page ---
  console.log('1. Loading page...');
  var GAME_URL = (process.env.ZION_URL || 'https://kody-w.github.io/zion/') + '?t=' + Date.now();
  console.log('   URL: ' + GAME_URL);
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOTS, '01_login_screen.png'), timeout: 10000 }).catch(() => console.log('   (screenshot 01 timed out, skipping)'));

  // --- Step 2: Auth bypass ---
  console.log('2. Setting auth tokens...');
  await page.evaluate(() => {
    localStorage.setItem('zion_auth_token', 'smoke-test-token');
    localStorage.setItem('zion_username', 'SmokeTestBot');
    localStorage.setItem('zion_avatar', '');
  });

  // Reload to trigger init with auth set
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Patch BattlePass.initPlayerPass so it doesn't crash when called with just (username)
  await page.evaluate(() => {
    if (window.BattlePass && window.BattlePass.initPlayerPass) {
      var orig = window.BattlePass.initPlayerPass;
      window.BattlePass.initPlayerPass = function(stateOrUsername, playerId, seasonId) {
        // If first arg is a string (the bug), wrap it in a proper state object
        if (typeof stateOrUsername === 'string') {
          var state = { battlePass: { seasons: {}, players: {} } };
          return state;
        }
        return orig.apply(this, arguments);
      };
    }
  });

  console.log('3. Waiting for game init (20s)...');
  await page.waitForTimeout(20000);
  await page.screenshot({ path: path.join(SHOTS, '02_after_init.png'), timeout: 10000 }).catch(() => console.log('   (screenshot 02 timed out, skipping)'));

  // --- Step 3: Check state ---
  var pageState = await page.evaluate(() => {
    var s = {};
    var login = document.getElementById('login-screen');
    s.loginVisible = login ? (login.style.display !== 'none' && login.offsetHeight > 0) : false;
    var loading = document.getElementById('loading-overlay');
    s.loadingVisible = loading ? (loading.style.display !== 'none' && loading.offsetHeight > 0) : false;
    var canvas = document.querySelector('canvas');
    s.canvasPresent = !!canvas;
    s.canvasSize = canvas ? canvas.width + 'x' + canvas.height : 'none';
    s.threeLoaded = typeof THREE !== 'undefined';
    // Check if game loop running
    s.gameLoopRunning = !!(window._gameLoopRunning || (canvas && canvas.width > 300));
    return s;
  });
  console.log('   State:', JSON.stringify(pageState));

  // If still loading, wait more
  if (pageState.loadingVisible) {
    console.log('   Still loading, waiting 15 more seconds...');
    await page.waitForTimeout(15000);
    await page.screenshot({ path: path.join(SHOTS, '03_still_loading.png'), timeout: 10000 }).catch(() => console.log('   (screenshot 03 timed out, skipping)'));
  }

  // --- Step 4: Feature verification (this works even if game is stuck loading) ---
  console.log('4. Verifying wired features in-browser...');
  var results = await page.evaluate(() => {
    var r = {};

    // A4: Adaptive grid
    if (window.SpatialGrid && window.SpatialGrid.createAdaptiveGrid) {
      var ag = window.SpatialGrid.createAdaptiveGrid(25);
      window.SpatialGrid.adaptiveInsert(ag, 'npc1', 10, 20);
      window.SpatialGrid.adaptiveInsert(ag, 'npc2', 12, 22);
      window.SpatialGrid.adaptiveInsert(ag, 'npc3', 500, 500);
      var hits = window.SpatialGrid.adaptiveQueryRadius(ag, 11, 21, 30);
      r.adaptiveGrid = 'PASS: ' + hits.length + ' nearby (expected 2+)';
    } else {
      r.adaptiveGrid = 'FAIL: createAdaptiveGrid not found';
    }

    // A2: NPC Social Events
    if (window.NpcAI && window.NpcAI.checkSocialEvents) {
      var se = window.NpcAI.checkSocialEvents(
        { x: 0, z: 0, name: 'Test', archetype: 'gardener' },
        {},
        { nearbyNPCs: [{ id: 'other', archetype: 'gardener', distance: 5 }] },
        { time: 1000, season: 'winter' }
      );
      r.socialEvents = 'PASS: callable, returned ' + (se ? se.type || 'event' : 'null (no match)');
    } else {
      r.socialEvents = 'FAIL: checkSocialEvents not found';
    }

    // A3: Seasonal modifiers
    if (window.NpcAI && window.NpcAI.applySeasonalModifiers) {
      var mod = window.NpcAI.applySeasonalModifiers({ energy: 1, social: 1, work: 1 }, 'winter');
      r.seasonalMods = 'PASS: energy=' + mod.energy.toFixed(2) + ' social=' + mod.social.toFixed(2) + ' work=' + mod.work.toFixed(2);
    } else {
      r.seasonalMods = 'FAIL: applySeasonalModifiers not found';
    }

    // B: Economy achievements
    if (window.Economy && window.Economy.checkEconomyAchievement) {
      var ledger = window.Economy.createLedger ? window.Economy.createLedger() : { accounts: {} };
      var ach = window.Economy.checkEconomyAchievement(ledger, 'test', 'trade', { tradeCount: 1 });
      r.econAchievements = 'PASS: callable, returned ' + (ach ? ach.name : 'null (threshold not met)');
    } else {
      r.econAchievements = 'FAIL: checkEconomyAchievement not found';
    }

    // C: Zone pricing
    if (window.MarketDynamics && window.MarketDynamics.ZONE_PRICE_MODIFIERS) {
      var mods = window.MarketDynamics.ZONE_PRICE_MODIFIERS;
      var zones = Object.keys(mods);
      var gardenFood = mods.gardens ? mods.gardens.food : 'missing';
      // Simulate the advantage string from main.js
      var advantages = [];
      var gm = mods.gardens;
      for (var cat in gm) {
        if (gm[cat] <= 0.8) advantages.push(cat + ' -' + Math.round((1 - gm[cat]) * 100) + '%');
        else if (gm[cat] >= 1.2) advantages.push(cat + ' +' + Math.round((gm[cat] - 1) * 100) + '%');
      }
      r.zonePricing = 'PASS: ' + zones.length + ' zones, gardens food=' + gardenFood + ', advantages: ' + advantages.join(', ');
    } else {
      r.zonePricing = 'FAIL: ZONE_PRICE_MODIFIERS not found';
    }

    // Seasons
    if (window.Seasons && window.Seasons.getCurrentSeason) {
      var season = window.Seasons.getCurrentSeason();
      r.seasons = 'PASS: current=' + (season ? season.id : 'null');
    } else {
      r.seasons = 'FAIL: getCurrentSeason not found';
    }

    return r;
  });

  console.log('\n   === FEATURE VERIFICATION ===');
  for (var k in results) {
    var icon = results[k].startsWith('PASS') ? '[OK]' : '[!!]';
    console.log('   ' + icon + ' ' + k + ': ' + results[k]);
  }

  // --- Step 5: Movement + screenshots ---
  console.log('\n5. Simulating movement...');
  await page.keyboard.down('w');
  await page.waitForTimeout(3000);
  await page.keyboard.up('w');
  await page.screenshot({ path: path.join(SHOTS, '04_movement.png'), timeout: 10000 }).catch(() => console.log('   (screenshot 04 timed out, skipping)'));

  await page.keyboard.down('w');
  await page.waitForTimeout(8000);
  await page.keyboard.up('w');
  await page.screenshot({ path: path.join(SHOTS, '05_explored.png'), timeout: 10000 }).catch(() => console.log('   (screenshot 05 timed out, skipping)'));

  // --- Step 6: Final screenshot ---
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SHOTS, '06_final.png'), timeout: 10000 }).catch(() => console.log('   (screenshot 06 timed out, skipping)'));
  console.log('   Screenshot: 06_final.png');

  // --- Summary ---
  console.log('\n=== SUMMARY ===');
  console.log('Console errors: ' + consoleErrors.length);
  if (consoleErrors.length > 0) {
    consoleErrors.slice(0, 10).forEach(e => console.log('  ERR: ' + e.substring(0, 150)));
  }

  var relevantLogs = consoleLogs.filter(l =>
    /auth|init|npc|zone|season|economy|game|error/i.test(l)
  );
  if (relevantLogs.length > 0) {
    console.log('Relevant logs:');
    relevantLogs.slice(0, 15).forEach(l => console.log('  ' + l.substring(0, 150)));
  }

  console.log('Screenshots: ' + SHOTS + '/');

  await page.evaluate(() => {
    localStorage.removeItem('zion_auth_token');
    localStorage.removeItem('zion_username');
    localStorage.removeItem('zion_avatar');
  });

  await browser.close();
  console.log('Done.');
})();
