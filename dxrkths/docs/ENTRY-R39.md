# R39: Unambiguous entry and the correct Enter BDX destination

Request recorded 30 October 2026: rename the entry action to Enter BDX and open Berserk, not the DXT biography; investigate why waiting or clicking the loading screen appears to enter different places.

## Confirmed causes
The initial cover and the top navigation both said **Enter DXT**, but performed different actions. The cover unlocked the 3D showroom; the header explicitly targeted **panel 3 / About DXT**. Also, the cover listened to clicks anywhere, so clicking decorative text or the loading screen set `activated=true` before the scene was ready. A later `ready()` then dismissed the cover, appearing to be an unexplained automatic entry. The fade also disabled pointer hit-testing before the cover was actually released.

## Correction
- Header: **Enter BDX** targets **panel 0 / Berserk Drift X**, retaining the existing camera/portal and route controller. About DXT stays available in its own destination.
- Initial root visit: the distinct button is **Enter Showroom**. Only that explicit button activates entry, including keyboard activation. An early intentional click waits for scene readiness; a late click follows the same path. No decorative/background click queues navigation.
- Direct URLs preserve their requested destination. `/berserk` is labelled Enter BDX, `/projects` says Continue to Future Projects, and other routes use their actual destination names.
- The entry click is consumed instead of bubbling into page navigation; the fading cover remains a hit shield until it is hidden and the underlay is released. Repeated input cannot dismiss twice. The separate intro sound control remains usable.
- Loading still reflects actual renderer/asset readiness. No artificial faster-ready timer, forced automatic entry, new renderer, or skipped warmup was introduced. R38 lighting/resolution and every approved scene/media layout remain unchanged.

## Verification
Eight focused Node regressions exercise ambient clicks before/after ready, synchronous gesture/audio activation, one dismissal, exact labels/targets, keyboard-compatible activation, no-WebGL fallback and the fade shield. Six failed on the previous source; all eight passed after the exact source edit, alongside seven existing intro tests. An offline Chromium fixture using the actual modified intro/header modules passed eight desktop/mobile-emulation checks. Full current-repository build and the separate real-site browser script are release checks; neither is a physical Android/iPhone or FPS benchmark.
