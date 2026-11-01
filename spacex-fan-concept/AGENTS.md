# SpaceX visual fidelity contract
- Use preauthored spacecraft/component files with verified source and reusable license, pinned in the asset pipeline.
- Never generate substitute rockets, capsules, engine parts, interiors or fallback vehicles procedurally. Studio floor/light primitives are unrelated and allowed.
- Keep original normals, tangents, UV channels, material groups and PBR maps. Optimize copies without inventing decals or turning everything metallic.
- Isolate supplied geometry only. No synthetic tanks, caps, satellites, plumbing or hidden components. Disclose absent internal geometry.
- Missing/failed source models must show unavailable/retry, not fabricated geometry. Preserve an existing authored model on upgrade failure.
- Validate actual desktop/mobile render screenshots and interactions. Publish through the existing GitHub-to-Vercel integration.
