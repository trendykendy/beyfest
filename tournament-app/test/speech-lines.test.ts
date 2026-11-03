import { describe, expect, test } from "bun:test";
import lines from "../web/src/lib/speech/lines.json";
import fighters from "../web/static/starter-fighters/fighters.json";

// The speech-bubble lines said by fighters after they score on the TV.
type Solo = { id: string; text: string };
type Rival = { id: string; lead: string; line: string; reply: string };
const solo = lines.solo as Record<string, Solo[]>;
const rivals = lines.rivals as Record<string, Rival[]>;

const MAX = 48; // hard max; they go in a small bubble
const names = fighters.map((f) => f.name).sort();
const slug = (n: string) => n.toLowerCase().replace(/^the /, "").replace(/[^a-z]/g, "");

describe("speech lines", () => {
  test("12 solo lines for each of the 12 fighters", () => {
    expect(Object.keys(solo).sort()).toEqual(names);
    for (const n of names) expect(solo[n]).toHaveLength(12);
  });

  test("every pairing is present, keyed by sorted names", () => {
    const want: string[] = [];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) want.push(`${names[i]}|${names[j]}`);
    expect(want).toHaveLength(66);
    expect(Object.keys(rivals).sort()).toEqual(want.sort());
  });

  test("each side leads at least 2 exchanges in every pairing", () => {
    for (const [key, list] of Object.entries(rivals)) {
      const [a, b] = key.split("|");
      for (const r of list) expect([a, b]).toContain(r.lead);
      expect(list.filter((r) => r.lead === a).length).toBeGreaterThanOrEqual(2);
      expect(list.filter((r) => r.lead === b).length).toBeGreaterThanOrEqual(2);
    }
  });

  test("ids are unique and well formed", () => {
    const ids: string[] = [];
    for (const [n, list] of Object.entries(solo))
      for (const s of list) {
        expect(s.id).toMatch(new RegExp(`^solo:${slug(n)}:\\d{2,}$`));
        ids.push(s.id);
      }
    for (const [key, list] of Object.entries(rivals)) {
      const [a, b] = key.split("|");
      for (const r of list) {
        expect(r.id).toMatch(new RegExp(`^rival:${slug(a)}\\|${slug(b)}:\\d{2,}$`));
        ids.push(r.id);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("lines fit the bubble and none repeat", () => {
    const texts = [
      ...Object.values(solo).flatMap((l) => l.map((s) => s.text)),
      ...Object.values(rivals).flatMap((l) => l.flatMap((r) => [r.line, r.reply])),
    ];
    for (const t of texts) {
      expect(t.trim().length).toBeGreaterThan(0);
      if (t.length > MAX) throw new Error(`too long (${t.length}): ${t}`);
    }
    const seen = new Set<string>();
    for (const t of texts) {
      const k = t.toLowerCase();
      if (seen.has(k)) throw new Error(`repeated line: ${t}`);
      seen.add(k);
    }
  });
});
