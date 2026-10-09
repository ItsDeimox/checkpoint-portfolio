# Modal lighting polish R4

Baseline: approved R3, commit 67f7e42bbe9d3428c7557bc26502925bce28fee4. The 840px dialog layout, responsive scroll container, media, text, destinations, hero, cube and process remain unchanged.

## Changes

The sparse background graph keeps the same 18 CSS-pixel pitch, seed, topology and solver parameters. Only its emitted/reflected light is raised modestly: lattice gain .024 to .034, pool .0035 to .005, radial pool .0025 to .0035. Dark idle material is unchanged.

The old border combined a CSS stroke, an inset shader peak and a second inner peak. R4 uses one signed-distance silhouette. Both the narrow core and broad spread decay monotonically inward from it. CSS keeps its border width for identical geometry but makes the decorative stroke transparent only when WebGL succeeds. Keyboard focus outlines remain visible.

Button illumination follows the existing hero button shader's 3800-pixel-squared radial field, 1.8 edge decay, .12 spread decay and fragmented interior reflection. The hover illuminates only the nearby edge rather than whitening the complete perimeter. White primary buttons remain white; outlined buttons remain dark.

A per-control response smooths intensity with a .115s entry time constant and .175s exit time constant. Local cursor position is damped over .06s. Leaving retains that control's last light anchor. Reduced motion uses static states. The CSS override previously removed transform from the transition list while inheriting a 2px hover translation; R4 explicitly transitions a 1px lift over .28s, in both directions.

## Fresh verification

- Full local Node suite: 95 passed, zero failures. Includes 8 new response regressions.
- Original modal browser suite: 50 passed on Chromium 144 / ANGLE SwiftShader WebGL2, including desktop, three small viewports, FAQ, contact, native links, focus, close, idle sleep and denied-WebGL fallback.
- Added GPU/DOM probes: 7 passed. The approved baseline failed 5 of these, reproducing the missing transform transition, inset rim and uniformly lit button border. Actual shader pixels now peak at the outer edge and fall off away from the cursor.
- Static and portable builds completed. All 3 modified production files have Git blob hashes matching the tested local bytes.

Tests ran with software WebGL and emulated viewports, not physical-device GPU benchmarks. External fonts were blocked locally; the production font declarations are unchanged. One original browser assertion was synchronized to the native asynchronous close event instead of assuming it had fired as soon as the open attribute disappeared.

The build still gates publication on modal and process CPU regressions. Browser harnesses, logs and real captures are included in the delivery package. No new graphics dependencies or contexts were introduced.
