import { expect, test } from '@playwright/test';

test('bubble anchor composes with inline parallax across desktop viewport resizes', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  const sizes = [
    { width: 2048, height: 1010 },
    { width: 1440, height: 900 },
    { width: 1440, height: 700 },
    { width: 960, height: 720 },
    { width: 800, height: 700 },
    { width: 1280, height: 560 },
  ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const bounds = await page.evaluate(() => {
      const rect = (selector: string) => {
        const box = document.querySelector(selector)!.getBoundingClientRect();
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
      };
      const bubble = document.querySelector<HTMLElement>('#bubble')!;
      return {
        hero: rect('#home'),
        bubble: rect('#bubble'),
        copy: rect('.bubble-copy'),
        translate: getComputedStyle(bubble).translate,
        parallaxTransform: bubble.style.transform,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    // The previous version left top:52% without centering when the parallax
    // controller replaced transform:translateY(-50%) with inline translate3d.
    expect(bounds.translate, JSON.stringify({ size, bounds })).toContain('-50%');
    expect(bounds.parallaxTransform).toContain('translate3d');
    expect(bounds.bubble.top, JSON.stringify({ size, bounds })).toBeGreaterThanOrEqual(0);
    expect(bounds.bubble.top, JSON.stringify({ size, bounds })).toBeLessThan(size.height * .27);
    expect(bounds.bubble.bottom, JSON.stringify({ size, bounds })).toBeLessThanOrEqual(bounds.hero.bottom + 2);
    expect(bounds.copy.left, JSON.stringify({ size, bounds })).toBeGreaterThan(bounds.bubble.left + 5);
    expect(bounds.copy.right, JSON.stringify({ size, bounds })).toBeLessThan(bounds.bubble.right - 5);
    expect(bounds.copy.top, JSON.stringify({ size, bounds })).toBeGreaterThan(bounds.bubble.top + 5);
    expect(bounds.copy.bottom, JSON.stringify({ size, bounds })).toBeLessThan(bounds.bubble.bottom - 5);
    expect(bounds.overflow).toBeLessThanOrEqual(1);
  }
});

test('mobile retains its composition and grass refraction uses two backdrops', async ({ page }) => {
  test.setTimeout(50_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#bubble')).toHaveAttribute('data-webgl', 'ready');
  const geometry = await page.evaluate(() => {
    const hero = document.querySelector('#home')!.getBoundingClientRect();
    const bubble = document.querySelector('#bubble')!.getBoundingClientRect();
    const field = document.querySelector('.reference-foreground > img') as HTMLImageElement;
    return { top: bubble.top, bottom: bubble.bottom, heroBottom: hero.bottom, fieldLoaded: field.complete && field.naturalWidth > 0 };
  });
  expect(geometry.top).toBeGreaterThan(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.heroBottom + 5);
  expect(geometry.fieldLoaded).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const gl = document.querySelector<HTMLCanvasElement>('#bubble-canvas')?.getContext('webgl2');
    const program = gl?.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    if (!gl || !program) return 0;
    const location = gl.getUniformLocation(program, 'uBackdropCount');
    return location ? gl.getUniform(program, location) as number : 0;
  })).toBe(2);
});
