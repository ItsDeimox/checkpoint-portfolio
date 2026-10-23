# HEINEM 1.3 — scroll, field detail and CD interaction

Revision: **22 October 2026, America/Sao_Paulo** (23 October UTC).

## Approved scope

The user approved the 1.2 bubble and requested a brighter portrait, more reliable sky parallax, higher foreground resolution, continuous disc exchanges under horizontal dragging, and a pointer-following 3D hover treatment. The possible additional background foliage layer was deferred.

The approved shader, text/glow material, scene depth factors, one continuous meadow, music selection and minimal layout remain. This revision refines the existing composition. [Version 1.2](LAYERED-REVISION.md) and its [validation](VALIDATION-1.2.md) remain decision history.

## Brighter portrait and explicit provenance

The selected source is the previously generated candidate `exec-bbc57ac2-ed6d-4111-9d4b-1d0d7080e545.png`. The user preferred its clearer, less yellow appearance. It is cropped at `left=47, top=10, width=802, height=1774`, then exported as `public/assets/layers/artist-light.webp`: **802 × 1774, 291,154 bytes**, WebP quality 94 and alpha 100.

This variant contains **reconstructed RGB**, including facial pixels. It must not inherit the 1.2 claim that only original photographic RGB is displayed. The previous original-RGB-plus-matte cutout is retained at [artist-photo-v1.2.webp](reference/artist-photo-v1.2.webp). Both sources have distinct provenance; selecting the brighter generated result does not retroactively change how 1.2 was built.

The portrait remains an independent alpha layer with the same scenic role. The brighter choice does not require changing the approved bubble or adding another environment plane.

## A denser field on the same physical terrain

The original `field-continuous.webp` remains the complete terrain underlay. Four generated detail tiles each contain **1080 × 1457 native pixels**:

- `field-detail-tl.webp`
- `field-detail-tr.webp`
- `field-detail-bl.webp`
- `field-detail-br.webp`

Together they add **2,057,858 bytes** when requested. Overlapping their edges yields approximately **1964 × 2648 effective density** across the same field area. That is about **3.31 times the effective pixel count**, or 1.82 times the samples per axis, relative to the 1080 × 1456 base. It is not a claim of a single image with those output dimensions, nor an enlargement of the old pixels presented as new generated detail.

The `.field-detail-plane` lives inside the existing `.foreground`. All tiles therefore share the same native-scroll displacement. The original field supplies the exterior alpha mask, while the original complete image remains underneath. The tile-edge masks have fixed spatial gradients; they blend overlap regions without animating opacity as the page scrolls. There is still no replacement music backdrop or local grass patch beneath the CDs.

### Load only the detail that can be used

`createFieldDetail()` controls real image requests. Tile URLs remain in `data-field-detail` until all eligibility conditions hold:

| Condition | Detail behavior |
| --- | --- |
| Viewport at least 1000 px, Medium/High, no data-saving hint | Assign URLs and decode all four tiles |
| Narrow/mobile viewport | Retain the complete base field; no initial detail requests |
| Low quality | Retain the base; hide already loaded detail |
| `navigator.connection.saveData === true` | Retain the base |
| Hidden document before load | Defer the load until visibility changes |
| Any tile fails or decodes empty | Keep the full base visible |
| Every tile decodes successfully | Reveal the assembled detail plane together |

The controller observes viewport, connection, visibility and explicit quality changes. Switching to Low after a High load hides the detail, but cannot reverse bytes already downloaded. Disposal prevents late completion from revealing the plane. The complete fallback is available throughout loading; the user does not wait behind a scenic loader.

## The sky uses the document's current position

### Two separate timing faults

The wheel controller already smoothed the real document with a 125 ms response. Parallax then smoothed a second copy over 95 ms. After the page stopped, positive sky compensation continued increasing and made the backdrop appear to drift back against the document's movement.

In a 1178 × 659 Chromium/ANGLE/SwiftShader probe on High, after a jump to 280 px the document stayed fixed while the sky's compensation rose from 102.57 to 179.15 px over frames 2–13: **76.58 px of residual movement**. The correct compensation at depth `.64` is 179.2 px. The browser regression failed before the secondary filter was removed.

The first fix exposed a second timing fault. `scrollTo` runs inside the wheel RAF, but native `scroll` dispatch can schedule parallax for a later frame. A real-wheel trace observed 172 px of document motion while sky translation was still zero. The regression observing each completed animation callback found **176 px maximum mismatch** before the controllers were synchronized.

### One source of position, synchronized before paint

Parallax now reads actual `window.scrollY` directly. Only wheel intent is interpolated. After `createSmoothScroll()` writes a position that truly changes the document, its optional callback invokes `parallax.syncScroll()` in the same frame. The method cancels the pending native-event RAF and applies the new transform before paint.

Rounded-identical scroll writes do not notify. `lastApplied` avoids duplicate transforms. The passive listener still handles native touch, keyboard, scrollbar and programmatic navigation. Bounds remain cached outside the stable animation path. Reduced motion removes interpolation and depth motion without changing the explicit graphics preference.

The existing factors are preserved: sky +.64, distant foliage +.42, tree +.34, middle foliage +.22, artist +.08, desktop bubble +.10, mobile bubble 0, field −.14. Their relative speeds now follow the same position without a separate delayed sky trajectory.

## Continuous CD gesture and bounded hover

`initDiscInteraction()` owns one progress value for the outer case poses and disc position. The previous discrete 180/220/180 ms timer sequence is historical. A full automatic exchange uses **520 ms**; partial gestures resume toward completion or return from their current progress. Clicks, arrows and drag release use the same visual path.

The incoming case moves as progress advances. The outgoing disc retracts during the early interval; it is hidden across the central transfer, then emerges with the next case. The holder changes while concealed. Automatic motion presents the midpoint even when a slow frame would otherwise skip over it. The third case travels behind the participating pair rather than visibly jumping between side slots.

### Input ownership

Mouse and touch begin as potential gestures. A horizontal threshold locks the carousel and captures the pointer on the stage. Clear vertical intent leaves document scrolling native. Once locked, pointer displacement changes progress directly. Release uses progress and recent velocity to choose completion or return; the generated mouse click is suppressed so a drag does not accidentally activate a cover or play.

Touch carries an additional browser behavior: the inner cover can have implicit capture before the stage claims it. Its `lostpointercapture` event bubbles. Treating every bubbled loss as cancellation incorrectly aborts a valid touch drag during the ownership transfer. The handler now cancels only when the stage itself loses capture. Real CDP touch input exercises this path; synthetic PointerEvents alone do not reproduce the browser's implicit capture lifecycle.

The requested destination remains separate from the selected release. New input replaces pending intent without building a queue. The timeline notifies the player at commit; a cancelled preview keeps the prior selection. Browsing before the first play remains silent and does not initialize third-party media. Actual provider PLAY still controls rotor rotation.

### Independent transforms

Outer button transforms own case placement. Inner `.jewel-shell` and `.disc-tilt` surfaces own the bounded pointer tilt and local shine. The rotor remains inside its own rotation frame. This separation keeps the geometric pivot and native play target usable while the presentation tilts toward the cursor.

Hover bounds are cached on interaction; settling frames change transforms and light parameters without repeatedly reading layout. Reduced motion settles selection immediately and disables animated tilt. Hidden tabs settle pending exchanges. Cleanup cancels RAF, releases pointer capture and restores inline styles.

## Verification boundaries

Focused scroll tests prove removal of residual drift and same-frame depth alignment. Field tests prove network gating, shared-plane movement and decode fallback. The seven focused CD browser checks passed, including real touch capture, gradual dragging, centered pivot/hit targets and native vertical touch ownership; the controller suite separately covers cancellation and state handling.

The [1.3 validation record](VALIDATION-1.3.md) separates those focused results from the final integrated build and public deployment. No software-GPU result is a physical-device FPS/battery benchmark, and simulated provider events do not establish continuous real SoundCloud audio.
