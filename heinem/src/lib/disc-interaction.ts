type Pose = { x: number; y: number; scale: number; yaw: number; roll: number; z: number };
type Phase = 'idle' | 'inserting' | 'swapping' | 'ejecting';
type Exchange = { from: number; to: number; direction: number; committed: boolean };
type Drag = {
  id: number; startX: number; startY: number; lastX: number; lastTime: number;
  velocity: number; locked: boolean; origin: number; anchor: number; cancelGoal: number; distance: number;
};
type Hover = {
  button: HTMLElement; surface: HTMLElement; bounds?: DOMRect;
  x: number; y: number; targetX: number; targetY: number; strength: number; targetStrength: number;
};

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const smooth = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const interpolate = (a: Pose, b: Pose, amount: number): Pose => ({
  x: mix(a.x, b.x, amount), y: mix(a.y, b.y, amount), scale: mix(a.scale, b.scale, amount),
  yaw: mix(a.yaw, b.yaw, amount), roll: mix(a.roll, b.roll, amount), z: mix(a.z, b.z, amount),
});
const transform = (pose: Pose) =>
  `translate3d(${pose.x.toFixed(3)}px,${pose.y.toFixed(3)}px,${pose.z.toFixed(3)}px) scale(${pose.scale.toFixed(5)}) rotateY(${pose.yaw.toFixed(3)}deg) rotateZ(${pose.roll.toFixed(3)}deg)`;

/** A single reversible timeline owns cases and CD; audio changes only on commit. */
export function initDiscInteraction(
  room: HTMLElement,
  rows: HTMLButtonElement[],
  disc: HTMLButtonElement,
  motion: MediaQueryList,
  onCommit: (index: number) => void,
): { readonly requested: number; select(index: number): void; finish(): void; destroy(): void } {
  const stage = room.querySelector<HTMLElement>('.jewel-stage');
  const count = rows.length;
  const normalize = (index: number) => ((index % count) + count) % count;
  let active = 0;
  let requested = 0;
  if (!stage || count < 2) return {
    get requested() { return requested; },
    select(index) { requested = normalize(index); active = requested; onCommit(active); },
    finish() {}, destroy() {},
  };

  const events = new AbortController();
  const options = { signal: events.signal };
  const hovers: Hover[] = [...rows, disc].flatMap(button => {
    const surface = button.querySelector<HTMLElement>(button === disc ? '.disc-tilt' : '.jewel-shell');
    return surface ? [{ button, surface, x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, targetStrength: 0 }] : [];
  });
  let width = 1;
  let height = 1;
  let mobile = false;
  let progress = 0;
  let exchange: Exchange | undefined;
  let animation: { from: number; goal: number; started: number; duration: number } | undefined;
  let scrub: { anchor: number; position: number } | undefined;
  let glide: { from: number; goal: number; started: number; duration: number } | undefined;
  let drag: Drag | undefined;
  let frame = 0;
  let lastTime = 0;
  let dirty = true;
  let destroyed = false;
  let suppressClick = false;
  let phase: Phase = 'idle';

  function setPhase(value: Phase) {
    if (phase === value && room.dataset.discPhase === value) return;
    phase = value;
    room.dataset.discPhase = value;
  }

  function pose(slot: 'active' | 'previous' | 'next'): Pose {
    const coordinates = mobile
      ? { active: [20, 0, 1, -2, -.4], previous: [0, 18, .76, 30, -7], next: [71, 17, .76, -30, 7] }
      : { active: [22.3, 0, 1, -2, -.4], previous: [.4, 24, .8, -22, -3], next: [72.4, 17, .82, 8, 4] };
    const [x, y, scale, yaw, roll] = coordinates[slot];
    return { x: x / 100 * width, y: y / 100 * height, scale, yaw, roll, z: 0 };
  }

  function concealedPose(side: 'previous' | 'next'): Pose {
    const result = pose(side);
    result.x += width * (side === 'next' ? .16 : -.16);
    result.y += height * .07;
    result.z = -width * .19;
    result.scale *= .82;
    return result;
  }

  function hiddenSide(index: number, selected: number): 'previous' | 'next' {
    const forward = normalize(index - selected);
    return forward <= count / 2 ? 'next' : 'previous';
  }

  function settledPose(index: number, selected: number): Pose {
    if (index === selected) return pose('active');
    if (index === normalize(selected - 1)) return pose('previous');
    if (count <= 3 || index === normalize(selected + 1)) return pose('next');
    return concealedPose(hiddenSide(index, selected));
  }

  function visibility(index: number): number {
    if (count <= 3) return 1;
    if (!exchange) {
      return index === active || index === normalize(active - 1) || index === normalize(active + 1) ? 1 : 0;
    }
    const { from, to, direction } = exchange;
    if (index === from || index === to) return 1;
    if (index === normalize(from - direction)) return 1 - smooth(0, .9, progress);
    if (index === normalize(to + direction)) return smooth(.1, 1, progress);
    return 0;
  }

  function movingPose(index: number): Pose {
    if (!exchange) return settledPose(index, active);
    const { from, to, direction } = exchange;
    const incoming = direction > 0 ? 'next' : 'previous';
    const outgoing = direction > 0 ? 'previous' : 'next';
    if (index === from) return interpolate(pose('active'), pose(outgoing), progress);
    if (index === to) return interpolate(pose(incoming), pose('active'), progress);
    if (count > 3) {
      if (index === normalize(from - direction))
        return interpolate(pose(outgoing), concealedPose(outgoing), progress);
      if (index === normalize(to + direction))
        return interpolate(concealedPose(incoming), pose(incoming), progress);
      return settledPose(index, progress < .5 ? from : to);
    }
    // The third sleeve returns behind the two participating covers. No visible
    // teleport between the left and right slots, or extra duplicate card.
    const result = interpolate(pose(outgoing), pose(incoming), progress);
    const arc = Math.sin(progress * Math.PI);
    result.z = -width * .15 * arc;
    result.scale *= 1 - .24 * arc;
    result.y -= height * .11 * arc;
    return result;
  }

  function render() {
    dirty = false;
    for (const row of rows) {
      const index = Number(row.dataset.track);
      row.style.transform = transform(movingPose(index));
      const opacity = visibility(index);
      row.style.opacity = opacity.toFixed(3);
      row.style.pointerEvents = opacity < .95 || exchange ? 'none' : 'auto';
      row.tabIndex = opacity >= .95 && !exchange ? 0 : -1;
      row.setAttribute('aria-hidden', opacity <= .01 ? 'true' : 'false');
      row.style.zIndex = String(exchange
        ? index === (progress < .5 ? exchange.from : exchange.to) ? 6
          : index === exchange.from || index === exchange.to ? 3 : 1
        : index === active ? 6 : index === normalize(active - 1) ? 2 : 1);
    }
    const holder = exchange ? (progress < .5 ? exchange.from : exchange.to) : active;
    const holderPose = movingPose(holder);
    const insertion = exchange ? progress < .5 ? smooth(0, .42, progress) : 1 - smooth(.58, 1, progress) : 0;
    const offsetX = width * (mobile ? .27 : .214) * (1 - insertion);
    const offsetY = height * (mobile ? .022 : .037);
    disc.style.transform = `${transform(holderPose)} translate3d(${offsetX.toFixed(3)}px,${offsetY.toFixed(3)}px,-1px)`;
    disc.style.visibility = exchange && progress >= .42 && progress <= .58 ? 'hidden' : 'visible';
    if (!exchange) setPhase('idle');
    else setPhase(progress < .42 ? 'inserting' : progress <= .58 ? 'swapping' : 'ejecting');
  }

  function resetHovers(immediate = false) {
    for (const hover of hovers) {
      hover.bounds = undefined;
      hover.targetX = hover.targetY = hover.targetStrength = 0;
      if (immediate) {
        hover.x = hover.y = hover.strength = 0;
        hover.surface.style.removeProperty('transform');
        hover.surface.style.removeProperty('--shine-opacity');
      }
    }
    if (!immediate) requestFrame();
  }

  function commit(index: number) {
    if (active === index) return;
    active = index;
    onCommit(index);
  }

  function stepToward(from: number, target: number) {
    const forward = normalize(target - from);
    const backward = normalize(from - target);
    return normalize(from + (forward <= backward ? 1 : -1));
  }

  function begin(from: number, to: number) {
    exchange = { from, to, direction: to === normalize(from + 1) ? 1 : -1, committed: false };
    progress = 0;
    dirty = true;
    if (!motion.matches) setPhase('inserting');
    resetHovers();
  }

  function settle(goal: number) {
    if (!exchange) return;
    const index = goal === 1 ? exchange.to : exchange.from;
    commit(index);
    exchange = undefined;
    animation = undefined;
    progress = 0;
    dirty = true;
    render();
    if (requested !== active) {
      begin(active, stepToward(active, requested));
      animate(1);
    }
  }

  function animate(goal: number) {
    if (!exchange) return;
    if (motion.matches) { settle(goal); return; }
    animation = {
      from: progress, goal, started: performance.now(),
      duration: Math.max(150, (goal === 0 ? 320 : 520) * Math.abs(goal - progress)),
    };
    requestFrame();
  }

  // Preserve the exact same three sleeve poses at every integer boundary.
  // A gesture can orbit the whole carousel repeatedly without accumulating
  // transitions, changing tracks, or resetting the pointer origin.
  function setScrubPosition(position: number) {
    if (!scrub) return;
    const direction = position < 0 ? -1 : position > 0 ? 1 : exchange?.direction ?? 1;
    const turns = Math.abs(position);
    const completed = Math.floor(turns);
    const from = normalize(scrub.anchor + direction * completed);
    const to = normalize(from + direction);
    if (!exchange || exchange.from !== from || exchange.to !== to || exchange.direction !== direction) {
      exchange = { from, to, direction, committed: false };
      resetHovers();
    }
    scrub.position = position;
    progress = turns - completed;
    dirty = true;
    // Never trigger a new provider load while scrubbing, even after many laps.
    // Only a confirmed release makes the new selection audible.
    if (drag?.locked) {
      const previewSteps = completed + (progress >= .5 ? 1 : 0);
      requested = normalize(scrub.anchor + direction * previewSteps);
    }
    if (!motion.matches) requestFrame();
  }

  function completeScrub(steps: number) {
    if (!scrub) return;
    const index = normalize(scrub.anchor + steps);
    glide = undefined;
    scrub = undefined;
    exchange = undefined;
    animation = undefined;
    progress = 0;
    requested = index;
    commit(index);
    dirty = true;
    render();
  }

  function glideTo(steps: number) {
    if (!scrub) return;
    if (motion.matches || Math.abs(steps - scrub.position) < .0001) {
      completeScrub(steps);
      return;
    }
    const travel = Math.abs(steps - scrub.position);
    glide = {
      from: scrub.position, goal: steps, started: performance.now(),
      duration: Math.min(680, Math.max(145, 330 * travel)),
    };
    requestFrame();
  }

  function tick(now: number) {
    frame = 0;
    if (destroyed) return;
    const dt = lastTime ? Math.min(50, now - lastTime) : 16;
    lastTime = now;
    if (glide && scrub) {
      const current = glide;
      const t = clamp((now - current.started) / current.duration);
      const eased = 1 - (1 - t) ** 3;
      setScrubPosition(mix(current.from, current.goal, eased));
      if (t === 1) completeScrub(current.goal);
    }
    if (animation && exchange) {
      const current = animation;
      const t = clamp((now - current.started) / current.duration);
      const eased = 1 - (1 - t) * (1 - t);
      const previousProgress = progress;
      progress = mix(current.from, current.goal, eased);
      dirty = true;
      let heldMidpoint = false;
      if (current.goal === 1 && progress >= .5 && !exchange.committed) {
        // Even a slow frame must present the hidden transfer once. A drag
        // already beyond the midpoint can commit in place without snapping.
        if (previousProgress < .5) { progress = .5; heldMidpoint = true; }
        exchange.committed = true;
        commit(exchange.to);
      }
      if (t === 1 && !heldMidpoint) settle(current.goal);
    }
    if (dirty && !motion.matches) render();
    let hoverMoving = false;
    const amount = 1 - Math.exp(-dt / 65);
    for (const hover of hovers) {
      if (motion.matches) continue;
      const gap = Math.abs(hover.targetX - hover.x) + Math.abs(hover.targetY - hover.y) + Math.abs(hover.targetStrength - hover.strength);
      if (gap < .003) continue;
      hover.x = mix(hover.x, hover.targetX, amount);
      hover.y = mix(hover.y, hover.targetY, amount);
      hover.strength = mix(hover.strength, hover.targetStrength, amount);
      if (gap < .012) {
        hover.x = hover.targetX; hover.y = hover.targetY; hover.strength = hover.targetStrength;
      } else hoverMoving = true;
      hover.surface.style.transform = `perspective(900px) translate3d(${(hover.x * 3).toFixed(2)}px,${(hover.y * 3).toFixed(2)}px,0) rotateX(${(-hover.y * 6).toFixed(2)}deg) rotateY(${(hover.x * 8).toFixed(2)}deg) scale(${(1 + hover.strength * .012).toFixed(4)})`;
      hover.surface.style.setProperty('--shine-x', `${(50 + hover.x * 38).toFixed(1)}%`);
      hover.surface.style.setProperty('--shine-y', `${(50 + hover.y * 38).toFixed(1)}%`);
      hover.surface.style.setProperty('--shine-opacity', (hover.strength * .22).toFixed(3));
    }
    if (animation || glide || hoverMoving || dirty && !motion.matches) requestFrame();
    else lastTime = 0;
  }

  function requestFrame() {
    if (!frame && !destroyed) frame = requestAnimationFrame(tick);
  }

  function releaseCapture() {
    const id = drag?.id;
    drag = undefined;
    stage!.dataset.dragging = 'false';
    if (id !== undefined && stage!.hasPointerCapture?.(id)) stage!.releasePointerCapture(id);
  }

  function finish() {
    animation = undefined;
    glide = undefined;
    scrub = undefined;
    exchange = undefined;
    progress = 0;
    releaseCapture();
    commit(requested);
    dirty = true;
    render();
    resetHovers(true);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function select(index: number) {
    if (destroyed) return;
    // A keyboard/button choice supersedes a pending kinetic release.
    if (scrub) finish();
    const next = normalize(index);
    if (next === requested) return;
    requested = next;
    if (drag?.locked) releaseCapture();
    if (motion.matches) { finish(); return; }
    if (!exchange) {
      begin(active, stepToward(active, next));
      animate(1);
    } else if (progress === 0 && !exchange.committed) {
      if (next === exchange.from) finish();
      else { begin(exchange.from, stepToward(exchange.from, next)); animate(1); }
    } else if (next === exchange.from && !exchange.committed) animate(0);
    else if (next === exchange.to) animate(1);
    else if (!animation) animate(1);
    // A third request replaces the pending destination. The current physical
    // exchange settles first; there is only one pending value, never a queue.
  }

  function measure() {
    const bounds = stage!.getBoundingClientRect();
    width = Math.max(1, stage!.clientWidth || bounds.width);
    height = Math.max(1, stage!.clientHeight || bounds.height);
    mobile = window.matchMedia('(max-width: 700px)').matches;
    dirty = true;
    render();
  }

  for (const hover of hovers) {
    hover.button.addEventListener('pointerenter', (event) => {
      if (motion.matches || exchange || drag?.locked || event.pointerType === 'touch') return;
      hover.bounds = hover.button.getBoundingClientRect();
      hover.targetStrength = 1;
      requestFrame();
    }, options);
    hover.button.addEventListener('pointermove', (event) => {
      if (motion.matches || exchange || drag?.locked || event.pointerType === 'touch') return;
      hover.bounds ??= hover.button.getBoundingClientRect();
      hover.targetX = clamp((event.clientX - hover.bounds.left) / hover.bounds.width * 2 - 1, -1, 1);
      hover.targetY = clamp((event.clientY - hover.bounds.top) / hover.bounds.height * 2 - 1, -1, 1);
      hover.targetStrength = 1;
      requestFrame();
    }, options);
    hover.button.addEventListener('pointerleave', () => {
      hover.bounds = undefined;
      hover.targetX = hover.targetY = hover.targetStrength = 0;
      requestFrame();
    }, options);
  }

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary || drag) return;
    suppressClick = false;
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastTime: performance.now(), velocity: 0, locked: false,
      origin: 0, anchor: active, cancelGoal: 0, distance: clamp(width * .3, 92, 400) };
  }, options);
  stage.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.locked) {
      if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx) * 1.1) { releaseCapture(); return; }
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      drag.locked = true;
      // Take over any in-flight arrow animation at its current visual pose.
      // Cancelling later returns to the selection that was audible at pickup.
      drag.anchor = exchange?.from ?? active;
      drag.origin = exchange ? exchange.direction * progress : 0;
      drag.cancelGoal = exchange && active === exchange.to ? exchange.direction : 0;
      animation = undefined;
      glide = undefined;
      scrub = { anchor: drag.anchor, position: drag.origin };
      if (exchange) exchange.committed = false;
      stage.setPointerCapture(event.pointerId);
      stage.dataset.dragging = 'true';
      resetHovers();
    }
    event.preventDefault();
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    drag.velocity = (event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    // Signed, UNBOUNDED travel: -2.4 means 2.4 sleeves to the previous side.
    // Reversing across zero or across a lap reuses the same continuous poses.
    setScrubPosition(drag.origin - dx / drag.distance);
  }, options);

  function endDrag(event: PointerEvent, cancelled: boolean) {
    if (!drag || drag.id !== event.pointerId) return;
    const current = drag;
    if (!current.locked || !scrub) { releaseCapture(); return; }
    suppressClick = true;
    const traveled = Math.abs(scrub.position);
    const complete = Math.floor(traveled);
    const fraction = traveled - complete;
    const direction = scrub.position < 0 ? -1 : 1;
    const recentVelocity = performance.now() - current.lastTime < 100 ? current.velocity : 0;
    const towardNext = -recentVelocity * direction;
    // Once a full sleeve has passed, require more travel before a kinetic
    // flick may add ANOTHER album. Crossing a boundary by a few pixels must
    // never skip the next cover on an immediate pointerup.
    const flickThreshold = complete === 0 ? .06 : .18;
    const next = fraction >= .3 || (fraction > flickThreshold && towardNext > .4);
    const goal = cancelled ? current.cancelGoal : direction * (complete + (next ? 1 : 0));
    requested = normalize(current.anchor + goal);
    releaseCapture();
    // A release only eases the fractional remainder; it never caps travel to
    // one album. Cancellation rewinds smoothly, with no intermediate audio loads.
    if (motion.matches) finish();
    else glideTo(goal);
  }
  stage.addEventListener('pointerup', event => endDrag(event, false), options);
  stage.addEventListener('pointercancel', event => endDrag(event, true), options);
  stage.addEventListener('lostpointercapture', event => {
    // Touch starts with implicit capture on the inner cover span. Its loss
    // bubbles while ownership moves to the stage; that is not cancellation.
    if (event.target === stage) endDrag(event, true);
  }, options);
  stage.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { ...options, capture: true });
  stage.addEventListener('dragstart', event => event.preventDefault(), options);
  stage.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    select(requested + (event.key === 'ArrowRight' ? 1 : -1));
  }, options);
  motion.addEventListener('change', () => { if (motion.matches) finish(); }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); }, options);
  window.addEventListener('resize', measure, options);
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
  observer?.observe(stage);
  stage.dataset.carousel = 'ready';
  stage.dataset.dragging = 'false';
  measure();

  return {
    get requested() { return requested; }, select, finish,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      glide = undefined;
      scrub = undefined;
      animation = undefined;
      events.abort();
      observer?.disconnect();
      releaseCapture();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resetHovers(true);
      for (const row of rows) { row.style.removeProperty('transform'); row.style.removeProperty('z-index'); }
      disc.style.removeProperty('transform'); disc.style.removeProperty('visibility');
      delete stage.dataset.carousel;
      delete stage.dataset.dragging;
      setPhase('idle');
    },
  };
}
