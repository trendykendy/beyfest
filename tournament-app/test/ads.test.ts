import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ADS, SPINDLE_TIPP, adImages, layerAt } from "../web/src/lib/ads";

const staticDir = join(import.meta.dir, "../web/static");

describe("the fake ads", () => {
  test("every ad is 10 to 15 seconds", () => {
    for (const ad of ADS) {
      expect(ad.duration).toBeGreaterThanOrEqual(10_000);
      expect(ad.duration).toBeLessThanOrEqual(15_000);
    }
  });

  test("every file an ad needs is there", () => {
    for (const ad of ADS) {
      for (const src of [ad.audio, ...adImages(ad)]) expect(existsSync(join(staticDir, src))).toBe(true);
    }
  });

  test("a picture is on screen for the whole ad", () => {
    for (const ad of ADS) {
      for (let t = 0; t < ad.duration; t += 10) {
        expect(ad.layers.some((l) => layerAt(l, t).visible)).toBe(true);
      }
    }
  });

  test("no layer runs past the end of its ad", () => {
    for (const ad of ADS) {
      for (const l of ad.layers) {
        expect(l.from).toBeLessThan(l.to);
        expect(l.to).toBeLessThanOrEqual(ad.duration);
      }
    }
  });
});

describe("layerAt", () => {
  const [sofa, caption, , third, , burst] = SPINDLE_TIPP.layers;

  test("a layer shows only in its stretch", () => {
    expect(layerAt(third, third.from - 1).visible).toBe(false);
    expect(layerAt(third, third.from).visible).toBe(true);
    expect(layerAt(third, third.to).visible).toBe(false);
  });

  test("a still pushes in steadily from full size", () => {
    expect(layerAt(sofa, 0).transform).toBe("scale(1.0000)");
    expect(layerAt(sofa, sofa.to - 1).transform).toBe("scale(1.0400)");
  });

  test("a slide and a pop both settle in place", () => {
    expect(layerAt(third, third.from).transform).toBe("translateY(30.00%)");
    expect(layerAt(third, third.from + 1000).transform).toBe("translateY(0.00%)");
    expect(layerAt(burst, burst.from).transform).toBe("scale(1.8000)");
    expect(layerAt(burst, burst.from + 1000).transform).toBe("scale(1.0000)");
  });

  test("a plain layer doesn't move", () => {
    expect(layerAt(caption, 1000).transform).toBe("none");
  });
});
