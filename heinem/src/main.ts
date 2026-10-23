import { createBubble } from './graphics/bubble';
import { createQualityController } from './lib/quality';
import { createParallax } from './lib/parallax';
import { initPlayer } from './lib/player';
import { createSmoothScroll } from './lib/smooth-scroll';

const hero = document.querySelector<HTMLElement>('#home')!;
const world = document.querySelector<HTMLElement>('#scene-world')!;
const scene = document.querySelector<HTMLElement>('#scene')!;
const host = document.querySelector<HTMLElement>('#bubble')!;
const canvas = document.querySelector<HTMLCanvasElement>('#bubble-canvas')!;
const backdrops = ['.reference-background', '.reference-foreground > img']
  .map(selector => document.querySelector<HTMLImageElement>(selector)!);
let bubble: ReturnType<typeof createBubble> | undefined;
let parallax: ReturnType<typeof createParallax> | undefined;
let smoothScroll: ReturnType<typeof createSmoothScroll> | undefined;

const quality = createQualityController((tier, reducedMotion) => {
  document.body.dataset.quality = tier;
  document.body.dataset.reducedMotion = String(reducedMotion);
  bubble?.setQuality(tier);
  bubble?.setReducedMotion(reducedMotion);
  parallax?.setQuality(tier);
  parallax?.setReducedMotion(reducedMotion);
  smoothScroll?.setReducedMotion(reducedMotion);
});

bubble = createBubble(canvas, host, {
  quality: quality.quality,
  reducedMotion: quality.reducedMotion,
  backdrop: backdrops[0],
  backdrops,
  scene,
});
parallax = createParallax(world, () => bubble?.syncBackdrop());
parallax.setQuality(quality.quality);
parallax.setReducedMotion(quality.reducedMotion);
smoothScroll = createSmoothScroll(quality.reducedMotion, () => parallax?.syncScroll());
const player = initPlayer();

// Decode local layers early; the page never waits behind a decorative loader.
for (const image of document.querySelectorAll<HTMLImageElement>('.hero img[src]:not([data-field-detail])')) {
  image.decode?.().catch(() => { /* Native image fallback remains in the page. */ });
}

const life = new AbortController();
let heroVisible = true;
let musicVisible = false;
const updateVisibility = () => {
  document.body.dataset.sceneActive = String(heroVisible && !document.hidden);
  document.body.dataset.musicActive = String(musicVisible && !document.hidden);
};
const heroObserver = new IntersectionObserver(entries => {
  heroVisible = !!entries[0]?.isIntersecting && entries[0].intersectionRatio > 0.001;
  updateVisibility();
}, { threshold: 0.001 });
heroObserver.observe(hero);
const musicObserver = new IntersectionObserver(entries => {
  musicVisible = !!entries[0]?.isIntersecting && entries[0].intersectionRatio > 0.001;
  updateVisibility();
}, { threshold: 0.001 });
musicObserver.observe(document.querySelector('#music')!);
document.addEventListener('visibilitychange', updateVisibility, { signal: life.signal });
updateVisibility();

const links = [...document.querySelectorAll<HTMLAnchorElement>('.primary-nav a')];
const sectionObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const link of links) {
      const active = link.hash === `#${entry.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }
}, { rootMargin: '-20% 0px -55% 0px', threshold: 0 });
for (const section of document.querySelectorAll<HTMLElement>('main > section')) sectionObserver.observe(section);

function dispose() {
  life.abort();
  heroObserver.disconnect();
  musicObserver.disconnect();
  sectionObserver.disconnect();
  quality.destroy();
  parallax?.destroy();
  smoothScroll?.destroy();
  bubble?.destroy();
  player.destroy();
}
function onPageHide(event: PageTransitionEvent) {
  if (event.persisted) return;
  dispose();
  window.removeEventListener('pagehide', onPageHide);
}
window.addEventListener('pagehide', onPageHide);
