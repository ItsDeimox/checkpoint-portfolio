import { Vector2, Vector3 } from 'three';

export const HOLOGRAM_LAYERS = Object.freeze([
  Object.freeze({ lanes: 11, cells: 3.4, speed: -.17, depth: .014, weight: .42 }),
  Object.freeze({ lanes: 17, cells: 4.8, speed: .29, depth: .035, weight: .60 }),
  Object.freeze({ lanes: 7, cells: 2.7, speed: -.075, depth: .061, weight: .36 }),
]);
const number = value => Number.isInteger(value) ? `${value}.0` : String(value);
const layerCalls = HOLOGRAM_LAYERS.map(({lanes,cells,speed,depth,weight}, i) =>
  `holoLanes(p + shift * ${number(depth)}, ${number(lanes)}, ${number(cells)}, ${number(speed)}, ${number(i + 1)}) * ${number(weight)}`
).join(' +\n    ');

const FUNCTIONS = /* glsl */`
// DXT_HOLOGRAM_V2: emissive layers, never vertex displacement.
uniform vec2 holoView;
uniform float musicTreble;
float holoScanDistance(vec2 p) { return abs(p.y - fract(hoverTime * .19 + .07)); }
vec2 holoWarp(vec2 p) {
  float activity = hover * pow(1. - contentMix, 2.);
  float band = exp(-pow(holoScanDistance(p) * 35., 2.));
  float tear = (noise2(vec2(p.y * 85., hoverTime * 1.1)) - .5) * .017;
  tear += sin(p.y * 170. + hoverTime * 7.) * .0028;
  float edge = smoothstep(0., .05, min(min(p.x,1.-p.x),min(p.y,1.-p.y)));
  return vec2(tear, sin(p.x * 55. - hoverTime * 2.) * .0013) * band * activity * edge;
}
vec2 holoLanes(vec2 p, float rows, float columns, float speed, float seed) {
  // Segments depend on X as well as Y, so horizontal travel is genuinely visible.
  vec2 q = p * vec2(columns, rows);
  float row = floor(q.y), random = hash21(vec2(row, seed));
  float y = abs(fract(q.y) - mix(.30, .70, random));
  float footprint = max(fwidth(q.y), .008);
  float line = 1. - smoothstep(.012, .012 + footprint * .8, y);
  float halo = exp(-y * 16.);
  float x = fract(q.x - hoverTime * speed + random * 4.);
  float ends = smoothstep(.05, .12, x) * (1. - smoothstep(.39 + random * .22, .50 + random * .22, x));
  float gate = step(.24, random);
  float tracer = exp(-pow((x - .18) * 29., 2.));
  return vec2(line * (ends + tracer * .75), halo * ends) * gate;
}
vec3 holoLight(vec2 p) {
  float activity = (hover + musicTreble * .16 * (1. - hover)) * (1. - contentMix * .94);
  vec2 shift = holoView + (hoverUv - .5) * .65;
  vec2 streams = ${layerCalls};
  float scanDistance = holoScanDistance(p);
  // Approximately one screen pixel at the core, with a separate soft halo.
  float pixel = max(fwidth(p.y), .00025);
  float scan = 1. - smoothstep(pixel * .22, pixel * .85, scanDistance);
  float scanGlow = exp(-scanDistance * 100.);
  float edge = min(min(p.x,1.-p.x),min(p.y,1.-p.y));
  float edgeCore = exp(-edge * 180.);
  float cursorGlow = exp(-dot(vUv-hoverUv,vUv-hoverUv) * 15.);
  float edgeFade = smoothstep(0., .012, edge);
  vec3 core = vec3(2.65,.018,.058) * (streams.x * .48 * edgeFade + scan * .72 + edgeCore * .35);
  vec3 halo = vec3(.34,.002,.014) * (streams.y * .8 + scanGlow * .75 + cursorGlow * .28);
  return (core + halo) * activity * (1. + musicTreble * .5);
}
`;

/** Patch the stable display shader once, preserving its artwork repair and fog. */
export function configurePanelHologram(panel) {
  if (panel.hologram) return;
  const material = panel.material;
  const original = material.fragmentShader;
  const projection = 'vec3 h=projection*vec3(p,1.);';
  const overlayStart = original.indexOf('float halo=');
  const overlayEnd = original.indexOf('gl_FragColor=vec4(c,1.);', overlayStart);
  if (!original.includes(projection) || overlayStart < 0 || overlayEnd < 0) {
    throw new Error('Unsupported display shader: hologram anchors changed.');
  }
  let shader = original.slice(0, overlayStart)
    + 'c *= 1. + hover * .12 * (1. - contentMix);\nc += holoLight(p);\n'
    + original.slice(overlayEnd);
  shader = shader.replace('float foregroundRoof(', `${FUNCTIONS}\nfloat foregroundRoof(`)
    .replace(projection, 'vec2 artUv=clamp(p+holoWarp(p),vec2(.001),vec2(.999));vec3 h=projection*vec3(artUv,1.);');
  material.uniforms.holoView = {value: new Vector2()};
  material.uniforms.musicTreble = {value: 0};
  material.fragmentShader = shader;
  material.needsUpdate = true;
  panel.hologram = {
    eye: new Vector3(), right: new Vector3().crossVectors(new Vector3(0,1,0),panel.normal).normalize(),
  };
}

export function updateHologramView(panel, cameraPosition) {
  if (!panel.hologram) return;
  const {eye,right} = panel.hologram;
  eye.copy(cameraPosition).sub(panel.center).normalize();
  const forward = Math.max(.35, Math.abs(eye.dot(panel.normal)));
  panel.material.uniforms.holoView.value.set(
    Math.max(-1,Math.min(1,eye.dot(right)/forward)),
    Math.max(-1,Math.min(1,eye.y/forward)),
  );
}
