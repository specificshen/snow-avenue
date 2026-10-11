const q = new URLSearchParams(location.search);
export type Quality = "low" | "medium" | "high";
const quality = (["low", "medium", "high"].includes(q.get("quality") ?? "") ? q.get("quality") : "medium") as Quality;
const size = q.get("size")?.match(/^(\d+)x(\d+)$/);
export const params = {
  quality,
  density: { low: 0.35, medium: 0.7, high: 1 }[quality],
  pixelRatio: Number(q.get("dpr") ?? { low: 1, medium: 1.5, high: 2 }[quality]),
  mask: q.get("mask") === "road",
  snow: q.get("snow") !== "0",
  fixed: q.has("fixed"),
  seed: Number(q.get("seed") ?? 7),
  size: size ? { w: Number(size[1]), h: Number(size[2]) } : null,
};
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
