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

/** Soft-edged leaf clump — leaf-shaped cards with feathered alpha (54a4dd9 look). */
export function leafClump(seed: number, maple: boolean) {
  const S = 256, [c, g] = canvas(S, S), r = rng(seed);
  g.clearRect(0, 0, S, S);
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
  // feather outer alpha so card edges don't read as paper cutouts
  const img = g.getImageData(0, 0, S, S), d = img.data, cx = S / 2, cy = S / 2, maxR = S * 0.48;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    if (d[i + 3] === 0) continue;
    const rr = Math.hypot(x - cx, y - cy) / maxR;
    if (rr > 0.65) d[i + 3] = Math.round(d[i + 3] * Math.max(0, 1 - (rr - 0.65) / 0.35));
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
  const W = 512, H = 2048, r = rng(seed);
  const [c, g] = canvas(W, H), [rc, rg] = canvas(W, H);
  // muddy dark asphalt base (warm-grey, not pure black)
  g.fillStyle = "#4a4642"; g.fillRect(0, 0, W, H);
  rg.fillStyle = "#9a9a9a"; rg.fillRect(0, 0, W, H); // start rough

  // fine grit
  for (let i = 0; i < 28000; i++) {
    const v = 40 + r() * 45;
    const warm = r() * 8;
    g.fillStyle = `rgba(${v + warm},${v + 2},${v},0.4)`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
  }
  // thin broken tyre / wet streaks (keep wet, avoid huge footprint blobs)
  for (let s = 0; s < 6; s++) {
    const x0 = W * (0.18 + r() * 0.64);
    const wobble = 0.8 + r() * 2.2;
    for (let y = 0; y < H; y += 2) {
      if (r() < 0.35) continue;
      const x = x0 + Math.sin(y * 0.01 + s) * wobble + (r() - 0.5) * 0.8;
      const dark = 22 + r() * 20;
      g.fillStyle = `rgba(${dark + 6},${dark + 2},${dark},0.28)`;
      g.fillRect(x, y, 0.8 + r() * 1.2, 2);
      rg.fillStyle = `rgba(${35 + r() * 25},${35 + r() * 25},${35 + r() * 25},0.4)`;
      rg.fillRect(x - 0.3, y, 1.5 + r() * 1.5, 2);
    }
  }
  // small wet puddle mottling (keep wet sheen, no giant footprint blobs)
  for (let i = 0; i < 780; i++) {
    const x = r() * W, y = r() * H;
    const w = 5 + r() * 28, h = 6 + r() * 42;
    const mud = 24 + r() * 22;
    const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
    gr.addColorStop(0, `rgba(${mud + 10},${mud + 6},${mud},0.7)`);
    gr.addColorStop(0.55, `rgba(${mud + 8},${mud + 4},${mud},0.32)`);
    gr.addColorStop(1, `rgba(${mud},${mud},${mud},0)`);
    g.fillStyle = gr; g.fillRect(x - w * 2, y - h * 2, w * 4, h * 4);
    const rr = rg.createRadialGradient(x, y, 0, x, y, Math.max(w, h));
    rr.addColorStop(0, "rgba(8,8,8,0.92)");
    rr.addColorStop(0.55, "rgba(35,35,35,0.4)");
    rr.addColorStop(1, "rgba(40,40,40,0)");
    rg.fillStyle = rr; rg.fillRect(x - w * 2, y - h * 2, w * 4, h * 4);
  }
  // dry patches (rougher, slightly lighter)
  for (let i = 0; i < 180; i++) {
    const x = r() * W, y = r() * H, w = 15 + r() * 50, h = 20 + r() * 90;
    g.fillStyle = `rgba(70,65,58,${0.08 + r() * 0.12})`;
    g.beginPath(); g.ellipse(x, y, w, h, r() * 3, 0, Math.PI * 2); g.fill();
    rg.fillStyle = `rgba(200,200,200,${0.25 + r() * 0.35})`;
    rg.beginPath(); rg.ellipse(x, y, w, h, 0, 0, Math.PI * 2); rg.fill();
  }
  // worn centre seam
  g.fillStyle = "rgba(12,12,14,0.85)";
  for (let y = 0; y < H; y += 2) {
    g.fillRect(W * 0.5 + Math.sin(y * 0.012) * 2.5 + (r() - 0.5) * 2, y, 2.5, 2);
  }
  rg.fillStyle = "#181818"; rg.fillRect(W * 0.5 - 3, 0, 6, H);

  // leaf litter — denser toward near end of texture (high v = near camera when mapped)
  const leafCols = ["#9a4a18", "#b8701e", "#7a2a12", "#c48a2a", "#5a3a20", "#a85820", "#6b3010", "#d49830"];
  for (let i = 0; i < 900; i++) {
    // bias toward bottom half of texture (near road in view)
    const yBias = Math.pow(r(), 0.55);
    const y = H * (0.35 + 0.65 * yBias);
    const x = r() * W;
    g.save();
    g.translate(x, y);
    g.rotate(r() * 6.3);
    const s = 1.4 + r() * 2.8;
    g.scale(s, s * (1.6 + r()));
    g.globalAlpha = 0.75 + r() * 0.25;
    g.fillStyle = leafCols[Math.floor(r() * leafCols.length)];
    leafPath(g, r() < 0.55);
    g.restore();
    // leaves add micro roughness
    rg.fillStyle = "rgba(160,160,160,0.35)";
    rg.fillRect(x - 2, y - 2, 4, 4);
  }
  // mud splatter / brown wash near edges
  for (let i = 0; i < 35; i++) {
    const side = r() < 0.5 ? r() * W * 0.2 : W * (0.8 + r() * 0.2);
    const y = r() * H;
    g.fillStyle = `rgba(55,42,28,${0.12 + r() * 0.2})`;
    g.beginPath(); g.ellipse(side, y, 5 + r() * 14, 4 + r() * 12, 0, 0, Math.PI * 2); g.fill();
  }

  const map = new THREE.CanvasTexture(c), rough = new THREE.CanvasTexture(rc);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, rough };
}
