import { test, expect } from '@playwright/test';

test('narrow screens and Low do not request desktop meadow detail', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/assets/layers/field-detail-')) requests.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.artist-cutout')).toHaveJSProperty('complete', true);
  await expect(page.locator('.field-detail')).toBeHidden();
  await expect(page.locator('.field-detail')).toHaveAttribute('data-state', 'idle');
  expect(requests).toHaveLength(0);

  await page.locator('#quality-button').click();
  await page.locator('#quality-menu button[data-quality="low"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'low');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'low');
  await expect(page.locator('.field-detail')).toHaveAttribute('data-state', 'idle');
  expect(requests).toHaveLength(0);
});

test('desktop detail follows the same field and settles without more requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/assets/layers/field-detail-')) requests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem('heinem.graphics.v1', 'high'));
  await page.goto('/');
  await expect(page.locator('.field-detail')).toHaveAttribute('data-state', 'ready', { timeout: 15_000 });
  await expect(page.locator('.field-detail')).toBeVisible();
  const before = await page.evaluate(() => {
    const field = document.querySelector<HTMLElement>('.foreground')!;
    const detail = document.querySelector<HTMLElement>('.field-detail')!;
    return { fieldY: field.getBoundingClientRect().y, detailY: detail.getBoundingClientRect().y };
  });
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
  const after = await page.evaluate(() => {
    const field = document.querySelector<HTMLElement>('.foreground')!;
    const detail = document.querySelector<HTMLElement>('.field-detail')!;
    return {
      fieldY: field.getBoundingClientRect().y,
      detailY: detail.getBoundingClientRect().y,
      opacity: getComputedStyle(field).opacity,
      detailPlanes: document.querySelectorAll('.foreground .field-detail-plane').length,
      decoded: [...detail.querySelectorAll('img')].every(image => image.naturalWidth >= 1000),
    };
  });
  expect(after.detailY - after.fieldY).toBeCloseTo(before.detailY - before.fieldY, 1);
  expect(after.opacity).toBe('1');
  expect(after.detailPlanes).toBe(1);
  expect(after.decoded).toBe(true);
  expect(new Set(requests).size).toBe(4);
  expect(requests).toHaveLength(4);

  await page.locator('#quality-button').click();
  await page.locator('#quality-menu button[data-quality="low"]').click();
  await expect(page.locator('.field-detail')).toBeHidden();
  expect(requests).toHaveLength(4);
});

test('a missing detail patch keeps the complete original field visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem('heinem.graphics.v1', 'high'));
  await page.route('**/assets/layers/field-detail-tr.webp', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.field-detail')).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('.field-detail')).toBeHidden();
  await expect(page.locator('.foreground > img')).toBeVisible();
  await expect.poll(() => page.locator('.foreground > img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1080);
});
