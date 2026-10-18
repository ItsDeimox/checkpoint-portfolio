# Portal wall and smooth symmetric travel · R21

Baseline: 7ee85756dbf07a98cfe3213775c66d83503376f6.

The destination is now a larger physical wall beyond a finite tunnel. Perspective and tunnel-mouth occlusion expose only part of the page at first. As the camera closes the gap, more of that same page is revealed. The wall fills the native viewport at the final pose. There is no fitted small screen, artificial screen-space zoom, separate timer or blackout. The reverse journey uses the same projected wall and clipping in reverse, preserving the current page scroll and its visible pose.

Flight duration increased from 1.15 to 2.05 seconds. The existing continuous camera curve still matches velocity, acceleration and jerk at the doorway, with smooth settling at its endpoints. The final view, navbar, combined logo spin/home action, all page content and unrelated showroom graphics remain unchanged.

## Performance causes addressed

Portal preparation used to execute before the HDR render target existed, causing it to return without warming the actual path. Both the interior shader and portal-enabled banner are now compiled and exercised before interaction unlocks. GPU completion uses a nonblocking startup fence, not a blocking finish in gameplay. The corridor shader now shades the nearest physical rib/wall instead of summing 24 hidden layers per fragment. Hidden showroom panel, atmosphere and link-projection updates are skipped only while inside the tunnel. DOM viewport measurements are cached per navigation/resize; camera callbacks only update compositor transforms and clipping.

A state-restoring warm draw returns the camera, lighting and renderer to the approved overview before the entry screen opens. No new WebGL context, image substitute or dependency is introduced.

## Validation

304 CPU tests passed; 62 Chromium/WebGL2 checks passed. Each of the five destinations was exercised forward and backward at multiple camera checkpoints. Tests include matching reverse projection/occlusion, native viewport handoff, scroll preservation, navbar invariance, classic scrollbars, mobile widths, tall viewports and native frame-scheduler entry/return. Full measurement details and limitations are in validation.json.

The synchronized first-portal draw in the recorded CI probes changed from 627.1 ms to 14.2 ms. This is a software-GPU cold-path comparison, not a device-independent FPS guarantee. Native timings under resize stress are also retained, including long tasks, rather than hidden.

## Reproduce

Run npm ci, npm test and npm run build. With the server on port 3000 and Playwright available, run tests/portal-wall-browser.cjs. Getter-only instrumentation is injected by the test harness, not shipped. All full-page media remain native HTML and the existing renderer still owns the camera.
