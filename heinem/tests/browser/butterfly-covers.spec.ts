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
    expect(await sleeve.evaluate(node => getComputedStyle(node).backgroundImage))
      .toContain(`/assets/covers/${name}.svg`);
    const status = await page.evaluate(async src => (await fetch(src)).status, `/assets/covers/${name}.svg`);
    expect(status).toBe(200);
  }
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
});

test('butterfly particles fly through both sections without blocking interaction', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.butterfly-swarm--hero .butterfly-flyer')).toHaveCount(8);
  await expect(page.locator('.butterfly-swarm--music .butterfly-flyer')).toHaveCount(6);
  await expect(page.locator('.butterfly-swarm[aria-hidden="true"]')).toHaveCount(2);
  const butterfly = page.locator('.butterfly-swarm--hero .butterfly-flyer').first();
  const style = await butterfly.evaluate(el => ({
    pointer: getComputedStyle(el).pointerEvents,
    animation: getComputedStyle(el).animationName,
    image: getComputedStyle(el.querySelector('.butterfly-wing')!).backgroundImage,
  }));
  expect(style.pointer).toBe('none');
  expect(style.animation).toContain('butterfly-drift');
  expect(style.image).toContain('butterfly.webp');
  await page.locator('#music').scrollIntoViewIfNeeded();
  await expect(page.locator('#next-track')).toBeVisible();
  await page.locator('#next-track').click();
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '1');
});

test('low graphics and reduced motion keep decorative particles inert', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const flyer = page.locator('.butterfly-swarm--hero .butterfly-flyer').first();
  expect(await flyer.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect(page.locator('.butterfly-swarm')).toHaveCount(2);
});
