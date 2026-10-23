import { expect, test } from '@playwright/test';

test('disc stays centered during hover and a full rotation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#disc-button').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  const center = () => page.locator('#disc-button').evaluate(el => {
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  const before = await center();
  await page.locator('#disc-button').hover();
  await page.waitForTimeout(350);
  const after = await center();
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(0.6);
  const orbit = await page.locator('.disc-face').evaluate(el => {
    const room = document.querySelector<HTMLElement>('#listening-room')!;
    room.dataset.state = 'playing';
    const animation = el.getAnimations()[0];
    if (!animation) throw new Error('Disc rotation is unavailable');
    animation.pause();
    const duration = Number(animation.effect!.getComputedTiming().duration);
    return [0, 0.25, 0.5, 0.75, 1].map(phase => {
      animation.currentTime = duration * phase;
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
  });
  for (const point of orbit) {
    expect(Math.hypot(point.x - after.x, point.y - after.y)).toBeLessThan(0.6);
  }
});

test('album sleeves select real tracks without loading media before play', async ({ page }) => {
  const remote: string[] = [];
  page.on('request', request => {
    if (/soundcloud\.com/.test(request.url())) remote.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('#listening-room')).toHaveAttribute('data-active-track', '0');
  await expect(page.locator('[data-track="2"]')).toHaveAttribute('data-position', 'previous');
  await expect(page.locator('[data-track="1"]')).toHaveAttribute('data-position', 'next');
  await page.locator('#next-track').click();
  await expect(page.locator('#track-title')).toContainText('MHA');
  await page.locator('#previous-track').click();
  await expect(page.locator('#track-title')).toHaveText('Memories Of You');
  await page.locator('[data-track="2"]').click();
  await expect(page.locator('#track-title')).toHaveText('Show Me Love');
  await expect(page.locator('#disc-button')).toHaveAttribute('aria-label', 'Play Show Me Love');
  await expect(page.locator('#embed-mount iframe')).toHaveCount(0);
  expect(remote).toEqual([]);
  await expect(page.locator('#about, #contact')).toHaveCount(0);
});
