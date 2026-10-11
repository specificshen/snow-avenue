import * as THREE from "three";
import { params } from "./params";

export type Backend = "webgpu" | "webgl";
export type DemoRenderer = THREE.WebGLRenderer & { backend: Backend };

/** Prefer WebGPU when available; Reflector / capture force WebGL via ?renderer=webgl. */
export async function createRenderer(): Promise<DemoRenderer> {
  const canvas = document.createElement("canvas");
  const want = params.renderer;
  if (want !== "webgl") {
    try {
      const { WebGPURenderer } = await import("three/webgpu");
      const r = new WebGPURenderer({ canvas, antialias: true, forceWebGL: false }) as unknown as DemoRenderer;
      await (r as unknown as { init: () => Promise<void> }).init();
      r.backend = "webgpu";
      configure(r);
      return r;
    } catch (e) {
      console.warn("WebGPU unavailable, falling back to WebGL", e);
      if (want === "webgpu") throw e;
    }
  }
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }) as DemoRenderer;
  r.backend = "webgl";
  configure(r);
  return r;
}

function configure(r: THREE.WebGLRenderer) {
  r.toneMapping = params.mask ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = params.mask ? 1 : 1.15;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.setPixelRatio(params.pixelRatio);
}
