import { describe, expect, test, beforeEach, afterEach, setSystemTime } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ACCENT, defaultDirections, variantsOf, type Direction } from "../web/src/lib/voiceDirection";
import { clipKey, voiceStore } from "../web/src/lib/server/voiceStore";

const starters = [
  { name: "The Buzzsaw", voice: "the-buzzsaw.mp3", callVictorious: "victorious-buzzsaw.mp3" },
];

describe("defaultDirections", () => {
  const d = defaultDirections(starters);
  test("a fighter's own call is a battle cry", () => {
    expect(d.get("/starter-fighters/victorious-buzzsaw.mp3")?.text).toBe(
      `${ACCENT} The Buzzsaw... [exclaiming triumphantly] is VICTORIOUS!!!`,
    );
  });
  test("shared lines and name calls carry the accent; 'and' isn't exclaimed", () => {
    expect(d.get("/sounds/announcer/titles/circle-1.mp3")?.text).toBe(`${ACCENT} [exclaiming] Circle One!`);
    expect(d.get("/starter-fighters/the-buzzsaw.mp3")?.text).toBe(`${ACCENT} [exclaiming] The Buzzsaw!`);
    expect(d.get("/sounds/announcer/melee/and.mp3")?.text).toBe(`${ACCENT} and`);
  });
  test("everything is in the hall, on v4", () => {
    for (const x of d.values()) expect([x.model, x.environment]).toEqual(["eleven_v4", "hall"]);
  });
});

describe("variantsOf", () => {
  const base: Direction = { text: `${ACCENT} The Buzzsaw... [exclaiming triumphantly] is VICTORIOUS!!!`, model: "eleven_v4", stability: 0.3, similarity: 0.95 };
  test("swaps 'exclaiming' for announcing words, with one '!'", () => {
    expect(variantsOf(base).map((v) => v.text)).toEqual([
      `${ACCENT} The Buzzsaw... [proclaiming] is VICTORIOUS!`,
      `${ACCENT} The Buzzsaw... [announcing with authority] is VICTORIOUS!`,
      `${ACCENT} The Buzzsaw... [declaring] is VICTORIOUS!`,
    ]);
  });
  test("a line without 'exclaiming' gets the word after the accent", () => {
    expect(variantsOf({ ...base, text: `${ACCENT} and` })[0].text).toBe(`${ACCENT} [proclaiming] and`);
  });
});

describe("voiceStore", () => {
  let root: string;
  const url = "/sounds/announcer/versus-1.mp3";
  const live = () => join(root, "web/static", url);
  const defaults = new Map<string, Direction>([[url, { text: "old", model: "eleven_v4", stability: 0.3, similarity: 0.95 }]]);

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "voice-review-"));
    mkdirSync(join(root, "web/static/sounds/announcer"), { recursive: true });
    writeFileSync(live(), "OLD");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("clip keys are folder names", () => {
    expect(clipKey("/starter-fighters/victorious-buzzsaw.mp3")).toBe("starter-fighters--victorious-buzzsaw");
  });

  test("marks are saved, and clearing both removes the entry", () => {
    const s = voiceStore(root);
    s.setMark(url, "redo", "sounds surprised");
    expect(s.marks()[url]).toMatchObject({ status: "redo", note: "sounds surprised" });
    s.setMark(url, null, "");
    expect(s.marks()[url]).toBeUndefined();
  });

  test("picking a candidate makes it live and keeps everything else in the history", () => {
    const s = voiceStore(root);
    s.setMark(url, "redo", "too high");
    const tmp = (body: string) => {
      const p = join(root, `${body}.tmp`);
      writeFileSync(p, body);
      return p;
    };
    s.addCandidate(url, tmp("A"), { ...defaults.get(url)!, text: "A" });
    s.addCandidate(url, tmp("B"), { ...defaults.get(url)!, text: "B" });
    const [, second] = s.log(url).candidates;
    s.pick(url, second.file, defaults);

    expect(readFileSync(live(), "utf8")).toBe("B");
    const log = s.log(url);
    expect(log.candidates).toEqual([]);
    expect(log.history.map((h) => [h.label, h.direction?.text])).toEqual([
      ["Replaced", "old"],
      ["Picked (now live)", "B"],
      ["Not picked", "A"],
    ]);
    const replaced = join(s.base, "clips", clipKey(url), log.history[0].file);
    expect(readFileSync(replaced, "utf8")).toBe("OLD");
    expect(s.directions()[url].text).toBe("B");
    expect(s.marks()[url]).toMatchObject({ status: "ok", note: "too high" });
  });

  test("candidates made in the same millisecond don't overwrite each other", () => {
    const s = voiceStore(root);
    setSystemTime(new Date("2026-11-09T12:00:00.000Z")); // freeze the clock
    try {
      for (const body of ["A", "B", "C"]) {
        const p = join(root, `${body}.tmp`);
        writeFileSync(p, body);
        s.addCandidate(url, p, { ...defaults.get(url)!, text: body });
      }
    } finally {
      setSystemTime(); // back to the real clock
    }
    const files = s.log(url).candidates.map((c) => c.file);
    expect(new Set(files).size).toBe(3);
    const dir = join(s.base, "clips", clipKey(url));
    expect(files.map((f) => readFileSync(join(dir, f), "utf8"))).toEqual(["A", "B", "C"]);
  });

  test("clipFile only serves MP3s inside the clips folder", () => {
    const s = voiceStore(root);
    s.archive(url, "Replaced");
    const file = s.log(url).history[0].file;
    expect(s.clipFile(`${clipKey(url)}/${file}`)).not.toBeNull();
    expect(s.clipFile("../review.json")).toBeNull();
    expect(s.clipFile(`../../web/static${url}`)).toBeNull();
    expect(existsSync(join(s.base, "clips"))).toBe(true);
  });
});
