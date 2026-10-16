# Header continuity R18

Restores the R16 navbar composition. R17 changed its top/left/size/material by route, producing up to a 40px brand displacement and replacing the visual with a bordered rectangle. It also separated spin from home navigation.

The brand is again one native home anchor on internal pages. Its normal click requests the existing 3D spin and starts the existing reverse portal immediately. Modified clicks remain native; repeated activation while returning does not restart either effect; navigation works without WebGL. The existing home-only spin button is retained.

Only a pointer-transparent, fixed gradient background extends to the top of the viewport. Its opacity changes softly; no route-dependent rule changes header geometry, border, shadows or blur. The original positions, heights, typography and control spacing are retained. Viewport-unit horizontal sizing prevents a second 14px reflow when a classic 15px scrollbar appears.

No content, gallery, audio, car, lighting or portal renderer source is changed.

## Verification

The new tests failed against R17 before implementation. Automated CPU tests exercise spin-before-return, duplicate activation, modified-click handling and unavailable WebGL. The browser regression records DOM bounds on every animation frame during real outgoing and incoming portal journeys and tests classic scrollbars, five viewport sizes, header background fade, completed logo rotation, keyboard navigation and the existing gallery/Play link.

Browser validation uses real Chromium WebGL2 with ANGLE SwiftShader. Actual portal journeys are tested at 600x480 / Low because this is software rendering; destination layout is checked at 1440x900, 1280x800, 390x844, 320x640 and 900x500. This is not a physical-GPU performance benchmark. The first 900x650 software run timed out while the existing portal animation was still progressing; the renderer was not changed to make the test pass.

Run npm test and npm run build. With the local server running at port 3000 and Playwright installed, run NODE_PATH=<path-to-playwright>/node_modules node tests/header-continuity-browser.cjs.

Final focused browser suite: 41 checks passed, with zero page errors. The full outgoing and incoming sequences retained control and persistent-logo bounds within the 0.1px assertion tolerance. CSS background fade is tested on actual animation frames; post-portal assertions wait for its rendered opacity rather than assuming software WebGL has settled after a fixed 600ms timeout.
