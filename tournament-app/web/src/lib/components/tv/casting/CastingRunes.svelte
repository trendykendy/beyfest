<script lang="ts" module>
  export type RunesLook = "die" | "stones" | "wheel";
  export const RUNES_LOOKS: RunesLook[] = ["die", "stones", "wheel"];
  // The TV calls this on load: the 3D code, textures and fonts are fetched
  // then, not when the first match starts.
  export const preloadRunes = () =>
    import("./runes3d")
      .then((m) => m.warmUp())
      .catch(() => {}); // the draw itself falls back to 2D if this fails
</script>

<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { STADIA, stadiumOf } from "$lib/stadia";
  import { SCREENS } from "$lib/terms";
  import StadiumDraw from "../StadiumDraw.svelte";

  // Casting the Runes: the arena draw before every round, in 3D (the scenes
  // are in runes3d.ts, loaded on demand). Same inputs and `ondone` as the old
  // 2D draw (StadiumDraw), which it falls back to if WebGL or a texture fails,
  // so a match never stalls on the day.
  //   launch (Start match): the throw, the arena, then LET IT RIP
  //   next   (every later round, and a redraw): the throw and the arena
  // The parent keys one per draw, so the inputs are read once.
  let {
    stadium,
    kind,
    round,
    look,
    north = "",
    south = "",
    ondone,
  }: {
    stadium: string; // key of the arena drawn
    kind: "launch" | "next";
    round: number;
    look: RunesLook;
    north?: string; // who stands on the north side this round ("" if not drawn)
    south?: string;
    ondone: () => void;
  } = $props();

  const [s, launch, LOOK] = untrack(() => [stadiumOf(stadium) ?? STADIA[0], kind === "launch", look] as const);
  const pick = Math.max(0, STADIA.findIndex((x) => x.key === s.key));

  // Timing (ms). The throw gets MAX_THROW_MS at most (longer tumbles play
  // faster); the arena's name shows REVEAL_AFTER_MS after it lands and holds
  // HOLD_MS; the launch then has LET IT RIP for RIP_MS.
  const MAX_THROW_MS = launch ? 2800 : 2000;
  const REVEAL_AFTER_MS = 250;
  const HOLD_MS = launch ? 1600 : 1300;
  const RIP_MS = 1300;
  const OUT_MS = 300;
  const SAFETY_MS = 9000; // whatever happens, hand the screen back

  let host = $state<HTMLElement>();
  let revealed = $state(false);
  let rip = $state(false);
  let leaving = $state(false);
  let failed = $state(false);

  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      leaving = true;
      at(OUT_MS, ondone);
    };
    let dispose = () => {};
    let stopped = false;

    const onSettle = () =>
      at(REVEAL_AFTER_MS, () => {
        revealed = true;
        if (launch) {
          at(HOLD_MS, () => (rip = true));
          at(HOLD_MS + RIP_MS, finish);
        } else at(HOLD_MS, finish);
      });

    import("./runes3d")
      .then(({ cast }) =>
        cast(host!, {
          arenas: STADIA.map((x) => ({ num: x.num, gem: x.gem })),
          pick,
          look: LOOK,
          maxThrowMs: MAX_THROW_MS,
          onSettle,
        }),
      )
      .then((c) => {
        if (stopped) c.dispose();
        else dispose = c.dispose;
      })
      .catch((e) => {
        console.warn("Casting the Runes: 3D failed, using the 2D draw", e);
        if (!stopped) failed = true;
      });
    at(SAFETY_MS, () => {
      if (!failed) finish();
    });

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      dispose();
    };
  });
</script>

{#if failed}
  <StadiumDraw {stadium} {kind} {round} look="reel" {north} {south} {ondone} />
{:else}
  <div class="runes" class:leaving class:side={LOOK === "wheel"} style:--gem={s.gem} aria-live="polite" aria-label="Round {round}: {s.name}">
    <div class="scene" bind:this={host}></div>
    <div class="grain" aria-hidden="true"></div>
    <div class="edge t"></div>
    <div class="edge b"></div>

    <div class="head">
      {#if LOOK === "wheel"}
        <!-- Two lines beside the wheel: each its own carved word, so the
             layered lettering never wraps out of step. -->
        <span class="tf-carved ttl line" data-t="Casting">Casting</span>
        <span class="tf-carved ttl line" data-t="the Runes">the Runes</span>
      {:else}
        <span class="tf-carved ttl" data-t={SCREENS.arenaDraw}>{SCREENS.arenaDraw}</span>
      {/if}
      <span class="rd">Round {round}</span>
    </div>

    <div class="res" class:show={revealed && !rip}>
      {#if LOOK === "wheel"}
        <span class="tf-carved nm line" data-t="Arena {s.num}">Arena {s.num}</span>
        <span class="tf-carved nm line" data-t={s.name}>{s.name}</span>
      {:else}
        <span class="tf-carved nm" data-t="Arena {s.num} · {s.name}">Arena {s.num} · {s.name}</span>
      {/if}
      <span class="nk">{s.code}</span>
      {#if north && south}
        <div class="sides"><span class="n"><em>North</em>{north}</span><span class="s"><em>South</em>{south}</span></div>
      {/if}
    </div>

    {#if rip}
      <div class="rip"><span class="tf-carved" data-t="Let it rip!">Let it rip!</span></div>
    {/if}
  </div>
{/if}

<style>
  /* Over the Arena, under the top bar. Sized in container units so it scales
     with the TV (1cqw = 19.2px at 1920 wide). */
  .runes {
    position: absolute;
    inset: 0;
    z-index: 6;
    container-type: inline-size;
    overflow: hidden;
    background: #07080c;
    animation: fade-in 300ms ease-out both;
  }
  .runes.leaving {
    animation: fade-out 300ms ease-in both;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }
  .scene {
    position: absolute;
    inset: 0;
  }
  /* A faint paper grain over the scene: part of the locked hand-drawn look. */
  .grain {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.5;
    mix-blend-mode: overlay;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .38  0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E");
  }
  .edge {
    position: absolute;
    left: 0;
    right: 0;
    z-index: 2;
    height: 0.3cqw;
    background: #eab13a;
    box-shadow: 0 0 1.2cqw rgba(255, 173, 61, 0.6);
  }
  .edge.t {
    top: 0;
  }
  .edge.b {
    bottom: 0;
  }

  .head {
    position: absolute;
    top: 2cqw;
    left: 0;
    right: 0;
    z-index: 2;
    text-align: center;
    pointer-events: none;
  }
  /* The wheel stands in the middle, so its heading moves to the left. */
  .side .head {
    left: 4cqw;
    right: auto;
    top: 50%;
    transform: translateY(-50%);
    text-align: left;
    width: 26cqw;
  }
  .ttl {
    font-size: 3cqw;
    --stroke: 0.45cqw;
    --drop: 0.25cqw;
    letter-spacing: 0.04em;
  }
  /* One carved word per line beside the wheel. */
  .line {
    display: block;
    width: max-content;
  }
  .side .res .line {
    margin-left: auto;
  }
  .rd {
    display: block;
    margin-top: 0.4cqw;
    font-family: var(--tf-font-text);
    font-size: 1.7cqw;
    font-variant: small-caps;
    letter-spacing: 0.3em;
    color: #c9b27c;
  }

  /* The arena, once it lands. */
  .res {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 3.5cqw;
    z-index: 2;
    text-align: center;
    pointer-events: none;
    opacity: 0;
    transform: translateY(1.5cqw);
    transition:
      opacity 0.45s,
      transform 0.45s;
  }
  .res.show {
    opacity: 1;
    transform: none;
  }
  .res::before {
    content: "";
    position: absolute;
    inset: -3cqw -10cqw -2.5cqw;
    z-index: -1;
    background: radial-gradient(ellipse 50% 60% at 50% 55%, rgba(5, 4, 3, 0.82), rgba(5, 4, 3, 0.55) 55%, transparent 80%);
  }
  .side .res::before {
    display: none;
  }
  .side .res {
    left: auto;
    right: 4cqw;
    bottom: 50%;
    transform: translateY(50%);
    width: 30cqw;
    text-align: right;
  }
  .side .res.show {
    transform: translateY(50%);
  }
  .nm {
    font-size: 4cqw;
    --stroke: 0.55cqw;
    --drop: 0.3cqw;
    filter: drop-shadow(0 0 1.2cqw var(--gem));
  }
  .side .nm {
    font-size: 3cqw;
  }
  .nk {
    display: block;
    margin-top: 0.5cqw;
    font-family: var(--tf-font-text);
    font-size: 1.9cqw;
    font-variant: small-caps;
    letter-spacing: 0.25em;
    color: var(--gem);
    text-shadow: 0 0 1cqw var(--gem);
  }
  .sides {
    display: flex;
    justify-content: center;
    gap: 5cqw;
    margin-top: 1cqw;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 1.6cqw;
    text-transform: uppercase;
    color: #f6ecd2;
    text-shadow: 0 0.15cqw 0 #000;
  }
  .side .sides {
    flex-direction: column;
    gap: 0.4cqw;
    align-items: flex-end;
  }
  .sides em {
    font-style: normal;
    font-family: var(--tf-font-text);
    font-weight: 400;
    letter-spacing: 0.25em;
    font-variant: small-caps;
    text-transform: none;
    margin-right: 0.8cqw;
  }
  .sides .n em {
    color: #ff9c94;
  }
  .sides .s em {
    color: #9db8ff;
  }

  /* LET IT RIP, over the dimmed scene. */
  .rip {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: grid;
    place-items: center;
    background: rgba(5, 4, 3, 0.55);
    animation: fade-in 200ms ease-out both;
  }
  .rip .tf-carved {
    font-size: 9cqw;
    --stroke: 1cqw;
    --drop: 0.55cqw;
    animation: slam 380ms cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  @keyframes slam {
    from {
      opacity: 0;
      transform: scale(2.2);
    }
  }
</style>
