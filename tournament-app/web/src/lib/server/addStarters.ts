// Loads the starting fighters into the library: the Fighters page's "Add
// starting fighters" button, and creating a tournament (a new install's library
// is empty, and without fighters Match centre has no art panels or bubbles).
// What gets added or filled in is decided by planStarters (lib/starters.ts).

import { loadFighters } from "$lib/server/load";
import { readStarters } from "$lib/server/starterFiles";
import { planStarters, type Starter } from "$lib/starters";
import type { PBFighter } from "$lib/fighters";

// Which fighters still missing a face point or mirror image have a starter's
// picture, byte for byte: fighter id → the picture's file name. Those can
// take what goes with the starter's picture even if it was uploaded by hand
// under another name.
async function starterPictures(
  pb: App.Locals["pb"],
  library: PBFighter[],
  starters: Starter[],
  file: (name: string) => Promise<File>,
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const wanted = library.filter((f) => f.image && (!f.face || !f.imageMirrored));
  const faced = starters.filter((s) => s.image && (s.face || s.imageMirrored));
  if (!wanted.length || !faced.length) return found;
  const sizes = new Map<number, string[]>(); // by size first, so few are compared in full
  const bytes = new Map<string, Uint8Array>();
  for (const s of faced) {
    const b = new Uint8Array(await (await file(s.image!)).arrayBuffer());
    bytes.set(s.image!, b);
    sizes.set(b.length, [...(sizes.get(b.length) ?? []), s.image!]);
  }
  for (const f of wanted) {
    try {
      const res = await fetch(pb.files.getURL({ id: f.id, collectionName: "fighters" }, f.image));
      if (!res.ok) continue;
      const b = new Uint8Array(await res.arrayBuffer());
      const name = (sizes.get(b.length) ?? []).find((n) => equal(bytes.get(n)!, b));
      if (name) found.set(f.id, name);
    } catch {
      // Can't read it: it just doesn't get a face point.
    }
  }
  return found;
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// `pick` narrows the starters to load (default: all of them). Throws if the
// starter files can't be read; a fighter that won't save goes in `problems`
// and the rest still load.
export async function addStarters(
  pb: App.Locals["pb"],
  pick: (starters: Starter[]) => Starter[] = (all) => all,
): Promise<{ added: number; filled: number; problems: string[] }> {
  const { starters: all, file } = await readStarters();
  const starters = pick(all);
  const library = await loadFighters(pb);
  const pictures = await starterPictures(pb, library, starters, file);
  let added = 0;
  let filled = 0;
  const problems: string[] = [];
  for (const step of planStarters(starters, library, pictures)) {
    const s = step.starter;
    try {
      if (step.kind === "add") {
        await pb.collection("fighters").create({
          name: s.name,
          player: s.player ?? "",
          kana: s.kana ?? "",
          mirror: !!s.mirror,
          face: s.face ?? null,
          ...(s.image ? { image: await file(s.image) } : {}),
          ...(s.imageMirrored ? { imageMirrored: await file(s.imageMirrored) } : {}),
          ...(s.victory ? { victory: await file(s.victory) } : {}),
          ...(s.royaleVictory ? { royaleVictory: await file(s.royaleVictory) } : {}),
          ...(s.profile ? { profile: await file(s.profile) } : {}),
          ...(s.voice ? { voice: await file(s.voice) } : {}),
        });
        added++;
      } else {
        const files: Record<string, File> = {};
        for (const k of step.files) files[k] = await file(s[k]!);
        await pb.collection("fighters").update(step.id, { ...step.fields, ...files });
        filled++;
      }
    } catch (e) {
      problems.push(`${s.name}: ${(e as Error).message}`);
    }
  }
  return { added, filled, problems };
}
