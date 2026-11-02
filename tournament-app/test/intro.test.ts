import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CAMERA,
  CUE,
  DURATION,
  SHOTS,
  cameraAt,
  easeBack,
  flash,
  frameFree,
  frameTransform,
  introImages,
  prog,
  shake,
  shotAt,
  shotSpan,
  visibleShots,
} from "../web/src/lib/intro";

const STATIC = join(import.meta.dir, "../web/static");

describe("shotAt", () => {
  test("starts cold and ends on the title", () => {
    expect(shotAt(0).shot).toBe("cold");
    expect(shotAt(DURATION).shot).toBe("title");
    expect(shotAt(DURATION).end).toBe(DURATION);
  });
  test("switches exactly on a shot's start", () => {
    expect(shotAt(10_699).shot).toBe("eight");
    expect(shotAt(10_700)).toEqual({ shot: "final", start: 10_700, end: 12_750 });
  });
  test("the shots run in order, and each fades in before the next starts", () => {
    for (let i = 1; i < SHOTS.length; i++) {
      expect(SHOTS[i][1]).toBeGreaterThan(SHOTS[i - 1][1]);
      expect(SHOTS[i - 1][1] + SHOTS[i - 1][2]).toBeLessThanOrEqual(SHOTS[i][1]);
    }
  });
  test("there's no countdown any more", () => {
    expect(SHOTS.map(([s]) => s as string)).not.toContain("countdown");
  });
});

describe("visibleShots", () => {
  test("shows one shot between fades", () => {
    expect(visibleShots(14_000)).toEqual([{ shot: "clash", opacity: 1 }]);
  });
  test("cross-fades: the old shot stays full underneath while the new one fades in", () => {
    const mid = visibleShots(10_700 + 450);
    expect(mid.map((v) => v.shot)).toEqual(["eight", "final"]);
    expect(mid[0].opacity).toBe(1);
    expect(mid[1].opacity).toBeCloseTo(0.5);
  });
  test("drops the old shot once the new one is fully in", () => {
    expect(visibleShots(10_700 + 900).map((v) => v.shot)).toEqual(["final"]);
  });
  test("a shot's span runs until the next has faded in", () => {
    expect(shotSpan("final")).toEqual({ start: 10_700, until: 13_000 });
    expect(shotSpan("title")).toEqual({ start: 53_300, until: DURATION });
  });
});

describe("cues", () => {
  test("are in the order they're spoken, inside the audio", () => {
    const times = Object.values(CUE);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
    expect(times.at(-1)!).toBeLessThan(DURATION);
  });
});

describe("timing helpers", () => {
  test("prog runs 0 to 1 over its window", () => {
    expect(prog(900, 1_000, 500)).toBe(0);
    expect(prog(1_250, 1_000, 500)).toBe(0.5);
    expect(prog(2_000, 1_000, 500)).toBe(1);
  });
  test("easeBack starts at 0, overshoots, and settles at 1", () => {
    expect(easeBack(0)).toBeCloseTo(0);
    expect(easeBack(0.7)).toBeGreaterThan(1);
    expect(easeBack(1)).toBe(1);
  });
  test("a flash is full on its moment and gone after it", () => {
    expect(flash(999, 1_000)).toBe(0);
    expect(flash(1_000, 1_000)).toBe(1);
    expect(flash(1_300, 1_000, 300)).toBe(0);
  });
  test("a shake only moves during its hit", () => {
    expect(shake(999, 1_000)).toEqual([0, 0]);
    expect(shake(1_100, 1_000)).not.toEqual([0, 0]);
    expect(shake(1_400, 1_000)).toEqual([0, 0]);
  });
});

describe("frameTransform", () => {
  // A 3:2 picture in its 1920×1280 box, which just covers the screen
  test("centres the framed point", () => {
    expect(frameTransform({ x: 0.5, y: 0.5, zoom: 1 }, 1920, 1280)).toBe("translate(0.0px, -100.0px) scale(1.0000)");
    expect(frameTransform({ x: 0.5, y: 0.5, zoom: 2 }, 1920, 1280)).toBe("translate(-960.0px, -740.0px) scale(2.0000)");
  });
  test("never lets the picture's edge into the screen", () => {
    // Framing the top-left corner stops at the picture's edge
    expect(frameTransform({ x: 0, y: 0, zoom: 1.5 }, 1920, 1280)).toBe("translate(0.0px, 0.0px) scale(1.5000)");
    // ...and the bottom-right corner at the other edge
    expect(frameTransform({ x: 1, y: 1, zoom: 1 }, 1920, 1280)).toBe("translate(0.0px, -200.0px) scale(1.0000)");
  });
});

describe("camera", () => {
  test("every shot but the cold open has one", () => {
    for (const [s] of SHOTS) if (s !== "cold") expect(CAMERA[s]).toBeDefined();
  });
  test("no move ever reaches a picture's edge, so none stops dead", () => {
    for (const [s, frames] of Object.entries(CAMERA)) {
      for (const f of frames!) expect({ s, free: frameFree(f) }).toEqual({ s, free: true });
    }
  });
  test("keeps moving right through the next shot's fade", () => {
    // "final" fades out under "clash", 12 750–13 000: still moving there
    const a = cameraAt("final", 12_800);
    const b = cameraAt("final", 12_950);
    expect(b.x).toBeGreaterThan(a.x);
  });
  test("frameFree knows an edge when it sees one", () => {
    expect(frameFree({ x: 0.5, y: 0.5, zoom: 1 })).toBe(true);
    expect(frameFree({ x: 0.4, y: 0.5, zoom: 1 })).toBe(false); // no room to pan at zoom 1
    expect(frameFree({ x: 0.43, y: 0.5, zoom: 1.2 })).toBe(true);
  });
});

describe("introImages", () => {
  test("every picture the intro loads exists", () => {
    for (const src of introImages()) expect(existsSync(join(STATIC, src))).toBe(true);
  });
  test("the narration exists", () => {
    expect(existsSync(join(STATIC, "intro/narration.m4a"))).toBe(true);
  });
});
