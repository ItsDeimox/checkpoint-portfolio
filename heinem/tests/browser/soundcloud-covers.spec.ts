import { test, expect } from '@playwright/test';

/**
 * The cases must acquire SoundCloud artwork before clicking play, yet the
 * transport widget is still lazy. Mock only the upstream providers.
 */
test('official covers fill the three added CD sleeves without streaming', async ({ page }) => {
  const lookups: string[] = [];
  const imageFetches: string[] = [];
  await page.route(/^https:\/\/soundcloud\.com\/oembed\?/, async route => {
    const permalink = new URL(route.request().url()).searchParams.get('url') ?? '';
    lookups.push(permalink);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        provider_name: 'SoundCloud',
        thumbnail_url: 'https://i1.sndcdn.com/artworks-testcover-t500x500.jpg',
      }),
    });
  });
  await page.route(/^https:\/\/i1\.sndcdn\.com\//, async route => {
    imageFetches.push(route.request().url());
    await route.fulfill({
      status: 200, contentType: 'image/jpeg',
      path: 'public/assets/memories-of-you.jpg',
    });
  });
  await page.goto('/');
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  await page.locator('#music').scrollIntoViewIfNeeded();
  const official = page.locator('.generated-cover[data-cover-source="soundcloud"]');
  await expect(official).toHaveCount(3);
  expect(lookups).toHaveLength(3);
  expect(imageFetches.length).toBeGreaterThan(0);
  for (const release of ['fall','her','seven']) {
    await expect(page.locator(`.generated-cover[data-cover="${release}"]`)).toHaveClass(/has-cover-art/);
  }
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  await expect(page.locator('.jewel-artwork[src^="/assets/"]')).toHaveCount(3);
});

test('missing SoundCloud artwork keeps original designed sleeve instead of breaking the carousel', async ({ page }) => {
  await page.route(/^https:\/\/soundcloud\.com\/oembed\?/, route =>
    route.fulfill({ status: 404, body: 'Track not found', headers: { 'access-control-allow-origin': '*' } }));
  await page.route(/^https:\/\/i1\.sndcdn\.com\//, route =>
    route.fulfill({ status: 404, body: 'Cover unavailable' }));
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.locator('#music').scrollIntoViewIfNeeded();
  await expect(page.locator('.generated-cover.has-cover-art')).toHaveCount(0);
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  expect(errors).toEqual([]);
});
