/* Headless engine boot test — stubs DOM + WebGL with absorbing proxies so the
   real GameEngine logic (spawning, AI, combat, quiz, snapshots) runs in Node. */

// ─── universal absorbing value ───
const GLSTR = "WebGL 2.0 (headless)";
const param: unknown = {
  toString: () => GLSTR, valueOf: () => 1, length: 0,
  indexOf: (s: string) => GLSTR.indexOf(s),
  includes: (s: string) => GLSTR.includes(s),
  toLowerCase: () => GLSTR.toLowerCase(),
  toUpperCase: () => GLSTR.toUpperCase(),
  split: (s: string) => GLSTR.split(s),
  startsWith: (s: string) => GLSTR.startsWith(s),
  charAt: (i: number) => GLSTR.charAt(i),
  trim: () => GLSTR.trim(),
};
const makeAny: () => unknown = () => new Proxy(function () { /* absorb */ }, {
  get(_t, prop) {
    if (prop === Symbol.toPrimitive) return () => 1;
    if (prop === "length") return 0;
    if (prop === "precision") return 23;
    if (prop === "rangeMin") return 127;
    if (prop === "rangeMax") return 127;
    if (prop === "name") return "headless";
    if (prop === "type") return 0x1406;
    if (prop === "size") return 1;
    return makeAny();
  },
  apply() { return makeAny(); },
});

const glProxy = new Proxy(function () { /* absorb */ }, {
  get(_t, prop) {
    if (prop === "getParameter") return () => param;
    if (prop === "getShaderPrecisionFormat") return () => ({ precision: 23, rangeMin: 127, rangeMax: 127 });
    if (prop === "getContextAttributes") return () => ({ alpha: false, antialias: false });
    if (prop === "getError") return () => 0;
    if (prop === "getExtension") return () => ({});
    if (prop === "isContextLost") return () => false;
    if (prop === "canvas") return canvasRef;
    return makeAny();
  },
  apply() { return makeAny(); },
});

const ctx2d: Record<string, unknown> = {
  canvas: null as unknown,
};
const ctx2dProxy = new Proxy(ctx2d, {
  get(t, prop) {
    if (prop in t) return t[prop];
    return (..._args: unknown[]) => makeAny();
  },
  set(t, prop, v) { (t as Record<string, unknown>)[prop as string] = v; return true; },
});

const canvasRef: Record<string, unknown> = {
  width: 1600, height: 900, clientWidth: 1600, clientHeight: 900, style: {},
  getContext: (kind: string) => (kind === "2d" ? ctx2dProxy : glProxy),
  addEventListener() { /* noop */ }, removeEventListener() { /* noop */ },
  dispatchEvent() { return true; },
};

// ─── DOM globals ───
const g = globalThis as Record<string, unknown>;
g.window = {
  addEventListener() { /* noop */ }, removeEventListener() { /* noop */ },
  setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
  clearTimeout: (id: unknown) => clearTimeout(id as NodeJS.Timeout),
  devicePixelRatio: 1, innerWidth: 1600, innerHeight: 900,
  matchMedia: () => ({ matches: false, addEventListener() { /* noop */ } }),
};
g.document = {
  createElement: (tag: string) => (tag === "canvas" ? { ...canvasRef } : { style: {} }),
  addEventListener() { /* noop */ }, body: { appendChild() { /* noop */ } },
};
g.localStorage = { getItem: () => null, setItem() { /* noop */ }, removeItem() { /* noop */ }, clear() { /* noop */ } };
g.requestAnimationFrame = () => 1; // unused — we pump manually via constructor path
g.HTMLCanvasElement = function () { /* noop */ };

// ─── import engine AFTER globals are set ───
const { GameEngine } = await import("../src/game/engine");

let snapshotCount = 0;
let lastSnap: Record<string, unknown> | null = null;
let quizOpened = 0;
const announces: string[] = [];
const ends: unknown[] = [];

const canvas = canvasRef as unknown as HTMLCanvasElement;

const engine = new GameEngine(canvas, {
  heroId: "blaze",
  difficulty: "normal",
  quality: "low",
  playerName: "TestBot",
  autoAttack: true,
}, {
  onSnapshot: (s) => { snapshotCount++; lastSnap = s as unknown as Record<string, unknown>; },
  onQuiz: () => { quizOpened++; },
  onFloat: () => { /* noop */ },
  onAnnounce: (t) => { announces.push(t); },
  onKillFeed: () => { /* noop */ },
  onMatchEnd: (r) => { ends.push(r); },
});

console.log("engine constructed ✓");

// pump the internal loop manually: the engine used requestAnimationFrame at boot.
// Instead of relying on it, we call the private frame via any-cast and the rAF we control.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pump = engine as any;
// simulate 20 seconds of game time by invoking update in fixed steps
// (update/render path is exercised through the internal loop callback if present)
try {
  for (let i = 0; i < 20; i++) pump.update(1 / 60);
  console.log("update(1/60) ×20 ticks ✓");
} catch (e) {
  console.error("update() threw:", e);
  process.exit(1);
}

// force-spawn waves and combat
try {
  pump.spawnWave();
  for (let i = 0; i < 600; i++) pump.update(1 / 60); // 10 more seconds incl. combat ticks
  console.log("10s combat simulation ✓");
} catch (e) {
  console.error("combat simulation threw:", e);
  process.exit(1);
}

// exercise player abilities & shop APIs
try {
  pump.player.gold = 5000;
  pump.player.level = 4;
  pump.player.skillLevels.F = 1;
  pump.player.energy = 100;
  pump.castSkill("Q");
  pump.castSkill("E");
  pump.castSkill("R");
  pump.basicAttack();
  pump.recall();
  pump.flicker();
  const buy = pump.buyItem("plasma_sword");
  const sell = pump.sellItem(0);
  const up = pump.upgradeSkill("Q");
  void up;
  console.log("skills+shop ✓ buy:", buy.ok, "sell:", sell.ok);
} catch (e) {
  console.error("skills/shop threw:", e);
  process.exit(1);
}

// quiz flow
try {
  pump.openQuiz("levelup");
  pump.resolveQuiz("correct");
  console.log("quiz open/resolve ✓");
} catch (e) {
  console.error("quiz threw:", e);
  process.exit(1);
}

// force a longer burn-in to let AI fight, minions clash, turrets fire
try {
  for (let i = 0; i < 60 * 45; i++) pump.update(1 / 60); // 45 seconds
  console.log("45s AI burn-in ✓");
} catch (e) {
  console.error("burn-in threw:", e);
  process.exit(1);
}

console.log("snapshot from direct buildSnapshot():", typeof pump.buildSnapshot === "function" ? "available ✓" : "missing");
const snap = pump.buildSnapshot();
console.log("snapshot keys:", Object.keys(snap).join(","));
console.log("time:", snap.time.toFixed(1), "| hp:", snap.hp, "/", snap.maxHp, "| gold:", snap.gold, "| teamKills CYBER/TITAN:", snap.teamCyber, "/", snap.teamTitan, "| turrets CYB/TIT:", snap.turretsCyber, "/", snap.turretsTitan);
console.log("minions alive:", pump.minions.filter((m: { alive: boolean }) => m.alive).length, "| projectiles:", pump.projectiles.length, "| heroes alive:", pump.heroes.filter((h: { alive: boolean }) => h.alive).length, "/ 10");
console.log("quiz events fired:", quizOpened, "| announces:", announces.slice(0, 4));
console.log("ENGINE HEADLESS TEST PASSED");
process.exit(0);
