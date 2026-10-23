/** A static cool-shadow finish, independent of the approved scenic saturation. */
export const COOL_FINISH_ID = 'garden-cool-finish';
export const COOL_FINISH_VALUES =
  '1.06 0 0 0 -0.06 0 1.04 0 0 -0.04 0 0 0.98 0 0.02 0 0 0 1 0';

/** Install once. No timers, event listeners, canvas copies or animation work. */
export function createSceneFinish(): { destroy(): void } {
  const world = document.querySelector<HTMLElement>('#scene-world');
  const definitions = document.querySelector('svg.svg-definitions defs');
  if (!world || !definitions || document.getElementById(COOL_FINISH_ID)) {
    return { destroy() {} };
  }
  const ns = 'http://www.w3.org/2000/svg';
  const filter = document.createElementNS(ns, 'filter');
  filter.id = COOL_FINISH_ID;
  filter.setAttribute('x', '0%');
  filter.setAttribute('y', '0%');
  filter.setAttribute('width', '100%');
  filter.setAttribute('height', '100%');
  // The matrix is calibrated in display RGB, not SVG's default linearRGB.
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  const matrix = document.createElementNS(ns, 'feColorMatrix');
  matrix.setAttribute('type', 'matrix');
  matrix.setAttribute('values', COOL_FINISH_VALUES);
  filter.append(matrix);
  definitions.append(filter);
  // Inline definition resolves this fragment against the page, not a CSS URL.
  world.style.setProperty('--garden-cool-finish', `url("#${COOL_FINISH_ID}")`);
  world.dataset.colorFinish = 'cool';
  return {
    destroy() {
      delete world.dataset.colorFinish;
      world.style.removeProperty('--garden-cool-finish');
      filter.remove();
    },
  };
}
