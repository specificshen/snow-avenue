/** Scene described in photo coordinates (u,v in 0..1 of the reference photo). */
export type Blob = { u: number; v: number; r: number; depth?: number };
export type TreeSpec = {
  u: number; vBase: number; trunk: number; lean?: number;
  canopy: Blob[]; palette: string[]; snow: number; leafSize: number;
  /** leaf count and branch count multipliers: the snowy right-side trees are twiggier and thinner */
  leafiness?: number; branchiness?: number;
};
export const palettes = {
  red: ["#a03a1c", "#842a10", "#b04420", "#70200a", "#b84e26", "#943418"],
  green: ["#6f6a1a", "#58702a", "#868524", "#4a5a22", "#7a7a30"],
  gold: ["#c47c0a", "#d8920e", "#ac6008", "#bc700a", "#e0a01a", "#9c5608"],
  ochre: ["#a87850", "#b8885a", "#946a44", "#c09870", "#8a6040", "#c8a888"],
  amber: ["#b8701e", "#cc8a34", "#a85e18", "#d49a48"],
};
export const trees: TreeSpec[] = [
  { u: 0.03, vBase: 0.87, trunk: 0.016, lean: 0.03, palette: palettes.red, snow: 0, leafSize: 0.6,
    canopy: [{ u: 0.18, v: 0.12, r: 0.26 }, { u: 0.36, v: 0.09, r: 0.08 }, { u: 0.07, v: 0.3, r: 0.17 }, { u: 0.32, v: 0.26, r: 0.13 }, { u: 0.02, v: 0.05, r: 0.15 }] },
  { u: 0.19, vBase: 0.795, trunk: 0.012, palette: palettes.green, snow: 0, leafSize: 0.8,
    canopy: [{ u: 0.25, v: 0.38, r: 0.12 }, { u: 0.13, v: 0.43, r: 0.09 }, { u: 0.36, v: 0.4, r: 0.07 }] },
  { u: 0.125, vBase: 0.805, trunk: 0.022, palette: palettes.gold, snow: 0.04, leafSize: 0.8,
    canopy: [{ u: 0.12, v: 0.55, r: 0.18 }, { u: 0.04, v: 0.66, r: 0.12 }, { u: 0.14, v: 0.66, r: 0.1 }, { u: 0.03, v: 0.47, r: 0.1 }] },
  { u: 0.175, vBase: 0.795, trunk: 0.016, palette: palettes.gold, snow: 0.04, leafSize: 0.7,
    canopy: [{ u: 0.31, v: 0.58, r: 0.15, depth: 30 }, { u: 0.36, v: 0.66, r: 0.1, depth: 55 }, { u: 0.25, v: 0.7, r: 0.08, depth: 55 }] },
  { u: 0.035, vBase: 0.775, trunk: 0.008, palette: palettes.amber, snow: 0.05, leafSize: 0.5, canopy: [{ u: 0.02, v: 0.7, r: 0.05 }] },
  { u: 0.955, vBase: 0.8, trunk: 0.022, palette: palettes.ochre, snow: 0.3, leafSize: 0.6, leafiness: 0.55, branchiness: 2.2,
    canopy: [{ u: 0.78, v: 0.06, r: 0.16, depth: 50 }, { u: 0.64, v: 0.2, r: 0.1, depth: 55 }, { u: 0.74, v: 0.25, r: 0.09, depth: 45 }, { u: 0.86, v: 0.42, r: 0.13 }, { u: 0.95, v: 0.55, r: 0.1 }, { u: 0.8, v: 0.6, r: 0.09 }, { u: 0.9, v: 0.27, r: 0.12, depth: 35 }, { u: 0.98, v: 0.36, r: 0.08 }] },
  { u: 0.76, vBase: 0.785, trunk: 0.012, palette: palettes.ochre, snow: 0.45, leafSize: 0.5, leafiness: 0.6, branchiness: 2,
    canopy: [{ u: 0.74, v: 0.56, r: 0.07 }, { u: 0.68, v: 0.62, r: 0.06 }, { u: 0.82, v: 0.66, r: 0.05 }] },
  { u: 0.695, vBase: 0.765, trunk: 0.008, palette: palettes.ochre, snow: 0.45, leafSize: 0.5, canopy: [{ u: 0.66, v: 0.64, r: 0.05 }, { u: 0.72, v: 0.67, r: 0.04 }] },
];
/** Fog-hidden avenue beyond the hero trees: rows on both sides, [x offset from road edge, first z, spacing] */
export const farRows = [{ side: -1, offset: 2, from: 34, to: 170, step: 7 }, { side: 1, offset: 1.5, from: 32, to: 170, step: 6 }] as const;
/** [u, vBase, vTop]: height is solved so the pole spans the same pixels as the photo. */
export const lamps: [number, number, number][] = [[0.27, 0.785, 0.63], [0.3, 0.775, 0.65]];
/** Railing starts under photo pixel (u, vBase), runs parallel to the road; height solved from vTop. */
export const fence = { u: 1.0, vBase: 0.785, vTop: 0.74 } as const;
export const sky = { top: "#d4d8e2", horizon: "#a6a8ae", fog: "#98999d", fogDensity: 0.0185 };
