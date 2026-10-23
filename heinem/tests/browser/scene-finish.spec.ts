import { expect, test } from '@playwright/test';
import { inflateSync } from 'node:zlib';

// A 1x1 screenshot has no prior pixel/row, so all PNG predictors are zero.
function pixel(png: Buffer): number[] {
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const size = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      chunks.push(png.subarray(offset + 8, offset + 8 + size));
    }
    offset += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  return [...raw.subarray(1, 4)];
}

test('cool finish covers scenery and refraction, not artist or music controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#scene-world')).toHaveAttribute('data-color-finish', 'cool');
  await expect(page.locator('#garden-cool-finish')).toHaveCount(1);
  await expect(page.locator('#garden-cool-finish')).toHaveAttribute('color-interpolation-filters', 'sRGB');
  for (const selector of ['.sky', '.distant-foliage', '.mid-foliage', '.left-tree', '.scene-layer.foreground', '#bubble-canvas']) {
    expect(await page.locator(selector).evaluate(el => getComputedStyle(el).filter)).toContain('garden-cool-finish');
  }
  for (const selector of ['#scene-world', '.portrait', '.artist-cutout', '.music-caption', '.jewel-stage']) {
    expect(await page.locator(selector).evaluate(el => getComputedStyle(el).filter)).toBe('none');
  }
  await expect(page.locator('.scene-layer.foreground')).toHaveCount(1);
});

test('actual browser pixels cool shadow greens while leaving white neutral', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#scene-world')).toHaveAttribute('data-color-finish', 'cool');
  await page.evaluate(() => {
    const chip = document.createElement('div');
    chip.id = 'finish-pixel-probe';
    chip.style.cssText = 'position:fixed;left:1px;top:1px;width:12px;height:12px;z-index:10000;filter:var(--garden-cool-finish);background:rgb(40,65,38)';
    document.querySelector('#scene-world')!.append(chip);
    scrollTo({top:0,behavior:'instant'});
  });
  const shaded = pixel(await page.screenshot({clip:{x:5,y:5,width:1,height:1}}));
  for (const [i, expected] of [27,57,42].entries()) expect(Math.abs(shaded[i] - expected)).toBeLessThanOrEqual(1);
  await page.locator('#finish-pixel-probe').evaluate(el => (el as HTMLElement).style.background='white');
  const white = pixel(await page.screenshot({clip:{x:5,y:5,width:1,height:1}}));
  expect(white).toEqual([255,255,255]);
  await page.locator('#finish-pixel-probe').evaluate(el => el.remove());
});
