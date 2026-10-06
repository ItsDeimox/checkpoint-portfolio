# Deimox Portfolios

Production release: **Cubo R4, glow reduzido**.

This release preserves the exact runtime source and assets from `Deimox-Portfolios-Cubo-R4-Glow-Reduced.zip`. The deployment is isolated in this directory; sibling projects are untouched.

## Build and edit

Use Node.js 22 or 24. There are no npm dependencies.

```sh
cd deimoxportfolios
npm run build
npm run dev
```

`npm run unpack` expands 39 source files and 12 assets. The checksum-verified Brotli source snapshot lives under `release/`; `assets-snapshot.html` is an existing asset container, not the deployed page. The build publishes only the expanded `index.html`, modular `src/`, standalone assets, and the portable `ABRIR.html` in `dist/`.

For normal editing after unpacking, run `node tools/server.mjs` and `node tools/build.mjs` directly. Do not run `npm run unpack`, `npm run dev`, or `npm run build` over uncommitted source edits: those commands restore the frozen release. To make future source edits deployable, unpack, remove the generated-source entries from `.gitignore`, track `src/`, `assets/`, `tools/` and `index.html`, and replace the build script with `node tools/build.mjs`. The latest modular ZIP also remains available in the conversation.

The snapshot SHA-256 is checked before writing source; every source file and image has its own integrity check. `/build-info.json` identifies the active production build. No credentials, private connection metadata or server-side dependencies are required.

Local pre-deployment verification: 73 unit tests passed and all 50 runtime build files compared byte-for-byte with the approved ZIP build.
