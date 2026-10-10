import * as T from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { roomVertex, smokeFragment, beamFragment } from './room-shaders.js';

/** Broad studio sources define the paint, roof line and glass as real surfaces. */
export function buildRoomLights(view) {
  RectAreaLightUniformsLib.init();
  view.scene.add(new T.HemisphereLight(0xcbd4e2, 0x160c0e, .105));
  view.key = new T.DirectionalLight(0xfff1e8, 1.7);
  view.key.position.set(-3.5, 8, -4); view.key.castShadow = true;
  Object.assign(view.key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 26 });
  view.key.shadow.bias = -.00025; view.key.shadow.normalBias = .012;
  view.key.shadow.mapSize.set(1536, 1536); view.scene.add(view.key);
  const sources = [
    [0xf8f6ff, 20, 7.2, .75, [-2, 6.1, -3.5], [0, .65, 0]],
    [0xfff2eb, 5, 4.5, .6, [4, 4.7, -2], [0, .8, 0]],
    [0xff0923, 14, 7, .5, [0, 2.8, 4], [0, .65, 0]],
    [0xff1a25, 5.5, 5, .7, [-5, 2.8, -.5], [0, .7, 0]],
    [0xc1d8ff, 8, 1.2, 3.8, [6.5, 3.8, 0], [0, 1.1, 0]],
  ];
  for (const [color, intensity, width, height, position, target] of sources) {
    const light = new T.RectAreaLight(color, intensity, width, height);
    light.position.set(...position); light.lookAt(...target); view.scene.add(light);
  }
  const spot = new T.SpotLight(0xdceaff, 115, 22, .31, .82, 2);
  spot.position.set(0, 7.48, .1); spot.target.position.set(0, .15, .1);
  view.scene.add(spot, spot.target);
  // One precompiled light follows the active surface; no light-count changes
  // or new shader programs occur when the user enters or hovers a screen.
  view.screenLight = new T.PointLight(0xff1637, 0, 5.8, 2);
  view.scene.add(view.screenLight);
  view.renderer.shadowMap.needsUpdate = true;
}

/** Add softbox shapes to the bounded PMREM used by reflective materials. */
export function dressStudioEnvironment(room) {
  if (room.userData.dxtDarkStudio) return;
  room.userData.dxtDarkStudio = true;
  // Dim inherited white fill before adding the authored reflection strips.
  // This uses the existing one-time PMREM capture, not another render pass.
  const materials = new Set();
  room.traverse(object => {
    if (object.isLight) object.intensity *= .5;
    for (const material of [object.material].flat()) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      if (material.isMeshStandardMaterial) material.color.multiplyScalar(.5);
      if (typeof material.emissiveIntensity === 'number') material.emissiveIntensity *= .45;
    }
  });
  const geometry = new T.PlaneGeometry(1, 1);
  for (const [color, width, height, position, target] of [
    [[7.8, 7.7, 8], 7.2, .75, [-2, 6, -4], [0, 1, 0]],
    [[3.5, 4.8, 6.8], 1, 4.5, [7, 3, 0], [0, 1, 0]],
    [[6.2, .018, .045], 7.5, .45, [0, 3, 6], [0, 1, 0]],
    [[2.1, .009, .02], 3, 1.1, [-7, 2, 0], [0, 1, 0]],
  ]) {
    const material = new T.MeshBasicMaterial({ color: new T.Color(...color), side: T.DoubleSide, toneMapped: false });
    const card = new T.Mesh(geometry, material);
    card.scale.set(width, height, 1); card.position.set(...position); card.lookAt(...target); room.add(card);
  }
}

export function buildRoomAtmosphere(view) {
  view.smokes = [];
  let seed = 829;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 20; i++) {
    const x = (i % 2 ? 1 : -1) * (2.7 + random() * 2), z = -1 + random() * 3.8, y = .4 + random() * .8;
    const material = new T.ShaderMaterial({
      vertexShader: roomVertex, fragmentShader: smokeFragment,
      uniforms: { smokeDetail: { value: view.settings?.quality==='low'?2:4 }, time: { value: 0 }, seed: { value: random() * 19 }, density: { value: .42 + random() * .24 }, tint: { value: new T.Color(i % 4 === 0 ? 0x926168 : 0x8493a7) } },
      transparent: true, depthWrite: false, side: T.DoubleSide,
    });
    const mesh = new T.Mesh(new T.PlaneGeometry(2.6 + random() * 1.3, 1.5 + random() * .8), material);
    mesh.position.set(x, y, z); mesh.userData.base = mesh.position.clone(); mesh.userData.phase = random() * Math.PI * 2;
    mesh.renderOrder = 3; view.scene.add(mesh); view.smokes.push(mesh);
  }
  // A single world-space cone replaces five camera-facing light billboards.
  // The fragment shader integrates only the finite ray/cone segment.
  const apex = new T.Vector3(0, 7.55, .1), floor = .12, radius = 2.18;
  const beam = new T.Mesh(new T.ConeGeometry(radius, apex.y - floor, 48, 1, false), new T.ShaderMaterial({
    vertexShader: roomVertex, fragmentShader: beamFragment,
    uniforms: { time: { value: 0 }, apex: { value: apex }, bottom: { value: floor }, slope: { value: radius / (apex.y - floor) }, beamSamples: { value: view.settings?.quality === 'high' ? 32 : view.settings?.quality === 'low' ? 12 : 20 } },
    transparent: true, depthWrite: false, side: T.BackSide, blending: T.AdditiveBlending,
  }));
  beam.name = 'Overhead light volume'; beam.position.set(apex.x, (apex.y + floor) / 2, apex.z); beam.renderOrder = 4;
  view.scene.add(beam); view.beams = [beam];
  const positions = [];
  for (let i = 0; i < 160; i++) positions.push((random() - .5) * 10, .25 + random() * 6.4, (random() - .5) * 6);
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  view.dust = new T.Points(geometry, new T.PointsMaterial({ color: 0xb8c5dc, size: .014, transparent: true, opacity: .28, depthWrite: false }));
  view.scene.add(view.dust);
}

export function updateRoomAtmosphere(view) {
  for (const smoke of view.smokes) {
    if(!smoke.visible)continue;
    smoke.quaternion.copy(view.camera.quaternion); smoke.material.uniforms.time.value = view.time;
    smoke.position.x = smoke.userData.base.x + Math.sin(view.time * .18 + smoke.userData.phase) * .23;
    smoke.position.y = smoke.userData.base.y + Math.sin(view.time * .23 + smoke.userData.phase) * .07;
  }
  for (const beam of view.beams) beam.material.uniforms.time.value = view.time;
  view.dust.rotation.y = view.time * .009; view.ground.material.uniforms.time.value = view.time;
}
