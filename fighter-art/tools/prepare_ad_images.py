"""Turn the approved ad images into the layers the TV ad stacks up.

The local-TV lettering is drawn here at the full 1920x1080, so it looks the same
whichever computer runs the TV (no fonts needed there). Every layer is the full
frame, so the scene just stacks them. Needs Georgia, Impact and Arial, so run
it on Windows.

    python tools/prepare_ad_images.py ../tournament-app/web/static/ads
"""
import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

APPROVED = Path(__file__).resolve().parent.parent / "approved" / "ads"
FONTS = "C:/Windows/Fonts/"
W, H = 1920, 1080
QUALITY = 85

GOLD = [(0, (255, 248, 190)), (0.45, (255, 214, 60)), (0.55, (214, 140, 10)), (1, (255, 226, 110))]
YELLOW = [(0, (255, 255, 150)), (1, (255, 214, 0))]
WHITE = [(0, (255, 255, 255)), (1, (205, 220, 240))]
BAR_BLUE = [(0, (30, 70, 200)), (1, (6, 18, 90))]
RED = (200, 16, 30, 255)
RULE = (255, 210, 40, 255)


def font(name, size):
    return ImageFont.truetype(FONTS + name, size)


def vgrad(w, h, stops):
    """A vertical gradient through (position, colour) stops."""
    column = Image.new("RGBA", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= t <= b:
                k = (t - a) / (b - a)
                column.putpixel((0, y), tuple(round(p + (q - p) * k) for p, q in zip(ca, cb)) + (255,))
                break
    return column.resize((w, h))


def title(canvas, text, f, xy, fill, stroke=6, extrude=10, anchor="mm"):
    """Local-TV lettering: gradient face, black outline, hard extruded shadow."""
    face = Image.new("L", canvas.size)
    ImageDraw.Draw(face).text(xy, text, font=f, fill=255, anchor=anchor)
    outline = Image.new("L", canvas.size)
    ImageDraw.Draw(outline).text(xy, text, font=f, fill=255, anchor=anchor, stroke_width=stroke)
    for i in range(extrude, 0, -1):
        canvas.paste((10, 10, 40, 255), (i, i), outline)
    canvas.paste((0, 0, 0, 255), (0, 0), outline)
    box = face.getbbox()
    layer = canvas.copy()
    layer.paste(vgrad(box[2] - box[0], box[3] - box[1], fill), box[:2])
    canvas.paste(layer, (0, 0), face)


def star(cx, cy, outer, inner, points, stretch=1.0):
    pts = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        a = math.pi * i / points
        pts.append((cx + stretch * r * math.cos(a), cy + r * math.sin(a)))
    return pts


def still(src, top, out):
    """A 16:9 crop of a 3:2 image, starting `top` rows down, at full size."""
    im = Image.open(APPROVED / src).convert("RGB")
    crop = (0, top, im.width, top + im.width * 9 // 16)
    im.crop(crop).resize((W, H), Image.LANCZOS).save(out, quality=QUALITY, method=6)


def caption(out):
    """The sofa shot's caption: lower left, clear of his hands and the Bey."""
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shape = Image.new("L", (560, 130))
    ImageDraw.Draw(shape).polygon([(0, 0), (560, 0), (510, 130), (0, 130)], fill=255)
    c.paste(vgrad(560, 130, BAR_BLUE), (0, 905), shape)
    d = ImageDraw.Draw(c)
    d.polygon([(0, 897), (563, 897), (560, 905), (0, 905)], fill=RULE)
    d.polygon([(0, 1035), (510, 1035), (507, 1043), (0, 1043)], fill=RULE)
    title(c, "MR. B. SAW", font("georgiab.ttf", 58), (40, 945), WHITE, stroke=3, extrude=4, anchor="lm")
    title(c, "REAL CLIENT", font("arialbd.ttf", 34), (42, 1002), YELLOW, stroke=2, extrude=3, anchor="lm")
    c.save(out, quality=QUALITY, alpha_quality=90, method=6)


def lower_third(out):
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c.paste(vgrad(W, 190, BAR_BLUE), (0, 830))
    d = ImageDraw.Draw(c)
    d.rectangle((0, 822, W, 830), fill=RULE)
    d.rectangle((0, 1020, W, 1028), fill=RULE)
    title(c, "SPINDLE & TIPP", font("georgiab.ttf", 84), (50, 880), WHITE, stroke=4, extrude=5, anchor="lm")
    title(c, "BEY INJURY LAWYERS", font("arialbd.ttf", 40), (54, 966), YELLOW, stroke=2, extrude=3, anchor="lm")
    ImageDraw.Draw(c).polygon([(1010, 1020), (1070, 830), (W, 830), (W, 1020)], fill=RED)
    title(c, "CALL NOW!", font("impact.ttf", 40), (1490, 866), WHITE, stroke=2, extrude=3)
    title(c, "1-800-SPIN-OUT", font("impact.ttf", 104), (1490, 950), YELLOW, stroke=4, extrude=6)
    c.save(out, quality=QUALITY, alpha_quality=90, method=6)


def end_card(out):
    c = vgrad(W, H, [(0, (8, 20, 110)), (0.55, (24, 66, 200)), (1, (6, 12, 70))])
    rays = Image.new("L", (W, H))
    rd = ImageDraw.Draw(rays)
    cx, cy = W / 2, 330
    for i in range(0, 36, 2):
        a, b = math.tau * i / 36, math.tau * (i + 1) / 36
        rd.polygon([(cx, cy), (cx + 2400 * math.cos(a), cy + 2400 * math.sin(a)),
                    (cx + 2400 * math.cos(b), cy + 2400 * math.sin(b))], fill=46)
    c.paste((130, 170, 255, 255), (0, 0), rays)
    title(c, "SPINDLE & TIPP", font("georgiab.ttf", 178), (W / 2, 160), GOLD, stroke=9, extrude=14)
    title(c, "BEY INJURY LAWYERS", font("arialbd.ttf", 60), (W / 2, 305), WHITE, stroke=3, extrude=5)
    d = ImageDraw.Draw(c)
    d.rectangle((0, 385, W, 635), fill=RED)
    d.rectangle((0, 375, W, 385), fill=RULE)
    d.rectangle((0, 635, W, 645), fill=RULE)
    title(c, "1-800-SPIN-OUT", font("impact.ttf", 220), (W / 2, 510), YELLOW, stroke=8, extrude=12)
    ImageDraw.Draw(c).text((W / 2, 1056), "Spindle & Tipp are not lawyers. The Breycist denies everything.",
                           font=font("arial.ttf", 26), fill=(225, 230, 245), anchor="mm")
    c.convert("RGB").save(out, quality=90, method=6)


def burst(out):
    """The slogan's starburst, tilted, in its place on the end card."""
    s = Image.new("RGBA", (900, 420), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.polygon(star(450, 210, 195, 150, 18, 2.0), fill=(0, 0, 0, 255))
    d.polygon(star(450, 210, 183, 140, 18, 2.0), fill=(255, 225, 40, 255))
    d.text((450, 164), "NO WIN,", font=font("impact.ttf", 88), fill=RED, anchor="mm")
    d.text((450, 256), "NO SPIN!", font=font("impact.ttf", 88), fill=RED, anchor="mm")
    s = s.rotate(4, resample=Image.BICUBIC, expand=True)
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c.paste(s, (W // 2 - s.width // 2, 835 - s.height // 2), s)
    c.save(out, quality=QUALITY, alpha_quality=90, method=6)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("out", help="output folder (the app's static/ads)")
    out = Path(p.parse_args().out)
    out.mkdir(parents=True, exist_ok=True)

    # A1 is a little too tall for 16:9: this keeps his whole head and loses
    # the undersides of his fingers. A2's crop keeps the picture on the wall.
    still("A1-client.png", 18, out / "spindle-sofa.webp")
    still("A2-lawyer.png", 60, out / "spindle-lawyer.webp")
    caption(out / "spindle-caption.webp")
    lower_third(out / "spindle-third.webp")
    end_card(out / "spindle-card.webp")
    burst(out / "spindle-burst.webp")
    (out / "spindle-tipp.mp3").write_bytes((APPROVED / "spindle-tipp.mp3").read_bytes())

    for f in sorted(out.iterdir()):
        print(f"{f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
