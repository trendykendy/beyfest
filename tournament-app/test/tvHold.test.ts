import { describe, expect, test } from "bun:test";
import { availableScenes, LORD_OF_GOLD_SECONDS, NO_FLOW, tvHold, type PBMatch, type Scene, type TvFlow } from "../web/src/lib/view";

// A match with just the fields tvHold and availableScenes read.
function match(code: string, stage: PBMatch["stage"], status: PBMatch["matchStatus"], extra: Partial<PBMatch> = {}): PBMatch {
  return { id: code, code, stage, matchStatus: status, liveP1: 0, liveP2: 0, startedAt: "", p1: "a", p2: "b", liveLog: [], ...extra } as PBMatch;
}
const flow = (extra: Partial<TvFlow> = {}): TvFlow => ({ ...NO_FLOW, now: 1_000_000, ...extra });
const ALL: Scene[] = ["groups", "rr", "bracket", "spotlight"];

// The tournament at each stage, start to finish.
const fresh = [match("G1", "group", "ready"), match("G2", "group", "ready")];
const groupsUnderWay = [match("G1", "group", "done"), match("G2", "group", "ready")];
const groupsDone = [match("G1", "group", "done"), match("G2", "group", "done")];
const knockoutNew = [...groupsDone, match("MB1", "mb", "ready"), match("GF", "gf", "pending", { p1: "", p2: "" })];
const knockoutUnderWay = [...groupsDone, match("MB1", "mb", "done"), match("MB2", "mb", "ready"), match("GF", "gf", "pending", { p2: "" })];
const eve = [...groupsDone, match("MB1", "mb", "done"), match("GF", "gf", "ready")];
const finalOn = [...groupsDone, match("MB1", "mb", "done"), match("GF", "gf", "ready", { startedAt: "2027-03-01 15:00:00Z" })];
const over = [...groupsDone, match("MB1", "mb", "done"), match("GF", "gf", "done")];

describe("tvHold", () => {
  test("nothing played, circles not shown yet: the Gathering", () => {
    expect(tvHold(fresh, ["standby", "groups", "spotlight"], null, flow())).toBe("standby");
  });

  test("after Show the Circles: the group overview, until the first match", () => {
    expect(tvHold(fresh, ["standby", "groups", "spotlight"], null, flow({ groupsShownAt: 5 }))).toBe("groups");
  });

  test("a match started without Show the Circles still ends the Gathering", () => {
    const started = [match("G1", "group", "ready", { startedAt: "2027-03-01 12:00:00Z" }), match("G2", "group", "ready")];
    expect(tvHold(started, ["groups", "spotlight"], null, flow())).toBeNull();
  });

  test("no hold while group matches are still to play", () => {
    expect(tvHold(groupsUnderWay, ["groups", "spotlight"], null, flow({ groupsShownAt: 5 }))).toBeNull();
  });

  test("every group match done, no knockout yet: the Respite", () => {
    expect(tvHold(groupsDone, ["groups", "respite", "spotlight"], null, flow({ groupsShownAt: 5 }))).toBe("respite");
  });

  test("knockout generated, nothing played: hold on the bracket", () => {
    expect(tvHold(knockoutNew, ALL, null, flow({ pathsBegunAt: 9 }))).toBe("bracket");
  });

  test("the hold ends once a knockout match starts or is played", () => {
    const started = [...groupsDone, match("MB1", "mb", "ready", { startedAt: "2027-03-01 12:00:00Z" })];
    expect(tvHold(started, ALL)).toBeNull();
    expect(tvHold(knockoutUnderWay, ALL)).toBeNull();
  });

  test("only mini round-robins so far: hold on those", () => {
    const ms = [...groupsDone, match("WR1", "wb_rr", "ready")];
    expect(tvHold(ms, ["groups", "rr", "spotlight"])).toBe("rr");
  });

  test("grand final ready and not started: Eve of the Reckoning", () => {
    expect(tvHold(eve, [...ALL, "eve"])).toBe("eve");
  });

  test("the Eve ends when the grand final starts", () => {
    expect(tvHold(finalOn, ALL)).toBeNull();
  });

  test("grand final done: hold on the champion", () => {
    expect(tvHold(over, [...ALL, "champion"])).toBe("champion");
  });

  test("Crown the Lord of Gold: its scene for a while, then back to the champion", () => {
    const scenes: Scene[] = [...ALL, "champion", "lordOfGold"];
    const crownedAt = 1_000_000;
    expect(tvHold(over, scenes, null, flow({ wagers: true, crownedAt, now: crownedAt + 1000 }))).toBe("lordOfGold");
    expect(tvHold(over, scenes, null, flow({ wagers: true, crownedAt, now: crownedAt + LORD_OF_GOLD_SECONDS * 1000 }))).toBe("champion");
  });

  test("no Lord of Gold when nobody wagered, even if pressed", () => {
    expect(tvHold(over, [...ALL, "champion"], null, flow({ crownedAt: 1_000_000 }))).toBe("champion");
  });

  test("the battle royale takes over from the champion: its board, then its champion", () => {
    const royale = { id: "r", spaces: 5, entrants: ["A", "B", "C"], battles: {} };
    expect(tvHold(over, [...ALL, "champion", "royale"], royale)).toBe("royale");
    const done = { ...royale, battles: { F: { winner: "A", runnerUp: "B" } } };
    expect(tvHold(over, [...ALL, "champion", "royale", "royaleChampion"], done)).toBe("royaleChampion");
  });

  test("no matches at all: no hold", () => {
    expect(tvHold([], ["groups", "spotlight"])).toBeNull();
  });
});

describe("availableScenes", () => {
  test("no tournament: only the Gathering", () => {
    expect(availableScenes(false, [])).toEqual(["standby"]);
  });

  test("drawn, nothing played: the Gathering, then the groups", () => {
    expect(availableScenes(true, fresh)).toEqual(["standby", "groups", "spotlight"]);
  });

  test("group stage under way: no Gathering", () => {
    expect(availableScenes(true, groupsUnderWay)).toEqual(["groups", "spotlight"]);
  });

  test("groups done, knockout not generated: the Respite", () => {
    expect(availableScenes(true, groupsDone)).toEqual(["groups", "respite", "spotlight"]);
  });

  test("knockout generated: the bracket, no Respite", () => {
    expect(availableScenes(true, knockoutNew)).toEqual(["groups", "bracket", "spotlight"]);
  });

  test("grand final ready: the Eve", () => {
    expect(availableScenes(true, eve)).toEqual(["groups", "bracket", "spotlight", "eve"]);
  });

  test("grand final started: no Eve", () => {
    expect(availableScenes(true, finalOn)).toEqual(["groups", "bracket", "spotlight"]);
  });

  test("champion: the Lord of Gold only if someone wagered", () => {
    expect(availableScenes(true, over, null, flow())).toEqual(["groups", "bracket", "spotlight", "champion"]);
    expect(availableScenes(true, over, null, flow({ wagers: true }))).toEqual(["groups", "bracket", "spotlight", "champion", "lordOfGold"]);
  });
});
