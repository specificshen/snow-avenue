import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { atDepth, ground, widthAt, shot } from "./camera";
import { palettes, type TreeSpec } from "./layout";
import { params, rng } from "./params";
import { leafClump } from "./textures";

const bark = new THREE.Color("#2a2420"), snowWhite = new THREE.Color("#eef0f4");
const up = new THREE.Vector3(0, 1, 0);

/** Tapered cylinder from a to b, vertex-coloured with snow on upward faces. */
function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, snow: number, rand: () => number) {
  const len = a.distanceTo(b), segs = r0 > 0.08 ? 8 : 5;
  const geo = new THREE.CylinderGeometry(r1, r0, len, segs, 1, true).toNonIndexed();
  geo.translate(0, len / 2, 0);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize()));
  geo.translate(a.x, a.y, a.z);
  geo.computeVertexNormals();
  const n = geo.attributes.normal, col = new Float32Array(n.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < n.count; i++) {
    const s = THREE.MathUtils.smoothstep(n.getY(i), 0.25, 0.7) * snow * (0.6 + rand() * 0.6);
    tmp.copy(bark).lerp(snowWhite, Math.min(1, s)).toArray(col, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.deleteAttribute("uv");
  return geo;
}

export type BuiltTree = { wood: THREE.BufferGeometry[]; leaves: { pos: THREE.Vector3; size: number; color: THREE.Color; rot: number }[] };

export function buildTree(spec: TreeSpec, seed: number): BuiltTree {
  const rand = rng(seed);
  const wood: THREE.BufferGeometry[] = [];
  const leaves: BuiltTree["leaves"] = [];
  const base = ground(spec.u, spec.vBase);
  const depth = -base.z;
  const wpu = widthAt(depth);
  const blobs = spec.canopy.map((b) => ({ c: atDepth(b.u, b.v, (b.depth ?? depth) + (rand() - 0.5) * 2), r: b.r * widthAt(b.depth ?? depth), own: b.depth !== undefined && b.depth > depth + 5 }));
  const snow = spec.snow * 4;
  let top: THREE.Vector3 | null = null;
  {
    const r0 = Math.max(0.05, spec.trunk * wpu * 1.4);
    const hTop = blobs.reduce((m, b) => Math.min(m, b.c.y), 99) * 0.95;
    top = base.clone().add(new THREE.Vector3((spec.lean ?? 0) * hTop, hTop, 0));
    const mid = base.clone().lerp(top, 0.5).add(new THREE.Vector3((rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3));
    wood.push(limb(base.clone().setY(-0.2), mid, r0 * 1.15, r0 * 0.85, snow * 0.3, rand), limb(mid, top, r0 * 0.85, r0 * 0.6, snow * 0.3, rand));
  }
  for (const b of blobs) {
    let root = top;
    if (b.own || !top) {
      const foot = new THREE.Vector3(b.c.x + (rand() - 0.5) * b.r * 0.4, -0.2, b.c.z);
      root = foot.clone().setY(Math.max(3, b.c.y - b.r * 1.6));
      wood.push(limb(foot, root, 0.4, 0.25, snow * 0.3, rand));
    }
    const nBranch = Math.max(3, Math.round(b.r * 2.2 * (spec.branchiness ?? 1)));
    for (let i = 0; i < nBranch; i++) {
      const tip = b.c.clone().add(new THREE.Vector3((rand() - 0.5) * b.r * 1.6, (rand() - 0.3) * b.r, (rand() - 0.5) * b.r * 1.2));
      const from = root!.clone().lerp(root!.clone().setY(root!.y * 0.6), rand() * 0.4);
      const r0 = root === top ? Math.max(0.03, spec.trunk * wpu * 0.45) : 0.1;
      const knee = from.clone().lerp(tip, 0.5).add(new THREE.Vector3((rand() - 0.5) * b.r * 0.5, b.r * 0.2, (rand() - 0.5) * b.r * 0.3));
      wood.push(limb(from, knee, r0, r0 * 0.6, snow, rand), limb(knee, tip, r0 * 0.6, 0.012, snow, rand));
      const twigN = (spec.branchiness ?? 1) > 1.5 ? 8 : 3;
      for (let k = 0; k < twigN; k++) {
        const t = knee.clone().lerp(tip, 0.15 + rand() * 0.7);
        const twig = t.clone().add(new THREE.Vector3((rand() - 0.5) * b.r * 1.1, rand() * b.r * 0.7, (rand() - 0.5) * b.r * 0.7));
        wood.push(limb(t, twig, r0 * 0.28, 0.006, snow * 1.3, rand));
        if ((spec.branchiness ?? 1) > 1.5 && rand() < 0.55) {
          const tw2 = twig.clone().add(new THREE.Vector3((rand() - 0.5) * b.r * 0.7, rand() * b.r * 0.4, (rand() - 0.5) * b.r * 0.5));
          wood.push(limb(twig, tw2, 0.01, 0.004, snow * 1.6, rand));
        }
      }
    }
    const count = Math.round(b.r * b.r * 52 * params.density * (spec.leafiness ?? 1) / spec.leafSize);
    for (let i = 0; i < count; i++) {
      const d = new THREE.Vector3().randomDirection().multiplyScalar(Math.pow(rand(), 0.35));
      d.y *= 0.85;
      const pos = b.c.clone().addScaledVector(d, b.r);
      const col = new THREE.Color(spec.palette[Math.floor(rand() * spec.palette.length)]);
      const shade = 0.82 + 0.25 * (d.y * 0.5 + 0.5);
      col.multiplyScalar(shade);
      if (rand() < spec.snow * (d.y > 0 ? 1.3 : 0.4)) col.lerp(snowWhite, 0.55 + rand() * 0.3);
      leaves.push({ pos, size: spec.leafSize * 0.7 * (0.75 + rand() * 0.5) * (1 + depth / 40), color: col, rot: rand() * 6.28 });
    }
  }
  return { wood, leaves };
}

/** One draw for every leaf card in the scene, cards face the camera with jitter. */
export function leafMesh(all: BuiltTree["leaves"], seed: number) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mats = [true, false].map((maple, i) =>
    new THREE.MeshBasicMaterial({ map: leafClump(seed + i, maple), alphaTest: 0.2, transparent: true, depthWrite: true, side: THREE.DoubleSide }));
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  mats.forEach((mat, mi) => {
    const mine = all.filter((_, i) => i % 2 === mi);
    const mesh = new THREE.InstancedMesh(geo, mat, mine.length);
    mine.forEach((l, i) => {
      const toCam = Math.atan2(shot.eye.x - l.pos.x, shot.eye.z - l.pos.z);
      e.set((l.rot - 3.14) * 0.25, toCam + (l.rot - 3.14) * 0.3, l.rot);
      m.compose(l.pos, q.setFromEuler(e), s.setScalar(l.size));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, l.color);
    });
    group.add(mesh);
  });
  return group;
}

export function woodMesh(geos: THREE.BufferGeometry[]) {
  return new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
}

/** A generic snowy avenue tree placed by world position (for the fogged distance). */
export function buildFarTree(base: THREE.Vector3, seed: number, side: number): BuiltTree {
  const rand = rng(seed), wood: THREE.BufferGeometry[] = [], leaves: BuiltTree["leaves"] = [];
  const h = 7 + rand() * 4, top = base.clone().add(new THREE.Vector3(side * 0.6, h, 0));
  wood.push(limb(base.clone().setY(-0.2), top, 0.22, 0.1, 0.4, rand));
  for (let i = 0; i < 16; i++) {
    const from = base.clone().lerp(top, 0.4 + rand() * 0.55);
    const tip = from.clone().add(new THREE.Vector3((rand() - 0.5 - side * 0.3) * 7, 1.5 + rand() * 4, (rand() - 0.5) * 4));
    wood.push(limb(from, tip, 0.07, 0.012, 1.8, rand));
    for (let t = 0; t < 4; t++) {
      const a = from.clone().lerp(tip, 0.3 + rand() * 0.6);
      wood.push(limb(a, a.clone().add(new THREE.Vector3((rand()-0.5)*2.5, rand()*2, (rand()-0.5)*2)), 0.02, 0.005, 2.0, rand));
    }
    for (let k = 0; k < 5 * params.density; k++) {
      const col = new THREE.Color(palettes.ochre[Math.floor(rand() * palettes.ochre.length)]);
      if (rand() < 0.45) col.lerp(snowWhite, 0.6);
      leaves.push({ pos: from.clone().lerp(tip, 0.4 + rand() * 0.7).add(new THREE.Vector3().randomDirection().multiplyScalar(1.1)), size: 1.1, color: col, rot: rand() * 6.28 });
    }
  }
  return { wood, leaves };
}


/** Mid-fog silhouette fill: sparse snowy twigs so the bright fog band is not empty. */
export function fogBranchFill(seed: number): THREE.BufferGeometry[] {
  const rand = rng(seed), wood: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 40; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -30 - rand() * 85;
    const x = side * (4 + rand() * 9);
    const base = new THREE.Vector3(x, -0.1, z);
    const h = 7 + rand() * 9;
    const top = base.clone().add(new THREE.Vector3(side * rand(), h, (rand() - 0.5) * 3));
    wood.push(limb(base, top, 0.05, 0.018, 1.8, rand));
    for (let k = 0; k < 6; k++) {
      const from = base.clone().lerp(top, 0.3 + rand() * 0.6);
      const tip = from.clone().add(new THREE.Vector3((rand() - 0.5) * 5, (rand() - 0.2) * 3.5, (rand() - 0.5) * 4));
      wood.push(limb(from, tip, 0.016, 0.005, 2.2, rand));
    }
  }
  return wood;
}

/** Right-side snowy twig accents (photo: fine frosted branch web). */
export function rightTwigWeb(seed: number): THREE.BufferGeometry[] {
  const rand = rng(seed), wood: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 14; i++) {
    const u = 0.62 + rand() * 0.35;
    const depth = 14 + rand() * 40;
    const base = new THREE.Vector3(atDepth(u, 0.5, depth).x, -0.05, -depth);
    const h = 6 + rand() * 10;
    const top = base.clone().add(new THREE.Vector3(-0.5 - rand(), h, (rand() - 0.5) * 2));
    wood.push(limb(base, top, 0.035, 0.01, 2.5, rand));
    for (let k = 0; k < 9; k++) {
      const from = base.clone().lerp(top, 0.25 + rand() * 0.7);
      const tip = from.clone().add(new THREE.Vector3(-0.8 - rand() * 3.5, (rand() - 0.15) * 2.8, (rand() - 0.5) * 2.5));
      wood.push(limb(from, tip, 0.012, 0.004, 2.8, rand));
    }
  }
  return wood;
}
