import { test, expect } from '@playwright/test';

for (const [width, height] of [[1178, 659], [1440, 900], [390, 844], [320, 780]]) {
  test(`composition remains usable at ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const remoteRequests: string[] = [];
    const origin = new URL(test.info().project.use.baseURL as string).origin;
    page.on('request', request => {
      if (new URL(request.url()).origin !== origin) remoteRequests.push(request.url());
    });
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('HEINEM');
    await expect(page.locator('#bubble')).toHaveAttribute('data-webgl', 'ready');
    await page.evaluate(() => document.fonts.ready);
    const bounds = await page.evaluate(() => {
      const copy = document.querySelector('.bubble-copy')!.getBoundingClientRect();
      const bubble = document.querySelector('#bubble')!.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        copyBottom: copy.bottom,
        bubbleBottom: bubble.bottom,
        fontSize: parseFloat(getComputedStyle(document.querySelector('.bubble-copy p')!).fontSize),
      };
    });
    expect(bounds.overflow).toBeLessThanOrEqual(1);
    expect(bounds.copyBottom).toBeLessThan(bounds.bubbleBottom);
    if (width <= 700) expect(bounds.fontSize).toBeGreaterThanOrEqual(12);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: 'Get in touch' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    // Fonts, artwork and graphics are local. Music only connects after intent.
    expect(remoteRequests).toEqual([]);
  });
}

test('manual graphics override persists even on constrained device hints', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
  });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'low');
  await page.getByRole('button', { name: /Graphics quality:/ }).click();
  await page.locator('#quality-menu button[data-quality="high"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'high');
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'high');
  await expect(page.locator('#quality-label')).toHaveText('High');
  await page.getByRole('button', { name: /Graphics quality:/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#quality-menu')).toBeHidden();
  await expect(page.locator('#quality-button')).toBeFocused();
});

test('native scroll gives foreground, portrait and sky distinct depths', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 220); });
  await expect.poll(() => page.locator('.foreground').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42)).toBeLessThan(-65);
  const planes = await page.evaluate(() => {
    const offset = (selector: string) => new DOMMatrix(getComputedStyle(document.querySelector(selector)!).transform).m42;
    return { foreground: offset('.foreground'), portrait: offset('.portrait'), sky: offset('.sky') };
  });
  expect(planes.foreground).toBeLessThan(planes.portrait);
  expect(planes.portrait).toBeLessThan(planes.sky);
  // Overscan must reach the hero's lower boundary after the fast plane moves.
  const coverage = await page.evaluate(() => ({
    extensionBottom: document.querySelector('.foreground-extension')!.getBoundingClientRect().bottom,
    heroBottom: document.querySelector('#home')!.getBoundingClientRect().bottom,
  }));
  expect(coverage.extensionBottom).toBeGreaterThan(coverage.heroBottom);
});

test('reduced motion stops depth motion without changing the user quality', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-reduced-motion', 'true');
  await page.getByRole('button', { name: /Graphics quality:/ }).click();
  await page.locator('#quality-menu button[data-quality="high"]').click();
  await page.evaluate(() => window.scrollTo(0, 220));
  expect(await page.locator('.foreground').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42)).toBe(0);
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'high');
});

test('biography and navigation survive unavailable WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind: string, ...args: unknown[]) {
      if (kind === 'webgl2') return null;
      return original.apply(this, [kind, ...args] as never);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('#bubble')).toHaveAttribute('data-webgl', 'fallback');
  await expect(page.locator('.bubble-fallback')).toBeVisible();
  await expect(page.locator('.bubble-copy')).toBeVisible();
  await page.locator('.primary-nav a[href="#music"]').click();
  await expect(page.locator('#disc-button')).toBeInViewport();
});

test('GPU rendering sleeps when the hero is offscreen', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__drawCount = 0;
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function (...args: Parameters<typeof draw>) {
      (window as any).__drawCount++;
      return draw.apply(this, args);
    };
  });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as any).__drawCount)).toBeGreaterThan(2);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('body')).toHaveAttribute('data-scene-active', 'false');
  const before = await page.evaluate(() => (window as any).__drawCount);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__drawCount)).toBe(before);
});

const providerMock = `
(() => {
  const Events = { READY:'ready', PLAY:'play', PAUSE:'pause', FINISH:'finish', PLAY_PROGRESS:'progress', SEEK:'seek', ERROR:'error' };
  const widgets = [];
  function Widget() {
    const listeners = {};
    const record = { listeners, playRequests:0, volume:0, seek:0 };
    widgets.push(record);
    const emit = (event, data) => (listeners[event] || []).slice().forEach(fn => fn(data));
    record.emit = emit;
    setTimeout(() => emit(Events.READY), 0);
    return {
      bind(event, fn) { (listeners[event] ||= []).push(fn); },
      unbind(event) { delete listeners[event]; },
      play() { record.playRequests++; },
      pause() { emit(Events.PAUSE); },
      seekTo(value) { record.seek = value; },
      setVolume(value) { record.volume = value; },
      getDuration(fn) { fn(228233); }
    };
  }
  Widget.Events = Events;
  window.SC = { Widget };
  window.__scTest = { widgets, Events };
})();`;

test('CD waits for playback confirmation, then supports progress, pause and track changes', async ({ page }) => {
  await page.route('https://w.soundcloud.com/player/api.js', route => route.fulfill({ contentType: 'application/javascript', body: providerMock }));
  await page.route('https://w.soundcloud.com/player/?*', route => route.fulfill({ contentType: 'text/html', body: '<title>Mock SoundCloud player</title>' }));
  await page.goto('/');
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  await page.locator('#disc-button').click();
  await expect(page.locator('#listening-room')).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('#embed-mount iframe')).toHaveAttribute('allow', 'autoplay; encrypted-media');
  await expect.poll(() => page.evaluate(() => (window as any).__scTest?.widgets[0]?.playRequests)).toBeGreaterThan(0);
  await expect(page.locator('#disc-button')).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => (window as any).__scTest.widgets[0].emit('play'));
  await expect(page.locator('#listening-room')).toHaveAttribute('data-state', 'playing');
  await expect(page.locator('#disc-button')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => (window as any).__scTest.widgets[0].emit('pause'));
  await expect(page.locator('#player-message')).toContainText('paused before audio started');
  await page.locator('#disc-button').click();
  await page.evaluate(() => (window as any).__scTest.widgets[0].emit('play'));
  await page.evaluate(() => (window as any).__scTest.widgets[0].emit('progress', { currentPosition: 65000 }));
  await expect(page.locator('#elapsed')).toHaveText('1:05');
  await expect(page.locator('#seek')).toBeEnabled();
  await page.locator('#disc-button').click();
  await expect(page.locator('#listening-room')).toHaveAttribute('data-state', 'paused');
  await page.locator('#next-track').click();
  await expect(page.locator('#track-title')).toHaveText('Show Me Love');
  await expect(page.locator('#track-external')).toHaveAttribute('href', /wizthemc-bees-honey-show-me/);
  await expect(page.locator('#embed-mount iframe')).toHaveCount(1);
  await expect(page.locator('#disc-button')).toHaveAttribute('aria-pressed', 'false');
});

test('provider failure offers retry and the verified external track', async ({ page }) => {
  await page.route('https://w.soundcloud.com/**', route => route.abort('failed'));
  await page.goto('/');
  await page.locator('#disc-button').click();
  await expect(page.locator('#listening-room')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#disc-button')).toHaveAttribute('aria-label', /Retry/);
  await expect(page.locator('#player-message')).toBeVisible();
  await expect(page.locator('#track-external')).toHaveAttribute('href', 'https://soundcloud.com/heinemstrange/aye-bay-memories-of-you-heinem-x-hyru-remix');
});
