# R29: Smooth mouse-drag release without snap teleport

## Root cause
After R28 restored independent page scrolling, the custom mouse drag set `scrollLeft` directly with `scroll-snap-type:none` while held. On `pointerup` it **removed** the `is-dragging` class before requesting `scrollTo({behavior:'smooth'})`. The CSS `scroll-snap-type:x mandatory` therefore reactivated at the partially dragged offset and immediately snapped to a nearby item; browsers could perform this layout snap *before* the smooth scroll, producing the reported teleport.

## Change
- Keep native snap disabled during the entire release through a separate `is-settling` class.
- Animate `scrollLeft` **from the actual released position** to the chosen real slide offset using one bounded `requestAnimationFrame` easing task. Restore native snap only **after reaching the exact target**, with no residual offset to jump.
- Use recent drag velocity (clamped, age-limited, max 0.32 card stride prediction) only to choose an intuitive adjacent target; do not run a permanent physics loop.
- A second drag during settling cancels the old animation, rebases from the currently drawn scroll position and does not backtrack or teleport. Click or explicit wheel retargets an active settle rather than running two contradictory animations.
- Reduced-motion snaps immediately; hidden/removed destinations and disposal cancel temporary frames.
- **R28 scroll intent stays intact**: the normal vertical wheel moves the page; native horizontal trackpad/touch, Shift + wheel, navigation buttons and mouse drag still move the carousel.

## Regression
`tests/group-scroll-intent.test.mjs` checks start/mid/end of release, smooth settling forward and backward, interrupted momentum, reduced motion, links, native touch and vertical wheel. It also confirms that `is-settling` suppresses CSS scroll snap while the release animation runs. The regular DXRKTHS build is the release gate.

## Scope and limits
No changes to scene shaders, reflection, car, navigation camera, lighting, external links or artwork. The easing is deterministic in unit tests; real browser/GPU smoothness should be checked on the target device and refresh rate before claiming zero perceived stutter.
