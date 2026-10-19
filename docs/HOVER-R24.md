# R24: hover orientation and responsiveness regression

Base: `5d52fbc13c359a46d7365c7978ee73908765d0eb`.

The R23 single-frame GPU gate was a regression, not a general performance fix.
It tested a completion fence before updating input or the camera. When the
previous submission was not yet signalled it threw away the entire frame.
R24 removes that single-frame barrier from input and camera updates. Simply
removing backpressure altogether was also tested and rejected: the native
software-GPU test built a long queue and timed out on High-to-Low. That
failed candidate was not released.

The corrected scheduler updates input and the camera before checking draw
capacity. At most two draws may be outstanding, preserving CPU/GPU overlap
without the R23 single-frame serialization. Only redundant GPU submissions
are deferred; the latest logical pose keeps advancing. Capacity checks use
zero timeout only when both slots are occupied, without a per-frame flush.
A fresh asynchronous barrier still drains that bounded queue after sleep and
before a quality transaction reallocates attachments. Startup, cancellation,
allocation rollback and context recovery remain protected. Render history
uses elapsed time since the last submitted draw, not the last input update.

The card shader previously sampled the wave with `p`, the artwork coordinate
whose Y is inverted. Raycasting injects in mesh UVs, so this mirrored the
visible effect vertically. Sampling now uses `vUv`, with the same rectangular
aspect map as injection. No artwork UV, portal projection or geometry changed.

The Play Now material has a separate linear emission gain of 0.20. The
original cube wave solver and network pattern are unchanged. Pointer events
coalesce to the most recent position before one solver injection at the next
animation frame; a stationary pointer does not continuously pump energy.
Hidden card wave simulations stop during portal travel. The portal shader
also skips the ray calculation where aperture alpha is exactly zero.

A second timing bug capped every portal update to 100ms. At low rendering
rates that stretched a 3.1-second trip into many seconds. Both directions now
sample the identical approved curves from elapsed time, bounded to one full
journey. Slow display intervals no longer slow the simulation clock. Normal
60Hz/120Hz trajectories, matching entry/return curves and cancellation remain
covered by the existing regressions.

## Verification

`npm run build` includes eleven new targeted tests, in addition to the prior
334. The orientation, hidden simulation, CTA gain, high-rate pointer, timing
and zero-aperture tests reproduced the defective paths before correction.
The initial unrestricted-frame attempt failed the native quality test;
additional failing tests then verified the two-slot queue, live input while
saturated, fence cleanup, graceful draw failure, and the first coalesced CTA event waking an idle
renderer. The latter regression was caught by actual native hover before
release. Passing unit tests alone was not used as release authorization.

`tests/hover-gpu-browser.cjs` renders the actual patched card shader and wave
texture, checking upper/lower pointer locations on all five panels by reading
the pixels. It also compares the CTA with identical wave data at the old and
new gain. GPU readback is test-only and is not shipped in the animation loop.
The existing native-input, quality/recovery and mobile suites remain required.

Testing uses Chromium/ANGLE SwiftShader, not an RTX 2060. Software-renderer
frame rates and event delays must not be presented as a hardware benchmark or
a guarantee that no device-specific stutter remains. Removing late shader
compilation alone never established that guarantee. R23's one-frame gate
and the rejected unrestricted-submission attempt are superseded by this
two-slot, input-independent scheduling policy.

Only hover, scheduling, preparation-barrier placement and the portal clock
changed. Car centering, neutral spotlight, ceiling/floor identity, destination
layout, content, navigation and the approved tunnel geometry are preserved.
