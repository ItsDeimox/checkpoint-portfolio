import type { QualityTier } from './quality';

/** Load independent high-detail patches only where the continuous field is enlarged. */
export function createFieldDetail(field: HTMLElement, initialQuality: QualityTier): {
  setQuality(value: QualityTier): void;
  destroy(): void;
} {
  const detail = field.querySelector<HTMLElement>('.field-detail');
  const images = [...field.querySelectorAll<HTMLImageElement>('img[data-field-detail]')];
  const viewport = matchMedia('(min-width: 1000px)');
  const connection = (navigator as Navigator & {
    connection?: EventTarget & { saveData?: boolean };
  }).connection;
  const events = new AbortController();
  const { signal } = events;
  let quality = initialQuality;
  let loading = false;
  let ready = false;
  let failed = false;
  let destroyed = false;

  function enabled() {
    return quality !== 'low' && viewport.matches && connection?.saveData !== true;
  }

  function display() {
    if (detail) detail.hidden = !(enabled() && ready && !destroyed);
  }

  async function load() {
    if (!detail || !images.length || loading || ready || failed || destroyed || !enabled() || document.hidden) return;
    loading = true;
    detail.dataset.state = 'loading';
    try {
      await Promise.all(images.map(async image => {
        image.src = image.dataset.fieldDetail!;
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty field detail');
      }));
      ready = true;
      if (!destroyed) detail.dataset.state = 'ready';
    } catch {
      failed = true;
      if (!destroyed) detail.dataset.state = 'fallback';
      // The original complete meadow is already visible beneath these patches.
    } finally {
      loading = false;
      display();
    }
  }

  function update() {
    display();
    void load();
  }

  viewport.addEventListener('change', update, { signal });
  document.addEventListener('visibilitychange', update, { signal });
  connection?.addEventListener('change', update, { signal });
  update();

  return {
    setQuality(value) {
      quality = value;
      update();
    },
    destroy() {
      destroyed = true;
      events.abort();
      display();
    },
  };
}
