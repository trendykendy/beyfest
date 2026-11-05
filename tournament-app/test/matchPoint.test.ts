import { describe, expect, test } from "bun:test";
import { matchPointEvent, matchPointState } from "../web/src/lib/matchPoint";
import { MATCH_POINT_CALL, SUDDEN_DEATH_CALL, matchPointCalls } from "../web/src/lib/sounds";

describe("matchPointState", () => {
  test("nobody one point away", () => {
    expect(matchPointState(0, 0, 5)).toBe("none");
    expect(matchPointState(3, 3, 5)).toBe("none");
  });
  test("one blader one point away", () => {
    expect(matchPointState(4, 3, 5)).toBe("p1");
    expect(matchPointState(1, 4, 5)).toBe("p2");
  });
  test("both one point away", () => {
    expect(matchPointState(4, 4, 5)).toBe("both");
  });
  test("decided, including a finish that overshoots the target", () => {
    expect(matchPointState(5, 2, 5)).toBe("decided");
    expect(matchPointState(4, 7, 5)).toBe("decided");
  });
  test("follows the target: first to 7 and first to 9", () => {
    expect(matchPointState(4, 0, 7)).toBe("none");
    expect(matchPointState(6, 0, 7)).toBe("p1");
    expect(matchPointState(7, 8, 9)).toBe("p2");
    expect(matchPointState(8, 8, 9)).toBe("both");
  });
});

describe("matchPointEvent", () => {
  test("landing on match point slams", () => {
    expect(matchPointEvent([3, 3], [4, 3], 5)).toBe("slam");
  });
  test("jumping onto match point slams", () => {
    expect(matchPointEvent([2, 0], [4, 0], 5)).toBe("slam");
  });
  test("jumping straight past it to a win fires nothing", () => {
    expect(matchPointEvent([2, 0], [5, 0], 5)).toBeNull();
  });
  test("winning from match point fires nothing, even overshooting", () => {
    expect(matchPointEvent([4, 3], [5, 3], 5)).toBeNull();
    expect(matchPointEvent([4, 3], [4, 6], 5)).toBeNull();
  });
  test("catching up to one point away each is sudden death", () => {
    expect(matchPointEvent([4, 3], [4, 4], 5)).toBe("suddenDeath");
    expect(matchPointEvent([2, 4], [4, 4], 5)).toBe("suddenDeath");
  });
  test("scoring without catching up is a save", () => {
    expect(matchPointEvent([4, 1], [4, 2], 5)).toBe("saved");
    expect(matchPointEvent([0, 4], [3, 4], 5)).toBe("saved");
  });
  test("ordinary scoring fires nothing", () => {
    expect(matchPointEvent([1, 1], [2, 1], 5)).toBeNull();
  });
  test("the same score again fires nothing (a data reload)", () => {
    expect(matchPointEvent([4, 3], [4, 3], 5)).toBeNull();
  });
  test("Undo and corrections fire nothing", () => {
    expect(matchPointEvent([4, 3], [3, 3], 5)).toBeNull();
    expect(matchPointEvent([4, 4], [4, 3], 5)).toBeNull();
    expect(matchPointEvent([4, 2], [3, 3], 5)).toBeNull();
  });
  test("follows the target", () => {
    expect(matchPointEvent([5, 0], [6, 0], 7)).toBe("slam");
    expect(matchPointEvent([8, 7], [8, 8], 9)).toBe("suddenDeath");
    expect(matchPointEvent([3, 3], [4, 3], 7)).toBeNull();
  });
});

describe("matchPointCalls", () => {
  test("each moment's line; a save is the impact alone", () => {
    expect(matchPointCalls("slam")).toEqual([MATCH_POINT_CALL]);
    expect(matchPointCalls("suddenDeath")).toEqual([SUDDEN_DEATH_CALL]);
    expect(matchPointCalls("saved")).toEqual([]);
  });
});
