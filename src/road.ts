import * as THREE from "three";
import { params } from "./params";
import { roadTextures } from "./textures";
import { FAR, roadEdges } from "./world-shared";

/** Wet asphalt: clearcoat + env (tuned toward photo road luminance). */
export function wetRoad(env: THREE.Texture | null, _backend: "webgpu" | "webgl") {
  const { left, right } = roadEdges, w = right - left;
  const { map, rough } = roadTextures(params.seed);
  for (const t of [map, rough]) t.repeat.set(1, FAR / (w * 8));
  const geo = new THREE.PlaneGeometry(w, FAR, 1, 1).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    map,
    roughnessMap: rough,
    envMap: env ?? undefined,
    color: "#1a1b1d",
    roughness: 0.58,
    metalness: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.55,
  }));
  mesh.position.set((left + right) / 2, 0, 4 - FAR / 2);
  const group = new THREE.Group();
  group.userData.isRoad = true;
  group.add(mesh);
  return group;
}

export function roadMaskMesh() {
  const { left, right } = roadEdges, w = right - left;
  const geo = new THREE.PlaneGeometry(w, FAR, 1, 1).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: "#fff" }));
  mesh.position.set((left + right) / 2, 0, 4 - FAR / 2);
  return mesh;
}
