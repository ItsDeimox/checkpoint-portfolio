import test from 'node:test';
import assert from 'node:assert/strict';
import {SRGBColorSpace} from 'three';
import {ROOM_PANELS, BACK_ACTION} from '../src/pages/room-panel-data.js';
import {RoomPanelContent} from '../src/scene/room-panel-content.js';

function canvasRecorder() {
  const canvases = [];
  const canvasFactory = () => {
    const state = [], fills = [], text = [];
    const context = {
      fills, text, font: '30px Arial', fillStyle: '#000', textAlign: 'left', textBaseline: 'alphabetic',
      measureText(value) {return {width: Array.from(String(value)).length * Number(this.font.match(/([\d.]+)px/)?.[1] || 30) * .48};},
      fillRect(x, y, width, height) {fills.push({x, y, width, height, style: this.fillStyle});},
      fillText(value, x, y) {
        const width = this.measureText(value).width;
        const left = this.textAlign === 'right' ? x - width : this.textAlign === 'center' ? x - width / 2 : x;
        text.push({value: String(value), x: left, y, width, font: this.font});
      },
      save() {state.push({font: this.font, fillStyle: this.fillStyle, textAlign: this.textAlign, textBaseline: this.textBaseline});},
      restore() {Object.assign(this, state.pop());},
      createLinearGradient() {return {addColorStop() {}};},
      beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, strokeRect() {}, closePath() {}, fill() {}, rect() {}, clip() {}, clearRect() {},
    };
    const canvas = {width: 0, height: 0, context, getContext: type => type === '2d' ? context : null};
    canvases.push(canvas);
    return canvas;
  };
  return {canvasFactory, canvases};
}

function paintedRow(canvas, label) {
  const labels = canvas.context.text.filter(item => item.value === label);
  assert.ok(labels.length, 'draw the visible label: ' + label);
  const candidates = canvas.context.fills.filter(rect => rect.width > 100 && rect.height < canvas.height / 3
    && labels.some(text => text.x >= rect.x && text.x < rect.x + rect.width && text.y >= rect.y && text.y < rect.y + rect.height));
  assert.ok(candidates.length, 'draw a clickable row behind ' + label);
  return candidates.sort((a, b) => a.width * a.height - b.width * b.height)[0];
}

function rowUv(canvas, row) {
  return {x: (row.x + row.width / 2) / canvas.width, y: 1 - (row.y + row.height / 2) / canvas.height};
}

test('panel content precreates stable sRGB canvas textures with visible action labels', () => {
  const recorder = canvasRecorder(), content = new RoomPanelContent({...recorder, fontSet: null});
  try {
    assert.equal(content.textures.length, ROOM_PANELS.length);
    assert.equal(recorder.canvases.length, ROOM_PANELS.length);
    for (const [index, panel] of ROOM_PANELS.entries()) {
      const texture = content.getTexture(index), canvas = recorder.canvases[index];
      assert.equal(texture, content.getTexture(index));
      assert.equal(texture.image, canvas);
      assert.equal(texture.isCanvasTexture, true);
      assert.equal(texture.colorSpace, SRGBColorSpace);
      assert.equal(texture.flipY, true);
      assert.equal(canvas.width, 1024);
      assert.equal(canvas.height, 1024);
      assert.ok(canvas.context.text.some(call => call.value === panel.title));
      for (const action of [...panel.options, BACK_ACTION]) paintedRow(canvas, action.title);
      for (const call of canvas.context.text) {
        assert.ok(call.x >= 24 && call.x + call.width <= canvas.width - 24, 'text must fit within the screen: ' + call.value);
        assert.ok(call.y >= 24 && call.y <= canvas.height - 24, 'text must stay inside the screen: ' + call.value);
      }
    }
  } finally {content.dispose();}
});

test('physical UV hit regions match painted option rows and the on-screen Back control', () => {
  const recorder = canvasRecorder(), content = new RoomPanelContent({...recorder, fontSet: null});
  try {
    for (const [index, panel] of ROOM_PANELS.entries()) {
      const canvas = recorder.canvases[index];
      for (const action of [...panel.options, BACK_ACTION]) {
        const row = paintedRow(canvas, action.title), uv = rowUv(canvas, row);
        assert.equal(content.getActionAtUV(index, uv), action);
        assert.equal(content.getActionAtUV(index, {x: (row.x + 2) / 1024, y: 1 - (row.y + 2) / 1024}), action);
        assert.equal(content.getActionAtUV(index, {x: (row.x + row.width - 2) / 1024, y: 1 - (row.y + row.height - 2) / 1024}), action);
      }
      assert.equal(content.getActionAtUV(index, {x: .05, y: .96}), null, 'header artwork is not a link');
      for (const uv of [{x: -.01, y: .5}, {x: 1.01, y: .5}, {x: .5, y: -.01}, {x: .5, y: 1.01}, {x: NaN, y: .5}, null]) {
        assert.equal(content.getActionAtUV(index, uv), null);
      }
    }
    assert.equal(content.getActionAtUV(99, {x: .5, y: .5}), null);
  } finally {content.dispose();}
});

test('hover only redraws its changed panel state and never replaces its texture', () => {
  const recorder = canvasRecorder();
  let changes = 0;
  const content = new RoomPanelContent({...recorder, fontSet: null, onChange: () => changes++});
  try {
    const originalTextures = [...content.textures], versions = content.textures.map(texture => texture.version);
    assert.equal(content.setHovered(0, 'missing'), false);
    assert.equal(content.setHovered(0, ROOM_PANELS[0].options[0]), true);
    assert.equal(content.getTexture(0).version, versions[0] + 1);
    assert.equal(changes, 1);
    for (let index = 1; index < ROOM_PANELS.length; index++) assert.equal(content.getTexture(index).version, versions[index]);
    assert.equal(content.setHovered(0, ROOM_PANELS[0].options[0].id), false);
    assert.equal(changes, 1);
    assert.equal(content.setHovered(0, null), true);
    assert.equal(content.setHovered(0, null), false);
    assert.equal(content.setHovered(0, BACK_ACTION.id), true);
    assert.equal(changes, 3);
    assert.deepEqual(content.textures, originalTextures);
  } finally {content.dispose();}
});

test('font readiness refreshes the stable textures once, then disposal cancels further work', async () => {
  const recorder = canvasRecorder(), completions = [];
  let changes = 0;
  const fontSet = {load: () => new Promise(resolve => completions.push(resolve))};
  const content = new RoomPanelContent({...recorder, fontSet, onChange: () => changes++});
  const versions = content.textures.map(texture => texture.version);
  assert.ok(completions.length >= 2, 'request both existing heading and body fonts');
  completions.forEach(resolve => resolve([{}]));
  await content.ready;
  assert.equal(changes, 1);
  content.textures.forEach((texture, index) => assert.equal(texture.version, versions[index] + 1));
  let disposals = 0;
  content.textures.forEach(texture => texture.addEventListener('dispose', () => disposals++));
  content.dispose();content.dispose();
  assert.equal(disposals, ROOM_PANELS.length);
  assert.equal(content.setHovered(0, 'game'), false);
  assert.equal(content.getActionAtUV(0, {x: .8, y: .9}), null);
  assert.equal(content.getTexture(0), null);

  const delayed = [], later = new RoomPanelContent({canvasFactory: recorder.canvasFactory, fontSet: {load: () => new Promise(resolve => delayed.push(resolve))}, onChange: () => changes++});
  later.dispose();
  delayed.forEach(resolve => resolve([{}]));
  await later.ready;
  assert.equal(changes, 1, 'late font completion must not draw disposed content');
});
