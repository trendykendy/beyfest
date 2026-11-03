<script lang="ts">
  import starterList from "../../../../../static/starter-fighters/fighters.json";
  import { artFor, faceCrop, toFace } from "$lib/fighters";
  import PixelBubble, { type BubbleSide } from "$lib/components/tv/speech/PixelBubble.svelte";
  import { page } from "$app/state";
  import { tick } from "svelte";

  // Lab page for the pixel speech bubbles over the Match centre's art panels.
  // Not linked from anywhere.
  //   ?len=short|medium|long   pin the line length (default: cycles;
  //                            long is the longest approved line, 45 chars)
  //   ?l=<img> ?r=<img>        starter fighters by picture name (e.g. buzzsaw)
  //   ?clean hides the controls, ?t=<ms> shows the rival exchange frozen at
  //   that moment, R / space replays, H hides the control bar.
  const q = page.url.searchParams;

  type Starter = {
    name: string;
    player: string;
    image: string;
    imageMirrored?: string;
    mirror?: boolean;
    face?: unknown;
  };
  const STARTERS = starterList as Starter[];
  const slug = (s: Starter) => s.image.replace(/\.\w+$/, "");
  const bySlug = (k: string | null, fallback: number) => STARTERS.find((s) => slug(s) === k) ?? STARTERS[fallback];

  // The TV's slabArt(), for the static starter pictures.
  function art(f: Starter, side: BubbleSide) {
    const wantFlip = (side === "left") !== !!f.mirror;
    const a = artFor(
      { img: `/starter-fighters/${f.image}`, imgMirrored: f.imageMirrored ? `/starter-fighters/${f.imageMirrored}` : "" },
      wantFlip,
    );
    const face0 = toFace(f.face);
    const face = face0 && wantFlip && !a.flip ? { ...face0, x: 1 - face0.x } : face0;
    return { src: a.src, style: faceCrop(face, 0.34, a.flip) };
  }

  // Sample lines: a solo line after a score, then a two-line rival exchange.
  const LINES = {
    short: { solo: "Let it rip!", a: "Too easy!", b: "Lucky spin!" },
    medium: { solo: "That's how it's done, baby!", a: "Is that all you've got?", b: "I'm only warming up!" },
    long: {
      solo: "If it's stupid and it works, it's not stupid.",
      a: "You'll need a bigger launcher than that!",
      b: "Keep talking. I'll keep scoring points.",
    },
  };
  type Len = keyof typeof LINES;
  const LENS: Len[] = ["short", "medium", "long"];

  let lenPin = $state<Len | "cycle">((q.get("len") as Len) ?? "cycle");
  let cycle = $state(0);
  const len = $derived<Len>(lenPin === "cycle" ? LENS[cycle % 3] : lenPin);
  let left = $state(bySlug(q.get("l"), 3)); // The Buzzsaw
  let right = $state(bySlug(q.get("r"), 2)); // The Breycist
  let run = $state(0);
  let showControls = $state(!q.has("clean"));

  // ── Timeline ────────────────────────────────────────────────────────
  const freezeAt = q.get("t");
  let soloL = $state(false);
  let exL = $state(false);
  let exR = $state(false);
  let scored = $state(false);
  $effect(() => {
    run;
    soloL = exL = exR = scored = false;
    if (freezeAt !== null) {
      exL = exR = scored = true;
      return;
    }
    const at = (ms: number, f: () => void) => setTimeout(f, ms);
    const ids = [
      at(300, () => (scored = true)),
      at(450, () => (soloL = true)),
      at(3600, () => (soloL = false)),
      at(4400, () => (exL = true)),
      at(5900, () => (exR = true)),
      at(9300, () => (exL = exR = false)),
      at(10200, () => {
        cycle++;
        run++;
      }),
    ];
    return () => ids.forEach(clearTimeout);
  });

  // ?t=<ms> freezes every animation at that moment (for screenshots).
  $effect(() => {
    if (freezeAt === null) return;
    run;
    tick().then(() =>
      requestAnimationFrame(() => {
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = Number(freezeAt);
        }
      }),
    );
  });

  // The art panel is skewed -10° about its centre, so its top edge sits
  // tan(10°)·h/2 further right than its box. Aim the tail at the top's middle.
  let cardH = $state(400);
  const SKEW = Math.tan((10 * Math.PI) / 180);
  const anchorL = $derived(Math.round(95 + (SKEW * cardH) / 2));
  const anchorR = $derived(Math.round(95 - (SKEW * cardH) / 2));

  let w = $state(1920);
  let h = $state(1080);
  const scale = $derived(Math.min(w / 1920, h / 1080));

  function replay() {
    run++;
  }
  function onkey(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === "SELECT") return;
    if (e.key === "h" || e.key === "H") showControls = !showControls;
    if (e.key === " " || e.key === "r" || e.key === "R") {
      e.preventDefault();
      replay();
    }
  }
</script>

<svelte:window onkeydown={onkey} bind:innerWidth={w} bind:innerHeight={h} />
<svelte:head><title>Speech bubbles · lab</title></svelte:head>

{#snippet artPanel(f: Starter, side: BubbleSide)}
  {@const a = art(f, side)}
  <div class="mc-art" aria-hidden="true">
    <div class="mc-art-pic">
      <div class="mc-art-bg"></div>
      <img src={a.src} alt="" style={a.style} />
    </div>
  </div>
{/snippet}

<div class="page">
  <div class="screen" style:transform="scale({scale})">
      <div class="strip"></div>
      <div class="stage">
        <div class="mc">
          <div class="mc-status">
            <span class="mc-tag live">Live</span>
            <span class="mc-context">Group A · Match 3</span>
          </div>
          <div class="mc-duel">
            <div class="mc-side left">
              <div
                class="mc-card"
                bind:clientHeight={cardH}
                style:--pb-anchor="{anchorL}px"
                style:--pb-gap="8px"
              >
                {@render artPanel(left, "left")}
                <div class="mc-slab">
                  <div class="mc-name">{left.player}</div>
                  <div class="mc-score">{scored ? 4 : 3}</div>
                </div>
                {#key run}
                  <PixelBubble side="left" text={LINES[len].solo} show={soloL} />
                  <PixelBubble side="left" text={LINES[len].a} show={exL} />
                {/key}
              </div>
            </div>
            <div class="mc-mid">
              <div class="mc-vs">VS</div>
              <div class="mc-ft">First to <b>5</b></div>
            </div>
            <div class="mc-side right">
              <div class="mc-card" style:--pb-anchor="{anchorR}px" style:--pb-gap="8px">
                <div class="mc-slab">
                  <div class="mc-score">2</div>
                  <div class="mc-name">{right.player}</div>
                </div>
                {@render artPanel(right, "right")}
                {#key run}
                  <PixelBubble side="right" text={LINES[len].b} show={exR} />
                {/key}
              </div>
            </div>
          </div>
        </div>
      </div>
  </div>

  {#if showControls}
    <div class="controls">
      <button onclick={replay}>Replay</button>
      <label>
        Line
        <select bind:value={lenPin} onchange={replay}>
          <option value="cycle">cycle</option>
          {#each LENS as l (l)}<option value={l}>{l}</option>{/each}
        </select>
      </label>
      <label>
        Left
        <select bind:value={left}>
          {#each STARTERS as s (s.image)}<option value={s}>{s.name}</option>{/each}
        </select>
      </label>
      <label>
        Right
        <select bind:value={right}>
          {#each STARTERS as s (s.image)}<option value={s}>{s.name}</option>{/each}
        </select>
      </label>
      <span class="hint">{len} · R / space replays · H hides this</span>
    </div>
  {/if}
</div>

<style>
  .page {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
  }
  .screen {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 1920px;
    height: 1080px;
    margin: -540px 0 0 -960px;
    display: flex;
    flex-direction: column;
    background:
      repeating-linear-gradient(-62deg, transparent 0 46px, rgb(255 255 255 / 0.035) 46px 48px),
      var(--field);
    color: var(--text);
    overflow: hidden;
  }
  .strip {
    height: 98px;
    flex: none;
    background: var(--field-deep);
    border-bottom: var(--outline) solid var(--ink);
  }
  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    padding: 26px 46px;
    overflow: hidden;
  }

  /* ── Stand-in Match centre (copied from routes/tv/+page.svelte) ───── */
  .mc {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 48px;
  }
  .mc-status {
    display: flex;
    align-items: center;
    gap: 22px;
    font-family: var(--font-text);
    font-size: 1.9rem;
    font-weight: 600;
  }
  .mc-tag {
    font-family: var(--font-display);
    text-transform: uppercase;
    font-size: 2.2rem;
    line-height: 1;
    padding: 10px 26px 12px 20px;
    clip-path: polygon(0 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%);
  }
  .mc-tag.live {
    background: var(--red);
    color: var(--paper);
  }
  .mc-duel {
    --tier: var(--gold);
    width: 100%;
    max-width: 1720px;
    display: grid;
    grid-template-columns: 1fr 200px 1fr;
    align-items: center;
    padding-bottom: 72px;
  }
  .mc-side {
    position: relative;
    min-width: 0;
  }
  /* The bubbles hang off this, placed as on the TV (see .mc-card there):
     spread out over the art panel toward the screen edge, and narrow enough
     to stay clear of the status row. */
  .mc-card {
    position: relative;
    --pb-out: 56px;
    --pb-max: 390px;
    --pb-tail-x: calc(var(--pb-anchor) + var(--pb-out));
    display: flex;
    align-items: stretch;
  }
  .mc-slab {
    flex: 1;
    position: relative;
    z-index: 1;
    transform: skewX(-10deg);
    background: var(--paper);
    color: var(--ink);
    border: 4px solid var(--ink);
    border-top: 16px solid var(--tier);
    box-shadow: 12px 12px 0 var(--ink);
    display: flex;
    flex-direction: column;
    padding: 26px 48px 20px;
    min-width: 0;
  }
  .mc-slab > * {
    transform: skewX(10deg);
  }
  .mc-name {
    font-family: var(--font-display);
    font-stretch: 62%;
    text-transform: uppercase;
    font-size: 7.5rem;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 8px;
  }
  .right .mc-name {
    order: -1;
    text-align: right;
  }
  .mc-score {
    font-family: var(--font-display);
    font-size: 17rem;
    line-height: 0.82;
    font-variant-numeric: tabular-nums;
    align-self: flex-end;
    padding-right: 12px;
  }
  .right .mc-score {
    align-self: flex-start;
  }
  .mc-art {
    position: relative;
    flex: none;
    width: 190px;
    transform: skewX(-10deg);
    border: 4px solid var(--ink);
    border-top: 16px solid var(--tier, var(--gold));
    box-shadow: 12px 12px 0 var(--ink);
    background: var(--field-deep);
    overflow: hidden;
  }
  .left .mc-art {
    margin-right: 18px;
  }
  .right .mc-art {
    margin-left: 18px;
  }
  .mc-art-pic {
    position: absolute;
    inset: 0 -50px;
    overflow: hidden;
    transform: skewX(10deg);
  }
  .mc-art-pic img {
    display: block;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 20%;
  }
  .mc-art-bg,
  .mc-art-bg::before,
  .mc-art-bg::after {
    position: absolute;
  }
  .mc-art-bg {
    inset: 0;
    overflow: hidden;
  }
  .mc-art-bg::before {
    content: "";
    width: 900px;
    aspect-ratio: 1;
    left: 50%;
    top: 35%;
    margin: -450px 0 0 -450px;
    background: repeating-conic-gradient(rgb(255 255 255 / 0.1) 0 6deg, transparent 6deg 18deg);
    mask: radial-gradient(circle, #000 0 15%, transparent 55%);
  }
  .mc-art-bg::after {
    content: "";
    inset: -10%;
    background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--gold) 75%, transparent), transparent 70%);
    opacity: 0.7;
  }
  .mc-vs {
    text-align: center;
    font-family: var(--font-display);
    font-size: 8rem;
    line-height: 1;
    color: var(--gold);
    -webkit-text-stroke: 4px var(--ink);
    paint-order: stroke fill;
  }
  .mc-mid {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .mc-ft {
    font-family: var(--font-display);
    text-transform: uppercase;
    font-size: 1.7rem;
    line-height: 1;
    white-space: nowrap;
    background: var(--ink);
    color: var(--paper);
    padding: 8px 14px 10px;
  }
  .mc-ft b {
    color: var(--gold);
    font-size: 2.3rem;
    margin-left: 4px;
  }

  .controls {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    padding: 10px 14px;
    background: rgb(0 0 0 / 0.78);
    color: #fff;
    font: 14px var(--font-text);
    border: 1px solid rgb(255 255 255 / 0.2);
    z-index: 10;
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
  .hint {
    opacity: 0.6;
    margin-left: auto;
  }
</style>
