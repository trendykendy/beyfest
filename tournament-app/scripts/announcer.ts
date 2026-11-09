// Makes the announcer's clips with ElevenLabs text to speech, straight from
// the clip list (web/src/lib/clips.ts and the starter fighters, the same list
// as fighter-art/prompts/announcer-clips.md), trims the silence off both ends
// with ffmpeg and saves each one under its file name in web/static.
//
//   bun run announcer voices                  the voices in the ElevenLabs account
//   bun run announcer audition <id>[,<id>…]   a few sample lines per voice, into audio/audition/
//   bun run announcer try <variants.json>     delivery experiments, with a listening page
//   bun run announcer generate                every clip that isn't there yet
//       --force        remake clips that are already there (the old ones go into the history)
//   bun run announcer candidates              variants of every line marked Redo on /admin/voices
//       --set <file>   the variants to make, per line, instead of the default three
//   Any command: --only <text> (just clips whose file name contains it),
//   --dry-run (list, without calling ElevenLabs), --voice <id> (default: the
//   Tetrafatalis Announcer, lib/voiceDirection.ts).
//
// The API key comes from ../.env.local (written by the ElevenLabs CLI's
// onboarding; `bun run announcer` loads it). It's never in the code.

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { voiceSections, type StarterVoices } from "../web/src/lib/clips.ts";
import { defaultDirections, variantsOf, VOICE_ID, type Direction } from "../web/src/lib/voiceDirection.ts";
import { voiceStore } from "../web/src/lib/server/voiceStore.ts";

const ROOT = join(import.meta.dir, "..");
const STATIC = join(ROOT, "web/static");
const STARTERS = join(STATIC, "starter-fighters/fighters.json");
const AUDITION = join(ROOT, "audio/audition"); // audio/ is gitignored

// For `audition` and `try` only (the clips use lib/voiceDirection.ts):
// Eleven v4, which takes only stability and similarity.
const MODEL = "eleven_v4";
const SETTINGS = { stability: 0.35, similarityBoost: 0.75 };
const FORMAT = "mp3_44100_128";

const AUDITION_LINES = [
  { file: "victorious", text: "The Buzzsaw is VICTORIOUS!" },
  { file: "circle-one", text: "Circle One!" },
  { file: "hero", text: "The Breycist … Hero of Gyrondor!" },
];

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

// ── The clips themselves ─────────────────────────────────────────────
// Each clip's direction (text, model, settings, room) is its own if it was
// re-done on the review page (voice-review/directions.json), else the default
// in web/src/lib/voiceDirection.ts.

const store = voiceStore(ROOT);
const starters = () => JSON.parse(readFileSync(STARTERS, "utf8")) as StarterVoices[];
const urls = (list: StarterVoices[]) => voiceSections(list).flatMap((s) => s.clips.map((c) => c.url));

async function speakAs(voiceId: string, d: Direction): Promise<Buffer> {
  const audio = await client().textToSpeech.convert(voiceId, {
    text: d.text,
    modelId: d.model,
    outputFormat: FORMAT,
    voiceSettings: { stability: d.stability, similarityBoost: d.similarity },
    ...(d.environment ? { audioEffects: { environmentId: d.environment } } : {}),
  });
  return Buffer.from(await new Response(audio).arrayBuffer());
}

const voice = () => arg("--voice") ?? VOICE_ID;

// Make every clip that isn't there yet (or, with --force, remake them; the
// old one goes into its history on the review page first).
async function generate() {
  const list = starters();
  const defaults = defaultDirections(list);
  const only = arg("--only");
  const todo = urls(list)
    .filter((u) => !only || u.includes(only))
    .filter((u) => flag("--force") || !existsSync(join(STATIC, u)));
  console.log(`${todo.length} clip(s) to make with voice ${voice()}${flag("--dry-run") ? " (dry run)" : ""}`);
  for (const url of todo) {
    const d = store.directionFor(url, defaults);
    if (!d) continue;
    if (flag("--dry-run")) {
      console.log(`  ${url}  "${d.text}"`);
      continue;
    }
    const raw = await speakAs(voice(), d);
    store.archive(url, "Regenerated", d); // only if there was one already
    trimTo(raw, join(STATIC, url));
    console.log(`  made ${url}`);
  }
}

// Candidates for every line marked Redo on the review page (or just those
// matching --only): three variants by default (voiceDirection.ts variantsOf),
// or the ones written for it in a --set file: { "<clip url>": [ { text?,
// stability?, similarity?, model?, environment? }, … ] }, each laid over the
// line's current direction. They appear under the line on the page.
async function candidates() {
  const list = starters();
  const defaults = defaultDirections(list);
  const marks = store.marks();
  const only = arg("--only");
  const set: Record<string, Partial<Direction>[]> = arg("--set") ? JSON.parse(readFileSync(arg("--set")!, "utf8")) : {};
  const todo = urls(list).filter((u) => (only ? u.includes(only) : marks[u]?.status === "redo"));
  console.log(`${todo.length} line(s) to make candidates for${flag("--dry-run") ? " (dry run)" : ""}`);
  for (const url of todo) {
    const base = store.directionFor(url, defaults);
    if (!base) continue;
    const variants = set[url]?.map((v) => ({ ...base, ...v })) ?? variantsOf(base);
    console.log(`  ${url}${marks[url]?.note ? `  (note: ${marks[url].note})` : ""}`);
    for (const d of variants) {
      if (flag("--dry-run")) {
        console.log(`    "${d.text}"`);
        continue;
      }
      const tmp = join(tmpdir(), `candidate-${process.pid}-${Date.now()}.mp3`);
      trimTo(await speakAs(voice(), d), tmp);
      store.addCandidate(url, tmp, d);
      console.log(`    made "${d.text}"`);
    }
  }
  if (todo.length && !flag("--dry-run")) console.log("\nListen and pick on the review page: /admin/voices (Candidates to hear)");
}

if (import.meta.main) {
  const [command, rest] = [process.argv[2], process.argv[3]];
  if (command === "voices") await listVoices();
  else if (command === "audition" && rest) await audition(rest.split(","));
  else if (command === "generate") await generate();
  else if (command === "candidates") await candidates();
  else if (command === "try" && rest) await tryVariants(rest, voice());
  else {
    console.log("Usage: bun run announcer voices | audition <id>[,<id>…] | try <variants.json> | generate [--force] [--only <text>] | candidates [--set <file.json>] [--only <text>]  (--voice <id>, --dry-run)");
    process.exit(1);
  }
}
