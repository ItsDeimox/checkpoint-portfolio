# R39: Explicit BDX entry and deliberate 3D showroom loading

Date: 30 October 2026. The owner requested Enter BDX leading to Berserk Drift X, and reported confusing waiting and arbitrary clicks on the introductory screen.

## Cause
`mountIntro` attached a click handler to the whole introduction, so its title/background were indistinguishable from the Enter button. `IntroGate` always waited for prepared 3D before closing, and the home entry eagerly pre-rendered five destinations then built the showroom. A generic click could therefore look delayed or expose an unintended destination. The opening label did not identify the game route.

## Fix
The primary native button now says Enter BDX and directly selects `/berserk`. It starts music within the trusted user gesture but does not await the showroom. A secondary, clearly labelled 3D Showroom button retains access to the existing room and preloading/transitions. Waiting or clicking noninteractive background text selects nothing. No new timer automatically sends a visitor to a page.

The chosen page is mounted before the cover fades. The cover continues to intercept pointers and the underlay stays inert until that fade ends. Its activation is stopped before reaching document-level route handlers. Existing `/projects`, `/groups`, `/about` and `/contact` deep links retain their destination and get a contextual Continue label rather than being forced into the game page. The header return continues to lazily initialize the same showroom as before. No shaders, Low/Medium/High budgets, content or portal motion curves change.

## Verification
Seven new entry regressions failed against the previous behavior, then passed; the existing intro and main-route suites also passed (30 targeted local tests). The local source copies of `main.js` and `room-intro.js` are hash-matched to the uploaded blobs. Whole-repository build and a real-site Chromium check are the preview release gates. Browser checks cover background taps, primary entry without a HeroScene, explicit showroom entry, blocked 3D bundle, direct links, keyboard input and portrait/landscape button dimensions. Browser emulation is not physical-phone testing or an FPS claim.
