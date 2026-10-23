import { expect, test } from '@playwright/test';

test('sky stays at its physical depth when native scrolling stops or reverses', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Graphics quality:/ }).click();
  await page.locator('#quality-menu button[data-quality="high"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'high');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll<HTMLImageElement>('.hero img')]
      .map(image => image.decode().catch(() => undefined)));
    document.documentElement.style.scrollBehavior = 'auto';
  });

  const trace = await page.evaluate(async () => {
    const sky = document.querySelector<HTMLElement>('.sky')!;
    const rows: Array<{ requested: number; frame: number; scroll: number; translation: number; top: number }> = [];
    const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    // Layout/font initialization has completed before probing depth response.
    await nextFrame();
    await nextFrame();
    for (const requested of [280, 130]) {
      scrollTo({ top: requested, behavior: 'instant' });
      for (let frame = 0; frame < 14; frame++) {
        await nextFrame();
        rows.push({ requested, frame, scroll: scrollY,
          translation: new DOMMatrix(getComputedStyle(sky).transform).m42,
          top: sky.getBoundingClientRect().top });
      }
    }
    return rows;
  });

  for (const requested of [280, 130]) {
    // One event/RAF turn may be pending; a stationary document must not leave
    // another easing animation pulling its sky back in the opposite direction.
    const steady = trace.filter(row => row.requested === requested && row.frame >= 2);
    expect(steady.every(row => row.scroll === requested)).toBe(true);
    const mismatch = Math.max(...steady.map(row => Math.abs(row.translation - row.scroll * 0.64)));
    const drift = Math.max(...steady.map(row => row.top)) - Math.min(...steady.map(row => row.top));
    expect(mismatch, JSON.stringify({ requested, mismatch, drift, trace: steady })).toBeLessThan(0.1);
    expect(drift, 'Sky must stop when the actual document stops').toBeLessThan(0.1);
  }
});

test('wheel writes update sky depth in the same presentation frame', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Graphics quality:/ }).click();
  await page.locator('#quality-menu button[data-quality="high"]').click();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll<HTMLImageElement>('.hero img')]
      .map(image => image.decode().catch(() => undefined)));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const sky = document.querySelector<HTMLElement>('.sky')!;
    const state = window as typeof window & { __skyScrollWrites: Array<{ scroll: number; translation: number }> };
    state.__skyScrollWrites = [];
    const originalScroll = window.scrollTo.bind(window);
    window.scrollTo = ((...args: unknown[]) => {
      (originalScroll as (...values: unknown[]) => void)(...args);
      // A microtask sees the completed smooth-scroll animation callback before
      // the browser paints it, independently of RAF observer registration order.
      queueMicrotask(() => state.__skyScrollWrites.push({ scroll: scrollY,
        translation: new DOMMatrix(getComputedStyle(sky).transform).m42 }));
    }) as typeof window.scrollTo;
  });
  await page.mouse.move(1120, 100);
  await page.mouse.wheel(0, 430);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(430);
  const writes = await page.evaluate(() =>
    (window as typeof window & { __skyScrollWrites: Array<{ scroll: number; translation: number }> }).__skyScrollWrites);
  expect(writes.length).toBeGreaterThan(2);
  const mismatch = Math.max(...writes.map(row => Math.abs(row.translation - row.scroll * 0.64)));
  expect(mismatch, JSON.stringify({ mismatch, writes })).toBeLessThan(0.1);
});
