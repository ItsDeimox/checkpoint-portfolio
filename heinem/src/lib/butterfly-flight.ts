/**
 * Lightweight butterfly kinematics, designed for the approved HEINEM scene.
 *
 * Sources: butterfly free-flight trajectories are curved and speed varies
 * within the stroke (Fei & Yang, Phys. Rev. E 92, 033004, 2015); the wings
 * move as a coupled pair and the thorax steers flight (Johansson et al.,
 * J. R. Soc. Interface 18:20200854, 2021).
 *
 * Three quiet hero locations and one music-edge location. No trails, particle
 * emission, shader passes, network, stochastic frame-to-frame jumps or
 * per-frame layout reads. Motion is driven by transforms only.
 */
export type ButterflyTier = 'low' | 'medium' | 'high';
export type FlightName = 'canopy' | 'sky' | 'meadow' | 'music';
type Point = readonly [number, number];
type Region = 'hero' | 'music';
type Flight = {
  region: Region;
  period: number;
  frequency: number;
  phase: number;
  size: number;
  opacity: number;
  points: readonly Point[];
};

export const BUTTERFLY_FLIGHTS: Record<FlightName, Flight> = {
  canopy: {
    region: 'hero', period: 17.2, frequency: 6.2, phase: 0.6,
    size: 0.94, opacity: 0.72,
    points: [[.07, .23], [.14, .15], [.21, .20], [.16, .31], [.08, .35], [.045, .28]],
  },
  sky: {
    region: 'hero', period: 20.4, frequency: 6.8, phase: 2.1,
    size: 0.80, opacity: 0.65,
    points: [[.88, .20], [.95, .25], [.96, .38], [.88, .33], [.84, .17], [.91, .13]],
  },
  meadow: {
    region: 'hero', period: 15.8, frequency: 7.3, phase: 4.1,
    size: 0.72, opacity: 0.52,
    points: [[.08, .70], [.17, .66], [.20, .76], [.12, .82], [.055, .78], [.045, .71]],
  },
  music: {
    region: 'music', period: 21.6, frequency: 6.5, phase: 1.3,
    size: 0.84, opacity: 0.62,
    points: [[.86, .27], [.95, .20], [.97, .40], [.89, .53], [.83, .44], [.82, .31]],
  },
};

const TAU = Math.PI * 2;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const cyclic = (n: number, size: number) => ((n % size) + size) % size;
const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * ((2 * p1) + (-p0 + p2) * t +
    (2*p0 - 5*p1 + 4*p2 - p3)*t*t +
    (-p0 + 3*p1 - 3*p2 + p3)*t*t*t);

function positionAt(points: readonly Point[], p: number): Point {
  const length = points.length;
  const segment = cyclic(p, 1) * length;
  const index = Math.floor(segment);
  const t = segment - index;
  const before = points[cyclic(index - 1, length)];
  const from = points[index];
  const to = points[(index + 1) % length];
  const after = points[(index + 2) % length];
  return [
    catmull(before[0], from[0], to[0], after[0], t),
    catmull(before[1], from[1], to[1], after[1], t),
  ];
}

export function butterflyPose(name: FlightName, seconds: number) {
  const flight = BUTTERFLY_FLIGHTS[name];
  const safe = Math.max(0, seconds);
  const elapsed = safe / flight.period;
  // Smooth acceleration changes within an orbit, but never random jerks.
  // Integer laps meet at an identical point with an identical tangent.
  const p = elapsed
    + .018 * (Math.sin(TAU * elapsed * 2 + flight.phase) - Math.sin(flight.phase))
    + .009 * (Math.sin(TAU * elapsed * 3 + flight.phase * 1.3) - Math.sin(flight.phase * 1.3));
  const center = positionAt(flight.points, p);
  const prev = positionAt(flight.points, p - .006);
  const next = positionAt(flight.points, p + .006);
  const vx = next[0] - prev[0];
  const vy = next[1] - prev[1];
  const aX = center[0] - prev[0];
  const aY = center[1] - prev[1];
  const bX = next[0] - center[0];
  const bY = next[1] - center[1];
  const turn = (aX * bY - aY * bX) /
    Math.max(.000001, Math.hypot(aX, aY) * Math.hypot(bX, bY));
  const bank = clamp(turn * 26 + clamp(vy * 50, -4, 4), -17, 17);

  // Same phase on both halves: butterfly wings clap and separate together.
  // Wingbeat slows subtly, with occasional outstretched glides. Body pitch
  // and vertical impulse respond to the actual stroke, not to a CSS timer.
  const beatPhase = TAU * flight.frequency * safe
    + .53 * Math.sin(safe * 1.18 + flight.phase)
    + .23 * Math.sin(safe * 2.07 + flight.phase * 1.4);
  const downstroke = Math.pow((1 + Math.sin(beatPhase)) * .5, .76);
  const glide = clamp((Math.cos(safe * .79 + flight.phase) - .68) / .32, 0, 1) * .93;
  const wing = 8 + 68 * downstroke * (1 - glide);
  const pitch = clamp((.5 - center[1]) * 11 - vy * 26, -9, 9)
    + (1 - glide) * Math.sin(beatPhase - .7) * 2.0;
  const yaw = 6.5 * Math.sin(safe * .77 + flight.phase);
  const bob = (1 - glide) * Math.sin(beatPhase - .9) * 1.3;
  const scale = flight.size * (1 + .065 * Math.sin(safe * .51 + flight.phase));
  const opacity = clamp(flight.opacity * (.94 + .06 * Math.sin(safe * .63 + flight.phase)), .38, .82);
  return {
    x: clamp(center[0], .02, .98),
    y: clamp(center[1], .05, .92),
    bank, yaw, pitch, bob, wing, glide, scale, opacity,
  };
}

type ButterflyNode = {
  name: FlightName;
  region: Region;
  wrapper: HTMLElement;
  shape: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
};
type SectionSize = { width: number; height: number };

export function createButterflyFlight(initialTier: ButterflyTier, initialReducedMotion: boolean) {
  const names: FlightName[] = ['canopy', 'sky', 'meadow', 'music'];
  const nodes: ButterflyNode[] = [];
  for (const name of names) {
    const wrapper = document.querySelector<HTMLElement>('.butterfly-flyer[data-flight="' + name + '"]');
    const shape = wrapper?.querySelector<HTMLElement>('.butterfly-shape');
    const left = wrapper?.querySelector<HTMLElement>('.butterfly-wing--left');
    const right = wrapper?.querySelector<HTMLElement>('.butterfly-wing--right');
    if (wrapper && shape && left && right) {
      nodes.push({ name, region: BUTTERFLY_FLIGHTS[name].region, wrapper, shape, left, right });
    }
  }
  const sections: Record<Region, HTMLElement | null> = {
    hero: document.querySelector<HTMLElement>('#home'),
    music: document.querySelector<HTMLElement>('#music'),
  };
  const sizes: Record<Region, SectionSize> = {
    hero: { width: window.innerWidth, height: window.innerHeight },
    music: { width: window.innerWidth, height: window.innerHeight },
  };
  const events = new AbortController();
  let tier = initialTier;
  let reducedMotion = initialReducedMotion;
  let isMobile = window.innerWidth <= 700;
  let destroyed = false;
  let frame = 0;
  let clock = 0;
  let previous = 0;
  let lastPaint = 0;

  const measure = () => {
    isMobile = window.innerWidth <= 700;
    for (const region of ['hero', 'music'] as const) {
      const element = sections[region];
      if (element) {
        sizes[region].width = Math.max(1, element.clientWidth);
        sizes[region].height = Math.max(1, element.clientHeight);
      }
    }
  };
  const allowed = (node: ButterflyNode) => {
    if (tier === 'low') return node.name === 'canopy';
    if (isMobile) return node.name !== 'meadow';
    if (tier === 'medium') return node.name !== 'meadow';
    return true;
  };
  const regionActive = (region: Region) =>
    document.body.dataset[region === 'hero' ? 'sceneActive' : 'musicActive'] === 'true';

  function animate(now: number) {
    frame = 0;
    if (destroyed || reducedMotion || document.hidden) return;
    const delta = previous ? Math.min(.05, Math.max(0, (now - previous) / 1000)) : 0;
    previous = now;
    clock += delta;
    const every = tier === 'low' ? 33 : tier === 'medium' ? 21 : 0;
    if (!lastPaint || now - lastPaint >= every) {
      lastPaint = now;
      for (const node of nodes) {
        if (!allowed(node) || !regionActive(node.region)) continue;
        const pose = butterflyPose(node.name, clock);
        const section = sizes[node.region];
        const x = pose.x * section.width;
        const y = pose.y * section.height + pose.bob;
        node.wrapper.style.transform =
          'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) rotateZ('
          + pose.bank.toFixed(2) + 'deg) scale(' + pose.scale.toFixed(3) + ')';
        node.wrapper.style.opacity = pose.opacity.toFixed(3);
        node.shape.style.transform = 'rotateX(' + pose.pitch.toFixed(2)
          + 'deg) rotateY(' + pose.yaw.toFixed(2) + 'deg)';
        // Synchronous paired stroke around the shared thorax.
        const flex = ((pose.wing - 8) * .115).toFixed(2);
        node.left.style.transform = 'rotateY(' + pose.wing.toFixed(2)
          + 'deg) rotateX(' + flex + 'deg)';
        node.right.style.transform = 'rotateY(' + (-pose.wing).toFixed(2)
          + 'deg) rotateX(' + flex + 'deg)';
      }
    }
    if (nodes.some(node => allowed(node) && regionActive(node.region))) {
      frame = requestAnimationFrame(animate);
    } else previous = 0;
  }

  function sync() {
    if (destroyed) return;
    for (const node of nodes) {
      node.wrapper.hidden = reducedMotion || !allowed(node);
    }
    const needed = !reducedMotion && !document.hidden
      && nodes.some(node => allowed(node) && regionActive(node.region));
    if (needed) {
      if (!frame) frame = requestAnimationFrame(animate);
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; previous = 0;
    }
  }

  measure();
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    measure();
    sync();
  });
  for (const region of ['hero', 'music'] as const) if (sections[region]) resizeObserver?.observe(sections[region]!);
  const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(sync);
  observer?.observe(document.body, { attributes: true, attributeFilter: ['data-scene-active', 'data-music-active'] });
  window.addEventListener('resize', () => { measure(); sync(); }, { passive: true, signal: events.signal });
  document.addEventListener('visibilitychange', sync, { signal: events.signal });
  sync();

  return {
    setQuality(next: ButterflyTier) {
      if (tier === next) return;
      tier = next;
      sync();
    },
    setReducedMotion(next: boolean) {
      if (reducedMotion === next) return;
      reducedMotion = next;
      sync();
    },
    destroy() {
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      observer?.disconnect();
      resizeObserver?.disconnect();
      events.abort();
    },
  };
}
