# R27: first-entry compositor warmup and Future Projects catalogue

## Scope
Preserve the approved DXRKTHS car, camera curve, portal tunnel, lighting, post-processing, scene quality, hover propagation, music and other destination layouts. Only the first-use destination composition, redundant return link, and Future Projects card presentation change.

## First journey
The existing startup already parses all five destinations, decodes their images/fonts, compiles the destination and portal shaders, renders each portal phase and bakes viewport canvases. It does **not** guarantee that a canvas held detached in a cache has ever been uploaded/painted as an actual browser layer.

During intro-only page preparation, each baked canvas is briefly mounted **at its real viewport size**, given two paint opportunities, and removed again. The interactive DOM remains cached. On a first visit using a preview, the chosen canvas receives two paint opportunities with near-zero opacity while the showroom draw loop is asleep; **only then** does the original portal camera timeline start. That avoids demanding its first layer promotion and the first moving portal frame at the same instant. Other journeys still use the approved native View Transition / live DOM fallback; no extra WebGL context or frame loop, no expensive click-time SVG serialization, no early navigation, no FPS cap or automatic quality reduction.

Abort/version checks prevent a delayed warmup from restarting a cancelled journey. A failed browser paint path falls back to the current travel behavior. This is an architectural mitigation: browser-specific compositor behavior and exact first-click FPS still require a hardware run to quantify.

## Navigation and catalogue
- Removed the duplicate destination body **Back to showroom** link. Existing header's top-left brand/arrow link still returns, spins, handles direct links, and keeps the shared Escape/history behavior.
- Upcoming Games, Addons and Systems preserve their exact seven names/platforms. Replaced list rows with subtle purple editorial cards, three across on wide screens, two on medium/tablet and one on narrow phones. CSS Grid means no new images, animation loop, timer, fake clickable links or GPU renderer. Compact hover transitions have a reduced-motion fallback.
- The category's destination coordinate is now right-aligned without the removed body link.

## Tests
- Portal startup: prepainted canvases get two compositor opportunities while intro is active; cancel during first-use paint does not start travel; first portrait/desktop previews still restore live interactive pages and fall back correctly on viewport resize.
- Page contract: all seven upcoming projects and their platform labels remain; only the header contains a showroom-return link.
- Browser recovery test follows the actual top-left header return instead of the removed body link.
- Existing full project build/test suite remains the production gate.

## Limits
A static/unit pass can prove scheduling, valid markup and resource lifetimes; it cannot prove the browser compositor never stalls on a particular GPU. Measure first-click vs repeat entry (p95/max draw intervals, click-to-motion, long tasks and GPU/raster traces) at High/1440p as well as mobile after publishing. Do not attribute old R25/R26 FPS figures to this revision.
