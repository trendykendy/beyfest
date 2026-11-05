<script lang="ts">
  import TensionGlow from "$lib/components/tv/TensionGlow.svelte";
  import UltimateFinish, { eventLanding, eventLength, type Variant } from "$lib/components/tv/UltimateFinish.svelte";
  import { Announcer } from "$lib/components/tv/announcer";
  import { faceCrop } from "$lib/fighters";
  import { matchPointEvent, matchPointState, type MatchPointEvent } from "$lib/matchPoint";
  import { MATCH_POINT_FX_LEVEL, MATCH_POINT_HIT, SUDDEN_DEATH_CALL, finishClip, matchPointCalls } from "$lib/sounds";
  import { page } from "$app/state";
  import { onMount, tick } from "svelte";

  // Lab page for Ultimate Finish. Not linked from anywhere. A mock Match centre
  // with scripted matches, so each variant can be seen and heard in sequence,
  // and a button for each moment on its own. The match point rules are the
  // real ones (lib/matchPoint.ts), so nothing here decides when a moment fires.
  //
  // URL: ?v=a|b|c  ?state=tension|slam|suddenDeath|saved  ?side=blue  ?f=<pair>
  //      ?noimg  ?lite  ?clean  ?t=<ms> (freeze for a screenshot)
  // Keys: H hides the controls, space or R replays, 1/2/3 pick a variant.
  const SF = "/starter-fighters/";
  const PAIRS = {
    picture: [
      { name: "The Buzzsaw", img: SF + "buzzsaw.png", face: { x: 0.444, y: 0.364, h: 0.237 } },
      { name: "The Breycist", img: SF + "breycist.png", mirror: true, face: { x: 0.686, y: 0.189, h: 0.224 } },
    ],
    "long name": [
      { name: "The Torque Warden", img: SF + "torquewarden.png", face: { x: 0.517, y: 0.221, h: 0.214 } },
      { name: "The Fairy Dancer", img: SF + "fairydancer.png", face: { x: 0.448, y: 0.235, h: 0.286 } },
    ],
    "no picture": [
      { name: "The Modsmith", img: "" },
      { name: "Ronan", img: "" },
    ],
  };
  type Pair = keyof typeof PAIRS;
  const TARGET = 5; // first to 5, like most of the day's matches
  const AFTER_CALLOUT = 1700; // as the TV: the finish call-out, then the stadium draw
  const DRAW = 2400; // stands in for the stadium draw

  const q = page.url.searchParams;
  const qv = q.get("v") as Variant;
  let variant = $state<Variant>(qv === "a" || qv === "c" ? qv : "b");
  const qf = q.get("f") as Pair;
  let pair = $state<Pair>(qf in PAIRS ? qf : "picture");
  let noImg = $state(q.has("noimg"));
  let lite = $state(q.has("lite"));
  // ?slow=4: quarter speed.
  let slow = $state(Number(q.get("slow")) || 1);
  // ?side=blue: p2 is the one out in front.
  let blueLeads = $state(q.get("side") === "blue");
  let showControls = $state(!q.has("clean"));

  const fighters = $derived.by(() => {
    const [a, b] = PAIRS[pair];
    return noImg ? [{ ...a, img: "" }, { ...b, img: "" }] : [a, b];
  });

  // ── The mock match ──
  let score = $state<[number, number]>([3, 3]);
  let callout = $state(""); // the finish, as the TV calls it
  let drawing = $state(false); // the stadium draw is up
  let winner = $state<0 | 1 | null>(null);
  let note = $state(""); // what's happening, for the controls
  let event = $state<MatchPointEvent | null>(null);
  let eventId = $state(0);
  let announced = $state(false); // the moment has played, so the banner can stay
  const mpState = $derived(matchPointState(score[0], score[1], TARGET));
  const inTension = $derived(mpState === "p1" || mpState === "p2" || mpState === "both");
  // The art panels zoom onto the faces once match point has been announced. In
  // B and C that's as the full-screen moment clears, so the zoom can be seen.
  const zoomed = $derived(inTension && announced && (variant === "a" || !event));

  // The panel crop, as the TV's slabArt(): on the face, looking toward the VS.
  type Fighter = { img: string; mirror?: boolean; face?: { x: number; y: number; h: number } };
  const panelStyle = (f: Fighter, i: number) => faceCrop(f.face ?? null, 0.34, (i === 0) !== !!f.mirror);

  // ── Sound ──
  // Off by default: ticking the box is the click the browser wants first.
  const announcer = new Announcer();
  let sound = $state(false);
  onMount(() => {
    announcer.setEnabled(false);
    return () => {
      stop();
      announcer.setEnabled(false);
    };
  });
  function toggleSound() {
    announcer.setEnabled(sound);
    if (!sound) return;
    if (inTension) announcer.startTension();
    announcer.preloadTension();
    [SUDDEN_DEATH_CALL, finishClip("spin"), finishClip("knockout"), finishClip("dominant")].forEach((u) => announcer.preload(u));
  }
  $effect(() => {
    if (inTension) announcer.startTension();
    else announcer.stopTension();
  });

  function impactOnly() {
    const a = new Audio(MATCH_POINT_HIT);
    a.volume = MATCH_POINT_FX_LEVEL;
    a.play();
  }

  // ── Playing a moment ──
  function fire(ev: MatchPointEvent) {
    event = ev;
    eventId++;
    announced = true;
    timers.push(setTimeout(() => announcer.matchPointHit(matchPointCalls(ev)), eventLanding(variant, ev) * slow));
  }

  // ── Scripts ──
  // Each `wait` is cancelled by the next script, so its steps simply never run.
  let timers: ReturnType<typeof setTimeout>[] = [];
  let script = $state("");
  const wait = (ms: number) => new Promise<void>((go) => timers.push(setTimeout(go, ms * slow)));

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    script = "";
    callout = "";
    drawing = false;
    event = null;
    note = "";
  }

  // `lead` and `other` are the leader's score and the chaser's; ?side=blue
  // swaps which of them is p1.
  const pts = (lead: number, other: number): [number, number] => (blueLeads ? [other, lead] : [lead, other]);

  function setUp(lead: number, other: number) {
    stop();
    winner = null;
    score = pts(lead, other);
    const s = matchPointState(score[0], score[1], TARGET);
    announced = s !== "none";
    announcer.silenceMatch(0);
    announcer.intro([]);
  }

  // A round is logged: the call-out, then the draw, and then the moment, so the
  // two never overlap. Tension starts with the score and holds through the draw.
  async function round(lead: number, other: number, finish: string, label: string) {
    const after = pts(lead, other);
    const ev = matchPointEvent(score, after, TARGET);
    score = after;
    callout = label;
    announcer.call([finishClip(finish)]);
    const s = matchPointState(after[0], after[1], TARGET);
    if (s === "decided") {
      await wait(AFTER_CALLOUT);
      callout = "";
      winner = after[0] > after[1] ? 0 : 1;
      note = "Match won: the winner screen takes over here";
      announcer.endMatch([], true);
      return;
    }
    await wait(AFTER_CALLOUT);
    callout = "";
    drawing = true;
    await wait(DRAW);
    drawing = false;
    if (ev) {
      note = ev;
      fire(ev);
      await wait(eventLength(variant, ev));
    }
  }

  const SCRIPTS: Record<string, () => Promise<void>> = {
    "Full match": async () => {
      setUp(3, 3);
      await wait(1500);
      await round(4, 3, "spin", "Spin finish");
      await wait(3500);
      await round(4, 4, "spin", "Spin finish");
      await wait(3500);
      await round(6, 4, "knockout", "Knockout");
    },
    "Save, then catch up": async () => {
      setUp(4, 1);
      await wait(2500);
      await round(4, 3, "knockout", "Knockout");
      await wait(3500);
      await round(4, 4, "spin", "Spin finish");
      await wait(3500);
    },
    "Jump past it (2-0 to 5-0)": async () => {
      setUp(2, 0);
      await wait(2000);
      await round(5, 0, "dominant", "Dominant finish");
    },
    "Tension through the draw": async () => {
      setUp(4, 2);
      await wait(1500);
      drawing = true;
      await wait(DRAW * 2);
      drawing = false;
      await wait(3000);
    },
  };

  async function runScript(name: string) {
    stop();
    script = name;
    const s = SCRIPTS[name];
    await s();
    if (script === name) script = "";
  }

  // One moment on its own, at the score it would really happen at.
  function only(kind: "tension" | MatchPointEvent) {
    stop();
    winner = null;
    score = kind === "suddenDeath" ? [4, 4] : pts(4, kind === "saved" ? 3 : 2);
    announced = kind === "tension";
    if (kind !== "tension") fire(kind);
  }

  let last = $state<(() => void) | null>(null);
  const replay = () => last?.();

  // ?state=… shows that moment straight away, for screenshots.
  const qs = q.get("state");
  onMount(() => {
    if (qs === "tension" || qs === "slam" || qs === "suddenDeath" || qs === "saved") only(qs);
  });

  // ?t=<ms> freezes every animation at that moment (for screenshots).
  const freezeAt = q.get("t");
  $effect(() => {
    if (freezeAt === null) return;
    eventId;
    tick().then(() =>
      requestAnimationFrame(() => {
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = Number(freezeAt);
        }
      }),
    );
  });

  function onkey(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "h" || e.key === "H") showControls = !showControls;
    if (e.key === "1") variant = "a";
    if (e.key === "2") variant = "b";
    if (e.key === "3") variant = "c";
    if (e.key === " " || e.key === "r" || e.key === "R") {
      e.preventDefault();
      replay();
    }
  }

  let stageW = $state(1920);
  const VARIANTS: [Variant, string][] = [
    ["a", "A: tension only"],
    ["b", "B: slam, then tension"],
    ["c", "C: full cinematic"],
  ];
  const ONLY: ["tension" | MatchPointEvent, string][] = [
    ["tension", "Tension"],
    ["slam", "Match point"],
    ["suddenDeath", "Sudden death"],
    ["saved", "Saved"],
  ];
</script>

<svelte:window onkeydown={onkey} />
<svelte:head><title>Ultimate Finish · lab</title></svelte:head>

<div class="page">
  <div class="stage" bind:clientWidth={stageW}>
    <TensionGlow mp={mpState} />

    <!-- A stand-in for the TV's Match centre, on the same 1920×1080 canvas. -->
    <div class="mock" class:zoomed style:--k={slow} style:transform="scale({stageW / 1920})">
      <div class="status">
        {#if winner !== null}<span class="tag won">Match won</span>{:else}<span class="tag live">Live</span>{/if}
        <span class="context">Winners semi-final · First to {TARGET}</span>
      </div>
      <div class="duel">
        {#each [0, 1] as i}
          {@const f = fighters[i]}
          <div class="card" class:right={i === 1} class:lost={winner !== null && winner !== i}>
            {#if f.img}
              <div class="art">
                <div class="art-pic">
                  <div class="art-zoom"><img src={f.img} alt="" style={panelStyle(f, i)} /></div>
                </div>
              </div>
            {/if}
            <div class="slab">
              <div class="name">{f.name}</div>
              <div class="score">{score[i]}</div>
            </div>
          </div>
          {#if i === 0}<div class="vs">VS</div>{/if}
        {/each}
      </div>
      {#if callout}<div class="callout">{callout}</div>{/if}
      {#if drawing}<div class="draw">Stadium draw<small>stand-in for the real shuffle</small></div>{/if}
    </div>

    <UltimateFinish
      {variant}
      mp={mpState}
      {event}
      {eventId}
      {announced}
      p1={fighters[0]}
      p2={fighters[1]}
      {score}
      {slow}
      {lite}
      ondone={() => (event = null)}
    />
  </div>

  {#if showControls}
    <div class="controls">
      <span class="group">
        {#each VARIANTS as [v, label]}
          <button class:on={variant === v} onclick={() => (variant = v)}>{label}</button>
        {/each}
      </span>
      <span class="group">
        Play
        {#each Object.keys(SCRIPTS) as name}
          <button
            class:on={script === name}
            onclick={() => {
              last = () => runScript(name);
              last();
            }}>{name}</button
          >
        {/each}
      </span>
      <span class="group">
        Moment
        {#each ONLY as [kind, label]}
          <button
            onclick={() => {
              last = () => only(kind);
              last();
            }}>{label}</button
          >
        {/each}
      </span>
      <span class="group">
        Fighters
        <select bind:value={pair}>
          {#each Object.keys(PAIRS) as p}<option>{p}</option>{/each}
        </select>
      </span>
      <label><input type="checkbox" bind:checked={blueLeads} /> Blue leads</label>
      <label><input type="checkbox" bind:checked={noImg} /> No art</label>
      <label><input type="checkbox" bind:checked={lite} /> Lite</label>
      <span class="group">
        Speed
        {#each [1, 2, 4] as k}
          <button class:on={slow === k} onclick={() => (slow = k)}>{k === 1 ? "1×" : `1/${k}`}</button>
        {/each}
      </span>
      <label class="snd"><input type="checkbox" bind:checked={sound} onchange={toggleSound} /> Sound</label>
      <button onclick={impactOnly}>Impact only</button>
      <span class="note">{note || "H hides this · 1/2/3 pick a variant · space replays"}</span>
    </div>
  {/if}
</div>

<style>
  .page {
    position: fixed;
    inset: 0;
    background: #000;
    display: grid;
    place-items: center;
  }
  /* Largest 16:9 box that fits the window. */
  .stage {
    position: relative;
    width: min(100vw, calc(100vh * 16 / 9));
    aspect-ratio: 16 / 9;
    background:
      repeating-linear-gradient(-60deg, rgb(255 255 255 / 0.035) 0 2px, transparent 2px 16px),
      var(--field-deep);
    overflow: hidden;
  }

  .mock {
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 1080px;
    transform-origin: 0 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 48px;
    padding-bottom: 80px;
    box-sizing: border-box;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 22px;
    font: 600 30px var(--font-text);
    color: var(--paper);
  }
  .tag {
    font: 35px var(--font-display);
    text-transform: uppercase;
    line-height: 1;
    padding: 10px 26px 12px 20px;
  }
  .tag.live {
    background: var(--red);
    color: var(--paper);
  }
  .tag.won {
    background: var(--gold);
    color: var(--ink);
  }
  .duel {
    width: 1720px;
    display: grid;
    grid-template-columns: 1fr 160px 1fr;
    align-items: center;
  }
  .vs {
    text-align: center;
    font: 96px var(--font-display);
    color: var(--gold);
  }
  .card {
    display: flex;
    min-width: 0;
  }
  .card.right {
    flex-direction: row-reverse;
  }
  .art {
    position: relative;
    flex: none;
    width: 170px;
    margin-right: 18px;
    transform: skewX(-10deg);
    border: 4px solid var(--ink);
    border-top: 16px solid var(--gold);
    box-shadow: 12px 12px 0 var(--ink);
    overflow: hidden;
    background: var(--field-deep);
  }
  .right .art {
    margin: 0 0 0 18px;
  }
  /* Straightened back up and wider, as on the TV (.mc-art-pic). */
  .art-pic {
    position: absolute;
    inset: 0 -50px;
    overflow: hidden;
    transform: skewX(10deg);
  }
  /* faceCrop() puts the face in the middle of this box, so scaling it from the
     middle zooms straight onto the face. */
  .art-zoom {
    position: absolute;
    inset: 0;
    transition: transform calc(700ms * var(--k)) cubic-bezier(0.2, 1.3, 0.4, 1);
  }
  .zoomed .art-zoom {
    transform: scale(2.2);
  }
  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 20%;
  }
  @media (prefers-reduced-motion: reduce) {
    .art-zoom {
      transition: none;
    }
  }
  .slab {
    flex: 1;
    min-width: 0;
    transform: skewX(-10deg);
    background: var(--paper);
    color: var(--ink);
    border: 4px solid var(--ink);
    border-top: 16px solid var(--gold);
    box-shadow: 12px 12px 0 var(--ink);
    display: flex;
    flex-direction: column;
    padding: 24px 40px 20px;
  }
  .lost .slab {
    background: #dfe3f2;
  }
  .name {
    font-family: var(--font-display);
    font-stretch: 62%;
    text-transform: uppercase;
    font-size: 92px;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .right .name {
    text-align: right;
  }
  .score {
    font-family: var(--font-display);
    font-size: 260px;
    line-height: 0.82;
    font-variant-numeric: tabular-nums;
    align-self: flex-end;
  }
  .right .score {
    align-self: flex-start;
  }
  .callout {
    position: absolute;
    left: 50%;
    top: 74px;
    transform: translateX(-50%) skewX(-10deg);
    padding: 8px 40px;
    background: var(--gold);
    color: var(--ink);
    font: 72px var(--font-display);
    text-transform: uppercase;
  }
  .draw {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: 30px 70px;
    background: var(--ink);
    color: var(--paper);
    border: 4px solid var(--gold);
    font: 72px var(--font-display);
    text-transform: uppercase;
    text-align: center;
  }
  .draw small {
    display: block;
    font: 26px var(--font-text);
    text-transform: none;
    color: var(--on-field-soft);
  }

  .controls {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    padding: 10px 14px;
    background: rgb(0 0 0 / 0.78);
    color: #fff;
    font: 14px var(--font-text);
    border: 1px solid rgb(255 255 255 / 0.2);
  }
  .group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  button,
  select {
    font: inherit;
    padding: 4px 10px;
    background: #222;
    color: #fff;
    border: 1px solid #555;
    cursor: pointer;
  }
  button.on {
    background: var(--gold);
    color: #000;
  }
  .note {
    color: #ccc;
  }
</style>
