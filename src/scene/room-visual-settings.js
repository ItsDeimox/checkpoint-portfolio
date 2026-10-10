/** Values shared by the small visual controls and the GPU uniform boundary. */
export const VISUAL_PRESET_VERSION = 'wet-showcase-v1';

// Approved screenshot values; layered bloom supplies the wider glow.
export const DEFAULT_VISUAL_SETTINGS = Object.freeze({
  exposure: 1.13,
  bloom: .65,
  depthOfField: 1.5,
  motionBlur: 1,
  lens: 1,
  contrast: 1.26,
  sharpness: .35,
});

export const VISUAL_CONTROLS = Object.freeze([
  { key: 'exposure', label: 'Exposure', min: .75, max: 1.35, step: .01 },
  { key: 'bloom', label: 'Bloom', min: 0, max: .65, step: .01 },
  { key: 'depthOfField', label: 'Depth of field', min: 0, max: 1.5, step: .05 },
  { key: 'motionBlur', label: 'Motion blur', min: 0, max: 1, step: .05 },
  { key: 'lens', label: 'Lens response', min: 0, max: 1, step: .05 },
  { key: 'contrast', label: 'Contrast', min: .9, max: 2, step: .01 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: .35, step: .01 },
].map(Object.freeze));

/**
 * Accept only the published finite numeric controls. Invalid persisted values
 * recover to the supplied valid value, then to the default. No input is mutated.
 */
export function normalizeVisualSettings(input = {}, fallback = DEFAULT_VISUAL_SETTINGS) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const previous = fallback && typeof fallback === 'object' ? fallback : {};
  return Object.fromEntries(VISUAL_CONTROLS.map(({ key, min, max }) => {
    const inherited = Number.isFinite(previous[key]) ? previous[key] : DEFAULT_VISUAL_SETTINGS[key];
    const value = Number.isFinite(source[key]) ? source[key] : inherited;
    return [key, Math.min(max, Math.max(min, value))];
  }));
}

/** Preserve personal edits; replace only the previous experimental defaults. */
export function restoreVisualSettings(stored) {
  const restored = normalizeVisualSettings(stored?.visual);
  if (stored?.visualPreset !== VISUAL_PRESET_VERSION) {
    if (stored?.visual?.contrast === 1.74 || stored?.visual?.contrast === 1.16) restored.contrast = DEFAULT_VISUAL_SETTINGS.contrast;
    if (stored?.visual?.exposure === 1.15) restored.exposure = DEFAULT_VISUAL_SETTINGS.exposure;
  }
  return restored;
}
