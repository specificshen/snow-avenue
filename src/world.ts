import * as THREE from "three";
import { atDepth, ground, shot } from "./camera";
import { farRows, fence, lamps, palettes, sky, trees } from "./layout";
import { params, rng } from "./params";
import { roadTextures, snowTexture } from "./textures";
import { buildFarTree, buildTree, leafMesh, woodMesh, type BuiltTree } from "./tree";

const FAR = 260;
export const roadEdges = { left: ground(0, 0.94).x, right: ground(1, 0.93).x };

function road(env: THREE.Texture | null) {
  const { left, right } = roadEdges, w = right - left;
  const { map, rough } = roadTextures(params.seed);
  for (const t of [map, rough]) t.repeat.set(1, FAR / (w * 8));
  const geo = new THREE.PlaneGeometry(w, FAR, 1, 1).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    map, roughnessMap: rough, envMap: env, roughness: 0.6, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.12, envMapIntensity: 0.5,
  }));
  mesh.position.set((left + right) / 2, 0, 4 - FAR / 2);
  return mesh;
}

function verge(side: -1 | 1) {
  const edge = side < 0 ? roadEdges.left : roadEdges.right, w = 40;
  const leaves = side < 0 ? [...palettes.red, "#c86a20", "#a04018"] : ["#b07a40", "#9a6030", "#c89050"];
  const map = snowTexture(params.seed + side, leaves, side < 0 ? 0.8 : 0.6);
  map.repeat.set(w / 3, FAR / 3);
  const geo = new THREE.PlaneGeometry(w, FAR, 40, 200).rotateX(-Math.PI / 2);
  const p = geo.attributes.position, r = rng(9 + side);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + w / 2, y = Math.min(1, x / 0.5) * 0.06 + (r() - 0.5) * 0.03 * Math.min(1, x);
    p.setY(i, y);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, color: side < 0 ? "#c4c4c8" : "#b4aeaa", roughness: 0.85 }));
  mesh.scale.x = side;
  mesh.position.set(edge + (side * w) / 2, 0, 4 - FAR / 2);
  if (side < 0) mesh.material.side = THREE.DoubleSide;
  return mesh;
}

/** Fallen leaves lying on the verges: drifts on the left, a scatter on the right. */
function fallenLeaves() {
  const r = rng(31), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  const drifts = [
    { x: [roadEdges.left - 3.5, roadEdges.left - 0.2], z: [-3, -9], n: 9000, cols: [...palettes.red, "#c25a1a"] },
    { x: [roadEdges.left - 6, roadEdges.left - 0.5], z: [-9, -22], n: 5000, cols: ["#b84a1a", "#c87024", "#9a3414"] },
    { x: [roadEdges.right + 0.8, roadEdges.right + 6], z: [-4, -30], n: 4000, cols: ["#a86a34", "#c08a4a", "#8a5428"] },
  ];
  const all = drifts.flatMap((d) => Array.from({ length: Math.round(d.n * params.density) }, () => d));
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.08).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), all.length);
  const c = new THREE.Color();
  all.forEach((d, i) => {
    const t = Math.pow(r(), 0.6), x = d.x[1] + (d.x[0] - d.x[1]) * t * (0.4 + 0.6 * r());
    const z = d.z[0] + (d.z[1] - d.z[0]) * r();
    e.set((r() - 0.5) * 0.5, r() * 6.3, (r() - 0.5) * 0.5);
    m.compose(new THREE.Vector3(x, 0.07, z), q.setFromEuler(e), s.setScalar(0.7 + r() * 0.8));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(d.cols[Math.floor(r() * d.cols.length)]).multiplyScalar(0.7 + r() * 0.4));
  });
  return mesh;
}

function lampPosts() {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: "#16302f", roughness: 0.45, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: "#c9d2cf", emissive: "#3a3d38", roughness: 0.3 });
  for (const [u, v, vTop] of lamps) {
    const p = ground(u, v), lamp = new THREE.Group();
    lamp.scale.setScalar(atDepth(u, vTop, -p.z).y / 4.5);
    lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.8, 10).translate(0, 1.9, 0), mat));
    lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.5, 10).translate(0, 0.25, 0), mat));
    lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.45, 6).translate(0, 4.05, 0), glass));
    lamp.add(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 6).translate(0, 4.38, 0), mat));
    lamp.position.copy(p);
    g.add(lamp);
  }
  return g;
}

function railing() {
  const b = ground(fence.u, fence.vBase), dir = new THREE.Vector3(0, 0, -1), len = 120;
  const hs = atDepth(fence.u, fence.vTop, -b.z).y / 1.15;
  const mat = new THREE.MeshStandardMaterial({ color: "#272d36", roughness: 0.5, metalness: 0.5 });
  const g = new THREE.Group(), start = b.clone().addScaledVector(dir, -4);
  g.scale.y = hs;
  const yaw = Math.atan2(dir.x, dir.z);
  for (const h of [0.35, 0.95, 1.1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, len), mat);
    rail.position.copy(start).addScaledVector(dir, len / 2).setY(h);
    rail.rotation.y = yaw;
    g.add(rail);
  }
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1.15, 0.05).translate(0, 0.55, 0), mat, Math.floor(len / 0.085));
  const m = new THREE.Matrix4();
  for (let i = 0; i < bars.count; i++) bars.setMatrixAt(i, m.makeTranslation(start.clone().addScaledVector(dir, i * 0.085)));
  g.add(bars);
  return g;
}

function farAvenue(): BuiltTree[] {
  const r = rng(77), out: BuiltTree[] = [];
  for (const row of farRows)
    for (let z = row.from; z < row.to; z += row.step) {
      const x = (row.side < 0 ? roadEdges.left : roadEdges.right) + row.side * (row.offset + r() * 2);
      out.push(buildFarTree(new THREE.Vector3(x, 0, -z - r() * 3), r() * 1000, row.side));
    }
  return out;
}

function fallingSnow() {
  const n = Math.round(1800 * params.density), r = rng(5), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(r() - 0.5) * 30, r() * 14, -3 - r() * 50], i * 3);
  const geo = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#ffffff", size: 0.025, transparent: true, opacity: 0.7, depthWrite: false }));
  pts.userData.tick = (dt: number) => {
    for (let i = 0; i < n; i++) {
      let y = pos[i * 3 + 1] - dt * 0.8;
      if (y < 0) y += 14;
      pos[i * 3 + 1] = y;
      pos[i * 3] += Math.sin(y + i) * dt * 0.1;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

function skyGradient() {
  const c = document.createElement("canvas");
  c.width = 1; c.height = 256;
  const g = c.getContext("2d")!, gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, sky.top); gr.addColorStop(0.75, sky.horizon); gr.addColorStop(1, sky.horizon);
  g.fillStyle = gr; g.fillRect(0, 0, 1, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWorld(scene: THREE.Scene) {
  const roadMesh = road(scene.environment);
  scene.add(roadMesh);
  if (params.mask) {
    roadMesh.material = new THREE.MeshBasicMaterial({ color: "#fff" }) as never;
    return { tick: (_: number) => {}, stats: { leaves: 0 } };
  }
  scene.add(verge(-1), verge(1), fallenLeaves(), lampPosts(), railing());
  const built = [...trees.map((t, i) => buildTree(t, params.seed * 100 + i)), ...farAvenue()];
  scene.add(woodMesh(built.flatMap((b) => b.wood)));
  const leaves = built.flatMap((b) => b.leaves);
  scene.add(leafMesh(leaves, params.seed));
  const snow = params.snow ? fallingSnow() : null;
  if (snow) scene.add(snow);
  scene.fog = new THREE.FogExp2(sky.fog, sky.fogDensity);
  scene.background = skyGradient();
  void shot;
  return { tick: (dt: number) => snow?.userData.tick(dt), stats: { leaves: leaves.length } };
}
