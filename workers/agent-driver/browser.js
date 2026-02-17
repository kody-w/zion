/**
 * BrowserSession — Manages a persistent headless Chromium session for ZION.
 *
 * Handles browser launch, page navigation, guest login, and world state queries.
 */
import { chromium } from 'playwright';

const LAUNCH_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--enable-unsafe-swiftshader'
];

export class BrowserSession {
  constructor(options = {}) {
    this.url = options.url || 'https://kody-w.github.io/zion/';
    this.headless = options.headless !== false;
    this.browser = null;
    this.context = null;
    this.page = null;
    this._playerName = null;
  }

  isConnected() {
    return !!(this.browser && this.browser.isConnected());
  }

  async launch() {
    this.browser = await chromium.launch({
      headless: this.headless,
      args: LAUNCH_ARGS
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    this.page = await this.context.newPage();
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForTimeout(2000);
  }

  async joinWorld(playerName) {
    if (!this.page) throw new Error('Browser not launched');
    this._playerName = playerName;

    try {
      // Login as guest
      const loginResult = await this.page.evaluate((name) => {
        if (typeof Auth !== 'undefined' && Auth.loginAsGuest) {
          return Auth.loginAsGuest(name);
        }
        return false;
      }, playerName);

      if (!loginResult) {
        return { success: false, error: 'Auth.loginAsGuest returned false' };
      }

      // Reload to trigger world init with auth
      await this.page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(6000);

      const state = await this.getWorldState();
      if (!state.loginHidden) {
        return { success: false, error: 'Login screen still visible after join' };
      }

      return { success: true, playerName, zone: state.zone };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async leaveWorld() {
    if (!this.page) return { success: true };
    try {
      await this.page.evaluate(() => {
        if (typeof ZION !== 'undefined' && ZION.Main && ZION.Main.leaveWorld) {
          ZION.Main.leaveWorld();
        }
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getWorldState() {
    if (!this.page) throw new Error('Browser not launched');
    return this.page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      const loginEl = document.getElementById('login-screen');
      const zoneLabel = document.querySelector('.zone-label');
      const playerInfo = document.querySelector('.player-info');

      // Parse spark from HUD
      let spark = null;
      const sparkEl = document.querySelector('[class*="spark"], .player-spark');
      if (sparkEl) {
        const m = sparkEl.textContent.match(/[\d,]+/);
        if (m) spark = parseInt(m[0].replace(/,/g, ''), 10);
      }
      // Fallback: search player-info for spark
      if (spark === null && playerInfo) {
        const m = playerInfo.textContent.match(/Spark[:\s]*(\d+)/i);
        if (m) spark = parseInt(m[1], 10);
      }

      // Parse player name from HUD
      let playerName = null;
      const nameEl = document.querySelector('.player-name');
      if (nameEl) playerName = nameEl.textContent.trim();
      if (!playerName && playerInfo) {
        const lines = playerInfo.textContent.trim().split('\n');
        if (lines.length > 0) playerName = lines[0].trim();
      }

      // Parse zone from zone label
      let zone = null;
      if (zoneLabel) zone = zoneLabel.textContent.trim();

      return {
        loginHidden: loginEl ? loginEl.style.display === 'none' : true,
        hasWebGL: !!gl,
        canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
        zone: zone || null,
        playerName: playerName || null,
        spark: spark
      };
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}
