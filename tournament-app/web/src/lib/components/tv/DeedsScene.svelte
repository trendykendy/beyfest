<script lang="ts">
  // Deeds of Renown (the awards): a stone tablet per deed, with its title in
  // gold, the holder in slate and what they did. On a 1920×972 canvas (the
  // screen under the top bar), scaled to the width it's given.
  let {
    deeds,
    settled,
  }: {
    deeds: { key: string; title: string; name: string; detail: string }[];
    settled: boolean; // false until The Reckoning is over: "so far"
  } = $props();

  let w = $state(1920);
  const scale = $derived(w / 1920);
</script>

<div class="deeds" bind:clientWidth={w}>
  <div class="canvas" style:transform="scale({scale})">
    <div class="rays"></div>
    {#if deeds.length}
      <div class="grid" class:one={deeds.length === 1}>
        {#each deeds as d (d.key)}
          <section class="deed">
            <span class="tf-carved" data-t={d.title}>{d.title}</span>
            <span class="who" class:long={d.name.length > 14}><span class="tf-carved stone" data-t={d.name}>{d.name}</span></span>
            <p>{d.detail}</p>
          </section>
        {/each}
      </div>
    {:else}
      <p class="none">No deeds yet. They are earned in battle.</p>
    {/if}
    {#if !settled && deeds.length}<p class="note">Deeds so far. They are settled after The Reckoning.</p>{/if}
  </div>
</div>

<style>
  .deeds {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(ellipse 80% 80% at 50% 50%, #23232b, #08080b 78%);
  }
  .canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 972px;
    transform-origin: 0 0;
    font-family: var(--tf-font-text);
    color: #f3e6c4;
  }
  .rays {
    position: absolute;
    inset: -20%;
    opacity: 0.1;
    mix-blend-mode: screen;
    background: repeating-conic-gradient(from 180deg at 50% -10%, rgba(255, 214, 140, 0.9) 0deg 3deg, rgba(255, 214, 140, 0) 6deg 14deg);
    mask: linear-gradient(180deg, #000 10%, transparent 80%);
  }
  .grid {
    position: absolute;
    left: 90px;
    right: 90px;
    top: 0;
    bottom: 110px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 50px 60px;
    align-content: center;
  }
  .grid.one {
    grid-template-columns: minmax(0, 900px);
    justify-content: center;
  }
  /* An odd one out sits in the middle of the last row. */
  .deed:last-child:nth-child(odd) {
    grid-column: 1 / -1;
    justify-self: center;
    width: calc(50% - 30px);
  }
  .grid.one .deed {
    width: auto;
  }
  .deed {
    padding: 30px 40px 34px;
    text-align: center;
    background: linear-gradient(180deg, #3d4049, #1b1d23);
    border-radius: 8px;
    box-shadow:
      0 0 0 4px #eab13a,
      0 0 0 8px #1c0c04,
      0 14px 0 #000,
      0 22px 40px rgba(0, 0, 0, 0.6);
  }
  .deed > .tf-carved {
    font-size: 46px;
    --stroke: 7px;
  }
  .who {
    display: block;
    margin-top: 14px;
  }
  .who .tf-carved {
    font-size: 68px;
    --stroke: 9px;
  }
  .who.long .tf-carved {
    font-size: 46px;
    --stroke: 7px;
  }
  .deed p {
    margin-top: 10px;
    font-size: 34px;
    color: #e9cf8e;
  }
  .note,
  .none {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 40px;
    text-align: center;
    font-size: 32px;
    font-style: italic;
    color: #b9ab8c;
  }
  .none {
    bottom: 50%;
  }
</style>
