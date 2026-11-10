<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { liveUpdates } from "$lib/pbBrowser";
  import { EVENT, browserPbUrl } from "$lib/config";
  import { SCREENS, STAGES, TITLES, circleName } from "$lib/terms";
  import { books, leaderboard } from "$lib/betting";
  import FlowHold from "$lib/components/tv/FlowHold.svelte";
  import {
    artFor,
    faceCrop,
    fighterFor,
    fighterImageUrl,
    fighterMirroredUrl,
    fighterRoyaleVictoryUrl,
    fighterProfileUrl,
    fighterVictoryUrl,
    fighterVoiceUrl,
    fighterCallUrl,
    FIGHTER_CALLS,
    type Face,
  } from "$lib/fighters";
  import {
    QUALIFIED_CALL,
    ROYALE,
    STINGER,
    WINNER_SLAM,
    championCallFresh,
    finishClip,
    matchPointCalls,
    qualifiedCall,
    royaleLabelClip,
    titleClip,
    winsCall,
  } from "$lib/sounds";
  import { qualifiers, royaleView, type Battle } from "$lib/royale";
  import { ANNOUNCER_URLS } from "$lib/clips";
  import { Announcer, soundAllowed } from "$lib/components/tv/announcer";
  import { FINISHES } from "$lib/finishes";
  import { pickStructure, miniRRAdvancers, pointsToWin } from "@beyfest/engine";
  import {
    groupStandings,
    miniRRStandings,
    nameMap,
    slotLabel,
    destinationOf,
    ordinal,
    tierOf,
    hasStage,
    roundName,
    availableScenes,
    tvHold,
    isLive,
    liveMatches,
    upNext,
    rrFate,
    matchContext,
    computeAwards,
    championRun,
    playerRecord,
    SCENE_TITLE,
    type PBMatch,
    type Scene,
    type TvFlow,
  } from "$lib/view";
  import { stadiumOf } from "$lib/stadia";
  import BroadcastBracket from "$lib/components/tv/BroadcastBracket.svelte";
  import StadiumDraw from "$lib/components/tv/StadiumDraw.svelte";
  import ArenaScene, { type ArenaCallout, type ArenaSide, type ArenaStatus } from "$lib/components/tv/arena/ArenaScene.svelte";
  import VsIntro from "$lib/components/tv/VsIntro.svelte";
  import TvHeader from "$lib/components/tv/TvHeader.svelte";
  import ChampionScene from "$lib/components/tv/ChampionScene.svelte";
  import WinnerScreen from "$lib/components/tv/WinnerScreen.svelte";
  import RoyaleBoard from "$lib/components/tv/RoyaleBoard.svelte";
  import RoyaleIntro from "$lib/components/tv/RoyaleIntro.svelte";
  import RoyaleDraw from "$lib/components/tv/RoyaleDraw.svelte";
  import QualifiedScreen from "$lib/components/tv/QualifiedScreen.svelte";
  import ProvingScene, { type PathTier, type ProvingFixture, type ProvingTablet } from "$lib/components/tv/ProvingScene.svelte";
  import GatheringScene from "$lib/components/tv/GatheringScene.svelte";
  import DeedsScene from "$lib/components/tv/DeedsScene.svelte";
  import IntroPlayer from "$lib/components/tv/IntroPlayer.svelte";
  import { introImages } from "$lib/intro";
  import UltimateFinish, { eventLanding, type Variant } from "$lib/components/tv/UltimateFinish.svelte";
  import { matchPointEvent, matchPointState, type MatchPointEvent, type MatchPointState } from "$lib/matchPoint";
  import { leftSide, mpToLR, sideOf } from "$lib/arena";
  import { pickSpeech } from "$lib/speech/pick";

  let { data } = $props();

  const structure = $derived(data.tournament ? pickStructure(data.tournament.structureKey) : null);
  const groupCount = $derived(data.groups.length);
  const names = $derived(nameMap(data.players));

  const champ = $derived.by(() => {
    const gf = data.matches.find((m) => m.stage === "gf");
    return gf && gf.matchStatus === "done" ? gf.winner : "";
  });

  // The organiser's flow buttons and the clock, for the holds (tvHold).
  // `now` ticks every second (tick() below), so the Lord of Gold ends on time.
  let now = $state(Date.now());
  const flow = $derived<TvFlow>({
    groupsShownAt: data.tournament?.groupsShownAt ?? 0,
    pathsBegunAt: data.tournament?.pathsBegunAt ?? 0,
    crownedAt: data.tournament?.crownedAt ?? 0,
    wagers: data.bets.length > 0,
    now,
  });
  // The scenes rebuilt in the Tetrafatalis look so far (dark stone, not the
  // old blue field behind them). Each joins as it's rebuilt.
  const TF_SCENES: Scene[] = ["standby", "groups", "rr", "respite", "bracket", "spotlight", "awards", "eve", "champion", "lordOfGold", "royale", "royaleChampion"];
  const scenes = $derived(availableScenes(!!data.tournament, data.matches, data.royale, flow));

  // For the Respite and the Lord of Gold: the wagerers, richest first.
  const wagerers = $derived(
    leaderboard(books(data.bettors, data.bets, data.matches, data.loans)).map((r) => ({ rank: r.rank, name: r.bettor.name, worth: r.worth })),
  );
  // For the Respite: each circle's final table and the path each place leads to.
  const PATH_NAME: Record<string, string> = { wb: STAGES.winners, mb: STAGES.mid, lb: STAGES.losers };
  const circles = $derived(
    data.groups.map((g) => {
      const rows = groupStandings(data.players, data.matches, g.index);
      return {
        name: circleName(g.index),
        rows: rows.map((row, i) => {
          const d = destinationOf(i + 1, rows.length, structure?.knockoutType ?? "");
          return { name: names.get(row.playerId) ?? "?", path: d.label === "Seeded" ? "Seeded" : PATH_NAME[d.tier], tier: d.tier };
        }),
      };
    }),
  );
  // For the Eve: the two finalists and their fighters.
  const finalists = $derived.by(() => {
    const gf = data.matches.find((m) => m.stage === "gf");
    if (!gf?.p1 || !gf.p2) return null;
    return [gf.p1, gf.p2].map((id, i) => {
      const name = names.get(id) ?? "?";
      const rec = playerRecord(id, data.matches);
      return {
        name,
        fighter: fighterFor(name, data.fighters)?.name ?? "",
        art: arenaArt(name, i === 0 ? "left" : "right"),
        record: `${rec.wins}–${rec.losses}`,
      };
    });
  });
  const awards = $derived(computeAwards(data.matches));
  const tournamentOver = $derived(data.matches.some((m) => m.stage === "gf" && m.matchStatus === "done"));

  // ── Which scene is on screen ────────────────────────────────────────
  // First match wins:
  //   1. a key pressed at the TV itself (holds for LOCAL_SECONDS)
  //   2. the organiser locked a scene from the admin page
  //   3. Champion, once the grand final is done (straight away: the final's
  //      last round set off step 4, which would otherwise make it wait)
  //   4. a match started or its score changed → Match centre (REACT_SECONDS)
  //   5. between stages, a held scene (tvHold: the final groups, then the
  //      new bracket until its first match starts)
  //   6. auto rotation, each scene for its DWELL
  // A result doesn't cut to Match centre: the winner screen plays over
  // whatever is on (WINNER_SECONDS), then the rotation carries on.
  const DWELL: Record<Scene, number> = {
    standby: 60,
    groups: 25,
    rr: 20,
    respite: 30,
    bracket: 25,
    spotlight: 15,
    awards: 20,
    eve: 30,
    champion: 30,
    lordOfGold: 30,
    royale: 25,
    royaleChampion: 30,
  };
  const REACT_SECONDS = 20;
  const LOCAL_SECONDS = 60;
  const WINNER_SECONDS = 15;

  let autoScene = $state<Scene>("groups");
  let autoUntil = Date.now() + DWELL.groups * 1000;
  let react = $state<{ code: string; until: number } | null>(null);
  let local = $state<{ scene: Scene; until: number } | null>(null);

  const localActive = $derived(!!local && local.until > now && scenes.includes(local.scene));
  const reacting = $derived(!!react && react.until > now && scenes.includes("spotlight"));
  const hold = $derived(tvHold(data.matches, scenes, data.royale, flow));
  const scene = $derived.by<Scene>(() => {
    if (localActive) return local!.scene;
    if (!data.tournament) return "standby";
    if (data.tv.mode === "locked" && scenes.includes(data.tv.scene)) return data.tv.scene;
    if (hold === "champion") return hold;
    if (reacting) return "spotlight";
    if (hold) return hold;
    return scenes.includes(autoScene) ? autoScene : scenes[0];
  });

  // Whether the rotation (step 6, or Standby before the event) is what's on.
  const rotating = $derived(
    !localActive && (!data.tournament || (!(data.tv.mode === "locked" && scenes.includes(data.tv.scene)) && !hold && !reacting)),
  );

  // Blader profiles: every PROFILE_EVERY scenes of the rotation (every time
  // round on Standby, which is the only one), one fighter's profile sheet for
  // PROFILE_SECONDS, each fighter's in turn. Only while the rotation is on:
  // a match starting, a hold or a locked scene takes over at once.
  const PROFILE_EVERY = 4;
  const PROFILE_SECONDS = 20;
  const profiles = $derived(data.fighters.filter((f) => f.profile));
  let profileAt = $state(-1);
  let profileUntil = $state(0);
  let sinceProfile = 0;
  let justProfiled = false; // the next change is back to the scenes, uncounted
  const profileOn = $derived(rotating && now < profileUntil && profiles.length > 0);
  const profileSrc = $derived(profileOn ? fighterProfileUrl(browserPbUrl(), profiles[profileAt % profiles.length]) : "");

  // Advance the rotation. Runs every second; cheap.
  function tick() {
    now = Date.now();
    if (now < profileUntil) return; // the scene after it waits its turn
    if (!scenes.includes(autoScene)) {
      // The scene list changed under it: on to the next, not a profile.
    } else if (now < autoUntil) {
      return;
    } else if (justProfiled) {
      justProfiled = false;
    } else if (rotating && profiles.length && ++sinceProfile >= (scenes.length === 1 ? 1 : PROFILE_EVERY)) {
      sinceProfile = 0;
      justProfiled = true;
      profileAt = (profileAt + 1) % profiles.length;
      profileUntil = autoUntil = now + PROFILE_SECONDS * 1000;
      return;
    }
    const i = scenes.indexOf(autoScene); // -1 → starts again at scenes[0]
    autoScene = scenes[(i + 1) % scenes.length];
    autoUntil = now + DWELL[autoScene] * 1000;
  }

  // Watch for a match starting or its running score changing, and cut to
  // that match. A result doesn't (the winner screen has it), nor do knockout
  // slots filling in (pending → ready).
  let lastSeen = new Map<string, string>();
  let primed = false;
  $effect(() => {
    const snap = new Map(
      data.matches.map((m) => [m.code, `${m.matchStatus}|${m.liveP1}-${m.liveP2}|${m.p1Score}-${m.p2Score}|${m.startedAt}|${m.stadiumAt}`]),
    );
    if (primed) {
      let hit: PBMatch | null = null;
      for (const m of data.matches) {
        const before = lastSeen.get(m.code);
        if (before === undefined || before === snap.get(m.code)) continue;
        if (isLive(m)) hit = m;
      }
      if (hit) react = { code: hit.code, until: Date.now() + REACT_SECONDS * 1000 };
    }
    lastSeen = snap;
    primed = true;
  });

  // Locked to the Ascent look; the bracket runs left-to-right on 16:9 screens.
  const bracketOrientation = "horizontal";

  // ── Spotlight ───────────────────────────────────────────────────────
  // Live, then up next (the organiser's "Score this" pick first), then done.
  const featured = $derived.by(() => {
    const live = liveMatches(data.matches);
    const ready = upNext(data.matches, data.tv.next);
    const done = data.matches
      .filter((m) => m.matchStatus === "done")
      .sort((a, b) => b.orderIndex - a.orderIndex);
    return [...live, ...ready, ...done];
  });
  let spotIndex = $state(0);
  // While reacting to a score, Match centre shows THAT match; otherwise the
  // live / next / latest list, browsable with the arrow keys at the TV.
  const spotMatch = $derived(
    (reacting && scene === "spotlight" ? data.matches.find((m) => m.code === react!.code) : null) ??
      featured[Math.min(spotIndex, Math.max(0, featured.length - 1))] ??
      null,
  );

  const groupMatchesOf = (gi: number) =>
    data.matches
      .filter((m) => m.stage === "group" && m.groupIndex === gi)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  const groupPlayed = (gi: number) => groupMatchesOf(gi).filter((m) => m.matchStatus === "done").length;
  // How a fixture row reads on the Group stage scene. Only ONE row is "next":
  // the next match due that isn't already being played.
  function fixtureState(m: PBMatch): "done" | "live" | "next" | "later" {
    if (m.matchStatus === "done") return "done";
    if (isLive(m)) return "live";
    if (m.code === nextUp?.code) return "next";
    return "later";
  }
  // The next fixture to be played (not the one currently live) — for the "prep" strip.
  const nextUp = $derived(upNext(data.matches, data.tv.next)[0] ?? null);

  // The match on the table right now (first live one), for the strip along the bottom.
  const onNow = $derived(liveMatches(data.matches)[0] ?? null);

  // ── The Proving and the Path round-robins (ProvingScene) ────────────
  // A tablet per Circle: the standings, the Path each place leads to, and
  // the fixtures in play order.
  const TIER_PATH: Record<string, PathTier> = { wb: "gilded", mb: "iron", lb: "ashen" };
  function fixtureOf(m: PBMatch): ProvingFixture {
    const state = fixtureState(m);
    const s1 = m.p1Score ?? 0;
    const s2 = m.p2Score ?? 0;
    const mid =
      state === "done" ? (m.walkover ? "W/O" : `${s1}–${s2}`) : state === "live" ? `${m.liveP1}–${m.liveP2}` : state === "next" ? "next" : "v";
    return { key: m.code, a: sideName(m, 1), b: sideName(m, 2), mid, state, won: state !== "done" ? 0 : s1 > s2 ? 1 : s2 > s1 ? 2 : 0 };
  }
  const provingTablets = $derived<ProvingTablet[]>(
    data.groups.map((g) => {
      const list = groupMatchesOf(g.index);
      return {
        key: g.id,
        title: circleName(g.index),
        progress: g.complete ? "Final standings" : `${groupPlayed(g.index)} of ${list.length} fought`,
        settled: g.complete,
        rows: groupStandings(data.players, data.matches, g.index).map((row, i) => {
          const d = destinationOf(i + 1, g.size, structure?.knockoutType ?? "");
          const seeded = d.label === "Seeded"; // no Paths to split into: everyone is seeded into one bracket
          return {
            name: names.get(row.playerId) ?? "?",
            won: row.wins,
            lost: row.losses,
            diff: row.pointDiff,
            to: seeded ? "Seeded" : PATH_NAME[d.tier],
            tier: seeded ? "" : TIER_PATH[d.tier],
          };
        }),
        fixtures: list.map(fixtureOf),
      };
    }),
  );
  // The Gilded and Ashen Paths' round-robins, where the structure has them.
  const rrTablets = $derived.by<ProvingTablet[]>(() => {
    const s = structure;
    if (!s) return [];
    const defs = [
      { stage: "wb_rr" as const, title: STAGES.winners, tier: "gilded" as const, note: `The winner goes straight to ${STAGES.grandFinal}` },
      { stage: "lb_rr" as const, title: STAGES.losers, tier: "ashen" as const, note: "The last chance to stay in" },
    ];
    return defs
      .filter((d) => hasStage(data.matches, d.stage))
      .map((d) => {
        const adv = miniRRAdvancers(s, d.stage);
        const list = rrMatchesOf(d.stage);
        const played = list.filter((m) => m.matchStatus === "done").length;
        return {
          key: d.stage,
          title: d.title,
          tier: d.tier,
          note: d.note,
          progress: played === list.length ? "Final standings" : `${played} of ${list.length} fought`,
          settled: played === list.length,
          rows: miniRRStandings(data.matches, d.stage).map((row, i) => {
            const fate = rrFate(d.stage, i + 1, adv).tier;
            return {
              name: names.get(row.playerId) ?? "?",
              won: row.wins,
              lost: row.losses,
              diff: row.pointDiff,
              to: fate === "gf" ? STAGES.grandFinal : fate === "mb" ? STAGES.mid : "Out",
              tier: (fate === "gf" ? "reck" : fate === "mb" ? "iron" : "out") as PathTier,
            };
          }),
          fixtures: list.map(fixtureOf),
        };
      });
  });
  // The strip under the tables: the match in battle, and who's summoned.
  const tableTicker = $derived({
    live: onNow ? { a: sideName(onNow, 1), b: sideName(onNow, 2), sa: onNow.liveP1, sb: onNow.liveP2 } : undefined,
    next: nextUp ? { a: sideName(nextUp, 1), b: sideName(nextUp, 2) } : undefined,
  });

  // Where the featured match sits, in plain words: "Group 2, match 4 of 6"
  // for group games, "Mid bracket semi-final" for knockout ones.
  // ── Helpers ─────────────────────────────────────────────────────────
  // North and south names for a draw on screen ("" each if sides weren't drawn).
  function drawSides(d: Draw): { north: string; south: string } {
    const m = data.matches.find((x) => x.code === d.code);
    if (!m || !d.north) return { north: "", south: "" };
    return { north: sideName(m, d.north), south: sideName(m, d.north === 1 ? 2 : 1) };
  }
  function sideName(m: PBMatch, which: 1 | 2): string {
    const pid = which === 1 ? m.p1 : m.p2;
    if (pid) return names.get(pid) ?? "—";
    return slotLabel(which === 1 ? m.slot1 : m.slot2, groupCount);
  }
  const rrMatchesOf = (stage: string) =>
    data.matches.filter((m) => m.stage === stage).sort((a, b) => a.orderIndex - b.orderIndex);

  // ── Finish call-out ─────────────────────────────────────────────────
  // When a round is logged, the Arena calls the finish out big beside the
  // scorer's portrait ("Banishment +2"), then flies it down into a new tag
  // under their name (ArenaScene plays it). Every round won stays as a tag
  // for the rest of the match. Undo (the log shrinks) just drops the last
  // tag, with no animation.
  const FINISH_BY_KEY = new Map(FINISHES.map((f) => [f.key, f]));
  const CALLOUT_FRESH_MS = 6000; // don't replay a call-out the rotation lands on later
  const CALLOUT_MS = 1500; // the call-out's burst, hold and flight onto the tag (ArenaScene's)
  const CALLOUT_CLEAR_MS = 2000; // then forgotten, so coming back to the Arena doesn't replay it

  let logSeen = new Map<string, number>();
  let logPrimed = false;
  let latestRound = $state<{ code: string; n: number; at: number } | null>(null);
  $effect(() => {
    for (const m of data.matches) {
      const n = m.liveLog.length;
      const before = logSeen.get(m.code);
      if (logPrimed && before !== undefined && n > before) latestRound = { code: m.code, n, at: Date.now() };
      logSeen.set(m.code, n);
    }
    logPrimed = true;
  });

  // Every round of the match on screen, in order. `i` is the round's place in
  // the whole log, so each side's pills can still find the newest one.
  type Round = { i: number; who: number; label: string; pts: number };
  const rounds = $derived.by(() => {
    const out: Round[] = [];
    (spotMatch?.liveLog ?? []).forEach((r, i) => {
      const f = FINISH_BY_KEY.get(r.finish);
      if (f) out.push({ i, who: r.who, label: f.label, pts: f.pts });
    });
    return out;
  });
  const lastRound = $derived(rounds[rounds.length - 1] ?? null);

  // The call-out for ArenaScene to play: a new id plays it once.
  let callout = $state<ArenaCallout | null>(null);
  let calloutSeq = 0;
  let calloutTimer: ReturnType<typeof setTimeout>;
  let played = "";

  $effect(() => {
    const ev = latestRound;
    if (!ev || scene !== "spotlight" || spotMatch?.code !== ev.code) return;
    const key = `${ev.code}#${ev.n}`;
    if (key === played) return;
    played = key;
    if (Date.now() - ev.at > CALLOUT_FRESH_MS) return;
    const last = lastRound;
    if (spotMatch.liveLog.length !== ev.n || !last) return; // undone since
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // tag only
    const who = last.who === leftSide(spotMatch) ? "left" : "right";
    untrack(() => {
      callout = { id: ++calloutSeq, who, i: last.i, label: last.label, pts: last.pts };
      clearTimeout(calloutTimer);
      calloutTimer = setTimeout(() => (callout = null), CALLOUT_CLEAR_MS);
    });
  });

  // ── Speech ──────────────────────────────────────────────────────────
  // After a round, the scorer's fighter says a line (lib/speech) on a scroll
  // under their portrait, once the call-out has landed on its tag.
  // Sometimes it's a rival exchange and the other fighter answers on the
  // other side. Same gating as the call-out (the Arena, this match, fresh),
  // but reduced motion still gets the lines, just with no unrolling and
  // straight away (there's no call-out to wait for). A side without a
  // portrait (no fighter) never speaks; a fighter with no lines (custom)
  // stays quiet.
  // Lines don't repeat within a match. A newer round, undo, another match or
  // leaving Match centre clears them (a line still waiting too).
  // A round that cues the "next stadium" shuffle holds the line back until
  // the shuffle has gone (drawHold clears in endDraw), so the portraits are
  // back in view; it reads the draw's own state, not its timings.
  const SPEECH_AFTER_MS = CALLOUT_MS + 300; // after the call-out lands
  const SPEECH_AFTER_CALM_MS = 300; // reduced motion: no call-out to wait for
  const SPEECH_AFTER_DRAW_MS = 300; // after the stadium shuffle has cleared
  const SPEECH_REPLY_MS = 1500; // the reply pops this long after the lead
  const SPEECH_HOLD_MS = 3000; // each bubble stays up this long
  type SpeechBubble = { id: number; text: string; show: boolean };
  let speechL = $state<SpeechBubble>({ id: 0, text: "", show: false });
  let speechR = $state<SpeechBubble>({ id: 0, text: "", show: false });
  let speechFor = $state<{ code: string; n: number } | null>(null); // the round that's speaking
  let speechTimers: ReturnType<typeof setTimeout>[] = [];
  let speechSeq = 0;
  let spoken = "";
  let speechUsed = { code: "", ids: new Set<string>() }; // this match's lines so far
  let speechWait = $state<(() => void) | null>(null); // a line held back for the draw

  function clearSpeech() {
    speechTimers.forEach(clearTimeout);
    speechTimers = [];
    if (speechL.show) speechL = { ...speechL, show: false };
    if (speechR.show) speechR = { ...speechR, show: false };
    speechFor = null;
    speechWait = null;
  }
  function sayAt(side: "left" | "right", text: string, at: number) {
    const id = ++speechSeq;
    const set = (b: SpeechBubble) => (side === "left" ? (speechL = b) : (speechR = b));
    speechTimers.push(
      setTimeout(() => set({ id, text, show: true }), at),
      setTimeout(() => set({ id, text, show: false }), at + SPEECH_HOLD_MS),
    );
  }

  $effect(() => {
    const ev = latestRound;
    if (!ev || scene !== "spotlight" || spotMatch?.code !== ev.code) return;
    const key = `${ev.code}#${ev.n}@${ev.at}`; // @at: a round re-logged after Undo speaks again
    if (key === spoken) return;
    spoken = key;
    const m = spotMatch;
    untrack(() => {
      clearSpeech();
      if (Date.now() - ev.at > CALLOUT_FRESH_MS) return;
      const round = m.liveLog[ev.n - 1];
      if (m.liveLog.length !== ev.n || !round || (round.who !== 1 && round.who !== 2)) return; // undone since
      const who = round.who as 1 | 2;
      const other = who === 1 ? 2 : 1;
      // Screen sides: round one's North player is on the left (lib/arena.ts).
      const left = leftSide(m);
      const lr = (w: 1 | 2) => (w === left ? "left" : "right") as "left" | "right";
      // Only fighters with a portrait speak (the scroll hangs under it).
      const speaker = (w: 1 | 2) => {
        const name = sideName(m, w);
        return arenaArt(name, lr(w)) ? (fighterFor(name, data.fighters)?.name ?? null) : null;
      };
      const scorer = speaker(who);
      if (!scorer) return;
      if (speechUsed.code !== m.code) speechUsed = { code: m.code, ids: new Set() };
      // The match's first point always opens with rival banter when the pair has some.
      const firstPoint = ev.n === 1;
      const said = pickSpeech(scorer, speaker(other), speechUsed.ids, Math.random, undefined, firstPoint);
      if (!said) return;
      speechUsed.ids.add(said.lead.id);
      speechFor = { code: m.code, n: ev.n };
      const at = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? SPEECH_AFTER_CALM_MS : SPEECH_AFTER_MS;
      const say = () => {
        sayAt(lr(who), said.lead.text, 0);
        if (said.reply) sayAt(lr(other), said.reply.text, SPEECH_REPLY_MS);
      };
      // By now the draw effect has seen the same update, so drawHold says
      // whether this round's shuffle is on (or about to be).
      // Likewise a match point moment and the arena tag's spin after it.
      const held = () => drawHold === m.code || mp?.code === m.code || reel?.code === m.code;
      speechTimers.push(setTimeout(() => (held() ? (speechWait = say) : say()), at));
    });
  });
  // A line held back for the stadium shuffle: say it once the shuffle is gone.
  $effect(() => {
    const say = speechWait;
    if (!say || drawHold || mp || reel) return;
    untrack(() => {
      speechWait = null;
      speechTimers.push(setTimeout(say, SPEECH_AFTER_DRAW_MS));
    });
  });
  // Undo, another match, or off Match centre: drop what's being said.
  $effect(() => {
    const f = speechFor;
    if (!f) return;
    if (scene !== "spotlight" || spotMatch?.code !== f.code || spotMatch.liveLog.length < f.n) untrack(clearSpeech);
  });

  // ── Stadium draw ────────────────────────────────────────────────────
  // The server draws a stadium (on Start match, after each round that doesn't
  // win the match, and on Redraw) and stamps stadiumAt. The cut above brings
  // Match centre up on that match; once it's showing, play the draw: Start
  // match gets the launch (draw, then ゴーシュート / LET IT RIP), anything later
  // the ~3s shuffle. One of three looks, at random, never the same twice running.
  const LOOKS = ["reel", "spotlight", "spin"] as const;
  const AFTER_CALLOUT_MS = 1700; // a round's finish call-out lands first
  type Draw = { code: string; at: number; stadium: string; north: 0 | 1 | 2; kind: "launch" | "next"; round: number; afterRound: boolean };
  let drawSeen = new Map<string, { at: string; rounds: number }>();
  let drawPrimed = false;
  let latestDraw = $state<Draw | null>(null);
  $effect(() => {
    for (const m of data.matches) {
      const before = drawSeen.get(m.code);
      const rounds = m.liveLog.length;
      if (drawPrimed && m.stadiumAt && m.stadium && before && before.at !== m.stadiumAt) {
        latestDraw = {
          code: m.code,
          at: Date.now(),
          stadium: m.stadium,
          north: m.north,
          kind: rounds === 0 ? "launch" : "next",
          round: rounds + 1,
          afterRound: rounds > before.rounds,
        };
      }
      drawSeen.set(m.code, { at: m.stadiumAt, rounds });
    }
    drawPrimed = true;
  });

  // The draw on screen, and the match whose stadium chip is held back until
  // it finishes (so the chip doesn't give the answer away first).
  type DrawShow = Draw & { id: string; look: (typeof LOOKS)[number] };
  let drawShow = $state<DrawShow | null>(null);
  let drawHold = $state("");
  // Start match's build-up (intro, draw, LET IT RIP) plays on a blank page:
  // the header and Match centre's own parts stay hidden until it's over.
  let blank = $state(false);
  let drawTimer: ReturnType<typeof setTimeout> | undefined;
  let lastLook = "";
  let drawn = "";

  // ── VS intro ────────────────────────────────────────────────────────
  // Start match plays the fighter intro first (VsIntro), then the launch
  // draw. Each blader's katakana and cut-out come from the fighter library,
  // matched by name; anyone not in it gets the mystery silhouette.
  type IntroFighter = { name: string; kana: string; img: string; imgMirrored: string; mirror: boolean; face: Face | null };
  type IntroShow = {
    id: string;
    p1: IntroFighter;
    p2: IntroFighter;
    title: string;
    tier: ReturnType<typeof tierOf>;
    sides: boolean; // label the left fighter North, the right South
    out: number; // when the banners split apart: after the announcer's last call
    then: DrawShow; // the launch draw that follows
  };
  let introShow = $state<IntroShow | null>(null);
  function introFighter(name: string): IntroFighter {
    const f = fighterFor(name, data.fighters);
    // The intro shows the combat name; players without a fighter keep their own.
    return { name: f?.name || name, kana: f?.kana ?? "", img: fighterImageUrl(browserPbUrl(), f), imgMirrored: fighterMirroredUrl(browserPbUrl(), f), mirror: !!f?.mirror, face: f?.face ?? null };
  }
  // The Arena's portrait for each side: the fighter's cut-out zoomed onto the
  // face, turned to face the middle like the intro (cut-outs face left, so
  // the left side is flipped; the mirror flag swaps that). null for a player
  // without a fighter, who gets the silhouette.
  const PORTRAIT_FILL = 0.42; // the face's share of the ring
  function arenaArt(name: string, side: "left" | "right"): { src: string; style: string } | null {
    const f = fighterFor(name, data.fighters);
    // data.pbUrl, not browserPbUrl(): this also runs on the server.
    const img = fighterImageUrl(data.pbUrl, f);
    if (!f || !img) return null;
    const wantFlip = (side === "left") !== !!f.mirror;
    const art = artFor({ img, imgMirrored: fighterMirroredUrl(data.pbUrl, f) }, wantFlip);
    // A hand-made mirror image is already flipped, so its face sits mirrored too.
    const face = f.face && wantFlip && !art.flip ? { ...f.face, x: 1 - f.face.x } : f.face;
    return { src: art.src, style: faceCrop(face, PORTRAIT_FILL, art.flip) };
  }
  function endIntro() {
    const next = introShow?.then ?? null;
    introShow = null;
    winnerShow = null; // it held under the intro until now
    if (next) drawShow = next;
  }
  // The Champion scene's fighters: the intro's combat name, katakana and
  // picture, plus the name they played under and their victory pose.
  function sceneFighter(id: string) {
    const player = names.get(id) ?? "";
    const victory = fighterVictoryUrl(browserPbUrl(), fighterFor(player, data.fighters));
    return { ...introFighter(player), player, victory };
  }
  // ── Winner screen ───────────────────────────────────────────────────
  // Every result but the grand final's (the Champion scene has that) gets the
  // winner screen (WinnerScreen) over the whole screen, started from the sound
  // effect below so it's timed with "[name] wins!". Not while the organiser
  // has locked a scene, or one was picked at the TV. It stays up for
  // WINNER_SECONDS over whatever was on, then the rotation (or a hold)
  // carries on underneath; the next match starting (a match going live that
  // wasn't live when it came up) ends it sooner, its intro playing over it.
  // Picking a scene at the TV or the Champion scene ends it at once. A
  // reload drops it (it's only seen as news).
  type WinnerShow = {
    id: string;
    winner: IntroFighter; // the cut-out, never the victory pose (the Champion scene's)
    loser: { name: string };
    score: [number, number];
    side: "red" | "blue"; // the side the winner had in the VS intro: left red, right blue
    title: string;
    tier: ReturnType<typeof tierOf>;
    walkover: boolean;
    live: string[]; // the matches already live when it came up (another table)
  };
  let winnerShow = $state<WinnerShow | null>(null);
  let winnerLeaving = $state(false);
  const liveKey = (m: PBMatch) => `${m.code}@${m.startedAt}`;
  let winnerTimer: ReturnType<typeof setTimeout>;
  function showWinner(m: PBMatch) {
    const p1Won = m.winner === m.p1;
    const wonOnLeft = leftSide(m) === (p1Won ? 1 : 2);
    winnerLeaving = false;
    react = null; // the final point's cut to Match centre mustn't show up after it
    clearTimeout(winnerTimer);
    winnerTimer = setTimeout(() => (winnerLeaving = true), WINNER_SECONDS * 1000);
    winnerShow = {
      id: `${m.code}@${Date.now()}`,
      winner: introFighter(names.get(m.winner) ?? ""),
      loser: { name: introFighter(names.get(m.loser) ?? "").name || "—" },
      score: p1Won ? [m.p1Score ?? 0, m.p2Score ?? 0] : [m.p2Score ?? 0, m.p1Score ?? 0],
      side: wonOnLeft ? "red" : "blue",
      title: matchContext(m, data.matches),
      tier: tierOf(m.stage),
      walkover: m.walkover,
      live: liveMatches(data.matches).map(liveKey),
    };
  }
  // The next match starting: play the exit (ondone clears it).
  $effect(() => {
    const w = winnerShow;
    if (!w || untrack(() => winnerLeaving)) return;
    if (liveMatches(data.matches).some((m) => !w.live.includes(liveKey(m)))) winnerLeaving = true;
  });
  $effect(() => {
    if (winnerShow && scene === "champion") winnerShow = null;
  });
  // Its "Up next": the fixture the TV calls next (the organiser's "Score
  // this" pick first, as the Next up strip and /live order it), live from
  // the data, so a new pick or a slot this result fills in shows straight away.
  const winnerNext = $derived(
    nextUp
      ? {
          p1: sideName(nextUp, 1),
          p2: sideName(nextUp, 2),
          title: matchContext(nextUp, data.matches),
          tier: tierOf(nextUp.stage),
        }
      : null,
  );

  const champRun = $derived(champ ? championRun(data.matches, champ) : null);
  // When this TV saw the grand final's result go in (a reload after the fact
  // never does), so the champion call is only made while it's news.
  let champBefore = "";
  let champPrimed = false;
  let champSeen = $state<{ id: string; at: number } | null>(null);
  $effect(() => {
    const c = champ;
    if (champPrimed && c && c !== champBefore) champSeen = { id: c, at: Date.now() };
    champBefore = c;
    champPrimed = true;
    if (c) announcer.preloadChampion();
    // The victory pose is full size, so fetch it before the scene needs it.
    const pose = c ? sceneFighter(c).victory : "";
    if (pose) new Image().src = pose;
  });
  // Load every fighter's cut-out ahead of time, so an intro never shows a
  // half-loaded image. (Browsers cache them; the list is at most a few dozen.)
  $effect(() => {
    for (const f of data.fighters) {
      // The profile sheets too: full size, and shown with no warning.
      for (const url of [fighterImageUrl(browserPbUrl(), f), fighterMirroredUrl(browserPbUrl(), f), fighterProfileUrl(browserPbUrl(), f)]) {
        if (url) new Image().src = url;
      }
    }
  });

  // ── Sound ───────────────────────────────────────────────────────────
  // The intro's announcer (name, versus, name, match title) over the match
  // music, which plays from Start match until the result is in; then each
  // round's finish, "[name] wins!" and the stinger that ends the match.
  const announcer = new Announcer();
  // The match code the music is playing for. State, so the effect below that
  // fades it out on the result re-runs once it's set.
  let musicFor = $state("");
  let soundBlocked = $state(false); // the browser wants a click first
  announcer.onblocked = () => (soundBlocked = true);
  function unlockSound() {
    if (!soundBlocked) return;
    soundBlocked = false;
    announcer.unlock();
  }
  // Load every announcer clip on the master list (clips.ts) and the stinger,
  // so each one's length is known when an intro is timed and it plays on cue.
  // A clip whose file isn't there yet is found out now and skipped later.
  onMount(() => [...ANNOUNCER_URLS, STINGER].forEach((u) => announcer.preload(u)));
  onMount(() => announcer.preloadTension());
  // The admin page's TV panel sets these, live.
  $effect(() => {
    announcer.setEnabled(!data.tv.soundOff);
    announcer.setLevel(data.tv.musicLevel / 100);
  });
  $effect(() => {
    for (const f of data.fighters) {
      announcer.preload(fighterVoiceUrl(browserPbUrl(), f));
      for (const call of FIGHTER_CALLS) announcer.preload(fighterCallUrl(browserPbUrl(), f, call));
    }
    for (const m of data.matches) announcer.preload(titleClip(m));
  });

  // A round's finish is called as soon as it's logged, whatever is on screen:
  // the TV cuts to that match anyway, and the music plays on every scene too.
  // It doesn't wait for the call-out animation, so reduced motion still hears
  // it, and since it isn't tied to a scene the rotation can't replay it.
  let called = "";
  $effect(() => {
    const ev = latestRound;
    if (!ev) return;
    const key = `${ev.code}@${ev.at}`; // by time, so undo-then-redo calls again
    if (key === called) return;
    called = key;
    if (Date.now() - ev.at > CALLOUT_FRESH_MS) return;
    const r = data.matches.find((m) => m.code === ev.code)?.liveLog[ev.n - 1];
    if (r) announcer.call([finishClip(r.finish)]);
  });

  // A result going in: "[name] is VICTORIOUS!" (after the finish call, if that's still
  // going), then, if the music is this match's, the stinger in its place.
  // Seen the same way as the cut to Match centre, by comparing reloads, so a
  // page load never calls an old result.
  let statusSeen = new Map<string, string>();
  let statusPrimed = false;
  $effect(() => {
    const playingFor = musicFor;
    for (const m of data.matches) {
      const before = statusSeen.get(m.code);
      statusSeen.set(m.code, m.matchStatus);
      if (!statusPrimed || before === undefined || before === "done" || m.matchStatus !== "done") continue;
      const withMusic = m.code === playingFor;
      if (withMusic) musicFor = "";
      // The grand final going straight to the Champion scene: that scene's
      // theme and "[name] … Hero of Gyrondor!" call take over the sound (and
      // fade the match music out), so no VICTORIOUS call or stinger under it.
      if (m.stage === "gf" && untrack(() => scene === "champion")) continue;
      const victorious = fighterCallUrl(browserPbUrl(), fighterFor(names.get(m.winner) ?? "", data.fighters), "callVictorious");
      // With the winner screen, the call starts with its slam (a walkover gets
      // the screen but no call). Without it (the grand final, or a scene
      // locked by the organiser or picked at the TV), as before.
      const screen =
        !!m.winner && m.stage !== "gf" && untrack(() => !localActive && data.tv.mode !== "locked");
      announcer.endMatch(winsCall(victorious, m.walkover), withMusic, screen ? WINNER_SLAM : 0);
      if (screen) showWinner(m);
    }
    statusPrimed = true;
    // The music's match has gone (a reset), or finished without being seen
    // to: just fade the music out.
    if (musicFor && !musicFor.startsWith("royale:") && !data.matches.some((x) => x.code === musicFor && x.matchStatus !== "done")) {
      musicFor = "";
      announcer.stopMusic();
    }
  });
  // Champion: the theme while the Champion scene is on screen, and the first
  // time it comes up after the result, the champion's name then "Beyfest 2026
  // Grand Champion!" (if it's still news, see CHAMPION_FRESH_MS). Only the
  // scene and the champion re-run this, so a data reload doesn't restart it.
  let champCalled = "";
  $effect(() => {
    if (scene !== "champion" || !champ) return;
    const id = champ;
    untrack(() => {
      const seen = champSeen;
      let calls: string[] = [];
      if (seen && seen.id === id && `${seen.id}@${seen.at}` !== champCalled) {
        champCalled = `${seen.id}@${seen.at}`; // the first showing: now or never
        if (championCallFresh(seen.at, Date.now())) {
          calls = [fighterCallUrl(browserPbUrl(), fighterFor(names.get(id) ?? "", data.fighters), "callChampion")];
        }
      }
      announcer.startChampion(calls);
    });
    return () => announcer.stopChampion();
  });

  // ── Battle royale ───────────────────────────────────────────────────
  // After the main event (lib/royale.ts). Start on the admin page plays the
  // battle's intro over the match music ("Battle royale!", then its name);
  // a heat or sudden death result gets the Qualified screen (even with a
  // scene locked), "[A] and [B]… qualified!" and the stinger. The final's
  // result brings up the battle royale champion scene (held), with the
  // champion theme and the champion's call.
  const royale = $derived(data.royale ? royaleView(data.royale) : null);
  const royaleChamp = $derived(royale?.champion ?? "");
  const royaleRunnerUp = $derived(royale?.runnerUp ?? "");
  type RoyaleIntroShow = { id: string; fighters: IntroFighter[]; label: string; out: number };
  let royaleIntro = $state<RoyaleIntroShow | null>(null);
  // The champion scene's fighters by name (battle royale entrants needn't be
  // tournament players): combat name, katakana, picture and victory pose:
  // the battle royale one if they have it, else their normal one.
  function royaleSceneFighter(name: string) {
    const f = fighterFor(name, data.fighters);
    const victory = fighterRoyaleVictoryUrl(browserPbUrl(), f) || fighterVictoryUrl(browserPbUrl(), f);
    return { ...introFighter(name), player: name, victory };
  }

  // The draw: when the heats are generated, the wheel of everyone in it,
  // heat by heat, with "Battle royale!" as the hub slams in. The board is
  // held underneath, so it's what's left when the draw clears. Seen by
  // comparing reloads, so a page load never replays it.
  // The match music starts with it and plays on under the board until the
  // first heat starts, whose intro carries on with it (musicFor moves to that
  // heat). A reset before then stops it.
  const DRAW_MUSIC = "royale:draw";
  type RoyaleDrawShow = { id: string; fighters: IntroFighter[] };
  let royaleDraw = $state<RoyaleDrawShow | null>(null);
  let royaleIdSeen: string | null | undefined = undefined; // undefined: not loaded yet
  $effect(() => {
    const r = data.royale;
    untrack(() => {
      const was = royaleIdSeen;
      royaleIdSeen = r?.id ?? null;
      if (musicFor === DRAW_MUSIC && r?.id !== was) {
        musicFor = "";
        announcer.stopMusic();
      }
      if (was === undefined || !r || r.id === was) return;
      // Old news (no date counts as old: NaN fails the test).
      if (!(Date.now() - Date.parse(r.createdAt ?? "") <= CALLOUT_FRESH_MS)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      royaleDraw = { id: r.id, fighters: r.entrants.map(introFighter) };
      announcer.playMusic();
      musicFor = DRAW_MUSIC;
      announcer.call([ROYALE]);
    });
  });

  function startRoyaleIntro(b: Battle) {
    if (Date.now() - Date.parse(b.result.startedAt ?? "") > CALLOUT_FRESH_MS) return; // old news
    royaleDraw = null; // the first heat's intro takes over
    if (qualifiedShow) qualifiedLeaving = true; // the next battle's build-up takes over
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const out = announcer.intro([ROYALE, royaleLabelClip(b.key)]);
    musicFor = `royale:${b.key}`;
    royaleIntro = { id: `${b.key}@${b.result.startedAt}`, fighters: b.entrants.map(introFighter), label: b.label, out };
  }

  // The Qualified screen, after a heat or the sudden death: who's through to
  // the final. Held like the winner screen: until the next battle starts or
  // WINNER_SECONDS is up.
  type QualifiedShow = { id: string; fighters: IntroFighter[]; label: string; toSudden: string };
  let qualifiedShow = $state<QualifiedShow | null>(null);
  let qualifiedLeaving = $state(false);
  let qualifiedTimer: ReturnType<typeof setTimeout>;

  function royaleResult(b: Battle) {
    const withMusic = musicFor === `royale:${b.key}`;
    if (withMusic) musicFor = "";
    royaleIntro = null;
    // The final: the champion scene (held) has the sound from here.
    if (b.kind === "final") {
      royaleChampSeen = { name: b.result.winner ?? "", at: Date.now() };
      return;
    }
    const { through, toSudden } = qualifiers(royale!.plan, b);
    const voices = through.map((name) => fighterVoiceUrl(browserPbUrl(), fighterFor(name, data.fighters)));
    // Unlike a match, a scene locked from the admin page doesn't stop it: the
    // board is the only thing worth locking to now, and the result belongs over it.
    const screen = !localActive;
    announcer.endMatch(qualifiedCall(voices), withMusic, screen ? QUALIFIED_CALL : 0);
    if (!screen) return;
    if (winnerShow) winnerShow = null;
    qualifiedLeaving = false;
    react = null;
    clearTimeout(qualifiedTimer);
    qualifiedTimer = setTimeout(() => (qualifiedLeaving = true), WINNER_SECONDS * 1000);
    qualifiedShow = {
      id: `${b.key}@${Date.now()}`,
      fighters: through.map(introFighter),
      label: b.label,
      toSudden: toSudden ? introFighter(toSudden).name : "",
    };
  }

  // Seen by comparing reloads, like the match results, so a page load never
  // replays an old start or result.
  let royaleSeen = new Map<string, string>();
  $effect(() => {
    const battles = royale?.battles ?? [];
    untrack(() => {
      for (const b of battles) {
        const was = royaleSeen.get(b.key);
        const is = `${b.status}|${b.result.startedAt ?? ""}|${b.result.resultAt ?? ""}`;
        royaleSeen.set(b.key, is);
        if (was === undefined || was === is) continue;
        if (b.status === "live" && !was.startsWith("live")) startRoyaleIntro(b);
        else if (b.status === "done" && !was.startsWith("done")) royaleResult(b);
        else if (b.status === "ready" && was.startsWith("live") && musicFor === `royale:${b.key}`) {
          // Start cancelled: no music for a battle that isn't on.
          musicFor = "";
          royaleIntro = null;
          announcer.stopMusic();
        }
      }
    });
  });

  // The battle royale champion scene: the theme while it's up, and the
  // first time after the final's result, the champion's name then "Battle
  // royale champion!" (while it's news, as for the main champion).
  let royaleChampSeen = $state<{ name: string; at: number } | null>(null);
  let royaleChampCalled = "";
  // The pose is full size, so fetch it once the champion's known.
  $effect(() => {
    const pose = royaleChamp ? royaleSceneFighter(royaleChamp).victory : "";
    if (pose) new Image().src = pose;
  });
  $effect(() => {
    if (scene !== "royaleChampion" || !royaleChamp) return;
    const name = royaleChamp;
    untrack(() => {
      const seen = royaleChampSeen;
      let calls: string[] = [];
      if (seen && seen.name === name && `${seen.name}@${seen.at}` !== royaleChampCalled) {
        royaleChampCalled = `${seen.name}@${seen.at}`;
        if (championCallFresh(seen.at, Date.now())) {
          calls = [fighterCallUrl(browserPbUrl(), fighterFor(name, data.fighters), "callRoyaleChampion")];
        }
      }
      winnerShow = null;
      qualifiedShow = null;
      announcer.startChampion(calls);
    });
    return () => announcer.stopChampion();
  });

  let mounted = $state(false); // running in the browser
  onMount(() => {
    mounted = true;
    // The Beyfest intro's pictures, loaded now so none pops in when it plays.
    for (const src of introImages()) new Image().src = src;
  });

  // ── Beyfest intro ───────────────────────────────────────────────────
  // The minute-long intro (IntroPlayer), over everything, when the organiser
  // presses "Play the intro" (tv_state.introAt changes) or I is pressed at the
  // TV. It reacts to a change, not to the time, so a reload never replays it
  // and the clock doesn't matter. Escape at the TV stops it.
  let beyfestIntro = $state(0); // a new number plays it again; 0 is off
  let introSeen = untrack(() => data.tv.introAt);
  $effect(() => {
    const at = data.tv.introAt;
    if (at === introSeen) return;
    introSeen = at;
    if (at) playBeyfestIntro();
  });
  function playBeyfestIntro() {
    announcer.stopMusic();
    beyfestIntro = Date.now();
  }

  function endDraw() {
    clearTimeout(drawTimer);
    drawShow = null;
    introShow = null;
    drawHold = "";
    blank = false;
  }
  $effect(() => {
    const ev = latestDraw;
    if (!ev || scene !== "spotlight" || spotMatch?.code !== ev.code) return;
    const key = `${ev.code}@${ev.at}`;
    if (key === drawn) return;
    drawn = key;
    if (Date.now() - ev.at > CALLOUT_FRESH_MS) return; // stale by the time it showed
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // chip only
    // At match point the arena tag draws it instead, so the splash can come
    // straight after the score (see the match point block below).
    if (ev.kind === "next" && mpNow !== "none") {
      endDraw();
      reel = { code: ev.code, round: ev.round, spinning: false };
      return;
    }
    const pool = LOOKS.filter((l) => l !== lastLook);
    const look = pool[Math.floor(Math.random() * pool.length)];
    lastLook = look;
    endDraw();
    if (winnerShow) winnerLeaving = true; // a new match's build-up takes over
    drawHold = ev.code;
    blank = ev.kind === "launch";
    const show: DrawShow = { ...ev, id: key, look };
    const m = spotMatch;
    drawTimer = setTimeout(
      () => {
        if (ev.kind !== "launch") return void (drawShow = show);
        // Round one's North player stands on the left (ruby) and is called first.
        const left = leftSide(m);
        const right = left === 1 ? 2 : 1;
        const voice = (side: 1 | 2) => fighterVoiceUrl(browserPbUrl(), fighterFor(sideName(m, side), data.fighters));
        const out = announcer.intro([voice(left), announcer.nextVersus(), voice(right), titleClip(m)]);
        musicFor = m.code;
        introShow = {
          id: key,
          p1: introFighter(sideName(m, left)),
          p2: introFighter(sideName(m, right)),
          title: matchContext(m, data.matches),
          tier: tierOf(m.stage),
          sides: !!m.north,
          out,
          then: show,
        };
      },
      ev.afterRound ? AFTER_CALLOUT_MS : 0,
    );
  });
  // Moving off the match (or off Match centre) drops a draw in progress.
  $effect(() => {
    if (drawHold && (scene !== "spotlight" || spotMatch?.code !== drawHold)) endDraw();
  });

  // ── Match point (Ultimate Finish) ─────────────────────────────────
  // While the match on screen has someone one point away, the room darkens
  // behind the Match centre, the heartbeat plays and the art panels zoom onto
  // the faces. What the moment itself looks like is UltimateFinish.
  const MP_VARIANT: Variant = "b";
  const mpNow = $derived.by((): MatchPointState => {
    const m = spotMatch;
    if (scene !== "spotlight" || !m || !isLive(m)) return "none";
    const s = matchPointState(m.liveP1, m.liveP2, pointsToWin(m.stage, m.roundLabel));
    return s === "decided" ? "none" : s;
  });
  // The moment a round has earned. No big stadium draw here, so it comes up
  // straight after the score (`go` is set when it plays), and then the arena
  // tag spins onto the next stadium. The speech bubbles wait for both.
  let mp = $state<{ code: string; n: number; event: MatchPointEvent; id: string; go: boolean } | null>(null);
  let mpScored = $state(false); // the short beat after the score has passed
  const MP_AFTER_SCORE_MS = 300;
  // The arena tag's spin: held back while the moment plays, then `spinning`.
  let reel = $state<{ code: string; round: number; spinning: boolean } | null>(null);
  const REEL_AFTER_MOMENT_MS = 250;
  let mpTimers: ReturnType<typeof setTimeout>[] = [];
  let mpSeen = "";
  // No zoom until a new match point's slam is over; a save or sudden death
  // comes along with the faces already zoomed.
  const mpZoom = $derived(mpNow !== "none" && mp?.event !== "slam");

  function clearMoment() {
    mpTimers.forEach(clearTimeout);
    mpTimers = [];
    mpScored = false;
    mp = null;
  }

  // The running score before this round: the last round's finish taken off.
  // Fresh rounds only, like the call-outs, so a reload never replays a moment.
  $effect(() => {
    const ev = latestRound;
    if (!ev || scene !== "spotlight" || spotMatch?.code !== ev.code) return;
    const key = `${ev.code}#${ev.n}@${ev.at}`;
    if (key === mpSeen) return;
    mpSeen = key;
    const m = spotMatch;
    untrack(() => {
      clearMoment();
      if (Date.now() - ev.at > CALLOUT_FRESH_MS) return;
      const round = m.liveLog[ev.n - 1];
      if (m.liveLog.length !== ev.n || !round) return; // undone since
      const pts = FINISH_BY_KEY.get(round.finish)?.pts ?? 0;
      const after: [number, number] = [m.liveP1, m.liveP2];
      const before: [number, number] = [after[0] - (round.who === 1 ? pts : 0), after[1] - (round.who === 2 ? pts : 0)];
      const event = matchPointEvent(before, after, pointsToWin(m.stage, m.roundLabel));
      if (!event) return;
      mp = { code: m.code, n: ev.n, event, id: key, go: false };
      mpTimers.push(setTimeout(() => (mpScored = true), MP_AFTER_SCORE_MS));
    });
  });
  // Play it. (drawHold: an organiser's Redraw, or a draw that was already up.)
  $effect(() => {
    const p = mp;
    if (!p || p.go || !mpScored || drawHold) return;
    untrack(() => {
      mp = { ...p, go: true };
      mpTimers.push(setTimeout(() => announcer.matchPointHit(matchPointCalls(p.event)), eventLanding(MP_VARIANT, p.event)));
    });
  });
  // Undo, another match, the result going in, or off Match centre: drop it.
  $effect(() => {
    const p = mp;
    if (!p) return;
    if (mpNow === "none" || spotMatch?.code !== p.code || spotMatch.liveLog.length < p.n) untrack(clearMoment);
  });
  // The moment has gone: the arena tag spins.
  $effect(() => {
    const r = reel;
    if (!r || r.spinning || mp) return;
    const t = setTimeout(() => (reel = { ...r, spinning: true }), REEL_AFTER_MOMENT_MS);
    return () => clearTimeout(t);
  });
  // Undo, another match, the result going in, or off Match centre: no spin.
  $effect(() => {
    const r = reel;
    if (!r) return;
    if (mpNow === "none" || spotMatch?.code !== r.code || spotMatch.liveLog.length < r.round - 1) reel = null;
  });
  // The heartbeat follows the match point, and the admin page's sound switch.
  $effect(() => {
    if (mpNow !== "none" && !data.tv.soundOff) announcer.startTension();
    else announcer.stopTension();
  });

  // ── The Arena (ArenaScene) ──────────────────────────────────────────
  // Everything the Arena shows for the match on screen, already in screen
  // order: round one's North player on the left for the whole match
  // (lib/arena.ts), whichever of p1 and p2 that is. null with no match.
  const arenaView = $derived.by(() => {
    const m = spotMatch;
    if (!m) return null;
    const target = pointsToWin(m.stage, m.roundLabel);
    const done = m.matchStatus === "done";
    const live = isLive(m);
    const L = leftSide(m);
    const R: 1 | 2 = L === 1 ? 2 : 1;
    const scoreOf = (w: 1 | 2) => (done ? (w === 1 ? m.p1Score : m.p2Score) : w === 1 ? m.liveP1 : m.liveP2) ?? 0;
    const decided = done || (live && (scoreOf(1) >= target || scoreOf(2) >= target));
    const walkover = done && m.walkover;
    const showScore = (done && !walkover) || live;
    // This round's arena and sides are on screen (not while their draw plays).
    const placeShown = live && !decided && drawHold !== m.code && !(reel?.code === m.code && !reel.spinning);
    const side = (w: 1 | 2, lr: "left" | "right"): ArenaSide => {
      const other = w === 1 ? 2 : 1;
      return {
        name: sideName(m, w),
        art: arenaArt(sideName(m, w), lr),
        score: showScore ? scoreOf(w) : null,
        side: placeShown ? sideOf(m, w) : "",
        pills: rounds.filter((r) => r.who === w),
        won: decided && scoreOf(w) > scoreOf(other),
        lost: decided && scoreOf(w) < scoreOf(other),
      };
    };
    const status: ArenaStatus = walkover
      ? "walkover"
      : done
        ? "result"
        : decided
          ? "won"
          : !live
            ? "summoned"
            : mpNow !== "none"
              ? "door"
              : "battle";
    // The strip along the bottom: the other table's match, and who's next.
    // The live one in its own screen order, so it reads the same when the
    // Arena cuts to it.
    const otherLive = onNow && onNow.code !== m.code ? onNow : null;
    const otherNext = nextUp && nextUp.code !== m.code ? nextUp : null;
    const oL = otherLive ? leftSide(otherLive) : 1;
    const oR: 1 | 2 = oL === 1 ? 2 : 1;
    const liveScore = (o: PBMatch, w: 1 | 2) => (w === 1 ? o.liveP1 : o.liveP2);
    return {
      L,
      R,
      left: side(L, "left"),
      right: side(R, "right"),
      target,
      status,
      context: matchContext(m, data.matches),
      arena:
        placeShown && stadiumOf(m.stadium)
          ? { stadium: m.stadium, round: m.liveLog.length + 1, spin: reel?.code === m.code, key: m.stadiumAt }
          : null,
      ticker: {
        live: otherLive
          ? { a: sideName(otherLive, oL), b: sideName(otherLive, oR), sa: liveScore(otherLive, oL), sb: liveScore(otherLive, oR) }
          : undefined,
        next: otherNext ? { a: sideName(otherNext, 1), b: sideName(otherNext, 2) } : undefined,
      },
      // Match point in screen order, and the score with it, for UltimateFinish.
      mp: mpToLR(mpNow, L),
      liveScore: [liveScore(m, L), liveScore(m, R)] as [number, number],
      // Death's Door, and whose it is on screen (false when nobody's).
      door: (mpNow === "both" ? "both" : mpNow === "none" || mpNow === "decided" ? false : (mpNow === "p1") === (L === 1) ? "left" : "right") as
        | false
        | "left"
        | "right"
        | "both",
    };
  });

  // The phone page's QR sits in the top bar (TvHeader) on every scene with one.

  // ── Operator control (keyboard / mouse at the TV) ───────────────────
  let barVisible = $state(true);
  let hideTimer: ReturnType<typeof setTimeout>;
  function poke() {
    barVisible = true;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => (barVisible = false), 3500);
  }
  // Picking a scene at the TV overrides everything for LOCAL_SECONDS.
  function setScene(s: Scene) {
    local = { scene: s, until: Date.now() + LOCAL_SECONDS * 1000 };
    react = null;
    winnerShow = null;
    qualifiedShow = null;
    if (s === "spotlight") spotIndex = 0; // jump to the live / next match
    poke();
  }
  function cycleScene(d: number) {
    const i = scenes.indexOf(scene);
    setScene(scenes[(i + d + scenes.length) % scenes.length]);
  }
  function browseSpot(d: number) {
    spotIndex = Math.max(0, Math.min(spotIndex + d, featured.length - 1));
    setScene("spotlight");
  }
  function toggleFull() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key >= "1" && e.key <= "9") {
      const i = +e.key - 1;
      if (scenes[i]) setScene(scenes[i]);
    } else if (e.key === "ArrowRight") {
      if (scene === "spotlight") browseSpot(1);
      else cycleScene(1);
    } else if (e.key === "ArrowLeft") {
      if (scene === "spotlight") browseSpot(-1);
      else cycleScene(-1);
    } else if (e.key.toLowerCase() === "f") {
      toggleFull();
    } else if (e.key.toLowerCase() === "i") {
      playBeyfestIntro();
    } else if (e.key === "Escape" && beyfestIntro) {
      beyfestIntro = 0;
    } else {
      poke();
    }
  }

  // Who is driving the screen, in words, for the operator bar.
  const modeLabel = $derived.by(() => {
    const fallback = data.tv.mode === "locked" ? "the organiser's choice" : "auto";
    if (localActive) return `Picked here, back to ${fallback} in ${Math.ceil((local!.until - now) / 1000)}s`;
    if (data.tv.mode === "locked") return "Locked by the organiser";
    if (reacting) return "Auto, showing the latest score";
    if (hold === "royale") return "Holding on the battle royale";
    if (hold === "royaleChampion") return "Holding on the battle royale champion";
    if (hold === "champion") return "Holding on the champion: the tournament is over";
    if (hold === "lordOfGold") return "Crowning the Lord of Gold, then back to the champion";
    if (hold === "standby") return "Holding the Gathering until Show the Circles";
    if (hold === "groups") return "Holding on the groups until the first match starts";
    if (hold === "respite") return "Holding the Respite until Begin the Paths";
    if (hold === "eve") return "Holding the Eve until the Reckoning starts";
    if (hold) return "Holding on the bracket until the first match starts";
    return "Auto rotation";
  });

  // False while the realtime connection is down; shows a small corner mark so
  // the operator knows the screen may be behind (it catches up on reconnect).
  let online = $state(true);

  onMount(() => {
    poke();
    const stopLive = liveUpdates(["tournaments", "groups", "players", "matches", "tv_state", "fighters", "royales", "people", "bets"], () => invalidateAll(), {
      onStatus: (up) => (online = up),
      everyMs: 30_000,
    });
    const clock = setInterval(tick, 1000);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", poke);
    // Any click or key press at the TV counts as allowing sound.
    window.addEventListener("pointerdown", unlockSound);
    window.addEventListener("keydown", unlockSound);
    // Ask for that click now, while the TV is being set up, rather than when
    // the intro or the first match needs sound.
    soundAllowed().then((ok) => {
      if (!ok) soundBlocked = true;
    });
    return () => {
      stopLive();
      clearInterval(clock);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", poke);
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
      announcer.setEnabled(false);
      clearTimeout(hideTimer);
    };
  });
</script>

<!-- tf: the scene on screen is in the Tetrafatalis look (dark stone, not the
     old blue field). Each scene joins the list as it's rebuilt. -->
<div
  class="tv"
  class:tf={TF_SCENES.includes(scene) || profileOn}
  class:cursor-hide={!barVisible}
  class:bar-open={barVisible}
  class:blank
>
  <!-- The Gathering fills the whole screen and carries the logo itself: no
       top bar. Champion and the flow holds carry their own giant title, so
       the bar has none for them. The phone QR is in the bar. -->
  {#if scene !== "standby" || profileOn}
    <TvHeader
      title={profileOn ? SCREENS.profile : ["champion", "respite", "eve", "lordOfGold"].includes(scene) ? "" : SCENE_TITLE[scene]}
      qr={data.liveQr}
    />
  {/if}

  <main class="stage">
    {#if profileOn}
      <!-- A fighter's profile sheet, now and then in the rotation. -->
      {#key profileSrc}
        <div class="profile">
          <img src={profileSrc} alt="" />
        </div>
      {/key}
    {:else if scene === "standby"}
      <GatheringScene
        when={`${EVENT.date} · ${EVENT.place}`}
        names={data.signedIn}
        qr={data.liveQr}
        url={data.liveQr.url.replace(/^https?:\/\//, "")}
      />

    {:else if scene === "groups"}
      <ProvingScene tablets={provingTablets} ticker={tableTicker} />

    {:else if scene === "rr"}
      <ProvingScene tablets={rrTablets} ticker={tableTicker} />

    {:else if scene === "bracket"}
      {#if structure}
        <BroadcastBracket
          matches={data.matches}
          players={data.players}
          {structure}
          {groupCount}
          orientation={bracketOrientation}
          carved
        />
      {/if}

    {:else if scene === "spotlight"}
      <!-- The Arena: the match on screen (ArenaScene), with the stadium draw
           over it. `blank` leaves only its backdrop for Start match's build-up. -->
      {#if arenaView}
        <ArenaScene
          left={arenaView.left}
          right={arenaView.right}
          target={arenaView.target}
          status={arenaView.status}
          context={arenaView.context}
          arena={arenaView.arena}
          onspindone={() => (reel = null)}
          door={arenaView.door}
          zoomed={mpZoom}
          {blank}
          ticker={arenaView.ticker}
          {callout}
          speech={{ left: speechL, right: speechR }}
        />
        {#if drawShow}
          {#key drawShow.id}
            <StadiumDraw
              stadium={drawShow.stadium}
              kind={drawShow.kind}
              round={drawShow.round}
              look={drawShow.look}
              {...drawSides(drawShow)}
              ondone={endDraw}
            />
          {/key}
        {/if}
      {:else}
        <div class="arena-empty">No matches yet. They'll appear here once the Circles are drawn.</div>
      {/if}

    {:else if scene === "awards"}
      <!-- Built from how every round was won. "So far" until The Reckoning. -->
      <DeedsScene
        deeds={awards.map((a) => ({
          key: a.key,
          title: a.title,
          name: a.winners.map((id) => names.get(id)).join(" & "),
          detail: a.opponent ? `${a.detail} against ${names.get(a.opponent)}` : a.detail,
        }))}
        settled={tournamentOver}
      />

    {:else if scene === "champion"}
      <!-- Browser only: the picture's address is worked out from the
           browser, and the reveal plays on mount anyway. -->
      {#if champ && champRun && mounted}
        <ChampionScene
          champion={sceneFighter(champ)}
          runnerUp={champRun.final ? sceneFighter(champRun.final.opponent) : null}
          run={champRun}
          awards={awards.map((a) => ({
            key: a.key,
            title: a.title,
            name: a.winners.map((id) => names.get(id)).join(" & "),
            detail: a.opponent ? `${a.detail} against ${names.get(a.opponent)}` : a.detail,
          }))}
        />
      {/if}

    {:else if scene === "respite"}
      <FlowHold kind="respite" {circles} {wagerers} wagersOpen />

    {:else if scene === "eve"}
      <FlowHold kind="eve" {finalists} />

    {:else if scene === "lordOfGold"}
      <FlowHold kind="lordOfGold" {wagerers} />

    {:else if scene === "royale"}
      {#if data.royale && mounted}
        <RoyaleBoard royale={data.royale} fighter={introFighter} />
      {/if}

    {:else if scene === "royaleChampion"}
      {#if royaleChamp && mounted}
        <ChampionScene
          champion={royaleSceneFighter(royaleChamp)}
          runnerUp={royaleRunnerUp ? royaleSceneFighter(royaleRunnerUp) : null}
          kicker={TITLES.royaleChampion}
        />
      {/if}
    {/if}
  </main>

  <!-- Match point: the moment over the whole screen, in the Arena's screen
       order (its p1 is whoever is on the left). No held banner: the Arena
       marks Death's Door itself (the pill, the glow, the pulsing score). -->
  {#if mpNow !== "none" && arenaView}
    <div class="mp-layer">
      <UltimateFinish
        variant={MP_VARIANT}
        mp={arenaView.mp}
        event={mp?.go ? mp.event : null}
        eventId={mp?.go ? mp.n : 0}
        announced={!mp}
        banner={false}
        p1={{ name: arenaView.left.name, img: "" }}
        p2={{ name: arenaView.right.name, img: "" }}
        score={arenaView.liveScore}
        ondone={clearMoment}
      />
    </div>
  {/if}

  <!-- The winner screen covers the whole screen after a result, and holds
       until the next match starts; that match's intro plays over it. -->
  {#if winnerShow}
    {#key winnerShow.id}
      <div class="intro-layer">
        <WinnerScreen
          winner={winnerShow.winner}
          loser={winnerShow.loser}
          score={winnerShow.score}
          side={winnerShow.side}
          title={winnerShow.title}
          tier={winnerShow.tier}
          walkover={winnerShow.walkover}
          leaving={winnerLeaving}
          next={winnerNext}
          ondone={() => (winnerShow = null)}
        />
      </div>
    {/key}
  {/if}

  <!-- The battle royale's Qualified screen, after a heat or the sudden death. -->
  {#if qualifiedShow}
    {#key qualifiedShow.id}
      <div class="intro-layer">
        <QualifiedScreen
          fighters={qualifiedShow.fighters}
          label={qualifiedShow.label}
          toSudden={qualifiedShow.toSudden}
          leaving={qualifiedLeaving}
          ondone={() => (qualifiedShow = null)}
        />
      </div>
    {/key}
  {/if}

  <!-- The VS intro covers the whole screen (header and all) before a launch. -->
  {#if introShow}
    {#key introShow.id}
      <div class="intro-layer">
        <VsIntro
          p1={introShow.p1}
          p2={introShow.p2}
          title={introShow.title}
          sides={introShow.sides}
          out={introShow.out}
          ondone={endIntro}
        />
      </div>
    {/key}
  {/if}

  <!-- The battle royale draw: the heats, as a wheel, over everything. -->
  {#if royaleDraw && royale}
    {#key royaleDraw.id}
      <div class="intro-layer">
        <RoyaleDraw
          fighters={royaleDraw.fighters}
          heats={royale.plan.heats}
          finalSize={royale.plan.finalSize}
          sudden={royale.plan.sudden}
          ondone={() => (royaleDraw = null)}
        />
      </div>
    {/key}
  {/if}

  <!-- The battle royale's intro: everyone in the battle, over everything. -->
  {#if royaleIntro}
    {#key royaleIntro.id}
      <div class="intro-layer">
        <RoyaleIntro
          fighters={royaleIntro.fighters}
          label={royaleIntro.label}
          out={royaleIntro.out}
          ondone={() => {
            royaleIntro = null;
            qualifiedShow = null; // it held under the intro until now
          }}
        />
      </div>
    {/key}
  {/if}

  <!-- The Beyfest intro, over everything, from the admin page or I. -->
  {#if beyfestIntro && mounted}
    {#key beyfestIntro}
      <div class="intro-layer">
        <IntroPlayer
          muted={data.tv.soundOff}
          onblocked={() => (soundBlocked = true)}
          ondone={() => (beyfestIntro = 0)}
        />
      </div>
    {/key}
  {/if}

  <!-- Small and in the corner: for the operator, not the room. -->
  {#if !online}<div class="offline" role="status">Reconnecting</div>{/if}
  {#if soundBlocked}
    <button class="offline sound" onclick={unlockSound}>Sound is blocked: click to allow</button>
  {/if}

  <nav class="opbar" class:hidden={!barVisible}>
    <span class="op-mode">{modeLabel}</span>
    <span class="grp">
      {#each scenes as s, i (s)}
        <button class:active={scene === s} onclick={() => setScene(s)}>{i + 1} {SCENE_TITLE[s]}</button>
      {/each}
    </span>
    {#if scene === "spotlight" && featured.length}
      <span class="spot-nav">
        <button onclick={() => browseSpot(-1)} aria-label="Previous match">‹</button>
        {Math.min(spotIndex, featured.length - 1) + 1} of {featured.length}
        <button onclick={() => browseSpot(1)} aria-label="Next match">›</button>
      </span>
    {/if}
    <button class="full" onclick={toggleFull}>Full screen</button>
  </nav>
</div>

<style>
  /* Ultramarine field with static diagonal speed lines — painted once, no
     photo, blur or glow, so it stays smooth. */
  .tv {
    position: fixed;
    inset: 0;
    --accent: var(--gold);
    --accent-deep: var(--gold);
    --bg:
      repeating-linear-gradient(-62deg, transparent 0 46px, rgb(255 255 255 / 0.035) 46px 48px),
      var(--field);
    --tv-plate: var(--field-deep);
    --tv-plate2: var(--dark2);
    --tv-line: var(--field-line);
    --tv-dim: var(--on-field-soft);
    --disp: var(--font-display);
    --lbl: var(--font-text);
    --num: var(--font-display);
    --name-family: var(--font-display);
    --name-transform: uppercase;
    --name-weight: 700;
    --rank-skew: 0deg;
    --plate-radius: 2px;
    --plate-cut: 0px;

    background: var(--bg);
    color: var(--text);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--font-text);
  }
  .cursor-hide {
    cursor: none;
  }
  .stage,
  .opbar {
    position: relative;
    z-index: 1;
  }

  /* ── Blader profile sheet ───────────────────────────────────────── */
  /* The sheet as big as fits the stage, centred (inset 0 + margin auto). */
  .profile {
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
    margin: 8px 0 14px;
  }
  .profile img {
    position: absolute;
    inset: 0;
    margin: auto;
    max-width: 100%;
    max-height: 100%;
    /* A gold frame with a dark edge, as round the champion's picture. */
    border-radius: 8px;
    box-shadow:
      0 0 0 5px #eab13a,
      0 0 0 10px #1c0c04,
      0 14px 0 #000,
      0 0 60px rgba(255, 170, 50, 0.35);
    /* Pops in, then holds still. */
    animation: profile-in 0.6s cubic-bezier(0.2, 1.2, 0.4, 1) both;
  }
  @keyframes profile-in {
    from {
      opacity: 0;
      transform: translateY(40px) scale(0.96);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .profile img {
      animation: none;
    }
  }

  .intro-layer {
    position: absolute;
    inset: 0;
    z-index: 40;
  }
  .mp-layer {
    position: absolute;
    inset: 0;
    z-index: 39; /* under the intro and winner screens */
    pointer-events: none;
  }
  /* Start match's build-up (the stadium draw, then LET IT RIP) plays over the
     Arena's bare backdrop: ArenaScene hides its own parts while `blank` is
     set. The top bar stays, so the backdrop has no seam under it. */

  /* Scenes in the Tetrafatalis look sit on dark stone, not the blue field. */
  .tv.tf {
    background: radial-gradient(ellipse 80% 80% at 50% 55%, #23232b, #08080b 78%);
  }
  .stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 26px 46px;
    overflow: hidden;
    transition: padding-bottom 0.25s ease;
  }
  /* Keep content clear of the operator bar while it's on screen. */
  .tv.bar-open .stage {
    padding-bottom: 96px;
  }


  /* ── The Arena ──────────────────────────────────────────────────────
     The match itself is ArenaScene (it fills the stage). This is only the
     line shown when there is no match to put in it yet. */
  .arena-empty {
    font-family: var(--tf-font-text);
    font-size: 2.2rem;
    font-style: italic;
    color: #d9c79b;
  }

  /* Operator bar */
  .opbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    padding: 12px;
    background: var(--field-deep);
    border-top: var(--outline) solid var(--ink);
    transition:
      transform 0.25s ease,
      opacity 0.25s ease;
  }
  .opbar.hidden {
    transform: translateY(120%);
    opacity: 0;
  }
  .grp {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  .opbar button {
    font-family: var(--font-text);
    font-weight: 700;
    font-size: 1rem;
    padding: 7px 14px;
    border-radius: 0;
    border: 2px solid var(--ink);
    background: var(--dark3);
    color: var(--paper);
    cursor: pointer;
  }
  .opbar button.active {
    background: var(--gold);
    color: var(--ink);
  }
  .opbar button:focus-visible {
    outline: 3px solid var(--gold);
    outline-offset: 2px;
  }
  .op-mode {
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 1rem;
    color: var(--on-field-soft);
    margin-right: 8px;
  }
  .spot-nav {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--tv-dim);
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: reduce) {
    .opbar {
      transition: none;
    }
  }
  .offline {
    position: fixed;
    left: 14px;
    bottom: 14px;
    z-index: 60;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-text);
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--paper);
    background: var(--ink);
    padding: 4px 10px 4px 8px;
  }
  .offline::before {
    content: "";
    width: 10px;
    height: 10px;
    background: var(--red);
  }
  .offline.sound {
    left: auto;
    right: 14px;
    border: 0;
    cursor: pointer;
  }
  .offline.sound::before {
    background: var(--gold);
  }
</style>
