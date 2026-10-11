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
  // warm mid asphalt closer to photo near (#5e4f4e-ish)
  g.fillStyle = "#524f4c"; g.fillRect(0, 0, W, H);
  rg.fillStyle = "#a8a8a8"; rg.fillRect(0, 0, W, H);

  // fine grain
  for (let i = 0; i < 90000; i++) {
    const v = 48 + r() * 55;
    const warm = r() * 12;
    g.fillStyle = `rgba(${v + warm},${v + 4},${v},0.55)`;
    g.fillRect(r() * W, r() * H, 1, 1);
  }
  for (let i = 0; i < 25000; i++) {
    const v = 130 + r() * 90;
    rg.fillStyle = `rgba(${v},${v},${v},0.3)`;
    rg.fillRect(r() * W, r() * H, 1 + r(), 1 + r());
  }

  // soft dark wet tyre bands (no 1px scanlines) — darker + smoother for broken reflection
  const tracks = [W * 0.3, W * 0.7];
  for (const x0 of tracks) {
    for (let i = 0; i < 120; i++) {
      const y = r() * H;
      const len = 40 + r() * 180;
      const half = 10 + r() * 14;
      const x = x0 + (r() - 0.5) * 14;
      // broken: skip some segments
      if (r() < 0.22) continue;
      const gr = g.createRadialGradient(x, y + len * 0.3, 0, x, y + len * 0.3, half * 1.4);
      const d = 36 + r() * 18;
      gr.addColorStop(0, `rgba(${d + 4},${d + 2},${d},0.4)`);
      gr.addColorStop(1, `rgba(${d},${d},${d},0)`);
      g.fillStyle = gr;
      g.fillRect(x - half * 2, y, half * 4, len);
      // roughness soft streak
      const rr = rg.createLinearGradient(x - half, y, x + half, y);
      rr.addColorStop(0, "rgba(40,40,40,0)");
      rr.addColorStop(0.5, "rgba(22,22,22,0.7)");
      rr.addColorStop(1, "rgba(40,40,40,0)");
      rg.fillStyle = rr;
      rg.fillRect(x - half, y, half * 2, len);
    }
    // a few thin darker wet streaks inside band
    for (let i = 0; i < 25; i++) {
      const y = r() * H, len = 30 + r() * 100;
      const x = x0 + (r() - 0.5) * 18;
      g.fillStyle = `rgba(20,22,26,${0.25 + r() * 0.25})`;
      g.fillRect(x - 1, y, 2 + r() * 2, len);
      rg.fillStyle = "rgba(12,12,12,0.65)";
      rg.fillRect(x - 1, y, 2 + r() * 2, len);
    }
  }

  // tiny wet flecks only
  for (let i = 0; i < 120; i++) {
    const x = r() * W, y = r() * H;
    const rad = 1.0 + r() * 3.0;
    g.fillStyle = `rgba(30,32,34,${0.2 + r() * 0.25})`;
    g.beginPath(); g.ellipse(x, y, rad * (0.7 + r()), rad * (1 + r()), r() * 2, 0, Math.PI * 2); g.fill();
    rg.fillStyle = "rgba(25,25,25,0.4)";
    rg.beginPath(); rg.ellipse(x, y, rad, rad * 1.2, 0, 0, Math.PI * 2); rg.fill();
  }

  // centre seam
  g.fillStyle = "rgba(18,18,20,0.85)";
  for (let y = 0; y < H; y += 1) {
    g.fillRect(W * 0.5 + Math.sin(y * 0.014) * 1.8 + (r() - 0.5), y, 1.4, 1);
  }

  // sparse tiny leaves
  const leafCols = ["#9a4a18", "#b8701e", "#7a2a12", "#c48a2a", "#a85820"];
  for (let i = 0; i < 420; i++) {
    const y = H * (0.5 + 0.5 * Math.pow(r(), 0.75));
    const x = r() * W;
    g.save(); g.translate(x, y); g.rotate(r() * 6.3);
    const s = 1.0 + r() * 2.0;
    g.scale(s, s * (1.3 + r()));
    g.globalAlpha = 0.65 + r() * 0.35;
    g.fillStyle = leafCols[Math.floor(r() * leafCols.length)];
    leafPath(g, r() < 0.5);
    g.restore();
  }

  const map = new THREE.CanvasTexture(c), rough = new THREE.CanvasTexture(rc);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, rough };
}
