// Makes the announcer's clips with ElevenLabs text to speech, straight from
// the clip list (web/src/lib/clips.ts and the starter fighters, the same list
// as fighter-art/prompts/announcer-clips.md), trims the silence off both ends
// with ffmpeg and saves each one under its file name in web/static.
//
//   bun run announcer voices                  the voices in the ElevenLabs account
//   bun run announcer audition <id>[,<id>…]   a few sample lines per voice, into audio/audition/
//   bun run announcer try <variants.json> --voice <id>   delivery experiments, with a listening page
//   bun run announcer generate --voice <id>   every clip that isn't there yet
//       --force        remake clips that are already there
//       --names        include the 12 name calls (those start as the 2026 files)
//       --only <text>  just the clips whose file name contains <text>
//       --dry-run      list what would be made, without calling ElevenLabs
//
// The API key comes from ../.env.local (written by the ElevenLabs CLI's
// onboarding; `bun run announcer` loads it). It's never in the code.

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { ANNOUNCER, type Clip } from "../web/src/lib/clips.ts";
import { nameCalls } from "./clips.ts";
import { FIGHTER_CALLS, type FighterCall } from "../web/src/lib/fighters.ts";

const ROOT = join(import.meta.dir, "..");
const STATIC = join(ROOT, "web/static");
const STARTERS = join(STATIC, "starter-fighters/fighters.json");
const AUDITION = join(ROOT, "audio/audition"); // audio/ is gitignored

// Eleven v4: the highest-quality model. It takes only stability and
// similarity; a lower stability gives an announcer more swing and energy.
const MODEL = "eleven_v4";
const SETTINGS = { stability: 0.35, similarityBoost: 0.75 };
const FORMAT = "mp3_44100_128";

const AUDITION_LINES = [
  { file: "victorious", text: "The Buzzsaw is VICTORIOUS!" },
  { file: "circle-one", text: "Circle One!" },
  { file: "hero", text: "The Breycist … Hero of Gyrondor!" },
];

// What the voice actually reads. A line written "…Still Standing!" on the
// list is said straight after a name, so the leading and trailing ellipses
// go ("and", "Still Standing!"); one in the middle stays as a pause.
export function spokenText(says: string): string {
  return says.replace(/^[\s…]+/, "").replace(/[\s…]+$/, "");
}

const client = () => {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY isn't set: run this as `bun run announcer …` so ../.env.local is loaded.");
  }
  return new ElevenLabsClient();
};

async function speak(voiceId: string, text: string): Promise<Buffer> {
  const audio = await client().textToSpeech.convert(voiceId, {
    text,
    modelId: MODEL,
    outputFormat: FORMAT,
    voiceSettings: SETTINGS,
  });
  return Buffer.from(await new Response(audio).arrayBuffer());
}

// Trim the silence off both ends (calls are chained with a 0.15 s breath, so
// padding would show as a pause) and save as MP3 at `out`.
function trimTo(raw: Buffer, out: string) {
  const tmp = join(tmpdir(), `announcer-${process.pid}-${Date.now()}.mp3`);
  writeFileSync(tmp, raw);
  const edge = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02";
  mkdirSync(dirname(out), { recursive: true });
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-af", `${edge},areverse,${edge},areverse`, "-c:a", "libmp3lame", "-q:a", "2", out]);
  rmSync(tmp, { force: true });
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${out}: ${r.stderr?.toString() || r.error}`);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(name);

async function listVoices() {
  const { voices } = await client().voices.search({ pageSize: 100 });
  for (const v of voices) {
    const labels = Object.values(v.labels ?? {}).join(", ");
    console.log(`${v.voiceId}  ${v.name}${labels ? `  (${labels})` : ""}`);
  }
}

async function audition(ids: string[]) {
  for (const id of ids) {
    for (const line of AUDITION_LINES) {
      const out = join(AUDITION, id, `${line.file}.mp3`);
      trimTo(await speak(id, line.text), out);
      console.log(`made ${out}`);
    }
  }
}

// ── Trying out a delivery ─────────────────────────────────────────────
// `try <variants.json> --voice <id>` makes one clip per variant into a
// folder beside the file, plus index.html to play them side by side, each
// labelled with what made it. A variant: { name, text, model?, stability?,
// similarity?, style?, environment? } (style only works on the v2/v3 models;
// environment is a reverb from ElevenLabs' audio effects, e.g. "hall";
// previous is unspoken text the line follows, to set its mood).
interface Variant {
  name: string;
  text: string;
  model?: string;
  stability?: number;
  similarity?: number;
  style?: number;
  environment?: string;
  previous?: string; // unspoken lead-in text that sets the mood (request stitching)
}

async function tryVariants(file: string, voiceId: string) {
  const variants: Variant[] = JSON.parse(readFileSync(file, "utf8"));
  const dir = join(dirname(file), file.split(/[\\/]/).pop()!.replace(/\.json$/, ""));
  const rows: string[] = [];
  for (const v of variants) {
    const model = v.model ?? MODEL;
    const settings = {
      stability: v.stability ?? SETTINGS.stability,
      similarityBoost: v.similarity ?? SETTINGS.similarityBoost,
      ...(v.style !== undefined ? { style: v.style } : {}),
    };
    const label =
      `${model} · stability ${settings.stability} · similarity ${settings.similarityBoost}` +
      `${v.style !== undefined ? ` · style ${v.style}` : ""}${v.environment ? ` · ${v.environment}` : ""}` +
      `${v.previous ? ` · after (unspoken) "${v.previous}"` : ""}`;
    try {
      const audio = await client().textToSpeech.convert(voiceId, {
        text: v.text,
        modelId: model,
        outputFormat: FORMAT,
        voiceSettings: settings,
        ...(v.environment ? { audioEffects: { environmentId: v.environment } } : {}),
        ...(v.previous ? { previousText: v.previous } : {}),
      });
      trimTo(Buffer.from(await new Response(audio).arrayBuffer()), join(dir, `${v.name}.mp3`));
      rows.push(`<li><b>${v.name}</b> <code>${v.text}</code><br><small>${label}</small><br><audio controls src="${v.name}.mp3"></audio></li>`);
      console.log(`made ${v.name}`);
    } catch (e) {
      rows.push(`<li><b>${v.name}</b> <code>${v.text}</code><br><small>${label}: failed (${(e as Error).message})</small></li>`);
      console.log(`FAILED ${v.name}: ${(e as Error).message}`);
    }
  }
  const page = `<!doctype html><meta charset="utf-8"><title>Announcer tries</title>
<style>body{font:16px system-ui;max-width:760px;margin:2em auto;padding:0 16px}li{margin:0 0 1.4em}code{background:#eee;padding:1px 4px}audio{margin-top:4px;width:100%}</style>
<h1>Announcer tries</h1><p>Voice ${voiceId}</p><ol>${rows.join("\n")}</ol>`;
  writeFileSync(join(dir, "index.html"), page);
  console.log(`\nListen: ${join(dir, "index.html")}`);
}

// ── The battle cries ─────────────────────────────────────────────────
// How each fighter's own calls are delivered, settled by ear on 2026-11-09
// (audio/audition/battle-cry-3, take 09, then checked on three more names):
// the accent tag holds her refined English accent; the pause after the name
// gives an almost-growled name, then the cry. Eleven v4, stability 0.3,
// voice match 0.95, hall reverb.
const ACCENT = "[regal, commanding, in a refined English accent]";
const CRY = { stability: 0.3, similarityBoost: 0.95 };
const CRY_ROOM = "hall";
const CRY_LINES: Record<FighterCall, (name: string) => string> = {
  callVictorious: (name) => `${ACCENT} ${name}... [exclaiming triumphantly] is VICTORIOUS!!!`,
  callRoyaleChampion: (name) => `${ACCENT} ${name}... [exclaiming triumphantly] Last One Standing!!!`,
  callChampion: (name) => `${ACCENT} ${name}... [exclaiming triumphantly] Hero of Gyrondor!!!`,
};

interface Job {
  url: string;
  text: string;
  settings: { stability: number; similarityBoost: number };
  environment?: string;
}

// Everything `generate` can make: the shared clips as written on the list
// (their delivery is still to be settled), each starter's own calls as
// battle cries, and with --names the name calls.
function jobs(startersJson: string): Job[] {
  const starters = JSON.parse(startersJson) as ({ name: string } & Partial<Record<FighterCall, string>>)[];
  const plain = (c: Clip): Job => ({ url: c.url, text: spokenText(c.says), settings: SETTINGS });
  return [
    ...ANNOUNCER.flatMap((s) => s.clips).map(plain),
    ...starters.flatMap((s) =>
      FIGHTER_CALLS.filter((call) => s[call]).map((call) => ({
        url: `/starter-fighters/${s[call]}`,
        text: CRY_LINES[call](s.name),
        settings: CRY,
        environment: CRY_ROOM,
      })),
    ),
    ...(flag("--names") ? nameCalls(startersJson).clips.map(plain) : []),
  ];
}

async function generate(voiceId: string) {
  const only = arg("--only");
  const todo = jobs(readFileSync(STARTERS, "utf8"))
    .filter((j) => !only || j.url.includes(only))
    .filter((j) => flag("--force") || !existsSync(join(STATIC, j.url)));
  console.log(`${todo.length} clip(s) to make with voice ${voiceId}${flag("--dry-run") ? " (dry run)" : ""}`);
  const made: Job[] = [];
  for (const j of todo) {
    if (flag("--dry-run")) {
      console.log(`  ${j.url}  "${j.text}"`);
      continue;
    }
    const audio = await client().textToSpeech.convert(voiceId, {
      text: j.text,
      modelId: MODEL,
      outputFormat: FORMAT,
      voiceSettings: j.settings,
      ...(j.environment ? { audioEffects: { environmentId: j.environment } } : {}),
    });
    trimTo(Buffer.from(await new Response(audio).arrayBuffer()), join(STATIC, j.url));
    made.push(j);
    console.log(`  made ${j.url}`);
  }
  if (made.length) {
    // A page to listen to this run's clips where they now sit in web/static.
    const page = join(AUDITION, "generated.html");
    const rows = made.map((j) => `<li><code>${j.url}</code><br><audio controls src="../../web/static${j.url}"></audio></li>`);
    mkdirSync(AUDITION, { recursive: true });
    writeFileSync(
      page,
      `<!doctype html><meta charset="utf-8"><title>Generated clips</title><style>body{font:16px system-ui;max-width:760px;margin:2em auto;padding:0 16px}li{margin:0 0 1.2em}audio{width:100%}</style><h1>Generated clips</h1><ol>${rows.join("\n")}</ol>`,
    );
    console.log(`\nListen: ${page}`);
  }
}

if (import.meta.main) {
  const [command, rest] = [process.argv[2], process.argv[3]];
  if (command === "voices") await listVoices();
  else if (command === "audition" && rest) await audition(rest.split(","));
  else if (command === "generate" && arg("--voice")) await generate(arg("--voice")!);
  else if (command === "try" && rest && arg("--voice")) await tryVariants(rest, arg("--voice")!);
  else {
    console.log("Usage: bun run announcer voices | audition <id>[,<id>…] | generate --voice <id> [--force] [--names] [--only <text>] [--dry-run]");
    process.exit(1);
  }
}
