import { describe, expect, test } from "bun:test";
import { pickSpeech, type SpeechLines } from "../web/src/lib/speech/pick";
import lines from "../web/src/lib/speech/lines.json";

// Match centre's speech bubble: which line a fighter says after scoring.

// A tiny book so the counts are easy to reason about.
const BOOK: SpeechLines = {
  solo: {
    "The Alpha": [
      { id: "solo:alpha:01", text: "A one" },
      { id: "solo:alpha:02", text: "A two" },
    ],
    "The Bravo": [{ id: "solo:bravo:01", text: "B one" }],
    "The Charlie": [{ id: "solo:charlie:01", text: "C one" }],
  },
  rivals: {
    "The Alpha|The Bravo": [
      { id: "rival:ab:01", lead: "The Alpha", line: "A to B", reply: "B back" },
      { id: "rival:ab:02", lead: "The Bravo", line: "B to A", reply: "A back" },
    ],
  },
};

// A rand that plays back fixed values, then repeats the last.
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[Math.min(i++, v.length - 1)];
};

describe("pickSpeech", () => {
  test("a low roll picks the rival exchange the scorer leads; the reply is the opponent's", () => {
    const s = pickSpeech("The Alpha", "The Bravo", new Set(), seq(0), BOOK);
    expect(s).toEqual({
      lead: { fighter: "The Alpha", text: "A to B", id: "rival:ab:01" },
      reply: { fighter: "The Bravo", text: "B back" },
    });
    // And from the other side, Bravo's own exchange.
    const t = pickSpeech("The Bravo", "The Alpha", new Set(), seq(0), BOOK);
    expect(t?.lead).toEqual({ fighter: "The Bravo", text: "B to A", id: "rival:ab:02" });
    expect(t?.reply).toEqual({ fighter: "The Alpha", text: "A back" });
  });

  test("a high roll picks a solo line, with no reply", () => {
    const s = pickSpeech("The Alpha", "The Bravo", new Set(), seq(0.9, 0), BOOK);
    expect(s).toEqual({ lead: { fighter: "The Alpha", text: "A one", id: "solo:alpha:01" } });
  });

  test("falls back to solo with no pairing, no opponent, or the exchange used", () => {
    // no pairing in the book
    expect(pickSpeech("The Alpha", "The Charlie", new Set(), seq(0), BOOK)?.reply).toBeUndefined();
    // no opponent fighter (a player without one)
    expect(pickSpeech("The Alpha", null, new Set(), seq(0), BOOK)?.reply).toBeUndefined();
    expect(pickSpeech("The Alpha", "Somebody", new Set(), seq(0), BOOK)?.reply).toBeUndefined();
    // the only exchange Alpha leads is used
    const s = pickSpeech("The Alpha", "The Bravo", new Set(["rival:ab:01"]), seq(0), BOOK);
    expect(s?.reply).toBeUndefined();
    expect(s?.lead.id).toBe("solo:alpha:01");
  });

  test("uses the rival exchange when the solo lines are used up", () => {
    const s = pickSpeech("The Alpha", "The Bravo", new Set(["solo:alpha:01", "solo:alpha:02"]), seq(0.9), BOOK);
    expect(s?.lead.id).toBe("rival:ab:01");
  });

  test("no repeats until every line is used, then repeats rather than silence", () => {
    const used = new Set<string>();
    const ids: string[] = [];
    for (let k = 0; k < 3; k++) {
      const s = pickSpeech("The Alpha", "The Bravo", used, Math.random, BOOK)!;
      ids.push(s.lead.id);
      used.add(s.lead.id);
    }
    expect(new Set(ids).size).toBe(3); // 2 solo + 1 exchange, each once
    const again = pickSpeech("The Alpha", "The Bravo", used, Math.random, BOOK);
    expect(again).not.toBeNull();
    expect(ids).toContain(again!.lead.id);
  });

  test("no repeats across a long match with the real lines", () => {
    const used = new Set<string>();
    // 12 solo lines + at least 2 exchanges each for Cheatseeker vs Buzzsaw
    for (let k = 0; k < 14; k++) {
      const s = pickSpeech("The Cheatseeker", "The Buzzsaw", used)!;
      expect(used.has(s.lead.id)).toBe(false);
      used.add(s.lead.id);
    }
  });

  test("names match ignoring case and spaces at the ends", () => {
    const s = pickSpeech("  the alpha ", "THE BRAVO", new Set(), seq(0), BOOK);
    expect(s?.lead.fighter).toBe("The Alpha");
    expect(s?.reply?.fighter).toBe("The Bravo");
    expect(pickSpeech("the cheatseeker", null, new Set())?.lead.fighter).toBe("The Cheatseeker");
  });

  test("an unknown or missing fighter says nothing", () => {
    expect(pickSpeech("Custom Fighter", "The Bravo", new Set(), Math.random, BOOK)).toBeNull();
    expect(pickSpeech(null, "The Bravo", new Set(), Math.random, BOOK)).toBeNull();
    expect(pickSpeech("   ", "The Bravo", new Set(), Math.random, BOOK)).toBeNull();
  });

  test("a fighter facing itself gets a solo line", () => {
    const s = pickSpeech("The Alpha", "The Alpha", new Set(), seq(0), BOOK);
    expect(s?.reply).toBeUndefined();
  });

  test("every real pairing gives each side an exchange", () => {
    for (const key of Object.keys(lines.rivals)) {
      const [a, b] = key.split("|");
      expect(pickSpeech(a, b, new Set(), seq(0))?.reply?.fighter).toBe(b);
      expect(pickSpeech(b, a, new Set(), seq(0))?.reply?.fighter).toBe(a);
    }
  });
});
