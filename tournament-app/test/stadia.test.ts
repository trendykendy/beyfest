import { describe, expect, test } from "bun:test";
import { STADIA, isNorth, pickNorth, pickStadium, southOf, withPlaces } from "../web/src/lib/stadia";

// A seeded generator so the long-run checks are repeatable.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("pickStadium", () => {
  test("keeps an event's worth of draws close to an even split", () => {
    const random = seeded(7);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 300; i++) {
      const k = pickStadium(counts, { random });
      counts[k] = (counts[k] ?? 0) + 1;
      const n = STADIA.map((s) => counts[s.key] ?? 0);
      // Never more than a few draws apart at any point. With four arenas the
      // worst spread over 300 draws is 3–5 (measured over 200 seeds), out of
      // ~75 draws each; three arenas stayed within 3.
      expect(Math.max(...n) - Math.min(...n)).toBeLessThanOrEqual(5);
    }
  });

  test("equal counts give every stadium a chance", () => {
    const seen = new Set<string>();
    const random = seeded(1);
    for (let i = 0; i < 80; i++) seen.add(pickStadium({}, { random }));
    expect(seen.size).toBe(STADIA.length);
  });

  test("favours the stadium that's behind", () => {
    const random = seeded(3);
    let behind = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickStadium({ xtreme: 5, motor: 5, drop: 4, fourth: 5 }, { random }) === "drop") behind++;
    }
    // weights 1 : 1 : 4 : 1 → about four sevenths
    expect(behind / 1000).toBeGreaterThan(0.5);
    expect(behind / 1000).toBeLessThan(0.64);
  });

  test("never picks a stadium that's out of the draw", () => {
    const random = seeded(11);
    for (let i = 0; i < 200; i++) expect(pickStadium({}, { off: ["motor"], random })).not.toBe("motor");
  });

  test("a redraw never repeats the stadium it replaces", () => {
    const random = seeded(5);
    for (let i = 0; i < 200; i++) expect(pickStadium({}, { avoid: "drop", random })).not.toBe("drop");
  });

  test("with only one stadium left in the draw, a redraw keeps it", () => {
    expect(pickStadium({}, { off: ["xtreme", "motor", "fourth"], avoid: "drop" })).toBe("drop");
  });

  test("with every stadium out of the draw it still returns one", () => {
    expect(STADIA.map((s) => s.key)).toContain(pickStadium({}, { off: STADIA.map((s) => s.key) }));
  });
});

describe("four arenas", () => {
  test("there are four, numbered I to IV, with unique keys", () => {
    expect(STADIA.map((s) => s.num)).toEqual(["I", "II", "III", "IV"]);
    expect(new Set(STADIA.map((s) => s.key)).size).toBe(4);
  });
});

describe("side draw", () => {
  test("pickNorth is a fair coin between the two players", () => {
    const random = seeded(9);
    let ones = 0;
    for (let i = 0; i < 2000; i++) {
      const n = pickNorth(random);
      expect(isNorth(n)).toBe(true);
      if (n === 1) ones++;
    }
    expect(ones / 2000).toBeGreaterThan(0.45);
    expect(ones / 2000).toBeLessThan(0.55);
  });

  test("south is the other player", () => {
    expect(southOf(1)).toBe(2);
    expect(southOf(2)).toBe(1);
  });

  test("isNorth only accepts 1 or 2", () => {
    for (const v of [0, 3, "1", null, undefined]) expect(isNorth(v)).toBe(false);
  });
});

describe("withPlaces", () => {
  const current = { stadium: "fourth", north: 2 };

  test("saved rounds keep their arena and sides; a new round takes the current ones", () => {
    const saved = [
      { who: 1, finish: "spin", stadium: "xtreme", north: 1 },
      { who: 2, finish: "spin", stadium: "drop", north: 2 },
    ];
    const rounds = withPlaces(
      [
        { who: 1, finish: "spin" },
        { who: 2, finish: "spin" },
        { who: 1, finish: "knockout" },
      ] as { who: number; finish: string; stadium?: string; north?: 1 | 2 }[],
      saved,
      current,
    );
    expect(rounds.map((r) => [r.stadium, r.north])).toEqual([
      ["xtreme", 1],
      ["drop", 2],
      ["fourth", 2],
    ]);
  });

  test("older saved rounds without sides stay without sides", () => {
    const rounds = withPlaces([{ who: 1 } as { who: number; stadium?: string; north?: 1 | 2 }], [{ stadium: "motor" }], current);
    expect(rounds[0].stadium).toBe("motor");
    expect(rounds[0].north).toBeUndefined();
  });

  test("nothing drawn yet means nothing stamped", () => {
    const rounds = withPlaces([{ who: 1 } as { who: number; stadium?: string; north?: 1 | 2 }], [], { stadium: "", north: 0 });
    expect(rounds[0].stadium).toBeUndefined();
    expect(rounds[0].north).toBeUndefined();
  });
});
