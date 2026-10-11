import * as THREE from "three";
/** Photo-matched camera: level eye, lens shift puts the vanishing point where the photo has it. */
export const shot = { aspect: 641 / 1228, eye: new THREE.Vector3(-0.1, 1.6, 0), vfov: 78, vanish: { u: 0.537, v: 0.752 } };

export class ShotCamera extends THREE.PerspectiveCamera {
  constructor() {
    super(shot.vfov, shot.aspect, 0.1, 400);
    this.position.copy(shot.eye);
    this.lookAt(shot.eye.x, shot.eye.y, -1);
    this.updateProjectionMatrix();
  }
  override updateProjectionMatrix() {
    super.updateProjectionMatrix();
    if (!shot) return;
    const e = this.projectionMatrix.elements;
    e[8] = -(shot.vanish.u * 2 - 1);
    e[9] = -(1 - shot.vanish.v * 2);
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
}
const cam = new ShotCamera();
cam.updateMatrixWorld();
function ray(u: number, v: number) {
  const p = new THREE.Vector3(u * 2 - 1, 1 - v * 2, 0.5).unproject(cam);
  return p.sub(cam.position).normalize();
}
/** Ground point under photo pixel (u,v). */
export function ground(u: number, v: number) {
  const d = ray(u, v);
  if (d.y > -1e-3) throw new Error(`ground(${u},${v}) is at or above the horizon`);
  return cam.position.clone().addScaledVector(d, -cam.position.y / d.y);
}
/** Point under photo pixel (u,v) at distance `depth` along -z. */
export function atDepth(u: number, v: number, depth: number) {
  const d = ray(u, v);
  return cam.position.clone().addScaledVector(d, depth / -d.z);
}
/** World metres per photo-width unit at a depth. */
export function widthAt(depth: number) {
  return atDepth(1, 0.5, depth).x - atDepth(0, 0.5, depth).x;
}
