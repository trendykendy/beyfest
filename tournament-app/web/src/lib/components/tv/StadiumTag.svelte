<script lang="ts">
  import { STADIA, stadiumOf } from "$lib/stadia";
  import { onMount, untrack } from "svelte";

  // The arena tag in the Arena's status line: "Arena II · Double Xtreme ·
  // Round 1", in Marcellus and gold. At match point the big stadium draw would break the flow, so with
  // `spin` the tag draws it instead: numeral and name roll vertically a couple
  // of times and land on the stadium, in place on the main view.
  //
  // Mounted once per draw (the parent keys it), so `spin` is read once: the tag
  // stays on the stadium after ondone rather than swapping for a new one.
  let {
    stadium,
    round,
    spin = false,
    ondone,
  }: {
    stadium: string; // key of the stadium
    round: number; // the round it's for
    spin?: boolean;
    ondone?: () => void;
  } = $props();

  const SPIN_MS = 1900;
  const STEPS = 7; // stadia rolled past: two full turns of the three, and one
  const HOLD_MS = 500; // on the stadium, before it counts as done

  const s = $derived(stadiumOf(stadium) ?? STADIA[0]);
  const spinning = untrack(() => spin);
  const target = untrack(() => Math.max(0, STADIA.findIndex((x) => x.key === stadium)));
  // Ends on the stadium, plus one beyond it for the overshoot to show.
  const seq = spinning
    ? Array.from({ length: STEPS + 2 }, (_, k) => STADIA[(target - STEPS + k + STADIA.length * STEPS) % STADIA.length])
    : [];

  let rolling = $state(spinning); // false once it has landed
  let shown = $state(seq[0]?.key ?? ""); // the stadium in the window, for the colour
  let pos = $state(0); // how far the reels have rolled, in items
  let numWin = $state<HTMLElement>();
  let nameWin = $state<HTMLElement>();

  // Fast, then slowing, with a small overshoot past the stadium and back.
  function ease(t: number) {
    const c = 1.2;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
  }

  // The window is as wide as the longest name while rolling; once landed it
  // narrows to this stadium's own width, so the tag ends up its normal size.
  function fit(win: HTMLElement | undefined) {
    const item = win?.querySelectorAll<HTMLElement>("b")[STEPS];
    if (!win || !item) return;
    win.style.width = `${win.offsetWidth}px`;
    void win.offsetWidth; // start the transition from there
    win.style.width = `${item.offsetWidth}px`;
  }

  let frame = 0;
  let hold: ReturnType<typeof setTimeout> | undefined;
  onMount(() => {
    if (!spinning) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / SPIN_MS);
      pos = ease(t) * STEPS;
      shown = seq[Math.min(STEPS, Math.max(0, Math.round(pos)))].key;
      if (t < 1) return void (frame = requestAnimationFrame(step));
      pos = STEPS;
      rolling = false;
      fit(numWin);
      fit(nameWin);
      hold = setTimeout(() => ondone?.(), HOLD_MS);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hold);
    };
  });
</script>

<span class="stag" class:rolling class:landed={spinning && !rolling} class:spin={spinning} data-stadium={spinning ? shown : s.key}>
  <span class="lbl">Arena</span>
  {#if spinning}
    <span class="num">
      <span class="win" bind:this={numWin}>
        <span class="strip" style:transform="translateY({-pos * 1.1}em)">
          {#each seq as st}<b>{st.num}</b>{/each}
        </span>
      </span>
    </span>
    <span class="dot">·</span>
    <span class="name">
      <span class="win" bind:this={nameWin}>
        <span class="strip" style:transform="translateY({-pos * 1.1}em)">
          {#each seq as st}<b>{st.name}</b>{/each}
        </span>
      </span>
    </span>
  {:else}
    <span class="num"><b>{s.num}</b></span>
    <span class="dot">·</span>
    <span class="name"><b>{s.name}</b></span>
  {/if}
  <span class="dot">·</span>
  <span class="rd">Round <b>{round}</b></span>
</span>

<style>
  /* Inherits the status line's EB Garamond small caps; numerals in gold Marcellus. */
  .stag {
    display: inline-flex;
    align-items: center; /* not baseline: the reel windows hide overflow */
    gap: 0.35em;
    line-height: 1.1;
    color: #ffe6ad;
    animation: pop 320ms cubic-bezier(0.2, 0.9, 0.3, 1.4);
  }
  .stag b {
    display: block;
    font-weight: 400;
  }
  .num b,
  .rd b {
    font-family: var(--tf-font-display);
    color: #fff1c4;
  }
  .rd {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35em;
  }
  @keyframes pop {
    from {
      transform: scale(1.15);
      opacity: 0;
    }
  }

  /* The spin: the tag grows while it rolls, so the room sees it, and drops
     back with a bump as it lands. */
  .stag.spin {
    animation: none;
    scale: 1;
    transform-origin: 0 50%; /* grows away from the match title beside it */
    transition: scale 280ms cubic-bezier(0.2, 0.9, 0.3, 1.5);
  }
  .stag.rolling {
    scale: 1.2;
  }
  .win {
    display: block;
    height: 1.1em;
    overflow: hidden;
    transition: width 220ms ease-out;
  }
  .strip {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    vertical-align: top;
  }
  .num .strip {
    align-items: center;
    width: 100%;
  }
  .strip b {
    height: 1.1em;
    line-height: 1.1em;
    white-space: nowrap;
  }
</style>
