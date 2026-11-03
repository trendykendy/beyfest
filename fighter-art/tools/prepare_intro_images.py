"""Turn the approved intro images into what the TV scene loads.

- Scenes are saved as WebP at their full 3:2 size. The TV scene frames each
  one for 16:9 itself (its camera pans and zooms over the whole picture), so
  nothing is cropped here.
- The logo's three tiers touch, so they're split along the emptiest seam
  between them. Each tier is saved at the full (padded) canvas size, so the
  scene stacks them at the same position and they line up exactly. 2026's
  second 2 gets its outline back from the first (mend_second_two).

    python tools/prepare_intro_images.py ../tournament-app/web/static/intro
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

APPROVED = Path(__file__).resolve().parent.parent / "approved" / "intro"
QUALITY = 85
LOGO_PAD = 24  # px of transparent margin round the logo (its tips touch the edge)

# The name the scene loads: the approved file it's made from
SCENES = {
    "b1-dawn": "B1-dawn.png",
    "b2-winter": "B2-winter.png",
    "b3-night": "B3-night.png",
    "c1-clash": "C1-clash.png",
    "c2-ripcord": "C2-ripcord.png",
    "r2-crown": "R2-crown.png",
    "r3-menace": "R3-menace.png",
    "e1-eight": "E1-eight.png",
    "p1-first-final": "P1-first-final.png",
    "s1-stood-over-all": "S1-stood-over-all.png",
    "w1-challengers": "W1-challengers.png",
    "p2-winter-final": "P2-winter-final.png",
    "g1-group": "G1-group.png",
    "g2-group": "G2-group.png",
    "g3-pair": "G3-pair.png",
    "n1-new-blood": "N1-new-blood.png",
}


def seam(cost_map, y_lo, y_hi):
    """The cheapest left-to-right path through rows y_lo..y_hi.

    Dynamic programming, like seam carving: each step may move up or down one
    row, so the cut threads between touching letters where they're thinnest.
    Returns the seam's row for every column.
    """
    band = cost_map[y_lo:y_hi].astype(np.float64).T  # columns × rows
    cols, rows = band.shape
    cost = band.copy()
    back = np.zeros((cols, rows), dtype=np.int64)
    for x in range(1, cols):
        prev = cost[x - 1]
        up = np.r_[np.inf, prev[:-1]]
        down = np.r_[prev[1:], np.inf]
        stacked = np.vstack([up, prev, down])
        choice = stacked.argmin(axis=0)
        cost[x] += stacked[choice, np.arange(rows)]
        back[x] = np.arange(rows) + choice - 1
    path = np.empty(cols, dtype=np.int64)
    path[-1] = cost[-1].argmin()
    for x in range(cols - 1, 0, -1):
        path[x - 1] = back[x, path[x]]
    return path + y_lo


def emptiest_rows(alpha, y_lo, y_hi):
    """The window to search for a seam: centred on the emptiest row in range."""
    totals = alpha[y_lo:y_hi].sum(axis=1)
    y = y_lo + int(totals.argmin())
    return max(0, y - 50), min(alpha.shape[0], y + 50)


def mend_second_two(tier):
    """Give 2026's second 2 the black outline along its foot back.

    The second 2 sits on the T of THREAT, and the seam gives most of the
    outline they share to the lower tier, leaving a thin, ragged edge that
    shows while 2026 is on screen alone. The first 2 is the same shape and
    its outline is whole, so the strip under its foot is copied across.
    """
    alpha = tier[..., 3].astype(int)
    solid = alpha[640:820] > 128
    # Where the second 2 sits relative to the first: the best overlap of the
    # two shapes, searched along the row (they share a baseline)
    first = solid[:, 280:540]
    dx = max(range(400, 560), key=lambda d: (first & solid[:, 280 + d:540 + d]).sum())

    def bottom(x):
        return np.nonzero(alpha[:, x] > 128)[0].max()

    # The columns under the second 2's foot whose outline is short of the first's
    thin = [x for x in range(280 + dx, 540 + dx) if bottom(x) < bottom(x - dx) - 2]
    lo, hi = min(thin) - 4, max(thin) + 4

    # ...and on to the right past the tip of the T's outline still hanging
    # below the first 2's, so the blend at that end doesn't keep it. (On the
    # left the 0's drop shadow sits that low, as it should.)
    def hangs(x):
        return (alpha[bottom(x - dx) + 2:, x] > 10).any()

    for _ in range(20):
        if not any(hangs(x) for x in range(hi + 1, hi + 8)):  # the blend zone, and a column more
            break
        hi += 1
    # Everything below the gold (the gold ends by row 820 under both 2s),
    # faded in and out over a few columns at each end so no seam shows
    FEATHER = 6
    rows = slice(818, tier.shape[0])
    for x in range(lo - FEATHER, hi + FEATHER + 1):
        w = min(1, (x - (lo - FEATHER)) / FEATHER, ((hi + FEATHER) - x) / FEATHER)
        src = tier[rows, x - dx].astype(float)
        dst = tier[rows, x].astype(float)
        tier[rows, x] = np.round(dst + (src - dst) * w).astype(np.uint8)
    print(f"copied the first 2's outline under the second ({dx} px along, columns {lo}-{hi})")


def split_logo(path, out_dir):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    padded = Image.new("RGBA", (w + 2 * LOGO_PAD, h + 2 * LOGO_PAD))
    padded.paste(im, (LOGO_PAD, LOGO_PAD))
    rgba = np.array(padded)
    alpha = rgba[..., 3]

    # Where letters touch, every pixel is solid, so alpha alone can't tell an
    # outline from a letter. Bright pixels cost more to cut, so the seam runs
    # along the black outlines between tiers rather than through a letter.
    luminance = rgba[..., :3].mean(axis=2) / 255
    cost_map = alpha * (0.1 + luminance)

    # The gaps sit roughly 57% and 78% of the way down (BEYFEST and its
    # katakana above, 2026 in the middle, TRIPLE THREAT below).
    H = alpha.shape[0]
    cut1 = seam(cost_map, *emptiest_rows(alpha, int(H * 0.5), int(H * 0.65)))
    cut2 = seam(cost_map, *emptiest_rows(alpha, int(H * 0.7), int(H * 0.85)))

    rows = np.arange(H)[:, None]
    tiers = {
        "logo-1-beyfest": rows < cut1[None, :],
        "logo-2-year": (rows >= cut1[None, :]) & (rows < cut2[None, :]),
        "logo-3-triple-threat": rows >= cut2[None, :],
    }
    for name, mask in tiers.items():
        tier = rgba.copy()
        tier[..., 3] = np.where(mask, alpha, 0)
        if name == "logo-2-year":
            mend_second_two(tier)
        Image.fromarray(tier).save(out_dir / f"{name}.webp", quality=QUALITY, alpha_quality=90, method=6)
    # How much alpha each cut slices through: near 0 means a clean split
    print(f"logo cuts: {alpha[cut1, np.arange(alpha.shape[1])].mean():.1f}, "
          f"{alpha[cut2, np.arange(alpha.shape[1])].mean():.1f} (mean alpha on the seam)")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("out", help="output folder (the app's static/intro)")
    out = Path(p.parse_args().out)
    out.mkdir(parents=True, exist_ok=True)

    for name, src in SCENES.items():
        Image.open(APPROVED / src).convert("RGB").save(out / f"{name}.webp", quality=QUALITY, method=6)

    split_logo(APPROVED / "L1-logo.png", out)

    for f in sorted(out.glob("*.webp")):
        print(f"{f.name}: {Image.open(f).size}, {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
