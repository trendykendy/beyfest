// Makes the announcer's clips with ElevenLabs text to speech, straight from
// the clip list (web/src/lib/clips.ts and the starter fighters, the same list
// as fighter-art/prompts/announcer-clips.md), trims the silence off both ends
// with ffmpeg and saves each one under its file name in web/static.
//
//   bun run announcer voices                  the voices in the ElevenLabs account
//   bun run announcer audition <id>[,<id>…]   a few sample lines per voice, into audio/audition/
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
import { fighterCalls, nameCalls } from "./clips.ts";

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

async function generate(voiceId: string) {
  const startersJson = readFileSync(STARTERS, "utf8");
  const sections = [...ANNOUNCER, fighterCalls(startersJson), ...(flag("--names") ? [nameCalls(startersJson)] : [])];
  const only = arg("--only");
  const todo: Clip[] = sections
    .flatMap((s) => s.clips)
    .filter((c) => !only || c.url.includes(only))
    .filter((c) => flag("--force") || !existsSync(join(STATIC, c.url)));
  console.log(`${todo.length} clip(s) to make with voice ${voiceId}${flag("--dry-run") ? " (dry run)" : ""}`);
  for (const c of todo) {
    const text = spokenText(c.says);
    if (flag("--dry-run")) {
      console.log(`  ${c.url}  "${text}"`);
      continue;
    }
    trimTo(await speak(voiceId, text), join(STATIC, c.url));
    console.log(`  made ${c.url}  "${text}"`);
  }
}

if (import.meta.main) {
  const [command, rest] = [process.argv[2], process.argv[3]];
  if (command === "voices") await listVoices();
  else if (command === "audition" && rest) await audition(rest.split(","));
  else if (command === "generate" && arg("--voice")) await generate(arg("--voice")!);
  else {
    console.log("Usage: bun run announcer voices | audition <id>[,<id>…] | generate --voice <id> [--force] [--names] [--only <text>] [--dry-run]");
    process.exit(1);
  }
}
