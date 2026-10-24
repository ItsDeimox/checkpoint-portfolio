import { expect, test } from '@playwright/test';

test('new logo is flush-left at wide, short and mobile viewports', async ({ page }) => {
  for (const viewport of [{ width: 1760, height: 960 }, { width: 1178, height: 610 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const brand = page.locator('.site-header .brand');
    await expect(brand).toBeVisible();
    await expect(brand.locator('img')).toHaveAttribute('src', '/assets/heinem-mark.svg');
    const rect = await brand.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x).toBeLessThanOrEqual(Math.max(48, viewport.width * .035));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test('all six CD covers are local-first, while optional official art can replace them', async ({ page }) => {
  await page.goto('/');
  const local = ['/assets/memories-of-you.jpg', '/assets/mha-50k-drop.jpg', '/assets/show-me-love.jpg'];
  const additional = ['fall', 'her', 'seven'];
  for (const file of local) {
    const image = page.locator(`.jewel-artwork[src="${file}"]`);
    await expect(image).toHaveAttribute('loading', 'eager');
    expect(await image.evaluate((node: HTMLImageElement) => node.decode().then(() => node.naturalWidth).catch(() => 0))).toBeGreaterThan(100);
  }
  for (const name of additional) {
    const sleeve = page.locator(`.generated-cover[data-cover="${name}"]`);
    await expect(sleeve).toBeAttached();
    const background = await sleeve.evaluate(node => getComputedStyle(node).backgroundImage);
    // The metadata loader may already have verified and installed the real
    // SoundCloud cover. Both that success and the local fallback are valid.
    expect(background.includes(`/assets/covers/${name}.svg`) ||
      background.includes('https://i1.sndcdn.com/')).toBe(true);
    const status = await page.evaluate(async src => (await fetch(src)).status, `/assets/covers/${name}.svg`);
    expect(status).toBe(200);
  }
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
});

test('natural butterfly motion stays sparse, synchronized and does not block CD controls', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('.butterfly-swarm--hero .butterfly-flyer');
  const music = page.locator('.butterfly-swarm--music .butterfly-flyer');
  await expect(hero).toHaveCount(3);
  await expect(music).toHaveCount(1);
  await expect(page.locator('.butterfly-swarm[aria-hidden="true"]')).toHaveCount(2);
  const butterfly = hero.first();
  const style = await butterfly.evaluate(el => ({
    pointer: getComputedStyle(el).pointerEvents,
    animation: getComputedStyle(el).animationName,
    image: getComputedStyle(el.querySelector('.butterfly-wing')!).backgroundImage,
  }));
  expect(style.pointer).toBe('none');
  expect(style.animation).toBe('none', 'flight runs on one on-demand controller, not looping CSS clones');
  expect(style.image).toContain('butterfly.webp');
  await expect(page.locator('body')).toHaveAttribute('data-scene-active', 'true');
  await expect.poll(() => butterfly.evaluate(el =>
    el.style.transform.startsWith('translate3d(') && !el.style.transform.includes('-90px'))).toBe(true);
  const first = await butterfly.evaluate(el => ({
    transform: el.style.transform,
    left: (el.querySelector('.butterfly-wing--left') as HTMLElement).style.transform,
    right: (el.querySelector('.butterfly-wing--right') as HTMLElement).style.transform,
    shape: (el.querySelector('.butterfly-shape') as HTMLElement).style.transform,
  }));
  const left = Number(first.left.split('rotateY(')[1]?.split('deg)')[0]);
  const right = Number(first.right.split('rotateY(')[1]?.split('deg)')[0]);
  expect(Number.isFinite(left) && Number.isFinite(right)).toBe(true);
  expect(Math.abs(left + right)).toBeLessThan(.06);
  expect(first.shape).toContain('rotateX(');
  await page.waitForTimeout(180);
  expect(await butterfly.evaluate(el => el.style.transform)).not.toBe(first.transform);
  await page.locator('#music').scrollIntoViewIfNeeded();
  await expect(page.locator('body')).toHaveAttribute('data-scene-active', 'false');
  const stopped = await butterfly.evaluate(el => el.style.transform);
  await page.waitForTimeout(170);
  expect(await butterfly.evaluate(el => el.style.transform)).toBe(stopped, 'offscreen motion sleeps');
  await expect(page.locator('#next-track')).toBeVisible();
  await page.locator('#next-track').click();
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '1');
});

test('low graphics and reduced motion keep decorative particles inert', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const flyer = page.locator('.butterfly-swarm--hero .butterfly-flyer').first();
  expect(await flyer.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect.poll(() => flyer.evaluate(el => (el as HTMLElement).hidden)).toBe(true);
  await expect(page.locator('.butterfly-swarm')).toHaveCount(2);
});


test('graphics Low shows just one subtle butterfly without disabling Music controls', async ({ page }) => {
  await page.goto('/');
  await page.locator('#quality-button').click();
  await page.locator('#quality-menu button[data-quality="low"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'low');
  await expect.poll(() => page.locator('.butterfly-swarm--hero .butterfly-flyer').nth(1).evaluate(el => (el as HTMLElement).hidden)).toBe(true);
  await expect.poll(() => page.locator('.butterfly-swarm--music .butterfly-flyer').first().evaluate(el => (el as HTMLElement).hidden)).toBe(true);
  await page.locator('#music').scrollIntoViewIfNeeded();
  await expect(page.locator('#disc-button')).toBeVisible();
});
