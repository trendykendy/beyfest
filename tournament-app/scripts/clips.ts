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
import { ANNOUNCER, MUSIC_AND_EFFECTS, type Clip, type ClipSection } from "../web/src/lib/clips.ts";

const ROOT = join(import.meta.dir, "..");
const STATIC = join(ROOT, "web/static");
const STARTERS = join(STATIC, "starter-fighters/fighters.json");
const OUT = join(ROOT, "../fighter-art/prompts/announcer-clips.md");

// The 12 starter fighters' name calls (each one's `voice` file). Their names
// haven't changed, so the files keep their 2026 names.
function nameCalls(startersJson: string): ClipSection {
  const starters = JSON.parse(startersJson) as { name: string; voice?: string }[];
  return {
    title: "Fighter name calls",
    note:
      "The 12 starter fighters' names, said as a call (\"The Beanblader!\"). The new files replace the 2026 ones under the same names in " +
      "`tournament-app/web/static/starter-fighters/`. A fighter already in the library keeps its old clip until the new one is uploaded with " +
      "Replace voice on the admin Fighters page.",
    clips: starters
      .filter((s) => s.voice)
      .map((s) => ({
        url: `/starter-fighters/${s.voice}`,
        says: `${s.name}!`,
        when: "VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene",
      })),
  };
}

const cell = (s: string) => s.replace(/\|/g, "\\|");

function table(section: ClipSection): string {
  const rows = section.clips.map((c: Clip) => `| \`web/static${c.url}\` | ${cell(c.says)} | ${cell(c.when)} |`);
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
  const announcerCount = ANNOUNCER.reduce((n, s) => n + s.clips.length, 0);
  return [
    "# Beyfest: Tetrafatalis: clip list",
    "",
    "Every sound the TV plays. Generated from `tournament-app/web/src/lib/clips.ts` by `bun run scripts/clips.ts` (run in `tournament-app`); change the list there, not here.",
    "",
    `**To commission:** ${announcerCount} announcer clips, ${names.clips.length} fighter name calls, ` +
      `and the ${MUSIC_AND_EFFECTS.clips.length} music, effect and narration files.`,
    "",
    "**How to deliver the announcer clips**",
    "",
    "- MP3, one call per file, under exactly the file name below.",
    "- Trim the silence off both ends: calls are chained with a 0.15 s breath, so any padding shows as a pause.",
    "- A line starting \"…\" is said straight after a name (\"The Buzzsaw … is VICTORIOUS!\"), so it should sound like the end of a sentence.",
    "- Until a file is in place the TV skips that call without a gap, so clips can arrive a few at a time.",
    "",
    ...ANNOUNCER.map(table),
    table(names),
    table(MUSIC_AND_EFFECTS),
  ].join("\n");
}

if (import.meta.main) {
  const startersJson = readFileSync(STARTERS, "utf8");
  writeFileSync(OUT, clipsMarkdown(startersJson));
  console.log(`Wrote ${OUT}\n`);
  const sections = [...ANNOUNCER, nameCalls(startersJson), MUSIC_AND_EFFECTS];
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
