# R32: supplied project information, galleries and covered-car presentation

## Scope authorized on 22 October 2026
Publish the supplied Right Cut! and Unnamed Drift Game descriptions in English, with their exact collaborators and the six supplied images. Temporarily remove BERSERK DRIFT: RALLY. Leave the four addon/system entries unchanged until their owner provides more material. Slightly increase the covered-car camera motion and remove only the thin line marked in the supplied reference screenshot.

## Content and media provenance
- Right Cut!: three supplied images (cover artwork, percentage-cutting mode, fruit-slicing mode), DXT and OhTaldoPedro, and the explicit work-in-progress/final-game disclaimer.
- Unnamed Drift Game: three supplied images (car selection, drifting gameplay, drift transition), DXT and Xablow. Planned features remain written as plans, including limited initial content and community-created mods.
- Screenshots remain authentic and unmodified, including any Portuguese game UI inside them. Website descriptions, captions, alt text, notices and credits are English. The arrow-marked covered-car screenshot is a change reference, not a gallery image.
- No videos or unsupported features/release dates were fabricated. Addons and Systems retain their existing placeholders.
- The six images were reencoded as WebP at quality 90 without resizing/cropping, retaining their original aspect ratios and resolution. Combined payload: 917,230 bytes. The production allowlist includes every image; galleries still load only the selected media.

## Safe identity mapping
PROJECT_DETAILS is now keyed by the authored project name. The dialog continues to receive a category/item position but resolves the corresponding catalogue identity before looking up the details. Removing Rally must not shift another project's media or credits onto the wrong card. Future edits should preserve this identity contract and add regression coverage when renaming a project.

## Minimal visual change
The covered-car sway changes from 0.026 to 0.075 horizontal phase amplitude and from 0.04 to 0.07 vertical amplitude, preserving timing, the base camera position, look-at target, reduced-motion home pose, existing renderer, pixel budget and lighting. Only `.future-car-stage::before`, the decorative horizontal bar, is removed. The overhead light overlay and real scene lights remain unchanged.

## Validation
`tests/project-content-r32.test.mjs` adds six regression cases. The initial test-only revision failed those six while the previous 408 tests passed. Existing assertions explicitly tied to the removed seven-item catalogue were updated to six, without relaxing unrelated scene, input, media safety or scroll tests.

Run `npm run build` for the full suite. The browser companion `tests/project-content-r32-browser.cjs` tests the actual local site, original image dimensions, project-to-gallery mapping, collaborator/disclaimer rendering, 320/390px layout, unopened-gallery network behavior, empty addon/system dialogs and modal scroll preservation. Browser results are measured separately from unit/build results. Software WebGL verification is not a hardware FPS benchmark.
