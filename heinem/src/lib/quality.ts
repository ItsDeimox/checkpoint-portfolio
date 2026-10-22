export type QualityPreference = 'auto' | 'low' | 'medium' | 'high';
export type QualityTier = 'low' | 'medium' | 'high';

export type QualityHints = {
  cores?: number;
  memory?: number;
  coarse: boolean;
  saveData: boolean;
  reducedMotion: boolean;
};

export function resolveQuality(preference: QualityPreference, hints: QualityHints): QualityTier {
  if (preference !== 'auto') return preference;
  const cores = Number.isFinite(hints.cores) && (hints.cores ?? 0) > 0 ? hints.cores : undefined;
  const memory = Number.isFinite(hints.memory) && (hints.memory ?? 0) > 0 ? hints.memory : undefined;
  if (hints.saveData || (memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2)) return 'low';
  if (hints.coarse || (memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 4)) return 'medium';
  return 'high';
}

const STORAGE_KEY = 'heinem.graphics.v1';
const LABELS = { auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High' } as const;

function isPreference(value: string | null | undefined): value is QualityPreference {
  return value === 'auto' || value === 'low' || value === 'medium' || value === 'high';
}

function storedPreference(): QualityPreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isPreference(value) ? value : 'auto';
  } catch {
    // Private browsing and storage policies must not break the page.
    return 'auto';
  }
}

export function createQualityController(onChange: (quality: QualityTier, reducedMotion: boolean) => void): {
  readonly quality: QualityTier;
  readonly reducedMotion: boolean;
  destroy(): void;
} {
  const control = document.querySelector<HTMLElement>('#quality-control');
  const trigger = document.querySelector<HTMLButtonElement>('#quality-button');
  const menu = document.querySelector<HTMLElement>('#quality-menu');
  const label = document.querySelector<HTMLElement>('#quality-label');
  const autoTier = document.querySelector<HTMLElement>('#auto-tier');
  const options = [...document.querySelectorAll<HTMLButtonElement>('#quality-menu button[data-quality]')];
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const coarseQuery = matchMedia('(pointer: coarse)');
  const browser = navigator as Navigator & {
    deviceMemory?: number;
    connection?: EventTarget & { saveData?: boolean };
  };
  const events = new AbortController();
  const { signal } = events;
  let preference = storedPreference();
  let quality: QualityTier = 'high';
  let reducedMotion = motionQuery.matches;
  let initialized = false;

  function apply() {
    const hints: QualityHints = {
      cores: browser.hardwareConcurrency,
      memory: browser.deviceMemory,
      coarse: coarseQuery.matches,
      saveData: browser.connection?.saveData === true,
      reducedMotion: motionQuery.matches,
    };
    const nextQuality = resolveQuality(preference, hints);
    const changed = !initialized || nextQuality !== quality || reducedMotion !== hints.reducedMotion;
    quality = nextQuality;
    reducedMotion = hints.reducedMotion;
    if (control) {
      control.dataset.quality = quality;
      control.dataset.preference = preference;
    }
    if (label) label.textContent = LABELS[preference];
    if (autoTier) autoTier.textContent = `${LABELS[resolveQuality('auto', hints)]} for this device`;
    trigger?.setAttribute('aria-label', `Graphics quality: ${LABELS[preference]}${preference === 'auto' ? ` (${LABELS[quality]})` : ''}`);
    for (const option of options) option.setAttribute('aria-pressed', String(option.dataset.quality === preference));
    initialized = true;
    if (changed) onChange(quality, reducedMotion);
  }

  function close(returnFocus = false) {
    if (menu) menu.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger?.focus({ preventScroll: true });
  }

  trigger?.addEventListener('click', () => {
    if (!menu) return;
    const opening = menu.hidden;
    menu.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
    if (opening) options.find(option => option.dataset.quality === preference)?.focus({ preventScroll: true });
  }, { signal });

  for (const option of options) {
    option.addEventListener('click', () => {
      const value = option.dataset.quality;
      if (!isPreference(value)) return;
      preference = value;
      try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Keep the in-session choice. */ }
      apply();
      close(true);
    }, { signal });
  }

  document.addEventListener('pointerdown', event => {
    if (!menu?.hidden && event.target instanceof Node && !control?.contains(event.target)) close();
  }, { signal });
  document.addEventListener('focusin', event => {
    if (!menu?.hidden && event.target instanceof Node && !control?.contains(event.target)) close();
  }, { signal });
  document.addEventListener('keydown', event => {
    if (!menu || menu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || !options.length) return;
    event.preventDefault();
    const index = options.findIndex(option => option === document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[next]?.focus({ preventScroll: true });
  }, { signal });
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    preference = storedPreference();
    apply();
  }, { signal });
  motionQuery.addEventListener('change', apply, { signal });
  coarseQuery.addEventListener('change', apply, { signal });
  browser.connection?.addEventListener('change', apply, { signal });
  apply();

  return {
    get quality() { return quality; },
    get reducedMotion() { return reducedMotion; },
    destroy() {
      events.abort();
      close();
    },
  };
}
