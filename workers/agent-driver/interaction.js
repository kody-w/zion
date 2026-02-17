/**
 * Interaction — Sends player actions in the ZION world via keyboard input.
 */
export class Interaction {
  constructor(session) {
    this.session = session;
  }

  async interact() {
    const page = this.session.page;
    await page.keyboard.press('e');
    await page.waitForTimeout(500);

    // Read any interaction result from HUD
    const result = await page.evaluate(() => {
      const notif = document.querySelector('.notification, [class*="notification"]');
      return {
        notification: notif ? notif.textContent.trim() : null
      };
    });
    return result;
  }

  async chat(message) {
    const page = this.session.page;
    // Open chat input
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Type message
    await page.keyboard.type(message, { delay: 20 });
    await page.waitForTimeout(100);

    // Send
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    return { sent: true, message };
  }

  async emote(type) {
    const page = this.session.page;
    await page.keyboard.press('f');
    await page.waitForTimeout(300);

    // Try to select emote from panel if visible
    const selected = await page.evaluate((emoteType) => {
      const panel = document.querySelector('#emote-panel, .emote-panel, [class*="emote"]');
      if (!panel) return false;
      const buttons = panel.querySelectorAll('button, [class*="emote-btn"]');
      for (const btn of buttons) {
        if (btn.textContent.toLowerCase().includes(emoteType.toLowerCase())) {
          btn.click();
          return true;
        }
      }
      return false;
    }, type);

    if (!selected) {
      // Close panel if it opened
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    return { emote: type, triggered: selected };
  }

  async build(itemType) {
    const page = this.session.page;
    await page.keyboard.press('b');
    await page.waitForTimeout(500);

    let placed = false;
    if (itemType) {
      placed = await page.evaluate((type) => {
        const panel = document.querySelector('#build-panel, .build-panel, [class*="build"]');
        if (!panel) return false;
        const items = panel.querySelectorAll('button, [class*="build-item"]');
        for (const item of items) {
          if (item.textContent.toLowerCase().includes(type.toLowerCase())) {
            item.click();
            return true;
          }
        }
        return false;
      }, itemType);
    }

    if (!placed) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    return { build: itemType, placed };
  }

  async fish() {
    const page = this.session.page;
    await page.keyboard.press('x');
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const notif = document.querySelector('.notification, [class*="notification"]');
      return { notification: notif ? notif.textContent.trim() : null };
    });
    return { action: 'fish', ...result };
  }

  async screenshot() {
    const buf = await this.session.page.screenshot({ type: 'png' });
    return {
      image: buf.toString('base64'),
      mimeType: 'image/png'
    };
  }
}
