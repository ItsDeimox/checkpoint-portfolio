import * as T from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';

export const TURNTABLE_CENTER = Object.freeze([0, 0, 1.458534911]);
export const TURNTABLE_RADIUS = 5.17;
const TAU = Math.PI * 2;

/** Rotates only the authored car/platform, never the room or camera. */
export class RoomTurntable {
  constructor() {
    this.group = new T.Group(); this.group.name = 'Car and rotating platform';
    this.group.position.set(...TURNTABLE_CENTER);
    this.angle = this.target = this.velocity = this.frameDelta = 0;
    this.dragging = this.moving = false;
  }
  mount(scene, objects) {
    scene.add(this.group); scene.updateMatrixWorld(true);
    for (const object of objects) if (object) this.group.attach(object);
  }
  begin() { this.dragging = true; this.velocity = 0; this.target = this.angle; }
  movePixels(delta, width) {
    if (!this.dragging || !Number.isFinite(delta) || !Number.isFinite(width) || width <= 0) return;
    this.target += T.MathUtils.clamp(delta / width, -.2, .2) * TAU;
    this.moving = true;
  }
  end(inertia = true) {
    this.dragging = false; this.target = this.angle;
    if (!inertia) this.velocity = 0;
    this.moving = Math.abs(this.velocity) > .002;
  }
  update(deltaTime) {
    this.frameDelta = 0;
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) return false;
    if(!this.dragging&&this.velocity===0){this.moving=false;return false;}
    const dt = Math.min(deltaTime, .05), before = this.angle;
    if (this.dragging) {
      const step = (this.target - this.angle) * (1 - Math.exp(-22 * dt));
      this.frameDelta = T.MathUtils.clamp(step, -2.8 * dt, 2.8 * dt);
      this.angle += this.frameDelta; this.velocity = this.frameDelta / dt;
    } else {
      const decay = Math.exp(-6.5 * dt);
      this.angle += this.velocity * (1 - decay) / 6.5;
      this.velocity *= decay;
      if (Math.abs(this.velocity) < .002) this.velocity = 0;
    }
    this.frameDelta = this.angle - before;
    this.group.rotation.y = this.angle;
    this.group.updateWorldMatrix(true, true);
    this.moving = this.dragging ? Math.abs(this.target - this.angle) > .00001 : this.velocity !== 0;
    return Math.abs(this.frameDelta) > .000001;
  }
}

/** Isolated moving-object velocity capture. Shared geometry, no duplicate buffers.
 * Camera/world reprojection follows the depth-based approach in GPU Gems 3, ch.27.
 * Only runs during turntable motion. The lens rejects samples behind scene depth.
 */
export class TurntableMotionPass extends Pass {
  constructor(root, camera, hdr = true) {
    super(); this.needsSwap = false; this.enabled = false; this.camera = camera;
    this.scene = new T.Scene(); this.links = [];
    this.target = new T.WebGLRenderTarget(1, 1, {
      type: hdr ? T.HalfFloatType : T.UnsignedByteType,
      minFilter: T.NearestFilter, magFilter: T.NearestFilter,
      depthBuffer: true, stencilBuffer: false,
    });
    this.target.texture.name = 'DXT.TurntableVelocity';
    this.material = new T.ShaderMaterial({
      name: 'DXT.TurntableVelocity', side: T.DoubleSide, blending: T.NoBlending, toneMapped: false,
      uniforms: { previousVP: { value: new T.Matrix4() }, previousObject: { value: new T.Matrix4() }, farPlane: { value: camera.far } },
      vertexShader: `varying vec4 currentClip; varying vec4 previousClip; varying float distanceToEye;
        uniform mat4 previousVP; uniform mat4 previousObject;
        void main(){vec4 world=modelMatrix*vec4(position,1.);vec4 view=modelViewMatrix*vec4(position,1.);
        currentClip=projectionMatrix*view;previousClip=previousVP*previousObject*world;distanceToEye=-view.z;gl_Position=currentClip;}`,
      fragmentShader: `precision highp float;varying vec4 currentClip;varying vec4 previousClip;varying float distanceToEye;uniform float farPlane;
        void main(){vec2 velocity=vec2(0.);if(previousClip.w>0.)velocity=(currentClip.xy/currentClip.w-previousClip.xy/previousClip.w)*.5;
        gl_FragColor=vec4(velocity*.5+.5,clamp(distanceToEye/farPlane,0.,1.),1.);}`,
    });
    root.traverse(source => {
      if (!source.isMesh || !source.visible) return;
      if ([source.material].flat().every(m => m.transparent && m.opacity < .5)) return;
      const proxy = new T.Mesh(source.geometry, this.material);proxy.matrixAutoUpdate = false;
      proxy.frustumCulled = true; this.scene.add(proxy);this.links.push({source,proxy});
    });
    // The actual floor remains one reflector; its central material domain rotates.
    this.diskGeometry = new T.CircleGeometry(TURNTABLE_RADIUS, 96);
    this.disk = new T.Mesh(this.diskGeometry, this.material);
    this.disk.rotation.x = -Math.PI / 2;this.disk.position.set(0,.024,TURNTABLE_CENTER[2]);this.scene.add(this.disk);
    this.previousTransform = new T.Matrix4(); this.rotation = new T.Matrix4();this.translation = new T.Matrix4();
    this.clearColor = new T.Color();
  }
  setSize(width, height) {
    const scale = Math.min(.5, 768 / Math.max(width,height));
    this.target.setSize(Math.max(2,Math.round(width*scale)),Math.max(2,Math.round(height*scale)));
  }
  prepare(previousVP, angleDelta) {
    for (const {source,proxy} of this.links) { source.updateWorldMatrix(true,false);proxy.matrix.copy(source.matrixWorld); }
    const [x,y,z] = TURNTABLE_CENTER;
    this.previousTransform.makeTranslation(x,y,z).multiply(this.rotation.makeRotationY(-angleDelta))
      .multiply(this.translation.makeTranslation(-x,-y,-z));
    this.material.uniforms.previousVP.value.copy(previousVP);
    this.material.uniforms.previousObject.value.copy(this.previousTransform);
    this.material.uniforms.farPlane.value = this.camera.far;
  }
  render(renderer) {
    const previousTarget=renderer.getRenderTarget(),autoClear=renderer.autoClear;
    renderer.getClearColor(this.clearColor);const alpha=renderer.getClearAlpha();
    try {renderer.autoClear=false;renderer.setRenderTarget(this.target);renderer.setClearColor(0,0);
      renderer.clear(true,true,false);renderer.render(this.scene,this.camera);
    } finally {renderer.setClearColor(this.clearColor,alpha);renderer.setRenderTarget(previousTarget);renderer.autoClear=autoClear;}
  }
  dispose() { this.target.dispose();this.material.dispose();this.diskGeometry.dispose();this.links=[]; }
}
