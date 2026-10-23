# R34: Reduce redundant modal chrome and move metadata below the image

## Request (22 October 2026)
Keep the approved Future Projects layout, photos, arrow navigation and authored English descriptions. Remove repeated generic captions such as "Future Projects" rather than repeating the same section/category/platform information. Place **Category**, **Platform** and **Collaborators** in the left column immediately **below the image**, occupying the empty space. This must not affect carousel transitions, page-scroll lock or the main 3D showroom.

## Changes
- Preserve the top bar as a single compact "DXT / PROJECT FILE" context and accessible close button.
- Remove the title-side repeated "Games / Future Project" eyebrow, its duplicated platform badge and the redundant "FUTURE PROJECTS / DXT · ESC TO CLOSE" footer.
- Keep the project name, description and in-development disclaimer on the right.
- Render the metadata as one semantic description list in the left media column after the image viewer, not at the end of the right text column. Hide the collaborator row if no credits were supplied; do not invent values.
- Keep mobile ordering natural: image, metadata, title/description, with no horizontal overflow.
- No changes to the images, their order/quality, project catalogue, removed Rally, arrows, reduced-motion behavior, accessibility labels, URL navigation or background renderer.

## Verification
Automated tests assert DOM placement, single occurrence of fields, removal of repeated captions, empty-media fallback and responsive CSS; the browser QA script checks the metadata is immediately below the image on desktop and before title on narrow phones. Full unit/build suite must pass before deployment; real Chromium QA is complementary.
