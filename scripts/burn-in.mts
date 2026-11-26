/* Full 10-minute AI-vs-AI match simulation for balance verification. */
const g = globalThis as Record<string, unknown>;

const GLSTR = "WebGL 2.0";
const param = {
  toString: () => GLSTR, valueOf: () => 1, length: 0,
  indexOf: (s: string) => GLSTR.indexOf(s), includes: () => true,
  toLowerCase: () => GLSTR.toLowerCase(), toUpperCase: () => GLSTR.toUpperCase(),
  split: (s: string) => GLSTR.split(s), startsWith: () => true,
  charAt: (i: number) => GLSTR.charAt(i), trim: () => GLSTR.trim(),
};
const makeAny = (): unknown => new Proxy(function () { /* absorb */ }, {
  get: (_t, prop) => {
    if (prop === Symbol.toPrimitive) return () => 1;
    if (prop === "rangeMax" || prop === "rangeMin" || prop === "precision") return 127;
    return makeAny();
  },
  apply: () => makeAny(),
});
const mkCanvas = () => ({
  width: 1600, height: 900, clientWidth: 1600, clientHeight: 900, style: {},
  getContext: (kind: string) => kind === "2d"
    ? new Proxy({}, { get: (_t, p) => (..._a: unknown[]) => makeAny(), set: () => true })
    : new Proxy(function () { /* absorb */ }, {
        get: (_t, prop) => {
          if (prop === "getParameter") return () => param;
          if (prop === "getShaderPrecisionFormat") return () => ({ precision: 23, rangeMin: 127, rangeMax: 127 });
          if (prop === "getContextAttributes") return () => ({});
          if (prop === "getError") return () => 0;
          if (prop === "getExtension") return () => ({});
          if (prop === "isContextLost") return () => false;
          return makeAny();
        },
        apply: () => makeAny(),
      }),
  addEventListener() { /* noop */ }, removeEventListener() { /* noop */ },
});

g.window = {
  addEventListener() { /* noop */ }, removeEventListener() { /* noop */ },
  setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms), clearTimeout: (id: NodeJS.Timeout) => clearTimeout(id),
  devicePixelRatio: 1, innerWidth: 1600, innerHeight: 900,
  matchMedia: () => ({ matches: false, addEventListener() { /* noop */ } }),
};
g.document = { createElement: () => mkCanvas(), addEventListener() { /* noop */ }, body: { appendChild() { /* noop */ } } };
g.localStorage = { getItem: () => null, setItem() { /* noop */ }, removeItem() { /* noop */ }, clear() { /* noop */ } };
g.requestAnimationFrame = () => 0;

const { GameEngine } = await import("../src/game/engine");

let end: Record<string, unknown> | null = null;
const canvas = mkCanvas() as unknown as HTMLCanvasElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const engine: any = new GameEngine(canvas, { heroId: "blaze", difficulty: "normal", quality: "low", playerName: "AFK", autoAttack: false }, {
  onSnapshot() { /* noop */ }, onQuiz() { /* noop */ }, onFloat() { /* noop */ },
  onAnnounce() { /* noop */ }, onKillFeed() { /* noop */ }, onMatchEnd: (r: Record<string, unknown>) => { end = r; },
});

const dt = 1 / 60;
for (let sec = 0; sec <= 900 && !end; sec += 15) {
  for (let i = 0; i < 15 * 60 && !end; i++) engine.update(dt);
  if (end) break;
  const s = engine.buildSnapshot();
  const aliveH = engine.heroes.filter((h: { alive: boolean }) => h.alive).length;
  const coreHps = engine.cores.map((c: { hp: number; shield: number }) => Math.round(c.hp + Math.max(0, c.shield)));
  console.log(`t=${Math.round(s.time)}s  kills CYB${s.teamCyber}/TIT${s.teamTitan}  turrets CYB${s.turretsCyber}/TIT${s.turretsTitan}  coresHP [${coreHps}]  heroesAlive ${aliveH}/10  minions ${engine.minions.filter((m: { alive: boolean }) => m.alive).length}`);
}
console.log("END RESULT:", end ? JSON.stringify(end) : "match still running after 12 minutes");
process.exit(0);
