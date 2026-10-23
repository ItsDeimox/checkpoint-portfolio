import { expect, test } from '@playwright/test';

test('generated panoramas replace the previous patches and keep the artist cutout', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('.reference-background')).toHaveJSProperty('naturalWidth', 1672);
  await expect(page.locator('.foreground > img')).toHaveJSProperty('naturalHeight', 2380);
  await expect(page.locator('.artist-cutout')).toHaveAttribute('src', '/assets/layers/artist-light.webp');
  await expect(page.locator('.distant-foliage, .mid-foliage, .left-tree, .field-detail, .butterfly')).toHaveCount(0);
  expect(requests.filter(url => /field-detail-|field-continuous|foliage-far|foliage-mid|tree-left/.test(url))).toEqual([]);
});

test('generated terrain begins transparent but becomes opaque through the music section', async ({ page }) => {
  await page.goto('/');
  const alpha = await page.locator('.foreground > img').evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    return [[10, 10], [800, 820], [800, 2200]].map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]);
  });
  expect(alpha).toEqual([0, 255, 255]);
});

test('single field covers the music section even on unusually tall displays', async ({ page }) => {
  for (const viewport of [{width: 1809,height:586},{width:1440,height:900},{width:390,height:844},{width:320,height:780},{width:600,height:1600}]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForTimeout(90);
    const geometry = await page.evaluate(() => ({
      field: document.querySelector('.foreground')!.getBoundingClientRect().bottom,
      page: document.querySelector('#music')!.getBoundingClientRect().bottom,
      opacity: getComputedStyle(document.querySelector('.foreground')!).opacity,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));
    expect(geometry.field).toBeGreaterThanOrEqual(geometry.page);
    expect(geometry.field).toBeGreaterThanOrEqual(viewport.height);
    expect(geometry.opacity).toBe('1');
    expect(geometry.overflow).toBeLessThanOrEqual(1);
  }
});
