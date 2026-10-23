import { expect, test, type Page } from '@playwright/test';

// Trace snapshots walk the DOM and call layout APIs; this probe measures only
// application work. Other browser suites retain their normal trace behavior.
test.use({ trace: 'off' });

async function observeBubble(page: Page) {
  await page.addInitScript(() => {
    const probe = (window as any).__bubbleProbe = {
      draws: 0, uploads: 0, hover: 0, waves: 0, activity: 0,
      layoutReads: 0, watchLayout: false, readStacks: [] as string[],
      copyMutations: 0, waveHistory: [] as { count: number; positions: number[]; shapes: number[] }[],
      positions: [] as number[], shapes: [] as number[],
    };
    const gl = WebGL2RenderingContext.prototype;
    const locations = new WeakMap<WebGLUniformLocation, string>();
    const getLocation = gl.getUniformLocation;
    gl.getUniformLocation = function (program, name) {
      const location = getLocation.call(this, program, name);
      if (location) locations.set(location, name);
      return location;
    };
    const float = gl.uniform1f;
    gl.uniform1f = function (location, value) {
      if (this.canvas.id === 'bubble-canvas' && location) {
        if (locations.get(location) === 'uHover') probe.hover = value;
        if (locations.get(location) === 'uActivity') probe.activity = value;
      }
      return float.call(this, location, value);
    };
    const integer = gl.uniform1i;
    gl.uniform1i = function (location, value) {
      if (this.canvas.id === 'bubble-canvas' && location && locations.get(location) === 'uWaveCount') probe.waves = value;
      return integer.call(this, location, value);
    };
    const vector4 = gl.uniform4fv;
    gl.uniform4fv = function (location, value: Float32List) {
      if (this.canvas.id === 'bubble-canvas' && location && locations.get(location) === 'uWaves') probe.positions = Array.from(value);
      return vector4.call(this, location, value);
    };
    const vector2 = gl.uniform2fv;
    gl.uniform2fv = function (location, value: Float32List) {
      if (this.canvas.id === 'bubble-canvas' && location && locations.get(location) === 'uWaveShape') probe.shapes = Array.from(value);
      return vector2.call(this, location, value);
    };
    const draw = gl.drawArrays;
    gl.drawArrays = function (...args: Parameters<typeof draw>) {
      if (this.canvas.id === 'bubble-canvas') {
        probe.draws++;
        if (probe.watchLayout) probe.waveHistory.push({ count: probe.waves, positions: [...probe.positions], shapes: [...probe.shapes] });
      }
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

test('GPU typography and underline share independent jelly impulses without per-frame DOM writes or uploads', async ({ page }) => {
  await observeBubble(page);
  await page.goto('/');
  const bubble = page.locator('#bubble');
  await expect(bubble).toHaveAttribute('data-webgl', 'ready');
  await expect(bubble).toHaveAttribute('data-gpu-copy', 'ready');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(20, 20);
  await page.waitForTimeout(200);
  await expect(page.getByRole('heading', { name: /I'm\s+HEINEM,/ })).toBeVisible();
  expect(await page.locator('[data-bubble-glyph]').count()).toBe(0);
  expect(await page.locator('.bubble-copy').evaluate(element => getComputedStyle(element).opacity)).toBe('0');
  const initial = await page.evaluate(() => {
    const box = document.querySelector('.bubble-copy p')!.getBoundingClientRect();
    const line = document.querySelector('.signature-line')!.getBoundingClientRect();
    const probe = (window as any).__bubbleProbe;
    new MutationObserver(records => probe.copyMutations += records.length).observe(document.querySelector('.bubble-copy')!, {
      attributes: true, childList: true, subtree: true,
    });
    probe.layoutReads = 0; probe.watchLayout = true;
    return { x: box.x + box.width * 0.25, y: box.y + box.height * 0.2,
      x2: box.x + box.width * 0.8, y2: box.y + box.height * 0.64,
      lineX: line.x + line.width * 0.4, lineY: line.y,
      uploads: probe.uploads, width: box.width, height: box.height };
  });
  await page.mouse.move(initial.x, initial.y);
  await page.waitForTimeout(80);
  await page.mouse.move(initial.x2, initial.y2);
  await page.waitForTimeout(80);
  await page.mouse.move(initial.lineX, initial.lineY);
  await expect.poll(() => page.evaluate(() => (window as any).__bubbleProbe.waves)).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(350);
  await page.mouse.move(20, 20);
  // At least one old patch must keep oscillating after the pointer leaves.
  const released = await page.evaluate(() => ({ count: (window as any).__bubbleProbe.waves, activity: (window as any).__bubbleProbe.activity }));
  expect(released.count).toBeGreaterThanOrEqual(2);
  expect(released.activity).toBeGreaterThan(0);
  await page.waitForTimeout(700);
  const active = await page.evaluate(() => {
    const probe = (window as any).__bubbleProbe;
    probe.watchLayout = false;
    const box = document.querySelector('.bubble-copy p')!.getBoundingClientRect();
    return { layoutReads: probe.layoutReads, readStacks: probe.readStacks, uploads: probe.uploads,
      mutations: probe.copyMutations, history: probe.waveHistory, width: box.width, height: box.height };
  });
  expect(active.layoutReads, active.readStacks.join('\n')).toBe(0);
  expect(active.mutations).toBe(0);
  expect(active.uploads).toBe(initial.uploads);
  expect([active.width, active.height]).toEqual([initial.width, initial.height]);
  expect(Math.max(...active.history.map((frame: any) => frame.count))).toBeLessThanOrEqual(6);
  // First impulse changes sign: a real recoil, not only pointer easing/fade.
  const shapeValues = active.history.filter((frame: any) => frame.count > 0).map((frame: any) => frame.shapes[1]);
  expect(shapeValues.some((value: number) => value > 0.1)).toBe(true);
  expect(shapeValues.some((value: number) => value < -0.1)).toBe(true);
  const multiple = active.history.find((frame: any) => frame.count >= 2);
  expect(multiple).toBeTruthy();
  expect(Math.hypot(multiple.positions[0] - multiple.positions[4], multiple.positions[1] - multiple.positions[5])).toBeGreaterThan(0.05);
  await expect.poll(() => page.evaluate(() => (window as any).__bubbleProbe.waves)).toBe(0);
  expect(await page.evaluate(() => (window as any).__bubbleProbe.uploads)).toBe(initial.uploads);
});

test('offscreen/reduced bubble sleeps and context loss restores native accessible copy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await observeBubble(page);
  await page.goto('/');
  await expect(page.locator('#bubble')).toHaveAttribute('data-gpu-copy', 'ready');
  await expect.poll(() => page.evaluate(() => (window as any).__bubbleProbe.draws)).toBeGreaterThan(2);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => page.locator('#bubble').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
  await page.waitForTimeout(250);
  const offscreen = await page.evaluate(() => (window as any).__bubbleProbe.draws);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__bubbleProbe.draws)).toBe(offscreen);

  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => (window as any).__bubbleProbe.draws)).toBeGreaterThan(offscreen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('body')).toHaveAttribute('data-reduced-motion', 'true');
  await page.waitForTimeout(500);
  const reduced = await page.evaluate(() => (window as any).__bubbleProbe.draws);
  await page.mouse.move(195, 580); await page.mouse.move(20, 20);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__bubbleProbe.draws)).toBe(reduced);
  expect(await page.evaluate(() => (window as any).__bubbleProbe.waves)).toBe(0);

  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#bubble-canvas')!;
    (window as any).__loss = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context');
    (window as any).__loss.loseContext();
  });
  await expect(page.locator('#bubble')).toHaveAttribute('data-gpu-copy', 'fallback');
  expect(await page.locator('.bubble-copy').evaluate(element => getComputedStyle(element).opacity)).toBe('1');
  await expect(page.getByRole('heading', { name: /I'm\s+HEINEM,/ })).toBeVisible();
  await page.evaluate(() => (window as any).__loss.restoreContext());
  await expect(page.locator('#bubble')).toHaveAttribute('data-gpu-copy', 'ready');
});
