/**
 * Movement — Controls player movement in the ZION world via keyboard/mouse.
 */
const DIRECTION_KEYS = {
  forward: 'w',
  backward: 's',
  left: 'a',
  right: 'd'
};

export class Movement {
  constructor(session) {
    this.session = session;
  }

  async move(direction, durationMs = 1000) {
    const key = DIRECTION_KEYS[direction];
    if (!key) throw new Error(`Invalid direction: ${direction}. Use: forward, backward, left, right`);

    const page = this.session.page;
    // Focus canvas
    const canvas = page.locator('canvas').first();
    await canvas.click({ force: true }).catch(() => {});
    await page.waitForTimeout(100);

    // Hold key for duration
    await page.keyboard.down(key);
    await page.waitForTimeout(Math.min(durationMs, 5000));
    await page.keyboard.up(key);
    await page.waitForTimeout(200);

    // Return current state
    const ws = await this.session.getWorldState();
    return { zone: ws.zone, spark: ws.spark };
  }

  async lookAround(angleDeg = 90) {
    const page = this.session.page;
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      // Convert angle to pixel offset (roughly 2px per degree)
      const dx = angleDeg * 2;

      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + dx, cy, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    const buf = await page.screenshot({ type: 'png' });
    return {
      screenshot: buf.toString('base64'),
      angleTurned: angleDeg
    };
  }

  async sprint(direction, durationMs = 1000) {
    const key = DIRECTION_KEYS[direction];
    if (!key) throw new Error(`Invalid direction: ${direction}`);

    const page = this.session.page;
    await page.keyboard.down('Shift');
    await page.keyboard.down(key);
    await page.waitForTimeout(Math.min(durationMs, 5000));
    await page.keyboard.up(key);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);

    const ws = await this.session.getWorldState();
    return { zone: ws.zone, spark: ws.spark };
  }
}
