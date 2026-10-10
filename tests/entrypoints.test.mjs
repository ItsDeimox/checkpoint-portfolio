import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BUILD_VERSION, ROOM_ALIASES, RUNTIME_FILES, buildSite, validateRuntimeGraph} from '../tools/build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = filename => fs.readFile(path.join(root, filename), 'utf8');

test('HTML starts the persistent room with its showroom and intro stylesheets and local fonts', async () => {
  const html = await read('index.html');
  const sheets = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(sheets, ['/src/styles-base.css', '/src/styles-room.css', '/src/styles-experience.css', '/src/styles-sections.css']);
  assert.deepEqual([...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match => match[1]), ['/src/main.js']);
  assert.match(html, /<body data-page="home" class="intro-pending">/);
  assert.match(html, /class="skip-link" href="#main"/);
  assert.match(html, /id="announcer"[^>]*aria-live="polite"/);
  assert.doesNotMatch(html, /styles-reference|\/src\/styles\.css|race\.webp|fonts\.googleapis|fonts\.gstatic|Racing.Sans|Caveat/);
  for (const match of html.matchAll(/(?:href|src)="\/(assets|src)\/([^"]+)"/g)) {
    assert.ok(RUNTIME_FILES.includes(`${match[1]}/${match[2]}`), match[0]);
  }
});

test('base CSS retains resets, focus and exactly the licensed font weights in use', async () => {
  const css = await read('src/styles-base.css');
  const fonts = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([, rule]) => ({
    family: /font-family:\s*'([^']+)'/.exec(rule)[1],
    weight: Number(/font-weight:\s*(\d+)/.exec(rule)[1]),
    file: /url\('\/(assets\/[^']+)'\)/.exec(rule)[1],
  }));
  assert.deepEqual(fonts.map(({family, weight}) => [family, weight]), [
    ['Barlow', 400], ['Barlow', 500], ['Barlow Condensed', 400], ['Barlow Condensed', 500], ['Barlow Condensed', 600],
  ]);
  for (const font of fonts) {
    assert.ok(RUNTIME_FILES.includes(font.file));
    assert.equal((await fs.readFile(path.join(root, font.file))).subarray(0, 4).toString(), 'wOF2');
  }
  assert.match(await read('assets/fonts/BARLOW-OFL.txt'), /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(css, /box-sizing:\s*border-box/);
  assert.match(css, /\.sr-only\s*\{[^}]*clip-path:\s*inset\(50%\)/);
  assert.match(css, /:focus-visible\s*\{[^}]*outline:/);
  assert.doesNotMatch(css, /pattern-dark|pattern-orange|race\.webp|Racing.Sans|Caveat/);
});

test('build rejects a reachable legacy module outside its publication manifest', async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'dxt-legacy-import-'));
  try {
    await fs.mkdir(path.join(fixture, 'src/pages'), {recursive: true});
    await fs.writeFile(path.join(fixture, 'src/main.js'), "export {value} from './pages/legacy.js';");
    await fs.writeFile(path.join(fixture, 'src/pages/legacy.js'), 'export const value = 1;');
    await assert.rejects(validateRuntimeGraph(fixture), /outside the showroom distribution: src\/pages\/legacy\.js/);
  } finally {
    await fs.rm(fixture, {recursive: true, force: true});
  }
});

test('published tree contains the complete room, exact aliases and no archived runtime', async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'dxt-room-dist-'));
  try {
    const info = await buildSite({output});
    const expected = [...RUNTIME_FILES, ...ROOM_ALIASES.map(route => `${route}/index.html`), '404.html', 'robots.txt', 'sitemap.xml'].sort();
    assert.deepEqual(Object.keys(info.files).sort(), expected);
    assert.equal(info.version, 'dxt-showroom-r15');
    assert.equal(info.version, BUILD_VERSION);
    const entry = await fs.readFile(path.join(output, 'index.html'));
    for (const route of ROOM_ALIASES) {
      assert.deepEqual(await fs.readFile(path.join(output, route, 'index.html')), entry, route);
    }
    assert.deepEqual(await validateRuntimeGraph(output), info.runtimeImports);
    assert.ok(info.runtimeImports.includes('src/render/showroom.bundle.js'));
    for (const filename of ['src/pages/templates.js', 'src/pages/home-reference.js', 'src/scene/showroom.js', 'src/render/logo.js', 'src/ui/profile.js', 'src/styles.css', 'src/styles-reference.css', 'assets/models/nissan-s15-lbwk.glb', 'assets/environment/sunset-forest.hdr', 'assets/images/race.webp']) {
      await assert.rejects(fs.access(path.join(output, filename)), {code: 'ENOENT'}, filename);
    }
    const model = 'assets/models/nissan-s15-showroom.glb';
    assert.equal(info.files[model], createHash('sha256').update(await fs.readFile(path.join(root, model))).digest('hex'));
    assert.equal(JSON.parse(await fs.readFile(path.join(output, 'build-info.json'), 'utf8')).version, BUILD_VERSION);
  } finally {
    await fs.rm(output, {recursive: true, force: true});
  }
});
