<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import AdScene from "$lib/components/tv/AdScene.svelte";
  import { ADS } from "$lib/ads";

  // Lab page for the fake ads. Not linked from anywhere. ?t=<ms> opens frozen
  // there, ?clean hides the controls. Space plays and pauses, ←/→ step a
  // second, H hides the controls.
  const ad = ADS[0];
  let t = $state(Number(page.url.searchParams.get("t") ?? 0));
  let playing = $state(false);
  let showControls = $state(!page.url.searchParams.has("clean"));
  let audio: HTMLAudioElement;

  onMount(() => {
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
      if (t >= ad.duration - 100) t = 0;
      audio.currentTime = t / 1000;
      audio.play();
      playing = true;
    }
  }
  function seek(ms: number) {
    t = Math.min(ad.duration, Math.max(0, ms));
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
</script>

<svelte:window onkeydown={onkey} />
<svelte:head><title>Ads · lab</title></svelte:head>

<audio bind:this={audio} src={ad.audio} preload="auto" onended={() => (playing = false)}></audio>

<div class="page">
  <div class="stage">
    <AdScene {ad} {t} />
  </div>

  {#if showControls}
    <div class="controls">
      <button onclick={toggle}>{playing ? "Pause" : "Play"}</button>
      <input type="range" min="0" max={ad.duration} step="10" value={t} oninput={(e) => seek(Number(e.currentTarget.value))} />
      <span class="time">{(t / 1000).toFixed(1)} s</span>
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
    min-width: 60px;
  }
  button {
    font: inherit;
    padding: 4px 14px;
    background: var(--gold);
    color: #000;
    border: 1px solid #555;
    cursor: pointer;
  }
  .hint {
    opacity: 0.6;
  }
</style>
