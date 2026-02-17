/**
 * Perception — Reads world state from the ZION client DOM.
 *
 * Provides look() (screenshot + HUD), status() (HUD only), readChat(), etc.
 */
export class Perception {
  constructor(session) {
    this.session = session;
  }

  async look() {
    const state = await this.status();
    const buf = await this.session.page.screenshot({ type: 'png' });
    state.screenshot = buf.toString('base64');
    return state;
  }

  async status() {
    const ws = await this.session.getWorldState();
    return {
      zone: ws.zone,
      playerName: ws.playerName || this.session._playerName,
      spark: ws.spark,
      hasWebGL: ws.hasWebGL,
      canvasSize: ws.canvasSize,
      nearbyPlayers: await this._readNearbyPlayers(),
      activeQuests: await this._readActiveQuests()
    };
  }

  async readChat() {
    return this.session.page.evaluate(() => {
      const messages = [];
      // Try chat panel
      const chatPanel = document.querySelector('.chat-panel, #chat-panel, [class*="chat"]');
      if (chatPanel) {
        const msgEls = chatPanel.querySelectorAll('.chat-message, .chat-msg, [class*="chat-message"]');
        msgEls.forEach(el => {
          messages.push(el.textContent.trim());
        });
      }
      // Fallback: look for any chat-like container
      if (messages.length === 0) {
        const chatLog = document.querySelector('#chat-log, .chat-log');
        if (chatLog) {
          chatLog.childNodes.forEach(node => {
            const text = node.textContent.trim();
            if (text) messages.push(text);
          });
        }
      }
      return messages;
    });
  }

  async readInventory() {
    const page = this.session.page;
    // Open inventory panel
    await page.keyboard.press('i');
    await page.waitForTimeout(500);

    const items = await page.evaluate(() => {
      const panel = document.getElementById('inventory-panel');
      if (!panel || panel.style.display === 'none') return [];
      const slots = panel.querySelectorAll('.inventory-slot, [class*="slot"]');
      return Array.from(slots).map(slot => slot.textContent.trim()).filter(Boolean);
    });

    // Close inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(300);
    return items;
  }

  async readQuests() {
    const page = this.session.page;
    await page.keyboard.press('j');
    await page.waitForTimeout(500);

    const quests = await page.evaluate(() => {
      const panel = document.querySelector('#quest-panel, .quest-panel, [class*="quest"]');
      if (!panel) return [];
      const questEls = panel.querySelectorAll('.quest-item, .quest-entry, [class*="quest"]');
      return Array.from(questEls).map(el => el.textContent.trim()).filter(Boolean);
    });

    await page.keyboard.press('j');
    await page.waitForTimeout(300);
    return quests;
  }

  async _readNearbyPlayers() {
    return this.session.page.evaluate(() => {
      const list = document.querySelector('.nearby-list, #nearby-players');
      if (!list) return [];
      const items = list.querySelectorAll('.nearby-player, li, [class*="player"]');
      return Array.from(items).map(el => el.textContent.trim()).filter(Boolean);
    });
  }

  async _readActiveQuests() {
    return this.session.page.evaluate(() => {
      const panel = document.querySelector('.active-quests, #active-quests, [class*="quest"]');
      if (!panel) return [];
      return Array.from(panel.querySelectorAll('.quest-item, li')).map(el => el.textContent.trim()).filter(Boolean);
    });
  }
}
