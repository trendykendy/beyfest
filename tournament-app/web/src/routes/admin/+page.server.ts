import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { loadTournamentView, loadTvState } from "$lib/server/load";
import { MUSIC_LEVELS, SCENE_TITLE, type Scene } from "$lib/view";
import {
  createTournament,
  correctScore,
  enterScore,
  recordWalkover,
  renamePlayer,
  setWithdrawn,
  generateKnockoutStage,
  getActiveTournament,
  resetTournament,
  archiveTournament,
} from "$lib/server/tournament";
import { starterPicks } from "$lib/server/starterFiles";
import { addStarters } from "$lib/server/addStarters";
import { createRoyale, recordBattle, resetRoyale, RoyaleError, startBattle } from "$lib/server/royale";
import { startersFor } from "$lib/starters";
import { loadBetting, loadPeople } from "$lib/server/load";
import { checkRename, checkRole, checkSignIn, playersOf, type Role } from "$lib/people";

// Archived tournaments, newest first, for the download list. Its own request
// key: it runs alongside loadTournamentView's identical query, which the
// PocketBase client would otherwise cancel as a duplicate.
async function archivedList(pb: App.Locals["pb"]) {
  const all = await pb.collection("tournaments").getFullList({ sort: "-createdAt", requestKey: "archived-list" });
  return all
    .filter((t) => t.archivedAt)
    .map((t) => ({ id: t.id as string, name: t.name as string, createdAt: t.createdAt as string, archivedAt: t.archivedAt as string }));
}

export const load: PageServerLoad = async ({ locals }) => {
  const [view, tv, archived, people] = await Promise.all([
    loadTournamentView(locals.pb),
    loadTvState(locals.pb),
    archivedList(locals.pb),
    loadPeople(locals.pb),
  ]);
  // Whether anyone has wagered: the Lord of Gold needs someone to crown.
  const wagers = view.tournament ? (await loadBetting(locals.pb, view.tournament.id, people)).bets.length > 0 : false;
  return { ...view, tv, archived, people, wagers, starters: view.tournament ? [] : await starterPicks() };
};

// A check-in change before the draw; a broken rule comes back as the page's error.
async function checkInDo(locals: App.Locals, work: () => Promise<string | void>) {
  if (await getActiveTournament(locals.pb)) return fail(409, { error: "The groups are already drawn." });
  const problem = await work();
  return problem ? fail(400, { error: problem }) : { checkin: true };
}

// Run a battle royale change; a broken rule comes back as the page's error.
async function royaleDo(work: () => Promise<void>) {
  try {
    await work();
  } catch (e) {
    if (e instanceof RoyaleError) return fail(400, { error: e.message });
    throw e;
  }
  return { royale: true };
}

export const actions: Actions = {
  // Draw the groups from everyone checked in as a player (names are unique:
  // the people collection makes sure).
  create: async ({ request, locals }) => {
    const data = await request.formData();
    const name = String(data.get("name") || "");
    const players = playersOf(await loadPeople(locals.pb));
    const names = players.map((p) => p.name);

    if (names.length < 8 || names.length > 15) {
      return fail(400, { error: `You need between 8 and 15 bladers checked in (there are ${names.length}).`, name });
    }
    const existing = await getActiveTournament(locals.pb);
    if (existing) {
      return fail(409, { error: "A tournament already exists. Reset it first.", name });
    }

    // Load the starters who are playing, before the tournament exists, so the
    // TV has their fighters as soon as it appears. A new install's library is
    // empty, which would leave Match centre with no art or speech bubbles.
    // A starter is found by the person's name or the fighter they picked
    // (the organiser may have renamed them). A failure here is worth a
    // warning, not a lost tournament.
    let warning = "";
    const picked = players.map((p) => p.starter).filter(Boolean);
    try {
      const { problems } = await addStarters(locals.pb, (all) => startersFor(all, [...names, ...picked]));
      if (problems.length) warning = `Some starting fighters didn't load. ${problems.join("; ")}`;
    } catch (e) {
      warning = `Couldn't load the starting fighters: ${(e as Error).message}`;
    }

    try {
      await createTournament(locals.pb, name, names);
    } catch (e) {
      return fail(500, { error: (e as Error).message, name });
    }
    return warning ? { created: true, error: warning } : { created: true };
  },

  // ── Check-in, before the draw (see lib/people.ts) ──
  // Someone with no phone: added by hand, as a player.
  checkinAdd: async ({ request, locals }) => {
    const data = await request.formData();
    return checkInDo(locals, async () => {
      const [people, starters] = await Promise.all([loadPeople(locals.pb), starterPicks()]);
      const ok = checkSignIn({ role: "player", name: String(data.get("name") || "") }, people, starters, false);
      if ("error" in ok) return ok.error;
      if (ok.claim) return `${ok.name} is already on the list.`;
      await locals.pb.collection("people").create({ ...ok, phone: false });
    });
  },

  // The starting fighters ticked in the pop-up who aren't checked in yet.
  checkinStarters: async ({ request, locals }) => {
    const data = await request.formData();
    const ticked = data.getAll("starter").map(String);
    return checkInDo(locals, async () => {
      const [people, starters] = await Promise.all([loadPeople(locals.pb), starterPicks()]);
      for (const starter of ticked) {
        const ok = checkSignIn({ role: "player", starter }, people, starters, false);
        if ("error" in ok || ok.claim) continue; // already here
        const rec = await locals.pb.collection("people").create({ ...ok, phone: false });
        people.push({ id: rec.id, ...ok, phone: false, created: "" });
      }
    });
  },

  checkinRename: async ({ request, locals }) => {
    const data = await request.formData();
    return checkInDo(locals, async () => {
      const people = await loadPeople(locals.pb);
      const me = people.find((p) => p.id === data.get("id"));
      if (!me) return "They're not on the list any more.";
      const ok = checkRename(me, String(data.get("name") || ""), people);
      if ("error" in ok) return ok.error;
      await locals.pb.collection("people").update(me.id, ok);
    });
  },

  checkinRole: async ({ request, locals }) => {
    const data = await request.formData();
    return checkInDo(locals, async () => {
      const [people, starters] = await Promise.all([loadPeople(locals.pb), starterPicks()]);
      const me = people.find((p) => p.id === data.get("id"));
      if (!me) return "They're not on the list any more.";
      const ok = checkRole(me, String(data.get("role")) as Role, people, starters, false);
      if ("error" in ok) return ok.error;
      await locals.pb.collection("people").update(me.id, ok);
    });
  },

  // Takes them off the list; their phone is asked to sign in again.
  checkinRemove: async ({ request, locals }) => {
    const data = await request.formData();
    return checkInDo(locals, async () => {
      await locals.pb
        .collection("people")
        .delete(String(data.get("id")))
        .catch(() => {}); // already gone
    });
  },

  // A new event day: everyone signs in again. Only with no tournament up
  // (reset or archive it first), since wagers go with their sign-ins.
  checkinClear: async ({ locals }) => {
    return checkInDo(locals, async () => {
      const people = await loadPeople(locals.pb);
      for (const p of people) await locals.pb.collection("people").delete(p.id);
    });
  },

  score: async ({ request, locals }) => {
    const data = await request.formData();
    const code = String(data.get("code") || "");
    const s1 = Number(data.get("s1"));
    const s2 = Number(data.get("s2"));
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "No active tournament." });
    if (!Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0) {
      return fail(400, { error: "Scores must be non-negative whole numbers." });
    }
    if (s1 === s2) return fail(400, { error: "Matches can't end in a draw." });
    try {
      await enterScore(locals.pb, t.id, code, s1, s2);
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    return { scored: code };
  },

  // Fix a result that's already in. The engine refuses (with a plain-words
  // reason) if a later match has been played with the old winner or loser.
  correct: async ({ request, locals }) => {
    const data = await request.formData();
    const code = String(data.get("code") || "");
    const s1 = Number(data.get("s1"));
    const s2 = Number(data.get("s2"));
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "No active tournament." });
    if (!Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0) {
      return fail(400, { error: "Scores must be non-negative whole numbers.", fixing: code });
    }
    if (s1 === s2) return fail(400, { error: "Matches can't end in a draw.", fixing: code });
    try {
      await correctScore(locals.pb, t.id, code, s1, s2);
    } catch (e) {
      return fail(400, { error: (e as Error).message, fixing: code });
    }
    return { corrected: code };
  },

  // A no-show on a playable match: the other blader wins at the target, 0 against.
  walkover: async ({ request, locals }) => {
    const data = await request.formData();
    const code = String(data.get("code") || "");
    const noShow = Number(data.get("noShow"));
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "No active tournament." });
    if (noShow !== 1 && noShow !== 2) return fail(400, { error: "Pick who didn't show." });
    try {
      await recordWalkover(locals.pb, t.id, code, noShow);
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    return { walkover: code };
  },

  // A blader leaves (withdrawn=true) or comes back (false).
  withdraw: async ({ request, locals }) => {
    const data = await request.formData();
    const player = String(data.get("player") || "");
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "No active tournament." });
    try {
      await setWithdrawn(locals.pb, t.id, player, data.get("withdrawn") === "true");
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    return { withdrawn: player };
  },

  rename: async ({ request, locals }) => {
    const data = await request.formData();
    const player = String(data.get("player") || "");
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "No active tournament." });
    try {
      await renamePlayer(locals.pb, t.id, player, String(data.get("name") || ""));
    } catch (e) {
      return fail(400, { error: (e as Error).message, renaming: player });
    }
    return { renamed: player };
  },

  // "Begin the Paths": generates the knockout, which ends the TV's Respite,
  // and remembers when (outright wagers close then).
  generateKnockout: async ({ locals }) => {
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "No active tournament." });
    try {
      await generateKnockoutStage(locals.pb, t.id);
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    await locals.pb.collection("tournaments").update(t.id, { pathsBegunAt: Date.now() });
    return { knockout: true };
  },

  // "Show the Circles": the TV leaves the Gathering for the group overview.
  showCircles: async ({ locals }) => {
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "No active tournament." });
    await locals.pb.collection("tournaments").update(t.id, { groupsShownAt: Date.now() });
    return { tv: true };
  },

  // "Crown the Lord of Gold": the TV shows the richest wagerers for a short
  // while (LORD_OF_GOLD_SECONDS), then goes back to the champion.
  crown: async ({ locals }) => {
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "No active tournament." });
    await locals.pb.collection("tournaments").update(t.id, { crownedAt: Date.now() });
    return { tv: true };
  },

  // What the venue TV shows: "Auto" (rotate + cut to live scores) or lock it
  // on one scene. The TV follows the tv_state record live.
  tv: async ({ request, locals }) => {
    const data = await request.formData();
    const auto = data.get("mode") === "auto";
    const scene = String(data.get("scene") || "") as Scene;
    if (!auto && !(scene in SCENE_TITLE)) return fail(400, { error: "Unknown TV scene." });
    const tv = await loadTvState(locals.pb);
    if (!tv.id) {
      return fail(500, { error: "TV settings are missing. Restart PocketBase so its migrations run." });
    }
    await locals.pb.collection("tv_state").update(tv.id, auto ? { mode: "auto" } : { mode: "locked", scene });
    return { tv: true };
  },

  // The TV's sound: on/off, and how loud the match music is.
  sound: async ({ request, locals }) => {
    const data = await request.formData();
    const tv = await loadTvState(locals.pb);
    if (!tv.id) {
      return fail(500, { error: "TV settings are missing. Restart PocketBase so its migrations run." });
    }
    const change: { soundOff?: boolean; musicLevel?: number } = {};
    if (data.has("soundOff")) change.soundOff = data.get("soundOff") === "true";
    if (data.has("musicLevel")) {
      const level = Number(data.get("musicLevel"));
      if (!MUSIC_LEVELS.some((l) => l.value === level)) return fail(400, { error: "Unknown music level." });
      change.musicLevel = level;
    }
    await locals.pb.collection("tv_state").update(tv.id, change);
    return { sound: true };
  },

  // "Play the intro": the TV plays the Beyfest intro over everything as soon
  // as it sees introAt change.
  intro: async ({ locals }) => {
    const tv = await loadTvState(locals.pb);
    if (!tv.id) {
      return fail(500, { error: "TV settings are missing. Restart PocketBase so its migrations run." });
    }
    await locals.pb.collection("tv_state").update(tv.id, { introAt: Date.now() });
    return { intro: true };
  },

  // "Score this": remember the organiser's pick, so the TV's "Up next" shows
  // that match and a reload of this page keeps it.
  pick: async ({ request, locals }) => {
    const code = String((await request.formData()).get("code") || "").slice(0, 20);
    const tv = await loadTvState(locals.pb);
    if (tv.id) await locals.pb.collection("tv_state").update(tv.id, { next: code });
    return { picked: code };
  },

  // Keep the tournament, results and all, but put it away so a new one can
  // start. The TV goes back to rotating, as after a reset.
  archive: async ({ locals }) => {
    const t = await getActiveTournament(locals.pb);
    if (t) await archiveTournament(locals.pb, t.id);
    const tv = await loadTvState(locals.pb);
    if (tv.id) await locals.pb.collection("tv_state").update(tv.id, { mode: "auto", next: "" });
    return { archived: true };
  },

  reset: async ({ locals }) => {
    const t = await getActiveTournament(locals.pb);
    if (t) await resetTournament(locals.pb, t.id);
    // A lock from the old tournament could point at a scene the new one
    // doesn't have yet, so the TV goes back to rotating.
    const tv = await loadTvState(locals.pb);
    if (tv.id) await locals.pb.collection("tv_state").update(tv.id, { mode: "auto", next: "" });
    return { reset: true };
  },

  // ── Battle royale (after the main tournament; see lib/royale.ts) ──
  // Start it: the ticked tournament players plus any names added, and how
  // many fit around the arena at once.
  royaleCreate: async ({ request, locals }) => {
    const data = await request.formData();
    const t = await getActiveTournament(locals.pb);
    if (!t) return fail(400, { error: "There's no tournament." });
    const names = [
      ...data.getAll("names").map(String),
      ...String(data.get("extra") || "").split(/[\n,]/),
    ];
    return royaleDo(() => createRoyale(locals.pb, t.id, names, Number(data.get("spaces"))));
  },

  // Start (or cancel the start of) a battle: the TV plays its intro.
  royaleStart: async ({ request, locals }) => {
    const data = await request.formData();
    return royaleDo(() =>
      startBattle(locals.pb, String(data.get("id")), String(data.get("key")), data.get("start") === "true"),
    );
  },

  // A battle's result: winner and runner-up, or who goes through from the
  // sudden death.
  royaleResult: async ({ request, locals }) => {
    const data = await request.formData();
    return royaleDo(() =>
      recordBattle(locals.pb, String(data.get("id")), String(data.get("key")), {
        winner: String(data.get("winner") || ""),
        runnerUp: String(data.get("runnerUp") || ""),
        advancing: data.getAll("advancing").map(String),
      }),
    );
  },

  royaleReset: async ({ request, locals }) => {
    const id = String((await request.formData()).get("id") || "");
    return royaleDo(() => resetRoyale(locals.pb, id));
  },

  logout: async ({ locals }) => {
    locals.pb.authStore.clear();
    throw redirect(303, "/");
  },
};
