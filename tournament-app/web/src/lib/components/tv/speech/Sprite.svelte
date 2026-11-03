<script lang="ts">
  import { U } from "./pixel";

  // A tiny bit of pixel art drawn from text rows: one character per fat
  // pixel, "." for see-through, any other letter looked up in `palette`.
  // `flip` mirrors it (the right-hand fighter's tail).
  let {
    rows,
    palette,
    u = U,
    flip = false,
    class: cls = "",
  }: { rows: string[]; palette: Record<string, string>; u?: number; flip?: boolean; class?: string } = $props();

  // Runs of one colour along a row become one rect, to keep the SVG small.
  const runs = $derived.by(() => {
    const out: { x: number; y: number; w: number; fill: string }[] = [];
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        let w = 1;
        while (row[x + w] === c) w++;
        if (c !== "." && palette[c]) out.push({ x, y, w, fill: palette[c] });
        x += w;
      }
    });
    return out;
  });
  const cols = $derived(Math.max(...rows.map((r) => r.length)));
</script>

<svg
  class={cls}
  width={cols * u}
  height={rows.length * u}
  viewBox="0 0 {cols} {rows.length}"
  shape-rendering="crispEdges"
  style:transform={flip ? "scaleX(-1)" : undefined}
  aria-hidden="true"
>
  {#each runs as r, i (i)}
    <rect x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />
  {/each}
</svg>

<style>
  svg {
    display: block;
    overflow: visible;
  }
</style>
