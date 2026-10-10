import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const BUILD_VERSION = 'dxt-showroom-r7';
export const ROOM_ALIASES = Object.freeze(['groups', 'projects', 'about', 'contact', 'berserk']);

// Keep archived source/assets in the repository. Only the persistent room's
// browser entrypoints and their actual assets belong in the published tree.
export const RUNTIME_FILES = Object.freeze([
  'index.html',
  'src/main.js',
  'src/core.js',
  'src/content.js',
  'src/ui/icons.js',
  'src/ui/room-shell.js',
  'src/ui/room-navigation.js',
  'src/pages/home-room.js',
  'src/pages/room-panel-data.js',
  'src/scene/room-visual-settings.js',
  'src/scene/room-music-settings.js',
  'src/styles-base.css',
  'src/styles-room.css',
  'src/render/showroom.bundle.js',
  'assets/models/nissan-s15-showroom.glb',
  'assets/models/DXTlogoPrinted.glb',
  'assets/models/NISSAN-S15-LICENSE.txt',
  'assets/images/showroom-reference.png',
  'assets/icons/dxt.webp',
  'assets/icons/berserk.webp',
  'assets/icons/revline.webp',
  'assets/icons/frost.webp',
  'assets/fonts/barlow-latin-400.woff2',
  'assets/fonts/barlow-latin-500.woff2',
  'assets/fonts/barlow-condensed-latin-400.woff2',
  'assets/fonts/barlow-condensed-latin-500.woff2',
  'assets/fonts/barlow-condensed-latin-600.woff2',
  'assets/fonts/BARLOW-OFL.txt',
  'assets/fonts/FONT-SOURCES.txt',
]);

/** Reject missing or legacy browser imports before copying any deployment files. */
export async function validateRuntimeGraph(root = PROJECT_ROOT) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['src/main.js'],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    metafile: true,
    logLevel: 'silent',
  });
  const inputs = Object.keys(result.metafile.inputs).map(name => name.replaceAll('\\', '/')).sort();
  const missing = inputs.filter(name => !RUNTIME_FILES.includes(name));
  if (missing.length) throw new Error(`Browser imports outside the showroom distribution: ${missing.join(', ')}`);
  return inputs;
}

/** Package an already bundled/tested source tree. Exported for deployment tests. */
export async function buildSite({root = PROJECT_ROOT, output = path.join(root, 'dist')} = {}) {
  const runtimeImports = await validateRuntimeGraph(root);
  // Verify every source first, so a missing asset cannot destroy a prior build.
  await Promise.all(RUNTIME_FILES.map(name => fs.access(path.join(root, name))));
  await fs.rm(output, {recursive: true, force: true});
  await fs.mkdir(output, {recursive: true});
  for (const name of RUNTIME_FILES) {
    const target = path.join(output, name);
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.copyFile(path.join(root, name), target);
  }
  for (const route of ROOM_ALIASES) {
    await fs.mkdir(path.join(output, route));
    await fs.copyFile(path.join(root, 'index.html'), path.join(output, route, 'index.html'));
  }
  await fs.copyFile(path.join(root, 'index.html'), path.join(output, '404.html'));
  await fs.writeFile(path.join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://dxrkths.vercel.app/sitemap.xml\n');
  await fs.writeFile(path.join(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://dxrkths.vercel.app/</loc></url></urlset>');
  const files = {};
  async function visit(directory) {
    for (const entry of (await fs.readdir(directory, {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else files[path.relative(output, filename).split(path.sep).join('/')] = createHash('sha256').update(await fs.readFile(filename)).digest('hex');
    }
  }
  await visit(output);
  const info = {version: BUILD_VERSION, commit: process.env.VERCEL_GIT_COMMIT_SHA || null, runtimeImports, files};
  await fs.writeFile(path.join(output, 'build-info.json'), JSON.stringify(info, null, 2));
  return info;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  execFileSync(process.execPath, ['tools/bundle.mjs'], {cwd: PROJECT_ROOT, stdio: 'inherit'});
  const tests = (await fs.readdir(path.join(PROJECT_ROOT, 'tests'))).filter(name => name.endsWith('.test.mjs')).sort();
  execFileSync(process.execPath, ['--test', ...tests.map(name => `tests/${name}`)], {cwd: PROJECT_ROOT, stdio: 'inherit'});
  const info = await buildSite();
  console.log(`DXT showroom build: ${Object.keys(info.files).length + 1} files, ${info.runtimeImports.length} browser modules, ${info.version}.`);
}
