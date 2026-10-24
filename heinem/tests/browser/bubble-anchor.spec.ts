import { expect, test } from '@playwright/test';

test('bubble stays fully framed on short and unusually proportioned desktop screens', async ({ page }) => {
  for (const viewport of [
    { width: 1750, height: 820 },
    { width: 1600, height: 640 },
    { width: 1366, height: 650 },
    { width: 1024, height: 600 },
    { width: 820, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const geometry = await page.evaluate(() => {
      const scene = document.querySelector<HTMLElement>('#scene')!;
      const bubble = document.querySelector<HTMLElement>('#bubble')!;
      const canvas = document.querySelector<HTMLCanvasElement>('#bubble-canvas')!;
      const glass = bubble.getBoundingClientRect();
      const image = document.querySelector<HTMLImageElement>('.reference-foreground > img')!;
      const bounds = scene.getBoundingClientRect();
      const portrait = document.querySelector<HTMLElement>('.portrait')!.getBoundingClientRect();
      return { glass: { left: glass.left, top: glass.top, right: glass.right, bottom: glass.bottom, width: glass.width, height: glass.height },
        bounds: { top: bounds.top, bottom: bounds.bottom, height: bounds.height },
        canvas: canvas.getBoundingClientRect().width,
        fieldLoaded: image.naturalWidth > 0,
        portrait: {left:portrait.left,right:portrait.right} };
    });
    expect(geometry.glass.left).toBeGreaterThanOrEqual(0);
    expect(geometry.glass.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(geometry.glass.top).toBeGreaterThanOrEqual(0);
    expect(geometry.glass.bottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(geometry.canvas).toBeGreaterThan(0);
    expect(geometry.fieldLoaded).toBe(true);
  }
});
