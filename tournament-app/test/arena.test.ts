import { describe, expect, test } from "bun:test";
import { leftSide, mpToLR, sideOf } from "../web/src/lib/arena";

describe("leftSide", () => {
  test("p1 when sides weren't drawn and nothing is logged", () => {
    expect(leftSide({ liveLog: [], north: 0 })).toBe(1);
  });
  test("the side drawn for the round about to start", () => {
    expect(leftSide({ liveLog: [], north: 2 })).toBe(2);
    expect(leftSide({ liveLog: [], north: 1 })).toBe(1);
  });
  test("round one's North once it's logged, even if later rounds swap", () => {
    expect(leftSide({ liveLog: [{ north: 2 }, { north: 1 }], north: 1 })).toBe(2);
  });
  test("an older log without north falls back to the current draw, then p1", () => {
    expect(leftSide({ liveLog: [{}], north: 2 })).toBe(2);
    expect(leftSide({ liveLog: [{}], north: 0 })).toBe(1);
  });
});

describe("sideOf", () => {
  test("blank when sides weren't drawn", () => {
    expect(sideOf({ north: 0 }, 1)).toBe("");
    expect(sideOf({ north: 0 }, 2)).toBe("");
  });
  test("this round's side for each player", () => {
    expect(sideOf({ north: 1 }, 1)).toBe("North");
    expect(sideOf({ north: 1 }, 2)).toBe("South");
    expect(sideOf({ north: 2 }, 1)).toBe("South");
    expect(sideOf({ north: 2 }, 2)).toBe("North");
  });
});

describe("mpToLR", () => {
  test("p1 on the left: unchanged", () => {
    expect(mpToLR("p1", 1)).toBe("p1");
    expect(mpToLR("p2", 1)).toBe("p2");
  });
  test("p2 on the left: p1 and p2 swap", () => {
    expect(mpToLR("p1", 2)).toBe("p2");
    expect(mpToLR("p2", 2)).toBe("p1");
  });
  test("both, none and decided don't depend on sides", () => {
    for (const left of [1, 2] as const) {
      expect(mpToLR("both", left)).toBe("both");
      expect(mpToLR("none", left)).toBe("none");
      expect(mpToLR("decided", left)).toBe("decided");
    }
  });
});
