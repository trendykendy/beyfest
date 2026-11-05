// The fake ads for downtime at the tournament: still pictures with a
// voiceover. An ad is its sound plus a list of layers, each on screen for a
// stretch of the sound's clock, so a new ad only needs new data here. The
// lettering is part of the pictures (fighter-art/tools/prepare_ad_images.py);
// every layer is a full 1920×1080 frame. The script and timings are in
// fighter-art/prompts/ads.md.

export type AdLayer = {
  src: string;
  from: number; // ms
  to: number; // ms
  // still: a slow push in. slide: rises into place. pop: slams in, big to
  // actual size. Leave it out for a plain picture.
  move?: "still" | "slide" | "pop";
};

export type Ad = { id: string; audio: string; duration: number; layers: AdLayer[] };

const CUT_TO_LAWYER = 5_610; // the music's big entrance
const CUT_TO_CARD = 8_500; // just before "No win"
const NO_WIN = 8_540;
const SPINDLE_LENGTH = 13_950;

const dir = "/ads/spindle";
export const SPINDLE_TIPP: Ad = {
  id: "spindle-tipp",
  audio: `${dir}-tipp.mp3`,
  duration: SPINDLE_LENGTH,
  layers: [
    { src: `${dir}-sofa.webp`, from: 0, to: CUT_TO_LAWYER, move: "still" },
    { src: `${dir}-caption.webp`, from: 0, to: CUT_TO_LAWYER },
    { src: `${dir}-lawyer.webp`, from: CUT_TO_LAWYER, to: CUT_TO_CARD, move: "still" },
    { src: `${dir}-third.webp`, from: CUT_TO_LAWYER, to: CUT_TO_CARD, move: "slide" },
    { src: `${dir}-card.webp`, from: CUT_TO_CARD, to: SPINDLE_LENGTH },
    { src: `${dir}-burst.webp`, from: NO_WIN, to: SPINDLE_LENGTH, move: "pop" },
  ],
};

export const ADS = [SPINDLE_TIPP];

const PUSH = 0.04; // how far a still pushes in over its time on screen
const SLIDE_MS = 250;
const POP_MS = 180;

export function adImages(ad: Ad): string[] {
  return ad.layers.map((l) => l.src);
}

// How a layer looks at time t: hidden outside its stretch, otherwise its
// transform for that moment.
export function layerAt(layer: AdLayer, t: number): { visible: boolean; transform: string } {
  const visible = t >= layer.from && t < layer.to;
  const since = t - layer.from;
  let transform = "none";
  if (visible && layer.move === "still") {
    transform = `scale(${(1 + PUSH * (since / (layer.to - layer.from))).toFixed(4)})`;
  } else if (visible && layer.move === "slide") {
    const left = 1 - Math.min(1, since / SLIDE_MS);
    transform = `translateY(${(left * left * 30).toFixed(2)}%)`;
  } else if (visible && layer.move === "pop") {
    const left = 1 - Math.min(1, since / POP_MS);
    transform = `scale(${(1 + left * left * 0.8).toFixed(4)})`;
  }
  return { visible, transform };
}
