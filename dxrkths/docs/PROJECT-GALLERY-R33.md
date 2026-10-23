# R33 — Project modal image-first navigation (22 October 2026)

## Requested layout

The owner relayed feedback after the R32 content update: keep the existing Future Projects catalogue as it is, including Addons and Systems cards with no photos until their own material is supplied. **Berserk Rally stays removed.** The gallery should show *only the image*, with previous/next arrows literally over the left and right edges, and the project heading should be moderately smaller. Remove the redundant numbered `PHOTO` row beneath the image.

## Change

- Keep each project's real image list, descriptive paragraphs, collaborators and development status exactly as published in R32.
- Make the existing stage the sole visual gallery. Two semitransparent, keyboard-focusable left/right buttons overlay the image, centered vertically. Hide arrows for empty and one-image galleries.
- Remove thumbnail-choice buttons, their CSS, and the off-image controls. Position announcements are provided in a screen-reader-only live region; no extra visual bars.
- Reduce the desktop title clamp to 27–38px and the mobile title clamp to 28–34px. Keep the original modal, dark backdrop, corner radius and two-column structure.
- Gallery wraps at both ends; arrow buttons keep keyboard focus, and Left/Right/Home/End continue to work when focused on the image controls. `select()` still releases previously selected video resources without preloading every asset.
- Empty-media Addons and Systems retain their existing truthful "Preview coming soon" placeholder without unnecessary arrows. No changes to the camera, shaders, page scroll or existing approved gallery images.

## Verification

Node regression tests: the visual strip and numbered PHOTO labels are absent, both arrows are children of the image viewer, empty/single-image panels have no irrelevant controls, titles are reduced, responsive positioning remains. Existing R32 tests protect every real asset/caption/credit; browser QA uses the image-side arrows to check all three images of each game and wraparound. Full build and Vercel preview must pass before production. No manufactured media or content is added.
