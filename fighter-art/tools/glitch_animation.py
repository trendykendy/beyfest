"""Build a looping glitch animation that switches between two aligned frames.

Made for the Joyzerker: a "good" green frame and an "evil" purple frame of the
same pose. The loop holds on the first frame (60% of the time by default),
glitches across to the second, holds there, and glitches back. A short
flicker of the second frame mid-hold hints at what's underneath.

Output is an animated WebP with full alpha, for the web app.

    python tools/glitch_animation.py candidates/joyzerker-G2-green-hair.png \
        candidates/joyzerker-P2-purple-hair.png candidates/joyzerker-glitch-A.webp
"""
import argparse

import numpy as np
from PIL import Image

FRAME_MS = 40          # one glitch frame
TRANSITION_FRAMES = 6  # glitch frames per switch
FLICKER_FRAMES = 2     # the brief hint of the other side during the first hold
FULL_FRAME_STRENGTH = 0.95  # above this, fringing covers the whole frame


def shift_x(arr, dx):
    """Shift an array sideways, filling the gap with transparency."""
    out = np.zeros_like(arr)
    if dx > 0:
        out[:, dx:] = arr[:, :-dx]
    elif dx < 0:
        out[:, :dx] = arr[:, -dx:]
    else:
        out[:] = arr
    return out


def glitch_frame(base, other, mix, strength, rng):
    """One glitch frame.

    base, other: premultiplied RGBA float arrays of the same size.
    mix: chance (0..1) that a displaced band shows `other` instead of `base`.
    strength: 0..1, scales band offsets and colour fringing.
    """
    h, w, _ = base.shape
    # Mostly the dominant side, so the frame doesn't read as a 50/50 blend
    out = (other if mix > 0.5 else base).copy()

    # Horizontal bands, each from one side and jolted sideways
    glitched = np.zeros(h, dtype=bool)
    for _ in range(int(6 + 18 * strength)):
        y = rng.integers(0, h)
        bh = int(rng.integers(4, 12 + int(70 * strength)))
        src = other if rng.random() < mix else base
        dx = int(rng.integers(-1, 2) * rng.integers(0, 1 + int(90 * strength)))
        out[y:y + bh] = shift_x(src[y:y + bh], dx)
        glitched[y:y + bh] = True

    # The colour fringing and scanlines stay inside the jolted bands, except on
    # the peak frame of a switch. Untouched rows match the held frame, which
    # keeps the WebP small (the encoder only stores what changed).
    if strength > FULL_FRAME_STRENGTH:
        glitched[:] = True
    rows = out[glitched]

    # RGB split: red and blue pulled apart sideways; alpha covers all three
    split = int(4 + 18 * strength)
    r = shift_x(rows, split)
    b = shift_x(rows, -split)
    fringe = np.empty_like(rows)
    fringe[..., 0] = r[..., 0]
    fringe[..., 1] = rows[..., 1]
    fringe[..., 2] = b[..., 2]
    fringe[..., 3] = np.maximum(np.maximum(r[..., 3], rows[..., 3]), b[..., 3])

    # Scanlines: darken every third row
    fringe[::3, :, :3] *= 0.72
    out[glitched] = fringe
    return out


def to_image(premul):
    rgba = premul.copy()
    a = rgba[..., 3:4]
    rgba[..., :3] = np.where(a > 0, rgba[..., :3] / np.maximum(a, 1e-6), 0)
    return Image.fromarray((np.clip(rgba, 0, 1) * 255).round().astype(np.uint8), "RGBA")


def load_premultiplied(path):
    a = np.array(Image.open(path).convert("RGBA")).astype(np.float32) / 255
    a[..., :3] *= a[..., 3:4]
    return a


def transition(src, dst, rng):
    """Glitch frames from src to dst: the mix ramps over, strongest in the middle."""
    frames = []
    for i in range(TRANSITION_FRAMES):
        t = (i + 0.5) / TRANSITION_FRAMES
        strength = 0.35 + 0.65 * np.sin(np.pi * t)
        frames.append(glitch_frame(src, dst, mix=t, strength=strength, rng=rng))
    return frames


def build(first, second, out_path, loop_ms, first_share, width, quality, seed):
    rng = np.random.default_rng(seed)
    a = load_premultiplied(first)
    b = load_premultiplied(second)

    # Each switch's glitch is split evenly between the two sides' time
    glitch_ms = TRANSITION_FRAMES * FRAME_MS
    first_hold = round(loop_ms * first_share) - glitch_ms
    second_hold = loop_ms - round(loop_ms * first_share) - glitch_ms
    flicker_ms = FLICKER_FRAMES * FRAME_MS
    first_hold_a = first_hold * 0.55
    first_hold_b = first_hold - first_hold_a - flicker_ms

    frames, durations = [], []

    def add(arr, ms):
        frames.append(arr)
        durations.append(int(round(ms)))

    add(a, first_hold_a)
    for _ in range(FLICKER_FRAMES):
        add(glitch_frame(a, b, mix=0.35, strength=0.4, rng=rng), FRAME_MS)
    add(a, first_hold_b)
    for f in transition(a, b, rng):
        add(f, FRAME_MS)
    add(b, second_hold)
    for f in transition(b, a, rng):
        add(f, FRAME_MS)

    images = [to_image(f) for f in frames]
    if width and width != images[0].width:
        height = round(images[0].height * width / images[0].width)
        images = [im.resize((width, height), Image.LANCZOS) for im in images]
    images[0].save(
        out_path, "WEBP", save_all=True, append_images=images[1:], duration=durations,
        loop=0, quality=quality, alpha_quality=80, method=4, allow_mixed=True,
    )
    return durations


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("first", help="frame shown most of the time (e.g. green)")
    p.add_argument("second", help="the other frame (e.g. purple)")
    p.add_argument("out", help="output .webp")
    p.add_argument("--loop-ms", type=int, default=5000, help="length of one loop")
    p.add_argument("--first-share", type=float, default=0.6, help="share of the loop on the first frame")
    p.add_argument("--width", type=int, default=0, help="resize to this width (0 keeps full size)")
    p.add_argument("--quality", type=int, default=90, help="WebP quality")
    p.add_argument("--seed", type=int, default=7, help="random seed, so the glitch is repeatable")
    args = p.parse_args()
    durations = build(args.first, args.second, args.out, args.loop_ms, args.first_share,
                      args.width, args.quality, args.seed)
    print(f"{len(durations)} frames, {sum(durations)} ms: {durations}")


if __name__ == "__main__":
    main()
