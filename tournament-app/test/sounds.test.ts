import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CALLS_GAP,
  CALLS_START,
  CHAMPION_THEME,
  GRAND_CHAMPION,
  HEARTBEAT,
  INTRO_OUT,
  MATCH_POINT_CALL,
  MATCH_POINT_HIT,
  MUSIC,
  ROYALE,
  ROYALE_CHAMPION,
  STINGER,
  SUDDEN_DEATH_CALL,
  VERSUS,
  WINS,
  AND,
  QUALIFIED,
  qualifiedCall,
  callSequence,
  callTimes,
  finishClip,
  pickOther,
  royaleLabelClip,
  stingerDelay,
  titleClip,
  winsCall,
} from "../web/src/lib/sounds";
import { ANNOUNCER_URLS, MUSIC_AND_EFFECTS } from "../web/src/lib/clips";
import { FINISHES } from "../web/src/lib/finishes";
import { clipsMarkdown } from "../scripts/clips";

const STATIC = join(import.meta.dir, "../web/static");
const STARTERS_JSON = readFileSync(join(STATIC, "starter-fighters/fighters.json"), "utf8");

describe("titleClip", () => {
  test("group matches say their group", () => {
    expect(titleClip({ stage: "group", roundLabel: "Group 1" })).toBe("/sounds/announcer/titles/circle-1.mp3");
    expect(titleClip({ stage: "group", roundLabel: "Group 5" })).toBe("/sounds/announcer/titles/circle-5.mp3");
  });
  test("a group with no clip says nothing", () => {
    expect(titleClip({ stage: "group", roundLabel: "Group 6" })).toBe("");
  });
  test("knockout matches say their bracket", () => {
    expect(titleClip({ stage: "wb", roundLabel: "Phase 1A — WB Semis" })).toBe("/sounds/announcer/titles/gilded-path.mp3");
    expect(titleClip({ stage: "mb", roundLabel: "Phase 4 — MB R2" })).toBe("/sounds/announcer/titles/iron-path.mp3");
    expect(titleClip({ stage: "lb", roundLabel: "Phase 1B — LB Match" })).toBe("/sounds/announcer/titles/ashen-path.mp3");
    expect(titleClip({ stage: "wb_rr", roundLabel: "Phase 1A — WB Mini-RR" })).toBe(
      "/sounds/announcer/titles/gilded-path.mp3",
    );
    expect(titleClip({ stage: "lb_rr", roundLabel: "Phase 1B — LB Mini-RR" })).toBe(
      "/sounds/announcer/titles/ashen-path.mp3",
    );
    expect(titleClip({ stage: "gf", roundLabel: "Phase 7 — Grand Final" })).toBe("/sounds/announcer/titles/the-reckoning.mp3");
  });
  test("8 players: upper and lower borrow the winners and losers clips", () => {
    expect(titleClip({ stage: "ub", roundLabel: "Upper Bracket — Final" })).toBe("/sounds/announcer/titles/gilded-path.mp3");
    expect(titleClip({ stage: "lb", roundLabel: "Lower Bracket — Round 1" })).toBe("/sounds/announcer/titles/ashen-path.mp3");
  });
});

// The master list (clips.ts) is the one place every clip is written down, so
// anything the TV can call must be on it. Announcer files arrive later and are
// skipped until then; music and effects have 2026 stand-ins, so those exist.
describe("the clip list", () => {
  const listed = new Set([...ANNOUNCER_URLS, ...MUSIC_AND_EFFECTS.clips.map((c) => c.url)]);
  const stages = ["wb", "ub", "lb", "mb", "wb_rr", "lb_rr", "gf"] as const;

  test("every announcer call the TV can make is on it", () => {
    const calls = [
      ...[1, 2, 3, 4, 5].map((n) => titleClip({ stage: "group", roundLabel: `Group ${n}` })),
      ...stages.map((stage) => titleClip({ stage, roundLabel: "" })),
      ...VERSUS,
      ...FINISHES.map((f) => finishClip(f.key)),
      ...["H1", "H2", "H3", "H4", "SD", "F"].map(royaleLabelClip),
      WINS,
      AND,
      QUALIFIED,
      ROYALE,
      ROYALE_CHAMPION,
      GRAND_CHAMPION,
      MATCH_POINT_CALL,
      SUDDEN_DEATH_CALL,
    ];
    for (const u of calls) expect(ANNOUNCER_URLS).toContain(u);
  });
  test("music and effects are on it, and their stand-ins are in static/", () => {
    for (const u of [...MUSIC, STINGER, CHAMPION_THEME, MATCH_POINT_HIT, HEARTBEAT]) {
      expect(listed.has(u)).toBe(true);
      expect(existsSync(join(STATIC, u))).toBe(true);
    }
  });
  test("announcer clips live in their own folder, each named once", () => {
    for (const u of ANNOUNCER_URLS) expect(u.startsWith("/sounds/announcer/")).toBe(true);
    expect(new Set(ANNOUNCER_URLS).size).toBe(ANNOUNCER_URLS.length);
  });
  test("fighter-art/prompts/announcer-clips.md is up to date (run scripts/clips.ts after changing the list)", () => {
    const md = readFileSync(join(import.meta.dir, "../../fighter-art/prompts/announcer-clips.md"), "utf8").replace(/\r\n/g, "\n");
    expect(md).toBe(clipsMarkdown(STARTERS_JSON));
  });
});

describe("pickOther", () => {
  test("never repeats the last pick when there's a choice", () => {
    for (let i = 0; i < 50; i++) expect(pickOther(["a", "b", "c"], "b")).not.toBe("b");
  });
  test("a single option is always picked", () => {
    expect(pickOther(["a"], "a")).toBe("a");
  });
});

describe("callTimes", () => {
  test("calls follow each other from the slam, with a breath between", () => {
    const { starts } = callTimes([1200, 700, 1100, 1000]);
    expect(starts).toEqual([CALLS_START, CALLS_START + 1350, CALLS_START + 2200, CALLS_START + 3450]);
  });
  test("the intro holds until the last call is done", () => {
    // 450 + 1200+150 + 700+150 + 1100+150 + 1000 = 4900, plus a 400 tail
    expect(callTimes([1200, 700, 1100, 1000]).out).toBe(5300);
  });
  test("short calls never make the intro shorter than it was", () => {
    expect(callTimes([300]).out).toBe(INTRO_OUT);
    expect(callTimes([]).out).toBe(INTRO_OUT);
  });
});

describe("finishClip", () => {
  test("each finish has its own call, named after its key", () => {
    expect(finishClip("spin")).toBe("/sounds/announcer/finishes/spin.mp3");
    expect(finishClip("knockout")).toBe("/sounds/announcer/finishes/knockout.mp3");
    expect(finishClip("dominant")).toBe("/sounds/announcer/finishes/dominant.mp3");
  });
  test("an unknown finish says nothing", () => {
    expect(finishClip("burst")).toBe("");
    expect(finishClip("")).toBe("");
  });
});

describe("winsCall", () => {
  test("the winner's name, then \"wins!\"", () => {
    expect(winsCall("/voice/ace.mp3", false)).toEqual(["/voice/ace.mp3", WINS]);
  });
  test("a walkover isn't called", () => {
    expect(winsCall("/voice/ace.mp3", true)).toEqual([]);
  });
  test("no name clip, no call", () => {
    expect(winsCall("", false)).toEqual([]);
  });
});

describe("callSequence", () => {
  test("calls follow each other from the start, with a breath between", () => {
    // the winning round: finish (1202 ms), then name (1000) and "wins!" (879) queued after it
    const { starts, end } = callSequence([1202, 1000, 879], 0);
    expect(starts).toEqual([0, 1202 + CALLS_GAP, 1202 + 1000 + 2 * CALLS_GAP]);
    expect(end).toBe(1202 + 1000 + 879 + 2 * CALLS_GAP);
  });
  test("no calls end where they would have started", () => {
    expect(callSequence([], 500)).toEqual({ starts: [], end: 500 });
  });
});

describe("stingerDelay", () => {
  test("hits a breath after the announcer finishes", () => {
    expect(stingerDelay(2000)).toBe(2000 + CALLS_GAP);
  });
  test("hits straight away when nobody's talking", () => {
    expect(stingerDelay(0)).toBe(0);
  });
});

describe("qualifiedCall", () => {
  test("one name, then qualified", () => {
    expect(qualifiedCall(["a.mp3"])).toEqual(["a.mp3", QUALIFIED]);
  });
  test("two names with 'and' between", () => {
    expect(qualifiedCall(["a.mp3", "b.mp3"])).toEqual(["a.mp3", AND, "b.mp3", QUALIFIED]);
  });
  test("three names: 'and' before the last only", () => {
    expect(qualifiedCall(["a.mp3", "b.mp3", "c.mp3"])).toEqual(["a.mp3", "b.mp3", AND, "c.mp3", QUALIFIED]);
  });
  test("names without a voice clip are left out; none at all is just 'qualified'", () => {
    expect(qualifiedCall(["", "b.mp3"])).toEqual(["b.mp3", QUALIFIED]);
    expect(qualifiedCall(["", ""])).toEqual([QUALIFIED]);
  });
});
