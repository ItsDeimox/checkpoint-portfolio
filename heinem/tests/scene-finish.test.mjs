import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
const source = stripTypeScriptTypes(readFileSync(new URL('../src/lib/scene-finish.ts', import.meta.url), 'utf8')).replaceAll('export ', '');
const context = vm.createContext({});
vm.runInContext(source, context);
const values = vm.runInContext('COOL_FINISH_VALUES', context).split(/\s+/).map(Number);
const apply = rgb => [0, 1, 2, 3].map(row => Math.max(0, Math.min(1,
  rgb.reduce((sum, value, col) => sum + value * values[row * 5 + col], values[row * 5 + 4]))));
const luminance = rgb => rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;

test('finish preserves neutral white and the original transparency', () => {
  assert.deepEqual(apply([1, 1, 1, 1]), [1, 1, 1, 1]);
  assert.equal(apply([.4, .5, .2, 0])[3], 0);
  assert.equal(apply([.4, .5, .2, .37])[3], .37);
});
test('shadows are bluer, green midtones darker, sunlit grass remains luminous', () => {
  const shade = [.16, .25, .15, 1], green = [.31, .45, .22, 1], light = [.59, .71, .41, 1];
  const output = apply(shade);
  assert.ok(output[2] - output[0] > shade[2] - shade[0] + .04);
  assert.ok(luminance(apply(green)) < luminance(green) * .96);
  assert.ok(luminance(apply(light)) > luminance(light) * .95);
  assert.ok(apply(green)[1] > apply(green)[0]);
});
test('filter installs only once and teardown removes the treatment', () => {
  const elements = new Map();
  const create = tag => ({ tag, children: [], attributes: {}, dataset: {},
    append(child) { this.children.push(child); child.parent = this; if (child.id) elements.set(child.id, child); },
    setAttribute(key, value) { this.attributes[key] = value; },
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); elements.delete(this.id); },
  });
  const world = create('main'), definitions = create('defs');
  world.style = { setProperty(k,v) { this[k]=v; }, removeProperty(k) { delete this[k]; } };
  const document = { querySelector: selector => selector === '#scene-world' ? world : definitions,
    getElementById: id => elements.get(id), createElementNS: (_, tag) => create(tag) };
  const ctx = vm.createContext({document}); vm.runInContext(source, ctx);
  const finish = vm.runInContext('createSceneFinish()', ctx);
  assert.equal(world.dataset.colorFinish, 'cool');
  assert.equal(definitions.children[0].attributes['color-interpolation-filters'], 'sRGB');
  assert.equal(definitions.children[0].children[0].attributes.values, values.join(' '));
  vm.runInContext('createSceneFinish()', ctx);
  assert.equal(definitions.children.length, 1);
  finish.destroy();
  assert.equal(definitions.children.length, 0);
  assert.equal(world.dataset.colorFinish, undefined);
});
