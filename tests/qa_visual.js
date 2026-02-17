#!/usr/bin/env node
/**
 * Visual QA script for ZION using Playwright.
 *
 * Usage:
 *   # Against local HTTP server (recommended):
 *   node tests/qa_visual.js http://localhost:8000
 *
 *   # Against live GitHub Pages:
 *   node tests/qa_visual.js https://kody-w.github.io/zion/
 *
 * Requires: npm install -g playwright (or npx playwright install)
 * Screenshots are saved to /tmp/zion_qa_*.png
 */
'use strict';

var URL = process.argv[2] || 'https://kody-w.github.io/zion/';
var SCREENSHOT_DIR = '/tmp';

async function run() {
  var playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.error('Playwright not found. Install with: npm install playwright');
    process.exit(1);
  }

  var chromium = playwright.chromium;
  console.log('Launching browser...');
  var browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--enable-unsafe-swiftshader'
    ]
  });

  var context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  var page = await context.newPage();

  var pageErrors = [];
  var consoleErrors = [];
  page.on('pageerror', function(err) {
    pageErrors.push({ message: err.message, stack: (err.stack || '').split('\n')[1] || '' });
  });
  page.on('console', function(msg) {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // 1. Load page
  console.log('Loading: ' + URL);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: SCREENSHOT_DIR + '/zion_qa_01_login.png' });
  console.log('Screenshot 1: Login screen');

  // 2. Check Schema.org and NLWeb metadata
  var metadata = await page.evaluate(function() {
    var ld = document.querySelector('script[type="application/ld+json"]');
    var nlweb = document.querySelector('link[rel="nlweb"]');
    var rss = Array.from(document.querySelectorAll('link[type="application/rss+xml"]'));
    return {
      jsonLd: ld ? JSON.parse(ld.textContent) : null,
      nlwebHref: nlweb ? nlweb.href : null,
      rssFeeds: rss.map(function(l) { return l.title; })
    };
  });
  console.log('Schema.org: ' + (metadata.jsonLd ? metadata.jsonLd['@type'] : 'MISSING'));
  console.log('NLWeb link: ' + (metadata.nlwebHref || 'MISSING'));
  console.log('RSS feeds: ' + metadata.rssFeeds.join(', '));

  // 3. Login as guest
  console.log('Logging in as guest...');
  await page.evaluate(function() { Auth.loginAsGuest('QA_Tester'); });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: SCREENSHOT_DIR + '/zion_qa_02_world.png' });
  console.log('Screenshot 2: World entry');

  // 4. Check world state
  var ws = await page.evaluate(function() {
    var c = document.querySelector('canvas');
    var gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    var banner = document.getElementById('seasonal-banner');
    return {
      canvasSize: c ? { w: c.width, h: c.height } : null,
      hasWebGL: !!gl,
      renderer: gl ? gl.getParameter(gl.RENDERER) : null,
      loginHidden: (document.getElementById('login-screen') || {}).style ?
        document.getElementById('login-screen').style.display === 'none' : false,
      bannerText: banner ? banner.textContent : null
    };
  });

  // 5. Walk around if in world
  if (ws.loginHidden) {
    console.log('In world — walking around Nexus...');
    var canvas = page.locator('canvas').first();
    await canvas.click({ force: true }).catch(function() {});
    await page.waitForTimeout(300);
    var moves = [['w', 1500], ['a', 800], ['s', 1500], ['d', 800], ['w', 2000]];
    for (var i = 0; i < moves.length; i++) {
      await page.keyboard.down(moves[i][0]);
      await page.waitForTimeout(moves[i][1]);
      await page.keyboard.up(moves[i][0]);
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: SCREENSHOT_DIR + '/zion_qa_03_walked.png' });
    console.log('Screenshot 3: After walking');

    // Look around
    var box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2 - 50, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: SCREENSHOT_DIR + '/zion_qa_04_looked.png' });
    console.log('Screenshot 4: After looking around');
  }

  // 6. Report
  console.log('\n═══ ZION VISUAL QA REPORT ═══');
  console.log('URL: ' + URL);
  console.log('');
  console.log('Metadata:');
  console.log('  Schema.org:  ' + (metadata.jsonLd ? '✅' : '❌'));
  console.log('  NLWeb:       ' + (metadata.nlwebHref ? '✅' : '❌'));
  console.log('  RSS feeds:   ' + (metadata.rssFeeds.length > 0 ? '✅ ' + metadata.rssFeeds.length : '❌'));
  console.log('');
  console.log('Rendering:');
  console.log('  WebGL:       ' + (ws.hasWebGL ? '✅ ' + ws.renderer : '❌'));
  console.log('  Canvas:      ' + (ws.canvasSize ? ws.canvasSize.w + 'x' + ws.canvasSize.h : '❌'));
  console.log('  Login flow:  ' + (ws.loginHidden ? '✅' : '❌'));
  console.log('  Banner:      ' + (ws.bannerText || '(hidden)'));
  console.log('  [obj Object]:' + (ws.bannerText && ws.bannerText.includes('[object Object]') ? ' 🔴 YES' : ' ✅ NO'));
  console.log('');

  var nonPeerErrors = consoleErrors.filter(function(e) { return e.indexOf('PeerJS') === -1; });
  console.log('Errors:');
  console.log('  Page errors: ' + (pageErrors.length === 0 ? '✅ 0' : '❌ ' + pageErrors.length));
  pageErrors.forEach(function(e) { console.log('    → ' + e.message + ' ' + e.stack); });
  console.log('  JS errors:   ' + (nonPeerErrors.length === 0 ? '✅ 0' : '❌ ' + nonPeerErrors.length));
  nonPeerErrors.forEach(function(e) { console.log('    → ' + e.substring(0, 150)); });
  console.log('  PeerJS:      ' + consoleErrors.filter(function(e) { return e.indexOf('PeerJS') !== -1; }).length + ' (expected offline)');
  console.log('═══ END ═══');

  var exitCode = pageErrors.length + nonPeerErrors.length;
  await browser.close();
  process.exit(exitCode > 0 ? 1 : 0);
}

run().catch(function(err) {
  console.error('QA script failed:', err.message);
  process.exit(1);
});
