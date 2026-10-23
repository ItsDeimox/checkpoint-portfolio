import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('reference uses independently generated art with separate accessible content', () => {
 const html=read('index.html');
 for(const asset of ['reference-background.webp','reference-field.webp','artist-light.webp']) assert.ok(html.includes(asset),asset);
 for(const old of ['foliage-far.webp','foliage-mid.webp','tree-left.webp','field-detail-tl.webp']) assert.ok(!html.includes(old),old);
 assert.ok(html.includes('bubble-canvas'));
 assert.ok(html.includes('jewel-stage'));
 assert.ok(!html.includes('x.com/heinemoficial'));
});
test('new artwork pair retains native detail under a 2 MiB combined download budget', () => {
 const names=['reference-background.webp','reference-field.webp'];
 const bytes=names.reduce((sum,name)=>sum+statSync(new URL('../public/assets/layers/'+name,import.meta.url)).size,0);
 assert.ok(bytes<2*1024*1024,`${bytes} bytes`);
 for(const name of names) {
  const image=readFileSync(new URL('../public/assets/layers/'+name,import.meta.url));
  assert.equal(image.toString('ascii',0,4),'RIFF'); assert.equal(image.toString('ascii',8,12),'WEBP');
 }
});
test('background and field have only one texture/sample path, no old runtime filter',()=>{
 const source=read('src/main.ts'),shader=read('src/graphics/bubble.ts'),style=read('src/scenery.css');
 assert.ok(!source.includes('createSceneFinish')); assert.ok(!source.includes('createFieldDetail'));
 assert.ok(!shader.includes('gradeGarden')); assert.ok(shader.includes('return layerSample(uBackdrop0'));
 assert.ok(style.includes('filter: none')); assert.ok(!style.includes('saturate(.86)'));
});
