# R26: measure the click, not only the render loop

R25's render-loop measurements missed time spent preparing a return while the scene was asleep. A headed Brave reproduction on the RTX 2060 found 252–276 ms between the return click and camera motion, including a 145 ms main-thread task. Subsequent entries also fell back to animating the full DOM and produced 79–94 ms draw intervals. The desktop pacer separately imposed a 60/90 FPS ceiling.

R26 uses a browser-owned View Transition snapshot for subsequent entries and returns. It avoids HTML/SVG serialization and image encoding during the click. The portal camera still drives the snapshot's transform, clip and opacity; the live page, scroll state, header and independent logo are restored on completion or cancellation. Unsupported browsers retain the live DOM fallback. Initial previews remain preloaded during the intro.

Desktop drawing now follows display refresh without the former fixed cap. The two-draw GPU queue and mobile 30/60 FPS budgets remain. R25's white idle lighting, compatible 4x scene MSAA and High preset's native 1440p pixel budget are retained.

## Validation

360 automated tests and 47 hardware browser checks passed. Coverage includes all five pages, repeated journeys, quality changes, cancellation, resize, capture failure, reduced motion, and native snapshot cleanup. Code review also checked scrollbar width, logo layering and browser-initiated transition completion.

The repeatable `tests/click-latency-browser.cjs` records continuous animation frames, draw starts, click-to-return-start latency and main-thread long tasks. It uses native clicks and runs three entry/return cycles. Set `DXT_BROWSER_PATH` to Brave and `DXT_BASE_URL` to select local or deployed code. Hardware rendering is required; use an unobscured headed window for representative timings.

Final local run: headed Brave, visible and focused, ANGLE RTX 2060 D3D11, 1920×1080 viewport on a 2560×1440 display, High preset.

| Cycle | Entry maximum draw interval | Return click-to-motion | Return maximum draw interval |
| --- | ---: | ---: | ---: |
| First | 23.7 ms | 20.7 ms | 19.4 ms |
| Second | 31.8 ms | 16.9 ms | 15.7 ms |
| Third | 46.4 ms | 23.0 ms | 19.7 ms |

No main-thread long tasks were observed during these six journeys. Desktop frame limit and skipped refresh counters were zero. These are sampled measurements, not a guarantee of zero dropped frames; loading, other applications, browser scheduling and different resolutions can change results. An earlier R26 run included a 70 ms return draw interval without a main-thread long task. The recurring SVG capture stall was removed rather than hidden by excluding pre-animation time.
