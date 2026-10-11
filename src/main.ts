import * as THREE from "three";
import { ShotCamera, shot } from "./camera";
import { sky } from "./layout";
import { params } from "./params";
import { createRenderer } from "./renderer";
import { buildWorld } from "./world";

declare global {
  interface Window {
    __demo: { frames: number; error?: string; fps?: number; leaves?: number; backend?: string };
  }
}
window.__demo = { frames: 0 };

function envMap(renderer: THREE.WebGLRenderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color(sky.top) }, hor: { value: new THREE.Color(sky.horizon) } },
    vertexShader: "varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: "uniform vec3 top, hor; varying vec3 p; void main(){ float h = normalize(p).y; vec3 c = mix(hor, top, smoothstep(0.,.6,h)); c = mix(c, vec3(.18,.17,.15), smoothstep(0.,-.05,h)); c = mix(c, vec3(.35,.25,.15), smoothstep(.02,.15,h)*smoothstep(.45,.15,h)*.5); gl_FragColor = vec4(c*1.1,1.); }",
  })));
  return new THREE.PMREMGenerator(renderer).fromScene(s, 0.02).texture;
}

async function boot() {
  const renderer = await createRenderer();
  window.__demo.backend = renderer.backend;
  document.getElementById("app")!.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new ShotCamera();
  if (!params.mask) {
    // PMREM works on WebGL; WebGPU path uses hemisphere/dir lights only if PMREM fails
    try { scene.environment = envMap(renderer); } catch { /* webgpu may lack PMREM from WebGL path */ }
    scene.add(new THREE.HemisphereLight("#dfe3ea", "#8a8580", 2.0));
    const key = new THREE.DirectionalLight("#f2efe9", 1.05);
    key.position.set(-6, 20, 4);
    scene.add(key);
  } else scene.background = new THREE.Color("#000");
  const world = buildWorld(scene, renderer.backend);
  window.__demo.leaves = world.stats.leaves;
  console.log("leaves", world.stats.leaves, "backend", renderer.backend);
  const resize = () => {
    const vw = params.size?.w ?? innerWidth, vh = params.size?.h ?? innerHeight;
    const h = Math.min(vh, vw / shot.aspect), w = h * shot.aspect;
    renderer.setSize(Math.round(w), Math.round(h));
  };
  addEventListener("resize", resize);
  resize();
  let last = performance.now(), acc = 0, n = 0;
  const yaw0 = camera.rotation.y;
  let dragX = 0;
  addEventListener("pointermove", (e) => { if (e.buttons) dragX = THREE.MathUtils.clamp(dragX + e.movementX * 0.002, -0.3, 0.3); });
  renderer.setAnimationLoop((now: number) => {
    const raw = (now - last) / 1000, dt = Math.min(0.1, raw);
    last = now;
    if (!params.fixed) {
      world.tick(dt);
      camera.rotation.y = yaw0 - dragX + Math.sin(now * 0.0002) * 0.004;
    }
    renderer.render(scene, camera);
    window.__demo.frames++;
    acc += raw; n++;
    if (acc > 1) { window.__demo.fps = n / acc; acc = 0; n = 0; }
  });
}

boot().catch((e) => {
  window.__demo.error = String(e);
  console.error(e);
});
