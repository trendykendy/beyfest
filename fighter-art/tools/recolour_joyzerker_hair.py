"""Recolour the Joyzerker's hair and beard in one frame of the glitch animation.

ChatGPT drew the hair as bright ginger. This shifts the head hair to dark auburn
brown and deepens the beard and moustache to a darker red-ginger (still redder
than the hair, per likeness/joyzerker.md). It is done in code rather than as a
ChatGPT edit so the green and purple frames stay pixel-aligned: both use the
same regions.

    python tools/recolour_joyzerker_hair.py candidates/joyzerker-G-green.png candidates/joyzerker-G2-green-hair.png
    python tools/recolour_joyzerker_hair.py candidates/joyzerker-P-purple.png candidates/joyzerker-P2-purple-hair.png
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Regions in the 1536x1024 frame. BEARD covers the beard and moustache;
# everything ginger in HEAD_BOX outside it is treated as head hair.
BEARD = [(650, 158), (700, 150), (850, 145), (892, 150), (900, 250), (880, 335), (780, 365), (680, 345), (655, 250)]
HEAD_BOX = (560, 0, 1010, 370)

HAIR_HUE = 11            # degrees: brown with a hint of red
HAIR_SAT = 0.68
BEARD_HUE_SCALE = 0.55   # orange ~24 deg becomes red-ginger ~13 deg
BEARD_VALUE = 0.78


def rgb_to_hsv(a):
    """Hue in degrees, saturation and value in 0..1, from an RGB(A) float array."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a[..., :3].max(-1)
    mn = a[..., :3].min(-1)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, d / (mx + 1e-6), mx


def hsv_to_rgb(h, s, v):
    h6 = (h / 60.0) % 6
    i = np.floor(h6).astype(int)
    f = h6 - i
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,))
    for k, (r, g, b) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        sel = i == k
        out[sel] = np.stack([r[sel], g[sel], b[sel]], -1)
    return out


def feather(mask):
    """Soften a boolean mask a touch so recoloured edges blend into the ink lines."""
    img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    return np.array(img)[..., None] / 255.0


def region(size, fill_box=None, polygon=None, polygon_fill=255):
    img = Image.new("L", size, 0)
    d = ImageDraw.Draw(img)
    if fill_box:
        d.rectangle(fill_box, fill=255)
    if polygon:
        d.polygon(polygon, fill=polygon_fill)
    return np.array(img) > 0


def recolour(src, dst):
    im = Image.open(src)
    a = np.array(im).astype(float) / 255

    # Head hair: the ginger body plus the yellow highlight tips, painted a fixed
    # dark auburn with the original brightness kept as shading
    h, s, v = rgb_to_hsv(a)
    hair = (((h > 8) & (h < 40) & (s > 0.68)) | ((h >= 40) & (h < 58) & (s > 0.5))) & (v > 0.2) & (a[..., 3] > 0.5)
    hair &= region(im.size, fill_box=HEAD_BOX, polygon=BEARD, polygon_fill=0)
    new = hsv_to_rgb(np.full_like(h, HAIR_HUE), np.full_like(s, HAIR_SAT), 0.05 + 0.45 * v)
    w = feather(hair)
    a[..., :3] = a[..., :3] * (1 - w) + new * w

    # Beard and moustache: shift the existing ginger toward a deeper red and
    # darken it, keeping its own shading (and the purple frame's tinted shadows)
    h, s, v = rgb_to_hsv(a)
    beard = (h > 5) & (h < 60) & (s > 0.5) & (v > 0.15) & region(im.size, polygon=BEARD)
    new = hsv_to_rgb(np.clip(h * BEARD_HUE_SCALE, 4, 30), np.clip(s * 1.05, 0, 1), v * BEARD_VALUE)
    w = feather(beard)
    a[..., :3] = a[..., :3] * (1 - w) + new * w

    Image.fromarray((a * 255).round().astype(np.uint8), "RGBA").save(dst)


if __name__ == "__main__":
    recolour(sys.argv[1], sys.argv[2])
