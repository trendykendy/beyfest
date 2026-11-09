// Signing in on the phone page: who's at the event, as a player or a
// spectator (migration 1710002400_people). The players become the
// tournament's player list when the organiser draws the groups, and everyone
// signed in can wager.
//
// These are the rules, kept free of PocketBase so they can be tested: the
// phone endpoint (/live/me) and the admin page both check through them.

import { cleanName, sameName } from "./betting";

export type Role = "player" | "spectator";

export interface PBPerson {
  id: string;
  name: string;
  role: Role;
  starter: string; // combat name of the starting fighter they picked, "" if none
  phone: boolean; // signed in on a phone (false: the organiser added them)
  created: string; // ISO
}

// A starting fighter as sign-in needs it: the combat name and the player name
// that goes on the list (the combat name if the starter has no player).
export interface StarterRef {
  name: string;
  player: string;
}

export type SignInAsk = { role: Role; name?: string; starter?: string };
// claim: the id of someone the organiser added by hand, whom this phone now
// signs in as (keeping their place on the list), instead of a new person.
export type SignInOk = { name: string; role: Role; starter: string; claim?: string };

const TAKEN_STARTER = (s: StarterRef) => `${s.name} is already signed in. If that's you, ask the organiser.`;

// The starter a name belongs to: their player name or their combat name.
export function starterNamed(starters: StarterRef[], name: string): StarterRef | undefined {
  return starters.find((s) => sameName(s.player, name) || sameName(s.name, name));
}

// A new sign-in, checked against everyone already signed in. `drawn`: the
// groups exist, so it's too late to play. The organiser's "add" uses this
// too (with drawn false: the admin list only shows before the draw).
//
// A player picks a starting fighter or types a name. A typed name that
// belongs to a starter counts as picking that starter, so the same person
// can't end up on the list twice.
//
// Someone the organiser added by hand has no phone yet: signing in as them
// (same starter, or same name) claims them, as whatever they were added as.
// Someone already signed in on a phone can't be taken over.
export function checkSignIn(
  ask: SignInAsk,
  people: PBPerson[],
  starters: StarterRef[],
  drawn: boolean,
): SignInOk | { error: string } {
  if (ask.role !== "player" && ask.role !== "spectator") return { error: "Say whether you're playing or watching." };

  let starter: StarterRef | undefined;
  let name: string | null;
  if (ask.role === "player" && ask.starter) {
    starter = starters.find((s) => s.name === ask.starter);
    if (!starter) return { error: "That fighter isn't on the list." };
    name = starter.player;
  } else {
    name = cleanName(String(ask.name ?? ""));
    if (!name) return { error: "Pick a name of 2 to 16 letters." };
    if (ask.role === "player") starter = starterNamed(starters, name);
    if (starter) name = starter.player;
  }

  const holder = starter && people.find((p) => p.starter && sameName(p.starter, starter.name));
  const taken = holder ?? people.find((p) => sameName(p.name, name));
  if (taken && !taken.phone) return { name: taken.name, role: taken.role, starter: taken.starter, claim: taken.id };
  if (holder) return { error: TAKEN_STARTER(starter!) };
  if (taken) return { error: `Someone is already signed in as ${taken.name}. Try another name.` };

  if (ask.role === "player" && drawn) {
    return { error: "The groups are already drawn, so it's too late to play. You can still sign in to watch." };
  }
  return { name, role: ask.role, starter: starter?.name ?? "" };
}

// Switching between playing and watching, before the groups are drawn.
// A spectator who becomes a player picks up their starter if their name is
// one; a player who becomes a spectator lets theirs go.
export function checkRole(
  me: PBPerson,
  role: Role,
  people: PBPerson[],
  starters: StarterRef[],
  drawn: boolean,
): { role: Role; starter: string } | { error: string } {
  if (role !== "player" && role !== "spectator") return { error: "Say whether you're playing or watching." };
  if (drawn) return { error: "The groups are already drawn, so that can't change now." };
  if (role === "spectator") return { role, starter: "" };
  const starter = starterNamed(starters, me.name);
  if (starter && people.some((p) => p.id !== me.id && p.starter && sameName(p.starter, starter.name))) {
    return { error: TAKEN_STARTER(starter) };
  }
  return { role, starter: starter?.name ?? me.starter };
}

// The organiser fixing a name. A starter keeps its fighter whatever the
// person is called.
export function checkRename(me: PBPerson, raw: string, people: PBPerson[]): { name: string } | { error: string } {
  const name = cleanName(raw);
  if (!name) return { error: "Names are 2 to 16 letters." };
  const taken = people.find((p) => p.id !== me.id && sameName(p.name, name));
  if (taken) return { error: `${taken.name} is already on the list.` };
  return { name };
}

// The players, first signed in first: the names the groups are drawn from.
export const playersOf = (people: PBPerson[]) =>
  people.filter((p) => p.role === "player").sort((a, b) => a.created.localeCompare(b.created) || a.name.localeCompare(b.name));

// ── This phone's sign-in ──────────────────────────────────────────────
// The token proves the phone that signed in is the one wagering. Kept under
// the old betting key, so a phone that joined betting before keeps working
// the same way (a stale one is just told to sign in again).
export type Me = { id: string; name: string; token: string };
const KEY = "beyfest.bettor";

export function loadMe(): Me | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return v && typeof v.id === "string" && typeof v.token === "string" && typeof v.name === "string" ? v : null;
  } catch {
    return null;
  }
}

export function saveMe(me: Me | null) {
  try {
    if (me) localStorage.setItem(KEY, JSON.stringify(me));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: the sign-in won't survive a reload */
  }
}
