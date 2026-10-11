"""Median colour of named regions in reference vs render (u0,u1,v0,v1)."""
import sys, numpy as np
from PIL import Image
R = {"red": (.1,.3,.1,.2), "green": (.18,.3,.36,.42), "gold": (.05,.25,.55,.65), "ochre_r": (.8,.95,.38,.48), "top_r": (.7,.9,.05,.15), "mid_fog": (.5,.6,.4,.6), "road_near": (.4,.6,.92,.99), "road_far": (.45,.58,.78,.82), "verge_l": (.0,.15,.86,.92), "verge_r": (.85,1,.83,.88), "fence": (.75,.9,.75,.77)}
imgs = [np.asarray(Image.open(f).convert("RGB").resize((535, 1024)), float) for f in ("compare/reference.jpg", sys.argv[1] if len(sys.argv) > 1 else "screenshots/render.png")]
for k, (u0, u1, v0, v1) in R.items():
    m = [np.median(a[int(v0*1024):int(v1*1024), int(u0*535):int(u1*535)].reshape(-1, 3), 0).astype(int) for a in imgs]
    print(f"{k:10s} ref #{''.join('%02x'%c for c in m[0])}  ren #{''.join('%02x'%c for c in m[1])}")
