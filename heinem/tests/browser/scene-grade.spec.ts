import { expect, test } from '@playwright/test';

test('HEINEM social links omit X while preserving the remaining official profiles', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('.social-links a');
  await expect(links).toHaveCount(4);
  for (const service of ['YouTube', 'Spotify', 'Instagram', 'SoundCloud']) {
    await expect(page.getByRole('link', { name: `HEINEM on ${service}` })).toHaveCount(1);
  }
  await expect(page.locator('.social-links a[href*="x.com"], .social-links a[href*="twitter.com"]')).toHaveCount(0);
  await expect(page.locator('#icon-x')).toHaveCount(0);
});

test('reference artwork is pregraded and never tinted twice at runtime', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#scene-world')).toHaveAttribute('data-scene','reference-2026-10-23');
  for (const selector of ['.reference-background', '.foreground', '.artist-cutout', '#bubble-canvas']) {
    expect(await page.locator(selector).evaluate(el => getComputedStyle(el).filter)).toBe('none');
  }
  await expect(page.locator('#garden-cool-finish')).toHaveCount(0);
  await expect(page.locator('.foreground')).toHaveCount(1);
});
