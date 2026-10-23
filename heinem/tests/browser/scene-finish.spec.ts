import { expect, test } from '@playwright/test';

test('reference retains authentic portrait, readable membrane and interactive CD', async ({ page }) => {
  await page.setViewportSize({width: 1809,height:586});
  await page.goto('/');
  await expect(page.locator('#bubble')).toHaveAttribute('data-webgl','ready');
  await expect(page.locator('#bubble')).toHaveAttribute('data-gpu-copy','ready');
  await expect(page.locator('.artist-cutout')).toHaveAttribute('src','/assets/layers/artist-light.webp');
  const bounds = await page.evaluate(() => {
    const toJSON = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().toJSON();
    return {portrait:toJSON('.portrait'), bubble:toJSON('#bubble'), copy:toJSON('.bubble-copy')};
  });
  expect(bounds.portrait.x / 1809).toBeCloseTo(.212, 2);
  expect(bounds.bubble.x / 1809).toBeCloseTo(.427, 2);
  expect(bounds.copy.right).toBeLessThan(bounds.bubble.right);
  await page.mouse.move(bounds.copy.x + 45, bounds.copy.y + 100);
  await expect(page.locator('#bubble')).toHaveAttribute('data-webgl','ready');
  await expect(page.locator('[data-bubble-glyph]')).toHaveCount(0);
  await page.locator('#music').scrollIntoViewIfNeeded();
  await expect(page.locator('#disc-button')).toBeVisible();
});
