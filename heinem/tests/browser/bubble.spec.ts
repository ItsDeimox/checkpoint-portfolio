import { expect, test, type Page } from '@playwright/test';

// Playwright trace snapshots walk the DOM and call getBoundingClientRect.
// Disable that observer here so the layout probe measures application work.
test.use({ trace: 'off' });

async function observeBubble(page: Page) {
  await page.addInitScript(() => {
    const probe = (window as any).__bubbleProbe = {
      draws: 0, uploads: 0, hover: 0, layoutReads: 0, watchLayout: false, readStacks: [] as string[],
    };
    const gl = WebGL2RenderingContext.prototype;
    const locations = new WeakMap<WebGLUniformLocation, string>();
    const getLocation = gl.getUniformLocation;
    gl.getUniformLocation = function (program, name) {
      const location = getLocation.call(this, program, name);
      if (location) locations.set(location, name);
      return location;
    };
    const uniform = gl.uniform1f;
    gl.uniform1f = function (location, value) {
      if (this.canvas.id === 'bubble-canvas' && location && locations.get(location) === 'uHover') probe.hover = value;
      return uniform.call(this, location, value);
    };
    const draw = gl.drawArrays;
    gl.drawArrays = function (...args: Parameters<typeof draw>) {
      if (this.canvas.id === 'bubble-canvas') probe.draws++;
      return draw.apply(this, args);
    };
    const upload = gl.texImage2D;
    gl.texImage2D = function (...args: Parameters<typeof upload>) {
      if (this.canvas.id === 'bubble-canvas') probe.uploads++;
      return upload.apply(this, args);
    } as typeof upload;
    for (const prototype of [Element.prototype, Range.prototype]) {
      const read = prototype.getBoundingClientRect;
      prototype.getBoundingClientRect = function () {
        if (probe.watchLayout) {
          probe.layoutReads++;
          if (probe.readStacks.length < 12) probe.readStacks.push(new Error().stack || '');
        }
        return read.call(this);
      };
    }
  });
}

test('bubble hover deforms nearby HTML letters and settles without frame layout reads or uploads', async ({ page }) => {
  await observeBubble(page);
  await page.goto('/');
  await expect(page.locator('#bubble')).toHaveAttribute('data-webgl', 'ready');
  await expect.poll(() => page.locator('[data-bubble-glyph]').count()).toBeGreaterThan(100);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(20, 20);
  await page.waitForTimeout(200);
  await expect(page.getByRole('heading', { name: /I'm\s+HEINEM,/ })).toBeVisible();
  const initial = await page.evaluate(() => {
    const box = document.querySelector('.bubble-copy p')!.getBoundingClientRect();
    const probe = (window as any).__bubbleProbe;
    const x = box.x + box.width * 0.68;
    const y = box.y + box.height * 0.18;
    // Measure the untouched layout once. Frame checks below only inspect inline styles.
    probe.letters = [...document.querySelectorAll<HTMLElement>('.bubble-copy p [data-bubble-glyph]')].map(element => {
      const rect = element.getBoundingClientRect();
      return { element, distance: Math.hypot(rect.x + rect.width / 2 - x, rect.y + rect.height / 2 - y) };
    });
    probe.layoutReads = 0;
    probe.watchLayout = true;
    return { x, y, uploads: probe.uploads, width: box.width, height: box.height };
  });
  expect(initial.uploads).toBe(4); // Two complete neutral textures and two static sources.
  await page.mouse.move(initial.x, initial.y);
  await expect.poll(() => page.evaluate(() => (window as any).__bubbleProbe.hover)).toBeGreaterThan(0.95);
  const active = await page.evaluate(() => {
    const probe = (window as any).__bubbleProbe;
    const movement = probe.letters.map(({ element, distance }: { element: HTMLElement; distance: number }) => {
      const matrix = new DOMMatrix(element.style.transform || undefined);
      return { distance, amount: Math.hypot(matrix.m41, matrix.m42), glow: !!element.style.textShadow };
    });
    probe.watchLayout = false;
    const box = document.querySelector('.bubble-copy p')!.getBoundingClientRect();
    return {
      near: Math.max(...movement.filter((letter: any) => letter.distance < 90).map((letter: any) => letter.amount)),
      far: Math.min(...movement.filter((letter: any) => letter.distance > 190).map((letter: any) => letter.amount)),
      glowing: movement.filter((letter: any) => letter.glow).length,
      layoutReads: probe.layoutReads, readStacks: probe.readStacks, uploads: probe.uploads, width: box.width, height: box.height,
    };
  });
  expect(active.near).toBeGreaterThan(1);
  expect(active.far).toBeLessThan(active.near / 4);
  expect(active.glowing).toBeGreaterThan(0);
  expect(active.layoutReads, active.readStacks.join('\n')).toBe(0);
  expect(active.uploads).toBe(initial.uploads);
  expect([active.width, active.height]).toEqual([initial.width, initial.height]);

  await page.mouse.move(20, 20);
  await expect.poll(() => page.locator('[data-bubble-glyph]').evaluateAll(letters =>
    letters.filter(letter => (letter as HTMLElement).style.transform || (letter as HTMLElement).style.textShadow).length,
  )).toBe(0);
  expect(await page.evaluate(() => (window as any).__bubbleProbe.uploads)).toBe(initial.uploads);
});

test('mobile bubble sleeps at the clipped page end and reduced motion leaves letters static', async ({ page }) => {
  // Regression: a positive observer rootMargin kept rendering the clipped hero
  // at the mobile page's maximum scroll, despite no visible bubble pixels.
  await page.setViewportSize({ width: 390, height: 844 });
  await observeBubble(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as any).__bubbleProbe.draws)).toBeGreaterThan(2);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect(page.locator('body')).toHaveAttribute('data-scene-active', 'false');
  await page.waitForTimeout(350);
  const offscreen = await page.evaluate(() => (window as any).__bubbleProbe.draws);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__bubbleProbe.draws)).toBe(offscreen);

  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => (window as any).__bubbleProbe.draws)).toBeGreaterThan(offscreen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('body')).toHaveAttribute('data-reduced-motion', 'true');
  await page.waitForTimeout(500);
  const reduced = await page.evaluate(() => (window as any).__bubbleProbe.draws);
  await page.mouse.move(195, 580);
  await page.mouse.move(20, 20);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__bubbleProbe.draws)).toBe(reduced);
  expect(await page.locator('[data-bubble-glyph]').evaluateAll(letters =>
    letters.filter(letter => (letter as HTMLElement).style.transform || (letter as HTMLElement).style.textShadow).length,
  )).toBe(0);
});
