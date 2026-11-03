import { dev } from "$app/environment";
import { error, json } from "@sveltejs/kit";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RequestHandler } from "./$types";

// Dev-only store for the phrase review lab: reads and writes
// src/lib/speech/review.json in the checkout. Vite runs from tournament-app/web,
// but fall back to the repo layout in case it was started one level up.
// Never available in a built app (404).

type Verdict = { status: "approved" | "denied"; note?: string; at: string; textAtReview: string };
type Review = Record<string, Verdict>;

function reviewPath(): string {
  const here = resolve(process.cwd(), "src/lib/speech");
  const dir = existsSync(here) ? here : resolve(process.cwd(), "web/src/lib/speech");
  return resolve(dir, "review.json");
}

async function load(): Promise<Review> {
  try {
    return JSON.parse(await readFile(reviewPath(), "utf8")) as Review;
  } catch {
    return {};
  }
}

export const GET: RequestHandler = async () => {
  if (!dev) error(404);
  return json(await load());
};

// Body: { verdicts: { [id]: { status: "approved" | "denied" | "clear", note?, textAtReview } } }
// "clear" removes the verdict. Returns the whole review after saving.
export const POST: RequestHandler = async ({ request }) => {
  if (!dev) error(404);
  const body = (await request.json()) as {
    verdicts?: Record<string, { status: string; note?: string; textAtReview?: string }>;
  };
  if (!body?.verdicts || typeof body.verdicts !== "object") error(400, "verdicts missing");

  const review = await load();
  const at = new Date().toISOString();
  for (const [id, v] of Object.entries(body.verdicts)) {
    if (v.status === "clear") {
      delete review[id];
      continue;
    }
    if (v.status !== "approved" && v.status !== "denied") error(400, `bad status for ${id}`);
    const note = v.note?.trim();
    review[id] = { status: v.status, ...(note ? { note } : {}), at, textAtReview: String(v.textAtReview ?? "") };
  }

  // Sorted keys keep the file's diffs readable.
  const sorted: Review = {};
  for (const k of Object.keys(review).sort()) sorted[k] = review[k];
  await writeFile(reviewPath(), JSON.stringify(sorted, null, 2) + "\n");
  return json(sorted);
};
