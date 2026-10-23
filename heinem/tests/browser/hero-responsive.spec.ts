import { test, expect } from '@playwright/test';

for (const [width, height] of [[1809, 586], [1440, 900], [1280, 600], [1180, 720], [920, 1024], [820, 580]]) {
  test(`bubble remains anchored and readable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('#bubble')).toHaveAttribute('data-gpu-copy', 'ready');
    await page.evaluate(() => document.fonts.ready);
    const value = await page.evaluate(() => {
      const host = document.querySelector('#bubble')!.getBoundingClientRect();
      const copy = document.querySelector('.bubble-copy')!.getBoundingClientRect();
      const title = document.querySelector('.bubble-copy h1')!.getBoundingClientRect();
      const body = document.querySelector('.bubble-copy p')!.getBoundingClientRect();
      const line = document.querySelector('.signature-line')!.getBoundingClientRect();
      return { aspect: host.width / host.height,
        copyInside: copy.left >= host.left && copy.right <= host.right && copy.bottom <= host.bottom,
        textInside: Math.max(title.right, body.right) <= host.right,
        underlineInside: line.bottom < host.bottom,
        overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(value.aspect).toBeGreaterThan(1.40);
    expect(value.aspect).toBeLessThan(1.55);
    expect(value.copyInside).toBe(true);
    expect(value.textInside).toBe(true);
    expect(value.underlineInside).toBe(true);
    expect(value.overflow).toBeLessThanOrEqual(1);
  });
}

test('artist geometric H replaces script logo and native field feeds refraction', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.brand img[src="/assets/heinem-mark.svg"]')).toBeVisible();
  await expect(page.locator('.reference-background')).toHaveCount(1);
  await expect(page.locator('.reference-foreground > img')).toHaveCount(1);
  await expect(page.locator('#bubble')).toHaveAttribute('data-webgl', 'ready');
});
