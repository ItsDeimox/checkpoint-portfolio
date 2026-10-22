# Future Projects detail dialogs

Updated 22 October 2026, R32. See [the supplied content and visual-change record](PROJECT-CONTENT-R32.md). R30 introduced the dialog; R31 preserved background scroll; R32 supplies the first real project galleries.

## Interaction contract
Keep the approved Games/Addons/Systems cards and showroom. A full-card native button opens one centered HTML dialog with a dark top-layer backdrop. The dialog lives outside the cached destination root and is created only when needed. Opening and closing use bounded CSS transitions; reduced-motion disables them. X, Escape or a genuine backdrop click closes it, restores focus and retains the page position. Held Escape must not trigger a showroom return after closing the dialog. History navigation, route replacement and disposal clean up the modal.

The current R31 scroll contract remains: leave HTML overflow untouched, lock the body, preserve original inline styles and only call scrollTo on dismissal if genuine scroll drift occurred. Do not reintroduce unconditional scrolling or change the underlying route.

The destination root is temporarily inert and its existing renderer sleeps while covered. No new WebGL context, renderer or persistent frame loop is created. Gallery media is mounted only when selected. Videos use native controls, playsinline and preload=none, never autoplay, and release their source when switched or closed. Images preserve their aspect ratio with object-fit:contain, and have alt text, captions and an error state. Gallery controls support keyboard navigation.

## Current content and provenance
There are six published entries after the owner requested temporary removal of BERSERK DRIFT: RALLY.
- Unnamed Drift Game: three supplied development screenshots, an English description of planned scope/mod support, collaborators DXT and Xablow.
- Right Cut!: three supplied cover/gameplay images, an English description, collaborators DXT and OhTaldoPedro, and the explicit notice that the systems and images are not final.
- Procedural Tiremark Generator, Procedural Vegetation Placer, Drift Judge Score System and FFB System retain their existing empty detail/media state. Their videos have not been supplied.

Do not substitute Berserk Drift X screenshots for another title, invent videos or change plans into release promises. The original screenshots retain their embedded UI language; only website descriptions, captions, alt text, notices and credits are translated.

## Editing project details
`PROJECT_DETAILS` in `src/pages/future-project-details.js` is keyed by the exact project name in `FUTURE_PROJECTS`, not by the current grid position. This avoids reassigning media when a catalogue item is removed or reordered. The dialog still receives `categoryIndex-itemIndex` and resolves the real project before reading details.

Each record accepts `description: ['paragraph', ...]`, `collaborators: ['name', ...]`, an optional `disclaimer`, and `media: [{type:'image',src:'/assets/projects/example.webp',alt:'Accurate description',caption:'Caption'}, {type:'video',src:'/assets/projects/demo.mp4',poster:'/assets/projects/poster.webp',alt:'Demo'}]`. These example paths are not supplied assets. Add every actual local file to `RUNTIME_FILES` in `tools/build.mjs`; merely adding a folder does not publish it. Only approved local/HTTPS images and videos are supported, not arbitrary embeds or tracking iframes.

## Verification
Run `npm run build` for the complete Node test suite and publication-graph checks. New R32 regressions verify six catalogue identities, translated content, collaborators, correct image associations and file hashes, bounded camera sway and removal of only the decorative line. `tests/project-content-r32-browser.cjs` tests the actual app, image decoding/dimensions, lazy loading, deep-scroll modal open/close, unchanged addon/system placeholders, desktop and 320/390px layouts. Wait for decode/presentation before screenshots; naturalWidth alone is not proof that an asynchronous image has painted.

The browser fixture uses software WebGL and does not establish visitor-hardware FPS or whole-site accessibility/legal certification. Native dialog reference: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
