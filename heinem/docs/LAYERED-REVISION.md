# Separated assets and GPU typography — v1.2

Revision date: **22 October 2026, America/Sao_Paulo** (23 October UTC).

## User feedback implemented

The user supplied the original artist photograph and requested actual runtime assets, followed by implementation in the same round. The feedback identified slow cursor interaction over the letters, a bubble needing elastic recoil at independent touch locations, an undeformed underline, flattened scenery crops, a disappearing foreground instead of physical upward travel, static disc exchange and an unwanted lower SoundCloud panel.

The approved hero/music compositions remain the layout reference. This revision changes the rendering and asset separation rather than adding sections or marketing copy.

## Selected assets

Seven assets now live in `public/assets/layers/`: sky, left tree, distant foliage, middle foliage, original-photo portrait, continuous near field and butterfly. All except the opaque sky use alpha. The field is one tall image with actual additional meadow below the hero; there is no second music-scene background or grass patch at the CD bases.

The first generated portrait candidates visibly reinterpreted facial details. They were discarded. The selected asset combines the original photo RGB with the alpha of a stricter background-removal pass in the original framing. This preserves the actual face, clothing, phone and pose. Cropping only removes empty margins. The static color adjustment is recorded; it does not regenerate the face. Fine hair-edge uncertainty and original photo grain remain honest limits.

Full prompts, source IDs, selected and discarded candidates, alpha coordinates, file dimensions and bytes are in [LAYER-ASSETS.md](LAYER-ASSETS.md). The seven-image runtime payload is **1,581,358 bytes**. Native field resolution is retained; it is not enlarged just to inflate its pixel count. Obsolete flattened scenery files were removed from `public`, and the approved original hero reference moved into documentation.

## Physical continuity

The original hero fade and masks are removed. The same continuous field moves upward 1.14 pixels for each native scroll pixel while sky, tree and distant/middle foliage move more slowly. The artist sits between middle vegetation and the near field. The two semantic sections share this world; cases and controls paint over the lower terrain.

The asset's actual alpha silhouette differed from the prompt, so placement was measured and adjusted to `top: -10%` with 240% field height. Independent review examined desktop scroll positions 0, 0.15, 0.3, 0.5, 0.8 and 1, plus mobile views. No rectangular seam, disappearing plane, mirrored band or CD-only overlay appeared. A subsequent 600 × 1600 review found an uncovered bottom because the hero height caps while music follows the viewport. The responsive overscan formula now covers that case and has a focused browser regression.

Butterfly wings and their slow drift use separate transform parents so they can flap while respecting parallax. Low, reduced motion and offscreen state stop decorative motion.

## Hover diagnosis and replacement

The old glyph controller cached layout but still changed 307 glyph styles during hover. The baseline recorded **4,214 style mutations during ten shader draws** and 459 copy descendants. That explained a concrete source of main-thread style/paint work. It was not evidence of the user's exact device FPS.

The new renderer caches title, biography, underline and sparkle into a GPU texture. Sharp ink and two prefiltered glow masks share RGB channels. One bounded vertex grid carries the entire material. Six independent impulses retain their positions and recoil with a signed, damped spring response, then settle. Both letters and underline deform continuously with the bubble.

Measured hover work after replacement: **zero copy style mutations, zero layout reads and zero additional texture uploads**. The copy subtree now has 15 descendants. The bright ink has a restrained dark keyline for contrast over clouds and flowers. Glow stays local and uses the existing pass; no full-screen bloom or simulation framebuffer was added. The old reference-rim image was removed from the renderer, leaving procedural film geometry and interference.

The original HTML remains accessible and becomes visible on no-WebGL/error/context loss. Manual graphics levels, reduced motion, context restoration and hidden/offscreen sleep remain supported. [ARCHITECTURE.md](ARCHITECTURE.md) records exact budgets and lifecycle decisions.

## CD behavior

The same centered disc now inserts into the current sleeve for 180 ms, stays hidden while the cases exchange for 220 ms, then emerges for 180 ms. The title and active cover switch only after the old disc is concealed. Rapid/reversed inputs replace the requested destination without building a queue. Keyboard activation, reduced motion, provider callbacks and teardown are covered by focused regressions.

The visible SoundCloud panel and footer are removed. The official widget remains the transport behind native controls, with a compact source link beside volume. Browsing without a play request is silent and makes no provider requests. Playback state continues to follow actual provider events. The prior environment did not confirm sustained real audio; mock state tests are not presented as a listening test.

## Verification and publication

See [VALIDATION-1.2.md](VALIDATION-1.2.md) for build, browser, production and artifact evidence. The existing `heinem.vercel.app` project, MIT code license, Git history and separate media rights remain in place. Reusable lessons are recorded in the existing Cortex PT/EN pages and Checkpoint reference rather than creating another unrelated project.
