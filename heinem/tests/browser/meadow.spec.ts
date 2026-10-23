import { expect, test } from '@playwright/test';

test('disc stays centered during hover and a full rotation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#disc-button').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  const center = () => page.locator('#disc-button').evaluate(el => {
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  const before = await center();
  await page.locator('#disc-button').hover();
  await page.waitForTimeout(350);
  const after = await center();
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(0.6);
  const orbit = await page.locator('.disc-face').evaluate(el => {
    const room = document.querySelector<HTMLElement>('#listening-room')!;
    room.dataset.state = 'playing';
    const animation = el.getAnimations()[0];
    if (!animation) throw new Error('Disc rotation is unavailable');
    animation.pause();
    const duration = Number(animation.effect!.getComputedTiming().duration);
    return [0, 0.25, 0.5, 0.75, 1].map(phase => {
      animation.currentTime = duration * phase;
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
  });
  for (const point of orbit) {
    expect(Math.hypot(point.x - after.x, point.y - after.y)).toBeLessThan(0.6);
  }
});

test('album sleeves select real tracks without loading media before play', async ({ page }) => {
  const remote: string[] = [];
  page.on('request', request => {
    if (/soundcloud\.com/.test(request.url())) remote.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
  await expect(page.locator('[data-track="2"]')).toHaveAttribute('data-position', 'previous');
  await expect(page.locator('[data-track="1"]')).toHaveAttribute('data-position', 'next');
  await page.locator('#next-track').click();
  await expect(page.locator('#track-title')).toContainText('MHA');
  await page.locator('#previous-track').click();
  await expect(page.locator('#track-title')).toHaveText('Memories Of You');
  await page.locator('[data-track="2"]').click();
  await expect(page.locator('#track-title')).toHaveText('Show Me Love');
  await expect(page.locator('#disc-button')).toHaveAttribute('aria-label', 'Play Show Me Love');
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  expect(remote).toEqual([]);
  await expect(page.locator('#about, #contact')).toHaveCount(0);
});

test('disc follows the moving sleeve, conceals through the midpoint and returns to the same pivot', async ({ page }) => {
  await page.goto('/');
  await page.locator('#next-track').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const initial = await page.locator('#disc-button').boundingBox();
  expect(initial).not.toBeNull();
  await page.evaluate(() => {
    const room = document.getElementById('listening-room')!;
    const disc = document.getElementById('disc-button')!;
    const history: { phase?: string; selected?: string; visibility: string }[] = [];
    (window as Window & { discHistory?: typeof history }).discHistory = history;
    new MutationObserver(() => {
      history.push({
        phase: room.dataset.discPhase,
        selected: room.dataset.activeTrack,
        visibility: getComputedStyle(disc).visibility,
      });
    }).observe(room, { attributes: true, attributeFilter: ['data-disc-phase'] });
  });
  await page.locator('#next-track').click();
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '1');
  await expect(page.locator('#listening-room')).toHaveAttribute('data-disc-phase', 'idle');
  const history = await page.evaluate(() =>
    (window as Window & { discHistory?: { phase?: string; selected?: string; visibility: string }[] }).discHistory!);
  // The renderer may jump over the short 'ejecting' state on a stalled
  // software-rendered frame. Validate ordering, concealment and final release,
  // rather than requiring every intermediate frame to be observed by the DOM.
  const phases = history.map(entry => entry.phase);
  expect(phases[0]).toBe('inserting');
  expect(phases).toContain('swapping');
  expect(phases.at(-1)).toBe('idle');
  expect(history[0].selected).toBe('0');
  expect(history.find(entry => entry.phase === 'swapping')).toMatchObject({ visibility: 'hidden' });
  expect(history.some(entry => entry.selected === '1')).toBe(true);
  // A timer phase may finish just before the compositor presents its last
  // transition frame (especially under a software GPU). Wait on geometry.
  await expect.poll(async () => {
    const bounds = (await page.locator('#disc-button').boundingBox())!;
    return Math.abs(bounds.x - initial!.x);
  }).toBeLessThan(0.6);
  const final = (await page.locator('#disc-button').boundingBox())!;
  expect(Math.abs(final.x - initial!.x)).toBeLessThan(0.6);
  expect(Math.abs(final.y - initial!.y)).toBeLessThan(0.6);
  expect(Math.abs(final.width - initial!.width)).toBeLessThan(0.6);
  await expect(page.locator('.player-footer')).toHaveCount(0);
  await expect(page.locator('#track-external')).toHaveAttribute('href', /mha-50k/);
});

test('reduced motion selects the release without a disc animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#next-track').click();
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '1');
  await expect(page.locator('#listening-room')).toHaveAttribute('data-disc-phase', 'idle');
  const transition = await page.locator('#disc-button').evaluate(element => getComputedStyle(element).transitionDuration);
  // The global accessibility reset uses 0.001 ms so transitionend users elsewhere
  // can still observe completion. Either that value or literal zero is inert.
  expect(transition.split(',').every(value => Number.parseFloat(value) <= 0.000001)).toBe(true);
});

test('drag scrubs the exchange on desktop and mobile, then commits without an accidental play', async ({ page }) => {
  const provider: string[] = [];
  page.on('request', request => { if (/soundcloud\.com/.test(request.url())) provider.push(request.url()); });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const stage = page.locator('.jewel-stage');
    await expect(stage).toHaveAttribute('data-carousel', 'ready');
    await stage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const area = (await stage.boundingBox())!;
    const card = (await page.locator('[data-track="0"]').boundingBox())!;
    const initial = (await page.locator('[data-track="1"]').boundingBox())!.x;
    const start = { x: card.x + card.width * .55, y: card.y + card.height * .4 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - area.width * .16, start.y, { steps: 8 });
    await expect(stage).toHaveAttribute('data-dragging', 'true');
    await expect.poll(async () => (await page.locator('[data-track="1"]').boundingBox())!.x).toBeLessThan(initial - 20);
    const intermediate = (await page.locator('[data-track="1"]').boundingBox())!.x;
    await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
    await page.mouse.move(start.x - area.width * .32, start.y, { steps: 8 });
    await expect.poll(async () => (await page.locator('[data-track="1"]').boundingBox())!.x).toBeLessThan(intermediate - 20);
    await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
    await page.mouse.up();
    await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '1');
    await expect(page.locator('#listening-room')).toHaveAttribute('data-disc-phase', 'idle');
    await expect(stage).toHaveAttribute('data-dragging', 'false');
    await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
    await expect(page.locator('#disc-button')).toHaveAttribute('aria-label', 'Play MHA 50k DROP');
    // A new intentional click after the drag must still work normally.
    await page.locator('#previous-track').click();
    await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
    await expect(page.locator('#listening-room')).toHaveAttribute('data-disc-phase', 'idle');
  }
  expect(provider).toEqual([]);
});

test('pointer position tilts the case surface while its hit target and the CD pivot stay stable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const card = page.locator('[data-track="0"]');
  await card.scrollIntoViewIfNeeded();
  const bounds = (await card.boundingBox())!;
  const shell = card.locator('.jewel-shell');
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + bounds.height * .25);
  await expect.poll(() => shell.evaluate(el => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--shine-x')))).toBeLessThan(40);
  const left = await shell.evaluate(el => getComputedStyle(el).transform);
  await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .7);
  await expect.poll(() => shell.evaluate(el => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--shine-x')))).toBeGreaterThan(60);
  const right = await shell.evaluate(el => getComputedStyle(el).transform);
  expect(left).not.toBe(right);
  expect(right).toContain('matrix3d');
  const final = (await card.boundingBox())!;
  expect(Math.abs(final.x - bounds.x) + Math.abs(final.y - bounds.y)).toBeLessThan(.2);
  await page.mouse.move(1, 1);
  await expect.poll(() => shell.evaluate(el => Number.parseFloat((el as HTMLElement).style.getPropertyValue('--shine-opacity')))).toBe(0);
});


test('one mouse hold travels through several releases in either viewport without stopping at index one', async ({ page }) => {
  const soundcloud: string[] = [];
  page.on('request', request => {
    if (/soundcloud\.com/.test(request.url())) soundcloud.push(request.url());
  });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const stage = page.locator('.jewel-stage');
    await stage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(180);
    const area = (await stage.boundingBox())!;
    const distance = Math.min(400, Math.max(92, area.width * .3));
    const x = area.x + area.width * .9;
    const y = area.y + area.height * .25;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - distance * .82, y, { steps: 6 });
    await expect(stage).toHaveAttribute('data-dragging', 'true');
    await page.mouse.move(x - distance * 1.12, y, { steps: 6 });
    await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
    await page.mouse.move(x - distance * 2.13, y, { steps: 10 });
    await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
    await page.waitForTimeout(110); // No flick into the third sleeve.
    await page.mouse.up();
    await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '2');
    await expect(page.locator('#listening-room')).toHaveAttribute('data-disc-phase', 'idle');
    await expect(stage).toHaveAttribute('data-dragging', 'false');
    await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  }
  expect(soundcloud).toEqual([]);
});

test('real touch moves continuously past a second sleeve while vertical gestures still scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await page.goto('/');
  const stage = page.locator('.jewel-stage');
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(160);
  const area = (await stage.boundingBox())!;
  const distance = Math.min(400, Math.max(92, area.width * .3));
  const start = { x: area.x + area.width * .92, y: area.y + area.height * .28 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 8 }] });
  for (let i = 1; i <= 18; i++) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x - distance * 2.13 * i / 18, y: start.y, id: 8 }],
    });
    await page.waitForTimeout(12);
  }
  await expect(stage).toHaveAttribute('data-dragging', 'true');
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
  await page.waitForTimeout(110);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '2');
  await expect(page.locator('#listening-room')).toHaveAttribute('data-disc-phase', 'idle');
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  await client.detach();
});

test('touch drags reserve horizontal intent and leave vertical scrolling to the browser', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await page.goto('/');
  const stage = page.locator('.jewel-stage');
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = (await page.locator('[data-track="0"]').boundingBox())!;
  const start = { x: box.x + box.width * .5, y: box.y + box.height * .3 };
  const before = await page.evaluate(() => scrollY);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
  for (let i = 1; i <= 6; i++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + 2, y: start.y + i * 15, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before - 30);
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
  await expect(stage).toHaveAttribute('data-dragging', 'false');
  expect(await stage.evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-y');

  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const card = (await page.locator('[data-track="0"]').boundingBox())!;
  const touch = { x: card.x + card.width * .7, y: card.y + card.height * .4 };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch, id: 2 }] });
  for (let i = 1; i <= 8; i++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touch.x - i * 15, y: touch.y, id: 2 }] });
    await page.waitForTimeout(16);
  }
  await expect(stage).toHaveAttribute('data-dragging', 'true');
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '1');
  await expect(page.locator('#listening-room')).toHaveAttribute('data-disc-phase', 'idle');
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  await client.detach();
});
