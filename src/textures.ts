import * as THREE from "three";
import { rng } from "./params";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}
function leafPath(g: CanvasRenderingContext2D, maple: boolean) {
  g.beginPath();
  if (maple) {
    const pts = 10;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.45 : 1;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else g.ellipse(0, 0, 0.55, 1, 0, 0, Math.PI * 2);
  g.fill();
}
/** Soft-edged leaf clump — feathered alpha reduces paper-cutout silhouettes. */
export function leafClump(seed: number, maple: boolean) {
  const S = 256, [c, g] = canvas(S, S), r = rng(seed);
  // soft radial falloff under the leaves
  const soft = g.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.48);
  soft.addColorStop(0, "rgba(255,255,255,0.0)");
  soft.addColorStop(1, "rgba(255,255,255,0.0)");
  g.fillStyle = soft; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * S * 0.4;
    g.save();
    g.translate(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d);
    g.rotate(r() * Math.PI * 2);
    const s = S * (0.035 + r() * 0.035);
    g.scale(s, s);
    const v = 200 + r() * 55;
    g.globalAlpha = 0.55 + r() * 0.4;
    g.fillStyle = `rgb(${v},${v * (0.92 + r() * 0.08)},${v * (0.85 + r() * 0.1)})`;
    leafPath(g, maple);
    g.restore();
  }
  // feather outer alpha
  const img = g.getImageData(0, 0, S, S), d = img.data, cx = S / 2, cy = S / 2, maxR = S * 0.48;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    if (d[i + 3] === 0) continue;
    const rr = Math.hypot(x - cx, y - cy) / maxR;
    if (rr > 0.7) d[i + 3] = Math.round(d[i + 3] * Math.max(0, 1 - (rr - 0.7) / 0.3));
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function snowTexture(seed: number, leaves: string[], leafAmount: number) {
  const S = 512, [c, g] = canvas(S, S), r = rng(seed);
  g.fillStyle = "#d6d7db"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) {
    const v = 180 + r() * 50;
    g.fillStyle = `rgba(${v},${v},${v + 6},0.5)`;
    g.fillRect(r() * S, r() * S, 2 + r() * 4, 1 + r() * 3);
  }
  for (let i = 0; i < 1400 * leafAmount; i++) {
    g.save(); g.translate(r() * S, r() * S); g.rotate(r() * 6.3);
    const s = 3 + r() * 5; g.scale(s, s * 0.8);
    g.fillStyle = leaves[Math.floor(r() * leaves.length)];
    leafPath(g, r() < 0.6); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
export function roadTextures(seed: number) {
  const W = 256, H = 2048, r = rng(seed);
  const [c, g] = canvas(W, H), [rc, rg] = canvas(W, H);
  g.fillStyle = "#1e2022"; g.fillRect(0, 0, W, H);
  rg.fillStyle = "#6a6a6a"; rg.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const v = 18 + r() * 30;
    g.fillStyle = `rgba(${v},${v + 2},${v + 5},0.35)`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 260; i++) {
    const x = r() * W, y = r() * H, w = 10 + r() * 60, h = 30 + r() * 220;
    const gr = rg.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
    gr.addColorStop(0, "rgba(20,20,20,0.6)"); gr.addColorStop(1, "rgba(20,20,20,0)");
    rg.fillStyle = gr; rg.fillRect(x - w * 2, y - h * 2, w * 4, h * 4);
  }
  g.fillStyle = "rgba(15,16,18,0.9)";
  for (let y = 0; y < H; y += 2) g.fillRect(W * 0.5 + Math.sin(y * 0.01) * 2 + (r() - 0.5) * 1.5, y, 2.2, 2);
  rg.fillStyle = "#222"; rg.fillRect(W * 0.5 - 2, 0, 4, H);
  const leafCols = ["#9a4a18", "#b8701e", "#7a2a12", "#c48a2a", "#5a3a20"];
  for (let i = 0; i < 380; i++) {
    g.save(); g.translate(r() * W, r() * H); g.rotate(r() * 6.3);
    const s = 1.5 + r() * 2.5; g.scale(s, s * 2.2);
    g.fillStyle = leafCols[Math.floor(r() * leafCols.length)];
    leafPath(g, r() < 0.5); g.restore();
  }
  const map = new THREE.CanvasTexture(c), rough = new THREE.CanvasTexture(rc);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, rough };
}
