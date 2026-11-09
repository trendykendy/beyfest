import { error, json } from "@sveltejs/kit";
import { randomBytes } from "node:crypto";
import type { RequestHandler } from "./$types";
import type PocketBase from "pocketbase";
import { bookie } from "$lib/server/bookie";
import { oneAtATime } from "$lib/server/oneAtATime";
import { getActiveTournament } from "$lib/server/tournament";
import { loadPeople } from "$lib/server/load";
import { starterPicks } from "$lib/server/starterFiles";
import { checkRole, checkSignIn, type PBPerson, type Role } from "$lib/people";

// Signing in on the phone page (see lib/people.ts for the rules).
//   { action: "signin", role, name?, starter? } → { id, name, token }
//   { action: "role", id, token, role }         → { ok: true }
//   { action: "leave", id, token }              → { ok: true }
// Phones can't write to PocketBase, so this checks each ask against fresh
// data and writes it as the bookie superuser. The token proves later asks
// (and wagers) come from the phone that signed in.

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") error(400, "Bad request");
  const pb = await bookie();
  if (!pb) error(503, "Signing in is closed right now.");
  return oneAtATime(async () => {
    if (body.action === "signin") return signIn(pb, body);
    const me = await whoAmI(pb, body);
    if (body.action === "role") return setRole(pb, me, body.role);
    if (body.action === "leave") return leave(pb, me);
    error(400, "Bad request");
  });
};

const isDrawn = async (pb: PocketBase) => !!(await getActiveTournament(pb));

async function signIn(pb: PocketBase, body: { role?: unknown; name?: unknown; starter?: unknown }) {
  const [people, starters, drawn] = await Promise.all([loadPeople(pb), starterPicks(), isDrawn(pb)]);
  const ask = { role: body.role as Role, name: String(body.name ?? ""), starter: String(body.starter ?? "") };
  const ok = checkSignIn(ask, people, starters, drawn);
  if ("error" in ok) error(409, ok.error);
  const token = randomBytes(16).toString("hex");
  const { claim, ...fields } = ok;
  const rec = claim
    ? await pb.collection("people").update(claim, { token, phone: true })
    : await pb.collection("people").create({ ...fields, token, phone: true });
  return json({ id: rec.id, name: ok.name, token });
}

// The person this phone signed in as. Gone (the organiser removed them or
// cleared sign-ins): 410, and the phone forgets them and offers sign-in again.
async function whoAmI(pb: PocketBase, body: { id?: unknown; token?: unknown }): Promise<PBPerson> {
  const rec = await pb
    .collection("people")
    .getOne(String(body.id ?? ""))
    .catch(() => null);
  if (!rec) error(410, "Sign in again.");
  if (!rec.token || rec.token !== body.token) error(403, "This phone isn't signed in as that name.");
  const me = (await loadPeople(pb)).find((p) => p.id === rec.id);
  if (!me) error(410, "Sign in again.");
  return me;
}

async function setRole(pb: PocketBase, me: PBPerson, role: unknown) {
  const [people, starters, drawn] = await Promise.all([loadPeople(pb), starterPicks(), isDrawn(pb)]);
  const ok = checkRole(me, role as Role, people, starters, drawn);
  if ("error" in ok) error(409, ok.error);
  await pb.collection("people").update(me.id, ok);
  return json({ ok: true });
}

// Signing out. Before the draw it takes them off the list. After it, their
// name stays (they may be playing, and their wagers are kept); the phone
// just forgets it.
async function leave(pb: PocketBase, me: PBPerson) {
  if (!(await isDrawn(pb))) await pb.collection("people").delete(me.id);
  return json({ ok: true });
}
