"""Compare render vs reference photo.
usage: python3 tools/compare.py render.png [road_mask.png]
Writes compare/side-by-side.png, compare/overlay.png; prints grid colour error and road IoU."""
import sys, numpy as np
from PIL import Image, ImageDraw
W, H = 535, 1024
ref = Image.open("compare/reference.jpg").convert("RGB").resize((W, H), Image.LANCZOS)
ren = Image.open(sys.argv[1]).convert("RGB").resize((W, H), Image.LANCZOS)
a, b = np.asarray(ref, float), np.asarray(ren, float)
def grid(x): x = x[:, : W // 8 * 8]; return x.reshape(16, H // 16, 8, W // 8, 3).mean((1, 3))
err = np.abs(grid(a) - grid(b)).mean()
side = Image.new("RGB", (W * 2 + 10, H), "white"); side.paste(ref, (0, 0)); side.paste(ren, (W + 10, 0))
side.save("compare/side-by-side.png"); Image.blend(ref, ren, 0.5).save("compare/overlay.png")
out = f"grid8x16_mean_abs_err={err:.1f}/255"
# reference road polygon traced from the photo (u, v)
poly = [(0.0, 0.94), (0.495, 0.752), (0.58, 0.752), (1.0, 0.93), (1.0, 1.0), (0.0, 1.0)]
m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).polygon([(u * W, v * H) for u, v in poly], fill=255)
refm = np.asarray(m) > 127
if len(sys.argv) > 2:
    rm = np.asarray(Image.open(sys.argv[2]).convert("L").resize((W, H))) > 127
    out += f" road_IoU={(refm & rm).sum() / (refm | rm).sum():.3f}"
print(out)
