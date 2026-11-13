// Casting the Runes in 3D: the scenes behind CastingRunes.svelte. Ported from
// the locked style frame (beyfest-art: fighter-art/style-frames/casting-3d,
// 2026-11-09). Three looks, which the TV rotates:
//   die     a rugged, chipped six-sided die: four arena faces and two rune
//           faces; it always comes to rest near the middle
//   stones  four irregular runestones thrown loosely around the middle; the
//           face-up one is the stone that stopped nearest the centre
//   wheel   a stone rune wheel with a crystal gem per arena under a gold pointer
// The look: cel-shaded (three hard light bands) with ink outlines, motion at
// 24 frames a second, a faint paper grain (in the component) and line boil
// (the outlines wobble like redrawn line work).
//
// Every throw is worked out first (physics, start to rest) and only then is
// the drawn arena painted onto whatever lands face up, so the server's
// weighted draw always wins and nothing is left to chance on screen.
//
// Loaded on demand by the component (dynamic import), so three.js isn't in
// the TV's first download. Everything is bundled: the day runs offline.
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js";

export type Look = "die" | "stones" | "wheel";
export type Arena = { num: string; gem: string };
export type CastOptions = {
  arenas: Arena[]; // every arena in the draw order (STADIA)
  pick: number; // the drawn arena's index in `arenas`
  look: Look;
  maxThrowMs: number; // a throw that would tumble longer is played back faster
  onSettle: () => void; // the arena has landed: show its name
};
export type Cast = { dispose: () => void };

const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
const NUMERAL_FONT = '900 150px "Cinzel"';
const RUNE_FONT = '"Noto Sans Runic", serif';
const FPS = 24; // the locked motion: between smooth and on twos
const SIM_HZ = 60; // recorded frames per second of the throw
const rnd = (a: number) => (Math.random() - 0.5) * a;

// ── Textures (fighter-art/textures/README.md), shrunk for the TV ──────────
const TEX = "/textures/";
let images: Promise<Record<string, HTMLImageElement>> | null = null;
function loadImages() {
  images ??= Promise.all(
    ["slate-floor", "rock-boulder", "runestone", "wheel-stone", "crystal-white"].map(
      (n) =>
        new Promise<[string, HTMLImageElement]>((ok, fail) => {
          const i = new Image();
          i.onload = () => ok([n, i]);
          i.onerror = () => fail(new Error(`missing texture ${n}`));
          i.src = `${TEX}${n}.jpg`;
        }),
    ),
  ).then((list) => Object.fromEntries(list));
  return images;
}

// Smooth value noise, for chipping and roughening shapes.
function hash(x: number, y: number, z: number) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(x - xi),
    v = s(y - yi),
    w = s(z - zi);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return (
    L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1
  );
}

// A square canvas holding a randomly placed crop of an image (so no two
// stones or faces look the same); tint = a colour multiplied over it.
function cropCanvas(img: HTMLImageElement, size: number, crop = 1, tint: string | null = null, amount = 0) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const sw = img.width * crop,
    sx = Math.random() * (img.width - sw),
    sy = Math.random() * (img.height - sw);
  g.drawImage(img, sx, sy, sw, sw, 0, 0, size, size);
  if (tint) {
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = amount;
    g.fillStyle = tint;
    g.fillRect(0, 0, size, size);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
  }
  return c;
}

// The white crystal coloured for one arena: dark facets to a deep shade,
// mids to the colour, only the brightest edges towards white.
function crystalCanvas(img: HTMLImageElement, hex: string) {
  const S = 256,
    c = cropCanvas(img, S, 0.6),
    g = c.getContext("2d")!,
    d = g.getImageData(0, 0, S, S),
    p = d.data;
  const col = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  for (let i = 0; i < p.length; i += 4) {
    const t = Math.pow((p[i] + p[i + 1] + p[i + 2]) / 765, 2.2);
    const white = Math.pow(Math.min(1, Math.max(0, (t - 0.82) / 0.18)), 1.5);
    for (let k = 0; k < 3; k++) {
      const deep = col[k] * 0.18,
        body = deep + (col[k] - deep) * Math.min(1, t / 0.75);
      p[i + k] = 255 * (body * (1 - white) + white * (0.55 + 0.45 * col[k]));
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}

// Three hard bands of light: the cel look.
function makeRamp() {
  const t = new THREE.DataTexture(new Uint8Array([55, 55, 55, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// Worn gold: knock chips out of a drawn symbol.
function wear(g: CanvasRenderingContext2D, S: number) {
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 140; i++) {
    g.beginPath();
    g.arc(Math.random() * S, Math.random() * S, Math.random() * S * 0.012, 0, 7);
    g.fill();
  }
  g.globalCompositeOperation = "source-over";
}

// A face's symbol: the arena's gem and numeral, or a rune. glow = the
// emissive layer (lit when it lands).
function symbol(ctx: CanvasRenderingContext2D, S: number, arena: Arena | null, glow: boolean) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (arena) {
    ctx.save();
    ctx.translate(S / 2, S * 0.3);
    ctx.rotate(Math.PI / 4);
    if (glow) ctx.fillStyle = arena.gem;
    else {
      const gm = ctx.createLinearGradient(-45, -45, 45, 45);
      gm.addColorStop(0, "#fff");
      gm.addColorStop(0.45, arena.gem);
      gm.addColorStop(1, "#000");
      ctx.fillStyle = gm;
    }
    ctx.fillRect(-40, -40, 80, 80);
    ctx.restore();
    ctx.font = NUMERAL_FONT;
    if (glow) ctx.fillStyle = arena.gem;
    else {
      const gd = ctx.createLinearGradient(0, S * 0.5, 0, S * 0.85);
      gd.addColorStop(0, "#fff0b5");
      gd.addColorStop(0.5, "#e3ac42");
      gd.addColorStop(1, "#8d5c1d");
      ctx.fillStyle = gd;
    }
    ctx.fillText(arena.num, S / 2, S * 0.68);
  } else {
    ctx.font = `240px ${RUNE_FONT}`;
    ctx.fillStyle = glow ? "#000" : "rgba(205,160,70,.5)";
    ctx.fillText(RUNES[Math.floor(Math.random() * RUNES.length)], S / 2, S / 2 + 12);
  }
}

// ── Physics: worked out in full before it's shown ────────────────────────
type Frame = [CANNON.Vec3, CANNON.Quaternion][];
function makeWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -30, 0) });
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.28;
  const plane = (pos: [number, number, number], euler: [number, number, number]) => {
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    b.position.set(...pos);
    b.quaternion.setFromEuler(...euler);
    world.addBody(b);
  };
  plane([0, 0, 0], [-Math.PI / 2, 0, 0]);
  plane([-12, 0, 0], [0, Math.PI / 2, 0]);
  plane([12, 0, 0], [0, -Math.PI / 2, 0]);
  plane([0, 0, -12], [0, 0, 0]);
  plane([0, 0, 12], [0, Math.PI, 0]);
  return world;
}
function record(world: CANNON.World, bodies: CANNON.Body[]): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < SIM_HZ * 7; i++) {
    world.step(1 / 120);
    world.step(1 / 120);
    frames.push(bodies.map((b) => [b.position.clone(), b.quaternion.clone()]));
    if (i > 40 && bodies.every((b) => b.sleepState === CANNON.Body.SLEEPING)) break;
  }
  return frames;
}
// Slide the whole throw sideways so it comes to rest where we want (the
// floor is flat, so nothing else changes).
function recentre(frames: Frame[], tx: number, tz: number) {
  const last = frames[frames.length - 1],
    n = last.length;
  const cx = last.reduce((s, [p]) => s + p.x, 0) / n,
    cz = last.reduce((s, [p]) => s + p.z, 0) / n;
  frames.forEach((f) =>
    f.forEach(([p]) => {
      p.x += tx - cx;
      p.z += tz - cz;
    }),
  );
}

type Play =
  | { kind: "throw"; frames: Frame[]; meshes: THREE.Object3D[]; glow: THREE.MeshToonMaterial[]; focus: number }
  | { kind: "spin"; wheel: THREE.Group; ptr: THREE.Mesh; from: number; to: number; ms: number; glow: THREE.MeshToonMaterial[] };

// Fetch the textures and fonts ahead of the first draw (the TV calls this on
// load), so the first throw of the day doesn't wait on them.
export function warmUp() {
  return Promise.all([loadImages(), document.fonts.load(NUMERAL_FONT), document.fonts.load(`100px ${RUNE_FONT}`, RUNES)]);
}

export async function cast(host: HTMLElement, o: CastOptions): Promise<Cast> {
  const [img] = await Promise.all([
    loadImages(),
    document.fonts.load(NUMERAL_FONT),
    document.fonts.load(`100px ${RUNE_FONT}`, RUNES),
  ]);

  // Throws if WebGL isn't available: the component falls back to the 2D draw.
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  host.prepend(renderer.domElement);

  const owned: { dispose: () => void }[] = []; // every texture, geometry and material made, for dispose
  const keep = <T extends { dispose: () => void }>(x: T) => (owned.push(x), x);
  const RAMP = keep(makeRamp());
  const toon = (p: THREE.MeshToonMaterialParameters) => keep(new THREE.MeshToonMaterial({ gradientMap: RAMP, ...p }));
  const noInk = <M extends THREE.Material>(m: M) => ((m.userData.outlineParameters = { visible: false }), m);
  const tex = (canvas: HTMLCanvasElement) => {
    const t = keep(new THREE.CanvasTexture(canvas));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const geo = <G extends THREE.BufferGeometry>(g: G) => keep(g);

  // ── The stage: lights, a slate table (die and stones) ──
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07080c");
  scene.fog = new THREE.Fog("#07080c", 14, 28);
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  scene.add(new THREE.HemisphereLight("#ffe2b0", "#1a1420", 0.9));
  const torch = new THREE.PointLight("#ff9a40", 70, 30, 1.6);
  torch.position.set(-6, 5, 4);
  torch.castShadow = true;
  torch.shadow.mapSize.set(1024, 1024);
  scene.add(torch);
  const key = new THREE.SpotLight("#ffd79a", 240, 40, 0.7, 0.5, 1.5);
  key.position.set(4, 10, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const fill = new THREE.PointLight("#5a78c8", 12, 30, 1.6);
  fill.position.set(6, 3, -4);
  scene.add(fill);
  const accent = new THREE.PointLight("#ffffff", 0, 8, 1.5);
  scene.add(accent);

  // A rune circle: on the table, and behind the wheel.
  const rc = document.createElement("canvas");
  rc.width = rc.height = 1024;
  const rg = rc.getContext("2d")!;
  rg.strokeStyle = "rgba(229,180,82,.55)";
  rg.lineWidth = 6;
  rg.beginPath();
  rg.arc(512, 512, 490, 0, 7);
  rg.stroke();
  rg.lineWidth = 3;
  rg.beginPath();
  rg.arc(512, 512, 410, 0, 7);
  rg.stroke();
  rg.fillStyle = "rgba(229,180,82,.5)";
  rg.font = `60px ${RUNE_FONT}`;
  rg.textAlign = "center";
  rg.textBaseline = "middle";
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    rg.save();
    rg.translate(512 + Math.cos(a) * 450, 512 + Math.sin(a) * 450);
    rg.rotate(a + Math.PI / 2);
    rg.fillText(RUNES[i], 0, 0);
    rg.restore();
  }
  const circle = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(7, 7)),
    noInk(keep(new THREE.MeshBasicMaterial({ map: tex(rc), transparent: true, depthWrite: false }))),
  );
  if (o.look !== "wheel") {
    camera.position.set(0, 11, 9);
    camera.lookAt(0, 0, 0.3);
    const ft = tex(cropCanvas(img["slate-floor"], 1024));
    ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    ft.repeat.set(5, 3);
    const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(40, 24)), noInk(toon({ map: ft })));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.01;
    scene.add(circle);
  }
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const ink = new OutlineEffect(renderer, { defaultThickness: 0.013, defaultColor: [0.07, 0.04, 0.02], defaultAlpha: 1 });

  // ── The die ──
  function ruggedDie(size: number) {
    const g = geo(new THREE.BoxGeometry(size, size, size, 14, 14, 14));
    const p = g.attributes.position,
      v = new THREE.Vector3(),
      h = size / 2,
      r = size * 0.13,
      seed = Math.random() * 100;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const inner = new THREE.Vector3(
        Math.max(-h + r, Math.min(h - r, v.x)),
        Math.max(-h + r, Math.min(h - r, v.y)),
        Math.max(-h + r, Math.min(h - r, v.z)),
      );
      const d = v.clone().sub(inner);
      if (d.lengthSq() > 0) d.setLength(r);
      v.copy(inner).add(d);
      const dir = v.clone().normalize();
      const edge = Math.max(0, (Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.z)) / size - 1.05); // chip the edges and corners most
      const n =
        noise3(v.x * 2.6 + seed, v.y * 2.6, v.z * 2.6) * 0.045 +
        noise3(v.x * 7 + seed, v.y * 7, v.z * 7) * 0.018 -
        edge * Math.max(0, noise3(v.x * 4 - seed, v.y * 4, v.z * 4)) * 0.35;
      v.addScaledVector(dir, n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }
  function dieFace(arena: Arena | null) {
    const S = 512,
      c = cropCanvas(img["rock-boulder"], S, 0.5, "#5e554b", 0.85), // the real rock photo, darkened warm
      g = c.getContext("2d")!;
    const e = document.createElement("canvas");
    e.width = e.height = S;
    const eg = e.getContext("2d")!;
    eg.fillStyle = "#000";
    eg.fillRect(0, 0, S, S);
    g.strokeStyle = "#c9963c"; // a worn gold inlay border
    g.lineWidth = 9;
    g.strokeRect(46, 46, S - 92, S - 92);
    g.shadowColor = "rgba(0,0,0,.9)";
    g.shadowBlur = 10;
    const sym = document.createElement("canvas");
    sym.width = sym.height = S;
    const sg = sym.getContext("2d")!;
    symbol(sg, S, arena, false);
    wear(sg, S);
    g.drawImage(sym, 0, 0);
    if (arena) symbol(eg, S, arena, true);
    return toon({ map: tex(c), emissiveMap: tex(e), emissive: new THREE.Color("#fff"), emissiveIntensity: 0 });
  }
  const FACE_NORMALS: [number, number, number][] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  function dieThrow(): Play {
    let frames: Frame[] = [],
      top = 2;
    for (let tries = 0; tries < 12; tries++) {
      const world = makeWorld();
      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.8, 0.8, 0.8)),
        allowSleep: true,
        sleepSpeedLimit: 0.25,
        sleepTimeLimit: 0.3,
        angularDamping: 0.12,
        linearDamping: 0.06,
      });
      body.position.set(-4, 2.6, rnd(1));
      body.quaternion.setFromEuler(rnd(6), rnd(6), rnd(6));
      body.velocity.set(7 + Math.random() * 3, 4, rnd(2));
      body.angularVelocity.set(rnd(30), rnd(30), rnd(30));
      world.addBody(body);
      frames = record(world, [body]);
      const q = frames[frames.length - 1][0][1];
      const ups = FACE_NORMALS.map((n) => q.vmult(new CANNON.Vec3(...n)).y);
      top = ups.indexOf(Math.max(...ups));
      if (ups[top] > 0.95) break;
    }
    recentre(frames, rnd(0.8), 0.3 + rnd(0.4)); // always comes to rest near the middle
    // The drawn arena on the face that lands up, two runes opposite each
    // other, the other arenas on the rest.
    const others = o.arenas.map((_, i) => i).filter((i) => i !== o.pick).sort(() => Math.random() - 0.5);
    const layout: (Arena | null)[] = [];
    let k = 0;
    for (let f = 0; f < 6; f++) layout[f] = f === top ? o.arenas[o.pick] : f === (top ^ 1) ? null : k < others.length && k < 3 ? o.arenas[others[k++]] : null;
    const mats = layout.map(dieFace);
    const mesh = new THREE.Mesh(ruggedDie(1.6), mats);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    return { kind: "throw", frames, meshes: [mesh], glow: [mats[top]], focus: 0 };
  }

  // ── The runestones ──
  function runestoneGeometry() {
    const pts: THREE.Vector2[] = [],
      N = 9,
      rx = 0.95 + rnd(0.2),
      rz = 0.78 + rnd(0.2);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + rnd(0.35),
        r = 0.82 + Math.random() * 0.3;
      pts.push(new THREE.Vector2(Math.cos(a) * r * rx, Math.sin(a) * r * rz));
    }
    const curve = new THREE.SplineCurve([...pts, pts[0], pts[1]]);
    const shape = new THREE.Shape(curve.getPoints(48));
    const g = geo(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.12, bevelSegments: 4, curveSegments: 48 }));
    g.translate(0, 0, -0.1);
    g.rotateX(-Math.PI / 2); // flat, its thickness along y (top face at y = .2)
    const p = g.attributes.position,
      v = new THREE.Vector3(),
      seed = Math.random() * 100;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const side = Math.abs(v.y) < 0.19 ? 1 : 0.25; // rougher edges than faces
      const n = noise3(v.x * 3 + seed, v.y * 3, v.z * 3) * 0.06 * side;
      v.x += v.x * n;
      v.z += v.z * n;
      v.y += noise3(v.x * 5, v.y * 5 + seed, v.z * 5) * 0.012;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }
  // The carving on a face: a transparent decal laid on the stone.
  function carving(arena: Arena | null) {
    const S = 512,
      c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d")!;
    const e = document.createElement("canvas");
    e.width = e.height = S;
    const eg = e.getContext("2d")!;
    eg.fillStyle = "#000";
    eg.fillRect(0, 0, S, S);
    g.shadowColor = "rgba(0,0,0,.9)";
    g.shadowBlur = 8;
    symbol(g, S, arena, false);
    wear(g, S);
    if (arena) symbol(eg, S, arena, true);
    return noInk(
      toon({
        map: tex(c),
        emissiveMap: tex(e),
        emissive: new THREE.Color("#fff"),
        emissiveIntensity: 0,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
  }
  function stonesThrow(): Play {
    let best: { frames: Frame[]; ups: number[]; spread: number } | null = null;
    let frames: Frame[] = [],
      ups: number[] = [];
    for (let tries = 0; tries < 24; tries++) {
      const world = makeWorld(),
        bodies: CANNON.Body[] = [];
      for (let i = 0; i < 4; i++) {
        // stone: heavy drag, so it tumbles and stops rather than rolling away
        const b = new CANNON.Body({
          mass: 1,
          shape: new CANNON.Cylinder(0.92, 0.92, 0.42, 16),
          allowSleep: true,
          sleepSpeedLimit: 0.25,
          sleepTimeLimit: 0.3,
          angularDamping: 0.45,
          linearDamping: 0.25,
        });
        b.position.set(-1.6 + i * 1.05 + rnd(0.3), 5 + i * 0.55, rnd(0.8));
        b.quaternion.setFromEuler(rnd(6), rnd(6), rnd(6));
        b.velocity.set(rnd(4), -1, rnd(2.4));
        b.angularVelocity.set(rnd(22), rnd(22), rnd(22));
        world.addBody(b);
        bodies.push(b);
      }
      frames = record(world, bodies);
      const last = frames[frames.length - 1];
      ups = last.map(([, q]) => q.vmult(new CANNON.Vec3(0, 1, 0)).y);
      const xs = last.map(([p]) => p.x),
        zs = last.map(([p]) => p.z);
      // keep the tightest flat throw so far; stop once one is loosely together
      if (ups.every((u) => Math.abs(u) > 0.9)) {
        const spread = Math.max(Math.max(...xs) - Math.min(...xs), 1.6 * (Math.max(...zs) - Math.min(...zs)));
        if (!best || spread < best.spread) best = { frames, ups, spread };
        if (spread < 5) break;
      }
    }
    if (best) ({ frames, ups } = best);
    recentre(frames, 0, 0.2);
    // the face-up stone is whichever came to rest nearest the middle
    const lastF = frames[frames.length - 1],
      dist = lastF.map(([p]) => Math.hypot(p.x, p.z - 0.2)),
      chosen = dist.indexOf(Math.min(...dist));
    const stoneMat = () => {
      // darkened, because the key light blows the sandy stone out
      const t = tex(cropCanvas(img.runestone, 512, 0.45, "#7d6c58", 0.7));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(0.5, 0.5);
      return toon({ map: t });
    };
    const decalGeo = geo(new THREE.PlaneGeometry(1.15, 1.15));
    const meshes: THREE.Object3D[] = [],
      glow: THREE.MeshToonMaterial[] = [];
    for (let i = 0; i < 4; i++) {
      const stone = new THREE.Mesh(runestoneGeometry(), stoneMat());
      stone.castShadow = stone.receiveShadow = true;
      const up = ups[i] > 0 ? 1 : -1; // which flat face ends up on top
      const deco = carving(i === chosen ? o.arenas[o.pick] : null);
      const decal = new THREE.Mesh(decalGeo, deco);
      decal.rotation.x = up > 0 ? -Math.PI / 2 : Math.PI / 2;
      decal.position.y = up * 0.212;
      stone.add(decal);
      const under = new THREE.Mesh(decalGeo, carving(null));
      under.rotation.x = up > 0 ? Math.PI / 2 : -Math.PI / 2;
      under.position.y = -up * 0.212;
      stone.add(under);
      scene.add(stone);
      meshes.push(stone);
      if (i === chosen) glow.push(deco);
    }
    return { kind: "throw", frames, meshes, glow, focus: chosen };
  }

  // ── The wheel ──
  function wheelSpin(): Play {
    camera.position.set(0, -1.4, 18.5);
    camera.lookAt(0, 0.5, 0);
    const group = new THREE.Group();
    group.rotation.x = -0.18;
    scene.add(group);
    circle.scale.set(1.45, 1.45, 1); // the rune circle behind it, turning slowly
    circle.position.z = -0.6;
    group.add(circle);
    const wheel = new THREE.Group();
    group.add(wheel);
    const stone = toon({ map: tex(cropCanvas(img["wheel-stone"], 1024)) });
    const gold = toon({ color: "#d9a441" });
    const disc = new THREE.Mesh(geo(new THREE.CylinderGeometry(3, 3, 0.45, 96)), stone);
    disc.rotation.x = Math.PI / 2;
    disc.castShadow = disc.receiveShadow = true;
    wheel.add(disc);
    const rim = new THREE.Mesh(geo(new THREE.TorusGeometry(3, 0.14, 16, 120)), gold);
    rim.position.z = 0.2;
    wheel.add(rim);
    const hub = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.42, 0.5, 0.3, 32)), gold);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.3;
    wheel.add(hub);
    const n = o.arenas.length,
      seg = (Math.PI * 2) / n;
    const gems: THREE.MeshToonMaterial[] = [];
    o.arenas.forEach((a, k) => {
      // a gold spoke between segments
      const ang = Math.PI / 2 - k * seg + seg / 2;
      const sp = new THREE.Mesh(geo(new THREE.BoxGeometry(0.09, 2.55, 0.08)), gold);
      sp.position.set(Math.cos(ang) * 1.6, Math.sin(ang) * 1.6, 0.25);
      sp.rotation.z = ang - Math.PI / 2;
      wheel.add(sp);
      // the arena's gem: a long octahedron, like a cut crystal
      const ga = Math.PI / 2 - k * seg;
      const gm = toon({ map: tex(crystalCanvas(img["crystal-white"], a.gem)), emissive: new THREE.Color(a.gem), emissiveIntensity: 0.25 });
      const gem = new THREE.Mesh(geo(new THREE.OctahedronGeometry(0.42)), gm);
      gem.scale.set(1, 1.45, 0.8);
      gem.position.set(Math.cos(ga) * 2.1, Math.sin(ga) * 2.1, 0.5);
      gem.rotation.z = ga - Math.PI / 2;
      wheel.add(gem);
      const setting = new THREE.Mesh(geo(new THREE.TorusGeometry(0.55, 0.06, 10, 40)), gold);
      setting.position.copy(gem.position);
      setting.position.z = 0.26;
      wheel.add(setting);
      // its numeral, carved nearer the hub
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const g = c.getContext("2d")!;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = '900 120px "Cinzel"';
      const gd = g.createLinearGradient(0, 60, 0, 200);
      gd.addColorStop(0, "#fff0b5");
      gd.addColorStop(0.5, "#e3ac42");
      gd.addColorStop(1, "#8d5c1d");
      g.fillStyle = gd;
      g.shadowColor = "rgba(0,0,0,.9)";
      g.shadowBlur = 8;
      g.fillText(a.num, 128, 135);
      const lbl = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.9, 0.9)), noInk(toon({ map: tex(c), transparent: true })));
      lbl.position.set(Math.cos(ga) * 1.15, Math.sin(ga) * 1.15, 0.235);
      lbl.rotation.z = ga - Math.PI / 2;
      wheel.add(lbl);
      gems.push(gm);
    });
    // the pointer, a gold diamond at the top
    const ptr = new THREE.Mesh(geo(new THREE.OctahedronGeometry(0.32)), gold);
    ptr.scale.set(1, 1.5, 0.6);
    ptr.position.set(0, 3.45, 0.4);
    group.add(ptr);
    key.position.set(3, 6, 10);
    torch.position.set(-6, 3, 6);
    const from = Math.random() * Math.PI * 2;
    const to = from + Math.PI * 2 * 4 + ((((o.pick * seg - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) + rnd(seg * 0.4);
    wheel.rotation.z = from;
    return { kind: "spin", wheel, ptr, from, to, ms: Math.min(o.maxThrowMs, 3000), glow: [gems[o.pick]] };
  }

  const play = o.look === "die" ? dieThrow() : o.look === "stones" ? stonesThrow() : wheelSpin();
  // A long tumble is played back faster rather than overrunning its slot.
  const throwMs = play.kind === "throw" ? (play.frames.length * 1000) / SIM_HZ : play.ms;
  const speed = play.kind === "throw" ? Math.max(1, throwMs / o.maxThrowMs) : 1;

  // Line boil: each outlined object's ink thickness wobbles a few times a second.
  let boilStep = -1;
  function boil(real: number) {
    const step = Math.floor(real / 110);
    if (step === boilStep) return;
    boilStep = step;
    scene.traverse((ob) => {
      const mesh = ob as THREE.Mesh;
      if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
        if (m.userData.outlineParameters?.visible === false) return;
        m.userData.outlineParameters = { thickness: 0.011 + Math.random() * 0.006 };
      });
    });
  }

  let raf = 0,
    settledAt = 0,
    lastDrawn = -1;
  const start = performance.now();
  function frame(real: number) {
    raf = requestAnimationFrame(frame);
    const now = Math.floor(real / (1000 / FPS)) * (1000 / FPS); // 24 fps
    if (now === lastDrawn) return;
    lastDrawn = now;
    boil(real);
    const t = (now - start) * speed;
    let done = false;
    if (play.kind === "throw") {
      const i = Math.max(0, Math.min(play.frames.length - 1, Math.floor(t / (1000 / SIM_HZ))));
      play.frames[i].forEach(([p, q], k) => {
        play.meshes[k].position.set(p.x, p.y, p.z);
        play.meshes[k].quaternion.set(q.x, q.y, q.z, q.w);
      });
      if (i === play.frames.length - 1) {
        done = true;
        const fp = play.meshes[play.focus].position;
        accent.position.set(fp.x, 1.6, fp.z);
      }
    } else {
      const k = Math.min(1, Math.max(0, t / play.ms)),
        e = 1 - Math.pow(1 - k, 4);
      play.wheel.rotation.z = play.from + (play.to - play.from) * e;
      play.ptr.rotation.z = Math.sin(now / 40) * 0.12 * (1 - e); // the pointer chatters while it spins
      if (k >= 1) {
        done = true;
        accent.position.set(0, 2.6, 2.5);
      }
    }
    if (done) {
      if (!settledAt) {
        settledAt = real;
        o.onSettle();
      }
      const since = real - settledAt;
      const pulse = Math.min(1, since / 400) * (1.1 + 0.35 * Math.sin(since / 260));
      play.glow.forEach((m) => (m.emissiveIntensity = (play.kind === "spin" ? 1.6 : 1) * pulse));
      accent.color.set(o.arenas[o.pick].gem);
      accent.intensity = Math.min(1, since / 400) * 14;
    }
    circle.rotation.z += 0.003;
    ink.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      owned.forEach((x) => x.dispose());
      renderer.dispose();
      renderer.forceContextLoss(); // a draw every round: never hold on to old WebGL contexts
      renderer.domElement.remove();
    },
  };
}
