import * as THREE from "three";
import { params } from "./params";
import { leafClump, roadTextures } from "./textures";
import { FAR, roadEdges } from "./world-shared";

export type PlanarReflection = {
  group: THREE.Group;
  render: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void;
  dispose: () => void;
};

/**
 * Custom planar reflection for y=0 road.
 * Mirror camera below the plane (works with lens-shifted ShotCamera by copying + flipping e[9]).
 * Samples into asphalt via onBeforeCompile; strength falls off with roughness and distance.
 */
export function wetRoadWithReflection(env: THREE.Texture | null, backend: "webgpu" | "webgl"): PlanarReflection {
  const { left, right } = roadEdges, w = right - left;
  const { map, rough } = roadTextures(params.seed);
  for (const t of [map, rough]) t.repeat.set(1, FAR / (w * 8));
  const geo = new THREE.PlaneGeometry(w, FAR, 1, 1).rotateX(-Math.PI / 2);
  const cx = (left + right) / 2, cz = 4 - FAR / 2;

  const useReflect = backend === "webgl" && !params.mask;
  const rtSize = Math.min(160, Math.floor(120 * params.pixelRatio)); // very low-res blur
  const rt = useReflect
    ? new THREE.WebGLRenderTarget(rtSize, Math.floor(rtSize * 2), {
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: true,
      })
    : null;

  const reflectorMatrix = new THREE.Matrix4();
  const mat = new THREE.MeshPhysicalMaterial({
    map,
    roughnessMap: rough,
    envMap: env ?? undefined,
    color: "#726b64", // warm muddy asphalt
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.55,
    envMapIntensity: useReflect ? 0.28 : 0.45,
  });

  if (rt) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.tPlanarReflect = { value: rt.texture };
      shader.uniforms.uReflectMatrix = { value: reflectorMatrix };
      shader.uniforms.uReflectMix = { value: 0.12 };
      shader.uniforms.uReflectBlur = { value: 1.0 / rtSize };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vPlanarWorldPos;
`,
        )
        .replace(
          "#include <worldpos_vertex>",
          `#include <worldpos_vertex>
vPlanarWorldPos = (modelMatrix * vec4( transformed, 1.0 )).xyz;
`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform sampler2D tPlanarReflect;
uniform mat4 uReflectMatrix;
uniform float uReflectMix;
uniform float uReflectBlur;
varying vec3 vPlanarWorldPos;
`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
{
  vec4 rUv = uReflectMatrix * vec4( vPlanarWorldPos, 1.0 );
  vec2 rq = rUv.xy / max( rUv.w, 1e-4 );
  float edge = smoothstep( 0.0, 0.1, rq.x ) * smoothstep( 1.0, 0.9, rq.x )
             * smoothstep( 0.0, 0.08, rq.y ) * smoothstep( 1.0, 0.92, rq.y );
  // wide multi-tap blur: wet asphalt streak, not chrome
  vec2 px = vec2( uReflectBlur * 5.0, uReflectBlur * 3.0 );
  vec3 refl = vec3( 0.0 );
  float wsum = 0.0;
  for ( int iy = -2; iy <= 2; iy++ ) {
    for ( int ix = -2; ix <= 2; ix++ ) {
      float w = 1.0 / ( 1.0 + float( ix * ix + iy * iy ) );
      refl += texture2D( tPlanarReflect, clamp( rq + px * vec2( float( ix ), float( iy ) ), 0.0, 1.0 ) ).rgb * w;
      wsum += w;
    }
  }
  refl /= wsum;
  refl *= 0.45; // dull muddy
  float nearWet = smoothstep( -40.0, -2.0, vPlanarWorldPos.z );
  // broken wet: only smooth puddles pick up reflection
  float wetMask = smoothstep( 0.55, 0.15, roughnessFactor );
  float mixAmt = uReflectMix * wetMask * edge * ( 0.25 + 0.55 * nearWet );
  diffuseColor.rgb = mix( diffuseColor.rgb, refl, clamp( mixAmt, 0.0, 0.22 ) );
  // slight mud darken in near field
  diffuseColor.rgb *= mix( 1.0, 0.95, nearWet * 0.35 );
}

`,
        );
    };
    mat.customProgramCacheKey = () => "wet-planar-reflect-v11";
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, 0, cz);
  mesh.name = "roadAsphalt";
  const group = new THREE.Group();
  group.userData.isRoad = true;
  group.add(mesh);

  // darker near band (photo: near asphalt is darker)
  const nearPad = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.98, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: "#0c0d0f", transparent: true, opacity: 0.04, depthWrite: false }),
  );
  nearPad.position.set(cx, 0.004, -1.5);
  nearPad.renderOrder = 2;
  nearPad.name = "roadNearPad";
  group.add(nearPad);


  // leaf litter on wet asphalt — soft-alpha leaf cards, denser near camera like the photo
  {
    const r = (() => { let a = (params.seed + 91) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const n = Math.round(2200 * params.density);
    const litter = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.16, 0.11).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: leafClump(params.seed + 3, true),
        alphaTest: 0.22,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      n,
    );
    litter.name = "roadLitter";
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
    const c = new THREE.Color();
    const cols = ["#9a4a18", "#b8701e", "#7a2a12", "#c48a2a", "#5a3a20", "#a85820", "#8a4010"];
    for (let i = 0; i < n; i++) {
      const along = Math.pow(r(), 1.5);
      const z = -0.5 - along * 18;
      const x = cx + (r() - 0.5) * w * 0.78;
      e.set((r() - 0.5) * 0.5, r() * 6.3, (r() - 0.5) * 0.5);
      const sc = 0.55 + r() * 0.9;
      m.compose(new THREE.Vector3(x, 0.012 + r() * 0.008, z), q.setFromEuler(e), s.set(sc * (0.8 + r() * 0.5), 1, sc));
      litter.setMatrixAt(i, m);
      litter.setColorAt(i, c.set(cols[Math.floor(r() * cols.length)]).multiplyScalar(0.7 + r() * 0.35));
    }
    litter.renderOrder = 3;
    group.add(litter);
  }

  const mirrorCam = new THREE.PerspectiveCamera();
  const clipPlane = new THREE.Plane();
  const q = new THREE.Vector4();
  const reflectNormal = new THREE.Vector3(0, 1, 0);

  function render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (!rt) return;
    const main = camera as THREE.PerspectiveCamera;
    mirrorCam.fov = main.fov;
    mirrorCam.aspect = main.aspect;
    mirrorCam.near = main.near;
    mirrorCam.far = main.far;
    // reflect position across y=0
    mirrorCam.position.set(main.position.x, -main.position.y, main.position.z);
    // reflect orientation: copy quaternion then flip pitch (Y axis reflection)
    const eul = new THREE.Euler().setFromQuaternion(main.quaternion, "YXZ");
    eul.x = -eul.x;
    eul.z = -eul.z;
    mirrorCam.quaternion.setFromEuler(eul);
    mirrorCam.updateMatrixWorld(true);
    // copy projection then flip vertical lens shift for mirrored view
    mirrorCam.projectionMatrix.copy(main.projectionMatrix);
    mirrorCam.projectionMatrix.elements[9] *= -1;
    // oblique near clip at road plane (y=0) from mirror side
    clipPlane.set(reflectNormal, 0);
    clipPlane.applyMatrix4(mirrorCam.matrixWorldInverse);
    const pe = mirrorCam.projectionMatrix.elements;
    // Lengyel oblique clip
    const c = new THREE.Vector4(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.constant);
    const q2 = new THREE.Vector4();
    q2.x = (Math.sign(c.x) + pe[8]) / pe[0];
    q2.y = (Math.sign(c.y) + pe[9]) / pe[5];
    q2.z = -1;
    q2.w = (1 + pe[10]) / pe[14];
    c.multiplyScalar(2 / c.dot(q2));
    pe[2] = c.x;
    pe[6] = c.y;
    pe[10] = c.z + 1;
    pe[14] = c.w;
    mirrorCam.projectionMatrixInverse.copy(mirrorCam.projectionMatrix).invert();

    // texture matrix: bias * proj * view
    reflectorMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1,
    );
    reflectorMatrix.multiply(mirrorCam.projectionMatrix);
    reflectorMatrix.multiply(mirrorCam.matrixWorldInverse);

    // hide road + ground clutter from reflection
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.userData.isRoad || o.name === "roadAsphalt" || o.name === "roadNearPad" || o.name === "fallenLeaves" || o.name === "verge" || o.name === "fallingSnow") {
        if (o.visible) { o.visible = false; hidden.push(o); }
      }
    });
    group.visible = false;

    const prevTarget = renderer.getRenderTarget();
    const prevXR = renderer.xr.enabled;
    renderer.xr.enabled = false;
    renderer.setRenderTarget(rt);
    renderer.clear();
    const prevBg = scene.background;
    // keep background for sky in reflection
    renderer.render(scene, mirrorCam);
    renderer.setRenderTarget(prevTarget);
    renderer.xr.enabled = prevXR;
    scene.background = prevBg;

    group.visible = true;
    for (const o of hidden) o.visible = true;
  }

  return {
    group,
    render,
    dispose: () => { rt?.dispose(); mat.dispose(); geo.dispose(); },
  };
}

export function roadMaskMesh() {
  const { left, right } = roadEdges, w = right - left;
  const geo = new THREE.PlaneGeometry(w, FAR, 1, 1).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: "#fff" }));
  mesh.position.set((left + right) / 2, 0, 4 - FAR / 2);
  return mesh;
}

/** Fallback without reflection hook (mask / webgpu). */
export function wetRoad(env: THREE.Texture | null, backend: "webgpu" | "webgl") {
  return wetRoadWithReflection(env, backend).group;
}
