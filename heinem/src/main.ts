import { createBubble } from './graphics/bubble';
import { createQualityController } from './lib/quality';
import { createParallax } from './lib/parallax';
import { initPlayer } from './lib/player';

const hero = document.querySelector<HTMLElement>('#home')!;
const scene = document.querySelector<HTMLElement>('#scene')!;
const host = document.querySelector<HTMLElement>('#bubble')!;
const canvas = document.querySelector<HTMLCanvasElement>('#bubble-canvas')!;
const background = document.querySelector<HTMLImageElement>('.landscape')!;
let bubble: ReturnType<typeof createBubble> | undefined;
let parallax: ReturnType<typeof createParallax> | undefined;

const quality = createQualityController((tier, reducedMotion) => {
  document.body.dataset.quality = tier;
  document.body.dataset.reducedMotion = String(reducedMotion);
  bubble?.setQuality(tier);
  bubble?.setReducedMotion(reducedMotion);
  parallax?.setQuality(tier);
  parallax?.setReducedMotion(reducedMotion);
});

bubble = createBubble(canvas, host, {
  quality: quality.quality,
  reducedMotion: quality.reducedMotion,
  backdrop: background,
  rim: document.querySelector<HTMLImageElement>('.original-portrait')!,
  sky: document.querySelector<HTMLImageElement>('.sky')!,
  skyMaskStops: [0.42, 0.63],
  scene,
});
parallax = createParallax(hero, () => bubble?.syncBackdrop());
parallax.setQuality(quality.quality);
parallax.setReducedMotion(quality.reducedMotion);
const player = initPlayer();

// Decode local layers early; the page never waits behind a decorative loader.
for (const image of document.querySelectorAll<HTMLImageElement>('.hero img')) {
  image.decode?.().catch(() => { /* Native image fallback remains in the page. */ });
}

const life = new AbortController();
let heroVisible = true;
const updateVisibility = () => {
  document.body.dataset.sceneActive = String(heroVisible && !document.hidden);
};
const heroObserver = new IntersectionObserver(entries => {
  heroVisible = entries[0]?.isIntersecting ?? false;
  updateVisibility();
}, { threshold: 0 });
heroObserver.observe(hero);
document.addEventListener('visibilitychange', updateVisibility, { signal: life.signal });
updateVisibility();

const revealObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  }
}, { rootMargin: '0px 0px -25px 0px', threshold: 0.08 });
if (!quality.reducedMotion) document.body.classList.add('js-motion');
for (const section of document.querySelectorAll('.reveal')) revealObserver.observe(section);

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
  revealObserver.disconnect();
  sectionObserver.disconnect();
  quality.destroy();
  parallax?.destroy();
  bubble?.destroy();
  player.destroy();
}
function onPageHide(event: PageTransitionEvent) {
  if (event.persisted) return;
  dispose();
  window.removeEventListener('pagehide', onPageHide);
}
window.addEventListener('pagehide', onPageHide);
