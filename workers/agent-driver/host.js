/**
 * ZionHost — Persistent world host for ZION.
 *
 * Runs a headless browser as the always-on lobby peer (zion-lobby-main).
 * Other players connect to it automatically via PeerJS.
 * NPCs are alive and the game loop runs continuously.
 *
 * Usage:
 *   import { ZionHost } from './host.js';
 *   const host = new ZionHost({ url: 'https://kody-w.github.io/zion/' });
 *   await host.start();
 *
 * CLI usage:
 *   node host.js [URL]
 *   ZION_URL=http://localhost:8000 node host.js
 */
import { chromium } from 'playwright';

const LAUNCH_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--enable-unsafe-swiftshader'
];

export class ZionHost {
  constructor(options = {}) {
    this.url = options.url || process.env.ZION_URL || 'https://kody-w.github.io/zion/';
    this.hostName = options.hostName || 'WorldHost';
    this.headless = options.headless !== false;
    this.stateInterval = options.stateInterval || 60000; // Save state every 60s

    this.browser = null;
    this.context = null;
    this.page = null;
    this._running = false;
    this._startTime = null;
    this._stateTimer = null;
    this._healthTimer = null;
  }

  isRunning() {
    return this._running && this.browser && this.browser.isConnected();
  }

  getUptime() {
    if (!this._startTime) return 0;
    return Date.now() - this._startTime;
  }

  async start() {
    console.log(`[Host] Launching browser (headless: ${this.headless})...`);
    this.browser = await chromium.launch({
      headless: this.headless,
      args: LAUNCH_ARGS
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    this.page = await this.context.newPage();

    // Log page errors but don't crash
    this.page.on('pageerror', err => {
      console.warn(`[Host] Page error: ${err.message}`);
    });
    this.page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('PeerJS')) {
        console.warn(`[Host] Console error: ${msg.text().substring(0, 200)}`);
      }
    });

    // Load the page
    console.log(`[Host] Loading ${this.url}...`);
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForTimeout(2000);

    // Login as guest
    console.log(`[Host] Logging in as "${this.hostName}"...`);
    const loginResult = await this.page.evaluate((name) => {
      if (typeof Auth !== 'undefined' && Auth.loginAsGuest) {
        return Auth.loginAsGuest(name);
      }
      return false;
    }, this.hostName);

    if (!loginResult) {
      throw new Error('Failed to login as guest');
    }

    // Reload with ?host=true to get the well-known lobby peer ID
    const hostUrl = this.url + (this.url.includes('?') ? '&' : '?') + 'host=true';
    console.log(`[Host] Reloading with host mode: ${hostUrl}`);
    await this.page.goto(hostUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForTimeout(8000);

    // Verify we're in the world
    const state = await this.getState();
    if (!state.loginHidden) {
      throw new Error('Login screen still visible after host join');
    }

    this._running = true;
    this._startTime = Date.now();

    // Start periodic state export
    this._stateTimer = setInterval(async () => {
      try {
        await this._periodicStateLog();
      } catch (err) {
        console.warn('[Host] State log error:', err.message);
      }
    }, this.stateInterval);

    // Health check every 30s
    this._healthTimer = setInterval(async () => {
      try {
        if (!this.isRunning()) {
          console.error('[Host] Browser disconnected! Attempting restart...');
          clearInterval(this._healthTimer);
          clearInterval(this._stateTimer);
          this._running = false;
          // Auto-restart
          await this.start();
        }
      } catch (err) {
        console.error('[Host] Health check failed:', err.message);
      }
    }, 30000);

    console.log(`[Host] ✅ World host running as lobby peer`);
    console.log(`[Host] Zone: ${state.zone || 'nexus'}`);
    console.log(`[Host] WebGL: ${state.hasWebGL ? 'yes' : 'no'}`);
    console.log(`[Host] Waiting for players to connect...`);
  }

  async stop() {
    console.log('[Host] Stopping...');
    if (this._stateTimer) clearInterval(this._stateTimer);
    if (this._healthTimer) clearInterval(this._healthTimer);

    if (this.page) {
      try {
        await this.page.evaluate(() => {
          if (typeof ZION !== 'undefined' && ZION.Main && ZION.Main.leaveWorld) {
            ZION.Main.leaveWorld();
          }
        });
      } catch { /* page may be closed */ }
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
    this._running = false;
    console.log('[Host] Stopped.');
  }

  async getState() {
    if (!this.page) throw new Error('Host not started');
    return this.page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      const loginEl = document.getElementById('login-screen');
      const zoneLabel = document.querySelector('.zone-label');
      const playerInfo = document.querySelector('.player-info');

      let spark = null;
      if (playerInfo) {
        const m = playerInfo.textContent.match(/Spark[:\s]*(\d+)/i);
        if (m) spark = parseInt(m[1], 10);
      }

      let playerName = null;
      const nameEl = document.querySelector('.player-name');
      if (nameEl) playerName = nameEl.textContent.trim();
      if (!playerName && playerInfo) {
        const lines = playerInfo.textContent.trim().split('\n');
        if (lines.length > 0) playerName = lines[0].trim();
      }

      return {
        loginHidden: loginEl ? loginEl.style.display === 'none' : true,
        hasWebGL: !!gl,
        zone: zoneLabel ? zoneLabel.textContent.trim() : null,
        playerName,
        spark,
        canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null
      };
    });
  }

  async getNpcInfo() {
    return this.page.evaluate(() => {
      if (typeof NPCs !== 'undefined') {
        const agents = NPCs.getAgents ? NPCs.getAgents() : null;
        return {
          loaded: true,
          count: agents ? (typeof agents.size !== 'undefined' ? agents.size : Object.keys(agents).length) : 0,
        };
      }
      return { loaded: false, count: 0 };
    });
  }

  async getGameLoopInfo() {
    // Check if the game loop is running by verifying the canvas is being rendered
    const canvasBefore = await this.page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c ? c.toDataURL().length : 0;
    });

    await this.page.waitForTimeout(300);

    const canvasAfter = await this.page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c ? c.toDataURL().length : 0;
    });

    // Also check if Main.isRunning or similar exists
    const mainRunning = await this.page.evaluate(() => {
      // The canvas existing + login hidden implies the game loop started
      const login = document.getElementById('login-screen');
      const canvas = document.querySelector('canvas');
      return !!(canvas && login && login.style.display === 'none');
    });

    return {
      isRunning: mainRunning,
      frameCount: canvasAfter > 0 ? 1 : 0,
      canvasActive: canvasBefore > 0 || canvasAfter > 0
    };
  }

  async exportState() {
    const state = await this.getState();
    const npcInfo = await this.getNpcInfo();

    // Get connected peers
    const networkInfo = await this.page.evaluate(() => {
      if (typeof Network !== 'undefined' && Network.getPeers) {
        const peers = Network.getPeers();
        return { peers, peerCount: peers.length };
      }
      return { peers: [], peerCount: 0 };
    });

    return {
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      ...state,
      npcs: npcInfo,
      network: networkInfo
    };
  }

  async healthCheck() {
    try {
      const state = await this.getState();
      return {
        healthy: this.isRunning() && state.loginHidden,
        uptime: this.getUptime(),
        zone: state.zone,
        hasWebGL: state.hasWebGL
      };
    } catch (err) {
      return { healthy: false, error: err.message, uptime: this.getUptime() };
    }
  }

  async _periodicStateLog() {
    const state = await this.exportState();
    const uptime = Math.round(state.uptime / 1000);
    console.log(`[Host] ⏱ ${uptime}s | Zone: ${state.zone} | Peers: ${state.network.peerCount} | NPCs: ${state.npcs.count}`);
  }
}

// ── CLI entry point ──────────────────────────────────────────────────
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain || process.argv[1]?.endsWith('host.js')) {
  const url = process.argv[2] || process.env.ZION_URL || 'https://kody-w.github.io/zion/';
  const host = new ZionHost({ url, hostName: 'WorldHost' });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Host] Shutting down...');
    await host.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await host.stop();
    process.exit(0);
  });

  host.start().catch(err => {
    console.error('[Host] Failed to start:', err);
    process.exit(1);
  });
}
