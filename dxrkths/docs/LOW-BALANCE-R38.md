# R38: Slightly sharper Low and the practical car-light cone

Date: 27 October 2026. Author request: aggressive Low optimization in R37 lost too much of the original atmosphere. Raise resolution **slightly** and restore the localized car/studio lights at a weaker level, preserving the approved R36 mobile layout and substantial R37 savings.

## Exact values

- **Compact phones**: Low render scale moves from 1.00 to **1.12** physical pixels per CSS pixel, with a hard **540,000-pixel** raster budget (formerly 450,000). At 390×844 CSS pixels this is **436×945 = 412,020 pixels**, up 25% from 329,160. At 430×932 it is 481×1043 = 501,683 pixels, below the cap. These figures describe raster work, **not FPS**. Larger viewports retain the original 450,000-pixel Low cap. Medium and High unchanged.
- **Practical light**: the *existing* car spotlight volume (one draw call) returns in Low at **0.095** strength versus **0.19** in Medium/High, with only **6** samples instead of 16/24. No new geometry, lamp, render target or shader program. The original High/Medium beam strength is restored when switching quality.
- **Matte floor light**: a faint pool from the existing car spotlight is calculated from the already-computed radius with one inexpensive smoothstep. No reflection texture, new pass, ambient noise or extra renderer.
- **Still disabled in Low**: bloom pyramid, heavy lens/depth of field, motion blur, dynamic planar reflections, shadow maps, smoke, ambient dust, sparks and chromatic shutter. Keep the existing FXAA, car materials, studio lamps, static floor and sleep-on-idle behavior. The returned light is static when idle, requiring no permanent animation loop.

## Verification and limits

Three new regressions failed on R37 and passed after the change. The full build/test suite passed locally. Browser acceptance should verify touch routing, portal, and Low→High→Low before publishing. Compare visual balance on physical phones if available; software Chrome/SwiftShader is not a real mobile GPU FPS or battery measurement. The raster increase does **not** imply a proportional FPS decrease, and R37's draw-call savings remain relevant. This is a small visual adjustment, not a reversal of the performance work.
