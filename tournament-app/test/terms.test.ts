import { describe, expect, test } from "bun:test";
import { FINISHES } from "../web/src/lib/finishes";
import { FINISH_NAMES, SCREENS, STAGES, TITLES, circleName } from "../web/src/lib/terms";
import { SCENE_TITLE } from "../web/src/lib/view";

describe("in-world names", () => {
  test("every TV scene has a non-empty in-world title", () => {
    for (const title of Object.values(SCENE_TITLE)) expect(title.trim().length).toBeGreaterThan(0);
    expect(SCENE_TITLE.standby).toBe(SCREENS.waiting);
    expect(SCENE_TITLE.spotlight).toBe(SCREENS.matchCentre);
    expect(SCENE_TITLE.champion).toBe(TITLES.champion);
    expect(SCENE_TITLE.groups).toBe(STAGES.groups);
  });

  test("finish keys stay the same and take their names from terms.ts", () => {
    // The keys are stored in liveLog and name the audio files, so they must not change.
    expect(FINISHES.map((f) => f.key)).toEqual(["spin", "knockout", "dominant"]);
    for (const f of FINISHES) expect(f.label).toBe(FINISH_NAMES[f.key as keyof typeof FINISH_NAMES]);
  });

  test("circles are numbered in Roman numerals", () => {
    expect(circleName(0)).toBe("Circle I");
    expect(circleName(2)).toBe("Circle III");
    expect(circleName(4)).toBe("Circle V");
  });
});
