# HEINEM v1.5.1 — responsive film, grass refraction, white bloom and geometric H

The user-approved v1.5 scene is preserved. The original uploaded screenshot has never been cut into scenery assets.

- Bubble width and height no longer use independent viewport dimensions. Desktop/tablet maintain aspect ratio 1.52/1.44 and use viewport-aware sizing; mobile keeps its approved separate responsive rules. Text/underline are measured into the same cached atlas when the film changes size.
- Scene refraction samples **both** generated background and transparent grass. Existing parallax maps update the source UVs during scroll/resize; the GLSL alpha composite is a bounded second sampler inside the existing WebGL pass, not a new framebuffer or upload-per-frame.
- Local bloom uses pure white instead of cyan; no extra glow pass, and spring motion remains untouched.
- Portrait has mild saturation/brightness adjustment independent of the scenery and the music art.
- The supplied mark is a geometric block H with two square cutouts, reproduced in a compact inline-safe SVG asset and reused as favicon. No font dependency or screenshot crop.
- Responsive browser tests check six heights/aspect ratios, no text clipping/overflow and the new brand asset.

Deployment: commit to main, allow GitHub-triggered Vercel production build, verify SHA/READY/alias. Browser checks validate layout, not subjective pixel-identical visual acceptance.
