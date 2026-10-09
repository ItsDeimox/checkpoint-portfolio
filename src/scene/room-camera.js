import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { advance, clamp } from '../core.js';

const UP = new Vector3(0, 1, 0);
const LOOK_MATRIX = new Matrix4();
const CAR_FOCUS = new Vector3(0, 1.25, -.4);

export function overviewPose(width) {
  const mobile = width < 741;
  return {
    position: new Vector3(0, mobile ? 1.88 : 1.48, mobile ? -23.5 : -12),
    target: new Vector3(0, mobile ? 2.26 : 2.20, 0),
    fov: 42,
  };
}

export function panelApproachPose(panel, width, aspect) {
  const home = overviewPose(width);
  const mobile = width < 741;
  const index = Number.isInteger(panel.index) ? panel.index : 2;
  let fraction = (mobile ? [.4, .6, .65, .6, .4] : [.25, .45, .55, .45, .25])[index];
  const position = new Vector3();
  const target = panel.center.clone();
  let requiredFov;
  // Portrait screens need more distance. Solve the framing instead of clipping
  // the screen by simply clamping a lens that cannot contain all four corners.
  for (let attempt = 0; attempt < 60; attempt++) {
    position.copy(home.position).lerp(panel.center, fraction);
    // A portrait framing setback flattens the sightline toward the lower
    // screen. Raise the eye with that setback to keep it above the roof.
    const minimumHeight = mobile ? Math.min(4, 3.5 + Math.max(0, -position.z - 5) * .1) : 3.15;
    position.y = Math.max(minimumHeight, position.y);
    const rotation = new Quaternion().setFromRotationMatrix(LOOK_MATRIX.lookAt(position, target, UP));
    const inverse = rotation.invert();
    let slope = 0;
    for (const corner of panel.corners) {
      const p = corner.clone().sub(position).applyQuaternion(inverse);
      const depth = Math.max(.1, -p.z);
      slope = Math.max(slope, Math.abs(p.y) / depth, Math.abs(p.x) / depth / Math.max(.1, aspect));
    }
    requiredFov = MathUtils.radToDeg(2 * Math.atan(slope / .78));
    if (requiredFov <= 62) break;
    fraction -= .035;
  }
  const fov = Math.max(35, requiredFov);
  return { position, target, fov };
}

/** Owns only the camera. Display transforms are never part of this controller. */
export class RoomCamera {
  constructor(camera, width = 1440) {
    this.camera = camera;
    this.width = width;
    this.mode = 'overview';
    this.yaw = this.targetYaw = this.pitch = this.targetPitch = 0;
    this.focusTarget = CAR_FOCUS.clone();
    this.transition = null;
    this.applyOverview();
  }

  applyOverview() {
    const home = overviewPose(this.width);
    this.camera.position.copy(home.position);
    const direction = home.target.sub(home.position).normalize();
    const basePitch = Math.asin(direction.y);
    const angle = basePitch + this.pitch;
    direction.set(Math.sin(this.yaw) * Math.cos(angle), Math.sin(angle), Math.cos(this.yaw) * Math.cos(angle));
    this.camera.lookAt(home.position.clone().add(direction));
    this.setFov(home.fov);
    this.camera.updateMatrixWorld(true);
  }

  setFov(fov) {
    if (Math.abs(this.camera.fov - fov) < .000001) return;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  look(deltaYaw, deltaPitch) {
    if (this.mode !== 'overview') return;
    this.targetYaw = clamp(this.targetYaw + deltaYaw, -.48, .48);
    this.targetPitch = clamp(this.targetPitch + deltaPitch, -.15, .18);
  }

  preview(panel) {
    if (this.mode !== 'overview') return;
    const home = overviewPose(this.width);
    const d = panel.center.clone().sub(home.position);
    this.targetYaw = clamp(Math.atan2(d.x, d.z), -.48, .48);
    this.targetPitch = 0;
  }

  moveTo(pose, mode, duration, onComplete) {
    const start = this.camera.position.clone();
    const end = pose.position.clone();
    const control1 = start.clone().lerp(end, .25);
    const control2 = start.clone().lerp(end, .72);
    // A shallow elevated arc clears the car in both directions. It stays in
    // the near half of the room and never crosses a panel or a side wall.
    control1.y = Math.max(start.y, end.y, 4.4);
    control2.y = Math.max(start.y, end.y, 4.4);
    this.mode = mode;
    this.transition = {
      elapsed: 0, duration, start, end, control1, control2,
      rotation: this.camera.quaternion.clone(),
      endRotation: new Quaternion().setFromRotationMatrix(LOOK_MATRIX.lookAt(end, pose.target, UP)),
      fov: this.camera.fov, endFov: pose.fov,
      focus: this.focusTarget.clone(), endFocus: mode === 'returning' ? CAR_FOCUS.clone() : pose.target.clone(),
      onComplete,
    };
    if (duration === 0) this.update(0);
  }

  approach(panel, { reduced = false, onComplete } = {}) {
    this.panel = panel;
    this.moveTo(panelApproachPose(panel, this.width, this.camera.aspect), 'approaching', reduced ? 0 : 1.25, () => {
      this.mode = 'focused';
      onComplete?.();
    });
  }

  reset({ reduced = false, onComplete } = {}) {
    this.panel = null;
    this.targetYaw = this.targetPitch = this.yaw = this.pitch = 0;
    this.moveTo(overviewPose(this.width), 'returning', reduced ? 0 : 1.1, () => {
      this.mode = 'overview';
      this.applyOverview();
      onComplete?.();
    });
  }

  resize(width) {
    this.width = width;
    if (this.mode === 'overview') this.applyOverview();
    else if (this.panel) {
      const pose = panelApproachPose(this.panel, width, this.camera.aspect);
      if (this.transition) {
        const complete = this.transition.onComplete;
        this.moveTo(pose, 'approaching', .35, complete);
      } else {
        this.camera.position.copy(pose.position);
        this.camera.lookAt(pose.target);
        this.setFov(pose.fov);
        this.camera.updateMatrixWorld(true);
      }
    } else if (this.transition) {
      this.moveTo(overviewPose(width), 'returning', .35, this.transition.onComplete);
    }
  }

  update(dt) {
    if (this.transition) {
      const t = this.transition;
      t.elapsed += Math.max(0, dt);
      const x = t.duration ? Math.min(1, t.elapsed / t.duration) : 1;
      const s = x * x * x * (x * (x * 6 - 15) + 10);
      const a = 1 - s;
      this.camera.position.copy(t.start).multiplyScalar(a ** 3)
        .addScaledVector(t.control1, 3 * a * a * s)
        .addScaledVector(t.control2, 3 * a * s * s)
        .addScaledVector(t.end, s ** 3);
      this.camera.quaternion.slerpQuaternions(t.rotation, t.endRotation, s);
      this.setFov(MathUtils.lerp(t.fov, t.endFov, s));
      this.focusTarget.lerpVectors(t.focus, t.endFocus, s);
      this.camera.updateMatrixWorld(true);
      if (x === 1) {
        this.transition = null;
        t.onComplete?.();
      }
      return true;
    }
    if (this.mode !== 'overview') return false;
    const moving = Math.abs(this.yaw - this.targetYaw) > .00001 || Math.abs(this.pitch - this.targetPitch) > .00001;
    if (moving) {
      this.yaw = advance(this.yaw, this.targetYaw, 9, dt);
      this.pitch = advance(this.pitch, this.targetPitch, 9, dt);
      this.applyOverview();
    }
    return moving;
  }

  get focusDistance() {
    // DOF takes view-axis depth, not Euclidean distance to an off-axis point.
    return Math.max(.2, -this.focusTarget.clone().applyMatrix4(this.camera.matrixWorldInverse).z);
  }
}
