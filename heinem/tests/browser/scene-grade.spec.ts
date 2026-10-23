import { expect, test } from '@playwright/test';

test('HEINEM social links omit X while preserving the remaining official profiles', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.social-links a');
  await expect(links).toHaveCount(4);
  for (const service of ['YouTube', 'Spotify', 'Instagram', 'SoundCloud']) {
    await expect(links.getByRole('link', { name: `HEINEM on ${service}` })).toHaveCount(1);
  }
  await expect(page.locator('.social-links a[href*="x.com"], .social-links a[href*="twitter.com"]')).toHaveCount(0);
  await expect(page.locator('#icon-x')).toHaveCount(0);
});

test('cooler grading touches scenery only and keeps the continuous foreground', async ({ page }) => {
  await page.goto('/');
  const filters = await page.evaluate(() => {
    const f = (selector: string) => getComputedStyle(document.querySelector(selector)!).filter;
    return {
      sky: f('.sky'),
      distant: f('.distant-foliage'),
      mid: f('.mid-foliage'),
      tree: f('.left-tree'),
      field: f('.scene-layer.foreground'),
      portrait: f('.artist-cutout'),
      artwork: f('.jewel-artwork'),
      bubble: f('#bubble'),
      background: getComputedStyle(document.querySelector('#scene-world')!).backgroundColor,
      fields: document.querySelectorAll('.scene-layer.foreground').length,
    };
  });
  for (const key of ['sky', 'distant', 'mid', 'tree', 'field'] as const) {
    expect(filters[key]).toContain('saturate(');
    expect(filters[key]).toContain('hue-rotate(');
  }
  const amount = (filter: string, name: string) =>
    Number(filter.split(name + '(')[1]?.split(')')[0]);
  for (const key of ['distant', 'mid', 'tree', 'field'] as const) {
    expect(amount(filters[key], 'saturate')).toBeLessThanOrEqual(.65);
    expect(amount(filters[key], 'contrast')).toBeLessThan(1);
  }
  expect(amount(filters.sky, 'saturate')).toBeLessThanOrEqual(.65);
  expect(amount(filters.sky, 'contrast')).toBeLessThan(1);
  expect(filters.portrait).toBe('none');
  expect(filters.bubble).toBe('none');
  expect(filters.fields).toBe(1);
  expect(filters.background).toBe('rgb(69, 90, 86)');
});
