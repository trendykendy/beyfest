// Writes fighter-art/prompts/announcer-clips.md, the full list of clips to commission, from the
// master list in web/src/lib/clips.ts plus the starter fighters' name calls,
// then shows which files are in place and which are still to come.
//
//   bun run scripts/clips.ts
//
// Run it after changing clips.ts or the starter fighters; a test checks that
// the file is up to date.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ANNOUNCER, MUSIC_AND_EFFECTS, fighterCallSection, nameCallSection, type Clip, type ClipSection } from "../web/src/lib/clips.ts";

const ROOT = join(import.meta.dir, "..");
const STATIC = join(ROOT, "web/static");
const STARTERS = join(STATIC, "starter-fighters/fighters.json");
const OUT = join(ROOT, "../fighter-art/prompts/announcer-clips.md");

// The two per-fighter sections (lib/clips.ts), from fighters.json's text.
export const nameCalls = (startersJson: string): ClipSection => nameCallSection(JSON.parse(startersJson));
export const fighterCalls = (startersJson: string): ClipSection => fighterCallSection(JSON.parse(startersJson));

const cell = (s: string) => s.replace(/\|/g, "\\|");

function table(section: ClipSection): string {
  const rows = section.clips.map((c: Clip) => `| \`tournament-app/web/static${c.url}\` | ${cell(c.says)} | ${cell(c.when)} |`);
  return [
    `## ${section.title}`,
    "",
    ...(section.note ? [section.note, ""] : []),
    "| File | Says | When it plays |",
    "|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

export function clipsMarkdown(startersJson: string): string {
  const names = nameCalls(startersJson);
  const own = fighterCalls(startersJson);
  const announcerCount = ANNOUNCER.reduce((n, s) => n + s.clips.length, 0);
  return [
    "# Beyfest: Tetrafatalis: clip list",
    "",
    "Every sound the TV plays. Generated from `tournament-app/web/src/lib/clips.ts` by `bun run scripts/clips.ts` (run in `tournament-app`); change the list there, not here.",
    "",
    `**To commission:** ${announcerCount} shared announcer clips, ${names.clips.length} fighter name calls, ` +
      `${own.clips.length} fighters' own calls, and the ${MUSIC_AND_EFFECTS.clips.length} music, effect and narration files.`,
    "",
    "**How to deliver the announcer clips**",
    "",
    "- MP3, one call per file, under exactly the file name below.",
    "- Trim the silence off both ends: calls are chained with a 0.15 s breath, so any padding shows as a pause.",
    "- A line starting \"…\" is said straight after a name (\"The Buzzsaw and The Breycist … Still Standing!\"), so it should sound like the end of a sentence.",
    "- Until a file is in place the TV skips that call without a gap, so clips can arrive a few at a time.",
    "",
    ...ANNOUNCER.map(table),
    table(names),
    table(own),
    table(MUSIC_AND_EFFECTS),
  ].join("\n");
}

if (import.meta.main) {
  const startersJson = readFileSync(STARTERS, "utf8");
  writeFileSync(OUT, clipsMarkdown(startersJson));
  console.log(`Wrote ${OUT}\n`);
  const sections = [...ANNOUNCER, nameCalls(startersJson), fighterCalls(startersJson), MUSIC_AND_EFFECTS];
  // These two sections start out full of 2026 files, which a file check
  // can't tell from new ones.
  const standIns = new Set(["Fighter name calls", MUSIC_AND_EFFECTS.title]);
  for (const s of sections) {
    const have = s.clips.filter((c) => existsSync(join(STATIC, c.url)));
    const note = standIns.has(s.title) ? " (2026 files count until they're replaced)" : "";
    console.log(`${s.title}: ${have.length} of ${s.clips.length} in place${note}`);
    for (const c of s.clips) if (!have.includes(c)) console.log(`  missing  web/static${c.url}  (${c.says})`);
  }
}
