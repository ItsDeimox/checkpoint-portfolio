import {CanvasTexture, SRGBColorSpace} from 'three';
import {ROOM_PANELS, BACK_ACTION} from '../pages/room-panel-data.js';

const SIZE = 1024;
const HEADING = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const BODY = '"Barlow", Arial, sans-serif';
const FONT_REQUESTS = ['600 96px "Barlow Condensed"', '500 38px "Barlow"'];

function setFont(context, size, heading = false) {
  context.font = (heading ? '600 ' : '500 ') + size + 'px ' + (heading ? HEADING : BODY);
}

function fittedText(context, value, x, y, width, size, minimum = size, heading = false) {
  setFont(context, size, heading);
  while (context.measureText(value).width > width && size > minimum) setFont(context, --size, heading);
  context.fillText(value, x, y);
}

function wrappedText(context, value, x, y, width, size, lineHeight, heading = false) {
  setFont(context, size, heading);
  let line = '';
  for (const word of value.split(/\s+/)) {
    const next = line ? line + ' ' + word : word;
    if (line && context.measureText(next).width > width) {
      context.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else line = next;
  }
  if (line) context.fillText(line, x, y);
  return y + lineHeight;
}

function createRegions(panel) {
  const count = panel.options.length;
  const height = count === 4 ? 140 : count === 3 ? 148 : count === 2 ? 176 : 160;
  const gap = count === 2 ? 20 : 16;
  const top = 948 - height * count - gap * (count - 1);
  return [
    {action: BACK_ACTION, x: 742, y: 44, width: 216, height: 104},
    ...panel.options.map((action, index) => ({action, x: 64, y: top + index * (height + gap), width: 896, height})),
  ];
}

function drawArrow(context, x, y, back = false) {
  context.beginPath();
  if (back) {
    context.moveTo(x + 11, y - 10);context.lineTo(x + 1, y);context.lineTo(x + 11, y + 10);
    context.moveTo(x + 2, y);context.lineTo(x + 25, y);
  } else {
    context.moveTo(x - 13, y + 13);context.lineTo(x + 13, y - 13);
    context.moveTo(x - 11, y - 13);context.lineTo(x + 13, y - 13);context.lineTo(x + 13, y + 11);
  }
  context.stroke();
}

function paint(entry, panel, index) {
  const context = entry.context;
  context.save();
  context.textAlign = 'left';context.textBaseline = 'alphabetic';context.lineWidth = 2;
  const background = context.createLinearGradient(0, 0, SIZE, SIZE);
  background.addColorStop(0, '#17212c');background.addColorStop(.5, '#0c1119');background.addColorStop(1, '#070a10');
  context.fillStyle = background;context.fillRect(0, 0, SIZE, SIZE);
  context.strokeStyle = '#363c48';context.strokeRect(32, 32, 960, 960);
  context.fillStyle = '#ff3151';context.fillRect(32, 32, 3, 960);context.fillRect(64, 115, 72, 4);
  context.fillStyle = '#cbd0d8';setFont(context, 31);context.fillText('0' + (index + 1) + ' / DXT', 64, 85);

  context.fillStyle = '#fffaf7';
  fittedText(context, panel.title, 64, 234, 896, 96, 72, true);
  context.fillStyle = '#c9cfd8';
  wrappedText(context, panel.description, 64, 286, 896, 30, 40);

  if (panel.status) {
    context.fillStyle = '#ff687d';setFont(context, 32, true);context.fillText(panel.status.toUpperCase(), 64, 418);
  } else if (panel.options.length === 2) {
    context.fillStyle = '#9da8b8';setFont(context, 32, true);context.fillText('ROBLOX COMMUNITIES', 64, 488);
  }
  for (const [itemIndex, item] of panel.upcoming.entries()) {
    const y = 402 + itemIndex * 110;
    context.fillStyle = '#f3f5f9';setFont(context, 44, true);context.fillText(item.name, 64, y);
    context.fillStyle = '#bfc7d3';setFont(context, 28);context.fillText(item.description, 64, y + 39);
    context.fillStyle = '#dd6b7c';context.textAlign = 'right';setFont(context, 24);context.fillText('COMING SOON', 958, y - 2);context.textAlign = 'left';
    context.fillStyle = '#343d49';context.fillRect(64, y + 62, 894, 1);
  }
  let bodyY = 420;
  for (const paragraph of panel.screenCopy) {
    context.fillStyle = '#e4e8ef';bodyY = wrappedText(context, paragraph, 64, bodyY, 896, 38, 52) + 25;
  }

  for (const region of entry.regions) {
    const hovered = entry.hovered === region.action.id;
    const back = region.action.kind === 'back';
    context.fillStyle = hovered ? '#3d2030' : '#171d27';
    context.fillRect(region.x, region.y, region.width, region.height);
    context.strokeStyle = hovered ? '#ff687f' : '#627082';
    context.strokeRect(region.x + 1, region.y + 1, region.width - 2, region.height - 2);
    context.fillStyle = '#fffaf7';
    if (back) {
      setFont(context, 46, true);context.fillText(region.action.title, region.x + 61, region.y + 67);
      context.strokeStyle = hovered ? '#ff91a1' : '#d4dbe5';context.lineWidth = 3;
      drawArrow(context, region.x + 20, region.y + 51, true);
    } else {
      const offset = (region.height - 140) / 2;
      fittedText(context, region.action.title, region.x + 28, region.y + 57 + offset, 754, 54, 44, true);
      context.fillStyle = '#c4cdd9';
      fittedText(context, region.action.detail, region.x + 28, region.y + 102 + offset, 754, 28, 24);
      context.strokeStyle = hovered ? '#ff91a1' : '#ff6079';context.lineWidth = 3;
      drawArrow(context, region.x + region.width - 46, region.y + region.height / 2);
    }
  }
  context.fillStyle = '#a8b2c0';setFont(context, 24);context.fillText('Links open in a new tab', 64, 982);
  context.restore();
}

/**
 * Static canvas artwork bound to the real screen mesh. Normal CanvasTexture
 * flipY maps the canvas top to vUv.y = 1; sample contentMap directly at vUv.
 * A texture is uploaded only on construction, a changed hover, or font readiness.
 */
export class RoomPanelContent {
  constructor({canvasFactory = () => document.createElement('canvas'), onChange = () => {}, fontSet = globalThis.document?.fonts} = {}) {
    this.disposed = false;
    this.onChange = onChange;
    this.entries = ROOM_PANELS.map((panel, index) => {
      const canvas = canvasFactory();canvas.width = canvas.height = SIZE;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The room panel requires a 2D canvas.');
      const entry = {canvas, context, regions: createRegions(panel), hovered: null, texture: null};
      paint(entry, panel, index);
      entry.texture = new CanvasTexture(canvas);
      entry.texture.name = 'DXT.PanelContent.' + index;
      entry.texture.colorSpace = SRGBColorSpace;
      return entry;
    });
    this.textures = Object.freeze(this.entries.map(entry => entry.texture));
    const requests = typeof fontSet?.load === 'function' ? FONT_REQUESTS.map(font => {
      try {return Promise.resolve(fontSet.load(font));} catch (error) {return Promise.reject(error);}
    }) : [];
    this.ready = requests.length ? Promise.allSettled(requests).then(results => {
      if (this.disposed || !results.some(result => result.status === 'fulfilled')) return false;
      this.entries.forEach((entry, index) => this.redraw(index));
      this.onChange();
      return true;
    }) : Promise.resolve(false);
  }

  entry(index) {
    return !this.disposed && Number.isInteger(index) ? this.entries[index] : undefined;
  }

  getTexture(index) {
    return this.entry(index)?.texture || null;
  }

  getActionAtUV(index, uv) {
    const entry = this.entry(index);
    if (!entry || !Number.isFinite(uv?.x) || !Number.isFinite(uv?.y) || uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) return null;
    const x = uv.x * SIZE, y = (1 - uv.y) * SIZE;
    return entry.regions.find(region => x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height)?.action || null;
  }

  redraw(index) {
    const entry = this.entry(index);
    if (!entry) return;
    paint(entry, ROOM_PANELS[index], index);
    entry.texture.needsUpdate = true;
  }

  setHovered(index, action) {
    const entry = this.entry(index);
    if (!entry) return false;
    const id = typeof action === 'string' ? action : action?.id;
    const hovered = entry.regions.some(region => region.action.id === id) ? id : null;
    if (entry.hovered === hovered) return false;
    entry.hovered = hovered;
    this.redraw(index);
    this.onChange();
    return true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.entries.forEach(entry => entry.texture.dispose());
  }
}
