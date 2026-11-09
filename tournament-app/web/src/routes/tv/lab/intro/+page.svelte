<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import IntroScene from "$lib/components/tv/IntroScene.svelte";
  import { AUDIO, DURATION, introImages, shotAt } from "$lib/intro";

  // Lab page for the Beyfest 2026 intro. Not linked from anywhere.
  // The scene is drawn from the narration's clock, so the scrub bar shows any
  // moment exactly. ?t=<ms> opens frozen there,
  // ?clean hides the controls. Space plays and pauses, ←/→ step a second,
  // H hides the controls.
  let t = $state(Number(page.url.searchParams.get("t") ?? 0));
  let playing = $state(false);
  let showControls = $state(!page.url.searchParams.has("clean"));
  let loaded = $state(0);
  const images = introImages();
  let audio: HTMLAudioElement;

  // Load every picture before it plays, so nothing pops in mid-shot.
  onMount(() => {
    for (const src of images) {
      const img = new Image();
      img.src = src;
      img.decode().finally(() => loaded++);
    }
    let raf = 0;
    const frame = () => {
      if (playing) t = audio.currentTime * 1000;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  function toggle() {
    if (playing) {
      audio.pause();
      playing = false;
    } else {
      if (t >= DURATION - 100) t = 0;
      audio.currentTime = t / 1000;
      audio.play();
      playing = true;
    }
  }
  function seek(ms: number) {
    t = Math.min(DURATION, Math.max(0, ms));
    audio.currentTime = t / 1000;
  }
  function onkey(e: KeyboardEvent) {
    if (e.key === " ") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") seek(t + 1000);
    else if (e.key === "ArrowLeft") seek(t - 1000);
    else if (e.key === "h" || e.key === "H") showControls = !showControls;
  }
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(Math.floor(ms / 100) % 10)}`;
</script>

<svelte:window onkeydown={onkey} />
<svelte:head><title>Beyfest intro · lab</title></svelte:head>

<audio bind:this={audio} src={AUDIO} preload="auto" onended={() => (playing = false)}></audio>

<div class="page">
  <div class="stage">
    <IntroScene {t} />
  </div>

  {#if showControls}
    <div class="controls">
      <button onclick={toggle} disabled={loaded < images.length}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min="0" max={DURATION} step="10" value={t} oninput={(e) => seek(Number(e.currentTarget.value))} />
      <span class="time">{fmt(t)} · {shotAt(t).shot}</span>
      {#if loaded < images.length}<span class="hint">Loading {loaded}/{images.length}…</span>{/if}
      <span class="hint">Space plays · ←/→ a second · H hides this</span>
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
  .stage {
    position: relative;
    width: min(100vw, calc(100vh * 16 / 9));
    aspect-ratio: 16 / 9;
    overflow: hidden;
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
  }
  input[type="range"] {
    flex: 1;
    min-width: 200px;
  }
  .time {
    font-variant-numeric: tabular-nums;
    min-width: 140px;
  }
  button {
    font: inherit;
    padding: 4px 14px;
    background: var(--gold);
    color: #000;
    border: 1px solid #555;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
  }
  .hint {
    opacity: 0.6;
  }
</style>
