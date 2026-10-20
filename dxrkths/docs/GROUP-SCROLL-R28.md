# R28: independent vertical page scroll and horizontal Groups & Games navigation

## Report and confirmed cause
The October 20 feedback reported that scrolling the Groups & Games carousel conflicted with vertical page scrolling. The actual code delegated every plain vertical wheel over `[data-group-track]` to the two-slide carousel, explicitly calling `preventDefault()`. A 450 ms wheel cooldown also consumed subsequent vertical wheel events before allowing the page to move. This was an input-intent conflict, not a rendering-performance problem.

## Correction
- **Normal mouse wheel or vertical trackpad movement** always remains available to the document, including while the slider is between groups or in cooldown. The handler exits before `preventDefault()`.
- **Horizontal trackpad gestures and touch swipes** are left to native `overflow-x:auto` + `scroll-snap-type:x mandatory`; no custom touch gesture suppression or global wheel controller.
- **Explicit Shift + vertical wheel** advances one slide (bounded at the end), with the existing snap motion and reduced-motion fallback. A native horizontally remapped Shift event stays browser-owned.
- **Mouse drag** now offers a desktop control without the Shift key: only the primary mouse button, only noninteractive portions of the track, and only after horizontal displacement dominates vertical displacement. Real links, vertical drags, touch, buttons and keyboard controls keep their normal behavior. On release the track snaps to the nearest slide.
- The affordance and accessible label now explain Drag / Swipe / Shift + Scroll. Group logos, backgrounds, colors, slides, images, captions and native tabs remain visually unchanged. No new render loop, WebGL context, texture or polling timer.

## Validation
Added `tests/group-scroll-intent.test.mjs` for vertical wheel and cooldown, Shift direction/edge behavior, trackpad/ctrl shortcuts, real mouse-drag threshold, capture cleanup, links, touch and reduced motion. Updated `tests/destination-browser.cjs` and `tests/stability-browser.cjs` to verify real vertical scroll, intentional horizontal switch and existing tab navigation.

Hardware-specific trackpad/touch feel should be verified in a browser; build and unit-test results alone cannot claim an end-to-end measured scroll-latency improvement.
